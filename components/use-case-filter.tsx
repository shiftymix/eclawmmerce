"use client";

import {
  USE_CASE_IDS,
  USE_CASE_NAMES,
  USE_CASE_COLORS,
  USE_CASE_ICONS,
  ENTRY_TYPE_CONFIG,
  type UseCaseId,
} from "@/lib/supabase/types";

interface UseCaseFilterProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  activeType: string;
  onTypeChange: (type: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const ENTRY_TYPES: Array<{ key: string; label: string; color: string }> = [
  { key: "all", label: "ALL", color: "#e8392e" },
  ...Object.entries(ENTRY_TYPE_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
    color: config.color,
  })),
];

export default function UseCaseFilter({
  activeFilter,
  onFilterChange,
  activeType,
  onTypeChange,
  sortBy,
  onSortChange,
}: UseCaseFilterProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Entry type filter */}
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-text-secondary flex-shrink-0 pt-1.5 w-20">TYPE</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {ENTRY_TYPES.map(({ key, label, color }) => {
            const isActive = activeType === key;
            return (
              <button
                key={key}
                onClick={() => onTypeChange(key)}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-mono font-bold transition-all"
                style={{
                  border: `1px solid ${isActive ? color : "#2e3450"}`,
                  backgroundColor: isActive ? color : "transparent",
                  color: isActive ? "#1a1f2e" : "#8892b0",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Use case filter pills */}
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-text-secondary flex-shrink-0 pt-1.5 w-20">USE CASE</span>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => onFilterChange("all")}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-mono font-bold transition-all
              ${
                activeFilter === "all"
                  ? "bg-crab-red text-white pixel-border-red"
                  : "bg-transparent text-text-secondary pixel-border hover:border-crab-red"
              }`}
          >
            ALL USE CASES
          </button>
          {USE_CASE_IDS.map((id) => {
            const color = USE_CASE_COLORS[id as UseCaseId];
            const isActive = activeFilter === id;
            return (
              <button
                key={id}
                onClick={() => onFilterChange(id)}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-mono font-bold transition-all whitespace-nowrap"
                style={{
                  border: `1px solid ${isActive ? color : "#2e3450"}`,
                  backgroundColor: isActive ? color : "transparent",
                  color: isActive ? "#1a1f2e" : "#8892b0",
                }}
              >
                {USE_CASE_ICONS[id as UseCaseId]} {USE_CASE_NAMES[id as UseCaseId]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-text-secondary">SORT:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-bg pixel-border px-2 py-1 text-xs font-mono text-text-primary
            focus:outline-none focus:border-crab-red cursor-pointer"
        >
          <option value="newest">NEWEST</option>
          <option value="llm_score">TOP LLM SCORE</option>
          <option value="community_score">TOP COMMUNITY SCORE</option>
        </select>
      </div>
    </div>
  );
}
