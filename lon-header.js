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
    { href: '/saudemental', img: 'mega-psicologia.webp', tag: 'Psicologia', title: 'Psicologia', desc: 'Individual e casal · desde 56 €/sessão', mc: '#9BB1BC', mc2: '#2f4550' },
    { href: '/nutricao', img: 'mega-nutricao.webp', tag: 'Nutrição', title: 'Nutrição', desc: 'Subscrição quinzenal · 45 € / 15 dias', mc: '#9FBD84', mc2: '#2c3f36' },
    { href: '/urgent-care', img: 'mega-urgente.webp', tag: 'Hoje', title: 'Consulta Urgente', desc: 'Fale com um médico hoje · 39 €', mc: '#BD4F4F', mc2: '#4d2321' },
    { href: '/travel-clinic', img: 'mega-viajante.webp', tag: 'Viagem', title: 'Consulta do Viajante', desc: 'Vacinas e consulta pré-viagem · 39 €', mc: '#A794C9', mc2: '#2c3a4a' }
];

/** Header copy per language. PT is the default; tourist pages pass their own lang. */
const NAV_I18N = {
    pt: {
        specialties: 'Especialidades', allSpecialties: 'Ver todas as especialidades →', book: 'Marcar consulta',
        travel: 'Viajante', psychology: 'Psicologia', nutrition: 'Nutrição', magazine: 'Magazine', team: 'Equipa',
        login: 'Login', mainNav: 'Navegação principal', openMenu: 'Abrir menu', home: 'Longevity Clinic homepage',
        cards: {
            '/longevidade': ['Medicina', 'Medicina Funcional', 'Causas, prevenção e biomarcadores · 60 €'],
            '/saudemental': ['Psicologia', 'Psicologia', 'Individual e casal · desde 56 €/sessão'],
            '/nutricao': ['Nutrição', 'Nutrição', 'Subscrição quinzenal · 45 € / 15 dias'],
            '/urgent-care': ['Hoje', 'Consulta Urgente', 'Fale com um médico hoje · 39 €'],
            '/travel-clinic': ['Viagem', 'Consulta do Viajante', 'Vacinas e consulta pré-viagem · 39 €']
        }
    },
    en: {
        specialties: 'Specialties', allSpecialties: 'See all specialties →', book: 'Book a consultation',
        travel: 'Travel', psychology: 'Psychology', nutrition: 'Nutrition', magazine: 'Magazine', team: 'Team',
        login: 'Login', mainNav: 'Main navigation', openMenu: 'Open menu', home: 'Longevity Clinic homepage',
        cards: {
            '/longevidade': ['Medicine', 'Functional Medicine', 'Causes, prevention and biomarkers · €60'],
            '/saudemental': ['Psychology', 'Psychology', 'Individual and couples · from €56/session'],
            '/nutricao': ['Nutrition', 'Nutrition', 'Fortnightly subscription · €45 / 15 days'],
            '/urgent-care': ['Today', 'Urgent Consultation', 'See a doctor today · €39'],
            '/travel-clinic': ['Travel', 'Travel Consultation', 'Vaccines and pre-travel advice · €39']
        }
    },
    es: {
        specialties: 'Especialidades', allSpecialties: 'Ver todas las especialidades →', book: 'Reservar consulta',
        travel: 'Viajero', psychology: 'Psicología', nutrition: 'Nutrición', magazine: 'Magazine', team: 'Equipo',
        login: 'Acceder', mainNav: 'Navegación principal', openMenu: 'Abrir menú', home: 'Página de inicio de Longevity Clinic',
        cards: {
            '/longevidade': ['Medicina', 'Medicina Funcional', 'Causas, prevención y biomarcadores · 60 €'],
            '/saudemental': ['Psicología', 'Psicología', 'Individual y de pareja · desde 56 €/sesión'],
            '/nutricao': ['Nutrición', 'Nutrición', 'Suscripción quincenal · 45 € / 15 días'],
            '/urgent-care': ['Hoy', 'Consulta Urgente', 'Hable con un médico hoy · 39 €'],
            '/travel-clinic': ['Viaje', 'Consulta del Viajero', 'Vacunas y consulta previa al viaje · 39 €']
        }
    },
    fr: {
        specialties: 'Spécialités', allSpecialties: 'Voir toutes les spécialités →', book: 'Réserver une consultation',
        travel: 'Voyage', psychology: 'Psychologie', nutrition: 'Nutrition', magazine: 'Magazine', team: 'Équipe',
        login: 'Connexion', mainNav: 'Navigation principale', openMenu: 'Ouvrir le menu', home: 'Accueil Longevity Clinic',
        cards: {
            '/longevidade': ['Médecine', 'Médecine Fonctionnelle', 'Causes, prévention et biomarqueurs · 60 €'],
            '/saudemental': ['Psychologie', 'Psychologie', 'Individuelle et de couple · dès 56 €/séance'],
            '/nutricao': ['Nutrition', 'Nutrition', 'Abonnement tous les 15 jours · 45 €'],
            '/urgent-care': ['Aujourd’hui', 'Consultation Urgente', 'Voir un médecin aujourd’hui · 39 €'],
            '/travel-clinic': ['Voyage', 'Consultation du Voyageur', 'Vaccins et conseils avant le départ · 39 €']
        }
    },
    de: {
        specialties: 'Fachbereiche', allSpecialties: 'Alle Fachbereiche ansehen →', book: 'Termin buchen',
        travel: 'Reise', psychology: 'Psychologie', nutrition: 'Ernährung', magazine: 'Magazin', team: 'Team',
        login: 'Anmelden', mainNav: 'Hauptnavigation', openMenu: 'Menü öffnen', home: 'Longevity Clinic Startseite',
        cards: {
            '/longevidade': ['Medizin', 'Funktionelle Medizin', 'Ursachen, Prävention und Biomarker · 60 €'],
            '/saudemental': ['Psychologie', 'Psychologie', 'Einzel- und Paartherapie · ab 56 €/Sitzung'],
            '/nutricao': ['Ernährung', 'Ernährung', 'Abo alle 15 Tage · 45 €'],
            '/urgent-care': ['Heute', 'Akutsprechstunde', 'Heute mit einem Arzt sprechen · 39 €'],
            '/travel-clinic': ['Reise', 'Reisemedizin', 'Impfungen und Reiseberatung · 39 €']
        }
    }
};

