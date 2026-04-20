/**
 * Travel Clinic page — mobile drawer + body scroll lock
 */
(function () {
    'use strict';

    var btn = document.getElementById('tcMenuBtn');
    var drawer = document.getElementById('tcDrawer');
    var backdrop = drawer ? drawer.querySelector('.tc-drawer-backdrop') : null;

    function close() {
        if (!drawer) return;
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function open() {
        if (!drawer) return;
        drawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    if (btn && drawer) {
        btn.addEventListener('click', function () {
            if (drawer.classList.contains('is-open')) close();
            else open();
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', close);
    }

    if (drawer) {
        drawer.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', close);
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
    });
})();
