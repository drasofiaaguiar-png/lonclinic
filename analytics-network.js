/**
 * Lon Clinic first-party analytics: ingest, channel model, dashboard queries.
 * Clinical payloads (answers, notes, emails, phones) are stripped before storage.
 */
const crypto = require('crypto');

const ALLOWED_NAMES = new Set([
    'page_view',
    'page_engaged',
    'scroll_depth',
    'cta_click',
    'outbound_click',
    'whatsapp_click',
    'form_start',
    'form_submit',
    'form_error',
    'form_abandon',
    'date_select',
    'slot_select',
    'time_slot_clicked',
    'payment_method_selected',
    'exit_intent',
    'checkout_start',
    'checkout_created',
    'payment_succeeded',
    'booking_confirmed',
    'invite_sent',
    'invite_paid',
    'contact_submitted',
    'quiz_start',
    'quiz_step',
    'quiz_complete',
    'triage_submitted',
    'heartbeat',
    'cancel',
    'reschedule',
    'job_application',
    'interview_booked'
]);

const PII_KEY = /email|phone|tel|nhs|password|token|name|notes|answer|diagnos|prescription|dob|birth/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|pingdom|uptimerobot/i;

const memoryEvents = [];
const MEMORY_CAP = 8000;

const PROBE_PREFIXES = [
    '/wp-',
    '/wordpress',
    '/xmlrpc',
    '/phpmyadmin',
    '/adminer',
    '/graphql',
    '/cgi-bin',
    '/vendor/phpunit',
    '/phpunit',
    '/actuator',
    '/server-status',
    '/.env',
    '/.git',
    '/.svn',
    '/.github',
    '/.htaccess',
    '/.htpasswd',
    '/.aws',
    '/var/task',
    '/var/www',
    '/etc/',
    '/proc/',
    '/waku',
    '/workspaces',
    '/webhook-waiting',
    '/webhook-test',
    '/webhook-proxy',
    '/node_modules',
    '/_next',
    '/__next',
    '/debug/',
    '/swagger',
    '/api-docs',
    '/telescope',
    '/horizon',
    '/phpinfo',
    '/boaform',
    '/manager/html',
    '/solr',
    '/jenkins',
    '/website/',
    '/login',
    '/signin'
];

const PROBE_FILE =
    /\.(?:php|asp|aspx|jsp|cgi|cfm|ini|sql|bak|old|swp|toml|ya?ml|mjs|cjs)$/i;
const PROBE_CONFIG =
    /serverless|nuxt\.config|next\.config|netlify\.toml|vercel\.json|fly\.toml|render\.ya?ml|railway\.toml|wrangler\.toml|docker-compose|package\.json|tsconfig|vite\.config|webpack\.config|astro\.config|tailwind\.config|nuxt\.config/i;

function normalizeAnalyticsPath(pagePath) {
    if (!pagePath) return '';
    let s = String(pagePath).split('?')[0];
    try {
        s = decodeURIComponent(s);
    } catch {
        /* keep */
    }
    return s.toLowerCase();
}

const FUNNEL_PATIENT = 'patient_booking';
const FUNNEL_JOB = 'job_application';

const RECRUITMENT_PATH =
    /^\/recrutamento(\/|$|\.html)|\/recrutamento-(psicologia|entrevista)(\.html)?$/i;
const CLINICAL_BOOKING_PATH =
    /^\/(marcar|consulta)(\/|$)|\/book\.html$|^\/book-consultation(\/|$)/i;

