-- Migration: 001-create-tables.sql
-- Create the application schema: users and tasks tables
-- Run this in the target database (e.g. connect to todo_db in pgAdmin and execute)

-- Create users table (for auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Example insert (uncomment to create a sample task)
-- INSERT INTO tasks (title, description) VALUES ('Sample task', 'Created by migration');
