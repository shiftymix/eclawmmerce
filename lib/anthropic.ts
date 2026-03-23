import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ToolAssessment {
  use_case_id: string;
  score: number; // 0-10
  reasoning: string; // 1-2 sentences
}

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

export async function assessTool(tool: {
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
