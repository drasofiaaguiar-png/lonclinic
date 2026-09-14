/**
 * Meta Conversion Leads (qualified leads) CRM integration.
 * Instant Form leadgen → store Meta lead_id → upload CRM stages via CAPI.
 */
'use strict';

const crypto = require('crypto');
const db = require('./db');
const metaCapi = require('./meta-capi');

const API_VERSION = 'v26.0';
const STAGE_RANK = { Lead: 1, Qualified: 2, Converted: 3 };
const memoryByLeadId = new Map();
const memoryByEmail = new Map();

let onNewLead = null;

function setOnNewLead(fn) {
    onNewLead = typeof fn === 'function' ? fn : null;
}

function usePersistentDb() {
    return db.isDatabaseEnabled();
}

function verifyToken() {
    return String(process.env.META_LEAD_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN || '').trim();
}

function appSecret() {
    return String(process.env.META_APP_SECRET || '').trim();
}

function pageAccessToken() {
    return String(process.env.META_PAGE_ACCESS_TOKEN || process.env.META_LEAD_ACCESS_TOKEN || '').trim();
}

function hasLeadWebhook() {
    return Boolean(verifyToken() && appSecret());
}

function unixFromUnknown(value) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 1e9) {
        return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
    }
    if (value) {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed / 1000);
    }
    return Math.floor(Date.now() / 1000);
}

