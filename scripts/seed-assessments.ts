/**
 * Seed script: Run LLM assessments on all tools in the database.
 *
 * Usage: npx tsx scripts/seed-assessments.ts
 *
 * Prerequisites:
 * - Run the SQL migration (supabase/migrations/001_initial.sql)
 * - Run the seed SQL (supabase/seed.sql)
 * - Set ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const USE_CASES = [
  { id: "business-in-a-box", name: "Business in a Box" },
  { id: "ecom-ops", name: "Ecom Ops (Marketplaces + DTC)" },
  { id: "paid-media", name: "Agentic Paid Media (Meta/Amazon/Google)" },
  { id: "workflow-automations", name: "Proactive Workflow Automations" },
  { id: "api-integration", name: "API Discovery & Integration" },
  { id: "short-form-video", name: "Agentic Short-Form Video Creation" },
  { id: "ugc-creation", name: "Agentic UGC Creation" },
  {
    id: "demand-discovery",
    name: "Organic Demand Discovery & Trend Monitoring",
  },
  {
    id: "work-docs-external",
    name: "Agentic Work Documentation (External Content)",
  },
  {
    id: "work-docs-internal",
    name: "Agentic Work Documentation (Internal SOPs)",
  },
];

interface ToolAssessment {
  use_case_id: string;
  score: number;
  reasoning: string;
}

async function assessTool(tool: {
  name: string;
  url: string;
  description: string;
  entry_type?: string;
}): Promise<ToolAssessment[]> {
  const typeLabel = tool.entry_type || "tool";
  const prompt = `You are assessing an agentic AI ${typeLabel} for ecommerce builders.

${typeLabel === "tool" ? "Tool" : "Entry"}: ${tool.name}
URL: ${tool.url}
Description: ${tool.description}

Score this ${typeLabel} from 0–10 for each of the following ecommerce use cases. A score of 0 means completely irrelevant. A score of 10 means purpose-built and best-in-class for that use case.

Use cases to score:
${USE_CASES.map((uc, i) => `${i + 1}. ${uc.id}: ${uc.name}`).join("\n")}

Return ONLY a valid JSON array (no markdown, no explanation):
[
  { "use_case_id": "business-in-a-box", "score": 7.5, "reasoning": "One to two sentence explanation." },
  ...
]

Include all 10 use cases. Be honest and critical — most entries are only relevant to 2–4 use cases.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as ToolAssessment[];
}

async function main() {
  console.log("🦀 Council of eCLAWmmerce — Seed Assessment Script\n");

  // Fetch all tools
  const { data: tools, error } = await supabase
    .from("tools")
    .select("id, name, url, description, entry_type");

  if (error || !tools) {
    console.error("Failed to fetch tools:", error);
    process.exit(1);
  }

  console.log(`Found ${tools.length} entries to assess.\n`);

  for (const tool of tools) {
    console.log(`📊 Assessing: ${tool.name} (${tool.url})`);

    // Check if assessments already exist
    const { data: existing } = await supabase
      .from("llm_assessments")
      .select("id")
      .eq("tool_id", tool.id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`   ↳ Already assessed, skipping.\n`);
      continue;
    }

    try {
      const assessments = await assessTool({
        name: tool.name,
        url: tool.url,
        description: tool.description,
        entry_type: tool.entry_type,
      });

      const rows = assessments.map((a) => ({
        tool_id: tool.id,
        use_case_id: a.use_case_id,
        score: a.score,
        reasoning: a.reasoning,
      }));

      const { error: insertError } = await supabase
        .from("llm_assessments")
        .insert(rows);

      if (insertError) {
        console.error(`   ↳ Insert error:`, insertError.message);
      } else {
        console.log(
          `   ↳ Assessed! Scores: ${assessments
            .map((a) => `${a.use_case_id}=${a.score}`)
            .join(", ")}\n`
        );
      }
    } catch (e) {
      console.error(`   ↳ Assessment failed:`, e);
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n✅ Seed assessment complete!");
}

main();
