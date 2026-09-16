/**
 * E-E-A-T: named clinicians, credentials, and Person schema.
 * Default author for medical guides and burnout articles.
 */

'use strict';

const { originOf, organizationJsonLd, jsonLdScript, canonicalHref } = require('./seo');

const OM_SEARCH_URL = 'https://www.ordemdosmedicos.pt/';
const ON_SEARCH_URL = 'https://www.ordemdosnutricionistas.pt/registoNacional.php?cod=0C0A';
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
        jobTitle: 'Médica especialista em Medicina Geral e Familiar',
        initials: 'RA',
        yearsPractice: 9,
        worksFor: 'Lon Clinic',
        memberOf: 'Ordem dos Médicos',
        ersNumber: '45475',
        alumniOf: 'Faculdade de Medicina da Universidade do Porto',
        knowsAbout: [
            'Medicina Geral e Familiar',
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
        shortBio: 'Médica especialista em Medicina Geral e Familiar.',
        longBio: [
            'A Drª Rita Aguiar é Médica especialista em Medicina Geral e Familiar.'
        ],
        profiles: [
            { label: 'Perfil na Lon Clinic', href: '/equipa/rita-aguiar', external: false },
            { label: 'Ordem dos Médicos (pesquisa pública)', href: OM_SEARCH_URL, external: true },
            { label: 'ERS — prestador 45475', href: ERS_URL, external: true }
        ],
        schemaTypes: ['Person', 'Physician'],
        memberOfUrl: OM_SEARCH_URL,
        availabilityName: 'Dr. Rita Aguiar',
        bookHref: '/marcar/clinica-geral',
        guidesHref: '/magazine',
        guidesLabel: 'Ler os guias médicos',
        extraCredentials: [
            {
                '@type': 'EducationalOccupationalCredential',
                name: 'Pós-graduação em Medicina do Viajante e das Populações Móveis',
                dateCreated: '2021',
                recognizedBy: {
                    '@type': 'CollegeOrUniversity',
                    name: 'Faculdade de Medicina da Universidade do Porto'
                }
            }
        ],
        // Add LinkedIn / unique OM listing URL here when they can be verified.
        sameAs: []
    },
    'sara-barreto': {
        slug: 'sara-barreto',
        honorific: 'Dra.',
        givenName: 'Sara',
        familyName: 'Barreto',
        displayName: 'Dra. Sara Barreto',
        jobTitle: 'Nutricionista',
        initials: 'SB',
        worksFor: 'Lon Clinic',
        memberOf: 'Ordem dos Nutricionistas',
        memberOfUrl: ON_SEARCH_URL,
        credentialNumber: '6501N',
        alumniOf: 'Faculdade de Medicina da Universidade de Lisboa',
        schemaTypes: ['Person', 'Dietitian'],
        photoKey: 'sara-barreto',
        bookHref: '/marcar/nutricao-consulta',
        guidesHref: '/nutricao',
        guidesLabel: 'Ver consultas de nutrição',
        knowsAbout: [
            'Nutrição clínica',
            'Reeducação alimentar',
            'Perda de peso',
            'Nutrição desportiva',
            'Hábitos alimentares'
        ],
        credentials: [
            'Cédula profissional da Ordem dos Nutricionistas n.º 6501N',
            'Licenciatura em Ciências da Nutrição (2021–2025), Faculdade de Medicina da Universidade de Lisboa',
            'Provas de habilitação profissional de acesso à Ordem dos Nutricionistas (março de 2026)',
            'Estágio observacional em nutrição clínica no Hospital de Santa Maria (doenças infecciosas, neurocríticos e consultas de fígado gordo)',
            'Formação em nutrição desportiva (estágio curricular no Grupo Desportivo de Direito)',
            'Monitora no Verão na ULisboa — Laboratório de Nutrição da FMUL'
        ],
        shortBio: 'Nutricionista inscrita na Ordem dos Nutricionistas (cédula n.º 6501N).',
        longBio: [
            'Sou nutricionista e acompanho quem quer melhorar a alimentação de forma realista — reeducação nutricional, perda de peso sem ioiô e hábitos que cabem na vida real.',
            'Licenciada em Ciências da Nutrição pela Faculdade de Medicina da Universidade de Lisboa e inscrita na Ordem dos Nutricionistas (cédula n.º 6501N). O acompanhamento é individualizado: comida real em primeiro lugar, sem vender suplementos. Quando faz sentido, o plano articula-se com a equipa médica da Lon Clinic.'
        ],
        profiles: [
            { label: 'Perfil na Lon Clinic', href: '/equipa/sara-barreto', external: false },
            { label: 'Ordem dos Nutricionistas (registo nacional)', href: ON_SEARCH_URL, external: true }
        ],
        sameAs: ['https://www.linkedin.com/in/sara-barreto-76459528b']
    },
    'carolina-rocha': {
        slug: 'carolina-rocha',
        honorific: 'Dra.',
        givenName: 'Carolina',
        familyName: 'Rocha',
        displayName: 'Dra. Carolina Rocha',
        jobTitle: 'Psicóloga',
        initials: 'CR',
        worksFor: 'Lon Clinic',
        memberOf: 'Ordem dos Psicólogos Portugueses',
        memberOfUrl: 'https://www.ordemdospsicologos.pt/',
        schemaTypes: ['Person', 'Psychologist'],
        photoKey: 'carolina',
        bookHref: '/triagem?tipo=casal',
        guidesHref: '/saudemental',
        guidesLabel: 'Ver consultas de psicologia',
        knowsAbout: [
            'Terapia de casal',
            'Psicologia clínica',
            'Relações interpessoais'
        ],
        credentials: [
            'Cédula profissional da Ordem dos Psicólogos Portugueses',
            'Especialização em terapia de casal'
        ],
        shortBio: 'Psicóloga inscrita na Ordem dos Psicólogos Portugueses, especializada em terapia de casal.',
        longBio: [
            'Sou psicóloga e acompanho casais que procuram fortalecer a sua relação, melhorar a comunicação e resolver conflitos de forma construtiva.',
            'Inscrita na Ordem dos Psicólogos Portugueses, especializada em terapia de casal. O acompanhamento é focado em criar um espaço seguro onde ambos os parceiros podem expressar-se e trabalhar em conjunto para uma relação mais saudável.'
        ],
        profiles: [
            { label: 'Perfil na Lon Clinic', href: '/equipa/carolina-rocha', external: false },
            { label: 'Ordem dos Psicólogos Portugueses', href: 'https://www.ordemdospsicologos.pt/', external: true }
        ],
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
    return canonicalHref(authorPath(author));
}

