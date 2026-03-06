-- 023: Add project_id to habits so habits can be linked to projects

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_habits_project ON habits(project_id);
