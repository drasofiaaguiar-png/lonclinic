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

    function hydrateCard(card) {
        if (!card || card.getAttribute('data-hydrate') !== '1') return;
        var fallback = card.getAttribute('data-book-href') || '/marcar/clinica-geral';
        fetch('/api/next-slots?limit=1')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var slot = data && data.slots && data.slots[0];
                if (!slot) return;
                markReady(card, formatNextSlotWhen(slot.date, slot.time, pageLang()));
                var cta = card.querySelector('[data-next-slot-cta]');
                if (!cta) return;
                cta.addEventListener('click', function (e) {
                    e.preventDefault();
                    goClinicaGeralCheckout(slot, fallback);
                });
            })
            .catch(function () { /* keep placeholder until slots are defined */ });
    }

    document.querySelectorAll('[data-next-slot]').forEach(hydrateCard);
})();