function personId(origin, author) {
    return `${authorUrl(origin, author)}#person`;
}

function personNode(origin, slug) {
    const o = originOf(origin);
    const a = getAuthor(slug);
    const memberUrl = a.memberOfUrl || OM_SEARCH_URL;
    const cedula = {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'Cédula profissional',
        recognizedBy: { '@type': 'Organization', name: a.memberOf, url: memberUrl }
    };
    if (a.credentialNumber) {
        cedula.identifier = {
            '@type': 'PropertyValue',
            name: 'Cédula',
            value: String(a.credentialNumber)
        };
    }
    const node = {
        '@type': a.schemaTypes || ['Person', 'Physician'],
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
            url: memberUrl
        },
        alumniOf: {
            '@type': 'CollegeOrUniversity',
            name: a.alumniOf
        },
        knowsAbout: a.knowsAbout,
        hasCredential: [cedula, ...(a.extraCredentials || [])]
    };
    if (a.ersNumber) {
        node.hasCredential.push({
            '@type': 'EducationalOccupationalCredential',
            credentialCategory: 'Registo ERS',
            identifier: { '@type': 'PropertyValue', name: 'ERS', value: String(a.ersNumber) },
            recognizedBy: { '@type': 'Organization', name: 'Entidade Reguladora da Saúde', url: ERS_URL }
        });
    }
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
            ${dateBit}<a class="eeat-byline-name" rel="author" href="${escapeHtml(href)}">${escapeHtml(a.displayName)}</a>
            <span class="eeat-byline-review"> · Revisão clínica</span>
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
    const a = getAuthor(slug);
    const iso = String(dateIso || '').slice(0, 10);
    const label = formatReviewDate(iso);
    const dateBit = iso && label
        ? ` · <time datetime="${escapeHtml(iso)}">${escapeHtml(label)}</time>`
        : '';
    return `<p class="eeat-reviewed">Revisto pela <a class="eeat-byline-name" rel="author" href="${escapeHtml(authorPath(a))}">${escapeHtml(a.displayName)}</a>${dateBit}</p>`;
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
    const occupationType = (a.schemaTypes && a.schemaTypes[1]) || 'Physician';
    const yearsBit = a.yearsPractice ? ` · ${a.yearsPractice} anos de prática clínica` : '';
    const avail = a.availabilityName
        ? `<p class="eeat-avail-badge" data-doctor-available data-doctor-name="${escapeHtml(a.availabilityName)}" hidden></p>`
        : '';
    const bookHref = a.bookHref || '/marcar/clinica-geral';
    const guidesHref = a.guidesHref || '/magazine';
    const guidesLabel = a.guidesLabel || 'Ler os guias médicos';
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
    <link rel="stylesheet" href="/landing.css?v=20260905f">
    <link rel="stylesheet" href="/author.css?v=20260905e">
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
                <a href="/#servicos">Consultas</a>
                <a href="/consulta">Especialidades</a>
                <a href="/burnout">Burnout</a>
                <a href="/magazine">Magazine</a>
                <a href="/#equipa">A Equipa</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/marcar/clinica-geral" class="lon-btn lon-btn-primary lon-btn-sm">Marcar — 39 €</a>
            </div>
        </div>
    </header>
    <main id="conteudo-principal" class="eeat-profile">
        <article class="eeat-profile-card" itemscope itemtype="https://schema.org/${escapeHtml(occupationType)}">
            <div class="eeat-profile-avatar" aria-hidden="true">${escapeHtml(a.initials)}</div>
            <div class="eeat-profile-body">
                <p class="eeat-profile-kicker">Equipa clínica · Lon Clinic</p>
                <h1 itemprop="name">${escapeHtml(a.displayName)}</h1>
                <p class="eeat-profile-role"><span itemprop="jobTitle">${escapeHtml(a.jobTitle)}</span>${yearsBit}</p>
                ${avail}
                ${paras}
                <h2>Credenciais</h2>
                <ul class="eeat-bio-creds">${creds}</ul>
                <h2>Perfis e verificação</h2>
                <p class="eeat-bio-verify">${verify}</p>
                <p class="eeat-profile-actions">
                    <a class="lon-btn lon-btn-primary" data-cta="book" href="${escapeHtml(bookHref)}">Marcar consulta</a>
                    <a class="lon-btn lon-btn-soft" href="${escapeHtml(guidesHref)}">${escapeHtml(guidesLabel)}</a>
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
    <script src="/i18n.js?v=20260914b" defer></script>
    <script src="/lon-analytics.js?v=20260914a" defer></script>
    <script src="/lon-slots.js?v=20260906d" defer></script>
