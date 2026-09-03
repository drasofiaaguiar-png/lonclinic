/**
 * Server-render /info.html?page=… so crawlers see Portuguese content without JS.
 */

'use strict';

const { INDEXABLE_INFO_PAGES, organizationJsonLd, organizationNode, originOf, canonicalHref } = require('./seo');

const NOINDEX_PAGES = new Set([
    'termos-condicoes',
    'politica-privacidade',
    'cookies',
    'politica-nao-discriminacao',
    'livro-reclamacoes',
    'reclamacoes'
]);

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function extractPtContent(html) {
    const startMarker = 'const content = {';
    const endMarker = 'const page = String(new URLSearchParams';
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker);
    if (start < 0 || end <= start) return null;
    const src = html.slice(start, end);
    try {
        return new Function(`${src}\nreturn content;`)();
    } catch (err) {
        console.error('info-ssr: failed to extract page content:', err.message);
        return null;
    }
}

function actionsHtml(actions) {
    if (!Array.isArray(actions) || !actions.length) return '';
    return actions
        .map((action) => {
            const href = escapeHtml(action.href || '/');
            const label = escapeHtml(action.label || 'Continuar');
            const cls = action.primary ? 'btn btn-primary' : 'btn';
            return `<a class="${cls}" href="${href}">${label}</a>`;
        })
        .join('');
}

function directoryHtml(content) {
    const keys = INDEXABLE_INFO_PAGES.filter((k) => content[k]);
    const items = keys
        .map((k) => {
            const item = content[k];
            const title = escapeHtml(item.title || k);
            const sub = escapeHtml(item.subtitle || '');
            return `<li><a href="/info.html?page=${encodeURIComponent(k)}"><strong>${title}</strong> — ${sub}</a></li>`;
        })
        .join('');
    return {
        section: 'CLÍNICA',
        title: 'Informação',
        subtitle: 'Páginas institucionais da Lon Clinic',
        bodyHtml: `<p>Conteúdo institucional, clínico e de apoio — disponível sem JavaScript.</p><ul class="bullet-list">${items}</ul>`,
        actions: [{ label: 'Ir para o início', href: '/', primary: true }]
    };
}

function replaceOnce(html, pattern, replacement) {
    return html.replace(pattern, replacement);
}

function hydrateInfoHtml(html, page, origin) {
    const o = originOf(origin);
    const content = extractPtContent(html);
    if (!content) return html;

    const key = String(page || '').trim().toLowerCase();
    const isKnown = Boolean(key && content[key]);
    const isDirectory = !key;
    const data = isDirectory
        ? directoryHtml(content)
        : (content[key] || {
            section: 'INFORMAÇÃO',
            title: 'Página não encontrada',
            subtitle: 'Este conteúdo não existe',
            body: 'Volte ao início e escolha uma opção válida do rodapé.'
        });

    const robots = (!isDirectory && (!isKnown || NOINDEX_PAGES.has(key)))
        ? 'noindex,follow'
        : 'index,follow,max-image-preview:large';
    const canonical = isDirectory
        ? canonicalHref('/info.html')
        : (isKnown ? canonicalHref(`/info.html?page=${encodeURIComponent(key)}`) : canonicalHref('/info.html'));
    const title = `${data.title} | Lon Clinic`;
    const rawDesc = String(data.subtitle || data.body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const description = (rawDesc || 'Informações institucionais da Lon Clinic.').slice(0, 160);
    const schemaType = NOINDEX_PAGES.has(key) ? 'WebPage' : 'MedicalWebPage';
    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': schemaType,
            name: data.title,
            description,
            url: canonical,
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            publisher: organizationNode(o)
        },
        organizationJsonLd(o)
    ];

    const bodyInner = data.bodyHtml
        ? data.bodyHtml
        : escapeHtml(data.body || '');

    let out = html;
    out = replaceOnce(out, /<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    out = replaceOnce(
        out,
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${escapeHtml(description)}">`
    );
    out = replaceOnce(
        out,
        /<meta name="robots" content="[^"]*" id="metaRobots">/,
        `<meta name="robots" content="${escapeHtml(robots)}" id="metaRobots">`
    );
    out = replaceOnce(
        out,
        /<link rel="canonical" href="[^"]*" id="canonicalUrl">/,
        `<link rel="canonical" href="${escapeHtml(canonical)}" id="canonicalUrl">`
    );
    out = replaceOnce(
        out,
        /<meta property="og:title" content="[^"]*" id="ogTitle">/,
        `<meta property="og:title" content="${escapeHtml(title)}" id="ogTitle">`
    );
    out = replaceOnce(
        out,
        /<meta property="og:description" content="[^"]*" id="ogDescription">/,
        `<meta property="og:description" content="${escapeHtml(description)}" id="ogDescription">`
    );
    out = replaceOnce(
        out,
        /<meta property="og:url" content="[^"]*" id="ogUrl">/,
        `<meta property="og:url" content="${escapeHtml(canonical)}" id="ogUrl">`
    );
    out = replaceOnce(
        out,
        /<script type="application\/ld\+json" id="structuredData">[\s\S]*?<\/script>/,
        `<script type="application/ld+json" id="structuredData">\n${JSON.stringify(jsonLd[0], null, 2)}\n</script>\n<script type="application/ld+json">\n${JSON.stringify(jsonLd[1], null, 2)}\n</script>`
    );
    out = replaceOnce(out, /<span class="pill" id="pill">[^<]*<\/span>/, `<span class="pill" id="pill">${escapeHtml(data.section || 'INFORMAÇÃO')}</span>`);
    out = replaceOnce(out, /<h1 id="title">[^<]*<\/h1>/, `<h1 id="title">${escapeHtml(data.title)}</h1>`);
    out = replaceOnce(out, /<p class="subtitle" id="subtitle">[^<]*<\/p>/, `<p class="subtitle" id="subtitle">${escapeHtml(data.subtitle || '')}</p>`);
    out = replaceOnce(
        out,
        /<div class="body" id="body">[\s\S]*?<\/div>\s*<div class="actions" id="actions"><\/div>/,
        `<div class="body" id="body">${bodyInner}</div>\n            <div class="actions" id="actions">${actionsHtml(data.actions)}</div>`
    );
    return out;
}

module.exports = {
    NOINDEX_PAGES,
    hydrateInfoHtml
};
