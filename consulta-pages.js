/**
 * Lon Clinic — consultas por queixa (/consulta/:slug).
 * Hub de conversão permanece em /consulta (consulta.html).
 *
 * Cada página segue o mesmo template: H1 da queixa, resposta directa,
 * sintomas, quando NÃO tratar online, como funciona, preço, FAQ, CTA.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { organizationJsonLd } = require('./seo');
const authors = require('./authors');

const CONSULTA_DIR = path.join(__dirname, 'data', 'consulta');
const MANIFEST_PATH = path.join(CONSULTA_DIR, 'manifest.json');
const PAGES_DIR = path.join(CONSULTA_DIR, 'pages');

marked.use({
    mangle: false,
    headerIds: true,
    gfm: true,
    breaks: true
});

const renderer = new marked.Renderer();
const originalLink = renderer.link.bind(renderer);
renderer.link = function (href, title, text) {
    const out = originalLink(href, title, text);
    if (href && /^https?:\/\//i.test(href) && !/lonclinic\.com/i.test(href)) {
        return out.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
    }
    return out;
};
marked.use({ renderer });

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isValidSlug(slug) {
    return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 96;
}

function normalizeOrigin(url) {
    const u = String(url || 'https://lonclinic.com').replace(/\/+$/, '');
    return u.startsWith('http') ? u : `https://${u}`;
}

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        return { pages: [] };
    }
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (!parsed || !Array.isArray(parsed.pages)) {
        return { pages: [] };
    }
    return parsed;
}

function livePages() {
    return (loadManifest().pages || []).filter(
        (p) => p && isValidSlug(p.slug) && p.status !== 'planned'
    );
}

function findPage(slug) {
    return livePages().find((p) => p.slug === slug) || null;
}

function readPageFile(slug, format) {
    const ext = format === 'html' ? '.html' : '.md';
    const filePath = path.join(PAGES_DIR, `${slug}${ext}`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function bodyToHtml(body, format) {
    if (!body) return '';
    if (format === 'html') return body;
    return marked.parse(body);
}

function listHtml(items, className) {
    if (!Array.isArray(items) || !items.length) return '';
    const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    return `<ul class="${className}">${lis}</ul>`;
}

function stepsHtml(steps) {
    if (!Array.isArray(steps) || !steps.length) return '';
    const items = steps
        .map((step, i) => {
            const title = escapeHtml(step.title || `Passo ${i + 1}`);
            const text = escapeHtml(step.text || '');
            return `
                <li class="cq-step">
                    <span class="cq-step-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                    <div>
                        <h3>${title}</h3>
                        <p>${text}</p>
                    </div>
                </li>`;
        })
        .join('');
    return `<ol class="cq-steps">${items}</ol>`;
}

function faqHtml(faq) {
    if (!Array.isArray(faq) || !faq.length) return '';
    const items = faq
        .map((item) => `
            <details class="cq-faq-item">
                <summary>${escapeHtml(item.q)}</summary>
                <div class="cq-faq-a"><p>${escapeHtml(item.a)}</p></div>
            </details>`)
        .join('');
    return `<div class="cq-faq">${items}</div>`;
}

function relatedNav(current, pages) {
    const relatedSlugs = Array.isArray(current.related) ? current.related : [];
    const bySlug = new Map(pages.map((p) => [p.slug, p]));
    const items = relatedSlugs
        .map((item) => {
            if (item && typeof item === 'object' && item.href) {
                return `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label || item.href)}</a></li>`;
            }
            const slug = String(item || '');
            if (slug.startsWith('/')) {
                return `<li><a href="${escapeHtml(slug)}">${escapeHtml(slug)}</a></li>`;
            }
            const p = bySlug.get(slug);
            if (!p) return '';
            return `<li><a href="/consulta/${encodeURIComponent(p.slug)}">${escapeHtml(p.navLabel || p.h1)}</a></li>`;
        })
        .filter(Boolean)
        .join('');
    if (!items) return '';
    return `
        <nav class="cq-related" aria-label="Consultas relacionadas">
            <h2>Páginas relacionadas</h2>
            <ul>${items}</ul>
        </nav>`;
}

function clinicianStripHtml() {
    const a = authors.getAuthor();
    return `
        <p class="cq-clinician">
            <a href="${escapeHtml(authors.authorPath(a))}">${escapeHtml(a.displayName)}</a>
            <span aria-hidden="true"> · </span>Médica inscrita na Ordem dos Médicos
            <span aria-hidden="true"> · </span>Lon Clinic · ERS n.º 45475
        </p>`;
}

function bookingCardsMarkup(aria, cards, tone) {
    const t = Math.abs(Number(tone) || 0) % 3;
    const items = (Array.isArray(cards) ? cards : [])
        .map(
            (card) => `
        <article class="guide-book-card guide-book-card--t${t}">
            <p class="guide-book-chip">${escapeHtml(card.chip)}</p>
            <h3 class="guide-book-title">${escapeHtml(card.title)}</h3>
            <p class="guide-book-price">${escapeHtml(card.price)}</p>
            <p class="guide-book-note">${escapeHtml(card.note)}</p>
            <a class="guide-book-cta js-consulta-cta" data-consulta-cta="${escapeHtml(card.track || 'consulta-card')}" href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>`
        )
        .join('');
    return `
        <aside class="guide-book" aria-label="${escapeHtml(aria)}">
            <div class="guide-book-grid">${items}
            </div>
        </aside>`;
}

function bookingCardsHtml(page, tone) {
    const primaryHref = page.bookingHref || '/marcar/clinica-geral';
    const isRenew = String(primaryHref).indexOf('/marcar/renovacao') !== -1;
    const slug = page.slug || 'consulta';
    const gp = {
        chip: 'Clínica geral',
        title: 'Consulta médica online',
        price: '39 € · ~30 min',
        note: 'Videoconsulta · médica identificada · receita electrónica se indicada',
        cta: 'Marcar',
        href: isRenew ? `/marcar/clinica-geral?ref=${encodeURIComponent(slug)}` : primaryHref,
        track: 'consulta-card-gp'
    };
    const renew = {
        chip: 'Renovação',
        title: 'Renovação de receita',
        price: '19 €',
        note: 'Medicação crónica estável · vídeo, não um formulário',
        cta: 'Renovar',
        href: isRenew ? primaryHref : `/marcar/renovacao?ref=${encodeURIComponent(`${slug}-renovacao`)}`,
        track: 'consulta-card-renew'
    };
    return bookingCardsMarkup('Marcar consulta na Lon Clinic', isRenew ? [renew, gp] : [gp, renew], tone);
}

function ctaBand(page) {
    const href = escapeHtml(page.bookingHref || '/marcar/clinica-geral');
    const label = escapeHtml(page.bookingLabel || 'Marcar consulta');
    return `
        <aside class="cq-cta-band" aria-label="Marcar consulta">
            <div class="lon-container cq-cta-inner">
                <p class="cq-cta-kicker">Preço visível · videoconsulta</p>
                <h2 class="cq-cta-title">${escapeHtml(page.ctaTitle || 'Marcar consulta médica online')}</h2>
                <p class="cq-cta-lead">${escapeHtml(page.priceNote || page.price || '')}</p>
                <div class="cq-cta-actions">
                    <a class="lon-btn lon-btn-dark js-consulta-cta" data-consulta-cta="spoke-band" href="${href}">${label}</a>
                    <a class="lon-btn lon-btn-soft" href="/consulta">Ver todas as consultas</a>
                </div>
            </div>
        </aside>`;
}

function layoutConsultaPage(opts) {
    const {
        origin,
        title,
        description,
        canonicalPath,
        ogImage,
        jsonLdExtra,
        mainHtml,
        robots
    } = opts;

    const canonicalUrl = `${origin}${canonicalPath}`;
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const og = escapeHtml(ogImage || `${origin}/image/image2.webp`);
    const graph = Array.isArray(jsonLdExtra) ? jsonLdExtra : jsonLdExtra ? [jsonLdExtra] : [];
    if (!robots || !/^noindex/i.test(robots)) {
        graph.push(organizationJsonLd(origin));
    }
    const ldScripts = graph
        .map((block) => `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`)
        .join('\n');

    const liveLinks = livePages()
        .map((p) => `<a href="/consulta/${encodeURIComponent(p.slug)}">${escapeHtml(p.navLabel || p.h1)}</a>`)
        .join('\n                    ');

    return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZN8J4X12H3"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZN8J4X12H3');
      gtag('config', 'GT-TXHQ9ZVX');
      gtag('config', 'AW-18103198169');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}">
    <meta name="robots" content="${escapeHtml(robots || 'index,follow,max-image-preview:large')}">
    <meta name="author" content="${escapeHtml(authors.getAuthor().displayName)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:image" content="${og}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${og}">
    <meta name="theme-color" content="#4A7C6F">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260621b">
    <link rel="stylesheet" href="/consulta-pages.css?v=20260820b">
    <link rel="stylesheet" href="/author.css?v=20260820e">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${ldScripts}
</head>
<body class="lon-landing cq-body">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/consulta">Consulta</a>
                <a href="/consulta#por-queixa">Por queixa</a>
                <a href="/travel-clinic">Viajante</a>
                <a href="/saudemental">Psicologia</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/marcar/clinica-geral" class="lon-btn lon-btn-primary lon-btn-sm">Marcar consulta</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/consulta">Consulta médica</a>
            <a href="/consulta#por-queixa">Por queixa</a>
            <a href="/travel-clinic">Medicina do viajante</a>
            <a href="/saudemental">Psicologia</a>
            <a href="/patient-portal">Login</a>
            <a href="/marcar/clinica-geral">Marcar consulta</a>
        </div>
    </header>
    ${mainHtml}
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>Consulta médica online em Portugal — preço visível, médica identificada, videoconsulta.</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                </div>
                <div class="lon-footer-col">
                    <h4>Por queixa</h4>
                    ${liveLinks}
                </div>
                <div class="lon-footer-col">
                    <h4>Clínica</h4>
                    <a href="/consulta">Consulta médica</a>
                    <a href="/consultas">Psicologia por queixa</a>
                    <a href="/travel-clinic">Medicina do viajante</a>
                    <a href="/saudemental">Psicologia</a>
                    <a href="/equipa/rita-aguiar">A médica</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Apoio</h4>
                    <a href="/faq">FAQ</a>
                    <a href="/info.html?page=contato">Contato</a>
                    <a href="/marcar/clinica-geral">Marcar consulta</a>
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
    <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer" class="lon-wa-float" aria-label="Contactar por WhatsApp">💬</a>
    <script src="/lon-nav.js"></script>
</body>
</html>`;
}

function renderSpoke(origin, slug) {
    if (!isValidSlug(slug)) return null;
    const meta = findPage(slug);
    if (!meta) return null;

    const o = normalizeOrigin(origin);
    const format = meta.format === 'html' ? 'html' : 'markdown';
    const raw = readPageFile(slug, format);
    const extraHtml = raw ? bodyToHtml(raw, format) : '';
    const title = String(meta.h1 || meta.title || slug);
    const description = String(meta.description || '');
    const datePub = String(meta.datePublished || '');
    const dateMod = String(meta.dateModified || meta.datePublished || '');
    const canonicalPath = `/consulta/${encodeURIComponent(slug)}`;
    const bookingHref = meta.bookingHref || '/marcar/clinica-geral';
    const pages = livePages();

    const faqLd = Array.isArray(meta.faq) && meta.faq.length
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: meta.faq.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a }
            }))
        }
        : null;

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'MedicalWebPage',
            name: title,
            headline: title,
            description,
            url: `${o}${canonicalPath}`,
            datePublished: datePub || undefined,
            dateModified: dateMod || undefined,
            lastReviewed: dateMod || datePub || undefined,
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            about: {
                '@type': 'MedicalCondition',
                name: meta.condition || title
            },
            audience: { '@type': 'PeopleAudience', geographicArea: { '@type': 'Country', name: 'Portugal' } },
            ...authors.articleAuthorSchema(o)
        },
        authors.personJsonLd(o),
        {
            '@context': 'https://schema.org',
            '@type': 'Offer',
            name: title,
            url: `${o}${canonicalPath}`,
            price: String(meta.priceAmount || '').replace(/[^\d.]/g, '') || undefined,
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            seller: { '@id': `${o}/#organization` }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Consulta médica', item: `${o}/consulta` },
                { '@type': 'ListItem', position: 3, name: meta.navLabel || title, item: `${o}${canonicalPath}` }
            ]
        }
    ];
    if (faqLd) jsonLd.push(faqLd);

    const leadParas = (Array.isArray(meta.lead) ? meta.lead : [meta.lead])
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('');

    const modeLabel = meta.consultMode === 'questionnaire'
        ? 'Questionário clínico'
        : 'Sempre videoconsulta';

    const mainHtml = `
    <main id="conteudo-principal" class="cq-main">
        <article class="cq-article">
            <header class="cq-header">
                <nav class="cq-breadcrumb" aria-label="Caminho">
                    <a href="/consulta">Consulta</a>
                    <span aria-hidden="true">/</span>
                    <span>${escapeHtml(meta.navLabel || title)}</span>
                </nav>
                <p class="cq-kicker">${escapeHtml(modeLabel)} · ERS 45475</p>
                <h1>${escapeHtml(title)}</h1>
                <div class="cq-lead">${leadParas}</div>
                ${clinicianStripHtml()}
                ${authors.authorBylineHtml(o, meta.author, datePub)}
                <div class="cq-header-actions">
                    <a class="lon-btn lon-btn-dark js-consulta-cta" data-consulta-cta="spoke-hero" href="${escapeHtml(bookingHref)}">${escapeHtml(meta.bookingLabel || 'Marcar consulta')}</a>
                    <a class="lon-btn lon-btn-soft" href="#quando-nao-online">Quando não tratar online</a>
                </div>
            </header>

            <section class="cq-block" aria-labelledby="cq-sintomas-title">
                <h2 id="cq-sintomas-title">Sintomas</h2>
                ${listHtml(meta.symptoms, 'cq-list')}
            </section>

            <section class="cq-split" id="quando-nao-online" aria-labelledby="cq-online-title">
                <h2 id="cq-online-title" class="visually-hidden">Quando é seguro tratar online e quando ir à urgência</h2>
                <div class="cq-ok">
                    <h2>Quando a consulta online faz sentido</h2>
                    ${listHtml(meta.safeOnline, 'cq-list')}
                </div>
                <div class="cq-flags">
                    <h2>Quando ir a uma urgência</h2>
                    ${listHtml(meta.goToUrgent, 'cq-list')}
                    <p class="cq-flags-note">Em emergência, ligue <strong>112</strong>. Para triagem no SNS, ligue <strong>808 24 24 24</strong> (SNS 24).</p>
                </div>
            </section>

            <section class="cq-block" aria-labelledby="cq-como-title">
                <h2 id="cq-como-title">Como funciona a consulta</h2>
                ${stepsHtml(meta.howItWorks)}
            </section>

            ${bookingCardsHtml(meta, 0)}

            <section class="cq-price" aria-labelledby="cq-preco-title">
                <h2 id="cq-preco-title">Preço</h2>
                <p class="cq-price-value">${escapeHtml(meta.price || '')}</p>
                <p class="cq-price-note">${escapeHtml(meta.priceNote || '')}</p>
                <a class="lon-btn lon-btn-primary js-consulta-cta" data-consulta-cta="spoke-price" href="${escapeHtml(bookingHref)}">${escapeHtml(meta.bookingLabel || 'Marcar consulta')}</a>
            </section>

            ${extraHtml ? `<div class="cq-prose" lang="pt-PT">${extraHtml}</div>` : ''}

            ${bookingCardsHtml(meta, 1)}

            <section class="cq-block" aria-labelledby="cq-faq-title">
                <h2 id="cq-faq-title">Perguntas frequentes</h2>
                ${faqHtml(meta.faq)}
            </section>

            ${authors.authorBioHtml(o, meta.author, dateMod || datePub)}
            <p class="cq-disclaimer">Informação de carácter geral, escrita em português de Portugal — não substitui uma consulta médica individualizada. A decisão de prescrever, ou de encaminhar para avaliação presencial, é sempre clínica.</p>
            ${relatedNav(meta, pages)}
        </article>
        ${ctaBand(meta)}
    </main>`;

    return {
        html: layoutConsultaPage({
            origin: o,
            title: `${title} | Lon Clinic`,
            description,
            canonicalPath,
            ogImage: `${o}/image/image2.webp`,
            jsonLdExtra: jsonLd,
            mainHtml
        })
    };
}

function renderNotFound(origin) {
    const o = normalizeOrigin(origin);
    const mainHtml = `
    <main id="conteudo-principal">
        <div class="lon-container cq-not-found">
            <h1>Página não encontrada</h1>
            <p>Esta consulta por queixa ainda não existe ou foi movida.</p>
            <p><a class="lon-btn lon-btn-primary" href="/consulta">Voltar às consultas</a></p>
        </div>
    </main>`;
    return layoutConsultaPage({
        origin: o,
        title: 'Não encontrado | Lon Clinic',
        description: 'Página de consulta não encontrada.',
        canonicalPath: '/consulta',
        ogImage: `${o}/image/image2.webp`,
        jsonLdExtra: null,
        mainHtml,
        robots: 'noindex, follow'
    });
}

function renderHubClusterHtml() {
    const pages = livePages();
    if (!pages.length) return '';
    const cards = pages
        .map((p) => `
            <a class="cq-hub-card" href="/consulta/${encodeURIComponent(p.slug)}">
                <span class="cq-hub-price">${escapeHtml(p.price || '')}</span>
                <span class="cq-hub-label">${escapeHtml(p.navLabel || p.h1)}</span>
                <span class="cq-hub-desc">${escapeHtml(p.hubBlurb || p.description || '')}</span>
            </a>`)
        .join('');
    const extra = [
        {
            href: '/consultas',
            price: '60 €',
            label: 'Psicologia por queixa',
            desc: 'Ansiedade, pânico, burnout, casal — o cluster de psicologia já está no ar.'
        },
        {
            href: '/nutricao',
            price: '39 €',
            label: 'Nutrição por condição',
            desc: 'Pós-parto, bariátrica, Hashimoto, celíaca, intolerâncias e SOP.'
        },
        {
            href: '/tourist-clinic',
            price: '39 €',
            label: 'Tourist clinic',
            desc: 'Visitante já em Portugal, sem SNS — consulta em inglês, espanhol ou português.'
        },
        {
            href: '/travel-clinic',
            price: '39 €',
            label: 'Medicina do viajante',
            desc: 'Vacinas, malária e aconselhamento pré-viagem — página já existente.'
        }
    ]
        .map((c) => `
            <a class="cq-hub-card" href="${escapeHtml(c.href)}">
                <span class="cq-hub-price">${escapeHtml(c.price)}</span>
                <span class="cq-hub-label">${escapeHtml(c.label)}</span>
                <span class="cq-hub-desc">${escapeHtml(c.desc)}</span>
            </a>`)
        .join('');

    return `
        <section class="consulta-section cq-hub" id="por-queixa" aria-labelledby="consulta-queixa-title">
            <div class="lon-container">
                <h2 id="consulta-queixa-title">Consultas por queixa</h2>
                <p class="consulta-sub">O mesmo médico, páginas específicas: o que é, quando é seguro tratar online, e o preço à vista — sem esperar pelo checkout.</p>
                <div class="cq-hub-grid">${cards}${extra}</div>
            </div>
        </section>`;
}

module.exports = {
    escapeHtml,
    isValidSlug,
    loadManifest,
    livePages,
    renderSpoke,
    renderNotFound,
    renderHubClusterHtml
};
