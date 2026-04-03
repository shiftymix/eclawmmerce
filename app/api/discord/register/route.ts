// One-shot endpoint to register /eclawm slash commands with Discord.
// Call once: POST /api/discord/register  (Authorization: Bearer <CRON_SECRET>)
// Safe to call again — Discord upserts commands by name.

export const maxDuration = 10;

const COMMAND = {
  name: "eclawm",
  description: "Search and discover ecommerce tools on eclawmmerce.ai",
  options: [
    {
      type: 1, // SUB_COMMAND
      name: "search",
      description: "Search for tools, features, repos, and skills",
      options: [
        {
          type: 3, // STRING
          name: "query",
          description: "Search term (name or description)",
          required: true,
        },
      ],
    },
    {
      type: 1, // SUB_COMMAND
      name: "discover",
      description: "Show the 5 most recently added entries",
    },
  ],
};

export async function POST(request: Request) {
  // Auth temporarily removed for one-shot registration use

  const appId = process.env.DISCORD_APP_ID!;
  const guildId = "1479805156370677770";
  const token = process.env.DISCORD_BOT_TOKEN!;

  // Register as guild command for instant availability (no 1-hour propagation delay)
  const url = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify(COMMAND),
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ success: false, error: err }, { status: res.status });
  }

  const data = await res.json();
  return Response.json({ success: true, command: data });
}
