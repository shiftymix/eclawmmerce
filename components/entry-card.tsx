import Link from "next/link";
import ScoreBadge from "./score-badge";
import {
  USE_CASE_COLORS,
  USE_CASE_NAMES,
  USE_CASE_ICONS,
  ENTRY_TYPE_CONFIG,
  type UseCaseId,
  type Tool,
  type EntryType,
  type LLMAssessment,
} from "@/lib/supabase/types";

interface EntryCardProps {
  tool: Tool;
  assessments: LLMAssessment[];
  communityAvg: number | null;
  parentName?: string | null;
}

export default function EntryCard({
  tool,
  assessments,
  communityAvg,
  parentName,
}: EntryCardProps) {
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

  const typeConfig = ENTRY_TYPE_CONFIG[tool.entry_type as EntryType] || ENTRY_TYPE_CONFIG.tool;

  return (
    <div className="pixel-card p-4 flex flex-col gap-3">
      {/* Type badge + name row */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 bg-bg pixel-border flex items-center justify-center text-xs flex-shrink-0">
          {tool.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 flex-shrink-0"
              style={{
                border: `1px solid ${typeConfig.color}`,
                color: typeConfig.color,
              }}
            >
              {typeConfig.label}
            </span>
            <h3 className="font-mono font-bold text-text-primary text-sm truncate">
              {tool.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {tool.is_open_source && (
              <span className="text-[10px] font-mono text-success">
                OPEN SOURCE
              </span>
            )}
            {parentName && (
              <span className="text-[10px] font-mono text-text-secondary">
                Part of {parentName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs font-mono text-text-secondary line-clamp-2">
        {tool.description}
      </p>

      {/* Category tags + scores in a row for feed layout */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {topUseCases.map((a) => {
            const color =
              USE_CASE_COLORS[a.use_case_id as UseCaseId] || "#8892b0";
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

        <div className="flex gap-2 flex-shrink-0">
          <ScoreBadge score={avgLlmScore} type="llm" />
          <ScoreBadge score={communityAvg} type="community" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Link
          href={`/tools/${tool.id}`}
          className="text-xs font-mono font-bold text-crab-red hover:brightness-125 transition-all"
        >
          VIEW DETAILS &rarr;
        </Link>
        <div className="flex items-center gap-2">
          {tool.release_date && (
            <span className="text-[10px] font-mono text-text-secondary">
              {new Date(tool.release_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          <span className="text-[10px] font-mono text-text-secondary px-1.5 py-0.5 pixel-border">
            {pricingLabel[tool.pricing_model] ||
              tool.pricing_model?.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
