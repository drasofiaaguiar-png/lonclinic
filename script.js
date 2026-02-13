/* ========================================
   Longevity Clinic — Page Scripts
======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ─── Navbar Scroll Effect ───
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    const handleNavScroll = () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    };

    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();

    // ─── Mobile Menu ───
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });

        // Close mobile menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // ─── Smooth Scroll for Anchor Links ───
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const navHeight = navbar.offsetHeight;
                const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;

                window.scrollTo({
                    top: targetPos,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ─── FAQ Accordion ───
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all others
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // ─── Scroll Animations (Intersection Observer) ───
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
    };

    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe detect cards with [data-animate]
    document.querySelectorAll('[data-animate]').forEach(el => {
        animateOnScroll.observe(el);
    });

    // ─── General Fade-In on Scroll ───
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.05
    });

    // Add fade-in class and observe various cards
    const fadeTargets = document.querySelectorAll(
        '.included-card, .tracking-card, .build-card, .location-card, .process-step, .vaccine-card, .travel-style-card'
    );

    fadeTargets.forEach((el, index) => {
        el.classList.add('fade-in');
        el.style.transitionDelay = `${index % 4 * 0.1}s`;
        fadeObserver.observe(el);
    });

    // Also animate section headers and content blocks
    document.querySelectorAll(
        '.section-header, .process-content, .doctor-content, .travel-content, .cta-content'
    ).forEach(el => {
        el.classList.add('fade-in');
        fadeObserver.observe(el);
    });

    // ─── Active Nav Link on Scroll ───
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const updateActiveNav = () => {
        const scrollY = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', updateActiveNav, { passive: true });

    // ─── Vessel Bar Animation on View ───
    const vesselObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.vessel-bar').forEach((bar, i) => {
                    bar.style.animationDelay = `${i * 0.2}s`;
                });
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.vessel-visual').forEach(el => {
        vesselObserver.observe(el);
    });

    // ─── Circle Ring Animation ───
    const circleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const ring = entry.target.querySelector('.circle-ring circle:last-of-type');
                if (ring) {
                    ring.style.transition = 'stroke-dashoffset 2s ease-out';
                    ring.setAttribute('stroke-dashoffset', '100');
                }
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.process-circle').forEach(el => {
        circleObserver.observe(el);
    });

    // ─── Parallax-like Effect on Hero Glow ───
    const heroGlow = document.querySelector('.hero-glow');
    if (heroGlow) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            if (scrolled < window.innerHeight) {
                heroGlow.style.transform = `translateX(-50%) translateY(${scrolled * 0.15}px) scale(${1 + scrolled * 0.0003})`;
            }
        }, { passive: true });
    }

    // ─── Hero Particle Dots (Neko-style body scan effect) ───
    const heroCanvas = document.getElementById('heroParticles');
    if (heroCanvas) {
        const ctx = heroCanvas.getContext('2d');
        let particles = [];
        let animId;
        let heroVisible = true;

        function resizeHeroCanvas() {
            const wrap = heroCanvas.parentElement;
            heroCanvas.width = wrap.offsetWidth;
            heroCanvas.height = wrap.offsetHeight;
            initHeroParticles();
        }

        function initHeroParticles() {
            particles = [];
            const w = heroCanvas.width;
            const h = heroCanvas.height;
            // Create a grid of dots that follow the body silhouette area
            const cols = Math.floor(w / 12);
            const rows = Math.floor(h / 12);

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = (i / cols) * w;
                    const y = (j / rows) * h;

                    // Only place dots in a central elliptical region (body silhouette)
                    const cx = w * 0.5;
                    const cy = h * 0.45;
                    const rx = w * 0.32;
                    const ry = h * 0.48;
                    const dx = (x - cx) / rx;
                    const dy = (y - cy) / ry;
                    const dist = dx * dx + dy * dy;

                    if (dist < 1) {
                        const baseAlpha = 0.15 + (1 - dist) * 0.6;
                        particles.push({
                            x: x + (Math.random() - 0.5) * 6,
                            y: y + (Math.random() - 0.5) * 6,
                            baseX: x,
                            baseY: y,
                            r: 1 + Math.random() * 1.5,
                            alpha: baseAlpha,
                            phase: Math.random() * Math.PI * 2,
                            speed: 0.3 + Math.random() * 0.7,
                            drift: 0.3 + Math.random() * 0.5
                        });
                    }
                }
            }
        }

        function drawHeroParticles(time) {
            if (!heroVisible) return;
            ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

            const t = time * 0.001;
            particles.forEach(p => {
                const wave = Math.sin(t * p.speed + p.phase) * p.drift;
                const x = p.baseX + wave * 3;
                const y = p.baseY + Math.cos(t * p.speed * 0.7 + p.phase) * p.drift * 2;

                // Flowing scan wave effect: dots light up in a band
                const scanY = ((Math.sin(t * 0.4) + 1) / 2) * heroCanvas.height;
                const distToScan = Math.abs(y - scanY);
                const scanGlow = distToScan < 80 ? (1 - distToScan / 80) * 0.5 : 0;

                const alpha = Math.min(1, p.alpha + scanGlow);
                ctx.beginPath();
                ctx.arc(x, y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fill();

                // Extra glow for scan-hit dots
                if (scanGlow > 0.1) {
                    ctx.beginPath();
                    ctx.arc(x, y, p.r * 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(197, 199, 44, ${scanGlow * 0.3})`;
                    ctx.fill();
                }
            });

            animId = requestAnimationFrame(drawHeroParticles);
        }

        // IntersectionObserver for performance
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                heroVisible = entry.isIntersecting;
                if (heroVisible && !animId) {
                    animId = requestAnimationFrame(drawHeroParticles);
                }
            });
        }, { threshold: 0.1 });

        heroObserver.observe(heroCanvas.parentElement);

        resizeHeroCanvas();
        animId = requestAnimationFrame(drawHeroParticles);

        let heroResizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(heroResizeTimeout);
            heroResizeTimeout = setTimeout(resizeHeroCanvas, 200);
        });
    }

    // ─── Preload Animations — Slight Delay for Polish ───
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

});
