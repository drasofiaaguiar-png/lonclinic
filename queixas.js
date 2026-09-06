/**
 * Lon Clinic — symptom / complaint pages (SEO + GEO).
 * Hub: /consultas · spokes: /{slug} (one URL per queixa).
 * Product/condition pages at the root — new editorial articles go to /blog/:slug.
 * Template is fixed: H1, direct answer, symptoms, when to seek help,
 * how online works, price, FAQ (FAQPage schema), CTA.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { organizationJsonLd, originOf, canonicalHref } = require('./seo');

const QUEIXAS_DIR = path.join(__dirname, 'data', 'queixas');
const MANIFEST_PATH = path.join(QUEIXAS_DIR, 'manifest.json');
const PAGES_DIR = path.join(QUEIXAS_DIR, 'pages');

const OPP_URL = 'https://www.ordemdospsicologos.pt/';
const CSS_V = '20260906c';

const PRICE = {
    avulsa: { amount: '60', label: 'Sessão avulsa', unit: 'sessão' },
    weekly: { amount: '54', label: 'Acompanhamento semanal', unit: 'semana', note: 'mínimo 1 mês; depois podes cancelar' }
};

const DEFAULT_STEPS = [
    'Preenches a triagem online — leva poucos minutos e ajuda a perceber o que precisas.',
    'És associado a um psicólogo inscrito na Ordem dos Psicólogos Portugueses, ou escolhes o profissional.',
    'A consulta é por videochamada, 100% online, no mesmo fuso de Lisboa.',
    'No plano semanal tens uma sessão de vídeo por semana e mensagens entre sessões. As respostas chegam em dias úteis, das 9h às 17h.'
];

/** One-segment paths that must never be claimed by a queixa slug. */
const RESERVED_SLUGS = new Set([
    'admin', 'api', 'blog', 'book', 'book-consultation', 'burnout', 'clinic',
    'clinic-portal', 'clinica-anti-burnout', 'anti-burnout', 'consulta', 'consultas',
    'consultancy', 'dashboard', 'diretorio', 'doctors', 'equipa', 'faq', 'guide',
    'image', 'info', 'invite', 'magazine', 'marcar', 'patient-portal', 'psicologia',
    'quiz', 'recrutamento', 'robots', 'saudemental', 'sitemap', 'teste-burnout',
    'teste-personalidade', 'travel-clinic', 'tourist-clinic', 'triagem', 'uploads', 'vendor', 'nutricao',
    'see-doctor-portugal-tourist', 'ver-medico-portugal-turista',
    'consulter-medecin-portugal-touriste', 'arzt-portugal-tourist-finden',
    'uti-portugal-what-to-do', 'infeccion-urinaria-portugal-que-hacer',
    'infection-urinaire-portugal-que-faire', 'blasenentzuendung-portugal-was-tun',
    'renew-prescription-holiday-portugal', 'renovar-receta-vacaciones-portugal',
    'renouveler-ordonnance-vacances-portugal', 'rezept-verlaengern-urlaub-portugal'
]);

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
    return originOf(url);
}

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        return { pages: [], planned: [] };
    }
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (!parsed || !Array.isArray(parsed.pages)) {
        return { pages: [], planned: [] };
    }
    return parsed;
}

function isPublished(meta) {
    return !!(meta && meta.slug && meta.status !== 'planned' && meta.status !== 'draft');
}

function publishedPages() {
    return (loadManifest().pages || []).filter((p) => isValidSlug(p.slug) && isPublished(p) && !RESERVED_SLUGS.has(p.slug));
}

function hasPublishedSlug(slug) {
    if (!isValidSlug(slug) || RESERVED_SLUGS.has(slug)) return false;
    return publishedPages().some((p) => p.slug === slug);
}

function formatReviewDate(iso) {
    const raw = String(iso || '').slice(0, 10);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const months = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const month = months[Number(m[2]) - 1];
    if (!month) return '';
    return `${Number(m[3])} de ${month} de ${m[1]}`;
}

