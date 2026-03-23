import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { assessTool } from "@/lib/anthropic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, url, github_url, description, is_open_source, pricing_model, entry_type, parent_id } = body;

    if (!name || !url || !description) {
      return NextResponse.json(
        { error: "Name, URL, and description are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if URL already exists
    const { data: existing } = await supabase
      .from("tools")
      .select("id")
      .eq("url", url)
      .single();

    if (existing) {
      return NextResponse.json({
        tool_id: existing.id,
        redirectUrl: `/tools/${existing.id}`,
        message: "Tool already exists",
      });
    }

    // Insert new tool
    const { data: inserted, error: insertError } = await supabase
      .from("tools")
      .insert({
        name,
        url,
        github_url: github_url || null,
        description,
        is_open_source: is_open_source || false,
        pricing_model: pricing_model || "freemium",
        discovery_source: "user_submission",
        entry_type: entry_type || "tool",
        parent_id: parent_id || null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: "Failed to insert tool" },
        { status: 500 }
      );
    }

    // Run LLM assessment
    try {
      const assessments = await assessTool({ name, url, description, entry_type: entry_type || "tool" });
      const rows = assessments.map((a) => ({
        tool_id: inserted.id,
        use_case_id: a.use_case_id,
        score: a.score,
        reasoning: a.reasoning,
      }));
      await supabase.from("llm_assessments").insert(rows);
    } catch (e) {
      console.error("Assessment failed but tool was created:", e);
    }

    return NextResponse.json({
      tool_id: inserted.id,
      redirectUrl: `/tools/${inserted.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
