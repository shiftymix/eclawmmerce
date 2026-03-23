import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  USE_CASE_IDS,
  USE_CASE_NAMES,
  USE_CASE_COLORS,
  ENTRY_TYPE_CONFIG,
  type UseCaseId,
  type EntryType,
} from "@/lib/supabase/types";
import RatingWidget from "@/components/rating-widget";
import CommentSection from "@/components/comment-section";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createClient();
  const { data: tool } = await supabase
    .from("tools")
    .select("name, description")
    .eq("id", params.id)
    .single();

  if (!tool) {
    return { title: "Tool Not Found" };
  }

  return {
    title: `${tool.name} — Council of eCLAWmmerce`,
    description: tool.description,
  };
}

export default async function ToolDetailPage({ params }: PageProps) {
  const supabase = await createClient();

  const { data: tool } = await supabase
    .from("tools")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!tool) notFound();

  // Get LLM assessments
  const { data: assessments } = await supabase
    .from("llm_assessments")
    .select("*")
    .eq("tool_id", tool.id);

  // Get community ratings aggregated by use case
  const { data: communityRatings } = await supabase
    .from("community_ratings")
    .select("use_case_id, score")
    .eq("tool_id", tool.id);

  // Compute community averages per use case
  const communityByUseCase: Record<
    string,
    { avg: number; count: number }
  > = {};
  if (communityRatings) {
    const grouped: Record<string, number[]> = {};
    communityRatings.forEach((r) => {
      if (!grouped[r.use_case_id]) grouped[r.use_case_id] = [];
      grouped[r.use_case_id].push(r.score);
    });
    Object.entries(grouped).forEach(([ucId, scores]) => {
      communityByUseCase[ucId] = {
        avg:
          Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10,
        count: scores.length,
      };
    });
  }

  // Fetch parent tool if this entry has one
  let parentTool: { id: string; name: string } | null = null;
  if (tool.parent_id) {
    const { data } = await supabase
      .from("tools")
      .select("id, name")
      .eq("id", tool.parent_id)
      .single();
    parentTool = data;
  }

  // Fetch child entries (features/updates linked to this tool)
  const { data: childEntries } = await supabase
    .from("tools")
    .select("id, name, entry_type, description, discovered_at")
    .eq("parent_id", tool.id)
    .order("discovered_at", { ascending: false });

  const typeConfig = ENTRY_TYPE_CONFIG[(tool.entry_type as EntryType) || "tool"];

  // Map assessments by use case
  const assessmentMap: Record<
    string,
    { score: number; reasoning: string }
  > = {};
  if (assessments) {
    assessments.forEach((a) => {
      assessmentMap[a.use_case_id] = {
        score: a.score,
        reasoning: a.reasoning,
      };
    });
  }

  const pricingLabel: Record<string, string> = {
    free: "FREE",
    freemium: "FREEMIUM",
    paid: "PAID",
    "open-source": "OPEN SOURCE",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="text-xs font-mono text-text-secondary hover:text-crab-red transition-colors mb-6 inline-block"
      >
        &larr; BACK TO DIRECTORY
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 bg-surface pixel-border flex items-center justify-center text-2xl flex-shrink-0">
            {tool.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5"
                style={{
                  border: `1px solid ${typeConfig.color}`,
                  color: typeConfig.color,
                }}
              >
                {typeConfig.label}
              </span>
              <h1 className="font-pixel-lg text-text-primary">
                {tool.name}
              </h1>
            </div>
            {parentTool && (
              <Link
                href={`/tools/${parentTool.id}`}
                className="text-[10px] font-mono text-text-secondary hover:text-crab-red mb-1 inline-block"
              >
                Part of {parentTool.name} &rarr;
              </Link>
            )}
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-crab-red hover:brightness-125 block"
            >
              {tool.url} &nearr;
            </a>
          </div>
        </div>

        <p className="text-sm font-mono text-text-secondary mb-4 leading-relaxed">
          {tool.description}
        </p>

        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-text-secondary">
          <span className="pixel-border px-2 py-1">
            {pricingLabel[tool.pricing_model] ||
              tool.pricing_model?.toUpperCase()}
          </span>
          {tool.is_open_source && (
            <span className="pixel-border px-2 py-1 text-success">
              OPEN SOURCE
            </span>
          )}
          {tool.github_url && (
            <a
              href={tool.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-border px-2 py-1 hover:text-crab-red"
            >
              GITHUB &nearr;
            </a>
          )}
          <span className="pixel-border px-2 py-1">
            DISCOVERED{" "}
            {new Date(tool.discovered_at).toLocaleDateString()}
          </span>
          <span className="pixel-border px-2 py-1">
            SOURCE: {tool.discovery_source === "auto" ? "AI" : "USER"}
          </span>
        </div>
      </div>

      {/* Score Matrix */}
      <div className="mb-8">
        <h2 className="font-pixel-sm text-text-primary mb-4">
          SCORE MATRIX
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-text-secondary">
                  USE CASE
                </th>
                <th className="text-center py-2 px-2 text-text-secondary">
                  LLM SCORE
                </th>
                <th className="text-left py-2 px-2 text-text-secondary">
                  REASONING
                </th>
                <th className="text-center py-2 px-2 text-text-secondary">
                  COMMUNITY
                </th>
                <th className="text-center py-2 px-2 text-text-secondary">
                  # RATINGS
                </th>
              </tr>
            </thead>
            <tbody>
              {USE_CASE_IDS.map((ucId) => {
                const assessment = assessmentMap[ucId];
                const community = communityByUseCase[ucId];
                const color =
                  USE_CASE_COLORS[ucId as UseCaseId] || "#8892b0";

                return (
                  <tr key={ucId} className="border-b border-border/50">
                    <td className="py-2 px-2">
                      <span style={{ color }}>
                        {USE_CASE_NAMES[ucId as UseCaseId]}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2 justify-center">
                        {assessment ? (
                          <>
                            <div className="w-16 h-2 bg-bg pixel-border overflow-hidden">
                              <div
                                className="h-full"
                                style={{
                                  width: `${(assessment.score / 10) * 100}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                            <span className="score-amber font-bold w-8 text-right">
                              {assessment.score}
                            </span>
                          </>
                        ) : (
                          <span className="text-text-secondary">&mdash;</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-text-secondary max-w-xs">
                      {assessment?.reasoning || "—"}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {community ? (
                        <span className="score-teal font-bold">
                          {community.avg}
                        </span>
                      ) : (
                        <span className="text-text-secondary">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center text-text-secondary">
                      {community?.count || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rating widget */}
      <div className="mb-8">
        <RatingWidget toolId={tool.id} />
      </div>

      {/* Related entries (children) */}
      {childEntries && childEntries.length > 0 && (
        <div className="mb-8">
          <h2 className="font-pixel-sm text-text-primary mb-4">
            RELATED
          </h2>
          <div className="flex flex-col gap-2">
            {childEntries.map((child) => {
              const childTypeConfig =
                ENTRY_TYPE_CONFIG[(child.entry_type as EntryType) || "tool"];
              return (
                <Link
                  key={child.id}
                  href={`/tools/${child.id}`}
                  className="pixel-border px-4 py-3 flex items-center gap-3 hover:border-crab-red transition-colors"
                >
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 flex-shrink-0"
                    style={{
                      border: `1px solid ${childTypeConfig.color}`,
                      color: childTypeConfig.color,
                    }}
                  >
                    {childTypeConfig.label}
                  </span>
                  <span className="text-sm font-mono text-text-primary font-bold">
                    {child.name}
                  </span>
                  <span className="text-xs font-mono text-text-secondary flex-1 truncate">
                    {child.description}
                  </span>
                  <span className="text-[10px] font-mono text-text-secondary flex-shrink-0">
                    {new Date(child.discovered_at).toLocaleDateString()}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mb-8">
        <CommentSection toolId={tool.id} />
      </div>
    </div>
  );
}
