# Todo Planner — Feature Implementation Plan

> **Created:** 2026-07-11
> **Owner:** Deepak Kharol
> **Status legend:** ⬜ Not started · 🔵 In progress · ✅ Done

This plan covers every feature requested. Each feature includes its complexity rating, exact files to change, and clear implementation notes. AI agents working on this repo must update the status and notes here after completing or modifying any feature.

---

## Feature List

| # | Feature | Complexity | Status |
|---|---------|-----------|--------|
| 1 | Drag & reorder tasks in the list | Medium | ✅ |
| 2 | Tick box to mark task done from left panel | Low | ✅ |
| 3 | New "Blocked" status + show status in left panel | Low | ✅ |
| 4 | Clickable links in subtask text and description | Low | ✅ |
| 5 | Enter in middle of subtask splits it into two | Medium | ✅ |
| 6 | Performance: make the page fast | High | ✅ |
| 7 | Task categories (Personal / Office / Random) with tabs | Medium | ✅ |
| 8 | Calendar View | High | ✅ |
| 9 | Google Login | High | ✅ |

---

## Feature 1 — Drag & Reorder Tasks in the List

**Goal:** Users can drag task cards in the left panel to reorder them. The new order persists.

**Complexity:** Medium

**Design Decision:**
The current sort is server-driven: `priority → due_date → created_at`. Drag-to-reorder implies a user-defined `sort_order` column that overrides this. Two options:
- **Option A (Recommended):** Add a `sort_order INTEGER` column to `tasks`. When the user drags, batch-update `sort_order` for affected tasks. Server orders by `sort_order ASC` first (when non-null), then falls back to existing logic.
- **Option B:** Client-only reorder with `localStorage` persisting order. Simpler, but order lost on new device/browser.

**Chosen approach:** Option A — persistent server-side sort order.

### DB Change
```sql
-- Migration: run once on the D1 database
ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT NULL;
```

### Files to change

#### `schema.sql`
- Add `sort_order INTEGER DEFAULT NULL` to `tasks` table definition.

#### `functions/apps/todo/api/tasks/index.js`
- `GET /tasks`: change `ORDER BY` to `sort_order ASC NULLS LAST, CASE priority...` so explicitly ordered tasks appear first, others fall back to priority sort.
- Add `PUT /reorder` endpoint — or add batch sort update to existing subtask batch pattern. Best: add a dedicated `PATCH /tasks/reorder` endpoint.

#### `functions/apps/todo/api/tasks/reorder.js` *(NEW)*
```
PATCH /apps/todo/api/tasks/reorder
Body: [{ id: "uuid", sort_order: 0 }, ...]
Response 200: { success: true }
```
- Validates array, runs batch `UPDATE tasks SET sort_order = ? WHERE id = ?` using D1 batch API.

#### `apps/todo/app.js`
- Replace static `innerHTML` render in `renderTaskList()` with DOM nodes so drag events can be attached.
- Use the native **HTML5 Drag and Drop API** (`draggable="true"`, `dragstart`, `dragover`, `drop` events).
- On `drop`: recompute `sort_order` for all visible tasks and call `PATCH /tasks/reorder`.
- Show a visual drag ghost / highlight the drop target with a CSS class.

#### `apps/todo/style.css`
- Add `.task-card[draggable="true"]` cursor: `grab`.
- Add `.task-card.drag-over` with a top border highlight to show insert position.

#### `docs/todo-planner/DATA-MODEL.md`
- Document new `sort_order` column.

#### `docs/todo-planner/API.md`
- Document `PATCH /tasks/reorder`.

---

## Feature 2 — Tick Box to Mark Task Done from Left Panel

**Goal:** Each task card in the left panel has a checkbox. Checking it sets `status = 'done'` immediately without opening the task.

**Complexity:** Low

### Files to change

#### `apps/todo/app.js`
- In `renderTaskList()`, add a checkbox `<input type="checkbox">` to each task card HTML.
- The checkbox `checked` state = `t.status === 'done'`.
- Add `onclick` handler: `toggleTaskDone(event, taskId, currentStatus)`. Use `e.stopPropagation()` to prevent `selectTask()` from firing.
- `toggleTaskDone()`: call `PUT /tasks/:id` with `{ status: currentStatus === 'done' ? 'pending' : 'done' }`, then update `tasks` array and re-render.
- If the toggled task is currently open in the detail panel, also update `#detail-status` select value to keep them in sync.

