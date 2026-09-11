'use strict';

/**
 * Adds pictures to /blog markdown articles.
 *
 * node scripts/blog-figures.js audit
 *     Lists markdown articles in data/guide/manifest.json that have no <figure> yet.
 *
 * node scripts/blog-figures.js apply <plan.json>
 *     Converts each source image to WebP under image/guide/blog/ and injects the
 *     figure markup into data/guide/articles/<slug>.md.
 *
 * Plan format (array):
 * [
 *   {
 *     "slug": "burnout-materno",
 *     "highlight": { "asset": "C:/abs/path.jpg", "name": "burnout-materno-destaque",
 *                    "alt": "...", "caption": "..." },
 *     "figures": [ { "asset": "C:/abs/path2.jpg", "name": "burnout-materno-2", "alt": "..." } ]
 *   }
 * ]
 *
 * "asset" may instead be a web path already in the repo (e.g. "/image/guide/blog/x.webp"),
 * in which case the file is reused as-is and "name" is ignored.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'data', 'guide', 'articles');
const MANIFEST_PATH = path.join(ROOT, 'data', 'guide', 'manifest.json');
const OUT_DIR = path.join(ROOT, 'image', 'guide', 'blog');
const MAX_WIDTH = 1400;
const WEBP_QUALITY = 76;

function readManifest() {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function articlePath(slug) {
    return path.join(ARTICLES_DIR, `${slug}.md`);
}

function escapeAttr(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function audit() {
    const manifest = readManifest();
    const missing = [];
    for (const a of manifest.articles) {
        const p = articlePath(a.slug);
        if (!fs.existsSync(p)) continue;
        const body = fs.readFileSync(p, 'utf8');
        const figures = (body.match(/<figure/g) || []).length;
        const highlights = (body.match(/guide-figure-highlight/g) || []).length;
        if (!figures || !highlights) {
            missing.push({ slug: a.slug, about: a.about || '-', figures, highlights });
        }
    }
    for (const m of missing) {
        console.log(`${m.about}\t${m.slug}\tfigures=${m.figures}\thighlights=${m.highlights}`);
    }
    console.log(`\n${missing.length} markdown article(s) still incomplete.`);
}

async function materialise(spec) {
    // Already-in-repo web path: reuse without converting.
    if (typeof spec.asset === 'string' && spec.asset.startsWith('/')) {
        const abs = path.join(ROOT, spec.asset.replace(/^\//, ''));
        if (!fs.existsSync(abs)) throw new Error(`missing repo image: ${spec.asset}`);
        const meta = await sharp(abs).metadata();
        return { url: spec.asset, width: meta.width, height: meta.height };
    }

    if (!spec.name) throw new Error('figure spec needs a "name"');
    if (!fs.existsSync(spec.asset)) throw new Error(`missing source image: ${spec.asset}`);
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const outAbs = path.join(OUT_DIR, `${spec.name}.webp`);
    await sharp(spec.asset)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outAbs);
    const meta = await sharp(outAbs).metadata();
    return { url: `/image/guide/blog/${spec.name}.webp`, width: meta.width, height: meta.height };
}

function figureHtml(img, spec, isHighlight) {
    const cls = isHighlight ? 'guide-figure guide-figure-highlight' : 'guide-figure';
    const caption = isHighlight && spec.caption
        ? `\n<figcaption>${escapeAttr(spec.caption)}</figcaption>`
        : '';
    return `<figure class="${cls}">\n<img src="${img.url}" alt="${escapeAttr(spec.alt)}" `
        + `width="${img.width}" height="${img.height}" loading="lazy" decoding="async">${caption}\n</figure>`;
}

/**
 * Splits the body into blank-line separated blocks so figures land between
 * paragraphs rather than inside one.
 */
function splitBlocks(body) {
    return body.replace(/\r\n/g, '\n').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
}

function isHeading(block) {
    return /^##\s/.test(block);
}

