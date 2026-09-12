'use strict';

const crypto = require('crypto');

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toBase32(buf) {
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
    return out;
}

function fromBase32(str) {
    const clean = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const out = [];
    for (const ch of clean) {
        const idx = BASE32.indexOf(ch);
        if (idx < 0) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

function generateSecret() {
    return toBase32(crypto.randomBytes(20));
}

function hotp(secretBuf, counter) {
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24)
        | ((hmac[offset + 1] & 0xff) << 16)
        | ((hmac[offset + 2] & 0xff) << 8)
        | (hmac[offset + 3] & 0xff);
    return String(code % 1000000).padStart(6, '0');
}

function totpAt(secret, step) {
    return hotp(fromBase32(secret), step);
}

function normalizeCode(raw) {
    return String(raw || '').replace(/\D/g, '').slice(0, 6);
}

function verifyTotp(secret, code, { window = 1, now = Date.now() } = {}) {
    const expected = normalizeCode(code);
    if (expected.length !== 6 || !secret) return false;
    const step = Math.floor(now / 30000);
    for (let i = -window; i <= window; i++) {
        const candidate = totpAt(secret, step + i);
        try {
            if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))) return true;
        } catch {
            /* length mismatch */
        }
    }
    return false;
}

function otpauthUrl(secret, account, issuer) {
    const iss = encodeURIComponent(issuer || 'Lon Clinic');
    const acc = encodeURIComponent(account || 'staff');
    return `otpauth://totp/${iss}:${acc}?secret=${encodeURIComponent(secret)}&issuer=${iss}&period=30&digits=6`;
}

function generateRecoveryCodes(n = 8) {
    const codes = [];
    for (let i = 0; i < n; i++) {
        const hex = crypto.randomBytes(16).toString('hex');
        codes.push(`${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24)}`);
    }
    return codes;
}

function hashRecoveryCode(code, pepper) {
    return crypto.createHmac('sha256', String(pepper || 'lon-totp')).update(normalizeRecovery(code)).digest('hex');
}

function normalizeRecovery(raw) {
    return String(raw || '').toLowerCase().replace(/[^a-f0-9]/g, '');
}

function recoveryCodesEqual(code, storedHash, pepper) {
    const given = Buffer.from(hashRecoveryCode(code, pepper), 'hex');
    const stored = Buffer.from(String(storedHash || ''), 'hex');
    if (given.length !== stored.length || given.length === 0) return false;
    return crypto.timingSafeEqual(given, stored);
}

module.exports = {
    generateSecret,
    verifyTotp,
    otpauthUrl,
    generateRecoveryCodes,
    hashRecoveryCode,
    recoveryCodesEqual,
    normalizeCode,
    normalizeRecovery
};
