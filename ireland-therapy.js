/**
 * English landing: online therapy for people living in Ireland.
 * /en/online-therapy-ireland
 */
'use strict';

const __lonHeader = require('./lon-header');
const { organizationJsonLd, originOf, canonicalHref, jsonLdScript } = require('./seo');
const authors = require('./authors');

const PATH = '/en/online-therapy-ireland';
const BOOK = '/marcar/psicologia?plan=avulsa&ref=ie-therapy&booking_source=ie-therapy&langpolicy=en-es-pt';
const BOOK_WEEKLY = '/marcar/psicologia?ref=ie-therapy&booking_source=ie-therapy&langpolicy=en-es-pt';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderPage(origin) {
    const o = originOf(origin);
    const canonical = canonicalHref(PATH);
    const title = 'Online Therapy in Ireland | In English, Portuguese or Spanish';
    const description = 'Online therapy for people living in Ireland, in English, Portuguese or Spanish. Licensed psychologists, evening and Saturday sessions. Book online.';
    const carolina = authors.getAuthor('carolina-rocha');
    const photo = (who) => `/api/public/team-photo/${encodeURIComponent(who)}`;

    const faq = [
        {
            q: 'Can I have online therapy in Ireland with a psychologist based in Portugal?',
            a: 'Yes. Our psychologists are registered in Portugal and see clients by video. Under EU rules on cross-border healthcare, telemedicine is considered to be provided in the country where the provider is established.'
        },
        {
            q: 'Can I have therapy in Portuguese or Spanish?',
            a: 'Yes. You can choose a psychologist who works in English, Portuguese or Spanish. Say which language you want when you book.'
        },
        {
            q: 'Is online therapy effective?',
            a: 'For many common difficulties, such as anxiety, depression and stress, research shows online therapy can be as effective as in-person sessions.'
        },
        {
            q: 'Is it covered by my health insurance?',
            a: 'Coverage depends on your insurer and policy. We provide an invoice for every session; please check with your insurer before booking.'
        },
        {
            q: 'What if I\'m in crisis?',
            a: 'Online therapy is not an emergency service. In an emergency, call 112 or 999. You can also call Samaritans on 116 123 (free, 24/7).'
        }
    ];

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'MedicalWebPage',
            name: title,
            headline: 'Online therapy in Ireland, in your language',
            description,
            url: canonical,
            inLanguage: 'en',
            audience: {
                '@type': 'PeopleAudience',
                geographicArea: { '@type': 'Country', name: 'Ireland' }
            },
            about: { '@type': 'MedicalTherapy', name: 'Online psychological therapy' },
            publisher: { '@id': `${o}/#organization` },
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'MedicalClinic',
            name: 'Lon Clinic',
            url: o,
            description: 'Online psychology clinic. Sessions in English, Portuguese or Spanish for people living in Ireland.',
            areaServed: { '@type': 'Country', name: 'Ireland' },
            availableLanguage: ['English', 'Portuguese', 'Spanish'],
            address: { '@type': 'PostalAddress', addressCountry: 'PT' },
            parentOrganization: { '@id': `${o}/#organization` }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a }
            }))
        },
        organizationJsonLd(o)
    ];

    const faqHtml = faq.map((item) => `
        <details class="ie-faq">
            <summary>${escapeHtml(item.q)}</summary>
            <p>${escapeHtml(item.a)}</p>
        </details>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-QX80MLXLEW"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZN8J4X12H3');
      gtag('config', 'G-QX80MLXLEW');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="alternate" hreflang="en-IE" href="${escapeHtml(canonical)}">
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Lon Clinic">
    <meta property="og:locale" content="en_IE">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${o}/image/psi-choice-individual.webp">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#163224">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fraunces:ital,opsz,wght@1,9..144,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/landing.css?v=20260923ie">
    <link rel="stylesheet" href="/consulta-pages.css?v=20260905f">
    <link rel="stylesheet" href="/author.css?v=20260914g">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
    ${jsonLdScript(jsonLd)}
    <style>
        .ie-main { padding: 28px 0 80px; }
        .ie-kicker { letter-spacing: .14em; text-transform: uppercase; font-size: .75rem; color: #5c6d64; margin: 0 0 10px; }
        .ie-lead { font-size: 1.125rem; max-width: 42rem; }
        .ie-price-line { font-size: 1.25rem; margin: 18px 0 8px; }
        .ie-trust { color: #3d4a44; margin-top: 14px; }
        .ie-actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 18px 0 8px; }
        .ie-section { margin-top: 2.5rem; }
        .ie-section h2 { margin-bottom: .6rem; }
        .ie-list { padding-left: 1.2rem; }
        .ie-list li { margin: .35rem 0; }
        .ie-table { width: 100%; max-width: 32rem; border-collapse: collapse; }
        .ie-table th, .ie-table td { text-align: left; padding: 12px 0; border-bottom: 1px solid rgba(16,24,32,.12); }
        .ie-note { color: #5c6d64; font-size: .92rem; }
        .ie-team { display: grid; gap: 16px; }
        @media (min-width: 800px) { .ie-team { grid-template-columns: 1fr 1fr; } }
        .ie-faq { border-bottom: 1px solid rgba(16,24,32,.12); padding: 12px 0; }
        .ie-faq summary { cursor: pointer; font-weight: 600; }
        .ie-faq p { margin: 8px 0 4px; }
        .ie-crisis { background: #f6e8e4; padding: 14px 16px; border-radius: 12px; }
    </style>
</head>
<body class="lon-landing cq-body">
    <a class="lon-skip" href="#conteudo-principal">Skip to content</a>
    ${__lonHeader.renderHeader({ rawCta: true, ctaHref: BOOK, ctaLabel: 'Book a session', ctaAttrs: ' data-cta="book" data-booking-source="ie-therapy"', current: null })}
    ${__lonHeader.renderHeaderScripts(false)}
    <main id="conteudo-principal" class="ie-main">
        <article class="lon-container">
            <p class="ie-kicker">Ireland · online therapy</p>
            <h1>Online therapy in Ireland, in your language</h1>
            <p class="ie-lead">Lon Clinic offers online therapy for people living in Ireland, in English, Portuguese or Spanish. Our psychologists are registered with the Portuguese Order of Psychologists (OPP) and see clients by secure video, with evening and Saturday availability. Book online in a few minutes.</p>
            <p class="ie-price-line"><strong>€60 per session</strong> · Next available:</p>
            <div class="cq-live-slots" data-next-slots data-limit="3" data-service="psicologia" data-book-href="${escapeHtml(BOOK)}" data-surface="ie-therapy" hidden>
                <p class="cq-live-slots-kicker">Next available · Irish time</p>
                <div class="cq-live-slots-row" data-next-slots-row></div>
                <a href="${escapeHtml(BOOK)}" class="dr-slots-week" data-slots-fallback hidden>See this week's times</a>
            </div>
            <div class="ie-actions">
                <a class="lon-btn lon-btn-primary" data-cta="book" data-booking-source="ie-therapy" href="${escapeHtml(BOOK)}">Book a session</a>
            </div>
            <p class="ie-trust">Licensed psychologists · English, Português, Español · Evenings &amp; Saturdays · Anywhere in Ireland</p>

            <section class="ie-section" aria-labelledby="ie-who">
                <h2 id="ie-who">Who we help</h2>
                <ul class="ie-list">
                    <li><strong>People living in Ireland</strong> who want timely, affordable support without a long waiting list</li>
                    <li><strong>Migrants and international professionals</strong> in Dublin, Cork, Galway, Limerick and beyond who would rather talk in their own language</li>
                    <li><strong>Students and young professionals</strong> dealing with stress, loneliness or burnout</li>
                    <li><strong>Couples and families</strong> adjusting to life in Ireland</li>
                </ul>
            </section>

            <section class="ie-section" aria-labelledby="ie-what">
                <h2 id="ie-what">What we help with</h2>
                <p>Anxiety and stress · Burnout · Low mood and the darker winter months · Loneliness and adjusting to life in Ireland · Relationships · Grief, including <a href="/blog/luto-a-distancia">losing someone far away</a> · Sleep problems</p>
            </section>

            <section class="ie-section" aria-labelledby="ie-how">
                <h2 id="ie-how">How it works</h2>
                <ol class="ie-list">
                    <li><strong>Choose a time</strong>, including evenings and Saturdays (Irish time shown — the same clock as Lisbon).</li>
                    <li><strong>Book and pay online.</strong></li>
                    <li><strong>Join your secure video session</strong> from home.</li>
                </ol>
            </section>

            <section class="ie-section" aria-labelledby="ie-team">
                <h2 id="ie-team">Our psychologists</h2>
                <div class="ie-team">
                    <article class="lon-team-card">
                        <div class="lon-team-card-media"><div class="lon-team-avatar"><img src="${escapeHtml(photo('sara'))}" alt="Dra. Sara Gamito" width="132" height="132" loading="lazy" decoding="async" onerror="this.remove()"><span aria-hidden="true">SG</span></div></div>
                        <div class="lon-team-card-body">
                            <h3 class="lon-team-name">Dra. Sara Gamito</h3>
                            <p class="lon-team-role">Psychologist · individual therapy</p>
                            <p>Works with adults through transitions, anxiety, emotional stress, self-esteem and personal growth.</p>
                            <p class="ie-note">Registered with the Ordem dos Psicólogos Portugueses. Languages are confirmed when you book.</p>
                            <a class="lon-btn lon-btn-soft lon-btn-sm" data-cta="book" data-booking-source="ie-therapy" href="${escapeHtml(BOOK)}">Book with the team</a>
                        </div>
                    </article>
                    <article class="lon-team-card">
                        <div class="lon-team-card-media"><div class="lon-team-avatar"><img src="${escapeHtml(photo('carolina'))}" alt="${escapeHtml(carolina.displayName)}" width="132" height="132" loading="lazy" decoding="async" onerror="this.remove()"><span aria-hidden="true">${escapeHtml(carolina.initials)}</span></div></div>
                        <div class="lon-team-card-body">
                            <h3 class="lon-team-name">${escapeHtml(carolina.displayName)}</h3>
                            <p class="lon-team-role">Psychologist · couple therapy</p>
                            <p>Works with couples on communication, conflict and the relationship. Registered with the Ordem dos Psicólogos Portugueses.</p>
                            <p class="ie-note"><a href="/equipa/carolina-rocha">Profile and credentials</a></p>
                            <a class="lon-btn lon-btn-soft lon-btn-sm" data-cta="book" data-booking-source="ie-therapy" href="/marcar/terapia-casal?ref=ie-therapy&amp;booking_source=ie-therapy&amp;langpolicy=en-es-pt">Book couple therapy</a>
                        </div>
                    </article>
                </div>
                <p class="ie-note">All our psychologists are registered with the <a href="https://www.ordemdospsicologos.pt/" rel="noopener noreferrer">Ordem dos Psicólogos Portugueses (OPP)</a>, the professional regulator for psychologists in Portugal, and provide online sessions from Portugal under EU cross-border healthcare rules.</p>
            </section>

            <section class="ie-section" aria-labelledby="ie-prices">
                <h2 id="ie-prices">Prices</h2>
                <table class="ie-table">
                    <thead><tr><th>Option</th><th>Price</th></tr></thead>
                    <tbody>
                        <tr><td>Single session (50 min)</td><td><strong>€60</strong></td></tr>
                        <tr><td>Weekly therapy</td><td><strong>€224 / month</strong></td></tr>
                    </tbody>
                </table>
                <p class="ie-note">Weekly therapy is €56 per session, billed monthly for four sessions. Couple therapy is separate: €75 a session, or €260/month (€65/week). <a href="${escapeHtml(BOOK_WEEKLY)}">See weekly times</a>.</p>
            </section>

            <section class="ie-section" aria-labelledby="ie-faq">
                <h2 id="ie-faq">Frequently asked questions</h2>
                ${faqHtml}
            </section>

            <p class="ie-crisis"><strong>Online therapy is not an emergency service.</strong> If you are in crisis, call <a href="tel:112">112</a> or <a href="tel:999">999</a>. Samaritans: <a href="tel:116123">116 123</a> (free, 24/7).</p>
            <div class="ie-actions">
                <a class="lon-btn lon-btn-primary" data-cta="book" data-booking-source="ie-therapy" href="${escapeHtml(BOOK)}">Book a session</a>
            </div>
        </article>
    </main>
    <footer class="lon-footer">
        <div class="lon-container">
            <p>© 2026 Lon Clinic · ERS 45475 · <a href="/info/politica-privacidade">Privacy</a> · <a href="/equipa">Team</a></p>
        </div>
    </footer>
    <script src="/lon-analytics.js?v=20260924a" defer></script>
    <script src="/lon-slots.js?v=20260923ie" defer></script>
    <script>
        try { sessionStorage.setItem('booking_source', 'ie-therapy'); } catch (e) {}
    </script>
</body>
</html>`;
}

module.exports = { PATH, renderPage };
