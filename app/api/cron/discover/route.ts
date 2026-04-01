import { NextResponse } from "next/server";

export const maxDuration = 10;

/**
 * @deprecated Use the focused sub-routes instead:
 *   /api/cron/discover/launches  — ProductHunt, IndieHackers, Show HN, YouTube
 *   /api/cron/discover/social    — X/Twitter, Reddit, newsletters
 *   /api/cron/discover/platforms — GitHub trending+releases, platform changelogs
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  return NextResponse.json({
    deprecated: true,
    message:
      "This endpoint is deprecated. Use the focused discovery crons instead: " +
      "/api/cron/discover/launches, /api/cron/discover/social, /api/cron/discover/platforms",
  });
}
