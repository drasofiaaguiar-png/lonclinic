/**
 * E-E-A-T: named clinicians, credentials, and Person schema.
 * Default author for medical guides and burnout articles.
 */

'use strict';

const { originOf, organizationJsonLd, jsonLdScript } = require('./seo');

const OM_SEARCH_URL = 'https://www.ordemdosmedicos.pt/';
const ERS_URL = 'https://www.ers.pt/';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const AUTHORS = {
    'rita-aguiar': {
        slug: 'rita-aguiar',
        honorific: 'Drª',
        givenName: 'Rita',
        familyName: 'Aguiar',
        displayName: 'Drª Rita Aguiar',
        jobTitle: 'Médica',
        initials: 'RA',
        yearsPractice: 9,
        worksFor: 'Lon Clinic',
        memberOf: 'Ordem dos Médicos',
        alumniOf: 'Faculdade de Medicina da Universidade do Porto',
        knowsAbout: [
            'Medicina do Viajante',
            'Telemedicina',
            'Burnout',
            'Medicina preventiva',
            'Saúde ocupacional'
        ],
        credentials: [
            '9 anos de prática clínica',
            'Cédula profissional da Ordem dos Médicos em Portugal',
            'Pós-graduação em Medicina do Viajante e das Populações Móveis (2021), Faculdade de Medicina da Universidade do Porto',
            'Consultadoria na Organização Mundial de Saúde, secção de Populações Móveis (2023)'
        ],
        shortBio:
            'Médica com 9 anos de prática clínica. Escreve e revê os guias médicos da Lon Clinic com base na consulta real — não em conteúdo genérico.',
        longBio: [
            'A Drª Rita Aguiar é médica inscrita na Ordem dos Médicos e exerce há 9 anos. Na Lon Clinic, faz consultas de telemedicina — incluindo medicina do viajante, clínica geral e acompanhamento de burnout — e é a autora e revisora clínica dos artigos publicados neste site.',
            'Em 2021 concluiu a pós-graduação em Medicina do Viajante e das Populações Móveis na Faculdade de Medicina da Universidade do Porto. Em 2023 prestou consultadoria à Organização Mundial de Saúde, na secção de Populações Móveis.',
            'A Lon Clinic está registada na Entidade Reguladora da Saúde (ERS n.º 45475). A informação dos artigos é de carácter geral e não substitui uma consulta individualizada.'
        ],
        profiles: [
            { label: 'Perfil na Lon Clinic', href: '/equipa/rita-aguiar', external: false },
            { label: 'Ordem dos Médicos (pesquisa pública)', href: OM_SEARCH_URL, external: true },
            { label: 'ERS — prestador 45475', href: ERS_URL, external: true }
        ],
        // Add LinkedIn / unique OM listing URL here when they can be verified.
        sameAs: []
    }
};

const DEFAULT_AUTHOR_SLUG = 'rita-aguiar';

function getAuthor(slug) {
    const key = String(slug || DEFAULT_AUTHOR_SLUG);
    return AUTHORS[key] || AUTHORS[DEFAULT_AUTHOR_SLUG];
}

function authorPath(author) {
    return `/equipa/${encodeURIComponent(author.slug)}`;
}

function authorUrl(origin, author) {
    return `${originOf(origin)}${authorPath(author)}`;
}

function personId(origin, author) {
    return `${authorUrl(origin, author)}#person`;
}

function personNode(origin, slug) {
    const o = originOf(origin);
    const a = getAuthor(slug);
    const node = {
        '@type': ['Person', 'Physician'],
        '@id': personId(o, a),
        name: `${a.givenName} ${a.familyName}`,
        honorificPrefix: a.honorific,
        givenName: a.givenName,
        familyName: a.familyName,
        jobTitle: a.jobTitle,
        description: a.shortBio,
        url: authorUrl(o, a),
        worksFor: { '@id': `${o}/#organization` },
        memberOf: {
            '@type': 'Organization',
            name: a.memberOf,
            url: OM_SEARCH_URL
        },
        alumniOf: {
            '@type': 'CollegeOrUniversity',
            name: a.alumniOf
        },
        knowsAbout: a.knowsAbout,
        hasCredential: [
            {
                '@type': 'EducationalOccupationalCredential',
                credentialCategory: 'Cédula profissional',
                recognizedBy: { '@type': 'Organization', name: 'Ordem dos Médicos', url: OM_SEARCH_URL }
            },
            {
                '@type': 'EducationalOccupationalCredential',
                name: 'Pós-graduação em Medicina do Viajante e das Populações Móveis',
                dateCreated: '2021',
                recognizedBy: { '@type': 'CollegeOrUniversity', name: a.alumniOf }
            }
        ]
    };
    if (a.sameAs && a.sameAs.length) node.sameAs = a.sameAs;
    return node;
}

function personJsonLd(origin, slug) {
    return {
        '@context': 'https://schema.org',
        ...personNode(origin, slug)
    };
}

function articleAuthorSchema(origin, slug) {
    const o = originOf(origin);
    const a = getAuthor(slug);
    return {
        author: { '@id': personId(o, a) },
        reviewedBy: { '@id': personId(o, a) },
        publisher: { '@id': `${o}/#organization` },
        copyrightHolder: { '@id': `${o}/#organization` }
    };
}

