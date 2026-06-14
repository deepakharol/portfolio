# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

**Run locally:**
```bash
npm start        # serves on http://localhost:8000 via http-server
```

No build step — this is a pure static site (HTML/CSS/JS). Edit files and refresh the browser.

**Deploy:** `git push origin main` — Cloudflare Pages auto-deploys on every push to `main`. Build command is `exit 0`, output directory is `.` (repo root).

## Architecture

Single-page application in `index.html` with no framework or bundler.

**CSS is split into two files:**
- `assets/css/style.css` — global reset, CSS variables, navbar, hero section
- `assets/css/style-sections.css` — all other sections (about, experience, skills, projects, contact, modals, responsive breakpoints)

**JS is split into three files loaded in order at the bottom of `<body>`:**
- `assets/js/particles.js` — canvas-based animated particle background for the hero
- `assets/js/tetris.js` — fully self-contained Tetris game running on `#tetrisCanvas`
- `assets/js/main.js` — everything else: preloader, navbar scroll/active tracking, smooth scroll, typing effect (cycles 4 titles), IntersectionObserver scroll animations (`data-aos` attributes), contact form (fetch to FormSubmit.co), project detail modals

**Project modals** load static HTML content from a `getProjectData(projectId)` map inside `main.js` — no network call, no separate data file.

**Contact form** POSTs to `https://formsubmit.co/dkharol48@gmail.com` via fetch, shows an in-page success message on completion instead of redirecting.

**Sections and their nav anchors:** `#home`, `#about`, `#experience`, `#education`, `#skills`, `#projects`, `#awards`, `#contact`

**OG image** at `assets/images/og-preview.png` is referenced in meta tags but not yet created — needs a 1200×630px screenshot of the site.

## Planned work

- Todo Planner app to be hosted as a sub-section/sub-path on `deepakkharol.com`
- Requires backend API + database (stack TBD: Cloudflare Workers + D1, or Node + Postgres, or Supabase)
- Auth needed so only the owner can access the planner
