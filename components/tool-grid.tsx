"use client";

import { useState } from "react";
import ToolCard from "./tool-card";
import type { Tool, LLMAssessment } from "@/lib/supabase/types";

interface ToolWithData {
  tool: Tool;
  assessments: LLMAssessment[];
  communityAvg: number | null;
}

interface ToolGridProps {
  tools: ToolWithData[];
}

const PAGE_SIZE = 12;

export default function ToolGrid({ tools }: ToolGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleTools = tools.slice(0, visibleCount);
  const hasMore = visibleCount < tools.length;

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-4xl">🦀</span>
        <p className="font-pixel-sm text-text-secondary text-center">
          NO TOOLS FOUND
        </p>
        <p className="text-xs font-mono text-text-secondary text-center">
          Try a different filter or check back after the next discovery run.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTools.map(({ tool, assessments, communityAvg }) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            assessments={assessments}
            communityAvg={communityAvg}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="btn-ghost text-xs"
          >
            LOAD MORE ({tools.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
