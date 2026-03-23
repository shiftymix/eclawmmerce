# Council of eCLAWmmerce

The open-source intelligence layer for agentic ecommerce builders. New tools auto-discovered and assessed weekly by AI. No hype, just signal.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS with pixel/retro design system
- **Database + Auth**: Supabase (Postgres + magic link auth)
- **AI**: Anthropic Claude API (claude-haiku-4-5) for automated tool discovery and scoring
- **Deployment**: Vercel with weekly cron job

## Local Development

1. Clone the repo:
   ```bash
   git clone https://github.com/your-org/council-of-eclawmmerce.git
   cd council-of-eclawmmerce
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Supabase project at [supabase.com](https://supabase.com) and run the migration:
   - Go to SQL Editor in your Supabase dashboard
   - Paste and run the contents of `supabase/migrations/001_initial.sql`

4. Set up environment variables — copy `.env.local` and fill in your values:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (keep secret!)
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
   - `CRON_SECRET` — any random string for securing the cron endpoint

5. Seed the database with example tools:
   ```bash
   npx tsx scripts/seed-assessments.ts
   ```

6. Start the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Supabase Auth Setup

1. Go to Dashboard > Auth > Providers > enable **Email** (magic link, no passwords)
2. Go to Dashboard > Auth > URL Configuration:
   - Set Site URL to `https://eclawmmerce.ai`
   - Add Redirect URLs:
     - `https://eclawmmerce.ai/auth/callback`
     - `http://localhost:3000/auth/callback`

## Deploy to Vercel

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) > Add New Project > import your GitHub repo
3. Add all environment variables from `.env.local` in Vercel project settings (Settings > Environment Variables)
4. Deploy — Vercel auto-detects Next.js. The weekly cron in `vercel.json` activates automatically.

## Connect Your Domain

1. In Vercel: go to your project > Settings > Domains > Add Domain
2. Add `eclawmmerce.ai` as the primary domain
3. Vercel will give you nameservers or a CNAME record
4. In your domain registrar: add those DNS records
5. DNS propagation takes 5-30 minutes. Vercel provisions SSL automatically.

## After Domain is Live

1. Confirm Site URL in Supabase is set to `https://eclawmmerce.ai` (not localhost)
2. Test magic link auth end-to-end from the live domain

## Verify the Cron

In Vercel: project > Settings > Cron Jobs — you'll see the weekly Monday 6am UTC job. You can trigger it manually to test the first discovery run.

## License

MIT — see [LICENSE](./LICENSE)