function profileLinksHtml(author, { includeSelf } = {}) {
    return author.profiles
        .filter((p) => includeSelf || p.external)
        .map((p) => {
            const extra = p.external
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return `<a href="${escapeHtml(p.href)}"${extra}>${escapeHtml(p.label)}</a>`;
        })
        .join('<span aria-hidden="true"> · </span>');
}

function reviewerBylineSnippet(slug) {
    const a = getAuthor(slug);
    return `Revisto por ${a.displayName} · ${a.jobTitle} · ${a.memberOf}`;
}

function authorBylineHtml(origin, slug, dateLabel) {
    const a = getAuthor(slug);
    const href = authorPath(a);
    const dateBit = dateLabel
        ? `<time class="eeat-byline-date" datetime="${escapeHtml(String(dateLabel).slice(0, 10))}">${escapeHtml(dateLabel)}</time><span aria-hidden="true"> · </span>`
        : '';
    return `
        <p class="eeat-byline">
            ${dateBit}<a class="eeat-byline-name" rel="author" href="${escapeHtml(href)}">Médica · ${a.yearsPractice} anos de prática clínica</a>
            <span class="eeat-byline-review"> · Revisão Clínica pela Equipa Médica</span>
        </p>`;
}

function formatReviewDate(iso) {
    const raw = String(iso || '').slice(0, 10);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const month = months[Number(m[2]) - 1];
    if (!month) return '';
    return `${Number(m[3])} de ${month} de ${m[1]}`;
}

function authorBioHtml(origin, slug, dateIso) {
    const iso = String(dateIso || '').slice(0, 10);
    const label = formatReviewDate(iso);
    const dateBit = iso && label
        ? ` · <time datetime="${escapeHtml(iso)}">${escapeHtml(label)}</time>`
        : '';
    return `<p class="eeat-reviewed">Revisto pela equipa médica da Lon Clinic${dateBit}</p>`;
}

function renderAuthorPage(origin, slug) {
    const o = originOf(origin);
    const a = AUTHORS[slug];
    if (!a) return null;

    const url = authorUrl(o, a);
    const title = `${a.displayName} — ${a.jobTitle} | Lon Clinic`;
    const description = a.shortBio;
    const creds = a.credentials.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
    const paras = a.longBio.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const verify = profileLinksHtml(a, { includeSelf: false });
    const jsonLd = jsonLdScript([
        {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            name: title,
            url,
            mainEntity: { '@id': personId(o, a) },
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o }
        },
        personJsonLd(o, a.slug),
        organizationJsonLd(o)
    ]);

    const html = `<!DOCTYPE html>
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
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="author" content="${escapeHtml(a.displayName)}">
    <link rel="canonical" href="${escapeHtml(url)}">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:image" content="${escapeHtml(o)}/image/image2.webp">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#4A7C6F">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260817b">
    <link rel="stylesheet" href="/author.css?v=20260818a">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${jsonLd}
</head>
<body class="lon-landing eeat-profile-page">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/#inicio">Início</a>
                <a href="/magazine">Magazine</a>
                <a href="/blog">Guides</a>
                <a href="/equipa/rita-aguiar" aria-current="page">Equipa</a>
                <a href="/#contacto">Contato</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/#servicos" class="lon-btn lon-btn-primary lon-btn-sm">Marcar consulta</a>
            </div>
        </div>
    </header>
    <main id="conteudo-principal" class="eeat-profile">
        <article class="eeat-profile-card" itemscope itemtype="https://schema.org/Physician">
            <div class="eeat-profile-avatar" aria-hidden="true">${escapeHtml(a.initials)}</div>
            <div class="eeat-profile-body">
                <p class="eeat-profile-kicker">Equipa clínica · Lon Clinic</p>
                <h1 itemprop="name">${escapeHtml(a.displayName)}</h1>
                <p class="eeat-profile-role"><span itemprop="jobTitle">${escapeHtml(a.jobTitle)}</span> · ${a.yearsPractice} anos de prática clínica</p>
                ${paras}
                <h2>Credenciais</h2>
                <ul class="eeat-bio-creds">${creds}</ul>
                <h2>Perfis e verificação</h2>
                <p class="eeat-bio-verify">${verify}</p>
                <p class="eeat-profile-actions">
                    <a class="lon-btn lon-btn-primary" href="/marcar/clinica-geral">Marcar consulta</a>
                    <a class="lon-btn lon-btn-soft" href="/blog">Ler os guias médicos</a>
                </p>
            </div>
        </article>
    </main>
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-brand">
                <h3>Lon Clinic</h3>
                <p>O seu médico. Online. Sempre.</p>
                <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
            </div>
        </div>
    </footer>
    <script src="/lon-nav.js"></script>
</body>
</html>`;

    return { html, author: a };
}

function authorSlugs() {
    return Object.keys(AUTHORS);
}

module.exports = {
    AUTHORS,
    DEFAULT_AUTHOR_SLUG,
    OM_SEARCH_URL,
    ERS_URL,
    getAuthor,
    authorPath,
    authorUrl,
    personId,
    personNode,
    personJsonLd,
    articleAuthorSchema,
    reviewerBylineSnippet,
    authorBylineHtml,
    authorBioHtml,
    renderAuthorPage,
    authorSlugs
};
