/**
 * Agent discovery: /llms.txt, Accept: text/markdown, RFC 8288 Link headers.
 * Does not expose booking APIs, MCP, or OAuth — those are not appropriate
 * for a clinical site.
 */

'use strict';

const seo = require('./seo');

const PRIVATE_PREFIXES = [
    '/admin',
    '/doctors',
    '/profissional',
    '/clinic-portal',
    '/clinic-desk',
    '/patient-portal',
    '/conta',
    '/diretorio',
    '/uploads',
    '/api/'
];

function pathnameOf(req) {
    const raw = String((req && (req.path || req.url)) || '/').split('?')[0];
    if (raw === '/index.html') return '/';
    if (raw.length > 1) return raw.replace(/\/+$/, '') || '/';
    return raw || '/';
}

function isPrivateAgentPath(req) {
    const p = pathnameOf(req).toLowerCase();
    return PRIVATE_PREFIXES.some((pre) => {
        const base = pre.endsWith('/') ? pre.slice(0, -1) : pre;
        return p === base || p.startsWith(`${base}/`);
    });
}

function parseAccept(header) {
    return String(header || '')
        .split(',')
        .map((part) => {
            const bits = part.trim().split(';');
            const type = String(bits[0] || '').trim().toLowerCase();
            let q = 1;
            for (let i = 1; i < bits.length; i += 1) {
                const m = bits[i].trim().match(/^q=([0-9.]+)/i);
                if (m) {
                    const n = Number(m[1]);
                    if (Number.isFinite(n)) q = n;
                }
            }
            return { type, q };
        })
        .filter((item) => item.type);
}

function prefersMarkdown(req) {
    if (!req) return false;
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') return false;
    const types = parseAccept(req.headers && req.headers.accept);
    const md = types.find((t) => t.type === 'text/markdown' || t.type === 'text/x-markdown');
    if (!md) return false;
    const html = types.find((t) => t.type === 'text/html');
    if (!html) return true;
    return md.q >= html.q;
}

function shouldServeMarkdown(req) {
    return prefersMarkdown(req) && !isPrivateAgentPath(req);
}

function decodeEntities(s) {
    return String(s || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
            const code = parseInt(hex, 16);
            return Number.isFinite(code) ? String.fromCharCode(code) : '';
        })
        .replace(/&#(\d+);/g, (_, n) => {
            const code = Number(n);
            return Number.isFinite(code) ? String.fromCharCode(code) : '';
        });
}

function attr(tag, name) {
    const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
    const m = String(tag || '').match(re);
    return m ? (m[2] || m[3] || '') : '';
}

function collapseWs(s) {
    return decodeEntities(String(s || '').replace(/\s+/g, ' ')).trim();
}

function inlineMarkdown(html) {
    let s = String(html || '');
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, inner) => `**${collapseWs(inner)}**`);
    s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, inner) => `*${collapseWs(inner)}*`);
    s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs, inner) => {
        const href = attr(attrs, 'href');
        const label = collapseWs(inner.replace(/<[^>]+>/g, ' '));
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return label;
        let url = href.trim();
        if (url.startsWith('/')) url = `${seo.SITE_ORIGIN}${url}`;
        if (!label) return url;
        return `[${label}](${url})`;
    });
    s = s.replace(/<[^>]+>/g, ' ');
    return collapseWs(s);
}

function htmlToMarkdown(html, req) {
    const raw = String(html || '');
    const title = collapseWs((raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const descMatch = raw.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)
        || raw.match(/<meta\b[^>]*content=["'][^"']*["'][^>]*name=["']description["'][^>]*>/i);
    const description = descMatch ? collapseWs(attr(descMatch[0], 'content')) : '';
    const canonical = seo.canonicalHref(seo.canonicalPathFromRequest(req));

    let body = raw;
    const main = raw.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (main) body = main[1];

    body = body
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '')
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '')
        .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
        .replace(/<(header|nav|footer|aside|form)\b[\s\S]*?<\/\1>/gi, '')
        .replace(/<button\b[\s\S]*?<\/button>/gi, '');

    const chunks = [];
    const blockRe = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = blockRe.exec(body))) {
        const tag = m[1].toLowerCase();
        const text = inlineMarkdown(m[2]);
        if (!text) continue;
        if (tag === 'h1') chunks.push(`# ${text}`);
        else if (tag === 'h2') chunks.push(`## ${text}`);
        else if (tag === 'h3') chunks.push(`### ${text}`);
        else if (tag === 'h4') chunks.push(`#### ${text}`);
        else if (tag === 'li') chunks.push(`- ${text}`);
        else if (tag === 'blockquote') chunks.push(`> ${text}`);
        else chunks.push(text);
    }

    const lines = [];
    lines.push(`# ${title || 'Lon Clinic'}`);
    if (description) lines.push('', description);
    lines.push('', `Canonical: ${canonical}`, '');
    if (chunks.length) lines.push(chunks.join('\n\n'));
    lines.push('', `Source: ${canonical}`);
    return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function tokenCount(text) {
    return Math.max(1, Math.ceil(String(text || '').length / 4));
}

function addVary(res, value) {
    const prev = res.getHeader('Vary');
    if (!prev) {
        res.setHeader('Vary', value);
        return;
    }
    const parts = String(prev).split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.some((p) => p.toLowerCase() === value.toLowerCase())) {
        res.setHeader('Vary', `${parts.join(', ')}, ${value}`);
    }
}

