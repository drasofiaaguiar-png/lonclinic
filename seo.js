/**
 * Technical SEO: robots.txt (AI crawlers allowed), sitemap, shared schema.
 * Public HTML canonicals always use https://www.lonclinic.com + the request path
 * (applyHtmlSeo on every HTML response). Never the apex host.
 */

'use strict';

const SITE_ORIGIN = 'https://www.lonclinic.com';

const PRIVATE_DISALLOWS = [
    '/admin',
    '/doctors',
    '/clinic-portal',
    '/patient-portal',
    '/diretorio',
    '/uploads',
    '/api/'
];

/** Retrieval + training crawlers we want citing Lon Clinic in AI search. */
const AI_CRAWLERS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'anthropic-ai',
    'Claude-Web',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'GoogleOther',
    'Applebot',
    'Applebot-Extended',
    'Amazonbot',
    'Bytespider',
    'CCBot',
    'meta-externalagent',
    'Meta-ExternalAgent',
    'FacebookBot',
    'cohere-ai',
    'YouBot',
    'DuckAssistBot'
];

const SEARCH_CRAWLERS = ['Googlebot', 'Bingbot', 'DuckDuckBot', 'Slurp'];

function xmlEscape(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function originOf(url) {
    const u = String(url || SITE_ORIGIN).replace(/\/+$/, '');
    if (!u.startsWith('http')) return SITE_ORIGIN;
    try {
        const parsed = new URL(u);
        const host = parsed.hostname.toLowerCase();
        if (host === 'lonclinic.com' || host === 'www.lonclinic.com') return SITE_ORIGIN;
        return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '');
    } catch {
        return SITE_ORIGIN;
    }
}

function keepInfoPageQuery(pathname, search, req) {
    let page = '';
    try {
        page = new URLSearchParams(String(search || '').replace(/^\?/, '')).get('page') || '';
    } catch {
        page = '';
    }
    if (!page && req && req.query) {
        const rawPage = req.query.page;
        page = Array.isArray(rawPage) ? rawPage[0] : rawPage;
    }
    if (page && /^\/info(\.html)?$/i.test(pathname)) {
        const infoPath = pathname === '/info' ? '/info.html' : pathname;
        return `${infoPath}?page=${encodeURIComponent(String(page))}`;
    }
    return pathname || '/';
}

function canonicalPathFromRequest(req) {
    let pathname = '/';
    let search = '';
    try {
        const raw = String((req && (req.originalUrl || req.url || req.path)) || '/');
        const u = new URL(raw, SITE_ORIGIN);
        pathname = u.pathname || '/';
        search = u.search || '';
    } catch {
        pathname = String((req && req.path) || '/');
    }
    if (pathname === '/index.html') pathname = '/';
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
    return keepInfoPageQuery(pathname, search, req);
}

