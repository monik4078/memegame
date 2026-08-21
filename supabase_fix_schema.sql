-- Fix for Supabase error:
-- "new row for relation "game_content" violates check constraint "game_content_type_check""

-- Drop the legacy CHECK constraint on the `type` column of `game_content` table
-- so that new custom categories and question types can be saved without error.

ALTER TABLE game_content DROP CONSTRAINT IF EXISTS game_content_type_check;

-- Ensure `type` column is text type with no restrictions
ALTER TABLE game_content ALTER COLUMN type TYPE text;
