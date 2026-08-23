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
├── index.html          ← Homepage (hero, impact metrics, about, career, tech specs, contact)
├── resume.html         ← Dedicated résumé page (print stylesheet, PDF download)
├── favicon.svg         ← ZT monogram favicon
├── css/
│   ├── styles.css      ← Main styles (dark mode default; tokens on :root)
│   └── light-mode.css  ← Light mode token overrides (html.light-mode)
├── js/
│   └── main.js         ← All JavaScript (spheres, reveals, count-up, theme toggle, navigation)
├── assets/
│   ├── Zac_Truelove_Resume.pdf   ← Downloadable résumé (generated from resume.html via headless Chromium --print-to-pdf)
│   └── images/
│       └── og-image.png          ← Social share preview (1200×630)
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
  - 7 spheres with layered gradient rendering (specular highlights, rim lighting, caustics), at 0.35 canvas opacity so typography leads
  - Velocity: 0.39375
  - Canvas 2D was chosen over Three.js/WebGL — Zac preferred this aesthetic
- **Hairline dividers** (`--hairline`) instead of cards — Apple product-page aesthetic
- **Giant count-up metrics** (`.big-number`, animated on reveal, respects reduced motion)
- **Monospace eyebrows/labels** (`ui-monospace` stack) for a data-engineer voice
- **Scroll reveal animations** using IntersectionObserver (`.reveal` → `.in`)
- **Smooth scroll navigation** with scroll-to-top for "#" links
- **Theme switching:** tokens on `:root`, overridden by `html.light-mode`; an inline `<head>` script applies the saved theme pre-paint (no flash)

### Color Palette (Dark Mode)
- Background: #000000 (`--bg`), elevated #0d0d0d
- Hairlines/borders: #262626
- Text: #f5f5f5 (`--text`), #a3a3a3 (`--text-2`), #6b6b6b (`--text-3`)

## Site Sections

### index.html
- **Hero / Landing** — animated glass spheres, monospace eyebrow, giant name, one-line value prop, CTAs
- **Impact** (`#numbers`) — count-up metrics: 50% CPU reduction, 1,000 daily job executions, $200K saved, 20+ years
- **About** (`#about`) — large statement + Currently / Approach / Next notes
- **Career** (`#career`) — timeline of MHN, Macy's, Southwestern Energy with highlights
- **Tech specs** (`#specs`) — Apple-style spec sheet of the technical skill set
- **Contact** (`#contact`) — email (truelovesql@gmail.com) + LinkedIn (linkedin.com/in/ztruelove/)
- **Footer** — copyright + links

### resume.html
- Full typeset résumé (summary, skills, experience, education), Print button (print stylesheet forces clean light output, ~2 pages), Download PDF button → `assets/Zac_Truelove_Resume.pdf`
- To regenerate the PDF after editing resume.html:
  `chromium --headless --no-pdf-header-footer --print-to-pdf=assets/Zac_Truelove_Resume.pdf resume.html`

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