function pathFunnel(pagePath) {
    const s = normalizeAnalyticsPath(pagePath).replace(/#.*$/, '');
    if (!s) return null;
    if (RECRUITMENT_PATH.test(s)) return FUNNEL_JOB;
    if (CLINICAL_BOOKING_PATH.test(s)) return FUNNEL_PATIENT;
    return null;
}

function classifyFunnel(row) {
    if (!row) return FUNNEL_PATIENT;
    const props = row.props && typeof row.props === 'object' ? row.props : {};
    const explicit = String(props.funnel || props.intent || '').toLowerCase();
    if (explicit === FUNNEL_JOB || explicit === 'recruitment' || explicit === 'job') return FUNNEL_JOB;
    if (explicit === FUNNEL_PATIENT || explicit === 'clinical' || explicit === 'patient') return FUNNEL_PATIENT;
    const name = String(row.name || '');
    if (name === 'job_application' || name === 'interview_booked') return FUNNEL_JOB;
    const service = String(props.service || '').toLowerCase();
    if (service === 'entrevista') return FUNNEL_JOB;
    if (
        name === 'payment_succeeded' ||
        name === 'booking_confirmed' ||
        name === 'invite_paid' ||
        name === 'invite_sent' ||
        name === 'checkout_start' ||
        name === 'checkout_created'
    ) {
        return FUNNEL_PATIENT;
    }
    const fromPage = pathFunnel(row.pagePath || row.page_path);
    if (fromPage) return fromPage;
    if (!(row.pagePath || row.page_path)) {
        const fromLanding = pathFunnel(row.landingPath || row.landing_path);
        if (fromLanding) return fromLanding;
    }
    return FUNNEL_PATIENT;
}

function normalizeFunnelKey(funnel) {
    return funnel === FUNNEL_JOB ? FUNNEL_JOB : FUNNEL_PATIENT;
}

function filterFunnel(rows, funnel) {
    const view = normalizeFunnelKey(funnel);
    return (rows || []).filter((r) => classifyFunnel(r) === view);
}

function isProbePath(pagePath) {
    const s = normalizeAnalyticsPath(pagePath);
    if (!s || s === '/') return false;
    if (s.startsWith('/.well-known/acme-challenge')) return false;
    if (s.includes('*')) return true;
    if (PROBE_PREFIXES.some((p) => s === p || s.startsWith(p))) return true;
    if (PROBE_FILE.test(s) || PROBE_CONFIG.test(s)) return true;
    if (/\.(?:ts|js)$/i.test(s) && /config/i.test(s)) return true;
    if (/(?:^|\/)\.[^./]/.test(s) && !s.startsWith('/.well-known/acme-challenge')) return true;
    return false;
}

function burstSessionIds(rows, { minPaths = 4, windowMs = 1000 } = {}) {
    const bySession = new Map();
    for (const r of rows || []) {
        if (!r.sessionId || r.name !== 'page_view') continue;
        const t = new Date(r.occurredAt).getTime();
        if (!Number.isFinite(t)) continue;
        if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, []);
        bySession.get(r.sessionId).push({ t, path: r.pagePath || '' });
    }
    const bad = new Set();
    for (const [sid, evs] of bySession) {
        evs.sort((a, b) => a.t - b.t);
        let i = 0;
        for (let j = 0; j < evs.length; j++) {
            while (evs[j].t - evs[i].t > windowMs) i += 1;
            const paths = new Set();
            for (let k = i; k <= j; k++) paths.add(evs[k].path);
            if (paths.size >= minPaths) {
                bad.add(sid);
                break;
            }
        }
    }
    return bad;
}

function isBot(ua) {
    const s = String(ua || '');
    if (!s) return false;
    return BOT_UA.test(s) || /healthcheck|kube-probe|googlehc|amazon-route53|statuscake|render\/|railway/i.test(s);
}

