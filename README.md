# zactruelove.com

Professional personal website for Zac Truelove - Data Engineer & SQL Server Developer

## Overview

This is a modern, responsive personal website built with plain HTML, CSS, and JavaScript. The site showcases professional experience, technical skills, and contact information with visually impressive animations and interactions.

## Features

- **Animated Hero Section**: Glass-sphere animation using HTML5 Canvas
- **Monochrome Apple-Style Design**: Dark theme by default with a light-mode toggle (no flash on load)
- **Impact Metrics**: Count-up animated career numbers (50% CPU reduction, 1,000 daily jobs, $200K saved, 20+ years)
- **Career Timeline & Tech Specs**: Résumé highlights presented as a hairline timeline and an Apple-style spec sheet
- **Dedicated Résumé Page**: `/resume.html` with print stylesheet and downloadable PDF
- **Responsive Design**: Fully responsive layout that works on all devices
- **Smooth Animations**: Scroll-triggered reveals; respects reduced-motion preferences
- **Social Previews**: Open Graph image and meta tags, SVG favicon
- **Accessible**: Semantic HTML and keyboard-friendly navigation

## Tech Stack

- HTML5
- CSS3 (Custom Properties, Grid, Flexbox)
- Vanilla JavaScript (ES6+)
- Canvas API for animations

## Structure

```
zactruelove.github.io/
├── index.html          # Homepage (hero, impact metrics, about, career, tech specs, contact)
├── resume.html         # Dedicated résumé page (print-friendly)
├── favicon.svg         # ZT monogram favicon
├── css/
│   ├── styles.css      # All styles (dark default, tokens on :root)
│   └── light-mode.css  # Light-mode token overrides (html.light-mode)
├── js/
│   └── main.js         # Spheres, nav, reveals, count-up, theme toggle
├── assets/
│   ├── Zac_Truelove_Resume.pdf   # Downloadable résumé
│   └── images/
│       └── og-image.png          # Social share preview (1200×630)
├── CNAME               # Custom domain: zactruelove.com
├── CLAUDE.md           # Project brief and instructions
└── README.md           # This file
```

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/zactruelove/zactruelove.github.io.git
   cd zactruelove.github.io
   ```

2. Open `index.html` in your browser, or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx http-server
   ```

3. Visit `http://localhost:8000` in your browser

## Deployment

The site is automatically deployed via GitHub Pages from the `main` branch. Any push to `main` will trigger a deployment.

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The site will be live at `https://zactruelove.github.io`

## Custom Domain

Once ready, the custom domain `zactruelove.com` will be configured via DNS settings and a `CNAME` file will be added to this repository.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- Blog section (potentially using Hugo or similar SSG)
- Project portfolio with case studies
- Data visualization showcases (D3.js)
- Contact form with backend integration

## License

© 2026 Zac Truelove. All rights reserved.