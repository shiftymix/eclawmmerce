-- Migration: Add multi-type content support (tools, features, updates, indie projects)

-- Add content type discriminator
ALTER TABLE tools ADD COLUMN entry_type text NOT NULL DEFAULT 'tool';
ALTER TABLE tools ADD CONSTRAINT valid_entry_type
  CHECK (entry_type IN ('tool', 'feature', 'update', 'indie'));

-- Parent-child linking (feature releases → parent tool)
ALTER TABLE tools ADD COLUMN parent_id uuid REFERENCES tools(id) ON DELETE SET NULL;

-- Release date for feature launches / platform updates
ALTER TABLE tools ADD COLUMN release_date timestamptz;

-- Indexes for feed performance
CREATE INDEX idx_tools_discovered_at ON tools(discovered_at DESC);
CREATE INDEX idx_tools_parent_id ON tools(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tools_entry_type ON tools(entry_type);

-- Rename discovery_runs columns to be type-agnostic
ALTER TABLE discovery_runs RENAME COLUMN tools_found TO entries_found;
ALTER TABLE discovery_runs RENAME COLUMN tools_added TO entries_added;
