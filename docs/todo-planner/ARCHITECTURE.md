# Todo Planner — Architecture

> Last updated: 2026-06-16

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Vanilla HTML/CSS/JS | Matches portfolio, zero build step |
| API | Cloudflare Pages Functions | Runs on same deploy pipeline as portfolio |
| Database | Cloudflare D1 (SQLite) | Free, edge-native, no connection pooling issues |
| File storage | Cloudflare R2 | 10GB free, S3-compatible, same Cloudflare account |
| Auth | PIN or Google Sign-In → HMAC-SHA256 JWT | Owner-only; both paths mint the same app JWT |
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
        _middleware.js  ← Auth guard — runs before all routes, passes the auth endpoints through
        auth.js         ← POST /auth — validates PIN, returns signed JWT
        guest-auth.js   ← POST /guest-auth — issues a 1-hour guest JWT (demo mode)
        google-auth.js  ← POST /google-auth — verifies a Google ID token (RS256 via JWKS), owner-email gated
        tasks/
          index.js      ← GET (list) / POST (create)
          reorder.js    ← PATCH — batch-write sort_order after drag-reorder
          [id].js       ← GET / PUT / DELETE a single task
          [id]/
            subtasks.js ← POST / PUT (batch) / DELETE subtasks (parent-task scope enforced)
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

Three entry points, all converging on the same app JWT:

```
PIN login
  → POST /api/auth { pin }
  → Worker: SHA-256(pin) vs env.PIN_HASH
  → Match: sign owner JWT { sub: "owner", iat, exp } with env.JWT_SECRET (HMAC-SHA256)

Google Sign-In
  → GIS returns a Google ID token → POST /api/google-auth { credential }
  → Worker fetches Google JWKS, verifies RS256 signature + aud/iss/exp/email_verified
  → email === env.OWNER_EMAIL → sign the SAME owner JWT

Guest / Demo
  → POST /api/guest-auth (no credentials)
  → sign guest JWT { sub: "guest", role: "guest", exp: now+1h }

Every subsequent request:
  → Authorization: Bearer <token>
  → _middleware.js verifies signature + expiry, then sets context.data.isGuest = (payload.role === 'guest')
  → 401 if invalid/expired → frontend auto-logs out
```

Route handlers read `data.isGuest` to scope every query to `demo = 0` (owner) or `demo = 1` (guest).

**Secrets (set in Cloudflare Dashboard → Pages project → Settings → Variables and Secrets):**
- `PIN_HASH` — SHA-256 hex of your chosen PIN. Generate with:
  ```bash
  echo -n "YOUR_PIN_HERE" | shasum -a 256 | awk '{print $1}'
  ```
  Paste only the 64-character hex string. Do NOT include the filename suffix (` -`) that shasum appends.
- `JWT_SECRET` — any random 32+ character string. Generate with:
  ```bash
  openssl rand -hex 32
  ```
- `GOOGLE_CLIENT_ID` — the OAuth client ID for Google Sign-In (also hardcoded in `index.html`'s `g_id_onload` for the button). Authorized origins must include `https://deepakkharol.com` and the local dev origin.
- `OWNER_EMAIL` — the single Google account email allowed to sign in (e.g. the owner's Gmail). Any other verified Google account is rejected.

**To change your PIN:**
1. Run the shasum command above with your new PIN
2. Go to Cloudflare Dashboard → Pages → portfolio → Settings → Environment Variables
3. Update `PIN_HASH` with the new 64-char hex value
4. Redeploy (or wait for next auto-deploy)
5. Your old JWT tokens remain valid until they expire (30 days); logout and re-login with new PIN

> ⚠️ Never commit the actual PIN value or its hash to the repository. Only store it in Cloudflare's encrypted environment variable store.

---

## Frontend Architecture

`app.js` is a single module with no framework. State is:

```js
let token           // JWT from localStorage
let isGuest         // true when signed in via guest/demo
let tasks           // full task list (loaded on login, kept in sync in-memory after mutations)
let currentTaskId   // selected task ID
let currentFilter   // active filter tab
let currentCategory // active category tab ('personal' | 'office' | 'random')
let viewMode        // 'list' | 'calendar'
let calYear, calMonth // month shown in the calendar view
let saveTimer       // debounce handle for auto-save
let pendingFiles    // files queued in create modal before task exists
let tables          // parsed table_data array for the current task
const taskCache     // Map id → { task, ts } — short-lived detail cache (30s TTL)
```

**Data flow:**
1. Login → `loadTasks()` → sets `tasks`, calls `renderTaskList()` + `renderCalendar()`
2. `selectTask(id)` → serves from `taskCache` if fresh (< 30s), else `GET /tasks/:id` → `renderDetailPanel(task)` (sets `tables` from `task.table_data`)
3. Any detail field change → `scheduleDetailSave()` → debounce → `saveDetail()` → `PUT /tasks/:id`
4. `saveDetail()` always serializes `JSON.stringify(tables)` into the body

**Performance model (no reload-the-world):**
- Mutations update the in-memory `tasks` array and re-render locally instead of re-fetching the whole list. `loadTasks()` runs on login and after create only.
- Any mutation that changes a task's detail must invalidate its `taskCache` entry (`taskCache.delete(id)`), or a re-select within the TTL would show stale data.
- Card done-toggle, drag-reorder, and subtask-split apply optimistically, then persist in the background.

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
