// ===================================
// Floating Bubbles Visualization
// ===================================

class FloatingBubbles {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bubbles = [];
        this.particleCount = 20;

        this.init();
        this.createBubbles();
        this.animate();
        this.addEventListeners();
    }

    init() {
        this.resizeCanvas();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    createBubbles() {
        this.bubbles = [];
        this.particleCount = 12; // Increased by 50% for better coverage
        for (let i = 0; i < this.particleCount; i++) {
            this.bubbles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 400 + 320, // Larger spheres (320-720px)
                vx: (Math.random() - 0.5) * 0.39375,
                vy: (Math.random() - 0.5) * 0.39375,
                opacity: Math.random() * 0.16 + 0.12
            });
        }
    }

    updateBubbles() {
        this.bubbles.forEach(bubble => {
            // Move bubbles
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;

            // Wrap around edges
            if (bubble.x < -bubble.radius) bubble.x = this.canvas.width + bubble.radius;
            if (bubble.x > this.canvas.width + bubble.radius) bubble.x = -bubble.radius;
            if (bubble.y < -bubble.radius) bubble.y = this.canvas.height + bubble.radius;
            if (bubble.y > this.canvas.height + bubble.radius) bubble.y = -bubble.radius;
        });
    }

    drawBubbles() {
        this.bubbles.forEach(bubble => {
            // Shadow/dark side (bottom-right)
            const shadowGradient = this.ctx.createRadialGradient(
                bubble.x + bubble.radius * 0.3,
                bubble.y + bubble.radius * 0.3,
                0,
                bubble.x + bubble.radius * 0.3,
                bubble.y + bubble.radius * 0.3,
                bubble.radius * 0.7
            );
            shadowGradient.addColorStop(0, `rgba(20, 20, 20, ${bubble.opacity * 0.4})`);
            shadowGradient.addColorStop(0.6, `rgba(30, 30, 30, ${bubble.opacity * 0.2})`);
            shadowGradient.addColorStop(1, `rgba(40, 40, 40, 0)`);

            this.ctx.fillStyle = shadowGradient;
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Main glass body with realistic gradient
            const mainGradient = this.ctx.createRadialGradient(
                bubble.x, bubble.y, bubble.radius * 0.1,
                bubble.x, bubble.y, bubble.radius
            );
            mainGradient.addColorStop(0, `rgba(90, 90, 90, ${bubble.opacity * 0.15})`);
            mainGradient.addColorStop(0.3, `rgba(70, 70, 70, ${bubble.opacity * 0.25})`);
            mainGradient.addColorStop(0.6, `rgba(50, 50, 50, ${bubble.opacity * 0.35})`);
            mainGradient.addColorStop(0.85, `rgba(40, 40, 40, ${bubble.opacity * 0.2})`);
            mainGradient.addColorStop(1, `rgba(30, 30, 30, 0)`);

            this.ctx.fillStyle = mainGradient;
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Primary specular highlight (top-left, bright)
            const primaryHighlight = this.ctx.createRadialGradient(
                bubble.x - bubble.radius * 0.35,
                bubble.y - bubble.radius * 0.35,
                0,
                bubble.x - bubble.radius * 0.35,
                bubble.y - bubble.radius * 0.35,
                bubble.radius * 0.25
            );
            primaryHighlight.addColorStop(0, `rgba(255, 255, 255, ${bubble.opacity * 0.8})`);
            primaryHighlight.addColorStop(0.3, `rgba(240, 240, 240, ${bubble.opacity * 0.4})`);
            primaryHighlight.addColorStop(0.7, `rgba(200, 200, 200, ${bubble.opacity * 0.1})`);
            primaryHighlight.addColorStop(1, `rgba(180, 180, 180, 0)`);

            this.ctx.fillStyle = primaryHighlight;
            this.ctx.beginPath();
            this.ctx.arc(
                bubble.x - bubble.radius * 0.35,
                bubble.y - bubble.radius * 0.35,
                bubble.radius * 0.3,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            // Secondary diffuse highlight (larger, softer)
            const secondaryHighlight = this.ctx.createRadialGradient(
                bubble.x - bubble.radius * 0.2,
                bubble.y - bubble.radius * 0.2,
                0,
                bubble.x - bubble.radius * 0.2,
                bubble.y - bubble.radius * 0.2,
                bubble.radius * 0.6
            );
            secondaryHighlight.addColorStop(0, `rgba(200, 200, 200, ${bubble.opacity * 0.2})`);
            secondaryHighlight.addColorStop(0.5, `rgba(160, 160, 160, ${bubble.opacity * 0.1})`);
            secondaryHighlight.addColorStop(1, `rgba(120, 120, 120, 0)`);

            this.ctx.fillStyle = secondaryHighlight;
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Rim lighting (edge glow)
            const rimGradient = this.ctx.createRadialGradient(
                bubble.x, bubble.y, bubble.radius * 0.75,
                bubble.x, bubble.y, bubble.radius * 0.98
            );
            rimGradient.addColorStop(0, `rgba(100, 100, 100, 0)`);
            rimGradient.addColorStop(0.7, `rgba(140, 140, 140, ${bubble.opacity * 0.15})`);
            rimGradient.addColorStop(1, `rgba(180, 180, 180, ${bubble.opacity * 0.25})`);

            this.ctx.fillStyle = rimGradient;
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Inner reflection/caustic (bottom, subtle)
            const innerReflection = this.ctx.createRadialGradient(
                bubble.x,
                bubble.y + bubble.radius * 0.4,
                0,
                bubble.x,
                bubble.y + bubble.radius * 0.4,
                bubble.radius * 0.3
            );
            innerReflection.addColorStop(0, `rgba(160, 160, 160, ${bubble.opacity * 0.15})`);
            innerReflection.addColorStop(0.6, `rgba(120, 120, 120, ${bubble.opacity * 0.08})`);
            innerReflection.addColorStop(1, `rgba(100, 100, 100, 0)`);

            this.ctx.fillStyle = innerReflection;
            this.ctx.beginPath();
            this.ctx.arc(
                bubble.x,
                bubble.y + bubble.radius * 0.4,
                bubble.radius * 0.35,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            // Subtle outer edge definition
            this.ctx.strokeStyle = `rgba(120, 120, 120, ${bubble.opacity * 0.2})`;
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius * 0.98, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }

    drawConnections() {
        // Draw subtle connections between nearby bubbles for AI/tech vibe
        for (let i = 0; i < this.bubbles.length; i++) {
            for (let j = i + 1; j < this.bubbles.length; j++) {
                const dx = this.bubbles[i].x - this.bubbles[j].x;
                const dy = this.bubbles[i].y - this.bubbles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 200) {
                    const opacity = (1 - distance / 200) * 0.1;
                    this.ctx.strokeStyle = `rgba(80, 80, 80, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.bubbles[i].x, this.bubbles[i].y);
                    this.ctx.lineTo(this.bubbles[j].x, this.bubbles[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.updateBubbles();
        this.drawConnections();
        this.drawBubbles();

        requestAnimationFrame(() => this.animate());
    }

    addEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createBubbles();
        });
    }
}

// ===================================
// Navigation Scroll Effect
// ===================================

class Navigation {
    constructor() {
        this.nav = document.querySelector('.nav');
        this.init();
    }

    updateNav() {
        const isLightMode = document.body.classList.contains('light-mode');

        if (window.pageYOffset > 50) {
            if (isLightMode) {
                this.nav.style.background = 'rgba(255, 255, 255, 0.98)';
                this.nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
            } else {
                this.nav.style.background = 'rgba(10, 10, 10, 0.98)';
                this.nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
            }
        } else {
            if (isLightMode) {
                this.nav.style.background = 'rgba(255, 255, 255, 0.95)';
                this.nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
            } else {
                this.nav.style.background = 'rgba(10, 10, 10, 0.95)';
                this.nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
            }
        }
    }

    init() {
        window.addEventListener('scroll', () => this.updateNav());
    }
}

// ===================================
// Smooth Scroll
// ===================================

class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');

                // If href is just "#", scroll to top
                if (targetId === '#') {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                    return;
                }

                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const navHeight = document.querySelector('.nav').offsetHeight;
                    const targetPosition = targetElement.offsetTop - navHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ===================================
// Scroll Reveal Animations
// ===================================

class ScrollReveal {
    constructor() {
        this.init();
    }

    init() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -80px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(40px)';
            section.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            observer.observe(section);
        });

        // Observe skill cards with stagger
        document.querySelectorAll('.skill-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = `opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.15}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.15}s`;
            observer.observe(card);
        });

        // Observe stats
        document.querySelectorAll('.stat-item').forEach((stat, index) => {
            stat.style.opacity = '0';
            stat.style.transform = 'translateY(20px)';
            stat.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
            observer.observe(stat);
        });
    }
}

// ===================================
// Initialize
// ===================================

let navigationInstance;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gradientMesh');
    if (canvas) {
        new FloatingBubbles(canvas);
    }

    navigationInstance = new Navigation();
    new SmoothScroll();
    new ScrollReveal();
});

// Respect reduced motion preferences
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (prefersReducedMotion.matches) {
    const canvas = document.getElementById('gradientMesh');
    if (canvas) {
        canvas.style.display = 'none';
    }
}

// ===================================
// Theme Toggle
// ===================================

class ThemeToggle {
    constructor() {
        this.toggle = document.getElementById('themeToggle');
        this.themeIcon = this.toggle.querySelector('.theme-icon');
        this.init();
    }

    init() {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);

        // Add click handler
        this.toggle.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    setTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            this.themeIcon.textContent = '🌙';
        } else {
            document.body.classList.remove('light-mode');
            this.themeIcon.textContent = '☀️';
        }

        // Update navigation immediately after theme change
        if (navigationInstance) {
            navigationInstance.updateNav();
        }
    }
}

// Initialize theme toggle when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ThemeToggle();
    });
} else {
    new ThemeToggle();
}
