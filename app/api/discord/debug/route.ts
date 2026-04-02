export const maxDuration = 10;

export async function GET() {
  const publicKey = process.env.DISCORD_APP_PUBLIC_KEY;
  return Response.json({
    hasPublicKey: !!publicKey,
    publicKeyLength: publicKey?.length ?? 0,
    publicKeyPrefix: publicKey?.slice(0, 8) ?? "MISSING",
    publicKeyValid: publicKey?.length === 64 && /^[0-9a-f]+$/.test(publicKey),
    nodeVersion: process.version,
  });
}