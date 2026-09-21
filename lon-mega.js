/**
 * "Especialidades" mega menu — desktop header (.lon-nav).
 * Hover/focus opens via CSS; this adds click-to-pin, outside-click and Esc to close.
 */
(function () {
    'use strict';

    var wrap = document.getElementById('lonMegaWrap');
    var trigger = document.getElementById('lonMegaTrigger');
    if (!wrap || !trigger) return;

    function setOpen(open) {
        wrap.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    // First click pins the panel open; a second click follows the link to the hub page.
    trigger.addEventListener('click', function (e) {
        if (wrap.classList.contains('is-open')) return;
        e.preventDefault();
        setOpen(true);
    });

    document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && wrap.classList.contains('is-open')) {
            setOpen(false);
            trigger.focus();
        }
    });

    wrap.addEventListener('mouseleave', function () {
        if (wrap.classList.contains('is-open') && !wrap.contains(document.activeElement)) setOpen(false);
    });
})();
