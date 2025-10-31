-- Migration: 002-add-userid-to-tasks.sql
-- Add user_id to tasks so tasks can be associated with a user and emailed to the owner

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add an index for queries by user
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
