interface ScoreBadgeProps {
  score: number | null;
  type: "llm" | "community";
  size?: "sm" | "md";
}

export default function ScoreBadge({ score, type, size = "sm" }: ScoreBadgeProps) {
  const colorClass = type === "llm" ? "score-amber" : "score-teal";
  const icon = type === "llm" ? "🤖" : "👥";
  const label = type === "llm" ? "LLM" : "Community";
  const sizeClass = size === "md" ? "text-base px-3 py-1.5" : "text-xs px-2 py-1";

  if (score === null || score === undefined) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-bold bg-bg pixel-border ${sizeClass} ${colorClass}`}
      >
        {icon} {label}: —
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold bg-bg pixel-border ${sizeClass} ${colorClass}`}
    >
      {icon} {label}: {score.toFixed(1)}/10
    </span>
  );
}