#### `apps/todo/style.css`
- Style `.task-card-checkbox` — position it to the left of the title, sized appropriately, with a custom checked appearance matching the priority colors.

---

## Feature 3 — "Blocked" Status + Show Status in Left Panel

**Goal:** Add a 4th task status `blocked`. Show the current status as a small badge/icon on the task card in the left panel.

**Complexity:** Low

### DB Change
No migration needed — `status` is a TEXT column with no CHECK constraint in SQLite. The new value `'blocked'` is valid immediately.

### Files to change

#### `functions/apps/todo/api/tasks/[id].js`
- The `fields` array in PUT already includes `status` — no change needed to the route.

#### `apps/todo/app.js`
- `filteredTasks()`: add `case 'blocked': return tasks.filter(t => t.status === 'blocked');` (for future use with filter tab in Feature 7).
- `renderTaskList()`: Add a status icon/badge to each task card. Map status → icon:
  - `pending` → no badge (keep it clean)
  - `in_progress` → 🔄 or `fas fa-sync` (blue)
  - `blocked` → 🚫 or `fas fa-ban` (red/orange)
  - `done` → ✅ or `fas fa-check-circle` (green)
- Update the status `<select>` in the detail panel HTML (in `index.html`) to add `<option value="blocked">🚫 Blocked</option>`.

#### `apps/todo/index.html`
- Add `<option value="blocked">🚫 Blocked</option>` to `#detail-status`.

#### `apps/todo/style.css`
- Add `.status-badge` styles for each status value with distinct colors.

#### `docs/todo-planner/DATA-MODEL.md`
- Update Status Enum table to include `blocked`.

#### `docs/todo-planner/PRODUCT.md`
- Update status documentation.

---

## Feature 4 — Clickable Links in Subtask Text and Description

**Goal:** URLs typed or pasted into the description textarea and subtask text inputs become clickable hyperlinks.

**Complexity:** Low

**Design note:** The description is a `<textarea>` (not a rich text editor). Two approaches:
- **Option A (Recommended):** Render a read-only preview div below the textarea that converts URLs to `<a>` tags. The textarea remains for editing. Toggle between "edit mode" (textarea visible) and "view mode" (preview div visible).
- **Option B:** Replace the textarea with a `contenteditable` div. More complex.

**Chosen:** Option A — minimal change, safe.

### Files to change

#### `apps/todo/app.js`
- Add utility `linkify(text)`: escapes HTML, then replaces URL regex with `<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>`.
- In `renderDetailPanel()`: populate both the `<textarea>` and a new `<div id="description-preview">` with `innerHTML = linkify(task.description)`.
- Add `focus` event on textarea: hide preview, show textarea.
- Add `blur` event on textarea: hide textarea, show preview (re-render linkified content).
- For subtasks: since they use `<input type="text">`, render an additional read-only `<span>` next to each subtask for the linkified view, shown on blur. On click of span, switch back to input for editing.
  - Simpler alternative for subtasks: detect if the entire subtask value is a URL, and in that case render it as a link directly.

#### `apps/todo/index.html`
- Add `<div id="description-preview" class="description-preview"></div>` below `#detail-description`.

#### `apps/todo/style.css`
- Style `.description-preview a` to use `var(--primary)` color, underline on hover.
- `.description-preview` should match the textarea height/font.

---

## Feature 5 — Enter in Middle of Subtask Splits It Into Two

**Goal:** Pressing Enter while the cursor is mid-text in a subtask input splits the text at the cursor: the text before the cursor stays in the current subtask, and the text after the cursor becomes a new subtask inserted immediately below.

**Complexity:** Medium

**Current behavior:** `subtaskKeydown(e)` only handles Enter by focusing the add-subtask input at the bottom. This needs to be replaced with context-aware split logic.

### Files to change

#### `apps/todo/app.js`
- In `renderSubtasks()`, change `onkeydown` attribute to `subtaskKeydown(event, '${s.id}')` — pass the subtask id.
- Rewrite `subtaskKeydown(e, id)`:
  ```js
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const input = e.target;
  const cursor = input.selectionStart;
  const fullText = input.value;
  const before = fullText.slice(0, cursor);
  const after = fullText.slice(cursor);
  // Update current subtask with `before`
  input.value = before;
  // Find the index of this subtask in the DOM
  const items = [...document.querySelectorAll('.subtask-item')];
  const idx = items.findIndex(el => el.dataset.id === id);
  // Create new subtask via API with content = after (or '' if at end)
  // Insert it at position idx+1 (use order_index)
  await insertSubtaskAfter(id, after);
  ```