function setDiscoveryLinkHeaders(res, req) {
    if (!res || typeof res.append !== 'function') return;
    const origin = seo.SITE_ORIGIN;
    const canonical = seo.canonicalHref(seo.canonicalPathFromRequest(req));
    const existing = String(res.getHeader('Link') || '');
    const wanted = [
        `<${origin}/llms.txt>; rel="describedby"; type="text/plain"`,
        `<${origin}/sitemap.xml>; rel="describedby"; type="application/xml"`,
        `<${canonical}>; rel="canonical"`
    ];
    for (const link of wanted) {
        if (existing.includes(link)) continue;
        res.append('Link', link);
    }
}

function applyMarkdownResponse(res, markdown) {
    const md = String(markdown || '');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('X-Markdown-Tokens', String(tokenCount(md)));
    addVary(res, 'Accept');
    return md;
}

function mdLink(label, path) {
    return `- [${label}](${seo.SITE_ORIGIN}${path})`;
}

function mdLinkDesc(label, path, description) {
    const desc = String(description || '').replace(/\s+/g, ' ').trim();
    const line = mdLink(label, path);
    return desc ? `${line}: ${desc}` : line;
}

function buildLlmsTxt() {
    const o = seo.SITE_ORIGIN;
    const lines = [
        '# Lon Clinic',
        '',
        '> Clínica online em Portugal: medicina geral, saúde mental, nutrição e medicina do viajante. Videoconsulta com profissionais licenciados.',
        '',
        'Lon Clinic is an online clinic in Portugal. Licensed doctors and psychologists see patients by video. Typical general consultation is 39 €. Electronic prescriptions are issued in Portugal when indicated.',
        '',
        `Optional: [${o}/llms-full.txt](${o}/llms-full.txt) lists magazine articles and service pages.`,
        '',
        '## Serviços',
        mdLink('Início', '/'),
        mdLink('Consulta médica online', '/consulta'),
        mdLink('Medicina do viajante / travel clinic', '/travel-clinic'),
        mdLink('Tourist clinic (visitors already in Portugal)', '/tourist-clinic'),
        mdLink('Saúde mental / psicologia', '/saudemental'),
        mdLink('Burnout', '/burnout'),
        mdLink('Nutrição', '/nutricao'),
        mdLink('Marcar consulta', '/marcar'),
        '',
        '## Páginas úteis para assistentes',
        mdLink('Centros de vacinação internacional em Portugal', '/blog/centros-de-vacinacao-internacional-portugal'),
        mdLink('Deixar de pensar demais (Nick Trenton)', '/blog/deixar-de-pensar-demais-nick-trenton'),
        mdLink('FAQ', '/faq'),
        mdLink('Como funciona', '/info.html?page=como-funciona'),
        mdLink('Equipa — Rita Aguiar', '/equipa/rita-aguiar'),
        mdLink('Magazine', '/magazine'),
        '',
        '## Contacto',
        `- Site: ${o}/`,
        '- Email: info@lonclinic.com',
        '- Telefone: +351 928 372 775',
        '- País: Portugal',
        ''
    ];
    return `${lines.join('\n')}\n`;
}

function buildLlmsFullTxt() {
    const parts = [buildLlmsTxt().trim(), '', '## Magazine'];
    try {
        const guide = require('./guide');
        const articles = guide.sortArticles((guide.loadManifest().articles || []).filter((a) => a && a.listed !== false && guide.isValidSlug(a.slug)));
        for (const a of articles) {
            parts.push(mdLinkDesc(a.title || a.slug, `/blog/${encodeURIComponent(a.slug)}`, a.description));
        }
    } catch (err) {
        console.error('llms-full: guide articles', err.message);
    }
    parts.push('', '## Consultas');
    try {
        const consultaPages = require('./consulta-pages');
        for (const p of consultaPages.livePages()) {
            parts.push(mdLinkDesc(p.h1 || p.navLabel || p.slug, `/consulta/${encodeURIComponent(p.slug)}`, p.description));
        }
    } catch (err) {
        console.error('llms-full: consulta', err.message);
    }
    parts.push('', '## Burnout');
    try {
        const burnoutPages = require('./burnout-pages');
        const pages = (burnoutPages.loadManifest().pages || []).filter((p) => p && burnoutPages.isValidSlug(p.slug) && p.slug !== 'hub');
        for (const p of pages) {
            parts.push(mdLinkDesc(p.title || p.navLabel || p.slug, `/burnout/${encodeURIComponent(p.slug)}`, p.description));
        }
    } catch (err) {
        console.error('llms-full: burnout', err.message);
    }
    parts.push('');
    return `${parts.join('\n')}\n`;
}

function sendPlainUtf8(res, body, type) {
    res.set({
        'Content-Type': `${type}; charset=utf-8`,
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'CDN-Cache-Control': 'public, max-age=600'
    });
    res.send(body);
}

module.exports = {
    prefersMarkdown,
    shouldServeMarkdown,
    htmlToMarkdown,
    tokenCount,
    addVary,
    setDiscoveryLinkHeaders,
    applyMarkdownResponse,
    buildLlmsTxt,
    buildLlmsFullTxt,
    sendPlainUtf8,
    isPrivateAgentPath
};
