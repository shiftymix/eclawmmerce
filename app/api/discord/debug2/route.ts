// Temporary debug endpoint: logs raw request details from Discord
export const maxDuration = 10;

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const contentType = request.headers.get("content-type");
  const body = await request.text();

  // Log to console (visible in Vercel function logs)
  console.log("DISCORD_DEBUG", JSON.stringify({
    signature: signature?.slice(0, 16) + "...",
    timestamp,
    contentType,
    bodyLength: body.length,
    bodyPreview: body.slice(0, 100),
    hasPublicKey: !!process.env.DISCORD_APP_PUBLIC_KEY,
    publicKeyPrefix: process.env.DISCORD_APP_PUBLIC_KEY?.slice(0, 8),
  }));

  // Always return valid PONG so Discord saves the URL
  // This lets us check logs to see what arrives
  return Response.json({ type: 1 }, {
    headers: { "Content-Type": "application/json" }
  });
}

export async function GET() {
  return new Response("OK", { status: 200 });
}