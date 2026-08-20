/**
 * Lon Clinic — Guide (/blog): server-rendered listing and articles (Markdown or HTML fragments).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { organizationJsonLd, jsonLdScript } = require('./seo');
const authors = require('./authors');

const GUIDE_DIR = path.join(__dirname, 'data', 'guide');
const MANIFEST_PATH = path.join(GUIDE_DIR, 'manifest.json');
const ARTICLES_DIR = path.join(GUIDE_DIR, 'articles');
const BURNOUT_MANIFEST_PATH = path.join(__dirname, 'data', 'burnout', 'manifest.json');

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
        return { articles: [] };
    }
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.articles)) {
        return { articles: [] };
    }
    return parsed;
}

function loadBurnoutManifest() {
    if (!fs.existsSync(BURNOUT_MANIFEST_PATH)) {
        return { pages: [] };
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(BURNOUT_MANIFEST_PATH, 'utf8'));
        return parsed && Array.isArray(parsed.pages) ? parsed : { pages: [] };
    } catch {
        return { pages: [] };
    }
}

function burnoutAsCard(page) {
    if (!page || !page.slug) return null;
    const slug = String(page.slug);
    return {
        slug: `burnout-${slug}`,
        href: slug === 'hub' ? '/burnout' : `/burnout/${encodeURIComponent(slug)}`,
        title: page.title,
        description: page.description,
        about: 'Burnout',
        datePublished: page.datePublished,
        dateModified: page.dateModified || page.datePublished,
        image: page.image || '/image/image1_files/ColmoreRow_Large_Desktop.jpg'
    };
}

function resolveRelatedRef(ref, guideBySlug, burnoutBySlug) {
    const key = String(ref || '');
    if (key.startsWith('/burnout')) {
        const rest = key.replace(/^\/burnout\/?/, '');
        return burnoutAsCard(burnoutBySlug.get(rest || 'hub'));
    }
    return guideBySlug.get(key) || null;
}

function sortArticles(articles) {
    return [...articles].sort((a, b) => {
        const da = String(a.datePublished || '');
        const db = String(b.datePublished || '');
        return db.localeCompare(da);
    });
}

function readArticleFile(slug, format) {
    const ext = format === 'html' ? '.html' : '.md';
    const filePath = path.join(ARTICLES_DIR, `${slug}${ext}`);
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

function articleCluster(meta) {
    const slug = String((meta && meta.slug) || '');
    const about = String((meta && meta.about) || '').toLowerCase();
    if (/vacina|viajante|travel|marcacao/.test(slug)) return 'travel';
    if (/autismo|adhd/.test(slug) || /autismo|adhd/.test(about)) return 'mental';
    return 'general';
}

function defaultCtaKind(meta) {
    const cluster = articleCluster(meta);
    return cluster === 'travel' ? 'travel' : cluster === 'mental' ? 'mental' : 'general';
}

function relatedKicker(article) {
    if (article && article.about) return String(article.about);
    const slug = String((article && article.slug) || '');
    if (/vacina/.test(slug)) return 'Vacina';
    if (/telemedicina/.test(slug)) return 'Telemedicina';
    if (/marcacao/.test(slug)) return 'Marcação';
    if (/burnout/.test(slug) || (article && article.href && String(article.href).startsWith('/burnout'))) {
        return 'Burnout';
    }
    return 'Guide';
}

function bookingCardsHtml(kind, tone) {
    const packs = {
        mental: [
            {
                chip: 'Consulta',
                title: 'Consulta Médica de Saúde Mental',
                price: '€60 · 45 min',
                href: '/marcar/saude-mental',
                cta: 'Marcar',
                note: 'Online · avaliação clínica'
            },
            {
                chip: 'Subscrição',
                title: 'Psicologia em Burnout',
                price: '€54 /semana · poupa 10%',
                href: '/saudemental',
                cta: 'Subscrever',
                note: '1 sessão de vídeo por semana'
            }
        ],
        travel: [
            {
                chip: 'Viajante',
                title: 'Consulta do Viajante',
                price: '€39 · 20 min',
                href: '/marcar/travel',
                cta: 'Marcar',
                note: 'Orientação e prescrição no próprio dia'
            }
        ],
        general: [
            {
                chip: 'Clínica Geral',
                title: 'Consulta de Clínica Geral',
                price: 'Online',
                href: '/marcar/clinica-geral',
                cta: 'Marcar',
                note: 'Médico no próprio dia'
            },
            {
                chip: 'Consulta',
                title: 'Consulta Médica de Saúde Mental',
                price: '€60 · 45 min',
                href: '/marcar/saude-mental',
                cta: 'Marcar',
                note: 'Online · 45 minutos'
            }
        ]
    };
    const cards = packs[kind] || packs.general;
    const t = Math.abs(Number(tone) || 0) % 3;
    const items = cards.map((card) => `
        <article class="guide-book-card guide-book-card--t${t}">
            <p class="guide-book-chip">${escapeHtml(card.chip)}</p>
            <h3 class="guide-book-title">${escapeHtml(card.title)}</h3>
            <p class="guide-book-price">${escapeHtml(card.price)}</p>
            <p class="guide-book-note">${escapeHtml(card.note)}</p>
            <a class="guide-book-cta" href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>`).join('');
    return `
<aside class="guide-book" aria-label="Marcar consulta">
    <div class="guide-book-grid">${items}
    </div>
</aside>`;
}

function expandCtaTokens(html, kind) {
    let n = 0;
    return String(html || '').replace(
        /<p>\s*\{\{cta(?::([a-z-]+))?\}\}\s*<\/p>|\{\{cta(?::([a-z-]+))?\}\}/gi,
        (_, a, b) => bookingCardsHtml(a || b || kind, n++)
    );
}

function injectBookingCards(html, kind) {
    let out = expandCtaTokens(html, kind);
    if (out.includes('guide-book-grid')) {
        return out;
    }
    const cta = bookingCardsHtml(kind);
    const faqRe = /<h2[^>]*>\s*Perguntas frequentes/i;
    if (faqRe.test(out)) {
        out = out.replace(faqRe, `${cta}$&`);
    }
    const matches = [...out.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi)];
    if (matches.length >= 2 && matches[1].index != null) {
        const idx = matches[1].index;
        out = `${out.slice(0, idx)}${cta}${out.slice(idx)}`;
    } else if (!faqRe.test(html)) {
        out += cta;
    }
    return out;
}

function pickRelatedArticles(current, articles) {
    const all = Array.isArray(articles) ? articles : [];
    const bySlug = new Map(all.map((a) => [a.slug, a]));
    const burnoutBySlug = new Map((loadBurnoutManifest().pages || []).map((p) => [p.slug, p]));
    const picked = [];
    const seen = new Set([current.slug]);
    const push = (article) => {
        if (!article || seen.has(article.slug) || picked.length >= 3) return;
        seen.add(article.slug);
        picked.push(article);
    };
    (Array.isArray(current.related) ? current.related : []).forEach((ref) => {
        push(resolveRelatedRef(ref, bySlug, burnoutBySlug));
    });
    const rest = all.filter((a) => !seen.has(a.slug));
    rest.filter((a) => current.about && a.about === current.about).forEach(push);
    const cluster = articleCluster(current);
    rest.filter((a) => articleCluster(a) === cluster).forEach(push);
    rest.forEach(push);
    return picked;
}

function relatedArticlesHtml(current, articles) {
    const related = pickRelatedArticles(current, articles);
    if (!related.length) return '';
    const cards = related.map((a) => magCardHtml(a, { kicker: true, cardClass: 'guide-related-card' })).join('');
    return `
<nav class="guide-related" aria-label="Artigos relacionados">
    <h2 class="guide-related-heading">Continuar a ler</h2>
    <div class="guide-related-grid">${cards}
    </div>
</nav>`;
}

function layoutGuidePage(opts) {
    const {
        origin,
        title,
        description,
        canonicalPath,
        ogImage,
        jsonLd,
        mainHtml,
        navCurrent,
        ogType,
        robots,
        pageClass
    } = opts;

    const canonicalUrl = `${origin}${canonicalPath}`;
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const guideNavAttrs = navCurrent === 'guide' ? ' href="/blog" aria-current="page"' : ' href="/blog"';
    const graph = Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : []);
    if (!robots || !/^noindex/i.test(robots)) {
        graph.push(organizationJsonLd(origin));
    }
    const ldJson = jsonLdScript(graph);

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
    <meta property="og:type" content="${escapeHtml(ogType || 'article')}">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">
    <meta name="theme-color" content="#4A7C6F">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260418k">
    <link rel="stylesheet" href="/guide.css?v=20260820l">
    <link rel="stylesheet" href="/author.css?v=20260820l">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    ${ldJson}
</head>
<body class="lon-landing guide-body${pageClass ? ` ${escapeHtml(pageClass)}` : ''}">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/#inicio">Início</a>
                <a href="/magazine">Magazine</a>
                <a${guideNavAttrs}>Guides</a>
                <a href="/#contacto">Contato</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/#servicos" class="lon-btn lon-btn-primary lon-btn-sm">Marcar consulta</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Open menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/#inicio">Início</a>
            <a href="/magazine">Magazine</a>
            <a href="/blog">Guides</a>
            <a href="/#contacto">Contato</a>
            <a href="/patient-portal">Login</a>
        </div>
    </header>
    ${mainHtml}
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>O seu médico. Online. Sempre.</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                    <div class="lon-footer-payments" aria-label="Métodos de pagamento">
                        <span>Visa</span>
                        <span>Mastercard</span>
                        <span>MB Way</span>
                        <span>Multibanco</span>
                    </div>
                </div>
                <div class="lon-footer-col">
                    <h4>Serviços</h4>
                    <a href="/marcar/urgente">Consulta de Urgência</a>
                    <a href="/marcar/clinica-geral">Clínica Geral</a>
                    <a href="/marcar/travel">Consulta do Viajante</a>
                    <a href="/marcar/saude-mental">Saúde Mental</a>
                    <a href="/marcar/longevidade">Longevidade</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Clínica</h4>
                    <a href="/info.html?page=sobre-nos">Sobre nós</a>
                    <a href="/equipa/rita-aguiar">A equipa</a>
                    <a href="/info.html?page=parcerias">Parcerias</a>
                    <a href="/info.html?page=registo-medico">Registo médico</a>
                    <a href="/info.html?page=contato">Contato</a>
                    <a href="/info.html?page=trabalhe-connosco">Trabalhe connosco</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Apoio</h4>
                    <a href="/faq">Perguntas frequentes</a>
                    <a href="/magazine">Magazine</a>
                    <a href="/blog">Guides</a>
                    <a href="/info.html?page=como-funciona">Como funciona</a>
                    <a href="/info.html?page=seguranca-dados">Segurança dos dados</a>
                    <a href="/info.html?page=acessibilidade">Acessibilidade</a>
                    <a href="/info.html?page=reclamacoes">Reclamações</a>
                </div>
            </div>
            <div class="lon-footer-bottom">
                <div class="lon-footer-legal-links">
                    <a href="/info.html?page=termos-condicoes">Termos e condições</a>
                    <a href="/info.html?page=politica-privacidade">Política de privacidade</a>
                    <a href="/info.html?page=cookies">Cookies</a>
                    <a href="/info.html?page=politica-nao-discriminacao">Política de não discriminação</a>
                    <a href="/info.html?page=livro-reclamacoes">Livro de reclamações</a>
                </div>
                <div>
                    <p>© 2026 Lon Clinic · Portugal</p>
                </div>
            </div>
        </div>
    </footer>
    <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer" class="lon-wa-float" aria-label="Contactar por WhatsApp">💬</a>
    <style>.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}</style>
    <script src="/lon-nav.js"></script>
</body>
</html>`;
}

function renderBlogIndex(origin) {
    const o = normalizeOrigin(origin);
    const manifest = loadManifest();
    const articles = sortArticles((manifest.articles || []).filter((a) => isValidSlug(a.slug)));
    const defaultOg = `${o}/image/image2.webp`;

    const cards = articles.map((a) => {
        const slug = a.slug;
        const href = `/blog/${encodeURIComponent(slug)}`;
        const t = escapeHtml(String(a.title || slug));
        const d = escapeHtml(String(a.description || ''));
        const iso = String(a.dateModified || a.datePublished || '').slice(0, 10);
        const date = iso
            ? `<time datetime="${escapeHtml(iso)}">Atualizado em ${escapeHtml(magDate(iso))}</time>`
            : '';
        const imagePath = a.image
            ? `${String(a.image).startsWith('/') ? '' : '/'}${String(a.image)}`
            : '/image/image2.webp';
        const img = escapeHtml(imagePath);
        return `
                <article class="lon-service-card is-visible guide-card" role="listitem">
                    <div class="guide-card-inner">
                        <a class="guide-card-media" href="${href}" aria-label="${t}" style="background-image:url('${img}')">
                            <span class="guide-card-free">FREE</span>
                        </a>
                        <div class="guide-card-content">
                            <p class="guide-card-date">${date}</p>
                            <p class="eeat-byline guide-card-byline"><a rel="author" href="${authors.authorPath(authors.getAuthor())}">Médica · ${authors.getAuthor().yearsPractice} anos de prática clínica</a></p>
                            <h2 class="guide-card-title"><a href="${href}">${t}</a></h2>
                            <p class="guide-card-desc">${d}</p>
                            <a class="lon-btn lon-btn-soft lon-btn-sm" href="${href}">Ler artigo</a>
                        </div>
                    </div>
                </article>`;
    }).join('');

    const emptyState = articles.length
        ? ''
        : `<p class="guide-empty">Ainda não há artigos publicados. Volte em breve.</p>`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Guias Médicos Profissionais | Lon Clinic',
        description: 'Descubra as melhores informações médicas para o seu bem-estar',
        url: `${o}/blog`,
        blogPost: articles.map((a) => ({
            '@type': 'BlogPosting',
            headline: String(a.title || a.slug),
            description: String(a.description || ''),
            url: `${o}/blog/${encodeURIComponent(a.slug)}`,
            datePublished: a.datePublished || undefined,
            dateModified: a.dateModified || a.datePublished || undefined
        }))
    };

    const mainHtml = `
    <main id="conteudo-principal">
        <section class="guide-hero" aria-label="Guias">
            <div class="lon-container guide-hero-inner">
                <p class="dr-badge">Guias</p>
                <h1 class="guide-hero-title">Guias Médicos Profissionais</h1>
                <p class="guide-hero-lead">Descubra as melhores informações médicas para o seu bem-estar</p>
            </div>
        </section>
        <section class="guide-list-section" aria-label="Lista de artigos">
            <div class="lon-container">
                <div class="guide-articles-grid" role="list">
                    ${cards}
                    ${emptyState}
                </div>
            </div>
        </section>
    </main>`;

    return layoutGuidePage({
        origin: o,
        title: 'Guias Médicos Profissionais | Lon Clinic',
        description: 'Descubra as melhores informações médicas para o seu bem-estar',
        canonicalPath: '/blog',
        ogImage: defaultOg,
        jsonLd,
        mainHtml,
        navCurrent: 'guide',
        ogType: 'website',
        pageClass: 'guide-index'
    });
}

function renderBlogArticle(origin, slug) {
    if (!isValidSlug(slug)) {
        return null;
    }
    const o = normalizeOrigin(origin);
    const manifest = loadManifest();
    const meta = (manifest.articles || []).find((a) => a.slug === slug);
    if (!meta) {
        return null;
    }

    const format = meta.format === 'html' ? 'html' : 'markdown';
    const raw = readArticleFile(slug, format);
    if (raw === null) {
        return null;
    }

    const ctaKind = defaultCtaKind(meta);
    let articleHtml = bodyToHtml(raw, format === 'html' ? 'html' : 'markdown');
    if (format !== 'html') {
        articleHtml = injectBookingCards(articleHtml, ctaKind);
    }
    const relatedHtml = format === 'html' ? '' : relatedArticlesHtml(meta, manifest.articles);
    const title = String(meta.title || slug);
    const description = String(meta.description || '');
    const datePub = String(meta.datePublished || '');
    const dateMod = String(meta.dateModified || meta.datePublished || '');
    const og = meta.image ? `${o}${String(meta.image).startsWith('/') ? '' : '/'}${meta.image}` : `${o}/image/image2.webp`;

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': ['Article', 'MedicalWebPage'],
            headline: title,
            name: title,
            description,
            datePublished: datePub || undefined,
            dateModified: dateMod || undefined,
            inLanguage: 'pt-PT',
            url: `${o}/blog/${encodeURIComponent(slug)}`,
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `${o}/blog/${encodeURIComponent(slug)}`
            },
            image: og,
            ...(meta.about ? { about: { '@type': 'MedicalCondition', name: String(meta.about) } } : {}),
            ...authors.articleAuthorSchema(o)
        },
        authors.personJsonLd(o)
    ];
    if (Array.isArray(meta.faq) && meta.faq.length) {
        jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: meta.faq.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a }
            }))
        });
    }

    jsonLd.push(magBreadcrumbJsonLd(o, magBreadcrumbCrumbs(`/blog/${encodeURIComponent(slug)}`, title)));

    const isTravelGuide = /vacina|viajante|travel/i.test(slug);
    const byline = (() => {
        const a = authors.getAuthor(meta.author);
        const href = authors.authorPath(a);
        const iso = String(dateMod || datePub || '').slice(0, 10);
        const time = iso
            ? `<time datetime="${escapeHtml(iso)}">Atualizado em ${escapeHtml(magDate(iso))}</time><span aria-hidden="true"> · </span>`
            : '';
        return `<p class="eeat-byline mag-story-by">${time}<a class="eeat-byline-name" rel="author" href="${escapeHtml(href)}">Médica · ${a.yearsPractice} anos</a><span class="eeat-byline-review"> · Revisão clínica</span></p>`;
    })();
    const bio = authors.authorBioHtml(o, meta.author, dateMod || datePub);
    const leadFigure = meta.image
        ? `<figure class="guide-figure guide-figure-lead mag-story-hero"><img src="${escapeHtml(String(meta.image).startsWith('/') ? meta.image : `/${meta.image}`)}" alt="${escapeHtml(title)}" width="1600" height="900" decoding="async"></figure>`
        : '';

    const articlePath = `/blog/${encodeURIComponent(slug)}`;
    const crumbsHtml = magBreadcrumbHtml(magBreadcrumbCrumbs(articlePath, title));
    const kicker = magThemeLabel(meta);
    const note = isTravelGuide
        ? 'Informação de carácter geral — não substitui consulta médica. Horários dos centros de vacinação podem alterar-se.'
        : 'Informação de carácter geral — não substitui consulta médica individualizada.';
    const closeCta = `<section class="mag-section mag-wrap mag-article-cta">${magCtaHtml(articleCluster(meta) === 'travel' ? 'travel' : articleCluster(meta) === 'mental' ? 'mental' : 'clinic')}</section>`;
    const articleInner = format === 'markdown'
        ? `
    <main id="conteudo-principal" class="guide-article-main mag-article-main">
        <article class="mag-story" itemscope itemtype="https://schema.org/MedicalWebPage">
            <header class="mag-story-head">
                ${crumbsHtml}
                <p class="mag-story-kicker">${escapeHtml(kicker)}</p>
                <h1 class="mag-story-title" itemprop="headline">${escapeHtml(title)}</h1>
                <p class="mag-story-dek">${escapeHtml(description)}</p>
                ${byline}
            </header>
            ${leadFigure}
            <div class="mag-story-body">
            <p class="mag-story-note">${escapeHtml(note)}</p>
            <div class="guide-prose mag-story-prose" lang="pt-PT">
                ${articleHtml}
            </div>
            </div>
            ${relatedHtml}
            ${closeCta}
            <div class="mag-story-body mag-story-body--foot">
            ${bio}
            </div>
        </article>
    </main>`
        : `
    <main id="conteudo-principal" class="guide-article-main-html mag-article-main">
        <article class="mag-story mag-story--html">
            <header class="mag-story-head mag-story-head--html">
                ${crumbsHtml}
                <p class="mag-story-kicker">${escapeHtml(kicker)}</p>
                ${byline}
            </header>
            <div class="guide-prose" lang="pt-PT">
                ${articleHtml}
            </div>
            ${closeCta}
            ${bio}
        </article>
    </main>`;

    const html = layoutMagazinePage({
        origin: o,
        title: `${title} | LON Magazine`,
        description,
        canonicalPath: articlePath,
        ogImage: og,
        jsonLd,
        ogType: 'article',
        extraCss: ['/landing.css?v=20260418k'],
        extraCssAfter: ['/guide.css?v=20260820l', '/author.css?v=20260820l', '/magazine.css?v=20260820l'],
        mainHtml: magAppHtml(articlePath, `
            ${magTopbarHtml({ magazineCurrent: true })}
            ${articleInner}
            ${magFootHtml()}`)
    });

    return { html };
}

function renderNotFound(origin) {
    const o = normalizeOrigin(origin);
    const mainHtml = `
    <main id="conteudo-principal">
        <div class="lon-container guide-not-found">
            <h1>Página não encontrada</h1>
            <p>O artigo que procura não existe ou foi movido.</p>
            <p><a class="lon-btn lon-btn-primary" href="/blog">Ver o Guide</a></p>
        </div>
    </main>`;
    return layoutGuidePage({
        origin: o,
        title: 'Não encontrado | Lon Clinic',
        description: 'O artigo pedido não foi encontrado.',
        canonicalPath: '/blog',
        ogImage: `${o}/image/image2.webp`,
        jsonLd: null,
        mainHtml,
        navCurrent: 'guide',
        ogType: 'website',
        robots: 'noindex, follow'
    });
}

function magTheme(article) {
    const about = String((article && article.about) || '').toLowerCase();
    const slug = String((article && article.slug) || '');
    if (/autismo|adhd/.test(about) || /autismo|adhd/.test(slug)) return 'mental';
    if (/vacina|viajante|travel/.test(slug)) return 'travel';
    return 'clinic';
}

function magThemeLabel(article) {
    const theme = magTheme(article);
    if (theme === 'mental') return 'Saúde mental';
    if (theme === 'travel') return 'Saúde do viajante';
    return 'Clínica';
}

function magCardDateHtml(article) {
    const iso = String((article && (article.dateModified || article.datePublished)) || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    return `<p class="mag-updated"><time datetime="${escapeHtml(iso)}">Atualizado em ${escapeHtml(magDate(iso))}</time></p>`;
}

function magCardBylineHtml(article) {
    return `<p class="mag-byline">${escapeHtml(authors.reviewerBylineSnippet(article && article.author))}</p>`;
}

function magCardHtml(article, opts) {
    const extraClass = opts && opts.cardClass ? ` ${opts.cardClass}` : '';
    const kicker = opts && opts.kicker
        ? `<span class="guide-related-kicker">${escapeHtml(relatedKicker(article))}</span>`
        : '';
    const excerpt = article.description
        ? `<p class="mag-excerpt">${escapeHtml(article.description)}</p>`
        : '';
    const titleClass = extraClass.includes('guide-related-card') ? ' class="guide-related-title"' : '';
    return `<a class="mag-card${extraClass}" href="${magHref(article)}">
                <span class="mag-photo" style="background-image:url('${magImage(article)}')"></span>
                ${kicker}
                <h3${titleClass}>${escapeHtml(article.title)}</h3>
                ${magCardDateHtml(article)}
                ${magCardBylineHtml(article)}
                ${excerpt}
            </a>`;
}

function magCtaHtml(kind) {
    const packs = {
        mental: {
            kicker: 'Saúde mental',
            title: 'Psicologia e avaliação clínica',
            actions: [
                { href: '/saudemental', label: 'Psicologia' },
                { href: '/teste-personalidade', label: 'Teste de personalidade' }
            ]
        },
        travel: {
            kicker: 'Saúde do viajante',
            title: 'Consulta do viajante',
            actions: [
                { href: '/marcar/travel', label: 'Marcar consulta do viajante' },
                { href: '/travel-clinic', label: 'Clínica do viajante' }
            ]
        },
        burnout: {
            kicker: 'Burnout',
            title: 'Teste e consulta anti-burnout',
            actions: [
                { href: '/burnout/teste', label: 'Teste gratuito' },
                { href: '/marcar/burnout', label: 'Consulta de burnout' }
            ]
        },
        clinic: {
            kicker: 'Clínica',
            title: 'Consulta de clínica geral',
            actions: [
                { href: '/marcar/clinica-geral', label: 'Clínica geral' },
                { href: '/blog/telemedicina-em-casa', label: 'Telemedicina em casa' }
            ]
        }
    };
    const pack = packs[kind] || packs.clinic;
    const actions = pack.actions.map((action, i) => (
        `<a class="${i === 0 ? 'mag-cta-primary' : 'mag-cta-ghost'}" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`
    )).join('');
    return `<aside class="mag-cta" aria-label="${escapeHtml(pack.title)}">
                <p>${escapeHtml(pack.kicker)}</p>
                <h2>${escapeHtml(pack.title)}</h2>
                <div class="mag-cta-actions">${actions}
                </div>
            </aside>`;
}

function magClusterHtml() {
    return `<aside class="mag-cluster mag-wrap" aria-label="Autismo, ADHD e burnout">
                <p class="mag-cluster-kicker">O mesmo cluster clínico</p>
                <p class="mag-cluster-dek">Mascaramento, hiperfoco e esgotamento sobrepõem-se. Leia em conjunto o <a href="/blog/autismo-em-mulheres-diagnostico-tardio">diagnóstico tardio de autismo em mulheres</a>, os <a href="/blog/adhd-em-adultos-sintomas">sinais de ADHD em adultos</a> e <a href="/burnout/o-que-e">o que é burnout</a> — não como categorias isoladas.</p>
                ${magCtaHtml('burnout')}
            </aside>`;
}

function magThemeRowHtml(id, title, articles, ctaKind) {
    if (!articles.length) return '';
    const cta = ctaKind ? magCtaHtml(ctaKind) : '';
    return `<section class="mag-section mag-wrap" id="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title">
                <div class="mag-section-head">
                    <h2 id="${escapeHtml(id)}-title">${escapeHtml(title)}</h2>
                </div>
                <div class="mag-row">${articles.map(magCardHtml).join('')}
                </div>
                ${cta}
            </section>`;
}

function magDate(iso) {
    const raw = String(iso || '').slice(0, 10);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return raw;
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const month = months[Number(m[2]) - 1] || m[2];
    return `${Number(m[3])} ${month} ${m[1]}`;
}

function magImage(article) {
    const image = article && article.image
        ? `${String(article.image).startsWith('/') ? '' : '/'}${String(article.image)}`
        : '/image/image2.webp';
    return escapeHtml(image);
}

function magHref(article) {
    if (article && article.href) return article.href;
    return `/blog/${encodeURIComponent(article.slug)}`;
}

function magazineNavTree() {
    return [
        {
            label: 'Saúde mental',
            children: [
                {
                    label: 'Autismo',
                    children: [
                        { label: 'Diagnóstico tardio em mulheres', href: '/blog/autismo-em-mulheres-diagnostico-tardio' },
                        { label: 'Interesse especial', href: '/blog/autismo-nas-mulheres-interesse-especial' }
                    ]
                },
                { label: 'ADHD em adultos', href: '/blog/adhd-em-adultos-sintomas' },
                {
                    label: 'Burnout',
                    children: [
                        { label: 'Centro burnout', href: '/burnout' },
                        { label: 'O que é', href: '/burnout/o-que-e' },
                        { label: 'Sintomas', href: '/burnout/sintomas' },
                        { label: 'Tratamento', href: '/burnout/tratamento' },
                        { label: 'Recuperação', href: '/burnout/recuperacao' },
                        { label: 'Burnout ou depressão', href: '/burnout/depressao-ou-burnout' },
                        { label: 'Parental', href: '/burnout/burnout-parental' },
                        { label: 'Médicos', href: '/burnout/medicos' },
                        { label: 'Founders', href: '/burnout/fundadores' },
                        { label: 'Teste', href: '/burnout/teste' }
                    ]
                },
                { label: 'Consulta de saúde mental', href: '/marcar/saude-mental' },
                { label: 'Psicologia (subscrição)', href: '/saudemental' }
            ]
        },
        {
            label: 'Clínica turista',
            children: [
                { label: 'Tourist clinic', href: '/tourist-clinic' },
                { label: 'See a doctor as a tourist', href: '/see-doctor-portugal-tourist' },
                { label: 'UTI in Portugal', href: '/uti-portugal-what-to-do' },
                { label: 'Renew a prescription', href: '/renew-prescription-holiday-portugal' },
                { label: 'Médico siendo turista', href: '/ver-medico-portugal-turista' }
            ]
        },
        {
            label: 'Saúde do viajante',
            children: [
                { label: 'Clínica do viajante', href: '/travel-clinic' },
                {
                    label: 'Vacina da febre amarela',
                    children: [
                        { label: 'Guia completo', href: '/blog/vacina-febre-amarela-guia-completo' },
                        { label: 'Lisboa', href: '/blog/vacina-febre-amarela-lisboa' },
                        { label: 'Porto', href: '/blog/vacina-febre-amarela-porto' },
                        { label: 'Coimbra', href: '/blog/vacina-febre-amarela-coimbra' },
                        { label: 'Braga', href: '/blog/vacina-febre-amarela-braga' },
                        { label: 'Faro e Algarve', href: '/blog/vacina-febre-amarela-algarve' },
                        { label: 'CUF', href: '/blog/vacina-febre-amarela-cuf' }
                    ]
                },
                { label: 'Consulta do viajante', href: '/marcar/travel' }
            ]
        },
        {
            label: 'Clínica',
            children: [
                { label: 'Telemedicina em casa', href: '/blog/telemedicina-em-casa' },
                { label: 'Como marcar', href: '/blog/marcacao-guia-rapido' }
            ]
        }
    ];
}

function magPath(href) {
    return String(href || '').split('?')[0];
}

function magAnchorId(label) {
    return String(label || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function magFindNavPath(currentPath) {
    function walk(nodes, trail) {
        for (const node of nodes) {
            const next = trail.concat(node);
            if (node.href && magPath(node.href) === currentPath) return next;
            const found = walk(Array.isArray(node.children) ? node.children : [], next);
            if (found) return found;
        }
        return null;
    }
    return walk(magazineNavTree(), []);
}

function magCrumbHref(node) {
    if (node && node.href) return magPath(node.href);
    const id = magAnchorId(node && node.label);
    return id ? `/magazine#${id}` : '/magazine';
}

function magBreadcrumbCrumbs(currentPath, pageTitle) {
    const trail = magFindNavPath(currentPath) || [];
    const items = [{ name: 'Magazine', href: '/magazine' }];
    trail.forEach((node, i) => {
        const isLast = i === trail.length - 1;
        items.push({
            name: node.label,
            href: isLast ? currentPath : magCrumbHref(node),
            current: isLast
        });
    });
    if (!trail.length) {
        items[0].current = true;
        if (pageTitle && currentPath && currentPath !== '/magazine') {
            items.push({ name: pageTitle, href: currentPath, current: true });
            items[0].current = false;
        }
    }
    return items;
}

function magBreadcrumbHtml(crumbs) {
    const items = Array.isArray(crumbs) ? crumbs : [];
    if (!items.length) return '';
    const lis = items.map((crumb, i) => {
        const last = Boolean(crumb.current) || i === items.length - 1;
        if (last) {
            return `<li><span aria-current="page">${escapeHtml(crumb.name)}</span></li>`;
        }
        return `<li><a href="${escapeHtml(crumb.href)}">${escapeHtml(crumb.name)}</a></li>`;
    }).join('');
    return `<nav class="mag-breadcrumb" aria-label="Caminho"><ol>${lis}</ol></nav>`;
}

function magBreadcrumbJsonLd(origin, crumbs) {
    const o = normalizeOrigin(origin);
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: (Array.isArray(crumbs) ? crumbs : []).map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.name,
            item: `${o}${crumb.href}`
        }))
    };
}

function magTopicAnchorsHtml() {
    const skip = new Set(['saude-mental', 'saude-do-viajante', 'clinica']);
    const ids = [];
    function walk(nodes) {
        (Array.isArray(nodes) ? nodes : []).forEach((node) => {
            const kids = Array.isArray(node.children) ? node.children : [];
            if (kids.length) {
                const id = magAnchorId(node.label);
                if (id && !skip.has(id)) ids.push(id);
                walk(kids);
            }
        });
    }
    walk(magazineNavTree());
    return ids.map((id) => `<span id="${escapeHtml(id)}" class="visually-hidden"></span>`).join('');
}

function magNavContains(node, currentPath) {
    if (!currentPath) return false;
    if (node.href && magPath(node.href) === currentPath) return true;
    return (Array.isArray(node.children) ? node.children : []).some((child) => magNavContains(child, currentPath));
}

function magNavNode(node, depth, currentPath) {
    const kids = Array.isArray(node.children) ? node.children : [];
    if (!kids.length) {
        const current = node.href && magPath(node.href) === currentPath ? ' aria-current="page"' : '';
        return `<li class="mag-nav-leaf mag-nav-d${depth}"><a href="${escapeHtml(node.href)}"${current}>${escapeHtml(node.label)}</a></li>`;
    }
    const open = magNavContains(node, currentPath) ? ' open' : '';
    return `<li class="mag-nav-branch mag-nav-d${depth}"><details${open}><summary>${escapeHtml(node.label)}</summary><ul>${kids.map((child) => magNavNode(child, depth + 1, currentPath)).join('')}</ul></details></li>`;
}

function magSidenavHtml(currentPath) {
    const tree = magazineNavTree().map((node) => magNavNode(node, 0, currentPath || '')).join('');
    return `<nav class="mag-sidenav" id="mag-sidenav" aria-label="Temas da revista">
        <a class="mag-sidenav-brand" href="/magazine">LON <em>Magazine</em></a>
        <ul class="mag-nav">${tree}</ul>
    </nav>`;
}

function magTopbarHtml(opts) {
    const magCurrent = opts && opts.magazineCurrent ? ' aria-current="page"' : '';
    return `<header class="mag-topbar">
                <a href="/">LON Clinic</a>
                <button type="button" class="mag-nav-toggle" aria-expanded="false" aria-controls="mag-sidenav">Menu</button>
                <nav aria-label="Magazine">
                    <a href="/magazine"${magCurrent}>Magazine</a>
                    <a href="/blog">Guides</a>
                    <a href="/marcar/saude-mental">Marcar</a>
                </nav>
            </header>`;
}

function magFootHtml() {
    return `<footer class="mag-foot">
                <span>© 2026 Lon Clinic · ERS 45475</span>
                <span>
                    <a href="/">Início</a>
                    <a href="/magazine">Magazine</a>
                    <a href="/blog">Guides</a>
                    <a href="/info.html?page=contato">Contato</a>
                </span>
            </footer>`;
}

function magAppHtml(currentPath, stageInner) {
    return `<div class="mag-app">
        ${magSidenavHtml(currentPath)}
        <div class="mag-stage">
            ${stageInner}
        </div>
    </div>`;
}

function layoutMagazinePage(opts) {
    const {
        origin,
        title,
        description,
        canonicalPath,
        ogImage,
        jsonLd,
        mainHtml,
        extraCss,
        extraCssAfter,
        ogType
    } = opts;
    const canonicalUrl = `${origin}${canonicalPath}`;
    const graph = Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : []);
    graph.push(organizationJsonLd(origin));
    const extraCssHtml = (Array.isArray(extraCss) ? extraCss : [])
        .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
        .join('\n    ');
    const extraCssAfterHtml = (Array.isArray(extraCssAfter) ? extraCssAfter : [])
        .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
        .join('\n    ');
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
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="${escapeHtml(ogType || 'website')}">
    <meta property="og:site_name" content="LON Magazine">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">
    <meta name="theme-color" content="#14110f">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    ${extraCssHtml}
    <link rel="stylesheet" href="/magazine.css?v=20260820l">
    ${extraCssAfterHtml}
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    ${jsonLdScript(graph)}
</head>
<body class="mag-body">
    <a class="lon-skip visually-hidden" href="#conteudo-principal">Saltar para o conteúdo</a>
    ${mainHtml}
    <style>.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}</style>
    <script>
      (function () {
        var button = document.querySelector('.mag-nav-toggle');
        var nav = document.getElementById('mag-sidenav');
        if (button && nav) {
          button.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
          });
        }
        if (!nav) return;
        var roots = nav.querySelectorAll('.mag-nav > .mag-nav-branch > details');
        roots.forEach(function (item) {
          item.addEventListener('toggle', function () {
            if (!item.open) return;
            roots.forEach(function (other) {
              if (other !== item) other.open = false;
            });
          });
        });
      })();
    </script>
    <script src="/lon-analytics.js?v=20260817a" defer></script>
</body>
</html>`;
}

function renderMagazineIndex(origin) {
    const o = normalizeOrigin(origin);
    const articles = sortArticles((loadManifest().articles || []).filter((a) => isValidSlug(a.slug)));
    const mental = articles.filter((a) => magTheme(a) === 'mental');
    const travel = articles.filter((a) => magTheme(a) === 'travel');
    const clinic = articles.filter((a) => magTheme(a) === 'clinic');
    const cover = mental[0] || articles[0];
    const og = cover && cover.image
        ? `${o}${String(cover.image).startsWith('/') ? '' : '/'}${cover.image}`
        : `${o}/image/image2.webp`;
    const rowsHtml = [
        magThemeRowHtml('saude-mental', 'Saúde mental', mental, 'mental'),
        magClusterHtml(),
        magThemeRowHtml('saude-do-viajante', 'Saúde do viajante', travel, 'travel'),
        magThemeRowHtml('clinica', 'Clínica', clinic, 'clinic')
    ].join('');

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'LON Magazine',
            description: 'A revista da Lon Clinic: autismo em mulheres, ADHD, saúde mental e medicina de viagem. Reportagens com revisão clínica.',
            url: `${o}/magazine`,
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            ...authors.articleAuthorSchema(o),
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: articles.map((a, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    item: {
                        '@type': ['Article', 'MedicalWebPage'],
                        headline: String(a.title || a.slug),
                        url: `${o}/blog/${encodeURIComponent(a.slug)}`,
                        datePublished: a.datePublished || undefined,
                        dateModified: a.dateModified || a.datePublished || undefined,
                        ...authors.articleAuthorSchema(o, a.author)
                    }
                }))
            }
        },
        authors.personJsonLd(o),
        magBreadcrumbJsonLd(o, magBreadcrumbCrumbs('/magazine', 'Magazine'))
    ];

    const reviewer = authors.getAuthor();
    const mainHtml = magAppHtml('/magazine', `
            ${magTopbarHtml({ magazineCurrent: true })}
            <main id="conteudo-principal" class="mag-content">
                ${magTopicAnchorsHtml()}
                <header class="mag-masthead mag-wrap">
                    ${magBreadcrumbHtml(magBreadcrumbCrumbs('/magazine', 'Magazine'))}
                    <p class="mag-masthead-kicker">Reportagens com revisão clínica</p>
                    <p class="mag-masthead-dek">Cada artigo é revisto por ${escapeHtml(reviewer.displayName)}, ${escapeHtml(reviewer.jobTitle).toLowerCase()} inscrita na ${escapeHtml(reviewer.memberOf)}.</p>
                </header>
                ${rowsHtml}
            </main>
            ${magFootHtml()}`);

    return layoutMagazinePage({
        origin: o,
        title: 'LON Magazine | Saúde, mente e vida',
        description: 'A revista da Lon Clinic: autismo em mulheres, ADHD, saúde mental e medicina de viagem. Reportagens com revisão clínica.',
        canonicalPath: '/magazine',
        ogImage: og,
        jsonLd,
        mainHtml
    });
}

module.exports = {
    escapeHtml,
    isValidSlug,
    renderBlogIndex,
    renderMagazineIndex,
    renderBlogArticle,
    renderNotFound,
    loadManifest,
    sortArticles
};
