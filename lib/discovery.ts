import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "./supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DiscoverySourceGroup = "launches" | "social" | "platforms" | "all";

const COMMON_SCHEMA = `Return ONLY a valid JSON array with fields:
- name: string
- url: string (link to the announcement, product page, or repo)
- github_url: string | null
- description: string (1-2 sentences)
- is_open_source: boolean
- pricing_model: "free" | "freemium" | "paid" | "open-source"
- entry_type: "tool" | "feature" | "update" | "indie" | "repo"
- parent_name: string | null (name of the parent tool/platform, if this is a feature release or update)
- release_date: string | null (ISO date if known)
- stars: number | null (GitHub star count, only for repo entries)
- language: string | null (primary programming language, only for repo entries)
- last_commit_date: string | null (ISO date of last commit, only for repo entries)

Return 5–20 genuinely new entries only.`;

const GROUP_PROMPTS: Record<DiscoverySourceGroup, string> = {
  launches: `Search the web for noteworthy developments in agentic AI for ecommerce from the past 7 days. Focus on LAUNCH PLATFORMS and COMMUNITY:

**Launch platforms**: ProductHunt, IndieHackers
**Community**: Hacker News Show HN posts
**Video**: YouTube AI tool reviews and demos, creator roundup videos

Find ALL of the following:
1. **New tools**: Newly released agentic AI tools relevant to ecommerce builders (automation agents, workflow tools, paid media AI, video/UGC creation AI, API platforms, ecommerce ops, demand intelligence, documentation automation).
2. **Indie projects**: Community-built tools, open-source projects, or indie creator releases relevant to agentic ecommerce.

${COMMON_SCHEMA}`,

  social: `Search the web for noteworthy developments in agentic AI for ecommerce from the past 7 days. Focus on SOCIAL MEDIA and NEWSLETTERS:

**Social**: X/Twitter, Reddit (r/ecommerce, r/SaaS, r/artificial, r/Entrepreneur)
**Newsletters**: Ben's Bites, TLDR AI, The Rundown AI
**News & blogs**: TechCrunch, The Verge, VentureBeat

Find ALL of the following:
1. **New tools**: Newly released agentic AI tools relevant to ecommerce builders (automation agents, workflow tools, paid media AI, video/UGC creation AI, API platforms, ecommerce ops, demand intelligence, documentation automation).
2. **Indie projects**: Community-built tools, open-source projects, or indie creator releases relevant to agentic ecommerce.

${COMMON_SCHEMA}`,

  platforms: `Search the web for noteworthy developments in agentic AI for ecommerce from the past 7 days. Focus on GITHUB and PLATFORM CHANGELOGS:

**Code & open source**: GitHub trending, GitHub releases
**Platform changelogs**: Shopify, Stripe, Amazon Seller, Meta Business, Google Ads, Anthropic, OpenAI official blogs and changelogs

Find ALL of the following:
1. **Feature releases**: Major new features or capabilities launched by existing AI/ecommerce platforms (e.g., a new AI agent mode, a new integration, a new API endpoint).
2. **Platform updates**: Significant updates from major platforms that change capabilities for ecommerce builders.
3. **Open-source GitHub repos**: Actively maintained open-source repositories on GitHub that are useful to ecommerce builders (libraries, SDKs, automation scripts, integrations). Include star count, primary language, and last commit date when available.

${COMMON_SCHEMA}`,

  all: `Search the web for noteworthy developments in agentic AI for ecommerce from the past 7 days. Search broadly across ALL of these sources:

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
5. **Open-source GitHub repos**: Actively maintained open-source repositories on GitHub that are useful to ecommerce builders (libraries, SDKs, automation scripts, integrations). Include star count, primary language, and last commit date when available.

${COMMON_SCHEMA}`,
};

/**
 * Discovery-only: web search, parse, dedup, insert as pending.
 * No LLM assessments — those are handled by runPendingAssessments().
 *
 * @param sourceGroup - Which source group to search. Defaults to "all".
 */
export async function runDiscovery(sourceGroup: DiscoverySourceGroup = "all") {
  const supabase = createServiceClient();
  const prompt = GROUP_PROMPTS[sourceGroup];

  // Multi-turn conversation with web search
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: prompt },
  ];

  let allText = "";
  let turns = 0;
  const maxTurns = 5;

  while (turns < maxTurns) {
    turns++;
    console.log(`[Discovery:${sourceGroup}] Turn ${turns}...`);

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

    console.log(`[Discovery:${sourceGroup}] stop_reason: ${response.stop_reason}, blocks: ${response.content.length}`);

    const textBlocks = response.content.filter((b) => b.type === "text");
    const turnText = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("");
    allText += turnText;

    if (response.stop_reason === "end_turn") {
      console.log(`[Discovery:${sourceGroup}] Completed after ${turns} turns`);
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) break;

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((b) => ({
      type: "tool_result" as const,
      tool_use_id: (b as Anthropic.ToolUseBlock).id,
      content: "Continue searching and compile your findings into the JSON array.",
    }));

    messages.push({ role: "user", content: toolResults });
  }

  console.log(`[Discovery:${sourceGroup}] Total text length: ${allText.length}`);

  let discoveredEntries: Array<{
    name: string;
    url: string;
    github_url: string | null;
    description: string;
    is_open_source: boolean;
    pricing_model: string;
    entry_type: "tool" | "feature" | "update" | "indie" | "repo";
    parent_name: string | null;
    release_date: string | null;
    stars: number | null;
    language: string | null;
    last_commit_date: string | null;
  }> = [];

  try {
    const clean = allText.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      discoveredEntries = JSON.parse(match[0]);
      // Strip citation tags from descriptions
      discoveredEntries = discoveredEntries.map((e) => ({
        ...e,
        description: e.description.replace(/<\/?cite[^>]*>/g, "").trim(),
      }));
      console.log(`[Discovery:${sourceGroup}] Parsed ${discoveredEntries.length} entries`);
    } else {
      console.error(`[Discovery:${sourceGroup}] No JSON array found in response`);
      return { found: 0, added: 0 };
    }
  } catch (e) {
    console.error(`[Discovery:${sourceGroup}] Failed to parse discovered entries:`, e);
    return { found: 0, added: 0 };
  }

  let added = 0;

  // Insert entries as 'pending' — no assessment here
  for (const entry of discoveredEntries) {
    console.log(`[Discovery:${sourceGroup}] Processing: ${entry.name} (${entry.entry_type})`);

    const { data: existing } = await supabase
      .from("tools")
      .select("id")
      .eq("url", entry.url)
      .single();

    if (existing) {
      console.log(`[Discovery:${sourceGroup}]   -> Already exists, skipping`);
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
        console.log(`[Discovery:${sourceGroup}]   -> Linked to parent: ${entry.parent_name}`);
      }
    }

    const insertData: Record<string, unknown> = {
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
      status: "pending",
    };

    if (entry.entry_type === "repo") {
      insertData.stars = entry.stars ?? null;
      insertData.language = entry.language ?? null;
      insertData.last_commit_date = entry.last_commit_date ?? null;
    }

    const { error: insertError } = await supabase
      .from("tools")
      .insert(insertData);

    if (insertError) {
      console.error(`[Discovery:${sourceGroup}]   -> Insert failed:`, insertError.message);
      continue;
    }

    added++;
    console.log(`[Discovery:${sourceGroup}]   -> Inserted as pending`);
  }

  console.log(`[Discovery:${sourceGroup}] Done! Found: ${discoveredEntries.length}, Added: ${added}`);
  return { found: discoveredEntries.length, added };
}
