/**
 * Lon Clinic — Guide (/blog): server-rendered listing and articles (Markdown or HTML fragments).
 * New artigo/guia content always ships as /blog/:slug. /magazine is the index only.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { organizationJsonLd, jsonLdScript, originOf, canonicalHref } = require('./seo');
const authors = require('./authors');
const { socialLink } = require('./utm');
const cvi = require('./cvi');
const talkCta = require('./talk-cta');

const GUIDE_DIR = path.join(__dirname, 'data', 'guide');
const MANIFEST_PATH = path.join(GUIDE_DIR, 'manifest.json');
const DEFAULT_GUIDE_IMAGE = '/image/guide/guide-hiker-view.jpg';
const DEFAULT_OG_IMAGE = '/image/image3.webp';
const GUIDE_IMAGE_DIMS = new Map();

function resolveGuideImage(src) {
    if (!src) return DEFAULT_GUIDE_IMAGE;
    const p = String(src).startsWith('/') ? String(src) : `/${src}`;
    const tiny = {
        '/image/guide/guide-opera-coast.jpg': '/image/image1_files/CoventGarden_Large_Desktop.jpg',
        '/image/guide/guide-sunset-lake.jpg': '/image/guide/guide-hiker-view.jpg',
        '/image/guide/guide-lake-boats.jpg': '/image/guide/guide-country-road.jpg',
        '/image/guide/guide-waterfall.jpg': '/image/guide/guide-group-walk.jpg',
        '/image/guide/guide-coastal-sun.jpg': '/image/image1_files/Marylebone_Large_Desktop.jpg',
        '/image/guide/guide-mountain-path.avif': '/image/travel-clinic-mountain-bg.jpg',
        '/image/image2.webp': '/image/image3.webp',
        '/image/guide/travel-cover-hq-1.png': '/image/guide/travel-cover-hq-2.webp',
        '/image/guide/travel-cover-2.png': '/image/guide/travel-cover-hq-3.webp',
        '/image/guide/travel-cover-3.png': '/image/guide/travel-cover-hq-4.webp',
        '/image/guide/travel-cover-4.png': '/image/guide/travel-cover-hq-5.webp',
        '/image/guide/travel-cover-5.png': '/image/guide/travel-cover-hq-6.webp',
        '/image/guide/travel-cover-6.png': '/image/guide/travel-cover-hq-7.webp',
        '/image/guide/travel-cover-7.png': '/image/guide/travel-cover-hq-8.webp',
        '/image/guide/travel-cover-8.png': '/image/travel-clinic-mountain-bg.jpg'
    };
    return tiny[p] || p;
}

function readGuideImageSize(webPath) {
    if (GUIDE_IMAGE_DIMS.has(webPath)) return GUIDE_IMAGE_DIMS.get(webPath);
    let size = { w: 1600, h: 900 };
    try {
        const abs = path.join(__dirname, webPath.replace(/^\//, ''));
        if (fs.existsSync(abs)) {
            const buf = fs.readFileSync(abs);
            const jpeg = buf[0] === 0xff && buf[1] === 0xd8;
            if (jpeg) {
                let i = 2;
                while (i < buf.length - 8) {
                    if (buf[i] !== 0xff) { i += 1; continue; }
                    const marker = buf[i + 1];
                    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
                        size = { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
                        break;
                    }
                    i += 2 + buf.readUInt16BE(i + 2);
                }
            } else if (buf.toString('ascii', 8, 12) === 'WEBP') {
                const chunk = buf.toString('ascii', 12, 16);
                if (chunk === 'VP8X') size = { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
            } else if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
                size = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
            }
        }
    } catch { /* keep fallback */ }
    GUIDE_IMAGE_DIMS.set(webPath, size);
    return size;
}

function guideLeadFigureHtml(src, alt) {
    const url = resolveGuideImage(src);
    const { w, h } = readGuideImageSize(url);
    return `<figure class="guide-figure guide-figure-lead mag-story-hero"><img src="${escapeHtml(url)}" srcset="${escapeHtml(url)} ${w}w" sizes="100vw" alt="${escapeHtml(alt)}" width="${w}" height="${h}" decoding="async" fetchpriority="high"></figure>`;
}
const SERIES_PATH = path.join(GUIDE_DIR, 'series.json');
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
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function shareBarHtml(canonicalUrl, title, campaign) {
    const copyUrl = socialLink(canonicalUrl, 'share', campaign);
    const waUrl = socialLink(canonicalUrl, 'whatsapp', campaign);
    const waHref = `https://wa.me/?text=${encodeURIComponent(`${title} ${waUrl}`)}`;
    return `
        <div class="lon-share" role="group" aria-label="Partilhar este artigo">
            <span class="lon-share-label">Partilhar</span>
            <a href="${escapeHtml(waHref)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <button type="button" class="lon-share-copy" data-copy="${escapeHtml(copyUrl)}">Copiar link</button>
        </div>`;
}

function isValidSlug(slug) {
    return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 96;
}

function normalizeOrigin(url) {
    return originOf(url);
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

function loadSeriesList() {
    if (!fs.existsSync(SERIES_PATH)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(SERIES_PATH, 'utf8'));
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        if (parsed && Array.isArray(parsed.series)) return parsed.series.filter(Boolean);
        if (parsed && parsed.id) return [parsed];
        return [];
    } catch {
        return [];
    }
}

function seriesPartSlug(part) {
    if (!part) return '';
    return typeof part === 'string' ? part : String(part.slug || '');
}

function seriesPartSlugs(series) {
    return (Array.isArray(series && series.parts) ? series.parts : []).map(seriesPartSlug).filter(isValidSlug);
}

function findSeriesForSlug(slug) {
    const key = String(slug || '');
    return loadSeriesList().find((series) => {
        if (!series) return false;
        if (series.slug === key) return true;
        return seriesPartSlugs(series).includes(key);
    }) || null;
}

function seriesPosition(slug, series) {
    const all = seriesPartSlugs(series);
    const index = all.indexOf(slug);
    return {
        index,
        total: all.length,
        prev: index > 0 ? all[index - 1] : null,
        next: index >= 0 && index < all.length - 1 ? all[index + 1] : null
    };
}

function seriesPartMeta(series, slug, articles) {
    const part = (Array.isArray(series && series.parts) ? series.parts : []).find((p) => seriesPartSlug(p) === slug);
    const article = (Array.isArray(articles) ? articles : []).find((a) => a && a.slug === slug);
    return {
        slug,
        title: (part && part.navLabel) || (article && article.title) || slug,
        href: `/blog/${encodeURIComponent(slug)}`
    };
}

function isSeriesHub(meta, series) {
    if (!meta || !series) return false;
    if (meta.seriesHub === true) return true;
    return series.slug === meta.slug;
}

const ARTICLE_LANGS = {
    pt: { htmlLang: 'pt-PT', ogLocale: 'pt_PT', inLanguage: 'pt-PT', hreflang: 'pt-PT', label: 'PT' },
    en: { htmlLang: 'en', ogLocale: 'en_GB', inLanguage: 'en', hreflang: 'en', label: 'EN' },
    es: { htmlLang: 'es', ogLocale: 'es_ES', inLanguage: 'es', hreflang: 'es', label: 'ES' },
    fr: { htmlLang: 'fr', ogLocale: 'fr_FR', inLanguage: 'fr', hreflang: 'fr', label: 'FR' },
    de: { htmlLang: 'de', ogLocale: 'de_DE', inLanguage: 'de', hreflang: 'de', label: 'DE' }
};

const ARTICLE_CHROME = {
    pt: {
        updated: 'Atualizado em',
        clinician: (years) => `Médica · ${years} anos de experiência clínica`,
        review: ' · Revisão clínica',
        travelNote: 'Informação de carácter geral — não substitui consulta médica. Horários dos centros de vacinação podem alterar-se.',
        generalNote: 'Informação de carácter geral — não substitui consulta médica individualizada.'
    },
    en: {
        updated: 'Updated',
        clinician: (years) => `Physician · ${years} years of clinical experience`,
        review: ' · Clinical review',
        travelNote: 'General information — it does not replace a medical consultation. Vaccination centre hours may change.',
        generalNote: 'General information — it does not replace an individual medical consultation.'
    },
    es: {
        updated: 'Actualizado el',
        clinician: (years) => `Médica · ${years} años de experiencia clínica`,
        review: ' · Revisión clínica',
        travelNote: 'Información de carácter general — no sustituye una consulta médica. Los horarios de los centros de vacunación pueden cambiar.',
        generalNote: 'Información de carácter general — no sustituye una consulta médica individualizada.'
    },
    fr: {
        updated: 'Mis à jour le',
        clinician: (years) => `Médecin · ${years} ans d’expérience clinique`,
        review: ' · Relecture clinique',
        travelNote: 'Information générale — elle ne remplace pas une consultation médicale. Les horaires des centres de vaccination peuvent changer.',
        generalNote: 'Information générale — elle ne remplace pas une consultation médicale individualisée.'
    },
    de: {
        updated: 'Aktualisiert am',
        clinician: (years) => `Ärztin · ${years} Jahre klinische Erfahrung`,
        review: ' · Klinische Prüfung',
        travelNote: 'Allgemeine Information — sie ersetzt keine ärztliche Beratung. Öffnungszeiten der Impfzentren können sich ändern.',
        generalNote: 'Allgemeine Information — sie ersetzt keine individuelle ärztliche Beratung.'
    }
};

function articleLangCode(meta) {
    const lang = String((meta && meta.lang) || 'pt').toLowerCase();
    return ARTICLE_LANGS[lang] ? lang : 'pt';
}

function articleLangMeta(meta) {
    return ARTICLE_LANGS[articleLangCode(meta)];
}

function isListedArticle(article) {
    return article && article.listed !== false;
}

function siblingArticles(current, articles) {
    const group = current && current.group;
    if (!group) return [];
    return (Array.isArray(articles) ? articles : []).filter(
        (a) => a && a.group === group && isValidSlug(a.slug)
    );
}

function articleHreflangLinks(origin, current, articles) {
    const siblings = siblingArticles(current, articles);
    if (siblings.length < 2) return '';
    const o = normalizeOrigin(origin);
    const tags = siblings.map((a) => {
        const href = `${o}/blog/${encodeURIComponent(a.slug)}`;
        const hreflang = a.hreflang || articleLangMeta(a).hreflang;
        return `<link rel="alternate" hreflang="${escapeHtml(hreflang)}" href="${escapeHtml(href)}">`;
    });
    const def = siblings.find((a) => articleLangCode(a) === 'pt') || siblings[0];
    tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${o}/blog/${encodeURIComponent(def.slug)}`)}">`);
    const locTags = siblings
        .filter((a) => a.slug !== current.slug)
        .map((a) => `<meta property="og:locale:alternate" content="${escapeHtml(articleLangMeta(a).ogLocale)}">`);
    return `${tags.join('\n    ')}\n    ${locTags.join('\n    ')}`;
}

