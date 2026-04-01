import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DISCORD_WEBHOOK_URL =
  "https://discordapp.com/api/webhooks/1483118190002442423/uikc7_USO-1W-OQToPfPNnuaZ2V28BHF8GwDeBfYh8A8wjKGA3_4jAZhiZsLlK3nj5Hf";

const PRICING_BADGE: Record<string, string> = {
  free: "FREE",
  freemium: "FREEMIUM",
  paid: "PAID",
  "open-source": "OSS",
};

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  // Pick highest avg LLM-scored active entry not yet posted to Discord
  const { data: assessments, error: assessError } = await supabase
    .from("llm_assessments")
    .select("tool_id, score");

  if (assessError || !assessments) {
    return NextResponse.json({ success: false, error: "Failed to fetch assessments" }, { status: 500 });
  }

  // Compute avg LLM score per tool
  const scoreMap: Record<string, { sum: number; count: number }> = {};
  for (const a of assessments) {
    if (!scoreMap[a.tool_id]) scoreMap[a.tool_id] = { sum: 0, count: 0 };
    scoreMap[a.tool_id].sum += a.score;
    scoreMap[a.tool_id].count += 1;
  }

  const avgByTool = Object.entries(scoreMap).map(([tool_id, { sum, count }]) => ({
    tool_id,
    avg: sum / count,
  }));
  avgByTool.sort((a, b) => b.avg - a.avg);

  // Find best unposted active tool
  let picked = null;
  for (const { tool_id } of avgByTool) {
    const { data: tool } = await supabase
      .from("tools")
      .select("*")
      .eq("id", tool_id)
      .eq("status", "active")
      .is("discord_posted_at", null)
      .single();

    if (tool) {
      picked = tool;
      break;
    }
  }

  if (!picked) {
    return NextResponse.json({ success: true, message: "No unposted entries found" });
  }

  // Generate blurb via Claude Haiku
  const blurbResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Write a 2-3 sentence blurb for an ecommerce operator audience about this tool. Be concise and practical — focus on the value for online sellers and ecom builders. No hype.

Name: ${picked.name}
Description: ${picked.description}
URL: ${picked.url}

Return only the blurb text, no quotes, no labels.`,
      },
    ],
  });

  const blurb =
    blurbResponse.content[0].type === "text"
      ? blurbResponse.content[0].text.trim()
      : picked.description;

  const pricingBadge = PRICING_BADGE[picked.pricing_model] || picked.pricing_model?.toUpperCase();

  const message = [
    `🔍 **Today's pick from [eclawmmerce.ai](https://eclawmmerce.ai)**`,
    `**${picked.name}** — ${pricingBadge}`,
    blurb,
    `👉 <https://eclawmmerce.ai/tools/${picked.id}>`,
  ].join("\n");

  // Post to Discord
  const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });

  if (!discordRes.ok) {
    const err = await discordRes.text();
    return NextResponse.json({ success: false, error: `Discord error: ${err}` }, { status: 500 });
  }

  // Mark as posted
  await supabase
    .from("tools")
    .update({ discord_posted_at: new Date().toISOString() })
    .eq("id", picked.id);

  return NextResponse.json({ success: true, posted: picked.name });
}
