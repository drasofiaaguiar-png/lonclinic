/* Psicologia page motion — Lenis + GSAP ScrollTrigger */
(function () {
    'use strict';

    function trackPsiCta(location) {
        if (typeof gtag !== 'function') return;
        gtag('event', 'psicologia_cta_click', {
            event_category: 'psicologia',
            event_label: location || 'cta',
            page_location: window.location.href,
            page_path: '/psicologia'
        });
    }

    document.querySelectorAll('.js-psi-cta').forEach(function (el) {
        el.addEventListener('click', function () {
            trackPsiCta(el.getAttribute('data-psi-cta') || 'cta');
        });
    });

    var accordion = document.querySelector('[data-psi-accordion]');
    if (accordion) {
        accordion.querySelectorAll('.psi-acc-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var open = btn.classList.contains('is-open');
                accordion.querySelectorAll('.psi-acc-item').forEach(function (other) {
                    other.classList.remove('is-open');
                    other.setAttribute('aria-expanded', 'false');
                });
                if (!open) {
                    btn.classList.add('is-open');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
        document.querySelectorAll('.psi-anim').forEach(function (n) {
            n.classList.add('is-in');
        });
        return;
    }

    var LenisCtor = window.Lenis;
    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;

    if (!gsap || !ScrollTrigger) {
        document.querySelectorAll('.psi-anim').forEach(function (n) {
            n.classList.add('is-in');
        });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var lenis = null;
    if (typeof LenisCtor === 'function') {
        lenis = new LenisCtor({
            duration: 1.1,
            easing: function (t) {
                return Math.min(1, 1.001 - Math.pow(2, -10 * t));
            },
            smoothWheel: true
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
    }

    gsap.utils.toArray('.psi-anim').forEach(function (el, i) {
        gsap.fromTo(
            el,
            { autoAlpha: 0, y: 36 },
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.85,
                ease: 'power3.out',
                delay: (i % 4) * 0.06,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 88%',
                    once: true
                }
            }
        );
    });

    gsap.utils.toArray('[data-psi-parallax]').forEach(function (el) {
        gsap.to(el, {
            yPercent: 18,
            ease: 'none',
            scrollTrigger: {
                trigger: el.parentElement || el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    });

    var phone = document.querySelector('.psi-phone');
    if (phone) {
        gsap.fromTo(
            phone,
            { rotate: -6, y: 40 },
            {
                rotate: 0,
                y: 0,
                duration: 1.1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: phone,
                    start: 'top 85%',
                    once: true
                }
            }
        );
    }

    var hot = document.querySelector('.psi-plan-card--hot');
    if (hot) {
        gsap.fromTo(
            hot,
            { scale: 0.96 },
            {
                scale: 1,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: hot,
                    start: 'top 85%',
                    once: true
                }
            }
        );
    }
})();