function articleSitemapAlternates(origin, current, articles) {
    const siblings = siblingArticles(current, articles);
    if (siblings.length < 2) return [];
    const o = normalizeOrigin(origin);
    const list = siblings.map((a) => ({
        hreflang: a.hreflang || articleLangMeta(a).hreflang,
        href: `${o}/blog/${encodeURIComponent(a.slug)}`
    }));
    const def = siblings.find((a) => articleLangCode(a) === 'pt') || siblings[0];
    list.push({ hreflang: 'x-default', href: `${o}/blog/${encodeURIComponent(def.slug)}` });
    return list;
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

function burnoutHubCard() {
    return {
        slug: 'burnout-hub',
        href: '/burnout',
        title: 'Centro burnout',
        description: 'Sintomas, teste CBI, tratamento e recuperação — o dossier Lon Clinic.',
        about: 'Burnout',
        listed: true
    };
}

function blogCanonicalPath(meta) {
    const slug = String((meta && meta.slug) || '');
    return `/blog/${encodeURIComponent(slug)}`;
}

function burnoutHubStripHtml(lang) {
    const packs = {
        pt: {
            kicker: 'Dossier',
            title: 'Este artigo faz parte do centro burnout.',
            hub: 'Ir ao centro burnout',
            test: 'Fazer o teste CBI'
        },
        en: {
            kicker: 'File',
            title: 'This article belongs to the burnout hub.',
            hub: 'Go to the burnout hub',
            test: 'Take the CBI test'
        },
        es: {
            kicker: 'Dossier',
            title: 'Este artículo forma parte del centro de burnout.',
            hub: 'Ir al centro burnout',
            test: 'Hacer el test CBI'
        },
        fr: {
            kicker: 'Dossier',
            title: 'Cet article fait partie du centre burnout.',
            hub: 'Aller au centre burnout',
            test: 'Faire le test CBI'
        },
        de: {
            kicker: 'Dossier',
            title: 'Dieser Artikel gehört zum Burnout-Zentrum.',
            hub: 'Zum Burnout-Zentrum',
            test: 'CBI-Test machen'
        }
    };
    const copy = packs[lang] || packs.pt;
    return `
<aside class="guide-hub-strip" aria-label="${escapeHtml(copy.kicker)}">
    <p class="guide-hub-strip-kicker">${escapeHtml(copy.kicker)}</p>
    <p class="guide-hub-strip-title">${escapeHtml(copy.title)}</p>
    <p class="guide-hub-strip-actions">
        <a href="/burnout">${escapeHtml(copy.hub)}</a>
        <span aria-hidden="true"> · </span>
        <a href="/burnout/teste">${escapeHtml(copy.test)}</a>
    </p>
</aside>`;
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

function wrapMarkdownTables(html) {
    return String(html || '').replace(/<table\b[\s\S]*?<\/table>/gi, (table) => (
        /class="guide-table-scroll"/i.test(table)
            ? table
            : `<div class="guide-table-scroll">${table}</div>`
    ));
}

function bodyToHtml(body, format) {
    if (format === 'html') {
        return body;
    }
    return wrapMarkdownTables(marked.parse(body));
}

function isVerifiedArticle(meta) {
    return !(meta && meta.verified === false);
}

function articleAuthorBlock(origin, meta) {
    if (isVerifiedArticle(meta)) {
        return authors.articleAuthorSchema(origin, meta && meta.author);
    }
    const o = normalizeOrigin(origin);
    return {
        author: { '@id': `${o}/#organization` },
        publisher: { '@id': `${o}/#organization` },
        copyrightHolder: { '@id': `${o}/#organization` }
    };
}

function readingMinutes(meta) {
    const mins = Number(meta && meta.readingMinutes);
    return Number.isFinite(mins) && mins >= 1 ? Math.round(mins) : 0;
}

function readingTimeLabel(meta, lang) {
    const mins = readingMinutes(meta);
    if (!mins) return '';
    const labels = {
        pt: `${mins} min de leitura`,
        en: `${mins} min read`,
        es: `${mins} min de lectura`,
        fr: `${mins} min de lecture`,
        de: `${mins} Min. Lesezeit`
    };
    return labels[lang] || labels.pt;
}

function readingTimeHtml(meta, lang) {
    const label = readingTimeLabel(meta, lang);
    if (!label) return '';
    const mins = readingMinutes(meta);
    return `<span class="mag-read-time"><time datetime="PT${mins}M">${escapeHtml(label)}</time></span>`;
}

function articleCluster(meta) {
    const slug = String((meta && meta.slug) || '');
    const about = String((meta && meta.about) || '').toLowerCase();
    if (meta && (meta.series === 'livros-saude' || about === 'livros de saúde' || about === 'livros de saude')) {
        return 'livros-saude';
    }
    if (meta && (meta.series === 'bestsellers-psicologia' || about === 'livros de psicologia')) {
        return 'bestsellers-psicologia';
    }
    if (meta && (meta.series === 'bestsellers-saude-intestinal' || about === 'livros de intestino' || about === 'saúde intestinal' || about === 'saude intestinal')) {
        return 'bestsellers-saude-intestinal';
    }
    if (/vacina|viajante|travel|marcacao|malaria|viajar-a|viajar-ao/.test(slug)) return 'travel';
    if (/burnout/.test(slug) || about === 'burnout') return 'burnout';
    if (/depress/.test(about) || /depressao|anedonia|antidepressivos/.test(slug)) return 'depressao';
    if (/ansiedade/.test(about) || /ansiedade|ataques-de-panico|fobias-especificas/.test(slug)) return 'ansiedade';
    if (/autoconhecimento/.test(about) || /inteligencia-emocional|padroes-de-apego|autossabotagem|eneagrama|perfeccionismo|autocompaixao|sindrome-do-impostor|journaling|gatilhos-emocionais|crencas-limitantes|limites-pessoais|introspecao|autoestima/.test(slug)) return 'autoconhecimento';
    if (/perda de peso/.test(about) || /perda-de-peso|deficit-calorico|efeito-ioio|fome-emocional|alimentacao-intuitiva|glp1|contagem-de-calorias|platos-na-perda|alcool-e-perda|proteina-e-saciedade|sono-e-peso|stress-e-perda|forca-vs-cardio|fibra-e-perda|manter-o-peso|nutricionista-plano/.test(slug)) return 'perda-de-peso';
    if (/autismo|adhd/.test(slug) || /autismo|adhd/.test(about)) return 'mental';
    return 'general';
}

function defaultCtaKind(meta) {
    if (meta && meta.ctaKind) return String(meta.ctaKind);
    const cluster = articleCluster(meta);
    if (cluster === 'travel') return 'travel';
    if (cluster === 'mental' || cluster === 'depressao' || cluster === 'ansiedade' || cluster === 'autoconhecimento' || cluster === 'bestsellers-psicologia') return 'mental';
    if (cluster === 'burnout') return 'burnout';
    if (cluster === 'perda-de-peso' || cluster === 'livros-saude' || cluster === 'bestsellers-saude-intestinal') return 'nutrition';
    return 'general';
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

function withLangHref(href, lang) {
    if (!lang || lang === 'pt') return href;
    const sep = String(href).includes('?') ? '&' : '?';
    return `${href}${sep}lang=${encodeURIComponent(lang)}`;
}

const CLUSTER_CROSS = {
    depressao: ['ansiedade', 'burnout', 'mental'],
    ansiedade: ['depressao', 'autoconhecimento', 'burnout'],
    burnout: ['depressao', 'ansiedade', 'autoconhecimento'],
    autoconhecimento: ['ansiedade', 'depressao', 'mental'],
    'perda-de-peso': ['burnout', 'autoconhecimento', 'ansiedade'],
    'livros-saude': ['perda-de-peso', 'burnout', 'general'],
    'bestsellers-psicologia': ['burnout', 'ansiedade', 'depressao'],
    'bestsellers-saude-intestinal': ['perda-de-peso', 'livros-saude', 'ansiedade'],
    mental: ['depressao', 'ansiedade', 'burnout'],
    travel: ['general', 'mental'],
    general: ['travel', 'mental', 'perda-de-peso']
};

function actionCopy(lang) {
    const packs = {
        pt: {
            consultAria: 'Fale com um médico, teste e próximo horário',
            series: 'Na mesma série',
            also: 'Também no magazine',
            related: 'Continuar a ler',
            relatedAria: 'Artigos relacionados',
            slotChip: 'Próxima consulta',
            slotTitle: 'Próximo horário',
            slotWhen: 'Horários em breve',
            slotNote: 'As vagas desta consulta ainda estão a ser definidas. Pode marcar e escolhemos o horário consigo.',
            slotCta: 'Fale com um médico',
            psych: {
                chip: 'Psicologia',
                title: 'Consulta de psicologia',
                price: '60 € · sessão avulsa',
                href: '/marcar/psicologia',
                cta: 'Fale com um psicólogo',
                note: 'Online · ou 56 €/semana no acompanhamento',
                service: 'psicologia'
            },
            nutrition: {
                chip: 'Nutrição',
                title: 'Consulta de nutrição',
                price: '39 € · 30 min',
                href: '/marcar/clinica-geral?ref=blog-nutricao',
                cta: 'Fale com um nutricionista',
                note: 'Online · acompanhamento individual, sem planos genéricos',
                service: 'clinica_geral'
            },
            nutritionProgram: {
                chip: 'Nutrição',
                title: 'Programa de reeducação metabólica',
                price: '115 € · 1.º mês',
                href: '/marcar/nutricao-programa',
                cta: 'Fale com um nutricionista',
                note: 'Acompanhamento contínuo · sem prescrição de aGLP-1',
                service: 'nutricao_programa'
            },
            quizNutrition: {
                chip: 'Avaliação',
                title: 'Avaliação metabólica',
                price: 'Gratuito · 2 min',
                href: '/nutricao/avaliacao',
                cta: 'Fazer a avaliação',
                note: 'Perfil para o programa de reeducação'
            },
            longevity: {
                chip: 'Longevidade',
                title: 'Consulta de longevidade',
                price: '79 € · avaliação preventiva',
                href: '/marcar/longevidade',
                cta: 'Fale com um médico',
                note: 'Online · biomarcadores e plano sustentável',
                service: 'longevidade'
            },
            travel: {
                chip: 'Viajante',
                title: 'Consulta do viajante',
                price: '€39 · 20 min',
                href: '/marcar/travel',
                cta: 'Fale com um médico',
                note: 'Orientação e prescrição no próprio dia',
                service: 'travel'
            },
            general: {
                chip: 'Clínica geral',
                title: 'Consulta de clínica geral',
                price: '39 € · 30 min',
                href: '/marcar/clinica-geral',
                cta: 'Fale com um médico',
                note: 'Médico no próprio dia',
                service: 'clinica_geral'
            },
            quizBurnout: {
                chip: 'Teste',
                title: 'Teste de burnout',
                price: 'Gratuito · CBI',
                href: '/burnout/teste',
                cta: 'Fazer o teste',
                note: 'Cinco minutos para perceber o grau de esgotamento'
            },
            hubBurnout: {
                chip: 'Dossier',
                title: 'Centro burnout',
                price: 'Guias + teste CBI',
                href: '/burnout',
                cta: 'Ir ao centro burnout',
                note: 'Sintomas, tratamento, recuperação — o dossier da clínica',
                service: 'burnout'
            },
            quizPersonality: {
                chip: 'Teste',
                title: 'Teste de personalidade',
                price: 'Gratuito · Big Five',
                href: '/teste-personalidade',
                cta: 'Fazer o teste',
                note: 'Um retrato rápido de como está agora'
            }
        },
        en: {
            consultAria: 'Book a consultation, take a quiz, next appointment',
            series: 'In this series',
            also: 'Also in the magazine',
            related: 'Keep reading',
            relatedAria: 'Related articles',
            slotChip: 'Next appointment',
            slotTitle: 'Next available time',
            slotWhen: 'Times coming soon',
            slotNote: 'Appointment slots for this visit are still being set. You can book and we will choose a time with you.',
            slotCta: 'Talk to a doctor',
            psych: {
                chip: 'Psychology',
                title: 'Psychology consultation',
                price: '€60 · single session',
                href: '/marcar/psicologia',
                cta: 'Talk to a psychologist',
                note: 'Online · or €54/week for ongoing care',
                service: 'psicologia'
            },
            nutrition: {
                chip: 'Nutrition',
                title: 'Nutrition consultation',
                price: '39 € · 30 min',
                href: '/marcar/clinica-geral?ref=blog-nutricao',
                cta: 'Talk to a nutritionist',
                note: 'Online · individual follow-up, no generic plans',
                service: 'clinica_geral'
            },
            travel: {
                chip: 'Travel',
                title: 'Travel clinic consultation',
                price: '€39 · 20 min',
                href: '/marcar/travel',
                cta: 'Talk to a doctor',
                note: 'Advice and a prescription the same day',
                service: 'travel'
            },
            general: {
                chip: 'GP',
                title: 'General medicine consultation',
                price: '39 € · 30 min',
                href: '/marcar/clinica-geral',
                cta: 'Talk to a doctor',
                note: 'A doctor the same day',
                service: 'clinica_geral'
            },
            quizBurnout: {
                chip: 'Quiz',
                title: 'Burnout test',
                price: 'Free · CBI',
                href: '/burnout/teste',
                cta: 'Take the test',
                note: 'Five minutes to see how depleted you are'
            },
            quizPersonality: {
                chip: 'Quiz',
                title: 'Personality test',
                price: 'Free · Big Five',
                href: '/teste-personalidade',
                cta: 'Take the test',
                note: 'A quick snapshot of how you are now'
            },
            hubBurnout: {
                chip: 'File',
                title: 'Burnout hub',
                price: 'Guides + CBI test',
                href: '/burnout',
                cta: 'Go to the burnout hub',
                note: 'Symptoms, recovery and the free CBI test',
                service: 'burnout'
            }
        }
    };
    packs.es = packs.en;
    packs.fr = packs.en;
    packs.de = packs.en;
    return packs[lang] || packs.pt;
}

function consultSpec(kind, lang) {
    const copy = actionCopy(lang);
    if (kind === 'nutrition') return copy.nutrition;
    if (kind === 'nutricao-programa' || kind === 'nutricao_programa') {
        return copy.nutritionProgram || copy.nutrition;
    }
    if (kind === 'longevity') return copy.longevity || copy.general;
    if (kind === 'travel') return copy.travel;
    if (kind === 'mental' || kind === 'neurodiversidade' || kind === 'psicologia') return copy.psych;
    if (kind === 'burnout') return copy.hubBurnout;
    return copy.general;
}

function quizSpec(kind, lang) {
    const copy = actionCopy(lang);
    if (kind === 'burnout' || kind === 'neurodiversidade') return copy.quizBurnout;
    if (kind === 'nutrition' || kind === 'nutricao-programa' || kind === 'nutricao_programa') {
        return copy.quizNutrition || copy.quizPersonality;
    }
    return copy.quizPersonality;
}

function bookCardHtml(card, tone, extraClass, extraAttrs) {
    const t = Math.abs(Number(tone) || 0) % 3;
    const klass = extraClass ? ` ${extraClass}` : '';
    const attrs = extraAttrs ? ` ${extraAttrs}` : '';
    const talkAttr = card.talkRole ? ` data-talk-cta="${escapeHtml(card.talkRole)}"` : '';
    return `
        <article class="guide-book-card guide-book-card--t${t}${klass}"${attrs}>
            <p class="guide-book-chip">${escapeHtml(card.chip)}</p>
            <h3 class="guide-book-title">${escapeHtml(card.title)}</h3>
            <p class="guide-book-price"${card.whenAttr || ''}>${escapeHtml(card.price)}</p>
            <p class="guide-book-note">${escapeHtml(card.note)}</p>
            <a class="guide-book-cta"${card.ctaAttr || ''}${talkAttr} href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>`;
}

function applyTalkCta(consult, kind, lang, slug) {
    if (kind === 'burnout' || kind === 'neurodiversidade') return consult;
    const talk = talkCta.resolve({ kind, slug, lang });
    const next = { ...consult, cta: talk.label, talkRole: talk.role };
    if (talk.role === 'psych' || talk.role === 'psychFind' || talk.role === 'nutritionFind') {
        next.href = talk.href;
    }
    return next;
}

function actionCardsHtml(kind, tone, lang, slug) {
    const copy = actionCopy(lang);
    const consult = applyTalkCta(consultSpec(kind, lang), kind, lang, slug);
    const quiz = quizSpec(kind, lang);
    const t = Math.abs(Number(tone) || 0);
    const hydrate = consult.service === 'clinica_geral';
    const consultHref = withLangHref(consult.href, lang);
    const quizHref = withLangHref(quiz.href, lang);
    const consultCard = bookCardHtml({
        ...consult,
        href: consultHref
    }, t);
    const quizCard = bookCardHtml({
        ...quiz,
        href: quizHref
    }, t + 1);
    if (kind === 'burnout' || kind === 'neurodiversidade') {
        return `
<aside class="guide-book guide-actions" aria-label="${escapeHtml(copy.consultAria)}">
    <div class="guide-book-grid guide-book-grid--actions">${consultCard}${quizCard}
    </div>
</aside>`;
    }
    const slotCard = bookCardHtml({
        chip: copy.slotChip,
        title: copy.slotTitle,
        price: copy.slotWhen,
        note: copy.slotNote,
        href: consultHref,
        cta: consult.cta || copy.slotCta,
        talkRole: consult.talkRole,
        whenAttr: ' data-next-slot-when aria-live="polite"',
        ctaAttr: ' data-next-slot-cta'
    }, t + 2, 'guide-slot-card', `data-next-slot data-service="${escapeHtml(consult.service)}" data-book-href="${escapeHtml(consultHref)}" data-hydrate="${hydrate ? '1' : '0'}" data-price="${escapeHtml(consult.price)}"`);
    return `
<aside class="guide-book guide-actions" aria-label="${escapeHtml(copy.consultAria)}">
    <div class="guide-book-grid guide-book-grid--actions">${consultCard}${quizCard}${slotCard}
    </div>
</aside>`;
}

function bookingCardsHtml(kind, tone, lang, slug) {
    return actionCardsHtml(kind, tone, lang || 'pt', slug);
}

function consultOnlyCardHtml(kind, tone, lang, slug) {
    const consult = applyTalkCta(consultSpec(kind, lang), kind, lang, slug);
    const href = withLangHref(consult.href, lang);
    const card = bookCardHtml({ ...consult, href }, tone);
    return `
<aside class="guide-book" aria-label="${escapeHtml(consult.title)}">
    <div class="guide-book-grid">${card}
    </div>
</aside>`;
}

function expandCtaTokens(html, kind, lang, slug) {
    let n = 0;
    return String(html || '').replace(
        /<p>\s*\{\{cta(?::([a-z-]+))?\}\}\s*<\/p>|\{\{cta(?::([a-z-]+))?\}\}/gi,
        (_, a, b) => {
            const resolved = a || b || kind;
            const idx = n++;
            return idx === 0
                ? actionCardsHtml(resolved, idx, lang, slug)
                : consultOnlyCardHtml(resolved, idx, lang, slug);
        }
    );
}

function insertAfterFirstH2(html, block) {
    const re = /<h2\b[^>]*>[\s\S]*?<\/h2>/i;
    const m = re.exec(html);
    if (!m || m.index == null) return `${html}${block}`;
    const end = m.index + m[0].length;
    return `${html.slice(0, end)}${block}${html.slice(end)}`;
}

function insertAfterFirstParagraph(html, block) {
    const re = /<p\b[^>]*>[\s\S]*?<\/p>/i;
    const m = re.exec(html);
    if (!m || m.index == null) return `${block}${html}`;
    const end = m.index + m[0].length;
    return `${html.slice(0, end)}${block}${html.slice(end)}`;
}

function articleWantsLiveSlots(meta) {
    if (!meta) return false;
    if (meta.liveSlots === true) return true;
    return articleCluster(meta) === 'burnout';
}

function rewriteBlogBurnoutServiceLinks(html) {
    return String(html || '').replace(/href=(["'])\/psicologia-burnout(?:\?[^"']*)?\1/gi, 'href=$1/burnout$1');
}

function linkifyBurnoutMentions(html) {
    const raw = String(html || '');
    if (!raw) return raw;
    const parts = raw.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi);
    let linked = false;
    const termRe = /(s[ií]ndrome de exaust[aã]o|stress laboral|\bburnout\b)/i;
    return parts.map((part) => {
        if (linked || /^<a\b/i.test(part) || !termRe.test(part)) return part;
        linked = true;
        return part.replace(termRe, (match) => `<a href="/burnout">${match}</a>`);
    }).join('');
}

function burnoutMentionNoteHtml(lang) {
    const packs = {
        pt: 'Para objectivar o desgaste: <a href="/burnout">centro burnout</a> · <a href="/burnout/teste">teste CBI gratuito</a>.',
        en: 'To measure exhaustion: <a href="/burnout">burnout hub</a> · <a href="/burnout/teste">free CBI test</a>.',
        es: 'Para objetivar el desgaste: <a href="/burnout">centro burnout</a> · <a href="/burnout/teste">test CBI gratuito</a>.',
        fr: 'Pour objectiver l’épuisement : <a href="/burnout">centre burnout</a> · <a href="/burnout/teste">test CBI gratuit</a>.',
        de: 'Um die Erschöpfung einzuordnen: <a href="/burnout">Burnout-Zentrum</a> · <a href="/burnout/teste">kostenloser CBI-Test</a>.'
    };
    return `<p class="guide-burnout-note">${packs[lang] || packs.pt}</p>`;
}

function slotServicePack(slug, rawKind) {
    const key = String(rawKind || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    const packs = {
        burnout: {
            service: 'burnout',
            href: `/marcar/burnout?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta especializada em burnout'
        },
        burnout_mensal: {
            service: 'burnout_mensal',
            href: `/marcar/burnout-mensal?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Primeira sessão do plano · 216 €/mês'
        },
        nutrition: {
            service: 'nutricao_programa',
            href: `/marcar/nutricao-programa?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta inicial de nutrição metabólica'
        },
        nutricao_programa: {
            service: 'nutricao_programa',
            href: `/marcar/nutricao-programa?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta inicial de nutrição metabólica'
        },
        psicologia: {
            service: 'saude_mental',
            href: `/marcar/saude-mental?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta de psicologia'
        },
        saude_mental: {
            service: 'saude_mental',
            href: `/marcar/saude-mental?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta de psicologia'
        },
        longevity: {
            service: 'longevidade',
            href: `/marcar/longevidade?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta de longevidade'
        },
        longevidade: {
            service: 'longevidade',
            href: `/marcar/longevidade?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta de longevidade'
        },
        mental: {
            service: 'saude_mental',
            href: `/marcar/saude-mental?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta de saúde mental'
        },
        travel: {
            service: 'travel',
            href: `/marcar/travel?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários · consulta do viajante'
        },
        general: {
            service: 'clinica_geral',
            href: `/marcar/clinica-geral?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários'
        },
        clinica_geral: {
            service: 'clinica_geral',
            href: `/marcar/clinica-geral?ref=blog-${encodeURIComponent(slug)}`,
            kicker: 'Próximos horários'
        }
    };
    return packs[key] || packs.general;
}

function liveSlotsWidgetHtml(slug, pack) {
    return `
<aside class="guide-live-slots dr-live-slots" data-next-slots data-limit="3" data-service="${escapeHtml(pack.service)}" data-book-href="${escapeHtml(pack.href)}" data-surface="blog-${escapeHtml(slug)}" hidden>
    <p class="dr-live-slots-kicker">${escapeHtml(pack.kicker)}</p>
    <div class="dr-live-slots-row" data-next-slots-row></div>
    <a href="${escapeHtml(pack.href)}" class="dr-slots-week" data-slots-fallback hidden>Ver disponibilidade desta semana</a>
</aside>`;
}

function articleLiveSlotsHtml(meta) {
    const slug = String((meta && meta.slug) || 'artigo');
    const kind = (meta && meta.slotService) || defaultCtaKind(meta);
    return liveSlotsWidgetHtml(slug, slotServicePack(slug, kind));
}

function expandLonSlotsTokens(html, meta) {
    const slug = String((meta && meta.slug) || 'artigo');
    return String(html || '').replace(
        /(?:<p>\s*)?\[lon-slots:\s*servi[cç]o=(?:["']|&quot;)([^"'&]+)(?:["']|&quot;)\s*\](?:\s*<\/p>)?/gi,
        (_, service) => liveSlotsWidgetHtml(slug, slotServicePack(slug, service))
    );
}

function seriesHubStripHtml(series, lang) {
    if (!series) return '';
    const hubHref = series.slug ? `/blog/${encodeURIComponent(series.slug)}` : '/magazine';
    const packs = {
        pt: {
            kicker: 'Série',
            title: `Este artigo faz parte da série ${series.title}.`,
            hub: 'Ver a série completa'
        },
        en: {
            kicker: 'Series',
            title: `This article is part of ${series.title}.`,
            hub: 'See the full series'
        }
    };
    const copy = packs[lang] || packs.pt;
    return `
<aside class="guide-hub-strip" aria-label="${escapeHtml(copy.kicker)}">
    <p class="guide-hub-strip-kicker">${escapeHtml(copy.kicker)}</p>
    <p class="guide-hub-strip-title">${escapeHtml(copy.title)}</p>
    <p class="guide-hub-strip-actions">
        <a href="${escapeHtml(hubHref)}">${escapeHtml(copy.hub)}</a>
    </p>
</aside>`;
}

function seriesNavHtml(slug, series, articles) {
    if (!series) return '';
    const pos = seriesPosition(slug, series);
    if (pos.index < 0 || !pos.total) return '';
    const hubHref = series.slug ? `/blog/${encodeURIComponent(series.slug)}` : '/magazine';
    const prev = pos.prev ? seriesPartMeta(series, pos.prev, articles) : null;
    const next = pos.next ? seriesPartMeta(series, pos.next, articles) : null;
    const prevLink = prev
        ? `<a class="guide-series-link guide-series-link--prev" href="${escapeHtml(prev.href)}"><span>Anterior</span><strong>${escapeHtml(prev.title)}</strong></a>`
        : '<span class="guide-series-link guide-series-link--empty"></span>';
    const nextLink = next
        ? `<a class="guide-series-link guide-series-link--next" href="${escapeHtml(next.href)}"><span>Seguinte</span><strong>${escapeHtml(next.title)}</strong></a>`
        : '<span class="guide-series-link guide-series-link--empty"></span>';
    return `
<nav class="guide-series" aria-label="Navegação da série">
    <p class="guide-series-meta"><a href="${escapeHtml(hubHref)}">${escapeHtml(series.title)}</a> · ${pos.index + 1} / ${pos.total}</p>
    <div class="guide-series-nav">
        ${prevLink}
        ${nextLink}
    </div>
</nav>`;
}

function seriesListHtml(series, articles) {
    if (!series) return '';
    const items = seriesPartSlugs(series).map((slug, i) => {
        const meta = seriesPartMeta(series, slug, articles);
        const article = (Array.isArray(articles) ? articles : []).find((a) => a && a.slug === slug);
        const dek = article && article.description
            ? `<p class="guide-series-index-dek">${escapeHtml(article.description)}</p>`
            : '';
        return `<li class="guide-series-index-item"><span class="guide-series-index-num">${String(i + 1).padStart(2, '0')}</span><div><a href="${escapeHtml(meta.href)}">${escapeHtml(article && article.title ? article.title : meta.title)}</a>${dek}</div></li>`;
    }).join('');
    return `<ol class="guide-series-index">${items}</ol>`;
}

function insertBeforeFaqOrEnd(html, block) {
    const faqRe = /<h2[^>]*>\s*(Perguntas frequentes|FAQ|Frequently asked questions)/i;
    if (faqRe.test(html)) return html.replace(faqRe, `${block}$&`);
    return `${html}${block}`;
}

function listedGuideArticles(articles) {
    return (Array.isArray(articles) ? articles : []).filter((a) => a && isValidSlug(a.slug) && isListedArticle(a));
}

function pickClusterArticles(current, articles, cluster, limit) {
    const lang = articleLangCode(current);
    const all = listedGuideArticles(articles).filter((a) => a.slug !== current.slug);
    const sameLang = all.filter((a) => articleCluster(a) === cluster && articleLangCode(a) === lang);
    const pool = sameLang.length ? sameLang : all.filter((a) => articleCluster(a) === cluster);
    return pool.slice(0, limit);
}

function pickCrossClusterArticles(current, articles, limit) {
    const lang = articleLangCode(current);
    const seen = new Set([current.slug]);
    const picked = [];
    const all = listedGuideArticles(articles);
    const targets = CLUSTER_CROSS[articleCluster(current)] || [];
    targets.forEach((cluster) => {
        if (picked.length >= limit) return;
        const hit = all.find((a) => !seen.has(a.slug)
            && articleCluster(a) === cluster
            && articleLangCode(a) === lang);
        const fallback = hit || all.find((a) => !seen.has(a.slug) && articleCluster(a) === cluster);
        if (fallback) {
            seen.add(fallback.slug);
            picked.push(fallback);
        }
    });
    return picked;
}

function seriesBacklinksHtml(current, articles) {
    const copy = actionCopy(articleLangCode(current));
    const seriesDef = findSeriesForSlug(current.slug);
    const series = seriesDef
        ? seriesPartSlugs(seriesDef)
            .map((slug) => (Array.isArray(articles) ? articles : []).find((a) => a && a.slug === slug && a.slug !== current.slug && isListedArticle(a)))
            .filter(Boolean)
        : pickClusterArticles(current, articles, articleCluster(current), 8);
    const cross = pickCrossClusterArticles(current, articles, 4)
        .filter((a) => !series.some((s) => s.slug === a.slug));
    if (!series.length && !cross.length) return '';
    const list = (items) => items.map((a) => `<li><a href="${escapeHtml(magHref(a))}">${escapeHtml(a.title)}</a></li>`).join('');
    const seriesBlock = series.length
        ? `<p class="guide-backlinks-kicker">${escapeHtml(copy.series)}</p><ul class="guide-backlinks-list">${list(series)}</ul>`
        : '';
    const crossBlock = cross.length && !seriesDef
        ? `<p class="guide-backlinks-kicker">${escapeHtml(copy.also)}</p><ul class="guide-backlinks-list">${list(cross)}</ul>`
        : '';
    if (!seriesBlock && !crossBlock) return '';
    return `
<nav class="guide-backlinks" aria-label="${escapeHtml(copy.relatedAria)}">
    ${seriesBlock}
    ${crossBlock}
</nav>`;
}

function injectArticleChrome(html, meta, articles, format) {
    const kind = defaultCtaKind(meta);
    const lang = articleLangCode(meta);
    let out = rewriteBlogBurnoutServiceLinks(String(html || ''));
    out = linkifyBurnoutMentions(out);
    out = expandLonSlotsTokens(out, meta);
    const seriesDef = findSeriesForSlug(meta && meta.slug);
    const isHub = seriesDef && isSeriesHub(meta, seriesDef);
    if (isHub && !out.includes('guide-series-index')) {
        const index = seriesListHtml(seriesDef, articles);
        if (index) {
            out = /<h2\b/i.test(out)
                ? insertAfterFirstH2(out, index)
                : insertAfterFirstParagraph(out, index);
        }
    }
    const backlinks = isHub ? '' : seriesBacklinksHtml(meta, articles);
    const slots = articleWantsLiveSlots(meta) && !out.includes('data-next-slots')
        ? articleLiveSlotsHtml(meta)
        : '';
    const mentionsBurnout = /\/burnout|burnout|s[ií]ndrome de exaust|stress laboral/i.test(out);
    const note = mentionsBurnout && articleCluster(meta) !== 'burnout' && articleCluster(meta) !== 'livros-saude' && articleCluster(meta) !== 'bestsellers-psicologia' && articleCluster(meta) !== 'bestsellers-saude-intestinal' && !out.includes('guide-burnout-note')
        ? burnoutMentionNoteHtml(lang)
        : '';
    if (format === 'html') {
        if (slots) out = insertAfterFirstParagraph(out, slots);
        if (note) out = insertAfterFirstParagraph(out, note);
        if (!out.includes('guide-actions')) out += actionCardsHtml(kind, 0, lang, meta && meta.slug);
        if (backlinks && !out.includes('guide-backlinks')) out += backlinks;
        return out;
    }
    out = expandCtaTokens(out, kind, lang, meta && meta.slug);
    if (slots) out = insertAfterFirstParagraph(out, slots);
    if (note) out = insertAfterFirstParagraph(out, note);
    if (backlinks && !out.includes('guide-backlinks')) {
        out = insertAfterFirstH2(out, backlinks);
    }
    if (!out.includes('guide-actions')) {
        out = insertBeforeFaqOrEnd(out, actionCardsHtml(kind, 0, lang, meta && meta.slug));
    }
    return out;
}

function pickRelatedArticles(current, articles) {
    const all = listedGuideArticles(articles);
    const bySlug = new Map((Array.isArray(articles) ? articles : []).map((a) => [a.slug, a]));
    const burnoutBySlug = new Map((loadBurnoutManifest().pages || []).map((p) => [p.slug, p]));
    const picked = [];
    const seen = new Set([current.slug]);
    const lang = articleLangCode(current);
    const push = (article) => {
        if (!article || seen.has(article.slug) || picked.length >= 6) return;
        if (article.listed === false) return;
        seen.add(article.slug);
        picked.push(article);
    };
    if (articleCluster(current) === 'burnout') {
        push(burnoutHubCard());
    }
    (Array.isArray(current.related) ? current.related : []).forEach((ref) => {
        push(resolveRelatedRef(ref, bySlug, burnoutBySlug));
    });
    const seriesDef = findSeriesForSlug(current.slug);
    if (seriesDef) {
        seriesPartSlugs(seriesDef).forEach((slug) => push(bySlug.get(slug)));
        if (seriesDef.slug) push(bySlug.get(seriesDef.slug));
    }
    siblingArticles(current, all).forEach(push);
    const rest = all.filter((a) => !seen.has(a.slug) && articleLangCode(a) === lang);
    rest.filter((a) => current.about && a.about === current.about).forEach(push);
    const cluster = articleCluster(current);
    rest.filter((a) => articleCluster(a) === cluster).forEach(push);
    pickCrossClusterArticles(current, all, 4).forEach(push);
    rest.forEach(push);
    all.filter((a) => !seen.has(a.slug)).forEach(push);
    return picked;
}

function relatedArticlesHtml(current, articles) {
    const related = pickRelatedArticles(current, articles);
    if (!related.length) return '';
    const copy = actionCopy(articleLangCode(current));
    const cards = related.map((a) => magCardHtml(a, { kicker: true, cardClass: 'guide-related-card' })).join('');
    return `
<nav class="guide-related" aria-label="${escapeHtml(copy.relatedAria)}">
    <h2 class="guide-related-heading">${escapeHtml(copy.related)}</h2>
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

    const canonicalUrl = canonicalHref(canonicalPath);
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
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
    <link rel="stylesheet" href="/landing.css?v=20260906i">
    <link rel="stylesheet" href="/guide.css?v=20260910b">
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
                <a href="/#servicos">Consultas</a>
                <a href="/consulta">Especialidades</a>
                <a href="/burnout">Burnout</a>
                <a href="/magazine"${navCurrent === 'guide' ? ' aria-current="page"' : ''}>Magazine</a>
                <a href="/#equipa">A Equipa</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="/marcar/clinica-geral" class="lon-btn lon-btn-primary lon-btn-sm" data-talk-cta="doctor">Fale com um médico</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Open menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/#servicos">Consultas</a>
            <a href="/consulta">Especialidades</a>
            <a href="/burnout">Burnout</a>
            <a href="/magazine"${navCurrent === 'guide' ? ' aria-current="page"' : ''}>Magazine</a>
            <a href="/#equipa">A Equipa</a>
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
                    <a href="/info.html?page=contato">Contacto</a>
                    <a href="/info.html?page=trabalhe-connosco">Trabalhe connosco</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Apoio</h4>
                    <a href="/faq">Perguntas frequentes</a>
                    <a href="/magazine">Magazine</a>
                    <a href="/magazine/indice">Índice</a>
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
    <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer" class="lon-wa-float" aria-label="Falar por WhatsApp">💬 Falar por WhatsApp</a>
    <style>.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}</style>
    <script src="/lon-nav.js"></script>
    <script src="/talk-cta.js?v=20260908a" defer></script>
    <script src="/i18n.js?v=20260912a" defer></script>
    <script src="/lon-analytics.js?v=20260906h" defer></script>
    <script src="/lon-slots.js?v=20260912a" defer></script>
</body>
</html>`;
}

function renderBlogIndex(origin) {
    const o = normalizeOrigin(origin);
    const articles = loadListedArticles();
    const recent = articles.slice(0, BLOG_INDEX_LIMIT);
    const defaultOg = `${o}${DEFAULT_OG_IMAGE}`;

    const cards = recent.map((a) => {
        const slug = a.slug;
        const href = `/blog/${encodeURIComponent(slug)}`;
        const t = escapeHtml(String(a.title || slug));
        const d = escapeHtml(String(a.description || ''));
        const iso = String(a.dateModified || a.datePublished || '').slice(0, 10);
        const date = iso
            ? `<time datetime="${escapeHtml(iso)}">Atualizado em ${escapeHtml(magDate(iso, 'pt'))}</time>`
            : '';
        const imagePath = a.image
            ? `${String(a.image).startsWith('/') ? '' : '/'}${String(a.image)}`
            : DEFAULT_GUIDE_IMAGE;
        const img = escapeHtml(imagePath);
        return `
                <article class="lon-service-card is-visible guide-card" role="listitem">
                    <div class="guide-card-inner">
                        <a class="guide-card-media" href="${href}" aria-label="${escapeHtml(listingTitle(a.title || slug))}" style="background-image:url('${img}')"></a>
                        <div class="guide-card-content">
                            <p class="guide-card-date">${date}</p>
                            ${isVerifiedArticle(a) ? `<p class="eeat-byline guide-card-byline"><a rel="author" href="${authors.authorPath(authors.getAuthor(a.author))}">Médica · ${authors.getAuthor(a.author).yearsPractice} anos de prática clínica</a></p>` : (readingTimeHtml(a, 'pt') ? `<p class="guide-card-byline">${readingTimeHtml(a, 'pt')}</p>` : '')}
                            <h2 class="guide-card-title">${escapeHtml(listingTitle(a.title || slug))}</h2>
                            <p class="guide-card-desc">${d}</p>
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
        blogPost: recent.map((a) => ({
            '@type': 'BlogPosting',
            headline: String(a.title || a.slug),
            description: String(a.description || ''),
            url: `${o}/blog/${encodeURIComponent(a.slug)}`,
            datePublished: a.datePublished || undefined,
            dateModified: a.dateModified || a.datePublished || undefined
        }))
    };

    const moreHtml = articles.length > recent.length
        ? `<p class="guide-index-more">Os ${articles.length} artigos estão agrupados por tema na <a href="/magazine">Magazine</a> e no <a href="/magazine/indice">índice completo</a>.</p>`
        : '';

    const mainHtml = `
    <main id="conteudo-principal">
        <section class="guide-hero" aria-label="Guias">
            <div class="lon-container guide-hero-inner">
                <p class="dr-badge">Guias</p>
                <h1 class="guide-hero-title">Guias Médicos Profissionais</h1>
                <p class="guide-hero-lead">Os mais recentes, e o resto por tema na Magazine.</p>
                ${magazineTopicsNavHtml()}
            </div>
        </section>
        <section class="guide-list-section" aria-label="Lista de artigos">
            <div class="lon-container">
                <div class="guide-articles-grid" role="list">
                    ${cards}
                    ${emptyState}
                </div>
                ${moreHtml}
            </div>
        </section>
    </main>`;

    return layoutGuidePage({
        origin: o,
        title: 'Guias Médicos Profissionais | Lon Clinic',
        description: 'Guias médicos recentes da Lon Clinic. O índice completo está na Magazine, por tema.',
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
    const title = String(meta.title || slug);
    const description = String(meta.description || '');
    const datePub = String(meta.datePublished || '');
    let dateMod = String(meta.dateModified || meta.datePublished || '');
    const articlePath = `/blog/${encodeURIComponent(slug)}`;
    const canonicalPath = blogCanonicalPath(meta);
    const pageUrl = `${o}${canonicalPath}`;
    let articleHtml = bodyToHtml(raw, format === 'html' ? 'html' : 'markdown');
    let cviParts = [];
    if (format === 'html' && cvi.isCviPublicArticle(slug)) {
        const dataDate = cvi.storeUpdatedAt();
        articleHtml = cvi.annotatePublicArticle(articleHtml, slug, {
            articleDate: datePub,
            dataDate,
            pageUrl
        });
        cviParts = cvi.jsonLdForArticle(slug, articleHtml, {
            pageUrl,
            articleDate: datePub,
            dataDate
        });
        if (dataDate && (!dateMod || dataDate > dateMod)) dateMod = dataDate;
    }
    articleHtml = injectArticleChrome(articleHtml, meta, manifest.articles, format);
    const relatedHtml = relatedArticlesHtml(meta, manifest.articles);
    const og = `${o}${resolveGuideImage(meta.image)}`;
    const hasPart = cviParts[0] && Array.isArray(cviParts[0].itemListElement)
        ? cviParts[0].itemListElement.map((el) => ({
            '@type': 'WebPageElement',
            '@id': el.item && el.item['@id'],
            name: el.item && el.item.name,
            dateModified: el.item && el.item.dateModified
        }))
        : undefined;

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': ['Article', 'MedicalWebPage'],
            headline: title,
            name: title,
            description,
            datePublished: datePub || undefined,
            dateModified: dateMod || undefined,
            inLanguage: articleLangMeta(meta).inLanguage,
            url: pageUrl,
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': pageUrl
            },
            ...(articleCluster(meta) === 'burnout' ? {
                isPartOf: {
                    '@type': 'CollectionPage',
                    '@id': `${o}/burnout`,
                    name: 'Centro burnout',
                    url: `${o}/burnout`
                }
            } : {}),
            ...(() => {
                const seriesDef = findSeriesForSlug(slug);
                if (!seriesDef || articleCluster(meta) === 'burnout') return {};
                const hubUrl = `${o}/blog/${encodeURIComponent(seriesDef.slug || slug)}`;
                return {
                    isPartOf: {
                        '@type': 'CollectionPage',
                        '@id': hubUrl,
                        name: seriesDef.title,
                        url: hubUrl
                    }
                };
            })(),
            image: og,
            ...(hasPart && hasPart.length ? { hasPart } : {}),
            ...(meta.about ? { about: { '@type': 'MedicalCondition', name: String(meta.about) } } : {}),
            ...(readingMinutes(meta) ? { timeRequired: `PT${readingMinutes(meta)}M` } : {}),
            ...articleAuthorBlock(o, meta)
        }
    ];
    if (isVerifiedArticle(meta)) {
        jsonLd.push(authors.personJsonLd(o));
    }
    if (Array.isArray(meta.faq) && meta.faq.length) {
        jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            dateModified: dateMod || undefined,
            mainEntity: meta.faq.map((item) => {
                const day = item.dateModified || dateMod || undefined;
                return {
                    '@type': 'Question',
                    name: item.q,
                    dateModified: day,
                    acceptedAnswer: { '@type': 'Answer', text: item.a, dateModified: day }
                };
            })
        });
    }
    if (cviParts.length) jsonLd.push(...cviParts);

    const seriesDef = findSeriesForSlug(slug);
    if (seriesDef && isSeriesHub(meta, seriesDef)) {
        jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: seriesDef.title,
            description: seriesDef.description || description,
            url: pageUrl,
            hasPart: seriesPartSlugs(seriesDef).map((partSlug) => {
                const part = (manifest.articles || []).find((a) => a && a.slug === partSlug);
                return {
                    '@type': ['Article', 'MedicalWebPage'],
                    headline: part && part.title ? part.title : partSlug,
                    url: `${o}/blog/${encodeURIComponent(partSlug)}`
                };
            })
        });
    }

    jsonLd.push(magBreadcrumbJsonLd(o, magBreadcrumbCrumbs(`/blog/${encodeURIComponent(slug)}`, title)));

    const isTravelGuide = /vacina|viajante|travel/i.test(slug);
    const byline = (() => {
        const iso = String(dateMod || datePub || '').slice(0, 10);
        const lang = articleLangCode(meta);
        const chrome = ARTICLE_CHROME[lang] || ARTICLE_CHROME.pt;
        const time = iso
            ? `<time datetime="${escapeHtml(iso)}">${escapeHtml(chrome.updated)} ${escapeHtml(magDate(iso, lang))}</time>`
            : '';
        const read = readingTimeHtml(meta, lang);
        const extras = [];
        if (time && read) extras.push('<span aria-hidden="true"> · </span>');
        if (read) extras.push(read);
        if (!isVerifiedArticle(meta)) {
            return `<p class="eeat-byline mag-story-by">${time}${extras.join('')}</p>`;
        }
        const a = authors.getAuthor(meta.author);
        const href = authors.authorPath(a);
        const sep = time || read ? '<span aria-hidden="true"> · </span>' : '';
        return `<p class="eeat-byline mag-story-by">${time}${extras.join('')}${sep}<a class="eeat-byline-name" rel="author" href="${escapeHtml(href)}">${escapeHtml(a.displayName)}</a><span class="eeat-byline-review">${escapeHtml(chrome.review)}</span></p>`;
    })();
    const bio = isVerifiedArticle(meta) ? authors.authorBioHtml(o, meta.author, dateMod || datePub) : '';
    const leadFigure = meta.image
        ? guideLeadFigureHtml(meta.image, title)
        : '';

    const kicker = magThemeLabel(meta);
    const lang = articleLangCode(meta);
    const langMeta = articleLangMeta(meta);
    const chrome = ARTICLE_CHROME[lang] || ARTICLE_CHROME.pt;
    const note = isTravelGuide ? chrome.travelNote : chrome.generalNote;
    const closeCtaKind = defaultCtaKind(meta) === 'general' ? 'clinic' : defaultCtaKind(meta);
    const closeCta = `<section class="mag-section mag-wrap mag-article-cta">${magCtaHtml(closeCtaKind, lang, slug)}</section>`;
    let crumbItems = magBreadcrumbCrumbs(articlePath, title);
    if (articleCluster(meta) === 'burnout') {
        crumbItems = [
            { name: 'Magazine', href: '/magazine' },
            { name: 'Burnout', href: '/burnout' },
            { name: title, href: articlePath, current: true }
        ];
    } else if (seriesDef && !isSeriesHub(meta, seriesDef)) {
        crumbItems = [
            { name: 'Magazine', href: '/magazine' },
            { name: seriesDef.title, href: `/blog/${encodeURIComponent(seriesDef.slug || slug)}` },
            { name: title, href: articlePath, current: true }
        ];
    }
    const crumbsHtml = magBreadcrumbHtml(crumbItems);
    const hubStrip = articleCluster(meta) === 'burnout'
        ? burnoutHubStripHtml(lang)
        : (seriesDef && !isSeriesHub(meta, seriesDef) ? seriesHubStripHtml(seriesDef, lang) : '');
    const seriesNav = seriesDef && !isSeriesHub(meta, seriesDef)
        ? seriesNavHtml(slug, seriesDef, manifest.articles)
        : '';
    const articleInner = format === 'markdown'
        ? `
    <main id="conteudo-principal" class="guide-article-main mag-article-main">
        <article class="mag-story" itemscope itemtype="https://schema.org/MedicalWebPage">
            <header class="mag-story-head">
                ${crumbsHtml}
                ${hubStrip}
                <p class="mag-story-kicker">${escapeHtml(kicker)}</p>
                <h1 class="mag-story-title" itemprop="headline">${escapeHtml(title)}</h1>
                <p class="mag-story-dek">${escapeHtml(description)}</p>
                ${byline}
                ${shareBarHtml(`${o}/blog/${encodeURIComponent(slug)}`, title, `magazine-${slug}`)}
            </header>
            ${leadFigure}
            <div class="mag-story-body">
            <p class="mag-story-note">${escapeHtml(note)}</p>
            <div class="guide-prose mag-story-prose" lang="${escapeHtml(langMeta.htmlLang)}">
                ${articleHtml}
            </div>
            ${seriesNav}
            </div>
            ${relatedHtml}
            ${closeCta}
            ${bio ? `<div class="mag-story-body mag-story-body--foot">${bio}</div>` : ''}
        </article>
    </main>`
        : `
    <main id="conteudo-principal" class="guide-article-main-html mag-article-main">
        <article class="mag-story mag-story--html">
            <header class="mag-story-head mag-story-head--html">
                ${crumbsHtml}
                ${hubStrip}
                <p class="mag-story-kicker">${escapeHtml(kicker)}</p>
                ${byline}
                ${shareBarHtml(`${o}/blog/${encodeURIComponent(slug)}`, title, `magazine-${slug}`)}
            </header>
            <div class="guide-prose" lang="${escapeHtml(langMeta.htmlLang)}">
                ${articleHtml}
            </div>
            ${seriesNav}
            ${relatedHtml}
            ${closeCta}
            ${bio}
        </article>
    </main>`;

    const html = layoutMagazinePage({
        origin: o,
        title: `${title} | LON Magazine`,
        description,
        canonicalPath,
        ogImage: og,
        jsonLd,
        ogType: 'article',
        htmlLang: langMeta.htmlLang,
        ogLocale: langMeta.ogLocale,
        extraHead: articleHreflangLinks(o, meta, manifest.articles),
        extraCssAfter: ['/guide.css?v=20260910b', '/author.css?v=20260820l'],
        mainHtml: magAppHtml(articlePath, articleInner, {
            magazineCurrent: true,
            talk: talkCta.resolve({ kind: ctaKind, slug, lang })
        })
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
            <p><a class="lon-btn lon-btn-primary" href="/magazine">Ver a Magazine</a></p>
        </div>
    </main>`;
    return layoutGuidePage({
        origin: o,
        title: 'Não encontrado | Lon Clinic',
        description: 'O artigo pedido não foi encontrado.',
        canonicalPath: '/blog',
        ogImage: `${o}${DEFAULT_OG_IMAGE}`,
        jsonLd: null,
        mainHtml,
        navCurrent: 'guide',
        ogType: 'website',
        robots: 'noindex, follow'
    });
}

const MAGAZINE_SECTIONS = [
    {
        slug: 'saude-mental',
        theme: 'mental',
        title: 'Mente',
        description: 'Psicologia, autismo, ADHD e consultas em Portugal: guias da Lon Magazine.',
        ctaKind: 'mental'
    },
    {
        slug: 'burnout',
        theme: 'burnout',
        title: 'Burnout',
        description: 'Sinais de burnout, recuperação, trabalho e quando procurar ajuda.',
        ctaKind: 'burnout'
    },
    {
        slug: 'depressao',
        theme: 'depressao',
        title: 'Depressão',
        description: 'Depressão: primeiros sinais, tratamento e quando pedir ajuda.',
        ctaKind: 'mental'
    },
    {
        slug: 'ansiedade',
        theme: 'ansiedade',
        title: 'Ansiedade',
        description: 'Ansiedade, pânico e insónia: guias clínicos da Lon Magazine.',
        ctaKind: 'mental'
    },
    {
        slug: 'autoconhecimento',
        theme: 'autoconhecimento',
        title: 'Autoconhecimento',
        description: 'Valores, limites, perfeccionismo e terapia.',
        ctaKind: 'mental'
    },
    {
        slug: 'perda-de-peso',
        theme: 'perda-de-peso',
        title: 'Perda de peso',
        description: 'Nutrição, défice calórico e perda de peso sustentável.',
        ctaKind: 'nutrition'
    },
    {
        slug: 'livros-saude',
        theme: 'livros-saude',
        title: 'Livros de saúde',
        description: 'Leituras de saúde com leitura clínica da Lon Magazine.',
        ctaKind: 'nutrition'
    },
    {
        slug: 'livros-psicologia',
        theme: 'bestsellers-psicologia',
        title: 'Livros de psicologia',
        description: 'Bestsellers de psicologia lidos em contexto clínico.',
        ctaKind: 'mental'
    },
    {
        slug: 'saude-intestinal',
        theme: 'bestsellers-saude-intestinal',
        title: 'Saúde intestinal',
        description: 'Intestino, microbiota e leituras de gastroenterologia.',
        ctaKind: 'nutrition'
    },
    {
        slug: 'saude-do-viajante',
        theme: 'travel',
        title: 'Viagem',
        description: 'Vacinas, consulta do viajante e febre amarela em Portugal.',
        ctaKind: 'travel'
    },
    {
        slug: 'clinica',
        theme: 'clinic',
        title: 'Clínica',
        description: 'Telemedicina, SNS vs privado e como marcar consulta.',
        ctaKind: 'clinic'
    }
];

const MAGAZINE_SECTION_ALIASES = {
    'livros-de-saude': 'livros-saude',
    'livros-de-psicologia': 'livros-psicologia',
    mente: 'saude-mental',
    viagem: 'saude-do-viajante'
};

const MAG_ROW_PREVIEW = 4;
const BLOG_INDEX_LIMIT = 24;
const HOME_EDITORIAL_THEMES = ['burnout', 'mental', 'ansiedade', 'perda-de-peso', 'travel', 'clinic'];

function magazineSections() {
    return MAGAZINE_SECTIONS.slice();
}

function magazineSectionBySlug(slug) {
    const key = MAGAZINE_SECTION_ALIASES[String(slug || '')] || slug;
    return MAGAZINE_SECTIONS.find((s) => s.slug === key) || null;
}

function magazineSectionByTheme(theme) {
    return MAGAZINE_SECTIONS.find((s) => s.theme === theme) || null;
}

function magazineSectionPath(slug) {
    const section = magazineSectionBySlug(slug);
    return section ? `/magazine/${section.slug}` : '/magazine';
}

function magTheme(article) {
    const about = String((article && article.about) || '').toLowerCase();
    const slug = String((article && article.slug) || '');
    if (article && (article.series === 'livros-saude' || about === 'livros de saúde' || about === 'livros de saude')) {
        return 'livros-saude';
    }
    if (article && (article.series === 'bestsellers-psicologia' || about === 'livros de psicologia')) {
        return 'bestsellers-psicologia';
    }
    if (article && (article.series === 'bestsellers-saude-intestinal' || about === 'livros de intestino' || about === 'saúde intestinal' || about === 'saude intestinal')) {
        return 'bestsellers-saude-intestinal';
    }
    if (/burnout/.test(about) || /burnout/.test(slug) || (article && article.href && String(article.href).startsWith('/burnout'))) {
        return 'burnout';
    }
    if (/depress/.test(about) || /depressao|anedonia|antidepressivos/.test(slug)) return 'depressao';
    if (/ansiedade/.test(about) || /ansiedade|ataques-de-panico|fobias-especificas/.test(slug)) return 'ansiedade';
    if (/autoconhecimento/.test(about) || /inteligencia-emocional|padroes-de-apego|autossabotagem|eneagrama|perfeccionismo|autocompaixao|sindrome-do-impostor|journaling|gatilhos-emocionais|crencas-limitantes|limites-pessoais|introspecao|autoestima/.test(slug)) return 'autoconhecimento';
    if (/perda de peso/.test(about) || /perda-de-peso|deficit-calorico|efeito-ioio|fome-emocional|alimentacao-intuitiva|glp1|contagem-de-calorias|platos-na-perda|alcool-e-perda|proteina-e-saciedade|sono-e-peso|stress-e-perda|forca-vs-cardio|fibra-e-perda|manter-o-peso|nutricionista-plano/.test(slug)) return 'perda-de-peso';
    if (/autismo|adhd/.test(about) || /autismo|adhd/.test(slug)) return 'mental';
    if (/psicolog/.test(about) || /encontrar-um-psicologo|consulta-psicologia/.test(slug)) return 'mental';
    if (/vacina|viajante|travel/.test(slug)) return 'travel';
    return 'clinic';
}

function magThemeLabel(article) {
    const section = magazineSectionByTheme(magTheme(article));
    return section ? section.title : 'Clínica';
}

function loadListedArticles() {
    return sortArticles(listedGuideArticles(loadManifest().articles || []));
}

function newestListedArticleDate(theme) {
    const pool = theme
        ? loadListedArticles().filter((a) => magTheme(a) === theme)
        : loadListedArticles();
    let max = '';
    for (const a of pool) {
        const d = String(a.dateModified || a.datePublished || '').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d > max) max = d;
    }
    return max;
}

function magazineTopicsNavHtml(opts) {
    const current = opts && opts.current;
    const indiceCurrent = opts && opts.indice;
    const links = MAGAZINE_SECTIONS.map((s) => {
        const cur = current === s.slug ? ' aria-current="page"' : '';
        return `<a href="${escapeHtml(magazineSectionPath(s.slug))}"${cur}>${escapeHtml(s.title)}</a>`;
    }).join('\n');
    const indiceCur = indiceCurrent ? ' aria-current="page"' : '';
    return `<nav class="mag-topics" aria-label="Temas da magazine">${links}
<a href="/magazine/indice"${indiceCur}>Índice</a></nav>`;
}

function listingTitle(raw) {
    const keep = /^(Lon|Clinic|Portugal|Lisboa|Porto|Aveiro|Coimbra|Braga|Faro|Algarve|Madeira|Açores|Setúbal|Guimarães|Funchal|Cascais|Sintra|Gaia|Leiria|Évora|Viseu|Beja|Santarém|ADSE|SNS|CUF|OPP|ERS|PDF|FAQ|WhatsApp|Burnout|Ozempic|Wegovy|PHQ-9|GAD-7|ISI|ESS|TFEQ|YFAS|aGLP-1|GLP-1|TDAH|TOC|UA|UP)$/i;
    const s = String(raw || '').trim();
    if (!s) return s;
    const parts = s.split(/(\s+)/);
    let seenWord = false;
    return parts.map((part) => {
        if (!part || /^\s+$/.test(part)) return part;
        const coreMatch = part.match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'’.-]*/);
        const core = coreMatch ? coreMatch[0] : '';
        const isFirst = !seenWord;
        if (core) seenWord = true;
        if (!core || keep.test(core) || /^[A-Z0-9]{2,}(?:-\d+)?$/.test(core)) return part;
        if (/[a-zà-ÿ].*[A-ZÁÀÂÃÉÊÍÓÔÕÚ]/.test(core)) return part;
        if (isFirst) return part;
        const lowered = core.charAt(0).toLowerCase() + core.slice(1);
        return part.replace(core, lowered);
    }).join('');
}

function magIndexListHtml(articles) {
    const items = (Array.isArray(articles) ? articles : []).map((a) => {
        const iso = String((a.dateModified || a.datePublished) || '').slice(0, 10);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(iso)
            ? `<time datetime="${escapeHtml(iso)}">${escapeHtml(magDate(iso, 'pt'))}</time>`
            : '';
        return `<li><a href="${escapeHtml(magHref(a))}">${escapeHtml(listingTitle(a.title || a.slug))}</a>${date}</li>`;
    }).join('');
    return `<ol class="mag-index-list">${items}</ol>`;
}

function magIssueLine() {
    return 'Setembro 2026 · Porto';
}

function magCardDateHtml(article) {
    const iso = String((article && (article.dateModified || article.datePublished)) || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    return `<p class="mag-updated"><time datetime="${escapeHtml(iso)}">Atualizado em ${escapeHtml(magDate(iso))}</time></p>`;
}

function magCardBylineHtml(article) {
    if (!isVerifiedArticle(article)) {
        const read = readingTimeLabel(article, articleLangCode(article));
        return read ? `<p class="mag-byline">${escapeHtml(read)}</p>` : '';
    }
    const a = authors.getAuthor(article && article.author);
    return `<p class="mag-byline">Por ${escapeHtml(a.displayName)}</p>`;
}

function magCardHtml(article, opts) {
    const extraClass = opts && opts.cardClass ? ` ${opts.cardClass}` : '';
    const kickerText = (opts && opts.kickerText) || magThemeLabel(article);
    const kicker = `<span class="mag-card-kicker">${escapeHtml(kickerText)}</span>`;
    const excerpt = article.description
        ? `<p class="mag-excerpt">${escapeHtml(article.description)}</p>`
        : '';
    const titleClass = extraClass.includes('guide-related-card') ? ' class="guide-related-title"' : '';
    return `<a class="mag-card${extraClass}" href="${magHref(article)}">
                <span class="mag-photo" style="background-image:url('${magImage(article)}')"></span>
                ${kicker}
                <h3${titleClass}>${escapeHtml(listingTitle(article.title))}</h3>
                ${magCardBylineHtml(article)}
                ${excerpt}
            </a>`;
}

function magFeaturedHtml(article) {
    if (!article) return '';
    const excerpt = article.description
        ? `<p class="mag-cover-dek">${escapeHtml(article.description)}</p>`
        : '';
    return `<a class="mag-cover" href="${magHref(article)}">
                <span class="mag-cover-photo" style="background-image:url('${magImage(article)}')"></span>
                <span class="mag-cover-plate">
                    <span class="mag-cover-issue">${escapeHtml(magIssueLine())}</span>
                    <span class="mag-cover-name">Lon <em>Magazine</em></span>
                </span>
                <span class="mag-cover-copy">
                    <span class="mag-cover-flag">Capa</span>
                    <span class="mag-cover-kicker">${escapeHtml(magThemeLabel(article))}</span>
                    <h2>${escapeHtml(listingTitle(article.title))}</h2>
                    ${excerpt}
                    ${magCardBylineHtml(article)}
                    <span class="mag-cover-read">Ler a reportagem</span>
                </span>
            </a>`;
}

function magTocHtml() {
    const items = MAGAZINE_SECTIONS.map((s, i) => {
        const n = String(i + 1).padStart(2, '0');
        return `<li><a href="${escapeHtml(magazineSectionPath(s.slug))}"><span>${n}</span> ${escapeHtml(s.title)}</a></li>`;
    }).join('');
    return `<nav class="mag-toc mag-wrap" aria-label="Nesta edição">
                <p class="mag-toc-kicker">Nesta edição</p>
                <ol>
                    ${items}
                    <li><a href="/magazine/indice"><span>${String(MAGAZINE_SECTIONS.length + 1).padStart(2, '0')}</span> Índice</a></li>
                </ol>
            </nav>`;
}

function magCtaHtml(kind, lang, slug) {
    const packs = {
        pt: {
            mental: {
                kicker: 'Cuidado',
                title: 'A mente também se acompanha.',
                actions: [
                    { href: '/saudemental', label: 'Psicologia' },
                    { href: '/teste-personalidade', label: 'Teste de personalidade' }
                ]
            },
            travel: {
                kicker: 'Viagem',
                title: 'Partir com a saúde em dia.',
                actions: [
                    { href: '/marcar/travel', label: 'Consulta do viajante' },
                    { href: '/travel-clinic', label: 'Clínica do viajante' }
                ]
            },
            burnout: {
                kicker: 'Dossier',
                title: 'Quando o esgotamento já não é só cansaço.',
                actions: [
                    { href: '/burnout/teste', label: 'Fazer o teste' },
                    { href: '/burnout', label: 'Centro burnout' }
                ]
            },
            clinic: {
                kicker: 'Clínica',
                title: 'Uma consulta, com tempo.',
                actions: [
                    { href: '/marcar/clinica-geral', label: 'Fale com um médico' },
                    { href: '/blog/telemedicina-em-casa', label: 'Telemedicina em casa' }
                ]
            },
            nutrition: {
                kicker: 'Nutrição',
                title: 'Um plano que cabe na sua vida.',
                actions: [
                    { href: '/nutricao', label: 'Nutrição por condição' },
                    { href: '/marcar/clinica-geral?ref=magazine-perda-de-peso', label: 'Fale com um nutricionista' }
                ]
            },
            'nutricao-programa': {
                kicker: 'Nutrição',
                title: 'Transição GLP-1 e manutenção metabólica.',
                actions: [
                    { href: '/nutricao/glp-1', label: 'Página GLP-1' },
                    { href: '/marcar/nutricao-programa', label: 'Programa nutricional' }
                ]
            },
            neurodiversidade: {
                kicker: 'Psicologia',
                title: 'Quando o esgotamento pode ser TDAH, autismo ou burnout.',
                actions: [
                    { href: '/psicologia', label: 'Avaliação psicológica' },
                    { href: '/burnout/teste', label: 'Teste CBI' }
                ]
            },
            longevity: {
                kicker: 'Longevidade',
                title: 'Prevenir com biomarcadores reais.',
                actions: [
                    { href: '/marcar/longevidade', label: 'Consulta de longevidade' },
                    { href: '/nutricao', label: 'Saúde metabólica' }
                ]
            }
        },
        en: {
            mental: {
                kicker: 'Care',
                title: 'The mind also needs follow-up.',
                actions: [
                    { href: '/saudemental?lang=en', label: 'Psychology' },
                    { href: '/teste-personalidade?lang=en', label: 'Personality test' }
                ]
            },
            travel: {
                kicker: 'Travel',
                title: 'Leave with your health in order.',
                actions: [
                    { href: '/marcar/travel?lang=en', label: 'Travel consultation' },
                    { href: '/travel-clinic', label: 'Travel clinic' }
                ]
            },
            burnout: {
                kicker: 'File',
                title: 'When exhaustion is no longer just tiredness.',
                actions: [
                    { href: '/burnout/teste?lang=en', label: 'Take the test' },
                    { href: '/burnout', label: 'Burnout hub' }
                ]
            },
            clinic: {
                kicker: 'Clinic',
                title: 'A consultation, with time.',
                actions: [
                    { href: '/marcar/clinica-geral?lang=en', label: 'Book a consultation' },
                    { href: '/blog/telemedicina-em-casa', label: 'Telemedicine at home' }
                ]
            }
        },
        es: {
            mental: {
                kicker: 'Cuidado',
                title: 'La mente también se acompaña.',
                actions: [
                    { href: '/saudemental?lang=es', label: 'Psicología' },
                    { href: '/teste-personalidade?lang=es', label: 'Test de personalidad' }
                ]
            },
            travel: {
                kicker: 'Viaje',
                title: 'Salir con la salud al día.',
                actions: [
                    { href: '/marcar/travel?lang=es', label: 'Consulta del viajero' },
                    { href: '/travel-clinic', label: 'Clínica del viajero' }
                ]
            },
            burnout: {
                kicker: 'Dossier',
                title: 'Cuando el agotamiento ya no es solo cansancio.',
                actions: [
                    { href: '/burnout/teste?lang=es', label: 'Hacer el test' },
                    { href: '/burnout', label: 'Centro burnout' }
                ]
            },
            clinic: {
                kicker: 'Clínica',
                title: 'Una consulta, con tiempo.',
                actions: [
                    { href: '/marcar/clinica-geral?lang=es', label: 'Reservar consulta' },
                    { href: '/blog/telemedicina-em-casa', label: 'Telemedicina en casa' }
                ]
            }
        },
        fr: {
            mental: {
                kicker: 'Soin',
                title: 'L’esprit aussi s’accompagne.',
                actions: [
                    { href: '/saudemental?lang=fr', label: 'Psychologie' },
                    { href: '/teste-personalidade?lang=fr', label: 'Test de personnalité' }
                ]
            },
            travel: {
                kicker: 'Voyage',
                title: 'Partir avec la santé à jour.',
                actions: [
                    { href: '/marcar/travel?lang=fr', label: 'Consultation du voyageur' },
                    { href: '/travel-clinic', label: 'Clinique du voyageur' }
                ]
            },
            burnout: {
                kicker: 'Dossier',
                title: 'Quand l’épuisement n’est plus seulement de la fatigue.',
                actions: [
                    { href: '/burnout/teste?lang=fr', label: 'Faire le test' },
                    { href: '/burnout', label: 'Centre burnout' }
                ]
            },
            clinic: {
                kicker: 'Clinique',
                title: 'Une consultation, avec du temps.',
                actions: [
                    { href: '/marcar/clinica-geral?lang=fr', label: 'Prendre rendez-vous' },
                    { href: '/blog/telemedicina-em-casa', label: 'Télémédecine à domicile' }
                ]
            }
        },
        de: {
            mental: {
                kicker: 'Fürsorge',
                title: 'Auch die Psyche braucht Begleitung.',
                actions: [
                    { href: '/saudemental?lang=de', label: 'Psychologie' },
                    { href: '/teste-personalidade?lang=de', label: 'Persönlichkeitstest' }
                ]
            },
            travel: {
                kicker: 'Reise',
                title: 'Mit geklärter Gesundheit reisen.',
                actions: [
                    { href: '/marcar/travel?lang=de', label: 'Reisemedizinische Beratung' },
                    { href: '/travel-clinic', label: 'Reiseklinik' }
                ]
            },
            burnout: {
                kicker: 'Dossier',
                title: 'Wenn Erschöpfung nicht mehr nur Müdigkeit ist.',
                actions: [
                    { href: '/burnout/teste?lang=de', label: 'Test machen' },
                    { href: '/burnout', label: 'Burnout-Zentrum' }
                ]
            },
            clinic: {
                kicker: 'Klinik',
                title: 'Eine Sprechstunde, mit Zeit.',
                actions: [
                    { href: '/marcar/clinica-geral?lang=de', label: 'Termin buchen' },
                    { href: '/blog/telemedicina-em-casa', label: 'Telemedizin zu Hause' }
                ]
            }
        }
    };
    const byLang = packs[lang] || packs.pt;
    const pack = byLang[kind] || packs.pt[kind] || byLang.clinic;
    const langQ = lang && lang !== 'pt' ? `?lang=${encodeURIComponent(lang)}` : '';
    const bookingByKind = {
        mental: `/saudemental${langQ}`,
        travel: `/marcar/travel${langQ}`,
        burnout: `/burnout`,
        clinic: `/marcar/clinica-geral${langQ}`,
        nutrition: `/marcar/clinica-geral${langQ}`,
        'nutricao-programa': `/marcar/nutricao-programa${langQ}`,
        nutricao_programa: `/marcar/nutricao-programa${langQ}`,
        neurodiversidade: `/psicologia`,
        psicologia: `/marcar/psicologia${langQ}`,
        longevity: `/marcar/longevidade${langQ}`
    };
    const talkKind = kind === 'clinic' || kind === 'general' ? 'clinic' : kind;
    const talk = talkCta.resolve({ kind: talkKind, slug, lang });
    const hubLabelByLang = {
        pt: 'Ir ao centro burnout',
        en: 'Go to the burnout hub',
        es: 'Ir al centro burnout',
        fr: 'Aller au centre burnout',
        de: 'Zum Burnout-Zentrum'
    };
    const testLabelByLang = {
        pt: 'Fazer o teste',
        en: 'Take the test',
        es: 'Hacer el test',
        fr: 'Faire le test',
        de: 'Test machen'
    };
    const bookingHref = (kind === 'mental' || kind === 'psicologia')
        ? talk.href
        : (bookingByKind[kind] || bookingByKind.clinic);
    const bookingLabel = talk.label || (pack.actions && pack.actions[0] && pack.actions[0].label);
    let actions;
    if (kind === 'burnout') {
        actions = `<a class="mag-cta-primary" href="/burnout">${escapeHtml(hubLabelByLang[lang] || hubLabelByLang.pt)}</a><a class="mag-cta-ghost" href="${escapeHtml(withLangHref('/burnout/teste', lang))}">${escapeHtml(testLabelByLang[lang] || testLabelByLang.pt)}</a>`;
    } else if (kind === 'neurodiversidade' && pack.actions && pack.actions.length >= 2) {
        actions = `<a class="mag-cta-primary" href="${escapeHtml(pack.actions[0].href)}">${escapeHtml(pack.actions[0].label)}</a><a class="mag-cta-ghost" href="${escapeHtml(pack.actions[1].href)}">${escapeHtml(pack.actions[1].label)}</a>`;
    } else if ((kind === 'nutricao-programa' || kind === 'nutricao_programa') && pack.actions && pack.actions.length >= 2) {
        actions = `<a class="mag-cta-primary" href="${escapeHtml(pack.actions[1].href)}">${escapeHtml(talk.label)}</a><a class="mag-cta-ghost" href="${escapeHtml(pack.actions[0].href)}">${escapeHtml(pack.actions[0].label)}</a>`;
    } else {
        actions = `<a class="mag-cta-primary" href="${escapeHtml(bookingHref)}" data-talk-cta="${escapeHtml(talk.role)}">${escapeHtml(bookingLabel)}</a>`;
    }
    return `<aside class="mag-cta" aria-label="${escapeHtml(pack.title)}">
                <p>${escapeHtml(pack.kicker)}</p>
                <h2>${escapeHtml(pack.title)}</h2>
                <div class="mag-cta-actions">${actions}
                </div>
            </aside>`;
}

function magClusterHtml() {
    return `<aside class="mag-cluster mag-wrap" aria-label="Autismo, ADHD e burnout">
                <p class="mag-cluster-kicker">Dossier</p>
                <h2 class="mag-cluster-title">Autismo, ADHD e burnout</h2>
                <p class="mag-cluster-dek">Mascaramento, hiperfoco e esgotamento sobrepõem-se. Leia em conjunto o <a href="/blog/unmasking-autism-devon-price">custo do masking</a>, <a href="/blog/adhd-2-0-hallowell-ratey">ADHD 2.0 e burnout invisível</a>, o <a href="/blog/autismo-em-mulheres-diagnostico-tardio">diagnóstico tardio em mulheres</a> e <a href="/burnout/o-que-e">o que é burnout</a> — não como categorias isoladas.</p>
                ${magCtaHtml('burnout')}
            </aside>`;
}

function magThemeRowHtml(id, title, articles, ctaKind) {
    if (!articles.length) return '';
    const cta = ctaKind ? magCtaHtml(ctaKind) : '';
    const preview = articles.slice(0, MAG_ROW_PREVIEW);
    const moreHref = magazineSectionPath(id);
    const moreLabel = articles.length > preview.length
        ? `Ver todos · ${articles.length} artigos`
        : `Índice de ${title}`;
    return `<section class="mag-section mag-wrap" id="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title">
                <div class="mag-section-head">
                    <p class="mag-section-kicker">Nesta edição</p>
                    <h2 id="${escapeHtml(id)}-title">${escapeHtml(title)}</h2>
                </div>
                <div class="mag-row">${preview.map(magCardHtml).join('')}
                </div>
                <p class="mag-section-more"><a href="${escapeHtml(moreHref)}">${escapeHtml(moreLabel)}</a></p>
                ${cta}
            </section>`;
}

function magDate(iso, lang) {
    const raw = String(iso || '').slice(0, 10);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return raw;
    const months = {
        en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
        fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    };
    const list = months[lang] || months.pt;
    const month = list[Number(m[2]) - 1] || m[2];
    if (lang === 'en') return `${month} ${Number(m[3])}, ${m[1]}`;
    if (lang === 'de') return `${Number(m[3])}. ${month} ${m[1]}`;
    return `${Number(m[3])} ${month} ${m[1]}`;
}

function magImage(article) {
    return escapeHtml(resolveGuideImage(article && article.image));
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
                    label: 'Depressão',
                    children: [
                        { label: 'Mitos e factos', href: '/blog/depressao-mitos-e-factos' },
                        { label: 'Primeiros sinais', href: '/blog/primeiros-sinais-de-depressao' },
                        { label: 'Depressão sazonal', href: '/blog/depressao-sazonal' },
                        { label: 'Depressão pós-parto', href: '/blog/depressao-pos-parto' },
                        { label: 'Depressão em homens', href: '/blog/depressao-em-homens' },
                        { label: 'Tristeza, luto ou depressão', href: '/blog/tristeza-luto-ou-depressao' },
                        { label: 'Depressão e sono', href: '/blog/depressao-e-sono' },
                        { label: 'Como apoiar alguém', href: '/blog/como-apoiar-alguem-com-depressao' },
                        { label: 'Depressão em adolescentes', href: '/blog/depressao-em-adolescentes' },
                        { label: 'Antidepressivos', href: '/blog/antidepressivos-o-que-esperar' },
                        { label: 'Terapia ou medicação', href: '/blog/terapia-ou-medicacao-na-depressao' },
                        { label: 'Alta funcionalidade', href: '/blog/depressao-de-alta-funcionalidade' },
                        { label: 'Depressão e trabalho', href: '/blog/depressao-e-trabalho' },
                        { label: 'Anedonia', href: '/blog/anedonia' },
                        { label: 'Depressão crónica', href: '/blog/depressao-cronica-distimia' },
                        { label: 'Exercício físico', href: '/blog/exercicio-fisico-e-depressao' },
                        { label: 'Depressão em idosos', href: '/blog/depressao-em-idosos' },
                        { label: 'Recaída', href: '/blog/recaida-na-depressao' },
                        { label: 'Depressão e relações', href: '/blog/depressao-e-relacoes' },
                        { label: 'Quando procurar ajuda', href: '/blog/quando-procurar-ajuda-para-a-depressao' }
                    ]
                },
                {
                    label: 'Ansiedade',
                    children: [
                        { label: 'Luta ou fuga', href: '/blog/ansiedade-luta-ou-fuga' },
                        { label: 'Ataques de pânico', href: '/blog/ataques-de-panico' },
                        { label: 'Ansiedade generalizada', href: '/blog/ansiedade-generalizada' },
                        { label: 'Ansiedade social', href: '/blog/ansiedade-social' },
                        { label: 'Ansiedade e insónia', href: '/blog/ansiedade-e-insonia' },
                        { label: 'Técnicas de respiração', href: '/blog/tecnicas-de-respiracao-para-ansiedade' },
                        { label: 'Ansiedade antecipatória', href: '/blog/ansiedade-antecipatoria' },
                        { label: 'Ansiedade no trabalho', href: '/blog/ansiedade-no-trabalho' },
                        { label: 'Normal ou perturbação', href: '/blog/ansiedade-normal-ou-perturbacao' },
                        { label: 'Ansiedade em crianças', href: '/blog/ansiedade-em-criancas' },
                        { label: 'Fobias específicas', href: '/blog/fobias-especificas' },
                        { label: 'Problemas digestivos', href: '/blog/ansiedade-e-problemas-digestivos' },
                        { label: 'Ansiedade financeira', href: '/blog/ansiedade-financeira' },
                        { label: 'TCC para a ansiedade', href: '/blog/tcc-para-ansiedade' },
                        { label: 'Antes de viagens', href: '/blog/ansiedade-antes-de-viagens' },
                        { label: 'Cafeína', href: '/blog/cafeina-e-ansiedade' },
                        { label: 'Ansiedade de desempenho', href: '/blog/ansiedade-de-desempenho' },
                        { label: 'Saúde do coração', href: '/blog/ansiedade-e-saude-do-coracao' },
                        { label: 'Mindfulness', href: '/blog/mindfulness-para-ansiedade' },
                        { label: 'Quando justifica medicação', href: '/blog/quando-a-ansiedade-justifica-medicacao' }
                    ]
                },
                {
                    label: 'Autoconhecimento',
                    children: [
                        { label: 'O que é autoconhecimento', href: '/blog/o-que-e-autoconhecimento' },
                        { label: 'Valores pessoais', href: '/blog/como-identificar-valores-pessoais' },
                        { label: 'Inteligência emocional', href: '/blog/inteligencia-emocional' },
                        { label: 'Padrões de apego', href: '/blog/padroes-de-apego' },
                        { label: 'Autossabotagem', href: '/blog/autossabotagem' },
                        { label: 'Reconhecer emoções', href: '/blog/reconhecer-emocoes-em-tempo-real' },
                        { label: 'Journaling terapêutico', href: '/blog/journaling-terapeutico' },
                        { label: 'Gatilhos emocionais', href: '/blog/gatilhos-emocionais' },
                        { label: 'Autoestima vs autoconfiança', href: '/blog/autoestima-vs-autoconfianca' },
                        { label: 'Crenças limitantes', href: '/blog/crencas-limitantes' },
                        { label: 'Eneagrama', href: '/blog/eneagrama-autoconhecimento' },
                        { label: 'Perfeccionismo', href: '/blog/perfeccionismo' },
                        { label: 'Terapia e autoconhecimento', href: '/blog/como-a-terapia-ajuda-autoconhecimento' },
                        { label: 'Infância e padrões', href: '/blog/impacto-da-infancia-nos-padroes' },
                        { label: 'Autocompaixão', href: '/blog/autocompaixao' },
                        { label: 'Viver segundo os valores', href: '/blog/viver-de-acordo-com-os-valores' },
                        { label: 'Limites pessoais', href: '/blog/limites-pessoais' },
                        { label: 'Síndrome do impostor', href: '/blog/sindrome-do-impostor' },
                        { label: 'Introspeção e decisões', href: '/blog/introspecao-e-tomada-de-decisoes' },
                        { label: 'Autoconhecimento financeiro', href: '/blog/autoconhecimento-financeiro' }
                    ]
                },
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
                        { label: 'Teste', href: '/burnout/teste' },
                        {
                            label: 'Artigos',
                            children: [
                                { label: 'O que é burnout', href: '/blog/o-que-e-burnout' },
                                { label: 'Psicologia online para burnout', href: '/blog/psicologia-online-para-burnout' },
                                { label: 'Sinais e quando procurar ajuda', href: '/blog/burnout-sinais-quando-procurar-ajuda' },
                                { label: 'O que é e diferença do cansaço', href: '/blog/burnout-o-que-e-sinais-cansaco' },
                                { label: '9 sinais no trabalho', href: '/blog/9-sinais-de-burnout-no-trabalho' },
                                { label: 'Burnout parental', href: '/blog/burnout-parental-investigacao' },
                                { label: 'Burnout académico', href: '/blog/burnout-academico' },
                                { label: 'Sintomas físicos', href: '/blog/sintomas-fisicos-do-burnout' },
                                { label: 'Burnout ou depressão', href: '/blog/burnout-ou-depressao' },
                                { label: 'Quanto tempo demora a recuperar', href: '/blog/quanto-tempo-demora-a-recuperar-de-um-burnout' },
                                { label: 'Burnout digital', href: '/blog/burnout-digital-videochamadas' },
                                { label: 'Como falar com o médico', href: '/blog/como-falar-com-o-medico-sobre-burnout' },
                                { label: 'Profissões de saúde', href: '/blog/burnout-em-profissoes-de-saude' },
                                { label: 'Trabalho remoto', href: '/blog/sinais-de-burnout-no-trabalho-remoto' },
                                { label: 'Baixa médica em Portugal', href: '/blog/burnout-e-baixa-medica-em-portugal' },
                                { label: 'Prevenção nas empresas', href: '/blog/como-as-empresas-podem-prevenir-o-burnout' },
                                { label: 'Equipa motivada ou a cumprir horário', href: '/blog/como-saber-se-a-equipa-esta-motivada' },
                                { label: 'Só um founder entende o burnout?', href: '/blog/so-um-founder-entende-o-burnout-de-um-founder' },
                                { label: 'Burnout financeiro', href: '/blog/burnout-financeiro' },
                                { label: 'Reconstruir a motivação', href: '/blog/reconstruir-a-motivacao-depois-de-um-burnout' },
                                { label: 'Burnout materno', href: '/blog/burnout-materno' },
                                { label: 'Burnout e sono', href: '/blog/como-o-burnout-afeta-o-sono' },
                                { label: 'Cuidadores informais', href: '/blog/burnout-em-cuidadores-informais' },
                                { label: 'Quando se torna mais sério', href: '/blog/quando-o-burnout-se-transforma-em-algo-mais-serio' },
                                { label: 'Regressar ao trabalho', href: '/blog/regressar-ao-trabalho-depois-de-um-burnout' }
                            ]
                        }
                    ]
                },
                { label: 'Como encontrar um psicólogo', href: '/blog/como-encontrar-um-psicologo' },
                { label: 'Quanto custa uma consulta', href: '/blog/quanto-custa-consulta-psicologia-portugal' },
                { label: 'Consultas gratuitas', href: '/blog/consultas-psicologia-gratuitas-portugal' },
                { label: 'Apoio nas universidades', href: '/blog/apoio-psicologico-universidades-portugal' },
                { label: 'ADSE e seguros', href: '/blog/adse-seguros-psicologia-portugal' },
                { label: 'Online vs presencial', href: '/blog/psicologia-online-vs-presencial' },
                { label: 'Primeira consulta', href: '/blog/primeira-consulta-psicologia-o-que-esperar' },
                { label: 'Quando ir ao psicólogo', href: '/blog/quando-ir-ao-psicologo-sinais' },
                { label: 'Psicólogo para ansiedade', href: '/blog/psicologo-ansiedade-quando-procurar-ajuda' },
                {
                    label: 'Por cidade',
                    children: [
                        { label: 'Online por distrito', href: '/blog/psicologia-online-portugal-por-distrito' },
                        {
                            label: 'Norte',
                            children: [
                                { label: 'Porto', href: '/blog/consultas-psicologia-porto' },
                                { label: 'Braga', href: '/blog/consultas-psicologia-braga' },
                                { label: 'Guimarães', href: '/blog/consultas-psicologia-guimaraes' },
                                { label: 'Gondomar', href: '/blog/consultas-psicologia-gondomar' },
                                { label: 'Matosinhos', href: '/blog/consultas-psicologia-matosinhos' },
                                { label: 'Penafiel', href: '/blog/consultas-psicologia-penafiel' },
                                { label: 'Marco de Canaveses', href: '/blog/consultas-psicologia-marco-de-canaveses' },
                                { label: 'Vila Real', href: '/blog/consultas-psicologia-vila-real' },
                                { label: 'Viana do Castelo', href: '/blog/consultas-psicologia-viana-do-castelo' },
                                { label: 'Guarda', href: '/blog/consultas-psicologia-guarda' }
                            ]
                        },
                        {
                            label: 'Centro',
                            children: [
                                { label: 'Aveiro', href: '/blog/consultas-psicologia-aveiro' },
                                { label: 'Ovar', href: '/blog/consultas-psicologia-ovar' },
                                { label: 'Coimbra', href: '/blog/consultas-psicologia-coimbra' },
                                { label: 'Figueira da Foz', href: '/blog/consultas-psicologia-figueira-da-foz' },
                                { label: 'Viseu', href: '/blog/consultas-psicologia-viseu' },
                                { label: 'Covilhã', href: '/blog/consultas-psicologia-covilha' },
                                { label: 'Leiria', href: '/blog/consultas-psicologia-leiria' }
                            ]
                        },
                        {
                            label: 'Lisboa e AML',
                            children: [
                                { label: 'Lisboa', href: '/blog/consultas-psicologia-lisboa' },
                                { label: 'Almada', href: '/blog/consultas-psicologia-almada' },
                                { label: 'Seixal', href: '/blog/consultas-psicologia-seixal' },
                                { label: 'Barreiro', href: '/blog/consultas-psicologia-barreiro' },
                                { label: 'Setúbal', href: '/blog/consultas-psicologia-setubal' },
                                { label: 'Sintra', href: '/blog/consultas-psicologia-sintra' },
                                { label: 'Cascais', href: '/blog/consultas-psicologia-cascais' },
                                { label: 'Loures', href: '/blog/consultas-psicologia-loures' },
                                { label: 'Vila Franca de Xira', href: '/blog/consultas-psicologia-vila-franca-de-xira' },
                                { label: 'Torres Vedras', href: '/blog/consultas-psicologia-torres-vedras' }
                            ]
                        },
                        {
                            label: 'Alentejo, Algarve e ilhas',
                            children: [
                                { label: 'Santarém', href: '/blog/consultas-psicologia-santarem' },
                                { label: 'Évora', href: '/blog/consultas-psicologia-evora' },
                                { label: 'Beja', href: '/blog/consultas-psicologia-beja' },
                                { label: 'Faro', href: '/blog/consultas-psicologia-faro' },
                                { label: 'Madeira', href: '/blog/consultas-psicologia-madeira' },
                                { label: 'Luanda (emigrantes)', href: '/blog/consultas-psicologia-luanda' }
                            ]
                        }
                    ]
                },
                { label: 'Consulta de saúde mental', href: '/marcar/saude-mental' },
                { label: 'Psicologia (subscrição)', href: '/saudemental' }
            ]
        },
        {
            label: 'Perda de peso',
            children: [
                { label: 'Nutrição por condição', href: '/nutricao' },
                { label: 'Consulta de nutrição', href: '/blog/consulta-nutricao-preco-como-funciona' },
                { label: 'Quanto custa nutrição', href: '/blog/quanto-custa-consulta-nutricao-portugal' },
                { label: 'ADSE e nutrição', href: '/blog/adse-consultas-nutricao-portugal' },
                { label: 'Cheque-Nutricionista 2026', href: '/blog/cheque-nutricionista-2026' },
                { label: 'Nutricionista ou dietista', href: '/blog/nutricionista-ou-dietista-portugal' },
                { label: 'Nutrição para perda de peso', href: '/blog/consultas-nutricao-perda-de-peso' },
                { label: 'Consulta de nutrição online', href: '/blog/consulta-nutricao-online-como-funciona' },
                { label: 'Perda sustentável', href: '/blog/perda-de-peso-sustentavel' },
                { label: 'Défice calórico', href: '/blog/deficit-calorico' },
                { label: 'Stress e peso', href: '/blog/stress-e-perda-de-peso' },
                { label: 'Sono e peso', href: '/blog/sono-e-peso-corporal' },
                { label: 'Proteína e saciedade', href: '/blog/proteina-e-saciedade' },
                { label: 'Efeito iô-iô', href: '/blog/efeito-ioio' },
                { label: 'Menopausa', href: '/blog/perda-de-peso-na-menopausa' },
                { label: 'Fome emocional', href: '/blog/fome-emocional-vs-fisica' },
                { label: 'Fibra', href: '/blog/fibra-e-perda-de-peso' },
                { label: 'Força vs cardio', href: '/blog/forca-vs-cardio-emagrecer' },
                { label: 'Medicamentos GLP-1', href: '/blog/medicamentos-glp1-perda-de-peso' },
                { label: 'Manter o peso', href: '/blog/manter-o-peso-perdido' },
                { label: 'Pós-parto', href: '/blog/perda-de-peso-pos-parto' },
                { label: 'Álcool', href: '/blog/alcool-e-perda-de-peso' },
                { label: 'Contagem de calorias', href: '/blog/contagem-de-calorias' },
                { label: 'Avaliação nutricional', href: '/blog/nutricionista-plano-perda-de-peso' },
                { label: 'Saúde hormonal', href: '/blog/perda-de-peso-e-saude-hormonal' },
                { label: 'Alimentação intuitiva', href: '/blog/alimentacao-intuitiva' },
                { label: 'Platôs', href: '/blog/platos-na-perda-de-peso' },
                { label: 'Viajar com frequência', href: '/blog/perda-de-peso-em-viagem' }
            ]
        },
        {
            label: 'Livros de saúde',
            children: [
                { label: 'A série', href: '/blog/os-10-livros-de-saude-mais-vendidos' },
                { label: 'Outlive (Peter Attia)', href: '/blog/outlive-peter-attia' },
                { label: 'Glucose Goddess', href: '/blog/metodo-glucose-goddess' },
                { label: 'Emagrece Para Sempre', href: '/blog/emagrece-para-sempre-joana-pinho' },
                { label: 'Food for Life', href: '/blog/food-for-life-tim-spector' },
                { label: 'Hábitos Que Te Salvarão a Vida', href: '/blog/habitos-que-te-salvarao-a-vida' },
                { label: 'A Dieta Perfeita', href: '/blog/a-dieta-perfeita-mariana-abecasis' },
                { label: 'Good Energy', href: '/blog/good-energy-casey-means' },
                { label: 'O Fim das Dietas', href: '/blog/o-fim-das-dietas-joel-fuhrman' },
                { label: 'Emagreça sem Dietas', href: '/blog/emagreca-sem-dietas-diana-dinis' },
                { label: 'How Not to Die', href: '/blog/how-not-to-die-michael-greger' }
            ]
        },
        {
            label: 'Livros de psicologia',
            children: [
                { label: 'A série', href: '/blog/os-10-bestsellers-psicologia-saude-mental' },
                { label: 'O Caminho do Monge', href: '/blog/o-caminho-do-monge-jay-shetty' },
                { label: 'Como Fazer Coisas Difíceis', href: '/blog/como-fazer-coisas-dificeis-tim-cantopher' },
                { label: 'Talvez Devesses Falar com Alguém', href: '/blog/talvez-devesses-falar-com-alguem' },
                { label: 'A Coragem de Não Agradar', href: '/blog/a-coragem-de-nao-agradar' },
                { label: 'Por Fim, a Paz', href: '/blog/por-fim-a-paz-judson-brewer' },
                { label: 'O Corpo Guarda a Conta', href: '/blog/o-corpo-guarda-a-conta' },
                { label: 'Por que Razão Dormimos', href: '/blog/por-que-razao-dormimos-matthew-walker' },
                { label: 'Deixar de Pensar Demais', href: '/blog/deixar-de-pensar-demais-nick-trenton' },
                { label: 'As Suas Zonas Erróneas', href: '/blog/as-suas-zonas-erroneas-wayne-dyer' },
                { label: 'Hábitos Atómicos', href: '/blog/habitos-atomicos-james-clear' }
            ]
        },
        {
            label: 'Saúde intestinal',
            children: [
                { label: 'A série', href: '/blog/os-10-bestsellers-saude-intestinal' },
                { label: '10% Humano', href: '/blog/dez-por-cento-humano-alanna-collen' },
                { label: 'A Lógica do Intestino', href: '/blog/a-logica-do-intestino-michael-gershon' },
                { label: 'Dieta Low-FODMAP', href: '/blog/dieta-low-fodmap-sue-shepherd' },
                { label: 'O mito do SIBO', href: '/blog/mito-do-sibo-sobrecrescimento-bacteriano' },
                { label: 'Psicobióticos', href: '/blog/psicobioticos-saude-mental-intestino' }
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
                    label: 'Vacinas do viajante',
                    children: [
                        { label: 'Centros por região', href: '/blog/centros-de-vacinacao-internacional-portugal' },
                        { label: 'Guia completo', href: '/blog/vacinas-viajante-guia-completo' },
                        { label: 'Lisboa', href: '/blog/vacinas-viajante-lisboa' },
                        { label: 'Porto', href: '/blog/vacinas-viajante-porto' },
                        { label: 'Coimbra', href: '/blog/vacinas-viajante-coimbra' },
                        { label: 'Braga', href: '/blog/vacinas-viajante-braga' },
                        { label: 'Faro e Algarve', href: '/blog/vacinas-viajante-algarve' },
                        { label: 'CUF', href: '/blog/vacinas-viajante-cuf' }
                    ]
                },
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
                { label: 'Consulta médica para viajantes', href: '/blog/consulta-medica-viajantes-vacinas' },
                { label: 'Consulta do viajante', href: '/marcar/travel' }
            ]
        },
        {
            label: 'Clínica',
            children: [
                { label: 'SNS vs. privado', href: '/blog/sns-vs-privado-portugal' },
                { label: 'Seguros de saúde', href: '/blog/seguros-saude-portugal-guia' },
                { label: 'Seguro de saúde: compensa?', href: '/blog/seguro-saude-compensa' },
                { label: 'Telemedicina em casa', href: '/blog/telemedicina-em-casa' },
                { label: 'Consulta médica online vale a pena?', href: '/blog/consulta-medica-online-vale-a-pena' },
                { label: 'Renovar receita online', href: '/blog/renovar-receita-medica-online' },
                { label: 'Como escolher telemedicina', href: '/blog/melhores-plataformas-telemedicina' },
                { label: 'Saúde preventiva (adultos jovens)', href: '/blog/saude-preventiva-adultos-jovens' },
                { label: 'Consulta para viajantes', href: '/blog/consulta-medica-viajantes-vacinas' },
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
    if (!id) return '/magazine';
    const section = magazineSectionBySlug(id);
    return section ? `/magazine/${section.slug}` : `/magazine#${id}`;
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
            if (currentPath.indexOf('/blog/') === 0) {
                const slug = decodeURIComponent(currentPath.slice(6).split('/')[0] || '');
                const article = loadListedArticles().find((a) => a.slug === slug);
                const section = article && magazineSectionByTheme(magTheme(article));
                if (section) {
                    items[0].current = false;
                    items.push({ name: section.title, href: `/magazine/${section.slug}` });
                    items.push({ name: pageTitle, href: currentPath, current: true });
                    return items;
                }
            }
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
    const skip = new Set(['saude-mental', 'burnout', 'depressao', 'ansiedade', 'autoconhecimento', 'perda-de-peso', 'livros-de-saude', 'livros-de-psicologia', 'saude-intestinal', 'saude-do-viajante', 'clinica']);
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
    return `<nav class="mag-sidenav" id="mag-sidenav" aria-label="Sumário da revista">
        <p class="mag-sidenav-kicker">Sumário</p>
        <ul class="mag-nav">${tree}</ul>
    </nav>`;
}

function magLonNavHtml(opts) {
    const magCurrent = opts && opts.magazineCurrent === false ? '' : ' aria-current="page"';
    const talk = (opts && opts.talk) || talkCta.resolve({ kind: 'clinic', lang: 'pt' });
    const talkHref = escapeHtml(talk.href);
    const talkLabel = escapeHtml(talk.label);
    const talkRole = escapeHtml(talk.role);
    return `<header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="Navegação principal">
                <a href="/#servicos">Consultas</a>
                <a href="/consulta">Especialidades</a>
                <a href="/burnout">Burnout</a>
                <a href="/magazine"${magCurrent}>Magazine</a>
                <a href="/#equipa">A Equipa</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="${talkHref}" class="lon-btn lon-btn-primary lon-btn-sm" data-talk-cta="${talkRole}">${talkLabel}</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/#servicos">Consultas</a>
            <a href="/consulta">Especialidades</a>
            <a href="/burnout">Burnout</a>
            <a href="/magazine"${magCurrent}>Magazine</a>
            <a href="/#equipa">A Equipa</a>
            <a href="/patient-portal">Login</a>
            <a href="${talkHref}" data-talk-cta="${talkRole}">${talkLabel}</a>
        </div>
    </header>`;
}

function magLonFootHtml() {
    return `<footer class="lon-footer mag-lon-foot">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>O seu médico. Online. Sempre.</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                </div>
                <div class="lon-footer-col">
                    <h4>Magazine</h4>
                    <a href="/magazine">Lon Magazine</a>
                    <a href="/magazine/indice">Índice</a>
                    <a href="/burnout">Burnout</a>
                    <a href="/saudemental">Psicologia</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Clínica</h4>
                    <a href="/marcar/clinica-geral">Clínica geral</a>
                    <a href="/marcar/travel">Consulta do viajante</a>
                    <a href="/marcar/saude-mental">Saúde mental</a>
                    <a href="/info.html?page=contato">Contacto</a>
                </div>
            </div>
            <div class="lon-footer-bottom">
                <p>© 2026 Lon Clinic</p>
            </div>
        </div>
    </footer>`;
}

function magAppHtml(currentPath, stageInner, opts) {
    const options = opts || { magazineCurrent: true };
    return `${magLonNavHtml(options)}
    <div class="mag-app mag-app--cover">
        <div class="mag-stage">
            ${stageInner}
        </div>
    </div>
    ${magLonFootHtml()}`;
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
        ogType,
        htmlLang,
        ogLocale,
        extraHead
    } = opts;
    const canonicalUrl = canonicalHref(canonicalPath);
    const graph = Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : []);
    graph.push(organizationJsonLd(origin));
    const extraCssHtml = (Array.isArray(extraCss) ? extraCss : [])
        .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
        .join('\n    ');
    const extraCssAfterHtml = (Array.isArray(extraCssAfter) ? extraCssAfter : [])
        .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
        .join('\n    ');
    const langAttr = htmlLang || 'pt-PT';
    const locale = ogLocale || 'pt_PT';
    const headExtra = extraHead ? `\n    ${extraHead}` : '';
    return `<!DOCTYPE html>
<html lang="${escapeHtml(langAttr)}">
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
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="${escapeHtml(ogType || 'website')}">
    <meta property="og:site_name" content="LON Magazine">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:locale" content="${escapeHtml(locale)}">${headExtra}
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">
    <meta name="theme-color" content="#255235">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Jost:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260906i">
    ${extraCssHtml}
    ${extraCssAfterHtml}
    <link rel="stylesheet" href="/magazine.css?v=20260910a">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext x='6' y='52' font-family='Georgia,serif' font-style='italic' font-size='54' fill='%239c4a56'%3EL%3C/text%3E%3C/svg%3E">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    ${jsonLdScript(graph)}
</head>
<body class="mag-body">
    <a class="lon-skip visually-hidden" href="#conteudo-principal">Saltar para o conteúdo</a>
    ${mainHtml}
    <style>.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}</style>
    <script src="/lon-nav.js"></script>
    <script src="/talk-cta.js?v=20260908a" defer></script>
    <script src="/i18n.js?v=20260912a" defer></script>
    <script src="/lon-analytics.js?v=20260906h" defer></script>
    <script src="/reviews.js?v=20260905e" defer></script>
    <script src="/lon-slots.js?v=20260912a" defer></script>
    <script src="/guide-actions.js?v=20260905a" defer></script>
</body>
</html>`;
}

function renderMagazineIndex(origin) {
    const o = normalizeOrigin(origin);
    const articles = sortArticles((loadManifest().articles || []).filter((a) => isValidSlug(a.slug) && isListedArticle(a)));
    const mental = articles.filter((a) => magTheme(a) === 'mental');
    const burnout = articles.filter((a) => magTheme(a) === 'burnout');
    const depressao = articles.filter((a) => magTheme(a) === 'depressao');
    const ansiedade = articles.filter((a) => magTheme(a) === 'ansiedade');
    const autoconhecimento = articles.filter((a) => magTheme(a) === 'autoconhecimento');
    const perdaPeso = articles.filter((a) => magTheme(a) === 'perda-de-peso');
    const livrosSaude = articles.filter((a) => magTheme(a) === 'livros-saude');
    const livrosPsicologia = articles.filter((a) => magTheme(a) === 'bestsellers-psicologia');
    const saudeIntestinal = articles.filter((a) => magTheme(a) === 'bestsellers-saude-intestinal');
    const travel = articles.filter((a) => magTheme(a) === 'travel');
    const clinic = articles.filter((a) => magTheme(a) === 'clinic');
    const cover = mental[0] || articles[0];
    const og = `${o}${resolveGuideImage(cover && cover.image)}`;
    const featured = mental[0] || articles[0];
    const featuredHref = featured ? magHref(featured) : '';
    const mentalRest = featured && magTheme(featured) === 'mental'
        ? mental.filter((a) => magHref(a) !== featuredHref)
        : mental;
    const burnoutRest = featured && magTheme(featured) === 'burnout'
        ? burnout.filter((a) => magHref(a) !== featuredHref)
        : burnout;
    const depressaoRest = featured && magTheme(featured) === 'depressao'
        ? depressao.filter((a) => magHref(a) !== featuredHref)
        : depressao;
    const ansiedadeRest = featured && magTheme(featured) === 'ansiedade'
        ? ansiedade.filter((a) => magHref(a) !== featuredHref)
        : ansiedade;
    const autoconhecimentoRest = featured && magTheme(featured) === 'autoconhecimento'
        ? autoconhecimento.filter((a) => magHref(a) !== featuredHref)
        : autoconhecimento;
    const perdaPesoRest = featured && magTheme(featured) === 'perda-de-peso'
        ? perdaPeso.filter((a) => magHref(a) !== featuredHref)
        : perdaPeso;
    const livrosSaudeRest = featured && magTheme(featured) === 'livros-saude'
        ? livrosSaude.filter((a) => magHref(a) !== featuredHref)
        : livrosSaude;
    const livrosPsicologiaRest = featured && magTheme(featured) === 'bestsellers-psicologia'
        ? livrosPsicologia.filter((a) => magHref(a) !== featuredHref)
        : livrosPsicologia;
    const saudeIntestinalRest = featured && magTheme(featured) === 'bestsellers-saude-intestinal'
        ? saudeIntestinal.filter((a) => magHref(a) !== featuredHref)
        : saudeIntestinal;
    const travelRest = featured && magTheme(featured) === 'travel'
        ? travel.filter((a) => magHref(a) !== featuredHref)
        : travel;
    const clinicRest = featured && magTheme(featured) === 'clinic'
        ? clinic.filter((a) => magHref(a) !== featuredHref)
        : clinic;
    const rowsHtml = [
        magThemeRowHtml('saude-mental', 'Mente', mentalRest, 'mental'),
        magThemeRowHtml('burnout', 'Burnout', burnoutRest, 'burnout'),
        magThemeRowHtml('depressao', 'Depressão', depressaoRest, 'mental'),
        magThemeRowHtml('ansiedade', 'Ansiedade', ansiedadeRest, 'mental'),
        magThemeRowHtml('autoconhecimento', 'Autoconhecimento', autoconhecimentoRest, 'mental'),
        magThemeRowHtml('perda-de-peso', 'Perda de peso', perdaPesoRest, 'nutrition'),
        magThemeRowHtml('livros-saude', 'Livros de saúde', livrosSaudeRest, 'nutrition'),
        magThemeRowHtml('livros-psicologia', 'Livros de psicologia', livrosPsicologiaRest, 'mental'),
        magThemeRowHtml('saude-intestinal', 'Saúde intestinal', saudeIntestinalRest, 'nutrition'),
        magClusterHtml(),
        magThemeRowHtml('saude-do-viajante', 'Viagem', travelRest, 'travel'),
        magThemeRowHtml('clinica', 'Clínica', clinicRest, 'clinic')
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
                itemListElement: MAGAZINE_SECTIONS.map((s, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    item: {
                        '@type': 'CollectionPage',
                        name: s.title,
                        url: `${o}/magazine/${s.slug}`
                    }
                }))
            }
        },
        authors.personJsonLd(o),
        magBreadcrumbJsonLd(o, magBreadcrumbCrumbs('/magazine', 'Magazine'))
    ];

    const mainHtml = magAppHtml('/magazine', `
            <main id="conteudo-principal" class="mag-content">
                ${magTopicAnchorsHtml()}
                <h1 class="visually-hidden">Lon Magazine</h1>
                ${magFeaturedHtml(featured)}
                ${magTocHtml()}
                <div class="mag-wrap mag-topics-wrap">${magazineTopicsNavHtml()}</div>
                ${rowsHtml}
            </main>`, { magazineCurrent: true });

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

