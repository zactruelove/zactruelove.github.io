# zactruelove.com — Project Brief

## Overview

Professional personal website for Zac Truelove at `zactruelove.com`. Hosted on **GitHub Pages** from the repo `zactruelove.github.io`. Domain is managed via **Cloudflare** (DNS active, domain registration transfer in progress from WordPress.com).

## Technical Stack

- **Hosting:** GitHub Pages (free, static)
- **DNS:** Cloudflare (free plan, DNS-only mode — no proxy)
- **Domain:** `zactruelove.com` — registration transferring to Cloudflare (~$10.44/year)
- **SSL/TLS:** GitHub Pages auto-provisioned certificate, Cloudflare set to "Full" mode
- **Framework:** Plain HTML / CSS / JavaScript (no build tools, no static site generator)
- **Repo:** `zactruelove.github.io`, deploying from `main` branch root
- **Deployment:** `git push origin main` → live at `https://zactruelove.com`

## File Structure

```
zactruelove.github.io/
├── index.html          ← Single-page site with all sections
├── css/
│   ├── styles.css      ← Main styles (dark mode default)
│   └── light-mode.css  ← Light mode theme overrides
├── js/
│   └── main.js         ← All JavaScript (animations, theme toggle, navigation)
├── assets/
│   └── images/
├── CNAME               ← Custom domain: zactruelove.com
├── CLAUDE.md
└── README.md
```

## Design

- **Pure monochromatic color scheme** — blacks, whites, grays only. No accent colors.
- **Dark mode default** with light mode toggle (persisted via localStorage)
- **Professional but not corporate** — polished, modern, technically credible
- **Low content volume** — clean, spacious layout with a few well-crafted sections

### Visual Elements
- **Glass sphere animation** in hero section using Canvas 2D (`FloatingBubbles` class)
  - 12 spheres with layered gradient rendering (specular highlights, rim lighting, caustics)
  - Velocity: 0.39375
  - Canvas 2D was chosen over Three.js/WebGL — Zac preferred this aesthetic
- **Radial gradient cards** for depth: `radial-gradient(ellipse at center, #1a1a1a, #0a0a0a)`
- **Scroll reveal animations** using IntersectionObserver
- **Smooth scroll navigation** with scroll-to-top for "#" links

### Color Palette (Dark Mode)
- Backgrounds: #000000 (sections), #0a0a0a (base), #1a1a1a (cards)
- Text: #eeeeee (primary), #cccccc (muted), #999999 (dim)
- Borders: #2a2a2a
- Hero title: #f5f5f5

## Site Sections

- **Hero / Landing** — animated glass spheres, name, title, description, CTA
- **Stats Bar** — SQL Server / Database Development, Healthcare / Industry Focus, ActiveBatch / Workload Automation
- **About** — professional summary
- **Skills / Tech Stack** — skill cards with descriptions
- **Contact** — email (truelovesql@gmail.com) + LinkedIn (linkedin.com/in/ztruelove/)
- **Footer** — copyright + site credit

## About Zac (content context)

- **Title/Role:** Data Engineer / SQL Server Developer
- **Core tech stack:** SQL Server, ETL pipeline development, ActiveBatch workload automation
- **Industry:** Healthcare
- **Experience level:** Senior — deep expertise in SQL Server development, data warehousing, and performance optimization
- **Contact:** truelovesql@gmail.com | https://www.linkedin.com/in/ztruelove/

## Constraints & Preferences

- **Budget:** Minimal cost (~$10.44/year for domain only). Everything else is free.
- **Complexity:** No build tools, no npm, no webpack. Files directly served by GitHub Pages.
- **Development workflow:** Edit locally in VS Code with Claude Code → commit → push → live.
- **No static site generator** unless blog functionality is needed later.
- **Commit style:** Descriptive commit messages with Co-Authored-By tag for Claude.

## Infrastructure Notes

- **Cloudflare DNS:** All records set to "DNS only" (gray cloud), NOT proxied. GitHub Pages needs direct DNS for HTTPS certificates.
- **GitHub Pages:** Custom domain configured, HTTPS enforced.
- **WordPress.com:** Plan cancelled (runs through Sep 2026). Domain registration transferring to Cloudflare.
