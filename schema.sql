CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'P1',
  due_date TEXT DEFAULT (date('now')),
  status TEXT DEFAULT 'pending',          -- 'pending' | 'in_progress' | 'done' | 'blocked'
  table_data TEXT DEFAULT '[]',
  demo INTEGER DEFAULT 0,                 -- 0 = owner task, 1 = shared guest/demo task
  category TEXT DEFAULT 'personal',       -- 'personal' | 'office' | 'random'
  sort_order INTEGER DEFAULT NULL,        -- NULL = use default priority/date sort; set by drag-reorder
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
