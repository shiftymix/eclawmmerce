import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("tools")
    .select("id, name")
    .eq("entry_type", "tool")
    .ilike("name", `%${q}%`)
    .limit(10);

  return NextResponse.json(data || []);
}