function navCopy(lang) {
    const l = String(lang || 'pt').toLowerCase().slice(0, 2);
    return NAV_I18N[l] || NAV_I18N.pt;
}

function localizedSpecialties(t) {
    return SPECIALTIES.map((s) => {
        const c = t.cards[s.href];
        return c ? Object.assign({}, s, { tag: c[0], title: c[1], desc: c[2] }) : s;
    });
}

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
 * @param {string} [opts.lang]     'pt' (default) | 'en' | 'es' | 'fr' | 'de' — header copy language
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
    const t = navCopy(o.lang);
    const specs = localizedSpecialties(t);

    return `<header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="${t.home}">
                <span class="lon-logo-name"><span class="lon-logo-word"><span class="lon-logo-lon">Lon</span><span class="lon-logo-gevity">gevity</span></span><span class="lon-logo-clinic">Clinic</span></span>
            </a>

            <nav class="lon-nav-links" aria-label="${t.mainNav}">
                <div class="lon-mega-wrap" id="lonMegaWrap">
                    <a href="/consulta" class="lon-mega-trigger" id="lonMegaTrigger" aria-haspopup="true" aria-expanded="false" aria-controls="lonMega"><span class="lon-mega-trigger-label">${t.specialties}</span> <svg class="lon-mega-chev" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
                    <div class="lon-mega" id="lonMega" aria-label="${t.specialties}">
                        <div class="lon-mega-grid">
                            ${specs.map(megaCard).join('\n                            ')}
                        </div>
                        <div class="lon-mega-foot">
                            <a class="lon-mega-link" href="/consulta">${t.allSpecialties}</a>
                            <a class="lon-mega-link lon-mega-link--cta" href="/marcar">${t.book}</a>
                        </div>
                    </div>
                </div>
                <a href="/travel-clinic">${t.travel}</a>
                <a href="/saudemental">${t.psychology}</a>
                <a href="/nutricao">${t.nutrition}</a>
                <a href="/magazine"${cur('magazine')}>${t.magazine}</a>
                <a href="/equipa"${cur('equipa')}>${t.team}</a>
            </nav>

            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">${t.login}</a>
                <a href="${hrefOut}" class="lon-btn lon-btn-primary lon-btn-sm"${attrsOut}>${labelOut}</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="${t.openMenu}" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/consulta">${t.specialties}</a>
            <div class="lon-mobile-sub">
                ${specs.map((s) => `<a href="${s.href}">${s.title}</a>`).join('\n                ')}
            </div>
            <a href="/travel-clinic">${t.travel}</a>
            <a href="/saudemental">${t.psychology}</a>
            <a href="/nutricao">${t.nutrition}</a>
            <a href="/magazine">${t.magazine}</a>
            <a href="/equipa">${t.team}</a>
            <a href="/patient-portal">${t.login}</a>
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

module.exports = { NAV_I18N, renderHeader, renderHeaderScripts, HEADER_FONT_LINK, SPECIALTIES, MEGA_VERSION };
