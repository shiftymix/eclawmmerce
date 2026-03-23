import { NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discovery";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  // Log the run start
  const { data: run } = await supabase
    .from("discovery_runs")
    .insert({
      status: "success",
      model_used: "claude-haiku-4-5",
    })
    .select("id")
    .single();

  try {
    const result = await runDiscovery();

    // Update the run record
    if (run) {
      await supabase
        .from("discovery_runs")
        .update({
          entries_found: result.found,
          entries_added: result.added,
          status: "success",
        })
        .eq("id", run.id);
    }

    return NextResponse.json({
      success: true,
      entries_found: result.found,
      entries_added: result.added,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (run) {
      await supabase
        .from("discovery_runs")
        .update({
          status: "error",
          error_message: message,
        })
        .eq("id", run.id);
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