- Add `insertSubtaskAfter(afterId, content)`:
  - Calls `POST /tasks/:id/subtasks` with `{ content: content || ' ', after_id: afterId }`.
  - API needs to handle `after_id` to set correct `order_index`.
  - After API call, refresh subtasks and focus the new input.
- Alternatively (simpler, avoids API change): do everything client-side, then call `batchUpdateSubtasks()`:
  - Build the new subtasks array in memory (insert new item after current).
  - Re-render with `renderSubtasks()`.
  - Call batch PUT to persist.
  - Focus the new subtask input.

**Recommended simpler path (no API change):**
- In `subtaskKeydown`: split text in memory, rebuild the subtasks array including a new entry with a temporary client-side UUID, call `batchUpdateSubtasks()` (which will `PUT` with all subtasks including the new one — the API accepts new ids in the batch), then `refreshSubtasks()` and focus the new element.

#### `functions/apps/todo/api/tasks/[id]/subtasks.js`
- Check if `PUT` batch endpoint currently handles **new** subtask IDs (not yet in DB). It likely does an `UPDATE` only. Need to change it to `INSERT OR REPLACE` or handle new items via `INSERT`.
- Update batch PUT to use `INSERT OR REPLACE INTO subtasks (id, task_id, content, completed, order_index) VALUES (...)`.

---

## Feature 6 — Performance: Make the Page Fast

**Goal:** The app feels slow. Identify bottlenecks and fix them. Change architecture if necessary.

**Complexity:** High

### Current Bottlenecks (Identified from Code Review)

| # | Problem | Location | Impact |
|---|---------|----------|--------|
| A | `loadTasks()` is called after every save (`saveDetail()` calls `await loadTasks()`) — every keystroke (after 800ms) makes a full task list API round-trip | `app.js:248` | High |
| B | `batchUpdateSubtasks()` also calls `await loadTasks()` | `app.js:313` | High |
| C | Images are fetched one-by-one via authenticated fetch (serial, no parallelism issue but adds latency per image) | `app.js:540-542` | Medium |
| D | `selectTask()` fetches the full task detail on every card click — no client-side cache | `app.js:182` | Medium |
| E | No HTTP caching headers on API responses | All Workers | Low-Medium |

### Fix Plan

#### A & B — Eliminate redundant `loadTasks()` calls after saves
- **Solution:** After `saveDetail()` or `batchUpdateSubtasks()`, update the in-memory `tasks` array **locally** instead of fetching from server. Only refetch from server on login, page refresh, or after create/delete.
- In `saveDetail()`: after PUT succeeds, find the task in `tasks[]` by `currentTaskId` and update the fields locally (`tasks = tasks.map(...)`), then call `renderTaskList()`. Remove `await loadTasks()`.
- In `batchUpdateSubtasks()`: update the subtask counts in the local `tasks` entry, then `renderTaskList()`. Remove `await loadTasks()`.
- In `refreshSubtasks()`: still fetches full task (needed for subtask list) — keep, but update local `tasks` array with new counts.

#### C — Parallel image loading
- `renderAttachments()` currently calls `.forEach()` which fires all `loadImageBlob()` calls in parallel already (no `await` in forEach). This is already parallel. ✅ No change needed.
- Add `loading="lazy"` where possible (N/A since we use blob URLs).

#### D — Client-side task detail cache
- Add `const taskCache = new Map()` at the top of `app.js`.
- In `selectTask(id)`: check `taskCache.get(id)`. If cached and fresh (< 30s old), use cached data. If stale or absent, fetch and store in cache.
- Invalidate cache entry on: `saveDetail()`, `addSubtask()`, `deleteSubtask()`, `uploadFiles()`, `deleteAttachment()`.

#### E — Add Cache-Control headers to API responses
- In Workers: for `GET /tasks` and `GET /tasks/:id`, add `Cache-Control: private, no-cache` (allows browser to cache but revalidate). Since we use Bearer token auth, browser won't share across users.

#### Additional: Optimistic UI updates
- For checkbox toggles (Feature 2) and status changes: update the UI immediately before the API call resolves (optimistic update), revert on error.

### Files to change
- `apps/todo/app.js` — remove `loadTasks()` calls from `saveDetail`, `batchUpdateSubtasks`; add task cache.
- `functions/apps/todo/api/tasks/index.js` — add Cache-Control header.
- `functions/apps/todo/api/tasks/[id].js` — add Cache-Control header.

