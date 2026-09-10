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
        if (service === 'psicologia') {
            return {
                service: 'psicologia',
                tipo: 'psicologia',
                serviceLabel: lang === 'en' ? 'Psychology session' : lang === 'es' ? 'Sesi\u00f3n de psicolog\u00eda' : 'Sess\u00e3o de Psicologia',
                servicePrice: formatEuro(60),
                servicePriceCents: 6000
            };
        }
        if (service === 'terapia_casal') {
            return {
                service: 'terapia_casal',
                tipo: 'terapia_casal',
                serviceLabel: lang === 'en' ? 'Couples therapy' : lang === 'es' ? 'Terapia de pareja' : 'Terapia de casal',
                servicePrice: formatEuro(75),
                servicePriceCents: 7500
            };
        }
        if (service === 'terapia_casal_mensal') {
            return {
                service: 'terapia_casal_mensal',
                tipo: 'terapia_casal_mensal',
                serviceLabel: lang === 'en' ? 'Couples therapy subscription' : lang === 'es' ? 'Suscripci\u00f3n de terapia de pareja' : 'Subscri\u00e7\u00e3o de terapia de casal',
                servicePrice: '260 \u20AC/m\u00eas',
                servicePriceCents: 26000
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
        if (service === 'longevidade') {
            return {
                service: 'longevidade',
                tipo: 'longevidade',
                serviceLabel: lang === 'en' ? 'Longevity consultation' : lang === 'es' ? 'Consulta de longevidad' : 'Consulta de longevidade',
                servicePrice: formatEuro(79),
                servicePriceCents: 7900
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
        try {
            if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
                window.LonAnalytics.track(name, props);
            }
        } catch (e) { /* never block booking UI */ }
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

    var slotsMemory = { data: null, ts: 0, service: '', inflight: null, inflightService: '', controller: null };
    var liveState = { first: null };
    var slotsGen = 0;
    var SLOTS_TTL_MS = 45000;
    var SLOTS_STALE_MS = 120000;
    var SLOTS_CACHE_KEY = 'lonNextSlots:v4';

    var HERO_SERVICE_PACKS = {
        clinica_geral: { service: 'clinica_geral', href: '/marcar/clinica-geral' },
        nutricao_programa: {
            service: 'nutricao_programa',
            href: '/marcar/nutricao-programa',
            goal: 'Perda de peso / reeduca\u00e7\u00e3o metab\u00f3lica'
        },
        psicologia: { service: 'psicologia', href: '/marcar/psicologia' }
    };

    function heroServicePack() {
        var sel = document.getElementById('lonHeroService');
        if (!sel) return null;
        return HERO_SERVICE_PACKS[sel.value] || HERO_SERVICE_PACKS.clinica_geral;
    }

    function currentSlotsService() {
        try {
            return landingBookMeta().service || 'clinica_geral';
        } catch (e) {
            return 'clinica_geral';
        }
    }

    function slotCalendarGroup(service) {
        if (service === 'clinica_geral' || service === 'nutricao_programa' ||
            service === 'nutricao_completo' || service === 'nutricao_completo_reforcado') {
            return 'medical';
        }
        return service || '';
    }

    function slotsCacheKeyFor(service) {
        return SLOTS_CACHE_KEY + ':' + (service || 'clinica_geral');
    }

    function siblingSlotService(service) {
        if (service === 'nutricao_programa') return 'clinica_geral';
        return '';
    }

    function abortSlotsFetch() {
        if (!slotsMemory.controller) return;
        try { slotsMemory.controller.abort(); } catch (e) { /* ignore */ }
        slotsMemory.controller = null;
        slotsMemory.inflight = null;
        slotsMemory.inflightService = '';
    }

    function setHomeSlotsBusy(busy) {
        var box = document.querySelector('[data-next-slots][data-surface="home"]');
        if (!box) return;
        if (busy) {
            box.classList.add('is-loading');
            box.setAttribute('aria-busy', 'true');
        } else {
            box.classList.remove('is-loading');
            box.removeAttribute('aria-busy');
        }
    }

    function syncHeroBookingTargets(pack) {
        if (!pack) return;
        var box = document.querySelector('[data-next-slots][data-surface="home"]');
        if (box) {
            box.setAttribute('data-service', pack.service);
            box.setAttribute('data-book-href', pack.href);
            if (pack.goal) box.setAttribute('data-goal', pack.goal);
            else box.removeAttribute('data-goal');
            var other = box.querySelector('.dr-next-slot-other');
            if (other) other.setAttribute('href', pack.href);
            var week = box.querySelector('[data-slots-fallback]');
            if (week) week.setAttribute('href', pack.href);
        }
        var heroBook = document.getElementById('lonHeroBook');
        if (heroBook) heroBook.setAttribute('href', pack.href);
        var sticky = document.querySelector('[data-sticky-book]');
        if (sticky) {
            sticky.setAttribute('data-service', pack.service);
            sticky.setAttribute('data-book-href', pack.href);
            if (pack.goal) sticky.setAttribute('data-goal', pack.goal);
            else sticky.removeAttribute('data-goal');
            var stickyCta = sticky.querySelector('[data-next-slot-cta]');
            if (stickyCta) stickyCta.setAttribute('href', pack.href);
        }
    }

    function readSessionSlots(service) {
        try {
            var raw = sessionStorage.getItem(slotsCacheKeyFor(service));
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.data || !parsed.ts) return null;
            if (Date.now() - parsed.ts > SLOTS_STALE_MS) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function readAnySessionSlots(service) {
        if (!service) return null;
        try {
            var raw = sessionStorage.getItem(slotsCacheKeyFor(service));
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.data || !Array.isArray(parsed.data.slots) || !parsed.data.slots.length) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function readSlotsCache() {
        var service = currentSlotsService();
        if (slotsMemory.data && slotsMemory.service &&
            slotCalendarGroup(slotsMemory.service) === slotCalendarGroup(service) &&
            (Date.now() - slotsMemory.ts) < SLOTS_STALE_MS) {
            return { data: slotsMemory.data, ts: slotsMemory.ts };
        }
        var hit = readSessionSlots(service);
        if (hit) {
            slotsMemory.data = hit.data;
            slotsMemory.ts = hit.ts;
            slotsMemory.service = service;
            return hit;
        }
        var sibling = siblingSlotService(service);
        if (sibling) {
            hit = readSessionSlots(sibling);
            if (hit) return hit;
        }
        return null;
    }

    function writeSlotsCache(data, service) {
        var key = service || currentSlotsService();
        slotsMemory.data = data;
        slotsMemory.ts = Date.now();
        slotsMemory.service = key;
        try {
            sessionStorage.setItem(slotsCacheKeyFor(key), JSON.stringify({ data: data, ts: slotsMemory.ts }));
        } catch (e) { /* private mode */ }
    }

    function fetchSlotsNetwork(service) {
        var requested = service || currentSlotsService();
        if (slotsMemory.inflight && slotsMemory.inflightService === requested) {
            return slotsMemory.inflight;
        }
        abortSlotsFetch();
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        slotsMemory.controller = controller;
        var req = fetch('/api/next-slots?limit=8&withinHours=168&service=' + encodeURIComponent(requested), {
            credentials: 'same-origin',
            signal: controller ? controller.signal : undefined
        })
            .then(function (r) {
                return r.json().then(function (data) {
                    data = data || {};
                    data._ok = r.ok;
                    data._http = r.status;
                    data._service = requested;
                    return data;
                }).catch(function () {
                    return { slots: [], _ok: false, _http: r.status, _service: requested };
                });
            })
            .catch(function (err) {
                var cached = readSlotsCache();
                if (cached && cached.data) return cached.data;
                return {
                    slots: [],
                    _ok: false,
                    _aborted: !!(err && err.name === 'AbortError'),
                    _service: requested
                };
            })
            .then(function (data) {
                if (currentSlotsService() !== requested) return data;
                if (data && data._ok && Array.isArray(data.slots) && !data.error) {
                    writeSlotsCache(data, requested);
                    return data;
                }
                var cached = readSlotsCache();
                if (cached && cached.data) return cached.data;
                return data;
            })
            .finally(function () {
                if (slotsMemory.inflightService === requested) {
                    slotsMemory.inflight = null;
                    slotsMemory.inflightService = '';
                    if (slotsMemory.controller === controller) slotsMemory.controller = null;
                }
            });
        slotsMemory.inflight = req;
        slotsMemory.inflightService = requested;
        return req;
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
        var service = currentSlotsService();
        var display = cached || readAnySessionSlots(service) || readAnySessionSlots(siblingSlotService(service));
        if (display && display.data && Array.isArray(display.data.slots) && display.data.slots.length) {
            fetchSlotsNetwork(service);
            return Promise.resolve(display.data);
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

    var CONSULT_LANG_NOTICE_EN = 'Consultations strictly provided in English and Portuguese';
    var CONSULT_LANG_NOTICE_LOCAL = {
        fr: 'Les consultations se d\u00e9roulent exclusivement en anglais ou en portugais. Pas de consultation en fran\u00e7ais.',
        de: 'Sprechstunden ausschlie\u00dflich auf Englisch oder Portugiesisch. Keine Beratung auf Deutsch.'
    };

    function injectLangPolicyStyles() {
        if (document.getElementById('lonLangPolicyStyles')) return;
        var style = document.createElement('style');
        style.id = 'lonLangPolicyStyles';
        style.textContent =
            '.lon-slots-lang-banner{margin:0 0 10px;background:#1a1408;color:#fff8e8;border-left:4px solid #d4a017;border-radius:10px;padding:10px 12px}' +
            '.lon-slots-lang-en{margin:0;font-weight:800;font-size:.88rem}' +
            '.lon-slots-lang-local{margin:4px 0 0;font-size:.8rem;line-height:1.35;opacity:.92}' +
            '.cq-sticky-book .lon-slots-lang-banner{margin:0 0 8px}';
        document.head.appendChild(style);
    }

    function langPolicyBannerHtml() {
        var lang = pageLang();
        var local = CONSULT_LANG_NOTICE_LOCAL[lang] || '';
        return '<aside class="lon-slots-lang-banner" role="alert" data-lon-lang-policy>' +
            '<p class="lon-slots-lang-en">' + CONSULT_LANG_NOTICE_EN + '</p>' +
            (local ? '<p class="lon-slots-lang-local">' + local + '</p>' : '') +
            '</aside>';
    }

    function ensureLangPolicyNotice(host) {
        if (!host || host.querySelector('[data-lon-lang-policy]')) return;
        host.insertAdjacentHTML('afterbegin', langPolicyBannerHtml());
    }

    function injectLangPolicyNotices() {
        if (!pageNeedsLangPolicy(window.location.href)) return;
        injectLangPolicyStyles();
        if (!document.querySelector('.tq-lang-banner, [data-lon-lang-policy-page]')) {
            var afterNav = document.querySelector('.lon-nav');
            var pageBanner = document.createElement('div');
            pageBanner.setAttribute('data-lon-lang-policy-page', '1');
            pageBanner.innerHTML = langPolicyBannerHtml();
            if (afterNav && afterNav.parentNode) afterNav.insertAdjacentElement('afterend', pageBanner);
            else document.body.insertAdjacentElement('afterbegin', pageBanner);
        }
        document.querySelectorAll('[data-next-slots], [data-sticky-book]').forEach(ensureLangPolicyNotice);
    }

    function goCheckout(slot, opts) {
        opts = opts || {};
        var fallback = opts.fallbackHref || '/marcar/clinica-geral';
        if (opts.bookMode === 'link') {
            window.location.href = fallback;
            return;
        }
        if ((opts.service || '') === 'psicologia') {
            var psiDest = fallback || '/marcar/psicologia';
            try {
                var u = new URL(psiDest, window.location.origin);
                if (slot && slot.date) u.searchParams.set('date', slot.date);
                if (slot && slot.time) u.searchParams.set('time', slot.time);
                psiDest = u.pathname + u.search;
            } catch (e) { /* keep fallback */ }
            window.location.href = psiDest;
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

    function landingBookMeta() {
        var p = (location.pathname || '/').toLowerCase();
        var lang = pageLang();
        var book = lang === 'en' ? 'Book consultation' : lang === 'es' ? 'Reservar consulta' : 'Marcar consulta';
        var talk = (window.LonTalkCta && window.LonTalkCta.shouldTalk(p, document.body && document.body.className))
            ? window.LonTalkCta.resolveFromPath(p, lang, document.body && document.body.className)
            : null;
        var talkCta = talk && talk.label ? talk.label : book;
        var hero = heroServicePack();
        if (hero) {
            return {
                service: hero.service,
                href: hero.href,
                cta: talkCta,
                goal: hero.goal || ''
            };
        }
        if (/\/consulta\/renovacao|\/marcar\/renovacao|renew-prescription/.test(p)) {
            return { service: 'renovacao', href: '/marcar/renovacao', cta: book };
        }
        if (/\/blog\/[^/?#]*burnout/i.test(p)) {
            return { service: 'burnout_mensal', href: '/marcar/burnout-mensal', cta: talkCta };
        }
        if (/\/psicologia-burnout/.test(p)) {
            return {
                service: '',
                href: '/burnout/teste',
                cta: lang === 'en' ? 'Take the CBI test' : 'Fazer o teste CBI',
                bookMode: 'link'
            };
        }
        if (/\/marcar\/terapia-casal-mensal/.test(p)) {
            return { service: 'terapia_casal_mensal', href: '/marcar/terapia-casal-mensal', cta: book };
        }
        if (/\/terapia-de-casal/.test(p) || /\/marcar\/terapia-casal/.test(p)) {
            return { service: 'terapia_casal', href: '/marcar/terapia-casal', cta: book };
        }
        if (document.body && document.body.classList.contains('qx-body')) {
            return { service: 'saude_mental', href: '/triagem', cta: talkCta, bookMode: 'link' };
        }
        if (/\/(saudemental|psicologia)(\/|$)/.test(p)) {
            return { service: 'psicologia', href: '/marcar/psicologia', cta: book };
        }
        if (/\/consultas(\/|$)/.test(p)) {
            return { service: 'saude_mental', href: '/triagem', cta: talkCta, bookMode: 'link' };
        }
        if (/\/marcar\/psicologia/.test(p)) {
            return { service: 'psicologia', href: '/marcar/psicologia', cta: book };
        }
        if (/\/marcar\/burnout-programa/.test(p)) {
            return { service: 'burnout_programa', href: '/marcar/burnout-programa', cta: book };
        }
        if (/\/marcar\/burnout-mensal/.test(p)) {
            return { service: 'burnout_mensal', href: '/marcar/burnout-mensal', cta: book };
        }
        if (/\/marcar\/burnout(\/|$)/.test(p)) {
            return { service: 'burnout', href: '/marcar/burnout', cta: book };
        }
        if (/\/burnout|clinica-anti-burnout/.test(p)) {
            return { service: 'burnout_mensal', href: '/marcar/burnout-mensal', cta: talkCta };
        }
        if (isWeightLossPath(p)) {
            return {
                service: 'nutricao_programa',
                href: '/marcar/nutricao-programa?ref=sticky-nutricao',
                cta: talkCta,
                goal: 'Perda de peso / reeduca\u00e7\u00e3o metab\u00f3lica'
            };
        }
        if (/\/nutricao/.test(p)) {
            return { service: 'clinica_geral', href: '/marcar/clinica-geral?ref=nutricao', cta: talkCta };
        }
        if (/\/marcar\/travel|travel-clinic/.test(p)) {
            return { service: 'travel', href: '/marcar/travel', cta: book };
        }
        return { service: 'clinica_geral', href: '/marcar/clinica-geral', cta: talkCta };
    }

    function shouldInjectSticky() {
        var p = (location.pathname || '/').toLowerCase();
        if (/book-consultation|\/book\.html|\/marcar(\/|$)|\/admin|patient-portal|clinic-portal|clinic-desk|\/recrutamento/.test(p)) return false;
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
            '<a class="lon-btn lon-btn-dark" data-next-slot-cta data-cta="book" href="' + meta.href + '">' +
            (first ? meta.cta : weekFallbackLabel()) + '</a>' +
            '</div>';
        document.body.appendChild(bar);
        bar.hidden = false;
        if (pageNeedsLangPolicy(meta.href)) ensureLangPolicyNotice(bar);
        var when = bar.querySelector('[data-next-slot-when]');
        var cta = bar.querySelector('[data-next-slot-cta]');
        if (first) {
            if (when) when.textContent = formatSlotWhen(first.date, first.time);
            if (cta) {
                cta.addEventListener('click', function (e) {
                    e.preventDefault();
                    goCheckout(liveState.first, {
                        service: meta.service,
                        fallbackHref: meta.href,
                        surface: 'sticky_book',
                        bookMode: meta.bookMode || '',
                        goal: meta.goal || ''
                    });
                });
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
        setHomeSlotsBusy(false);
        var hasHorizon = !(data && data.hasSlotsWithinHorizon === false);
        var slots = (hasHorizon && data && data.slots) ? data.slots : [];
        var first = slots[0] || null;
        liveState.first = first;

        injectLangPolicyNotices();
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
                var lang = pageLang();
                if (kicker) {
                    kicker.textContent = lang === 'en' ? 'Next slot' : lang === 'es' ? 'Pr\u00f3ximo horario' : 'Pr\u00f3ximo hor\u00e1rio';
                }
                if (when) when.textContent = formatSlotWhen(first.date, first.time);
                if (cta) {
                    cta.textContent = landing.cta;
                    cta.setAttribute('href', href);
                }
                if (cta && cta.getAttribute('data-slot-bound') !== '1') {
                    cta.setAttribute('data-slot-bound', '1');
                    cta.addEventListener('click', function (e) {
                        e.preventDefault();
                        var current = landingBookMeta();
                        goCheckout(liveState.first, {
                            service: bar.getAttribute('data-service') || current.service,
                            fallbackHref: bar.getAttribute('data-book-href') || current.href,
                            surface: 'sticky_book',
                            bookMode: bar.getAttribute('data-book-mode') || current.bookMode || '',
                            goal: bar.getAttribute('data-goal') || current.goal || ''
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
        if (heroBook && heroBook.getAttribute('data-slot-bound') !== '1') {
            heroBook.setAttribute('data-slot-bound', '1');
            heroBook.addEventListener('click', function (e) {
                if (!liveState.first) return;
                e.preventDefault();
                var meta = landingBookMeta();
                goCheckout(liveState.first, {
                    service: meta.service,
                    fallbackHref: meta.href,
                    surface: 'home',
                    goal: meta.goal || ''
                });
            });
        }
    }

    injectLangPolicyNotices();
    var needsSlots = !!(
        document.querySelector('[data-next-slots], [data-sticky-book], #lonHeroBook, [data-doctor-available]') ||
        shouldInjectSticky()
    );
    if (!needsSlots) return;

    function reloadLiveSlots(forceNetwork) {
        var requested = currentSlotsService();
        var gen = ++slotsGen;
        var loader = forceNetwork ? fetchSlotsNetwork(requested) : loadSlotsSWR();
        return loader
            .then(function (data) {
                if (gen !== slotsGen || currentSlotsService() !== requested) return;
                applyLiveSlots(data || { slots: [] });
            })
            .catch(function () {
                if (gen !== slotsGen || currentSlotsService() !== requested) return;
                var cached = readSlotsCache();
                applyLiveSlots((cached && cached.data) || { slots: [] });
            });
    }

    var heroSelect = document.getElementById('lonHeroService');
    if (heroSelect) {
        heroSelect.addEventListener('change', function () {
            var pack = heroServicePack();
            syncHeroBookingTargets(pack);
            if (pack && slotCalendarGroup(pack.service) !== 'medical') {
                liveState.first = null;
            }
            var cached = readSlotsCache()
                || readAnySessionSlots(pack && pack.service)
                || readAnySessionSlots(siblingSlotService(pack && pack.service));
            if (cached && cached.data && Array.isArray(cached.data.slots) && cached.data.slots.length) {
                applyLiveSlots(cached.data);
            } else {
                applyLiveSlots({ slots: [] });
            }
            track('hero_service_change', {
                surface: 'home',
                service: pack && pack.service
            });
            reloadLiveSlots(true);
        });
    }

    reloadLiveSlots();
})();
