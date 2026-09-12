'use strict';

const crypto = require('crypto');

const PREFIX = 'enc:v1:';

function fieldKey() {
    const dedicated = String(process.env.CLINICAL_ENCRYPTION_KEY || '').trim();
    const material = dedicated || String(process.env.SESSION_SECRET || '').trim();
    if (!material) return null;
    return crypto.createHmac('sha256', 'lon-clinic-field-v1').update(material).digest();
}

function encryptField(value) {
    if (value == null) return '';
    const text = String(value);
    if (!text) return '';
    if (text.startsWith(PREFIX)) return text;
    const key = fieldKey();
    if (!key) return text;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url');
}

function decryptField(value) {
    if (value == null) return '';
    const text = String(value);
    if (!text) return '';
    if (!text.startsWith(PREFIX)) return text;
    const key = fieldKey();
    if (!key) return text;
    try {
        const buf = Buffer.from(text.slice(PREFIX.length), 'base64url');
        if (buf.length < 29) return '';
        const iv = buf.subarray(0, 12);
        const tag = buf.subarray(12, 28);
        const enc = buf.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    } catch {
        return '';
    }
}

function encryptJson(value) {
    if (value == null) return null;
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (!raw || raw === '{}' || raw === 'null') return raw;
    return encryptField(raw);
}

function decryptJson(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'object') return value;
    const text = decryptField(String(value));
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

module.exports = {
    encryptField,
    decryptField,
    encryptJson,
    decryptJson
};