function rewriteApexSiteUrls(html) {
    if (!html || typeof html !== 'string') return html;
    return html
        .replace(/https:\/\/lonclinic\.com(?=[\s"'<>/?#&]|$)/gi, 'https://www.lonclinic.com')
        .replace(/https%3A%2F%2Flonclinic\.com/gi, 'https%3A%2F%2Fwww.lonclinic.com');
}

function canonicalHref(pathAndQuery) {
    let p = String(pathAndQuery || '/').trim();
    try {
        if (/^https?:\/\//i.test(p)) {
            const u = new URL(p);
            p = `${u.pathname || '/'}${u.search || ''}`;
        }
    } catch {
        /* keep p */
    }
    p = p.split('#')[0];
    if (!p.startsWith('/')) p = `/${p}`;
    const qAt = p.indexOf('?');
    let pathPart = qAt === -1 ? p : p.slice(0, qAt);
    const search = qAt === -1 ? '' : p.slice(qAt);
    if (pathPart === '/index.html') pathPart = '/';
    if (pathPart.length > 1) pathPart = pathPart.replace(/\/+$/, '');
    return `${SITE_ORIGIN}${keepInfoPageQuery(pathPart || '/', search)}`;
}

function escapeHtmlAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function insertBeforeHeadClose(html, insert) {
    const lower = html.toLowerCase();
    const headAt = lower.lastIndexOf('</head>');
    if (headAt === -1) return html + insert;
    return html.slice(0, headAt) + insert + html.slice(headAt);
}

function retagKeepId(existing, next) {
    const idMatch = existing && existing.match(/\sid=["']([^"']+)["']/i);
    const idAttr = idMatch ? ` id="${idMatch[1]}"` : '';
    return next(idAttr);
}

function ensureCanonicalTag(html, href) {
    if (!html || typeof html !== 'string') return html;
    if (!/<html[\s>]/i.test(html)) return html;
    const safeHref = escapeHtmlAttr(href || canonicalHref('/'));
    if (/<link\s[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
        html = html.replace(/<link\s[^>]*rel=["']canonical["'][^>]*>/gi, (m) =>
            retagKeepId(m, (idAttr) => `<link rel="canonical" href="${safeHref}"${idAttr}>`)
        );
    } else {
        html = insertBeforeHeadClose(html, `    <link rel="canonical" href="${safeHref}">\n`);
    }
    if (/<meta\s[^>]*property=["']og:url["'][^>]*>/i.test(html)) {
        html = html.replace(/<meta\s[^>]*property=["']og:url["'][^>]*>/gi, (m) =>
            retagKeepId(m, (idAttr) => `<meta property="og:url" content="${safeHref}"${idAttr}>`)
        );
    }
    return html;
}

/** Rewrite apex hosts and force canonical + og:url to https://www.lonclinic.com{current path}. */
function applyHtmlSeo(html, req) {
    return ensureCanonicalTag(rewriteApexSiteUrls(html), canonicalHref(canonicalPathFromRequest(req)));
}

function organizationNode(origin) {
    const o = originOf(origin);
    return {
        '@type': 'Organization',
        '@id': `${o}/#organization`,
        name: 'Lon Clinic',
        url: o,
        logo: `${o}/image/image2.webp`,
        image: `${o}/image/image2.webp`,
        email: 'info@lonclinic.com',
        telephone: '+351 928 372 775',
        address: { '@type': 'PostalAddress', addressCountry: 'PT' },
        sameAs: ['https://www.trustpilot.com/review/lonclinic.com'],
        founder: {
            '@type': 'Person',
            '@id': `${o}/equipa/rita-aguiar#person`,
            name: 'Rita Aguiar',
            jobTitle: 'Médica',
            url: `${o}/equipa/rita-aguiar`
        },
        employee: { '@id': `${o}/equipa/rita-aguiar#person` }
    };
}

function organizationJsonLd(origin) {
    return {
        '@context': 'https://schema.org',
        ...organizationNode(origin)
    };
}

function jsonLdScript(block) {
    if (!block) return '';
    const blocks = Array.isArray(block) ? block : [block];
    return blocks
        .filter(Boolean)
        .map((item) => `<script type="application/ld+json">\n${JSON.stringify(item, null, 2)}\n</script>`)
        .join('\n');
}

function agentBlock(name) {
    const lines = [`User-agent: ${name}`, 'Allow: /'];
    for (const path of PRIVATE_DISALLOWS) {
        lines.push(`Disallow: ${path}`);
    }
    return lines.join('\n');
}

function robotsTxt() {
    const ai = AI_CRAWLERS.map(agentBlock).join('\n\n');
    const search = SEARCH_CRAWLERS.map(agentBlock).join('\n\n');
    const starDisallow = PRIVATE_DISALLOWS.map((p) => `Disallow: ${p}`).join('\n');
    return `# Lon Clinic — crawlers de pesquisa e de IA são bem-vindos.
#
# Se este ficheiro aparecer no browser com "# BEGIN Cloudflare Managed content"
# e Disallow para GPTBot / ClaudeBot / Google-Extended, a Cloudflare está a
# substituir o robots.txt da origem. Desligar no dashboard:
#   Security → Bots → AI Crawl Control → Allow (não bloquear Search/Agent)
#   Security → Bots → robots.txt → Disable managed robots.txt

${ai}

${search}

User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes, use=full
Allow: /
${starDisallow}

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
}

function urlEntry(loc, lastmod, changefreq, priority, alternates) {
    const extra = Array.isArray(alternates) && alternates.length
        ? `\n${alternates
            .map((a) => `        <xhtml:link rel="alternate" hreflang="${xmlEscape(a.hreflang)}" href="${xmlEscape(a.href)}"/>`)
            .join('\n')}`
        : '';
    return `    <url>
        <loc>${xmlEscape(loc)}</loc>
        <lastmod>${xmlEscape(lastmod)}</lastmod>
        <changefreq>${xmlEscape(changefreq)}</changefreq>
        <priority>${xmlEscape(priority)}</priority>${extra}
    </url>`;
}

const INDEXABLE_INFO_PAGES = [
    'sobre-nos',
    'parcerias',
    'registo-medico',
    'contato',
    'trabalhe-connosco',
    'como-funciona',
    'seguranca-dados',
    'acessibilidade'
];

function buildSitemapXml(/* origin ignored: sitemap always uses the www host */) {
    const o = SITE_ORIGIN;
    const guide = require('./guide');
    const burnoutPages = require('./burnout-pages');
    const consultaPages = require('./consulta-pages');
    const queixas = require('./queixas');
    const nutricao = require('./nutricao');
    const touristPages = require('./tourist-pages');

    const today = new Date().toISOString().slice(0, 10);
    const entries = [];

    const staticPages = [
        ['/', today, 'weekly', '1.0'],
        ['/travel-clinic', today, 'weekly', '1.0'],
        ['/tourist-clinic', today, 'weekly', '0.92'],
        ['/consulta', today, 'weekly', '0.9'],
        ['/book-consultation', today, 'monthly', '0.8'],
        ['/burnout', today, 'weekly', '0.95'],
        ['/burnout/colecao', today, 'weekly', '0.9'],
        ['/burnout/teste', today, 'monthly', '0.9'],
        ['/clinica-anti-burnout', today, 'weekly', '0.9'],
        ['/saudemental', today, 'weekly', '0.9'],
        ['/consultas', today, 'weekly', '0.92'],
        ['/nutricao', today, 'weekly', '0.9'],
        ['/teste-personalidade', today, 'monthly', '0.8'],
        ['/triagem', today, 'monthly', '0.7'],
        ['/recrutamento/psicologia', today, 'monthly', '0.6'],
        ['/consultancy', today, 'monthly', '0.7'],
        ['/faq', today, 'monthly', '0.7'],
        ['/blog', today, 'weekly', '0.8'],
        ['/magazine', today, 'weekly', '0.85'],
        ['/wellness', today, 'weekly', '0.75'],
        ['/equipa/rita-aguiar', today, 'monthly', '0.8'],
        ['/info.html', today, 'monthly', '0.6']
    ];

    for (const [path, lastmod, freq, pri] of staticPages) {
        entries.push(urlEntry(`${o}${path}`, lastmod, freq, pri));
    }

    for (const page of INDEXABLE_INFO_PAGES) {
        entries.push(urlEntry(`${o}/info.html?page=${encodeURIComponent(page)}`, today, 'monthly', '0.55'));
    }

    try {
        const articles = guide.sortArticles(guide.loadManifest().articles || []);
        for (const a of articles) {
            if (!a || !guide.isValidSlug(a.slug)) continue;
            const lastmod = String(a.dateModified || a.datePublished || today).slice(0, 10);
            entries.push(urlEntry(`${o}/blog/${encodeURIComponent(a.slug)}`, lastmod, 'monthly', '0.75'));
        }
    } catch (err) {
        console.error('sitemap: guide articles', err.message);
    }

    try {
        const pages = (burnoutPages.loadManifest().pages || []).filter(
            (p) => p && burnoutPages.isValidSlug(p.slug) && p.slug !== 'hub'
        );
        for (const p of pages) {
            const lastmod = String(p.dateModified || p.datePublished || today).slice(0, 10);
            entries.push(urlEntry(`${o}/burnout/${encodeURIComponent(p.slug)}`, lastmod, 'monthly', '0.8'));
        }
    } catch (err) {
        console.error('sitemap: burnout pages', err.message);
    }

    try {
        const pages = consultaPages.livePages();
        for (const p of pages) {
            const lastmod = String(p.dateModified || p.datePublished || today).slice(0, 10);
            entries.push(urlEntry(`${o}/consulta/${encodeURIComponent(p.slug)}`, lastmod, 'weekly', '0.85'));
        }
    } catch (err) {
        console.error('sitemap: consulta pages', err.message);
    }

    try {
        for (const p of queixas.publishedPages()) {
            const lastmod = String(p.dateModified || p.datePublished || today).slice(0, 10);
            entries.push(urlEntry(`${o}/${encodeURIComponent(p.slug)}`, lastmod, 'weekly', '0.88'));
        }
    } catch (err) {
        console.error('sitemap: queixas', err.message);
    }

    try {
        for (const p of nutricao.livePages()) {
            const lastmod = String(p.dateModified || p.datePublished || today).slice(0, 10);
            entries.push(urlEntry(`${o}/nutricao/${encodeURIComponent(p.slug)}`, lastmod, 'weekly', '0.86'));
        }
    } catch (err) {
        console.error('sitemap: nutricao', err.message);
    }

    try {
        const pages = touristPages.livePages();
        for (const p of pages) {
            const lastmod = String(p.dateModified || p.datePublished || today).slice(0, 10);
            const siblings = touristPages.groupPages(p.group, pages);
            const alternates = siblings.map((s) => ({
                hreflang: s.hreflang || s.lang,
                href: `${o}/${encodeURIComponent(s.slug)}`
            }));
            const def = siblings.find((s) => s.lang === 'en');
            if (def) {
                alternates.push({
                    hreflang: 'x-default',
                    href: `${o}/${encodeURIComponent(def.slug)}`
                });
            }
            entries.push(urlEntry(`${o}/${encodeURIComponent(p.slug)}`, lastmod, 'weekly', '0.86', alternates));
        }
    } catch (err) {
        console.error('sitemap: tourist pages', err.message);
    }

    try {
        const wellness = require('./wellness');
        for (const item of wellness.list()) {
            if (!item || !item.slug) continue;
            entries.push(urlEntry(`${o}/wellness/${encodeURIComponent(item.slug)}`, today, 'monthly', '0.62'));
        }
    } catch (err) {
        console.error('sitemap: wellness', err.message);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}

module.exports = {
    SITE_ORIGIN,
    INDEXABLE_INFO_PAGES,
    originOf,
    canonicalHref,
    canonicalPathFromRequest,
    ensureCanonicalTag,
    applyHtmlSeo,
    rewriteApexSiteUrls,
    organizationNode,
    organizationJsonLd,
    jsonLdScript,
    robotsTxt,
    buildSitemapXml
};
