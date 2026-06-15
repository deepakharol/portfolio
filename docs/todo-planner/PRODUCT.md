# Todo Planner — Product Behavior

> Last updated: 2026-06-15
> Path: `/apps/todo` → `deepakkharol.com/apps/todo`

## Purpose

A private personal task planner accessible only to the owner (Deepak). No public sign-up — single-user PIN-based access. Works across any device (browser, future Flutter app).

---

## Authentication

### Owner (PIN login)
- Entry point: full-screen PIN input
- PIN is SHA-256 hashed; the hash is stored as an encrypted Cloudflare secret (`PIN_HASH`)
- On correct PIN: receives a signed JWT (30-day expiry), stored in `localStorage`
- All API calls send `Authorization: Bearer <token>`
- On page load: if valid JWT in `localStorage`, skip PIN screen and go straight to task list
- Logout: clears `localStorage`, returns to PIN screen
- On any 401 from the API: auto-logout

### Guest / Demo Mode
- "Try it out" button on the login screen — no PIN needed
- Calls `POST /api/guest-auth`, receives a 1-hour guest JWT
- Demo banner shown at the top of the app: warns data is shared and expires in 1 hour
- Guest tasks have `demo = 1` in D1; owner tasks have `demo = 0` — they are fully isolated
- All guests share one sandbox (they see each other's demo tasks — intentional)
- Max 100 tasks in the demo sandbox at any time
- Guest attachments capped at 5MB per file (vs 50MB for owner)
- Expired demo tasks (> 1 hour old) are lazily deleted on each guest `GET /tasks` call, including their R2 files
- On guest JWT expiry (1 hour), next API call returns 401 → auto-logout back to login screen
- "Exit Demo" button in banner also logs out

---

## Task List Panel (Left)

- Lists all tasks sorted by: **priority (P0 first) → due date → created date**
- Each task card shows: title, priority badge, due date label (Today/Tomorrow/DD Mon), subtask progress (`done/total`), attachment count
- Overdue tasks (due date < today, status ≠ done) highlighted in red
- Clicking a card opens the task in the detail panel and marks it selected

### Filter Tabs

| Tab | Shows |
|-----|-------|
| All | Every task |
| Today | Non-done tasks due today |
| Overdue | Non-done tasks with past due date |
| P0 | Non-done P0 tasks |
| P1 | Non-done P1 tasks |
| P2 | Non-done P2 tasks |
| P3 | Non-done P3 tasks |
| Done | Completed tasks |

### Resize Handle

- A drag handle between the task list and detail panels lets the user resize the task list width
- Min: 220px / Max: 560px / Default: 340px
- Persisted to `localStorage` key `todo_panel_width`

---

## Create Task Modal

Triggered by "+ New Task" button in the header.

**Fields:**
- Title (required)
- Priority: P0 Urgent | P1 High (default) | P2 Medium | P3 Low
- Due Date (default: today)
- Description (optional)
- File Attachments (optional — queued as `pendingFiles`, uploaded after task is created)

**Behavior:**
- Press Enter in title field → creates task
- Cancel or click outside modal → closes without creating
- On success: task created, modal closes, task selected in detail panel, pending files uploaded

---

## Task Detail Panel (Right)

Opens when a task card is selected. All fields auto-save 800ms after the last change (debounced).

### Fields

| Field | Type | Notes |
|-------|------|-------|
| Title | text input | Required |
| Priority | select | P0/P1/P2/P3 — badge color updates live |
| Due Date | date picker | |
| Status | select | Pending / In Progress / Done |
| Description | textarea | Free-form text |

### Subtasks

- Bullet-point list below description
- Add via "+ Add a bullet point…" input → Enter
- Each subtask has: checkbox (marks complete), editable text, delete (×) button
- Checking off grays out text with strikethrough
- Subtask count badge on the task card updates immediately
- Deleting text from a subtask and blurring removes it

### Tables

- "Add Table" button opens an 8×8 hover-to-select grid picker
- Hovering over a cell highlights the N×M region and shows the size label (e.g. "3 × 4")
- Clicking inserts a table with that many rows and columns
- Each table has:
  - Optional title (editable inline)
  - Editable column headers
  - Editable cells
  - Delete column buttons (×) above each column header
  - Delete row buttons (×) at the end of each row
  - "Row" and "Col" buttons in the table header to add rows/columns
  - Trash button to delete the entire table
- Multiple tables per task supported
- Table data stored as JSON in `table_data` column; auto-saves with the task

### Attachments

- Drag-and-drop zone or click to browse (max 50MB per file)
- Images: shown as inline thumbnails (no click needed to preview)
  - Click thumbnail → full-size lightbox
  - Lightbox closes with ×, Escape, or click-outside
- Non-image files: icon + file extension badge
- Every attachment has a download button
- Attachments are served through an authenticated API endpoint (not a public R2 URL)
- Deleting an attachment removes it from both R2 and the DB

### Task Deletion

- "Delete" button at top-right of detail panel
- Confirmation dialog required
- Deletes: R2 files → DB attachments → subtasks → task (cascade)

---

## Priority System

| Priority | Label | Color | Use when |
|----------|-------|-------|----------|
| P0 | Urgent | Red `#dc2626` | Drop everything, do now |
| P1 | High | Orange `#ea580c` | Important, do today (default) |
| P2 | Medium | Blue `#2563eb` | Do this week |
| P3 | Low | Gray `#6b7280` | Nice to have |

---

## Planned / Future

- `api.deepakkharol.com` — clean API subdomain for Flutter clients
- Flutter app — Android, iOS, iPad, macOS — same REST API, different UI
- Shared session: JWT from web works on mobile too (same secret)
