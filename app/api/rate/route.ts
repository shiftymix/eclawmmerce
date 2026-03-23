import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tool_id, use_case_id, score } = body;

    if (!tool_id || !use_case_id || !score) {
      return NextResponse.json(
        { error: "tool_id, use_case_id, and score are required" },
        { status: 400 }
      );
    }

    if (score < 1 || score > 10 || !Number.isInteger(score)) {
      return NextResponse.json(
        { error: "Score must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    // Upsert the rating
    const { error: upsertError } = await supabase
      .from("community_ratings")
      .upsert(
        {
          tool_id,
          user_id: user.id,
          use_case_id,
          score,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tool_id,user_id,use_case_id",
        }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      );
    }

    // Get updated average for this tool+use_case
    const { data: ratings } = await supabase
      .from("community_ratings")
      .select("score")
      .eq("tool_id", tool_id)
      .eq("use_case_id", use_case_id);

    const avg = ratings
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : score;

    return NextResponse.json({
      success: true,
      community_avg: Math.round(avg * 10) / 10,
      rating_count: ratings?.length ?? 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