function readPageFile(slug) {
    const filePath = path.join(PAGES_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function listHtml(items, ordered) {
    if (!Array.isArray(items) || !items.length) return '';
    const tag = ordered ? 'ol' : 'ul';
    const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    return `<${tag}>${lis}</${tag}>`;
}

function faqHtml(faq) {
    if (!Array.isArray(faq) || !faq.length) return '';
    const items = faq.map((item, i) => `
            <div class="qx-qa" id="faq-${i + 1}">
                <h3>${escapeHtml(item.q)}</h3>
                <p>${escapeHtml(item.a)}</p>
            </div>`).join('');
    return `
        <section class="qx-block" aria-labelledby="qx-faq-title">
            <h2 id="qx-faq-title">Perguntas frequentes</h2>
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

function priceHtml() {
    return `
        <section class="qx-block" id="preco" aria-labelledby="qx-price-title">
            <h2 id="qx-price-title">Preço</h2>
            <p>O preço da consulta de psicologia online na Lon Clinic é transparente: <strong>${PRICE.avulsa.amount} € por sessão avulsa</strong>, ou <strong>${PRICE.weekly.amount} € por semana</strong> no acompanhamento contínuo.</p>
            <table class="qx-price-table">
                <caption>Preço da consulta de psicologia online na Lon Clinic</caption>
                <thead>
                    <tr><th>Opção</th><th>Preço</th><th>O que inclui</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${escapeHtml(PRICE.avulsa.label)}</td>
                        <td><strong>${PRICE.avulsa.amount} €</strong> / ${escapeHtml(PRICE.avulsa.unit)}</td>
                        <td>Uma sessão de vídeo, sem compromisso de continuidade</td>
                    </tr>
                    <tr>
                        <td>${escapeHtml(PRICE.weekly.label)}</td>
                        <td><strong>${PRICE.weekly.amount} €</strong> / ${escapeHtml(PRICE.weekly.unit)}</td>
                        <td>1 sessão de vídeo por semana + mensagens ilimitadas (${escapeHtml(PRICE.weekly.note)})</td>
                    </tr>
                </tbody>
            </table>
        </section>`;
}

function stepsHtml(steps) {
    const list = Array.isArray(steps) && steps.length ? steps : DEFAULT_STEPS;
    return `
        <section class="qx-block" aria-labelledby="qx-how-title">
            <h2 id="qx-how-title">Como funciona a consulta online</h2>
            ${listHtml(list, true)}
        </section>`;
}

function ctaBand(ref, label, opts) {
    const r = encodeURIComponent(ref || 'consultas');
    const cta = escapeHtml(label || 'Começar a triagem');
    if (opts && opts.tofuTest) {
        return `
        <aside class="qx-cta-band" aria-label="Próximos passos">
            <div class="lon-container qx-cta-inner">
                <p class="qx-cta-kicker">Comece pelo quadro</p>
                <h2 class="qx-cta-title">Teste CBI no centro burnout</h2>
                <p class="qx-cta-lead">Objectiva o desgaste em 4 minutos. A consulta de psicologia nesta página mantém o preço habitual — 60 € ou 54 €/semana.</p>
                <div class="qx-cta-actions">
                    <a class="lon-btn lon-btn-primary" href="/burnout/teste?ref=${r}">Fazer o teste gratuito</a>
                    <a class="lon-btn lon-btn-soft" href="/burnout">Centro burnout</a>
                </div>
            </div>
        </aside>`;
    }
    return `
        <aside class="qx-cta-band" aria-label="Marcar consulta">
            <div class="lon-container qx-cta-inner">
                <p class="qx-cta-kicker">Próximo passo</p>
                <h2 class="qx-cta-title">Marca a consulta de psicologia online</h2>
                <p class="qx-cta-lead">A triagem leva poucos minutos. Depois escolhes o psicólogo ou deixas a equipa fazer o matching.</p>
                <div class="qx-cta-actions">
                    <a class="lon-btn lon-btn-primary" href="/triagem?ref=${r}">${cta}</a>
                    <a class="lon-btn lon-btn-soft" href="/saudemental?ref=${r}">Ver planos e preço</a>
                </div>
            </div>
        </aside>`;
}

function bookingCardsHtml(ref, tone) {
    const r = encodeURIComponent(ref || 'consultas');
    const t = Math.abs(Number(tone) || 0) % 3;
    const cards = [
        {
            chip: 'Consulta',
            title: 'Sessão de psicologia',
            price: `${PRICE.avulsa.amount} € · ${PRICE.avulsa.unit}`,
            note: 'Videochamada · psicólogo inscrito na Ordem dos Psicólogos Portugueses',
            cta: 'Marcar',
            href: `/triagem?ref=${r}`
        },
        {
            chip: 'Semanal',
            title: 'Acompanhamento semanal',
            price: `${PRICE.weekly.amount} € /${PRICE.weekly.unit}`,
            note: '1 sessão de vídeo por semana + mensagens entre sessões',
            cta: 'Ver planos',
            href: `/saudemental?ref=${r}`
        }
    ];
    const items = cards
        .map(
            (card) => `
        <article class="guide-book-card guide-book-card--t${t}">
            <p class="guide-book-chip">${escapeHtml(card.chip)}</p>
            <h3 class="guide-book-title">${escapeHtml(card.title)}</h3>
            <p class="guide-book-price">${escapeHtml(card.price)}</p>
            <p class="guide-book-note">${escapeHtml(card.note)}</p>
            <a class="guide-book-cta" href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>`
        )
        .join('');
    return `
        <aside class="guide-book" aria-label="Marcar consulta na Lon Clinic">
            <div class="guide-book-grid">${items}
            </div>
        </aside>`;
}

function relatedHtml(related, currentSlug) {
    const pages = publishedPages();
    const bySlug = new Map(pages.map((p) => [p.slug, p]));
    let items = Array.isArray(related) ? related.slice() : [];
    if (!items.length) {
        items = pages
            .filter((p) => p.slug !== currentSlug)
            .slice(0, 4)
            .map((p) => ({ href: `/${p.slug}`, label: p.navLabel || p.h1 || p.title }));
    }
    const lis = items.map((item) => {
        const href = item.href || (item.slug ? `/${item.slug}` : '');
        if (!href) return '';
        const label = item.label || (bySlug.get(item.slug) || {}).navLabel || href;
        return `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`;
    }).join('');
    if (!lis) return '';
    return `
        <nav class="qx-related" aria-label="Páginas relacionadas">
            <h2>Consultas relacionadas</h2>
            <ul>${lis}</ul>
        </nav>`;
}

function bylineHtml(dateIso) {
    const iso = String(dateIso || '').slice(0, 10);
    const label = formatReviewDate(iso);
    const time = iso && label
        ? `<time datetime="${escapeHtml(iso)}">${escapeHtml(label)}</time>`
        : '';
    const dateBit = time ? `${time}<span aria-hidden="true"> · </span>` : '';
    return `
        <p class="eeat-byline qx-byline">
            ${dateBit}<span>Psicólogos inscritos na <a href="${OPP_URL}" target="_blank" rel="noopener noreferrer">Ordem dos Psicólogos Portugueses</a></span>
            <span class="eeat-byline-review"> · Revisão clínica Lon Clinic · ERS n.º 45475</span>
        </p>`;
}

function footerNav(pages) {
    const links = pages
        .slice(0, 12)
        .map((p) => `<a href="/${encodeURIComponent(p.slug)}">${escapeHtml(p.navLabel || p.title)}</a>`)
        .join('\n                    ');
    return links;
}

function layoutQueixaPage(opts) {
    const {
        origin,
        title,
        description,
        canonicalPath,
        ogImage,
        jsonLdExtra,
        mainHtml,
        robots,
        dateModified
    } = opts;

    const canonicalUrl = canonicalHref(canonicalPath);
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const og = escapeHtml(ogImage || `${origin}/image/image3.webp`);
    const graph = Array.isArray(jsonLdExtra) ? jsonLdExtra : (jsonLdExtra ? [jsonLdExtra] : []);
    if (!robots || !/^noindex/i.test(robots)) {
        graph.push(organizationJsonLd(origin));
    }
    const ldScripts = graph
        .map((block) => `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`)
        .join('\n');
    const pages = publishedPages();
    const modIso = dateModified ? String(dateModified).slice(0, 10) : '';

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
    <meta name="robots" content="${escapeHtml(robots || 'index,follow,max-image-preview:large')}">
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
    <link rel="stylesheet" href="/queixas.css?v=${CSS_V}">
    <link rel="stylesheet" href="/author.css?v=20260820e">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${ldScripts}
</head>
<body class="lon-landing qx-body">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/saudemental" class="lon-logo" aria-label="LON Clinic Psicologia">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/consultas" aria-current="page">Consultas</a>
                <a href="/saudemental">Psicologia</a>
                <a href="/burnout">Burnout</a>
                <a href="/triagem">Triagem</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/triagem?ref=consultas-nav" class="lon-btn lon-btn-primary lon-btn-sm">Marcar consulta</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/consultas">Consultas por queixa</a>
            <a href="/saudemental">Psicologia online</a>
            <a href="/burnout">Centro burnout</a>
            <a href="/triagem">Triagem</a>
            <a href="/patient-portal">Login</a>
            <a href="/triagem?ref=consultas-nav-mobile">Marcar consulta</a>
        </div>
    </header>
    ${mainHtml}
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>Consulta de psicologia online em português — por queixa, não genérica.</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                </div>
                <div class="lon-footer-col">
                    <h4>Consultas</h4>
                    <a href="/consultas">Todas as queixas</a>
                    ${footerNav(pages)}
                </div>
                <div class="lon-footer-col">
                    <h4>Psicologia</h4>
                    <a href="/saudemental">Planos e preço</a>
                    <a href="/triagem">Triagem</a>
                    <a href="/teste-personalidade">Teste de personalidade</a>
                    <a href="/burnout">Centro burnout</a>
                    <a href="/nutricao">Nutrição por condição</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Clínica</h4>
                    <a href="/equipa/rita-aguiar">A médica</a>
                    <a href="/faq">FAQ</a>
                    <a href="/info.html?page=contato">Contato</a>
                    <a href="https://www.ordemdospsicologos.pt/" target="_blank" rel="noopener noreferrer">Ordem dos Psicólogos</a>
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
    <script src="/i18n.js?v=20260905e" defer></script>
    <script src="/lon-analytics.js?v=20260906h" defer></script>
    <script src="/reviews.js?v=20260905e" defer></script>
    <script src="/lon-slots.js?v=20260906d" defer></script>
</body>
</html>`;
}

function groupLabel(group) {
    const map = {
        ansiedade: 'Ansiedade',
        humor: 'Humor e esgotamento',
        relacoes: 'Relações',
        trabalho: 'Trabalho e carreira',
        diaspora: 'Emigração',
        outros: 'Outros'
    };
    return map[group] || 'Consultas';
}

function renderHub(origin) {
    const o = normalizeOrigin(origin);
    const pages = publishedPages();
    const groups = [];
    const seen = new Set();
    for (const p of pages) {
        const g = p.group || 'outros';
        if (!seen.has(g)) {
            seen.add(g);
            groups.push(g);
        }
    }

    const sections = groups.map((g) => {
        const cards = pages
            .filter((p) => (p.group || 'outros') === g)
            .map((p) => `
            <a class="qx-card" href="/${encodeURIComponent(p.slug)}">
                <span class="qx-card-label">${escapeHtml(p.navLabel || p.title)}</span>
                <span class="qx-card-desc">${escapeHtml(p.description || '')}</span>
            </a>`)
            .join('');
        return `
        <section class="qx-section" aria-labelledby="qx-g-${escapeHtml(g)}">
            <div class="lon-container">
                <h2 id="qx-g-${escapeHtml(g)}">${escapeHtml(groupLabel(g))}</h2>
                <div class="qx-card-grid">${cards}</div>
            </div>
        </section>`;
    }).join('');

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Consultas de psicologia por queixa | Lon Clinic',
            description: 'Consulta de psicologia online em Portugal, organizada por queixa: ansiedade no trabalho, burnout, terapia de casal, ataques de pânico e psicólogo português no estrangeiro.',
            url: `${o}/consultas`,
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            hasPart: pages.map((p) => ({
                '@type': 'MedicalWebPage',
                name: p.h1 || p.title,
                url: `${o}/${encodeURIComponent(p.slug)}`
            }))
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Psicologia', item: `${o}/saudemental` },
                { '@type': 'ListItem', position: 3, name: 'Consultas', item: `${o}/consultas` }
            ]
        }
    ];

    const mainHtml = `
    <main id="conteudo-principal">
        <section class="qx-hero" aria-labelledby="qx-hub-title">
            <div class="lon-container qx-hero-inner">
                <p class="qx-eyebrow">LON Clinic · Psicologia online</p>
                <h1 id="qx-hub-title">Consulta de psicologia online, por queixa</h1>
                <p class="qx-lead">A Lon Clinic oferece consulta de psicologia online em português para queixas específicas — não uma página genérica de «psicólogo online». Cada página explica o que é, quando procurar ajuda, como funciona e quanto custa.</p>
                <p class="qx-hero-meta">Psicólogos inscritos na Ordem dos Psicólogos Portugueses · 60 €/sessão ou 54 €/semana</p>
                <div class="qx-hero-actions">
                    <a class="lon-btn lon-btn-primary" href="/triagem?ref=consultas-hub">Começar a triagem</a>
                    <a class="lon-btn lon-btn-soft" href="/saudemental?ref=consultas-hub">Ver planos</a>
                </div>
            </div>
        </section>
        ${sections}
        <div class="lon-container">${bookingCardsHtml('consultas-hub', 0)}</div>
        ${ctaBand('consultas-hub')}
    </main>`;

    return layoutQueixaPage({
        origin: o,
        title: 'Consultas de psicologia por queixa | Lon Clinic',
        description: 'Psicologia online em Portugal por queixa: ansiedade no trabalho, burnout, terapia de casal, ataques de pânico e psicólogo português no estrangeiro. Preço a partir de 60 €.',
        canonicalPath: '/consultas',
        ogImage: `${o}/image/image3.webp`,
        jsonLdExtra: jsonLd,
        mainHtml
    });
}

