import Link from "next/link";
import ScoreBadge from "./score-badge";
import {
  USE_CASE_COLORS,
  USE_CASE_NAMES,
  USE_CASE_ICONS,
  type UseCaseId,
  type Tool,
  type LLMAssessment,
} from "@/lib/supabase/types";

interface ToolCardProps {
  tool: Tool;
  assessments: LLMAssessment[];
  communityAvg: number | null;
}

export default function ToolCard({ tool, assessments, communityAvg }: ToolCardProps) {
  // Get top 3 use cases by score
  const topUseCases = [...assessments]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((a) => a.score > 0);

  // Average LLM score across all assessments
  const avgLlmScore =
    assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length
      : null;

  // Pricing badge text
  const pricingLabel: Record<string, string> = {
    free: "FREE",
    freemium: "FREEMIUM",
    paid: "PAID",
    "open-source": "OSS",
  };

  return (
    <div className="pixel-card p-4 flex flex-col gap-3 h-full">
      {/* Top row: name + open source badge */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 bg-bg pixel-border flex items-center justify-center text-xs flex-shrink-0">
          {tool.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-mono font-bold text-text-primary text-sm truncate">
            {tool.name}
          </h3>
          {tool.is_open_source && (
            <span className="text-[10px] font-mono text-success">
              OPEN SOURCE
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs font-mono text-text-secondary line-clamp-2 flex-1">
        {tool.description}
      </p>

      {/* Category tags */}
      <div className="flex flex-wrap gap-1">
        {topUseCases.map((a) => {
          const color = USE_CASE_COLORS[a.use_case_id as UseCaseId] || "#8892b0";
          return (
            <span
              key={a.use_case_id}
              className="text-[9px] font-mono px-1.5 py-0.5"
              style={{ border: `1px solid ${color}`, color }}
            >
              {USE_CASE_ICONS[a.use_case_id as UseCaseId]}{" "}
              {USE_CASE_NAMES[a.use_case_id as UseCaseId]}
            </span>
          );
        })}
      </div>

      {/* Score row */}
      <div className="flex gap-2 flex-wrap">
        <ScoreBadge score={avgLlmScore} type="llm" />
        <ScoreBadge score={communityAvg} type="community" />
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <Link
          href={`/tools/${tool.id}`}
          className="text-xs font-mono font-bold text-crab-red hover:brightness-125 transition-all"
        >
          VIEW DETAILS &rarr;
        </Link>
        <span className="text-[10px] font-mono text-text-secondary px-1.5 py-0.5 pixel-border">
          {pricingLabel[tool.pricing_model] || tool.pricing_model?.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
