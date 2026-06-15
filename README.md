# Deepak Kharol — Portfolio

Live at **[deepakkharol.com](https://deepakkharol.com)**

Personal portfolio and full-stack mini-apps, deployed on Cloudflare Pages with edge Workers, D1 (SQLite), and R2 (object storage).

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML / CSS / JS — no framework, no bundler |
| Hosting | Cloudflare Pages (auto-deploy on push to `main`) |
| API | Cloudflare Pages Functions (Workers) |
| Database | Cloudflare D1 (SQLite at the edge) |
| File storage | Cloudflare R2 |
| Auth | PIN → HMAC-SHA256 JWT |

---

## Project Structure

```
index.html                  ← Single-page portfolio
assets/
  css/
    style.css               ← Reset, variables, navbar, hero
    style-sections.css      ← All other sections + responsive breakpoints
  js/
    particles.js            ← Canvas particle background
    tetris.js               ← Playable Tetris game
    main.js                 ← Everything else (nav, animations, modals, contact form)
  images/

apps/
  todo/                     ← Todo Planner SPA (deepakkharol.com/apps/todo)
    index.html
    app.js
    style.css

functions/
  apps/todo/api/            ← Pages Functions (edge API)
    auth.js                 ← POST /auth — PIN login, returns 30-day JWT
    guest-auth.js           ← POST /guest-auth — demo session, 1-hour JWT
    tasks/
      index.js              ← GET / POST tasks
      [id].js               ← GET / PUT / DELETE task
      [id]/subtasks.js      ← GET / POST / PUT subtasks
      [id]/tables.js        ← GET / POST / PUT / DELETE tables
    attachments/
      index.js              ← POST — upload to R2
      [id].js               ← GET (stream from R2) / DELETE

docs/
  todo-planner/
    PRODUCT.md              ← Feature behaviour reference
    ARCHITECTURE.md         ← File structure and patterns
    API.md                  ← All endpoints
    DATA-MODEL.md           ← D1 schema
  CODING-STANDARDS.md

schema.sql                  ← D1 table definitions
wrangler.toml               ← D1 + R2 bindings
```

---

## Running Locally

**Portfolio (static site):**
```bash
npm start          # serves on http://localhost:8000
```

**Todo Planner (with live API):**
```bash
# 1. Create .dev.vars in the repo root (gitignored)
echo 'PIN_HASH=<sha256-of-your-pin>' >> .dev.vars
echo 'JWT_SECRET=<random-32-char-string>' >> .dev.vars

# 2. Start the full Pages + Functions dev server
npx wrangler pages dev . --d1 DB=<your-d1-database-id>
# App available at http://localhost:8788/apps/todo
```

To get your D1 database ID: Cloudflare Dashboard → Workers & Pages → D1 → your database.

To generate `PIN_HASH`: `echo -n "yourpin" | shasum -a 256`

---

## Sub-Apps

### Todo Planner (`/apps/todo`)

Private task manager with PIN auth, file attachments, subtasks, and inline tables.

- **Owner session** — 30-day JWT, full read/write
- **Guest/Demo session** — 1-hour JWT, shared sandbox, max 100 tasks
- **Attachments** — images, video, PDF, Office files up to 50 MB stored in R2; served via authenticated JS fetch (never bare `<img src>` URLs)
- **HEIC support** — client-side conversion via `heic2any` before upload

Full docs in [`docs/todo-planner/`](docs/todo-planner/).

---

## Deploy

Push to `main` — Cloudflare Pages auto-deploys. Build command is `exit 0`, output directory is `.`.

**Required environment variables** (set in Cloudflare Dashboard → Settings → Variables and Secrets):

| Variable | Description |
|----------|-------------|
| `PIN_HASH` | SHA-256 hex of your PIN |
| `JWT_SECRET` | Random secret for signing JWTs |

---

## Author

**Deepak Kharol** — Senior Software Engineer at CleverTap

- [deepakkharol.com](https://deepakkharol.com)
- [linkedin.com/in/deepakkharol](https://linkedin.com/in/deepakkharol)
- [github.com/deepakharol](https://github.com/deepakharol)
