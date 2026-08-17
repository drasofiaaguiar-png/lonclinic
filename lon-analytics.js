/**
 * Lon Clinic first-party analytics network (client).
 * Anonymous visitor/session graph, attribution, funnel, engagement.
 * Never sends emails, phone numbers, quiz answers, or clinical fields.
 */
(function () {
    'use strict';

    var SKIP = /^\/(admin|clinic-portal|doctors|patient-portal|clinic|dashboard)(\/|$|\.html)/i;
    var pathNow = (location.pathname || '/') + '';
    if (SKIP.test(pathNow)) return;
    if (window.LonAnalytics) return;

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
            fbclid: (q.get('fbclid') || '').slice(0, 120)
        };
        var has = cur.utm_source || cur.gclid || cur.fbclid;
        var last = cur;
        try {
            var stored = JSON.parse(sessionStorage.getItem('lon_lt') || 'null');
            if (!has && stored) last = stored;
            else sessionStorage.setItem('lon_lt', JSON.stringify(cur));
        } catch (e) { /* ignore */ }
        var first = null;
        try { first = JSON.parse(storageGet(FT_KEY) || 'null'); } catch (e) { first = null; }
        if (!first || typeof first !== 'object') {
            first = {
                utm_source: last.utm_source,
                utm_medium: last.utm_medium,
                utm_campaign: last.utm_campaign,
                landing: location.pathname,
                referrer: (document.referrer || '').slice(0, 300)
            };
            storageSet(FT_KEY, JSON.stringify(first));
        }
        return { last: last, first: first };
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
            landing_path: (attr.first && attr.first.landing) || location.pathname,
            lang: String(document.documentElement.lang || navigator.language || '').slice(0, 16),
            viewport: window.innerWidth + 'x' + window.innerHeight,
            utm_source: attr.last.utm_source || '',
            utm_medium: attr.last.utm_medium || '',
            utm_campaign: attr.last.utm_campaign || '',
            utm_content: attr.last.utm_content || '',
            utm_term: attr.last.utm_term || '',
            gclid: attr.last.gclid || '',
            fbclid: attr.last.fbclid || '',
            ft_source: (attr.first && attr.first.utm_source) || '',
            ft_medium: (attr.first && attr.first.utm_medium) || '',
            ft_campaign: (attr.first && attr.first.utm_campaign) || '',
            props: cleanProps(props)
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
        if (/^(page_view|page_engaged|cta_click|date_select|slot_select|checkout_start|form_submit|whatsapp_click)$/.test(name)) {
            flush();
        }
        if (typeof gtag === 'function' && name !== 'page_view' && name !== 'heartbeat' && name !== 'scroll_depth') {
            try {
                gtag('event', name, cleanProps(props));
            } catch (e) { /* ignore */ }
        }
    }

    function pageContext() {
        var p = location.pathname.toLowerCase();
        if (p === '/' || p === '/index.html') return { surface: 'home' };
        if (p.indexOf('/marcar') === 0 || p === '/book.html' || p === '/book-consultation') return { surface: 'booking' };
        if (p.indexOf('/burnout') === 0 || p.indexOf('/anti-burnout') === 0) return { surface: 'burnout' };
        if (p.indexOf('/psicologia') === 0 || p.indexOf('/saudemental') === 0) return { surface: 'mental' };
        if (p.indexOf('/travel') === 0) return { surface: 'travel' };
        if (p.indexOf('/triagem') === 0) return { surface: 'triage' };
        if (p.indexOf('/guide') === 0 || p.indexOf('/blog') === 0) return { surface: 'content' };
        if (p.indexOf('/quiz') === 0) return { surface: 'quiz' };
        return { surface: 'other' };
    }

    track('page_view', pageContext());

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
        if (t.matches && t.matches('[data-analytics], .lon-btn, .btn-primary, .cn-btn-primary, a[href*="marcar"], a[href*="book"]')) {
            track('cta_click', { text: text, href: href, id: id, surface: pageContext().surface });
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
            track('form_start', { form: String(formId).slice(0, 64), surface: pageContext().surface });
        }
    }, true);

    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || form.tagName !== 'FORM') return;
        var formId = form.id || form.getAttribute('name') || 'unknown';
        track('form_submit', { form: String(formId).slice(0, 64), surface: pageContext().surface });
    }, true);

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
        if (document.visibilityState === 'hidden') flush();
        else heartbeat();
    });
    window.addEventListener('pagehide', flush);

    window.LonAnalytics = {
        track: track,
        flush: flush,
        visitorId: function () { return vid; },
        sessionId: function () { return sid; }
    };
})();