function serviceJsonLd(o, meta, canonicalUrl) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: meta.serviceName || meta.h1 || meta.title,
        serviceType: 'Psychotherapy',
        description: meta.answer || meta.description,
        url: canonicalUrl,
        provider: { '@id': `${o}/#organization` },
        areaServed: [
            { '@type': 'Country', name: 'Portugal' },
            { '@type': 'Country', name: 'Switzerland' },
            { '@type': 'Country', name: 'Luxembourg' }
        ],
        availableChannel: {
            '@type': 'ServiceChannel',
            serviceUrl: `${o}/triagem`,
            availableLanguage: ['pt', 'pt-PT']
        },
        offers: [
            {
                '@type': 'Offer',
                name: PRICE.avulsa.label,
                price: PRICE.avulsa.amount,
                priceCurrency: 'EUR',
                availability: 'https://schema.org/InStock'
            },
            {
                '@type': 'Offer',
                name: PRICE.weekly.label,
                price: PRICE.weekly.amount,
                priceCurrency: 'EUR',
                unitText: 'WEEK',
                availability: 'https://schema.org/InStock'
            }
        ]
    };
}

function renderPage(origin, slug) {
    if (!hasPublishedSlug(slug)) return null;
    const o = normalizeOrigin(origin);
    const meta = publishedPages().find((p) => p.slug === slug);
    if (!meta) return null;

    const raw = readPageFile(slug);
    const extraHtml = raw ? marked.parse(raw) : '';
    const h1 = String(meta.h1 || meta.title || slug);
    const answer = String(meta.answer || meta.description || '');
    const description = String(meta.description || answer);
    const datePub = String(meta.datePublished || '');
    const dateMod = String(meta.dateModified || meta.datePublished || '');
    const canonicalPath = `/${encodeURIComponent(slug)}`;
    const canonicalUrl = canonicalHref(canonicalPath);
    const ref = `queixa-${slug}`;
    const isBurnoutPsi = slug === 'psicologia-burnout';
    const conditionName = meta.condition || meta.navLabel || h1;

    const about = meta.schemaType === 'service'
        ? { '@type': 'Thing', name: conditionName }
        : { '@type': 'MedicalCondition', name: conditionName };

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
            about,
            specialty: { '@type': 'MedicalSpecialty', name: 'Clinical Psychology' },
            audience: { '@type': 'PeopleAudience', geographicArea: { '@type': 'Country', name: 'Portugal' } },
            reviewedBy: { '@id': `${o}/#organization` },
            publisher: { '@id': `${o}/#organization` },
            mainEntity: { '@id': `${canonicalUrl}#service` }
        },
        { ...serviceJsonLd(o, meta, canonicalUrl), '@id': `${canonicalUrl}#service` },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Psicologia', item: `${o}/saudemental` },
                { '@type': 'ListItem', position: 3, name: 'Consultas', item: `${o}/consultas` },
                { '@type': 'ListItem', position: 4, name: meta.navLabel || h1, item: canonicalUrl }
            ]
        }
    ];
    const faqLd = faqJsonLd(meta.faq);
    if (faqLd) jsonLd.push(faqLd);

    const extraBlock = extraHtml
        ? `<section class="qx-block qx-extra" aria-label="Para perceber melhor"><div class="qx-prose">${extraHtml}</div></section>`
        : '';

    const mainHtml = `
    <main id="conteudo-principal" class="qx-article-main">
        <article class="qx-article">
            <header class="qx-article-header">
                <nav class="qx-breadcrumb" aria-label="Caminho">
                    <a href="/saudemental">Psicologia</a>
                    <span aria-hidden="true">/</span>
                    <a href="/consultas">Consultas</a>
                    <span aria-hidden="true">/</span>
                    <span>${escapeHtml(meta.navLabel || h1)}</span>
                </nav>
                <h1>${escapeHtml(h1)}</h1>
                <p class="qx-answer">${escapeHtml(answer)}</p>
                ${isBurnoutPsi
                    ? `<p class="qx-cbi-support">Quer avaliar o seu nível atual de exaustão? <a href="/burnout/teste?ref=${encodeURIComponent(ref)}">Faça o nosso Teste CBI de Burnout gratuito</a>.</p>`
                    : ''}
                ${bylineHtml(dateMod || datePub)}
                <div class="qx-article-actions">
                    ${isBurnoutPsi
                        ? `<a class="lon-btn lon-btn-primary lon-btn-sm" href="/burnout/teste?ref=${encodeURIComponent(ref)}">Fazer o teste CBI</a>
                    <a class="lon-btn lon-btn-soft lon-btn-sm" href="/triagem?ref=${encodeURIComponent(ref)}">Marcar consulta</a>`
                        : `<a class="lon-btn lon-btn-primary lon-btn-sm" href="/triagem?ref=${encodeURIComponent(ref)}">Marcar consulta</a>
                    <a class="lon-btn lon-btn-soft lon-btn-sm" href="#preco">Ver preço</a>`}
                </div>
            </header>

            <section class="qx-block" aria-labelledby="qx-symptoms-title">
                <h2 id="qx-symptoms-title">Sintomas</h2>
                ${listHtml(meta.symptoms || [], false)}
            </section>

            <section class="qx-block" aria-labelledby="qx-when-title">
                <h2 id="qx-when-title">Quando procurar ajuda</h2>
                ${listHtml(meta.whenToSeek || [], false)}
            </section>

            ${bookingCardsHtml(ref, 0)}

            ${extraBlock}
            ${stepsHtml(meta.steps)}
            ${bookingCardsHtml(ref, 1)}
            ${priceHtml()}
            ${faqHtml(meta.faq)}

            <p class="eeat-reviewed">Conteúdo revisto pela Lon Clinic. O acompanhamento é feito por psicólogos inscritos na Ordem dos Psicólogos Portugueses. ERS n.º 45475${dateMod || datePub ? ` · <time datetime="${escapeHtml(String(dateMod || datePub).slice(0, 10))}">${escapeHtml(formatReviewDate(dateMod || datePub))}</time>` : ''}.</p>
            <p class="qx-disclaimer">Esta página não faz diagnóstico. A informação é geral e não substitui uma consulta de psicologia individualizada. Em crise ou risco imediato: <a href="tel:112">112</a> · <a href="tel:808242424">SNS 24</a> · <a href="tel:213544545">SOS Voz Amiga</a>.</p>
            ${relatedHtml(meta.related, slug)}
        </article>
        ${ctaBand(ref, meta.ctaLabel, { tofuTest: isBurnoutPsi })}
    </main>`;

    const title = String(meta.title || `${h1} | Lon Clinic`);

    return {
        html: layoutQueixaPage({
            origin: o,
            title,
            description,
            canonicalPath,
            ogImage: `${o}/image/image3.webp`,
            jsonLdExtra: jsonLd,
            mainHtml,
            dateModified: dateMod
        })
    };
}

function renderNotFound(origin) {
    const o = normalizeOrigin(origin);
    const mainHtml = `
    <main id="conteudo-principal">
        <div class="lon-container qx-not-found">
            <h1>Página não encontrada</h1>
            <p>Esta consulta não existe ou foi movida.</p>
            <p><a class="lon-btn lon-btn-primary" href="/consultas">Ver consultas por queixa</a></p>
        </div>
    </main>`;
    return layoutQueixaPage({
        origin: o,
        title: 'Não encontrado | Lon Clinic',
        description: 'Página de consulta não encontrada.',
        canonicalPath: '/consultas',
        ogImage: `${o}/image/image3.webp`,
        jsonLdExtra: null,
        mainHtml,
        robots: 'noindex, follow'
    });
}

module.exports = {
    PRICE,
    DEFAULT_STEPS,
    RESERVED_SLUGS,
    escapeHtml,
    isValidSlug,
    hasPublishedSlug,
    loadManifest,
    publishedPages,
    renderHub,
    renderPage,
    renderNotFound
};
