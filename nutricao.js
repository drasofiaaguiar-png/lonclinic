/**
 * Lon Clinic — nutrition cluster (/nutricao + /nutricao/:slug).
 * Service/condition fichas only — not magazine articles (those go to /blog/:slug).
 * Same GEO template as psychology/medical queixas: H1, direct answer,
 * who it's for, red flags, how it works, price, psychology bridge, FAQ, CTA.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { organizationJsonLd, originOf, canonicalHref } = require('./seo');
const authors = require('./authors');

const NUTRICAO_DIR = path.join(__dirname, 'data', 'nutricao');
const MANIFEST_PATH = path.join(NUTRICAO_DIR, 'manifest.json');
const PAGES_DIR = path.join(NUTRICAO_DIR, 'pages');
const CSS_V = '20260905j';
const SLOTS_V = '20260906d';
const ON_URL = 'https://www.ordemdosnutricionistas.pt/';
const NUTRICAO_PROGRAMA_HREF = '/marcar/nutricao-programa';
const WEIGHT_LOSS_SLUGS = new Set(['glp-1', 'ozempic-wegovy']);

const DEFAULT_BRING = [
    'Últimas análises que tiveres (não precisas de as repetir só para marcar)',
    'Lista de medicação e suplementos, com doses',
    'Um dia típico de refeições — notas ou fotos chegam; não é obrigatório um diário de 7 dias',
    'Relatórios de cirurgia, endoscopia ou consulta anterior, se existirem'
];

const DEFAULT_CHANGES = [
    'Sais da primeira sessão com 2 a 4 mudanças concretas para as semanas seguintes — não um PDF genérico de 30 páginas',
    'Follow-up só quando fizer sentido: é uma nova consulta, sem pacote obrigatório nem fidelização',
    'Prazos realistas: hábitos mudam em semanas; sintomas crónicos e análises em meses, não em sete dias'
];

function clinicConfig() {
    const m = loadManifest();
    return m.clinic && typeof m.clinic === 'object' ? m.clinic : {};
}

function isWeightLossPage(meta) {
    if (!meta) return false;
    if (meta.pillar === 'weight-loss' || meta.slotService === 'nutricao_programa') return true;
    return WEIGHT_LOSS_SLUGS.has(meta.slug) || (Array.isArray(meta.aliases) && meta.aliases.some((a) => WEIGHT_LOSS_SLUGS.has(a)));
}

function nutritionTeamLabel() {
    const c = clinicConfig();
    return String(c.nutritionTeamLabel || '').trim() || 'Equipa de nutrição Lon Clinic';
}

function nutritionBylineHtml(dateIso) {
    const c = clinicConfig();
    const name = String(c.nutritionistName || '').trim();
    const cedula = String(c.nutritionistCedula || '').trim();
    const team = nutritionTeamLabel();
    const iso = String(dateIso || '').slice(0, 10);
    const dateBit = iso
        ? `<time datetime="${escapeHtml(iso)}">${escapeHtml(iso)}</time><span aria-hidden="true"> · </span>`
        : '';
    const reviewer = authors.getAuthor(c.reviewer || 'rita-aguiar');
    const href = c.nutritionistHref ? escapeHtml(c.nutritionistHref) : ON_URL;
    if (name && cedula) {
        return `
        <p class="eeat-byline nu-byline">
            ${dateBit}<strong>${escapeHtml(name)}</strong>
            <span> · ${escapeHtml(c.nutritionistJobTitle || 'Nutricionista')} · Cédula n.º ${escapeHtml(cedula)}</span>
            <span class="eeat-byline-review"> · <a href="${href}" target="_blank" rel="noopener noreferrer">Ordem dos Nutricionistas</a> · Revisão médica: ${escapeHtml(reviewer.displayName)} · ERS n.º 45475</span>
        </p>`;
    }
    return `
        <p class="eeat-byline nu-byline">
            ${dateBit}<strong>${escapeHtml(team)}</strong>
            <span> · Acompanhamento nutricional e comportamental</span>
            <span class="eeat-byline-review"> · Revisão médica: ${escapeHtml(reviewer.displayName)} · ERS n.º 45475</span>
        </p>
        <p class="nu-cedula-note" data-nutritionist-cedula-todo="1">A nutrição é uma profissão regulada em Portugal pela <a href="${ON_URL}" target="_blank" rel="noopener noreferrer">Ordem dos Nutricionistas</a>. Esta página é da <strong>${escapeHtml(team)}</strong> — a cédula profissional (nome + n.º de cédula) será publicada nesta linha assim que o nutricionista estiver identificado. Não inventamos credenciais. <!-- TODO clinic.nutritionistName + clinic.nutritionistCedula --></p>`;
}

function nutritionAuthorSchema(origin) {
    const o = normalizeOrigin(origin);
    const c = clinicConfig();
    const name = String(c.nutritionistName || '').trim();
    const cedula = String(c.nutritionistCedula || '').trim();
    const reviewer = authors.articleAuthorSchema(o, c.reviewer || 'rita-aguiar');
    if (name && cedula) {
        return {
            author: {
                '@type': 'Person',
                name,
                jobTitle: c.nutritionistJobTitle || 'Nutricionista',
                identifier: { '@type': 'PropertyValue', name: 'Cédula Ordem dos Nutricionistas', value: cedula }
            },
            reviewedBy: reviewer.reviewedBy,
            publisher: reviewer.publisher,
            copyrightHolder: reviewer.copyrightHolder
        };
    }
    return {
        author: { '@type': 'Organization', name: nutritionTeamLabel(), url: `${o}/nutricao` },
        reviewedBy: reviewer.reviewedBy,
        publisher: reviewer.publisher,
        copyrightHolder: reviewer.copyrightHolder
    };
}

marked.use({ mangle: false, headerIds: true, gfm: true, breaks: true });

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
    if (!fs.existsSync(MANIFEST_PATH)) return { pages: [], planned: [] };
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (!parsed || !Array.isArray(parsed.pages)) return { pages: [], planned: [] };
    return parsed;
}

function isLive(meta) {
    return !!(meta && meta.slug && meta.status !== 'planned' && meta.status !== 'draft');
}

function livePages() {
    return (loadManifest().pages || []).filter((p) => isValidSlug(p.slug) && isLive(p));
}

function findPage(slug) {
    const pages = livePages();
    const direct = pages.find((p) => p.slug === slug);
    if (direct) return direct;
    return pages.find((p) => Array.isArray(p.aliases) && p.aliases.indexOf(slug) !== -1) || null;
}

function readPageFile(slug) {
    const filePath = path.join(PAGES_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function pageMarkdown(requestedSlug, meta) {
    return readPageFile(requestedSlug) || (meta && meta.slug ? readPageFile(meta.slug) : null);
}

function listHtml(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function stepsHtml(steps) {
    if (!Array.isArray(steps) || !steps.length) return '';
    const items = steps.map((step, i) => {
        if (typeof step === 'string') return `<li>${escapeHtml(step)}</li>`;
        return `<li><strong>${escapeHtml(step.title || `Passo ${i + 1}`)}.</strong> ${escapeHtml(step.text || '')}</li>`;
    }).join('');
    return `<ol>${items}</ol>`;
}

function faqHtml(faq) {
    if (!Array.isArray(faq) || !faq.length) return '';
    const items = faq.map((item, i) => `
            <div class="nu-qa" id="faq-${i + 1}">
                <h3>${escapeHtml(item.q)}</h3>
                <p>${escapeHtml(item.a)}</p>
            </div>`).join('');
    return `<div class="nu-faq">${items}</div>`;
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

function psychologyBridgeHtml(bridge) {
    if (!bridge || !bridge.href) return '';
    return `
        <aside class="nu-bridge" aria-labelledby="nu-bridge-title">
            <p class="nu-bridge-kicker">Cruzamento com psicologia</p>
            <h2 id="nu-bridge-title">${escapeHtml(bridge.title || 'O stress também conta')}</h2>
            <p>${escapeHtml(bridge.text || '')}</p>
            <p><a class="lon-btn lon-btn-soft lon-btn-sm" href="${escapeHtml(bridge.href)}">${escapeHtml(bridge.label || 'Ver acompanhamento psicológico')}</a></p>
        </aside>`;
}

function bookingCardsHtml(meta, tone) {
    const weightLoss = isWeightLossPage(meta);
    const primaryHref = meta.bookingHref || (weightLoss ? `${NUTRICAO_PROGRAMA_HREF}?ref=nutricao-${meta.slug || 'hub'}` : '/marcar/clinica-geral');
    const isLongevidade = String(primaryHref).indexOf('/marcar/longevidade') !== -1;
    const t = Math.abs(Number(tone) || 0) % 3;
    const cards = [
        weightLoss
            ? {
                chip: 'Programa mensal',
                title: 'Consulta inicial de nutrição metabólica',
                price: meta.price || '115 €',
                note: 'Arranque do programa — 2 consultas/mês, chat no portal e ajustes quinzenais. Sem prescrição de aGLP-1.',
                cta: 'Marcar consulta inicial',
                href: primaryHref,
                track: 'nutricao-card-book'
            }
            : {
                chip: isLongevidade ? 'Longevidade' : 'Nutrição',
                title: isLongevidade ? 'Consulta de longevidade' : 'Orientação nutricional online',
                price: meta.price || (isLongevidade ? '79 €' : '39 €'),
                note: 'Videoconsulta · reeducação alimentar nesta sessão, não um PDF genérico nem receita de emagrecimento',
                cta: 'Marcar',
                href: primaryHref,
                track: 'nutricao-card-book'
            },
        {
            chip: 'Psicologia',
            title: 'Consulta de psicologia',
            price: '60 € ou 54 €/semana',
            note: 'Hábitos, stress e imagem corporal — se fizer sentido',
            cta: 'Triagem',
            href: `/triagem?ref=${encodeURIComponent(`nutricao-${meta.slug || 'hub'}`)}`,
            track: 'nutricao-card-psych'
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
            <a class="guide-book-cta js-consulta-cta" data-consulta-cta="${escapeHtml(card.track)}" href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>`
        )
        .join('');
    return `
        <aside class="guide-book" aria-label="Marcar consulta na Lon Clinic">
            <div class="guide-book-grid">${items}
            </div>
        </aside>`;
}

function relatedHtml(related, pages, currentSlug) {
    const bySlug = new Map(pages.map((p) => [p.slug, p]));
    let items = Array.isArray(related) ? related.slice() : [];
    if (!items.length) {
        items = pages.filter((p) => p.slug !== currentSlug).slice(0, 4).map((p) => ({
            href: `/nutricao/${p.slug}`,
            label: p.navLabel || p.h1
        }));
    }
    const lis = items.map((item) => {
        if (typeof item === 'string') {
            const p = bySlug.get(item);
            if (!p) return '';
            return `<li><a href="/nutricao/${encodeURIComponent(p.slug)}">${escapeHtml(p.navLabel || p.h1)}</a></li>`;
        }
        if (!item || !item.href) return '';
        return `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label || item.href)}</a></li>`;
    }).join('');
    if (!lis) return '';
    return `
        <nav class="nu-related" aria-label="Páginas relacionadas">
            <h2>Continuar a ler</h2>
            <ul>${lis}</ul>
        </nav>`;
}

function groupLabel(group) {
    return {
        peso: 'Peso e composição corporal',
        mulher: 'Saúde da mulher e ciclo de vida',
        cirurgico: 'Cirurgia e metabolismo',
        metabolico: 'Doenças metabólicas',
        autoimune: 'Doença autoimune',
        digestivo: 'Digestivo',
        intolerancias: 'Intolerâncias alimentares',
        desporto: 'Desporto e performance',
        estilo: 'Alimentação por escolha',
        nicho: 'Nicho emergente'
    }[group] || 'Nutrição';
}

function formatTableHtml(meta) {
    const rows = Array.isArray(meta.formats) && meta.formats.length
        ? meta.formats
        : isWeightLossPage(meta)
            ? [
                { name: 'Consulta inicial de nutrição metabólica', includes: 'Mês 1 do programa mensal — diagnóstico alimentar, plano e arranque do acompanhamento', price: meta.price || '115 €' },
                { name: 'Mensalidade contínua', includes: '2 consultas com nutricionista + chat no portal + ajustes quinzenais do plano', price: '75 €/mês' },
                { name: 'Programa completo (opcional)', includes: 'Nutrição + 12 sessões de psicologia em 6 meses', price: '227 € no mês 1' }
            ]
            : [
                { name: 'Consulta única', includes: 'Avaliação + orientações concretas nessa sessão (não um plano PDF genérico)', price: meta.price || '39 €' },
                { name: 'Follow-up', includes: 'Nova videoconsulta, marcada só se fizer sentido — sem pacote obrigatório', price: meta.followUpPrice || meta.price || '39 €' },
                { name: 'Psicologia (opcional)', includes: 'Stress, ansiedade, hábitos e imagem corporal', price: '60 € ou 54 €/semana' }
            ];
    const tr = rows.map((row) => `
                    <tr>
                        <td>${escapeHtml(row.name)}</td>
                        <td>${escapeHtml(row.includes)}</td>
                        <td><strong>${escapeHtml(row.price)}</strong></td>
                    </tr>`).join('');
    return `
            <table class="nu-format-table">
                <caption>O que recebes — consulta única versus acompanhamento</caption>
                <thead>
                    <tr><th>Formato</th><th>O que inclui</th><th>Preço</th></tr>
                </thead>
                <tbody>${tr}
                </tbody>
            </table>`;
}

function layoutPage(opts) {
    const {
        origin, title, description, canonicalPath, ogImage, jsonLdExtra, mainHtml, robots, dateModified
    } = opts;
    const canonicalUrl = canonicalHref(canonicalPath);
    const pages = livePages();
    const graph = Array.isArray(jsonLdExtra) ? jsonLdExtra : jsonLdExtra ? [jsonLdExtra] : [];
    if (!robots || !/^noindex/i.test(robots)) graph.push(organizationJsonLd(origin));
    const ldScripts = graph
        .map((block) => `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`)
        .join('\n');
    const footerLinks = pages
        .map((p) => `<a href="/nutricao/${encodeURIComponent(p.slug)}">${escapeHtml(p.navLabel || p.h1)}</a>`)
        .join('\n                    ');
    const modIso = dateModified ? String(dateModified).slice(0, 10) : '';
    const og = escapeHtml(ogImage || `${origin}/image/image2.webp`);

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
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="${escapeHtml(robots || 'index,follow,max-image-preview:large')}">
    <meta name="author" content="${escapeHtml(authors.getAuthor().displayName)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:image" content="${og}">
    ${modIso ? `<meta property="article:modified_time" content="${escapeHtml(modIso)}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#4A7C6F">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260621b">
    <link rel="stylesheet" href="/consulta-pages.css?v=20260820b">
    <link rel="stylesheet" href="/nutricao.css?v=${CSS_V}">
    <link rel="stylesheet" href="/author.css?v=20260820e">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${ldScripts}
</head>
<body class="lon-landing cq-body nu-body">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/nutricao" aria-current="page">Nutrição</a>
                <a href="/nutricao/programa">Reeducação metabólica</a>
                <a href="/nutricao/testes">Testes</a>
                <a href="/consulta">Consulta médica</a>
                <a href="/consultas">Psicologia</a>
                <a href="/saudemental">Planos</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/nutricao/programa" class="lon-btn lon-btn-primary lon-btn-sm">Ver o programa</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/nutricao">Nutrição por condição</a>
            <a href="/nutricao/programa">Programa de reeducação metabólica</a>
            <a href="/nutricao/testes">Testes clínicos</a>
            <a href="/consulta">Consulta médica</a>
            <a href="/consultas">Psicologia por queixa</a>
            <a href="/marcar/nutricao-programa?ref=nutricao-nav-mobile">Consulta inicial de nutrição</a>
        </div>
    </header>
    ${mainHtml}
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>Reeducação nutricional e acompanhamento personalizado — por condição, não um PDF genérico nem receita de emagrecimento.</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                </div>
                <div class="lon-footer-col">
                    <h4>Nutrição</h4>
                    <a href="/nutricao">Todas as condições</a>
                    <a href="/nutricao/programa">Programa de reeducação metabólica</a>
                    <a href="/nutricao/testes">Testes clínicos</a>
                    ${footerLinks}
                </div>
                <div class="lon-footer-col">
                    <h4>Clínica</h4>
                    <a href="/consulta">Consulta médica</a>
                    <a href="/consultas">Psicologia</a>
                    <a href="/equipa/rita-aguiar">A médica</a>
                    <a href="/marcar/nutricao-programa">Consulta inicial de nutrição · 115 €</a>
                    <a href="/marcar/clinica-geral">Clínica geral · 39 €</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Apoio</h4>
                    <a href="/faq">FAQ</a>
                    <a href="/info.html?page=contato">Contato</a>
                </div>
            </div>
            <div class="lon-footer-bottom">
                <div class="lon-footer-legal-links">
                    <a href="/info.html?page=termos-condicoes">Termos</a>
                    <a href="/info.html?page=politica-privacidade">Privacidade</a>
                </div>
                <div><p>© 2026 Lon Clinic · Portugal</p></div>
            </div>
        </div>
    </footer>
    <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer" class="lon-wa-float" aria-label="Contactar por WhatsApp">💬</a>
    <script src="/lon-nav.js"></script>
    <script src="/i18n.js?v=20260906c" defer></script>
    <script src="/lon-analytics.js?v=20260905e" defer></script>
    <script src="/reviews.js?v=20260905e" defer></script>
    <script src="/lon-slots.js?v=${SLOTS_V}" defer></script>
</body>
</html>`;
}

function renderHub(origin) {
    const o = normalizeOrigin(origin);
    const pages = livePages();
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
        const cards = pages.filter((p) => (p.group || 'outros') === g).map((p) => `
            <a class="nu-card" href="/nutricao/${encodeURIComponent(p.slug)}">
                <span class="nu-card-price">${escapeHtml(p.price || '')}</span>
                <span class="nu-card-label">${escapeHtml(p.navLabel || p.h1)}</span>
                <span class="nu-card-desc">${escapeHtml(p.hubBlurb || p.description || '')}</span>
            </a>`).join('');
        return `
        <section class="nu-section" aria-labelledby="nu-g-${escapeHtml(g)}">
            <div class="lon-container">
                <h2 id="nu-g-${escapeHtml(g)}">${escapeHtml(groupLabel(g))}</h2>
                <div class="nu-card-grid">${cards}</div>
            </div>
        </section>`;
    }).join('');

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Nutrição online por condição | Lon Clinic',
            description: 'Reeducação nutricional e acompanhamento personalizado por condição: pós-parto, bariátrica, diabetes tipo 2, SOP e transição após aGLP-1.',
            url: `${o}/nutricao`,
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            hasPart: pages.map((p) => ({
                '@type': 'MedicalWebPage',
                name: p.h1,
                url: `${o}/nutricao/${encodeURIComponent(p.slug)}`
            }))
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Nutrição', item: `${o}/nutricao` }
            ]
        }
    ];

    const mainHtml = `
    <main id="conteudo-principal">
        <section class="nu-hero">
            <div class="lon-container nu-hero-inner">
                <p class="cq-kicker">LON Clinic · Reeducação nutricional</p>
                <h1>Nutrição online para mudar o hábito — não para vender uma receita</h1>
                <p class="nu-lead">A Lon Clinic não prescreve aGLP-1 (Ozempic, Wegovy) para perda de peso. O produto de peso é um programa nutricional e comportamental: reeducação metabólica, saciedade natural e acompanhamento contínuo para evitar o efeito ioiô. Há também fichas por condição (pós-parto, bariátrica, diabetes tipo 2, Hashimoto, celíaca, FODMAP, SOP) — orientação alimentar, não consulta para medicamento de emagrecimento.</p>
                <p class="nu-hero-meta">Programa mensal a partir de 115 € · 2 consultas/mês + chat no portal · Psicologia quando o stress manda na comida</p>
                <div class="nu-hero-actions">
                    <a class="lon-btn lon-btn-primary" href="/marcar/nutricao-programa?ref=nutricao-hub">Consulta inicial de nutrição metabólica — 115 €</a>
                    <a class="lon-btn lon-btn-soft" href="/nutricao/programa">Programa 3 a 6 meses</a>
                    <a class="lon-btn lon-btn-soft" href="/nutricao/testes">Fazer um teste gratuito</a>
                </div>
            </div>
        </section>
        <section class="nu-section" aria-labelledby="nu-g-programa">
            <div class="lon-container">
                <h2 id="nu-g-programa">Programa de Reeducação Metabólica &amp; Perda de Peso</h2>
                <a class="nu-card nu-card-feature" href="/nutricao/programa">
                    <span class="nu-card-price">115 € no mês 1 · depois 75 €/mês</span>
                    <span class="nu-card-label">3 a 6 meses — hábitos, não a caneta</span>
                    <span class="nu-card-desc">Duas consultas/mês com nutricionista, chat no portal e ajustes quinzenais do plano. Contra o ioiô das clínicas que vendem aGLP-1 sem estrutura. Fidelização 3 meses.</span>
                </a>
            </div>
        </section>
        <section class="nu-section" aria-labelledby="nu-g-testes">
            <div class="lon-container">
                <h2 id="nu-g-testes">Testes de alimentação e metabolismo</h2>
                <div class="nu-card-grid">
                    <a class="nu-card" href="/nutricao/avaliacao"><span class="nu-card-price">2 min</span><span class="nu-card-label">Avaliação do programa</span><span class="nu-card-desc">6 passos: objetivo, dietas, fome emocional e métricas — e o plano recomendado.</span></a>
                    <a class="nu-card" href="/nutricao/teste-imc"><span class="nu-card-price">1 min</span><span class="nu-card-label">IMC e cintura</span><span class="nu-card-desc">Excesso de peso ou obesidade — e quantos kg até ao peso normal.</span></a>
                    <a class="nu-card" href="/nutricao/teste-tfeq"><span class="nu-card-price">4 min</span><span class="nu-card-label">TFEQ-R18</span><span class="nu-card-desc">Restrição, descontrolo e fome emocional — o que trava o peso.</span></a>
                    <a class="nu-card" href="/nutricao/teste-yfas"><span class="nu-card-price">4 min</span><span class="nu-card-label">YFAS 2.0</span><span class="nu-card-desc">Sinais de compulsão por alimentos hipercalóricos.</span></a>
                    <a class="nu-card" href="/nutricao/teste-ess"><span class="nu-card-price">2 min</span><span class="nu-card-label">ESS · sonolência</span><span class="nu-card-desc">Alerta de apneia do sono — sobretudo com excesso de peso.</span></a>
                    <a class="nu-card" href="/burnout/teste-who5"><span class="nu-card-price">1 min</span><span class="nu-card-label">WHO-5</span><span class="nu-card-desc">Bem-estar 0–100%. O micro-teste para cruzar com nutrição.</span></a>
                </div>
            </div>
        </section>
        ${sections}
    </main>`;

    return layoutPage({
        origin: o,
        title: 'Nutrição online por condição | Lon Clinic',
        description: 'Programa de reeducação metabólica e perda de peso (3 a 6 meses) e orientação nutricional por condição. Sem prescrição de aGLP-1. A partir de 115 €/mês.',
        canonicalPath: '/nutricao',
        jsonLdExtra: jsonLd,
        mainHtml
    });
}

function renderSpoke(origin, slug) {
    if (!isValidSlug(slug)) return null;
    const meta = findPage(slug);
    if (!meta) return null;

    const o = normalizeOrigin(origin);
    const raw = pageMarkdown(slug, meta);
    const extraHtml = raw ? marked.parse(raw) : '';
    const h1 = String(meta.h1 || slug);
    const description = String(meta.description || '');
    const datePub = String(meta.datePublished || '');
    const dateMod = String(meta.dateModified || meta.datePublished || '');
    const weightLoss = isWeightLossPage(meta);
    const canonicalPath = `/nutricao/${encodeURIComponent(meta.slug)}`;
    const canonicalUrl = canonicalHref(canonicalPath);
    const bookingHref = meta.bookingHref || (weightLoss
        ? `${NUTRICAO_PROGRAMA_HREF}?ref=nutricao-${meta.slug}`
        : '/marcar/clinica-geral');
    const slotService = meta.slotService || (weightLoss ? 'nutricao_programa' : 'clinica_geral');
    const pages = livePages();
    const lead = (Array.isArray(meta.lead) ? meta.lead : [meta.lead]).filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const slotsHtml = `
                <div class="cq-live-slots" data-next-slots data-limit="3" data-service="${escapeHtml(slotService)}" data-book-href="${escapeHtml(bookingHref)}" data-surface="nutricao-${escapeHtml(meta.slug)}" data-goal="Perda de peso / reeducação metabólica" hidden>
                    <p class="cq-live-slots-kicker">${weightLoss ? 'Próximos horários · consulta inicial de nutrição metabólica' : 'Próximos horários'}</p>
                    <div class="cq-live-slots-row" data-next-slots-row></div>
                </div>`;

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
            about: { '@type': 'MedicalCondition', name: meta.condition || h1 },
            specialty: { '@type': 'MedicalSpecialty', name: 'Nutrition' },
            ...nutritionAuthorSchema(o)
        },
        authors.personJsonLd(o, clinicConfig().reviewer || 'rita-aguiar'),
        {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: meta.serviceName || h1,
            serviceType: 'Nutritional counseling',
            url: canonicalUrl,
            provider: { '@id': `${o}/#organization` },
            offers: [
                {
                    '@type': 'Offer',
                    name: weightLoss ? 'Consulta inicial de nutrição metabólica' : 'Consulta única',
                    price: String(meta.priceAmount || (weightLoss ? '115.00' : '39.00')),
                    priceCurrency: 'EUR',
                    availability: 'https://schema.org/InStock'
                },
                {
                    '@type': 'Offer',
                    name: weightLoss ? 'Mensalidade do programa' : 'Follow-up',
                    price: String(meta.followUpAmount || (weightLoss ? '75.00' : meta.priceAmount || '39.00')),
                    priceCurrency: 'EUR',
                    availability: 'https://schema.org/InStock'
                }
            ]
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Nutrição', item: `${o}/nutricao` },
                { '@type': 'ListItem', position: 3, name: meta.navLabel || h1, item: canonicalUrl }
            ]
        }
    ];
    const faqLd = faqJsonLd(meta.faq);
    if (faqLd) jsonLd.push(faqLd);

    const mainHtml = `
    <main id="conteudo-principal" class="cq-main">
        <article class="cq-article">
            <header class="cq-header">
                <nav class="cq-breadcrumb" aria-label="Caminho">
                    <a href="/nutricao">Nutrição</a>
                    <span aria-hidden="true">/</span>
                    <span>${escapeHtml(meta.navLabel || h1)}</span>
                </nav>
                <p class="cq-kicker">${weightLoss ? 'Reeducação nutricional · sem prescrição de aGLP-1' : 'Orientação nutricional'} · ERS 45475 · Ordem dos Nutricionistas</p>
                <h1>${escapeHtml(h1)}</h1>
                <div class="cq-lead">${lead}</div>
                ${nutritionBylineHtml(datePub)}
                <div class="cq-header-actions">
                    <a class="lon-btn lon-btn-dark" href="${escapeHtml(bookingHref)}">${escapeHtml(meta.bookingLabel || (weightLoss ? 'Marcar consulta inicial' : 'Marcar consulta'))}</a>
                    <a class="lon-btn lon-btn-soft" href="#preco">Ver preço</a>
                </div>
                ${slotsHtml}
            </header>

            <section class="cq-block" aria-labelledby="nu-for-title">
                <h2 id="nu-for-title">${escapeHtml(meta.forTitle || 'Para quem é')}</h2>
                ${listHtml(meta.forWhom || [])}
            </section>

            <section class="cq-block" aria-labelledby="nu-changes-title">
                <h2 id="nu-changes-title">O que muda com o acompanhamento</h2>
                ${listHtml(meta.whatChanges && meta.whatChanges.length ? meta.whatChanges : DEFAULT_CHANGES)}
            </section>

            <section class="cq-split" aria-labelledby="nu-flags-title">
                <h2 id="nu-flags-title" class="visually-hidden">Quando a consulta online faz sentido e quando não</h2>
                <div class="cq-ok">
                    <h2>Quando a consulta online faz sentido</h2>
                    ${listHtml(meta.safeOnline || [])}
                </div>
                <div class="cq-flags">
                    <h2>Quando não tratar só online</h2>
                    ${listHtml(meta.goToUrgent || [])}
                    <p class="cq-flags-note">Em emergência, ligue <strong>112</strong>. SNS 24: <strong>808 24 24 24</strong>.</p>
                </div>
            </section>

            ${extraHtml ? `<section class="cq-block nu-extra"><div class="cq-prose">${extraHtml}</div></section>` : ''}

            <section class="cq-block" aria-labelledby="nu-how-title">
                <h2 id="nu-how-title">Como funciona a consulta</h2>
                ${stepsHtml(meta.howItWorks || [])}
            </section>

            ${bookingCardsHtml(meta, 0)}

            <section class="cq-block" aria-labelledby="nu-bring-title">
                <h2 id="nu-bring-title">O que é preciso trazer ou preparar</h2>
                ${listHtml(meta.whatToBring && meta.whatToBring.length ? meta.whatToBring : DEFAULT_BRING)}
            </section>

            <section class="cq-price" id="preco" aria-labelledby="nu-preco-title">
                <h2 id="nu-preco-title">Preço e formato</h2>
                <p class="cq-price-value">${escapeHtml(meta.price || '')}</p>
                <p class="cq-price-note">${escapeHtml(meta.priceNote || '')}</p>
                ${formatTableHtml(meta)}
                <a class="lon-btn lon-btn-primary" href="${escapeHtml(bookingHref)}">${escapeHtml(meta.bookingLabel || 'Marcar consulta')}</a>
            </section>

            ${psychologyBridgeHtml(meta.psychologyBridge)}

            ${bookingCardsHtml(meta, 1)}

            <section class="cq-block" aria-labelledby="nu-faq-title">
                <h2 id="nu-faq-title">Perguntas frequentes</h2>
                ${faqHtml(meta.faq)}
            </section>

            ${authors.authorBioHtml(o, meta.author, dateMod || datePub)}
            <p class="cq-disclaimer">Informação de carácter geral — não substitui consulta médica nem consulta de nutricionista individualizada. A Lon Clinic não prescreve aGLP-1 (Ozempic, Wegovy ou equivalentes) para perda de peso. A Lon Clinic está registada na ERS (n.º 45475). Planos alimentares detalhados são da competência de nutricionista inscrito na Ordem dos Nutricionistas — a cédula será publicada quando o profissional estiver identificado.</p>
            ${relatedHtml(meta.related, pages, slug)}
        </article>
        <aside class="cq-cta-band" aria-label="Marcar consulta">
            <div class="lon-container cq-cta-inner">
                <p class="cq-cta-kicker">${weightLoss ? 'Programa mensal · consulta inicial de nutrição metabólica' : 'Preço visível · videoconsulta'}</p>
                <h2 class="cq-cta-title">${escapeHtml(meta.ctaTitle || 'Marcar orientação nutricional')}</h2>
                <p class="cq-cta-lead">${escapeHtml(meta.priceNote || meta.price || '')}</p>
                <div class="cq-cta-actions">
                    <a class="lon-btn lon-btn-dark" href="${escapeHtml(bookingHref)}">${escapeHtml(meta.bookingLabel || 'Marcar consulta')}</a>
                    <a class="lon-btn lon-btn-soft" href="/nutricao">Ver todas as condições</a>
                </div>
            </div>
        </aside>
    </main>`;

    return {
        html: layoutPage({
            origin: o,
            title: String(meta.title || `${h1} | Lon Clinic`),
            description,
            canonicalPath,
            jsonLdExtra: jsonLd,
            mainHtml,
            dateModified: dateMod
        })
    };
}

function renderNotFound(origin) {
    const o = normalizeOrigin(origin);
    return layoutPage({
        origin: o,
        title: 'Não encontrado | Lon Clinic',
        description: 'Página de nutrição não encontrada.',
        canonicalPath: '/nutricao',
        jsonLdExtra: null,
        mainHtml: `
    <main id="conteudo-principal">
        <div class="lon-container cq-not-found">
            <h1>Página não encontrada</h1>
            <p>Esta condição ainda não tem página, ou foi movida.</p>
            <p><a class="lon-btn lon-btn-primary" href="/nutricao">Voltar à nutrição</a></p>
        </div>
    </main>`,
        robots: 'noindex, follow'
    });
}

module.exports = {
    escapeHtml,
    isValidSlug,
    loadManifest,
    livePages,
    findPage,
    renderHub,
    renderSpoke,
    renderNotFound
};