function parseUa(ua) {
    const s = String(ua || '');
    let device = 'desktop';
    if (/iPad|Tablet/i.test(s)) device = 'tablet';
    else if (/Mobi|Android.+Mobile|iPhone|iPod/i.test(s)) device = 'mobile';
    let browser = 'other';
    if (/Edg\//.test(s)) browser = 'edge';
    else if (/Chrome\//.test(s) && !/Edg\//.test(s)) browser = 'chrome';
    else if (/Firefox\//.test(s)) browser = 'firefox';
    else if (/Safari\//.test(s) && !/Chrome\//.test(s)) browser = 'safari';
    let os = 'other';
    if (/Windows/i.test(s)) os = 'windows';
    else if (/Mac OS X|Macintosh/i.test(s)) os = 'macos';
    else if (/Android/i.test(s)) os = 'android';
    else if (/iPhone|iPad|iOS/i.test(s)) os = 'ios';
    else if (/Linux/i.test(s)) os = 'linux';
    return { device, browser, os };
}

function channelOf(row) {
    const src = String(row.utm_source || '').toLowerCase();
    const med = String(row.utm_medium || '').toLowerCase();
    const ref = String(row.referrer || '').toLowerCase();
    const paidSocial = med === 'paid_social' || med === 'cpm' || med === 'ppc_social' || med === 'paid';
    if (row.gclid || med === 'cpc' || med === 'ppc' || med === 'paidsearch') return 'paid_search';
    if (paidSocial && (/facebook|instagram|meta|ig/.test(src) || /facebook|instagram/.test(med) || row.fbclid)) {
        return 'paid_social';
    }
    if (med === 'email' || src === 'email' || src === 'newsletter') return 'email';
    if (med === 'sms' || src === 'sms' || /whatsapp/.test(src) || med === 'chat') return 'sms';
    if (src === 'invite' || med === 'invite') return 'invite';
    if (src === 'internal' || med === 'internal') return 'internal';
    if (med === 'owned' || med === 'quiz' || src === 'quiz') return 'owned';
    if (
        med === 'social' ||
        med === 'organic_social' ||
        /^(facebook|instagram|meta|ig|linkedin|tiktok|twitter)([._-]|$)/.test(src)
    ) {
        return 'organic_social';
    }
    if (/facebook|instagram|l\.instagram|linkedin|t\.co|twitter|tiktok|whatsapp/.test(ref)) return 'organic_social';
    if (row.fbclid) return 'organic_social';
    if (/google\./.test(ref) && !row.gclid) return 'organic_google';
    if (/bing\.|yahoo\./.test(ref)) return 'organic_other';
    if (ref && !ref.includes('lonclinic.com') && !ref.includes('localhost')) return 'referral';
    if (!src && !ref) return 'direct';
    if (src) return 'campaign';
    return 'direct';
}

function cleanProps(input) {
    const out = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    for (const key of Object.keys(input).slice(0, 24)) {
        if (PII_KEY.test(key)) continue;
        let v = input[key];
        if (v == null) continue;
        if (typeof v === 'number' && Number.isFinite(v)) {
            out[key] = Math.round(v * 1000) / 1000;
            continue;
        }
        if (typeof v === 'boolean') {
            out[key] = v;
            continue;
        }
        const s = String(v).replace(EMAIL_RE, '[redacted]').slice(0, 180);
        if (s) out[key] = s;
    }
    return out;
}

function normalizeEvent(raw, meta) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.name || '').slice(0, 64);
    if (!ALLOWED_NAMES.has(name)) return null;
    let eventId = String(raw.event_id || '').slice(0, 64);
    if (!/^[0-9a-f-]{16,36}$/i.test(eventId)) eventId = crypto.randomUUID();
    const ts = Number(raw.ts);
    const occurred = Number.isFinite(ts) && ts > 1e12 && ts < Date.now() + 60000 ? new Date(ts) : new Date();
    const ua = meta.ua || '';
    if (name !== 'payment_succeeded' && name !== 'booking_confirmed' && isBot(ua)) return null;
    if (isProbePath(raw.page_path)) return null;
    const parsed = parseUa(ua);
    const row = {
        eventId,
        occurredAt: occurred.toISOString(),
        name,
        source: meta.source || 'client',
        visitorId: String(raw.visitor_id || '').slice(0, 64) || null,
        sessionId: String(raw.session_id || '').slice(0, 64) || null,
        pagePath: String(raw.page_path || '').slice(0, 240) || null,
        pageTitle: String(raw.page_title || '').slice(0, 160) || null,
        referrer: String(raw.referrer || '').slice(0, 300) || null,
        landingPath: String(raw.landing_path || '').slice(0, 240) || null,
        utmSource: String(raw.utm_source || '').slice(0, 80) || null,
        utmMedium: String(raw.utm_medium || '').slice(0, 80) || null,
        utmCampaign: String(raw.utm_campaign || '').slice(0, 120) || null,
        utmContent: String(raw.utm_content || '').slice(0, 80) || null,
        utmTerm: String(raw.utm_term || '').slice(0, 80) || null,
        gclid: String(raw.gclid || '').slice(0, 120) || null,
        fbclid: String(raw.fbclid || '').slice(0, 120) || null,
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        country: String(meta.country || '').slice(0, 8) || null,
        lang: String(raw.lang || '').slice(0, 16) || null,
        props: cleanProps(raw.props),
        revenueCents: Number.isFinite(Number(raw.revenue_cents)) ? Math.round(Number(raw.revenue_cents)) : null,
        currency: raw.currency ? String(raw.currency).slice(0, 8).toLowerCase() : null,
        bookingRef: raw.booking_ref ? String(raw.booking_ref).slice(0, 64) : null,
        staff: false
    };
    if (row.props && row.props.audience) delete row.props.audience;
    if (meta.staff) {
        row.props = { ...row.props, audience: 'staff' };
        row.channel = 'internal';
        row.staff = true;
    } else {
        row.channel = channelOf({
            utm_source: row.utmSource,
            utm_medium: row.utmMedium,
            referrer: row.referrer,
            gclid: row.gclid,
            fbclid: row.fbclid
        });
    }
    const funnel = classifyFunnel(row);
    row.props = { ...(row.props || {}), funnel };
    row.funnel = funnel;
    return row;
}

function remember(row) {
    memoryEvents.push(row);
    if (memoryEvents.length > MEMORY_CAP) memoryEvents.splice(0, memoryEvents.length - MEMORY_CAP);
}

function rangeBounds(range) {
    const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const to = new Date();
    const from = new Date(to.getTime() - days * 864e5);
    return { from: from.toISOString(), to: to.toISOString(), days };
}

function inRange(iso, from, to) {
    return iso >= from && iso <= to;
}

function uniqueCount(rows, key) {
    const s = new Set();
    for (const r of rows) {
        const v = r[key];
        if (v) s.add(v);
    }
    return s.size;
}

function dedupePageviews(rows) {
    const seen = new Set();
    const out = [];
    for (const r of rows) {
        if (r.name !== 'page_view') continue;
        const t = Math.floor(new Date(r.occurredAt).getTime() / 120000);
        const k = `${r.sessionId || r.visitorId || ''}|${r.pagePath || ''}|${t}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(r);
    }
    return out;
}

function groupCount(rows, key, limit) {
    const map = new Map();
    for (const r of rows) {
        const k = r[key] || '(none)';
        map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit || 12)
        .map(([key, count]) => ({ key, count }));
}

function sessionLandings(views, limit) {
    const sorted = [...(views || [])].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
    const first = new Map();
    for (const r of sorted) {
        const sid = r.sessionId || r.visitorId;
        if (!sid || first.has(sid)) continue;
        first.set(sid, r.pagePath || r.landingPath || '(none)');
    }
    return groupCount(
        [...first.values()].map((key) => ({ key })),
        'key',
        limit || 8
    );
}

function recomputeFunnelConversions(funnel) {
    let prev = Math.max(1, (funnel[0] && funnel[0].sessions) || 1);
    return (funnel || []).map((step, i) => {
        const conv = i === 0 ? 100 : Math.round((step.sessions / prev) * 1000) / 10;
        if (step.sessions > 0) prev = step.sessions;
        return { ...step, stepConversion: conv };
    });
}

function countFunnelStep(rows, names) {
    const sessions = new Set();
    let orphans = 0;
    for (const r of rows) {
        if (!names.includes(r.name)) continue;
        if (r.sessionId) sessions.add(r.sessionId);
        else orphans += 1;
    }
    return sessions.size + orphans;
}

function funnelStepsFor(funnel) {
    if (normalizeFunnelKey(funnel) === FUNNEL_JOB) {
        return [
            { id: 'visit', names: ['page_view'] },
            { id: 'engage', names: ['page_engaged'] },
            { id: 'intent', names: ['cta_click', 'form_start'] },
            { id: 'apply', names: ['job_application', 'form_submit'] },
            { id: 'interview', names: ['interview_booked'] }
        ];
    }
    return [
        { id: 'visit', names: ['page_view'] },
        { id: 'engage', names: ['page_engaged'] },
        { id: 'intent', names: ['cta_click', 'whatsapp_click'] },
        { id: 'schedule', names: ['date_select', 'slot_select'] },
        { id: 'checkout', names: ['checkout_start', 'checkout_created'] },
        { id: 'purchase', names: ['payment_succeeded', 'booking_confirmed', 'invite_paid'] }
    ];
}

function funnelFrom(rows, funnel) {
    const steps = funnelStepsFor(funnel);
    let prev = Math.max(1, countFunnelStep(rows, ['page_view']));
    return steps.map((step, i) => {
        const count = countFunnelStep(rows, step.names);
        const conv = i === 0 ? 100 : Math.round((count / prev) * 1000) / 10;
        if (count > 0) prev = count;
        return { id: step.id, label: step.id, sessions: count, stepConversion: conv };
    });
}

function hourlySeries(rows, fromIso, days) {
    const buckets = days <= 2 ? 24 : days <= 8 ? days * 4 : days;
    const from = new Date(fromIso).getTime();
    const span = Date.now() - from;
    const size = Math.max(1, Math.floor(span / buckets));
    const arr = new Array(buckets).fill(0);
    for (const r of rows) {
        if (r.name !== 'page_view') continue;
        const t = new Date(r.occurredAt).getTime();
        const i = Math.min(buckets - 1, Math.max(0, Math.floor((t - from) / size)));
        arr[i] += 1;
    }
    return arr;
}

function applyKnownStaff(rows, extraVisitorIds) {
    const vids = new Set();
    for (const id of extraVisitorIds || []) {
        if (id) vids.add(String(id));
    }
    const sids = new Set();
    for (const r of rows || []) {
        if (!isStaffRow(r)) continue;
        if (r.visitorId) vids.add(String(r.visitorId));
        if (r.sessionId) sids.add(String(r.sessionId));
    }
    if (!vids.size && !sids.size) return rows || [];
    return (rows || []).map((r) => {
        if (isStaffRow(r)) return { ...r, staff: true };
        const vid = r.visitorId ? String(r.visitorId) : '';
        const sid = r.sessionId ? String(r.sessionId) : '';
        if ((vid && vids.has(vid)) || (sid && sids.has(sid))) {
            return {
                ...r,
                staff: true,
                channel: 'internal',
                props: { ...(r.props || {}), audience: 'staff' }
            };
        }
        return r;
    });
}

function isStaffRow(r) {
    if (!r) return false;
    if (r.staff === true) return true;
    if (r.channel === 'internal') return true;
    const aud = r.props && r.props.audience;
    return aud === 'staff' || aud === 'admin';
}

function filterAudience(rows, audience) {
    if (audience === 'staff') return rows.filter(isStaffRow);
    if (audience === 'all') return rows;
    return rows.filter((r) => !isStaffRow(r));
}

function buildOverview(rows, liveRows, bookingStats, range, audience, knownStaffVisitorIds, funnelKey) {
    const view = ['public', 'staff', 'all'].includes(audience) ? audience : 'public';
    const funnelView = normalizeFunnelKey(funnelKey);
    const isJobs = funnelView === FUNNEL_JOB;
    const tagged = applyKnownStaff(rows || [], knownStaffVisitorIds).map((r) => ({
        ...r,
        staff: isStaffRow(r),
        funnel: classifyFunnel(r)
    }));
    const burstIds = burstSessionIds(tagged);
    const isNoise = (r) => isProbePath(r.pagePath) || (r.sessionId && burstIds.has(r.sessionId));
    const probeRows = tagged.filter(isNoise);
    const human = tagged.filter((r) => !isNoise(r));
    const funnelHuman = filterFunnel(human, funnelView);
    const used = filterAudience(funnelHuman, view).filter(
        (r) => !(r.name === 'page_view' && r.props && r.props.via === 'server')
    );
    const humanSessions = new Set(funnelHuman.map((r) => r.sessionId).filter(Boolean));
    const staffSids = new Set(funnelHuman.filter(isStaffRow).map((r) => r.sessionId).filter(Boolean));
    const liveTagged = applyKnownStaff(liveRows || [], knownStaffVisitorIds)
        .map((r) => {
            const staff = isStaffRow(r) || (r.sessionId && staffSids.has(r.sessionId));
            return { ...r, staff, channel: staff ? 'internal' : r.channel };
        })
        .filter((r) => r.sessionId && humanSessions.has(r.sessionId));
    const liveUsed = filterAudience(liveTagged, view);
    const views = dedupePageviews(used);
    const purchases = used.filter(
        (r) => r.name === 'payment_succeeded' || r.name === 'booking_confirmed' || r.name === 'invite_paid'
    );
    const applyEvents = used.filter((r) => r.name === 'job_application');
    const interviewEvents = used.filter((r) => r.name === 'interview_booked');
    const visitors = uniqueCount(views, 'visitorId');
    const sessions = uniqueCount(used, 'sessionId');
    const engaged = uniqueCount(used.filter((r) => r.name === 'page_engaged'), 'sessionId');
    const overlayBookings = view !== 'staff';
    const hasLedger = overlayBookings && bookingStats && Number.isFinite(Number(bookingStats.count));
    const applications = isJobs
        ? overlayBookings && bookingStats && Number.isFinite(Number(bookingStats.applications))
            ? Number(bookingStats.applications)
            : applyEvents.length
        : 0;
    const interviews = isJobs
        ? hasLedger
            ? Number(bookingStats.count)
            : interviewEvents.length
        : 0;
    const revenue = isJobs
        ? 0
        : overlayBookings && bookingStats && bookingStats.count
            ? bookingStats.revenueCents || 0
            : purchases.reduce((s, r) => s + (r.revenueCents || 0), 0);
    const bookingCount = isJobs
        ? interviews
        : overlayBookings
            ? (bookingStats && bookingStats.count) || purchases.length
            : purchases.length;
    const conversionBase = isJobs ? applications : bookingCount;
    const conversion = visitors ? Math.round((conversionBase / visitors) * 1000) / 10 : 0;
    const cta = used.filter((r) => r.name === 'cta_click');
    const funnel = recomputeFunnelConversions(
        funnelFrom(used, funnelView).map((step) => {
            if (!overlayBookings) return step;
            if (!isJobs && step.id === 'purchase' && bookingCount) {
                return { ...step, sessions: Math.max(step.sessions, bookingCount) };
            }
            if (isJobs && step.id === 'apply' && applications) {
                return { ...step, sessions: Math.max(step.sessions, applications) };
            }
            if (isJobs && step.id === 'interview' && interviews) {
                return { ...step, sessions: Math.max(step.sessions, interviews) };
            }
            return step;
        })
    );
    const serviceFromEvents = groupCount(
        (isJobs ? interviewEvents : purchases).map((r) => ({
            key: (r.props && r.props.service) || (isJobs ? 'entrevista' : 'unspecified')
        })),
        'key',
        10
    );
    const serviceFromBookings = overlayBookings ? (bookingStats && bookingStats.services) || [] : [];
    const staffRows = funnelHuman.filter(isStaffRow);
    const publicRows = funnelHuman.filter((r) => !isStaffRow(r));
    return {
        range: range.days === 1 ? '24h' : `${range.days}d`,
        generatedAt: new Date().toISOString(),
        audience: view,
        funnelKind: funnelView,
        trackingEmpty: views.length === 0,
        kpis: {
            visitors,
            sessions,
            pageviews: views.length,
            engagedRate: sessions ? Math.round((engaged / sessions) * 1000) / 10 : 0,
            bookings: bookingCount,
            applications,
            interviews,
            revenueCents: revenue,
            conversionRate: conversion,
            liveVisitors: uniqueCount(liveUsed, 'sessionId'),
            publicSessions: uniqueCount(publicRows, 'sessionId'),
            staffSessions: uniqueCount(staffRows, 'sessionId'),
            publicLive: uniqueCount(liveTagged.filter((r) => !isStaffRow(r)), 'sessionId'),
            staffLive: uniqueCount(liveTagged.filter(isStaffRow), 'sessionId'),
            scannerEvents: probeRows.length,
            scannerSessions: uniqueCount(probeRows, 'sessionId')
        },
        funnel,
        channels: groupCount(views, 'channel', 10),
        pages: groupCount(views, 'pagePath', 12),
        landings: sessionLandings(views, 8),
        devices: groupCount(views, 'device', 5),
        browsers: groupCount(views, 'browser', 6),
        countries: groupCount(views.filter((r) => r.country), 'country', 8),
        campaigns: groupCount(
            views.filter((r) => r.utmCampaign),
            'utmCampaign',
            8
        ),
        ctas: groupCount(
            cta.map((r) => ({ key: (r.props && (r.props.text || r.props.id)) || 'cta' })),
            'key',
            10
        ),
        services: serviceFromBookings.length
            ? serviceFromBookings.map((s) => ({ key: s.service || 'unspecified', count: s.count }))
            : serviceFromEvents,
        hourly: hourlySeries(views, range.from, range.days),
        recent: used
            .filter((r) => r.name !== 'heartbeat')
            .slice(-25)
            .reverse()
            .map((r) => ({
                at: r.occurredAt,
                name: r.name,
                path: r.pagePath,
                channel: r.channel,
                device: r.device,
                staff: !!r.staff,
                funnel: r.funnel || classifyFunnel(r)
            }))
    };
}

function overviewFromMemory(rangeKey, audience, funnelKey) {
    const range = rangeBounds(rangeKey);
    const known = memoryEvents.filter(isStaffRow).map((r) => r.visitorId).filter(Boolean);
    const rows = memoryEvents.filter((r) => inRange(r.occurredAt, range.from, range.to));
    const liveFrom = new Date(Date.now() - 120000).toISOString();
    const live = memoryEvents.filter(
        (r) => (r.name === 'heartbeat' || r.name === 'page_view') && r.occurredAt >= liveFrom
    );
    return buildOverview(rows, live, { count: 0, revenueCents: 0, applications: 0 }, range, audience, known, funnelKey);
}

module.exports = {
    ALLOWED_NAMES,
    FUNNEL_PATIENT,
    FUNNEL_JOB,
    isBot,
    isProbePath,
    burstSessionIds,
    parseUa,
    channelOf,
    classifyFunnel,
    normalizeFunnelKey,
    filterFunnel,
    cleanProps,
    normalizeEvent,
    remember,
    rangeBounds,
    isStaffRow,
    buildOverview,
    overviewFromMemory,
    memoryEvents
};