// Everything from the FAQ / disclaimer / sources onwards stays picture-free.
const TAIL_HEADING = /^##\s*(Perguntas frequentes|FAQ|Preguntas frecuentes|Fontes|Fuentes|Sources|Quellen|Referências|Referencias)/i;

function tailIndex(blocks) {
    const stop = blocks.findIndex(b => TAIL_HEADING.test(b) || /^-{3,}$/.test(b));
    return stop === -1 ? blocks.length : stop;
}

/**
 * Picks insertion points. Figures land just before an h2 so they close the
 * preceding section, never inside the FAQ or the sources list.
 */
function placementIndexes(blocks, count) {
    const limit = tailIndex(blocks);
    const slots = [];
    for (let i = 0; i < limit; i += 1) {
        // Needs at least the intro above it, and no figure directly adjacent.
        if (isHeading(blocks[i]) && i >= 2 && !/^<figure/.test(blocks[i - 1] || '')) slots.push(i);
    }

    const picks = [];
    for (let n = 0; n < count; n += 1) {
        const wanted = n === 0 ? 0 : Math.floor((n * slots.length) / count);
        let idx = slots[wanted];
        // Keep picks strictly increasing; fall back to the end of the body.
        while (idx != null && picks.includes(idx)) idx = slots[slots.indexOf(idx) + 1];
        picks.push(idx == null ? limit : idx);
    }
    return picks;
}

async function applyEntry(entry) {
    const p = articlePath(entry.slug);
    if (!fs.existsSync(p)) throw new Error(`no markdown article: ${entry.slug}`);

    const specs = [];
    if (entry.highlight) specs.push({ ...entry.highlight, highlight: true });
    for (const f of entry.figures || []) specs.push({ ...f, highlight: false });
    if (!specs.length) throw new Error(`nothing to insert for ${entry.slug}`);

    const rendered = [];
    for (const spec of specs) {
        const img = await materialise(spec);
        rendered.push({ html: figureHtml(img, spec, spec.highlight), url: img.url, highlight: spec.highlight });
    }

    let body = fs.readFileSync(p, 'utf8');
    const already = rendered.filter(r => body.includes(r.url));
    const pending = rendered.filter(r => !body.includes(r.url));
    if (!pending.length) return { slug: entry.slug, inserted: 0, skipped: already.length };

    const blocks = splitBlocks(body);
    const picks = placementIndexes(blocks, pending.length);

    // Insert from the bottom up so earlier indexes stay valid.
    const ordered = picks
        .map((idx, n) => ({ idx, html: pending[n].html }))
        .sort((a, b) => b.idx - a.idx);
    for (const item of ordered) {
        blocks.splice(Math.min(item.idx, blocks.length), 0, item.html);
    }

    body = `${blocks.join('\n\n')}\n`;
    fs.writeFileSync(p, body, 'utf8');
    return { slug: entry.slug, inserted: pending.length, skipped: already.length };
}

async function apply(planPath) {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    const entries = Array.isArray(plan) ? plan : [plan];
    let ok = 0;
    const failures = [];
    for (const entry of entries) {
        try {
            const res = await applyEntry(entry);
            ok += 1;
            console.log(`ok   ${res.slug} (+${res.inserted} figure(s)${res.skipped ? `, ${res.skipped} already present` : ''})`);
        } catch (err) {
            failures.push(`${entry.slug}: ${err.message}`);
            console.log(`FAIL ${entry.slug}: ${err.message}`);
        }
    }
    console.log(`\n${ok}/${entries.length} article(s) patched.`);
    if (failures.length) process.exitCode = 1;
}

async function main() {
    const [cmd, arg] = process.argv.slice(2);
    if (cmd === 'audit') return audit();
    if (cmd === 'apply' && arg) return apply(arg);
    console.log('usage: node scripts/blog-figures.js audit | apply <plan.json>');
    process.exitCode = 1;
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
