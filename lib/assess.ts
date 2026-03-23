import { createServiceClient } from "./supabase/server";
import { assessTool } from "./anthropic";

/**
 * Assess pending entries in batches. Each call processes up to `batchSize`
 * entries that have status='pending' and no LLM assessments yet.
 * After assessment, entries are marked as 'active' so they appear on the site.
 */
export async function runPendingAssessments(batchSize = 5) {
  const supabase = createServiceClient();

  // Find entries that need assessment: status='pending', no assessments yet
  const { data: pending, error } = await supabase
    .from("tools")
    .select("id, name, url, description, entry_type")
    .eq("status", "pending")
    .order("discovered_at", { ascending: true })
    .limit(batchSize);

  if (error || !pending) {
    console.error("[Assess] Failed to fetch pending entries:", error);
    return { assessed: 0, remaining: 0 };
  }

  if (pending.length === 0) {
    console.log("[Assess] No pending entries to assess");
    return { assessed: 0, remaining: 0 };
  }

  console.log(`[Assess] Found ${pending.length} pending entries`);

  let assessed = 0;

  for (const entry of pending) {
    console.log(`[Assess] Assessing: ${entry.name} (${entry.entry_type})`);

    try {
      const assessments = await assessTool({
        name: entry.name,
        url: entry.url,
        description: entry.description,
        entry_type: entry.entry_type,
      });

      const rows = assessments.map((a) => ({
        tool_id: entry.id,
        use_case_id: a.use_case_id,
        score: a.score,
        reasoning: a.reasoning,
      }));

      const { error: insertError } = await supabase
        .from("llm_assessments")
        .insert(rows);

      if (insertError) {
        console.error(`[Assess]   -> Insert failed:`, insertError.message);
        continue;
      }

      // Mark as active so it appears on the site
      await supabase
        .from("tools")
        .update({ status: "active" })
        .eq("id", entry.id);

      assessed++;
      console.log(`[Assess]   -> Done! Now active.`);
    } catch (e) {
      console.error(`[Assess]   -> Assessment failed:`, e);
    }
  }

  // Count remaining pending entries
  const { count } = await supabase
    .from("tools")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const remaining = count || 0;
  console.log(`[Assess] Batch done. Assessed: ${assessed}, Remaining: ${remaining}`);
  return { assessed, remaining };
}
