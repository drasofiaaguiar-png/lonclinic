'use strict';
const fs = require('fs');
const path = require('path');

function dimJpeg(buf) {
    let i = 2;
    while (i < buf.length - 8) {
        if (buf[i] !== 0xff) { i += 1; continue; }
        const marker = buf[i + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
            return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        }
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
    }
    return null;
}

function dimPng(buf) {
    if (buf.toString('ascii', 1, 4) !== 'PNG') return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function dimWebp(buf) {
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
        return {
            w: 1 + buf.readUIntLE(24, 3),
            h: 1 + buf.readUIntLE(27, 3)
        };
    }
    if (chunk === 'VP8 ') {
        return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
}

function dimAvif(buf) {
    // crude: look for ispe box
    const s = buf.toString('binary');
    const idx = s.indexOf('ispe');
    if (idx < 0) return null;
    const off = idx + 4 + 4; // skip ispe + version/flags
    try {
        return { w: buf.readUInt32BE(off), h: buf.readUInt32BE(off + 4) };
    } catch {
        return null;
    }
}

function dims(file) {
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return dimJpeg(buf);
    if (ext === '.png') return dimPng(buf);
    if (ext === '.webp') return dimWebp(buf);
    if (ext === '.avif') return dimAvif(buf);
    return null;
}

function walk(dir, acc) {
    if (!fs.existsSync(dir)) return acc;
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p, acc);
        else if (/\.(jpe?g|png|webp|avif)$/i.test(name)) acc.push(p);
    }
    return acc;
}

const root = path.join(__dirname, '..', 'image');
const files = walk(root, []);
for (const f of files) {
    const d = dims(f);
    const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
    const kb = Math.round(fs.statSync(f).size / 1024);
    console.log(`${d ? `${d.w}x${d.h}` : '??x??'}\t${kb}kb\t${rel}`);
}

const man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/guide/manifest.json'), 'utf8'));
const counts = {};
for (const a of man.articles) {
    const img = a.image || '(none)';
    counts[img] = (counts[img] || 0) + 1;
}
console.log('\n--- manifest image usage ---');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const local = path.join(__dirname, '..', k.replace(/^\//, '').replace(/\//g, path.sep));
    const exists = fs.existsSync(local);
    let d = null;
    if (exists) d = dims(local);
    console.log(`${v}\t${exists ? 'OK' : 'MISSING'}\t${d ? `${d.w}x${d.h}` : '-'}\t${k}`);
}
