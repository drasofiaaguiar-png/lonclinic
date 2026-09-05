/**
 * Lon Clinic — visitor GEO/conversion pages (tourists without SNS / family doctor).
 * Root URLs, one page per language, hreflang between siblings.
 * These are product landings, not magazine articles (editorial goes to /blog/:slug).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { organizationJsonLd, originOf, canonicalHref } = require('./seo');
const authors = require('./authors');

const TOURIST_DIR = path.join(__dirname, 'data', 'tourist');
const MANIFEST_PATH = path.join(TOURIST_DIR, 'manifest.json');

const UI = {
    en: {
        htmlLang: 'en',
        ogLocale: 'en_GB',
        skip: 'Skip to content',
        navAria: 'Main',
        navConsulta: 'See a doctor',
        navHub: 'Tourist clinic',
        navTravel: 'Travel clinic',
        navBook: 'Book consultation',
        navLogin: 'Login',
        openMenu: 'Open menu',
        breadcrumbHub: 'Tourist clinic',
        kicker: 'Tourist clinic · Portugal 2026',
        languagesLine: 'Consultations in English, Spanish or Portuguese.',
        clinician: 'Licensed physician · Portuguese Medical Association · ERS 45475',
        faqTitle: 'FAQ',
        priceTitle: 'Price',
        relatedLangs: 'This guide in other languages',
        relatedPages: 'Related',
        footerBrand: 'Online medical consultation in Portugal — visible price, named doctor, video call.',
        footerClinic: 'Clinic',
        footerSupport: 'Support',
        footerDoctors: 'The doctor',
        terms: 'Terms',
        privacy: 'Privacy',
        cookies: 'Cookies',
        contact: 'Contact',
        disclaimer:
            'General information for visitors in Portugal. It does not replace an individual medical consultation. In an emergency call 112.',
        reviewed: 'Reviewed by the Lon Clinic medical team',
        whatsapp: 'Contact on WhatsApp',
        emergencyCta: 'Emergencies: 112',
        urgentNote: 'For a genuine emergency, call 112 or go to a public hospital emergency room (urgência).',
        bookAria: 'Book with Lon Clinic',
        cardGpChip: 'General practice',
        cardGpTitle: 'Online GP consultation',
        cardGpPrice: '€39 · ~30 min',
        cardGpNote: 'Video · English, Spanish or Portuguese',
        cardGpCta: 'Book',
        cardRenewChip: 'Repeat prescription',
        cardRenewTitle: 'Prescription renewal',
        cardRenewPrice: '€19',
        cardRenewNote: 'Stable long-term medicine · video, not a form',
        cardRenewCta: 'Renew',
        slotKicker: 'Next available times',
        slotCta: 'Book this time',
        slotPending: 'See times'
    },
    es: {
        htmlLang: 'es',
        ogLocale: 'es_ES',
        skip: 'Saltar al contenido',
        navAria: 'Principal',
        navConsulta: 'Ver a un médico',
        navHub: 'Clínica turista',
        navTravel: 'Clínica del viajero',
        navBook: 'Reservar consulta',
        navLogin: 'Acceder',
        openMenu: 'Abrir menú',
        breadcrumbHub: 'Clínica turista',
        kicker: 'Clínica turista · Portugal 2026',
        languagesLine: 'Consultas en inglés, español o portugués.',
        clinician: 'Médica colegiada · Ordem dos Médicos · ERS 45475',
        faqTitle: 'Preguntas frecuentes',
        priceTitle: 'Precio',
        relatedLangs: 'Esta guía en otros idiomas',
        relatedPages: 'Relacionado',
        footerBrand: 'Consulta médica online en Portugal — precio visible, médica identificada, videollamada.',
        footerClinic: 'Clínica',
        footerSupport: 'Apoyo',
        footerDoctors: 'La médica',
        terms: 'Términos',
        privacy: 'Privacidad',
        cookies: 'Cookies',
        contact: 'Contacto',
        disclaimer:
            'Información general para visitantes en Portugal. No sustituye una consulta médica individual. En una emergencia, llame al 112.',
        reviewed: 'Revisado por el equipo médico de Lon Clinic',
        whatsapp: 'Contactar por WhatsApp',
        emergencyCta: 'Urgencias: 112',
        urgentNote: 'En una emergencia real, llame al 112 o acuda a urgencias de un hospital público.',
        bookAria: 'Reservar en Lon Clinic',
        cardGpChip: 'Clínica general',
        cardGpTitle: 'Consulta médica online',
        cardGpPrice: '39 € · ~30 min',
        cardGpNote: 'Vídeo · inglés, español o portugués',
        cardGpCta: 'Reservar',
        cardRenewChip: 'Renovación',
        cardRenewTitle: 'Renovación de receta',
        cardRenewPrice: '19 €',
        cardRenewNote: 'Medicación crónica estable · vídeo, no un formulario',
        cardRenewCta: 'Renovar',
        slotKicker: 'Próximos horarios',
        slotCta: 'Reservar esta hora',
        slotPending: 'Ver horarios'
    },
    fr: {
        htmlLang: 'fr',
        ogLocale: 'fr_FR',
        skip: 'Aller au contenu',
        navAria: 'Principal',
        navConsulta: 'Voir un médecin',
        navHub: 'Clinique touriste',
        navTravel: 'Clinique du voyageur',
        navBook: 'Réserver une consultation',
        navLogin: 'Connexion',
        openMenu: 'Ouvrir le menu',
        breadcrumbHub: 'Clinique touriste',
        kicker: 'Clinique touriste · Portugal 2026',
        languagesLine: 'Consultations en anglais, espagnol ou portugais.',
        clinician: 'Médecin inscrite à l’Ordem dos Médicos · ERS 45475',
        faqTitle: 'FAQ',
        priceTitle: 'Tarif',
        relatedLangs: 'Ce guide dans d’autres langues',
        relatedPages: 'À lire aussi',
        footerBrand: 'Consultation médicale en ligne au Portugal — prix affiché, médecin identifié, visio.',
        footerClinic: 'Clinique',
        footerSupport: 'Aide',
        footerDoctors: 'La médecin',
        terms: 'Conditions',
        privacy: 'Confidentialité',
        cookies: 'Cookies',
        contact: 'Contact',
        disclaimer:
            'Information générale pour les visiteurs au Portugal. Elle ne remplace pas une consultation individuelle. En urgence, appelez le 112.',
        reviewed: 'Relu par l’équipe médicale de Lon Clinic',
        whatsapp: 'Contacter sur WhatsApp',
        emergencyCta: 'Urgences : 112',
        urgentNote: 'En cas de véritable urgence, appelez le 112 ou rendez-vous aux urgences d’un hôpital public.',
        bookAria: 'Réserver chez Lon Clinic',
        cardGpChip: 'Médecine générale',
        cardGpTitle: 'Téléconsultation',
        cardGpPrice: '39 € · ~30 min',
        cardGpNote: 'Vidéo · anglais, espagnol ou portugais',
        cardGpCta: 'Réserver',
        cardRenewChip: 'Renouvellement',
        cardRenewTitle: 'Renouveler une ordonnance',
        cardRenewPrice: '19 €',
        cardRenewNote: 'Traitement chronique stable · visio, pas un formulaire',
        cardRenewCta: 'Renouveler',
        slotKicker: 'Prochains créneaux',
        slotCta: 'Réserver ce créneau',
        slotPending: 'Voir les horaires'
    },
    de: {
        htmlLang: 'de',
        ogLocale: 'de_DE',
        skip: 'Zum Inhalt springen',
        navAria: 'Hauptnavigation',
        navConsulta: 'Arzt finden',
        navHub: 'Tourist clinic',
        navTravel: 'Reiseklinik',
        navBook: 'Termin buchen',
        navLogin: 'Login',
        openMenu: 'Menü öffnen',
        breadcrumbHub: 'Tourist clinic',
        kicker: 'Tourist clinic · Portugal 2026',
        languagesLine: 'Sprechstunden auf Englisch, Spanisch oder Portugiesisch.',
        clinician: 'Ärztin · Ordem dos Médicos · ERS 45475',
        faqTitle: 'FAQ',
        priceTitle: 'Preis',
        relatedLangs: 'Dieser Ratgeber in anderen Sprachen',
        relatedPages: 'Weiterlesen',
        footerBrand: 'Online-Arzttermin in Portugal — sichtbarer Preis, namentlich genannte Ärztin, Video.',
        footerClinic: 'Klinik',
        footerSupport: 'Hilfe',
        footerDoctors: 'Die Ärztin',
        terms: 'AGB',
        privacy: 'Datenschutz',
        cookies: 'Cookies',
        contact: 'Kontakt',
        disclaimer:
            'Allgemeine Information für Besucher in Portugal. Kein Ersatz für eine individuelle Arztkonsultation. Im Notfall 112 anrufen.',
        reviewed: 'Geprüft vom Ärzteteam der Lon Clinic',
        whatsapp: 'Per WhatsApp kontaktieren',
        emergencyCta: 'Notfall: 112',
        urgentNote: 'Bei einem echten Notfall 112 anrufen oder in die Notaufnahme eines öffentlichen Krankenhauses gehen.',
        bookAria: 'Bei Lon Clinic buchen',
        cardGpChip: 'Allgemeinmedizin',
        cardGpTitle: 'Online-Sprechstunde',
        cardGpPrice: '39 € · ~30 Min.',
        cardGpNote: 'Video · Englisch, Spanisch oder Portugiesisch',
        cardGpCta: 'Buchen',
        cardRenewChip: 'Rezept',
        cardRenewTitle: 'Rezept verlängern',
        cardRenewPrice: '19 €',
        cardRenewNote: 'Stabile Dauermedikation · Video, kein Formular',
        cardRenewCta: 'Verlängern',
        slotKicker: 'Nächste Termine',
        slotCta: 'Diesen Termin buchen',
        slotPending: 'Zeiten ansehen'
    }
};

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
    if (!fs.existsSync(MANIFEST_PATH)) return { pages: [] };
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (!parsed || !Array.isArray(parsed.pages)) return { pages: [] };
    return parsed;
}

function livePages() {
    return (loadManifest().pages || []).filter(
        (p) => p && isValidSlug(p.slug) && p.status !== 'planned' && p.status !== 'draft'
    );
}

function findPage(slug) {
    return livePages().find((p) => p.slug === slug) || null;
}

function hasPublishedSlug(slug) {
    return !!findPage(slug);
}

function groupPages(group, pages) {
    const all = pages || livePages();
    return all.filter((p) => p.group === group);
}

function uiFor(lang) {
    return UI[lang] || UI.en;
}

function listHtml(items, className) {
    if (!Array.isArray(items) || !items.length) return '';
    const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    return `<ul class="${className}">${lis}</ul>`;
}

function stepsHtml(steps) {
    if (!Array.isArray(steps) || !steps.length) return '';
    const items = steps
        .map((step, i) => {
            const title = escapeHtml(step.title || `${i + 1}`);
            const text = escapeHtml(step.text || '');
            return `
                <li class="cq-step">
                    <span class="cq-step-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                    <div>
                        <h3>${title}</h3>
                        <p>${text}</p>
                    </div>
                </li>`;
        })
        .join('');
    return `<ol class="cq-steps">${items}</ol>`;
}

function faqHtml(faq) {
    if (!Array.isArray(faq) || !faq.length) return '';
    const items = faq
        .map(
            (item) => `
            <details class="cq-faq-item">
                <summary>${escapeHtml(item.q)}</summary>
                <div class="cq-faq-a"><p>${escapeHtml(item.a)}</p></div>
            </details>`
        )
        .join('');
    return `<div class="cq-faq">${items}</div>`;
}

function tableHtml(table) {
    if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows) || !table.headers.length) {
        return '';
    }
    const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const body = table.rows
        .map((row) => {
            const cells = (Array.isArray(row) ? row : []).map((c) => `<td>${escapeHtml(c)}</td>`).join('');
            return `<tr>${cells}</tr>`;
        })
        .join('');
    return `<div class="tq-table-wrap"><table class="tq-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function sectionsHtml(sections) {
    if (!Array.isArray(sections) || !sections.length) return '';
    return sections
        .map((section, i) => {
            const id = `tq-s${i + 1}`;
            const title = escapeHtml(section.h2 || '');
            const paras = (Array.isArray(section.paragraphs) ? section.paragraphs : [])
                .map((p) => `<p>${escapeHtml(p)}</p>`)
                .join('');
            const items = Array.isArray(section.items)
                ? `<dl class="tq-dl">${section.items
                      .map(
                          (item) => `
                    <dt>${escapeHtml(item.title || '')}</dt>
                    <dd>${escapeHtml(item.text || '')}</dd>`
                      )
                      .join('')}</dl>`
                : '';
            const table = tableHtml(section.table);
            return `
            <section class="cq-block" aria-labelledby="${id}">
                <h2 id="${id}">${title}</h2>
                ${paras}
                ${items}
                ${table}
            </section>`;
        })
        .join('');
}

function hreflangLinks(origin, current, siblings) {
    const links = siblings.map((p) => {
        const href = `${origin}/${encodeURIComponent(p.slug)}`;
        const hreflang = p.hreflang || p.lang || 'en';
        return `<link rel="alternate" hreflang="${escapeHtml(hreflang)}" href="${escapeHtml(href)}">`;
    });
    const def = siblings.find((p) => p.lang === 'en') || current;
    if (def) {
        links.push(
            `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${origin}/${encodeURIComponent(def.slug)}`)}">`
        );
    }
    return links.join('\n    ');
}

function ogLocaleAlts(current, siblings) {
    return siblings
        .filter((p) => p.slug !== current.slug)
        .map((p) => {
            const loc = uiFor(p.lang).ogLocale;
            return `<meta property="og:locale:alternate" content="${escapeHtml(loc)}">`;
        })
        .join('\n    ');
}

function langSwitchHtml(current, siblings) {
    const labels = { en: 'EN', es: 'ES', fr: 'FR', de: 'DE' };
    const items = siblings
        .map((p) => {
            const currentAttr = p.slug === current.slug ? ' aria-current="page"' : '';
            return `<a href="/${encodeURIComponent(p.slug)}"${currentAttr}>${labels[p.lang] || p.lang}</a>`;
        })
        .join('');
    return `<nav class="tq-langs" aria-label="${escapeHtml(uiFor(current.lang).relatedLangs)}">${items}</nav>`;
}

function relatedHtml(current, siblings, ui) {
    const langItems = siblings
        .filter((p) => p.slug !== current.slug)
        .map(
            (p) =>
                `<li><a href="/${encodeURIComponent(p.slug)}">${escapeHtml(p.navLabel || p.h1)}</a></li>`
        )
        .join('');
    const extra = (Array.isArray(current.related) ? current.related : [])
        .map((item) => {
            if (item && typeof item === 'object' && item.href) {
                return `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label || item.href)}</a></li>`;
            }
            return '';
        })
        .join('');
    return `
        <nav class="cq-related" aria-label="${escapeHtml(ui.relatedPages)}">
            <h2>${escapeHtml(ui.relatedLangs)}</h2>
            <ul>${langItems}${extra}</ul>
        </nav>`;
}

function bookingQuery(href) {
    try {
        const u = new URL(String(href || ''), 'https://lonclinic.invalid');
        return {
            path: u.pathname,
            ref: u.searchParams.get('ref') || '',
            lang: u.searchParams.get('lang') || 'en'
        };
    } catch (_) {
        return { path: '/marcar/clinica-geral', ref: '', lang: 'en' };
    }
}

function siblingBookingHref(kind, ref, lang) {
    const path = kind === 'renew' ? '/marcar/renovacao' : '/marcar/clinica-geral';
    const nextRef =
        kind === 'renew'
            ? (ref || 'tourist-clinic').replace(/tourist-(see-doctor|uti|clinic)/, 'tourist-renew')
            : (ref || 'tourist-clinic').replace(/tourist-renew/, 'tourist-see-doctor');
    const params = new URLSearchParams();
    if (nextRef) params.set('ref', nextRef);
    params.set('lang', lang || 'en');
    return `${path}?${params.toString()}`;
}

function bookingCardsHtml(page, ui, tone) {
    const primaryHref = page.bookingHref || '/marcar/clinica-geral';
    const q = bookingQuery(primaryHref);
    const renewFirst = q.path.indexOf('/marcar/renovacao') !== -1;
    const gpHref = renewFirst ? siblingBookingHref('gp', q.ref, q.lang) : primaryHref;
    const renewHref = renewFirst ? primaryHref : siblingBookingHref('renew', q.ref, q.lang);
    const t = Math.abs(Number(tone) || 0) % 3;
    const cards = [
        {
            chip: ui.cardGpChip,
            title: ui.cardGpTitle,
            price: ui.cardGpPrice,
            note: ui.cardGpNote,
            cta: ui.cardGpCta,
            href: gpHref,
            track: 'tourist-card-gp'
        },
        {
            chip: ui.cardRenewChip,
            title: ui.cardRenewTitle,
            price: ui.cardRenewPrice,
            note: ui.cardRenewNote,
            cta: ui.cardRenewCta,
            href: renewHref,
            track: 'tourist-card-renew'
        }
    ];
    if (renewFirst) cards.reverse();
    const items = cards
        .map(
            (card) => `
        <article class="guide-book-card guide-book-card--t${t}">
            <p class="guide-book-chip">${escapeHtml(card.chip)}</p>
            <h3 class="guide-book-title">${escapeHtml(card.title)}</h3>
            <p class="guide-book-price">${escapeHtml(card.price)}</p>
            <p class="guide-book-note">${escapeHtml(card.note)}</p>
            <a class="guide-book-cta js-consulta-cta" data-consulta-cta="${escapeHtml(card.track)}" href="${escapeHtml(card.href)}">${escapeHtml(card.cta)}</a>
        </article>`
        )
        .join('');
    return `
        <aside class="guide-book" aria-label="${escapeHtml(ui.bookAria)}">
    <div class="guide-book-grid">${items}
    </div>
</aside>`;
}

function bookingServiceKey(page) {
    const href = String((page && page.bookingHref) || '');
    if (href.indexOf('/marcar/renovacao') !== -1) return 'renovacao';
    if (href.indexOf('/marcar/travel') !== -1) return 'travel';
    return 'clinica_geral';
}

function liveSlotsHtml(page, ui, surface) {
    const href = page.bookingHref || '/marcar/clinica-geral';
    return `
        <div class="cq-live-slots" data-next-slots data-service="${escapeHtml(bookingServiceKey(page))}" data-book-href="${escapeHtml(href)}" data-surface="${escapeHtml(surface || 'tourist')}" hidden>
            <p class="cq-live-slots-kicker">${escapeHtml(ui.slotKicker)}</p>
            <div class="cq-live-slots-row" data-next-slots-row></div>
        </div>`;
}

function stickyBookHtml(page, ui) {
    const href = page.bookingHref || '/marcar/clinica-geral';
    return `
        <div class="cq-sticky-book" data-sticky-book data-service="${escapeHtml(bookingServiceKey(page))}" data-book-href="${escapeHtml(href)}">
            <div class="cq-sticky-book-inner">
                <p class="cq-sticky-book-copy">
                    <span class="cq-sticky-book-kicker">${escapeHtml(ui.slotKicker)}</span>
                    <strong data-next-slot-when>${escapeHtml(ui.slotPending)}</strong>
                </p>
                <a class="lon-btn lon-btn-dark js-consulta-cta" data-consulta-cta="sticky-book" data-next-slot-cta href="${escapeHtml(href)}">${escapeHtml(ui.slotCta)}</a>
            </div>
        </div>`;
}

function ctaBand(page, ui) {
    const href = escapeHtml(page.bookingHref || '/marcar/clinica-geral');
    const label = escapeHtml(page.bookingLabel || ui.navBook);
    const secondaryHref = escapeHtml(page.ctaSecondaryHref || '/tourist-clinic');
    const secondaryLabel = escapeHtml(page.ctaSecondaryLabel || ui.navHub);
    return `
        <aside class="cq-cta-band" aria-label="${escapeHtml(ui.navBook)}">
            <div class="lon-container cq-cta-inner">
                <p class="cq-cta-kicker">${escapeHtml(ui.languagesLine)}</p>
                <h2 class="cq-cta-title">${escapeHtml(page.ctaTitle || ui.navBook)}</h2>
                <p class="cq-cta-lead">${escapeHtml(page.ctaLead || page.priceNote || '')}</p>
                <div class="cq-cta-actions">
                    <a class="lon-btn lon-btn-dark js-consulta-cta" data-consulta-cta="tourist-band" href="${href}">${label}</a>
                    <a class="lon-btn lon-btn-soft" href="${secondaryHref}">${secondaryLabel}</a>
                </div>
            </div>
        </aside>`;
}

function layoutPage(opts) {
    const {
        origin,
        title,
        description,
        canonicalPath,
        ogImage,
        jsonLdExtra,
        mainHtml,
        ui,
        hreflang,
        ogAlts,
        bookingHref
    } = opts;

    const canonicalUrl = canonicalHref(canonicalPath);
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const og = escapeHtml(ogImage || `${origin}/image/travel-clinic-mountain-bg-v2.png`);
    const ogType = escapeHtml(opts.ogType || 'article');
    const graph = Array.isArray(jsonLdExtra) ? jsonLdExtra : jsonLdExtra ? [jsonLdExtra] : [];
    graph.push(organizationJsonLd(origin));
    const ldScripts = graph
        .map((block) => `<script type="application/ld+json">\n${JSON.stringify(block, null, 2)}\n</script>`)
        .join('\n');
    const book = escapeHtml(bookingHref || '/marcar/clinica-geral');

    return `<!DOCTYPE html>
<html lang="${escapeHtml(ui.htmlLang)}">
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
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="author" content="${escapeHtml(authors.getAuthor().displayName)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    ${hreflang}
    <meta property="og:type" content="${ogType}">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:locale" content="${escapeHtml(ui.ogLocale)}">
    ${ogAlts}
    <meta property="og:image" content="${og}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${og}">
    <meta name="theme-color" content="#4A7C6F">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260621b">
    <link rel="stylesheet" href="/consulta-pages.css?v=20260905d">
    <link rel="stylesheet" href="/tourist-pages.css?v=20260905d">
    <link rel="stylesheet" href="/author.css?v=20260820e">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    ${ldScripts}
</head>
<body class="lon-landing cq-body tourist-body">
    <a class="lon-skip" href="#conteudo-principal">${escapeHtml(ui.skip)}</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <nav class="lon-nav-links" aria-label="${escapeHtml(ui.navAria)}">
                <a href="/consulta">${escapeHtml(ui.navConsulta)}</a>
                <a href="/tourist-clinic">${escapeHtml(ui.navHub)}</a>
            </nav>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">${escapeHtml(ui.navLogin)}</a>
                <a href="${book}" class="lon-btn lon-btn-primary lon-btn-sm">${escapeHtml(ui.navBook)}</a>
                <button type="button" class="lon-nav-toggle" id="lonNavToggle" aria-label="${escapeHtml(ui.openMenu)}" aria-expanded="false" aria-controls="lonMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
        <div class="lon-mobile-menu" id="lonMobileMenu">
            <a href="/consulta">${escapeHtml(ui.navConsulta)}</a>
            <a href="/tourist-clinic">${escapeHtml(ui.navHub)}</a>
            <a href="/patient-portal">${escapeHtml(ui.navLogin)}</a>
            <a href="${book}">${escapeHtml(ui.navBook)}</a>
        </div>
    </header>
    ${mainHtml}
    <footer class="lon-footer">
        <div class="lon-container">
            <div class="lon-footer-grid">
                <div class="lon-footer-brand">
                    <h3>Lon Clinic</h3>
                    <p>${escapeHtml(ui.footerBrand)}</p>
                    <div class="lon-ers-badge">Nº de Registo ERS: 45475</div>
                </div>
                <div class="lon-footer-col">
                    <h4>${escapeHtml(ui.footerClinic)}</h4>
                    <a href="/consulta">${escapeHtml(ui.navConsulta)}</a>
                    <a href="/tourist-clinic">${escapeHtml(ui.navHub)}</a>
                    <a href="/equipa/rita-aguiar">${escapeHtml(ui.footerDoctors)}</a>
                </div>
                <div class="lon-footer-col">
                    <h4>${escapeHtml(ui.footerSupport)}</h4>
                    <a href="/faq">FAQ</a>
                    <a href="/info.html?page=contato">${escapeHtml(ui.contact)}</a>
                    <a href="${book}">${escapeHtml(ui.navBook)}</a>
                </div>
                <div class="lon-footer-col">
                    <h4>Legal</h4>
                    <a href="/info.html?page=termos-condicoes">${escapeHtml(ui.terms)}</a>
                    <a href="/info.html?page=politica-privacidade">${escapeHtml(ui.privacy)}</a>
                    <a href="/info.html?page=cookies">${escapeHtml(ui.cookies)}</a>
                </div>
            </div>
            <div class="lon-footer-bottom">
                <div><p>© 2026 Lon Clinic · Portugal</p></div>
            </div>
        </div>
    </footer>
    <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer" class="lon-wa-float" aria-label="${escapeHtml(ui.whatsapp)}">💬</a>
    <script src="/lon-nav.js"></script>
    <script src="/lon-analytics.js?v=20260904a" defer></script>
    <script src="/lon-slots.js?v=20260905c" defer></script>
</body>
</html>`;
}

function renderPage(origin, slug) {
    if (!isValidSlug(slug)) return null;
    const meta = findPage(slug);
    if (!meta) return null;

    const o = normalizeOrigin(origin);
    const ui = uiFor(meta.lang);
    const title = String(meta.titleTag || meta.h1 || slug);
    const description = String(meta.description || '');
    const datePub = String(meta.datePublished || '');
    const dateMod = String(meta.dateModified || meta.datePublished || '');
    const canonicalPath = `/${encodeURIComponent(slug)}`;
    const bookingHref = meta.bookingHref || '/marcar/clinica-geral';
    const siblings = groupPages(meta.group);
    const author = authors.getAuthor(meta.author);

    const faqLd =
        Array.isArray(meta.faq) && meta.faq.length
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
            '@type': 'MedicalWebPage',
            name: title,
            headline: String(meta.h1 || title),
            description,
            url: `${o}${canonicalPath}`,
            datePublished: datePub || undefined,
            dateModified: dateMod || undefined,
            inLanguage: ui.htmlLang,
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            about: {
                '@type': 'Thing',
                name: 'Healthcare for tourists in Portugal'
            },
            ...authors.articleAuthorSchema(o)
        },
        authors.personJsonLd(o),
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: ui.breadcrumbHub, item: `${o}/tourist-clinic` },
                { '@type': 'ListItem', position: 3, name: meta.navLabel || meta.h1, item: `${o}${canonicalPath}` }
            ]
        }
    ];
    if (faqLd) jsonLd.push(faqLd);

    const leadParas = (Array.isArray(meta.lead) ? meta.lead : [meta.lead])
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('');

    const notice = meta.notice
        ? `<aside class="tq-notice" role="note"><p>${escapeHtml(meta.notice)}</p></aside>`
        : '';

    const mainHtml = `
    <main id="conteudo-principal" class="cq-main">
        <article class="cq-article">
            <header class="cq-header">
                <nav class="cq-breadcrumb" aria-label="breadcrumb">
                    <a href="/">${escapeHtml('Lon Clinic')}</a>
                    <span aria-hidden="true">/</span>
                    <a href="/tourist-clinic">${escapeHtml(ui.navHub)}</a>
                    <span aria-hidden="true">/</span>
                    <span>${escapeHtml(meta.navLabel || meta.h1)}</span>
                </nav>
                ${langSwitchHtml(meta, siblings)}
                <p class="cq-kicker">${escapeHtml(ui.kicker)}</p>
                <h1>${escapeHtml(meta.h1)}</h1>
                <div class="cq-lead">${leadParas}</div>
                <p class="cq-clinician">
                    <a href="${escapeHtml(authors.authorPath(author))}">${escapeHtml(author.displayName)}</a>
                    <span aria-hidden="true"> · </span>${escapeHtml(ui.clinician)}
                </p>
                <p class="tq-langs-line">${escapeHtml(ui.languagesLine)}</p>
                <div class="cq-header-actions">
                    <a class="lon-btn lon-btn-dark js-consulta-cta" data-consulta-cta="tourist-hero" href="${escapeHtml(bookingHref)}">${escapeHtml(meta.bookingLabel || ui.navBook)}</a>
                    <a class="lon-btn lon-btn-soft" href="#quando-urgencia">${escapeHtml(ui.emergencyCta)}</a>
                </div>
                ${liveSlotsHtml(meta, ui, 'tourist-hero')}
            </header>

            ${notice}

            ${bookingCardsHtml(meta, ui, 0)}

            ${sectionsHtml(meta.sections)}

            ${
                Array.isArray(meta.howItWorks) && meta.howItWorks.length
                    ? `<section class="cq-block" aria-labelledby="tq-how">
                <h2 id="tq-how">${escapeHtml(meta.howTitle || '')}</h2>
                ${stepsHtml(meta.howItWorks)}
            </section>`
                    : ''
            }

            ${bookingCardsHtml(meta, ui, 1)}

            <section class="cq-price" aria-labelledby="tq-price">
                <h2 id="tq-price">${escapeHtml(ui.priceTitle)}</h2>
                <p class="cq-price-value">${escapeHtml(meta.price || '€39')}</p>
                <p class="cq-price-note">${escapeHtml(meta.priceNote || '')}</p>
                <a class="lon-btn lon-btn-primary js-consulta-cta" data-consulta-cta="tourist-price" href="${escapeHtml(bookingHref)}">${escapeHtml(meta.bookingLabel || ui.navBook)}</a>
            </section>

            <section class="cq-split" id="quando-urgencia">
                <div class="cq-ok">
                    <h2>${escapeHtml(meta.onlineTitle || '')}</h2>
                    ${listHtml(meta.safeOnline, 'cq-list')}
                </div>
                <div class="cq-flags">
                    <h2>${escapeHtml(meta.urgentTitle || '')}</h2>
                    ${listHtml(meta.goToUrgent, 'cq-list')}
                    <p class="cq-flags-note">${escapeHtml(ui.urgentNote)}</p>
                </div>
            </section>

            <section class="cq-block" aria-labelledby="cq-faq-title">
                <h2 id="cq-faq-title">${escapeHtml(ui.faqTitle)}</h2>
                ${faqHtml(meta.faq)}
            </section>

            <p class="eeat-reviewed">${escapeHtml(ui.reviewed)}</p>
            <p class="cq-disclaimer">${escapeHtml(ui.disclaimer)}</p>
            ${relatedHtml(meta, siblings, ui)}
        </article>
        ${ctaBand(meta, ui)}
        ${stickyBookHtml(meta, ui)}
    </main>`;

    return {
        html: layoutPage({
            origin: o,
            title,
            description,
            canonicalPath,
            ogImage: `${o}/image/travel-clinic-mountain-bg-v2.png`,
            jsonLdExtra: jsonLd,
            mainHtml,
            ui,
            hreflang: hreflangLinks(o, meta, siblings),
            ogAlts: ogLocaleAlts(meta, siblings),
            bookingHref
        })
    };
}

function hubGuideCards() {
    const labels = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' };
    const clusterMeta = {
        'see-doctor-tourist': {
            h2: 'How to see a doctor',
            p: 'Public vs private vs online — for visitors without SNS or a family doctor.'
        },
        'uti-tourist': {
            h2: 'UTI while you are here',
            p: 'Pharmacy, prescription, red flags, and how to get assessed online.'
        },
        'renew-prescription-tourist': {
            h2: 'Renew a prescription on holiday',
            p: 'Stable chronic medication — 19 € video consult, electronic prescription if appropriate.'
        }
    };
    const pages = livePages();
    const order = ['see-doctor-tourist', 'uti-tourist', 'renew-prescription-tourist'];
    const groups = [...new Set(pages.map((p) => p.group).filter(Boolean))];
    const sorted = order.filter((id) => groups.includes(id)).concat(groups.filter((id) => !order.includes(id)));
    return sorted
        .map((group) => {
            const meta = clusterMeta[group] || { h2: group, p: '' };
            const cards = pages
                .filter((p) => p.group === group)
                .map((p) => {
                    const lang = labels[p.lang] || p.lang;
                    return `
            <a class="cq-hub-card" href="/${encodeURIComponent(p.slug)}">
                <span class="cq-hub-price">${escapeHtml(lang)}</span>
                <span class="cq-hub-label">${escapeHtml(p.navLabel || p.h1)}</span>
                <span class="cq-hub-desc">${escapeHtml(p.hubBlurb || p.description || '')}</span>
            </a>`;
                })
                .join('');
            return `
            <h3 class="tq-cluster-title">${escapeHtml(meta.h2)}</h3>
            <p class="tq-cluster-lead">${escapeHtml(meta.p)}</p>
            <div class="cq-hub-grid tq-guide-grid">${cards}</div>`;
        })
        .join('');
}

function renderHub(origin) {
    const o = normalizeOrigin(origin);
    const manifest = loadManifest();
    const hub = manifest.hub || {};
    const ui = uiFor('en');
    const title = String(hub.titleTag || 'Tourist Clinic Portugal — See a Doctor Online');
    const description = String(
        hub.description ||
            'Already in Portugal without SNS or a family doctor? Video consultation €39 in English, Spanish or Portuguese.'
    );
    const bookingHref = hub.bookingHref || '/marcar/clinica-geral?ref=tourist-clinic&lang=en';
    const author = authors.getAuthor(hub.author);
    const datePub = String(hub.datePublished || '2026-08-20');
    const dateMod = String(hub.dateModified || datePub);
    const canonicalPath = '/tourist-clinic';

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'MedicalWebPage',
            name: title,
            headline: String(hub.h1 || 'Tourist Clinic Portugal'),
            description,
            url: `${o}${canonicalPath}`,
            datePublished: datePub,
            dateModified: dateMod,
            inLanguage: 'en',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o },
            about: { '@type': 'Thing', name: 'Tourist clinic Portugal' },
            ...authors.articleAuthorSchema(o)
        },
        authors.personJsonLd(o),
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Lon Clinic', item: o },
                { '@type': 'ListItem', position: 2, name: 'Tourist clinic', item: `${o}/tourist-clinic` }
            ]
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Offer',
            name: 'Tourist clinic consultation',
            url: `${o}${canonicalPath}`,
            price: '39.00',
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            seller: { '@id': `${o}/#organization` }
        }
    ];

    const leadParas = (Array.isArray(hub.lead) ? hub.lead : [])
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('');

    const mainHtml = `
    <main id="conteudo-principal" class="cq-main">
        <article class="cq-article">
            <header class="cq-header">
                <nav class="cq-breadcrumb" aria-label="breadcrumb">
                    <a href="/">Lon Clinic</a>
                    <span aria-hidden="true">/</span>
                    <span>Tourist clinic</span>
                </nav>
                <p class="cq-kicker">Tourist clinic · Portugal 2026</p>
                <h1>${escapeHtml(hub.h1 || 'Tourist Clinic Portugal')}</h1>
                <div class="cq-lead">${leadParas}</div>
                <p class="cq-clinician">
                    <a href="${escapeHtml(authors.authorPath(author))}">${escapeHtml(author.displayName)}</a>
                    <span aria-hidden="true"> · </span>${escapeHtml(ui.clinician)}
                </p>
                <p class="tq-langs-line">${escapeHtml(ui.languagesLine)}</p>
                <div class="cq-header-actions">
                    <a class="lon-btn lon-btn-dark js-consulta-cta" data-consulta-cta="tourist-hub-hero" href="${escapeHtml(bookingHref)}">${escapeHtml(hub.bookingLabel || 'Book online — €39')}</a>
                    <a class="lon-btn lon-btn-soft" href="#quando-urgencia">${escapeHtml(ui.emergencyCta)}</a>
                </div>
                ${liveSlotsHtml(hub, ui, 'tourist-hub')}
            </header>

            <aside class="tq-split-note" aria-label="Not the travel clinic">
                <p><strong>This is not the travel clinic.</strong> Travel clinic is vaccines, malaria and advice <em>before you fly</em>. Tourist clinic is for visitors <em>already in Portugal</em> who need a doctor now — no SNS, no family doctor.</p>
                <p><a href="/travel-clinic">Going abroad? Travel clinic →</a></p>
            </aside>

            ${bookingCardsHtml(hub, ui, 0)}

            ${sectionsHtml(hub.sections)}

            <section class="cq-price" aria-labelledby="tq-price">
                <h2 id="tq-price">${escapeHtml(ui.priceTitle)}</h2>
                <p class="cq-price-value">${escapeHtml(hub.price || '€39')}</p>
                <p class="cq-price-note">${escapeHtml(hub.priceNote || ui.languagesLine)}</p>
                <a class="lon-btn lon-btn-primary js-consulta-cta" data-consulta-cta="tourist-hub-price" href="${escapeHtml(bookingHref)}">${escapeHtml(hub.bookingLabel || 'Book online — €39')}</a>
            </section>

            <section class="cq-split" id="quando-urgencia">
                <div class="cq-ok">
                    <h2>${escapeHtml(hub.onlineTitle || 'When tourist clinic makes sense')}</h2>
                    ${listHtml(hub.safeOnline, 'cq-list')}
                </div>
                <div class="cq-flags">
                    <h2>${escapeHtml(hub.urgentTitle || 'When to go to the ER')}</h2>
                    ${listHtml(hub.goToUrgent, 'cq-list')}
                    <p class="cq-flags-note">${escapeHtml(ui.urgentNote)}</p>
                </div>
            </section>

            ${bookingCardsHtml(hub, ui, 1)}

            <section class="cq-block tq-hub-guides" aria-labelledby="tq-guides">
                <h2 id="tq-guides">Guides in your language</h2>
                ${hubGuideCards()}
            </section>

            <p class="eeat-reviewed">${escapeHtml(ui.reviewed)}</p>
            <p class="cq-disclaimer">${escapeHtml(ui.disclaimer)}</p>
        </article>
        ${ctaBand({
            bookingHref,
            bookingLabel: hub.bookingLabel,
            ctaTitle: hub.ctaTitle,
            ctaLead: hub.ctaLead,
            priceNote: hub.priceNote,
            ctaSecondaryHref: '/travel-clinic',
            ctaSecondaryLabel: 'Travel clinic — vaccines'
        }, ui)}
        ${stickyBookHtml(hub, ui)}
    </main>`;

    const hreflang = [
        `<link rel="alternate" hreflang="en" href="${escapeHtml(`${o}/tourist-clinic`)}">`,
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${o}/tourist-clinic`)}">`
    ].join('\n    ');

    return layoutPage({
        origin: o,
        title,
        description,
        canonicalPath,
        ogImage: `${o}/image/travel-clinic-mountain-bg-v2.png`,
        ogType: 'website',
        jsonLdExtra: jsonLd,
        mainHtml,
        ui,
        hreflang,
        ogAlts: '',
        bookingHref
    });
}

module.exports = {
    isValidSlug,
    loadManifest,
    livePages,
    findPage,
    hasPublishedSlug,
    groupPages,
    renderPage,
    renderHub
};
