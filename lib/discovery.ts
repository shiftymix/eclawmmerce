import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "./supabase/server";
import { assessTool } from "./anthropic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DISCOVERY_PROMPT = `Search the web for noteworthy developments in agentic AI for ecommerce from the past 7 days. Search broadly across ALL of these sources:

**Launch platforms**: ProductHunt, IndieHackers
**Code & open source**: GitHub trending, GitHub releases
**Community & social**: X/Twitter, Reddit (r/ecommerce, r/SaaS, r/artificial, r/Entrepreneur), Hacker News Show HN
**Video**: YouTube AI tool reviews and demos, creator roundup videos
**News & blogs**: TechCrunch, The Verge, VentureBeat
**Newsletters**: Ben's Bites, TLDR AI, The Rundown AI
**Platform changelogs**: Shopify, Stripe, Amazon Seller, Meta Business, Google Ads, Anthropic, OpenAI official blogs and changelogs

Find ALL of the following:

1. **New tools**: Newly released agentic AI tools relevant to ecommerce builders (automation agents, workflow tools, paid media AI, video/UGC creation AI, API platforms, ecommerce ops, demand intelligence, documentation automation).
2. **Feature releases**: Major new features or capabilities launched by existing AI/ecommerce platforms (e.g., a new AI agent mode, a new integration, a new API endpoint).
3. **Platform updates**: Significant updates from major platforms that change capabilities for ecommerce builders (e.g., Shopify, Stripe, AWS, Anthropic, OpenAI releasing new features).
4. **Indie projects**: Community-built tools, open-source projects, or indie creator releases relevant to agentic ecommerce.

Return ONLY a valid JSON array with fields:
- name: string
- url: string (link to the announcement, product page, or repo)
- github_url: string | null
- description: string (1-2 sentences)
- is_open_source: boolean
- pricing_model: "free" | "freemium" | "paid" | "open-source"
- entry_type: "tool" | "feature" | "update" | "indie"
- parent_name: string | null (name of the parent tool/platform, if this is a feature release or update)
- release_date: string | null (ISO date if known)

Return 5–20 genuinely new entries only.`;

export async function runDiscovery() {
  const supabase = createServiceClient();

  // Step 1: Multi-turn conversation with web search to find new entries
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: DISCOVERY_PROMPT },
  ];

  let allText = "";
  let turns = 0;
  const maxTurns = 5;

  while (turns < maxTurns) {
    turns++;
    console.log(`[Discovery] Turn ${turns}...`);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        },
      ],
      messages,
    });

    console.log(`[Discovery] stop_reason: ${response.stop_reason}, blocks: ${response.content.length}`);

    // Collect all text from this response
    const textBlocks = response.content.filter((b) => b.type === "text");
    const turnText = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("");
    allText += turnText;

    // If the model stopped normally (not mid-tool-use), we're done
    if (response.stop_reason === "end_turn") {
      console.log(`[Discovery] Completed after ${turns} turns`);
      break;
    }

    // If there's a tool_use block, we need to continue the conversation
    // Add the assistant response and a user turn to continue
    messages.push({ role: "assistant", content: response.content });

    // For web_search, the SDK handles results automatically via server_tool_use
    // We just need to send back tool results for any tool_use blocks
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) break;

    // The web_search tool results come back automatically in the API response
    // For the extended thinking / web search flow, results are inline
    // Just continue with an empty user message to prompt completion
    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((b) => ({
      type: "tool_result" as const,
      tool_use_id: (b as Anthropic.ToolUseBlock).id,
      content: "Continue searching and compile your findings into the JSON array.",
    }));

    messages.push({ role: "user", content: toolResults });
  }

  console.log(`[Discovery] Total text length: ${allText.length}`);
  if (allText.length > 0) {
    console.log(`[Discovery] Text preview: ${allText.substring(0, 500)}...`);
  }

  let discoveredEntries: Array<{
    name: string;
    url: string;
    github_url: string | null;
    description: string;
    is_open_source: boolean;
    pricing_model: string;
    entry_type: "tool" | "feature" | "update" | "indie";
    parent_name: string | null;
    release_date: string | null;
  }> = [];

  try {
    const clean = allText.replace(/```json|```/g, "").trim();
    // Find the JSON array in the response
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      discoveredEntries = JSON.parse(match[0]);
      // Strip citation tags from descriptions (e.g. <cite index="...">)
      discoveredEntries = discoveredEntries.map((e) => ({
        ...e,
        description: e.description.replace(/<\/?cite[^>]*>/g, "").trim(),
      }));
      console.log(`[Discovery] Parsed ${discoveredEntries.length} entries`);
    } else {
      console.error("[Discovery] No JSON array found in response");
      return { found: 0, added: 0 };
    }
  } catch (e) {
    console.error("[Discovery] Failed to parse discovered entries:", e);
    return { found: 0, added: 0 };
  }

  let added = 0;

  // Step 2: For each entry, check if it exists, resolve parent, insert, then assess
  for (const entry of discoveredEntries) {
    console.log(`[Discovery] Processing: ${entry.name} (${entry.entry_type})`);

    const { data: existing } = await supabase
      .from("tools")
      .select("id")
      .eq("url", entry.url)
      .single();

    if (existing) {
      console.log(`[Discovery]   -> Already exists, skipping`);
      continue;
    }

    // Resolve parent_id if parent_name is provided
    let parent_id: string | null = null;
    if (entry.parent_name) {
      const { data: parent } = await supabase
        .from("tools")
        .select("id")
        .eq("entry_type", "tool")
        .ilike("name", `%${entry.parent_name}%`)
        .limit(1)
        .single();
      if (parent) {
        parent_id = parent.id;
        console.log(`[Discovery]   -> Linked to parent: ${entry.parent_name}`);
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("tools")
      .insert({
        name: entry.name,
        url: entry.url,
        github_url: entry.github_url || null,
        description: entry.description,
        is_open_source: entry.is_open_source,
        pricing_model: entry.pricing_model,
        discovery_source: "auto",
        entry_type: entry.entry_type || "tool",
        parent_id,
        release_date: entry.release_date || null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error(`[Discovery]   -> Insert failed:`, insertError?.message);
      continue;
    }

    // Step 3: Run LLM assessment
    try {
      const assessments = await assessTool({
        name: entry.name,
        url: entry.url,
        description: entry.description,
        entry_type: entry.entry_type,
      });

      const rows = assessments.map((a) => ({
        tool_id: inserted.id,
        use_case_id: a.use_case_id,
        score: a.score,
        reasoning: a.reasoning,
      }));

      await supabase.from("llm_assessments").insert(rows);
      added++;
      console.log(`[Discovery]   -> Assessed and added!`);
    } catch (e) {
      console.error(`[Discovery]   -> Assessment failed:`, e);
    }
  }

  console.log(`[Discovery] Done! Found: ${discoveredEntries.length}, Added: ${added}`);
  return { found: discoveredEntries.length, added };
}
