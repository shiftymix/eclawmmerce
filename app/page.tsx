import Link from "next/link";
import PixelLogo from "@/components/pixel-logo";
import HomeClient from "./home-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  // Fetch tools
  const { data: tools } = await supabase
    .from("tools")
    .select("*")
    .eq("status", "active")
    .order("discovered_at", { ascending: false });

  // Fetch all assessments
  const { data: assessments } = await supabase
    .from("llm_assessments")
    .select("*");

  // Fetch community averages
  const { data: communityRatings } = await supabase
    .from("community_ratings")
    .select("tool_id, score");

  // Compute community averages per tool
  const communityAvgMap: Record<string, number> = {};
  if (communityRatings) {
    const toolScores: Record<string, number[]> = {};
    communityRatings.forEach((r) => {
      if (!toolScores[r.tool_id]) toolScores[r.tool_id] = [];
      toolScores[r.tool_id].push(r.score);
    });
    Object.entries(toolScores).forEach(([toolId, scores]) => {
      communityAvgMap[toolId] =
        Math.round(
          (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
        ) / 10;
    });
  }

  // Group assessments by tool_id
  const assessmentsByTool: Record<string, NonNullable<typeof assessments>> = {};
  if (assessments) {
    assessments.forEach((a) => {
      if (!assessmentsByTool[a.tool_id]) assessmentsByTool[a.tool_id] = [];
      assessmentsByTool[a.tool_id]!.push(a);
    });
  }

  // Build a map of tool names by id for parent lookups
  const toolNameMap: Record<string, string> = {};
  (tools || []).forEach((t) => {
    toolNameMap[t.id] = t.name;
  });

  const toolsWithData = (tools || []).map((tool) => ({
    tool,
    assessments: assessmentsByTool[tool.id] || [],
    communityAvg: communityAvgMap[tool.id] ?? null,
    parentName: tool.parent_id ? toolNameMap[tool.parent_id] || null : null,
  }));

  // Get stats
  const entryCount = tools?.length || 0;
  const useCaseCount = 10;

  // Last discovery run
  const { data: lastRun } = await supabase
    .from("discovery_runs")
    .select("run_at")
    .eq("status", "success")
    .order("run_at", { ascending: false })
    .limit(1)
    .single();

  const lastUpdated = lastRun
    ? new Date(lastRun.run_at).toLocaleDateString()
    : "Pending";

  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-16 px-4">
        {/* Scanline overlay */}
        <div className="absolute inset-0 scanline-overlay pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            <PixelLogo size={128} />
          </div>

          <h1 className="font-pixel-lg text-crab-red mb-4">
            COUNCIL OF eCLAWMMERCE
          </h1>

          <p className="text-sm font-mono text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
            The open-source intelligence layer for agentic ecommerce builders.
            New tools, features, and updates auto-discovered and assessed weekly. No hype, just signal.
          </p>

          <div className="flex gap-4 justify-center mb-8">
            <a href="#directory" className="btn-primary text-xs">
              BROWSE FEED &darr;
            </a>
            <Link href="/submit" className="btn-ghost text-xs">
              SUBMIT &rarr;
            </Link>
          </div>

          {/* Stats bar */}
          <div className="flex gap-4 justify-center text-[10px] font-mono text-text-secondary">
            <span>{entryCount} ENTRIES INDEXED</span>
            <span>&middot;</span>
            <span>{useCaseCount} USE CASES</span>
            <span>&middot;</span>
            <span>LAST UPDATED {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Discovery Banner */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="bg-surface pixel-border px-4 py-2 flex items-center gap-2">
          <span className="text-amber text-xs font-mono">
            ⚡ AUTO-DISCOVERY ACTIVE — New tools, features, and updates found and assessed by AI weekly.
            Last run: {lastUpdated}.
          </span>
        </div>
      </div>

      {/* Directory Section */}
      <section id="directory" className="max-w-7xl mx-auto px-4 pb-16">
        <HomeClient toolsWithData={toolsWithData} />
      </section>

      {/* Empty state */}
      {entryCount === 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-16 text-center">
          <div className="flex flex-col items-center gap-4 py-16">
            <PixelLogo size={64} />
            <p className="font-pixel-sm text-text-secondary">
              ⚡ FIRST DISCOVERY RUN PENDING
            </p>
            <p className="text-xs font-mono text-text-secondary">
              Check back soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
