/**
 * Technical SEO: robots.txt (AI crawlers allowed), sitemap, shared schema.
 */

'use strict';

const SITE_ORIGIN = 'https://lonclinic.com';

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
    if (/^https?:\/\/www\.lonclinic\.com$/i.test(u)) return SITE_ORIGIN;
    return u.startsWith('http') ? u : SITE_ORIGIN;
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

function buildSitemapXml(origin) {
    const o = originOf(origin);
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
    organizationNode,
    organizationJsonLd,
    jsonLdScript,
    robotsTxt,
    buildSitemapXml
};
