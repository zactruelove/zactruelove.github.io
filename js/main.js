// ===================================
// zactruelove.com — shared behavior
// (spheres, nav, smooth scroll, reveals, count-up, theme toggle)
// ===================================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===================================
// Glass sphere animation (hero)
// ===================================

class FloatingBubbles {
    constructor(canvas, count = 7) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.count = count;
        this.resizeCanvas();
        this.createBubbles();
        this.animate();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createBubbles();
        });
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    createBubbles() {
        this.bubbles = [];
        for (let i = 0; i < this.count; i++) {
            this.bubbles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 400 + 320,
                vx: (Math.random() - 0.5) * 0.39375,
                vy: (Math.random() - 0.5) * 0.39375,
                opacity: Math.random() * 0.16 + 0.12
            });
        }
    }

    updateBubbles() {
        this.bubbles.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < -b.radius) b.x = this.canvas.width + b.radius;
            if (b.x > this.canvas.width + b.radius) b.x = -b.radius;
            if (b.y < -b.radius) b.y = this.canvas.height + b.radius;
            if (b.y > this.canvas.height + b.radius) b.y = -b.radius;
        });
    }

    drawBubbles() {
        const ctx = this.ctx;
        this.bubbles.forEach(b => {
            // Shadow/dark side (bottom-right)
            let g = ctx.createRadialGradient(
                b.x + b.radius * 0.3, b.y + b.radius * 0.3, 0,
                b.x + b.radius * 0.3, b.y + b.radius * 0.3, b.radius * 0.7
            );
            g.addColorStop(0, `rgba(20, 20, 20, ${b.opacity * 0.4})`);
            g.addColorStop(0.6, `rgba(30, 30, 30, ${b.opacity * 0.2})`);
            g.addColorStop(1, 'rgba(40, 40, 40, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Main glass body
            g = ctx.createRadialGradient(b.x, b.y, b.radius * 0.1, b.x, b.y, b.radius);
            g.addColorStop(0, `rgba(90, 90, 90, ${b.opacity * 0.15})`);
            g.addColorStop(0.3, `rgba(70, 70, 70, ${b.opacity * 0.25})`);
            g.addColorStop(0.6, `rgba(50, 50, 50, ${b.opacity * 0.35})`);
            g.addColorStop(0.85, `rgba(40, 40, 40, ${b.opacity * 0.2})`);
            g.addColorStop(1, 'rgba(30, 30, 30, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Primary specular highlight (top-left)
            g = ctx.createRadialGradient(
                b.x - b.radius * 0.35, b.y - b.radius * 0.35, 0,
                b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.25
            );
            g.addColorStop(0, `rgba(255, 255, 255, ${b.opacity * 0.8})`);
            g.addColorStop(0.3, `rgba(240, 240, 240, ${b.opacity * 0.4})`);
            g.addColorStop(0.7, `rgba(200, 200, 200, ${b.opacity * 0.1})`);
            g.addColorStop(1, 'rgba(180, 180, 180, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // Secondary diffuse highlight
            g = ctx.createRadialGradient(
                b.x - b.radius * 0.2, b.y - b.radius * 0.2, 0,
                b.x - b.radius * 0.2, b.y - b.radius * 0.2, b.radius * 0.6
            );
            g.addColorStop(0, `rgba(200, 200, 200, ${b.opacity * 0.2})`);
            g.addColorStop(0.5, `rgba(160, 160, 160, ${b.opacity * 0.1})`);
            g.addColorStop(1, 'rgba(120, 120, 120, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Rim lighting
            g = ctx.createRadialGradient(b.x, b.y, b.radius * 0.75, b.x, b.y, b.radius * 0.98);
            g.addColorStop(0, 'rgba(100, 100, 100, 0)');
            g.addColorStop(0.7, `rgba(140, 140, 140, ${b.opacity * 0.15})`);
            g.addColorStop(1, `rgba(180, 180, 180, ${b.opacity * 0.25})`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner reflection/caustic (bottom)
            g = ctx.createRadialGradient(
                b.x, b.y + b.radius * 0.4, 0,
                b.x, b.y + b.radius * 0.4, b.radius * 0.3
            );
            g.addColorStop(0, `rgba(160, 160, 160, ${b.opacity * 0.15})`);
            g.addColorStop(0.6, `rgba(120, 120, 120, ${b.opacity * 0.08})`);
            g.addColorStop(1, 'rgba(100, 100, 100, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y + b.radius * 0.4, b.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // Outer edge definition
            ctx.strokeStyle = `rgba(120, 120, 120, ${b.opacity * 0.2})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 0.98, 0, Math.PI * 2);
            ctx.stroke();
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateBubbles();
        this.drawBubbles();
        requestAnimationFrame(() => this.animate());
    }
}

// ===================================
// Navigation scroll effect
// ===================================

class Navigation {
    constructor() {
        this.nav = document.querySelector('.nav');
        if (!this.nav || this.nav.classList.contains('nav-solid')) return;
        window.addEventListener('scroll', () => this.updateNav());
        this.updateNav();
    }

    updateNav() {
        this.nav.classList.toggle('scrolled', window.pageYOffset > 40);
    }
}

// ===================================
// Smooth scroll for in-page anchors
// ===================================

class SmoothScroll {
    constructor() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', e => {
                const targetId = anchor.getAttribute('href');
                if (targetId === '#') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }
                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
                }
            });
        });
    }
}

// ===================================
// Scroll reveals + metric count-up
// ===================================

class ScrollReveal {
    constructor() {
        this.counted = new Set();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                entry.target.querySelectorAll('.big-number').forEach(n => {
                    if (!this.counted.has(n)) {
                        this.counted.add(n);
                        this.countUp(n);
                    }
                });
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        if (prefersReducedMotion) {
            document.querySelectorAll('.big-number').forEach(n => this.countUp(n));
        }
    }

    format(n, comma) {
        return comma ? n.toLocaleString('en-US') : String(n);
    }

    countUp(el) {
        const target = parseInt(el.dataset.count, 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const comma = el.dataset.comma === 'true';
        if (Number.isNaN(target)) return;
        if (prefersReducedMotion) {
            el.textContent = prefix + this.format(target, comma) + suffix;
            return;
        }
        const duration = 1400;
        const start = performance.now();
        const tick = now => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + this.format(Math.round(target * eased), comma) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
}

// ===================================
// Theme toggle
// (initial theme is applied pre-paint by the inline
// script in <head>, so there is no flash on load)
// ===================================

class ThemeToggle {
    constructor() {
        this.toggle = document.getElementById('themeToggle');
        if (!this.toggle) return;
        this.toggle.addEventListener('click', () => {
            const isLight = document.documentElement.classList.toggle('light-mode');
            try {
                localStorage.setItem('theme', isLight ? 'light' : 'dark');
            } catch (e) { /* storage unavailable — theme just won't persist */ }
        });
    }
}

// ===================================
// Initialize
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('spheres');
    if (canvas) {
        if (prefersReducedMotion) {
            canvas.style.display = 'none';
        } else {
            new FloatingBubbles(canvas, 7);
        }
    }
    new Navigation();
    new SmoothScroll();
    new ScrollReveal();
    new ThemeToggle();
});