---

## Feature 7 — Task Categories (Personal / Office / Random) with Tabs

**Goal:** Tasks are grouped into 3 categories: **Personal**, **Office**, **Random**. The category tabs appear at the top of the left panel (above or replacing the existing filter tabs). Switching category tabs shows only tasks in that category. The filter tabs (All / Today / P0 etc.) work within the selected category.

**Complexity:** Medium

### DB Change
```sql
ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'personal'; -- 'personal' | 'office' | 'random'
```

### Design
- Category tabs are a **top-level** selector: Personal | Office | Random.
- Filter tabs (All, Today, Overdue, P0-P3, Done, Blocked) remain below and filter within the selected category.
- A global `let currentCategory = 'personal'` state variable controls which tasks are shown.

### Files to change

#### `schema.sql`
- Add `category TEXT DEFAULT 'personal'` to `tasks`.

#### `functions/apps/todo/api/tasks/index.js`
- `GET /tasks`: add `WHERE ... AND category = ?` binding using a new query param `?category=personal` (or return all and let client filter — simpler, as task lists are small).
- **Recommended:** Return all tasks as today; add `category` field to each task. Let frontend filter by category (avoids an extra API call per tab switch).

#### `functions/apps/todo/api/tasks/[id].js`
- PUT: add `'category'` to the `fields` array so it can be updated.

#### `functions/apps/todo/api/tasks/index.js`
- POST: extract `category` from body, default to `'personal'`.

#### `apps/todo/app.js`
- Add `let currentCategory = 'personal'` to global state.
- `filteredTasks()`: add category pre-filter before existing filter logic:
  ```js
  const byCategory = tasks.filter(t => t.category === currentCategory);
  // then apply currentFilter on byCategory
  ```
- Add `setCategoryTab(cat)` function.
- Add category selector in `createTask()` — read from `#new-category` select.
- In `renderDetailPanel()`: populate `#detail-category` select.
- Add `detail-category` to the auto-save listener list.

#### `apps/todo/index.html`
- Add category tabs HTML above `#filter-tabs`:
  ```html
  <div id="category-tabs">
    <button class="category-tab active" data-cat="personal">Personal</button>
    <button class="category-tab" data-cat="office">Office</button>
    <button class="category-tab" data-cat="random">Random</button>
  </div>
  ```
- Add `<select id="new-category">` in create modal.
- Add `<select id="detail-category">` in detail panel (in the meta row alongside priority/status).

#### `apps/todo/style.css`
- Style `#category-tabs` — prominent tab bar at the top with distinct active state.
- Use category-specific accent colors or icons if desired.

#### `docs/todo-planner/DATA-MODEL.md`
- Document `category` column.

#### `docs/todo-planner/API.md`
- Document `category` field in POST/PUT/GET.

---

## Feature 8 — Calendar View

**Goal:** A calendar view shows tasks placed on their due dates. Accessible via a toggle button (e.g. "📅 Calendar" / "📋 List" toggle in the header). Clicking a task on the calendar opens it in the detail panel.

**Complexity:** High

### Design
- Toggle button in the task list panel header: `List | Calendar` view.
- Calendar shows the current month with a grid of days.
- Each day cell shows task titles (truncated) with their priority color dot.
- Navigation: Prev/Next month arrows + "Today" button.
- Clicking a task in the calendar calls `selectTask(id)` as normal.
- No external library — implement with vanilla JS DOM.

### Files to change

#### `apps/todo/app.js`
- Add `let viewMode = 'list'` global state.
- Add `toggleView()` function.
- Add `renderCalendar(year, month)` function:
  - Builds a 7-column CSS grid for the month.
  - For each day: filter `tasks` for `due_date === day && category === currentCategory && status !== 'done'`.
  - Render task chips with priority color and truncated title.
- Add `prevMonth()`, `nextMonth()` functions updating `calYear`, `calMonth` state.
- Calendar respects current `currentCategory` and `currentFilter` (or shows all non-done for simplicity).

#### `apps/todo/index.html`
- Add `<div id="calendar-view" style="display:none">` inside the task list panel, alongside `<div id="task-list">`.
- Add view toggle button to the panel header.

#### `apps/todo/style.css`
- Full calendar grid styles: `.calendar-grid`, `.calendar-day`, `.calendar-task-chip`, day number header, today highlight, weekend dimming.

---

## Feature 9 — Google Login

