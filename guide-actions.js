(function () {
    'use strict';

    function pageLang() {
        var lang = (document.documentElement.getAttribute('lang') || 'pt').toLowerCase();
        if (lang.indexOf('en') === 0) return 'en';
        if (lang.indexOf('es') === 0) return 'es';
        if (lang.indexOf('fr') === 0) return 'fr';
        if (lang.indexOf('de') === 0) return 'de';
        return 'pt';
    }

    function formatNextSlotWhen(dateISO, time, lang) {
        if (!dateISO || !time) return '';
        var d = new Date(dateISO + 'T12:00:00');
        if (Number.isNaN(d.getTime())) return dateISO + ' · ' + time;
        var locales = { pt: 'pt-PT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' };
        var label = d.toLocaleDateString(locales[lang] || 'pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
        });
        return label + ' · ' + time;
    }

    function goClinicaGeralCheckout(slot, fallbackHref) {
        if (!slot || !slot.date || !slot.time) {
            window.location.href = fallbackHref || '/marcar/clinica-geral';
            return;
        }
        var lang = pageLang();
        var payload = {
            service: 'clinica_geral',
            tipo: 'clinica_geral',
            serviceLabel: lang === 'en'
                ? 'Nutrition / general medicine consultation'
                : lang === 'es'
                    ? 'Consulta de nutrición / medicina general'
                    : lang === 'fr'
                        ? 'Consultation nutrition / médecine générale'
                        : lang === 'de'
                            ? 'Ernährungs- / Allgemeinmedizin-Termin'
                            : 'Consulta de nutrição / clínica geral',
            servicePrice: '€39',
            servicePriceCents: 3900,
            dateISO: slot.date,
            dateLabel: formatNextSlotWhen(slot.date, slot.time, lang),
            time: slot.time,
            travellerCount: 1,
            hasInsurance: false,
            locale: lang
        };
        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) { /* private mode */ }
        var dest = '/book-consultation?service=clinica_geral&date=' +
            encodeURIComponent(slot.date) + '&time=' + encodeURIComponent(slot.time);
        if (window.LonAnalytics) {
            window.LonAnalytics.track('cta_click', { surface: 'blog', service: 'clinica_geral', step: 'next_slot' });
            window.LonAnalytics.flush();
        }
        window.location.href = dest;
    }

    function markReady(card, whenText) {
        var when = card.querySelector('[data-next-slot-when]');
        var note = card.querySelector('.guide-book-note');
        var cta = card.querySelector('[data-next-slot-cta]');
        var lang = pageLang();
        var readyLabel = {
            pt: 'Marcar este horário',
            en: 'Book this time',
            es: 'Reservar esta hora',
            fr: 'Réserver ce créneau',
            de: 'Diesen Termin buchen'
        };
        card.classList.add('is-ready');
        if (when) when.textContent = whenText;
        if (note) {
            note.textContent = card.getAttribute('data-price') || note.textContent;
        }
        if (cta) cta.textContent = readyLabel[lang] || readyLabel.pt;
    }

    function goServiceSlot(slot, fallbackHref) {
        var dest = fallbackHref || '/marcar/travel';
        try {
            var u = new URL(dest, window.location.origin);
            if (slot && slot.date) u.searchParams.set('date', slot.date);
            if (slot && slot.time) u.searchParams.set('time', slot.time);
            dest = u.pathname + u.search;
        } catch (e) { /* keep fallback */ }
        if (window.LonAnalytics) {
            window.LonAnalytics.track('cta_click', { surface: 'blog', service: 'travel', step: 'next_slot' });
            window.LonAnalytics.flush();
        }
        window.location.href = dest;
    }

    function hydrateCard(card) {
        if (!card || card.getAttribute('data-hydrate') !== '1') return;
        var service = card.getAttribute('data-service') || 'clinica_geral';
        var fallback = card.getAttribute('data-book-href') || '/marcar/clinica-geral';
        fetch('/api/next-slots?limit=1&withinHours=48&service=' + encodeURIComponent(service))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var slot = data && data.slots && data.slots[0];
                if (!slot) return;
                markReady(card, formatNextSlotWhen(slot.date, slot.time, pageLang()));
                var cta = card.querySelector('[data-next-slot-cta]');
                if (!cta) return;
                cta.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (service === 'clinica_geral') goClinicaGeralCheckout(slot, fallback);
                    else goServiceSlot(slot, fallback);
                });
            })
            .catch(function () { /* keep the booking promise until a slot loads */ });
    }

    document.querySelectorAll('[data-next-slot]').forEach(hydrateCard);

    document.querySelectorAll('[data-cvi-regions]').forEach(function (root) {
        var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-cvi-tab]'));
        var panels = Array.prototype.slice.call(root.querySelectorAll('[data-cvi-panel]'));
        if (!tabs.length) return;

        function show(id) {
            var known = tabs.some(function (tab) { return tab.getAttribute('data-cvi-tab') === id; });
            if (!known) id = tabs[0].getAttribute('data-cvi-tab');
            tabs.forEach(function (tab) {
                var on = tab.getAttribute('data-cvi-tab') === id;
                tab.setAttribute('aria-selected', on ? 'true' : 'false');
                tab.tabIndex = on ? 0 : -1;
            });
            panels.forEach(function (panel) {
                if (panel.getAttribute('data-cvi-panel') === id) panel.removeAttribute('hidden');
                else panel.setAttribute('hidden', '');
            });
            return id;
        }

        tabs.forEach(function (tab, index) {
            tab.addEventListener('click', function () {
                var id = show(tab.getAttribute('data-cvi-tab'));
                if (history.replaceState) history.replaceState(null, '', '#' + id);
                tab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
            });
            tab.addEventListener('keydown', function (event) {
                var next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
                else return;
                event.preventDefault();
                tabs[next].focus();
                tabs[next].click();
            });
        });

        var hash = (window.location.hash || '').replace(/^#/, '');
        var id = show(hash);
        var active = root.querySelector('[data-cvi-tab="' + id + '"]');
        if (active && hash) active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    });
})();
