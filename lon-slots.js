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

    function readBurnoutQuiz() {
        try {
            var raw = sessionStorage.getItem('lonBurnoutQuiz');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function isWeightLossPath(pathname) {
        var p = String(pathname || '').toLowerCase();
        return /\/nutricao\/(programa|glp-1|ozempic-wegovy|avaliacao|teste-imc|teste-tfeq|teste-yfas)(\/|$)/.test(p)
            || /\/marcar\/nutricao-/.test(p);
    }

    function nutritionPrefill(opts) {
        opts = opts || {};
        var goal = opts.goal || 'Perda de peso / reeduca\u00e7\u00e3o metab\u00f3lica';
        return {
            goal: goal,
            concerns: 'Objectivo: ' + goal + '. Consulta inicial de nutri\u00e7\u00e3o metab\u00f3lica \u2014 programa de reeduca\u00e7\u00e3o, sem prescri\u00e7\u00e3o de aGLP-1.',
            category: 'weight-loss',
            product: 'nutricao_programa',
            label: 'Consulta inicial de nutri\u00e7\u00e3o metab\u00f3lica'
        };
    }

    function clinicalIntentFor(service) {
        if (service === 'nutricao_programa' || service === 'nutricao_completo' || service === 'nutricao_completo_reforcado') {
            return nutritionPrefill();
        }
        if (service !== 'burnout' && service !== 'burnout_mensal' && service !== 'burnout_programa') {
            return null;
        }
        var quiz = readBurnoutQuiz();
        var intent = {
            category: 'burnout',
            product: service,
            label: service === 'burnout_mensal'
                ? 'Programa anti-burnout \u00b7 subscri\u00e7\u00e3o mensal (CBI)'
                : service === 'burnout_programa'
                    ? 'Programa anti-burnout \u00b7 8 sess\u00f5es (CBI)'
                    : 'Avalia\u00e7\u00e3o \u00fanica anti-burnout (CBI)'
        };
        if (quiz && quiz.band) {
            intent.source = 'cbi';
            intent.cbiBand = quiz.band;
            if (quiz.global != null) intent.cbiGlobal = quiz.global;
        }
        return intent;
    }

    function serviceMeta(service) {
        var lang = pageLang();
        if (service === 'renovacao') {
            return {
                service: 'renovacao',
                tipo: 'renovacao',
                serviceLabel: lang === 'en' ? 'Prescription renewal' : 'Renova\u00e7\u00e3o de tratamento m\u00e9dico',
                servicePrice: formatEuro(19),
                servicePriceCents: 1900
            };
        }
        if (service === 'travel') {
            return {
                service: 'travel',
                tipo: 'travel',
                serviceLabel: lang === 'en' ? 'Travel clinic consultation' : 'Consulta do viajante',
                servicePrice: formatEuro(39),
                servicePriceCents: 3900
            };
        }
        if (service === 'burnout_mensal') {
            return {
                service: 'burnout_mensal',
                tipo: 'burnout_mensal',
                serviceLabel: lang === 'en' ? 'Anti-Burnout Subscription' : 'Subscri\u00e7\u00e3o Anti-Burnout',
                servicePrice: '216 \u20AC/m\u00eas',
                servicePriceCents: 21600
            };
        }
        if (service === 'burnout_programa') {
            return {
                service: 'burnout_programa',
                tipo: 'burnout_programa',
                serviceLabel: lang === 'en' ? 'Anti-Burnout Program (8 sessions)' : 'Programa Anti-Burnout (8 sess\u00f5es)',
                servicePrice: formatEuro(490),
                servicePriceCents: 49000
            };
        }
        if (service === 'burnout') {
            return {
                service: 'burnout',
                tipo: 'burnout',
                serviceLabel: lang === 'en' ? 'Specialized Burnout Consultation' : 'Consulta Especializada em Burnout',
                servicePrice: formatEuro(60),
                servicePriceCents: 6000
            };
        }
        if (service === 'saude_mental') {
            return {
                service: 'saude_mental',
                tipo: 'saude_mental',
                serviceLabel: lang === 'en' ? 'Medical mental health consultation' : 'Consulta m\u00e9dica de sa\u00fade mental',
                servicePrice: formatEuro(60),
                servicePriceCents: 6000
            };
        }
        if (service === 'nutricao_programa' || service === 'nutricao_completo' || service === 'nutricao_completo_reforcado') {
            var nLabels = {
                nutricao_programa: {
                    pt: 'Consulta inicial de nutri\u00e7\u00e3o metab\u00f3lica',
                    en: 'Initial metabolic nutrition consultation',
                    es: 'Consulta inicial de nutrici\u00f3n metab\u00f3lica'
                },
                nutricao_completo: {
                    pt: 'Programa completo \u2014 m\u00eas 1',
                    en: 'Complete program \u2014 month 1',
                    es: 'Programa completo \u2014 mes 1'
                },
                nutricao_completo_reforcado: {
                    pt: 'Programa completo \u2014 entrada refor\u00e7ada',
                    en: 'Complete program \u2014 higher first payment',
                    es: 'Programa completo \u2014 entrada reforzada'
                }
            };
            var nPrices = { nutricao_programa: 115, nutricao_completo: 227, nutricao_completo_reforcado: 322 };
            var nLoc = lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'pt';
            return {
                service: service,
                tipo: service,
                serviceLabel: nLabels[service][nLoc],
                servicePrice: formatEuro(nPrices[service]),
                servicePriceCents: nPrices[service] * 100
            };
        }
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

    function hrefNeedsLangPolicy(href) {
        try {
            var u = new URL(href || '', window.location.origin);
            if (u.searchParams.get('langpolicy') === 'en-es-pt') return true;
            return /-(fr|de)$/i.test(u.searchParams.get('ref') || '');
        } catch (e) {
            return false;
        }
    }

    function pageNeedsLangPolicy(fallbackHref) {
        var lang = pageLang();
        return lang === 'fr' || lang === 'de' || hrefNeedsLangPolicy(fallbackHref);
    }

    function goCheckout(slot, opts) {
        opts = opts || {};
        var fallback = opts.fallbackHref || '/marcar/clinica-geral';
        if (opts.bookMode === 'link') {
            window.location.href = fallback;
            return;
        }
        var meta = serviceMeta(opts.service || 'clinica_geral');
        if (!slot || !slot.date || !slot.time) {
            window.location.href = fallback;
            return;
        }
        var slotId = slot.id || slotIdFrom(slot.date, slot.time);
        var consultLangPolicy = pageNeedsLangPolicy(fallback);
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
            locale: pageLang(),
            consultLangPolicy: consultLangPolicy,
            clinicalIntent: clinicalIntentFor(meta.service),
            goal: opts.goal || '',
            concerns: opts.concerns || ''
        };
        if (meta.service === 'nutricao_programa' || meta.service === 'nutricao_completo' || meta.service === 'nutricao_completo_reforcado') {
            var nu = nutritionPrefill({ goal: opts.goal });
            payload.goal = nu.goal;
            payload.concerns = nu.concerns;
            payload.clinicalIntent = nu;
        }
        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) { /* private mode */ }
        function navigate(holdId) {
            var dest = '/book-consultation?slot=' + encodeURIComponent(slotId) +
                '&service=' + encodeURIComponent(meta.service) +
                '&date=' + encodeURIComponent(slot.date) +
                '&time=' + encodeURIComponent(slot.time);
            if (holdId) dest += '&hold=' + encodeURIComponent(holdId);
            if (consultLangPolicy) dest += '&langpolicy=en-es-pt';
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
        document.querySelectorAll('.lon-service-glass .lon-btn, .consulta-price-card .lon-btn, .guide-book-cta, .nu-hero-actions .lon-btn-primary, .js-mp-cta.lon-btn-dark, .js-mp-cta.lon-btn-soft[data-pay-badges]').forEach(attachPayBadges);
        document.querySelectorAll('a.js-consulta-cta.lon-btn-dark, a.js-consulta-cta.lon-btn-primary, #lonHeroBook, #consultaCtaHero, #next-2.pay-btn').forEach(attachPayBadges);
    }

    function landingBookMeta() {
        var p = (location.pathname || '/').toLowerCase();
        var lang = pageLang();
        var book = lang === 'en' ? 'Book consultation' : lang === 'es' ? 'Reservar consulta' : 'Marcar Consulta';
        if (/\/consulta\/renovacao|\/marcar\/renovacao|renew-prescription/.test(p)) {
            return { service: 'renovacao', href: '/marcar/renovacao', cta: book + ' \u2014 ' + formatEuro(19) };
        }
        if (/\/psicologia-burnout/.test(p)) {
            return {
                service: '',
                href: '/burnout/teste',
                cta: lang === 'en' ? 'Take the CBI test' : 'Fazer o teste CBI',
                bookMode: 'link'
            };
        }
        if (/\/(saudemental|consultas|psicologia)(\/|$)/.test(p)) {
            return { service: 'saude_mental', href: '/saudemental', cta: book + ' \u2014 ' + formatEuro(60) };
        }
        if (/\/marcar\/burnout-programa/.test(p)) {
            return { service: 'burnout_programa', href: '/marcar/burnout-programa', cta: book + ' \u2014 ' + formatEuro(490) };
        }
        if (/\/marcar\/burnout-mensal/.test(p)) {
            return { service: 'burnout_mensal', href: '/marcar/burnout-mensal', cta: book + ' \u2014 216 \u20AC/m\u00eas' };
        }
        if (/\/marcar\/burnout(\/|$)/.test(p)) {
            return { service: 'burnout', href: '/marcar/burnout', cta: book + ' \u2014 ' + formatEuro(60) };
        }
        if (/\/burnout|clinica-anti-burnout/.test(p)) {
            return { service: 'burnout_mensal', href: '/marcar/burnout-mensal', cta: book + ' \u2014 216 \u20AC/m\u00eas' };
        }
        if (isWeightLossPath(p)) {
            return {
                service: 'nutricao_programa',
                href: '/marcar/nutricao-programa?ref=sticky-nutricao',
                cta: (lang === 'en' ? 'Initial metabolic nutrition consult' : 'Consulta inicial de nutri\u00e7\u00e3o metab\u00f3lica') + ' \u2014 ' + formatEuro(115),
                goal: 'Perda de peso / reeduca\u00e7\u00e3o metab\u00f3lica'
            };
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
        bar.setAttribute('data-service', meta.service || '');
        bar.setAttribute('data-book-href', meta.href);
        if (meta.bookMode) bar.setAttribute('data-book-mode', meta.bookMode);
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
                        surface: 'sticky_book',
                        bookMode: meta.bookMode || '',
                        goal: meta.goal || ''
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
                service: box.getAttribute('data-service') || landingBookMeta().service || 'clinica_geral',
                fallbackHref: href,
                surface: box.getAttribute('data-surface') || 'live_slots',
                bookMode: box.getAttribute('data-book-mode') || '',
                goal: box.getAttribute('data-goal') || landingBookMeta().goal || ''
            });
        });

        document.querySelectorAll('[data-sticky-book]').forEach(function (bar) {
            bar.hidden = false;
            var cta = bar.querySelector('[data-next-slot-cta]');
            var href = bar.getAttribute('data-book-href') || (cta && cta.getAttribute('href')) || '/marcar/clinica-geral';
            var landing = landingBookMeta();
            var service = bar.getAttribute('data-service') || landing.service || 'clinica_geral';
            var bookMode = bar.getAttribute('data-book-mode') || landing.bookMode || '';
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
                            surface: 'sticky_book',
                            bookMode: bookMode,
                            goal: bar.getAttribute('data-goal') || landing.goal || ''
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