function verifySignature(rawBody, header) {
    const secret = appSecret();
    if (!secret) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(String(header || ''));
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

function extractLeadgenItems(body) {
    const items = [];
    const seen = new Set();
    const entry = Array.isArray(body && body.entry) ? body.entry : [];
    for (const row of entry) {
        const changes = Array.isArray(row && row.changes) ? row.changes : [];
        for (const change of changes) {
            if (!change || change.field !== 'leadgen') continue;
            const value = change.value || {};
            const leadId = metaCapi.normalizeLeadId(value.leadgen_id || value.lead_id);
            if (!leadId || seen.has(leadId)) continue;
            seen.add(leadId);
            items.push({
                leadId,
                formId: value.form_id ? String(value.form_id).slice(0, 32) : '',
                pageId: String(value.page_id || row.id || '').slice(0, 32),
                adId: value.ad_id ? String(value.ad_id).slice(0, 32) : '',
                createdTime: unixFromUnknown(value.created_time)
            });
        }
    }
    return items;
}

function fieldMap(fieldData) {
    const out = {};
    const rows = Array.isArray(fieldData) ? fieldData : [];
    for (const row of rows) {
        const key = String((row && row.name) || '').trim().toLowerCase().replace(/\s+/g, '_');
        const values = Array.isArray(row && row.values) ? row.values : [];
        const val = String(values[0] || '').trim();
        if (key && val) out[key] = val;
    }
    return out;
}

function pickEmail(fields) {
    return String(
        fields.email ||
            fields.email_address ||
            fields.work_email ||
            ''
    ).trim();
}

function pickPhone(fields) {
    return String(
        fields.phone_number ||
            fields.phone ||
            fields.mobile_phone ||
            fields.work_phone_number ||
            ''
    ).trim();
}

function pickName(fields) {
    const full = String(fields.full_name || fields.full_name_ || '').trim();
    if (full) return full.slice(0, 120);
    const first = String(fields.first_name || '').trim();
    const last = String(fields.last_name || '').trim();
    return `${first} ${last}`.trim().slice(0, 120);
}

function rememberMemory(record) {
    if (!record || !record.leadId) return record;
    memoryByLeadId.set(record.leadId, record);
    const email = String(record.email || '').trim().toLowerCase();
    if (email) memoryByEmail.set(email, record);
    return record;
}

async function upsertLead(record) {
    if (usePersistentDb()) {
        return db.upsertMetaLead(record);
    }
    const prev = memoryByLeadId.get(record.leadId) || {};
    return rememberMemory(Object.assign({}, prev, record, { updatedAt: new Date().toISOString() }));
}

async function findByLeadId(leadId) {
    const id = metaCapi.normalizeLeadId(leadId);
    if (!id) return null;
    if (usePersistentDb()) return db.findMetaLeadByLeadId(id);
    return memoryByLeadId.get(id) || null;
}

async function findByEmail(email) {
    const key = String(email || '').trim().toLowerCase();
    if (!key) return null;
    if (usePersistentDb()) return db.findMetaLeadByEmail(key);
    return memoryByEmail.get(key) || null;
}

async function fetchLeadFromGraph(leadId) {
    const token = pageAccessToken();
    if (!token) return null;
    const id = metaCapi.normalizeLeadId(leadId);
    if (!id) return null;
    const url =
        `https://graph.facebook.com/${API_VERSION}/${id}` +
        `?fields=id,created_time,ad_id,form_id,field_data`;
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => {
        if (ctrl) ctrl.abort();
    }, 5000);
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl ? ctrl.signal : undefined
        });
        const text = await res.text();
        if (!res.ok) {
            console.warn('Meta leadgen fetch:', res.status, String(text).slice(0, 180));
            return null;
        }
        return JSON.parse(text);
    } catch (err) {
        console.warn('Meta leadgen fetch failed:', err && err.message ? err.message : err);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function sendStage(record, eventName, eventTime, attr) {
    if (!record || !record.leadId) return { ok: false, skipped: true };
    return metaCapi.sendCrmLeadEvent({
        eventName,
        email: record.email,
        phone: record.phone,
        name: record.name,
        leadId: record.leadId,
        eventTime: eventTime || unixFromUnknown(record.leadCreatedAt) || undefined,
        attr
    });
}

function rank(stage) {
    return STAGE_RANK[String(stage || '')] || 0;
}

async function ingestLeadgenItem(item) {
    const leadId = metaCapi.normalizeLeadId(item && item.leadId);
    if (!leadId) return null;
    const existing = await findByLeadId(leadId);
    if (existing && rank(existing.stage) >= STAGE_RANK.Lead) {
        if (!existing.email) {
            const graph = await fetchLeadFromGraph(leadId);
            if (graph) {
                const fields = fieldMap(graph.field_data);
                const email = pickEmail(fields);
                const phone = pickPhone(fields) || existing.phone;
                const name = pickName(fields) || existing.name;
                if (email) {
                    const updated = await upsertLead(Object.assign({}, existing, { email, phone, name }));
                    return { record: updated, created: false };
                }
            }
        }
        return { record: existing, created: false };
    }

    let email = existing && existing.email;
    let phone = existing && existing.phone;
    let name = existing && existing.name;
    let formId = (item && item.formId) || (existing && existing.formId) || '';
    let pageId = (item && item.pageId) || (existing && existing.pageId) || '';
    let adId = (item && item.adId) || (existing && existing.adId) || '';
    let leadCreatedAt = item && item.createdTime;

    const graph = await fetchLeadFromGraph(leadId);
    if (graph) {
        const fields = fieldMap(graph.field_data);
        email = pickEmail(fields) || email;
        phone = pickPhone(fields) || phone;
        name = pickName(fields) || name;
        if (graph.form_id) formId = String(graph.form_id).slice(0, 32);
        if (graph.ad_id) adId = String(graph.ad_id).slice(0, 32);
        if (graph.created_time) leadCreatedAt = unixFromUnknown(graph.created_time);
    }

    const record = await upsertLead({
        leadId,
        email,
        phone,
        name,
        formId,
        pageId,
        adId,
        stage: 'Lead',
        leadCreatedAt: leadCreatedAt ? new Date(leadCreatedAt * 1000).toISOString() : null
    });
    const sent = await sendStage(record, 'Lead', leadCreatedAt);
    if (!sent.ok && !sent.skipped) {
        console.warn('Meta CRM Lead event failed for', leadId);
    }
    if (onNewLead) {
        try { onNewLead(record); } catch (err) {
            console.warn('Meta lead notify:', err && err.message ? err.message : err);
        }
    }
    return { record, created: true };
}

async function ingestWebhookBody(body) {
    const items = extractLeadgenItems(body);
    const leads = [];
    for (const item of items) {
        try {
            const result = await ingestLeadgenItem(item);
            if (result && result.created && result.record) leads.push(result.record);
        } catch (err) {
            console.warn('Meta leadgen ingest:', err && err.message ? err.message : err);
        }
    }
    return { ok: true, count: items.length, leads };
}

async function advanceStage({ email, phone, stage, name, attr }) {
    const next = String(stage || '').trim();
    if (!STAGE_RANK[next]) return { ok: false, skipped: true };
    const record = await findByEmail(email);
    if (!record || !record.leadId) return { ok: false, skipped: true };
    if (rank(record.stage) >= rank(next)) return { ok: true, skipped: true };
    if (phone && !record.phone) record.phone = phone;
    if (name && !record.name) record.name = name;
    const sent = await sendStage(record, next, Math.floor(Date.now() / 1000), attr);
    if (!sent.ok && !sent.skipped) return sent;
    await upsertLead({
        leadId: record.leadId,
        email: record.email,
        phone: record.phone,
        name: record.name,
        formId: record.formId,
        pageId: record.pageId,
        adId: record.adId,
        stage: next,
        leadCreatedAt: record.leadCreatedAt
    });
    return { ok: true };
}

function handleVerify(req, res) {
    const mode = String((req.query && req.query['hub.mode']) || '');
    const token = String((req.query && req.query['hub.verify_token']) || '');
    const challenge = String((req.query && req.query['hub.challenge']) || '');
    const expected = verifyToken();
    if (mode === 'subscribe' && expected && token === expected && challenge) {
        return res.status(200).type('text').send(challenge);
    }
    return res.status(403).type('text').send('Forbidden');
}

function parseRawJson(raw) {
    try {
        const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || '');
        return JSON.parse(text || '{}');
    } catch {
        return null;
    }
}

async function handleWebhook(req, res) {
    if (!hasLeadWebhook()) {
        return res.status(500).type('text').send('Meta lead webhook not configured');
    }
    const raw = req.body;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw || ''), 'utf8');
    if (!verifySignature(buf, req.headers['x-hub-signature-256'])) {
        return res.status(403).type('text').send('Invalid signature');
    }
    const body = parseRawJson(buf);
    if (!body) {
        return res.status(400).type('text').send('Invalid JSON');
    }
    res.status(200).type('text').send('EVENT_RECEIVED');
    try {
        await ingestWebhookBody(body);
    } catch (err) {
        console.warn('Meta leadgen webhook:', err && err.message ? err.message : err);
    }
}

module.exports = {
    hasLeadWebhook,
    setOnNewLead,
    handleVerify,
    handleWebhook,
    ingestWebhookBody,
    advanceStage,
    findByEmail
};
