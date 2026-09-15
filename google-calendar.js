'use strict';

const crypto = require('crypto');
const seo = require('./seo');
const fieldCrypto = require('./field-crypto');

const FREEBUSY_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';
const SCOPES = `${FREEBUSY_SCOPE} ${EMAIL_SCOPE}`;
const STATE_MAX_AGE_MS = 15 * 60 * 1000;
const TOKEN_SKEW_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const BUSY_TTL_MS = 90 * 1000;
const BUSY_HORIZON_DAYS = 90;

const accessTokenCache = new Map();
const busyCache = new Map();

function envValue(name) {
    let text = String(process.env[name] || '').trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        text = text.slice(1, -1).trim();
    }
    return text;
}

function envValueLoose(names) {
    const wanted = (Array.isArray(names) ? names : [names])
        .map((name) => String(name || '').trim().toUpperCase())
        .filter(Boolean);
    for (const name of wanted) {
        const direct = envValue(name);
        if (direct) return direct;
    }
    for (const key of Object.keys(process.env)) {
        const normalized = String(key || '').replace(/^\uFEFF/, '').trim().toUpperCase();
        if (!wanted.includes(normalized)) continue;
        let text = String(process.env[key] || '').trim();
        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
            text = text.slice(1, -1).trim();
        }
        if (text) return text;
    }
    return '';
}

function clientId() {
    return envValueLoose(['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CLIENT_ID']);
}

function clientSecret() {
    return envValueLoose(['GOOGLE_CALENDAR_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET']);
}

function isConfigured() {
    return Boolean(clientId() && clientSecret());
}

function configFlags() {
    return {
        hasClientId: Boolean(clientId()),
        hasClientSecret: Boolean(clientSecret())
    };
}

function visibleGoogleEnvKeys() {
    return Object.keys(process.env)
        .filter((key) => /google|calendar/i.test(key))
        .sort();
}

function redirectUri() {
    const explicit = String(process.env.GOOGLE_CALENDAR_REDIRECT_URI || '').trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    return `${seo.SITE_ORIGIN}/api/admin/google-calendar/callback`;
}

function stateSecret() {
    return String(process.env.SESSION_SECRET || '').trim();
}

function signState(payload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
    return `${body}.${sig}`;
}

function parseState(raw) {
    const text = String(raw || '');
    const dot = text.lastIndexOf('.');
    if (dot < 1) return null;
    const body = text.slice(0, dot);
    const sig = text.slice(dot + 1);
    const expected = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    let payload;
    try {
        payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
    if (!payload || typeof payload !== 'object') return null;
    const t = Number(payload.t);
    if (!Number.isFinite(t) || Date.now() - t > STATE_MAX_AGE_MS || t > Date.now() + 60 * 1000) {
        return null;
    }
    const username = String(payload.u || '').trim().toLowerCase();
    if (!username) return null;
    return { username, t };
}

function createState(username) {
    return signState({
        u: String(username || '').trim().toLowerCase(),
        t: Date.now(),
        n: crypto.randomBytes(8).toString('hex')
    });
}

function authUrl(username) {
    const params = new URLSearchParams({
        client_id: clientId(),
        redirect_uri: redirectUri(),
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state: createState(username)
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function fetchJson(url, opts, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        const text = await res.text();
        let body = null;
        if (text) {
            try {
                body = JSON.parse(text);
            } catch {
                body = { error: text.slice(0, 200) };
            }
        }
        return { ok: res.ok, status: res.status, body };
    } finally {
        clearTimeout(timer);
    }
}

function formBody(fields) {
    return new URLSearchParams(fields).toString();
}

function tokenErrorMessage(body) {
    const err = body && (body.error_description || body.error);
    return String(err || 'Google token request failed').slice(0, 240);
}

async function exchangeCode(code) {
    const result = await fetchJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
            code: String(code || '').trim(),
            client_id: clientId(),
            client_secret: clientSecret(),
            redirect_uri: redirectUri(),
            grant_type: 'authorization_code'
        })
    });
    if (!result.ok || !result.body || !result.body.access_token) {
        const err = new Error(tokenErrorMessage(result.body));
        err.code = result.body && result.body.error;
        throw err;
    }
    return result.body;
}

async function refreshAccessToken(refreshToken) {
    const result = await fetchJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({
            refresh_token: String(refreshToken || '').trim(),
            client_id: clientId(),
            client_secret: clientSecret(),
            grant_type: 'refresh_token'
        })
    });
    if (!result.ok || !result.body || !result.body.access_token) {
        const err = new Error(tokenErrorMessage(result.body));
        err.code = result.body && result.body.error;
        err.needsReconnect = err.code === 'invalid_grant';
        throw err;
    }
    return result.body;
}

