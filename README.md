# zactruelove.com

Professional personal website for Zac Truelove - Data Engineer & SQL Server Developer

## Overview

This is a modern, responsive personal website built with plain HTML, CSS, and JavaScript. The site showcases professional experience, technical skills, and contact information with visually impressive animations and interactions.

## Features

- **Animated Hero Section**: Subtle gradient mesh animation using HTML5 Canvas
- **Dark Modern Design**: Professional dark theme with neutral navy blue accents
- **Responsive Design**: Fully responsive layout that works on all devices
- **Smooth Animations**: Scroll-triggered animations and smooth transitions
- **Clean UI**: Modern card-based design with subtle hover interactions
- **Performance Optimized**: Respects user preferences for reduced motion
- **Accessible**: Semantic HTML and keyboard-friendly navigation

## Tech Stack

- HTML5
- CSS3 (Custom Properties, Grid, Flexbox)
- Vanilla JavaScript (ES6+)
- Canvas API for animations

## Structure

```
zactruelove.github.io/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styles
├── js/
│   └── main.js         # JavaScript animations and interactions
├── assets/
│   └── images/         # Images and media files
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