-- Motion AI: Focus Blocks table for protected deep work time
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS focus_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Focus Time',
  -- Time settings (stored as TIME for recurring blocks)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  -- Recurrence: which days this applies (0=Sunday, 1=Monday, etc.)
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}'::INTEGER[],
  -- Protection settings
  is_protected BOOLEAN DEFAULT true,
  allow_high_priority_override BOOLEAN DEFAULT false,
  buffer_minutes INTEGER DEFAULT 15,
  -- Activity preferences
  preferred_task_types TEXT[] DEFAULT '{}',
  blocked_categories TEXT[] DEFAULT '{"meeting", "call"}',
  -- Status
  is_active BOOLEAN DEFAULT true,
  -- Appearance
  color TEXT DEFAULT '#6366f1',
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_focus_blocks_user_id ON focus_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_blocks_active ON focus_blocks(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE focus_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own focus blocks"
  ON focus_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus blocks"
  ON focus_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus blocks"
  ON focus_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus blocks"
  ON focus_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_focus_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER focus_blocks_updated_at_trigger
  BEFORE UPDATE ON focus_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_focus_blocks_updated_at();
