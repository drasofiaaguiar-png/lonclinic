/**
 * Shared site header (same as the homepage): brand logo, "Especialidades" mega menu
 * with image cards, Magazine, Equipa, Login and a booking CTA.
 *
 * Used by server-rendered pages (guide.js, consulta-pages.js, …) and, via
 * scripts, stamped into the static HTML pages. Requires landing.css + lon-nav.js
 * + lon-mega.js on the page (the two scripts are emitted by renderHeaderScripts()).
 */

'use strict';

const MEGA_VERSION = '20260921b';

const SPECIALTIES = [
    { href: '/longevidade', img: 'mega-funcional.webp', tag: 'Medicina', title: 'Medicina Funcional', desc: 'Causas, prevenção e biomarcadores · 60 €', mc: '#ECD281', mc2: '#6b5a2e', ink: '#1C1710' },
    { href: '/psicologia', img: 'mega-psicologia.webp', tag: 'Psicologia', title: 'Psicologia', desc: 'Individual e casal · desde 56 €/sessão', mc: '#9BB1BC', mc2: '#2f4550' },
    { href: '/nutricao', img: 'mega-nutricao.webp', tag: 'Nutrição', title: 'Nutrição', desc: 'Subscrição quinzenal · 45 € / 15 dias', mc: '#9FBD84', mc2: '#2c3f36' },
    { href: '/urgent-care', img: 'mega-urgente.webp', tag: 'Hoje', title: 'Consulta Urgente', desc: 'Fale com um médico hoje · 39 €', mc: '#BD4F4F', mc2: '#4d2321' },
    { href: '/travel-clinic', img: 'mega-viajante.webp', tag: 'Viagem', title: 'Medicina do Viajante', desc: 'Vacinas e consulta pré-viagem · 39 €', mc: '#A794C9', mc2: '#2c3a4a' }
];

function escapeAttr(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function megaCard(s) {
    const vars = `--mc:${s.mc};--mc2:${s.mc2}${s.ink ? `;--mc-ink:${s.ink}` : ''}`;
    return `<a class="lon-mega-card" href="${s.href}" style="${vars}">` +
        `<img src="/image/${s.img}" alt="" width="360" height="480" loading="lazy" decoding="async">` +
        `<span class="lon-mega-card-tag">${s.tag}</span>` +
        `<span class="lon-mega-card-body"><strong>${s.title}</strong><span>${s.desc}</span></span></a>`;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.ctaHref]   Primary button target (default /marcar/clinica-geral)
 * @param {string} [opts.ctaLabel]  Primary button label (default "Marcar — 39 €")
 * @param {string} [opts.ctaAttrs]  Extra raw attributes for the primary button (e.g. data-cta="…")
 * @param {string} [opts.current]   'magazine' | 'equipa' — marks aria-current on that link
 * @param {boolean} [opts.rawCta]   When true, ctaHref/ctaLabel/ctaAttrs are inserted verbatim
 *                                  (used when the caller embeds template-literal expressions)
 */
function renderHeader(opts) {
    const o = opts || {};
    const href = o.ctaHref || '/marcar/clinica-geral';
    const label = o.ctaLabel || 'Marcar — 39 €';
    const attrs = o.ctaAttrs != null ? o.ctaAttrs : ' data-cta="book-priced"';
    const hrefOut = o.rawCta ? href : escapeAttr(href);
    const labelOut = o.rawCta ? label : String(label);
    const attrsOut = attrs ? (attrs.startsWith(' ') ? attrs : ` ${attrs}`) : '';
    const cur = (name) => (o.current === name ? ' aria-current="page"' : '');

    return `<header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Longevity Clinic homepage">
                <span class="lon-logo-name"><span class="lon-logo-word"><span class="lon-logo-lon">Lon</span><span class="lon-logo-gevity">gevity</span></span><span class="lon-logo-clinic">Clinic</span></span>
            </a>

            <nav class="lon-nav-links" aria-label="Navegação principal">
                <div class="lon-mega-wrap" id="lonMegaWrap">
                    <a href="/consulta" class="lon-mega-trigger" id="lonMegaTrigger" aria-haspopup="true" aria-expanded="false" aria-controls="lonMega"><span class="lon-mega-trigger-label">Especialidades</span> <svg class="lon-mega-chev" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
                    <div class="lon-mega" id="lonMega" aria-label="Especialidades">
                        <div class="lon-mega-grid">
                            ${SPECIALTIES.map(megaCard).join('\n                            ')}
                        </div>
                        <div class="lon-mega-foot">
                            <a class="lon-mega-link" href="/consulta">Ver todas as especialidades →</a>
                            <a class="lon-mega-link lon-mega-link--cta" href="/marcar">Marcar consulta</a>
                        </div>
                    </div>
                </div>
                <a href="/magazine"${cur('magazine')}>Magazine</a>
                <a href="/#equipa"${cur('equipa')}>Equipa</a>
            </nav>

            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Login</a>
                <a href="${hrefOut}" class="lon-btn lon-btn-primary lon-btn-sm"${attrsOut}>${labelOut}</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/consulta">Especialidades</a>
            <div class="lon-mobile-sub">
                ${SPECIALTIES.map((s) => `<a href="${s.href}">${s.title}</a>`).join('\n                ')}
            </div>
            <a href="/magazine">Magazine</a>
            <a href="/#equipa">Equipa</a>
            <a href="/patient-portal">Login</a>
            <a href="${hrefOut}"${attrsOut}>${labelOut}</a>
        </div>
    </header>`;
}

/** Script tags the header needs. Pass includeNav=false when the page already loads lon-nav.js. */
function renderHeaderScripts(includeNav) {
    return (includeNav ? '<script src="/lon-nav.js" defer></script>\n' : '') +
        `<script src="/lon-mega.js?v=${MEGA_VERSION}" defer></script>`;
}

/** Fraunces is what the italic "Longevity" in the logo uses; body-ok <link> for pages without it. */
const HEADER_FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,500&display=swap">';

module.exports = { renderHeader, renderHeaderScripts, HEADER_FONT_LINK, SPECIALTIES, MEGA_VERSION };
