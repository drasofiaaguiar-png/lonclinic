/**
 * Homepage-style nav (lon-nav) — mobile toggle + scroll state.
 * Used on pages that share the same header as index.html.
 */
(function () {
    'use strict';

    var nav = document.getElementById('lonNav');
    var toggle = document.getElementById('lonNavToggle');
    var mobileMenu = document.getElementById('lonMobileMenu');

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (toggle && mobileMenu) {
        toggle.addEventListener('click', function () {
            var open = mobileMenu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            document.body.style.overflow = open ? 'hidden' : '';
        });
        mobileMenu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', closeMobileMenu);
        });
    }

    window.addEventListener('scroll', function () {
        if (!nav) return;
        if (window.scrollY > 12) nav.classList.add('is-scrolled');
        else nav.classList.remove('is-scrolled');
    }, { passive: true });
})();
