/**
 * Meta Pixel (browser snippet) + Conversions API (server).
 * Never send clinical fields. Email/phone are hashed before CAPI.
 */
'use strict';

const crypto = require('crypto');

const API_VERSION = 'v21.0';
const DEFAULT_PIXEL_ID = '1069973925619277';

function pixelId() {
    const raw = String(process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID).trim();
    if (!raw || /^(0|off|false|none)$/i.test(raw)) return '';
    if (!/^\d{5,20}$/.test(raw)) return '';
    return raw;
}

function accessToken() {
    return String(process.env.META_CAPI_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '').trim();
}

function testEventCode() {
    return String(process.env.META_TEST_EVENT_CODE || '').trim();
}

function hasCapi() {
    return Boolean(pixelId() && accessToken());
}

function sha256(value) {
    const s = String(value || '').trim();
    if (!s) return '';
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 9 && d.startsWith('9')) d = '351' + d;
    return d;
}

function siteOrigin() {
    const raw = String(process.env.PUBLIC_SITE_URL || 'https://www.lonclinic.com').trim();
    try {
        return new URL(raw).origin;
    } catch {
        return 'https://www.lonclinic.com';
    }
}

function browserSnippet() {
    const id = pixelId();
    if (!id) return '';
    return `
<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');
fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"></noscript>
<!-- End Meta Pixel -->
`;
}

function stripBrowserSnippet(html) {
    return String(html || '')
        .replace(/\s*<!--\s*Meta Pixel[\s\S]*?End Meta Pixel\s*-->/gi, '\n')
        .replace(/\s*<script\b[^>]*>[\s\S]*?connect\.facebook\.net\/[^"'<]*fbevents\.js[\s\S]*?<\/script>\s*<noscript>[\s\S]*?facebook\.com\/tr\?[\s\S]*?<\/noscript>/gi, '\n');
}

function pickAttribution(req, body, readCookieFn) {
    const src = body && typeof body === 'object' ? body : {};
    const cookie = typeof readCookieFn === 'function' ? readCookieFn : () => '';
    const fbp = String(src.fbp || cookie(req, '_fbp') || '').slice(0, 128);
    let fbc = String(src.fbc || cookie(req, '_fbc') || '').slice(0, 200);
    const fbclid = String(src.fbclid || '').slice(0, 120);
    if (!fbc && fbclid && /^[\w.-]{8,120}$/.test(fbclid)) {
        fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
    const clientUa = String((req && req.headers && req.headers['user-agent']) || '').slice(0, 500);
    const clientIp = String(
        (req && req.headers && (req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0])) ||
            (req && req.ip) ||
            ''
    ).trim().slice(0, 64);
    return { fbp, fbc, fbclid, clientUa, clientIp };
}

function applyAttribution(metadata, attr) {
    if (!metadata || typeof metadata !== 'object' || !attr) return metadata;
    if (attr.fbp) metadata.fbp = String(attr.fbp).slice(0, 128);
    if (attr.fbc) metadata.fbc = String(attr.fbc).slice(0, 200);
    if (attr.fbclid) metadata.fbclid = String(attr.fbclid).slice(0, 120);
    if (attr.clientUa) metadata.client_ua = String(attr.clientUa).slice(0, 500);
    if (attr.clientIp) metadata.client_ip = String(attr.clientIp).slice(0, 64);
    return metadata;
}

function userData({ email, phone, fbp, fbc, clientIp, clientUa, externalId }) {
    const out = {};
    const em = normalizeEmail(email);
    if (em) out.em = [sha256(em)];
    const ph = normalizePhone(phone);
    if (ph) out.ph = [sha256(ph)];
    if (fbp) out.fbp = String(fbp).slice(0, 128);
    if (fbc) out.fbc = String(fbc).slice(0, 200);
    if (clientIp) out.client_ip_address = String(clientIp).slice(0, 64);
    if (clientUa) out.client_user_agent = String(clientUa).slice(0, 512);
    if (externalId) out.external_id = [sha256(String(externalId))];
    return out;
}

async function sendEvents(events) {
    const id = pixelId();
    const token = accessToken();
    if (!id || !token || !events || !events.length) return { ok: false, skipped: true };
    const payload = {
        data: events,
        access_token: token
    };
    const test = testEventCode();
    if (test) payload.test_event_code = test;

    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => {
        if (ctrl) ctrl.abort();
    }, 4000);
    try {
        const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${id}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: ctrl ? ctrl.signal : undefined
        });
        const text = await res.text();
        if (!res.ok) {
            console.warn('Meta CAPI:', res.status, String(text).slice(0, 180));
            return { ok: false, status: res.status };
        }
        return { ok: true };
    } catch (err) {
        console.warn('Meta CAPI failed:', err && err.message ? err.message : err);
        return { ok: false, error: err && err.message ? err.message : 'capi_failed' };
    } finally {
        clearTimeout(timer);
    }
}

function eventTime() {
    return Math.floor(Date.now() / 1000);
}

async function sendInitiateCheckout({ email, phone, service, valueCents, currency, eventId, attr, sourceUrl }) {
    if (!hasCapi()) return { ok: false, skipped: true };
    const value = Number(valueCents);
    const custom = {
        content_category: 'consultation',
        currency: String(currency || 'EUR').toUpperCase()
    };
    if (service) custom.content_name = String(service).slice(0, 80);
    if (Number.isFinite(value) && value >= 0) custom.value = Math.round(value) / 100;
    return sendEvents([{
        event_name: 'InitiateCheckout',
        event_time: eventTime(),
        event_id: String(eventId || `ic_${Date.now()}`).slice(0, 64),
        event_source_url: sourceUrl || `${siteOrigin()}/book-consultation`,
        action_source: 'website',
        user_data: userData({
            email,
            phone,
            fbp: attr && attr.fbp,
            fbc: attr && attr.fbc,
            clientIp: attr && attr.clientIp,
            clientUa: attr && attr.clientUa,
            externalId: attr && attr.externalId
        }),
        custom_data: custom
    }]);
}

async function sendPurchase(session, extra) {
    if (!hasCapi() || !session) return { ok: false, skipped: true };
    const meta = session.metadata || {};
    const email = (session.customer_details && session.customer_details.email) || session.customer_email || meta.contact_email || '';
    const phone = (session.customer_details && session.customer_details.phone) || meta.contact_phone || '';
    const value = Number(session.amount_total);
    const custom = {
        content_category: 'consultation',
        currency: String(session.currency || extra && extra.currency || 'eur').toUpperCase()
    };
    if (meta.service) {
        custom.content_name = String(meta.service).slice(0, 80);
        custom.content_ids = [String(meta.service).slice(0, 80)];
        custom.content_type = 'product';
    }
    if (Number.isFinite(value) && value >= 0) custom.value = Math.round(value) / 100;
    if (extra && extra.bookingRef) custom.order_id = String(extra.bookingRef).slice(0, 40);

    return sendEvents([{
        event_name: 'Purchase',
        event_time: eventTime(),
        event_id: `purchase_${String(session.id || '').slice(-24) || Date.now()}`,
        event_source_url: `${siteOrigin()}/book-consultation`,
        action_source: 'website',
        user_data: userData({
            email,
            phone,
            fbp: meta.fbp,
            fbc: meta.fbc,
            clientIp: meta.client_ip,
            clientUa: meta.client_ua,
            externalId: meta.lon_vid
        }),
        custom_data: custom
    }]);
}

module.exports = {
    pixelId,
    hasCapi,
    browserSnippet,
    stripBrowserSnippet,
    pickAttribution,
    applyAttribution,
    sendInitiateCheckout,
    sendPurchase
};
