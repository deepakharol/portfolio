# Coding Standards

> Applies to all code in this repository (portfolio site + sub-apps).
> Last updated: 2026-06-15

---

## SOLID Principles

### S — Single Responsibility

Every file, function, and module does exactly one thing.

- Each `functions/apps/todo/api/` file handles one resource endpoint group
- `_jwt.js` only signs and verifies JWTs — nothing else
- `_middleware.js` only enforces auth — no business logic
- In `app.js`: render functions only render (no API calls inside them); API calls happen in action handlers

**Red flags:** A function named `handleTaskAndSubtaskAndUpload`, a file that does DB + business logic + response formatting in one block.

### O — Open/Closed

Extend by adding, not modifying core logic.

- New task field: add to the `fields` array in `PUT /tasks/:id` — no other route changes
- New filter tab: add a `case` to `filteredTasks()` in `app.js`
- New file type icon: add a condition to `fileIcon()` util
- New API resource: create a new file in `functions/` — don't touch existing ones

### L — Liskov Substitution

Consistent contracts across parallel implementations.

- All Workers route exports (`onRequestGet`, `onRequestPost`, etc.) have the same signature: `(context) => Promise<Response>`
- All render functions take their data as a parameter — they don't pull from global state themselves
- `signJwt` and `verifyJwt` are pure functions: same input always gives same output

### I — Interface Segregation

Don't force callers to depend on things they don't use.

- API routes only return the fields a client needs. `GET /tasks` returns summary counts, not full subtask arrays. `GET /tasks/:id` returns full detail.
- The `r2_key` field is never included in API responses — it's an internal storage detail
- `_jwt.js` exports only two functions; callers don't know about the crypto internals

### D — Dependency Inversion

Depend on abstractions (injected bindings), not concrete implementations.

- Route handlers receive `env.DB` and `env.ATTACHMENTS` from Cloudflare's context injection — they never construct DB connections themselves
- `_middleware.js` calls `verifyJwt(token, secret)` — if the algorithm changes, only `_jwt.js` changes
- Frontend uses `apiFetch()` / `apiJSON()` helpers — route handlers don't construct raw `fetch` calls with headers inline

---

## General Rules

### No comments that explain what the code does

Only comment the *why* when it's non-obvious:
```js
// R2 delete must happen before DB delete — FK cascade removes the metadata first
await Promise.all(attachments.map(a => env.ATTACHMENTS.delete(a.r2_key)));
```

Not:
```js
// loop through attachments and delete each one
```

### No defensive code for things that can't happen

Trust framework guarantees. Only validate at boundaries (user input, external API responses).

```js
// Good — validate user input at the edge
if (!title?.trim()) return json({ error: 'Title is required' }, 400);

// Bad — paranoid checks inside internal logic
if (tasks && Array.isArray(tasks) && tasks.length > 0) { ... }
```

### No unused abstractions

Three similar lines is fine. Don't extract a helper until you have four or more call sites.

### Naming

- Functions: verb-noun, camelCase — `renderTaskList`, `loadTasks`, `deleteAttachment`
- DOM IDs: kebab-case — `task-list-panel`, `btn-add-table`
- CSS classes: BEM-ish kebab — `task-card`, `task-card--selected`, `btn-del-row`
- DB columns: snake_case — `task_id`, `due_date`, `created_at`
- Constants / enums: uppercase — `'P0'`, `'P1'`, `'pending'`, `'done'`

### Error handling

- Workers: always return a `Response` — never `throw` unhandled. Wrap uncertain operations in try/catch and return a 500.
- Frontend: API errors that return 401 trigger auto-logout. Other errors should be surfaced to the user (not silently swallowed).

---

## Workers-Specific Rules

- Use `crypto.randomUUID()` for all IDs — never auto-increment integers
- Use `TEXT` for UUIDs, dates, booleans stored as JSON — D1 is SQLite, use appropriate types
- Use `datetime('now')` in SQL defaults, not JS `new Date()` — keeps timestamps consistent at the DB level
- Never put secrets in code — only `env.*` injected bindings
- Never expose R2 object keys or internal storage paths in API responses

---

## Frontend-Specific Rules

- Global state lives at the top of `app.js` — never scatter state across functions
- Render functions are pure: given data, produce DOM — no side effects, no API calls
- All API interactions go through `apiFetch()` / `apiJSON()` — no bare `fetch()` calls
- Debounce user-driven saves with `saveTimer` (800ms) — never save on every keystroke
- `tables` array is the in-memory representation of `table_data` — always `JSON.stringify(tables)` before saving

---

## CSS Rules

- Use CSS variables for all colors and spacing — defined in `:root` in `style.css`
- Priority colors are `--p0`, `--p1`, `--p2`, `--p3`
- No inline styles except for dynamic values set by JS (e.g. `panel.style.width`)
- Mobile-first responsive: base styles for mobile, `@media (min-width: 768px)` for desktop

---

## Git / Deploy

- Commit message: imperative mood, one line summary + optional body
- No commits that mix unrelated changes
- Every push to `main` auto-deploys to Cloudflare Pages — don't push broken code
- `wrangler.toml` and `schema.sql` are committed — they are config, not secrets
- Secrets live in Cloudflare Dashboard only — never in files

---

## Documentation

**Before implementing any feature:**
1. Read `docs/todo-planner/PRODUCT.md` — understand the current behavior
2. Read `docs/todo-planner/ARCHITECTURE.md` — understand the file structure and patterns
3. Check `docs/todo-planner/API.md` — check if the endpoint exists or needs to change
4. Check `docs/todo-planner/DATA-MODEL.md` — check if the schema needs a migration

**After implementing any feature:**
1. Update the relevant doc(s) to reflect the new behavior
2. If a new field was added to DB, update `DATA-MODEL.md` and `schema.sql`
3. If a new endpoint was added, update `API.md`
4. If behavior changed, update `PRODUCT.md`
