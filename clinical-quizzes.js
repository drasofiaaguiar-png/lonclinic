/**
 * Lon Clinic — clinical questionnaires (PHQ-9, GAD-7, PSS-10, ISI, WHO-5, SF-12, TFEQ, YFAS, ESS).
 * Interactive CBI quiz stays at /burnout/teste (burnout-quiz.html).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { originOf } = require('./seo');
const { scoreQuiz, questionOptions } = require('./clinical-quiz-score');

const QUIZ_DIR = path.join(__dirname, 'data', 'clinical-quizzes');
const CSS_V = '20260905i';
const JS_V = '20260905i';

const CBI = {
    id: 'cbi',
    path: '/burnout/teste',
    cluster: 'burnout',
    instrument: 'CBI',
    minutes: 4,
    questions: 18,
    h1: 'Teste de burnout (CBI)',
    lead: 'Copenhagen Burnout Inventory — 18 perguntas, resultado em 4 minutos.',
    title: 'Teste de Burnout Grátis'
};

const SCALE_ICONS = {
    mood: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
    somatic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M6 21v-2a6 6 0 0112 0v2"/></svg>',
    worry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    body: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M6 21v-2a6 6 0 0112 0v2"/></svg>',
    distress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    coping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    night: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
    day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    pcs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M6 21v-2a6 6 0 0112 0v2"/></svg>',
    mcs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
    cr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M6 20V4M18 20v-6"/></svg>',
    ue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
    ee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
    criteria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    impairment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    passive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    imc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M8 7h8M6 12h12M8 17h8"/></svg>',
    waist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="8" ry="5"/><path d="M4 12h16"/></svg>',
};

let cache = null;

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function loadAll() {
    if (cache) return cache;
    const files = fs.existsSync(QUIZ_DIR)
        ? fs.readdirSync(QUIZ_DIR).filter((f) => f.endsWith('.json'))
        : [];
    const byId = new Map();
    for (const file of files) {
        try {
            const raw = JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, file), 'utf8'));
            if (raw && raw.id && raw.path) byId.set(raw.id, raw);
        } catch (err) {
            console.error('clinical-quizzes load', file, err.message);
        }
    }
    cache = byId;
    return byId;
}

function getQuiz(id) {
    return loadAll().get(String(id || '')) || null;
}

function getQuizByPath(urlPath) {
    const p = String(urlPath || '').split('?')[0];
    for (const def of loadAll().values()) {
        if (def.path === p) return def;
    }
    return null;
}

function listQuizzes() {
    return Array.from(loadAll().values()).sort((a, b) =>
        String(a.path).localeCompare(String(b.path))
    );
}

function catalogEntry(def) {
    return {
        id: def.id,
        path: def.path,
        cluster: def.cluster,
        instrument: def.instrument,
        minutes: def.minutes,
        questions: Array.isArray(def.questions) ? def.questions.length : (def.questions || 0),
        h1: def.h1,
        lead: def.lead,
        title: def.title
    };
}

function listingFor(cluster) {
    const extra = cluster === 'nutrition'
        ? ['imc', 'tfeq', 'yfas', 'ess', 'who5', 'sf12']
        : ['cbi', 'phq9', 'gad7', 'pss10', 'isi', 'who5', 'sf12'];
    const out = [];
    for (const id of extra) {
        if (id === 'cbi') {
            out.push(catalogEntry(CBI));
            continue;
        }
        const def = getQuiz(id);
        if (def) out.push(catalogEntry(def));
    }
    return out;
}

function resolveRelated(def) {
    const ids = def.related || [];
    const out = [];
    for (const id of ids) {
        if (id === 'cbi') {
            out.push({ href: CBI.path, title: CBI.h1, meta: `${CBI.minutes} min · ${CBI.instrument}` });
            continue;
        }
        const other = getQuiz(id);
        if (other) {
            out.push({
                href: other.path,
                title: `${other.instrument} — ${other.h1.replace(/^Ajuda-nos a perceber |^Como (tem sido|está|é que) /i, '')}`.slice(0, 80),
                meta: `${other.minutes} min · ${other.questions.length} perguntas`
            });
        }
    }
    return out;
}

function clientConfig(def) {
    const scales = (def.scales || []).map((s) => ({
        id: s.id,
        title: s.title,
        note: s.note || '',
        short: s.title,
        icon: SCALE_ICONS[s.id] || SCALE_ICONS.mood
    }));
    const questions = def.questions.map((q) => ({
        id: q.id || q.scale,
        scale: q.scale,
        text: q.text,
        label: (def.scales || []).find((s) => s.id === q.scale)?.title || def.instrument,
        options: questionOptions(def, q),
        reversed: !!q.reversed,
        reverseMax: q.reverseMax,
        crisis: !!q.crisis,
        criterion: q.criterion || null,
        impairment: !!q.impairment,
        input: q.input || 'choice',
        unit: q.unit || '',
        min: q.min,
        max: q.max,
        step: q.step,
        hint: q.hint || '',
        optional: !!q.optional,
        placeholder: q.placeholder || '',
        skipLabel: q.skipLabel || ''
    }));
    return {
        id: def.id,
        instrument: def.instrument,
        path: def.path,
        cluster: def.cluster || '',
        stem: def.stem || '',
        scoring: def.scoring,
        gaugeMax: def.gaugeMax,
        gaugeLabel: def.gaugeLabel,
        displayMultiplier: def.displayMultiplier || 1,
        higherIsBetter: !!def.higherIsBetter,
        bandOn: def.bandOn || 'raw',
        options: def.options || [],
        questions: questions,
        scales: scales,
        bands: def.bands,
        insights: def.insights || {},
        booking: def.booking,
        related: resolveRelated(def),
        disclaimer: def.disclaimer,
        utmCampaign: def.utmCampaign,
        crisisItem: def.questions.some((q) => q.crisis)
    };
}

function utmPair(def, content) {
    const camp = encodeURIComponent(def.utmCampaign || def.id);
    const ref = encodeURIComponent(`${def.id}-quiz`);
    return `ref=${ref}&utm_source=quiz&utm_medium=owned&utm_campaign=${camp}&utm_content=${encodeURIComponent(content)}`;
}

function bookHref(def, which, content) {
    const b = def.booking || {};
    const base = which === 'sub' ? b.subHref : b.consultHref;
    if (!base) return '#';
    const join = base.includes('?') ? '&' : '?';
    return `${base}${join}${utmPair(def, content)}`;
}

function renderQuizPage(origin, def) {
    const o = originOf(origin);
    const cfg = clientConfig(def);
    const n = def.questions.length;
    const canonical = `${o}${def.path}`;
    const title = escapeHtml(def.title);
    const desc = escapeHtml(def.description);
    const h1 = escapeHtml(def.h1);
    const lead = escapeHtml(def.lead);
    const instrument = escapeHtml(def.instrument);
    const cfgJson = JSON.stringify(cfg).replace(/</g, '\\u003c');
    const introLinks = (def.introLinks || [])
        .map((l, i) => `${i ? '<span aria-hidden="true"> · </span>' : ''}<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)} →</a>`)
        .join('');
    const segs = (def.scales || [])
        .map((s) => `<span class="bq-seg" data-seg="${escapeHtml(s.id)}"></span>`)
        .join('');
    const consultHref = escapeHtml(bookHref(def, 'consult', 'results-primary'));
    const consultCard = escapeHtml(bookHref(def, 'consult', 'results-card'));
    const subHref = escapeHtml(bookHref(def, 'sub', 'results-sub'));
    const stickyHref = escapeHtml(bookHref(def, 'consult', 'results-sticky'));
    const b = def.booking || {};
    const waText = encodeURIComponent(`Teste ${def.instrument} gratuito https://www.lonclinic.com${def.path}?utm_source=whatsapp&utm_medium=social&utm_campaign=${def.utmCampaign || def.id}&utm_content=share&ref=${def.id}-share`);
    const copyUrl = escapeHtml(`https://www.lonclinic.com${def.path}?utm_source=share&utm_medium=social&utm_campaign=${def.utmCampaign || def.id}&utm_content=copy&ref=${def.id}-share`);
    const hubHref = def.cluster === 'nutrition' ? '/nutricao/testes' : '/burnout/testes';
    const brandHref = escapeHtml(def.homeHref || '/');
    const brandLabel = escapeHtml(def.homeLabel || 'LON Clinic');
    const startLabel = n <= 6 ? `Começar · ${def.minutes} min` : 'Começar o teste';

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: `Teste ${def.instrument} Lon Clinic`,
            url: canonical,
            applicationCategory: 'HealthApplication',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            inLanguage: 'pt-PT',
            isPartOf: { '@type': 'WebSite', name: 'Lon Clinic', url: o }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'MedicalWebPage',
            name: def.title,
            url: canonical,
            inLanguage: 'pt-PT',
            publisher: { '@id': `${o}/#organization` }
        }
    ];

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
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${o}/image/image2.webp">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:site_name" content="Lon Clinic">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#2f453a">
    <script type="application/ld+json">${JSON.stringify(jsonLd[0])}</script>
    <script type="application/ld+json">${JSON.stringify(jsonLd[1])}</script>
    <link rel="stylesheet" href="/landing.css?v=20260621b">
    <link rel="stylesheet" href="/burnout-quiz.css?v=${CSS_V}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
</head>
<body class="bq-page">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="bq-top">
        <a href="${brandHref}" class="bq-brand" aria-label="${brandLabel}">LON Clinic</a>
        <a href="/patient-portal" class="bq-login">Login</a>
    </header>
    <div class="bq-progress" id="progressWrap" hidden>
        <div class="bq-progress-meta">
            <span id="dimLabelShort">Menos de ${escapeHtml(String(def.minutes))} min</span>
            <b id="stepLabel">Passo 1 de ${n} — 0% concluído</b>
        </div>
        <div class="bq-progress-inner" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="1" aria-label="Progresso do teste" id="progressBarHost">
            ${segs}
        </div>
        <div class="bq-progress-fine" aria-hidden="true"><b id="progressBar"></b></div>
    </div>
    <main id="conteudo-principal" class="bq-main">
        <div class="bq-stage" id="stage">
            <section class="bq-screen is-active" id="intro">
                <div class="bq-intro">
                    <p class="bq-kicker">${instrument} · menos de ${def.minutes} min · ${n} perguntas</p>
                    <h1>${h1}</h1>
                    <p>${lead}</p>
                    ${def.scoring === 'imc' ? `<div class="bq-imc-legend" aria-label="Escala de IMC e perímetro abdominal">
                        <table>
                            <caption>Escala de IMC (OMS, adultos)</caption>
                            <thead><tr><th>IMC</th><th>Classificação</th></tr></thead>
                            <tbody>
                                <tr><td>&lt; 18,5</td><td>Baixo peso</td></tr>
                                <tr><td>18,5 – 24,9</td><td>Peso normal</td></tr>
                                <tr><td>25,0 – 29,9</td><td>Excesso de peso</td></tr>
                                <tr><td>30,0 – 34,9</td><td>Obesidade grau I</td></tr>
                                <tr><td>35,0 – 39,9</td><td>Obesidade grau II</td></tr>
                                <tr><td>≥ 40</td><td>Obesidade grau III</td></tr>
                            </tbody>
                        </table>
                        <table>
                            <caption>Perímetro abdominal — risco cardiovascular</caption>
                            <thead><tr><th></th><th>Mulheres</th><th>Homens</th></tr></thead>
                            <tbody>
                                <tr><td>Aumentado</td><td>≥ 80 cm</td><td>≥ 94 cm</td></tr>
                                <tr><td>Muito aumentado</td><td>≥ 88 cm</td><td>≥ 102 cm</td></tr>
                            </tbody>
                        </table>
                    </div>` : ''}
                    <button type="button" class="bq-btn bq-btn-primary bq-btn-lg" id="startBtn">${startLabel}</button>
                    <p class="bq-intro-more">${introLinks}${introLinks ? '<span aria-hidden="true"> · </span>' : ''}<a href="${hubHref}">Todos os testes →</a></p>
                </div>
            </section>
            <section class="bq-screen" id="quiz" hidden>
                <div class="bq-card">
                    <p class="bq-step-label" id="dimBadge">
                        <span id="dimIcon" aria-hidden="true"></span>
                        <span id="dimLabel">${instrument}</span>
                    </p>
                    <p class="bq-stem" id="stemText"></p>
                    <h2 class="bq-question" id="questionText"></h2>
                    <div class="bq-options" id="options" role="radiogroup" aria-labelledby="questionText"></div>
                    <div class="bq-actions">
                        <button type="button" class="bq-back" id="backBtn">← Pergunta anterior</button>
                    </div>
                </div>
            </section>
            <section class="bq-screen" id="gate" hidden>
                <div class="bq-card">
                    <p class="bq-step-label">Último passo · os seus contactos</p>
                    <h2>O resultado está pronto — onde o enviamos?</h2>
                    <p class="bq-lead">Não pedimos email no início. Agora precisamos do contacto para lhe enviar a análise e, se não concluir a marcação, a coordenação clínica pode esclarecer dúvidas por WhatsApp.</p>
                    <div class="bq-field">
                        <label for="leadName">Primeiro nome</label>
                        <input type="text" id="leadName" autocomplete="given-name" maxlength="80" placeholder="Ana">
                    </div>
                    <div class="bq-field">
                        <label for="email">Email</label>
                        <input type="email" id="email" inputmode="email" autocomplete="email" placeholder="nome@email.com">
                        <p class="bq-error" id="emailError" hidden>Escreve um email válido para continuar.</p>
                    </div>
                    <div class="bq-field">
                        <label for="leadPhone">WhatsApp</label>
                        <input type="tel" id="leadPhone" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="9XX XXX XXX">
                        <p class="bq-error" id="phoneError" hidden>Indica um telemóvel português válido.</p>
                    </div>
                    <p class="bq-privacy">Usamos o email e o WhatsApp para enviar o resultado e acompanhar a marcação. Sem spam.</p>
                    <div class="bq-actions bq-actions--end">
                        <button type="button" class="bq-btn bq-btn-primary" id="revealBtn">Ver o meu resultado</button>
                    </div>
                </div>
            </section>
            <section class="bq-screen" id="processing" hidden>
                <div class="bq-card bq-processing">
                    <div class="bq-processing-spin" aria-hidden="true"></div>
                    <p class="bq-step-label">Análise clínica</p>
                    <h2 id="processingTitle">A analisar o seu perfil…</h2>
                    <p class="bq-lead" id="processingText">A cruzar as respostas com os parâmetros do questionário.</p>
                    <ol class="bq-processing-steps" aria-hidden="true">
                        <li>Respostas</li>
                        <li>Marcadores</li>
                        <li>Faixa clínica</li>
                    </ol>
                </div>
            </section>
            <section class="bq-screen" id="results" hidden>
                <div class="bq-card bq-card--results">
                    <div class="bq-crisis-banner" id="crisisBanner" hidden role="alert">
                        <strong>Se estás em crise ou tens pensamentos de te magoar — não uses este site.</strong>
                        Contacta o <a href="tel:112">112</a>, <a href="tel:808242424">SNS 24</a> ou <a href="tel:213544545">SOS Voz Amiga</a>.
                    </div>
                    <div class="bq-gauge-wrap">
                        <div class="bq-gauge">
                            <svg viewBox="0 0 240 140" aria-hidden="true">
                                <defs>
                                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stop-color="#1f4a3e"/>
                                        <stop offset="100%" stop-color="#3d7a68"/>
                                    </linearGradient>
                                </defs>
                                <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="rgba(16,24,32,.08)" stroke-width="14" stroke-linecap="round"/>
                                <path id="gaugeArc" class="bq-gauge-arc" d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="url(#gaugeGrad)"
                                    stroke-width="14" stroke-linecap="round" stroke-dasharray="314.16" stroke-dashoffset="314.16"></path>
                            </svg>
                            <div class="bq-gauge-num" id="scoreNum">0</div>
                            <div class="bq-gauge-sub" id="gaugeSub">${escapeHtml(def.gaugeLabel || instrument)}</div>
                        </div>
                    </div>
                    <div class="bq-band">
                        <span class="bq-pill" id="bandPill"></span>
                        <h2 id="bandTitle"></h2>
                        <p id="bandText"></p>
                    </div>
                    <div class="bq-book-now" id="bookNow">
                        <div class="bq-hold" id="quizHold" hidden>
                            <p class="bq-hold-kicker">1.ª consulta médica</p>
                            <p class="bq-hold-time" id="quizHoldLabel">A carregar o próximo horário…</p>
                            <p class="bq-hold-timer">Reservável durante <b id="quizHoldClock">15:00</b></p>
                        </div>
                        <a class="bq-btn bq-btn-primary bq-btn-lg js-quiz-book" id="bookBtnPrimary" href="${consultHref}" data-pay-badges>${escapeHtml(b.consultName || 'Marcar consulta')}</a>
                        <p class="bq-book-now-note" id="bookNowNote">Videoconsulta · o resultado do teste fica associado à marcação</p>
                        <p class="bq-buy-trust" id="quizTrust">🔒 Pagamento seguro · MB WAY e Multibanco<br>🩺 Consulta agendada imediatamente após o pagamento</p>
                    </div>
                    <div class="bq-scales" id="scales"></div>
                    <div class="bq-insights" id="insights"></div>
                    <div class="bq-cta">
                        <h3>O próximo passo</h3>
                        <p id="ctaText"></p>
                        <div class="bq-plan-grid">
                            <a class="bq-plan-card js-quiz-book" href="${consultCard}" id="bookBtn">
                                <span class="bq-plan-name">${escapeHtml(b.consultName || 'Consulta')}</span>
                                <span class="bq-plan-price">${escapeHtml(b.consultPrice || '')}<span class="bq-plan-currency">€</span></span>
                                <span class="bq-plan-meta">${escapeHtml(b.consultMeta || '')}</span>
                            </a>
                            <a class="bq-plan-card js-quiz-book" href="${subHref}" id="subBtn">
                                <span class="bq-plan-name">${escapeHtml(b.subName || '')}</span>
                                <span class="bq-plan-price">${escapeHtml(b.subPrice || '')}<span class="bq-plan-currency">€</span></span>
                                <span class="bq-plan-meta">${escapeHtml(b.subMeta || '')}</span>
                            </a>
                        </div>
                    </div>
                    <div class="bq-related" id="related"></div>
                    <div class="lon-share" role="group" aria-label="Partilhar o teste">
                        <span class="lon-share-label">Partilhar o teste</span>
                        <a href="https://wa.me/?text=${waText}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        <button type="button" class="lon-share-copy" data-copy="${copyUrl}">Copiar link</button>
                    </div>
                    <p class="bq-disclaimer">${escapeHtml(def.disclaimer)}</p>
                    <div class="bq-restart">
                        <button type="button" class="bq-back" id="restartBtn">↺ Repetir o teste</button>
                    </div>
                </div>
            </section>
        </div>
        <aside class="bq-crisis-foot" aria-label="Aviso de crise">
            <p>Se estás em crise ou outra pessoa possa estar em perigo — <strong>não uses este site</strong>. Contacta o <a href="tel:112">112</a>, <a href="tel:808242424">SNS 24</a> ou <a href="tel:213544545">SOS Voz Amiga</a>.</p>
            <p class="bq-ssl" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="1.8"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Ligação segura
            </p>
        </aside>
    </main>
    <footer class="bq-footer">
        <nav aria-label="Rodapé">
            <a href="/">Início</a>
            <a href="/burnout">Burnout</a>
            <a href="/nutricao">Nutrição</a>
            <a href="${hubHref}">Testes</a>
            <a href="/faq">FAQ</a>
            <a href="/info.html?page=politica-privacidade">Privacidade</a>
        </nav>
        <p>© 2026 Lon Clinic · ERS 45475</p>
    </footer>
    <aside class="bq-sticky-book" id="stickyBook" hidden>
        <p>${escapeHtml(b.stickyLabel || b.consultName || 'Marcar consulta')}</p>
        <a class="bq-btn bq-btn-primary js-quiz-book" id="stickyBookBtn" href="${stickyHref}">Marcar · ${escapeHtml(b.consultPrice || '')}€</a>
    </aside>
    <script>window.CLINICAL_QUIZ = ${cfgJson};</script>
    <script src="/lon-analytics.js?v=20260905i" defer></script>
    <script src="/lon-slots.js?v=20260905i" defer></script>
    <script src="/clinical-quiz-score.js?v=${JS_V}" defer></script>
    <script src="/clinical-quiz.js?v=${JS_V}" defer></script>
</body>
</html>`;
}

function renderHub(origin, cluster) {
    const o = originOf(origin);
    const isNu = cluster === 'nutrition';
    const items = listingFor(isNu ? 'nutrition' : 'burnout');
    const canonicalPath = isNu ? '/nutricao/testes' : '/burnout/testes';
    const title = isNu
        ? 'Testes de nutrição e metabolismo | Lon Clinic'
        : 'Testes de burnout, stress e sono | Lon Clinic';
    const description = isNu
        ? 'Questionários clínicos grátis: IMC e cintura, TFEQ-R18, YFAS 2.0, ESS, WHO-5 e qualidade de vida. Resultado imediato para orientar a consulta de nutrição.'
        : 'Questionários clínicos grátis: burnout (CBI), PHQ-9, GAD-7, PSS-10, ISI, WHO-5 e qualidade de vida. Resultado imediato.';
    const h1 = isNu ? 'Testes de alimentação, sono e metabolismo' : 'Testes de burnout, humor, stress e sono';
    const lead = isNu
        ? 'Os mesmos instrumentos que usamos na consulta de nutrição: IMC e quilos a perder, comportamento alimentar, compulsão, sonolência (alerta de apneia) e bem-estar. Grátis, resultado imediato, sem substituto de diagnóstico.'
        : 'Os mesmos instrumentos que usamos na clínica anti-burnout: esgotamento, depressão, ansiedade, stress percebido, insónia e bem-estar. Grátis, resultado imediato, sem substituto de diagnóstico.';
    const cards = items.map((it) => `
        <a class="bq-hub-card" href="${escapeHtml(it.path)}">
            <span class="bq-hub-card-kicker">${escapeHtml(it.instrument)} · ${it.minutes} min · ${it.questions} perguntas</span>
            <span class="bq-hub-card-title">${escapeHtml(it.h1)}</span>
            <span class="bq-hub-card-lead">${escapeHtml(it.lead)}</span>
        </a>`).join('');

    return `<!DOCTYPE html>
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
    <link rel="canonical" href="${o}${canonicalPath}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${o}${canonicalPath}">
    <meta name="theme-color" content="#2f453a">
    <link rel="stylesheet" href="/landing.css?v=20260621b">
    <link rel="stylesheet" href="/burnout-quiz.css?v=${CSS_V}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>">
</head>
<body class="bq-page">
    <header class="bq-top">
        <a href="${isNu ? '/nutricao' : '/burnout'}" class="bq-brand">LON Clinic</a>
        <a href="/patient-portal" class="bq-login">Login</a>
    </header>
    <main class="bq-main">
        <div class="bq-intro bq-hub-intro">
            <h1>${escapeHtml(h1)}</h1>
            <p>${escapeHtml(lead)}</p>
            ${isNu ? '<p><a href="/nutricao/avaliacao">Avaliação metabólica (2 min)</a> — o questionário do programa de 6 meses. Ou os testes clínicos abaixo.</p>' : ''}
        </div>
        <div class="bq-hub-grid">${cards}</div>
        <aside class="bq-crisis-foot">
            <p>Se estás em crise — <strong>não uses estes testes</strong>. Contacta o <a href="tel:112">112</a>, <a href="tel:808242424">SNS 24</a> ou <a href="tel:213544545">SOS Voz Amiga</a>.</p>
        </aside>
    </main>
    <footer class="bq-footer">
        <nav>
            <a href="/">Início</a>
            <a href="/burnout">Burnout</a>
            <a href="/nutricao">Nutrição</a>
            <a href="/faq">FAQ</a>
        </nav>
        <p>© 2026 Lon Clinic · ERS 45475</p>
    </footer>
</body>
</html>`;
}

function sitemapPaths() {
    const paths = ['/burnout/testes', '/nutricao/testes'];
    for (const def of listQuizzes()) paths.push(def.path);
    return paths;
}

function buildEmails(def, data, helpers) {
    const escape = helpers.escapeHtml;
    const emailLink = helpers.emailLink;
    const site = helpers.siteUrl;
    const scored = data.scored;
    const band = scored.band || {};
    const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
    const bookUrl = emailLink(`${site}${def.booking.consultHref}`, `${def.id}-quiz-email`, 'book-consult');
    const subUrl = def.booking.subHref
        ? emailLink(`${site}${def.booking.subHref}`, `${def.id}-quiz-email`, 'book-sub')
        : '';
    const extra = scored.extra || {};
    const waistRiskLabel = extra.waistRisk === 'very'
        ? 'risco muito aumentado'
        : extra.waistRisk === 'increased'
            ? 'risco aumentado'
            : extra.waistRisk === 'ok'
                ? 'abaixo do limiar de risco'
                : 'não indicada';
    const displayNum = String(scored.display).replace('.', ',');
    const display = extra.bmi
        ? `${displayNum} kg/m²`
        : (scored.displayMax ? `${scored.display}/${scored.displayMax}` : displayNum);
    const extraLines = extra.bmi
        ? [
            `IMC: ${displayNum} kg/m²`,
            `Peso: ${String(extra.weight).replace('.', ',')} kg · altura: ${String(extra.heightM).replace('.', ',')} m`,
            extra.kgToLose ? `A perder até IMC 24,9: ${String(extra.kgToLose).replace('.', ',')} kg (alvo ${String(extra.healthyMax).replace('.', ',')} kg)` : '',
            extra.kgToGain ? `A ganhar até IMC 18,5: ${String(extra.kgToGain).replace('.', ',')} kg` : '',
            extra.waist ? `Cintura: ${String(extra.waist).replace('.', ',')} cm (${waistRiskLabel})` : 'Cintura: não indicada',
            `Faixa normal: ${String(extra.healthyMin).replace('.', ',')}–${String(extra.healthyMax).replace('.', ',')} kg`
        ].filter(Boolean)
        : [];
    const pill = band.pill || '';
    const scaleLines = (def.scales || []).map((s) => {
        const v = scored.scales[s.id];
        return `${s.title}: ${v ? v.value : '—'}%`;
    });
    const crisisLine = scored.crisis
        ? '⚠️ PRIORIDADE — item de risco (PHQ-9 Q9) ≥ 1'
        : '';

    const clinicSubject = `${scored.crisis ? '⚠️ ' : ''}Teste ${def.instrument}: ${pill} (${display}) — ${data.email}`;
    const clinicText = [
        `Novo resultado — ${def.instrument} (Lon Clinic)`,
        crisisLine,
        '',
        `Email: ${data.email}`,
        data.firstName ? `Nome: ${data.firstName}` : '',
        data.phone ? `WhatsApp: ${data.phone}` : '',
        `Resultado: ${display} (${pill})`,
        extraLines.join('\n'),
        scaleLines.filter((l) => !extra.bmi).join(' · '),
        '',
        `Consulta: ${bookUrl}`
    ].filter(Boolean).join('\n');

    const clinicHtml = `<!DOCTYPE html><html lang="pt"><body style="font-family:${font};line-height:1.5;color:#1c2a24;background:#f3f1ec;padding:24px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5c6d64">Novo resultado</p>
<h2 style="margin:0 0 16px;font-size:20px">${escape(def.instrument)}</h2>
${scored.crisis ? '<p style="background:#f6e8e4;padding:10px 12px;border-radius:8px;color:#6b3a2e"><strong>Prioridade clínica</strong> — item de risco assinalado.</p>' : ''}
<p><strong>Email:</strong> ${escape(data.email)}</p>
${data.firstName ? `<p><strong>Nome:</strong> ${escape(data.firstName)}</p>` : ''}
${data.phone ? `<p><strong>WhatsApp:</strong> ${escape(data.phone)}</p>` : ''}
<p><strong>Resultado:</strong> ${escape(String(display))} · ${escape(pill)}</p>
<p style="font-size:14px;color:#3d4a44">${escape(band.title || '')}</p>
${extraLines.length ? `<p style="font-size:14px;color:#3d4a44">${extraLines.map((l) => escape(l)).join('<br>')}</p>` : ''}
<p style="margin:20px 0 0"><a href="${escape(bookUrl)}" style="color:#255235">Marcar consulta</a></p>
</td></tr></table></body></html>`;

    const userSubject = `O teu resultado ${def.instrument}: ${pill}`;
    const userText = [
        'Olá,',
        '',
        `Obrigada por completares o ${def.instrument} da Lon Clinic.`,
        '',
        `Resultado: ${display} — ${band.title || pill}`,
        extraLines.join('\n'),
        '',
        band.text || '',
        '',
        band.cta || '',
        '',
        `Marcar: ${bookUrl}`,
        subUrl ? `Outra opção: ${subUrl}` : '',
        '',
        def.disclaimer,
        '',
        'Se estás em crise: 112 · SNS 24 808 24 24 24 · SOS Voz Amiga 213 544 545',
        '',
        'Lon Clinic',
        'www.lonclinic.com'
    ].filter((x) => x !== '').join('\n');

    const userHtml = `<!DOCTYPE html><html lang="pt"><body style="margin:0;padding:0;background:#f3f1ec;font-family:${font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="text-align:center;padding:0 0 28px">
<p style="margin:0;font-size:22px;font-weight:700;color:#1c2a24">LON Clinic</p>
<p style="margin:6px 0 0;font-size:11px;color:#7a8a82;text-transform:uppercase;letter-spacing:0.16em">${escape(def.instrument)}</p>
</td></tr>
<tr><td style="background:#fff;border-radius:18px;padding:36px 32px;box-shadow:0 8px 28px rgba(28,42,36,0.06)">
<p>Olá,</p>
<p>Obrigada por completares o <strong>${escape(def.instrument)}</strong> da Lon Clinic.</p>
<p style="font-size:42px;font-weight:700;letter-spacing:-0.04em;margin:12px 0 4px">${escape(displayNum)}${scored.displayMax ? `<span style="font-size:16px;color:#5c6d64"> / ${escape(String(scored.displayMax))}</span>` : (extra.bmi ? '<span style="font-size:16px;color:#5c6d64"> kg/m²</span>' : '')}</p>
<p style="font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:12px;color:#255235">${escape(pill)}</p>
<p>${escape(band.title || '')}</p>
<p style="color:#3d4a44">${escape(band.text || '')}</p>
<p>${escape(band.cta || '')}</p>
<p><a href="${escape(bookUrl)}" style="display:inline-block;background:#2f6342;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Marcar consulta</a></p>
${scored.crisis ? '<p style="background:#f6e8e4;padding:12px;border-radius:8px;color:#6b3a2e">Se estás em crise: <strong>112</strong> · SNS 24 <strong>808 24 24 24</strong> · SOS Voz Amiga <strong>213 544 545</strong>.</p>' : ''}
<p style="font-size:12px;color:#5c6d64">${escape(def.disclaimer)}</p>
</td></tr>
<tr><td style="padding:28px 8px;text-align:center;font-size:12px;color:#7a8a82">Lon Clinic · <a href="${escape(site)}" style="color:#7a8a82">www.lonclinic.com</a></td></tr>
</table></td></tr></table>
</body></html>`;

    return {
        clinic: { subject: clinicSubject, text: clinicText, html: clinicHtml },
        user: { subject: userSubject, text: userText, html: userHtml }
    };
}

module.exports = {
    getQuiz,
    getQuizByPath,
    listQuizzes,
    listingFor,
    sitemapPaths,
    renderQuizPage,
    renderHub,
    scoreQuiz,
    validateAnswers: require('./clinical-quiz-score').validateAnswers,
    clientConfig,
    buildEmails,
    CBI
};
