-- FocusFlow schema
-- One table: every focus session a user logs.

CREATE TABLE IF NOT EXISTS focus_sessions (
    id SERIAL PRIMARY KEY,
    task VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),   -- minutes
    mood VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sample rows so the dashboard isn't empty on first run.
INSERT INTO focus_sessions (task, category, duration, mood) VALUES
    ('Read Terraform docs', 'Learning', 45, 'Focused'),
    ('Debug NSG rules', 'DevOps', 60, 'Determined');
