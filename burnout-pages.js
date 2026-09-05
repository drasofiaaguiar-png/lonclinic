/**
 * Lon Clinic — Burnout hub (/burnout): SEO cluster with hub + spoke pages.
 * Interactive quiz stays at /burnout/teste (burnout-quiz.html).
 * Conversion product for CBI results: /psicologia-burnout.
 * Medical landing stays at /clinica-anti-burnout (not the default hub CTA).
 * Existing spokes stay; new editorial articles go to /blog/:slug, not /burnout/:slug.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { organizationJsonLd, originOf, canonicalHref } = require('./seo');
const authors = require('./authors');

const BURNOUT_DIR = path.join(__dirname, 'data', 'burnout');
const MANIFEST_PATH = path.join(BURNOUT_DIR, 'manifest.json');
const SERIES_PATH = path.join(BURNOUT_DIR, 'series.json');
const PAGES_DIR = path.join(BURNOUT_DIR, 'pages');

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
        return { pages: [] };
    }
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.pages)) {
        return { pages: [] };
    }
    return parsed;
}

function loadSeries() {
    if (!fs.existsSync(SERIES_PATH)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(SERIES_PATH, 'utf8'));
    } catch (_) {
        return null;
    }
}

function flatSeriesSlugs(series) {
    if (!series || !Array.isArray(series.parts)) return [];
    return series.parts.reduce((acc, part) => acc.concat(part.slugs || []), []);
}

function seriesPosition(slug, series) {
    const all = flatSeriesSlugs(series);
    const idx = all.indexOf(slug);
    if (idx < 0) return null;
    return { index: idx, total: all.length, all };
}

function seriesNavHtml(slug, pagesBySlug, series) {
    const pos = seriesPosition(slug, series);
    if (!pos) return '';
    const prevSlug = pos.index > 0 ? pos.all[pos.index - 1] : null;
    const nextSlug = pos.index < pos.total - 1 ? pos.all[pos.index + 1] : null;
    const prev = prevSlug ? pagesBySlug.get(prevSlug) : null;
    const next = nextSlug ? pagesBySlug.get(nextSlug) : null;
    const prevLink = prev
        ? `<a class="bo-series-link bo-series-link--prev" href="/burnout/${encodeURIComponent(prevSlug)}"><span>Anterior</span><strong>${escapeHtml(prev.navLabel || prev.title)}</strong></a>`
        : '<span class="bo-series-link bo-series-link--empty"></span>';
    const nextLink = next
        ? `<a class="bo-series-link bo-series-link--next" href="/burnout/${encodeURIComponent(nextSlug)}"><span>Seguinte</span><strong>${escapeHtml(next.navLabel || next.title)}</strong></a>`
        : '<span class="bo-series-link bo-series-link--empty"></span>';
    return `
        <nav class="bo-series" aria-label="Navegação da coleção">
            <p class="bo-series-meta"><a href="/burnout/colecao">Coleção Burnout no Trabalho</a> · ${pos.index + 1} / ${pos.total}</p>
            <div class="bo-series-nav">
                ${prevLink}
                ${nextLink}
            </div>
        </nav>`;
}

function readPageFile(slug, format) {
    const ext = format === 'html' ? '.html' : '.md';
    const filePath = path.join(PAGES_DIR, `${slug}${ext}`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return fs.readFileSync(filePath, 'utf8');
}

function bodyToHtml(body, format) {
    if (format === 'html') {
        return body;
    }
    return marked.parse(body);
}

function ctaBand(ref) {
    const r = encodeURIComponent(ref || 'burnout-hub');
    return `
        <aside class="bo-cta-band" aria-label="Próximos passos">
            <div class="lon-container bo-cta-inner">
                <p class="bo-cta-kicker">Comece pelo quadro</p>
                <h2 class="bo-cta-title">Teste CBI no centro burnout. Consulta na ficha de psicologia.</h2>
                <div class="bo-cta-actions">
                    <a class="lon-btn lon-btn-dark" href="/burnout/teste?ref=${r}">Fazer o teste gratuito</a>
                    <a class="lon-btn lon-btn-soft" href="/psicologia-burnout?ref=${r}">Psicólogo para burnout</a>
                </div>
            </div>
        </aside>`;
}

function neuroClusterNav(currentPath) {
    const links = [
        { href: '/blog/autismo-em-mulheres-diagnostico-tardio', label: 'Autismo em mulheres: diagnóstico tardio' },
        { href: '/blog/adhd-em-adultos-sintomas', label: 'ADHD em adultos' },
        { href: '/burnout/o-que-e', label: 'O que é burnout' },
        { href: '/burnout/sintomas', label: 'Sintomas de burnout' },
        { href: '/burnout/depressao-ou-burnout', label: 'Burnout ou depressão' }
    ].filter((item) => item.href !== currentPath);
    const items = links
        .map((item) => `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`)
        .join('');
    return `
        <nav class="bo-related" aria-label="Autismo, ADHD e burnout">
            <h2>Autismo, ADHD e burnout</h2>
            <ul>${items}</ul>
        </nav>`;
}

function relatedNav(currentSlug, pages) {
    const items = pages
        .filter((p) => p.slug !== currentSlug && p.group !== 'hidden')
        .slice(0, 8)
        .map((p) => {
            const href = p.slug === 'hub' ? '/burnout' : `/burnout/${encodeURIComponent(p.slug)}`;
            return `<li><a href="${href}">${escapeHtml(p.navLabel || p.title)}</a></li>`;
        })
        .join('');
    if (!items) return '';
    return `
        <nav class="bo-related" aria-label="Mais sobre burnout">
            <h2>Continuar a ler</h2>
            <ul>${items}</ul>
        </nav>`;
}

function layoutBurnoutPage(opts) {
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

    const canonicalUrl = canonicalHref(canonicalPath);
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const og = escapeHtml(ogImage || `${origin}/image/image2.webp`);
    const graph = Array.isArray(jsonLdExtra) ? jsonLdExtra : (jsonLdExtra ? [jsonLdExtra] : []);
    if (!robots || !/^noindex/i.test(robots)) {
        graph.push(organizationJsonLd(origin));
    }
    const ldScripts = graph
        .map((block) => `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`)
        .join('\n');

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
    <meta name="theme-color" content="#255235">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260621b">
    <link rel="stylesheet" href="/burnout-pages.css?v=20260902b">
    <link rel="stylesheet" href="/author.css?v=20260820e">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${ldScripts}
</head>
<body class="lon-landing bo-body">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/burnout" aria-current="page">Burnout</a>
                <a href="/burnout/teste">Teste</a>
                <a href="/burnout/testes">Outros testes</a>
                <a href="/psicologia-burnout">Psicologia</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/burnout/teste?ref=burnout-nav" class="lon-btn lon-btn-primary lon-btn-sm">Fazer o teste</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/burnout">Burnout</a>
            <a href="/burnout/teste">Teste gratuito</a>
            <a href="/burnout/testes">PHQ-9, GAD-7 e sono</a>
            <a href="/burnout/sintomas">Sintomas</a>
            <a href="/burnout/tratamento">Tratamento</a>
            <a href="/psicologia-burnout">Psicólogo para burnout</a>
            <a href="/saudemental">Psicologia</a>
            <a href="/patient-portal">Login</a>
            <a href="/burnout/teste?ref=burnout-nav-mobile">Fazer o teste</a>
        </div>
    </header>
    ${mainHtml}
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>Medicina online para burnout — com avaliação clínica e acompanhamento estruturado.</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                </div>
                <div class="lon-footer-col">
                    <h4>Burnout</h4>
                    <a href="/burnout">Centro burnout</a>
                    <a href="/burnout/o-que-e">O que é burnout</a>
                    <a href="/burnout/burnout-parental">Burnout parental</a>
                    <a href="/burnout/trabalho-hibrido">Trabalho híbrido</a>
                    <a href="/burnout/sociedade-do-rendimento">Sociedade do rendimento</a>
                    <a href="/burnout/sisifemia">Sisifemia</a>
                    <a href="/burnout/meraki">Meraki</a>
                    <a href="/burnout/urgencia-email">Urgência do e-mail</a>
                    <a href="/burnout/emocoes-e-produtividade">Emoções e produtividade</a>
                    <a href="/burnout/teste">Teste gratuito</a>
                    <a href="/burnout/testes">PHQ-9, GAD-7, stress e sono</a>
                    <a href="/burnout/avaliacao">O que mede o teste</a>
                    <a href="/burnout/sintomas">Sintomas</a>
                    <a href="/burnout/tratamento">Tratamento</a>
                    <a href="/burnout/sindrome-do-executivo">Síndrome do executivo</a>
                    <a href="/burnout/boreout">Boreout</a>
                    <a href="/burnout/ambiente-de-trabalho-saudavel">Ambiente saudável</a>
                    <a href="/burnout/fadiga-laboral">Fadiga laboral</a>
                    <a href="/burnout/apoio-percebido">Apoio percebido</a>
                    <a href="/burnout/direito-a-desligar">Direito a desligar</a>
                    <a href="/burnout/capital-psicologico">Capital psicológico</a>
                    <a href="/psicologia-burnout">Psicólogo para burnout</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Por profissão</h4>
                    <a href="/burnout/programadores">Programadores</a>
                    <a href="/burnout/medicos">Médicos</a>
                    <a href="/burnout/profissionais-de-saude">Profissionais de saúde</a>
                    <a href="/burnout/advogados">Advogados</a>
                    <a href="/burnout/gestores">Gestores</a>
                    <a href="/burnout/empreendedores">Empreendedores</a>
                    <a href="/burnout/fundadores">Fundadores (série)</a>
                    <a href="/burnout/colecao">Coleção completa</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Clínica</h4>
                    <a href="/equipa/rita-aguiar">A médica</a>
                    <a href="/saudemental">Psicologia</a>
                    <a href="/faq">FAQ</a>
                    <a href="/info.html?page=contato">Contato</a>
                    <a href="/psicologia-burnout">Psicólogo para burnout</a>
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
    <script src="/i18n.js?v=20260905e" defer></script>
    <script src="/lon-analytics.js?v=20260905e" defer></script>
    <script src="/reviews.js?v=20260905e" defer></script>
    <script src="/lon-slots.js?v=20260905g" defer></script>
</body>
</html>`;
}

function renderHub(origin) {
    const o = normalizeOrigin(origin);
    const manifest = loadManifest();
    const pages = (manifest.pages || []).filter((p) => isValidSlug(p.slug) && p.slug !== 'hub');

    const byGroup = (group) => pages.filter((p) => (p.group || 'guides') === group);

    const card = (p) => {
        const href = `/burnout/${encodeURIComponent(p.slug)}`;
        return `
            <a class="bo-card" href="${href}">
                <span class="bo-card-label">${escapeHtml(p.navLabel || p.title)}</span>
                <span class="bo-card-desc">${escapeHtml(p.description || '')}</span>
            </a>`;
    };

    const guides = byGroup('guides').map(card).join('');
    const professions = byGroup('profession').map(card).join('');
    const founders = byGroup('founders').map(card).join('');

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Burnout — Lon Clinic',
            description: 'Guia clínico de burnout: sintomas, tratamento, recuperação, teste gratuito e consulta médica online em Portugal.',
            url: `${o}/burnout`,
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            inLanguage: 'pt-PT'
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Burnout', item: `${o}/burnout` }
            ]
        }
    ];

    const mainHtml = `
    <main id="conteudo-principal">
        <section class="bo-hero" aria-labelledby="bo-hub-title">
            <div class="lon-container bo-hero-inner">
                <p class="bo-eyebrow">LON Clinic · Centro burnout</p>
                <h1 id="bo-hub-title">Burnout</h1>
                <p class="bo-lead">Não é só cansaço. O centro burnout reúne o que precisa de saber — sintomas, recuperação, profissões — e o teste CBI para objectivar o quadro. A consulta de psicologia é o passo seguinte.</p>
                <p class="bo-hero-link"><a href="/burnout/o-que-e">O que é burnout →</a> · <a href="/psicologia-burnout">Psicólogo para burnout →</a> · <a href="/burnout/colecao">Coleção completa →</a></p>
                <div class="bo-hero-actions">
                    <a class="lon-btn lon-btn-dark" href="/burnout/teste?ref=burnout-hub">Fazer o teste gratuito</a>
                    <a class="lon-btn lon-btn-soft" href="/burnout/colecao">Ler a coleção</a>
                </div>
            </div>
        </section>

        <section class="bo-section" aria-labelledby="bo-tests-title">
            <div class="lon-container">
                <h2 id="bo-tests-title">Testes clínicos</h2>
                <p class="bo-section-lead">O Índice de Burnout (CBI) é o ponto de partida. PHQ-9, GAD-7, PSS-10, ISI e WHO-5 afinam humor, ansiedade, stress, sono e bem-estar — o mesmo fluxo, resultado imediato.</p>
                <div class="bo-card-grid">
                    <a class="bo-card" href="/burnout/teste"><span class="bo-card-label">Burnout (CBI)</span><span class="bo-card-desc">18 perguntas · o teste principal de esgotamento.</span></a>
                    <a class="bo-card" href="/burnout/teste-phq9"><span class="bo-card-label">PHQ-9 · depressão</span><span class="bo-card-desc">9 perguntas · distingue burnout de humor clínico.</span></a>
                    <a class="bo-card" href="/burnout/teste-gad7"><span class="bo-card-label">GAD-7 · ansiedade</span><span class="bo-card-desc">7 perguntas · o alerta que anda com a exaustão.</span></a>
                    <a class="bo-card" href="/burnout/teste-pss10"><span class="bo-card-label">PSS-10 · stress</span><span class="bo-card-desc">10 perguntas · perceção de stress no último mês.</span></a>
                    <a class="bo-card" href="/burnout/teste-isi"><span class="bo-card-label">ISI · insónia</span><span class="bo-card-desc">7 perguntas · o sono é o primeiro a quebrar.</span></a>
                    <a class="bo-card" href="/burnout/teste-who5"><span class="bo-card-label">WHO-5 · bem-estar</span><span class="bo-card-desc">5 perguntas · 1 minuto · pontuação 0–100%.</span></a>
                    <a class="bo-card" href="/burnout/teste-sf12"><span class="bo-card-label">Qualidade de vida</span><span class="bo-card-desc">12 perguntas · linha de base para os 3 e 6 meses.</span></a>
                    <a class="bo-card" href="/burnout/testes"><span class="bo-card-label">Ver todos os testes</span><span class="bo-card-desc">Índice completo da clínica anti-burnout.</span></a>
                </div>
            </div>
        </section>

        <section class="bo-section" aria-labelledby="bo-guides-title">
            <div class="lon-container">
                <h2 id="bo-guides-title">Compreender e agir</h2>
                <p class="bo-section-lead">Páginas para quem já suspeita que precisa de ajuda — e quer perceber o próximo passo.</p>
                <div class="bo-card-grid">${guides}</div>
            </div>
        </section>

        <section class="bo-section bo-section--muted" aria-labelledby="bo-prof-title">
            <div class="lon-container">
                <h2 id="bo-prof-title">Burnout por profissão</h2>
                <p class="bo-section-lead">O contexto muda o quadro. Escolha o seu.</p>
                <div class="bo-card-grid">${professions}</div>
            </div>
        </section>

        ${founders ? `
        <section class="bo-section" aria-labelledby="bo-founders-title">
            <div class="lon-container">
                <h2 id="bo-founders-title">Fundadores de startups</h2>
                <p class="bo-section-lead">Série de 8 artigos sobre o desgaste específico de quem funda. <a href="/burnout/colecao#fundadores">Ver índice →</a></p>
                <div class="bo-card-grid">${founders}</div>
            </div>
        </section>` : ''}

        ${ctaBand('burnout-hub')}
    </main>`;

    return layoutBurnoutPage({
        origin: o,
        title: 'Burnout — Sintomas, teste e consulta online | Lon Clinic',
        description: 'Centro Lon Clinic sobre burnout: sintomas, tratamento, recuperação, diferença face à depressão e o teste gratuito CBI. O passo seguinte é a consulta de psicologia.',
        canonicalPath: '/burnout',
        ogImage: `${o}/image/image2.webp`,
        jsonLdExtra: jsonLd,
        mainHtml
    });
}

function renderSpoke(origin, slug) {
    if (!isValidSlug(slug)) {
        return null;
    }
    const o = normalizeOrigin(origin);
    const manifest = loadManifest();
    const pages = manifest.pages || [];
    const meta = pages.find((a) => a.slug === slug);
    if (!meta) {
        return null;
    }

    const format = meta.format === 'html' ? 'html' : 'markdown';
    const raw = readPageFile(slug, format);
    if (raw === null) {
        return null;
    }

    const articleHtml = bodyToHtml(raw, format === 'html' ? 'html' : 'markdown');
    const title = String(meta.title || slug);
    const description = String(meta.description || '');
    const datePub = String(meta.datePublished || '');
    const dateMod = String(meta.dateModified || meta.datePublished || '');
    const og = `${o}/image/image2.webp`;
    const canonicalPath = `/burnout/${encodeURIComponent(slug)}`;
    const ref = `burnout-${slug}`;

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
            '@type': ['Article', 'MedicalWebPage'],
            headline: title,
            name: title,
            description,
            url: `${o}${canonicalPath}`,
            datePublished: datePub || undefined,
            dateModified: dateMod || undefined,
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            about: { '@type': 'MedicalCondition', name: 'Burnout' },
            ...authors.articleAuthorSchema(o)
        },
        authors.personJsonLd(o),
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Burnout', item: `${o}/burnout` },
                { '@type': 'ListItem', position: 3, name: title, item: `${o}${canonicalPath}` }
            ]
        }
    ];
    if (faqLd) jsonLd.push(faqLd);

    const pagesBySlug = new Map(pages.map((p) => [p.slug, p]));
    const series = loadSeries();
    const seriesBlock = seriesNavHtml(slug, pagesBySlug, series);

    const mainHtml = `
    <main id="conteudo-principal" class="bo-article-main">
        <article class="bo-article">
            <header class="bo-article-header">
                <nav class="bo-breadcrumb" aria-label="Caminho">
                    <a href="/burnout">Burnout</a>
                    <span aria-hidden="true">/</span>
                    <a href="/burnout/colecao">Coleção</a>
                    <span aria-hidden="true">/</span>
                    <span>${escapeHtml(meta.navLabel || title)}</span>
                </nav>
                <h1>${escapeHtml(title)}</h1>
                <p class="bo-article-deck">${escapeHtml(description)}</p>
                ${authors.authorBylineHtml(o, meta.author, datePub)}
                <div class="bo-article-actions">
                    <a class="lon-btn lon-btn-dark lon-btn-sm" href="/burnout/teste?ref=${encodeURIComponent(ref)}">Teste gratuito</a>
                    <a class="lon-btn lon-btn-primary lon-btn-sm" href="/psicologia-burnout?ref=${encodeURIComponent(ref)}">Psicólogo para burnout</a>
                </div>
            </header>
            <div class="bo-prose" lang="pt-PT">
                ${articleHtml}
            </div>
            ${authors.authorBioHtml(o, meta.author, dateMod || datePub)}
            <p class="bo-disclaimer">Informação de carácter geral — não substitui consulta médica individualizada. Em crise ou risco imediato, contacte os serviços de emergência.</p>
            ${seriesBlock}
            ${meta.group === 'guides' ? neuroClusterNav(canonicalPath) : ''}
            ${relatedNav(slug, pages)}
        </article>
        ${ctaBand(ref)}
    </main>`;

    return {
        html: layoutBurnoutPage({
            origin: o,
            title: `${title} | Lon Clinic`,
            description,
            canonicalPath,
            ogImage: og,
            jsonLdExtra: jsonLd,
            mainHtml
        })
    };
}

function renderNotFound(origin) {
    const o = normalizeOrigin(origin);
    const mainHtml = `
    <main id="conteudo-principal">
        <div class="lon-container bo-not-found">
            <h1>Página não encontrada</h1>
            <p>O conteúdo que procura não existe ou foi movido.</p>
            <p><a class="lon-btn lon-btn-primary" href="/burnout">Voltar ao centro burnout</a></p>
        </div>
    </main>`;
    return layoutBurnoutPage({
        origin: o,
        title: 'Não encontrado | Lon Clinic',
        description: 'Página de burnout não encontrada.',
        canonicalPath: '/burnout',
        ogImage: `${o}/image/image2.webp`,
        jsonLdExtra: null,
        mainHtml,
        robots: 'noindex, follow'
    });
}

function renderCollection(origin) {
    const o = normalizeOrigin(origin);
    const series = loadSeries();
    const manifest = loadManifest();
    const pagesBySlug = new Map((manifest.pages || []).map((p) => [p.slug, p]));

    if (!series) {
        return renderNotFound(origin);
    }

    const partsHtml = (series.parts || []).map((part) => {
        const items = (part.slugs || []).map((slug, i) => {
            const meta = pagesBySlug.get(slug);
            if (!meta) return '';
            const n = i + 1;
            return `<li><a href="/burnout/${encodeURIComponent(slug)}"><span class="bo-colecao-n">${n}</span><span class="bo-colecao-label">${escapeHtml(meta.navLabel || meta.title)}</span></a></li>`;
        }).join('');
        const anchor = part.id === 'fundadores' ? ' id="fundadores"' : '';
        return `
            <section class="bo-colecao-part"${anchor} aria-labelledby="part-${escapeHtml(part.id)}">
                <h2 id="part-${escapeHtml(part.id)}">${escapeHtml(part.title)}</h2>
                <ol class="bo-colecao-list">${items}</ol>
            </section>`;
    }).join('');

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: series.title,
        description: series.description,
        url: `${o}/burnout/colecao`,
        hasPart: flatSeriesSlugs(series).map((slug) => {
            const meta = pagesBySlug.get(slug);
            return {
                '@type': 'MedicalWebPage',
                name: meta ? meta.title : slug,
                url: `${o}/burnout/${encodeURIComponent(slug)}`
            };
        })
    };

    const mainHtml = `
    <main id="conteudo-principal">
        <section class="bo-hero" aria-labelledby="bo-colecao-title">
            <div class="lon-container bo-hero-inner">
                <p class="bo-eyebrow">LON Clinic · Coleção</p>
                <h1 id="bo-colecao-title">${escapeHtml(series.title)}</h1>
                <p class="bo-lead">${escapeHtml(series.description)}</p>
                <div class="bo-hero-actions">
                    <a class="lon-btn lon-btn-dark" href="/burnout/teste?ref=burnout-colecao">Teste gratuito</a>
                    <a class="lon-btn lon-btn-soft" href="/burnout">Centro burnout</a>
                </div>
            </div>
        </section>
        <div class="lon-container bo-colecao">
            ${partsHtml}
        </div>
        ${ctaBand('burnout-colecao')}
    </main>`;

    return layoutBurnoutPage({
        origin: o,
        title: `${series.title} — Coleção | Lon Clinic`,
        description: series.description,
        canonicalPath: '/burnout/colecao',
        ogImage: `${o}/image/image2.webp`,
        jsonLdExtra: jsonLd,
        mainHtml
    });
}

module.exports = {
    escapeHtml,
    isValidSlug,
    loadManifest,
    loadSeries,
    renderHub,
    renderSpoke,
    renderCollection,
    renderNotFound
};
