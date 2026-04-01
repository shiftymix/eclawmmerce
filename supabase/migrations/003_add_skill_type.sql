ALTER TABLE tools DROP CONSTRAINT IF EXISTS valid_entry_type;
ALTER TABLE tools ADD CONSTRAINT valid_entry_type CHECK (entry_type IN ('tool', 'feature', 'update', 'indie', 'repo', 'skill'));
ALTER TABLE tools ADD COLUMN IF NOT EXISTS skill_runtime varchar(64);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS skill_install_cmd text;
