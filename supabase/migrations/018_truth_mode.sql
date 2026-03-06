-- Migration 018: Truth Mode preference
-- Adds truth_mode column for controlling AI directness level

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS truth_mode text DEFAULT 'direct';
