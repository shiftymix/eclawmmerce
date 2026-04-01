export interface UseCase {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export type EntryType = "tool" | "feature" | "update" | "indie" | "repo" | "skill";

export const ENTRY_TYPE_CONFIG: Record<
  EntryType,
  { label: string; color: string }
> = {
  tool: { label: "TOOL", color: "#4a9eff" },
  feature: { label: "FEATURE", color: "#43c59e" },
  update: { label: "UPDATE", color: "#ff9f43" },
  indie: { label: "INDIE", color: "#9b59b6" },
  repo: { label: "REPO", color: "#2ea44f" },
  skill: { label: "SKILL", color: "#6366f1" },
};

export interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  logo_url: string | null;
  github_url: string | null;
  is_open_source: boolean;
  pricing_model: "free" | "freemium" | "paid" | "open-source";
  status: "active" | "deprecated" | "pending";
  discovered_at: string;
  submitted_by_user_id: string | null;
  discovery_source: "auto" | "user_submission";
  created_at: string;
  updated_at: string;
  entry_type: EntryType;
  parent_id: string | null;
  release_date: string | null;
  // Repo-specific fields
  stars: number | null;
  language: string | null;
  last_commit_date: string | null;
  // Skill-specific fields
  skill_runtime?: string | null;
  skill_install_cmd?: string | null;
}

// Alias for readability in new code
export type Entry = Tool;

export interface LLMAssessment {
  id: string;
  tool_id: string;
  use_case_id: string;
  score: number;
  reasoning: string;
  assessed_at: string;
  model_version: string;
}

export interface CommunityRating {
  id: string;
  tool_id: string;
  user_id: string;
  use_case_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  tool_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface DiscoveryRun {
  id: string;
  run_at: string;
  entries_found: number;
  entries_added: number;
  status: "success" | "error";
  error_message: string | null;
  model_used: string | null;
}

export interface ToolScore {
  tool_id: string;
  name: string;
  use_case_id: string;
  use_case_name: string;
  llm_score: number | null;
  llm_reasoning: string | null;
  community_score: number | null;
  community_rating_count: number;
}

// Aggregated tool with its top scores for card display
export interface ToolWithScores extends Tool {
  assessments: LLMAssessment[];
  top_use_cases: { use_case_id: string; score: number }[];
  avg_llm_score: number | null;
  avg_community_score: number | null;
}

export const USE_CASE_IDS = [
  "business-in-a-box",
  "ecom-ops",
  "paid-media",
  "workflow-automations",
  "api-integration",
  "short-form-video",
  "ugc-creation",
  "demand-discovery",
  "work-docs-external",
  "work-docs-internal",
] as const;

export type UseCaseId = (typeof USE_CASE_IDS)[number];

export const USE_CASE_COLORS: Record<UseCaseId, string> = {
  "business-in-a-box": "#e8392e",
  "ecom-ops": "#d4943a",
  "paid-media": "#4a9eff",
  "workflow-automations": "#43c59e",
  "api-integration": "#9b59b6",
  "short-form-video": "#ff6b6b",
  "ugc-creation": "#ffd93d",
  "demand-discovery": "#6bcb77",
  "work-docs-external": "#ff9f43",
  "work-docs-internal": "#a8a8b3",
};

export const USE_CASE_NAMES: Record<UseCaseId, string> = {
  "business-in-a-box": "Business in a Box",
  "ecom-ops": "Ecom Ops",
  "paid-media": "Agentic Paid Media",
  "workflow-automations": "Workflow Automations",
  "api-integration": "API Discovery & Integration",
  "short-form-video": "Short-Form Video",
  "ugc-creation": "UGC Creation",
  "demand-discovery": "Demand Discovery",
  "work-docs-external": "External Documentation",
  "work-docs-internal": "Internal SOPs",
};

export const USE_CASE_ICONS: Record<UseCaseId, string> = {
  "business-in-a-box": "📦",
  "ecom-ops": "🛒",
  "paid-media": "📢",
  "workflow-automations": "⚡",
  "api-integration": "🔌",
  "short-form-video": "🎬",
  "ugc-creation": "🎨",
  "demand-discovery": "📈",
  "work-docs-external": "📄",
  "work-docs-internal": "📋",
};
