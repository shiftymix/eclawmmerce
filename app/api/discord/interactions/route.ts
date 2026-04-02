import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ENTRY_TYPE_CONFIG } from "@/lib/supabase/types";

export const maxDuration = 10;

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const;
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
} as const;
const MessageFlags = { EPHEMERAL: 64 } as const;

const PRICING_BADGE: Record<string, string> = {
  free: "FREE",
  freemium: "FREEMIUM",
  paid: "PAID",
  "open-source": "OSS",
};

function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const matches = hex.match(/.{1,2}/g)!;
  const buf = new ArrayBuffer(matches.length);
  const view = new Uint8Array(buf);
  matches.forEach((byte, i) => { view[i] = parseInt(byte, 16); });
  return view;
}

async function verifyDiscordRequest(
  request: Request
): Promise<{ valid: boolean; body: string }> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const body = await request.text();

  if (!signature || !timestamp) return { valid: false, body };

  const publicKey = process.env.DISCORD_APP_PUBLIC_KEY!;

  try {
    const encoder = new TextEncoder();
    const keyData = hexToUint8Array(publicKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      hexToUint8Array(signature),
      encoder.encode(timestamp + body)
    );
    return { valid, body };
  } catch {
    return { valid: false, body };
  }
}

function ephemeralResponse(content: string) {
  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: MessageFlags.EPHEMERAL },
  });
}

type ToolRow = {
  id: string;
  name: string;
  description: string;
  url: string;
  entry_type: string;
  pricing_model: string;
};

function formatToolLine(tool: ToolRow): string {
  const typeLabel =
    ENTRY_TYPE_CONFIG[tool.entry_type as keyof typeof ENTRY_TYPE_CONFIG]?.label ??
    tool.entry_type.toUpperCase();
  const pricing =
    PRICING_BADGE[tool.pricing_model] ?? tool.pricing_model?.toUpperCase() ?? "";
  const desc =
    tool.description?.length > 80
      ? tool.description.slice(0, 80) + "\u2026"
      : tool.description ?? "";
  return `**${tool.name}** \u2014 ${typeLabel} | ${pricing}\n${desc}\n<https://eclawmmerce.ai/tools/${tool.id}>`;
}

async function handleSearch(query: string) {
  const supabase = createServiceClient();

  const { data: tools } = await supabase
    .from("tools")
    .select("id, name, description, url, entry_type, pricing_model")
    .eq("status", "active")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!tools || tools.length === 0) {
    return ephemeralResponse(`No results found for **${query}**.`);
  }

  const lines = [`**Search results for "${query}":**\n`];
  for (const tool of tools) lines.push(formatToolLine(tool));
  return ephemeralResponse(lines.join("\n\n"));
}

async function handleDiscover(query: string, interaction: Record<string, unknown>) {
  const appId = interaction.application_id as string;
  const token = interaction.token as string;

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  fetch(`${baseUrl}/api/discord/discover-async`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ query, applicationId: appId, token, channelId: interaction.channel_id as string }),
  }).catch(() => {}); // intentionally fire-and-forget

  return NextResponse.json({
    type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    data: { flags: 0 },
  });
}

export async function POST(request: Request) {
  const { valid, body } = await verifyDiscordRequest(request);
  if (!valid) {
    return new Response("Invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    if (interaction.data?.name !== "eclawm") {
      return ephemeralResponse("Unknown command.");
    }

    const subcommand = interaction.data?.options?.[0];

    if (subcommand?.name === "search") {
      const query: string =
        subcommand.options?.find((o: { name: string }) => o.name === "query")?.value ?? "";
      if (!query.trim()) return ephemeralResponse("Please provide a search query.");
      return await handleSearch(query.trim());
    }

    if (subcommand?.name === "discover") {
      const query: string =
        subcommand.options?.find((o: { name: string }) => o.name === "query")?.value ?? "";
      return await handleDiscover(query.trim(), interaction);
    }

    return ephemeralResponse("Unknown subcommand.");
  }

  return new Response("Unhandled interaction type", { status: 400 });
}