**Goal:** Replace (or add alongside) the PIN login with Google OAuth 2.0. Users log in with their Google account. Owner access is gated to Deepak's specific Google account (by email). Guest/demo mode remains available.

**Complexity:** High

### Design
- Use **Google Identity Services** (GSI) — the modern, library-free OAuth 2.0 flow.
- The Google ID token (JWT) is sent to a new Worker endpoint `POST /api/google-auth`.
- The Worker verifies the Google ID token against Google's public keys, checks the `email` matches `env.OWNER_EMAIL`, and if valid issues the same internal HMAC-SHA256 JWT as the PIN flow.
- This way, the rest of the auth flow (Bearer token, middleware, 30-day expiry) is **unchanged**.

### New Cloudflare Secrets Required
| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `OWNER_EMAIL` | `dkharol48@gmail.com` (or whichever Google account is the owner) |

### Files to change

#### `functions/apps/todo/api/google-auth.js` *(NEW)*
- `POST /google-auth`
- No auth middleware (add to the passthrough list in `_middleware.js`).
- Receives `{ credential }` (Google ID token string).
- Verifies the token by fetching Google's public keys from `https://www.googleapis.com/oauth2/v3/certs` and validating the JWT signature, expiry, audience (`aud === env.GOOGLE_CLIENT_ID`).
- Checks `payload.email === env.OWNER_EMAIL`.
- On match: signs and returns the same 30-day internal JWT as `POST /auth`.
- On mismatch: returns `401 { error: 'Unauthorized Google account' }`.

#### `functions/apps/todo/api/_middleware.js`
- Add `url.pathname.endsWith('/api/google-auth')` to the passthrough list.

#### `apps/todo/index.html`
- Add Google Sign-In button to the login screen using GSI:
  ```html
  <script src="https://accounts.google.com/gsi/client" async></script>
  <div id="g_id_onload" data-client_id="YOUR_CLIENT_ID" data-callback="handleGoogleCredential"></div>
  <div class="g_id_signin" data-type="standard"></div>
  ```
- Alternatively: render a custom button and use `google.accounts.id.prompt()`.

#### `apps/todo/app.js`
- Add `async function handleGoogleCredential(response)`:
  - POSTs `{ credential: response.credential }` to `/api/google-auth`.
  - On success: stores token, calls `showApp()` — same as PIN login.
  - On error: shows error message.

#### `docs/todo-planner/ARCHITECTURE.md`
- Document Google OAuth flow alongside existing PIN flow.

#### `docs/todo-planner/API.md`
- Document `POST /google-auth` endpoint.

---

## Implementation Order (Recommended)

Start with quick wins, then tackle complex features. Performance fix (Feature 6) should be done early as it improves the dev/test experience.

```
Phase 1 — Quick wins (1-2 days)
  Feature 2  — Checkbox to mark done from left panel
  Feature 3  — Blocked status + status in left panel
  Feature 4  — Clickable links

Phase 2 — Core improvements (2-3 days)
  Feature 6  — Performance fixes
  Feature 5  — Enter splits subtask

Phase 3 — Category & UX (2-3 days)
  Feature 7  — Task categories (Personal/Office/Random)
  Feature 1  — Drag reorder

Phase 4 — Big features (4-6 days)
  Feature 8  — Calendar View
  Feature 9  — Google Login
```

---

## Cross-cutting Concerns

### DB Migrations
For each ALTER TABLE statement, run on the live D1 database via:
```bash
npx wrangler d1 execute todo-db --command "ALTER TABLE tasks ADD COLUMN ..."
```
And update `schema.sql` so it reflects the current schema.

### Documentation updates (mandatory after each feature)
Per `docs/CODING-STANDARDS.md`:
- New DB column → update `DATA-MODEL.md` + `schema.sql`
- New endpoint → update `API.md`
- Behavior change → update `PRODUCT.md`
- Architecture change → update `ARCHITECTURE.md`

### Testing each feature
Since there's no test suite, manually verify:
1. Owner mode (full JWT)
2. Guest mode (shared sandbox, 1-hour JWT)
3. Mobile browser (responsive)

---

## Notes for AI Agents

- **Read `CLAUDE.md` first** before making any change to understand the architecture.
- **Do not add npm packages to Workers** — only Web APIs.
- **All IDs must use `crypto.randomUUID()`** — no integers.
- **Update this `PLAN.md` file** after completing or partially implementing any feature: change the status in the table at the top and add a note under the relevant section.
- **Update the status** in the feature table: ⬜ → 🔵 when starting, 🔵 → ✅ when done.
