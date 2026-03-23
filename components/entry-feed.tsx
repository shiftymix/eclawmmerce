"use client";

import { useState } from "react";
import EntryCard from "./entry-card";
import type { Tool, LLMAssessment } from "@/lib/supabase/types";

interface EntryWithData {
  tool: Tool;
  assessments: LLMAssessment[];
  communityAvg: number | null;
  parentName?: string | null;
}

interface EntryFeedProps {
  entries: EntryWithData[];
}

const PAGE_SIZE = 20;

export default function EntryFeed({ entries }: EntryFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-4xl">🦀</span>
        <p className="font-pixel-sm text-text-secondary text-center">
          NO ENTRIES FOUND
        </p>
        <p className="text-xs font-mono text-text-secondary text-center">
          Try a different filter or check back after the next discovery run.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto">
      {visibleEntries.map(({ tool, assessments, communityAvg, parentName }) => (
        <EntryCard
          key={tool.id}
          tool={tool}
          assessments={assessments}
          communityAvg={communityAvg}
          parentName={parentName}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="btn-ghost text-xs"
          >
            LOAD MORE ({entries.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
