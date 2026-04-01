-- Migration: Add 'repo' entry type and repo-specific columns

-- Extend the entry_type constraint to include 'repo'
ALTER TABLE tools DROP CONSTRAINT IF EXISTS valid_entry_type;
ALTER TABLE tools ADD CONSTRAINT valid_entry_type
  CHECK (entry_type IN ('tool', 'feature', 'update', 'indie', 'repo'));

-- Repo-specific columns
ALTER TABLE tools ADD COLUMN IF NOT EXISTS stars integer;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS language varchar(64);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS last_commit_date date;

-- Discord posting tracking
ALTER TABLE tools ADD COLUMN IF NOT EXISTS discord_posted_at timestamptz;

-- Index for Discord pick query
CREATE INDEX IF NOT EXISTS idx_tools_discord_posted_at ON tools(discord_posted_at) WHERE discord_posted_at IS NULL;
