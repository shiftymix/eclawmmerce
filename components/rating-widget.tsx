"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  USE_CASE_IDS,
  USE_CASE_NAMES,
  USE_CASE_COLORS,
  type UseCaseId,
} from "@/lib/supabase/types";

interface RatingWidgetProps {
  toolId: string;
}

export default function RatingWidget({ toolId }: RatingWidgetProps) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Load existing user ratings for this tool
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("community_ratings")
        .select("use_case_id, score")
        .eq("tool_id", toolId)
        .eq("user_id", user.id);

      if (data) {
        const map: Record<string, number> = {};
        data.forEach((r) => {
          map[r.use_case_id] = r.score;
        });
        setRatings(map);
      }
    });
  }, [toolId, supabase]);

  const handleRate = async (useCaseId: string, score: number) => {
    if (!user) return;
    setSaving(useCaseId);
    setMessage("");

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_id: toolId,
          use_case_id: useCaseId,
          score,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to save rating");
      } else {
        setRatings((prev) => ({ ...prev, [useCaseId]: score }));
        setMessage("Rating saved!");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch {
      setMessage("Failed to save rating");
    }
    setSaving(null);
  };

  if (!user) {
    return (
      <div className="pixel-border bg-surface p-4">
        <p className="text-xs font-mono text-text-secondary">
          Sign in with email to rate this tool &rarr;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-pixel-sm text-text-primary">YOUR RATINGS</h3>
      {message && (
        <p className="text-xs font-mono text-success">{message}</p>
      )}
      <div className="space-y-2">
        {USE_CASE_IDS.map((id) => {
          const color = USE_CASE_COLORS[id as UseCaseId];
          const currentScore = ratings[id];

          return (
            <div
              key={id}
              className="flex items-center gap-3 bg-surface pixel-border p-2"
            >
              <span
                className="text-xs font-mono font-bold flex-shrink-0 w-48 truncate"
                style={{ color }}
              >
                {USE_CASE_NAMES[id as UseCaseId]}
              </span>
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => handleRate(id, n)}
                    disabled={saving === id}
                    className={`w-6 h-6 text-[10px] font-mono font-bold transition-all
                      ${
                        currentScore === n
                          ? "bg-crab-red text-white"
                          : currentScore && n <= currentScore
                          ? "bg-crab-red/30 text-crab-red"
                          : "bg-bg text-text-secondary hover:bg-crab-red/20"
                      }
                      pixel-border disabled:opacity-50`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {saving === id && <span className="spinner" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
