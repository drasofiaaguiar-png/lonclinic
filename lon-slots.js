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

    function slotIdFrom(dateISO, time) {
        var d = String(dateISO || '').replace(/-/g, '');
        var t = String(time || '').replace(':', '');
        if (t.length === 3) t = '0' + t;
        return d + '-' + t.slice(0, 4);
    }

    function weekFallbackLabel() {
        var lang = pageLang();
        if (lang === 'en') return "See this week's availability";
        if (lang === 'es') return 'Ver disponibilidad de esta semana';
        if (lang === 'fr') return 'Voir les disponibilités de la semaine';
        if (lang === 'de') return 'Verfügbarkeit dieser Woche anzeigen';
        return 'Ver disponibilidade desta semana';
    }

    var slotsMemory = { data: null, ts: 0, inflight: null };
    var SLOTS_TTL_MS = 45000;
    var SLOTS_STALE_MS = 120000;
    var SLOTS_CACHE_KEY = 'lonNextSlots:v3';

    function readSlotsCache() {
        if (slotsMemory.data && (Date.now() - slotsMemory.ts) < SLOTS_STALE_MS) {
            return { data: slotsMemory.data, ts: slotsMemory.ts };
        }
        try {
            var raw = sessionStorage.getItem(SLOTS_CACHE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.data || !parsed.ts) return null;
            if (Date.now() - parsed.ts > SLOTS_STALE_MS) return null;
            slotsMemory.data = parsed.data;
            slotsMemory.ts = parsed.ts;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function writeSlotsCache(data) {
        slotsMemory.data = data;
        slotsMemory.ts = Date.now();
        try {
            sessionStorage.setItem(SLOTS_CACHE_KEY, JSON.stringify({ data: data, ts: slotsMemory.ts }));
        } catch (e) { /* private mode */ }
    }

    function fetchSlotsNetwork() {
        if (slotsMemory.inflight) return slotsMemory.inflight;
        slotsMemory.inflight = fetch('/api/next-slots?limit=6&withinHours=24', { credentials: 'same-origin' })
            .then(function (r) {
                return r.json().then(function (data) {
                    data = data || {};
                    data._ok = r.ok;
                    data._http = r.status;
                    return data;
                }).catch(function () {
                    return { slots: [], _ok: false, _http: r.status };
                });
            })
            .then(function (data) {
                if (data && data._ok && Array.isArray(data.slots) && !data.error) {
                    writeSlotsCache(data);
                    return data;
                }
                var cached = readSlotsCache();
                if (cached && cached.data) return cached.data;
                return data;
            })
            .finally(function () { slotsMemory.inflight = null; });
        return slotsMemory.inflight;
    }

    function loadSlotsSWR() {
        var cached = readSlotsCache();
        var age = cached ? Date.now() - cached.ts : Infinity;
        if (cached && cached.data && age < SLOTS_TTL_MS) {
            return Promise.resolve(cached.data);
        }
        if (cached && cached.data && age < SLOTS_STALE_MS) {
            fetchSlotsNetwork();
            return Promise.resolve(cached.data);
        }
        return fetchSlotsNetwork();
    }

    function goCheckout(slot, opts) {
        opts = opts || {};
        var meta = serviceMeta(opts.service || 'clinica_geral');
        var fallback = opts.fallbackHref || '/marcar/clinica-geral';
        if (!slot || !slot.date || !slot.time) {
            window.location.href = fallback;
            return;
        }
        var slotId = slot.id || slotIdFrom(slot.date, slot.time);
        var payload = {
            service: meta.service,
            tipo: meta.tipo,
            serviceLabel: meta.serviceLabel,
            servicePrice: meta.servicePrice,
            servicePriceCents: meta.servicePriceCents,
            dateISO: slot.date,
            dateLabel: formatSlotWhen(slot.date, slot.time),
            time: slot.time,
            slotId: slotId,
            travellerCount: 1,
            hasInsurance: false,
            locale: pageLang()
        };
        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) { /* private mode */ }
        function navigate(holdId) {
            var dest = '/book-consultation?slot=' + encodeURIComponent(slotId) +
                '&service=' + encodeURIComponent(meta.service) +
                '&date=' + encodeURIComponent(slot.date) +
                '&time=' + encodeURIComponent(slot.time);
            if (holdId) dest += '&hold=' + encodeURIComponent(holdId);
            track('time_slot_clicked', {
                surface: opts.surface || 'slots',
                service: meta.service,
                time: slot.time,
                slot: slotId
            });
            track('cta_click', {
                surface: opts.surface || 'slots',
                service: meta.service,
                step: 'next_slot'
            });
            if (window.LonAnalytics) window.LonAnalytics.flush();
            window.location.href = dest;
        }
        fetch('/api/slot-hold', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot: slotId, service: meta.service })
        }).then(function (r) {
            if (r.status === 409) {
                window.location.href = fallback;
                return null;
            }
            return r.ok ? r.json() : {};
        }).then(function (data) {
            if (data == null) return;
            if (data.holdId) {
                try {
                    payload.holdId = data.holdId;
                    sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
                } catch (e2) { /* ignore */ }
            }
            navigate(data.holdId || '');
        }).catch(function () {
            navigate('');
        });
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
        if (/book-consultation|\/book\.html|\/marcar(\/|$)|\/admin|patient-portal|clinic-portal|\/recrutamento/.test(p)) return false;
        if (document.querySelector('[data-sticky-book], .bq-sticky-book')) return false;
        return !!(document.querySelector('.lon-landing, .cq-body, .mag-body, .nu-hero, .bo-hero, .dr-hero, .consulta-cta-band, .eeat-profile-page'));
    }

    function injectStickyBar(first) {
        if (!shouldInjectSticky()) return;
        var meta = landingBookMeta();
        var lang = pageLang();
        var kicker = first
            ? (lang === 'en' ? 'Next slot' : lang === 'es' ? 'Pr\u00f3ximo horario' : 'Pr\u00f3ximo hor\u00e1rio')
            : weekFallbackLabel();
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
            '<a class="lon-btn lon-btn-dark" data-next-slot-cta data-pay-badges href="' + meta.href + '">' +
            (first ? meta.cta : weekFallbackLabel()) + '</a>' +
            '</div>';
        document.body.appendChild(bar);
        bar.hidden = false;
        var when = bar.querySelector('[data-next-slot-when]');
        var cta = bar.querySelector('[data-next-slot-cta]');
        if (first) {
            if (when) when.textContent = formatSlotWhen(first.date, first.time);
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

    function ensureWeekFallback(box, href) {
        var link = box.querySelector('[data-slots-fallback]');
        if (!link) {
            link = document.createElement('a');
            link.setAttribute('data-slots-fallback', '');
            link.className = 'dr-slots-week';
            box.appendChild(link);
        }
        link.href = href;
        link.textContent = weekFallbackLabel();
        return link;
    }

    function applyLiveSlots(data) {
        var hasHorizon = !(data && data.hasSlotsWithinHorizon === false);
        var slots = (hasHorizon && data && data.slots) ? data.slots : [];
        var first = slots[0] || null;

        document.querySelectorAll('[data-next-slots]').forEach(function (box) {
            var row = box.querySelector('[data-next-slots-row]');
            var href = box.getAttribute('data-book-href') || '/marcar/clinica-geral';
            var fallback = ensureWeekFallback(box, href);
            box.hidden = false;
            if (!slots.length) {
                box.classList.add('is-fallback');
                if (row) row.innerHTML = '';
                fallback.hidden = false;
                return;
            }
            box.classList.remove('is-fallback');
            fallback.hidden = true;
            if (!row) return;
            var limit = parseInt(box.getAttribute('data-limit'), 10);
            if (!Number.isFinite(limit) || limit < 1) limit = 3;
            renderRow(row, slots.slice(0, limit), {
                service: box.getAttribute('data-service') || 'clinica_geral',
                fallbackHref: href,
                surface: box.getAttribute('data-surface') || 'live_slots'
            });
        });

        document.querySelectorAll('[data-sticky-book]').forEach(function (bar) {
            bar.hidden = false;
            var cta = bar.querySelector('[data-next-slot-cta]');
            var href = bar.getAttribute('data-book-href') || (cta && cta.getAttribute('href')) || '/marcar/clinica-geral';
            var service = bar.getAttribute('data-service') || 'clinica_geral';
            var when = bar.querySelector('[data-next-slot-when]');
            var kicker = bar.querySelector('.cq-sticky-book-kicker');
            if (first) {
                if (when) when.textContent = formatSlotWhen(first.date, first.time);
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
            } else {
                if (kicker) kicker.textContent = weekFallbackLabel();
                if (when) when.textContent = '';
                if (cta) {
                    cta.textContent = weekFallbackLabel();
                    cta.setAttribute('href', href);
                }
            }
        });

        if (!document.querySelector('[data-sticky-book]')) {
            injectStickyBar(first);
        }
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
    }

    var needsSlots = !!(
        document.querySelector('[data-next-slots], [data-sticky-book], #lonHeroBook, [data-doctor-available]') ||
        shouldInjectSticky()
    );
    if (!needsSlots) return;

    loadSlotsSWR()
        .then(function (data) { applyLiveSlots(data || { slots: [] }); })
        .catch(function () {
            applyLiveSlots({ slots: [] });
        });
})();
