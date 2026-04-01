/**
 * Seed script: Insert skillcrate.dev as a repo entry.
 *
 * Usage: npx tsx scripts/seed-brett-repo.ts
 *
 * Prerequisites:
 * - Run migrations (supabase/migrations/)
 * - Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("🦀 Seeding skillcrate.dev repo entry...\n");

  const { data: existing } = await supabase
    .from("tools")
    .select("id")
    .eq("url", "https://skillcrate.dev")
    .single();

  if (existing) {
    console.log("Entry already exists, skipping.");
    process.exit(0);
  }

  const { data, error } = await supabase
    .from("tools")
    .insert({
      name: "skillcrate.dev",
      url: "https://skillcrate.dev",
      github_url: null,
      description:
        "Open-source directory of Amazon-related tools and skills for ecommerce builders and sellers.",
      is_open_source: true,
      pricing_model: "open-source",
      status: "active",
      entry_type: "repo",
      discovery_source: "user_submission",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`✅ Inserted skillcrate.dev with id: ${data.id}`);
}

main();
