# Todo Planner — Data Model

> Last updated: 2026-06-15

---

## D1 Schema (SQLite)

### tasks

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,                        -- UUID (crypto.randomUUID())
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority    TEXT DEFAULT 'P1',                       -- 'P0' | 'P1' | 'P2' | 'P3'
  due_date    TEXT DEFAULT (date('now')),              -- 'YYYY-MM-DD'
  status      TEXT DEFAULT 'pending',                  -- 'pending' | 'in_progress' | 'done'
  table_data  TEXT DEFAULT '[]',                       -- JSON string — see Table JSON below
  demo        INTEGER DEFAULT 0,                       -- 0 = owner task, 1 = shared guest/demo task
  category    TEXT DEFAULT 'personal',                 -- 'personal' | 'office' | 'random'
  sort_order  INTEGER DEFAULT NULL,                    -- NULL = use priority/date sort; set by drag-reorder
  created_at  TEXT DEFAULT (datetime('now')),          -- ISO 8601 datetime
  updated_at  TEXT DEFAULT (datetime('now'))           -- updated on every PUT
);
```

### subtasks

```sql
CREATE TABLE IF NOT EXISTS subtasks (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  completed   INTEGER DEFAULT 0,                       -- 0 = false, 1 = true
  order_index INTEGER DEFAULT 0                        -- lower = higher in list
);
```

### attachments

```sql
CREATE TABLE IF NOT EXISTS attachments (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,                          -- original filename from upload
  r2_key       TEXT NOT NULL,                          -- R2 object key (never exposed to client)
  content_type TEXT,
  size_bytes   INTEGER,
  created_at   TEXT DEFAULT (datetime('now'))
);
```

---

## R2 Object Keys

Pattern: `tasks/<task_id>/<uuid>/<filename>`

Example: `tasks/a1b2c3/f4e5d6/photo.jpg`

- One folder per task: makes cleanup easy on task delete
- UUID sub-folder: prevents collisions if same filename uploaded twice

---

## Table JSON (`table_data` column)

Stored as a JSON string in the `tasks.table_data` column. Parsed to/from the `tables` array in `app.js`.

```ts
type Table = {
  id: string;          // crypto.randomUUID() — local identifier
  title: string;       // optional display title
  columns: string[];   // column header labels, e.g. ["Name", "Status", "Notes"]
  rows: string[][];    // 2D array, rows[rowIndex][colIndex] = cell value
}

type TableData = Table[];  // always an array, even if empty
```

**Example value:**
```json
[
  {
    "id": "a1b2c3d4-...",
    "title": "Sprint tasks",
    "columns": ["Task", "Owner", "Status"],
    "rows": [
      ["Build login page", "Deepak", "Done"],
      ["Write API docs", "Deepak", "In Progress"]
    ]
  }
]
```

**Constraints:**
- Tables are stored and retrieved as-is — no server-side validation of the JSON structure
- Frontend is responsible for maintaining shape invariants (e.g. `rows[i].length === columns.length`)
- Deleting a column splices both `columns` and every row at the same index
- Adding a row appends `Array(columns.length).fill('')` to `rows`
- Adding a column pushes to `columns` and pushes `''` to every row

---

## Priority Enum

| Value | Label | Sort Order | Color |
|-------|-------|-----------|-------|
| `P0` | Urgent | 1 (highest) | `#dc2626` (red) |
| `P1` | High | 2 | `#ea580c` (orange) |
| `P2` | Medium | 3 | `#2563eb` (blue) |
| `P3` | Low | 4 (lowest) | `#6b7280` (gray) |

Default on create: `P1`

---

## Status Enum

| Value | Display | Behavior |
|-------|---------|---------|
| `pending` | ⏳ Pending | Default. Shown in all non-done filters. |
| `in_progress` | 🔄 In Progress | Shown in all non-done filters. |
| `blocked` | 🚫 Blocked | Shown in the "Blocked" filter tab. Hidden from P*/Today/Done tabs. |
| `done` | ✅ Done | Only shown in the "Done" filter tab. Hidden from Today/Overdue/P*/Blocked tabs. |

---

## JWT Payload

```json
{
  "sub": "owner",
  "iat": 1718400000,
  "exp": 1720992000
}
```

- Signed with HMAC-SHA256 using `env.JWT_SECRET`
- Expiry: 30 days from issue
- No refresh — user re-enters PIN after expiry