function collectionJsonLd(origin, opts) {
    const o = normalizeOrigin(origin);
    const articles = opts.articles || [];
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: opts.name,
        description: opts.description,
        url: `${o}${opts.path}`,
        isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: articles.length,
            itemListElement: articles.map((a, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${o}/blog/${encodeURIComponent(a.slug)}`,
                name: String(a.title || a.slug)
            }))
        }
    };
}

function renderMagazineSection(origin, slug) {
    const section = magazineSectionBySlug(slug);
    if (!section) return null;
    const o = normalizeOrigin(origin);
    const articles = loadListedArticles().filter((a) => magTheme(a) === section.theme);
    const cover = articles[0];
    const og = `${o}${resolveGuideImage(cover && cover.image)}`;
    const path = `/magazine/${section.slug}`;
    const crumbs = [
        { name: 'Magazine', href: '/magazine' },
        { name: section.title, href: path, current: true }
    ];
    const jsonLd = [
        collectionJsonLd(o, {
            name: `${section.title} | LON Magazine`,
            description: section.description,
            path,
            articles
        }),
        magBreadcrumbJsonLd(o, crumbs)
    ];
    const empty = articles.length
        ? ''
        : '<p class="mag-index-empty">Ainda não há artigos neste tema.</p>';
    const mainHtml = magAppHtml(path, `
            <main id="conteudo-principal" class="mag-content mag-index-page">
                <header class="mag-index-head mag-wrap">
                    ${magBreadcrumbHtml(crumbs)}
                    <p class="mag-section-kicker">LON Magazine</p>
                    <h1>${escapeHtml(section.title)}</h1>
                    <p class="mag-index-dek">${escapeHtml(section.description)}</p>
                    ${magazineTopicsNavHtml({ current: section.slug })}
                </header>
                <section class="mag-wrap" aria-label="Artigos de ${escapeHtml(section.title)}">
                    ${magIndexListHtml(articles)}
                    ${empty}
                    ${section.ctaKind ? magCtaHtml(section.ctaKind) : ''}
                </section>
            </main>`, { magazineCurrent: true });
    return layoutMagazinePage({
        origin: o,
        title: `${section.title} | LON Magazine`,
        description: section.description,
        canonicalPath: path,
        ogImage: og,
        jsonLd,
        mainHtml
    });
}

function renderMagazineIndice(origin) {
    const o = normalizeOrigin(origin);
    const articles = loadListedArticles();
    const cover = articles[0];
    const og = `${o}${resolveGuideImage(cover && cover.image)}`;
    const crumbs = [
        { name: 'Magazine', href: '/magazine' },
        { name: 'Índice', href: '/magazine/indice', current: true }
    ];
    const groups = MAGAZINE_SECTIONS.map((s) => {
        const group = articles.filter((a) => magTheme(a) === s.theme);
        if (!group.length) return '';
        return `<section class="mag-index-group mag-wrap" id="${escapeHtml(s.slug)}" aria-labelledby="indice-${escapeHtml(s.slug)}">
                    <h2 id="indice-${escapeHtml(s.slug)}"><a href="${escapeHtml(magazineSectionPath(s.slug))}">${escapeHtml(s.title)}</a></h2>
                    ${magIndexListHtml(group)}
                </section>`;
    }).join('');
    const jsonLd = [
        collectionJsonLd(o, {
            name: 'Índice | LON Magazine',
            description: 'Índice de todos os artigos da Lon Magazine, por tema.',
            path: '/magazine/indice',
            articles
        }),
        magBreadcrumbJsonLd(o, crumbs)
    ];
    const mainHtml = magAppHtml('/magazine/indice', `
            <main id="conteudo-principal" class="mag-content mag-index-page">
                <header class="mag-index-head mag-wrap">
                    ${magBreadcrumbHtml(crumbs)}
                    <p class="mag-section-kicker">LON Magazine</p>
                    <h1>Índice</h1>
                    <p class="mag-index-dek">${articles.length} artigos, agrupados por tema. Sem imagens — só títulos, para o Google e para quem procura um guia específico.</p>
                    ${magazineTopicsNavHtml({ indice: true })}
                </header>
                ${groups}
            </main>`, { magazineCurrent: true });
    return layoutMagazinePage({
        origin: o,
        title: 'Índice | LON Magazine',
        description: 'Índice de todos os artigos da Lon Magazine, por tema.',
        canonicalPath: '/magazine/indice',
        ogImage: og,
        jsonLd,
        mainHtml
    });
}

function homeEditorialPicks(limit) {
    const sorted = loadListedArticles();
    const picked = [];
    const seen = new Set();
    const cap = limit || 6;
    HOME_EDITORIAL_THEMES.forEach((theme) => {
        if (picked.length >= cap) return;
        const hit = sorted.find((a) => magTheme(a) === theme && !seen.has(a.slug));
        if (hit) {
            picked.push(hit);
            seen.add(hit.slug);
        }
    });
    sorted.forEach((a) => {
        if (picked.length >= cap) return;
        if (!seen.has(a.slug)) {
            picked.push(a);
            seen.add(a.slug);
        }
    });
    return picked;
}

function homeEditorialStripHtml() {
    const picks = homeEditorialPicks(6);
    if (!picks.length) return '';
    const cards = picks.map((a) => {
        const href = magHref(a);
        const kicker = magThemeLabel(a);
        const desc = a.description ? `<p>${escapeHtml(a.description)}</p>` : '';
        return `<a class="dr-magazine-home-card" href="${escapeHtml(href)}">
                    <span class="dr-magazine-home-kicker">${escapeHtml(kicker)}</span>
                    <h3>${escapeHtml(listingTitle(a.title || a.slug))}</h3>
                    ${desc}
                </a>`;
    }).join('');
    const topics = MAGAZINE_SECTIONS.map((s) => (
        `<a href="${escapeHtml(magazineSectionPath(s.slug))}">${escapeHtml(s.title)}</a>`
    )).join('');
    return `<section class="dr-magazine-home" id="magazine-home" aria-labelledby="magazine-home-title">
        <div class="lon-container">
            <p class="dr-magazine-home__eyebrow">Lon Magazine</p>
            <h2 id="magazine-home-title">Guias médicos recentes</h2>
            <p class="dr-magazine-home__lead">Seis guias em destaque. O resto está na revista, por tema.</p>
            <p class="dr-magazine-home-actions">
                <a class="dr-magazine-home__more" href="/magazine">Magazine</a>
                <a class="dr-magazine-home__more" href="/magazine/indice">Índice</a>
            </p>
            <div class="dr-magazine-home-grid">${cards}</div>
            <nav class="dr-magazine-home-topics" aria-label="Temas da magazine">${topics}</nav>
        </div>
    </section>`;
}

function injectHomeEditorialHtml(html) {
    if (!html || typeof html !== 'string') return html;
    if (html.includes('id="magazine-home"')) return html;
    const strip = homeEditorialStripHtml();
    if (!strip) return html;
    if (html.includes('<!-- MAGAZINE_HOME_STRIP -->')) {
        return html.replace('<!-- MAGAZINE_HOME_STRIP -->', strip);
    }
    return html.replace(
        '</section>\n\n        <section class="dr-platform"',
        `</section>\n\n        ${strip}\n\n        <section class="dr-platform"`
    );
}

module.exports = {
    escapeHtml,
    isValidSlug,
    renderBlogIndex,
    renderMagazineIndex,
    renderBlogArticle,
    renderNotFound,
    renderMagazineSection,
    renderMagazineIndice,
    injectHomeEditorialHtml,
    magazineSections,
    newestListedArticleDate,
    loadManifest,
    sortArticles,
    articleSitemapAlternates,
    blogCanonicalPath
};
