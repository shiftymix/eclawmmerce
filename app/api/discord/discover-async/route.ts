import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { ENTRY_TYPE_CONFIG } from "@/lib/supabase/types";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PRICING_BADGE: Record<string, string> = {
  free: "FREE",
  freemium: "FREEMIUM",
  paid: "PAID",
  "open-source": "OSS",
};

type ToolRow = {
  id: string;
  name: string;
  description: string;
  url: string;
  entry_type: string;
  pricing_model: string;
};

async function patchOriginalMessage(
  applicationId: string,
  token: string,
  content: string
) {
  await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { query, applicationId, token, channelId } = await req.json();

  const supabase = createServiceClient();

  // Fetch a pool of active tools, optionally filtered by query
  let dbQuery = supabase
    .from("tools")
    .select("id, name, description, url, entry_type, pricing_model")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (query?.trim()) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }

  const { data: tools } = await dbQuery.limit(20);

  if (!tools || tools.length === 0) {
    await patchOriginalMessage(
      applicationId,
      token,
      query?.trim()
        ? `No entries found matching **${query}**.`
        : "No active entries found."
    );
    return NextResponse.json({ success: true });
  }

  // Ask Claude to pick the most relevant entries
  const toolList = tools
    .map(
      (t, i) =>
        `${i + 1}. ${t.name} (${t.entry_type}, ${t.pricing_model})\n   ${t.description}\n   ID: ${t.id}`
    )
    .join("\n\n");

  const prompt = query?.trim()
    ? `A Discord user is discovering ecommerce AI tools related to: "${query}"\n\nAvailable entries:\n\n${toolList}\n\nPick the 3-5 most relevant entries for the user's intent, in order of relevance. Return ONLY a JSON array of IDs:\n["id1", "id2", "id3"]`
    : `Pick the 5 most interesting and diverse entries from this list for an ecommerce builder discovering new AI tools:\n\n${toolList}\n\nReturn ONLY a JSON array of IDs:\n["id1", "id2", "id3", "id4", "id5"]`;

  let pickedIds: string[] = [];
  try {
    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    const text =
      aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "[]";
    pickedIds = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    // Fallback: use first results as-is
    pickedIds = tools.slice(0, 5).map((t) => t.id);
  }

  let pickedTools = pickedIds
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is ToolRow => !!t);

  if (pickedTools.length === 0) {
    pickedTools = tools.slice(0, 5);
  }

  const header = query?.trim()
    ? `**Discover results for "${query}":**\n`
    : `**Discovered on eclawmmerce.ai:**\n`;

  const lines = [header];
  for (const tool of pickedTools) {
    const typeLabel =
      ENTRY_TYPE_CONFIG[tool.entry_type as keyof typeof ENTRY_TYPE_CONFIG]?.label ??
      tool.entry_type.toUpperCase();
    const pricing =
      PRICING_BADGE[tool.pricing_model] ?? tool.pricing_model?.toUpperCase() ?? "";
    const desc =
      tool.description?.length > 80
        ? tool.description.slice(0, 80) + "\u2026"
        : tool.description ?? "";
    lines.push(
      `**${tool.name}** \u2014 ${typeLabel} | ${pricing}\n${desc}\n<https://eclawmmerce.ai/tools/${tool.id}>`
    );
  }

  // Discord message limit is 2000 characters
  const content = lines.join("\n\n").slice(0, 2000);

  const patchRes = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original?wait=true`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );

  // Create a thread on the message so results don't pollute main chat
  if (patchRes.ok && channelId) {
    try {
      const patchData = await patchRes.json();
      const messageId = patchData.id;
      if (messageId) {
        await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/threads`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            },
            body: JSON.stringify({
              name: `eclawm: ${(query || "discover").slice(0, 80)}`,
              auto_archive_duration: 1440,
            }),
          }
        );
      }
    } catch {
      // Thread creation is best-effort -- don't fail the whole request
    }
  } else {
    // Fallback: patch without wait param
    await patchOriginalMessage(applicationId, token, content);
  }

  return NextResponse.json({ success: true });
}
