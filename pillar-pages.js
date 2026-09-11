/**
 * Lon Clinic — brand pillar landing pages at the root (SEO + AEO).
 *   /psicologo-online-portugal · /medico-online-portugal · /burnout-sintomas-causas-tratamento
 *
 * Product/category landings for the three pillars (Medicina · Psicologia · Nutrição), not editorial:
 * new articles keep going to /blog/:slug. Content lives in data/pillars/ (manifest + one .md per page).
 * The FAQ block is rendered visibly and the FAQPage JSON-LD is generated from the same array, so both
 * always match.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { organizationJsonLd, originOf, canonicalHref } = require('./seo');
// Requiring queixas also installs the shared marked renderer (external links open in a new tab).
const queixas = require('./queixas');

const PILLARS_DIR = path.join(__dirname, 'data', 'pillars');
const MANIFEST_PATH = path.join(PILLARS_DIR, 'manifest.json');
const PAGES_DIR = path.join(PILLARS_DIR, 'pages');
const CSS_V = '20260911a';

const { escapeHtml, isValidSlug } = queixas;

const AREA = {
    psicologia: {
        bodyClass: 'pl-body--psicologia',
        specialty: 'Clinical Psychology',
        reviewed: 'Conteúdo revisto pela Lon Clinic. O acompanhamento é feito por psicólogos inscritos na Ordem dos Psicólogos Portugueses.',
        crisis: true
    },
    medicina: {
        bodyClass: 'pl-body--medicina',
        specialty: 'Primary Care',
        reviewed: 'Conteúdo revisto pela Lon Clinic. As consultas são realizadas por médicos inscritos na Ordem dos Médicos.',
        crisis: false
    },
    burnout: {
        bodyClass: 'pl-body--psicologia',
        specialty: 'Clinical Psychology',
        reviewed: 'Conteúdo revisto pela Lon Clinic. O acompanhamento é feito por psicólogos inscritos na Ordem dos Psicólogos Portugueses e, quando indicado, por avaliação médica.',
        crisis: true
    }
};

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) return { pages: [] };
    try {
        const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
        return parsed && Array.isArray(parsed.pages) ? parsed : { pages: [] };
    } catch (err) {
        console.error('pillar-pages: manifest unreadable:', err.message || err);
        return { pages: [] };
    }
}

function isPublished(meta) {
    return !!(meta && meta.slug && meta.status !== 'planned' && meta.status !== 'draft');
}

function livePages() {
    return (loadManifest().pages || []).filter((p) => isValidSlug(p.slug) && isPublished(p));
}

function findPage(slug) {
    return livePages().find((p) => p.slug === slug) || null;
}

function hasPublishedSlug(slug) {
    return isValidSlug(slug) && !!findPage(slug);
}

function readPageFile(slug) {
    const filePath = path.join(PAGES_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8');
}

function formatDate(iso) {
    const s = String(iso || '').slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return '';
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${Number(m[3])} de ${months[Number(m[2]) - 1]} de ${m[1]}`;
}

function faqHtml(faq) {
    if (!Array.isArray(faq) || !faq.length) return '';
    const items = faq.map((item, i) => `
            <div class="qx-qa" id="faq-${i + 1}">
                <h3>${escapeHtml(item.q)}</h3>
                <p>${escapeHtml(item.a)}</p>
            </div>`).join('');
    return `
        <section class="qx-block" aria-labelledby="pl-faq-title">
            <h2 id="pl-faq-title">Perguntas frequentes</h2>
            <div class="qx-faq">${items}
            </div>
        </section>`;
}

function faqJsonLd(faq) {
    if (!Array.isArray(faq) || !faq.length) return null;
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a }
        }))
    };
}

function linesHtml(lines) {
    return (Array.isArray(lines) ? lines : [])
        .map((l) => `<p>${String(l).split('\n').map(escapeHtml).join('<br>')}</p>`)
        .join('');
}

function closingHtml(closing) {
    if (!closing || (!closing.title && !(closing.lines || []).length)) return '';
    const sig = Array.isArray(closing.signature) && closing.signature.length
        ? `<p class="pl-closing-signature">${closing.signature.map(escapeHtml).join('<br>')}</p>`
        : '';
    return `
        <section class="qx-block pl-closing" aria-labelledby="pl-closing-title">
            ${closing.title ? `<h2 id="pl-closing-title">${escapeHtml(closing.title)}</h2>` : ''}
            ${linesHtml(closing.lines)}
            ${sig}
        </section>`;
}

function ctaBand(meta, ref) {
    const primary = meta.primaryCta || {};
    const secondary = meta.secondaryCta || {};
    if (!primary.href) return '';
    const withRef = (href) => `${href}${href.indexOf('?') >= 0 ? '&' : '?'}ref=${encodeURIComponent(ref)}`;
    return `
        <aside class="qx-cta-band" aria-label="Próximo passo">
            <div class="lon-container qx-cta-inner">
                <p class="qx-cta-kicker">Próximo passo</p>
                <h2 class="qx-cta-title">${escapeHtml(meta.ctaTitle || primary.label)}</h2>
                <p class="qx-cta-lead">Medicina, Psicologia e Nutrição por videoconsulta. Uma visão integrada da pessoa.</p>
                <div class="qx-cta-actions">
                    <a class="lon-btn lon-btn-primary" href="${escapeHtml(withRef(primary.href))}">${escapeHtml(primary.label)}</a>
                    ${secondary.href ? `<a class="lon-btn lon-btn-soft" href="${escapeHtml(withRef(secondary.href))}">${escapeHtml(secondary.label)}</a>` : ''}
                </div>
            </div>
        </aside>`;
}

function relatedHtml(related) {
    const items = Array.isArray(related) ? related.filter((r) => r && r.href && r.label) : [];
    if (!items.length) return '';
    const lis = items.map((r) => `<li><a href="${escapeHtml(r.href)}">${escapeHtml(r.label)}</a></li>`).join('');
    return `
        <nav class="qx-related" aria-label="Páginas relacionadas">
            <h2>Continuar a ler</h2>
            <ul>${lis}</ul>
        </nav>`;
}

function pillarNav(current) {
    const items = [
        { href: '/medico-online-portugal', label: 'Médico online' },
        { href: '/psicologo-online-portugal', label: 'Psicólogo online' },
        { href: '/burnout-sintomas-causas-tratamento', label: 'Burnout' },
        { href: '/nutricao', label: 'Nutrição' }
    ];
    return items
        .map((i) => `<a href="${i.href}"${i.href === current ? ' aria-current="page"' : ''}>${escapeHtml(i.label)}</a>`)
        .join('\n                ');
}

function layoutPage(opts) {
    const { origin, meta, canonicalPath, jsonLd, mainHtml } = opts;
    const area = AREA[meta.area] || AREA.psicologia;
    const canonicalUrl = canonicalHref(canonicalPath);
    const safeTitle = escapeHtml(meta.title);
    const safeDesc = escapeHtml(meta.description);
    const og = escapeHtml(`${origin}/image/image3.webp`);
    const graph = Array.isArray(jsonLd) ? jsonLd.slice() : [];
    graph.push(organizationJsonLd(origin));
    const ldScripts = graph
        .map((block) => `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`)
        .join('\n');
    const modIso = String(meta.dateModified || meta.datePublished || '').slice(0, 10);
    const book = escapeHtml((meta.primaryCta && meta.primaryCta.href) || '/marcar/clinica-geral');
    const bookLabel = escapeHtml((meta.primaryCta && meta.primaryCta.label) || 'Marcar consulta');
    const keywords = Array.isArray(meta.keywords) && meta.keywords.length
        ? `<meta name="keywords" content="${escapeHtml(meta.keywords.join(', '))}">`
        : '';

    return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZN8J4X12H3"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZN8J4X12H3');
      gtag('config', 'GT-TXHQ9ZVX', { send_page_view: false });
      gtag('config', 'AW-18103198169', { send_page_view: false });
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}">
    ${keywords}
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:image" content="${og}">
    ${modIso ? `<meta property="article:modified_time" content="${escapeHtml(modIso)}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${og}">
    <meta name="theme-color" content="#5f6642">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260906i">
    <link rel="stylesheet" href="/queixas.css?v=20260906c">
    <link rel="stylesheet" href="/author.css?v=20260820e">
    <link rel="stylesheet" href="/pillar-pages.css?v=${CSS_V}">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${ldScripts}
</head>
<body class="lon-landing qx-body pl-body ${area.bodyClass}">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="LON Clinic — página inicial">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                ${pillarNav(canonicalPath)}
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="${book}" class="lon-btn lon-btn-primary lon-btn-sm" data-cta="book">${bookLabel}</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/medico-online-portugal">Médico online</a>
            <a href="/psicologo-online-portugal">Psicólogo online</a>
            <a href="/burnout-sintomas-causas-tratamento">Burnout</a>
            <a href="/nutricao">Nutrição</a>
            <a href="/patient-portal">Login</a>
            <a href="${book}" data-cta="book">${bookLabel}</a>
        </div>
    </header>
    ${mainHtml}
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>Medicina, Psicologia e Nutrição por videoconsulta. Uma visão integrada da pessoa.</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                </div>
                <div class="lon-footer-col">
                    <h4>Medicina</h4>
                    <a href="/medico-online-portugal">Médico online em Portugal</a>
                    <a href="/consulta">Consultas médicas online</a>
                    <a href="/tourist-clinic">Médico para turistas</a>
                    <a href="/travel-clinic">Consulta do viajante</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Psicologia</h4>
                    <a href="/psicologo-online-portugal">Psicólogo online em Portugal</a>
                    <a href="/burnout-sintomas-causas-tratamento">Burnout</a>
                    <a href="/consultas">Consultas por queixa</a>
                    <a href="/saudemental">Planos e preço</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Nutrição e clínica</h4>
                    <a href="/nutricao">Nutrição online</a>
                    <a href="/equipa/rita-aguiar">A médica</a>
                    <a href="/faq">FAQ</a>
                    <a href="/info.html?page=contato">Contacto</a>
                </div>
            </div>
            <div class="lon-footer-bottom">
                <div class="lon-footer-legal-links">
                    <a href="/info.html?page=termos-condicoes">Termos</a>
                    <a href="/info.html?page=politica-privacidade">Privacidade</a>
                    <a href="/info.html?page=cookies">Cookies</a>
                </div>
                <div><p>© 2026 Lon Clinic · Portugal</p></div>
            </div>
        </div>
    </footer>
    <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer" class="lon-wa-float" aria-label="Falar por WhatsApp">💬 Falar por WhatsApp</a>
    <script src="/lon-nav.js"></script>
    <script src="/i18n.js?v=20260911a" defer></script>
    <script src="/lon-analytics.js?v=20260906h" defer></script>
    <script src="/reviews.js?v=20260905e" defer></script>
</body>
</html>`;
}

function renderPage(origin, slug) {
    const meta = findPage(slug);
    if (!meta) return null;
    const o = originOf(origin);
    const area = AREA[meta.area] || AREA.psicologia;
    const raw = readPageFile(slug);
    const bodyHtml = raw ? marked.parse(raw) : '';
    const h1 = String(meta.h1 || meta.title || slug);
    const lead = String(meta.lead || meta.description || '');
    const description = String(meta.description || lead);
    const datePub = String(meta.datePublished || '').slice(0, 10);
    const dateMod = String(meta.dateModified || meta.datePublished || '').slice(0, 10);
    const canonicalPath = `/${encodeURIComponent(slug)}`;
    const canonicalUrl = canonicalHref(canonicalPath);
    const ref = `pillar-${slug}`;
    const crumb = meta.breadcrumb || {};

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'MedicalWebPage',
            headline: h1,
            name: h1,
            description,
            url: canonicalUrl,
            datePublished: datePub || undefined,
            dateModified: dateMod || undefined,
            lastReviewed: dateMod || datePub || undefined,
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            specialty: { '@type': 'MedicalSpecialty', name: area.specialty },
            audience: { '@type': 'PeopleAudience', geographicArea: { '@type': 'Country', name: 'Portugal' } },
            keywords: Array.isArray(meta.keywords) ? meta.keywords.join(', ') : undefined,
            reviewedBy: { '@id': `${o}/#organization` },
            publisher: { '@id': `${o}/#organization` }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                ...(crumb.href ? [{ '@type': 'ListItem', position: 2, name: crumb.label || crumb.href, item: `${o}${crumb.href}` }] : []),
                { '@type': 'ListItem', position: crumb.href ? 3 : 2, name: meta.navLabel || h1, item: canonicalUrl }
            ]
        }
    ];
    const faqLd = faqJsonLd(meta.faq);
    if (faqLd) jsonLd.push(faqLd);

    const primary = meta.primaryCta || {};
    const secondary = meta.secondaryCta || {};
    const withRef = (href) => `${href}${href.indexOf('?') >= 0 ? '&' : '?'}ref=${encodeURIComponent(ref)}`;
    const reviewDate = dateMod || datePub;

    const mainHtml = `
    <main id="conteudo-principal" class="qx-article-main">
        <article class="qx-article">
            <header class="qx-article-header">
                <nav class="qx-breadcrumb" aria-label="Caminho">
                    <a href="/">LON Clinic</a>
                    ${crumb.href ? `<span aria-hidden="true">/</span>
                    <a href="${escapeHtml(crumb.href)}">${escapeHtml(crumb.label || crumb.href)}</a>` : ''}
                    <span aria-hidden="true">/</span>
                    <span>${escapeHtml(meta.navLabel || h1)}</span>
                </nav>
                <h1>${escapeHtml(h1)}</h1>
                <p class="qx-answer">${escapeHtml(lead)}</p>
                <p class="eeat-byline qx-byline">
                    ${reviewDate ? `<time datetime="${escapeHtml(reviewDate)}">${escapeHtml(formatDate(reviewDate))}</time><span aria-hidden="true"> · </span>` : ''}<span>Medicina · Psicologia · Nutrição por videoconsulta</span>
                    <span class="eeat-byline-review"> · Revisão clínica Lon Clinic · ERS n.º 45475</span>
                </p>
                <div class="qx-article-actions">
                    ${primary.href ? `<a class="lon-btn lon-btn-primary lon-btn-sm" href="${escapeHtml(withRef(primary.href))}">${escapeHtml(primary.label)}</a>` : ''}
                    ${secondary.href ? `<a class="lon-btn lon-btn-soft lon-btn-sm" href="${escapeHtml(withRef(secondary.href))}">${escapeHtml(secondary.label)}</a>` : ''}
                </div>
            </header>

            <section class="qx-block qx-extra" aria-label="Conteúdo"><div class="qx-prose">${bodyHtml}</div></section>

            ${faqHtml(meta.faq)}
            ${closingHtml(meta.closing)}

            <p class="eeat-reviewed">${escapeHtml(area.reviewed)} ERS n.º 45475${reviewDate ? ` · <time datetime="${escapeHtml(reviewDate)}">${escapeHtml(formatDate(reviewDate))}</time>` : ''}.</p>
            <p class="qx-disclaimer">Esta página tem carácter informativo e não substitui uma consulta individualizada. ${area.crisis
                ? 'Em crise ou risco imediato: <a href="tel:112">112</a> · <a href="tel:808242424">SNS 24</a> · <a href="tel:213544545">SOS Voz Amiga</a>.'
                : 'Em emergência médica ligue <a href="tel:112">112</a>. Para orientação, <a href="tel:808242424">SNS 24</a>.'}</p>
            ${relatedHtml(meta.related)}
        </article>
        ${ctaBand(meta, ref)}
    </main>`;

    return {
        html: layoutPage({ origin: o, meta, canonicalPath, jsonLd, mainHtml })
    };
}

module.exports = {
    loadManifest,
    livePages,
    findPage,
    hasPublishedSlug,
    renderPage
};
