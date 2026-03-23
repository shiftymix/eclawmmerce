"use client";

import { useState, useMemo } from "react";
import UseCaseFilter from "@/components/use-case-filter";
import EntryFeed from "@/components/entry-feed";
import type { Tool, LLMAssessment } from "@/lib/supabase/types";

interface EntryWithData {
  tool: Tool;
  assessments: LLMAssessment[];
  communityAvg: number | null;
  parentName?: string | null;
}

interface HomeClientProps {
  toolsWithData: EntryWithData[];
}

export default function HomeClient({ toolsWithData }: HomeClientProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeType, setActiveType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const filteredAndSorted = useMemo(() => {
    let result = [...toolsWithData];

    // Filter by entry type
    if (activeType !== "all") {
      result = result.filter(({ tool }) => tool.entry_type === activeType);
    }

    // Filter by use case
    if (activeFilter !== "all") {
      result = result.filter(({ assessments }) =>
        assessments.some(
          (a) => a.use_case_id === activeFilter && a.score > 2
        )
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.tool.discovered_at).getTime() -
          new Date(a.tool.discovered_at).getTime()
        );
      }
      if (sortBy === "llm_score") {
        const aAvg =
          a.assessments.length > 0
            ? a.assessments.reduce((s, x) => s + x.score, 0) /
              a.assessments.length
            : 0;
        const bAvg =
          b.assessments.length > 0
            ? b.assessments.reduce((s, x) => s + x.score, 0) /
              b.assessments.length
            : 0;
        return bAvg - aAvg;
      }
      if (sortBy === "community_score") {
        return (b.communityAvg ?? 0) - (a.communityAvg ?? 0);
      }
      return 0;
    });

    return result;
  }, [toolsWithData, activeFilter, activeType, sortBy]);

  return (
    <div className="space-y-6">
      <UseCaseFilter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        activeType={activeType}
        onTypeChange={setActiveType}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      <EntryFeed entries={filteredAndSorted} />
    </div>
  );
}