async function fetchUserEmail(accessToken) {
    const result = await fetchJson('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    }, 5000);
    if (!result.ok || !result.body) return '';
    return String(result.body.email || '').trim().toLowerCase();
}

async function accessTokenFor(username, refreshToken) {
    const u = String(username || '').trim().toLowerCase();
    const cached = accessTokenCache.get(u);
    if (cached && cached.token && cached.expiresAt > Date.now() + TOKEN_SKEW_MS) {
        return cached.token;
    }
    const refreshed = await refreshAccessToken(refreshToken);
    const expiresIn = Number(refreshed.expires_in) || 3600;
    accessTokenCache.set(u, {
        token: refreshed.access_token,
        expiresAt: Date.now() + expiresIn * 1000
    });
    return refreshed.access_token;
}

function parseBusyInstant(value) {
    if (!value) return NaN;
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return Date.parse(`${text}T00:00:00Z`);
    }
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? ms : NaN;
}

function normalizeBusyBlocks(busy) {
    const out = [];
    for (const item of Array.isArray(busy) ? busy : []) {
        const start = parseBusyInstant(item && item.start);
        const end = parseBusyInstant(item && item.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
        out.push({ start, end });
    }
    return out;
}

function slotOverlapsBusy(slotStartMs, slotEndMs, busy) {
    if (!Number.isFinite(slotStartMs) || !Number.isFinite(slotEndMs) || slotEndMs <= slotStartMs) {
        return false;
    }
    for (const block of busy || []) {
        if (slotStartMs < block.end && slotEndMs > block.start) return true;
    }
    return false;
}

async function fetchBusy(accessToken, { timeMin, timeMax, timeZone, calendarId }) {
    const id = String(calendarId || 'primary').trim() || 'primary';
    const result = await fetchJson('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            timeMin,
            timeMax,
            timeZone: timeZone || 'Europe/Lisbon',
            items: [{ id }]
        })
    });
    if (!result.ok || !result.body) {
        const err = new Error(
            String((result.body && (result.body.error && result.body.error.message)) || 'Google FreeBusy failed').slice(0, 240)
        );
        throw err;
    }
    const calendars = (result.body && result.body.calendars) || {};
    const cal = calendars[id] || calendars.primary || Object.values(calendars)[0] || {};
    if (Array.isArray(cal.errors) && cal.errors.length) {
        const first = cal.errors[0] || {};
        throw new Error(String(first.message || first.reason || 'Calendar FreeBusy error').slice(0, 240));
    }
    return normalizeBusyBlocks(cal.busy);
}

function encryptRefreshToken(token) {
    return fieldCrypto.encryptField(String(token || ''));
}

function decryptRefreshToken(token) {
    return fieldCrypto.decryptField(String(token || ''));
}

function publicConnection(row, configured) {
    const connected = !!(row && row.refreshToken);
    const flags = configFlags();
    return {
        configured: !!configured,
        hasClientId: flags.hasClientId,
        hasClientSecret: flags.hasClientSecret,
        connected,
        googleEmail: connected ? String((row && row.googleEmail) || '') : '',
        calendarId: connected ? String((row && row.calendarId) || 'primary') : 'primary',
        lastSyncAt: connected ? (row && row.lastSyncAt) || null : null,
        lastError: connected ? String((row && row.lastError) || '') : '',
        redirectUri: redirectUri()
    };
}

function cacheBusy(username, busy) {
    const u = String(username || '').trim().toLowerCase();
    if (!u) return;
    busyCache.set(u, { ts: Date.now(), busy: Array.isArray(busy) ? busy : [] });
}

function cachedBusy(username) {
    const u = String(username || '').trim().toLowerCase();
    const hit = busyCache.get(u);
    if (!hit) return null;
    if (Date.now() - hit.ts > BUSY_TTL_MS) return null;
    return hit.busy;
}

function staleBusy(username) {
    const u = String(username || '').trim().toLowerCase();
    const hit = busyCache.get(u);
    return hit && Array.isArray(hit.busy) ? hit.busy : [];
}

function clearUserCaches(username) {
    const u = String(username || '').trim().toLowerCase();
    accessTokenCache.delete(u);
    busyCache.delete(u);
}

module.exports = {
    BUSY_HORIZON_DAYS,
    BUSY_TTL_MS,
    FREEBUSY_SCOPE,
    isConfigured,
    configFlags,
    visibleGoogleEnvKeys,
    redirectUri,
    authUrl,
    parseState,
    createState,
    exchangeCode,
    refreshAccessToken,
    fetchUserEmail,
    accessTokenFor,
    fetchBusy,
    parseBusyInstant,
    normalizeBusyBlocks,
    slotOverlapsBusy,
    encryptRefreshToken,
    decryptRefreshToken,
    publicConnection,
    cacheBusy,
    cachedBusy,
    staleBusy,
    clearUserCaches
};
