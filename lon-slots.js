(function () {
    'use strict';

    var PAY_BADGES_HTML =
        '<span class="lon-pay-badges" aria-label="MB WAY e Multibanco">' +
        '<span class="lon-pay-badge lon-pay-badge--mbway" title="MB WAY">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">' +
        '<rect width="24" height="24" rx="5" fill="#00C46B"/>' +
        '<path fill="#fff" d="M6.2 16.4V7.6h2.1l1.7 5.4c.15.5.28.97.4 1.42h.06c.12-.45.25-.92.4-1.42l1.7-5.4h2.1v8.8h-1.7V10.1h-.05l-1.82 6.3h-1.48l-1.82-6.3H8V16.4H6.2zm11.1 0l-2.35-8.8h1.92l1.38 5.72h.05l1.4-5.72h1.8L17.3 16.4h-1.99z"/>' +
        '</svg> MB WAY</span>' +
        '<span class="lon-pay-badge lon-pay-badge--mb" title="Multibanco">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">' +
        '<rect width="24" height="24" rx="5" fill="#003087"/>' +
        '<rect x="4" y="6" width="16" height="3" fill="#E30613"/>' +
        '<rect x="4" y="15" width="16" height="3" fill="#E30613"/>' +
        '</svg> Multibanco</span>' +
        '</span>';

    function pageLang() {
        var lang = (document.documentElement.getAttribute('lang') || 'pt').toLowerCase();
        if (lang.indexOf('en') === 0) return 'en';
        if (lang.indexOf('es') === 0) return 'es';
        if (lang.indexOf('fr') === 0) return 'fr';
        if (lang.indexOf('de') === 0) return 'de';
        return 'pt';
    }

    function formatEuro(amount) {
        return String(amount) + ' \u20AC';
    }

    function formatSlotWhen(dateISO, time) {
        if (!dateISO || !time) return '';
        var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateISO));
        if (!parts) return String(dateISO) + ' \u00b7 ' + String(time);
        var d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
        var locales = { pt: 'pt-PT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' };
        var label = d.toLocaleDateString(locales[pageLang()] || 'pt-PT', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        return label + ' \u00b7 ' + time;
    }

    function isSameLocalDay(dateISO) {
        var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateISO || ''));
        if (!parts) return false;
        var now = new Date();
        return now.getFullYear() === Number(parts[1]) &&
            (now.getMonth() + 1) === Number(parts[2]) &&
            now.getDate() === Number(parts[3]);
    }

    function serviceMeta(service) {
        if (service === 'renovacao') {
            return {
                service: 'renovacao',
                tipo: 'renovacao',
                serviceLabel: pageLang() === 'en' ? 'Prescription renewal' : 'Renova\u00e7\u00e3o de tratamento m\u00e9dico',
                servicePrice: formatEuro(19),
                servicePriceCents: 1900
            };
        }
        if (service === 'travel') {
            return {
                service: 'travel',
                tipo: 'travel',
                serviceLabel: pageLang() === 'en' ? 'Travel clinic consultation' : 'Consulta do viajante',
                servicePrice: formatEuro(39),
                servicePriceCents: 3900
            };
        }
        var lang = pageLang();
        return {
            service: 'clinica_geral',
            tipo: 'clinica_geral',
            serviceLabel: lang === 'en'
                ? 'General medicine consultation'
                : lang === 'es'
                    ? 'Consulta de medicina general'
                    : 'Consulta cl\u00ednica geral / check-up',
            servicePrice: formatEuro(39),
            servicePriceCents: 3900
        };
    }

    function track(name, props) {
        if (window.LonAnalytics) window.LonAnalytics.track(name, props);
    }

    function goCheckout(slot, opts) {
        opts = opts || {};
        var meta = serviceMeta(opts.service || 'clinica_geral');
        var fallback = opts.fallbackHref || '/marcar/clinica-geral';
        if (!slot || !slot.date || !slot.time) {
            window.location.href = fallback;
            return;
        }
        var payload = {
            service: meta.service,
            tipo: meta.tipo,
            serviceLabel: meta.serviceLabel,
            servicePrice: meta.servicePrice,
            servicePriceCents: meta.servicePriceCents,
            dateISO: slot.date,
            dateLabel: formatSlotWhen(slot.date, slot.time),
            time: slot.time,
            travellerCount: 1,
            hasInsurance: false,
            locale: pageLang()
        };
        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) { /* private mode */ }
        var dest = '/book-consultation?service=' + encodeURIComponent(meta.service) +
            '&date=' + encodeURIComponent(slot.date) +
            '&time=' + encodeURIComponent(slot.time);
        track('time_slot_clicked', {
            surface: opts.surface || 'slots',
            service: meta.service,
            time: slot.time
        });
        track('cta_click', {
            surface: opts.surface || 'slots',
            service: meta.service,
            step: 'next_slot'
        });
        if (window.LonAnalytics) window.LonAnalytics.flush();
        window.location.href = dest;
    }

    function renderRow(row, slots, opts) {
        row.innerHTML = '';
        slots.forEach(function (slot) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lon-live-slot';
            btn.textContent = formatSlotWhen(slot.date, slot.time);
            btn.addEventListener('click', function () {
                goCheckout(slot, opts);
            });
            row.appendChild(btn);
        });
    }

    function attachPayBadges(el) {
        if (!el || el.getAttribute('data-pay-skip') === '1') return;
        if (el.closest('.lon-pay-wrap')) return;
        if (el.getAttribute('data-pay-bound') === '1') return;
        el.setAttribute('data-pay-bound', '1');
        var wrap = document.createElement('span');
        wrap.className = 'lon-pay-wrap';
        el.parentNode.insertBefore(wrap, el);
        wrap.appendChild(el);
        wrap.insertAdjacentHTML('beforeend', PAY_BADGES_HTML);
    }

    function injectPayBadges() {
        document.querySelectorAll('[data-pay-badges]').forEach(attachPayBadges);
        document.querySelectorAll('.lon-service-glass .lon-btn, .consulta-price-card .lon-btn, .guide-book-cta, .nu-hero-actions .lon-btn-primary').forEach(attachPayBadges);
        document.querySelectorAll('a.js-consulta-cta.lon-btn-dark, a.js-consulta-cta.lon-btn-primary, #lonHeroBook, #consultaCtaHero, #next-2.pay-btn').forEach(attachPayBadges);
    }

    function landingBookMeta() {
        var p = (location.pathname || '/').toLowerCase();
        var lang = pageLang();
        var book = lang === 'en' ? 'Book consultation' : lang === 'es' ? 'Reservar consulta' : 'Marcar Consulta';
        if (/\/consulta\/renovacao|\/marcar\/renovacao|renew-prescription/.test(p)) {
            return { service: 'renovacao', href: '/marcar/renovacao', cta: book + ' \u2014 ' + formatEuro(19) };
        }
        if (/\/(saudemental|consultas|psicologia)(\/|$)/.test(p)) {
            return { service: 'saude_mental', href: '/saudemental', cta: book + ' \u2014 ' + formatEuro(60) };
        }
        if (/\/burnout|clinica-anti-burnout/.test(p)) {
            return { service: 'burnout', href: '/marcar/burnout', cta: book + ' \u2014 ' + formatEuro(60) };
        }
        if (/\/nutricao/.test(p)) {
            return { service: 'clinica_geral', href: '/marcar/clinica-geral?ref=nutricao', cta: book + ' \u2014 ' + formatEuro(39) };
        }
        if (/\/marcar\/travel|travel-clinic/.test(p)) {
            return { service: 'travel', href: '/marcar/travel', cta: book + ' \u2014 ' + formatEuro(39) };
        }
        return { service: 'clinica_geral', href: '/marcar/clinica-geral', cta: book + ' \u2014 ' + formatEuro(39) };
    }

    function shouldInjectSticky() {
        var p = (location.pathname || '/').toLowerCase();
        if (/book-consultation|\/book\.html|\/admin|patient-portal|clinic-portal|\/recrutamento/.test(p)) return false;
        if (document.querySelector('[data-sticky-book], .bq-sticky-book')) return false;
        return !!(document.querySelector('.lon-landing, .cq-body, .mag-body, .nu-hero, .bo-hero, .dr-hero, .consulta-cta-band, .eeat-profile-page'));
    }

    function injectStickyBar(first) {
        if (!shouldInjectSticky()) return;
        var meta = landingBookMeta();
        var lang = pageLang();
        var kicker = lang === 'en' ? 'Next slot' : lang === 'es' ? 'Pr\u00f3ximo horario' : 'Pr\u00f3ximo hor\u00e1rio';
        var bar = document.createElement('div');
        bar.className = 'cq-sticky-book';
        bar.setAttribute('data-sticky-book', '');
        bar.setAttribute('data-service', meta.service);
        bar.setAttribute('data-book-href', meta.href);
        bar.innerHTML =
            '<div class="cq-sticky-book-inner">' +
            '<p class="cq-sticky-book-copy">' +
            '<span class="cq-sticky-book-kicker">' + kicker + '</span>' +
            '<strong data-next-slot-when></strong>' +
            '</p>' +
            '<a class="lon-btn lon-btn-dark" data-next-slot-cta data-pay-badges href="' + meta.href + '">' + meta.cta + '</a>' +
            '</div>';
        document.body.appendChild(bar);
        if (first) {
            var when = bar.querySelector('[data-next-slot-when]');
            if (when) when.textContent = formatSlotWhen(first.date, first.time);
            bar.hidden = false;
            var cta = bar.querySelector('[data-next-slot-cta]');
            if (cta) {
                cta.addEventListener('click', function (e) {
                    e.preventDefault();
                    goCheckout(first, {
                        service: meta.service,
                        fallbackHref: meta.href,
                        surface: 'sticky_book'
                    });
                });
                attachPayBadges(cta);
            }
        }
    }

    function fillAvailability(first) {
        document.querySelectorAll('[data-doctor-available]').forEach(function (el) {
            var name = el.getAttribute('data-doctor-name') || 'Dr. Rita Aguiar';
            var lang = pageLang();
            if (first && isSameLocalDay(first.date)) {
                el.hidden = false;
                el.textContent = lang === 'en'
                    ? name + ' \u2014 Available today'
                    : lang === 'es'
                        ? name + ' \u2014 Disponible hoy'
                        : name + ' \u2014 Dispon\u00edvel Hoje';
            } else if (first) {
                el.hidden = false;
                el.textContent = lang === 'en'
                    ? name + ' \u2014 Next: ' + formatSlotWhen(first.date, first.time)
                    : name + ' \u2014 ' + formatSlotWhen(first.date, first.time);
            }
        });
    }

    injectPayBadges();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPayBadges);
    }

    fetch('/api/next-slots?limit=6')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            var slots = data && data.slots ? data.slots : [];
            var first = slots[0] || null;

            document.querySelectorAll('[data-next-slots]').forEach(function (box) {
                var row = box.querySelector('[data-next-slots-row]');
                if (!row || !slots.length) return;
                var limit = parseInt(box.getAttribute('data-limit'), 10);
                if (!Number.isFinite(limit) || limit < 1) limit = 3;
                box.hidden = false;
                renderRow(row, slots.slice(0, limit), {
                    service: box.getAttribute('data-service') || 'clinica_geral',
                    fallbackHref: box.getAttribute('data-book-href') || '/marcar/clinica-geral',
                    surface: box.getAttribute('data-surface') || 'live_slots'
                });
            });

            if (first) {
                document.querySelectorAll('[data-next-slot-when]').forEach(function (el) {
                    el.textContent = formatSlotWhen(first.date, first.time);
                });
                document.querySelectorAll('[data-sticky-book]').forEach(function (bar) {
                    bar.hidden = false;
                    var cta = bar.querySelector('[data-next-slot-cta]');
                    var href = bar.getAttribute('data-book-href') || (cta && cta.getAttribute('href')) || '/marcar/clinica-geral';
                    var service = bar.getAttribute('data-service') || 'clinica_geral';
                    if (cta && cta.getAttribute('data-slot-bound') !== '1') {
                        cta.setAttribute('data-slot-bound', '1');
                        cta.addEventListener('click', function (e) {
                            e.preventDefault();
                            goCheckout(first, {
                                service: service,
                                fallbackHref: href,
                                surface: 'sticky_book'
                            });
                        });
                    }
                });
            }

            injectStickyBar(first);
            fillAvailability(first);

            var heroBook = document.getElementById('lonHeroBook');
            var nextSlotEl = document.getElementById('lonNextSlot');
            var nextSlotWhen = document.getElementById('lonNextSlotWhen');
            if (first && nextSlotWhen) nextSlotWhen.textContent = formatSlotWhen(first.date, first.time);
            if (first && nextSlotEl) nextSlotEl.hidden = false;
            if (heroBook && first && heroBook.getAttribute('data-slot-bound') !== '1') {
                heroBook.setAttribute('data-slot-bound', '1');
                heroBook.addEventListener('click', function (e) {
                    e.preventDefault();
                    goCheckout(first, {
                        service: 'clinica_geral',
                        fallbackHref: '/marcar/clinica-geral',
                        surface: 'home'
                    });
                });
            }
        })
        .catch(function () {
            injectStickyBar(null);
        });
})();
