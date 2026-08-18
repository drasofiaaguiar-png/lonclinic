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
    return 'Guide';
}

function bookingCardsHtml(kind) {
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
    const items = cards.map((card) => `
        <article class="guide-book-card">
            <p class="guide-book-chip">${escapeHtml(card.chip)}</p>
            <h3 class="guide-book-title">${escapeHtml(card.title)}</h3>
            <p class="guide-book-price">${escapeHtml(card.price)}</p>
            <p class="guide-book-note">${escapeHtml(card.note)}</p>
            <a class="lon-btn lon-btn-primary lon-btn-sm" href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>`).join('');
    return `
<aside class="guide-book" aria-label="Marcar consulta">
    <div class="guide-book-grid">${items}
    </div>
</aside>`;
}

function expandCtaTokens(html, kind) {
    return String(html || '').replace(
        /<p>\s*\{\{cta(?::([a-z-]+))?\}\}\s*<\/p>|\{\{cta(?::([a-z-]+))?\}\}/gi,
        (_, a, b) => bookingCardsHtml(a || b || kind)
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
    const picked = [];
    const seen = new Set([current.slug]);
    const push = (article) => {
        if (!article || seen.has(article.slug) || picked.length >= 3) return;
        seen.add(article.slug);
        picked.push(article);
    };
    (Array.isArray(current.related) ? current.related : []).forEach((slug) => push(bySlug.get(slug)));
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
    const cards = related.map((a) => {
        const href = `/blog/${encodeURIComponent(a.slug)}`;
        return `
        <a class="guide-related-card" href="${href}">
            <span class="guide-related-kicker">${escapeHtml(relatedKicker(a))}</span>
            <strong class="guide-related-title">${escapeHtml(a.title || a.slug)}</strong>
            <span class="guide-related-desc">${escapeHtml(a.description || '')}</span>
        </a>`;
    }).join('');
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
    <link rel="stylesheet" href="/guide.css?v=20260818c">
    <link rel="stylesheet" href="/author.css?v=20260818a">
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
        const date = escapeHtml(String(a.datePublished || ''));
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

    const isTravelGuide = /vacina|viajante|travel/i.test(slug);
    const topMedicalNotice = isTravelGuide
        ? `<div class="guide-top-disclaimer">Informação de carácter geral — não substitui consulta médica individualizada. Horários e contactos dos Centros de Vacinação Internacional sujeitos a alteração. Confirme sempre junto da instituição antes de se deslocar.</div>`
        : `<div class="guide-top-disclaimer">Informação de carácter geral — não substitui consulta médica individualizada.</div>`;
    const byline = authors.authorBylineHtml(o, meta.author, datePub);
    const bio = authors.authorBioHtml(o, meta.author);
    const leadFigure = meta.image
        ? `<figure class="guide-figure guide-figure-lead"><img src="${escapeHtml(String(meta.image).startsWith('/') ? meta.image : `/${meta.image}`)}" alt="${escapeHtml(title)}" width="1600" height="900" decoding="async"></figure>`
        : '';

    const mainHtml = format === 'markdown'
        ? `
    <main id="conteudo-principal" class="guide-article-main">
        <article class="guide-article-wrap" itemscope itemtype="https://schema.org/MedicalWebPage">
            ${topMedicalNotice}
            <header class="guide-article-header">
                <div class="guide-article-intro">
                    <div class="guide-article-intro-left">
                        <h1 class="guide-article-title" itemprop="headline">${escapeHtml(title)}</h1>
                        <p class="guide-article-summary">${escapeHtml(description)}</p>
                        ${byline}
                    </div>
                    <div class="guide-article-intro-right">
                        <nav class="guide-breadcrumb" aria-label="Caminho de navegação">
                            <a href="/blog">Guide</a>
                            <span aria-hidden="true"> / </span>
                            <span class="visually-hidden">Artigo atual: </span>
                            <span>${escapeHtml(title)}</span>
                        </nav>
                        <p class="guide-article-date">${escapeHtml(datePub)}</p>
                    </div>
                </div>
            </header>
            <section class="guide-article-content" aria-label="Conteúdo do artigo">
                ${leadFigure}
                <div class="guide-prose" lang="pt-PT">
                    ${articleHtml}
                </div>
                ${relatedHtml}
            </section>
            ${bio}
        </article>
    </main>`
        : `
    <main id="conteudo-principal" class="guide-article-main-html">
        <article class="guide-article-wrap">
            ${byline}
            <div class="guide-prose" lang="pt-PT">
                ${articleHtml}
            </div>
            ${bio}
        </article>
    </main>`;

    const html = layoutGuidePage({
        origin: o,
        title: `${title} | Guide Lon Clinic`,
        description,
        canonicalPath: `/blog/${encodeURIComponent(slug)}`,
        ogImage: og,
        jsonLd,
        mainHtml,
        navCurrent: 'guide'
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

function magKicker(article) {
    const about = String((article && article.about) || '').toLowerCase();
    const slug = String((article && article.slug) || '');
    if (/autismo|adhd/.test(about) || /autismo|adhd/.test(slug)) return 'Mente';
    if (/vacina|viajante|travel|marcacao/.test(slug)) return 'Viagem';
    if (/telemedicina/.test(slug)) return 'Clínica';
    return 'Bem-estar';
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

function magNavNode(node, depth) {
    const kids = Array.isArray(node.children) ? node.children : [];
    if (!kids.length) {
        return `<li class="mag-nav-leaf mag-nav-d${depth}"><a href="${escapeHtml(node.href)}">${escapeHtml(node.label)}</a></li>`;
    }
    return `<li class="mag-nav-branch mag-nav-d${depth}"><details><summary>${escapeHtml(node.label)}</summary><ul>${kids.map((child) => magNavNode(child, depth + 1)).join('')}</ul></details></li>`;
}

function magSidenavHtml() {
    const tree = magazineNavTree().map((node) => magNavNode(node, 0)).join('');
    return `<nav class="mag-sidenav" id="mag-sidenav" aria-label="Temas da revista">
        <a class="mag-sidenav-brand" href="/magazine">LON <em>Magazine</em></a>
        <ul class="mag-nav">${tree}</ul>
    </nav>`;
}

function layoutMagazinePage(opts) {
    const {
        origin,
        title,
        description,
        canonicalPath,
        ogImage,
        jsonLd,
        mainHtml
    } = opts;
    const canonicalUrl = `${origin}${canonicalPath}`;
    const graph = Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : []);
    graph.push(organizationJsonLd(origin));
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
    <meta property="og:type" content="website">
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
    <link rel="stylesheet" href="/magazine.css?v=20260818e">
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
    const mind = articles.filter((a) => magKicker(a) === 'Mente');
    const travel = articles.filter((a) => magKicker(a) === 'Viagem');
    const rest = articles.filter((a) => magKicker(a) !== 'Mente' && magKicker(a) !== 'Viagem');
    const cover = mind[0] || articles[0];
    const features = mind.slice(1).concat(rest);
    const featureMain = features[0];
    const featureStack = features.slice(1, 4);
    const usedSlugs = new Set([cover, featureMain, ...featureStack].filter(Boolean).map((a) => a.slug));
    const well = articles.filter((a) => !usedSlugs.has(a.slug)).slice(0, 3);
    const wellSlugs = new Set(well.map((a) => a.slug));
    const travelGrid = travel.filter((a) => !wellSlugs.has(a.slug)).slice(0, 6);
    const toc = articles.slice(0, 8);
    const coverImg = cover ? magImage(cover) : `${o}/image/image2.webp`;
    const og = cover && cover.image
        ? `${o}${String(cover.image).startsWith('/') ? '' : '/'}${cover.image}`
        : `${o}/image/image2.webp`;

    const coverHtml = cover
        ? `<section class="mag-cover" aria-label="Reportagem de capa">
        <div class="mag-cover-media" style="background-image:url('${coverImg}')" role="img" aria-label="${escapeHtml(cover.title)}"></div>
        <div class="mag-cover-copy">
            <p class="mag-label">${escapeHtml(magKicker(cover))}</p>
            <h1>${escapeHtml(cover.title)}</h1>
            <p class="mag-dek">${escapeHtml(cover.description || '')}</p>
            <p class="mag-meta">${escapeHtml(magDate(cover.datePublished))}</p>
            <a class="mag-read" href="${magHref(cover)}">Ler</a>
        </div>
    </section>`
        : '';

    const stackHtml = featureStack.map((a) => `
            <a href="${magHref(a)}">
                <span class="mag-photo" style="background-image:url('${magImage(a)}')"></span>
                <span>
                    <p class="mag-label">${escapeHtml(magKicker(a))}</p>
                    <h3>${escapeHtml(a.title)}</h3>
                </span>
            </a>`).join('');

    const featureHtml = featureMain
        ? `<section class="mag-section mag-wrap" aria-labelledby="mag-features-title">
        <div class="mag-section-head">
            <h2 id="mag-features-title">Nesta edição</h2>
            <p>Saúde da mulher · mente · clínica</p>
        </div>
        <div class="mag-features">
            <a class="mag-feature-main" href="${magHref(featureMain)}">
                <span class="mag-photo" style="background-image:url('${magImage(featureMain)}')"></span>
                <p class="mag-label">${escapeHtml(magKicker(featureMain))}</p>
                <h3>${escapeHtml(featureMain.title)}</h3>
                <p class="mag-excerpt">${escapeHtml(featureMain.description || '')}</p>
            </a>
            <div class="mag-stack">${stackHtml}
            </div>
        </div>
    </section>`
        : '';

    const wellCards = well.map((a) => `
            <a class="mag-card" href="${magHref(a)}">
                <span class="mag-photo" style="background-image:url('${magImage(a)}')"></span>
                <p class="mag-label">${escapeHtml(magKicker(a))}</p>
                <h3>${escapeHtml(a.title)}</h3>
                <p class="mag-excerpt">${escapeHtml(a.description || '')}</p>
            </a>`).join('');

    const travelCards = travelGrid.map((a) => `
            <a class="mag-card" href="${magHref(a)}">
                <span class="mag-photo" style="background-image:url('${magImage(a)}')"></span>
                <p class="mag-label">Viagem</p>
                <h3>${escapeHtml(a.title)}</h3>
            </a>`).join('');

    const tocHtml = toc.map((a, i) => `
            <li>
                <span class="mag-toc-n">${String(i + 1).padStart(2, '0')}</span>
                <span class="mag-toc-rubric">${escapeHtml(magKicker(a))}</span>
                <a href="${magHref(a)}">${escapeHtml(a.title)}</a>
                <span class="mag-toc-date">${escapeHtml(magDate(a.datePublished))}</span>
            </li>`).join('');

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'LON Magazine',
        description: 'A revista da Lon Clinic: mente, saúde da mulher, clínica e viagem.',
        url: `${o}/magazine`,
        isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: articles.map((a, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${o}/blog/${encodeURIComponent(a.slug)}`,
                name: String(a.title || a.slug)
            }))
        }
    };

    const mainHtml = `
    <div class="mag-app">
        ${magSidenavHtml()}
        <div class="mag-stage">
            <header class="mag-topbar">
                <a href="/">LON Clinic</a>
                <button type="button" class="mag-nav-toggle" aria-expanded="false" aria-controls="mag-sidenav">Menu</button>
                <nav aria-label="Magazine">
                    <a href="/magazine" aria-current="page">Magazine</a>
                    <a href="/blog">Guides</a>
                    <a href="/marcar/saude-mental">Marcar</a>
                </nav>
            </header>
            <main id="conteudo-principal" class="mag-content">
                ${coverHtml}
                ${featureHtml}
                <section class="mag-section mag-wrap" aria-labelledby="mag-well-title">
                    <div class="mag-section-head">
                        <h2 id="mag-well-title">O consultório</h2>
                        <p>Leituras para continuar</p>
                    </div>
                    <div class="mag-well">${wellCards}
                    </div>
                </section>
                <section class="mag-section mag-wrap" aria-labelledby="mag-travel-title">
                    <div class="mag-section-head">
                        <h2 id="mag-travel-title">Destinos</h2>
                        <p>Vacina febre amarela · consulta do viajante</p>
                    </div>
                    <div class="mag-well">${travelCards}
                    </div>
                </section>
                <section class="mag-section mag-wrap" aria-labelledby="mag-toc-title">
                    <div class="mag-section-head">
                        <h2 id="mag-toc-title">Índice</h2>
                        <p>Toda a edição</p>
                    </div>
                    <ol class="mag-toc">${tocHtml}
                    </ol>
                    <aside class="mag-cta">
                        <p>LON Clinic</p>
                        <h2>Marcar consulta</h2>
                        <div class="mag-cta-actions">
                            <a class="mag-cta-primary" href="/marcar/saude-mental">Saúde mental</a>
                            <a class="mag-cta-ghost" href="/saudemental">Psicologia</a>
                        </div>
                    </aside>
                </section>
            </main>
            <footer class="mag-foot">
                <span>© 2026 Lon Clinic · ERS 45475</span>
                <span>
                    <a href="/">Início</a>
                    <a href="/blog">Guides</a>
                    <a href="/info.html?page=contato">Contato</a>
                </span>
            </footer>
        </div>
    </div>`;

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
