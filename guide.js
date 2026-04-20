/**
 * Lon Clinic — Guide (/blog): server-rendered listing and articles (Markdown or HTML fragments).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

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
    const ldJson = jsonLd ? `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n` : '';

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
    <meta name="author" content="Lon Clinic">
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
    <link rel="stylesheet" href="/guide.css?v=20260421c">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${ldJson}</head>
<body class="lon-landing guide-body${pageClass ? ` ${escapeHtml(pageClass)}` : ''}">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/#inicio">Início</a>
                <a href="/#platform">Plataforma</a>
                <a href="/#servicos">Serviços</a>
                <a${guideNavAttrs}>Guides</a>
                <a href="/#contacto">Contato</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/#servicos" class="lon-btn lon-btn-primary lon-btn-sm">Marcar consulta</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/#inicio">Início</a>
            <a href="/#platform">Plataforma</a>
            <a href="/#servicos">Serviços</a>
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
                    <a href="/info.html?page=parcerias">Parcerias</a>
                    <a href="/info.html?page=registo-medico">Registo médico</a>
                    <a href="/info.html?page=contato">Contato</a>
                    <a href="/info.html?page=trabalhe-connosco">Trabalhe connosco</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Apoio</h4>
                    <a href="/faq">Perguntas frequentes</a>
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
        name: 'Guide | Lon Clinic',
        description: 'Artigos sobre saúde, telemedicina e como tirar o máximo partido da Lon Clinic.',
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
        <section class="guide-hero" aria-label="Guide">
            <div class="lon-container guide-hero-inner">
                <p class="dr-badge">Guide</p>
                <h1 class="guide-hero-title">Artigos e recursos</h1>
                <p class="guide-hero-lead">Conteúdos sobre telemedicina, bem-estar e como usar a Lon Clinic com confiança.</p>
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
        title: 'Guide | Lon Clinic',
        description: 'Artigos sobre saúde, telemedicina e como usar os serviços da Lon Clinic.',
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

    const articleHtml = bodyToHtml(raw, format === 'html' ? 'html' : 'markdown');
    const title = String(meta.title || slug);
    const description = String(meta.description || '');
    const datePub = String(meta.datePublished || '');
    const dateMod = String(meta.dateModified || meta.datePublished || '');
    const og = meta.image ? `${o}${String(meta.image).startsWith('/') ? '' : '/'}${meta.image}` : `${o}/image/image2.webp`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        datePublished: datePub || undefined,
        dateModified: dateMod || undefined,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${o}/blog/${encodeURIComponent(slug)}`
        },
        author: {
            '@type': 'Organization',
            name: 'Lon Clinic'
        },
        publisher: {
            '@type': 'Organization',
            name: 'Lon Clinic',
            logo: {
                '@type': 'ImageObject',
                url: `${o}/image/image2.webp`
            }
        },
        image: og
    };

    const topMedicalNotice = `<div class="guide-top-disclaimer">Informação de carácter geral — não substitui consulta médica individualizada. Horários e contactos dos CVIs sujeitos a alteração. Confirme sempre junto da instituição antes de se deslocar.</div>`;

    const mainHtml = `
    <main id="conteudo-principal" class="guide-article-main">
        <article class="guide-article-wrap">
            ${topMedicalNotice}
            <header class="guide-article-header">
                <div class="guide-article-intro">
                    <div class="guide-article-intro-left">
                        <h1 class="guide-article-title">${escapeHtml(title)}</h1>
                        <p class="guide-article-summary">${escapeHtml(description)}</p>
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
                <div class="guide-prose" lang="pt-PT">
                    ${articleHtml}
                </div>
            </section>
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

module.exports = {
    escapeHtml,
    isValidSlug,
    renderBlogIndex,
    renderBlogArticle,
    renderNotFound,
    loadManifest,
    sortArticles
};
