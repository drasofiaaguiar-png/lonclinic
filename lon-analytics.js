/**
 * Lon Clinic first-party analytics network (client).
 * Anonymous visitor/session graph, attribution, funnel, engagement.
 * Never sends emails, phone numbers, quiz answers, or clinical fields.
 */
(function () {
    'use strict';

    if (window.__lonAnalyticsBoot) return;
    window.__lonAnalyticsBoot = true;

    var SKIP = /^\/(admin|clinic-portal|doctors|patient-portal|clinic|dashboard|diretorio|conta)(\/|$|\.html)/i;
    var pathNow = (location.pathname || '/') + '';
    if (SKIP.test(pathNow)) return;
    if (window.LonAnalytics) return;

    try {
        var markUrl = new URL(location.href);
        if (markUrl.searchParams.get('internal') === '1' || markUrl.searchParams.get('internal') === 'staff') {
            markUrl.searchParams.delete('internal');
            var cleaned = markUrl.pathname + (markUrl.search || '') + (markUrl.hash || '');
            history.replaceState({}, '', cleaned);
        }
    } catch (e0) { /* ignore */ }

    var VID_KEY = 'lon_vid';
    var SID_KEY = 'lon_sid';
    var SID_AT = 'lon_sid_at';
    var FT_KEY = 'lon_ft';
    var SESSION_MS = 30 * 60 * 1000;
    var ENDPOINT = '/api/a/collect';
    var MAX_QUEUE = 40;
    var FLUSH_MS = 1800;

    function uuid() {
        if (crypto && crypto.randomUUID) return crypto.randomUUID();
        var b = new Uint8Array(16);
        (crypto.getRandomValues || function (a) { for (var i = 0; i < a.length; i++) a[i] = (Math.random() * 256) | 0; })(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var h = [];
        for (var i = 0; i < 16; i++) h.push(('0' + b[i].toString(16)).slice(-2));
        return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('') + '-' + h.slice(8, 10).join('') + '-' + h.slice(10).join('');
    }

    function cookieGet(name) {
        var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[$()*+./?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
    }
    function cookieSet(name, value, days) {
        var exp = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/; SameSite=Lax';
    }

    function storageGet(k) {
        try { return localStorage.getItem(k) || ''; } catch (e) { return ''; }
    }
    function storageSet(k, v) {
        try { localStorage.setItem(k, v); } catch (e) { /* private mode */ }
    }

    function visitorId() {
        var id = cookieGet(VID_KEY) || storageGet(VID_KEY);
        if (!id || id.length < 8) id = uuid();
        cookieSet(VID_KEY, id, 400);
        storageSet(VID_KEY, id);
        return id;
    }

    function sessionId() {
        var now = Date.now();
        var id = cookieGet(SID_KEY);
        var at = parseInt(cookieGet(SID_AT) || '0', 10);
        if (!id || !at || now - at > SESSION_MS) id = uuid();
        cookieSet(SID_KEY, id, 1);
        cookieSet(SID_AT, String(now), 1);
        return id;
    }

    function params() {
        try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return ''; } }; }
    }

    function pickUtm() {
        var q = params();
        var cur = {
            utm_source: (q.get('utm_source') || '').slice(0, 80),
            utm_medium: (q.get('utm_medium') || '').slice(0, 80),
            utm_campaign: (q.get('utm_campaign') || '').slice(0, 120),
            utm_content: (q.get('utm_content') || '').slice(0, 80),
            utm_term: (q.get('utm_term') || '').slice(0, 80),
            gclid: (q.get('gclid') || '').slice(0, 120),
            fbclid: (q.get('fbclid') || '').slice(0, 120),
            igshid: (q.get('igshid') || q.get('igsh') || '').slice(0, 120)
        };
        var explicit = !!(cur.utm_source || cur.gclid);
        var stored = null;
        try { stored = JSON.parse(sessionStorage.getItem('lon_lt') || 'null'); } catch (e1) { stored = null; }
        if (!explicit && stored && (stored.utm_source || stored.gclid)) {
            return finishPick(stored, stored);
        }
        if (!cur.utm_source && cur.igshid) {
            cur.utm_source = 'instagram';
            cur.utm_medium = cur.utm_medium || 'social';
        } else if (!cur.utm_source && cur.fbclid && !cur.gclid) {
            cur.utm_source = 'facebook';
            cur.utm_medium = cur.utm_medium || 'social';
        }
        try { sessionStorage.setItem('lon_lt', JSON.stringify(cur)); } catch (e2) { /* ignore */ }
        return finishPick(cur, stored);

        function finishPick(last, firstHint) {
            var first = null;
            try { first = JSON.parse(storageGet(FT_KEY) || 'null'); } catch (e3) { first = null; }
            if (!first || typeof first !== 'object') {
                first = firstHint && (firstHint.utm_source || firstHint.gclid) ? firstHint : last;
                first = {
                    utm_source: first.utm_source,
                    utm_medium: first.utm_medium,
                    utm_campaign: first.utm_campaign,
                    landing: location.pathname,
                    referrer: (document.referrer || '').slice(0, 300)
                };
                storageSet(FT_KEY, JSON.stringify(first));
            }
            return { last: last, first: first };
        }
    }

    var PII = /email|phone|tel|nhs|password|token|name|notes|answer|diagnos|prescription|dob|birth/i;
    var EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

    function cleanProps(input) {
        var out = {};
        if (!input || typeof input !== 'object') return out;
        var keys = Object.keys(input).slice(0, 24);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (PII.test(k)) continue;
            var v = input[k];
            if (v == null) continue;
            if (typeof v === 'number' && isFinite(v)) {
                out[k] = Math.round(v * 1000) / 1000;
                continue;
            }
            if (typeof v === 'boolean') {
                out[k] = v;
                continue;
            }
            var s = String(v).replace(EMAIL_RE, '[redacted]').slice(0, 180);
            if (s) out[k] = s;
        }
        return out;
    }

    var attr = pickUtm();
    var vid = visitorId();
    var sid = sessionId();

    function sessionLanding(sessionKey) {
        var key = 'lon_sl';
        var stored = null;
        try { stored = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (eSl) { stored = null; }
        var path = (location.pathname || '/').slice(0, 240);
        if (!stored || stored.sid !== sessionKey || !stored.path) {
            stored = { sid: sessionKey, path: path };
            try { sessionStorage.setItem(key, JSON.stringify(stored)); } catch (eSl2) { /* ignore */ }
        }
        return stored.path;
    }

    var landingNow = sessionLanding(sid);
    var queue = [];
    var flushTimer = null;
    var sentIds = {};

    function envelope(name, props) {
        sessionId();
        return {
            event_id: uuid(),
            name: String(name || 'event').slice(0, 64),
            ts: Date.now(),
            visitor_id: vid,
            session_id: sid,
            page_path: (location.pathname + (location.hash || '')).slice(0, 240),
            page_title: String(document.title || '').slice(0, 160),
            referrer: String(document.referrer || '').slice(0, 300),
            landing_path: landingNow || (attr.first && attr.first.landing) || location.pathname,
            lang: String(document.documentElement.lang || navigator.language || '').slice(0, 16),
            viewport: window.innerWidth + 'x' + window.innerHeight,
            utm_source: attr.last.utm_source || '',
            utm_medium: attr.last.utm_medium || '',
            utm_campaign: attr.last.utm_campaign || '',
            utm_content: attr.last.utm_content || '',
            utm_term: attr.last.utm_term || '',
            gclid: attr.last.gclid || '',
            fbclid: attr.last.fbclid || '',
            igshid: attr.last.igshid || '',
            ft_source: (attr.first && attr.first.utm_source) || '',
            ft_medium: (attr.first && attr.first.utm_medium) || '',
            ft_campaign: (attr.first && attr.first.utm_campaign) || '',
            props: Object.assign({ funnel: pageContext().funnel }, cleanProps(props))
        };
    }

    function enqueue(ev) {
        if (!ev || sentIds[ev.event_id]) return;
        sentIds[ev.event_id] = 1;
        queue.push(ev);
        if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
        if (queue.length >= 8) flush();
        else if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS);
    }

    function flush() {
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
        if (!queue.length) return;
        var batch = queue.splice(0, MAX_QUEUE);
        var body = JSON.stringify({ events: batch });
        try {
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body,
                keepalive: true,
                credentials: 'same-origin'
            }).catch(function () {
                try {
                    if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, body);
                } catch (e) { /* ignore */ }
            });
        } catch (e2) {
            try {
                if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, body);
            } catch (e3) { /* ignore */ }
        }
    }

    function track(name, props) {
        enqueue(envelope(name, props));
        if (/^(page_view|page_engaged|cta_click|date_select|slot_select|time_slot_clicked|payment_method_selected|checkout_start|form_submit|form_abandon|exit_intent|whatsapp_click|job_application|interview_booked)$/.test(name)) {
            flush();
        }
        if (typeof gtag === 'function' && name !== 'page_view' && name !== 'heartbeat' && name !== 'scroll_depth') {
            try {
                var gprops = cleanProps(props);
                if (!gprops.event_category) gprops.event_category = gprops.funnel || pageContext().funnel;
                gtag('event', name, gprops);
            } catch (e) { /* ignore */ }
        }
    }

    function pageContext() {
        var p = location.pathname.toLowerCase();
        var funnel = p.indexOf('/recrutamento') === 0 ? 'job_application' : 'patient_booking';
        if (p === '/' || p === '/index.html') return { surface: 'home', funnel: funnel };
        if (p.indexOf('/marcar') === 0 || p === '/book.html' || p === '/book-consultation') {
            return { surface: 'booking', funnel: 'patient_booking' };
        }
        if (p.indexOf('/recrutamento') === 0) return { surface: 'recruitment', funnel: 'job_application' };
        if (p.indexOf('/burnout') === 0 || p.indexOf('/anti-burnout') === 0) return { surface: 'burnout', funnel: funnel };
        if (p === '/consulta' || p.indexOf('/consulta/') === 0 || p === '/consulta.html') {
            return { surface: 'medical', funnel: 'patient_booking' };
        }
        if (p.indexOf('/nutricao') === 0) return { surface: 'nutrition', funnel: funnel };
        if (p.indexOf('/psicologia') === 0 || p.indexOf('/saudemental') === 0 || p.indexOf('/teste-personalidade') === 0 || p.indexOf('/consultas') === 0) {
            return { surface: 'mental', funnel: funnel };
        }
        if (document.body && document.body.classList.contains('qx-body')) return { surface: 'mental', funnel: funnel };
        if ((document.body && document.body.classList.contains('tourist-body')) || p === '/tourist-clinic') {
            return { surface: 'tourist', funnel: funnel };
        }
        if (
            p === '/see-doctor-portugal-tourist' ||
            p === '/ver-medico-portugal-turista' ||
            p === '/consulter-medecin-portugal-touriste' ||
            p === '/arzt-portugal-tourist-finden' ||
            p === '/uti-portugal-what-to-do' ||
            p === '/infeccion-urinaria-portugal-que-hacer' ||
            p === '/infection-urinaire-portugal-que-faire' ||
            p === '/blasenentzuendung-portugal-was-tun' ||
            p === '/renew-prescription-holiday-portugal' ||
            p === '/renovar-receta-vacaciones-portugal' ||
            p === '/renouveler-ordonnance-vacances-portugal' ||
            p === '/rezept-verlaengern-urlaub-portugal'
        ) return { surface: 'tourist', funnel: funnel };
        if (document.body && document.body.classList.contains('cq-body')) return { surface: 'medical', funnel: funnel };
        if (p.indexOf('/travel') === 0) return { surface: 'travel', funnel: funnel };
        if (p.indexOf('/triagem') === 0) return { surface: 'triage', funnel: funnel };
        if (p.indexOf('/guide') === 0 || p.indexOf('/blog') === 0) return { surface: 'content', funnel: funnel };
        if (p.indexOf('/quiz') === 0) return { surface: 'quiz', funnel: funnel };
        return { surface: 'other', funnel: funnel };
    }

    function shouldSendPageView() {
        try {
            var key = 'lon_pv';
            var now = Date.now();
            var prev = JSON.parse(sessionStorage.getItem(key) || 'null');
            if (prev && prev.path === location.pathname && now - prev.ts < 4000) return false;
            sessionStorage.setItem(key, JSON.stringify({ path: location.pathname, ts: now }));
        } catch (e) { /* ignore */ }
        return true;
    }

    if (shouldSendPageView()) {
        track('page_view', pageContext());
    }

    var engaged = false;
    setTimeout(function () {
        if (document.visibilityState === 'hidden') return;
        engaged = true;
        track('page_engaged', { seconds: 10 });
    }, 10000);

    var depths = { 25: 0, 50: 0, 75: 0, 90: 0 };
    function onScroll() {
        var el = document.documentElement;
        var max = Math.max(1, el.scrollHeight - window.innerHeight);
        var pct = Math.round((window.scrollY / max) * 100);
        [25, 50, 75, 90].forEach(function (d) {
            if (pct >= d && !depths[d]) {
                depths[d] = 1;
                track('scroll_depth', { percent: d });
            }
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    document.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('a,button,[data-analytics]') : null;
        if (!t) return;
        var href = (t.getAttribute('href') || '').slice(0, 180);
        var text = String(t.getAttribute('data-analytics') || t.getAttribute('aria-label') || t.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80);
        var id = (t.id || t.getAttribute('data-analytics-id') || '').slice(0, 64);
        if (t.matches && t.matches('[data-analytics], .lon-btn, .btn-primary, .cn-btn-primary, a[href*="marcar"], a[href*="book"], .bq-btn-primary, .bq-sticky-book a')) {
            track('cta_click', { text: text, href: href, id: id, surface: pageContext().surface, funnel: pageContext().funnel });
        }
        if (t.classList && t.classList.contains('lon-share-copy')) {
            var copyUrl = t.getAttribute('data-copy') || '';
            if (copyUrl && copyUrl.indexOf('http') !== 0) copyUrl = location.origin + copyUrl;
            if (copyUrl && navigator.clipboard && navigator.clipboard.writeText) {
                e.preventDefault();
                navigator.clipboard.writeText(copyUrl).then(function () {
                    var prev = t.textContent;
                    t.textContent = 'Copiado';
                    setTimeout(function () { t.textContent = prev; }, 1600);
                }).catch(function () { /* ignore */ });
            }
            track('outbound_click', { href: copyUrl.slice(0, 180), text: 'copy-share' });
        }
        if (href && /^(https?:)?\/\//i.test(href) && href.indexOf(location.host) === -1) {
            track('outbound_click', { href: href, text: text });
        }
        if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
            track('whatsapp_click', { href: href });
        }
    }, true);

    document.addEventListener('focusin', function (e) {
        var el = e.target;
        if (!el || !el.tagName) return;
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') return;
        if (el.type === 'hidden' || el.type === 'password') return;
        var form = el.form;
        var formId = (form && (form.id || form.getAttribute('name'))) || 'unknown';
        if (form && !form.getAttribute('data-lon-form-started')) {
            form.setAttribute('data-lon-form-started', '1');
            track('form_start', { form: String(formId).slice(0, 64), surface: pageContext().surface, funnel: pageContext().funnel });
        }
    }, true);

    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || form.tagName !== 'FORM') return;
        form.setAttribute('data-lon-form-submitted', '1');
        var formId = form.id || form.getAttribute('name') || 'unknown';
        track('form_submit', { form: String(formId).slice(0, 64), surface: pageContext().surface, funnel: pageContext().funnel });
    }, true);

    function abandonOpenForms(reason) {
        document.querySelectorAll('form[data-lon-form-started="1"]').forEach(function (form) {
            if (form.getAttribute('data-lon-form-submitted') === '1') return;
            if (form.getAttribute('data-lon-form-abandoned') === '1') return;
            form.setAttribute('data-lon-form-abandoned', '1');
            var formId = form.id || form.getAttribute('name') || 'unknown';
            track('form_abandon', {
                form: String(formId).slice(0, 64),
                surface: pageContext().surface,
                funnel: pageContext().funnel,
                reason: String(reason || 'leave').slice(0, 40)
            });
        });
        flush();
    }

    var lastBeat = 0;
    function heartbeat() {
        if (document.visibilityState === 'hidden') return;
        var now = Date.now();
        if (now - lastBeat < 14000) return;
        lastBeat = now;
        track('heartbeat', { engaged: engaged });
    }
    setInterval(heartbeat, 15000);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            abandonOpenForms('hidden');
            flush();
        } else heartbeat();
    });
    window.addEventListener('pagehide', function () {
        abandonOpenForms('pagehide');
        flush();
    });

    window.LonAnalytics = {
        track: track,
        flush: flush,
        visitorId: function () { return vid; },
        sessionId: function () { return sid; }
    };
})();
