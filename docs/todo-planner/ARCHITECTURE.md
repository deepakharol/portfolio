# Todo Planner — Architecture

> Last updated: 2026-06-15

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Vanilla HTML/CSS/JS | Matches portfolio, zero build step |
| API | Cloudflare Pages Functions | Runs on same deploy pipeline as portfolio |
| Database | Cloudflare D1 (SQLite) | Free, edge-native, no connection pooling issues |
| File storage | Cloudflare R2 | 10GB free, S3-compatible, same Cloudflare account |
| Auth | PIN → HMAC-SHA256 JWT | No OAuth, no external service, owner-only |
| Deploy | `git push origin main` | Cloudflare Pages auto-deploys |

---

## File Structure

```
apps/
  todo/
    index.html          ← SPA shell — login screen + app layout
    style.css           ← Todo-specific styles (does NOT import portfolio CSS)
    app.js              ← All frontend logic

functions/
  apps/
    todo/
      api/
        _jwt.js         ← JWT sign/verify (Web Crypto API, no external deps)
        _middleware.js  ← Auth guard — runs before all routes, passes /auth through
        auth.js         ← POST /auth — validates PIN, returns signed JWT
        tasks/
          index.js      ← GET (list) / POST (create)
          [id].js       ← GET / PUT / DELETE a single task
          [id]/
            subtasks.js ← POST / PUT (batch) / DELETE subtasks
        attachments/
          index.js      ← POST upload to R2
          [id].js       ← GET stream from R2 / DELETE

docs/
  todo-planner/
    PRODUCT.md          ← Feature behavior, user flows (this is the source of truth for product)
    ARCHITECTURE.md     ← This file
    API.md              ← All endpoints, request/response shapes
    DATA-MODEL.md       ← DB schema, data structures
  CODING-STANDARDS.md   ← SOLID principles and conventions for this project

wrangler.toml           ← D1 + R2 bindings (also sets compatibility_date)
schema.sql              ← D1 table definitions (run once to create tables)
_redirects              ← /apps/todo → /apps/todo/ (trailing slash for Pages routing)
```

---

## Request Flow

```
Browser
  └─ GET deepakkharol.com/apps/todo/
       └─ Cloudflare Pages serves apps/todo/index.html

Browser (API call)
  └─ POST /apps/todo/api/auth
       └─ functions/apps/todo/api/_middleware.js  (skips auth check for /auth)
       └─ functions/apps/todo/api/auth.js

Browser (protected API call)
  └─ GET /apps/todo/api/tasks
       └─ functions/apps/todo/api/_middleware.js  (validates JWT)
       └─ functions/apps/todo/api/tasks/index.js
```

---

## Auth Flow

```
User enters PIN
  → POST /api/auth { pin }
  → Worker: SHA-256(pin) vs env.PIN_HASH
  → Match: sign JWT { sub: "owner", iat, exp } with env.JWT_SECRET (HMAC-SHA256)
  → Return { token }
  → Frontend: localStorage.setItem('todo_token', token)

Every subsequent request:
  → Authorization: Bearer <token>
  → _middleware.js verifies signature + expiry
  → Passes ctx.data.user = payload to route handler
  → 401 if invalid/expired → frontend auto-logs out
```

**Secrets (set in Cloudflare Dashboard → Settings → Environment Variables, encrypted):**
- `PIN_HASH` — `echo -n "YOUR_PIN" | shasum -a 256 | awk '{print $1}'`
- `JWT_SECRET` — random 32+ char string

---

## Frontend Architecture

`app.js` is a single module with no framework. State is:

```js
let token         // JWT from localStorage
let tasks         // full task list (loaded on login, reloaded after mutations)
let currentTaskId // selected task ID
let currentFilter // active filter tab
let saveTimer     // debounce handle for auto-save
let pendingFiles  // files queued in create modal before task exists
let tables        // parsed table_data array for the current task
```

**Data flow:**
1. Login → `loadTasks()` → sets `tasks`, calls `renderTaskList()`
2. `selectTask(id)` → `GET /tasks/:id` → `renderDetailPanel(task)` (sets `tables` from `task.table_data`)
3. Any detail field change → `scheduleDetailSave()` → debounce → `saveDetail()` → `PUT /tasks/:id`
4. `saveDetail()` always serializes `JSON.stringify(tables)` into the body

---

## SOLID Application

| Principle | How it's applied |
|-----------|-----------------|
| **S** — Single Responsibility | Each `functions/` file handles exactly one resource (tasks, subtasks, attachments, auth). `_jwt.js` does only JWT. `_middleware.js` does only auth. |
| **O** — Open/Closed | New task fields: add to the `fields` array in `[id].js` PUT handler — no other code changes needed. New filters: add a case to `filteredTasks()`. |
| **L** — Liskov Substitution | All Workers export named `onRequest*` functions with the same `(context) => Response` contract — any route can be tested/swapped independently. |
| **I** — Interface Segregation | API routes are split by resource. Client only calls endpoints it needs. No monolithic "do everything" endpoint. |
| **D** — Dependency Inversion | Route handlers depend on `env.DB` and `env.ATTACHMENTS` bindings (injected by Cloudflare), not concrete implementations. `_jwt.js` exposes `signJwt`/`verifyJwt` as pure functions — callers don't know the crypto algorithm. |

---

## Key Constraints

- **No build step** — no TypeScript, no bundler. Workers use ES modules natively.
- **No npm packages in Workers** — only Web APIs (Crypto, fetch, FormData, URL). `_jwt.js` uses `crypto.subtle` directly.
- **Pages Functions routing** — file path = URL path. `[id].js` = dynamic segment. `_middleware.js` runs before sibling + child routes.
- **D1 is SQLite** — use `TEXT` for UUIDs, `TEXT` for dates (ISO 8601), `INTEGER` for booleans (0/1).
- **R2 files are private** — never expose the R2 bucket publicly. Always stream through the authenticated `/api/attachments/:id` endpoint.
