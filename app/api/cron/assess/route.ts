import { NextResponse } from "next/server";
import { runPendingAssessments } from "@/lib/assess";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runPendingAssessments(5);

    return NextResponse.json({
      success: true,
      assessed: result.assessed,
      remaining: result.remaining,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
