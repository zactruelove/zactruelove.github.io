# zactruelove.com — Project Brief

## Overview

Building a professional personal website for Zac Truelove at `zactruelove.com`. The site is hosted on **GitHub Pages** from the repo `zactruelove.github.io`. The domain is currently registered at WordPress.com and will be pointed via DNS once the site is ready — **do not touch DNS or WordPress until explicitly asked.**

## Technical Stack

- **Hosting:** GitHub Pages (free, static)
- **Framework:** Plain HTML / CSS / JavaScript (no static site generator — keep it simple)
- **Repo:** `zactruelove.github.io` (already created, cloned locally, GitHub Pages enabled, deploying from `main` branch root)
- **Deployment:** `git push origin main` → live at `https://zactruelove.github.io`

## Design Direction

- **Professional but not corporate.** This is a personal site for a data engineering professional — it should feel polished, modern, and technically credible.
- **Visually impressive.** Zac wants cool graphics and visualizations even if the site isn't deep in content. Think animated hero sections, interactive data visualizations, scroll animations, particle effects — "wow" moments that showcase technical taste.
- **Good candidates for visual flair:**
  - D3.js data visualizations (data lineage, pipeline flows, query performance — things that double as portfolio pieces)
  - Three.js or Canvas/WebGL for 3D or generative backgrounds
  - GSAP or CSS animations for scroll effects and transitions
  - SVG animations for icons and illustrated elements
- **Low content volume.** This isn't a content-heavy site. Think clean, spacious layout with a few well-crafted sections rather than dozens of pages.

## About Zac (for content and design context)

- **Title/Role:** Data Engineer / SQL Server Developer
- **Core tech stack:** SQL Server 2019, ETL pipeline development, ActiveBatch workload automation
- **Industry:** Healthcare
- **Experience level:** Senior — 49 years old, deep expertise in SQL Server development, data warehousing, and performance optimization
- **Personality/vibe:** Technically sharp, practical, prefers substance over flash (but appreciates well-executed flash). Not a "personal brand" influencer type — more of a craftsman who wants a clean, credible web presence.

## Site Structure (to be refined)

Likely sections — final content TBD:

- **Hero / Landing** — strong first impression, animated/visual
- **About** — professional summary, who Zac is
- **Skills / Tech Stack** — what he works with (could be a great place for interactive visualizations)
- **Experience / Career** — professional history highlights
- **Projects / Portfolio** — showcase work or data engineering concepts (optional, could grow over time)
- **Contact** — simple contact info or form
- **Resume / CV** — downloadable PDF link (optional)

## Constraints & Preferences

- **Budget:** Free/minimal cost. GitHub Pages is free. No paid services unless there's a strong reason.
- **Complexity:** Keep the build toolchain simple. No webpack, no npm build step required. Files should be directly servable by GitHub Pages.
- **Domain:** `zactruelove.com` is registered at WordPress.com. DNS changes come LAST, only when the site is ready. The current WordPress Personal plan will be cancelled after migration.
- **Development workflow:** Zac is using Claude Code in VS Code. The workflow is: edit files locally → commit → push → live. Keep this simple loop intact.
- **No static site generator for now.** If blog functionality is wanted later, we can add Hugo or similar at that point.

## Immediate Next Steps

1. Scaffold the initial site structure (index.html, styles, scripts directory)
2. Build a compelling landing/hero section as a proof of concept
3. Iterate on design direction with Zac before building out remaining sections

## File Structure (suggested starting point)

```
zactruelove.github.io/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── assets/
│   └── images/
├── CNAME              ← added later when DNS is pointed
└── README.md
```
