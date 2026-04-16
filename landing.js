(function () {
    'use strict';

    var nav = document.getElementById('lonNav');
    var toggle = document.getElementById('lonNavToggle');
    var mobileMenu = document.getElementById('lonMobileMenu');
    var tabButtons = document.querySelectorAll('.lon-tab');
    var cards = document.querySelectorAll('.lon-service-card');

    function setActiveTab(tabId) {
        tabButtons.forEach(function (btn) {
            var on = btn.getAttribute('data-tab') === tabId;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        cards.forEach(function (card) {
            var cat = card.getAttribute('data-category');
            var show = cat === tabId;
            card.classList.toggle('is-visible', show);
        });
    }

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            setActiveTab(btn.getAttribute('data-tab'));
        });
    });

    var initialTab = 'urgencias';
    var hash = window.location.hash;
    if (hash.indexOf('#servicos-') === 0) {
        var part = hash.replace('#servicos-', '');
        if (['urgencias', 'especialidades', 'mental', 'longevidade'].indexOf(part) >= 0) {
            initialTab = part;
        }
    }
    setActiveTab(initialTab);

    document.querySelectorAll('[data-open-tab]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var t = link.getAttribute('data-open-tab');
            if (t) {
                e.preventDefault();
                setActiveTab(t);
                var el = document.getElementById('servicos');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                if (history.replaceState) {
                    history.replaceState(null, '', '#servicos-' + t);
                }
            }
        });
    });

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    if (toggle && mobileMenu) {
        toggle.addEventListener('click', function () {
            var open = mobileMenu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        mobileMenu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', closeMobileMenu);
        });
    }

    window.addEventListener('scroll', function () {
        if (!nav) return;
        if (window.scrollY > 12) nav.classList.add('is-scrolled');
        else nav.classList.remove('is-scrolled');
    });

    var form = document.getElementById('lonNewsForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            form.reset();
            alert('Obrigado! Em breve receberá o nosso newsletter.');
        });
    }
})();