</body>
</html>`;

    return { html, author: a };
}

function authorSlugs() {
    return Object.keys(AUTHORS);
}

const SARA_STAFF_USERNAME = 'maria.sara.ferreira.de.almeida.judice.gamito';
const SARA_PUBLIC_BIO =
    'Sou psicóloga e acompanho adultos em fases de transição, ansiedade, stress emocional, dificuldades de autoestima e processos de crescimento pessoal.';

function teamPhotoUrl(who) {
    return `/api/public/team-photo/${encodeURIComponent(who)}`;
}

function avatarHtml(initials, photoUrl, alt) {
    const img = photoUrl
        ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(alt)}" width="132" height="132" loading="lazy" decoding="async" onerror="this.remove()">`
        : '';
    return `<div class="lon-team-avatar">${img}<span aria-hidden="true">${escapeHtml(initials)}</span></div>`;
}

function renderTeamPage(origin, extras) {
    const o = originOf(origin);
    const rita = getAuthor('rita-aguiar');
    const barreto = getAuthor('sara-barreto');
    const carolina = getAuthor('carolina-rocha');
    const saraBio = String((extras && extras.saraBio) || SARA_PUBLIC_BIO).trim();
    const saraParas = (saraBio || SARA_PUBLIC_BIO)
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    const barretoBio = String((extras && extras.barretoBio) || '').trim();
    const barretoParas = (barretoBio
        ? barretoBio.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
        : barreto.longBio);
    const carolinaParas = carolina.longBio;
    const ritaParas = rita.longBio.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const saraParasHtml = saraParas.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const barretoParasHtml = barretoParas.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const carolinaParasHtml = carolinaParas.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const title = 'A Equipa | Lon Clinic';
    const description = 'A equipa clínica da Lon Clinic — Dra. Rita Aguiar (médica), Dra. Sara Barreto (nutricionista), Dra. Sara Gamito (psicóloga) e Dra. Carolina Rocha (psicóloga, terapia de casal).';
    const url = canonicalHref('/equipa');
    const jsonLd = jsonLdScript([
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: title,
            url,
            description,
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o }
        },
        personJsonLd(o, rita.slug),
        personJsonLd(o, barreto.slug),
        personJsonLd(o, carolina.slug),
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
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(url)}">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:locale" content="pt_PT">
    <meta name="theme-color" content="#163224">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@1,9..144,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260914g">
    <link rel="stylesheet" href="/author.css?v=20260914g">
    ${jsonLd}
</head>
<body class="lon-landing lon-home eeat-team-page">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/#servicos">Consultas</a>
                <a href="/consulta">Especialidades</a>
                <a href="/burnout">Burnout</a>
                <a href="/magazine">Magazine</a>
                <a href="/equipa" aria-current="page">A Equipa</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/marcar/clinica-geral" class="lon-btn lon-btn-primary lon-btn-sm">Marcar — 39 €</a>
            </div>
        </div>
    </header>
    <main id="conteudo-principal">
        <section class="lon-team" aria-labelledby="lon-team-title">
            <div class="lon-container">
                <div class="lon-team-header">
                    <p class="lon-team-kicker">Quem está do outro lado da consulta</p>
                    <h1 id="lon-team-title">A equipa clínica</h1>
                    <p class="lon-team-lead">Médicas, psicólogas e nutricionistas da Lon Clinic — credenciais e como marcar.</p>
                </div>
                <div class="lon-team-grid">
                    <article class="lon-team-card" id="equipa-rita">
                        <div class="lon-team-card-media">${avatarHtml(rita.initials, '', rita.displayName)}</div>
                        <div class="lon-team-card-body">
                            <h2 class="lon-team-name">${escapeHtml(rita.displayName)}</h2>
                            <p class="lon-team-role">${escapeHtml(rita.jobTitle)}</p>
                            ${ritaParas}
                            <h3>Credenciais</h3>
                            <ul class="lon-team-credentials">${rita.credentials.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
                            <p class="lon-team-verify">${profileLinksHtml(rita, { includeSelf: false })}</p>
                            <div class="lon-team-actions">
                                <a class="lon-btn lon-btn-soft" href="/equipa/rita-aguiar">Perfil e credenciais →</a>
                                <a class="lon-btn lon-btn-dark lon-btn-sm" data-cta="book" href="/marcar/clinica-geral">Marcar consulta →</a>
                            </div>
                        </div>
                    </article>
                    <article class="lon-team-card" id="equipa-sara-barreto">
                        <div class="lon-team-card-media">${avatarHtml(barreto.initials, teamPhotoUrl(barreto.photoKey), barreto.displayName)}</div>
                        <div class="lon-team-card-body">
                            <h2 class="lon-team-name">${escapeHtml(barreto.displayName)}</h2>
                            <p class="lon-team-role">${escapeHtml(barreto.jobTitle)}</p>
                            ${barretoParasHtml}
                            <h3>Credenciais</h3>
                            <ul class="lon-team-credentials">${barreto.credentials.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
                            <p class="lon-team-verify">${profileLinksHtml(barreto, { includeSelf: false })}</p>
                            <div class="lon-team-actions">
                                <a class="lon-btn lon-btn-soft" href="/equipa/sara-barreto">Perfil e credenciais →</a>
                                <a class="lon-btn lon-btn-dark lon-btn-sm" data-cta="book" href="${escapeHtml(barreto.bookHref)}">Marcar consulta →</a>
                            </div>
                        </div>
                    </article>
                    <article class="lon-team-card" id="equipa-sara">
                        <div class="lon-team-card-media">${avatarHtml('SG', teamPhotoUrl('sara'), 'Dra. Sara Gamito')}</div>
                        <div class="lon-team-card-body">
                            <h2 class="lon-team-name">Dra. Sara Gamito</h2>
                            <p class="lon-team-role">Psicóloga</p>
                            ${saraParasHtml}
                            <div class="lon-team-actions">
                                <a class="lon-btn lon-btn-dark lon-btn-sm" data-cta="book" href="/marcar/psicologia-mensal">Marcar consulta →</a>
                            </div>
                        </div>
                    </article>
                    <article class="lon-team-card" id="equipa-carolina">
                        <div class="lon-team-card-media">${avatarHtml(carolina.initials, teamPhotoUrl(carolina.photoKey), carolina.displayName)}</div>
                        <div class="lon-team-card-body">
                            <h2 class="lon-team-name">${escapeHtml(carolina.displayName)}</h2>
                            <p class="lon-team-role">${escapeHtml(carolina.jobTitle)} · Terapia de casal</p>
                            ${carolinaParasHtml}
                            <h3>Credenciais</h3>
                            <ul class="lon-team-credentials">${carolina.credentials.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
                            <p class="lon-team-verify">${profileLinksHtml(carolina, { includeSelf: false })}</p>
                            <div class="lon-team-actions">
                                <a class="lon-btn lon-btn-soft" href="/equipa/carolina-rocha">Perfil e credenciais →</a>
                                <a class="lon-btn lon-btn-dark lon-btn-sm" data-cta="book" href="${escapeHtml(carolina.bookHref)}">Marcar consulta →</a>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </section>
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
    <script src="/i18n.js?v=20260914b" defer></script>
</body>
</html>`;

    return { html };
}

module.exports = {
    AUTHORS,
    DEFAULT_AUTHOR_SLUG,
    OM_SEARCH_URL,
    ON_SEARCH_URL,
    ERS_URL,
    SARA_STAFF_USERNAME,
    SARA_PUBLIC_BIO,
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
    renderTeamPage,
    authorSlugs
};
