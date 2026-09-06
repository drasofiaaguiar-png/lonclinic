/* ========================================
   Longevity Clinic — Express + Stripe + Email Server
======================================== */

require('dotenv').config();

function requireEnv(name) {
    const raw = process.env[name];
    if (raw === undefined || String(raw).trim() === '') {
        console.error(`\n❌ FATAL: Required environment variable "${name}" is not set or is empty.`);
        console.error(`   Set ${name} in your environment or .env file before starting the server.\n`);
        process.exit(1);
    }
    return String(raw).trim();
}

const SESSION_SECRET = requireEnv('SESSION_SECRET');
const CLINIC_USERNAME = requireEnv('CLINIC_USERNAME');
const CLINIC_PASSWORD = requireEnv('CLINIC_PASSWORD');

const bcrypt = require('bcrypt');
// Hash the plaintext password from env at startup for constant-time comparison at login.
let clinicPasswordHash = null;
bcrypt.hash(CLINIC_PASSWORD, 12).then(h => { clinicPasswordHash = h; });

const db = require('./db');
const analyticsNet = require('./analytics-network');
const { computeCheckoutTotalCents, isStripeSubscriptionService, normalizeServiceKey } = require('./pricing');

function bookingServiceTag(raw) {
    const key = normalizeServiceKey(raw);
    if (key) return key;
    const s = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .slice(0, 80);
    return s || 'unspecified';
}
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const guide = require('./guide');
const burnoutPages = require('./burnout-pages');
const clinicalQuizzes = require('./clinical-quizzes');
const consultaPages = require('./consulta-pages');
const queixas = require('./queixas');
const nutricao = require('./nutricao');
const touristPages = require('./tourist-pages');
const producers = require('./producers');
const wellness = require('./wellness');
const seo = require('./seo');
const { emailLink, withUtm, datedCampaign, TRACKED_REDIRECTS, safeInternalPath, trackedLinksForAdmin } = require('./utm');
const nutricaoNurture = require('./nutricao-nurture');
const { hydrateInfoHtml, NOINDEX_PAGES: INFO_NOINDEX_PAGES } = require('./info-ssr');
const authors = require('./authors');
const cvi = require('./cvi');
const nodemailer = require('nodemailer');
const multer = require('multer');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const isStripeConfigured = STRIPE_SECRET && 
    !STRIPE_SECRET.includes('your_secret_key_here') &&
    (STRIPE_SECRET.startsWith('sk_live_') || STRIPE_SECRET.startsWith('sk_test_'));
let stripe;
if (isStripeConfigured) {
    stripe = require('stripe')(STRIPE_SECRET);
} else if (STRIPE_SECRET) {
    console.log('   ⚠️  Stripe key found but invalid format. Should start with sk_live_ or sk_test_');
    console.log('   ⚠️  Current key starts with:', STRIPE_SECRET.substring(0, 7) || 'EMPTY');
}

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway, Render, etc.)
const PORT = process.env.PORT || 3000;

/** Stripe checkout session IDs in logs — last 8 chars only (no PII). */
function stripeSessionIdSuffixForLog(id) {
    const s = String(id || '');
    if (!s) return '(none)';
    return s.length <= 8 ? '***' : s.slice(-8);
}

async function createStripeCheckoutSession(sessionParams) {
    return stripe.checkout.sessions.create(sessionParams);
}

const rateLimitClinicLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many login attempts. Try again in a few minutes.' });
    }
});

const rateLimitContact = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many contact requests. Try again later.' });
    }
});

const rateLimitBurnoutQuiz = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Demasiados pedidos. Tenta novamente mais tarde.' });
    }
});

const rateLimitTriagem = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Demasiados pedidos. Tenta novamente mais tarde.' });
    }
});

const rateLimitTriagemAlert = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests.' });
    }
});

const rateLimitReviews = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many review submissions. Try again later.' });
    }
});

const rateLimitAnalytics = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(204).end();
    }
});

const rateLimitNextSlots = rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !!peekNextSlotsCache(req),
    handler: (req, res) => {
        const stale = peekNextSlotsCache(req);
        if (stale) {
            res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
            res.set('X-Slots-Cache', 'STALE');
            return res.json(stale);
        }
        res.status(429).json({ error: 'Too many requests.', slots: [], withinHours: 24 });
    }
});

const rateLimitSlotHold = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many slot reservations. Try again later.' });
    }
});

const rateLimitCheckout = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many checkout attempts. Try again later.' });
    }
});

const rateLimitSessionRetrieve = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
});

const rateLimitIntake = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
});

const rateLimitRecrutamentoPsicologia = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Demasiadas candidaturas. Tente novamente mais tarde.' });
    }
});

const rateLimitRecrutamentoEntrevista = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Demasiadas marcações. Tente novamente mais tarde.' });
    }
});

const rateLimitProducerApply = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Demasiadas candidaturas. Tente novamente mais tarde.' });
    }
});

const rateLimitStaffProfile = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many profile updates. Try again in a few minutes.' });
    }
});

/* ========================================
   SECURITY HEADERS (CSP, HSTS, etc.)
======================================== */
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://www.googletagmanager.com',
                    'https://www.google-analytics.com',
                    'https://ssl.google-analytics.com',
                    'https://js.stripe.com',
                    'https://cdnjs.cloudflare.com'
                ],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: [
                    "'self'",
                    'https://api.stripe.com',
                    'https://m.stripe.network',
                    'https://www.google-analytics.com',
                    'https://region1.google-analytics.com',
                    'https://www.googletagmanager.com',
                    'https://analytics.google.com',
                    'https://stats.g.doubleclick.net'
                ],
                frameSrc: [
                    "'self'",
                    'https://js.stripe.com',
                    'https://hooks.stripe.com',
                    'https://checkout.stripe.com'
                ],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'self'"],
                upgradeInsecureRequests: []
            }
        },
        strictTransportSecurity: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: false
        }
    })
);

const ANALYTICS_SNIPPET =
    '\n<script src="/lon-analytics.js?v=20260906e" defer></script>\n' +
    '<noscript><img src="/api/a.gif?n=page_view" alt="" width="1" height="1"></noscript>\n';
function injectAnalyticsHtml(html) {
    if (!html || typeof html !== 'string') return html;
    if (html.includes('lon-analytics.js')) return html;
    if (/data-admin-panel-content|id="clinicPortal"|id="patientDashboard"/.test(html)) return html;
    const bodyAt = html.lastIndexOf('</body>');
    if (bodyAt !== -1) return html.slice(0, bodyAt) + ANALYTICS_SNIPPET + html.slice(bodyAt);
    const headAt = html.lastIndexOf('</head>');
    if (headAt !== -1) return html.slice(0, headAt) + ANALYTICS_SNIPPET + html.slice(headAt);
    return html + ANALYTICS_SNIPPET;
}

function injectPublicHtml(html, req) {
    return injectAnalyticsHtml(seo.applyHtmlSeo(html, req));
}

app.use((req, res, next) => {
    const origSend = res.send.bind(res);
    res.send = function (body) {
        if (typeof body === 'string' && /<html[\s>]/i.test(body)) {
            body = injectPublicHtml(body, req);
        }
        return origSend(body);
    };
    const origSendFile = res.sendFile.bind(res);
    res.sendFile = function (filePath, options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = undefined;
        }
        const fp = String(filePath || '');
        if (!/\.html$/i.test(fp)) {
            return origSendFile(filePath, options, cb);
        }
        fs.readFile(fp, 'utf8', (err, html) => {
            if (err) return origSendFile(filePath, options, cb);
            if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
            origSend(injectPublicHtml(html, req));
            if (typeof cb === 'function') cb();
        });
    };
    next();
});

/* ========================================
   SESSION CONFIGURATION
======================================== */
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
}));

/* ========================================
   DOXY.ME CONFIGURATION
======================================== */
const DOXY_DEFAULT_PATIENT_ROOM = 'https://doxy.me/lonclinic/ritaaguiar';
const DOXY_ROOM_URL = process.env.DOXY_ROOM_URL || DOXY_DEFAULT_PATIENT_ROOM;
const DOXY_PROVIDER_URL = 'https://doxy.me';

function normalizeDoxyRoomUrl(raw) {
    let s = String(raw || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) {
        s = s.replace(/^https?:\/\//i, '');
        s = s.replace(/^www\./i, '');
        s = s.replace(/^doxy\.me\/?/i, '');
        s = 'https://doxy.me/' + s.replace(/^\/+/, '');
    }
    try {
        const u = new URL(s);
        if (!/^(www\.)?doxy\.me$/i.test(u.hostname)) return '';
        u.protocol = 'https:';
        u.hostname = 'doxy.me';
        u.hash = '';
        u.search = '';
        const path = u.pathname.replace(/\/+$/, '');
        if (!path || path === '/') return '';
        return `https://doxy.me${path}`;
    } catch {
        return '';
    }
}

function patientDoxyRoomUrl(raw) {
    const normalized = normalizeDoxyRoomUrl(raw || DOXY_DEFAULT_PATIENT_ROOM);
    // Clinic lobby without a provider — confirmation emails and the dashboard
    // send patients to Rita's room.
    if (!normalized || normalized === 'https://doxy.me/lonclinic') {
        return DOXY_DEFAULT_PATIENT_ROOM;
    }
    return normalized;
}

const DEFAULT_DOXY_ROOM_URL = patientDoxyRoomUrl(DOXY_ROOM_URL);

function publicProfessional(pro) {
    if (!pro) return null;
    return {
        id: pro.id,
        username: pro.username,
        displayName: pro.displayName,
        doxyRoomUrl: pro.doxyRoomUrl || '',
        email: pro.email || '',
        active: pro.active !== false,
        createdAt: pro.createdAt || null,
        updatedAt: pro.updatedAt || null
    };
}

/* ========================================
   CONTACT EMAIL CONFIGURATION
======================================== */
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@lonclinic.com';
const CLINIC_WHATSAPP = String(process.env.CLINIC_WHATSAPP || '351928372775').replace(/\D/g, '');

/* ========================================
   CLINIC PORTAL AUTHENTICATION
======================================== */

function isAdminSession(req) {
    if (!req || !req.session || !req.session.clinicAuthenticated) return false;
    const role = req.session.clinicRole;
    // Legacy sessions (before per-professional logins) were always the env admin.
    return !role || role === 'admin';
}

const STAFF_DEVICE_COOKIE = 'lon_staff';
const STAFF_DEVICE_TTL_SEC = 400 * 86400;
const STAFF_DEVICE_TOKEN = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update('lon-staff-device-v1')
    .digest('hex')
    .slice(0, 32);
const STAFF_IPS = String(process.env.ANALYTICS_STAFF_IPS || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

function requestClientIp(req) {
    return String(
        (req && req.headers && (req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0])) ||
            (req && req.ip) ||
            ''
    ).trim();
}

function hasStaffDeviceCookie(req) {
    return readCookie(req, STAFF_DEVICE_COOKIE) === STAFF_DEVICE_TOKEN;
}

function ipIsStaff(req) {
    return STAFF_IPS.length > 0 && STAFF_IPS.includes(requestClientIp(req));
}

function setStaffDeviceCookie(res) {
    if (!res || typeof res.append !== 'function') return;
    setAnalyticsCookie(res, STAFF_DEVICE_COOKIE, STAFF_DEVICE_TOKEN, STAFF_DEVICE_TTL_SEC);
}

function wantsStaffDeviceMark(req) {
    const v = String((req && req.query && req.query.internal) || '').toLowerCase();
    return v === '1' || v === 'staff';
}

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.clinicAuthenticated) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
}

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.clinicAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isAdminSession(req)) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
}

function safeInternalNextPath(raw) {
    const s = String(raw || '');
    if (!s.startsWith('/diretorio')) return '';
    if (s.startsWith('//') || s.includes('\\') || s.includes('://') || s.length > 200) return '';
    return s;
}

function requireAdminPage(req, res, next) {
    if (isAdminSession(req)) return next();
    if (req.session && req.session.clinicAuthenticated) {
        return res.redirect(302, '/clinic-portal');
    }
    const nextPath = safeInternalNextPath(req.originalUrl || '/diretorio') || '/diretorio';
    return res.redirect(302, `/admin?next=${encodeURIComponent(nextPath)}`);
}

function isStaffRequest(req) {
    if (!req) return false;
    if (req.session && req.session.clinicAuthenticated) return true;
    if (hasStaffDeviceCookie(req)) return true;
    if (wantsStaffDeviceMark(req)) return true;
    return ipIsStaff(req);
}

function staffAuthPayload(req) {
    const authenticated = !!(req.session && req.session.clinicAuthenticated);
    if (!authenticated) {
        return { authenticated: false, username: null, displayName: null, role: null };
    }
    return {
        authenticated: true,
        username: req.session.clinicUsername || null,
        displayName: req.session.clinicDisplayName || req.session.clinicUsername || null,
        role: req.session.clinicRole || 'admin'
    };
}

function sendHtmlNoCache(res, filePath, onErrorMessage) {
    res.set({
        'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store'
    });
    res.sendFile(filePath, {
        etag: false,
        lastModified: false,
        cacheControl: false
    }, (err) => {
        if (err) {
            console.error(`❌ Error sending ${path.basename(filePath)}:`, err.message);
            res.status(500).send(onErrorMessage);
        }
    });
}

/** Cloudflare caches anonymous HTML for ~4h (HIT + max-age=14400). A Set-Cookie
 *  makes the response DYNAMIC, matching /admin. Harmless 60s marker only. */
function sendStaffHtmlNoCache(res, filePath, onErrorMessage) {
    res.append('Set-Cookie', 'lon_nocache=1; Path=/; Max-Age=60; SameSite=Lax; Secure; HttpOnly');
    sendHtmlNoCache(res, filePath, onErrorMessage);
}

function sendHtmlNoCacheString(res, html, statusCode) {
    res.status(statusCode || 200).set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store'
    });
    res.type('html').send(html);
}

/* ========================================
   BOOKINGS + CLINICAL NOTES
   PostgreSQL (Supabase) when DATABASE_URL is set; otherwise in-memory.
======================================== */
const usePersistentDb = db.isDatabaseEnabled();
const bookingsStore = []; // memory fallback only
const reviewsStore = []; // memory fallback for patient reviews
const clinicalNotesStore = []; // memory fallback only
const psychologistApplicationsStore = []; // memory fallback for recrutamento
const professionalsStore = []; // memory fallback for clinician accounts + Doxy rooms
const producersStore = []; // memory fallback for organic producers directory
const staffProfilesStore = new Map();
const staffPhotosStore = new Map();
const staffDocumentsStore = [];
const staffInvoicesStore = new Map();
const staffMonthAvailStore = new Map();
let professionalIdSeq = 1;
let staffDocumentIdSeq = 1;

const STAFF_PROFESSIONS = {
    medico: 'Número da Ordem dos Médicos',
    nutricionista: 'Número da Ordem dos Nutricionistas',
    psicologo: 'Número da Ordem dos Psicólogos'
};

const STAFF_DOCUMENT_KINDS = {
    identificacao: 'Cartão de Cidadão',
    cartao_ordem: 'Cópia da cédula',
    cv: 'CV',
    seguro: 'Seguro de responsabilidade civil',
    contrato: 'Contrato'
};
const STAFF_DOC_OPTIONAL_VALIDITY = new Set(['cv']);

const STAFF_CLINICAL_AREAS = {
    medico: [
        {
            group: 'Áreas clínicas',
            items: [
                'Clínica geral',
                'Medicina interna',
                'Saúde mental',
                'Burnout',
                'Consulta do viajante',
                'Longevidade',
                'Saúde da mulher',
                'Pediatria',
                'Doença aguda / urgente',
                'Renovação de receita'
            ]
        }
    ],
    psicologo: [
        {
            group: 'Neurodesenvolvimento e saúde mental geral',
            items: [
                'Neurodesenvolvimento no adulto (autismo, PHDA, etc.) — avaliação/testes',
                'Neurodesenvolvimento no adulto (autismo, PHDA, etc.) — acompanhamento',
                'Ansiedade',
                'Depressão',
                'Burnout',
                'Trauma',
                'Perturbação obsessivo-compulsiva (POC)',
                'Perturbação de pânico / fobias',
                'Insónia (abordagem cognitivo-comportamental)',
                'Dependências comportamentais (jogo, ecrãs/redes sociais)'
            ]
        },
        {
            group: 'Relacionamentos e família',
            items: [
                'LGBT',
                'Relacionamentos',
                'Questões familiares',
                'Sexologia / disfunções sexuais',
                'Coaching parental'
            ]
        },
        {
            group: 'Alimentação e imagem corporal',
            items: [
                'Distúrbio alimentar (incluindo excesso de peso)'
            ]
        },
        {
            group: 'Ciclo de vida e saúde hormonal',
            items: [
                'Sintomas psicológicos da menopausa/perimenopausa (humor, cognição)',
                'Stress relacionado com fertilidade/PMA',
                'Luto perinatal (perda gestacional)',
                'Depressão pós-parto',
                'Ajustamento a doença crónica'
            ]
        },
        {
            group: 'Outros',
            items: [
                'Luto (geral)',
                'Transições de vida / questões existenciais e de identidade',
                'Saúde mental de expatriados (choque cultural, adaptação)'
            ]
        }
    ],
    nutricionista: [
        {
            group: 'Gastrointestinal',
            items: [
                'SIBO',
                'DII (Doença Inflamatória Intestinal)',
                'SII (Síndrome do Intestino Irritável)',
                'Gluten free',
                'Lactose free',
                'Intolerância à histamina'
            ]
        },
        {
            group: 'Metabólico e clínico',
            items: [
                'Perda de peso',
                'Diabetes',
                'Doenças cardiovasculares (colesterol, hipertensão)',
                'Fígado gordo / NAFLD',
                'Doença renal (dieta renal)',
                'Protocolos autoimunes (Hashimoto, tiroide)'
            ]
        },
        {
            group: 'Hormonal / ciclo de vida',
            items: [
                'Endometriose',
                'Menopausa',
                'SOP (Síndrome do Ovário Policístico)',
                'Fertilidade / nutrição pré-conceção',
                'Gravidez e pós-parto',
                'Andropausa'
            ]
        },
        {
            group: 'Desporto',
            items: [
                'Nutrição desportiva lúdica',
                'Nutrição desportiva profissional'
            ]
        },
        {
            group: 'Outros',
            items: [
                'Nutrição bariátrica (pré/pós-cirurgia)',
                'Nutrição vegan/vegetariana (transição)',
                'Nutrição e pele (acne, eczema)',
                'Nutrição de viagem (jet lag, problemas digestivos em viagem)',
                'Nutrição para profissionais/executivos com pouco tempo'
            ]
        }
    ]
};

function parseStaffAreaList(value) {
    if (Array.isArray(value)) {
        const seen = new Set();
        const out = [];
        for (const raw of value) {
            const item = String(raw || '').trim().slice(0, 160);
            if (!item || seen.has(item)) continue;
            seen.add(item);
            out.push(item);
            if (out.length >= 80) break;
        }
        return out;
    }
    const s = String(value || '').trim();
    if (!s) return [];
    if (s.startsWith('[')) {
        try {
            return parseStaffAreaList(JSON.parse(s));
        } catch {
            /* keep as a single legacy value */
        }
    }
    return [s.slice(0, 160)];
}

function flattenClinicalAreaItems(profession) {
    const groups = STAFF_CLINICAL_AREAS[profession] || [];
    return groups.flatMap((group) => (group && Array.isArray(group.items) ? group.items : []));
}

const STAFF_AREA_ALIASES = {
    'Stress / burnout': 'Burnout',
    'Luto': 'Luto (geral)',
    'Parentalidade': 'Coaching parental',
    'Perturbações alimentares': 'Distúrbio alimentar (incluindo excesso de peso)',
    'Relações interpessoais': 'Relacionamentos',
    'Relações de casal': 'Relacionamentos',
    'Emagrecimento': 'Perda de peso',
    'Nutrição desportiva': 'Nutrição desportiva lúdica'
};

function allKnownClinicalAreas() {
    const known = new Set();
    for (const profession of Object.keys(STAFF_CLINICAL_AREAS)) {
        for (const item of flattenClinicalAreaItems(profession)) known.add(item);
    }
    return known;
}

function sanitizeStaffAreas(profession, values, disallowed) {
    const blocked = new Set(disallowed || []);
    const allowed = new Set(flattenClinicalAreaItems(profession));
    const known = allKnownClinicalAreas();
    const seen = new Set();
    const out = [];
    for (const raw of parseStaffAreaList(values)) {
        const item = STAFF_AREA_ALIASES[raw] || raw;
        if (!item || blocked.has(item) || seen.has(item)) continue;
        if (profession && allowed.size && !allowed.has(item) && known.has(item)) continue;
        seen.add(item);
        out.push(item);
        if (out.length >= 80) break;
    }
    return out;
}

function isoDateOrEmpty(value) {
    const s = String(value || '').trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function staffSessionUsername(req) {
    return String((req.session && req.session.clinicUsername) || '').trim().toLowerCase();
}

function emptyStaffProfile(username) {
    return {
        username: String(username || '').trim().toLowerCase(),
        profession: '',
        ordemNumber: '',
        fullName: '',
        nif: '',
        citizenCard: '',
        address: '',
        insurer: '',
        insurancePolicy: '',
        insuranceValidUntil: '',
        bio: '',
        credentials: '',
        iban: '',
        payoutsFromMonth: '',
        primaryAreas: [],
        secondaryAreas: [],
        hasPhoto: false,
        updatedAt: null
    };
}

function normalizeStaffProfileFields(fields, existing) {
    const prev = existing || emptyStaffProfile('');
    const profession = String(fields.profession || '').trim().slice(0, 32);
    const primaryAreas = sanitizeStaffAreas(profession, fields.primaryAreas != null ? fields.primaryAreas : fields.primaryArea);
    const secondaryAreas = sanitizeStaffAreas(
        profession,
        fields.secondaryAreas != null ? fields.secondaryAreas : fields.secondaryArea,
        primaryAreas
    );
    return {
        profession,
        ordemNumber: String(fields.ordemNumber || '').trim().slice(0, 80),
        fullName: String(fields.fullName || '').trim().slice(0, 160),
        nif: String(fields.nif || '').trim().slice(0, 20),
        citizenCard: String(fields.citizenCard || '').trim().slice(0, 32),
        address: String(fields.address || '').trim().slice(0, 400),
        insurer: String(fields.insurer || '').trim().slice(0, 120),
        insurancePolicy: String(fields.insurancePolicy || '').trim().slice(0, 80),
        insuranceValidUntil: isoDateOrEmpty(fields.insuranceValidUntil),
        bio: String(fields.bio || '').trim().slice(0, 4000),
        credentials: String(fields.credentials || '').trim().slice(0, 2000),
        iban: String(prev.iban || '').trim().slice(0, 42),
        primaryAreas,
        secondaryAreas
    };
}

function publicStaffDocument(doc) {
    if (!doc) return null;
    return {
        id: doc.id,
        kind: doc.kind,
        label: STAFF_DOCUMENT_KINDS[doc.kind] || doc.kind,
        originalName: doc.originalName || '',
        validUntil: doc.validUntil || null,
        uploadedAt: doc.uploadedAt || null
    };
}

async function getStaffProfileInternal(username) {
    const u = String(username || '').trim().toLowerCase();
    if (!u) return emptyStaffProfile(u);
    if (usePersistentDb) {
        return (await db.getStaffProfile(u)) || emptyStaffProfile(u);
    }
    const stored = staffProfilesStore.get(u) || emptyStaffProfile(u);
    return {
        ...emptyStaffProfile(u),
        ...stored,
        primaryAreas: parseStaffAreaList(stored.primaryAreas != null ? stored.primaryAreas : stored.primaryArea),
        secondaryAreas: parseStaffAreaList(stored.secondaryAreas != null ? stored.secondaryAreas : stored.secondaryArea),
        hasPhoto: staffPhotosStore.has(u)
    };
}

async function saveStaffProfileInternal(username, fields) {
    const u = String(username || '').trim().toLowerCase();
    const existing = usePersistentDb
        ? ((await db.getStaffProfile(u)) || emptyStaffProfile(u))
        : (staffProfilesStore.get(u) || emptyStaffProfile(u));
    const normalized = normalizeStaffProfileFields(fields, existing);
    if (usePersistentDb) return db.upsertStaffProfile(u, normalized);
    const next = {
        ...emptyStaffProfile(u),
        ...normalized,
        username: u,
        hasPhoto: staffPhotosStore.has(u),
        updatedAt: new Date().toISOString()
    };
    staffProfilesStore.set(u, next);
    return next;
}

async function saveStaffPhotoInternal(username, { mime, data }) {
    const u = String(username || '').trim().toLowerCase();
    if (!u || !data) return emptyStaffProfile(u);
    if (usePersistentDb) return db.upsertStaffPhoto(u, { mime, data });
    staffPhotosStore.set(u, {
        mime: String(mime || 'image/jpeg'),
        data,
        updatedAt: new Date().toISOString()
    });
    const profile = staffProfilesStore.get(u) || emptyStaffProfile(u);
    profile.hasPhoto = true;
    profile.updatedAt = new Date().toISOString();
    staffProfilesStore.set(u, profile);
    return profile;
}

async function getStaffPhotoInternal(username) {
    const u = String(username || '').trim().toLowerCase();
    if (!u) return null;
    if (usePersistentDb) return db.getStaffPhoto(u);
    const photo = staffPhotosStore.get(u);
    if (!photo || !photo.data) return null;
    return { mime: photo.mime || 'image/jpeg', data: photo.data };
}

function invoiceStoreKey(username, month) {
    return `${String(username || '').trim().toLowerCase()}|${String(month || '').trim()}`;
}

function publicStaffInvoice(inv) {
    if (!inv) return null;
    return {
        month: inv.month,
        originalName: inv.originalName || '',
        uploadedAt: inv.uploadedAt || null,
        paymentSent: !!inv.paymentSent,
        paymentSentAt: inv.paymentSentAt || null,
        hasInvoice: !!inv.hasInvoice
    };
}

async function saveStaffIbanInternal(username, iban) {
    const u = String(username || '').trim().toLowerCase();
    if (!u) return emptyStaffProfile(u);
    if (usePersistentDb) return db.upsertStaffIban(u, iban);
    const profile = staffProfilesStore.get(u) || emptyStaffProfile(u);
    profile.iban = String(iban || '').trim().slice(0, 42);
    profile.updatedAt = new Date().toISOString();
    staffProfilesStore.set(u, profile);
    return profile;
}

async function saveStaffPayoutsFromMonthInternal(username, monthKey) {
    const u = String(username || '').trim().toLowerCase();
    const month = String(monthKey || '').trim();
    if (!u || !isPayoutMonthKey(month)) return emptyStaffProfile(u);
    if (usePersistentDb) return db.upsertStaffPayoutsFromMonth(u, month);
    const profile = staffProfilesStore.get(u) || emptyStaffProfile(u);
    if (!isPayoutMonthKey(profile.payoutsFromMonth)) {
        profile.payoutsFromMonth = month;
        profile.updatedAt = new Date().toISOString();
        staffProfilesStore.set(u, profile);
    }
    return profile;
}

async function listStaffInvoicesInternal(username) {
    const u = String(username || '').trim().toLowerCase();
    if (usePersistentDb) return db.listStaffInvoices(u);
    const out = [];
    for (const inv of staffInvoicesStore.values()) {
        if (inv.username === u) out.push({ ...inv, fileData: undefined });
    }
    return out.sort((a, b) => String(b.month).localeCompare(String(a.month)));
}

async function listAllStaffInvoicesInternal() {
    if (usePersistentDb) return db.listAllStaffInvoices();
    return [...staffInvoicesStore.values()]
        .map((inv) => ({ ...inv, fileData: undefined }))
        .sort((a, b) => String(b.month).localeCompare(String(a.month)) || String(a.username).localeCompare(String(b.username)));
}

async function getStaffInvoiceInternal(username, month, { includeData } = {}) {
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (usePersistentDb) return db.getStaffInvoice(u, m, { includeData });
    const inv = staffInvoicesStore.get(invoiceStoreKey(u, m));
    if (!inv) return null;
    if (includeData) return inv;
    return { ...inv, fileData: undefined };
}

async function saveStaffInvoiceFileInternal(username, month, file) {
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (usePersistentDb) return db.upsertStaffInvoiceFile(u, m, file);
    const key = invoiceStoreKey(u, m);
    const prev = staffInvoicesStore.get(key) || {};
    const next = {
        username: u,
        month: m,
        originalName: String(file.originalName || 'fatura').slice(0, 200),
        mime: String(file.mime || 'application/octet-stream').slice(0, 120),
        fileData: file.fileData,
        uploadedAt: new Date().toISOString(),
        paymentSent: !!prev.paymentSent,
        paymentSentAt: prev.paymentSentAt || null,
        hasInvoice: true
    };
    staffInvoicesStore.set(key, next);
    return { ...next, fileData: undefined };
}

async function setStaffInvoicePaymentSentInternal(username, month, sent) {
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (usePersistentDb) return db.setStaffInvoicePaymentSent(u, m, sent);
    const key = invoiceStoreKey(u, m);
    const prev = staffInvoicesStore.get(key) || {
        username: u,
        month: m,
        originalName: '',
        mime: '',
        fileData: null,
        uploadedAt: null,
        hasInvoice: false
    };
    prev.paymentSent = !!sent;
    prev.paymentSentAt = sent ? new Date().toISOString() : null;
    staffInvoicesStore.set(key, prev);
    return { ...prev, fileData: undefined };
}

function monthAvailKey(username, month) {
    return `${String(username || '').trim().toLowerCase()}|${String(month || '').trim()}`;
}

async function listStaffMonthAvailabilityInternal(username) {
    const u = String(username || '').trim().toLowerCase();
    if (usePersistentDb) return db.listStaffMonthAvailability(u);
    const out = [];
    for (const row of staffMonthAvailStore.values()) {
        if (row.username === u) out.push({ ...row });
    }
    return out.sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

async function listAllStaffMonthAvailabilityInternal() {
    if (usePersistentDb) return db.listAllStaffMonthAvailability();
    return [...staffMonthAvailStore.values()].map((row) => ({ ...row }));
}

async function getStaffMonthAvailabilityInternal(username, month) {
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (usePersistentDb) return db.getStaffMonthAvailability(u, m);
    return staffMonthAvailStore.get(monthAvailKey(u, m)) || null;
}

async function setStaffMonthAvailabilityConfirmedInternal(username, month, confirmed) {
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (usePersistentDb) return db.setStaffMonthAvailabilityConfirmed(u, m, confirmed);
    const key = monthAvailKey(u, m);
    const prev = staffMonthAvailStore.get(key) || {
        username: u,
        month: m,
        reminder10Sent: false,
        reminder15Sent: false
    };
    prev.confirmed = !!confirmed;
    prev.confirmedAt = confirmed ? new Date().toISOString() : null;
    staffMonthAvailStore.set(key, prev);
    return { ...prev };
}

async function markStaffMonthAvailabilityReminderInternal(username, month, which) {
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (usePersistentDb) return db.markStaffMonthAvailabilityReminder(u, m, which);
    const key = monthAvailKey(u, m);
    const prev = staffMonthAvailStore.get(key) || {
        username: u,
        month: m,
        confirmed: false,
        confirmedAt: null,
        reminder10Sent: false,
        reminder15Sent: false
    };
    if (which === 15) prev.reminder15Sent = true;
    else prev.reminder10Sent = true;
    staffMonthAvailStore.set(key, prev);
    return { ...prev };
}

async function listStaffDocumentsInternal(username) {
    const u = String(username || '').trim().toLowerCase();
    if (usePersistentDb) return db.listStaffDocuments(u);
    return staffDocumentsStore.filter((d) => d.username === u).map((d) => ({
        id: d.id,
        username: d.username,
        kind: d.kind,
        originalName: d.originalName,
        mime: d.mime,
        validUntil: d.validUntil,
        uploadedAt: d.uploadedAt
    }));
}

async function listAllStaffDocumentsInternal() {
    if (usePersistentDb) return db.listAllStaffDocuments();
    return staffDocumentsStore.map((d) => ({
        id: d.id,
        username: d.username,
        kind: d.kind,
        originalName: d.originalName,
        mime: d.mime,
        validUntil: d.validUntil,
        uploadedAt: d.uploadedAt
    }));
}

async function listStaffProfilesInternal() {
    if (usePersistentDb) return db.listStaffProfiles();
    return [...staffProfilesStore.values()].map((stored) => ({
        ...emptyStaffProfile(stored.username),
        ...stored,
        primaryAreas: parseStaffAreaList(stored.primaryAreas != null ? stored.primaryAreas : stored.primaryArea),
        secondaryAreas: parseStaffAreaList(stored.secondaryAreas != null ? stored.secondaryAreas : stored.secondaryArea),
        hasPhoto: staffPhotosStore.has(stored.username)
    }));
}

async function saveStaffDocumentInternal(doc) {
    if (usePersistentDb) return db.upsertStaffDocument(doc);
    const u = String(doc.username || '').trim().toLowerCase();
    const existing = staffDocumentsStore.find((d) => d.username === u && d.kind === doc.kind);
    const record = {
        id: existing ? existing.id : staffDocumentIdSeq++,
        username: u,
        kind: doc.kind,
        originalName: String(doc.originalName || 'document').slice(0, 200),
        mime: String(doc.mime || 'application/octet-stream').slice(0, 120),
        validUntil: doc.validUntil || null,
        fileData: doc.fileData,
        uploadedAt: new Date().toISOString()
    };
    if (existing) {
        Object.assign(existing, record);
        return { ...record, fileData: undefined };
    }
    staffDocumentsStore.push(record);
    return { ...record, fileData: undefined };
}

async function getStaffDocumentInternal(id, username) {
    if (usePersistentDb) return db.getStaffDocument(id, username);
    const n = Number(id);
    const u = String(username || '').trim().toLowerCase();
    return staffDocumentsStore.find((d) => d.id === n && d.username === u) || null;
}

function normalizeProfessionalUsername(raw) {
    return String(raw || '').trim().toLowerCase();
}

function isValidProfessionalUsername(raw) {
    return /^[a-zA-Z0-9._-]{3,64}$/.test(String(raw || '').trim());
}

const PROFESSIONAL_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateProfessionalPassword() {
    const bytes = crypto.randomBytes(12);
    let out = '';
    for (let i = 0; i < 12; i++) {
        out += PROFESSIONAL_PASSWORD_ALPHABET[bytes[i] % PROFESSIONAL_PASSWORD_ALPHABET.length];
        if (i === 3 || i === 7) out += '-';
    }
    return out;
}

function usernameFromDisplayName(displayName) {
    let s = String(displayName || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[ªº]/g, '')
        .replace(/\b(dra|dr|prof|profa)\b\.?/gi, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .replace(/\.{2,}/g, '.')
        .slice(0, 64);
    if (s.length < 3) {
        s = (`user.${s || crypto.randomBytes(3).toString('hex')}`).replace(/^\.+|\.+$/g, '').slice(0, 64);
    }
    if (!isValidProfessionalUsername(s)) s = `user.${crypto.randomBytes(4).toString('hex')}`.slice(0, 64);
    return s;
}

async function allocateProfessionalUsername(preferred, displayName) {
    let base = normalizeProfessionalUsername(preferred);
    if (!isValidProfessionalUsername(base)) {
        base = usernameFromDisplayName(displayName);
    }
    if (base === normalizeProfessionalUsername(CLINIC_USERNAME)) {
        base = `${base}.pro`.slice(0, 64);
    }
    let candidate = base;
    let n = 2;
    while (
        normalizeProfessionalUsername(candidate) === normalizeProfessionalUsername(CLINIC_USERNAME) ||
        (await findProfessionalByUsernameInternal(candidate))
    ) {
        const suffix = String(n++);
        candidate = `${base.slice(0, Math.max(3, 64 - suffix.length))}${suffix}`;
        if (n > 99) {
            candidate = `user.${crypto.randomBytes(4).toString('hex')}`.slice(0, 64);
            break;
        }
    }
    return candidate;
}

async function listProfessionalsInternal() {
    if (usePersistentDb) return db.listProfessionals();
    return [...professionalsStore];
}

async function findProfessionalByUsernameInternal(username) {
    const u = String(username || '').trim();
    if (!u) return null;
    if (usePersistentDb) return db.findProfessionalByUsername(u);
    const key = normalizeProfessionalUsername(u);
    return professionalsStore.find((p) => normalizeProfessionalUsername(p.username) === key) || null;
}

async function findProfessionalByEmailInternal(email) {
    const e = String(email || '').trim().toLowerCase();
    if (!e || !e.includes('@')) return null;
    if (usePersistentDb) return db.findProfessionalByEmail(e);
    return professionalsStore.find((p) => String(p.email || '').trim().toLowerCase() === e) || null;
}

async function findProfessionalByDisplayNameInternal(name) {
    const n = String(name || '').trim();
    if (!n) return null;
    if (usePersistentDb) return db.findProfessionalByDisplayName(n);
    const key = n.toLowerCase();
    return professionalsStore.find(
        (p) => p.active !== false && String(p.displayName || '').trim().toLowerCase() === key
    ) || null;
}

async function findProfessionalByIdInternal(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) return null;
    if (usePersistentDb) return db.findProfessionalById(n);
    return professionalsStore.find((p) => p.id === n) || null;
}

function producerImageExt(file) {
    const ext = path.extname((file && file.originalname) || '').toLowerCase();
    if (PRODUCER_IMAGE_EXTS.has(ext)) return ext === '.jpeg' ? '.jpg' : ext;
    const mime = file && file.mimetype;
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    return '';
}

function producerFilePath(producerId, filename) {
    const base = path.resolve(PRODUCER_UPLOAD_ROOT, String(producerId || ''));
    const target = path.resolve(base, String(filename || ''));
    const rel = path.relative(base, target);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    if (!/^[A-Za-z0-9._-]+$/.test(String(filename || ''))) return null;
    return target;
}

async function saveProducerUploads(producerId, files) {
    const dir = path.join(PRODUCER_UPLOAD_ROOT, producerId);
    await fs.promises.mkdir(dir, { recursive: true });
    const photos = [];
    for (const file of files.photos || []) {
        const ext = producerImageExt(file);
        if (!ext || !file.buffer) continue;
        const filename = `${crypto.randomUUID()}${ext}`;
        await fs.promises.writeFile(path.join(dir, filename), file.buffer);
        photos.push({
            filename,
            originalName: String(file.originalname || '').slice(0, 180)
        });
    }
    let certImage = null;
    const cert = (files.certImage || [])[0];
    if (cert && cert.buffer) {
        const ext = producerImageExt(cert);
        if (ext) {
            certImage = `cert-${crypto.randomUUID()}${ext}`;
            await fs.promises.writeFile(path.join(dir, certImage), cert.buffer);
        }
    }
    return { photos, certImage };
}

async function allocateProducerSlug(name) {
    const base = producers.slugifyName(name);
    let slug = base;
    let n = 2;
    while (n < 80) {
        const taken = usePersistentDb
            ? await db.producerSlugTaken(slug)
            : producersStore.some((p) => p.slug === slug);
        if (!taken) return slug;
        slug = `${base}-${n}`;
        n += 1;
    }
    return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function filterProducersMemory({ status, category, district, salesMethod, q }) {
    let list = producersStore.slice();
    if (status && producers.STATUSES.has(status)) list = list.filter((p) => p.status === status);
    if (category) list = list.filter((p) => Array.isArray(p.categories) && p.categories.includes(category));
    if (district) list = list.filter((p) => p.district === district);
    if (salesMethod) {
        list = list.filter((p) => Array.isArray(p.salesMethods) && p.salesMethods.includes(salesMethod));
    }
    if (q && q.trim()) {
        const needle = q.trim().toLowerCase();
        list = list.filter(
            (p) =>
                String(p.name || '').toLowerCase().includes(needle) ||
                String(p.shortDescription || '').toLowerCase().includes(needle) ||
                String(p.municipality || '').toLowerCase().includes(needle)
        );
    }
    const rank = { pendente: 0, aprovado: 1, rejeitado: 2 };
    list.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || String(a.name).localeCompare(String(b.name), 'pt'));
    return list.slice(0, 400);
}

async function getProducerByIdInternal(id) {
    if (usePersistentDb) return db.findProducerById(id);
    return producersStore.find((p) => p.id === id) || null;
}

async function getProducerBySlugInternal(slug) {
    if (usePersistentDb) return db.findProducerBySlug(slug);
    return producersStore.find((p) => p.slug === slug) || null;
}

async function resolveDoxyRoomUrl(professionalName) {
    const name = String(professionalName || '').trim();
    if (name) {
        try {
            const pro = await findProfessionalByDisplayNameInternal(name);
            if (pro && String(pro.doxyRoomUrl || '').trim()) {
                return patientDoxyRoomUrl(pro.doxyRoomUrl);
            }
        } catch (err) {
            console.error('   ⚠️  resolveDoxyRoomUrl:', err.message);
        }
    }
    return DEFAULT_DOXY_ROOM_URL || '';
}

function doxyUrlFromEmailData(data) {
    const explicit = String((data && data.doxyUrl) || '').trim();
    if (explicit) return patientDoxyRoomUrl(explicit);
    return DEFAULT_DOXY_ROOM_URL || '';
}

function filterBookingsForStaff(bookings, req) {
    const list = Array.isArray(bookings) ? bookings : [];
    const scoped = isAdminSession(req)
        ? list
        : (() => {
            const name = String((req.session && req.session.clinicDisplayName) || '').trim().toLowerCase();
            if (!name) return [];
            return list.filter((b) => String(b.professional || '').trim().toLowerCase() === name);
        })();
    return scoped.map((b) => {
        if (!b) return b;
        const { intakeToken, ...rest } = b;
        return rest;
    });
}

function staffCanAccessBooking(req, booking) {
    if (!booking) return false;
    if (isAdminSession(req)) return true;
    const name = String((req.session && req.session.clinicDisplayName) || '').trim().toLowerCase();
    return !!name && String(booking.professional || '').trim().toLowerCase() === name;
}

function requestCountry(req) {
    const cf = req && (req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country']);
    return cf ? String(cf).slice(0, 8) : '';
}

function readCookie(req, name) {
    const raw = String((req && req.headers && req.headers.cookie) || '');
    for (const part of raw.split(';')) {
        const i = part.indexOf('=');
        if (i === -1) continue;
        if (part.slice(0, i).trim() !== name) continue;
        try {
            return decodeURIComponent(part.slice(i + 1).trim());
        } catch {
            return part.slice(i + 1).trim();
        }
    }
    return '';
}

function setAnalyticsCookie(res, name, value, maxAgeSec) {
    res.append(
        'Set-Cookie',
        `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax; Secure`
    );
}

function anonymousIds(req) {
    if (!req) return {};
    const cookieVid = readCookie(req, 'lon_vid');
    const cookieSid = readCookie(req, 'lon_sid');
    const ip = String(
        req.headers['cf-connecting-ip'] ||
            String(req.headers['x-forwarded-for'] || '')
                .split(',')[0]
                .trim() ||
            req.ip ||
            ''
    );
    const ua = String((req.headers && req.headers['user-agent']) || '');
    const slot = Math.floor(Date.now() / (30 * 60 * 1000));
    const visitorId =
        cookieVid && cookieVid.length >= 8
            ? cookieVid.slice(0, 64)
            : crypto.createHash('sha256').update(`v|${ip}|${ua}`).digest('hex').slice(0, 32);
    const sessionId =
        cookieSid && cookieSid.length >= 8
            ? cookieSid.slice(0, 64)
            : crypto.createHash('sha256').update(`s|${ip}|${ua}|${slot}`).digest('hex').slice(0, 32);
    return { visitorId, sessionId };
}

function ensureAnalyticsCookies(req, res) {
    const now = Date.now();
    let visitorId = readCookie(req, 'lon_vid');
    let sessionId = readCookie(req, 'lon_sid');
    let sidAt = parseInt(readCookie(req, 'lon_sid_at') || '0', 10);
    if (!visitorId || visitorId.length < 8) {
        visitorId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
        setAnalyticsCookie(res, 'lon_vid', visitorId, 400 * 86400);
    }
    if (!sessionId || sessionId.length < 8 || !sidAt || now - sidAt > 30 * 60 * 1000) {
        sessionId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
        sidAt = now;
        setAnalyticsCookie(res, 'lon_sid', sessionId, 86400);
        setAnalyticsCookie(res, 'lon_sid_at', String(sidAt), 86400);
    }
    return { visitorId, sessionId };
}

async function emitServerAnalytics(name, extra, req) {
    const x = extra || {};
    const ids = anonymousIds(req);
    const row = analyticsNet.normalizeEvent(
        {
            event_id: crypto.randomUUID(),
            name,
            ts: Date.now(),
            visitor_id: x.visitorId || ids.visitorId || null,
            session_id: x.sessionId || ids.sessionId || null,
            page_path: x.pagePath || (req && req.path) || null,
            landing_path: x.landingPath || null,
            referrer: x.referrer || (req && req.get && req.get('referer')) || '',
            utm_source: x.utmSource || '',
            utm_medium: x.utmMedium || '',
            utm_campaign: x.utmCampaign || '',
            gclid: x.gclid || '',
            fbclid: x.fbclid || '',
            props: x.props || {},
            revenue_cents: x.revenueCents,
            currency: x.currency || 'eur',
            booking_ref: x.bookingRef || null
        },
        {
            source: 'server',
            ua: req && req.headers ? req.headers['user-agent'] : 'server',
            country: requestCountry(req),
            staff: isStaffRequest(req)
        }
    );
    if (!row) return;
    analyticsNet.remember(row);
    if (usePersistentDb) {
        try {
            await db.insertAnalyticsEvents([row]);
        } catch (err) {
            console.error('emitServerAnalytics:', err.message);
        }
    }
}

async function ingestClientEvents(req, events) {
    if (!Array.isArray(events) || !events.length) return;
    const ua = req.headers['user-agent'] || '';
    const country = requestCountry(req);
    const ids = anonymousIds(req);
    const rows = [];
    for (const ev of events.slice(0, 40)) {
        const payload = ev && typeof ev === 'object' ? { ...ev } : {};
        if (!payload.visitor_id) payload.visitor_id = ids.visitorId;
        if (!payload.session_id) payload.session_id = ids.sessionId;
        const row = analyticsNet.normalizeEvent(payload, {
            source: 'client',
            ua,
            country,
            staff: isStaffRequest(req)
        });
        if (row) rows.push(row);
    }
    if (!rows.length) return;
    rows.forEach((row) => analyticsNet.remember(row));
    if (usePersistentDb) await db.insertAnalyticsEvents(rows);
}

/* ========================================
   SCHEDULE/AVAILABILITY STORE
   (Replace with a database in production)
======================================== */
const defaultScheduleStore = {
    workingHours: {
        monday: { enabled: true, start: '07:00', end: '21:00' },
        tuesday: { enabled: true, start: '07:00', end: '21:00' },
        wednesday: { enabled: true, start: '07:00', end: '21:00' },
        thursday: { enabled: true, start: '07:00', end: '21:00' },
        friday: { enabled: true, start: '07:00', end: '21:00' },
        saturday: { enabled: true, start: '09:00', end: '21:00' },
        sunday: { enabled: true, start: '09:00', end: '21:00' }
    },
    slotDuration: 30, // minutes
    blockedDates: [], // Array of date strings (YYYY-MM-DD)
    blockedTimeSlots: [], // Array of { date: 'YYYY-MM-DD', time: 'HH:MM' }
    /** Per-calendar-day hours; override weekly template for that date (YYYY-MM-DD). */
    dayOverrides: [],
    timezone: 'Europe/Lisbon',
    /** When true, public booking only shows anchor slots until bookings exist, then expands outward. */
    smartSlotGrouping: true,
    updatedAt: new Date().toISOString()
};

const scheduleFilePath = path.join(__dirname, 'data', 'schedule.json');

function cloneDefaultSchedule() {
    return JSON.parse(JSON.stringify(defaultScheduleStore));
}

function normalizeDayOverrides(raw) {
    if (!Array.isArray(raw)) return [];
    const timeOk = (t) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t);
    const byDate = new Map();
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const date = String(item.date || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        let start = String(item.start || '09:00').slice(0, 5);
        let end = String(item.end || '17:00').slice(0, 5);
        if (!timeOk(start)) start = '09:00';
        if (!timeOk(end)) end = '17:00';
        byDate.set(date, {
            date,
            enabled: Boolean(item.enabled),
            start,
            end
        });
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function applySchedulePatch(body) {
    const {
        workingHours,
        slotDuration,
        blockedDates,
        blockedTimeSlots,
        dayOverrides,
        timezone,
        smartSlotGrouping
    } = body || {};

    if (workingHours) {
        scheduleStore.workingHours = { ...scheduleStore.workingHours, ...workingHours };
    }
    if (slotDuration !== undefined) {
        scheduleStore.slotDuration = slotDuration;
    }
    if (blockedDates !== undefined) {
        scheduleStore.blockedDates = blockedDates;
    }
    if (blockedTimeSlots !== undefined) {
        scheduleStore.blockedTimeSlots = blockedTimeSlots;
    }
    if (dayOverrides !== undefined) {
        scheduleStore.dayOverrides = normalizeDayOverrides(dayOverrides);
    }
    if (timezone) {
        scheduleStore.timezone = timezone;
    }
    if (typeof smartSlotGrouping === 'boolean') {
        scheduleStore.smartSlotGrouping = smartSlotGrouping;
    }
}

function timeToMinutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

/** Invitation-only times outside weekly hours: 07:00–08:30 and 21:00 (30-min grid). */
function isInvitationExtendedTime(normTime) {
    const mins = timeToMinutes(normTime);
    if (mins == null || mins % 30 !== 0) return false;
    if (mins >= 7 * 60 && mins < 9 * 60) return true;
    return mins === 21 * 60;
}

async function invitationExtendedSlotIsFree(dateIso, normTime, excludeBookingRef, excludeInvitationId) {
    const daySchedule = getEffectiveDaySchedule(dateIso);
    if (!daySchedule.enabled) return false;
    const blocked = scheduleStore.blockedTimeSlots.some(
        (b) => b.date === dateIso && b.time === normTime
    );
    if (blocked) return false;
    if (usePersistentDb) {
        const taken = await db.isSlotTakenByOther(dateIso, normTime, excludeBookingRef || null);
        if (taken) return false;
        const locked = await fetchInvitationLockedTimesForDateIso(dateIso);
        if (excludeInvitationId) {
            try {
                const inv = await db.findInvitationById(excludeInvitationId);
                if (inv && inv.time) locked.delete(normalizeTimeString({ time: inv.time }) || inv.time);
            } catch (e) { /* ignore */ }
        }
        if (locked.has(normTime)) return false;
        return true;
    }
    return isSlotFreeInMemory(dateIso, normTime, excludeBookingRef || null);
}

async function isInvitationSlotAllowed(dateIso, normTime, excludeInvitationId) {
    const available = await getBookableSlotsForDateIso(dateIso, null, excludeInvitationId || null, true);
    if (available.includes(normTime)) return true;
    if (!isInvitationExtendedTime(normTime)) return false;
    return invitationExtendedSlotIsFree(dateIso, normTime, null, excludeInvitationId);
}

/** Consultations can be booked from 07:00; stored 08:00/09:00 templates are opened earlier. */
function startNoLaterThan7am(start) {
    const mins = timeToMinutes(start);
    if (mins == null || mins > 7 * 60) return '07:00';
    const [h, min] = String(start).slice(0, 5).split(':');
    return `${String(h).padStart(2, '0')}:${min}`;
}

function applySevenAmConsultationHours(store) {
    if (!store || !store.workingHours) return false;
    let changed = false;
    for (const day of Object.keys(store.workingHours)) {
        const wh = store.workingHours[day];
        if (!wh || typeof wh !== 'object') continue;
        const next = startNoLaterThan7am(wh.start);
        if (wh.start !== next) {
            wh.start = next;
            changed = true;
        }
    }
    return changed;
}

function endNoEarlierThan(end, floorHhmm) {
    const mins = timeToMinutes(end);
    const floor = timeToMinutes(floorHhmm);
    if (mins == null || floor == null || mins >= floor) {
        const [h, min] = String(end || floorHhmm).slice(0, 5).split(':');
        return `${String(h).padStart(2, '0')}:${min}`;
    }
    return floorHhmm;
}

/** Public grid must cover PT after-work (18:00–21:00) and weekends. */
function applyPeakConsultationHours(store) {
    if (!store || !store.workingHours) return false;
    let changed = false;
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekend = ['saturday', 'sunday'];
    for (const day of weekdays) {
        const wh = store.workingHours[day];
        if (!wh || typeof wh !== 'object' || !wh.enabled) continue;
        const next = endNoEarlierThan(wh.end, '21:00');
        if (wh.end !== next) {
            wh.end = next;
            changed = true;
        }
    }
    for (const day of weekend) {
        const prev = store.workingHours[day];
        const wh = prev && typeof prev === 'object'
            ? prev
            : { enabled: true, start: '09:00', end: '21:00' };
        store.workingHours[day] = wh;
        if (!wh.enabled) {
            wh.enabled = true;
            changed = true;
        }
        const nextEnd = endNoEarlierThan(wh.end, '21:00');
        if (wh.end !== nextEnd) {
            wh.end = nextEnd;
            changed = true;
        }
    }
    return changed;
}

function ensureScheduleStoreShape(raw) {
    const base = cloneDefaultSchedule();
    const input = raw && typeof raw === 'object' ? raw : {};
    const mergedOverrides =
        input.dayOverrides !== undefined
            ? normalizeDayOverrides(input.dayOverrides)
            : normalizeDayOverrides(base.dayOverrides);
    const store = {
        ...base,
        ...input,
        workingHours: { ...base.workingHours, ...(input.workingHours || {}) },
        blockedDates: Array.isArray(input.blockedDates) ? input.blockedDates : base.blockedDates,
        blockedTimeSlots: Array.isArray(input.blockedTimeSlots) ? input.blockedTimeSlots : base.blockedTimeSlots,
        dayOverrides: mergedOverrides,
        slotDuration: Number.isFinite(input.slotDuration) ? input.slotDuration : base.slotDuration,
        timezone: typeof input.timezone === 'string' && input.timezone ? input.timezone : base.timezone,
        smartSlotGrouping:
            typeof input.smartSlotGrouping === 'boolean' ? input.smartSlotGrouping : base.smartSlotGrouping,
        updatedAt: input.updatedAt || new Date().toISOString()
    };
    if (applySevenAmConsultationHours(store) || applyPeakConsultationHours(store)) {
        store.updatedAt = new Date().toISOString();
    }
    return store;
}

/** Effective schedule for slot generation: blocked date → closed; else day override; else weekly hours. */
function getEffectiveDaySchedule(dateStr) {
    if (scheduleStore.blockedDates.includes(dateStr)) {
        return { enabled: false, start: '09:00', end: '17:00', source: 'blocked' };
    }
    const ov = (scheduleStore.dayOverrides || []).find((o) => o.date === dateStr);
    if (ov) {
        return {
            enabled: ov.enabled,
            start: ov.start,
            end: ov.end,
            source: 'override'
        };
    }
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
    if (!dateMatch) {
        return { enabled: false, start: '09:00', end: '17:00', source: 'invalid' };
    }
    const y = Number(dateMatch[1]);
    const m = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
        dateObj.getDay()
    ];
    const daySchedule = scheduleStore.workingHours[dayOfWeek];
    if (!daySchedule) {
        return { enabled: false, start: '09:00', end: '17:00', source: 'weekly' };
    }
    return {
        enabled: daySchedule.enabled,
        start: daySchedule.start,
        end: daySchedule.end,
        source: 'weekly'
    };
}

function loadScheduleStore() {
    try {
        if (!fs.existsSync(scheduleFilePath)) {
            return cloneDefaultSchedule();
        }
        const parsed = JSON.parse(fs.readFileSync(scheduleFilePath, 'utf8'));
        return ensureScheduleStoreShape(parsed);
    } catch (err) {
        console.error('⚠️ Failed to load persisted schedule, using defaults:', err.message);
        return cloneDefaultSchedule();
    }
}

function persistScheduleStoreToFile() {
    try {
        const dir = path.dirname(scheduleFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(scheduleFilePath, JSON.stringify(scheduleStore, null, 2), 'utf8');
    } catch (err) {
        console.error('⚠️ Failed to persist schedule settings:', err.message);
    }
}

async function persistScheduleStore() {
    invalidateNextSlotsCache();
    if (usePersistentDb) {
        try {
            await db.saveSchedulePayload(scheduleStore);
        } catch (err) {
            console.error('⚠️ Failed to persist schedule to database:', err.message);
        }
        return;
    }
    persistScheduleStoreToFile();
}

let scheduleStore = cloneDefaultSchedule();

async function bootstrapPersistence() {
    if (usePersistentDb) {
        const init = await db.initDatabase();
        if (!init.ok) {
            console.error('   ⚠️  DATABASE_URL set but database init failed');
            return;
        }
        const payload = await db.getSchedulePayload();
        if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
            scheduleStore = ensureScheduleStoreShape(payload);
        } else {
            scheduleStore = loadScheduleStore();
        }
        await persistScheduleStore();
        return;
    }
    scheduleStore = loadScheduleStore();
    persistScheduleStoreToFile();
}

/* ========================================
   EMAIL CONFIGURATION
======================================== */

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Longevity Clinic <noreply@longevityclinic.com>';
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();

const isResendConfigured = Boolean(RESEND_API_KEY);
const isSmtpConfigured = Boolean(
    EMAIL_USER &&
        EMAIL_PASS &&
        !EMAIL_USER.includes('your_email') &&
        !EMAIL_PASS.includes('your_app_password')
);
/** True when either Resend (HTTPS) or SMTP is usable. Railway often blocks outbound SMTP; use Resend on those plans. */
const isEmailConfigured = isResendConfigured || isSmtpConfigured;

let transporter;
if (isSmtpConfigured) {
    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });

    transporter.verify()
        .then(() => console.log('   ✉️  SMTP transport verified and ready'))
        .catch(err => console.error('   ⚠️  SMTP transport error:', err.message));
}

/**
 * Deliver email via Resend (HTTPS) when RESEND_API_KEY is set, otherwise Nodemailer SMTP.
 * Same options shape as nodemailer sendMail for the fields we use.
 */
async function deliverEmail(mailOptions) {
    if (isResendConfigured) {
        const { from, to, subject, text, html, replyTo, attachments } = mailOptions;
        const toList = (Array.isArray(to) ? to : String(to || '').split(','))
            .map((s) => String(s).trim())
            .filter(Boolean);
        if (!toList.length) {
            throw new Error('Resend: missing recipient');
        }
        const body = {
            from: String(from || EMAIL_FROM),
            to: toList.length === 1 ? toList[0] : toList,
            subject: String(subject || ''),
        };
        if (html) body.html = html;
        if (text) body.text = text;
        if (replyTo) {
            body.reply_to = Array.isArray(replyTo) ? replyTo : String(replyTo);
        }
        if (attachments && attachments.length > 0) {
            body.attachments = attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.isBuffer(a.content)
                    ? a.content.toString('base64')
                    : typeof a.content === 'string'
                      ? a.content
                      : Buffer.from(a.content).toString('base64'),
            }));
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const raw = await res.text();
        let json = {};
        try {
            if (raw) json = JSON.parse(raw);
        } catch (_) {
            /* ignore */
        }
        if (!res.ok) {
            const msg =
                json.message ||
                (Array.isArray(json.errors) && json.errors[0] && json.errors[0].message) ||
                raw ||
                `Resend HTTP ${res.status}`;
            throw new Error(msg);
        }
        return { messageId: json.id || 'resend' };
    }
    if (!transporter) {
        throw new Error('Email transport not configured (set RESEND_API_KEY or SMTP credentials)');
    }
    return transporter.sendMail(mailOptions);
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = new Set([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]);
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const fileExt = path.extname(file.originalname || '').toLowerCase();
        const isAllowed = allowedMimeTypes.has(file.mimetype) || allowedExtensions.includes(fileExt);
        if (!isAllowed) {
            return cb(new Error('Unsupported file type. Allowed: PDF, DOC, DOCX.'));
        }
        return cb(null, true);
    }
});

const uploadCvPdf = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const fileExt = path.extname(file.originalname || '').toLowerCase();
        const isPdf = file.mimetype === 'application/pdf' || fileExt === '.pdf';
        if (!isPdf) {
            return cb(new Error('O CV deve ser um ficheiro PDF.'));
        }
        return cb(null, true);
    }
});

const STAFF_DOC_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx']);
const STAFF_DOC_MIMES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const uploadStaffDocument = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const ok = STAFF_DOC_MIMES.has(file.mimetype) || STAFF_DOC_EXTS.has(ext);
        if (!ok) {
            return cb(new Error('Allowed files: PDF, JPG, PNG, WebP, DOC, DOCX.'));
        }
        return cb(null, true);
    }
});

const PRODUCER_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const PRODUCER_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PRODUCER_UPLOAD_ROOT = path.join(__dirname, 'uploads', 'producers');

const uploadStaffPhoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const ok = PRODUCER_IMAGE_MIMES.has(file.mimetype) || PRODUCER_IMAGE_EXTS.has(ext);
        if (!ok) {
            return cb(new Error('Allowed photos: JPG, PNG or WebP.'));
        }
        return cb(null, true);
    }
});

const uploadProducerImages = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 9
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const ok = PRODUCER_IMAGE_MIMES.has(file.mimetype) || PRODUCER_IMAGE_EXTS.has(ext);
        if (!ok) {
            return cb(new Error('Imagens permitidas: JPG, PNG ou WebP.'));
        }
        return cb(null, true);
    }
});

/* ========================================
   EMAIL TEMPLATE — patient locale (en / pt / es)
======================================== */

function normalizePatientLocale(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'pt' || s.startsWith('pt')) return 'pt';
    if (s === 'es' || s.startsWith('es')) return 'es';
    return 'en';
}

/** Strings for booking confirmation email (HTML + plain text + subject) */
const CONFIRMATION_EMAIL_I18N = {
    en: {
        htmlLang: 'en',
        emailTitle: 'Booking Confirmation',
        h2Confirmed: 'Booking Confirmed',
        thankYou: (name) => `Thank you, ${name}. Your consultation has been booked and payment received.`,
        fillFormLead: 'To help your doctor prepare, please complete your clinical details (less than 2 minutes).',
        fillFormButton: 'Fill in clinical form',
        refLabel: 'Booking Reference',
        colService: 'Service',
        colDate: 'Date',
        colTime: 'Time',
        colFormat: 'Format',
        formatVideo: 'Secure video call',
        travellers: 'Travellers',
        travellerRow: (n) => `Traveller ${n}`,
        destLabel: 'Destination(s)',
        travelDatesLabel: 'Travel Dates',
        totalPaid: 'Total Paid',
        whatsNext: 'What happens next?',
        step1Title: 'Complete your clinical form',
        step1Body: 'This takes less than 2 minutes and helps your doctor prepare. Use the button above, or the same link in this email.',
        step1BodyWithLink: (url) =>
            `This takes less than 2 minutes and helps your doctor prepare: ${url}`,
        step2Title: 'Video call link',
        step2NoDoxy: "We'll send you a secure video call link 24 hours before your appointment.",
        doxyBefore: 'Join your consultation via our secure video room:',
        doxyAfter: 'Open this link at your scheduled time — no download required.',
        joinVideoButton: 'Join Video Consultation',
        step3Title: 'Your consultation',
        step3Travel: 'Meet your physician for an unhurried, comprehensive travel health consultation.',
        step3Longevity: 'Meet your physician for an unhurried, comprehensive longevity consultation.',
        step4ReportTitle: 'Personalised report',
        step4ReportBody: "Within 48 hours, you'll receive a detailed report with actionable insights and a personalised health plan.",
        step4TravelTitle: 'Prescriptions & vaccines',
        step4TravelBody: 'Any required prescriptions or vaccine recommendations will be provided during or shortly after your consultation.',
        renewalTitle: 'Need a prescription renewal later?',
        renewalBody: 'If your treatment is already stable, renew it online for €19 — no new full consultation.',
        renewalCta: 'Renew treatment — €19',
        rescheduleStrong: 'Need to reschedule?',
        rescheduleRest: 'Free rescheduling is available up to 24 hours before your appointment. Simply reply to this email or contact us.',
        footerContact: 'If you have any questions, contact us at',
        footerOrCall: 'or call',
        footerCopy: '© 2026 Longevity Clinic. All rights reserved.',
        footerAuto: 'This is an automated confirmation email. Please do not reply directly to this address.',
        subject: (service, date, ref, time) =>
            `Action needed: Complete your clinical form for the ${time || ''} consultation | ${ref}`,
        textHead: 'BOOKING CONFIRMED',
        textThanks: (name) => `Thank you, ${name}. Your consultation has been booked and payment received.`,
        textDetails: 'BOOKING DETAILS',
        textService: 'Service',
        textDate: 'Date',
        textTime: 'Time',
        textFormat: 'Format',
        textTravellers: 'Travellers',
        textDest: 'Destination',
        textTravelDates: 'Travel dates',
        textTotalPaid: 'Total Paid',
        textWhatsNext: 'WHAT HAPPENS NEXT',
        textStep1: 'Complete your clinical form — use the link in this email (less than 2 minutes).',
        textStep1WithLink: (url) => `Complete your clinical form (less than 2 minutes):\n   ${url}`,
        textStep2Doxy: (url) => `Video call link — join your secure video room at your scheduled time (no download required):\n   ${url}`,
        textStep2NoDoxy: 'Video call link — we will send a secure link 24 hours before your appointment.',
        textStep3: 'Your consultation — meet your physician online.',
        textStep4Report: 'Personalised report — within 48 hours.',
        textStep4Travel: 'Prescriptions & vaccines — provided during or after consultation.',
        textReschedule: 'Need to reschedule? Free rescheduling up to 24 hours before. Reply to this email or contact us.',
        textRenewal: 'Need a prescription renewal later? Book online for €19:',
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    pt: {
        htmlLang: 'pt',
        emailTitle: 'Confirmação de marcação',
        h2Confirmed: 'Marcação confirmada',
        thankYou: (name) => `Obrigado, ${name}. A sua consulta foi marcada e o pagamento foi recebido.`,
        fillFormLead: 'Para o médico preparar a sua consulta, preencha os seus dados clínicos (demora menos de 2 minutos).',
        fillFormButton: 'Preencher ficha clínica',
        refLabel: 'Referência da marcação',
        colService: 'Serviço',
        colDate: 'Data',
        colTime: 'Hora',
        colFormat: 'Formato',
        formatVideo: 'Videochamada segura',
        travellers: 'Viajantes',
        travellerRow: (n) => `Viajante ${n}`,
        destLabel: 'Destino(s)',
        travelDatesLabel: 'Datas da viagem',
        totalPaid: 'Total pago',
        whatsNext: 'Próximos passos',
        step1Title: 'Preencha a ficha clínica',
        step1Body: 'Demora menos de 2 minutos e ajuda o médico a preparar a consulta. Use o botão acima, ou o mesmo link neste email.',
        step1BodyWithLink: (url) =>
            `Demora menos de 2 minutos e ajuda o médico a preparar a consulta: ${url}`,
        step2Title: 'Ligação por vídeo',
        step2NoDoxy: 'Enviaremos uma ligação segura por vídeo 24 horas antes da sua consulta.',
        doxyBefore: 'Aceda à consulta através da nossa sala de vídeo segura:',
        doxyAfter: 'Abra esta ligação à hora marcada — não é necessária qualquer instalação.',
        joinVideoButton: 'Entrar na consulta por vídeo',
        step3Title: 'A sua consulta',
        step3Travel: 'Reúna-se com o seu médico numa consulta de medicina de viagem completa e sem pressa.',
        step3Longevity: 'Reúna-se com o seu médico numa consulta de longevidade completa e sem pressa.',
        step4ReportTitle: 'Relatório personalizado',
        step4ReportBody: 'No prazo de 48 horas, receberá um relatório detalhado com recomendações práticas e um plano de saúde personalizado.',
        step4TravelTitle: 'Receitas e vacinas',
        step4TravelBody: 'Quaisquer receitas ou recomendações de vacinas necessárias serão fornecidas durante ou pouco depois da consulta.',
        renewalTitle: 'Precisa de renovar a receita mais tarde?',
        renewalBody: 'Se o tratamento já está estável, renove online por €19 — sem uma consulta completa nova.',
        renewalCta: 'Renovar tratamento — €19',
        rescheduleStrong: 'Precisa de reagendar?',
        rescheduleRest: 'O reagendamento é gratuito até 24 horas antes da consulta. Responda a este email ou contacte-nos.',
        footerContact: 'Em caso de dúvidas, contacte-nos em',
        footerOrCall: 'ou ligue para',
        footerCopy: '© 2026 Longevity Clinic. Todos os direitos reservados.',
        footerAuto: 'Este é um email de confirmação automático. Por favor não responda diretamente a este endereço.',
        subject: (service, date, ref, time) =>
            `Ação necessária: Preencha a sua ficha clínica para a consulta das ${time || ''} | ${ref}`,
        textHead: 'MARCAÇÃO CONFIRMADA',
        textThanks: (name) => `Obrigado, ${name}. A sua consulta foi marcada e o pagamento foi recebido.`,
        textDetails: 'DETALHES DA MARCAÇÃO',
        textService: 'Serviço',
        textDate: 'Data',
        textTime: 'Hora',
        textFormat: 'Formato',
        textTravellers: 'Viajantes',
        textDest: 'Destino',
        textTravelDates: 'Datas da viagem',
        textTotalPaid: 'Total pago',
        textWhatsNext: 'PRÓXIMOS PASSOS',
        textStep1: 'Preencha a ficha clínica — use o link neste email (menos de 2 minutos).',
        textStep1WithLink: (url) => `Preencha a ficha clínica (menos de 2 minutos):\n   ${url}`,
        textStep2Doxy: (url) => `Ligação por vídeo — aceda à sala segura à hora marcada (sem instalação):\n   ${url}`,
        textStep2NoDoxy: 'Ligação por vídeo — enviaremos uma ligação segura 24 horas antes da consulta.',
        textStep3: 'A sua consulta — encontre-se com o seu médico online.',
        textStep4Report: 'Relatório personalizado — no prazo de 48 horas.',
        textStep4Travel: 'Receitas e vacinas — fornecidas durante ou após a consulta.',
        textReschedule: 'Precisa de reagendar? Reagendamento gratuito até 24 horas antes. Responda a este email ou contacte-nos.',
        textRenewal: 'Precisa de renovar a receita mais tarde? Marque online por €19:',
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    es: {
        htmlLang: 'es',
        emailTitle: 'Confirmación de cita',
        h2Confirmed: 'Cita confirmada',
        thankYou: (name) => `Gracias, ${name}. Su consulta ha sido reservada y hemos recibido el pago.`,
        fillFormLead: 'Para que el médico prepare su consulta, complete sus datos clínicos (menos de 2 minutos).',
        fillFormButton: 'Completar ficha clínica',
        refLabel: 'Referencia de la reserva',
        colService: 'Servicio',
        colDate: 'Fecha',
        colTime: 'Hora',
        colFormat: 'Formato',
        formatVideo: 'Videollamada segura',
        travellers: 'Viajeros',
        travellerRow: (n) => `Viajero/a ${n}`,
        destLabel: 'Destino(s)',
        travelDatesLabel: 'Fechas del viaje',
        totalPaid: 'Total pagado',
        whatsNext: 'Próximos pasos',
        step1Title: 'Complete su ficha clínica',
        step1Body: 'Tarda menos de 2 minutos y ayuda al médico a preparar la consulta. Use el botón de arriba, o el mismo enlace en este correo.',
        step1BodyWithLink: (url) =>
            `Tarda menos de 2 minutos y ayuda al médico a preparar la consulta: ${url}`,
        step2Title: 'Enlace de videollamada',
        step2NoDoxy: 'Le enviaremos un enlace seguro para la videollamada 24 horas antes de su cita.',
        doxyBefore: 'Acceda a la consulta a través de nuestra sala de vídeo segura:',
        doxyAfter: 'Abra este enlace a la hora acordada; no necesita instalar ningún programa.',
        joinVideoButton: 'Unirse a la videoconsulta',
        step3Title: 'Su consulta',
        step3Travel: 'Conéctese con su médico para una consulta de medicina de viaje completa y sin prisas.',
        step3Longevity: 'Conéctese con su médico para una consulta de longevidad completa y sin prisas.',
        step4ReportTitle: 'Informe personalizado',
        step4ReportBody: 'En un plazo de 48 horas recibirá un informe detallado con recomendaciones prácticas y un plan de salud personalizado.',
        step4TravelTitle: 'Recetas y vacunas',
        step4TravelBody: 'Las recetas necesarias o recomendaciones de vacunas se facilitarán durante o poco después de la consulta.',
        renewalTitle: '¿Necesita renovar la receta más adelante?',
        renewalBody: 'Si el tratamiento ya es estable, renuévelo online por 19 € — sin una consulta completa nueva.',
        renewalCta: 'Renovar tratamiento — 19 €',
        rescheduleStrong: '¿Necesita cambiar la fecha?',
        rescheduleRest: 'Puede reprogramar sin coste hasta 24 horas antes de la cita. Responda a este correo o contáctenos.',
        footerContact: 'Si tiene alguna pregunta, escríbanos a',
        footerOrCall: 'o llame al',
        footerCopy: '© 2026 Longevity Clinic. Todos los derechos reservados.',
        footerAuto: 'Este es un correo de confirmación automático. No responda directamente a esta dirección.',
        subject: (service, date, ref, time) =>
            `Acción necesaria: Complete su ficha clínica para la consulta de las ${time || ''} | ${ref}`,
        textHead: 'CITA CONFIRMADA',
        textThanks: (name) => `Gracias, ${name}. Su consulta ha sido reservada y hemos recibido el pago.`,
        textDetails: 'DETALLES DE LA RESERVA',
        textService: 'Servicio',
        textDate: 'Fecha',
        textTime: 'Hora',
        textFormat: 'Formato',
        textTravellers: 'Viajeros',
        textDest: 'Destino',
        textTravelDates: 'Fechas del viaje',
        textTotalPaid: 'Total pagado',
        textWhatsNext: 'PRÓXIMOS PASOS',
        textStep1: 'Complete su ficha clínica — use el enlace de este correo (menos de 2 minutos).',
        textStep1WithLink: (url) => `Complete su ficha clínica (menos de 2 minutos):\n   ${url}`,
        textStep2Doxy: (url) => `Enlace de videollamada — acceda a la sala segura a la hora acordada (sin descargas):\n   ${url}`,
        textStep2NoDoxy: 'Enlace de videollamada — le enviaremos un enlace seguro 24 horas antes de la cita.',
        textStep3: 'Su consulta — conéctese con su médico en línea.',
        textStep4Report: 'Informe personalizado — en un plazo de 48 horas.',
        textStep4Travel: 'Recetas y vacunas — facilitadas durante o después de la consulta.',
        textReschedule: '¿Necesita cambiar la fecha? Reprogramación gratuita hasta 24 horas antes. Responda a este correo o contáctenos.',
        textRenewal: '¿Necesita renovar la receta más adelante? Reserve online por 19 €:',
        textFooterCopy: '© 2026 Longevity Clinic'
    }
};

function confirmationEmailStrings(locale) {
    const k = normalizePatientLocale(locale);
    return CONFIRMATION_EMAIL_I18N[k] || CONFIRMATION_EMAIL_I18N.en;
}

function buildConfirmationEmail(data) {
    const {
        bookingRef,
        patientName,
        email,
        service,
        serviceLabel,
        date,
        time,
        amount,
        currency,
        travellerCount,
        passengers,
        travelDest,
        travelDates,
        locale: rawLocale,
        doxyUrl: dataDoxyUrl,
        intakeUrl: dataIntakeUrl
    } = data;

    const t = confirmationEmailStrings(rawLocale);

    const currencySymbol = currency === 'eur' ? '€' : currency === 'gbp' ? '£' : '$';
    const formattedAmount = `${currencySymbol}${(amount / 100).toFixed(0)}`;
    const isTravel = service === 'travel';
    const isMulti = travellerCount > 1;
    const doxyUrl = doxyUrlFromEmailData({ doxyUrl: dataDoxyUrl });
    const showRenewal = service !== 'renovacao' && service !== 'entrevista';
    const renewalHref = showRenewal
        ? renewalFollowupUrl({ email, patientName, bookingRef })
        : '';

    let passengerRows = '';
    if (isMulti && passengers && passengers.length > 0) {
        passengerRows = passengers.map((name, i) => `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.travellerRow(i + 1)}</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${name}</td>
            </tr>
        `).join('');
    }

    let travelRows = '';
    if (isTravel && (travelDest || travelDates)) {
        travelRows = `
            ${travelDest ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.destLabel}</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${travelDest}</td>
            </tr>` : ''}
            ${travelDates ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.travelDatesLabel}</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${travelDates}</td>
            </tr>` : ''}
        `;
    }

    const intakeUrl = (dataIntakeUrl && String(dataIntakeUrl).trim()) || '';
    const intakeCtaButton = intakeUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:12px 0 0;">
    <tr>
        <td align="center" style="padding:0;">
            <a href="${escapeHtml(intakeUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">${t.fillFormButton}</a>
        </td>
    </tr>
</table>`
        : '';

    const doxyCtaButton = doxyUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 20px;">
    <tr>
        <td align="center" style="padding:0;">
            <a href="${escapeHtml(doxyUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">${t.joinVideoButton}</a>
        </td>
    </tr>
</table>`
        : '';

    const step2Html = doxyUrl
        ? `${t.doxyBefore}<br><br>${doxyCtaButton}<p style="margin:8px 0 0; font-size:14px; color:#475569; line-height:1.5;">${t.doxyAfter}</p>`
        : t.step2NoDoxy;

    const step3Body = isTravel ? t.step3Travel : t.step3Longevity;

    const html = `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.emailTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">

                    <tr>
                        <td style="text-align: center; padding: 0 0 32px;">
                            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">longevity</h1>
                            <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">clinic</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; width: 56px; height: 56px; background: #e8f5e9; border-radius: 50%; line-height: 56px; text-align: center;">
                                    <span style="font-size: 28px;">&#10003;</span>
                                </div>
                            </div>

                            <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center;">${t.h2Confirmed}</h2>
                            <p style="margin: 0 0 24px; font-size: 15px; color: #64748b; text-align: center; line-height: 1.5;">
                                ${t.thankYou(patientName)}
                            </p>

                            ${intakeUrl ? `
                            <div style="background:#f1f5f2;border:1px solid #c9d4cc;border-radius:10px;padding:18px 20px;margin:0 0 28px;text-align:center;">
                                <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;">${t.step1Title}</p>
                                <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;">${t.fillFormLead}</p>
                                ${intakeCtaButton}
                            </div>` : ''}

                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; text-align: center; margin-bottom: 28px;">
                                <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">${t.refLabel}</p>
                                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.05em;">${bookingRef}</p>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.colService}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${serviceLabel}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.colDate}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.colTime}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${time}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.colFormat}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${t.formatVideo}</td>
                                </tr>
                                ${isMulti ? `
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.travellers}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${travellerCount}</td>
                                </tr>` : ''}
                                ${passengerRows}
                                ${travelRows}
                                <tr>
                                    <td style="padding: 12px 0 8px; color: #64748b; font-size: 14px; font-weight: 600;">${t.totalPaid}</td>
                                    <td style="padding: 12px 0 8px; color: #0f172a; font-size: 18px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                                </tr>
                            </table>

                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 28px;">

                            <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">${t.whatsNext}</h3>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">1</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">${t.step1Title}</strong><br>
                                        ${t.step1Body}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">2</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">${t.step2Title}</strong><br>
                                        ${step2Html}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">3</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">${t.step3Title}</strong><br>
                                        ${step3Body}
                                    </td>
                                </tr>
                                ${!isTravel ? `
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">4</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">${t.step4ReportTitle}</strong><br>
                                        ${t.step4ReportBody}
                                    </td>
                                </tr>` : `
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">4</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">${t.step4TravelTitle}</strong><br>
                                        ${t.step4TravelBody}
                                    </td>
                                </tr>`}
                            </table>

                            <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-top: 28px;">
                                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                                    <strong>${t.rescheduleStrong}</strong> ${t.rescheduleRest}
                                </p>
                            </div>

                            ${showRenewal ? `
                            <div style="background:#f1f5f2;border:1px solid #c9d4cc;border-radius:10px;padding:18px 20px;margin-top:20px;text-align:center;">
                                <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;">${t.renewalTitle}</p>
                                <p style="margin:0 0 14px;font-size:13px;color:#475569;line-height:1.5;">${t.renewalBody}</p>
                                <a href="${escapeHtml(renewalHref)}" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;">${t.renewalCta}</a>
                            </div>` : ''}

                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 32px 20px; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
                                ${t.footerContact}
                                <a href="mailto:info@lonclinic.com" style="color: #3b82f6; text-decoration: none;">info@lonclinic.com</a>
                            </p>
                            <p style="margin: 0 0 16px; font-size: 13px; color: #94a3b8;">
                                ${t.footerOrCall} <a href="tel:+351928372775" style="color: #3b82f6; text-decoration: none;">+351 928 372 775</a>
                            </p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
                            <p style="margin: 0; font-size: 11px; color: #cbd5e1;">${t.footerCopy}</p>
                            <p style="margin: 4px 0 0; font-size: 11px; color: #cbd5e1;">${t.footerAuto}</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const textStep2 = doxyUrl ? t.textStep2Doxy(doxyUrl) : t.textStep2NoDoxy;
    const textStep4 = isTravel ? t.textStep4Travel : t.textStep4Report;

    const text = `
${t.textHead} — ${bookingRef}

${t.textThanks(patientName)}

${t.textDetails}
───────────────
${t.textService}:     ${serviceLabel}
${t.textDate}:        ${date}
${t.textTime}:        ${time}
${t.textFormat}:      ${t.formatVideo}
${isMulti ? `${t.textTravellers}:  ${travellerCount}\n` : ''}${isTravel && travelDest ? `${t.textDest}: ${travelDest}\n` : ''}${isTravel && travelDates ? `${t.textTravelDates}: ${travelDates}\n` : ''}${t.textTotalPaid}:  ${formattedAmount}

${t.textWhatsNext}
─────────────────
1. ${intakeUrl ? t.textStep1WithLink(intakeUrl) : t.textStep1}
2. ${textStep2}
3. ${t.textStep3}
4. ${textStep4}

${t.textReschedule}
${showRenewal ? `\n${t.textRenewal}\n${renewalHref}\n` : ''}
info@lonclinic.com | +351 928 372 775
${t.textFooterCopy}
`;

    return { html, text, subject: t.subject(serviceLabel, date, bookingRef, time) };
}

/* ========================================
   SEND CONFIRMATION EMAIL
======================================== */

async function sendConfirmationEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — skipping confirmation email');
        console.log('   📧 Would have sent to:', data.email);
        return false;
    }

    const to = (data.email || '').trim();
    if (!to || !to.includes('@')) {
        console.error('   ⚠️  Confirmation email skipped — missing or invalid recipient:', data.email);
        return false;
    }

    try {
        const payload = {
            ...data,
            doxyUrl: data.doxyUrl || (await resolveDoxyRoomUrl(data.professional)),
            intakeUrl: data.intakeUrl || (data.intakeToken ? patientIntakeUrl(data.intakeToken) : '')
        };
        const { html, text, subject } = buildConfirmationEmail(payload);

        const info = await deliverEmail({
            from: EMAIL_FROM,
            to,
            subject,
            text: text,
            html: html,
        });

        console.log('   ✉️  Confirmation email sent to:', data.email, '| Message ID:', info.messageId);
        return true;
    } catch (err) {
        console.error('   ❌ Failed to send confirmation email:', err.message);
        return false;
    }
}

/* ========================================
   BUILD ADMIN NOTIFICATION EMAIL
======================================== */

function buildAdminNotificationEmail(data) {
    const {
        bookingRef,
        patientName,
        email: patientEmail,
        service,
        serviceLabel,
        date,
        time,
        amount,
        currency,
        travellerCount,
        hasInsurance,
        passengers,
        travelDest,
        travelDates,
        contactPhone
    } = data;

    const formattedAmount = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'EUR'
    }).format(amount / 100);

    const isTravel = service === 'travel';
    const isMulti = travellerCount > 1;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">

                    <!-- Header -->
                    <tr>
                        <td style="text-align: center; padding: 0 0 32px;">
                            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">longevity</h1>
                            <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">clinic</p>
                        </td>
                    </tr>

                    <!-- Main Card -->
                    <tr>
                        <td style="background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

                            <!-- Notification Icon -->
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; width: 56px; height: 56px; background: #eef4fb; border-radius: 50%; line-height: 56px; text-align: center;">
                                    <span style="font-size: 28px;">📅</span>
                                </div>
                            </div>

                            <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center;">New Booking Received</h2>
                            <p style="margin: 0 0 32px; font-size: 15px; color: #64748b; text-align: center; line-height: 1.5;">
                                A new appointment has been booked and payment received.
                            </p>

                            <!-- Booking Reference -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; text-align: center; margin-bottom: 28px;">
                                <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Booking Reference</p>
                                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.05em;">
                                    ${bookingRef}
                                </p>
                            </div>

                            <!-- Booking Details -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Service</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <span style="color: #475569; font-size: 14px;">${serviceLabel}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Date & Time</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <span style="color: #475569; font-size: 14px;">${date} at ${time}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Patient Name</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <span style="color: #475569; font-size: 14px;">${patientName}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Patient Email</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <a href="mailto:${patientEmail}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${patientEmail}</a>
                                    </td>
                                </tr>
                                ${contactPhone ? `
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Phone</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <a href="tel:${contactPhone}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${contactPhone}</a>
                                    </td>
                                </tr>
                                ` : ''}
                                ${isMulti ? `
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Number of Travellers</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <span style="color: #475569; font-size: 14px;">${travellerCount}</span>
                                    </td>
                                </tr>
                                ` : ''}
                                ${isTravel && travelDest ? `
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Travel Destination</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <span style="color: #475569; font-size: 14px;">${travelDest}</span>
                                    </td>
                                </tr>
                                ` : ''}
                                ${isTravel && travelDates ? `
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Travel Dates</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <span style="color: #475569; font-size: 14px;">${travelDates}</span>
                                    </td>
                                </tr>
                                ` : ''}
                                ${hasInsurance ? `
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Insurance</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                        <span style="color: #475569; font-size: 14px;">Medicare</span>
                                    </td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <strong style="color: #0f172a; font-size: 14px;">Amount Paid</strong>
                                    </td>
                                    <td style="padding: 12px 0; text-align: right;">
                                        <span style="color: #0f172a; font-size: 16px; font-weight: 700;">${formattedAmount}</span>
                                    </td>
                                </tr>
                            </table>

                            ${isMulti && passengers && passengers.length > 0 ? `
                            <!-- Passengers List -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
                                <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">All Travellers</h3>
                                ${passengers.map((p, i) => `
                                    <div style="padding: 8px 0; ${i < passengers.length - 1 ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
                                        <strong style="color: #0f172a; font-size: 14px;">Traveller ${i + 1}:</strong>
                                        <span style="color: #475569; font-size: 14px;"> ${p}</span>
                                    </div>
                                `).join('')}
                            </div>
                            ` : ''}

                            <!-- Action Note -->
                            <div style="background: #eef4fb; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin-top: 28px;">
                                <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                                    <strong>Action Required:</strong> Please prepare for this consultation and ensure the video call link is ready.
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 20px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #cbd5e1;">&copy; 2026 Longevity Clinic. All rights reserved.</p>
                            <p style="margin: 4px 0 0; font-size: 11px; color: #cbd5e1;">This is an automated notification email.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const text = `
NEW BOOKING NOTIFICATION — ${bookingRef}

A new appointment has been booked and payment received.

BOOKING DETAILS
───────────────
Service:        ${serviceLabel}
Date & Time:    ${date} at ${time}
Patient Name:   ${patientName}
Patient Email:   ${patientEmail}
${contactPhone ? `Phone:           ${contactPhone}\n` : ''}${isMulti ? `Travellers:      ${travellerCount}\n` : ''}${isTravel && travelDest ? `Destination:     ${travelDest}\n` : ''}${isTravel && travelDates ? `Travel Dates:    ${travelDates}\n` : ''}${hasInsurance ? `Insurance:       Medicare\n` : ''}Amount Paid:     ${formattedAmount}

${isMulti && passengers && passengers.length > 0 ? `
ALL TRAVELLERS
──────────────
${passengers.map((p, i) => `Traveller ${i + 1}: ${p}`).join('\n')}

` : ''}
ACTION REQUIRED: Please prepare for this consultation and ensure the video call link is ready.

© 2026 Longevity Clinic
`;

    return { html, text };
}

/* ========================================
   SEND ADMIN NOTIFICATION EMAIL
======================================== */

async function sendAdminNotificationEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — skipping admin notification');
        return false;
    }

    try {
        const { html, text } = buildAdminNotificationEmail(data);

        const info = await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            subject: `New Booking: ${data.serviceLabel} — ${data.date} at ${data.time} | Ref: ${data.bookingRef}`,
            text: text,
            html: html,
        });

        console.log('   📧 Admin notification sent to:', CONTACT_EMAIL, '| Message ID:', info.messageId);
        return true;
    } catch (err) {
        console.error('   ❌ Failed to send admin notification:', err.message);
        return false;
    }
}

/* ========================================
   BUILD CONTACT INQUIRY EMAIL
======================================== */
function escapeHtml(input) {
    return String(input || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const INTERVIEW_ROLE_LABELS = {
    psicologia: 'Psicologia',
    'medicina-geral': 'Medicina geral',
    'saude-mental': 'Saúde mental (medicina)',
    'medicina-viajante': 'Medicina do viajante',
    longevidade: 'Longevidade',
    nutricao: 'Nutrição',
    'operacoes-e-suporte': 'Operações e suporte',
    outros: 'Outro'
};

function buildInterviewConfirmationEmail(data) {
    const name = escapeHtml(data.patientName);
    const dateLabel = escapeHtml(data.dateLabel || data.date);
    const time = escapeHtml(data.time);
    const ref = escapeHtml(data.bookingRef);
    const role = escapeHtml(data.roleLabel || '');
    const doxyUrl = doxyUrlFromEmailData(data);
    const doxyHref = escapeHtml(doxyUrl);
    const doxyBtn = doxyUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 8px;">
    <tr>
        <td align="center" style="padding:0;">
            <a href="${doxyHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">Abrir sala de vídeo</a>
        </td>
    </tr>
</table>
<p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.5;">Abra este link à hora marcada — não é necessária qualquer instalação. A equipa admite-o(a) na sala Doxy.me.</p>`
        : '<p style="margin:0;font-size:14px;color:#475569;line-height:1.5;">O link da videochamada será enviado pela equipa antes da entrevista.</p>';

    const subject = `Entrevista Lon Clinic — ${data.dateLabel || data.date} às ${data.time}`;
    const html = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f0f4fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4fa;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td style="text-align:center;padding:0 0 28px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">Lon Clinic</h1>
<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.08em;">Entrevista de emprego</p>
</td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Entrevista marcada</h2>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;text-align:center;line-height:1.5;">Olá ${name}, a sua entrevista ficou reservada.</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;text-align:center;margin-bottom:22px;">
<p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Referência</p>
<p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:0.05em;">${ref}</p>
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;">
<tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Data</td>
<td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid #f1f5f9;">${dateLabel}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Hora (Lisboa)</td>
<td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid #f1f5f9;">${time}</td></tr>
${role ? `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Área</td>
<td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;text-align:right;border-bottom:1px solid #f1f5f9;">${role}</td></tr>` : ''}
<tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Formato</td>
<td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;text-align:right;">Videochamada · 30 min</td></tr>
</table>
<h3 style="margin:0 0 10px;font-size:16px;font-weight:600;color:#0f172a;">Sala de vídeo</h3>
${doxyBtn}
<p style="margin:22px 0 0;font-size:13px;color:#64748b;line-height:1.55;">Se precisar de alterar o horário, responda a este email com pelo menos 24 horas de antecedência.</p>
</td></tr>
<tr><td style="padding:28px 16px;text-align:center;">
<p style="margin:0;font-size:13px;color:#94a3b8;">Dúvidas? <a href="mailto:info@lonclinic.com" style="color:#255235;text-decoration:none;">info@lonclinic.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    const text = [
        'ENTREVISTA MARCADA — Lon Clinic',
        '',
        `Olá ${data.patientName}, a sua entrevista ficou reservada.`,
        '',
        `Referência: ${data.bookingRef}`,
        `Data: ${data.dateLabel || data.date}`,
        `Hora (Lisboa): ${data.time}`,
        data.roleLabel ? `Área: ${data.roleLabel}` : '',
        'Formato: Videochamada · 30 min',
        '',
        doxyUrl ? `Sala de vídeo (abra à hora marcada, sem instalação):\n${doxyUrl}` : 'O link da videochamada será enviado pela equipa.',
        '',
        'Para alterar o horário, responda a este email com pelo menos 24 horas de antecedência.',
        '',
        'Lon Clinic — info@lonclinic.com'
    ].join('\n');

    return { html, text, subject };
}

async function sendInterviewConfirmationEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — skipping interview confirmation');
        return false;
    }
    const to = (data.email || '').trim();
    if (!to || !to.includes('@')) return false;
    try {
        const payload = {
            ...data,
            doxyUrl: data.doxyUrl || (await resolveDoxyRoomUrl(data.professional))
        };
        const { html, text, subject } = buildInterviewConfirmationEmail(payload);
        await deliverEmail({ from: EMAIL_FROM, to, subject, text, html });
        console.log('   ✉️  Interview confirmation sent to:', to);
        return true;
    } catch (err) {
        console.error('   ❌ Interview confirmation failed:', err.message);
        return false;
    }
}

async function sendInterviewAdminEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — skipping interview admin notice');
        return false;
    }
    const dateLabel = data.dateLabel || data.date;
    const notes = String(data.notes || '').trim();
    const doxyUrl = doxyUrlFromEmailData(data);
    const subject = `Entrevista: ${data.patientName} (${data.roleLabel}) — ${dateLabel} ${data.time}`;
    const lines = [
        'ENTREVISTA DE EMPREGO MARCADA',
        '',
        `Nome: ${data.patientName}`,
        `Email: ${data.email}`,
        `Telefone: ${data.patientPhone || ''}`,
        `Área: ${data.roleLabel || ''}`,
        `Data: ${dateLabel}`,
        `Hora: ${data.time}`,
        `Referência: ${data.bookingRef}`,
        doxyUrl ? `Doxy: ${doxyUrl}` : '',
        notes ? `Nota: ${notes}` : ''
    ].filter(Boolean);
    try {
        await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            subject,
            text: lines.join('\n'),
            html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(lines.join('\n'))}</pre>`
        });
        console.log('   📧 Interview admin notice sent to:', CONTACT_EMAIL);
        return true;
    } catch (err) {
        console.error('   ❌ Interview admin notice failed:', err.message);
        return false;
    }
}

function buildContactInquiryEmail(data) {
    const name = escapeHtml(data.name);
    const email = escapeHtml(data.email);
    const phone = escapeHtml(data.phone);
    const message = escapeHtml(data.message).replace(/\n/g, '<br>');
    const submittedAt = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Lisbon' });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Message</title>
</head>
<body style="margin: 0; padding: 24px; background: #f6f8fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <h1 style="margin: 0 0 18px; font-size: 22px; color: #111827;">New Contact Form Submission</h1>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280; width: 140px;">Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #111827; font-weight: 600;">${name}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Phone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4;"><a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Message</td>
                <td style="padding: 10px 0; color: #111827; line-height: 1.6;">${message}</td>
            </tr>
        </table>
        <p style="margin: 18px 0 0; color: #9ca3af; font-size: 12px;">Submitted at ${submittedAt} (Lisbon time)</p>
    </div>
</body>
</html>`;

    const text = `
NEW CONTACT FORM SUBMISSION

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone}
Submitted at: ${submittedAt} (Lisbon time)

Message:
${data.message}
`.trim();

    return { html, text };
}

function buildCareersApplicationEmail(data) {
    const name = escapeHtml(data.name);
    const email = escapeHtml(data.email);
    const phone = escapeHtml(data.phone);
    const role = escapeHtml(data.role);
    const message = escapeHtml(data.message).replace(/\n/g, '<br>');
    const attachmentName = data.attachmentName ? escapeHtml(data.attachmentName) : 'No attachment';
    const submittedAt = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

    const html = `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova candidatura</title>
</head>
<body style="margin: 0; padding: 24px; background: #f6f8fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <h1 style="margin: 0 0 18px; font-size: 22px; color: #111827;">Nova candidatura recebida</h1>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280; width: 180px;">Nome</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #111827; font-weight: 600;">${name}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Telefone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4;"><a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Área de interesse</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #111827;">${role}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Anexo</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #111827;">${attachmentName}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Mensagem</td>
                <td style="padding: 10px 0; color: #111827; line-height: 1.6;">${message}</td>
            </tr>
        </table>
        <p style="margin: 18px 0 0; color: #9ca3af; font-size: 12px;">Submetido em ${submittedAt} (hora de Lisboa)</p>
    </div>
</body>
</html>`;

    const text = `
NOVA CANDIDATURA

Nome: ${data.name}
Email: ${data.email}
Telefone: ${data.phone}
Área de interesse: ${data.role}
Anexo: ${data.attachmentName || 'Sem anexo'}
Submetido em: ${submittedAt} (hora de Lisboa)

Mensagem:
${data.message}
`.trim();

    return { html, text };
}

function buildComplaintEmail(data) {
    const name = escapeHtml(data.name);
    const citizenCard = escapeHtml(data.citizenCard);
    const email = escapeHtml(data.email);
    const phone = escapeHtml(data.phone);
    const message = escapeHtml(data.message).replace(/\n/g, '<br>');
    const submittedAt = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

    const html = `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova Reclamação</title>
</head>
<body style="margin: 0; padding: 24px; background: #f6f8fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <h1 style="margin: 0 0 18px; font-size: 22px; color: #111827;">Nova reclamação recebida</h1>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280; width: 160px;">Nome</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #111827; font-weight: 600;">${name}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">CC</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #111827;">${citizenCard}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Telefone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4;"><a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4; color: #6b7280;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eef1f4;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Texto</td>
                <td style="padding: 10px 0; color: #111827; line-height: 1.6;">${message}</td>
            </tr>
        </table>
        <p style="margin: 18px 0 0; color: #9ca3af; font-size: 12px;">Submetido em ${submittedAt} (hora de Lisboa)</p>
    </div>
</body>
</html>`;

    const text = `
NOVA RECLAMAÇÃO

Nome: ${data.name}
CC: ${data.citizenCard}
Telefone: ${data.phone}
Email: ${data.email}
Submetido em: ${submittedAt} (hora de Lisboa)

Texto:
${data.message}
`.trim();

    return { html, text };
}

/* ── Auto-reply i18n strings ── */
const AUTO_REPLY_I18N = {
    contact: {
        en: {
            subject: 'We received your message — Lon Clinic',
            heading: 'Thank you for contacting us',
            body: (name) => `Hello ${name},<br><br>We have received your message and will get back to you as soon as possible during business hours (Mon–Fri, 9h–18h Lisbon time).<br><br>If your matter is urgent, please call us directly.`,
            text: (name) => `Hello ${name},\n\nWe have received your message and will get back to you as soon as possible during business hours (Mon–Fri, 9h–18h Lisbon time).\n\nIf your matter is urgent, please call us directly.`,
            footer: 'Lon Clinic — Online Medical Consultations'
        },
        pt: {
            subject: 'Recebemos a sua mensagem — Lon Clinic',
            heading: 'Obrigado por nos contactar',
            body: (name) => `Olá ${name},<br><br>Recebemos a sua mensagem e responderemos com brevidade nos dias úteis (9h–18h, hora de Lisboa).<br><br>Se o assunto for urgente, por favor contacte-nos diretamente por telefone.`,
            text: (name) => `Olá ${name},\n\nRecebemos a sua mensagem e responderemos com brevidade nos dias úteis (9h–18h, hora de Lisboa).\n\nSe o assunto for urgente, por favor contacte-nos diretamente por telefone.`,
            footer: 'Lon Clinic — Consultas Médicas Online'
        },
        es: {
            subject: 'Hemos recibido su mensaje — Lon Clinic',
            heading: 'Gracias por contactarnos',
            body: (name) => `Hola ${name},<br><br>Hemos recibido su mensaje y le responderemos lo antes posible en horario laboral (lun–vie, 9h–18h hora de Lisboa).<br><br>Si su consulta es urgente, por favor contáctenos directamente por teléfono.`,
            text: (name) => `Hola ${name},\n\nHemos recibido su mensaje y le responderemos lo antes posible en horario laboral (lun–vie, 9h–18h hora de Lisboa).\n\nSi su consulta es urgente, por favor contáctenos directamente por teléfono.`,
            footer: 'Lon Clinic — Consultas Médicas Online'
        }
    },
    careers: {
        en: {
            subject: 'We received your application — Lon Clinic',
            heading: 'Thank you for your interest',
            body: (name) => `Hello ${name},<br><br>We have received your application and will review it carefully. If your profile matches our current needs, we will contact you within the next few weeks.`,
            text: (name) => `Hello ${name},\n\nWe have received your application and will review it carefully. If your profile matches our current needs, we will contact you within the next few weeks.`,
            footer: 'Lon Clinic — Online Medical Consultations'
        },
        pt: {
            subject: 'Recebemos a sua candidatura — Lon Clinic',
            heading: 'Obrigado pelo interesse',
            body: (name) => `Olá ${name},<br><br>Recebemos a sua candidatura e iremos analisá-la com atenção. Caso o seu perfil corresponda às nossas necessidades, entraremos em contacto nas próximas semanas.`,
            text: (name) => `Olá ${name},\n\nRecebemos a sua candidatura e iremos analisá-la com atenção. Caso o seu perfil corresponda às nossas necessidades, entraremos em contacto nas próximas semanas.`,
            footer: 'Lon Clinic — Consultas Médicas Online'
        },
        es: {
            subject: 'Hemos recibido su candidatura — Lon Clinic',
            heading: 'Gracias por su interés',
            body: (name) => `Hola ${name},<br><br>Hemos recibido su candidatura y la revisaremos con atención. Si su perfil se ajusta a nuestras necesidades actuales, nos pondremos en contacto en las próximas semanas.`,
            text: (name) => `Hola ${name},\n\nHemos recibido su candidatura y la revisaremos con atención. Si su perfil se ajusta a nuestras necesidades actuales, nos pondremos en contacto en las próximas semanas.`,
            footer: 'Lon Clinic — Consultas Médicas Online'
        }
    },
    complaints: {
        en: {
            subject: 'We received your complaint — Lon Clinic',
            heading: 'Your complaint has been received',
            body: (name) => `Hello ${name},<br><br>We have received your complaint and will respond within 5 business days (Mon–Fri, 9h–18h Lisbon time). We take all complaints seriously and will investigate the matter thoroughly.`,
            text: (name) => `Hello ${name},\n\nWe have received your complaint and will respond within 5 business days (Mon–Fri, 9h–18h Lisbon time). We take all complaints seriously and will investigate the matter thoroughly.`,
            footer: 'Lon Clinic — Online Medical Consultations'
        },
        pt: {
            subject: 'Recebemos a sua reclamação — Lon Clinic',
            heading: 'A sua reclamação foi recebida',
            body: (name) => `Olá ${name},<br><br>Recebemos a sua reclamação e responderemos no prazo máximo de 5 dias úteis (9h–18h, hora de Lisboa). Tomamos todas as reclamações a sério e iremos investigar a situação de forma diligente.`,
            text: (name) => `Olá ${name},\n\nRecebemos a sua reclamação e responderemos no prazo máximo de 5 dias úteis (9h–18h, hora de Lisboa). Tomamos todas as reclamações a sério e iremos investigar a situação de forma diligente.`,
            footer: 'Lon Clinic — Consultas Médicas Online'
        },
        es: {
            subject: 'Hemos recibido su reclamación — Lon Clinic',
            heading: 'Su reclamación ha sido recibida',
            body: (name) => `Hola ${name},<br><br>Hemos recibido su reclamación y responderemos en un plazo máximo de 5 días hábiles (lun–vie, 9h–18h hora de Lisboa). Tomamos todas las reclamaciones muy en serio e investigaremos el asunto de forma exhaustiva.`,
            text: (name) => `Hola ${name},\n\nHemos recibido su reclamación y responderemos en un plazo máximo de 5 días hábiles (lun–vie, 9h–18h hora de Lisboa). Tomamos todas las reclamaciones muy en serio e investigaremos el asunto de forma exhaustiva.`,
            footer: 'Lon Clinic — Consultas Médicas Online'
        }
    }
};

function buildAutoReplyEmail(type, name, locale) {
    const lang = ['en', 'pt', 'es'].includes(locale) ? locale : 'en';
    const strings = AUTO_REPLY_I18N[type][lang];
    const safeName = escapeHtml(name);

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${strings.subject}</title></head>
<body style="margin:0;padding:24px;background:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="background:#4A7C6F;padding:24px 28px;">
      <img src="https://www.lonclinic.com/logo.png" alt="Lon Clinic" height="32" style="display:block;height:32px;" onerror="this.style.display='none'">
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">${strings.heading}</h2>
      <p style="margin:0 0 24px;color:#374151;line-height:1.7;">${strings.body(safeName)}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">${strings.footer}</p>
    </div>
  </div>
</body>
</html>`;

    const text = strings.text(name);
    return { html, text, subject: strings.subject };
}

async function sendContactInquiryEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — cannot send contact inquiry');
        return false;
    }

    try {
        const { html, text } = buildContactInquiryEmail(data);
        const msgOneLine = String(data.message || '').replace(/\s+/g, ' ').trim();
        const msgPreview = msgOneLine
            ? (msgOneLine.length > 55 ? `${msgOneLine.slice(0, 55)}…` : msgOneLine)
            : '(empty message)';
        const info = await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.email,
            subject: `Contact form: ${data.name} — ${msgPreview}`,
            text,
            html
        });
        console.log('   📩 Contact inquiry sent to:', CONTACT_EMAIL, '| Message ID:', info.messageId);

        // Send auto-reply to user (non-critical — failure does not block success)
        if (data.email) {
            try {
                const locale = data.locale || 'en';
                const { html: rHtml, text: rText, subject: rSubject } = buildAutoReplyEmail('contact', data.name, locale);
                await deliverEmail({ from: EMAIL_FROM, to: data.email, subject: rSubject, text: rText, html: rHtml });
                console.log('   📩 Contact auto-reply sent to:', data.email);
            } catch (replyErr) {
                console.error('   ⚠️  Contact auto-reply failed (non-fatal):', replyErr.message);
            }
        }

        return true;
    } catch (err) {
        console.error('   ❌ Failed to send contact inquiry:', err.message);
        return false;
    }
}

const BURNOUT_INSTRUMENT_BLURB =
    'O Índice de Burnout é um questionário de rastreio baseado no Copenhagen Burnout Inventory (CBI). Ajuda a identificar sinais de desgaste pessoal e relacionado com o trabalho; a dimensão de sinais no corpo é complementar e não faz parte do CBI original. Não é um diagnóstico e não substitui uma avaliação clínica.';

const BURNOUT_SUB_BLURB =
    'Se já procuras acompanhamento continuado, a Subscrição Anti-Burnout inclui 4 consultas por mês — 216€/mês (54€/sessão, 10% face à avulsa), cancelável.';

function normalizeBurnoutBand(band, global) {
    const raw = String(band || '').trim().toUpperCase();
    if (raw === 'BAIXO' || raw === 'LIGEIRO' || raw === 'MODERADO' || raw === 'ELEVADO') return raw;
    const n = Number(global);
    if (!Number.isFinite(n)) return 'MODERADO';
    if (n <= 24) return 'BAIXO';
    if (n <= 49) return 'LIGEIRO';
    if (n <= 74) return 'MODERADO';
    return 'ELEVADO';
}

function burnoutDominantInsight(personal, work, body) {
    const scores = [
        { key: 'personal', n: Number(personal) || 0 },
        { key: 'work', n: Number(work) || 0 },
        { key: 'body', n: Number(body) || 0 }
    ];
    const max = Math.max(scores[0].n, scores[1].n, scores[2].n);
    const min = Math.min(scores[0].n, scores[1].n, scores[2].n);
    const leaders = scores.filter((s) => max - s.n <= 4);
    if (max - min <= 8 || leaders.length >= 2) {
        return {
            key: 'balanced',
            text: 'O que mais se destaca no teu resultado: os resultados das diferentes dimensões estão relativamente equilibrados, sugerindo que o desgaste não está concentrado numa única área.'
        };
    }
    const leader = scores.reduce((a, b) => (b.n > a.n ? b : a));
    if (leader.key === 'personal') {
        return {
            key: 'personal',
            text: 'O que mais se destaca no teu resultado: a dimensão de burnout pessoal apresenta a pontuação mais elevada. Isto pode refletir um nível importante de desgaste geral e dificuldade de recuperação, independentemente de uma situação profissional específica.'
        };
    }
    if (leader.key === 'work') {
        return {
            key: 'work',
            text: 'O que mais se destaca no teu resultado: a dimensão relacionada com o trabalho apresenta a pontuação mais elevada. Isto pode indicar que as exigências, ritmo ou contexto profissional estão a ter um peso importante no teu nível atual de desgaste.'
        };
    }
    return {
        key: 'body',
        text: 'O que mais se destaca no teu resultado: a dimensão relacionada com sinais no corpo apresenta a pontuação mais elevada. Isto significa que, além do desgaste emocional ou relacionado com o trabalho, existem mais sinais físicos associados ao teu estado atual.'
    };
}

function burnoutQuizBandCopy(band) {
    const copy = {
        BAIXO: {
            subject: 'O teu resultado no Índice de Burnout',
            levelLabel: 'nível baixo de sinais de desgaste',
            accent: '#1f4a3e',
            showProgram: false,
            interpret: [
                'O teu resultado global apresenta poucos sinais de desgaste neste momento. Ainda assim, as diferentes dimensões podem revelar áreas que merecem atenção, sobretudo se tens sentido alterações recentes na tua energia, motivação, sono ou capacidade de desligar do trabalho.'
            ],
            nextTitle: 'Se te sentes bem',
            next: [
                'Não há necessariamente necessidade de procurar acompanhamento por causa deste resultado. Podes simplesmente usá-lo como um ponto de referência e repetir a avaliação no futuro se sentires alterações.',
                'Se, apesar do resultado, tens sintomas que te preocupam ou que estão a interferir com o teu dia a dia, podes falar com um profissional.'
            ],
            ctaTitle: 'Queres perceber melhor o teu resultado?',
            ctaLead: '',
            emergency: ''
        },
        LIGEIRO: {
            subject: 'O teu resultado mostra sinais ligeiros de desgaste',
            levelLabel: 'nível ligeiro de sinais de desgaste',
            accent: '#3d7a68',
            showProgram: false,
            interpret: [
                'O teu resultado sugere sinais ligeiros de desgaste. Ainda não aponta para um quadro instalado, mas algumas dimensões da tua energia podem já estar a pedir atenção.',
                'Isto não significa, por si só, que tenhas burnout. Nesta fase, mudanças relativamente simples — descanso, limites e recuperação — tendem a ter mais efeito.'
            ],
            nextTitle: 'O que podes fazer agora',
            next: [
                'Se te sentes bem, podes usar este resultado como um ponto de referência e observar como evolui nas próximas semanas.',
                'Se estes sinais persistirem, aumentarem ou já te preocuparem, uma avaliação profissional pode ajudar a perceber o que está a acontecer.'
            ],
            ctaTitle: 'Queres perceber melhor o teu resultado?',
            ctaLead: '',
            emergency: ''
        },
        MODERADO: {
            subject: 'O teu resultado sugere sinais de desgaste moderado',
            levelLabel: 'nível moderado de sinais de desgaste',
            accent: '#c4744a',
            showProgram: true,
            interpret: [
                'O teu resultado sugere um nível moderado de desgaste. As dimensões com resultados mais elevados podem indicar áreas em que o teu corpo e a tua mente estão a ter mais dificuldade em recuperar das exigências do dia a dia.',
                'Isto não significa, por si só, que tenhas burnout clínico. É importante considerar também há quanto tempo te sentes assim, a intensidade dos sintomas e o impacto que estão a ter no teu sono, trabalho, relações e vida pessoal.'
            ],
            nextTitle: 'O que podes fazer agora',
            next: [
                'Se estes sinais são recentes e ligeiros, pode ser útil observar como evoluem nas próximas semanas, dando atenção ao descanso, sono, recuperação e limites entre trabalho e vida pessoal.',
                'Se o desgaste tem sido persistente, está a aumentar ou já está a interferir com o teu dia a dia, uma avaliação profissional pode ajudar a perceber o que está a acontecer e quais os próximos passos mais adequados.'
            ],
            ctaTitle: 'Começa o plano de acompanhamento',
            ctaLead: 'A subscrição Anti-Burnout — 216€/mês (4 consultas) é o próximo passo. A avaliação única de 60€ fica disponível se quiseres só um primeiro contacto.',
            emergency: ''
        },
        ELEVADO: {
            subject: 'O teu resultado merece atenção',
            levelLabel: 'nível elevado de sinais de desgaste',
            accent: '#b4532a',
            showProgram: true,
            interpret: [
                'O teu resultado apresenta um nível elevado de sinais de desgaste. As pontuações nas diferentes dimensões sugerem que pode estar a existir uma dificuldade significativa em recuperar das exigências do dia a dia.',
                'Este resultado não permite diagnosticar burnout por si só. No entanto, quando estes sinais são persistentes ou estão a interferir com o sono, energia, concentração, trabalho, relações ou vida pessoal, é importante não os ignorar.'
            ],
            nextTitle: 'O próximo passo',
            next: [
                'Neste nível de resultado, recomendamos considerar uma avaliação profissional para perceber a origem e a intensidade destes sintomas e determinar que tipo de acompanhamento poderá ser mais adequado.'
            ],
            ctaTitle: 'Começa o plano agora — 216€/mês',
            ctaLead: 'A subscrição semanal é o caminho em destaque. Na primeira sessão vemos o teu resultado CBI e definimos o plano. A avaliação única de 60€ fica como alternativa.',
            emergency: 'Se estiveres a passar por sofrimento intenso ou sentires que não estás seguro/a, procura ajuda médica urgente: 112 · SNS 24 808 24 24 24 · SOS Voz Amiga 213 544 545.'
        }
    };
    return copy[band] || copy.MODERADO;
}

function burnoutEmailParagraphs(texts) {
    return texts
        .filter(Boolean)
        .map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3d4a44;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${escapeHtml(t)}</p>`)
        .join('');
}

function burnoutEmailButton(href, label, primary) {
    const bg = primary ? '#255235' : '#ffffff';
    const color = primary ? '#ffffff' : '#255235';
    const border = primary ? '1px solid #1a3d22' : '1.5px solid #255235';
    return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 10px;">
<tr>
<td align="left" style="border-radius:10px;background:${bg};">
<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${bg};border:${border};color:${color};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 22px;border-radius:10px;">${escapeHtml(label)}</a>
</td>
</tr>
</table>`;
}

function burnoutDimBar(label, value, fill) {
    const n = Number(value);
    const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
    const display = Number.isFinite(n) ? String(Math.round(n)) : '—';
    const barWidth = pct < 3 && pct > 0 ? 3 : pct;
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;">
<tr>
<td style="font-size:13px;color:#5c6d64;padding:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${escapeHtml(label)}</td>
<td style="font-size:13px;font-weight:600;color:#1c2a24;text-align:right;padding:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${display}</td>
</tr>
<tr>
<td colspan="2" style="background:#e8eee9;border-radius:6px;padding:0;line-height:8px;font-size:0;">
${barWidth > 0 ? `<table role="presentation" width="${barWidth}%" cellspacing="0" cellpadding="0"><tr><td style="background:${fill};height:8px;border-radius:6px;font-size:0;line-height:8px;">&nbsp;</td></tr></table>` : `&nbsp;`}
</td>
</tr>
</table>`;
}

function burnoutBandVisual(band, copy) {
    const map = {
        BAIXO: { bg: '#e8f0ea', fg: '#255235' },
        LIGEIRO: { bg: '#e7f0ec', fg: '#3d7a68' },
        MODERADO: { bg: '#f8eee6', fg: '#c4744a' },
        ELEVADO: { bg: '#f6e8e4', fg: '#a4442a' }
    };
    return map[band] || { bg: copy.accent, fg: copy.accent };
}

function buildBurnoutQuizEmails(data) {
    const scores = data.scores || {};
    const globalNum = Number(scores.global);
    const personalNum = Number(scores.personal);
    const workNum = Number(scores.work);
    const bodyNum = Number(scores.body);
    const global = Number.isFinite(globalNum) ? Math.round(globalNum) : '—';
    const personal = Number.isFinite(personalNum) ? Math.round(personalNum) : '—';
    const work = Number.isFinite(workNum) ? Math.round(workNum) : '—';
    const body = Number.isFinite(bodyNum) ? Math.round(bodyNum) : '—';
    const band = normalizeBurnoutBand(data.band, globalNum);
    const copy = burnoutQuizBandCopy(band);
    const visual = burnoutBandVisual(band, copy);
    const dominant = burnoutDominantInsight(personalNum, workNum, bodyNum);
    const programUrl = emailLink(`${PUBLIC_SITE_URL}/marcar/burnout-mensal`, datedCampaign('burnout_quiz_email'), 'book-subscription');
    const bookUrl = emailLink(`${PUBLIC_SITE_URL}/marcar/burnout`, datedCampaign('burnout_quiz_email'), 'book-consult');
    const siteUrl = PUBLIC_SITE_URL;
    const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
    const barFill = copy.accent;

    const clinicSubject = `Teste burnout: ${band} (${global}/100) — ${data.email}`;
    const clinicText = [
        'Novo resultado — Índice de Burnout (Lon Clinic)',
        '',
        `Email: ${data.email}`,
        `Índice global: ${global}/100 (${band} — ${copy.levelLabel})`,
        `Pessoal: ${personal} · Trabalho: ${work} · Corpo: ${body}`,
        `Dimensão dominante: ${dominant.key}`,
        '',
        `Subscrição Anti-Burnout (216€/mês): ${programUrl}`,
        `Consulta avulsa 60€: ${bookUrl}`
    ].join('\n');

    const clinicHtml = `<!DOCTYPE html><html lang="pt"><body style="font-family:${font};line-height:1.5;color:#1c2a24;background:#f3f1ec;padding:24px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5c6d64">Novo resultado</p>
<h2 style="margin:0 0 16px;font-size:20px">Índice de Burnout</h2>
<p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(data.email)}</p>
<p style="margin:0 0 16px"><strong>Índice global:</strong> ${global}/100 · <span style="color:${visual.fg};font-weight:600">${escapeHtml(band)}</span></p>
${burnoutDimBar('Burnout pessoal', personal, barFill)}
${burnoutDimBar('Burnout no trabalho', work, barFill)}
${burnoutDimBar('Sinais no corpo', body, barFill)}
<p style="font-size:14px;color:#3d4a44">${escapeHtml(dominant.text)}</p>
<p style="margin:20px 0 0"><a href="${escapeHtml(programUrl)}" style="color:#255235">Subscrição 216€/mês</a> · <a href="${escapeHtml(bookUrl)}" style="color:#255235">Consulta 60€</a></p>
</td></tr></table>
</body></html>`;

    const userTextParts = [
        'Olá,',
        '',
        'Obrigada por completares o Índice de Burnout da Lon Clinic.',
        '',
        'O teu resultado',
        '',
        `Índice global: ${global}/100 — ${copy.levelLabel}`,
        `Burnout pessoal: ${personal}`,
        `Burnout no trabalho: ${work}`,
        `Sinais no corpo: ${body}`,
        '',
        ...copy.interpret,
        '',
        dominant.text,
        '',
        'O que é este instrumento?',
        '',
        BURNOUT_INSTRUMENT_BLURB,
        '',
        copy.nextTitle,
        '',
        ...copy.next
    ];
    if (copy.ctaTitle) {
        userTextParts.push('', copy.ctaTitle);
    }
    if (copy.ctaLead) {
        userTextParts.push('', copy.ctaLead);
    }
    userTextParts.push('', 'Começar o plano — 216€/mês:', programUrl);
    userTextParts.push('', BURNOUT_SUB_BLURB);
    userTextParts.push('', 'Ou avaliação única — 60€:', bookUrl);
    if (copy.emergency) {
        userTextParts.push('', copy.emergency);
    }
    userTextParts.push('', 'Lon Clinic', 'www.lonclinic.com');
    const userText = userTextParts.join('\n');

    const userHtml = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f1ec;font-family:${font};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f1ec;padding:32px 16px;">
<tr>
<td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">

<tr>
<td style="text-align:center;padding:0 0 28px;">
<p style="margin:0;font-size:22px;font-weight:700;color:#1c2a24;letter-spacing:-0.02em;">LON Clinic</p>
<p style="margin:6px 0 0;font-size:11px;color:#7a8a82;text-transform:uppercase;letter-spacing:0.16em;">Índice de Burnout</p>
</td>
</tr>

<tr>
<td style="background:#ffffff;border-radius:18px;padding:36px 32px 32px;box-shadow:0 8px 28px rgba(28,42,36,0.06);">

<p style="margin:0 0 6px;font-size:15px;color:#1c2a24;">Olá,</p>
<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#3d4a44;">Obrigada por completares o <strong style="color:#1c2a24">Índice de Burnout</strong> da Lon Clinic.</p>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
<tr>
<td style="background:${visual.bg};border-radius:14px;padding:28px 24px;text-align:center;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${visual.fg};">O teu resultado</p>
<p style="margin:0 0 8px;font-size:48px;font-weight:700;letter-spacing:-0.04em;line-height:1;color:#1c2a24;">${global}<span style="font-size:16px;font-weight:500;color:#5c6d64;"> /100</span></p>
<p style="margin:0;display:inline-block;background:#ffffff;color:${visual.fg};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:6px 12px;border-radius:999px;">${escapeHtml(copy.levelLabel)}</p>
</td>
</tr>
</table>

${burnoutDimBar('Burnout pessoal', personal, barFill)}
${burnoutDimBar('Burnout no trabalho', work, barFill)}
${burnoutDimBar('Sinais no corpo', body, barFill)}

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;">
<tr>
<td style="border-left:3px solid ${visual.fg};background:#f7f8f6;padding:14px 16px;border-radius:0 10px 10px 0;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#3d4a44;">${escapeHtml(dominant.text)}</p>
</td>
</tr>
</table>

${burnoutEmailParagraphs(copy.interpret)}

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;">
<tr>
<td style="background:#f7f8f6;border-radius:12px;padding:16px 18px;">
<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5c6d64;">O que é este instrumento?</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#5c6d64;">${escapeHtml(BURNOUT_INSTRUMENT_BLURB)}</p>
</td>
</tr>
</table>

<p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1c2a24;">${escapeHtml(copy.nextTitle)}</p>
${burnoutEmailParagraphs(copy.next)}

<p style="margin:18px 0 8px;font-size:16px;font-weight:700;color:#1c2a24;">${escapeHtml(copy.ctaTitle)}</p>
${copy.ctaLead ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d4a44;">${escapeHtml(copy.ctaLead)}</p>` : ''}
${burnoutEmailButton(programUrl, 'Começar o plano — 216€/mês', true)}
<p style="margin:16px 0 12px;font-size:14px;line-height:1.6;color:#3d4a44;">${escapeHtml(BURNOUT_SUB_BLURB)}</p>
${burnoutEmailButton(bookUrl, 'Avaliação única — 60€', false)}
${copy.emergency ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;"><tr><td style="background:#f6e8e4;border-radius:10px;padding:14px 16px;"><p style="margin:0;font-size:13px;line-height:1.55;color:#6b3a2e;">${escapeHtml(copy.emergency)}</p></td></tr></table>` : ''}

</td>
</tr>

<tr>
<td style="padding:28px 8px 8px;text-align:center;">
<p style="margin:0 0 4px;font-size:12px;color:#7a8a82;">Lon Clinic</p>
<p style="margin:0;font-size:12px;"><a href="${escapeHtml(siteUrl)}" style="color:#7a8a82;text-decoration:none;">www.lonclinic.com</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

    return {
        clinic: { subject: clinicSubject, text: clinicText, html: clinicHtml },
        user: { subject: copy.subject, text: userText, html: userHtml }
    };
}

async function sendBurnoutQuizEmails(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — burnout quiz result not emailed');
        return false;
    }
    try {
        const { clinic, user } = buildBurnoutQuizEmails(data);
        await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.email,
            subject: clinic.subject,
            text: clinic.text,
            html: clinic.html
        });
        await deliverEmail({
            from: EMAIL_FROM,
            to: data.email,
            subject: user.subject,
            text: user.text,
            html: user.html
        });
        console.log('   📩 Burnout quiz emails sent:', data.email);
        return true;
    } catch (err) {
        console.error('   ❌ Failed to send burnout quiz emails:', err.message);
        return false;
    }
}

async function sendClinicalQuizEmails(def, data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — clinical quiz result not emailed');
        return false;
    }
    try {
        const { clinic, user } = clinicalQuizzes.buildEmails(def, data, {
            escapeHtml,
            emailLink,
            siteUrl: PUBLIC_SITE_URL
        });
        await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.email,
            subject: clinic.subject,
            text: clinic.text,
            html: clinic.html
        });
        await deliverEmail({
            from: EMAIL_FROM,
            to: data.email,
            subject: user.subject,
            text: user.text,
            html: user.html
        });
        console.log('   📩 Clinical quiz emails sent:', def.id, data.email);
        return true;
    } catch (err) {
        console.error('   ❌ Failed to send clinical quiz emails:', err.message);
        return false;
    }
}

const QUIZ_RECOVERY_MS = 15 * 60 * 1000;
const quizLeadMemory = new Map();

function normalizePtMobile(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('351') === 0) d = d.slice(3);
    if (d.length === 9 && d.charAt(0) === '9') return '+351' + d;
    return '';
}

function quizLeadKey(email) {
    return String(email || '').trim().toLowerCase();
}

function rememberQuizLead(lead) {
    const key = quizLeadKey(lead && lead.email);
    if (!key) return;
    quizLeadMemory.set(key, Object.assign({}, quizLeadMemory.get(key) || {}, lead, { email: key }));
}

async function patchQuizLead(email, patch, quizId) {
    const key = quizLeadKey(email);
    if (!key) return;
    const prev = quizLeadMemory.get(key) || { email: key };
    quizLeadMemory.set(key, Object.assign({}, prev, patch));
    if (usePersistentDb) {
        try { await db.mergeQuizAttemptResultByEmail(key, patch, quizId || null); } catch (err) {
            console.error('   ⚠️  quiz lead patch:', err.message);
        }
    }
}

async function markQuizLeadConverted(email) {
    await patchQuizLead(email, { convertedAt: Date.now(), recoveredAt: Date.now() });
}

async function markQuizLeadCheckoutStarted(email) {
    await patchQuizLead(email, { checkoutStartedAt: Date.now(), recoverAt: Date.now() + QUIZ_RECOVERY_MS });
}

function clinicWhatsAppHref(lead) {
    const first = String(lead.firstName || lead.leadName || '').trim() || 'olá';
    const text = `Olá ${first}, sou da coordenação clínica da LON. Vi que concluiu a sua avaliação metabólica. Ficou com alguma dúvida sobre como funcionam os exames de sangue ou o agendamento da 1.ª consulta médica?`;
    const phone = String(lead.phone || lead.leadPhone || '').replace(/\D/g, '') || CLINIC_WHATSAPP;
    const to = phone.indexOf('351') === 0 ? phone : (phone.length === 9 ? '351' + phone : CLINIC_WHATSAPP);
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

async function sendQuizRecovery(lead) {
    const email = quizLeadKey(lead.email);
    if (!email) return false;
    const first = String(lead.firstName || lead.leadName || '').trim();
    const hello = first ? `Olá ${first}` : 'Olá';
    const bookUrl = String(lead.bookUrl || `${PUBLIC_SITE_URL}/marcar/nutricao-programa?ref=quiz-recovery`);
    const waHref = clinicWhatsAppHref(lead);
    const bodyText = [
        `${hello}, sou da coordenação clínica da LON.`,
        '',
        'Vi que concluiu a sua avaliação metabólica. Ficou com alguma dúvida sobre como funcionam os exames de sangue ou o agendamento da 1.ª consulta médica?',
        '',
        `Marcar a 1.ª consulta: ${bookUrl}`,
        '',
        'LON Clinic'
    ].join('\n');
    try {
        if (isEmailConfigured) {
            await deliverEmail({
                from: EMAIL_FROM,
                to: email,
                subject: 'A sua avaliação metabólica — dúvidas sobre a 1.ª consulta?',
                text: bodyText
            });
            await deliverEmail({
                from: EMAIL_FROM,
                to: CONTACT_EMAIL,
                subject: `Recuperar checkout: ${email}`,
                text: [
                    'Lead do quiz sem pagamento (15 min).',
                    `Nome: ${first || '—'}`,
                    `Email: ${email}`,
                    `WhatsApp: ${lead.phone || lead.leadPhone || '—'}`,
                    `Quiz: ${lead.quizId || '—'}`,
                    '',
                    `Enviar WhatsApp agora: ${waHref}`,
                    `Checkout: ${bookUrl}`
                ].join('\n')
            });
        }
        emitServerAnalytics('recovery_sent', { props: { quiz: lead.quizId || 'clinical', channel: 'email_whatsapp' } }).catch(() => {});
        await patchQuizLead(email, { recoveredAt: Date.now() });
        console.log('   📩 Quiz checkout recovery sent:', email);
        return true;
    } catch (err) {
        console.error('   ❌ Quiz recovery failed:', err.message);
        return false;
    }
}

async function runQuizLeadRecoveries() {
    const now = Date.now();
    const due = [];
    for (const lead of quizLeadMemory.values()) {
        if (!lead.email || lead.recoveredAt || lead.convertedAt) continue;
        if (lead.quizId === 'nutricao-avaliacao') continue;
        if (Number(lead.recoverAt) && Number(lead.recoverAt) <= now) due.push(lead);
    }
    if (usePersistentDb) {
        try {
            const rows = await db.findDueQuizRecoveries(now);
            for (const row of rows) {
                const result = row.result || {};
                if (result.recoveredAt || result.convertedAt) continue;
                if (row.quizId === 'nutricao-avaliacao') continue;
                due.push({
                    email: row.email,
                    quizId: row.quizId,
                    firstName: result.leadName || '',
                    phone: result.leadPhone || '',
                    leadName: result.leadName || '',
                    leadPhone: result.leadPhone || '',
                    bookUrl: result.bookUrl || '',
                    recoverAt: Number(result.recoverAt) || 0
                });
            }
        } catch (err) {
            console.error('   ⚠️  findDueQuizRecoveries:', err.message);
        }
    }
    const seen = new Set();
    for (const lead of due) {
        const key = quizLeadKey(lead.email);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        await sendQuizRecovery(lead);
    }
}

const NUTRICAO_AVALIACAO_LABELS = {
    goal: {
        lose: 'Perder peso de forma sustentável e sem efeito io-io',
        markers: 'Melhorar marcadores de saúde (glicemia, colesterol, tensão arterial)',
        energy: 'Ganhar energia diária e combater o cansaço/burnout',
        all: 'Todos os anteriores'
    },
    diets: {
        first: 'É a primeira vez que procuro acompanhamento',
        few: '1 a 3 vezes',
        yoyo: 'Mais de 4 vezes (perde e recupera)'
    },
    eating: {
        rare: 'Raras vezes — organizar refeições e consistência',
        some: 'Algumas vezes — doces ou comida de conforto em dias difíceis',
        frequent: 'Frequente — fome emocional, ansiedade à noite ou compulsão'
    },
    labs: {
        recent: 'Há menos de 6 meses',
        year: 'Há mais de 1 ano',
        unknown: 'Não me recordo / há vários anos'
    }
};

function nutricaoAvaliacaoPlanLabel(plan) {
    return plan === 'completo' ? 'Programa Completo (1 162 €)' : 'Programa Nutrição (490 €)';
}

function nutricaoNurtureCtaUrl(plan, step) {
    const href = nutricaoNurture.checkoutHref(plan);
    return emailLink(`${PUBLIC_SITE_URL}${href}`, datedCampaign('nutricao_nurture_' + step), 'nurture-' + step);
}

function enrollNutricaoNurture(data) {
    const claimedAt = Date.now();
    rememberQuizLead({
        email: data.email,
        firstName: nutricaoNurture.firstNameOf(data.name),
        leadName: data.name,
        phone: data.phone,
        leadPhone: data.phone,
        quizId: 'nutricao-avaliacao',
        plan: data.plan,
        profile: nutricaoNurture.planMeta(data.plan).profile,
        claimedAt,
        nurtureStep: 0,
        convertedAt: 0,
        recoveredAt: 0
    });
    return claimedAt;
}

function buildNutricaoAvaliacaoEmails(data) {
    const plan = nutricaoAvaliacaoPlanLabel(data.plan);
    const L = NUTRICAO_AVALIACAO_LABELS;
    const clinicText = [
        'Avaliação metabólica (landing programa 6 meses)',
        `Nome: ${data.name}`,
        `Email: ${data.email}`,
        `Telefone: ${data.phone}`,
        `Plano recomendado: ${plan}`,
        '',
        `Objetivo: ${L.goal[data.goal] || data.goal}`,
        `Histórico de dietas: ${L.diets[data.diets] || data.diets}`,
        `Relação com a comida: ${L.eating[data.eating] || data.eating}`,
        `Últimas análises: ${L.labs[data.labs] || data.labs}`,
        `Idade: ${data.age}`,
        `Altura: ${data.height} cm`,
        `Peso atual: ${data.weight} kg`,
        `Peso desejado: ${data.desiredWeight} kg`,
        data.imc != null ? `IMC aproximado: ${data.imc}` : ''
    ].filter(Boolean).join('\n');
    const clinicHtml = `<p><strong>Avaliação metabólica</strong> — programa 6 meses</p>
<p>${escapeHtml(data.name)} · ${escapeHtml(data.email)} · ${escapeHtml(data.phone)}</p>
<p><strong>Plano recomendado:</strong> ${escapeHtml(plan)}</p>
<ul>
<li>Objetivo: ${escapeHtml(L.goal[data.goal] || data.goal)}</li>
<li>Dietas: ${escapeHtml(L.diets[data.diets] || data.diets)}</li>
<li>Relação com a comida: ${escapeHtml(L.eating[data.eating] || data.eating)}</li>
<li>Análises: ${escapeHtml(L.labs[data.labs] || data.labs)}</li>
<li>Idade ${escapeHtml(data.age)} · ${escapeHtml(data.height)} cm · ${escapeHtml(data.weight)} kg → ${escapeHtml(data.desiredWeight)} kg${data.imc != null ? ` · IMC ${escapeHtml(data.imc)}` : ''}</li>
</ul>`;
    return {
        clinic: {
            subject: `Avaliação metabólica · ${data.name} · ${plan}`,
            text: clinicText,
            html: clinicHtml
        }
    };
}

async function sendNutricaoAvaliacaoEmails(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — nutrition screening not emailed');
        return false;
    }
    try {
        const { clinic } = buildNutricaoAvaliacaoEmails(data);
        await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.email,
            subject: clinic.subject,
            text: clinic.text,
            html: clinic.html
        });
        console.log('   📩 Nutrition screening (clinic) emailed:', data.email);
        return true;
    } catch (err) {
        console.error('   ❌ Failed to send nutrition screening emails:', err.message);
        return false;
    }
}

async function sendNutricaoNurtureEmail(lead, step) {
    const email = quizLeadKey(lead.email);
    if (!email || lead.convertedAt) return false;
    const ctaUrl = nutricaoNurtureCtaUrl(lead.plan, step);
    const built = nutricaoNurture.buildStepEmail({
        step,
        name: lead.leadName || lead.firstName || '',
        plan: lead.plan,
        ctaUrl,
        escapeHtml,
        buttonHtml: (href, label) => burnoutEmailButton(href, label, true)
    });
    try {
        await deliverEmail({
            from: EMAIL_FROM,
            to: email,
            replyTo: CONTACT_EMAIL,
            subject: built.subject,
            text: built.text,
            html: built.html
        });
        emitServerAnalytics('nurture_sent', {
            props: {
                quiz: 'nutricao-avaliacao',
                step,
                plan: lead.plan === 'completo' ? 'completo' : 'nutricao',
                profile: nutricaoNurture.planMeta(lead.plan).profile
            }
        }).catch(() => {});
        console.log(`   📩 Nutrition nurture ${step}/3 sent:`, email);
        return true;
    } catch (err) {
        console.error(`   ❌ Nutrition nurture ${step} failed:`, err.message);
        return false;
    }
}

function nutricaoNurtureLeadFromRow(row) {
    const result = row.result || {};
    const claimedMs = row.claimedAt ? Date.parse(row.claimedAt) : 0;
    return {
        id: row.id,
        email: row.email,
        quizId: 'nutricao-avaliacao',
        firstName: result.leadName || '',
        leadName: result.leadName || '',
        phone: result.leadPhone || '',
        leadPhone: result.leadPhone || '',
        plan: result.plan === 'completo' ? 'completo' : 'nutricao',
        claimedAt: claimedMs,
        nurtureStep: Number(result.nurtureStep) || 0,
        convertedAt: result.convertedAt || 0
    };
}

async function runNutricaoNurture() {
    if (!isEmailConfigured) return;
    const now = Date.now();
    const candidates = [];
    if (usePersistentDb) {
        try {
            const rows = await db.findDueNutricaoNurture();
            for (const row of rows) {
                const lead = nutricaoNurtureLeadFromRow(row);
                const step = nutricaoNurture.dueStep(lead.claimedAt, lead.nurtureStep, now);
                if (step) candidates.push(Object.assign({}, lead, { dueStep: step }));
            }
        } catch (err) {
            console.error('   ⚠️  findDueNutricaoNurture:', err.message);
        }
    } else {
        for (const lead of quizLeadMemory.values()) {
            if (lead.quizId !== 'nutricao-avaliacao' || !lead.email || lead.convertedAt) continue;
            const step = nutricaoNurture.dueStep(lead.claimedAt, lead.nurtureStep, now);
            if (step) candidates.push(Object.assign({}, lead, { dueStep: step }));
        }
    }
    const seen = new Set();
    for (const lead of candidates) {
        const key = quizLeadKey(lead.email) + ':' + lead.dueStep;
        if (!lead.email || seen.has(key)) continue;
        seen.add(key);
        const fromStep = lead.dueStep - 1;
        if (usePersistentDb && lead.id) {
            try {
                const claimed = await db.claimNutricaoNurtureStep(lead.id, fromStep, lead.dueStep, now);
                if (!claimed) continue;
            } catch (err) {
                console.error('   ⚠️  claimNutricaoNurtureStep:', err.message);
                continue;
            }
        } else {
            const mem = quizLeadMemory.get(quizLeadKey(lead.email));
            if (mem && (Number(mem.nurtureStep) || 0) !== fromStep) continue;
            if (mem && mem.convertedAt) continue;
        }
        const sent = await sendNutricaoNurtureEmail(lead, lead.dueStep);
        if (!sent) continue;
        const patch = { nurtureStep: lead.dueStep };
        patch['nurture' + lead.dueStep + 'At'] = now;
        await patchQuizLead(lead.email, patch, 'nutricao-avaliacao');
    }
}

async function sendCareersApplicationEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — cannot send careers application');
        return false;
    }

    try {
        const { html, text } = buildCareersApplicationEmail(data);
        const mailOptions = {
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.email,
            subject: `Candidatura: ${data.name} (${data.role})`,
            text,
            html
        };

        if (data.attachmentBuffer && data.attachmentName) {
            mailOptions.attachments = [{
                filename: data.attachmentName,
                content: data.attachmentBuffer,
                contentType: data.attachmentType || 'application/octet-stream'
            }];
        }

        const info = await deliverEmail(mailOptions);
        console.log('   📩 Careers application sent to:', CONTACT_EMAIL, '| Message ID:', info.messageId);

        // Send auto-reply to applicant (non-critical)
        if (data.email) {
            try {
                const locale = data.locale || 'pt';
                const { html: rHtml, text: rText, subject: rSubject } = buildAutoReplyEmail('careers', data.name, locale);
                await deliverEmail({ from: EMAIL_FROM, to: data.email, subject: rSubject, text: rText, html: rHtml });
                console.log('   📩 Careers auto-reply sent to:', data.email);
            } catch (replyErr) {
                console.error('   ⚠️  Careers auto-reply failed (non-fatal):', replyErr.message);
            }
        }

        return true;
    } catch (err) {
        console.error('   ❌ Failed to send careers application:', err.message);
        return false;
    }
}

async function sendComplaintEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — cannot send complaint');
        return false;
    }

    try {
        const { html, text } = buildComplaintEmail(data);
        const info = await deliverEmail({
            from: EMAIL_FROM,
            to: 'info@lonclinic.com',
            replyTo: data.email,
            subject: `Reclamação: ${data.name}`,
            text,
            html
        });
        console.log('   📩 Complaint sent to info@lonclinic.com | Message ID:', info.messageId);

        // Send auto-reply to complainant (non-critical)
        if (data.email) {
            try {
                const locale = data.locale || 'pt';
                const { html: rHtml, text: rText, subject: rSubject } = buildAutoReplyEmail('complaints', data.name, locale);
                await deliverEmail({ from: EMAIL_FROM, to: data.email, subject: rSubject, text: rText, html: rHtml });
                console.log('   📩 Complaints auto-reply sent to:', data.email);
            } catch (replyErr) {
                console.error('   ⚠️  Complaints auto-reply failed (non-fatal):', replyErr.message);
            }
        }

        return true;
    } catch (err) {
        console.error('   ❌ Failed to send complaint email:', err.message);
        return false;
    }
}

/* ========================================
   SERVICE LABELS MAP
======================================== */

const SERVICE_LABELS = {
    longevity: 'Longevity Assessment',
    'longevity-plus': 'Longevity Plus',
    travel: 'Travel Medicine Consultation',
    followup: 'Follow-up Consultation',
    entrevista: 'Entrevista de emprego'
};

function serviceLabelFromCode(service) {
    const s = String(service || '').trim();
    return SERVICE_LABELS[s] || s || 'Consultation';
}

/** Strings for 24h appointment reminder email */
const REMINDER_EMAIL_I18N = {
    en: {
        htmlLang: 'en',
        emailTitle: 'Appointment reminder',
        h2: 'Your appointment is coming up',
        lead: (name) =>
            `Hello ${name}, this is a friendly reminder that you have an online consultation with Longevity Clinic within the next 24 hours.`,
        refLabel: 'Booking reference',
        colService: 'Service',
        colDate: 'Date',
        colTime: 'Time',
        colFormat: 'Format',
        formatVideo: 'Secure video call',
        videoTitle: 'Join your video consultation',
        doxyBefore: 'Use our secure video room at your scheduled time:',
        doxyAfter: 'No download required — open the link in a modern browser.',
        joinVideoButton: 'Join Video Consultation',
        noDoxy: 'Video link details were included in your confirmation email. If you need help, reply to this message or contact us.',
        subject: (serviceLabel, date, ref) => `Reminder: ${serviceLabel} on ${date} | ${ref}`,
        textHead: 'APPOINTMENT REMINDER',
        textLead: (name) =>
            `Hello ${name}, you have an online consultation with Longevity Clinic within the next 24 hours.`,
        textDetails: 'APPOINTMENT DETAILS',
        textService: 'Service',
        textDate: 'Date',
        textTime: 'Time',
        textFormat: 'Format',
        textVideo: 'Video',
        textDoxy: (url) => `Join: ${url}`,
        textNoDoxy: 'See your confirmation email for the video link.',
        textFooterCopy: '© 2026 Longevity Clinic',
        rescheduleStrong: 'Need to reschedule?',
        rescheduleRest: 'Free rescheduling up to 24 hours before your appointment. Reply to this email or contact us.',
        intakeTitle: 'Clinical form still needed',
        intakeBody: 'Please complete your clinical details before the consultation (less than 2 minutes).',
        intakeButton: 'Fill in clinical form'
    },
    pt: {
        htmlLang: 'pt',
        emailTitle: 'Lembrete de consulta',
        h2: 'A sua consulta está a aproximar-se',
        lead: (name) =>
            `Olá ${name}, este é um lembrete amigável de que tem uma consulta online com a Longevity Clinic nas próximas 24 horas.`,
        refLabel: 'Referência',
        colService: 'Serviço',
        colDate: 'Data',
        colTime: 'Hora',
        colFormat: 'Formato',
        formatVideo: 'Videochamada segura',
        videoTitle: 'Entrar na videoconsulta',
        doxyBefore: 'Utilize a nossa sala de vídeo segura à hora marcada:',
        doxyAfter: 'Não é necessária qualquer instalação — abra a ligação num browser atualizado.',
        joinVideoButton: 'Entrar na consulta por vídeo',
        noDoxy: 'Os detalhes da ligação foram enviados no email de confirmação. Precisa de ajuda? Responda a este email ou contacte-nos.',
        subject: (serviceLabel, date, ref) => `Lembrete: ${serviceLabel} · ${date} | ${ref}`,
        textHead: 'LEMBRETE DE CONSULTA',
        textLead: (name) =>
            `Olá ${name}, tem uma consulta online com a Longevity Clinic nas próximas 24 horas.`,
        textDetails: 'DETALHES DA CONSULTA',
        textService: 'Serviço',
        textDate: 'Data',
        textTime: 'Hora',
        textFormat: 'Formato',
        textVideo: 'Vídeo',
        textDoxy: (url) => `Ligação: ${url}`,
        textNoDoxy: 'Consulte o email de confirmação para a ligação por vídeo.',
        textFooterCopy: '© 2026 Longevity Clinic',
        rescheduleStrong: 'Precisa de reagendar?',
        rescheduleRest: 'Reagendamento gratuito até 24 horas antes. Responda a este email ou contacte-nos.'
    },
    es: {
        htmlLang: 'es',
        emailTitle: 'Recordatorio de cita',
        h2: 'Su consulta se acerca',
        lead: (name) =>
            `Hola ${name}, le recordamos que tiene una consulta online con Longevity Clinic en las próximas 24 horas.`,
        refLabel: 'Referencia',
        colService: 'Servicio',
        colDate: 'Fecha',
        colTime: 'Hora',
        colFormat: 'Formato',
        formatVideo: 'Videollamada segura',
        videoTitle: 'Unirse a la videoconsulta',
        doxyBefore: 'Use nuestra sala de vídeo segura a la hora acordada:',
        doxyAfter: 'No necesita instalar nada: abra el enlace en un navegador actualizado.',
        joinVideoButton: 'Unirse a la videoconsulta',
        noDoxy: 'Los detalles del enlace figuran en su correo de confirmación. Si necesita ayuda, responda a este mensaje o contáctenos.',
        subject: (serviceLabel, date, ref) => `Recordatorio: ${serviceLabel} · ${date} | ${ref}`,
        textHead: 'RECORDATORIO DE CITA',
        textLead: (name) =>
            `Hola ${name}, tiene una consulta online con Longevity Clinic en las próximas 24 horas.`,
        textDetails: 'DETALLES DE LA CITA',
        textService: 'Servicio',
        textDate: 'Fecha',
        textTime: 'Hora',
        textFormat: 'Formato',
        textVideo: 'Vídeo',
        textDoxy: (url) => `Enlace: ${url}`,
        textNoDoxy: 'Consulte su correo de confirmación para el enlace de videollamada.',
        textFooterCopy: '© 2026 Longevity Clinic',
        rescheduleStrong: '¿Necesita cambiar la fecha?',
        rescheduleRest: 'Puede reprogramar sin coste hasta 24 horas antes. Responda a este correo o contáctenos.'
    }
};

const REMINDER_1H_EMAIL_I18N = {
    en: {
        htmlLang: 'en',
        emailTitle: 'Appointment starting soon',
        h2: 'Your consultation is soon',
        lead: (name) =>
            `Hello ${name}, this is a reminder that your online consultation with Longevity Clinic starts within the next hour.`,
        refLabel: 'Booking reference',
        colService: 'Service',
        colDate: 'Date',
        colTime: 'Time',
        colFormat: 'Format',
        formatVideo: 'Secure video call',
        videoTitle: 'Join your video consultation',
        doxyBefore: 'Use our secure video room at your scheduled time:',
        doxyAfter: 'No download required — open the link in a modern browser.',
        joinVideoButton: 'Join Video Consultation',
        noDoxy: 'Video link details were included in your confirmation email. If you need help, reply to this message or contact us.',
        subject: (serviceLabel, date, ref) => `Starting soon: ${serviceLabel} on ${date} | ${ref}`,
        textHead: 'APPOINTMENT REMINDER (1 HOUR)',
        textLead: (name) =>
            `Hello ${name}, your online consultation with Longevity Clinic starts within the next hour.`,
        textDetails: 'APPOINTMENT DETAILS',
        textService: 'Service',
        textDate: 'Date',
        textTime: 'Time',
        textFormat: 'Format',
        textVideo: 'Video',
        textDoxy: (url) => `Join: ${url}`,
        textNoDoxy: 'See your confirmation email for the video link.',
        textFooterCopy: '© 2026 Longevity Clinic',
        rescheduleStrong: 'Need to reschedule?',
        rescheduleRest: 'If something changed, contact us as soon as possible.'
    },
    pt: {
        htmlLang: 'pt',
        emailTitle: 'A sua consulta começa em breve',
        h2: 'A sua consulta é em breve',
        lead: (name) =>
            `Olá ${name}, este é um lembrete de que a sua consulta online com a Longevity Clinic começa na próxima hora.`,
        refLabel: 'Referência',
        colService: 'Serviço',
        colDate: 'Data',
        colTime: 'Hora',
        colFormat: 'Formato',
        formatVideo: 'Videochamada segura',
        videoTitle: 'Entrar na videoconsulta',
        doxyBefore: 'Utilize a nossa sala de vídeo segura à hora marcada:',
        doxyAfter: 'Não é necessária qualquer instalação — abra a ligação num browser atualizado.',
        joinVideoButton: 'Entrar na consulta por vídeo',
        noDoxy: 'Os detalhes da ligação foram enviados no email de confirmação. Precisa de ajuda? Responda a este email ou contacte-nos.',
        subject: (serviceLabel, date, ref) => `Em breve: ${serviceLabel} · ${date} | ${ref}`,
        textHead: 'LEMBRETE (1 HORA)',
        textLead: (name) =>
            `Olá ${name}, a sua consulta online com a Longevity Clinic começa na próxima hora.`,
        textDetails: 'DETALHES DA CONSULTA',
        textService: 'Serviço',
        textDate: 'Data',
        textTime: 'Hora',
        textFormat: 'Formato',
        textVideo: 'Vídeo',
        textDoxy: (url) => `Ligação: ${url}`,
        textNoDoxy: 'Consulte o email de confirmação para a ligação por vídeo.',
        textFooterCopy: '© 2026 Longevity Clinic',
        rescheduleStrong: 'Precisa de ajuda?',
        rescheduleRest: 'Se algo mudou, contacte-nos o mais rapidamente possível.'
    },
    es: {
        htmlLang: 'es',
        emailTitle: 'Su cita comienza pronto',
        h2: 'Su consulta es pronto',
        lead: (name) =>
            `Hola ${name}, le recordamos que su consulta online con Longevity Clinic comienza en la próxima hora.`,
        refLabel: 'Referencia',
        colService: 'Servicio',
        colDate: 'Fecha',
        colTime: 'Hora',
        colFormat: 'Formato',
        formatVideo: 'Videollamada segura',
        videoTitle: 'Unirse a la videoconsulta',
        doxyBefore: 'Use nuestra sala de vídeo segura a la hora acordada:',
        doxyAfter: 'No necesita instalar nada: abra el enlace en un navegador actualizado.',
        joinVideoButton: 'Unirse a la videoconsulta',
        noDoxy: 'Los detalles del enlace figuran en su correo de confirmación. Si necesita ayuda, responda a este mensaje o contáctenos.',
        subject: (serviceLabel, date, ref) => `Pronto: ${serviceLabel} · ${date} | ${ref}`,
        textHead: 'RECORDATORIO (1 HORA)',
        textLead: (name) =>
            `Hola ${name}, su consulta online con Longevity Clinic comienza en la próxima hora.`,
        textDetails: 'DETALLES DE LA CITA',
        textService: 'Servicio',
        textDate: 'Fecha',
        textTime: 'Hora',
        textFormat: 'Formato',
        textVideo: 'Vídeo',
        textDoxy: (url) => `Enlace: ${url}`,
        textNoDoxy: 'Consulte su correo de confirmación para el enlace de videollamada.',
        textFooterCopy: '© 2026 Longevity Clinic',
        rescheduleStrong: '¿Necesita ayuda?',
        rescheduleRest: 'Si algo ha cambiado, contáctenos lo antes posible.'
    }
};

function reminderEmailStrings(locale, variant) {
    const k = normalizePatientLocale(locale);
    const map = variant === '1h' ? REMINDER_1H_EMAIL_I18N : REMINDER_EMAIL_I18N;
    return map[k] || map.en;
}

function buildReminderEmail(data) {
    const { patientName, serviceLabel, date, time, bookingRef, locale: rawLocale, reminderVariant, intakeUrl: rawIntakeUrl } = data;
    const variant = reminderVariant === '1h' ? '1h' : '24h';
    const t = reminderEmailStrings(rawLocale, variant);
    const name = (patientName || 'Patient').trim();
    const doxyUrl = doxyUrlFromEmailData(data);
    const intakeUrl = (rawIntakeUrl && String(rawIntakeUrl).trim()) || '';
    const loc = normalizePatientLocale(rawLocale);
    const intakeCopy = loc === 'pt'
        ? { title: 'Ficha clínica ainda por preencher', body: 'Preencha os dados clínicos antes da consulta (menos de 2 minutos).', button: 'Preencher ficha clínica', text: 'Ficha clínica:' }
        : loc === 'es'
            ? { title: 'Ficha clínica pendiente', body: 'Complete sus datos clínicos antes de la consulta (menos de 2 minutos).', button: 'Completar ficha clínica', text: 'Ficha clínica:' }
            : { title: 'Clinical form still needed', body: 'Please complete your clinical details before the consultation (less than 2 minutes).', button: 'Fill in clinical form', text: 'Clinical form:' };

    const intakeBlock = intakeUrl
        ? `<div style="background:#f1f5f2;border:1px solid #c9d4cc;border-radius:10px;padding:16px 18px;margin:0 0 24px;text-align:center;">
            <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;">${intakeCopy.title}</p>
            <p style="margin:0 0 12px;font-size:14px;color:#475569;line-height:1.5;">${intakeCopy.body}</p>
            <a href="${escapeHtml(intakeUrl)}" style="display:inline-block;background-color:#255235;color:#ffffff !important;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;">${intakeCopy.button}</a>
        </div>`
        : '';

    const doxyCtaButton = doxyUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 20px;">
    <tr>
        <td align="center" style="padding:0;">
            <a href="${escapeHtml(doxyUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">${t.joinVideoButton}</a>
        </td>
    </tr>
</table>`
        : '';

    const videoBlock = doxyUrl
        ? `<h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #0f172a;">${t.videoTitle}</h3>
            <p style="margin: 0 0 8px; font-size: 14px; color: #475569; line-height: 1.5;">${t.doxyBefore}</p>
            ${doxyCtaButton}
            <p style="margin: 0 0 0; font-size: 14px; color: #475569; line-height: 1.5;">${t.doxyAfter}</p>`
        : `<p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${t.noDoxy}</p>`;

    const html = `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.emailTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                    <tr>
                        <td style="text-align: center; padding: 0 0 32px;">
                            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">longevity</h1>
                            <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em;">clinic</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                            <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #0f172a; text-align: center;">${t.h2}</h2>
                            <p style="margin: 0 0 28px; font-size: 15px; color: #64748b; text-align: center; line-height: 1.5;">${t.lead(name)}</p>

                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; text-align: center; margin-bottom: 24px;">
                                <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">${t.refLabel}</p>
                                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.05em;">${bookingRef}</p>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.colService}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${serviceLabel}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.colDate}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${t.colTime}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${time}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">${t.colFormat}</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right;">${t.formatVideo}</td>
                                </tr>
                            </table>

                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 24px;">

                            ${intakeBlock}

                            ${videoBlock}

                            <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-top: 28px;">
                                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                                    <strong>${t.rescheduleStrong}</strong> ${t.rescheduleRest}
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 20px; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
                                <a href="mailto:info@lonclinic.com" style="color: #3b82f6; text-decoration: none;">info@lonclinic.com</a>
                                · <a href="tel:+351928372775" style="color: #3b82f6; text-decoration: none;">+351 928 372 775</a>
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #cbd5e1;">${t.textFooterCopy}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const textVideo = doxyUrl ? t.textDoxy(doxyUrl) : t.textNoDoxy;
    const text = `
${t.textHead} — ${bookingRef}

${t.textLead(name)}

${t.textDetails}
───────────────
${t.textService}:  ${serviceLabel}
${t.textDate}:     ${date}
${t.textTime}:     ${time}
${t.textFormat}:   ${t.formatVideo}
${t.textVideo}:    ${textVideo}
${intakeUrl ? `\n${intakeCopy.text} ${intakeUrl}\n` : ''}
${t.rescheduleStrong} ${t.rescheduleRest}

info@lonclinic.com | +351 928 372 775
${t.textFooterCopy}
`;

    return { html, text, subject: t.subject(serviceLabel, date, bookingRef) };
}

async function sendReminderEmail(data) {
    if (!isEmailConfigured) {
        return false;
    }
    const to = (data.email || '').trim();
    if (!to || !to.includes('@')) {
        console.error('   ⚠️  Reminder email skipped — invalid recipient:', data.email);
        return false;
    }
    try {
        const payload = {
            ...data,
            doxyUrl: data.doxyUrl || (await resolveDoxyRoomUrl(data.professional))
        };
        const { html, text, subject } = buildReminderEmail(payload);
        const info = await deliverEmail({
            from: EMAIL_FROM,
            to,
            subject,
            text,
            html
        });
        console.log('   ✉️  Reminder email sent to:', data.email, '| Message ID:', info.messageId);
        return true;
    } catch (err) {
        console.error('   ❌ Failed to send reminder email:', err.message);
        return false;
    }
}

const PUBLIC_SITE_URL = seo.originOf(process.env.PUBLIC_SITE_URL || seo.SITE_ORIGIN);

function newIntakeToken() {
    return crypto.randomBytes(24).toString('hex');
}

function patientIntakeUrl(token) {
    const t = String(token || '').trim();
    if (!t) return '';
    return emailLink(
        `${PUBLIC_SITE_URL}/book-consultation?ficha=${encodeURIComponent(t)}`,
        datedCampaign('intake_form'),
        'ficha'
    );
}

function publicIntakeUrl(token) {
    const t = String(token || '').trim();
    if (!t) return '';
    return `${PUBLIC_SITE_URL}/book-consultation?ficha=${encodeURIComponent(t)}`;
}

function sanitizePatientIntakeBody(body, opts) {
    const src = body && typeof body === 'object' ? body : {};
    const dob = String(src.dob || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return { error: 'Please enter a valid date of birth' };
    }
    const born = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(born.getTime())) {
        return { error: 'Please enter a valid date of birth' };
    }
    const ageYears = (Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 0 || ageYears > 120) {
        return { error: 'Please enter a valid date of birth' };
    }
    const concerns = String(src.concerns || '').trim().slice(0, 4000);
    if (concerns.length < 3) {
        return { error: 'Please describe your symptoms or the reason for this consultation' };
    }
    const country = String(src.country || '').trim().slice(0, 8);
    const allowedCountry = /^(GB|US|SE|DE|FR|NL|NO|DK|FI|CH|AT|BE|ES|IT|PT|IE|CA|AU|NZ|AE|SG|HK|JP|BR|OTHER)$/;
    const intake = {
        dob,
        country: allowedCountry.test(country) ? country : '',
        concerns,
        medications: String(src.medications || '').trim().slice(0, 2000),
        allergies: String(src.allergies || '').trim().slice(0, 500),
        nhs: String(src.nhs || '').trim().slice(0, 32),
        submittedAt: new Date().toISOString()
    };
    if (opts && opts.service === 'travel') {
        intake.travelDest = String(src.travelDest || '').trim().slice(0, 500);
        intake.travelDates = String(src.travelDates || '').trim().slice(0, 200);
    }
    return { ok: true, intake };
}

async function getBookingByPaymentId(paymentId) {
    const pid = String(paymentId || '').trim();
    if (!pid) return null;
    if (usePersistentDb) {
        return db.findBookingByPaymentId(pid);
    }
    return bookingsStore.find((b) => b.paymentId === pid) || null;
}

async function getBookingByIntakeToken(token) {
    const t = String(token || '').trim();
    if (!t || t.length < 16) return null;
    if (usePersistentDb) {
        return db.findBookingByIntakeToken(t);
    }
    return bookingsStore.find((b) => b.intakeToken === t && !b.cancelled) || null;
}

async function persistPatientIntake(booking, intake) {
    if (usePersistentDb) {
        return db.savePatientIntake(booking.bookingRef, intake);
    }
    const row = bookingsStore.find((b) => b.bookingRef === booking.bookingRef);
    if (!row) return null;
    row.intake = intake;
    row.intakeCompletedAt = row.intakeCompletedAt || new Date().toISOString();
    row.hasPatientIntake = true;
    return row;
}

const INTAKE_REMINDER_EMAIL_I18N = {
    en: {
        htmlLang: 'en',
        subject: (time, ref) => `Reminder: complete your clinical form for the ${time} consultation | ${ref}`,
        h2: 'Your clinical form is still waiting',
        lead: (name, time) =>
            `Hello ${name}, your consultation at ${time} is confirmed. Please fill in your clinical details so the doctor can prepare (less than 2 minutes).`,
        button: 'Fill in clinical form',
        text: (name, time, url) =>
            `Hello ${name}, please complete your clinical form for the ${time} consultation:\n${url}`
    },
    pt: {
        htmlLang: 'pt',
        subject: (time, ref) => `Lembrete: preencha a ficha clínica para a consulta das ${time} | ${ref}`,
        h2: 'A sua ficha clínica ainda está por preencher',
        lead: (name, time) =>
            `Olá ${name}, a sua consulta das ${time} está confirmada. Preencha os dados clínicos para o médico preparar a consulta (menos de 2 minutos).`,
        button: 'Preencher ficha clínica',
        text: (name, time, url) =>
            `Olá ${name}, preencha a ficha clínica para a consulta das ${time}:\n${url}`
    },
    es: {
        htmlLang: 'es',
        subject: (time, ref) => `Recordatorio: complete su ficha clínica para la consulta de las ${time} | ${ref}`,
        h2: 'Su ficha clínica sigue pendiente',
        lead: (name, time) =>
            `Hola ${name}, su consulta de las ${time} está confirmada. Complete sus datos clínicos para que el médico pueda prepararse (menos de 2 minutos).`,
        button: 'Completar ficha clínica',
        text: (name, time, url) =>
            `Hola ${name}, complete su ficha clínica para la consulta de las ${time}:\n${url}`
    }
};

async function sendIntakeReminderEmail(booking) {
    if (!isEmailConfigured) return false;
    const to = (booking.email || '').trim();
    if (!to || !to.includes('@')) return false;
    const token = booking.intakeToken || '';
    if (!token) return false;
    const t = INTAKE_REMINDER_EMAIL_I18N[normalizePatientLocale(booking.patientLocale)] || INTAKE_REMINDER_EMAIL_I18N.en;
    const url = patientIntakeUrl(token);
    const name = (booking.patientName || 'Patient').trim();
    const time = booking.time || '';
    const html = `<!DOCTYPE html><html lang="${t.htmlLang}"><body style="margin:0;padding:0;background:#f0f4fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 20px;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td style="background:#fff;border-radius:16px;padding:40px;">
<h2 style="margin:0 0 12px;font-size:22px;color:#0f172a;text-align:center;">${t.h2}</h2>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;text-align:center;line-height:1.5;">${t.lead(escapeHtml(name), escapeHtml(time))}</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center">
<a href="${escapeHtml(url)}" style="display:inline-block;background-color:#255235;color:#fff !important;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">${t.button}</a>
</td></tr></table>
</td></tr></table>
</td></tr></table></body></html>`;
    try {
        await deliverEmail({
            from: EMAIL_FROM,
            to,
            subject: t.subject(time, booking.bookingRef),
            text: t.text(name, time, url),
            html
        });
        console.log('   ✉️  Intake reminder sent to:', to);
        return true;
    } catch (err) {
        console.error('   ❌ Intake reminder failed:', err.message);
        return false;
    }
}

function trustpilotEvaluateUrl(locale) {
    const k = normalizePatientLocale(locale);
    if (k === 'pt') return 'https://pt.trustpilot.com/evaluate/lonclinic.com';
    if (k === 'es') return 'https://es.trustpilot.com/evaluate/lonclinic.com';
    return 'https://www.trustpilot.com/evaluate/lonclinic.com';
}

const FOLLOWUP_EMAIL_I18N = {
    en: {
        htmlLang: 'en',
        emailTitle: 'Thank you for your consultation',
        h2: 'Thank you for visiting Longevity Clinic',
        body: (name) =>
            `Dear ${name}, thank you for attending your online consultation with us today. We hope the session was helpful and that you feel supported in your health journey.`,
        feedbackTitle: 'We would love your feedback',
        feedbackBody:
            'Your experience matters to us. If you have a moment, please leave an independent review on Trustpilot — it helps other patients choose with confidence.',
        ctaLabel: 'Review us on Trustpilot',
        renewalTitle: 'Need a prescription renewal?',
        renewalBody: 'If your treatment is stable, renew it online for €19.',
        renewalCta: 'Renew treatment — €19',
        siteAlt: (url) => `You can also share your opinion on our website: ${url}`,
        subject: (ref) => `Thank you — we value your feedback | ${ref}`,
        textHead: 'THANK YOU',
        textBody: (name) =>
            `Dear ${name}, thank you for attending your online consultation with Longevity Clinic. We hope it was helpful.`,
        textFeedback: (url, siteUrl) =>
            `We would love your feedback on Trustpilot:\n${url}\n\nOr on our website: ${siteUrl}`,
        textRenewal: (url) => `Need a prescription renewal? Book online for €19:\n${url}`,
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    pt: {
        htmlLang: 'pt',
        emailTitle: 'Obrigado pela sua consulta',
        h2: 'Obrigado por ter escolhido a Longevity Clinic',
        body: (name) =>
            `Exmo.(a) ${name}, obrigado por ter participado na sua consulta online connosco. Esperamos que tenha sido útil e que se sinta acompanhado na sua saúde.`,
        feedbackTitle: 'Gostaríamos de saber a sua opinião',
        feedbackBody:
            'A sua experiência é importante. Se tiver um momento, deixe uma avaliação independente no Trustpilot — ajuda outros pacientes a escolherem com confiança.',
        ctaLabel: 'Avaliar no Trustpilot',
        renewalTitle: 'Precisa de renovar a receita?',
        renewalBody: 'Se o tratamento está estável, renove online por €19.',
        renewalCta: 'Renovar tratamento — €19',
        siteAlt: (url) => `Também pode deixar a sua opinião no nosso site: ${url}`,
        subject: (ref) => `Obrigado — a sua opinião conta | ${ref}`,
        textHead: 'OBRIGADO',
        textBody: (name) =>
            `Exmo.(a) ${name}, obrigado pela sua consulta online na Longevity Clinic.`,
        textFeedback: (url, siteUrl) =>
            `Deixe a sua opinião no Trustpilot:\n${url}\n\nOu no nosso site: ${siteUrl}`,
        textRenewal: (url) => `Precisa de renovar a receita? Marque online por €19:\n${url}`,
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    es: {
        htmlLang: 'es',
        emailTitle: 'Gracias por su consulta',
        h2: 'Gracias por confiar en Longevity Clinic',
        body: (name) =>
            `Estimado/a ${name}, gracias por asistir a su consulta online con nosotros. Esperamos que le haya resultado útil.`,
        feedbackTitle: 'Nos gustaría conocer su opinión',
        feedbackBody:
            'Su experiencia es importante. Si tiene un momento, deje una valoración independiente en Trustpilot: ayuda a otros pacientes a elegir con confianza.',
        ctaLabel: 'Valóranos en Trustpilot',
        renewalTitle: '¿Necesita renovar la receta?',
        renewalBody: 'Si el tratamiento es estable, renuévelo online por 19 €.',
        renewalCta: 'Renovar tratamiento — 19 €',
        siteAlt: (url) => `También puede dejar su opinión en nuestro sitio web: ${url}`,
        subject: (ref) => `Gracias — valoramos su opinión | ${ref}`,
        textHead: 'GRACIAS',
        textBody: (name) =>
            `Estimado/a ${name}, gracias por su consulta online en Longevity Clinic.`,
        textFeedback: (url, siteUrl) =>
            `Deje su opinión en Trustpilot:\n${url}\n\nO en nuestro sitio web: ${siteUrl}`,
        textRenewal: (url) => `¿Necesita renovar la receta? Reserve online por 19 €:\n${url}`,
        textFooterCopy: '© 2026 Longevity Clinic'
    }
};

function followupEmailStrings(locale) {
    const k = normalizePatientLocale(locale);
    return FOLLOWUP_EMAIL_I18N[k] || FOLLOWUP_EMAIL_I18N.en;
}

function buildFollowupEmail(data) {
    const { patientName, bookingRef, locale: rawLocale, service, email } = data;
    const t = followupEmailStrings(rawLocale);
    const name = (patientName || 'Patient').trim();
    const reviewUrl = trustpilotEvaluateUrl(rawLocale);
    const siteReviewUrl = emailLink(`${PUBLIC_SITE_URL}/#deixar-opiniao`, datedCampaign('post_consult_review'), 'site-form');
    const showRenewal = service !== 'renovacao' && service !== 'entrevista';
    const renewalHref = showRenewal
        ? renewalFollowupUrl({ email, patientName: name, bookingRef })
        : '';
    const renewalBlock = showRenewal
        ? `<div style="background:#f1f5f2;border:1px solid #c9d4cc;border-radius:10px;padding:18px 20px;margin:0 0 24px;text-align:center;">
<p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;">${t.renewalTitle}</p>
<p style="margin:0 0 14px;font-size:13px;color:#475569;line-height:1.5;">${t.renewalBody}</p>
<a href="${renewalHref}" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;">${t.renewalCta}</a>
</div>`
        : '';
    const html = `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t.emailTitle}</title></head>
<body style="margin:0;padding:0;background-color:#f0f4fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4fa;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td style="text-align:center;padding:0 0 32px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">longevity</h1>
<p style="margin:4px 0 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;">clinic</p>
</td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${t.h2}</h2>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">${t.body(name)}</p>
${renewalBlock}
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
<p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;">Ref.</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${bookingRef}</p>
</div>
<h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a;">${t.feedbackTitle}</h3>
<p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">${t.feedbackBody}</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 16px;">
<tr><td align="center" style="padding:0;">
<a href="${reviewUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#00b67a;border:1px solid #00a06c;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">${t.ctaLabel}</a>
</td></tr>
</table>
<p style="margin:0;font-size:13px;color:#64748b;line-height:1.55;text-align:center;">${t.siteAlt(siteReviewUrl)}</p>
</td></tr>
<tr><td style="padding:32px 20px;text-align:center;">
<p style="margin:0;font-size:11px;color:#cbd5e1;">${t.textFooterCopy}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
    const text = `${t.textHead} — ${bookingRef}\n\n${t.textBody(name)}\n\n${showRenewal && t.textRenewal ? t.textRenewal(renewalHref) + '\n\n' : ''}${t.textFeedback(reviewUrl, siteReviewUrl)}`;
    return { html, text, subject: t.subject(bookingRef) };
}

async function sendFollowupEmail(data) {
    if (!isEmailConfigured) return false;
    const to = (data.email || '').trim();
    if (!to || !to.includes('@')) return false;
    try {
        const { html, text, subject } = buildFollowupEmail(data);
        await deliverEmail({ from: EMAIL_FROM, to, subject, text, html });
        console.log('   ✉️  Follow-up email sent to:', data.email);
        return true;
    } catch (err) {
        console.error('   ❌ Follow-up email failed:', err.message);
        return false;
    }
}

async function sendPostConsultationReviewEmail(booking) {
    if (!booking || booking.cancelled || booking.followupSent) return false;
    if (booking.service === 'entrevista') return false;
    if (booking.consultationCompleted !== true) return false;
    const sent = await sendFollowupEmail({
        email: booking.email,
        patientName: booking.patientName,
        service: booking.service,
        serviceLabel: serviceLabelFromCode(booking.service),
        bookingRef: booking.bookingRef,
        locale: booking.patientLocale || 'en'
    });
    if (!sent) return false;
    try {
        if (usePersistentDb) {
            await db.markFollowupSent(booking.bookingRef);
            await db.markReviewRequested(booking.bookingRef);
        } else {
            const row = bookingsStore.find((x) => x.bookingRef === booking.bookingRef);
            if (row) {
                row.followupSent = true;
                row.reviewRequested = true;
            }
        }
        return true;
    } catch (err) {
        console.error('   ❌ mark followup_sent:', booking.bookingRef, err.message);
        return false;
    }
}

const CANCEL_PATIENT_I18N = {
    en: {
        htmlLang: 'en',
        h2: 'Booking cancelled',
        lead: (name) => `Hello ${name}, your appointment has been cancelled as requested.`,
        refLabel: 'Booking reference',
        colService: 'Service',
        colDate: 'Previous date',
        colTime: 'Previous time',
        bookAgain: 'To book again, visit our website or reply to this email.',
        subject: (ref) => `Booking cancelled | ${ref}`,
        textHead: 'BOOKING CANCELLED'
    },
    pt: {
        htmlLang: 'pt',
        h2: 'Marcação cancelada',
        lead: (name) =>
            `Olá ${name}, a sua marcação foi cancelada tal como solicitou.`,
        refLabel: 'Referência',
        colService: 'Serviço',
        colDate: 'Data anterior',
        colTime: 'Hora anterior',
        bookAgain: 'Para marcar novamente, visite o nosso site ou responda a este email.',
        subject: (ref) => `Marcação cancelada | ${ref}`,
        textHead: 'MARCAÇÃO CANCELADA'
    },
    es: {
        htmlLang: 'es',
        h2: 'Cita cancelada',
        lead: (name) =>
            `Hola ${name}, su cita ha sido cancelada según su solicitud.`,
        refLabel: 'Referencia',
        colService: 'Servicio',
        colDate: 'Fecha anterior',
        colTime: 'Hora anterior',
        bookAgain: 'Para reservar de nuevo, visite nuestro sitio web o responda a este correo.',
        subject: (ref) => `Cita cancelada | ${ref}`,
        textHead: 'CITA CANCELADA'
    }
};

function cancelPatientStrings(locale) {
    const k = normalizePatientLocale(locale);
    return CANCEL_PATIENT_I18N[k] || CANCEL_PATIENT_I18N.en;
}

function buildCancellationPatientEmail(data) {
    const { patientName, serviceLabel, date, time, bookingRef, locale: rawLocale } = data;
    const t = cancelPatientStrings(rawLocale);
    const name = (patientName || 'Patient').trim();
    const html = `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" style="background:#f0f4fa;padding:40px 20px;"><tr><td align="center">
<table width="600" style="max-width:600px;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td><h2 style="margin:0 0 16px;color:#0f172a;text-align:center;">${t.h2}</h2>
<p style="color:#64748b;line-height:1.6;text-align:center;">${t.lead(name)}</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;margin:20px 0;">
<p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">${t.refLabel}</p>
<p style="margin:0;font-size:18px;font-weight:700;">${bookingRef}</p></div>
<table width="100%" style="margin-bottom:20px;">
<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">${t.colService}</td>
<td style="padding:8px 0;text-align:right;font-weight:500;">${serviceLabel}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">${t.colDate}</td>
<td style="padding:8px 0;text-align:right;">${date}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">${t.colTime}</td>
<td style="padding:8px 0;text-align:right;">${time}</td></tr>
</table>
<p style="color:#475569;font-size:14px;">${t.bookAgain}</p>
</td></tr></table></td></tr></table></body></html>`;
    const text = `${t.textHead} — ${bookingRef}\n${t.lead(name)}\n${t.colService}: ${serviceLabel}\n${t.colDate}: ${date}\n${t.colTime}: ${time}`;
    return { html, text, subject: t.subject(bookingRef) };
}

function buildClinicCancellationEmail(data) {
    const { patientName, serviceLabel, date, time, bookingRef, email } = data;
    const html = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;font-family:sans-serif;background:#f0f4fa;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;">
<h2 style="color:#0f172a;">Booking cancelled (patient)</h2>
<p style="color:#475569;">A patient has cancelled their appointment.</p>
<table style="width:100%;margin-top:16px;">
<tr><td style="padding:8px 0;color:#64748b;">Reference</td><td style="text-align:right;font-weight:600;">${bookingRef}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Patient</td><td style="text-align:right;">${patientName}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="text-align:right;">${email}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Service</td><td style="text-align:right;">${serviceLabel}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Was scheduled</td><td style="text-align:right;">${date} at ${time}</td></tr>
</table></div></body></html>`;
    const text = `Booking cancelled\nRef: ${bookingRef}\nPatient: ${patientName}\nEmail: ${email}\nService: ${serviceLabel}\nWas: ${date} at ${time}`;
    return { html, text, subject: `Cancelled: ${bookingRef} — ${patientName}` };
}

const RESCHEDULE_PATIENT_I18N = {
    en: {
        htmlLang: 'en',
        h2: 'Appointment rescheduled',
        lead: (name) => `Hello ${name}, your consultation has been rescheduled. Here are your new details:`,
        refLabel: 'Booking reference',
        colService: 'Service',
        colDate: 'New date',
        colTime: 'New time',
        videoTitle: 'Video consultation',
        doxyBefore: 'Join via our secure video room at your new time:',
        doxyAfter: 'No download required.',
        joinVideoButton: 'Join Video Consultation',
        noDoxy: 'You will receive the video link as before. Contact us if you need help.',
        subject: (ref) => `Rescheduled appointment | ${ref}`,
        textHead: 'APPOINTMENT RESCHEDULED'
    },
    pt: {
        htmlLang: 'pt',
        h2: 'Marcação reagendada',
        lead: (name) =>
            `Olá ${name}, a sua consulta foi reagendada. Seguem os novos detalhes:`,
        refLabel: 'Referência',
        colService: 'Serviço',
        colDate: 'Nova data',
        colTime: 'Nova hora',
        videoTitle: 'Videoconsulta',
        doxyBefore: 'Entre na nossa sala de vídeo segura à nova hora:',
        doxyAfter: 'Não é necessária qualquer instalação.',
        joinVideoButton: 'Entrar na consulta por vídeo',
        noDoxy: 'Receberá a ligação como anteriormente. Contacte-nos se precisar de ajuda.',
        subject: (ref) => `Consulta reagendada | ${ref}`,
        textHead: 'MARCAÇÃO REAGENDADA'
    },
    es: {
        htmlLang: 'es',
        h2: 'Cita reprogramada',
        lead: (name) =>
            `Hola ${name}, su consulta ha sido reprogramada. Nuevos detalles:`,
        refLabel: 'Referencia',
        colService: 'Servicio',
        colDate: 'Nueva fecha',
        colTime: 'Nueva hora',
        videoTitle: 'Videoconsulta',
        doxyBefore: 'Acceda a nuestra sala de vídeo segura a la nueva hora:',
        doxyAfter: 'No necesita instalar nada.',
        joinVideoButton: 'Unirse a la videoconsulta',
        noDoxy: 'Recibirá el enlace como antes. Contáctenos si necesita ayuda.',
        subject: (ref) => `Cita reprogramada | ${ref}`,
        textHead: 'CITA REPROGRAMADA'
    }
};

function reschedulePatientStrings(locale) {
    const k = normalizePatientLocale(locale);
    return RESCHEDULE_PATIENT_I18N[k] || RESCHEDULE_PATIENT_I18N.en;
}

function buildReschedulePatientEmail(data) {
    const { patientName, serviceLabel, date, time, bookingRef, locale: rawLocale } = data;
    const t = reschedulePatientStrings(rawLocale);
    const name = (patientName || 'Patient').trim();
    const doxyUrl = doxyUrlFromEmailData(data);
    const doxyBtn = doxyUrl
        ? `<table role="presentation" width="100%" style="margin:16px 0;"><tr><td align="center">
<a href="${escapeHtml(doxyUrl)}" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#fff!important;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">${t.joinVideoButton}</a>
</td></tr></table><p style="color:#475569;font-size:14px;">${t.doxyAfter}</p>`
        : `<p style="color:#475569;">${t.noDoxy}</p>`;
    const html = `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;background:#f0f4fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" style="background:#f0f4fa;padding:40px 20px;"><tr><td align="center">
<table width="600" style="max-width:600px;background:#fff;border-radius:16px;padding:40px;">
<tr><td><h2 style="color:#0f172a;text-align:center;">${t.h2}</h2>
<p style="color:#64748b;text-align:center;line-height:1.6;">${t.lead(name)}</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
<p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">${t.refLabel}</p>
<p style="margin:0;font-size:18px;font-weight:700;">${bookingRef}</p></div>
<table width="100%"><tr><td style="padding:8px 0;color:#64748b;">${t.colService}</td><td style="text-align:right;font-weight:500;">${serviceLabel}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">${t.colDate}</td><td style="text-align:right;">${date}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">${t.colTime}</td><td style="text-align:right;">${time}</td></tr></table>
<h3 style="margin:24px 0 8px;font-size:16px;color:#0f172a;">${t.videoTitle}</h3>
<p style="color:#475569;margin:0 0 8px;">${t.doxyBefore}</p>
${doxyBtn}
</td></tr></table></td></tr></table></body></html>`;
    const text = `${t.textHead} — ${bookingRef}\n${t.lead(name)}\n${serviceLabel} — ${date} ${time}\nVideo: ${doxyUrl || 'see email'}`;
    return { html, text, subject: t.subject(bookingRef) };
}

function buildClinicRescheduleEmail(data) {
    const {
        patientName,
        serviceLabel,
        oldDate,
        oldTime,
        newDate,
        newTime,
        bookingRef,
        email,
        rescheduleCount
    } = data;
    const html = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;font-family:sans-serif;background:#f0f4fa;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;">
<h2 style="color:#0f172a;">Appointment rescheduled (patient)</h2>
<p style="color:#475569;">A patient has rescheduled.</p>
<table style="width:100%;">
<tr><td style="padding:8px 0;color:#64748b;">Reference</td><td style="text-align:right;font-weight:600;">${bookingRef}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Patient</td><td style="text-align:right;">${patientName}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="text-align:right;">${email}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Service</td><td style="text-align:right;">${serviceLabel}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Previous</td><td style="text-align:right;">${oldDate} at ${oldTime}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">New</td><td style="text-align:right;">${newDate} at ${newTime}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Reschedule #</td><td style="text-align:right;">${rescheduleCount}</td></tr>
</table></div></body></html>`;
    const text = `Rescheduled\nRef: ${bookingRef}\nPatient: ${patientName}\n${oldDate} ${oldTime} → ${newDate} ${newTime}\nCount: ${rescheduleCount}`;
    return { html, text, subject: `Rescheduled: ${bookingRef} — ${newDate}` };
}

async function sendClinicOpsEmail(subject, html, text) {
    if (!isEmailConfigured) return false;
    try {
        await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            subject,
            text,
            html
        });
        console.log('   📧 Clinic notification:', subject);
        return true;
    } catch (err) {
        console.error('   ❌ Clinic email failed:', err.message);
        return false;
    }
}

function sanitizeScheduleTimeZone(raw) {
    const s = String(raw || '').trim();
    if (/^[A-Za-z0-9_+\/-]+$/.test(s) && s.length <= 64) return s;
    return 'Europe/Lisbon';
}

function partsInTimeZone(utcMs, timeZone) {
    const f = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });
    const parts = {};
    f.formatToParts(new Date(utcMs)).forEach((p) => {
        if (p.type !== 'literal') parts[p.type] = p.value;
    });
    return {
        y: +parts.year,
        mo: +parts.month,
        d: +parts.day,
        h: +parts.hour,
        mi: +parts.minute
    };
}

/** Wall clock date+time in IANA zone → UTC epoch ms (minute resolution). */
function localWallTimeToUtcMs(dateStr, timeStr, timeZone) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = timeStr.split(':').map(Number);
    if (!y || !mo || !d || h === undefined || mi === undefined) return NaN;

    const pad = (n) => String(n).padStart(2, '0');
    const target = `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}`;

    function key(utcMs) {
        const p = partsInTimeZone(utcMs, timeZone);
        return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`;
    }

    const start = Date.UTC(y, mo - 1, d, 0, 0, 0) - 48 * 60 * 60 * 1000;
    const end = Date.UTC(y, mo - 1, d, 23, 59, 0) + 48 * 60 * 60 * 1000;
    for (let ms = start; ms <= end; ms += 60 * 1000) {
        if (key(ms) === target) return ms;
    }
    return NaN;
}

function inferDateIsoFromBooking(booking) {
    const raw = booking.dateIso || booking.date_iso;
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim())) return String(raw).trim();
    const d = String(booking.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = Date.parse(d);
    if (!Number.isNaN(parsed)) {
        const dt = new Date(parsed);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    return null;
}

function normalizeTimeString(booking) {
    const t = String(booking.time || '').trim();
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
    if (!m) return null;
    return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
}

function getAppointmentStartUtcMs(booking, timeZone) {
    const tz = sanitizeScheduleTimeZone(timeZone);
    const dateIso = inferDateIsoFromBooking(booking);
    const timeNorm = normalizeTimeString(booking);
    if (!dateIso || !timeNorm) return NaN;
    return localWallTimeToUtcMs(dateIso, timeNorm, tz);
}

function appointmentDurationMinutes(booking) {
    const s = booking.service;
    if (s === 'travel') {
        const c = booking.travellerCount || 1;
        if (c === 1) return 20;
        if (c === 2) return 30;
        return 40;
    }
    return scheduleStore.slotDuration || 30;
}

function getAppointmentEndUtcMs(booking, timeZone) {
    const start = getAppointmentStartUtcMs(booking, timeZone);
    if (!Number.isFinite(start)) return NaN;
    return start + appointmentDurationMinutes(booking) * 60 * 1000;
}

function hoursUntilAppointment(booking, timeZone) {
    const ms = getAppointmentStartUtcMs(booking, timeZone);
    if (!Number.isFinite(ms)) return null;
    return (ms - Date.now()) / (60 * 60 * 1000);
}

function enrichBookingForPatientApi(booking) {
    const tz = scheduleStore.timezone || 'Europe/Lisbon';
    const h = hoursUntilAppointment(booking, tz);
    const canCancel =
        !booking.cancelled &&
        h != null &&
        h >= 24 &&
        h > 0;
    const canReschedule =
        !booking.cancelled &&
        (booking.rescheduleCount || 0) < 2 &&
        h != null &&
        h >= 48 &&
        h > 0;
    return {
        ...booking,
        canCancel,
        canReschedule,
        rescheduleRemaining: Math.max(0, 2 - (booking.rescheduleCount || 0))
    };
}

function memoryBookingsNeeding24h(tz) {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    return bookingsStore.filter((b) => {
        if (b.cancelled || b.reminderSent) return false;
        const ms = getAppointmentStartUtcMs(b, tz);
        return Number.isFinite(ms) && ms > now && ms <= horizon;
    });
}

function memoryBookingsNeeding1h(tz) {
    const now = Date.now();
    const horizon = now + 60 * 60 * 1000;
    return bookingsStore.filter((b) => {
        if (b.cancelled || b.reminder1hSent) return false;
        const ms = getAppointmentStartUtcMs(b, tz);
        return Number.isFinite(ms) && ms > now && ms <= horizon;
    });
}

function memoryBookingsNeedingFollowup() {
    return bookingsStore.filter((b) => {
        if (b.cancelled || b.followupSent) return false;
        return b.consultationCompleted === true;
    });
}

function memoryBookingsNeedingIntakeReminder() {
    const cutoff = Date.now() - 90 * 60 * 1000;
    return bookingsStore.filter((b) => {
        if (b.cancelled || b.intakeReminderSent || b.intakeCompletedAt || !b.intakeToken) return false;
        const created = Date.parse(b.createdAt || '');
        return Number.isFinite(created) && created <= cutoff;
    });
}

function isSlotFreeInMemory(dateIso, timeSlot, excludeBookingRef) {
    return !bookingsStore.some(
        (b) =>
            !b.cancelled &&
            inferDateIsoFromBooking(b) === dateIso &&
            normalizeTimeString(b) === timeSlot &&
            b.bookingRef !== excludeBookingRef
    );
}

function slotsForDateIso(dateIso) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso));
    if (!dateMatch) return [];
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const dateObj = new Date(year, month - 1, day);
    if (Number.isNaN(dateObj.getTime())) return [];
    const dateStr = dateIso;
    const daySchedule = getEffectiveDaySchedule(dateStr);
    if (!daySchedule.enabled) return [];
    const start =
        daySchedule.source === 'override' ? daySchedule.start : startNoLaterThan7am(daySchedule.start);
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = daySchedule.end.split(':').map(Number);
    const slotDuration = scheduleStore.slotDuration || 30;
    const slots = [];
    let currentHour = startHour;
    let currentMin = startMin;
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const slotTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        const isBlocked = scheduleStore.blockedTimeSlots.some(
            (blocked) => blocked.date === dateStr && blocked.time === slotTime
        );
        const isDateBlocked = scheduleStore.blockedDates.includes(dateStr);
        if (!isBlocked && !isDateBlocked) slots.push(slotTime);
        currentMin += slotDuration;
        if (currentMin >= 60) {
            currentMin = 0;
            currentHour++;
        }
    }
    return slots;
}

function computeOccupiedSlotIndices(allSlots, booking, slotDurationMinutes) {
    const t = normalizeTimeString(booking);
    if (!t) return [];
    const startIdx = allSlots.indexOf(t);
    if (startIdx < 0) return [];
    const dur = appointmentDurationMinutes(booking);
    const span = Math.max(1, Math.ceil(dur / slotDurationMinutes));
    const out = [];
    for (let i = 0; i < span && startIdx + i < allSlots.length; i++) {
        out.push(startIdx + i);
    }
    return out;
}

/**
 * Progressive slot grouping: empty day → 07:00 and 08:00 (when in hours) plus
 * the last slot; then slot immediately before and after the contiguous occupied block.
 */
function computeSmartGroupedSlotTimes(allSlots, bookingsForDate, slotDurationMinutes) {
    if (!allSlots.length) return [];
    const occupied = new Set();
    for (const b of bookingsForDate) {
        if (b.cancelled) continue;
        for (const idx of computeOccupiedSlotIndices(allSlots, b, slotDurationMinutes)) {
            occupied.add(idx);
        }
    }
    if (occupied.size === 0) {
        if (allSlots.length === 1) return [allSlots[0]];
        const morningAnchors = ['07:00', '08:00', '09:00'].filter((t) => allSlots.includes(t));
        const eveningAnchors = ['18:00', '19:00', '20:00'].filter((t) => allSlots.includes(t));
        const last = allSlots[allSlots.length - 1];
        const first = allSlots[0];
        return [...new Set([...morningAnchors, first, ...eveningAnchors, last])];
    }
    let minOcc = Infinity;
    let maxOcc = -Infinity;
    occupied.forEach((i) => {
        if (i < minOcc) minOcc = i;
        if (i > maxOcc) maxOcc = i;
    });
    const before = minOcc - 1;
    const after = maxOcc + 1;
    const result = [];
    if (before >= 0 && !occupied.has(before)) result.push(allSlots[before]);
    if (after < allSlots.length && !occupied.has(after)) result.push(allSlots[after]);
    // Preserve order along the day (not lexicographic string sort)
    return [...new Set(result)].sort((a, b) => allSlots.indexOf(a) - allSlots.indexOf(b));
}

async function fetchBookingsForDateIso(dateIso) {
    if (usePersistentDb) {
        try {
            return await db.listBookingsForDateIso(dateIso);
        } catch (err) {
            console.error('fetchBookingsForDateIso:', err.message);
            return [];
        }
    }
    return bookingsStore.filter((b) => !b.cancelled && inferDateIsoFromBooking(b) === dateIso);
}

/** Times already locked by an admin-issued invitation that is still awaiting payment. */
async function fetchInvitationLockedTimesForDateIso(dateIso) {
    if (!usePersistentDb) return new Set();
    try {
        const list = await db.listPendingInvitationsForDateIso(dateIso);
        return new Set(list.map((inv) => normalizeTimeString({ time: inv.time }) || inv.time));
    } catch (err) {
        console.error('fetchInvitationLockedTimesForDateIso:', err.message);
        return new Set();
    }
}

const SLOT_HOLD_MS = 8 * 60 * 1000;
const SLOT_HOLD_CHECKOUT_MS = 30 * 60 * 1000;
const NEXT_SLOTS_TTL_MS = 45 * 1000;
const nextSlotsCache = new Map();
const nextSlotsInflight = new Map();
const slotHoldsById = new Map();

function slotIdFromDateTime(dateIso, time) {
    const d = String(dateIso || '').replace(/-/g, '');
    const t = String(time || '').replace(':', '').slice(0, 4);
    if (!/^\d{8}$/.test(d) || !/^\d{4}$/.test(t)) return '';
    return `${d}-${t}`;
}

function parseSlotId(raw) {
    const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/.exec(String(raw || '').trim());
    if (!m) return null;
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    const time = `${m[4]}:${m[5]}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return { id: `${m[1]}${m[2]}${m[3]}-${m[4]}${m[5]}`, date, time };
}

function invalidateNextSlotsCache() {
    nextSlotsCache.clear();
}

function nextSlotsCacheKeyFromReq(req) {
    const limit = Math.min(Math.max(parseInt(req.query && req.query.limit, 10) || 8, 1), 8);
    const withinHours = Math.min(Math.max(parseInt(req.query && req.query.withinHours, 10) || 168, 1), 336);
    return `${limit}:${withinHours}`;
}

function peekNextSlotsCache(req) {
    const key = nextSlotsCacheKeyFromReq(req || { query: {} });
    const hit = nextSlotsCache.get(key);
    if (!hit || !hit.body) return null;
    if (Date.now() - hit.ts > NEXT_SLOTS_TTL_MS * 4) return null;
    return hit.body;
}

function readCookieValue(req, name) {
    const header = String((req && req.headers && req.headers.cookie) || '');
    const parts = header.split(';');
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        if (part.slice(0, eq).trim() !== name) continue;
        try {
            return decodeURIComponent(part.slice(eq + 1).trim());
        } catch {
            return part.slice(eq + 1).trim();
        }
    }
    return '';
}

function setHoldCookie(req, res, token) {
    const proto = String((req && req.headers && req.headers['x-forwarded-proto']) || '').split(',')[0].trim();
    const secure = !!(req && req.secure) || proto === 'https';
    res.cookie('lon_hold', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
        maxAge: 20 * 60 * 1000
    });
}

function purgeMemoryHolds() {
    const now = Date.now();
    for (const [id, hold] of slotHoldsById) {
        if (!hold || hold.expiresAt <= now) slotHoldsById.delete(id);
    }
}

async function purgeSlotHolds() {
    purgeMemoryHolds();
    if (usePersistentDb) {
        try { await db.purgeExpiredSlotHolds(); } catch (err) {
            console.error('purgeExpiredSlotHolds:', err.message);
        }
    }
}

function memoryHoldToPublic(hold) {
    if (!hold) return null;
    return {
        holdId: hold.id,
        slot: hold.slotId,
        date: hold.dateIso,
        time: hold.time,
        service: hold.service || '',
        expiresAt: new Date(hold.expiresAt).toISOString(),
        expiresInSec: Math.max(0, Math.round((hold.expiresAt - Date.now()) / 1000))
    };
}

async function findHoldById(id) {
    await purgeSlotHolds();
    const key = String(id || '');
    if (!key) return null;
    const mem = slotHoldsById.get(key);
    if (mem && mem.expiresAt > Date.now()) return mem;
    if (usePersistentDb) {
        try {
            const row = await db.findSlotHoldById(key);
            if (row) {
                slotHoldsById.set(row.id, row);
                return row;
            }
        } catch (err) {
            console.error('findHoldById:', err.message);
        }
    }
    return null;
}

async function listHeldTimesForDate(dateIso, excludeHoldId) {
    await purgeSlotHolds();
    const times = new Set();
    for (const hold of slotHoldsById.values()) {
        if (hold.dateIso === dateIso && hold.expiresAt > Date.now() && hold.id !== excludeHoldId) {
            times.add(hold.time);
        }
    }
    if (usePersistentDb) {
        try {
            const dbTimes = await db.listActiveHoldTimesForDateIso(dateIso, excludeHoldId || null);
            dbTimes.forEach((t) => times.add(t));
        } catch (err) {
            console.error('listHeldTimesForDate:', err.message);
        }
    }
    return times;
}

async function releaseHold(id) {
    if (!id) return;
    slotHoldsById.delete(id);
    if (usePersistentDb) {
        try { await db.deleteSlotHoldById(id); } catch (err) {
            console.error('deleteSlotHoldById:', err.message);
        }
    }
    invalidateNextSlotsCache();
}

async function releaseHoldsForSlot(dateIso, time) {
    const t = String(time || '').slice(0, 5);
    for (const [id, hold] of slotHoldsById) {
        if (hold.dateIso === dateIso && hold.time === t) slotHoldsById.delete(id);
    }
    if (usePersistentDb) {
        try { await db.deleteSlotHoldsForSlot(dateIso, t); } catch (err) {
            console.error('deleteSlotHoldsForSlot:', err.message);
        }
    }
    invalidateNextSlotsCache();
}

/**
 * Slots patients may book for a date: schedule + optional smart grouping + not already taken.
 * Smart grouping is intentionally skipped when an explicit per-day override is in place,
 * so the admin's custom hours are surfaced as the full set of bookable slots.
 * Pass `bypassSmartGrouping=true` (admin tools) to return the full grid regardless of grouping.
 */
async function getBookableSlotsForDateIso(dateIso, excludeBookingRef, excludeInvitationId, bypassSmartGrouping, excludeHoldId) {
    const base = slotsForDateIso(dateIso);
    if (!base.length) return [];
    const slotDuration = scheduleStore.slotDuration || 30;
    let bookings = await fetchBookingsForDateIso(dateIso);
    if (excludeBookingRef) {
        bookings = bookings.filter((b) => b.bookingRef !== excludeBookingRef);
    }
    const invitationLocked = await fetchInvitationLockedTimesForDateIso(dateIso);
    if (excludeInvitationId && usePersistentDb) {
        try {
            const inv = await db.findInvitationById(excludeInvitationId);
            if (inv && inv.time) invitationLocked.delete(normalizeTimeString({ time: inv.time }) || inv.time);
        } catch (e) { /* ignore */ }
    }
    const effective = getEffectiveDaySchedule(dateIso);
    const hasExplicitOverride = effective && effective.source === 'override';
    let slots;
    if (scheduleStore.smartSlotGrouping && !hasExplicitOverride && !bypassSmartGrouping) {
        slots = computeSmartGroupedSlotTimes(base, bookings, slotDuration);
    } else {
        slots = base.slice();
    }
    if (invitationLocked.size > 0) {
        slots = slots.filter((t) => !invitationLocked.has(t));
    }
    const heldTimes = await listHeldTimesForDate(dateIso, excludeHoldId || null);
    if (heldTimes.size > 0) {
        slots = slots.filter((t) => !heldTimes.has(t));
    }
    const free = [];
    for (const t of slots) {
        if (usePersistentDb) {
            const taken = await db.isSlotTakenByOther(dateIso, t, excludeBookingRef);
            if (!taken) free.push(t);
        } else if (isSlotFreeInMemory(dateIso, t, excludeBookingRef)) {
            free.push(t);
        }
    }
    return free;
}

function lisbonNowParts() {
    const tz = scheduleStore.timezone || 'Europe/Lisbon';
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });
    const parts = {};
    for (const p of fmt.formatToParts(new Date())) {
        if (p.type !== 'literal') parts[p.type] = p.value;
    }
    return {
        dateIso: `${parts.year}-${parts.month}-${parts.day}`,
        minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
}

function addDaysIso(dateIso, n) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
    if (!m) return dateIso;
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(n)));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function isWeekendIso(dateIso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
    if (!m) return false;
    const dow = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
    return dow === 0 || dow === 6;
}

function isEveningTime(hhmm) {
    const mins = timeToMinutes(hhmm);
    return mins != null && mins >= 18 * 60;
}

/** Next free public slots across upcoming days (homepage + landing heroes). */
async function getNextBookableSlots(limit, maxDays, withinHours) {
    const cap = Math.min(Math.max(parseInt(limit, 10) || 1, 1), 8);
    const days = Math.min(Math.max(parseInt(maxDays, 10) || 14, 1), 21);
    const horizonHours = Number.isFinite(withinHours) ? withinHours : 168;
    const tz = scheduleStore.timezone || 'Europe/Lisbon';
    const horizonMs = horizonHours > 0 ? Date.now() + horizonHours * 60 * 60 * 1000 : Infinity;
    const now = lisbonNowParts();
    const pool = [];
    for (let i = 0; i < days; i++) {
        const dateIso = addDaysIso(now.dateIso, i);
        const daySchedule = getEffectiveDaySchedule(dateIso);
        if (!daySchedule || !daySchedule.enabled) continue;
        let available = await getBookableSlotsForDateIso(dateIso, null, null, false);
        if (i === 0) {
            const cutoff = now.minutes + 15;
            available = available.filter((t) => {
                const mins = timeToMinutes(t);
                return mins != null && mins > cutoff;
            });
        }
        for (const time of available) {
            const start = localWallTimeToUtcMs(dateIso, time, tz);
            if (Number.isFinite(start) && start > horizonMs) continue;
            pool.push({
                id: slotIdFromDateTime(dateIso, time),
                date: dateIso,
                time
            });
        }
    }
    const evening = pool.filter((s) => isEveningTime(s.time));
    const weekend = pool.filter((s) => isWeekendIso(s.date));
    const out = [];
    const seen = new Set();
    const push = (slot) => {
        if (!slot || !slot.id || seen.has(slot.id) || out.length >= cap) return;
        seen.add(slot.id);
        out.push(slot);
    };
    const reserve = (evening[0] ? 1 : 0) + (weekend[0] ? 1 : 0);
    const soonestTake = Math.max(1, cap - reserve);
    for (const slot of pool) {
        if (out.length >= soonestTake) break;
        push(slot);
    }
    push(evening[0]);
    push(weekend.find((s) => !seen.has(s.id)));
    for (const slot of pool) push(slot);
    return out;
}

function makeRenewalFollowupToken(booking) {
    const email = String((booking && booking.email) || '').trim().toLowerCase();
    const name = String((booking && booking.patientName) || '').trim();
    if (!email || !email.includes('@')) return '';
    const payload = Buffer.from(
        JSON.stringify({
            e: email,
            n: name.slice(0, 80),
            r: String((booking && booking.bookingRef) || '').slice(0, 32),
            exp: Date.now() + 90 * 864e5
        }),
        'utf8'
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url').slice(0, 24);
    return `${payload}.${sig}`;
}

function verifyRenewalFollowupToken(raw) {
    const token = String(raw || '').trim();
    const dot = token.lastIndexOf('.');
    if (dot < 8) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url').slice(0, 24);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    let data;
    try {
        data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
    if (!data || data.exp < Date.now()) return null;
    const email = String(data.e || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return null;
    return { email, name: String(data.n || '').trim(), bookingRef: String(data.r || '') };
}

function renewalFollowupUrl(booking, slot) {
    const token = makeRenewalFollowupToken(booking);
    const u = new URL(`${PUBLIC_SITE_URL}/book-consultation`);
    u.searchParams.set('service', 'renovacao');
    if (token) u.searchParams.set('renew', token);
    if (slot && slot.date && slot.time) {
        u.searchParams.set('date', slot.date);
        u.searchParams.set('time', slot.time);
    }
    return emailLink(u.toString(), datedCampaign('renewal_followup'), 'renovacao-19');
}

const AUTOMATION_JOB_INTERVAL_MS = 15 * 60 * 1000;
let automationJobStarted = false;

async function staffAvailabilityNotifyEmail(username) {
    const u = String(username || '').trim().toLowerCase();
    if (!u) return '';
    if (u === String(CLINIC_USERNAME || '').trim().toLowerCase()) {
        return String(CONTACT_EMAIL || '').trim();
    }
    const pro = await findProfessionalByUsernameInternal(u);
    return String((pro && pro.email) || '').trim();
}

async function peopleForAvailabilityReminders() {
    const people = [];
    const seen = new Set();
    const add = (username, displayName, email) => {
        const u = String(username || '').trim().toLowerCase();
        if (!u || seen.has(u)) return;
        seen.add(u);
        people.push({
            username: u,
            displayName: displayName || u,
            email: String(email || '').trim()
        });
    };
    add(CLINIC_USERNAME, CLINIC_USERNAME, CONTACT_EMAIL);
    const list = await listProfessionalsInternal();
    for (const p of list || []) {
        if (p.active === false) continue;
        add(p.username, p.displayName, p.email);
    }
    return people;
}

async function sendAvailabilityReminderEmail({ to, name, monthLabel, deadlineLabel, kind }) {
    const portalUrl = `${PUBLIC_SITE_URL}/clinic-portal`;
    const isFinal = kind === 15;
    const subject = isFinal
        ? `Deadline: availabilities for ${monthLabel}`
        : `Please give your availabilities for ${monthLabel}`;
    const greeting = name ? `Olá ${name},` : 'Olá,';
    const body = isFinal
        ? `This is a reminder that today is the deadline to give your availabilities for ${monthLabel} (till ${deadlineLabel}).`
        : `Please give your availabilities for ${monthLabel} till ${deadlineLabel}.`;
    const text = [greeting, '', body, '', `Open the clinic portal: ${portalUrl}`, '', 'Lon Clinic'].join('\n');
    const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(body)}</p>
<p><a href="${escapeHtml(portalUrl)}">Open the clinic portal</a></p>
<p>Lon Clinic</p>
</div>`;
    await deliverEmail({ from: EMAIL_FROM, to, subject, text, html });
}

async function runAvailabilityMonthReminders() {
    const today = lisbonTodayUtcMidnight();
    const day = today.getUTCDate();
    if (day < 10) return;
    const target = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    const y = target.getUTCFullYear();
    const mo = target.getUTCMonth();
    const monthKey = `${y}-${pad2Interview(mo + 1)}`;
    const monthName = PAYOUT_MONTH_NAMES_PT[mo];
    const monthLabel = `${monthName} ${y}`;
    const prior = new Date(Date.UTC(y, mo - 1, 1));
    const priorName = PAYOUT_MONTH_NAMES_PT[prior.getUTCMonth()];
    const deadlineLabel = `15 of ${priorName}`;
    const kind = day >= 15 ? 15 : 10;
    const people = await peopleForAvailabilityReminders();
    for (const person of people) {
        const row = await getStaffMonthAvailabilityInternal(person.username, monthKey);
        if (row && row.confirmed) continue;
        if (kind === 10 && row && row.reminder10Sent) continue;
        if (kind === 15 && row && row.reminder15Sent) continue;
        const to = person.email || (await staffAvailabilityNotifyEmail(person.username));
        if (!to || !to.includes('@')) {
            console.log(`   ⚠️  Availability reminder skipped (no email): ${person.username} ${monthKey}`);
            continue;
        }
        try {
            await sendAvailabilityReminderEmail({
                to,
                name: person.displayName,
                monthLabel,
                deadlineLabel,
                kind
            });
            await markStaffMonthAvailabilityReminderInternal(person.username, monthKey, kind);
            console.log(`   ✉️  Availability reminder (${kind}) sent to ${to} for ${monthKey}`);
        } catch (err) {
            console.error(`   ❌ Availability reminder failed (${person.username} ${monthKey}):`, err.message);
        }
    }
}

async function runAutomationJobs() {
    await expireStalePendingInvitations();
    if (!isEmailConfigured) {
        return;
    }
    const tz = scheduleStore.timezone || 'Europe/Lisbon';
    try {
        let list24 = [];
        let list1h = [];
        let listFu = [];
        let listIntake = [];
        if (usePersistentDb) {
            list24 = await db.findBookingsNeeding24hReminder();
            list1h = await db.findBookingsNeeding1hReminder();
            listFu = await db.findBookingsNeedingFollowup();
            listIntake = await db.findBookingsNeedingIntakeReminder();
        } else {
            list24 = memoryBookingsNeeding24h(tz);
            list1h = memoryBookingsNeeding1h(tz);
            listFu = memoryBookingsNeedingFollowup();
            listIntake = memoryBookingsNeedingIntakeReminder();
        }

        const now = Date.now();
        const h24 = now + 24 * 60 * 60 * 1000;
        const h1 = now + 60 * 60 * 1000;

        const win24 = list24.filter((b) => {
            const ms = getAppointmentStartUtcMs(b, tz);
            return Number.isFinite(ms) && ms > now && ms <= h24;
        });
        const win1 = list1h.filter((b) => {
            const ms = getAppointmentStartUtcMs(b, tz);
            return Number.isFinite(ms) && ms > now && ms <= h1;
        });
        const winFu = listFu.filter((b) => b.consultationCompleted === true && !b.followupSent && !b.cancelled);

        await runAvailabilityMonthReminders();

        if (win24.length > 0) {
            console.log(`   ⏰ 24h reminders: ${win24.length} booking(s)`);
        }
        for (const b of win24) {
            const locale = b.patientLocale || 'en';
            const sent = await sendReminderEmail({
                email: b.email,
                patientName: b.patientName,
                serviceLabel: serviceLabelFromCode(b.service),
                date: b.date,
                time: b.time,
                bookingRef: b.bookingRef,
                locale,
                reminderVariant: '24h',
                professional: b.professional || '',
                intakeUrl: (!b.intakeCompletedAt && b.intakeToken) ? patientIntakeUrl(b.intakeToken) : ''
            });
            if (!sent) continue;
            try {
                if (usePersistentDb) await db.markReminderSent(b.bookingRef);
                else {
                    const row = bookingsStore.find((x) => x.bookingRef === b.bookingRef);
                    if (row) row.reminderSent = true;
                }
            } catch (err) {
                console.error('   ❌ mark reminder_sent:', b.bookingRef, err.message);
            }
        }

        if (win1.length > 0) {
            console.log(`   ⏰ 1h reminders: ${win1.length} booking(s)`);
        }
        for (const b of win1) {
            const locale = b.patientLocale || 'en';
            const sent = await sendReminderEmail({
                email: b.email,
                patientName: b.patientName,
                serviceLabel: serviceLabelFromCode(b.service),
                date: b.date,
                time: b.time,
                bookingRef: b.bookingRef,
                locale,
                reminderVariant: '1h',
                professional: b.professional || '',
                intakeUrl: (!b.intakeCompletedAt && b.intakeToken) ? patientIntakeUrl(b.intakeToken) : ''
            });
            if (!sent) continue;
            try {
                if (usePersistentDb) await db.markReminder1hSent(b.bookingRef);
                else {
                    const row = bookingsStore.find((x) => x.bookingRef === b.bookingRef);
                    if (row) row.reminder1hSent = true;
                }
            } catch (err) {
                console.error('   ❌ mark reminder_1h_sent:', b.bookingRef, err.message);
            }
        }

        if (winFu.length > 0) {
            console.log(`   ⏰ Post-consultation follow-ups: ${winFu.length} booking(s)`);
        }
        for (const b of winFu) {
            await sendPostConsultationReviewEmail(b);
        }

        const nowMs = Date.now();
        const dueIntake = (listIntake || []).filter((b) => {
            if (b.cancelled || b.intakeCompletedAt || b.intakeReminderSent || !b.intakeToken) return false;
            const appt = getAppointmentStartUtcMs(b, tz);
            return !Number.isFinite(appt) || appt > nowMs;
        });
        if (dueIntake.length > 0) {
            console.log(`   ⏰ Intake reminders: ${dueIntake.length} booking(s)`);
        }
        for (const b of dueIntake) {
            const sent = await sendIntakeReminderEmail(b);
            if (!sent) continue;
            try {
                if (usePersistentDb) await db.markIntakeReminderSent(b.bookingRef);
                else {
                    const row = bookingsStore.find((x) => x.bookingRef === b.bookingRef);
                    if (row) row.intakeReminderSent = true;
                }
            } catch (err) {
                console.error('   ❌ mark intake reminder:', b.bookingRef, err.message);
            }
        }
    } catch (err) {
        console.error('   ❌ Automation job:', err.message);
    }
}

function startAppointmentReminderScheduler() {
    if (automationJobStarted) return;
    automationJobStarted = true;
    setInterval(() => {
        void runAutomationJobs();
    }, AUTOMATION_JOB_INTERVAL_MS);
    setInterval(() => {
        void runQuizLeadRecoveries();
        void runNutricaoNurture();
    }, 60_000);
    setTimeout(() => {
        void runAutomationJobs();
    }, 15_000);
    setTimeout(() => {
        void runQuizLeadRecoveries();
        void runNutricaoNurture();
    }, 20_000);
    console.log('   ⏰ Automation (reminders, follow-up, invite expiry): every 15m (first run ~15s after startup)');
    console.log('   ⏰ Quiz checkout recovery: every 60s');
    console.log('   ⏰ Nutrition quiz nurture (1h / 24h / 48h): every 60s');
}

/** Avoid duplicate finalize when webhook and success-page API run together */
const checkoutFinalizeInFlight = new Set();

function paymentIntentIdFromSession(session) {
    const pi = session && session.payment_intent;
    if (pi) {
        return typeof pi === 'string' ? pi : (pi.id || '');
    }
    if (session && session.mode === 'subscription' && session.id) {
        return 'sub_cs_' + session.id;
    }
    return '';
}

/** Stripe Customer id on completed Checkout (links repeat purchases even when email changes). */
function stripeCustomerIdFromSession(session) {
    if (!session || !session.customer) return '';
    const c = session.customer;
    return typeof c === 'string' ? c : (c && c.id ? String(c.id) : '');
}

/**
 * Sends patient + admin emails and persists the booking once per Stripe payment.
 * Used by the Stripe webhook and by GET /api/session/:id so confirmations still go out
 * if the webhook is misconfigured, delayed, or unreachable.
 */
async function bookingRecordedByPaymentId(paymentId) {
    if (usePersistentDb) {
        return db.bookingExistsByPaymentId(paymentId);
    }
    return bookingsStore.some((b) => b.paymentId === paymentId);
}

async function countPriorBookingsExcludingPayment(paymentId, email, stripeCustomerId) {
    const e = (email || '').toLowerCase().trim();
    const sc = (stripeCustomerId || '').trim();
    if (!paymentId) return 0;
    if (!e && !sc) return 0;
    if (usePersistentDb) {
        return db.countPriorBookingsExcludingPayment(paymentId, e, sc);
    }
    return bookingsStore.filter((b) => {
        if (b.paymentId === paymentId) return false;
        const emailMatch = Boolean(e && b.email === e);
        const custMatch = Boolean(sc && b.stripeCustomerId && b.stripeCustomerId === sc);
        return emailMatch || custMatch;
    }).length;
}

async function finalizePaidCheckoutSession(session, logPrefix = '') {
    if (!session || session.payment_status !== 'paid') {
        return { ok: false, reason: 'not_paid' };
    }

    const paymentId = paymentIntentIdFromSession(session);
    if (!paymentId) {
        console.warn(`${logPrefix}finalizePaidCheckoutSession: missing payment_intent on session ${session.id}`);
        return { ok: false, reason: 'no_payment_intent' };
    }

    if (await bookingRecordedByPaymentId(paymentId)) {
        return { ok: true, reason: 'already_recorded' };
    }

    if (checkoutFinalizeInFlight.has(paymentId)) {
        for (let i = 0; i < 50; i++) {
            await new Promise((r) => setTimeout(r, 100));
            if (await bookingRecordedByPaymentId(paymentId)) {
                return { ok: true, reason: 'awaited_peer' };
            }
        }
        console.warn(`${logPrefix}finalizePaidCheckoutSession: timeout waiting for in-flight finalize for ${paymentId}`);
        return { ok: false, reason: 'finalize_wait_timeout' };
    }

    checkoutFinalizeInFlight.add(paymentId);
    try {
        if (await bookingRecordedByPaymentId(paymentId)) {
            return { ok: true, reason: 'already_recorded' };
        }

        const meta = session.metadata || {};
        const isoRaw = meta.date_iso && String(meta.date_iso).trim();
        const normTimeFinal = normalizeTimeString({ time: meta.time || '' });
        if (isoRaw && /^\d{4}-\d{2}-\d{2}$/.test(isoRaw) && normTimeFinal) {
            // If this came from an admin-issued invitation, allow any slot in the grid
            // plus invitation-only times (07:00–08:30, 21:00) outside weekly hours.
            const allowAdminSlot = !!meta.invitation_id;
            const allowed = allowAdminSlot
                ? await isInvitationSlotAllowed(isoRaw, normTimeFinal, meta.invitation_id || null)
                : (await getBookableSlotsForDateIso(isoRaw, null, null, false)).includes(normTimeFinal);
            if (!allowed) {
                console.warn(
                    `${logPrefix}finalizePaidCheckoutSession: slot not bookable ${isoRaw} ${normTimeFinal}`
                );
                return { ok: false, reason: 'invalid_slot' };
            }
            if (usePersistentDb) {
                const taken = await db.isSlotTakenByOther(isoRaw, normTimeFinal, null);
                if (taken) {
                    console.warn(
                        `${logPrefix}finalizePaidCheckoutSession: slot already taken ${isoRaw} ${normTimeFinal}`
                    );
                    return { ok: false, reason: 'slot_taken' };
                }
            } else if (!isSlotFreeInMemory(isoRaw, normTimeFinal, null)) {
                console.warn(`${logPrefix}finalizePaidCheckoutSession: slot not free in memory`);
                return { ok: false, reason: 'slot_taken' };
            }
        }

        const travellerCount = parseInt(meta.traveller_count, 10) || 1;
        const passengerNames = [];
        for (let i = 1; i <= travellerCount; i++) {
            if (meta[`p${i}_name`]) {
                passengerNames.push(meta[`p${i}_name`]);
            }
        }

        const shortId = paymentId.length >= 8 ? paymentId.slice(-8) : paymentId;
        const bookingRef = 'LC-' + shortId.toUpperCase();
        const intakeToken = newIntakeToken();

        const bookingService = bookingServiceTag(meta.service);
        const bookingData = {
            bookingRef,
            patientName: passengerNames[0] || meta.contact_email?.split('@')[0] || 'Patient',
            email: session.customer_details?.email || session.customer_email || meta.contact_email,
            service: bookingService,
            serviceLabel: (meta.service_label && String(meta.service_label).trim())
                || SERVICE_LABELS[meta.service]
                || meta.service,
            date: meta.date,
            time: meta.time,
            amount: session.amount_total,
            currency: session.currency,
            travellerCount,
            hasInsurance: meta.has_insurance === 'medicare',
            passengers: passengerNames,
            travelDest: meta.travel_destinations,
            travelDates: meta.travel_dates,
            contactPhone: meta.contact_phone || '',
            locale: meta.locale || 'en',
            intakeToken
        };

        await sendConfirmationEmail(bookingData);
        await sendAdminNotificationEmail(bookingData);

        const emailNorm = (
            session.customer_details?.email ||
            session.customer_email ||
            meta.contact_email ||
            ''
        ).toLowerCase().trim();
        const stripeCustomerId = stripeCustomerIdFromSession(session);
        const record = {
            bookingRef,
            email: emailNorm,
            stripeCustomerId: stripeCustomerId || undefined,
            service: bookingService,
            date: meta.date,
            time: meta.time,
            dateIso: meta.date_iso && String(meta.date_iso).trim() ? String(meta.date_iso).trim() : null,
            patientName: passengerNames[0] || 'Patient',
            patientPhone: meta.contact_phone || '',
            travellerCount,
            amount: session.amount_total,
            currency: session.currency,
            paymentId,
            patientLocale: normalizePatientLocale(meta.locale || 'en'),
            cancelled: false,
            rescheduleCount: 0,
            reminderSent: false,
            reminder1hSent: false,
            followupSent: false,
            intakeToken,
            intakeCompletedAt: null,
            intakeReminderSent: false,
            intake: null,
            createdAt: new Date().toISOString()
        };

        if (usePersistentDb) {
            const inserted = await db.insertBooking(record);
            if (!inserted) {
                return { ok: true, reason: 'already_recorded' };
            }
            try {
                await db.setBookingIntakeToken(bookingRef, intakeToken);
            } catch (err) {
                console.error(`${logPrefix}intake token save failed:`, err.message);
            }
            console.log(`${logPrefix}📋 Booking ${bookingRef} saved (database)`);
        } else {
            bookingsStore.push(record);
            console.log(`${logPrefix}📋 Booking ${bookingRef} saved (${bookingsStore.length} total in memory)`);
        }
        const bookedIso = record.dateIso && String(record.dateIso).trim();
        const bookedTime = normalizeTimeString({ time: record.time || '' });
        if (bookedIso && bookedTime) {
            await releaseHoldsForSlot(bookedIso, bookedTime);
        } else {
            invalidateNextSlotsCache();
        }
        return { ok: true, reason: 'recorded', bookingRef };
    } finally {
        checkoutFinalizeInFlight.delete(paymentId);
    }
}

/* ========================================
   STRIPE WEBHOOK (raw body needed BEFORE json parser)
======================================== */

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecretRaw = process.env.STRIPE_WEBHOOK_SECRET;
    const webhookSecret = webhookSecretRaw ? String(webhookSecretRaw).trim() : '';
    const placeholderSecrets = new Set(['whsec_placeholder', 'whsec_your_webhook_secret_here']);

    if (!webhookSecret || placeholderSecrets.has(webhookSecret)) {
        console.error('❌ Webhook rejected: STRIPE_WEBHOOK_SECRET must be set to a real signing secret (signature verification is mandatory).');
        return res.status(500).send('Webhook not configured');
    }
    if (!stripe) {
        console.error('❌ Webhook rejected: Stripe is not configured.');
        return res.status(500).send('Stripe not configured');
    }
    if (!sig) {
        return res.status(400).send('Missing stripe-signature header');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('⚠️  Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle events
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const meta = session.metadata || {};
            const travellerCount = parseInt(meta.traveller_count, 10) || 1;

            console.log(
                '✅ Payment successful (checkout session …' +
                    stripeSessionIdSuffixForLog(session.id) +
                    ') amount ' +
                    (session.amount_total != null ? session.amount_total / 100 : '?') +
                    ' ' +
                    String(session.currency || '').toUpperCase() +
                    ' service ' +
                    String(meta.service || '') +
                    ' travellers ' +
                    travellerCount
            );

            const fin = await finalizePaidCheckoutSession(session, '   ');
            if (fin.reason === 'already_recorded' || fin.reason === 'awaited_peer') {
                console.log('   ℹ️  Checkout already finalized (idempotent skip)');
            }
            // If this Checkout came from an admin-issued invitation, mark it paid.
            if (usePersistentDb && meta.invitation_id) {
                try {
                    const updated = await db.markInvitationPaid(meta.invitation_id, fin.bookingRef || null);
                    if (updated) console.log(`   ✅ Invitation ${meta.invitation_id} marked paid`);
                } catch (e) {
                    console.error('   ⚠️  Failed to mark invitation paid:', e.message);
                }
            }
            emitServerAnalytics(
                meta.invitation_id ? 'invite_paid' : 'payment_succeeded',
                {
                    visitorId: meta.lon_vid || null,
                    sessionId: meta.lon_sid || null,
                    props: {
                        service: bookingServiceTag(meta.service),
                        via: meta.invitation_id ? 'invite' : 'checkout',
                        funnel: 'patient_booking'
                    },
                    revenueCents: session.amount_total || 0,
                    currency: session.currency || 'eur',
                    bookingRef: fin.bookingRef || null
                }
            ).catch(() => {});
            markQuizLeadConverted(session.customer_email || meta.contact_email || '').catch(() => {});
            break;
        }

        case 'checkout.session.expired': {
            const expiredSession = event.data.object;
            console.log(
                '⏰ Checkout session expired (…' + stripeSessionIdSuffixForLog(expiredSession.id) + ')'
            );
            emitServerAnalytics('checkout_abandoned', {
                props: { service: bookingServiceTag((expiredSession.metadata || {}).service), via: 'stripe_expired' }
            }).catch(() => {});
            const expiredEmail = expiredSession.customer_email || (expiredSession.metadata && expiredSession.metadata.contact_email) || '';
            if (expiredEmail) {
                patchQuizLead(expiredEmail, { recoverAt: Date.now() }).catch(() => {});
            }
            // Stripe Checkout sessions last at most 24h. Invitation payment links
            // stay valid until the consultation day, so do not cancel the invite
            // unless that day has already passed.
            if (usePersistentDb && expiredSession.metadata && expiredSession.metadata.invitation_id) {
                try {
                    const inv = await db.findInvitationById(expiredSession.metadata.invitation_id);
                    if (inv && inv.status === 'pending' && isInvitationPaymentDeadlinePassed(inv)) {
                        await db.cancelInvitation(inv.id);
                        console.log(`   ↩️  Invitation ${inv.id} released (consultation day passed)`);
                    }
                } catch (e) { /* ignore */ }
            }
            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

function parseCollectPayload(body) {
    if (!body) return [];
    let payload = body;
    if (Buffer.isBuffer(payload)) {
        try {
            payload = JSON.parse(payload.toString('utf8') || '{}');
        } catch {
            return [];
        }
    } else if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload || '{}');
        } catch {
            return [];
        }
    }
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.events)) return payload.events;
    return [];
}

app.post('/api/a/collect', rateLimitAnalytics, express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
    res.status(204).end();
    try {
        await ingestClientEvents(req, parseCollectPayload(req.body));
    } catch (err) {
        console.error('POST /api/a/collect:', err.message);
    }
});

const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
app.get('/api/a.gif', rateLimitAnalytics, async (req, res) => {
    res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(PIXEL_GIF);
    try {
        const name = String(req.query.n || 'page_view').slice(0, 64);
        await ingestClientEvents(req, [
            {
                event_id: crypto.randomUUID(),
                name,
                ts: Date.now(),
                visitor_id: String(req.query.v || '').slice(0, 64),
                session_id: String(req.query.s || '').slice(0, 64),
                page_path: String(req.query.p || req.get('referer') || '').slice(0, 240),
                referrer: String(req.query.r || '').slice(0, 300),
                utm_source: String(req.query.us || ''),
                utm_medium: String(req.query.um || ''),
                utm_campaign: String(req.query.uc || ''),
                gclid: String(req.query.gclid || ''),
                props: { via: 'pixel' }
            }
        ]);
    } catch (err) {
        console.error('GET /api/a.gif:', err.message);
    }
});

app.get('/r/:slug', (req, res) => {
    const spec = TRACKED_REDIRECTS[String(req.params.slug || '').toLowerCase()];
    if (!spec) return res.status(404).type('text').send('Not found');
    const destPath = safeInternalPath(req.query.to);
    const dest = withUtm(
        `${getBaseUrl(req)}${destPath === '/' ? '/' : destPath}`,
        spec
    );
    res.set({
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Cache-Control': 'no-store'
    });
    res.redirect(302, dest);
});

// ─── Middleware ───
app.use(express.json());

app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    const rangeKey = String(req.query.range || '7d');
    const allowed = new Set(['24h', '7d', '30d', '90d']);
    const range = allowed.has(rangeKey) ? rangeKey : '7d';
    const audienceKey = String(req.query.audience || 'public');
    const audience = ['public', 'staff', 'all'].includes(audienceKey) ? audienceKey : 'public';
    const funnel = analyticsNet.normalizeFunnelKey(req.query.funnel);
    try {
        if (!usePersistentDb) {
            const overview = analyticsNet.overviewFromMemory(range, audience, funnel);
            overview.deviceMarked = hasStaffDeviceCookie(req);
            overview.trackedLinks = trackedLinksForAdmin(getBaseUrl(req));
            return res.json(overview);
        }
        const bounds = analyticsNet.rangeBounds(range);
        const [rows, live, bookingStats, staffVisitorIds, applicationStats] = await Promise.all([
            db.listAnalyticsEventsBetween(bounds.from, bounds.to, { excludeHeartbeat: true }),
            db.listLiveAnalyticsSessions(new Date(Date.now() - 120000).toISOString()),
            db.analyticsBookingStats(bounds.from, bounds.to, { funnel }),
            db.listStaffVisitorIds(),
            funnel === 'job_application'
                ? db.analyticsApplicationStats(bounds.from, bounds.to)
                : Promise.resolve({ count: 0 })
        ]);
        const liveRows = live.map((s) => ({
            sessionId: s.sessionId,
            name: 'heartbeat',
            staff: !!s.staff,
            channel: s.staff ? 'internal' : undefined
        }));
        const overview = analyticsNet.buildOverview(
            rows,
            liveRows,
            { ...bookingStats, applications: applicationStats.count || 0 },
            bounds,
            audience,
            staffVisitorIds,
            funnel
        );
        overview.deviceMarked = hasStaffDeviceCookie(req);
        overview.trackedLinks = trackedLinksForAdmin(getBaseUrl(req));
        res.json(overview);
    } catch (err) {
        console.error('GET /api/admin/analytics:', err.message);
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

app.post('/api/admin/analytics/mark-device', requireAdmin, async (req, res) => {
    setStaffDeviceCookie(res);
    try {
        await emitServerAnalytics(
            'page_view',
            {
                pagePath: '/admin',
                landingPath: '/admin',
                referrer: '',
                props: { via: 'staff-device' }
            },
            req
        );
    } catch (err) {
        console.error('POST /api/admin/analytics/mark-device:', err.message);
    }
    res.json({ success: true, deviceMarked: true });
});

// NOTE:
// We intentionally avoid host-based canonical redirects here.
// On some Railway/custom-domain setups this can cause redirect loops
// (ERR_TOO_MANY_REDIRECTS), especially when another layer already redirects.
// We only do a targeted subdomain redirect for doctors.lonclinic.com root.
app.use((req, res, next) => {
    const forwardedHost = req.headers['x-forwarded-host'];
    const rawHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.get('host') || '';
    const host = rawHost.split(':')[0].toLowerCase();
    if (host === 'doctors.lonclinic.com' && (req.path === '/' || req.path === '/index.html')) {
        return res.redirect(302, '/admin');
    }
    next();
});

app.use((req, res, next) => {
    const p = req.path || '/';
    if (!analyticsNet.isProbePath(p)) return next();
    res.set({
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });
    return res.status(404).type('text').send('Not found');
});

app.use((req, res, next) => {
    if (wantsStaffDeviceMark(req) || (req.session && req.session.clinicAuthenticated)) {
        setStaffDeviceCookie(res);
    }
    next();
});

// Technical SEO: prevent private/utility areas from being indexed.
app.use((req, res, next) => {
    const noIndexPrefixes = [
        '/admin',
        '/doctors',
        '/clinic-portal',
        '/patient-portal',
        '/conta',
        '/api/clinic',
        '/api/admin',
        '/api/debug-stripe',
        '/api/test-email',
        '/diretorio',
        '/api/diretorio',
        '/uploads'
    ];
    const shouldNoIndex = noIndexPrefixes.some((prefix) => req.path.startsWith(prefix));
    if (shouldNoIndex) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    next();
});

// ─── IMPORTANT: Routes must come BEFORE express.static ───
// ─── Friendly URLs (without .html) - MUST come before root route ───
app.get('/tourist-clinic', (req, res) => {
    try {
        sendHtmlNoCacheString(res, touristPages.renderHub(seo.SITE_ORIGIN));
    } catch (err) {
        console.error('❌ Tourist clinic hub error:', err.message || err);
        res.status(500).type('html').send('Error loading tourist clinic.');
    }
});

app.get('/travel-clinic', (req, res) => {
    const filePath = path.join(__dirname, 'travel.html');
    if (!fs.existsSync(filePath)) {
        console.error('❌ travel.html not found on server');
        return res.status(404).send('travel.html not found');
    }
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('❌ Error sending travel.html:', err.message || err);
            return res.status(500).send('Error: ' + err.message);
        }
    });
});

app.get('/equipa', (req, res) => {
    res.redirect(301, '/equipa/rita-aguiar');
});

app.get('/equipa/:slug', (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    try {
        const result = authors.renderAuthorPage(seo.SITE_ORIGIN, slug);
        if (!result) {
            return res.redirect(302, '/equipa/rita-aguiar');
        }
        sendHtmlNoCacheString(res, result.html);
    } catch (err) {
        console.error('❌ Author page error:', err.message || err);
        res.status(500).type('html').send('Error loading author page.');
    }
});

const MARCAR_TIPO_TO_SLUG = {
    urgente: 'urgente',
    infeccao_urinaria: 'infeccao-urinaria',
    clinica_geral: 'clinica-geral',
    renovacao: 'renovacao',
    travel: 'travel',
    saude_mental: 'saude-mental',
    burnout: 'burnout',
    burnout_mensal: 'burnout-mensal',
    burnout_programa: 'burnout-programa',
    longevidade: 'longevidade',
    nutricao_programa: 'nutricao-programa',
    nutricao_completo: 'nutricao-completo',
    nutricao_completo_reforcado: 'nutricao-completo-reforcado'
};

function redirectToMarcarHtml(req, res) {
    const params = new URLSearchParams(req.query || {});
    const tipo = String(params.get('tipo') || '').toLowerCase();
    const slug = MARCAR_TIPO_TO_SLUG[tipo];

    // Professional URL for known consultation types.
    if (slug) {
        params.delete('tipo');
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return res.redirect(301, `/marcar/${slug}${suffix}`);
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return res.redirect(301, '/marcar.html' + suffix);
}
app.get('/marcar', redirectToMarcarHtml);
app.get('/marcar/', redirectToMarcarHtml);

// Professional consultation booking URLs, e.g. /marcar/clinica-geral
app.get('/marcar/:tipoSlug', (req, res) => {
    const filePath = path.join(__dirname, 'marcar.html');
    if (!fs.existsSync(filePath)) {
        console.error('❌ marcar.html missing at:', filePath);
        return res.status(500).send('marcar.html not found on server');
    }
    sendHtmlNoCache(res, filePath, 'Error loading marcar page');
});

// Explicit handler so /marcar.html always works (do not rely on express.static alone)
app.get('/marcar.html', (req, res) => {
    const filePath = path.join(__dirname, 'marcar.html');
    if (!fs.existsSync(filePath)) {
        console.error('❌ marcar.html missing at:', filePath);
        return res.status(500).send('marcar.html not found on server');
    }
    sendHtmlNoCache(res, filePath, 'Error loading marcar page');
});

app.get('/book-consultation', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'book.html'), 'Error loading booking page');
});

app.get('/invite/:token', async (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!/^[a-f0-9]{32,128}$/i.test(token) || !usePersistentDb) {
        return sendHtmlNoCacheString(res, renderInviteStatusHtml({ kind: 'missing' }), 404);
    }
    try {
        const invitation = await db.findInvitationByToken(token);
        if (!invitation) {
            return sendHtmlNoCacheString(res, renderInviteStatusHtml({ kind: 'missing' }), 404);
        }
        const locale = invitation.locale || 'pt';
        if (invitation.status === 'paid') {
            return res.redirect(302, `${getBaseUrl(req)}/patient-portal?email=${encodeURIComponent(invitation.patientEmail)}`);
        }
        if (invitation.status !== 'pending') {
            return sendHtmlNoCacheString(res, renderInviteStatusHtml({ kind: 'cancelled', locale }), 410);
        }
        if (isInvitationPaymentDeadlinePassed(invitation)) {
            if (stripe && invitation.stripeSessionId) {
                try { await stripe.checkout.sessions.expire(invitation.stripeSessionId); } catch (e) { /* ignore */ }
            }
            try { await db.cancelInvitation(invitation.id); } catch (e) { /* ignore */ }
            return sendHtmlNoCacheString(res, renderInviteStatusHtml({ kind: 'expired', locale }), 410);
        }
        if (!isStripeConfigured) {
            return sendHtmlNoCacheString(res, renderInviteStatusHtml({ kind: 'error', locale }), 503);
        }
        const { session } = await getOrCreateInvitationCheckout(invitation, getBaseUrl(req));
        if (session && session.status === 'complete') {
            return res.redirect(302, `${getBaseUrl(req)}/book-consultation?success=true&session_id=${encodeURIComponent(session.id)}`);
        }
        if (!session || !session.url) {
            return sendHtmlNoCacheString(res, renderInviteStatusHtml({ kind: 'error', locale }), 500);
        }
        return res.redirect(303, session.url);
    } catch (err) {
        console.error('GET /invite/:token:', err.message);
        return sendHtmlNoCacheString(res, renderInviteStatusHtml({ kind: 'error' }), 500);
    }
});

app.get('/faq', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'faq.html'), 'Error loading FAQ page');
});

app.get('/magazine', (req, res) => {
    try {
        const html = guide.renderMagazineIndex(seo.SITE_ORIGIN);
        sendHtmlNoCacheString(res, html);
    } catch (err) {
        console.error('❌ Magazine index error:', err.message || err);
        res.status(500).type('html').send('Error loading Magazine.');
    }
});

app.get('/magazine/', (req, res) => {
    res.redirect(301, '/magazine');
});

app.get('/blog', (req, res) => {
    try {
        const html = guide.renderBlogIndex(seo.SITE_ORIGIN);
        sendHtmlNoCacheString(res, html);
    } catch (err) {
        console.error('❌ Guide index error:', err.message || err);
        res.status(500).type('html').send('Error loading Guide.');
    }
});

app.get('/blog/:slug', (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!guide.isValidSlug(slug)) {
        return sendHtmlNoCacheString(res, guide.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    try {
        const result = guide.renderBlogArticle(seo.SITE_ORIGIN, slug);
        if (!result) {
            return sendHtmlNoCacheString(res, guide.renderNotFound(seo.SITE_ORIGIN), 404);
        }
        sendHtmlNoCacheString(res, result.html);
    } catch (err) {
        console.error('❌ Guide article error:', err.message || err);
        res.status(500).type('html').send('Error loading article.');
    }
});

app.get('/guide', (req, res) => {
    res.redirect(301, '/blog');
});

app.get('/guide/', (req, res) => {
    res.redirect(301, '/blog');
});

app.get('/guide/:slug', (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!guide.isValidSlug(slug)) {
        return res.status(404).type('html').send('Not found');
    }
    res.redirect(301, `/blog/${encodeURIComponent(slug)}`);
});

app.get('/consulta', (req, res) => {
    const filePath = path.join(__dirname, 'consulta.html');
    fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
            console.error('❌ Error loading consulta landing page:', err.message);
            return res.status(500).send('Error loading consulta landing page');
        }
        const cluster = consultaPages.renderHubClusterHtml();
        const out = html.replace('<!-- CONSULTA_CLUSTER -->', cluster);
        sendHtmlNoCacheString(res, out);
    });
});

app.get('/consulta/:slug', (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!consultaPages.isValidSlug(slug)) {
        return sendHtmlNoCacheString(res, consultaPages.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    const result = consultaPages.renderSpoke(seo.SITE_ORIGIN, slug);
    if (!result) {
        return sendHtmlNoCacheString(res, consultaPages.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    sendHtmlNoCacheString(res, result.html);
});

app.get('/burnout', (req, res) => {
    const html = burnoutPages.renderHub(seo.SITE_ORIGIN);
    sendHtmlNoCacheString(res, html);
});

app.get('/burnout/colecao', (req, res) => {
    const html = burnoutPages.renderCollection(seo.SITE_ORIGIN);
    sendHtmlNoCacheString(res, html);
});

app.get('/burnout/teste', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'burnout-quiz.html'), 'Error loading burnout quiz page');
});

app.get('/burnout/testes', (req, res) => {
    sendHtmlNoCacheString(res, clinicalQuizzes.renderHub(seo.SITE_ORIGIN, 'burnout'));
});

app.get('/burnout/teste-:quizId', (req, res) => {
    const def = clinicalQuizzes.getQuizByPath(`/burnout/teste-${String(req.params.quizId || '').toLowerCase()}`);
    if (!def) {
        return sendHtmlNoCacheString(res, burnoutPages.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    sendHtmlNoCacheString(res, clinicalQuizzes.renderQuizPage(seo.SITE_ORIGIN, def));
});

app.get('/burnout/consulta', (req, res) => {
    res.redirect(301, '/clinica-anti-burnout');
});

app.get('/burnout/:slug', (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!burnoutPages.isValidSlug(slug)) {
        return sendHtmlNoCacheString(res, burnoutPages.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    const result = burnoutPages.renderSpoke(seo.SITE_ORIGIN, slug);
    if (!result) {
        return sendHtmlNoCacheString(res, burnoutPages.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    sendHtmlNoCacheString(res, result.html);
});

app.get('/teste-burnout', (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, `/burnout/teste${qs}`);
});

app.get('/clinica-anti-burnout', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'anti-burnout.html'), 'Error loading anti-burnout landing page');
});

app.get('/anti-burnout', (req, res) => {
    res.redirect(301, '/clinica-anti-burnout');
});

app.get('/saudemental', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'psicologia.html'), 'Error loading saude mental landing page');
});

app.get('/saudemental.html', (req, res) => {
    res.redirect(301, '/saudemental');
});

app.get('/psicologia', (req, res) => {
    res.redirect(301, '/saudemental');
});

app.get('/psicologia.html', (req, res) => {
    res.redirect(301, '/saudemental');
});

app.get('/consultas', (req, res) => {
    try {
        sendHtmlNoCacheString(res, queixas.renderHub(seo.SITE_ORIGIN));
    } catch (err) {
        console.error('❌ Consultas hub error:', err.message || err);
        res.status(500).type('html').send('Error loading consultas.');
    }
});

app.get('/consultas/', (req, res) => {
    res.redirect(301, '/consultas');
});

app.get('/nutricao', (req, res) => {
    try {
        sendHtmlNoCacheString(res, nutricao.renderHub(seo.SITE_ORIGIN));
    } catch (err) {
        console.error('❌ Nutricao hub error:', err.message || err);
        res.status(500).type('html').send('Error loading nutricao.');
    }
});

app.get('/nutricao/', (req, res) => {
    res.redirect(301, '/nutricao');
});

app.get('/nutricao/programa', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'nutricao-programa.html'), 'Error loading nutrition program landing');
});

app.get('/nutricao/avaliacao', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'nutricao-avaliacao.html'), 'Error loading nutrition screening quiz');
});

app.get('/nutricao/testes', (req, res) => {
    sendHtmlNoCacheString(res, clinicalQuizzes.renderHub(seo.SITE_ORIGIN, 'nutrition'));
});

app.get('/nutricao/teste-:quizId', (req, res) => {
    const def = clinicalQuizzes.getQuizByPath(`/nutricao/teste-${String(req.params.quizId || '').toLowerCase()}`);
    if (!def) {
        return sendHtmlNoCacheString(res, nutricao.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    sendHtmlNoCacheString(res, clinicalQuizzes.renderQuizPage(seo.SITE_ORIGIN, def));
});

app.get('/nutricao/:slug', (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!nutricao.isValidSlug(slug)) {
        return sendHtmlNoCacheString(res, nutricao.renderNotFound(seo.SITE_ORIGIN), 404);
    }
    try {
        const result = nutricao.renderSpoke(seo.SITE_ORIGIN, slug);
        if (!result) {
            return sendHtmlNoCacheString(res, nutricao.renderNotFound(seo.SITE_ORIGIN), 404);
        }
        return sendHtmlNoCacheString(res, result.html);
    } catch (err) {
        console.error('❌ Nutricao page error:', err.message || err);
        return res.status(500).type('html').send('Error loading page.');
    }
});

app.get('/teste-personalidade', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'bigfive-quiz.html'), 'Error loading personality quiz page');
});

app.get('/teste-big-five', (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, `/teste-personalidade${qs}`);
});

app.get('/psicologia/teste', (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, `/teste-personalidade${qs}`);
});

app.get('/triagem', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'triagem.html'), 'Error loading triagem page');
});

app.get('/triagem.html', (req, res) => {
    res.redirect(301, '/triagem');
});

app.get('/recrutamento/psicologia', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'recrutamento-psicologia.html'), 'Error loading recrutamento psicologia page');
});

app.get('/recrutamento/psicologia/', (req, res) => {
    res.redirect(301, '/recrutamento/psicologia');
});

app.get('/recrutamento-psicologia.html', (req, res) => {
    res.redirect(301, '/recrutamento/psicologia');
});

app.get('/recrutamento/entrevista', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, follow');
    sendHtmlNoCache(res, path.join(__dirname, 'recrutamento-entrevista.html'), 'Error loading recrutamento entrevista page');
});

app.get('/recrutamento/entrevista/', (req, res) => {
    res.redirect(301, '/recrutamento/entrevista');
});

app.get('/recrutamento-entrevista.html', (req, res) => {
    res.redirect(301, '/recrutamento/entrevista');
});

app.get('/patient-portal', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'dashboard.html'), 'Error loading patient portal');
});

app.get('/conta/vacina', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    sendHtmlNoCacheString(res, cvi.renderRecommendPage(seo.SITE_ORIGIN));
});

app.get('/clinic-portal', (req, res) => {
    sendStaffHtmlNoCache(res, path.join(__dirname, 'clinic.html'), 'Error loading clinic portal');
});

app.get('/clinic-portal/', (req, res) => {
    sendStaffHtmlNoCache(res, path.join(__dirname, 'clinic.html'), 'Error loading clinic portal');
});

const CLINIC_PORTAL_ASSETS = new Set([
    'landing.css',
    'styles.css',
    'dashboard.css',
    'lon-nav.js',
    'clinic.js'
]);
app.get('/clinic-portal/:file', (req, res, next) => {
    const file = path.basename(String(req.params.file || ''));
    if (!CLINIC_PORTAL_ASSETS.has(file)) return next();
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store'
    });
    res.sendFile(path.join(__dirname, file), {
        etag: false,
        lastModified: false,
        cacheControl: false
    }, (err) => {
        if (err) next();
    });
});

app.get('/admin', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'admin.html'), 'Error loading admin page');
});

app.get('/wellness', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'wellness.html'), 'Error loading wellness directory');
});

app.get('/wellness/:slug', (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!slug) return res.redirect(302, '/wellness');
    if (!wellness.getBySlug(slug)) res.status(404);
    sendHtmlNoCache(res, path.join(__dirname, 'wellness-ficha.html'), 'Error loading wellness page');
});

app.get('/diretorio/candidatar', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    sendHtmlNoCache(res, path.join(__dirname, 'diretorio-candidatar.html'), 'Error loading producer application');
});

app.get('/diretorio', requireAdminPage, (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'diretorio.html'), 'Error loading directory');
});

app.get('/diretorio/:slug', requireAdminPage, (req, res) => {
    const slug = String(req.params.slug || '');
    if (!slug || slug === 'candidatar') {
        return res.redirect(302, '/diretorio');
    }
    sendHtmlNoCache(res, path.join(__dirname, 'diretorio-ficha.html'), 'Error loading producer page');
});

app.get('/info.html', (req, res) => {
    const page = String(req.query.page || '').toLowerCase();
    if (page === 'perguntas-frequentes') {
        return res.redirect(301, '/faq');
    }
    if (page === 'equipa') {
        return res.redirect(301, '/equipa/rita-aguiar');
    }
    if (INFO_NOINDEX_PAGES.has(page)) {
        res.setHeader('X-Robots-Tag', 'noindex, follow, noarchive');
    }
    const filePath = path.join(__dirname, 'info.html');
    fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
            console.error('❌ Error reading info.html:', err.message);
            return res.status(500).send('Error loading info page');
        }
        sendHtmlNoCacheString(res, hydrateInfoHtml(html, page, seo.SITE_ORIGIN));
    });
});

// ─── Doctors portal aliases ───
app.get('/doctors', (req, res) => {
    const query = req.url.split('?')[1];
    const redirectUrl = query ? `/admin?${query}` : '/admin';
    res.redirect(301, redirectUrl);
});

app.get('/doctors/', (req, res) => {
    const query = req.url.split('?')[1];
    const redirectUrl = query ? `/admin?${query}` : '/admin';
    res.redirect(301, redirectUrl);
});

// ─── Serve index.html for root route ───
app.get('/', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'index.html'), 'Error loading home page');
});

// ─── Redirect old .html URLs to friendly URLs (301 Permanent Redirect) ───
app.get('/travel.html', (req, res) => {
    res.redirect(301, '/travel-clinic');
});

app.get('/book.html', (req, res) => {
    // Preserve query parameters
    const query = req.url.split('?')[1];
    const redirectUrl = query ? `/book-consultation?${query}` : '/book-consultation';
    res.redirect(301, redirectUrl);
});

app.get('/consulta.html', (req, res) => {
    const query = req.url.split('?')[1];
    const redirectUrl = query ? `/consulta?${query}` : '/consulta';
    res.redirect(301, redirectUrl);
});

app.get('/dashboard.html', (req, res) => {
    const query = req.url.split('?')[1];
    const redirectUrl = query ? `/patient-portal?${query}` : '/patient-portal';
    res.redirect(301, redirectUrl);
});

app.get('/clinic.html', (req, res) => {
    res.redirect(301, '/clinic-portal');
});

app.get('/admin.html', (req, res) => {
    res.redirect(301, '/admin');
});

app.get('/diretorio.html', (req, res) => {
    res.redirect(301, '/diretorio');
});

app.get('/diretorio-candidatar.html', (req, res) => {
    res.redirect(301, '/diretorio/candidatar');
});

app.get('/diretorio-ficha.html', (req, res) => {
    res.redirect(301, '/diretorio');
});

app.get('/wellness.html', (req, res) => {
    res.redirect(301, '/wellness');
});

app.get('/wellness-ficha.html', (req, res) => {
    res.redirect(301, '/wellness');
});

app.get('/doctors.html', (req, res) => {
    res.redirect(301, '/doctors');
});

// Symptom pages (/ansiedade-no-trabalho, …) and tourist guides — after named routes.
app.get('/:slug', (req, res, next) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (touristPages.hasPublishedSlug(slug)) {
        try {
            const result = touristPages.renderPage(seo.SITE_ORIGIN, slug);
            if (!result) return next();
            return sendHtmlNoCacheString(res, result.html);
        } catch (err) {
            console.error('❌ Tourist page error:', err.message || err);
            return res.status(500).type('html').send('Error loading page.');
        }
    }
    if (!queixas.hasPublishedSlug(slug)) return next();
    try {
        const result = queixas.renderPage(seo.SITE_ORIGIN, slug);
        if (!result) return next();
        return sendHtmlNoCacheString(res, result.html);
    } catch (err) {
        console.error('❌ Queixa page error:', err.message || err);
        return res.status(500).type('html').send('Error loading page.');
    }
});

app.get('/sitemap.xml', (req, res) => {
    try {
        const xml = seo.buildSitemapXml(seo.SITE_ORIGIN);
        res.set({
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, must-revalidate',
            'CDN-Cache-Control': 'public, max-age=600'
        });
        res.send(xml);
    } catch (err) {
        console.error('❌ sitemap.xml:', err.message || err);
        res.status(500).type('text').send('Sitemap unavailable');
    }
});

app.get('/robots.txt', (req, res) => {
    res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store'
    });
    res.send(seo.robotsTxt());
});

// Block raw file access to Guide source files (content is server-rendered at /blog).
app.use((req, res, next) => {
    const p = (req.path || '').split('?')[0];
    if (p === '/data/burnout' || p.startsWith('/data/burnout/')) {
        return res.status(404).type('text').send('Not found');
    }
    if (p === '/data/consulta' || p.startsWith('/data/consulta/')) {
        return res.status(404).type('text').send('Not found');
    }
    if (p === '/data/guide' || p.startsWith('/data/guide/')) {
        return res.status(404).end();
    }
    if (p === '/data/queixas' || p.startsWith('/data/queixas/')) {
        return res.status(404).type('text').send('Not found');
    }
    if (p === '/data/nutricao' || p.startsWith('/data/nutricao/')) {
        return res.status(404).type('text').send('Not found');
    }
    if (p === '/data/cvi' || p.startsWith('/data/cvi/')) {
        return res.status(404).type('text').send('Not found');
    }
    if (p === '/cvi.js' || p === '/scripts' || p.startsWith('/scripts/')) {
        return res.status(404).type('text').send('Not found');
    }
    if (p === '/data/tourist' || p.startsWith('/data/tourist/')) {
        return res.status(404).type('text').send('Not found');
    }
    next();
});

app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let rawPath = req.path || '';
    try {
        rawPath = decodeURIComponent(rawPath);
    } catch {
        /* keep */
    }
    if (!rawPath.endsWith('.html')) return next();
    const rel = path.normalize(rawPath.replace(/^\/+/, '')).replace(/^(\.\.(\/|\\|$))+/, '');
    const fp = path.join(__dirname, rel);
    if (path.relative(__dirname, fp).startsWith('..') || path.isAbsolute(path.relative(__dirname, fp))) return next();
    if (!fs.existsSync(fp)) return next();
    fs.readFile(fp, 'utf8', (err, html) => {
        if (err) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    });
});

app.use('/uploads', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.status(404).type('text').send('Not found');
});

// ─── Static files (CSS, JS, images, etc.) ───
app.use(express.static(path.join(__dirname), {
    dotfiles: 'ignore',
    index: false,
    setHeaders: (res, filePath) => {
        const base = path.basename(filePath);
        if (
            base === 'guide.css' ||
            base === 'magazine.css' ||
            base === 'tailwind.css' ||
            base === 'burnout-pages.css' ||
            base === 'consulta-pages.css' ||
            base === 'queixas.css' ||
            base === 'nutricao.css' ||
            base === 'tourist-pages.css' ||
            base === 'psicologia.css' ||
            base === 'psicologia.js' ||
            base === 'recrutamento-psicologia.css' ||
            base === 'recrutamento-psicologia.js' ||
            base === 'recrutamento-entrevista.css' ||
            base === 'recrutamento-entrevista.js' ||
            base === 'diretorio.css' ||
            base === 'diretorio.js' ||
            base === 'diretorio-candidatar.js' ||
            base === 'wellness.css' ||
            base === 'wellness-page.js'
        ) {
            res.setHeader('Cache-Control', 'no-store');
            return;
        }
        // Admin / dashboard assets change often and are tiny — never cache them
        // (also bypasses Cloudflare's default 4h edge cache for static JS/CSS).
        const adminAssets = new Set([
            'admin.js',
            'admin.html',
            'dashboard.css',
            'admin.css',
            'reviews.js',
            'lon-analytics.js',
            'diretorio.js',
            'diretorio.css',
            'cvi-recommend.js',
            'cvi-recommend.css',
            'clinic.js',
            'clinic.html'
        ]);
        if (adminAssets.has(base)) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            res.setHeader('CDN-Cache-Control', 'no-store');
            res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
            return;
        }
        if (filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
            return;
        }
        if (filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        }
    }
}));

// ─── API: Get publishable key ───
app.get('/api/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// ─── API: Debug Stripe configuration (non-production only) ───
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug-stripe', (req, res) => {
        const hasSecret = !!process.env.STRIPE_SECRET_KEY;
        const secretValue = process.env.STRIPE_SECRET_KEY || '';
        const secretPreview = secretValue ? `${secretValue.substring(0, 10)}...` : 'MISSING';
        const startsWithSk = secretValue.startsWith('sk_');
        const isConfigured = isStripeConfigured;

        res.json({
            hasSecretKey: hasSecret,
            secretKeyPreview: secretPreview,
            secretKeyLength: secretValue.length,
            startsWithSk: startsWithSk,
            isStripeConfigured: isConfigured,
            publishableKeyExists: !!process.env.STRIPE_PUBLISHABLE_KEY,
            publishableKeyPreview: process.env.STRIPE_PUBLISHABLE_KEY ? `${process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 10)}...` : 'MISSING'
        });
    });
}

const CAREER_ROLE_LABELS = {
    'medicina-geral': 'Medicina Geral',
    'saude-mental': 'Saúde Mental',
    'medicina-viajante': 'Medicina do Viajante',
    longevidade: 'Medicina da Longevidade',
    'operacoes-e-suporte': 'Operações e Suporte',
    outros: 'Outros'
};

// ─── API: Careers form submission ───
app.post('/api/careers', (req, res) => {
    upload.single('attachment')(req, res, async (uploadErr) => {
        if (uploadErr instanceof multer.MulterError) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'O anexo excede o tamanho máximo de 5MB.' });
            }
            return res.status(400).json({ error: 'Erro ao processar o anexo enviado.' });
        }
        if (uploadErr) {
            return res.status(400).json({ error: uploadErr.message || 'Erro no ficheiro anexado.' });
        }

        const name = String(req.body?.name || '').trim();
        const email = String(req.body?.email || '').trim();
        const phone = String(req.body?.phone || '').trim();
        const roleRaw = String(req.body?.role || '').trim();
        const message = String(req.body?.message || '').trim();
        const locale = ['en', 'pt', 'es'].includes(req.body?.locale) ? req.body.locale : 'pt';

        if (!name || !email || !phone || !roleRaw || !message) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Indique um email válido.' });
        }

        const role = CAREER_ROLE_LABELS[roleRaw] || roleRaw;
        const attachment = req.file || null;
        const payload = {
            name: name.slice(0, 120),
            email: email.slice(0, 160),
            phone: phone.slice(0, 40),
            role: String(role).slice(0, 100),
            message: message.slice(0, 4000),
            attachmentName: attachment ? String(attachment.originalname || 'anexo').slice(0, 180) : '',
            attachmentType: attachment ? attachment.mimetype : '',
            attachmentBuffer: attachment ? attachment.buffer : null,
            locale
        };

        const sent = await sendCareersApplicationEmail(payload);
        if (!sent) {
            return res.status(503).json({ error: 'Não foi possível enviar a candidatura de momento. Tente novamente.' });
        }

        return res.json({
            success: true,
            message: 'Candidatura enviada com sucesso.'
        });
    });
});

// ─── API: Recrutamento Psicologia (candidatura psicólogos clínicos) ───
function clampScore(n, max) {
    return Math.max(0, Math.min(max, Math.round(n)));
}

function yearsBandScore(label) {
    const map = {
        'Menos de 1 ano': 2,
        '1–2 anos': 5,
        '3–5 anos': 8,
        '6–10 anos': 10,
        'Mais de 10 anos': 12
    };
    return map[String(label || '')] || 0;
}

function onlineConsultasScore(label) {
    const map = {
        'Menos de 20': 2,
        '20–50': 4,
        '50–100': 6,
        '100–300': 8,
        'Mais de 300': 10
    };
    return map[String(label || '')] || 0;
}

function scorePsychologistApplication(payload, hasCv) {
    const reasons = [];
    if (payload.opp_inscrito !== 'Sim') reasons.push('opp_nao_inscrito');
    if (payload.aceita_condicoes !== 'Sim') reasons.push('nao_aceita_condicoes');
    if (payload.disponibilidade_estavel === 'Não') reasons.push('disponibilidade_nao_estavel');
    if (!String(payload.horarios_fixos || '').trim()) reasons.push('sem_horarios_fixos');
    if (!hasCv) reasons.push('cv_em_falta');

    const eligible = reasons.length === 0;
    if (!eligible) {
        return {
            eligible: false,
            score: 0,
            band: 'eliminado',
            breakdown: { experiencia: 0, disponibilidade: 0, perfil: 0, qualidade: 0 },
            elimination_reasons: reasons
        };
    }

    const formLen = String(payload.formacao_complementar || '').trim().length;
    let expOnline = 0;
    if (payload.experiencia_online === 'Sim, atualmente') expOnline = 6;
    else if (payload.experiencia_online === 'Sim, mas não atualmente') expOnline = 4;
    expOnline += onlineConsultasScore(payload.n_consultas_online);
    const experiencia = clampScore(
        Math.min(12, yearsBandScore(payload.anos_clinica)) +
            Math.min(8, yearsBandScore(payload.anos_individuais) * 0.7) +
            Math.min(10, expOnline) +
            Math.min(5, formLen / 80),
        30
    );

    let disp = 0;
    const horas = String(payload.horas_iniciais || '');
    if (horas === '1 hora' || horas === '2 horas') disp += 10;
    else if (horas === '3 horas' || horas === '4 horas') disp += 8;
    else if (horas === 'Mais de 4 horas') disp += 6;
    if (payload.disponibilidade_estavel === 'Sim') disp += 8;
    else if (payload.disponibilidade_estavel === 'Na maioria das semanas') disp += 5;
    if (payload.aumento_futuro === 'Sim, a curto prazo') disp += 5;
    else if (payload.aumento_futuro === 'Sim, mas apenas futuramente') disp += 4;
    else if (payload.aumento_futuro === 'Talvez') disp += 2;
    if (Array.isArray(payload.dias_semana) && payload.dias_semana.length >= 2) disp += 2;
    const disponibilidade = clampScore(disp, 25);

    const areas = Array.isArray(payload.areas_clinicas) ? payload.areas_clinicas.length : 0;
    const pops = Array.isArray(payload.populacoes) ? payload.populacoes.length : 0;
    const modelos = Array.isArray(payload.modelos) ? payload.modelos.length : 0;
    const idiomas = Array.isArray(payload.idiomas) ? payload.idiomas : [];
    let perfil = Math.min(8, areas * 1.2) + Math.min(5, pops * 1.5) + Math.min(6, modelos * 1.5);
    if (idiomas.some((i) => String(i).startsWith('Português'))) perfil += 4;
    perfil += Math.min(2, idiomas.length);
    if (String(payload.abordagem_terapeutica || '').trim().length > 40) perfil += 2;
    const perfilClinico = clampScore(perfil, 25);

    const mot =
        String(payload.abordagem_terapeutica || '') +
        String(payload.tipos_casos || '') +
        String(payload.formacao_complementar || '') +
        String(payload.periodos_entrevista || '');
    let qualidade = Math.min(12, mot.trim().length / 40);
    if (String(payload.linkedin || '').trim()) qualidade += 4;
    if (hasCv) qualidade += 4;
    qualidade = clampScore(qualidade, 20);

    const score = experiencia + disponibilidade + perfilClinico + qualidade;
    let band = 'nao_avanca';
    if (score >= 80) band = 'prioritario';
    else if (score >= 65) band = 'shortlist';

    return {
        eligible: true,
        score,
        band,
        breakdown: {
            experiencia,
            disponibilidade,
            perfil: perfilClinico,
            qualidade
        },
        elimination_reasons: []
    };
}

function formatRecrutamentoPsicologiaEmail(payload, scoring, cvName) {
    const lines = [
        `Candidatura Psicologia — ${payload.nome}`,
        `Score interno: ${scoring.score} · banda: ${scoring.band} · elegível: ${scoring.eligible ? 'sim' : 'não'}`,
        `Breakdown: exp ${scoring.breakdown.experiencia}/30 · disp ${scoring.breakdown.disponibilidade}/25 · perfil ${scoring.breakdown.perfil}/25 · qualidade ${scoring.breakdown.qualidade}/20`,
        scoring.elimination_reasons.length
            ? `Eliminação: ${scoring.elimination_reasons.join(', ')}`
            : '',
        '',
        '── Dados pessoais ──',
        `Nome: ${payload.nome}`,
        `Email: ${payload.email}`,
        `Telefone: ${payload.telefone}`,
        `Localidade: ${payload.localidade || '—'}`,
        `País: ${payload.pais}${payload.pais_especificar ? ` (${payload.pais_especificar})` : ''}`,
        '',
        '── Formação ──',
        `OPP inscrito: ${payload.opp_inscrito}`,
        `Cédula OPP: ${payload.cedula_opp || '—'}`,
        `Grau: ${payload.grau_academico || '—'}`,
        `Formação complementar: ${payload.formacao_complementar || '—'}`,
        '',
        '── Experiência ──',
        `Anos clínica: ${payload.anos_clinica}`,
        `Anos individuais: ${payload.anos_individuais}`,
        `Experiência online: ${payload.experiencia_online}`,
        `Nº consultas online: ${payload.n_consultas_online != null ? payload.n_consultas_online : '—'}`,
        `Áreas: ${(payload.areas_clinicas || []).join(', ') || '—'}`,
        `Populações: ${(payload.populacoes || []).join(', ') || '—'}`,
        `Tipos de casos: ${payload.tipos_casos || '—'}`,
        '',
        '── Disponibilidade ──',
        `Horas iniciais: ${payload.horas_iniciais}`,
        `Dias: ${(payload.dias_semana || []).join(', ') || '—'}`,
        `Horários fixos: ${payload.horarios_fixos}`,
        `Estável: ${payload.disponibilidade_estavel}`,
        `Aumento futuro: ${payload.aumento_futuro}${payload.horas_aumento ? ` (até ${payload.horas_aumento})` : ''}`,
        '',
        '── Condições ──',
        `Aceita condições: ${payload.aceita_condicoes}`,
        '',
        '── Perfil ──',
        `Abordagem: ${payload.abordagem_terapeutica}`,
        `Modelos: ${(payload.modelos || []).join(', ') || '—'}`,
        `Idiomas: ${(payload.idiomas || []).join(', ') || '—'}`,
        `Videoconferência: ${payload.videoconferencia}`,
        '',
        '── Admin / entrevista ──',
        `Atividade: ${payload.atividade_profissional}`,
        `RC profissional: ${payload.rc_profissional}`,
        `Limitações: ${payload.limitacoes || '—'}`,
        `Entrevista: ${payload.entrevista_disponibilidade}`,
        `Períodos: ${payload.periodos_entrevista}`,
        '',
        '── Bolsa ──',
        `Bolsa autorização: ${payload.bolsa_autorizacao}`,
        '',
        `LinkedIn: ${payload.linkedin || '—'}`,
        `CV: ${cvName || '—'}`
    ].filter((line, i, arr) => !(line === '' && arr[i - 1] === ''));
    return lines.join('\n');
}

async function sendRecrutamentoPsicologiaEmail(data) {
    const text = formatRecrutamentoPsicologiaEmail(data.payload, data.scoring, data.cvFilename);
    const scoreLabel = data.scoring.eligible
        ? `${data.scoring.score} · ${data.scoring.band}`
        : `0 · eliminado`;
    console.log(
        '   📋 Recrutamento psicologia:',
        data.payload.email,
        scoreLabel,
        data.scoring.elimination_reasons.join(',') || 'ok'
    );

    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — cannot send recrutamento psicologia');
        return false;
    }

    try {
        const mailOptions = {
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.payload.email,
            subject: `Candidatura Psicologia [${scoreLabel}] ${data.payload.nome}`,
            text,
            html: `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>`
        };
        if (data.cvBuffer && data.cvFilename) {
            mailOptions.attachments = [{
                filename: data.cvFilename,
                content: data.cvBuffer,
                contentType: data.cvMime || 'application/pdf'
            }];
        }
        const info = await deliverEmail(mailOptions);
        console.log('   📩 Recrutamento psicologia sent to:', CONTACT_EMAIL, '| Message ID:', info && info.messageId);

        if (data.payload.email) {
            try {
                const { html: rHtml, text: rText, subject: rSubject } = buildAutoReplyEmail(
                    'careers',
                    data.payload.nome,
                    'pt'
                );
                await deliverEmail({
                    from: EMAIL_FROM,
                    to: data.payload.email,
                    subject: rSubject,
                    text: rText,
                    html: rHtml
                });
                console.log('   📩 Recrutamento auto-reply sent to:', data.payload.email);
            } catch (replyErr) {
                console.error('   ⚠️  Recrutamento auto-reply failed:', replyErr.message);
            }
        }
        return true;
    } catch (err) {
        console.error('   ❌ Recrutamento psicologia email failed:', err.message);
        return false;
    }
}

function sanitizeRecrutamentoPayload(raw) {
    const arr = (v, maxItems, maxLen) =>
        Array.isArray(v)
            ? v.map((x) => String(x).slice(0, maxLen)).filter(Boolean).slice(0, maxItems)
            : [];
    const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

    return {
        nome: str(raw.nome, 120),
        email: str(raw.email, 160).toLowerCase(),
        telefone: str(raw.telefone, 40),
        localidade: str(raw.localidade, 120),
        pais: str(raw.pais, 40),
        pais_especificar: str(raw.pais_especificar, 80),
        opp_inscrito: str(raw.opp_inscrito, 10),
        cedula_opp: str(raw.cedula_opp, 40),
        grau_academico: str(raw.grau_academico, 80),
        formacao_complementar: str(raw.formacao_complementar, 3000),
        anos_clinica: str(raw.anos_clinica, 40),
        anos_individuais: str(raw.anos_individuais, 40),
        experiencia_online: str(raw.experiencia_online, 40),
        n_consultas_online: str(raw.n_consultas_online, 40) || null,
        areas_clinicas: arr(raw.areas_clinicas, 20, 120),
        populacoes: arr(raw.populacoes, 12, 120),
        tipos_casos: str(raw.tipos_casos, 3000),
        horas_iniciais: str(raw.horas_iniciais, 40),
        dias_semana: arr(raw.dias_semana, 7, 20),
        horarios_fixos: str(raw.horarios_fixos, 2000),
        disponibilidade_estavel: str(raw.disponibilidade_estavel, 40),
        aumento_futuro: str(raw.aumento_futuro, 40),
        horas_aumento: str(raw.horas_aumento, 40),
        aceita_condicoes: str(raw.aceita_condicoes, 10),
        abordagem_terapeutica: str(raw.abordagem_terapeutica, 2000),
        modelos: arr(raw.modelos, 12, 120),
        idiomas: arr(raw.idiomas, 10, 80),
        videoconferencia: str(raw.videoconferencia, 10),
        atividade_profissional: str(raw.atividade_profissional, 80),
        rc_profissional: str(raw.rc_profissional, 40),
        limitacoes: str(raw.limitacoes, 2000),
        entrevista_disponibilidade: str(raw.entrevista_disponibilidade, 10),
        periodos_entrevista: str(raw.periodos_entrevista, 1000),
        bolsa_autorizacao: str(raw.bolsa_autorizacao, 10),
        linkedin: str(raw.linkedin, 300)
    };
}

app.post('/api/recrutamento/psicologia', rateLimitRecrutamentoPsicologia, (req, res) => {
    uploadCvPdf.single('cv')(req, res, async (uploadErr) => {
        if (uploadErr instanceof multer.MulterError) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'O CV excede o tamanho máximo de 5MB.' });
            }
            return res.status(400).json({ error: 'Erro ao processar o CV enviado.' });
        }
        if (uploadErr) {
            return res.status(400).json({ error: uploadErr.message || 'Erro no ficheiro CV.' });
        }

        let raw = {};
        try {
            if (typeof req.body?.payload === 'string' && req.body.payload.trim()) {
                raw = JSON.parse(req.body.payload);
            } else if (req.body && typeof req.body === 'object') {
                raw = req.body;
            }
        } catch (parseErr) {
            return res.status(400).json({ error: 'Payload inválido.' });
        }

        const payload = sanitizeRecrutamentoPayload(raw);
        const cv = req.file || null;
        const hasCv = Boolean(cv && cv.buffer && cv.buffer.length);

        if (!payload.nome || !payload.email || !payload.telefone) {
            return res.status(400).json({ error: 'Nome, email e telefone são obrigatórios.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) {
            return res.status(400).json({ error: 'Indique um email válido.' });
        }
        if (payload.opp_inscrito !== 'Sim' && payload.opp_inscrito !== 'Não') {
            return res.status(400).json({ error: 'Indique se está inscrito na OPP.' });
        }
        if (payload.opp_inscrito === 'Sim' && !payload.cedula_opp) {
            return res.status(400).json({ error: 'Cédula OPP obrigatória.' });
        }
        if (payload.aceita_condicoes !== 'Sim' && payload.aceita_condicoes !== 'Não') {
            return res.status(400).json({ error: 'Confirme se aceita as condições.' });
        }
        if (!payload.horarios_fixos) {
            return res.status(400).json({ error: 'Indique os horários fixos semanais.' });
        }
        if (!payload.abordagem_terapeutica) {
            return res.status(400).json({ error: 'Complete o perfil clínico.' });
        }
        if (!hasCv) {
            return res.status(400).json({ error: 'O CV em PDF é obrigatório.' });
        }

        const scoring = scorePsychologistApplication(payload, hasCv);
        const cvFilename = String(cv.originalname || 'cv.pdf').slice(0, 180);
        const applicationId = crypto.randomUUID();
        const status = scoring.eligible === false
            ? 'eliminado'
            : scoring.band === 'prioritario'
                ? 'prioritario'
                : scoring.band === 'shortlist'
                    ? 'shortlist'
                    : 'novo';
        const applicationRecord = {
            id: applicationId,
            name: payload.nome,
            email: payload.email,
            phone: payload.telefone,
            score: scoring.score,
            scoreBand: scoring.band,
            scoreBreakdown: scoring.breakdown,
            eligible: scoring.eligible,
            eliminationReasons: scoring.elimination_reasons,
            payload,
            cvFilename,
            status
        };

        if (usePersistentDb) {
            try {
                await db.insertPsychologistApplication(applicationRecord);
            } catch (dbErr) {
                console.error('POST /api/recrutamento/psicologia DB:', dbErr.message);
            }
        } else {
            psychologistApplicationsStore.unshift({
                id: applicationId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                name: applicationRecord.name,
                email: applicationRecord.email,
                phone: applicationRecord.phone || '',
                localidade: payload.localidade || '',
                pais: payload.pais || '',
                cedulaOpp: payload.cedula_opp || '',
                grauAcademico: payload.grau_academico || '',
                anosClinica: payload.anos_clinica || '',
                anosIndividuais: payload.anos_individuais || '',
                experienciaOnline: payload.experiencia_online || '',
                areasClinicas: Array.isArray(payload.areas_clinicas) ? payload.areas_clinicas : [],
                populacoes: Array.isArray(payload.populacoes) ? payload.populacoes : [],
                idiomas: Array.isArray(payload.idiomas) ? payload.idiomas : [],
                modelos: Array.isArray(payload.modelos) ? payload.modelos : [],
                diasSemana: Array.isArray(payload.dias_semana) ? payload.dias_semana : [],
                horasIniciais: payload.horas_iniciais || '',
                horariosFixos: payload.horarios_fixos || '',
                disponibilidadeEstavel: payload.disponibilidade_estavel || '',
                bolsaAutorizacao: payload.bolsa_autorizacao || '',
                score: scoring.score,
                scoreBand: scoring.band,
                scoreBreakdown: scoring.breakdown || {},
                eligible: scoring.eligible,
                eliminationReasons: scoring.elimination_reasons || [],
                status,
                adminNotes: '',
                cvFilename,
                payload
            });
            if (psychologistApplicationsStore.length > 500) psychologistApplicationsStore.length = 500;
        }

        const sent = await sendRecrutamentoPsicologiaEmail({
            payload,
            scoring,
            cvFilename,
            cvBuffer: cv.buffer,
            cvMime: cv.mimetype || 'application/pdf'
        });

        if (!sent) {
            return res.status(503).json({ error: 'Não foi possível enviar a candidatura de momento. Tente novamente.' });
        }

        emitServerAnalytics(
            'job_application',
            {
                pagePath: '/recrutamento/psicologia',
                props: { funnel: 'job_application', surface: 'recruitment' }
            },
            req
        ).catch(() => {});

        return res.json({
            success: true,
            message: 'Candidatura enviada com sucesso.',
            id: applicationId
        });
    });
});

const INTERVIEW_SLOT_MINUTES = 30;

function pad2Interview(n) {
    return String(n).padStart(2, '0');
}

function isoFromUtcMidnight(d) {
    return `${d.getUTCFullYear()}-${pad2Interview(d.getUTCMonth() + 1)}-${pad2Interview(d.getUTCDate())}`;
}

function lisbonTodayUtcMidnight() {
    const p = partsInTimeZone(Date.now(), 'Europe/Lisbon');
    return new Date(Date.UTC(p.y, p.mo - 1, p.d));
}

function addUtcDays(d, n) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

function interviewHoursForWeekday(weekday) {
    if (weekday === 1 || weekday === 2) return { startMin: 14 * 60, endMin: 19 * 60 };
    return null;
}

function interviewSlotTimesForDateIso(dateIso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
    if (!m) return [];
    const weekday = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
    const hours = interviewHoursForWeekday(weekday);
    if (!hours) return [];
    const { startMin, endMin } = hours;
    const out = [];
    for (let min = startMin; min < endMin; min += INTERVIEW_SLOT_MINUTES) {
        out.push(`${pad2Interview(Math.floor(min / 60))}:${pad2Interview(min % 60)}`);
    }
    return out;
}

function offeredInterviewDateIsos() {
    const today = lisbonTodayUtcMidnight();
    const out = [];
    for (let i = 1; i <= 7; i++) {
        const d = addUtcDays(today, i);
        const weekday = d.getUTCDay();
        if (weekday === 1 || weekday === 2) out.push(isoFromUtcMidnight(d));
    }
    return out;
}

function isOfferedInterviewSlot(dateIso, time) {
    if (!offeredInterviewDateIsos().includes(dateIso)) return false;
    return interviewSlotTimesForDateIso(dateIso).includes(time);
}

async function interviewSlotIsFree(dateIso, time) {
    if (usePersistentDb) {
        const taken = await db.isSlotTakenByOther(dateIso, time, null);
        if (taken) return false;
        const locked = await fetchInvitationLockedTimesForDateIso(dateIso);
        if (locked.has(time)) return false;
        return true;
    }
    return isSlotFreeInMemory(dateIso, time, null);
}

app.get('/api/recrutamento/entrevista/slots', async (req, res) => {
    try {
        const tz = 'Europe/Lisbon';
        const offered = offeredInterviewDateIsos();
        const tomorrowIso = offered[0];
        const days = [];
        for (const dateIso of offered) {
            const times = interviewSlotTimesForDateIso(dateIso);
            const free = [];
            for (const time of times) {
                const startMs = localWallTimeToUtcMs(dateIso, time, tz);
                if (!Number.isFinite(startMs) || startMs <= Date.now()) continue;
                if (!(await interviewSlotIsFree(dateIso, time))) continue;
                free.push(time);
            }
            const pretty = formatInvitationDateLabel(dateIso, 'pt');
            days.push({
                dateIso,
                label: dateIso === tomorrowIso ? `Amanhã · ${pretty}` : pretty,
                slots: free
            });
        }
        res.set({
            'Cache-Control': 'private, no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'CDN-Cache-Control': 'no-store',
            'Cloudflare-CDN-Cache-Control': 'no-store'
        });
        res.json({ days });
    } catch (err) {
        console.error('GET /api/recrutamento/entrevista/slots:', err.message);
        res.status(500).json({ error: 'Não foi possível carregar os horários.' });
    }
});

app.post('/api/recrutamento/entrevista', rateLimitRecrutamentoEntrevista, express.json(), async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').trim().slice(0, 160).toLowerCase();
    const dateIso = String(body.dateIso || '').trim();
    const normTime = normalizeTimeString({ time: String(body.time || '') });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Indique um email válido.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !normTime) {
        return res.status(400).json({ error: 'Escolha uma data e hora disponíveis.' });
    }
    if (!isOfferedInterviewSlot(dateIso, normTime)) {
        return res.status(409).json({ error: 'Esse horário não está disponível. Escolha outro.' });
    }

    const tz = 'Europe/Lisbon';
    const startMs = localWallTimeToUtcMs(dateIso, normTime, tz);
    if (!Number.isFinite(startMs) || startMs <= Date.now()) {
        return res.status(400).json({ error: 'Esse horário já passou. Escolha outro.' });
    }

    const name = (email.split('@')[0] || 'Candidato').slice(0, 120);

    try {
        if (!(await interviewSlotIsFree(dateIso, normTime))) {
            return res.status(409).json({ error: 'Esse horário acabou de ser ocupado. Escolha outro.' });
        }

        const paymentId = `comp_${crypto.randomUUID().replace(/-/g, '')}`;
        const bookingRef = `LC-${paymentId.slice(-8).toUpperCase()}`;
        const dateLabel = formatInvitationDateLabel(dateIso, 'pt');
        const doxyUrl = await resolveDoxyRoomUrl(null);

        const record = {
            bookingRef,
            email,
            service: 'entrevista',
            date: dateIso,
            time: normTime,
            dateIso,
            patientName: name,
            patientPhone: '',
            travellerCount: 1,
            amount: 0,
            currency: 'eur',
            paymentId,
            patientLocale: 'pt',
            cancelled: false,
            rescheduleCount: 0,
            reminderSent: false,
            reminder1hSent: false,
            followupSent: true,
            createdAt: new Date().toISOString()
        };

        if (usePersistentDb) {
            const inserted = await db.insertBookingSafe(record);
            if (!inserted) {
                return res.status(409).json({ error: 'Esse horário acabou de ser ocupado. Escolha outro.' });
            }
        } else {
            bookingsStore.push(record);
        }

        const emailData = {
            bookingRef,
            patientName: name,
            email,
            patientPhone: '',
            roleLabel: '',
            notes: '',
            date: dateLabel,
            dateLabel,
            time: normTime,
            doxyUrl,
            professional: null
        };

        try {
            await sendInterviewConfirmationEmail(emailData);
            await sendInterviewAdminEmail(emailData);
        } catch (mailErr) {
            console.error('   ⚠️  Interview emails failed:', mailErr.message);
        }

        console.log(`   ✅ Interview ${bookingRef} booked for ${email} on ${dateIso} ${normTime}`);
        emitServerAnalytics(
            'interview_booked',
            {
                pagePath: '/recrutamento/entrevista',
                props: { funnel: 'job_application', surface: 'recruitment', service: 'entrevista' },
                bookingRef
            },
            req
        ).catch(() => {});
        return res.json({
            success: true,
            bookingRef,
            dateIso,
            dateLabel,
            time: normTime,
            doxyUrl: doxyUrl || ''
        });
    } catch (err) {
        console.error('POST /api/recrutamento/entrevista:', err.message);
        return res.status(500).json({ error: 'Não foi possível confirmar. Tente novamente.' });
    }
});

// ─── API: Psicologia triagem (PHQ-9 + matching) ───
async function sendTriagemPriorityAlert(data) {
    const lines = [
        '⚠️ PRIORIDADE CLÍNICA — PHQ-9 pergunta 9 ≥ 1',
        '',
        `Nome: ${data.nome || '(ainda não preenchido)'}`,
        `Email: ${data.email || '(ainda não preenchido)'}`,
        `Telefone: ${data.telefone || '(ainda não preenchido)'}`,
        `PHQ-9 Q9: ${data.score}`,
        data.partial ? 'Estado: alerta parcial (durante o questionário)' : 'Estado: triagem completa',
        '',
        'Protocolo: contacto prioritário da equipa clínica. Se o contacto indicar risco imediato, orientar para 112 / SNS 24 / SOS Voz Amiga.'
    ];
    const text = lines.join('\n');
    console.log('   🚨 Triagem priority alert:', text.replace(/\n/g, ' | '));

    if (!isEmailConfigured) return false;
    try {
        await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            subject: `🚨 PRIORIDADE — Triagem Psicologia PHQ-9 Q9=${data.score} — ${data.nome || data.email || 'sem nome'}`,
            text,
            html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>`
        });
        return true;
    } catch (err) {
        console.error('   ❌ Triagem priority alert email failed:', err.message);
        return false;
    }
}

function formatTriagemEmail(data) {
    const phq = data.phq || {};
    const motivos = Array.isArray(data.motivos) ? data.motivos.join(', ') : '';
    const risk = data.riskFlagged || Number(data.phq9) >= 1;
    const lines = [
        risk ? '⚠️ SINALIZAÇÃO PRIORITÁRIA — PHQ-9 pergunta 9 ≥ 1' : 'Questionário de Triagem — Psicologia',
        '',
        '── Dados básicos ──',
        `Nome: ${data.nome}`,
        `Idade: ${data.idade}`,
        `Género: ${data.genero}`,
        `Localização: ${data.localizacao}`,
        `Email: ${data.email}`,
        `Telefone: ${data.telefone}`,
        '',
        '── Motivo ──',
        `Motivos: ${motivos}`,
        `Duração: ${data.duracao}`,
        '',
        '── PHQ-9 ──',
        `Q1–Q9: ${[1,2,3,4,5,6,7,8,9].map((n) => phq['q' + n]).join(', ')}`,
        `Total: ${data.phqTotal}`,
        `Q9 (risco): ${data.phq9}`,
        `Flag prioridade: ${risk ? 'SIM' : 'não'}`,
        '',
        '── Histórico ──',
        `Terapia antes: ${data.terapiaAntes}${data.terapiaUtil ? ` (útil: ${data.terapiaUtil})` : ''}`,
        `Medicação: ${data.medicacao}`,
        `Diagnóstico: ${data.diagnostico}${data.diagnosticoQual ? ` — ${data.diagnosticoQual}` : ''}`,
        '',
        '── Preferências ──',
        `Psicóloga: ${Array.isArray(data.prefPsicologa) ? data.prefPsicologa.join('; ') : data.prefPsicologa}`,
        `Comunicação: ${data.comunicacao}`,
        `Horário vídeo: ${data.horario}`,
        `Encaminhamento médico/nutri: ${data.encaminhamento || '—'}`,
        '',
        '── Consentimentos ──',
        `Sem risco imediato (auto-declaração): ${data.consentimentos?.semRiscoImediato ? 'sim' : 'não'}`,
        `Termos: ${data.consentimentos?.termos ? 'sim' : 'não'}`,
        `Comunicações: ${data.consentimentos?.comunicacoes ? 'sim' : 'não'}`
    ];
    return lines.join('\n');
}

async function sendTriagemSubmission(data) {
    const text = formatTriagemEmail(data);
    const risk = data.riskFlagged || Number(data.phq9) >= 1;
    console.log('   📋 Triagem submission:', data.email, risk ? 'PRIORITY' : 'normal');

    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — triagem logged only');
        return true; // accept submission even without SMTP so UX isn't blocked in dev
    }

    try {
        await deliverEmail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.email,
            subject: `${risk ? '🚨 PRIORIDADE — ' : ''}Triagem Psicologia — ${data.nome}`,
            text,
            html: `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>`
        });

        if (data.email) {
            try {
                await deliverEmail({
                    from: EMAIL_FROM,
                    to: data.email,
                    subject: 'Recebemos a tua triagem — LON Clinic',
                    text: `Olá ${data.nome},\n\nRecebemos o teu questionário de triagem. A equipa clínica vai rever as respostas e contactar-te em breve.\n\nSe estiveres em risco imediato: 112 · SNS 24 808 24 24 24 · SOS Voz Amiga 213 544 545.\n\nLON Clinic`,
                    html: `<p>Olá ${String(data.nome).replace(/</g, '&lt;')},</p><p>Recebemos o teu questionário de triagem. A equipa clínica vai rever as respostas e contactar-te em breve.</p><p>Se estiveres em risco imediato: <strong>112</strong> · SNS 24 <strong>808 24 24 24</strong> · SOS Voz Amiga <strong>213 544 545</strong>.</p><p>LON Clinic</p>`
                });
            } catch (replyErr) {
                console.error('   ⚠️  Triagem auto-reply failed:', replyErr.message);
            }
        }
        return true;
    } catch (err) {
        console.error('   ❌ Triagem email failed:', err.message);
        return false;
    }
}

app.post('/api/triagem-alert', rateLimitTriagemAlert, async (req, res) => {
    const score = Number(req.body?.score);
    if (!Number.isFinite(score) || score < 1 || score > 3) {
        return res.status(400).json({ error: 'Invalid score.' });
    }
    await sendTriagemPriorityAlert({
        score,
        nome: String(req.body?.nome || '').trim().slice(0, 120),
        email: String(req.body?.email || '').trim().slice(0, 160),
        telefone: String(req.body?.telefone || '').trim().slice(0, 40),
        partial: Boolean(req.body?.partial)
    });
    return res.json({ success: true });
});

app.post('/api/triagem', rateLimitTriagem, async (req, res) => {
    const body = req.body || {};
    const nome = String(body.nome || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
    const telefone = String(body.telefone || '').trim().slice(0, 40);
    const idade = Number(body.idade);
    const phq = body.phq && typeof body.phq === 'object' ? body.phq : {};
    const phq9 = Number(phq.q9 ?? body.phq9);
    const riskFlagged = Boolean(body.riskFlagged) || (Number.isFinite(phq9) && phq9 >= 1);

    if (!nome || !email || !telefone) {
        return res.status(400).json({ error: 'Nome, email e telefone são obrigatórios.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido.' });
    }
    if (!Number.isFinite(idade) || idade < 16 || idade > 120) {
        return res.status(400).json({ error: 'Idade inválida.' });
    }
    if (!body.consentimentos?.termos || !body.consentimentos?.semRiscoImediato) {
        return res.status(400).json({ error: 'Consentimentos obrigatórios em falta.' });
    }

    let phqTotal = 0;
    const phqNorm = {};
    for (let i = 1; i <= 9; i++) {
        const v = Number(phq['q' + i]);
        if (!Number.isFinite(v) || v < 0 || v > 3) {
            return res.status(400).json({ error: 'PHQ-9 incompleto.' });
        }
        phqNorm['q' + i] = v;
        phqTotal += v;
    }

    const payload = {
        nome,
        email,
        telefone,
        idade,
        genero: String(body.genero || '').slice(0, 40),
        localizacao: String(body.localizacao || '').slice(0, 120),
        motivos: Array.isArray(body.motivos) ? body.motivos.map((m) => String(m).slice(0, 200)).slice(0, 12) : [],
        duracao: String(body.duracao || '').slice(0, 40),
        phq: phqNorm,
        phqTotal,
        phq9: phqNorm.q9,
        riskFlagged,
        terapiaAntes: String(body.terapiaAntes || '').slice(0, 20),
        terapiaUtil: body.terapiaUtil ? String(body.terapiaUtil).slice(0, 20) : null,
        medicacao: String(body.medicacao || '').slice(0, 40),
        diagnostico: String(body.diagnostico || '').slice(0, 40),
        diagnosticoQual: body.diagnosticoQual ? String(body.diagnosticoQual).slice(0, 200) : null,
        prefPsicologa: Array.isArray(body.prefPsicologa)
            ? body.prefPsicologa.map((p) => String(p).slice(0, 200)).slice(0, 6)
            : [String(body.prefPsicologa || '').slice(0, 200)].filter(Boolean),
        comunicacao: String(body.comunicacao || '').slice(0, 80),
        horario: String(body.horario || '').slice(0, 40),
        encaminhamento: body.encaminhamento ? String(body.encaminhamento).slice(0, 40) : null,
        consentimentos: {
            semRiscoImediato: Boolean(body.consentimentos?.semRiscoImediato),
            termos: Boolean(body.consentimentos?.termos),
            comunicacoes: Boolean(body.consentimentos?.comunicacoes)
        }
    };

    // Full submission email already carries PRIORIDADE in the subject when riskFlagged.
    // Mid-form /api/triagem-alert handles immediate notification during the PHQ-9 step.

    const sent = await sendTriagemSubmission(payload);
    if (!sent) {
        return res.status(503).json({ error: 'Não foi possível enviar de momento. Tenta novamente.' });
    }

    emitServerAnalytics('triage_submitted', { props: { flagged: !!riskFlagged } }, req).catch(() => {});
    return res.json({ success: true, riskFlagged });
});

// ─── API: Burnout quiz (CBI) — save result + email ───
app.post('/api/burnout-quiz', rateLimitBurnoutQuiz, async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const answers = req.body?.answers;
    const scores = req.body?.scores;
    const band = String(req.body?.band || '').trim().slice(0, 24);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido.' });
    }
    if (!Array.isArray(answers) || answers.length !== 18) {
        return res.status(400).json({ error: 'Respostas incompletas.' });
    }
    if (!scores || typeof scores !== 'object') {
        return res.status(400).json({ error: 'Pontuação em falta.' });
    }

    const payload = {
        email,
        answers,
        scores: {
            personal: Number(scores.personal) || 0,
            work: Number(scores.work) || 0,
            body: Number(scores.body) || 0,
            global: Number(scores.global) || 0,
            bodyItems: scores.bodyItems && typeof scores.bodyItems === 'object' ? scores.bodyItems : {}
        },
        band
    };

    if (usePersistentDb) {
        try {
            const id = crypto.randomUUID();
            const claimToken = crypto.randomBytes(24).toString('hex');
            await db.insertQuizAttempt({
                id,
                claimToken,
                quizId: 'burnout-cbi',
                answers: payload.answers,
                result: { scores: payload.scores, band: payload.band },
                score: payload.scores.global
            });
            await db.claimQuizAttempt(id, claimToken, email);
        } catch (dbErr) {
            console.error('POST /api/burnout-quiz DB:', dbErr.message);
        }
    }

    const emailed = await sendBurnoutQuizEmails(payload);
    emitServerAnalytics(
        'quiz_complete',
        { props: { quiz: 'burnout-cbi', band: band || 'unknown' } },
        req
    ).catch(() => {});
    return res.json({
        success: true,
        emailed,
        bookUrl: '/marcar/burnout-mensal?ref=burnout-quiz'
    });
});

app.post('/api/clinical-quiz', rateLimitBurnoutQuiz, async (req, res) => {
    const quizId = String(req.body?.quizId || '').trim();
    const def = clinicalQuizzes.getQuiz(quizId);
    if (!def) {
        return res.status(404).json({ error: 'Questionário desconhecido.' });
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    const firstName = String(req.body?.name || '').trim().slice(0, 80);
    const phone = normalizePtMobile(req.body?.phone);
    const answers = req.body?.answers;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido.' });
    }
    if (def.cluster === 'nutrition' && !phone) {
        return res.status(400).json({ error: 'Indique um telemóvel WhatsApp válido.' });
    }
    const invalid = clinicalQuizzes.validateAnswers(def, answers);
    if (invalid) {
        return res.status(400).json({ error: invalid });
    }

    const scored = clinicalQuizzes.scoreQuiz(def, answers);
    if (!scored) {
        return res.status(400).json({ error: 'Não foi possível calcular o resultado.' });
    }

    const bookUrl = def.booking && def.booking.consultHref
        ? `${def.booking.consultHref}?ref=${encodeURIComponent(def.id + '-quiz')}`
        : '/marcar/clinica-geral';
    const recoverAt = Date.now() + QUIZ_RECOVERY_MS;
    const payload = {
        email,
        firstName,
        phone,
        answers,
        scored,
        band: scored.band ? scored.band.pill : '',
        bookUrl
    };

    rememberQuizLead({
        email,
        firstName,
        phone,
        quizId: def.id,
        bookUrl,
        recoverAt,
        recoveredAt: 0,
        convertedAt: 0
    });

    if (usePersistentDb) {
        try {
            const id = crypto.randomUUID();
            const claimToken = crypto.randomBytes(24).toString('hex');
            await db.insertQuizAttempt({
                id,
                claimToken,
                quizId: def.id,
                answers: payload.answers,
                result: {
                    display: scored.display,
                    displayMax: scored.displayMax,
                    band: payload.band,
                    scales: scored.scales,
                    crisis: scored.crisis,
                    extra: scored.extra,
                    leadName: firstName,
                    leadPhone: phone,
                    bookUrl,
                    recoverAt
                },
                score: scored.display
            });
            await db.claimQuizAttempt(id, claimToken, email);
        } catch (dbErr) {
            console.error('POST /api/clinical-quiz DB:', dbErr.message);
        }
    }

    const emailed = await sendClinicalQuizEmails(def, payload);
    emitServerAnalytics(
        'quiz_complete',
        { props: { quiz: def.id, band: payload.band || 'unknown', crisis: !!scored.crisis, lead: true } },
        req
    ).catch(() => {});
    return res.json({
        success: true,
        emailed,
        bookUrl
    });
});

app.post('/api/nutricao-avaliacao', rateLimitBurnoutQuiz, async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 160);
    const phone = String(req.body?.phone || '').trim().slice(0, 40);
    const goal = String(req.body?.goal || '').trim();
    const diets = String(req.body?.diets || '').trim();
    const eating = String(req.body?.eating || '').trim();
    const labs = String(req.body?.labs || '').trim();
    const age = Number(req.body?.age);
    const height = Number(req.body?.height);
    const weight = Number(req.body?.weight);
    const desiredWeight = Number(req.body?.desiredWeight);

    const allowedGoal = { lose: 1, markers: 1, energy: 1, all: 1 };
    const allowedDiets = { first: 1, few: 1, yoyo: 1 };
    const allowedEating = { rare: 1, some: 1, frequent: 1 };
    const allowedLabs = { recent: 1, year: 1, unknown: 1 };

    if (name.length < 2) {
        return res.status(400).json({ error: 'Nome inválido.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido.' });
    }
    if (String(phone).replace(/\D/g, '').length < 9) {
        return res.status(400).json({ error: 'Telefone inválido.' });
    }
    if (!allowedGoal[goal] || !allowedDiets[diets] || !allowedEating[eating] || !allowedLabs[labs]) {
        return res.status(400).json({ error: 'Respostas incompletas.' });
    }
    if (!Number.isFinite(age) || age < 16 || age > 90) {
        return res.status(400).json({ error: 'Idade inválida.' });
    }
    if (!Number.isFinite(height) || height < 120 || height > 230) {
        return res.status(400).json({ error: 'Altura inválida.' });
    }
    if (!Number.isFinite(weight) || weight < 30 || weight > 250) {
        return res.status(400).json({ error: 'Peso inválido.' });
    }
    if (!Number.isFinite(desiredWeight) || desiredWeight < 30 || desiredWeight > 250) {
        return res.status(400).json({ error: 'Peso desejado inválido.' });
    }

    const metres = height / 100;
    const imc = metres ? Math.round((weight / (metres * metres)) * 10) / 10 : null;
    const plan = eating === 'frequent' ? 'completo' : 'nutricao';
    const payload = {
        name,
        email,
        phone,
        goal,
        diets,
        eating,
        labs,
        age,
        height,
        weight,
        desiredWeight,
        imc,
        plan
    };

    if (usePersistentDb) {
        try {
            const id = crypto.randomUUID();
            const claimToken = crypto.randomBytes(24).toString('hex');
            await db.insertQuizAttempt({
                id,
                claimToken,
                quizId: 'nutricao-avaliacao',
                answers: {
                    goal,
                    diets,
                    eating,
                    labs,
                    age,
                    height,
                    weight,
                    desiredWeight
                },
                result: {
                    plan,
                    imc,
                    leadName: name,
                    leadPhone: phone,
                    profile: nutricaoNurture.planMeta(plan).profile,
                    nurtureStep: 0,
                    convertedAt: 0
                },
                score: eating === 'frequent' ? 2 : eating === 'some' ? 1 : 0
            });
            await db.claimQuizAttempt(id, claimToken, email);
        } catch (dbErr) {
            console.error('POST /api/nutricao-avaliacao DB:', dbErr.message);
        }
    }

    enrollNutricaoNurture(payload);
    const emailed = await sendNutricaoAvaliacaoEmails(payload);
    emitServerAnalytics(
        'quiz_complete',
        { props: { quiz: 'nutricao-avaliacao', plan } },
        req
    ).catch(() => {});
    return res.json({
        success: true,
        emailed,
        plan,
        bookUrl: plan === 'completo'
            ? '/marcar/nutricao-completo?ref=avaliacao'
            : '/marcar/nutricao-programa?ref=avaliacao'
    });
});

// ─── API: Contact form submission ───
app.post('/api/contact', rateLimitContact, async (req, res) => {
    const name = (req.body?.name || '').trim();
    const email = (req.body?.email || '').trim();
    const phone = (req.body?.phone || '').trim();
    const message = (req.body?.message || '').trim();
    const locale = ['en', 'pt', 'es'].includes(req.body?.locale) ? req.body.locale : 'en';

    if (!name || !email || !phone || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const payload = {
        name: name.slice(0, 120),
        email: email.slice(0, 160),
        phone: phone.slice(0, 40),
        message: message.slice(0, 4000),
        locale
    };

    const sent = await sendContactInquiryEmail(payload);
    if (!sent) {
        return res.status(503).json({ error: 'Unable to send your message right now. Please try again shortly.' });
    }

    emitServerAnalytics('contact_submitted', { props: { locale } }, req).catch(() => {});
    return res.json({ success: true, message: 'Message sent successfully.' });
});

// ─── API: Complaint form submission ───
app.post('/api/reclamacoes', async (req, res) => {
    const name = (req.body?.name || '').trim();
    const citizenCard = (req.body?.citizenCard || '').trim();
    const phone = (req.body?.phone || '').trim();
    const email = (req.body?.email || '').trim();
    const message = (req.body?.message || '').trim();
    const locale = ['en', 'pt', 'es'].includes(req.body?.locale) ? req.body.locale : 'pt';

    if (!name || !citizenCard || !phone || !email || !message) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Indique um email válido.' });
    }

    const payload = {
        name: name.slice(0, 120),
        citizenCard: citizenCard.slice(0, 40),
        phone: phone.slice(0, 40),
        email: email.slice(0, 160),
        message: message.slice(0, 4000),
        locale
    };

    const sent = await sendComplaintEmail(payload);
    if (!sent) {
        return res.status(503).json({ error: 'Não foi possível enviar a sua reclamação de momento. Tente novamente.' });
    }

    return res.json({
        success: true,
        message: 'Reclamação enviada com sucesso. Responderemos no prazo máximo de 5 dias úteis.'
    });
});

function normalizeReviewLocale(raw) {
    const l = String(raw || 'pt').toLowerCase().slice(0, 2);
    return l === 'en' || l === 'es' ? l : 'pt';
}

function publicAuthorLabel(authorName, locale) {
    const name = String(authorName || '').trim();
    if (name) return name.slice(0, 80);
    if (locale === 'en') return 'Verified patient';
    if (locale === 'es') return 'Paciente verificada';
    return 'Paciente verificada';
}

async function listPublicReviewsPayload(limit) {
    if (usePersistentDb) {
        const rows = await db.listPublicReviews(limit);
        return rows.map((r) => ({
            ...r,
            authorName: publicAuthorLabel(r.authorName, r.locale)
        }));
    }
    return reviewsStore
        .filter((r) => r.isPublic)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit)
        .map((r) => ({
            id: r.id,
            authorName: publicAuthorLabel(r.authorName, r.locale),
            rating: r.rating,
            body: r.body,
            locale: r.locale,
            createdAt: r.createdAt
        }));
}

// ─── API: Public patient reviews ───
app.get('/api/reviews/public', async (req, res) => {
    try {
        const reviews = await listPublicReviewsPayload(50);
        res.json({ reviews });
    } catch (err) {
        console.error('GET /api/reviews/public:', err.message);
        res.status(500).json({ error: 'Failed to load reviews' });
    }
});

app.post('/api/reviews', rateLimitReviews, express.json(), async (req, res) => {
    try {
        const body = String(req.body?.body || req.body?.message || '').trim();
        const authorName = String(req.body?.authorName || req.body?.name || '').trim();
        const email = String(req.body?.email || '').trim();
        const isPublic = req.body?.isPublic === true || req.body?.isPublic === 'true';
        const locale = normalizeReviewLocale(req.body?.locale);
        const rating = Math.min(5, Math.max(1, parseInt(req.body?.rating, 10) || 5));

        if (!body || body.length < 10) {
            return res.status(400).json({
                error: locale === 'en'
                    ? 'Please write at least 10 characters in your review.'
                    : locale === 'es'
                      ? 'Escriba al menos 10 caracteres en su opinión.'
                      : 'Escreva pelo menos 10 caracteres na sua opinião.'
            });
        }
        if (body.length > 2000) {
            return res.status(400).json({ error: 'Review is too long (max 2000 characters).' });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address.' });
        }

        const record = {
            id: crypto.randomUUID(),
            authorName: authorName.slice(0, 80) || null,
            email: email.slice(0, 160) || null,
            rating,
            body: body.slice(0, 2000),
            isPublic,
            locale
        };

        let saved;
        if (usePersistentDb) {
            saved = await db.insertReview(record);
        } else {
            saved = {
                ...record,
                authorName: record.authorName || '',
                email: record.email || '',
                createdAt: new Date().toISOString()
            };
            reviewsStore.unshift(saved);
        }

        const publicReview = saved.isPublic
            ? {
                id: saved.id,
                authorName: publicAuthorLabel(saved.authorName, saved.locale),
                rating: saved.rating,
                body: saved.body,
                locale: saved.locale,
                createdAt: saved.createdAt
            }
            : null;

        const messages = {
            pt: isPublic
                ? 'Obrigada! A sua opinião foi publicada e já está visível para outros visitantes.'
                : 'Obrigada! A sua opinião foi recebida de forma privada — só a equipa clínica a verá.',
            en: isPublic
                ? 'Thank you! Your review is now visible to other visitors.'
                : 'Thank you! Your review was received privately — only our clinical team will see it.',
            es: isPublic
                ? '¡Gracias! Su opinión ya es visible para otros visitantes.'
                : '¡Gracias! Su opinión se recibió de forma privada — solo la verá nuestro equipo clínico.'
        };

        res.json({
            success: true,
            message: messages[locale] || messages.pt,
            isPublic: saved.isPublic,
            review: publicReview
        });
    } catch (err) {
        console.error('POST /api/reviews:', err.message);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// ─── API: Admin — list all reviews (public + private) ───
app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
    try {
        if (usePersistentDb) {
            const reviews = await db.listAllReviews(100);
            return res.json({ reviews });
        }
        res.json({ reviews: reviewsStore.slice(0, 100) });
    } catch (err) {
        console.error('GET /api/admin/reviews:', err.message);
        res.status(500).json({ error: 'Failed to load reviews' });
    }
});

// ─── API: Admin — psychologist applications (recrutamento) ───
async function findPsychologistApplicationInternal(id) {
    const key = String(id || '');
    if (!key) return null;
    if (usePersistentDb) return db.findPsychologistApplicationById(key);
    return psychologistApplicationsStore.find((a) => a.id === key) || null;
}

app.get('/api/admin/psychologists', requireAdmin, async (req, res) => {
    try {
        const status = req.query.status ? String(req.query.status) : '';
        const band = req.query.band ? String(req.query.band) : '';
        const q = req.query.q ? String(req.query.q) : '';
        let list;
        if (usePersistentDb) {
            list = await db.listPsychologistApplications({
                status: status || undefined,
                band: band || undefined,
                q: q || undefined,
                limit: 200
            });
        } else {
            list = psychologistApplicationsStore.slice();
            if (status) list = list.filter((a) => a.status === status);
            if (band) list = list.filter((a) => a.scoreBand === band);
            if (q.trim()) {
                const needle = q.trim().toLowerCase();
                list = list.filter(
                    (a) =>
                        String(a.name || '').toLowerCase().includes(needle) ||
                        String(a.email || '').toLowerCase().includes(needle) ||
                        String(a.cedulaOpp || '').toLowerCase().includes(needle)
                );
            }
            list = list.slice(0, 200);
        }
        const applications = [];
        for (const app of list || []) {
            applications.push(await enrichPsychologistApplication(app));
        }
        res.json({ applications });
    } catch (err) {
        console.error('GET /api/admin/psychologists:', err.message);
        res.status(500).json({ error: 'Failed to load psychologist applications' });
    }
});

app.post('/api/admin/psychologists/logins', requireAdmin, async (req, res) => {
    try {
        const skip = new Set(['rejeitado', 'eliminado']);
        let list;
        if (usePersistentDb) {
            list = await db.listPsychologistApplications({ limit: 200 });
        } else {
            list = psychologistApplicationsStore.slice(0, 200);
        }
        const created = [];
        const linked = [];
        for (const app of list || []) {
            if (skip.has(String(app.status || ''))) continue;
            const already = await linkedProfessionalForApplication(app);
            if (already) {
                await setApplicationProfessionalIdInternal(app.id, already.id);
                linked.push({
                    id: app.id,
                    name: app.name,
                    professional: publicProfessional(already)
                });
                continue;
            }
            const result = await assignLoginToPsychologistApplication(app, { resetPassword: false });
            created.push({
                id: app.id,
                name: app.name,
                professional: publicProfessional(result.professional),
                generatedPassword: result.generatedPassword
            });
        }
        res.json({ created, linked });
    } catch (err) {
        console.error('POST /api/admin/psychologists/logins:', err.message);
        res.status(httpErrorStatus(err, 500)).json({ error: err.message || 'Failed to assign logins' });
    }
});

app.post('/api/admin/psychologists/:id/login', requireAdmin, express.json(), async (req, res) => {
    try {
        const application = await findPsychologistApplicationInternal(req.params.id);
        if (!application) return res.status(404).json({ error: 'Not found' });
        const resetPassword = req.body && req.body.resetPassword === true;
        const already = await linkedProfessionalForApplication(application);
        if (already && !resetPassword) {
            await setApplicationProfessionalIdInternal(application.id, already.id);
            return res.json({
                application: await enrichPsychologistApplication({
                    ...application,
                    professionalId: already.id
                }),
                professional: publicProfessional(already),
                created: false
            });
        }
        const result = await assignLoginToPsychologistApplication(application, {
            resetPassword: resetPassword || !already
        });
        res.status(result.created ? 201 : 200).json({
            application: await enrichPsychologistApplication({
                ...application,
                professionalId: result.professional.id
            }),
            professional: publicProfessional(result.professional),
            generatedPassword: result.generatedPassword,
            created: result.created
        });
    } catch (err) {
        console.error('POST /api/admin/psychologists/:id/login:', err.message);
        res.status(httpErrorStatus(err, 500)).json({ error: err.message || 'Failed to assign login' });
    }
});

app.get('/api/admin/psychologists/:id', requireAdmin, async (req, res) => {
    try {
        const application = await findPsychologistApplicationInternal(req.params.id);
        if (!application) return res.status(404).json({ error: 'Not found' });
        res.json({ application: await enrichPsychologistApplication(application) });
    } catch (err) {
        console.error('GET /api/admin/psychologists/:id:', err.message);
        res.status(500).json({ error: 'Failed to load application' });
    }
});

app.patch('/api/admin/psychologists/:id', requireAdmin, express.json(), async (req, res) => {
    try {
        const id = String(req.params.id || '');
        const status = req.body?.status != null ? String(req.body.status) : undefined;
        const adminNotes = req.body?.adminNotes != null ? String(req.body.adminNotes) : undefined;
        if (usePersistentDb) {
            const application = await db.updatePsychologistApplication(id, { status, adminNotes });
            if (!application) return res.status(404).json({ error: 'Not found' });
            return res.json({ application: await enrichPsychologistApplication(application) });
        }
        const idx = psychologistApplicationsStore.findIndex((a) => a.id === id);
        if (idx < 0) return res.status(404).json({ error: 'Not found' });
        if (status !== undefined) psychologistApplicationsStore[idx].status = status;
        if (adminNotes !== undefined) psychologistApplicationsStore[idx].adminNotes = adminNotes.slice(0, 4000);
        psychologistApplicationsStore[idx].updatedAt = new Date().toISOString();
        res.json({ application: await enrichPsychologistApplication(psychologistApplicationsStore[idx]) });
    } catch (err) {
        console.error('PATCH /api/admin/psychologists/:id:', err.message);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

app.get('/api/wellness', (req, res) => {
    const list = wellness.filterList({
        q: req.query.q,
        country: req.query.country,
        city: req.query.city,
        category: req.query.category,
        duration: req.query.duration,
        setting: req.query.setting
    });
    res.json({ experiences: list, meta: wellness.meta() });
});

app.get('/api/wellness/:slug', (req, res) => {
    const item = wellness.getBySlug(req.params.slug);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ experience: item, related: wellness.relatedFor(item.slug, 3) });
});

app.get('/api/diretorio/meta', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.json(producers.meta());
});

app.post('/api/diretorio/candidatar', rateLimitProducerApply, (req, res) => {
    uploadProducerImages.fields([
        { name: 'photos', maxCount: 8 },
        { name: 'certImage', maxCount: 1 }
    ])(req, res, async (uploadErr) => {
        if (uploadErr instanceof multer.MulterError) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Cada imagem pode ter no máximo 5MB.' });
            }
            if (uploadErr.code === 'LIMIT_FILE_COUNT' || uploadErr.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ error: 'Demasiadas imagens. Máximo 8 fotos e 1 certificado.' });
            }
            return res.status(400).json({ error: 'Erro ao processar as imagens.' });
        }
        if (uploadErr) {
            return res.status(400).json({ error: uploadErr.message || 'Erro no ficheiro enviado.' });
        }

        let raw = {};
        try {
            if (typeof req.body?.payload === 'string' && req.body.payload.trim()) {
                raw = JSON.parse(req.body.payload);
            } else if (req.body && typeof req.body === 'object') {
                raw = req.body;
            }
        } catch (parseErr) {
            return res.status(400).json({ error: 'Payload inválido.' });
        }

        const payload = producers.sanitizePayload(raw);
        if (!payload.name) {
            return res.status(400).json({ error: 'O nome do produtor é obrigatório.' });
        }
        if (!payload.shortDescription) {
            return res.status(400).json({ error: 'Indique uma descrição curta.' });
        }
        if (!payload.categories.length) {
            return res.status(400).json({ error: 'Escolha pelo menos uma categoria.' });
        }
        if (!payload.district) {
            return res.status(400).json({ error: 'Indique o distrito.' });
        }
        if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) {
            return res.status(400).json({ error: 'Indique um email válido.' });
        }
        if (!payload.salesMethods.length) {
            return res.status(400).json({ error: 'Escolha pelo menos um método de venda.' });
        }

        const id = crypto.randomUUID();
        let photos = [];
        let certImage = null;
        try {
            const saved = await saveProducerUploads(id, req.files || {});
            photos = saved.photos;
            certImage = saved.certImage;
        } catch (fileErr) {
            console.error('POST /api/diretorio/candidatar files:', fileErr.message);
            return res.status(500).json({ error: 'Não foi possível guardar as imagens.' });
        }

        const slug = await allocateProducerSlug(payload.name);
        const record = {
            id,
            slug,
            name: payload.name,
            shortDescription: payload.shortDescription,
            longDescription: payload.longDescription,
            categories: payload.categories,
            district: payload.district,
            municipality: payload.municipality,
            address: payload.address,
            lat: payload.lat,
            lng: payload.lng,
            certBody: payload.certBody,
            certNumber: payload.certNumber,
            certImage,
            website: payload.website,
            email: payload.email,
            phone: payload.phone,
            social: payload.social,
            photos,
            salesMethods: payload.salesMethods,
            status: 'pendente',
            adminNotes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            if (usePersistentDb) {
                await db.insertProducer(record);
            } else {
                producersStore.unshift(record);
                if (producersStore.length > 500) producersStore.length = 500;
            }
        } catch (dbErr) {
            console.error('POST /api/diretorio/candidatar DB:', dbErr.message);
            return res.status(500).json({ error: 'Não foi possível guardar a candidatura.' });
        }

        if (isEmailConfigured) {
            const cats = producers.categoryLabels(payload.categories).join(', ');
            const sales = producers.salesLabels(payload.salesMethods).join(', ');
            sendClinicOpsEmail(
                `Diretório: nova candidatura — ${payload.name}`,
                `<p>Nova candidatura de produtor biológico (pendente).</p>
                 <p><strong>${escapeHtml(payload.name)}</strong><br>${escapeHtml(payload.district)}${payload.municipality ? ' · ' + escapeHtml(payload.municipality) : ''}</p>
                 <p>Categorias: ${escapeHtml(cats)}<br>Venda: ${escapeHtml(sales)}<br>Email: ${escapeHtml(payload.email)}</p>
                 <p><a href="${escapeHtml(getBaseUrl(req))}/admin">Abrir painel de moderação</a></p>`,
                `Nova candidatura: ${payload.name}\n${payload.district}\n${payload.email}\nModerar em ${getBaseUrl(req)}/admin`
            ).catch(() => {});
        }

        res.json({ success: true, message: 'Candidatura recebida. Entrará no diretório após aprovação.' });
    });
});

app.get('/api/admin/producers', requireAdmin, async (req, res) => {
    try {
        const status = req.query.status ? String(req.query.status) : '';
        const category = req.query.category ? String(req.query.category) : '';
        const district = req.query.district ? String(req.query.district) : '';
        const salesMethod = req.query.sales ? String(req.query.sales) : '';
        const q = req.query.q ? String(req.query.q) : '';
        const filters = {
            status: status || undefined,
            category: category && producers.CATEGORY_IDS.has(category) ? category : undefined,
            district: district && producers.DISTRICT_SET.has(district) ? district : undefined,
            salesMethod: salesMethod && producers.SALES_IDS.has(salesMethod) ? salesMethod : undefined,
            q: q || undefined,
            limit: 400
        };
        const list = usePersistentDb
            ? await db.listProducers(filters)
            : filterProducersMemory(filters);
        res.json({ producers: list, meta: producers.meta() });
    } catch (err) {
        console.error('GET /api/admin/producers:', err.message);
        res.status(500).json({ error: 'Failed to load producers' });
    }
});

app.get('/api/admin/producers/slug/:slug', requireAdmin, async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim();
        if (!slug) return res.status(400).json({ error: 'Slug required' });
        const producer = await getProducerBySlugInternal(slug);
        if (!producer) return res.status(404).json({ error: 'Not found' });
        res.json({ producer });
    } catch (err) {
        console.error('GET /api/admin/producers/slug:', err.message);
        res.status(500).json({ error: 'Failed to load producer' });
    }
});

app.get('/api/admin/producers/:id/files/:filename', requireAdmin, async (req, res) => {
    try {
        const id = String(req.params.id || '');
        const filename = String(req.params.filename || '');
        const producer = await getProducerByIdInternal(id);
        if (!producer) return res.status(404).json({ error: 'Not found' });
        const allowed = new Set(
            (producer.photos || []).map((p) => p.filename).concat(producer.certImage ? [producer.certImage] : [])
        );
        if (!allowed.has(filename)) return res.status(404).json({ error: 'Not found' });
        const filePath = producerFilePath(id, filename);
        if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        res.sendFile(filePath);
    } catch (err) {
        console.error('GET /api/admin/producers/:id/files:', err.message);
        res.status(500).json({ error: 'Failed to load file' });
    }
});

app.get('/api/admin/producers/:id', requireAdmin, async (req, res) => {
    try {
        const id = String(req.params.id || '');
        const producer = await getProducerByIdInternal(id);
        if (!producer) return res.status(404).json({ error: 'Not found' });
        res.json({ producer });
    } catch (err) {
        console.error('GET /api/admin/producers/:id:', err.message);
        res.status(500).json({ error: 'Failed to load producer' });
    }
});

app.patch('/api/admin/producers/:id', requireAdmin, express.json(), async (req, res) => {
    try {
        const id = String(req.params.id || '');
        const status = req.body?.status != null ? String(req.body.status) : undefined;
        const adminNotes = req.body?.adminNotes != null ? String(req.body.adminNotes) : undefined;
        if (status && !producers.STATUSES.has(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        if (usePersistentDb) {
            const producer = await db.updateProducer(id, { status, adminNotes });
            if (!producer) return res.status(404).json({ error: 'Not found' });
            return res.json({ producer });
        }
        const idx = producersStore.findIndex((p) => p.id === id);
        if (idx < 0) return res.status(404).json({ error: 'Not found' });
        if (status !== undefined) producersStore[idx].status = status;
        if (adminNotes !== undefined) producersStore[idx].adminNotes = String(adminNotes).slice(0, 4000);
        producersStore[idx].updatedAt = new Date().toISOString();
        res.json({ producer: producersStore[idx] });
    } catch (err) {
        console.error('PATCH /api/admin/producers/:id:', err.message);
        res.status(500).json({ error: 'Failed to update producer' });
    }
});

// ─── API: Create Checkout Session ───
app.post('/api/create-checkout-session', rateLimitCheckout, async (req, res) => {
    if (!isStripeConfigured) {
        console.error('❌ Stripe configuration check failed:');
        console.error('   STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
        console.error('   STRIPE_SECRET_KEY value:', process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.substring(0, 10)}...` : 'MISSING');
        console.error('   isStripeConfigured:', isStripeConfigured);
        return res.status(500).json({ error: 'Stripe is not configured. Add your STRIPE_SECRET_KEY to the .env file.' });
    }
    try {
        let {
            service,
            serviceLabel,
            hasInsurance,
            date,
            time,
            patientName,
            patientEmail,
            patientPhone,
            passengers,   // array of { firstName, lastName, dob, nhs, country, concerns, medications, allergies }
            travelDest,
            travelDates,
            locale,
            dateIso,
            discountCode,
            holdId: holdIdRaw
        } = req.body;

        // Validate required fields (amount is computed server-side; never trust client price)
        if (!service || !patientEmail || !patientName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pricing = computeCheckoutTotalCents({
            service,
            passengers,
            hasInsurance: !!hasInsurance,
            discountCode: discountCode || null
        });
        if (!pricing.ok) {
            return res.status(400).json({ error: pricing.error });
        }
        service = bookingServiceTag(service);
        const priceAmount = pricing.totalCents;
        const count = Array.isArray(passengers) ? passengers.length : 0;
        const isMultiPassenger = count > 1;

        // Build description
        let description = `Online video consultation — ${date} at ${time}`;
        if (isMultiPassenger) {
            description = `${count} travellers — ${date} at ${time}`;
        }

        // Build line item name
        let itemName = serviceLabel;
        if (isMultiPassenger) {
            itemName = `${serviceLabel} (${count} travellers)`;
        }

        // Build metadata — Stripe limits keys/values to 500 chars, 50 keys max
        const metadata = {
            service,
            date,
            time,
            date_iso: (dateIso && String(dateIso).trim()) || '',
            contact_email: patientEmail,
            contact_phone: patientPhone || '',
            traveller_count: String(count),
            has_insurance: hasInsurance ? 'medicare' : 'none',
            travel_destinations: (travelDest || '').substring(0, 500),
            travel_dates: travelDates || '',
            locale: normalizePatientLocale(locale),
            service_label: (serviceLabel || '').substring(0, 500)
        };
        const analyticsIds = anonymousIds(req);
        if (analyticsIds.visitorId) metadata.lon_vid = String(analyticsIds.visitorId).slice(0, 64);
        if (analyticsIds.sessionId) metadata.lon_sid = String(analyticsIds.sessionId).slice(0, 64);

        // Store each passenger's core details in metadata (up to 4)
        if (Array.isArray(passengers)) {
            passengers.slice(0, 4).forEach((p, i) => {
                const n = i + 1;
                metadata[`p${n}_name`] = `${p.firstName} ${p.lastName}`.substring(0, 500);
                metadata[`p${n}_dob`] = p.dob || '';
                metadata[`p${n}_nhs`] = p.nhs || '';
                metadata[`p${n}_country`] = p.country || '';
                metadata[`p${n}_concerns`] = (p.concerns || '').substring(0, 500);
                metadata[`p${n}_medications`] = (p.medications || '').substring(0, 500);
                metadata[`p${n}_allergies`] = (p.allergies || '').substring(0, 500);
            });
        }

        const isoCheckout = (dateIso && String(dateIso).trim()) || '';
        const normTimeCheckout = normalizeTimeString({ time: time || '' });
        let checkoutHold = null;
        if (isoCheckout && /^\d{4}-\d{2}-\d{2}$/.test(isoCheckout) && normTimeCheckout) {
            const holderToken = readCookieValue(req, 'lon_hold');
            if (holdIdRaw) {
                checkoutHold = await findHoldById(holdIdRaw);
                if (
                    checkoutHold &&
                    holderToken &&
                    checkoutHold.holderToken !== holderToken
                ) {
                    checkoutHold = null;
                }
            }
            const holdMatches = !!(
                checkoutHold &&
                checkoutHold.dateIso === isoCheckout &&
                checkoutHold.time === normTimeCheckout &&
                checkoutHold.expiresAt > Date.now()
            );
            const allowed = await getBookableSlotsForDateIso(
                isoCheckout,
                null,
                null,
                false,
                holdMatches ? checkoutHold.id : null
            );
            if (!allowed.includes(normTimeCheckout)) {
                return res.status(400).json({ error: 'That time slot is not available' });
            }
        }

        // Create Stripe Checkout Session
        console.log('Creating Stripe checkout session...');
        console.log('   Service:', service);
        console.log('   Amount:', priceAmount, 'cents');
        console.log('   Email:', patientEmail);

        const isSubscription = isStripeSubscriptionService(service);
        const productDescription = isSubscription
            ? `${description} · Subscrição mensal · 4 consultas (54€/sessão, −10%) · cancelável`
            : service === 'burnout_programa'
              ? `${description} · Programa 8 sessões com relatório final e CBI antes/depois`
              : service === 'nutricao_programa'
                ? `${description} · Adesão mês 1 do programa 6 meses (depois 75 €/mês · fidelização 3 meses)`
                : service === 'nutricao_completo'
                  ? `${description} · Adesão mês 1 (depois 187 €/mês · total 1 162 € · fidelização 3 meses)`
                  : service === 'nutricao_completo_reforcado'
                    ? `${description} · Adesão mês 1 entrada reforçada (depois 168 €/mês · total 1 162 € · fidelização 3 meses)`
                    : description;

        const lineItem = {
            price_data: {
                currency: 'eur',
                product_data: {
                    name: itemName,
                    description: productDescription,
                    images: []
                },
                unit_amount: priceAmount,
                ...(isSubscription ? { recurring: { interval: 'month' } } : {})
            },
            quantity: 1
        };

        const sessionParams = {
            payment_method_types: ['card'],
            mode: isSubscription ? 'subscription' : 'payment',
            customer_email: patientEmail,
            line_items: [lineItem],
            metadata,
            success_url: `${getBaseUrl(req)}/book-consultation?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${getBaseUrl(req)}/book-consultation?cancelled=true`,
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60)
        };

        if (isSubscription) {
            sessionParams.subscription_data = { metadata: { service, service_label: (serviceLabel || '').substring(0, 500) } };
        } else {
            sessionParams.customer_creation = 'always';
            sessionParams.payment_intent_data = { receipt_email: patientEmail };
        }

        const session = await createStripeCheckoutSession(sessionParams);

        markQuizLeadCheckoutStarted(patientEmail).catch(() => {});

        if (checkoutHold) {
            const extended = Date.now() + SLOT_HOLD_CHECKOUT_MS;
            checkoutHold.expiresAt = extended;
            slotHoldsById.set(checkoutHold.id, checkoutHold);
            if (usePersistentDb) {
                try { await db.updateSlotHoldExpiry(checkoutHold.id, extended); } catch (err) {
                    console.error('extend hold after checkout:', err.message);
                }
            }
        }

        console.log('✅ Checkout session created:', session.id);
        emitServerAnalytics(
            'checkout_created',
            { props: { service: bookingServiceTag(service), funnel: 'patient_booking' }, revenueCents: priceAmount, currency: 'eur' },
            req
        ).catch(() => {});
        res.json({ sessionId: session.id, url: session.url });

    } catch (err) {
        console.error('❌ Error creating checkout session:');
        console.error('   Error type:', err.type);
        console.error('   Error message:', err.message);
        console.error('   Error code:', err.code);
        console.error('   Full error:', JSON.stringify(err, null, 2));
        res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
    }
});

// ─── API: Retrieve session details (for confirmation page) ───
app.get('/api/session/:sessionId', rateLimitSessionRetrieve, async (req, res) => {
    if (!isStripeConfigured) {
        return res.status(500).json({ error: 'Stripe is not configured.' });
    }
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        await finalizePaidCheckoutSession(session, '[session-api] ');
        markQuizLeadConverted(
            session.customer_email ||
            (session.customer_details && session.customer_details.email) ||
            (session.metadata && session.metadata.contact_email) ||
            ''
        ).catch(() => {});

        const travellerCount = parseInt(session.metadata?.traveller_count, 10) || 1;
        const piId = paymentIntentIdFromSession(session);
        const bookingRefShort = piId.length >= 8 ? piId.slice(-8).toUpperCase() : (piId || Date.now().toString(36)).toUpperCase();
        const stored = await getBookingByPaymentId(piId);
        const meta = session.metadata || {};

        const emailNorm = (
            session.customer_details?.email ||
            session.customer_email ||
            meta.contact_email ||
            ''
        ).toLowerCase().trim();
        const stripeCustId = stripeCustomerIdFromSession(session);
        let isNewCustomer = false;
        if (piId && (emailNorm || stripeCustId)) {
            const priorOtherBookings = await countPriorBookingsExcludingPayment(
                piId,
                emailNorm,
                stripeCustId
            );
            isNewCustomer = priorOtherBookings === 0;
        }

        res.json({
            service: meta.service,
            date: meta.date,
            time: meta.time,
            travellerCount,
            amount: session.amount_total,
            currency: session.currency,
            bookingRef: (stored && stored.bookingRef) || ('LC-' + bookingRefShort),
            email: emailNorm,
            isNewCustomer,
            intakeToken: (stored && stored.intakeToken) || '',
            intakeCompleted: !!(stored && stored.intakeCompletedAt),
            intakePrefill: {
                concerns: meta.p1_concerns || '',
                medications: meta.p1_medications || '',
                allergies: meta.p1_allergies || '',
                dob: meta.p1_dob || '',
                nhs: meta.p1_nhs || '',
                country: meta.p1_country || '',
                travelDest: meta.travel_destinations || '',
                travelDates: meta.travel_dates || ''
            }
        });

    } catch (err) {
        console.error('Error retrieving session:', err.message);
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

function publicIntakePayload(booking) {
    const intake = booking.intake || {};
    return {
        service: booking.service,
        date: booking.date,
        time: booking.time,
        bookingRef: booking.bookingRef,
        patientName: booking.patientName,
        completed: !!booking.intakeCompletedAt,
        intakePrefill: {
            concerns: intake.concerns || '',
            medications: intake.medications || '',
            allergies: intake.allergies || '',
            dob: intake.dob || '',
            nhs: intake.nhs || '',
            country: intake.country || '',
            travelDest: intake.travelDest || '',
            travelDates: intake.travelDates || ''
        }
    };
}

app.get('/api/intake/:token', rateLimitIntake, async (req, res) => {
    try {
        const booking = await getBookingByIntakeToken(req.params.token);
        if (!booking) {
            return res.status(404).json({ error: 'Form not found' });
        }
        res.json(publicIntakePayload(booking));
    } catch (err) {
        console.error('GET /api/intake:', err.message);
        res.status(500).json({ error: 'Failed to load form' });
    }
});

app.post('/api/intake/:token', rateLimitIntake, async (req, res) => {
    try {
        const booking = await getBookingByIntakeToken(req.params.token);
        if (!booking) {
            return res.status(404).json({ error: 'Form not found' });
        }
        const parsed = sanitizePatientIntakeBody(req.body, { service: booking.service });
        if (!parsed.ok) {
            return res.status(400).json({ error: parsed.error });
        }
        const saved = await persistPatientIntake(booking, parsed.intake);
        if (!saved) {
            return res.status(500).json({ error: 'Failed to save form' });
        }
        emitServerAnalytics('intake_submit', {
            props: { service: booking.service, funnel: 'patient_booking' }
        }).catch(() => {});
        res.json({ ok: true, completed: true });
    } catch (err) {
        console.error('POST /api/intake:', err.message);
        res.status(500).json({ error: 'Failed to save form' });
    }
});

// ─── API: Patient — lookup booking by email + ref (same as portal login) ───
async function getPatientBooking(email, ref) {
    const e = String(email || '').toLowerCase().trim();
    const refNorm = String(ref || '').trim().toUpperCase();
    if (!e || !refNorm) return null;
    if (usePersistentDb) {
        const rows = await db.findBookingsByEmailAndRef(e, ref);
        return rows[0] || null;
    }
    return (
        bookingsStore.find((b) => b.email === e && String(b.bookingRef || '').toUpperCase() === refNorm) ||
        null
    );
}

// ─── API: Patient Dashboard — Fetch bookings by email + booking reference only ───
app.get('/api/bookings', async (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    const ref = (req.query.ref || '').trim();

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    if (!ref) {
        return res.status(400).json({ error: 'Booking reference is required' });
    }

    try {
        let results;
        const refNorm = ref.toUpperCase();
        if (usePersistentDb) {
            results = await db.findBookingsByEmailAndRef(email, ref);
        } else {
            results = bookingsStore.filter(
                (b) => b.email === email && String(b.bookingRef || '').toUpperCase() === refNorm
            );
        }

        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const bookings = await Promise.all(results.map(async (b) => {
            const enriched = enrichBookingForPatientApi(b);
            const doxyUrl = (await resolveDoxyRoomUrl(b.professional)) || null;
            return { ...enriched, doxyUrl };
        }));
        const nextWithRoom = bookings.find((b) => !b.cancelled && b.doxyUrl) || bookings[0];

        res.json({
            bookings,
            doxyUrl: (nextWithRoom && nextWithRoom.doxyUrl) || DEFAULT_DOXY_ROOM_URL || null
        });
    } catch (err) {
        console.error('GET /api/bookings:', err.message);
        res.status(500).json({ error: 'Failed to load bookings' });
    }
});

app.get('/api/conta/vacina/centros', async (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store');
    const email = String(req.query.email || '').toLowerCase().trim();
    const ref = String(req.query.ref || '').trim();
    const city = String(req.query.cidade || '').trim();
    const lat = req.query.lat;
    const lng = req.query.lng;
    if (!email || !ref) {
        return res.status(400).json({ error: 'Email e referência da marcação são obrigatórios.' });
    }
    try {
        const booking = await getPatientBooking(email, ref);
        if (!booking) {
            return res.status(401).json({ error: 'Não encontrámos essa marcação.' });
        }
        res.json(cvi.recommendPayload({ city, lat, lng }));
    } catch (err) {
        console.error('GET /api/conta/vacina/centros:', err.message);
        res.status(500).json({ error: 'Não foi possível carregar os centros.' });
    }
});

// ─── API: Patient — Cancel booking (≥24h before start) ───
app.post('/api/patient/booking/cancel', async (req, res) => {
    const { email, ref, locale } = req.body || {};
    const patientEmail = String(email || '').toLowerCase().trim();
    const bookingRef = String(ref || '').trim();
    if (!patientEmail || !bookingRef) {
        return res.status(400).json({ error: 'Email and booking reference are required' });
    }
    try {
        const booking = await getPatientBooking(patientEmail, bookingRef);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (booking.cancelled) {
            return res.status(400).json({ error: 'This booking is already cancelled' });
        }
        const tz = scheduleStore.timezone || 'Europe/Lisbon';
        const h = hoursUntilAppointment(booking, tz);
        if (h == null || h < 24 || h <= 0) {
            return res.status(403).json({
                error: 'Cancellation is only possible up to 24 hours before your appointment.'
            });
        }
        let updated = null;
        if (usePersistentDb) {
            updated = await db.cancelBookingByRef(booking.bookingRef);
        } else {
            const b = bookingsStore.find((x) => x.bookingRef === booking.bookingRef);
            if (b) {
                b.cancelled = true;
                updated = b;
            }
        }
        if (!updated) {
            return res.status(500).json({ error: 'Could not cancel booking' });
        }
        const loc = normalizePatientLocale(locale || booking.patientLocale);
        const payload = {
            patientName: booking.patientName,
            serviceLabel: serviceLabelFromCode(booking.service),
            date: booking.date,
            time: booking.time,
            bookingRef: booking.bookingRef,
            locale: loc
        };
        if (isEmailConfigured) {
            try {
                const { html, text, subject } = buildCancellationPatientEmail({
                    ...payload,
                    email: booking.email
                });
                await deliverEmail({
                    from: EMAIL_FROM,
                    to: booking.email,
                    subject,
                    text,
                    html
                });
            } catch (err) {
                console.error('Cancel patient email:', err.message);
            }
            const { html: h2, text: t2, subject: s2 } = buildClinicCancellationEmail({
                patientName: booking.patientName,
                serviceLabel: serviceLabelFromCode(booking.service),
                date: booking.date,
                time: booking.time,
                bookingRef: booking.bookingRef,
                email: booking.email
            });
            await sendClinicOpsEmail(s2, h2, t2);
        }
        res.json({ success: true, cancelled: true });
    } catch (err) {
        console.error('POST /api/patient/booking/cancel:', err.message);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// ─── API: Patient — Reschedule (max 2×, ≥48h before start) ───
app.post('/api/patient/booking/reschedule', async (req, res) => {
    const { email, ref, dateIso, time, dateLabel, locale } = req.body || {};
    const patientEmail = String(email || '').toLowerCase().trim();
    const bookingRef = String(ref || '').trim();
    const newTime = String(time || '').trim();
    const newIso = String(dateIso || '').trim();
    if (!patientEmail || !bookingRef || !newIso || !newTime) {
        return res.status(400).json({ error: 'Email, reference, dateIso, and time are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newIso)) {
        return res.status(400).json({ error: 'Invalid dateIso format (use YYYY-MM-DD)' });
    }
    try {
        const booking = await getPatientBooking(patientEmail, bookingRef);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (booking.cancelled) {
            return res.status(400).json({ error: 'Cancelled bookings cannot be rescheduled' });
        }
        if ((booking.rescheduleCount || 0) >= 2) {
            return res.status(403).json({ error: 'You have reached the maximum number of reschedules (2).' });
        }
        const tz = scheduleStore.timezone || 'Europe/Lisbon';
        const h = hoursUntilAppointment(booking, tz);
        if (h == null || h < 48 || h <= 0) {
            return res.status(403).json({
                error: 'Rescheduling is only possible up to 48 hours before your appointment.'
            });
        }
        const normTime = normalizeTimeString({ time: newTime });
        if (!normTime) {
            return res.status(400).json({ error: 'Invalid time format' });
        }
        const allowed = await getBookableSlotsForDateIso(newIso, booking.bookingRef);
        if (!allowed.includes(normTime)) {
            return res.status(400).json({ error: 'That time slot is not available' });
        }
        if (usePersistentDb) {
            const taken = await db.isSlotTakenByOther(newIso, normTime, booking.bookingRef);
            if (taken) {
                return res.status(409).json({ error: 'That slot was just taken. Please choose another.' });
            }
        } else if (!isSlotFreeInMemory(newIso, normTime, booking.bookingRef)) {
            return res.status(409).json({ error: 'That slot was just taken. Please choose another.' });
        }

        const oldDate = booking.date;
        const oldTime = booking.time;
        const newDateDisplay = String(dateLabel || '').trim() || newIso;
        const nextCount = (booking.rescheduleCount || 0) + 1;
        let newBooking = null;
        if (usePersistentDb) {
            newBooking = await db.rescheduleBookingByRef(booking.bookingRef, {
                date: newDateDisplay,
                time: normTime,
                dateIso: newIso,
                rescheduleCount: nextCount
            });
        } else {
            const b = bookingsStore.find((x) => x.bookingRef === booking.bookingRef);
            if (b) {
                b.date = newDateDisplay;
                b.time = normTime;
                b.dateIso = newIso;
                b.rescheduleCount = nextCount;
                newBooking = b;
            }
        }
        if (!newBooking) {
            return res.status(500).json({ error: 'Could not reschedule' });
        }
        const loc = normalizePatientLocale(locale || booking.patientLocale);
        if (isEmailConfigured) {
            try {
                const { html, text, subject } = buildReschedulePatientEmail({
                    patientName: booking.patientName,
                    serviceLabel: serviceLabelFromCode(booking.service),
                    date: newDateDisplay,
                    time: normTime,
                    bookingRef: booking.bookingRef,
                    locale: loc,
                    email: booking.email,
                    doxyUrl: await resolveDoxyRoomUrl(booking.professional)
                });
                await deliverEmail({
                    from: EMAIL_FROM,
                    to: booking.email,
                    subject,
                    text,
                    html
                });
            } catch (err) {
                console.error('Reschedule patient email:', err.message);
            }
            const { html: h2, text: t2, subject: s2 } = buildClinicRescheduleEmail({
                patientName: booking.patientName,
                serviceLabel: serviceLabelFromCode(booking.service),
                oldDate,
                oldTime,
                newDate: newDateDisplay,
                newTime: normTime,
                bookingRef: booking.bookingRef,
                email: booking.email,
                rescheduleCount: nextCount
            });
            await sendClinicOpsEmail(s2, h2, t2);
        }
        res.json({
            success: true,
            booking: enrichBookingForPatientApi(newBooking)
        });
    } catch (err) {
        console.error('POST /api/patient/booking/reschedule:', err.message);
        res.status(500).json({ error: 'Failed to reschedule' });
    }
});

// ─── API: Doxy.me config (for client) ───
app.get('/api/doxy-config', (req, res) => {
    res.json({
        roomUrl: DEFAULT_DOXY_ROOM_URL || null,
        configured: !!DEFAULT_DOXY_ROOM_URL
    });
});

// ─── API: Send test email (non-production only) ───
if (process.env.NODE_ENV !== 'production') {
    app.post('/api/test-email', async (req, res) => {
        const { to, locale } = req.body;
        if (!to) return res.status(400).json({ error: 'Missing "to" email address' });

        const result = await sendConfirmationEmail({
            bookingRef: 'LC-TEST1234',
            patientName: 'Test Patient',
            email: to,
            service: 'longevity',
            serviceLabel: 'Longevity Assessment',
            date: 'Wednesday, 18 February 2026',
            time: '10:00 AM',
            amount: 19500,
            currency: 'eur',
            travellerCount: 1,
            passengers: ['Test Patient'],
            travelDest: '',
            travelDates: '',
            locale: normalizePatientLocale(locale)
        });

        if (result) {
            res.json({ success: true, message: `Test email sent to ${to}` });
        } else {
            res.status(500).json({ error: 'Failed to send test email. Check server logs and .env configuration.' });
        }
    });
}

// ─── API: Clinic — Login ───
app.post('/api/clinic/login', rateLimitClinicLogin, async (req, res) => {
    const username = String((req.body && req.body.username) || '').trim();
    const password = String((req.body && req.body.password) || '');

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const usernameMatch = username.toLowerCase() === CLINIC_USERNAME.toLowerCase();
    const passwordMatch = clinicPasswordHash
        ? await bcrypt.compare(password, clinicPasswordHash)
        : false;

    if (usernameMatch && passwordMatch) {
        req.session.clinicAuthenticated = true;
        req.session.clinicUsername = username;
        req.session.clinicDisplayName = username;
        req.session.clinicRole = 'admin';
        req.session.professionalId = null;
        req.session.clinicLoginTime = new Date().toISOString();
        setStaffDeviceCookie(res);

        console.log(`   🔐 Clinic portal login (admin): ${username}`);
        return res.json({
            success: true,
            message: 'Login successful',
            role: 'admin',
            displayName: username
        });
    }

    try {
        const pro = await findProfessionalByUsernameInternal(username);
        const passwordOk = pro && pro.passwordHash
            ? await bcrypt.compare(password, pro.passwordHash)
            : false;
        if (pro && pro.active !== false && passwordOk) {
            req.session.clinicAuthenticated = true;
            req.session.clinicUsername = pro.username;
            req.session.clinicDisplayName = pro.displayName || pro.username;
            req.session.clinicRole = 'clinician';
            req.session.professionalId = pro.id;
            req.session.clinicLoginTime = new Date().toISOString();
            setStaffDeviceCookie(res);

            console.log(`   🔐 Clinic portal login (clinician): ${pro.username}`);
            return res.json({
                success: true,
                message: 'Login successful',
                role: 'clinician',
                displayName: pro.displayName || pro.username
            });
        }
    } catch (err) {
        console.error('   ⚠️  Professional login lookup failed:', err.message);
    }

    console.log(`   ⚠️  Failed clinic login attempt: ${username}`);
    res.status(401).json({ error: 'Invalid username or password' });
});

// ─── API: Clinic — Logout ───
app.post('/api/clinic/logout', (req, res) => {
    if (req.session) {
        const username = req.session.clinicUsername || 'unknown';
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Failed to logout' });
            }
            console.log(`   🔓 Clinic portal logout: ${username}`);
            res.json({ success: true, message: 'Logout successful' });
        });
    } else {
        res.json({ success: true, message: 'Already logged out' });
    }
});

// ─── API: Clinic — Check authentication status ───
app.get('/api/clinic/auth-status', (req, res) => {
    res.json(staffAuthPayload(req));
});

app.get('/api/clinic/doxy', requireAuth, async (req, res) => {
    try {
        const role = req.session.clinicRole || 'admin';
        let displayName = req.session.clinicDisplayName || req.session.clinicUsername || '';
        let patientRoomUrl = DEFAULT_DOXY_ROOM_URL || '';
        if (role === 'clinician' && req.session.professionalId) {
            const pro = await findProfessionalByIdInternal(req.session.professionalId);
            if (pro) {
                displayName = pro.displayName || displayName;
                const room = normalizeDoxyRoomUrl(pro.doxyRoomUrl);
                if (room) patientRoomUrl = room;
            }
        }
        res.json({
            role,
            displayName,
            patientRoomUrl: patientRoomUrl || null,
            providerUrl: DOXY_PROVIDER_URL,
            configured: !!patientRoomUrl
        });
    } catch (err) {
        console.error('GET /api/clinic/doxy:', err.message);
        res.status(500).json({ error: 'Failed to load Doxy room' });
    }
});

app.get('/api/clinic/profile', requireAuth, async (req, res) => {
    try {
        const username = staffSessionUsername(req);
        const profile = await getStaffProfileInternal(username);
        const documents = (await listStaffDocumentsInternal(username)).map(publicStaffDocument);
        const displayName = req.session.clinicDisplayName || username;
        const primaryAreas = sanitizeStaffAreas(
            profile.profession,
            profile.primaryAreas != null ? profile.primaryAreas : profile.primaryArea
        );
        const secondaryAreas = sanitizeStaffAreas(
            profile.profession,
            profile.secondaryAreas != null ? profile.secondaryAreas : profile.secondaryArea,
            primaryAreas
        );
        res.json({
            username,
            displayName,
            role: req.session.clinicRole || 'admin',
            profession: profile.profession || '',
            ordemNumber: profile.ordemNumber || '',
            fullName: profile.fullName || displayName || '',
            nif: profile.nif || '',
            citizenCard: profile.citizenCard || '',
            address: profile.address || '',
            insurer: profile.insurer || '',
            insurancePolicy: profile.insurancePolicy || '',
            insuranceValidUntil: profile.insuranceValidUntil || '',
            bio: profile.bio || '',
            credentials: profile.credentials || '',
            primaryAreas,
            secondaryAreas,
            hasPhoto: !!profile.hasPhoto,
            documents,
            professions: STAFF_PROFESSIONS,
            documentKinds: STAFF_DOCUMENT_KINDS,
            clinicalAreas: STAFF_CLINICAL_AREAS
        });
    } catch (err) {
        console.error('GET /api/clinic/profile:', err.message);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

app.put('/api/clinic/profile', requireAuth, rateLimitStaffProfile, express.json(), async (req, res) => {
    try {
        const username = staffSessionUsername(req);
        const body = req.body || {};
        const profession = String(body.profession || '').trim();
        if (profession && !STAFF_PROFESSIONS[profession]) {
            return res.status(400).json({ error: 'Choose médico, nutricionista or psicólogo' });
        }
        const profile = await saveStaffProfileInternal(username, {
            profession,
            ordemNumber: body.ordemNumber,
            fullName: body.fullName,
            nif: body.nif,
            citizenCard: body.citizenCard,
            address: body.address,
            insurer: body.insurer,
            insurancePolicy: body.insurancePolicy,
            insuranceValidUntil: body.insuranceValidUntil,
            bio: body.bio,
            credentials: body.credentials,
            primaryAreas: body.primaryAreas != null ? body.primaryAreas : body.primaryArea,
            secondaryAreas: body.secondaryAreas != null ? body.secondaryAreas : body.secondaryArea
        });
        res.json({ ok: true, profile });
    } catch (err) {
        console.error('PUT /api/clinic/profile:', err.message);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

app.get('/api/clinic/profile/photo', requireAuth, async (req, res) => {
    try {
        const username = staffSessionUsername(req);
        const photo = await getStaffPhotoInternal(username);
        if (!photo || !photo.data) {
            return res.status(404).json({ error: 'No photo' });
        }
        res.set({
            'Content-Type': photo.mime || 'image/jpeg',
            'Cache-Control': 'private, no-store'
        });
        res.end(Buffer.isBuffer(photo.data) ? photo.data : Buffer.from(photo.data));
    } catch (err) {
        console.error('GET /api/clinic/profile/photo:', err.message);
        res.status(500).json({ error: 'Failed to load photo' });
    }
});

app.post('/api/clinic/profile/photo', requireAuth, rateLimitStaffProfile, (req, res) => {
    uploadStaffPhoto.single('photo')(req, res, async (uploadErr) => {
        if (uploadErr instanceof multer.MulterError) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Photo must be 4MB or smaller.' });
            }
            return res.status(400).json({ error: 'Could not process the photo.' });
        }
        if (uploadErr) {
            return res.status(400).json({ error: uploadErr.message || 'Could not process the photo.' });
        }
        try {
            const username = staffSessionUsername(req);
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ error: 'Choose a photo to upload' });
            }
            const profile = await saveStaffPhotoInternal(username, {
                mime: req.file.mimetype || 'image/jpeg',
                data: req.file.buffer
            });
            res.json({ ok: true, hasPhoto: true, updatedAt: profile && profile.updatedAt });
        } catch (err) {
            console.error('POST /api/clinic/profile/photo:', err.message);
            res.status(500).json({ error: 'Failed to save photo' });
        }
    });
});

app.post('/api/clinic/profile/documents', requireAuth, rateLimitStaffProfile, (req, res) => {
    uploadStaffDocument.single('file')(req, res, async (uploadErr) => {
        if (uploadErr instanceof multer.MulterError) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File must be 25MB or smaller.' });
            }
            return res.status(400).json({ error: 'Could not process the file.' });
        }
        if (uploadErr) {
            return res.status(400).json({ error: uploadErr.message || 'Could not process the file.' });
        }
        try {
            const username = staffSessionUsername(req);
            const kind = String(req.body.kind || '').trim();
            if (!STAFF_DOCUMENT_KINDS[kind]) {
                return res.status(400).json({ error: 'Unknown document type' });
            }
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ error: 'Choose a file to upload' });
            }
            const validUntil = String(req.body.validUntil || '').trim().slice(0, 10);
            const validityOptional = STAFF_DOC_OPTIONAL_VALIDITY.has(kind);
            if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
                return res.status(400).json({ error: 'Validity date is invalid' });
            }
            if (!validityOptional && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
                return res.status(400).json({ error: 'Validity date is required' });
            }
            const saved = await saveStaffDocumentInternal({
                username,
                kind,
                originalName: req.file.originalname || STAFF_DOCUMENT_KINDS[kind],
                mime: req.file.mimetype || 'application/octet-stream',
                validUntil,
                fileData: req.file.buffer
            });
            res.json({ ok: true, document: publicStaffDocument(saved) });
        } catch (err) {
            console.error('POST /api/clinic/profile/documents:', err.message);
            res.status(500).json({ error: 'Failed to save document' });
        }
    });
});

app.get('/api/clinic/profile/documents/:id', requireAuth, async (req, res) => {
    try {
        const username = staffSessionUsername(req);
        const doc = await getStaffDocumentInternal(req.params.id, username);
        if (!doc || !doc.fileData) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const filename = String(doc.originalName || 'document').replace(/[\r\n"]/g, '');
        res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        res.send(Buffer.isBuffer(doc.fileData) ? doc.fileData : Buffer.from(doc.fileData));
    } catch (err) {
        console.error('GET /api/clinic/profile/documents:', err.message);
        res.status(500).json({ error: 'Failed to download document' });
    }
});

function validateProfessionalDoxyUrl(raw, { required } = {}) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
        if (required) return { error: 'Doxy room URL is required' };
        return { url: '' };
    }
    const url = normalizeDoxyRoomUrl(trimmed);
    if (!url) {
        return { error: 'Doxy room must be a doxy.me link, e.g. https://doxy.me/your-room' };
    }
    return { url };
}

app.get('/api/admin/professionals', requireAdmin, async (req, res) => {
    try {
        const list = await listProfessionalsInternal();
        res.json({
            professionals: list.map(publicProfessional),
            defaultDoxyRoomUrl: DEFAULT_DOXY_ROOM_URL || null
        });
    } catch (err) {
        console.error('GET /api/admin/professionals:', err.message);
        res.status(500).json({ error: 'Failed to load professionals' });
    }
});

const STAFF_PROFESSION_TITLES = {
    medico: 'Médico',
    psicologo: 'Psicólogo',
    nutricionista: 'Nutricionista'
};

function publicAdminStaffProfile(person, profile, documents) {
    const p = profile || emptyStaffProfile(person.username);
    const primaryAreas = sanitizeStaffAreas(p.profession, p.primaryAreas != null ? p.primaryAreas : p.primaryArea);
    const secondaryAreas = sanitizeStaffAreas(
        p.profession,
        p.secondaryAreas != null ? p.secondaryAreas : p.secondaryArea,
        primaryAreas
    );
    return {
        username: person.username,
        displayName: person.displayName || person.username,
        email: person.email || '',
        profession: p.profession || '',
        professionLabel: STAFF_PROFESSION_TITLES[p.profession] || '',
        fullName: p.fullName || person.displayName || '',
        nif: p.nif || '',
        citizenCard: p.citizenCard || '',
        address: p.address || '',
        ordemNumber: p.ordemNumber || '',
        insurer: p.insurer || '',
        insurancePolicy: p.insurancePolicy || '',
        insuranceValidUntil: p.insuranceValidUntil || '',
        bio: p.bio || '',
        credentials: p.credentials || '',
        iban: p.iban || '',
        primaryAreas,
        secondaryAreas,
        hasPhoto: !!p.hasPhoto,
        updatedAt: p.updatedAt || null,
        documents: (documents || []).map(publicStaffDocument)
    };
}

async function listAdminStaffPeople() {
    const people = [];
    const seen = new Set();
    const addPerson = (username, extra) => {
        const u = String(username || '').trim().toLowerCase();
        if (!u || seen.has(u)) return;
        seen.add(u);
        people.push({
            username: u,
            displayName: (extra && extra.displayName) || u,
            email: (extra && extra.email) || ''
        });
    };
    addPerson(CLINIC_USERNAME, { displayName: CLINIC_USERNAME });
    for (const p of (await listProfessionalsInternal()) || []) {
        addPerson(p.username, { displayName: p.displayName || p.username, email: p.email || '' });
    }
    for (const profile of (await listStaffProfilesInternal()) || []) {
        addPerson(profile.username, { displayName: profile.fullName || profile.username });
    }
    return people;
}

app.get('/api/admin/staff-profiles', requireAdmin, async (req, res) => {
    try {
        const people = await listAdminStaffPeople();
        const profiles = await listStaffProfilesInternal();
        const byUser = new Map();
        for (const profile of profiles || []) {
            if (profile && profile.username) byUser.set(String(profile.username).toLowerCase(), profile);
        }
        const docsByUser = new Map();
        for (const doc of (await listAllStaffDocumentsInternal()) || []) {
            if (!doc || !doc.username) continue;
            const key = String(doc.username).toLowerCase();
            if (!docsByUser.has(key)) docsByUser.set(key, []);
            docsByUser.get(key).push(doc);
        }
        res.json({
            staff: people.map((person) => publicAdminStaffProfile(
                person,
                byUser.get(person.username),
                docsByUser.get(person.username) || []
            )),
            documentKinds: STAFF_DOCUMENT_KINDS
        });
    } catch (err) {
        console.error('GET /api/admin/staff-profiles:', err.message);
        res.status(500).json({ error: 'Failed to load staff profiles' });
    }
});

app.get('/api/admin/staff-profiles/:username/photo', requireAdmin, async (req, res) => {
    try {
        const username = String(req.params.username || '').trim().toLowerCase();
        const photo = await getStaffPhotoInternal(username);
        if (!photo || !photo.data) {
            return res.status(404).json({ error: 'No photo' });
        }
        res.set({
            'Content-Type': photo.mime || 'image/jpeg',
            'Cache-Control': 'private, no-store'
        });
        res.end(Buffer.isBuffer(photo.data) ? photo.data : Buffer.from(photo.data));
    } catch (err) {
        console.error('GET /api/admin/staff-profiles photo:', err.message);
        res.status(500).json({ error: 'Failed to load photo' });
    }
});

app.get('/api/admin/staff-profiles/:username/documents/:id', requireAdmin, async (req, res) => {
    try {
        const username = String(req.params.username || '').trim().toLowerCase();
        const doc = await getStaffDocumentInternal(req.params.id, username);
        if (!doc || !doc.fileData) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const filename = String(doc.originalName || 'document').replace(/[\r\n"]/g, '');
        res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        res.send(Buffer.isBuffer(doc.fileData) ? doc.fileData : Buffer.from(doc.fileData));
    } catch (err) {
        console.error('GET /api/admin/staff-profiles document:', err.message);
        res.status(500).json({ error: 'Failed to download document' });
    }
});

async function createProfessionalInternal({
    username,
    password,
    displayName,
    doxyRoomUrl,
    email,
    active
}) {
    const existing = await findProfessionalByUsernameInternal(username);
    if (existing) {
        const err = new Error('That username is already in use');
        err.statusCode = 409;
        err.code = '23505';
        throw err;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const record = {
        username,
        passwordHash,
        displayName,
        doxyRoomUrl: doxyRoomUrl || '',
        email: String(email || '').trim().toLowerCase().slice(0, 320),
        active: active !== false
    };
    if (usePersistentDb) return db.insertProfessional(record);
    const created = {
        id: professionalIdSeq++,
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    professionalsStore.push(created);
    return created;
}

async function setApplicationProfessionalIdInternal(appId, professionalId) {
    if (usePersistentDb) {
        return db.updatePsychologistApplication(appId, { professionalId });
    }
    const row = psychologistApplicationsStore.find((a) => a.id === appId);
    if (!row) return null;
    row.professionalId = professionalId;
    row.updatedAt = new Date().toISOString();
    return row;
}

async function linkedProfessionalForApplication(app) {
    if (!app) return null;
    if (app.professionalId) {
        const byId = await findProfessionalByIdInternal(app.professionalId);
        if (byId) return byId;
    }
    if (app.email) {
        const byEmail = await findProfessionalByEmailInternal(app.email);
        if (byEmail) return byEmail;
    }
    return null;
}

async function enrichPsychologistApplication(app) {
    if (!app) return app;
    const professional = await linkedProfessionalForApplication(app);
    return {
        ...app,
        professionalId: app.professionalId || (professional && professional.id) || null,
        professional: publicProfessional(professional)
    };
}

async function seedPsychologistStaffProfile(professional, app) {
    if (!professional || !professional.username) return;
    const existing = await getStaffProfileInternal(professional.username);
    await saveStaffProfileInternal(professional.username, {
        ...existing,
        profession: existing.profession || 'psicologo',
        ordemNumber: existing.ordemNumber || app.cedulaOpp || '',
        fullName: existing.fullName || app.name || professional.displayName || ''
    });
}

async function assignLoginToPsychologistApplication(app, { resetPassword } = {}) {
    const name = String(app.name || '').trim().slice(0, 200);
    if (!name) {
        const err = new Error('This application has no name');
        err.statusCode = 400;
        throw err;
    }
    let existing = await linkedProfessionalForApplication(app);
    const emailRaw = String(app.email || '').trim().toLowerCase();

    if (existing) {
        await setApplicationProfessionalIdInternal(app.id, existing.id);
        const fields = {};
        if (emailRaw && !existing.email) fields.email = emailRaw;
        let generatedPassword;
        if (resetPassword) {
            generatedPassword = generateProfessionalPassword();
            fields.passwordHash = await bcrypt.hash(generatedPassword, 12);
        }
        if (Object.keys(fields).length) {
            if (usePersistentDb) {
                existing = await db.updateProfessional(existing.id, fields);
            } else {
                Object.assign(existing, fields, { updatedAt: new Date().toISOString() });
            }
        }
        await seedPsychologistStaffProfile(existing, app);
        return {
            professional: existing,
            generatedPassword,
            created: false
        };
    }

    const username = await allocateProfessionalUsername('', name);
    const generatedPassword = generateProfessionalPassword();
    const created = await createProfessionalInternal({
        username,
        password: generatedPassword,
        displayName: name,
        email: emailRaw,
        active: true
    });
    await setApplicationProfessionalIdInternal(app.id, created.id);
    await seedPsychologistStaffProfile(created, app);
    console.log(`   👤 Professional created from board: ${created.username}`);
    return {
        professional: created,
        generatedPassword,
        created: true
    };
}

function httpErrorStatus(err, fallback) {
    const n = Number(err && err.statusCode);
    return Number.isInteger(n) && n >= 400 && n < 600 ? n : fallback;
}

app.post('/api/admin/professionals', requireAdmin, express.json(), async (req, res) => {
    try {
        const body = req.body || {};
        const displayName = String(body.displayName || '').trim().slice(0, 200);
        if (!displayName) {
            return res.status(400).json({ error: 'Display name is required' });
        }
        const requestedUsername = String(body.username || '').trim();
        if (requestedUsername && !isValidProfessionalUsername(requestedUsername)) {
            return res.status(400).json({ error: 'Username must be 3–64 characters (letters, numbers, . _ -)' });
        }
        if (requestedUsername && normalizeProfessionalUsername(requestedUsername) === normalizeProfessionalUsername(CLINIC_USERNAME)) {
            return res.status(409).json({ error: 'That username is reserved for the clinic admin account' });
        }
        const username = await allocateProfessionalUsername(requestedUsername, displayName);
        let password = String(body.password || '');
        let generatedPassword = null;
        if (!password) {
            generatedPassword = generateProfessionalPassword();
            password = generatedPassword;
        } else if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const doxy = validateProfessionalDoxyUrl(body.doxyRoomUrl);
        if (doxy.error) return res.status(400).json({ error: doxy.error });
        const emailRaw = String(body.email || '').trim().toLowerCase();
        if (emailRaw && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) || emailRaw.length > 320)) {
            return res.status(400).json({ error: 'Enter a valid email' });
        }

        const created = await createProfessionalInternal({
            username,
            password,
            displayName,
            doxyRoomUrl: doxy.url,
            email: emailRaw,
            active: body.active !== false
        });
        console.log(`   👤 Professional created: ${created.username}`);
        res.status(201).json({
            professional: publicProfessional(created),
            generatedPassword: generatedPassword || undefined
        });
    } catch (err) {
        if (err && err.code === '23505') {
            return res.status(409).json({ error: 'That username is already in use' });
        }
        console.error('POST /api/admin/professionals:', err.message);
        res.status(500).json({ error: 'Failed to create professional' });
    }
});

app.patch('/api/admin/professionals/:id', requireAdmin, express.json(), async (req, res) => {
    try {
        const existing = await findProfessionalByIdInternal(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Professional not found' });
        const body = req.body || {};
        const fields = {};
        if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
            const displayName = String(body.displayName || '').trim().slice(0, 200);
            if (!displayName) return res.status(400).json({ error: 'Display name is required' });
            fields.displayName = displayName;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'doxyRoomUrl')) {
            const doxy = validateProfessionalDoxyUrl(body.doxyRoomUrl);
            if (doxy.error) return res.status(400).json({ error: doxy.error });
            fields.doxyRoomUrl = doxy.url;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'email')) {
            const emailRaw = String(body.email || '').trim().toLowerCase();
            if (emailRaw && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) || emailRaw.length > 320)) {
                return res.status(400).json({ error: 'Enter a valid email' });
            }
            fields.email = emailRaw;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'active')) {
            fields.active = body.active === true || body.active === 'true' || body.active === 1;
        }
        if (body.password) {
            if (String(body.password).length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }
            fields.passwordHash = await bcrypt.hash(String(body.password), 12);
        }
        let updated;
        if (usePersistentDb) {
            updated = await db.updateProfessional(existing.id, fields);
        } else {
            Object.assign(existing, fields, { updatedAt: new Date().toISOString() });
            updated = existing;
        }
        res.json({ professional: publicProfessional(updated) });
    } catch (err) {
        console.error('PATCH /api/admin/professionals/:id:', err.message);
        res.status(500).json({ error: 'Failed to update professional' });
    }
});

app.post('/api/admin/professionals/:id/password', requireAdmin, async (req, res) => {
    try {
        const existing = await findProfessionalByIdInternal(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Professional not found' });
        const generatedPassword = generateProfessionalPassword();
        const passwordHash = await bcrypt.hash(generatedPassword, 12);
        let updated;
        if (usePersistentDb) {
            updated = await db.updateProfessional(existing.id, { passwordHash });
        } else {
            Object.assign(existing, { passwordHash, updatedAt: new Date().toISOString() });
            updated = existing;
        }
        console.log(`   🔑 Professional password reset: ${updated.username}`);
        res.json({
            professional: publicProfessional(updated),
            generatedPassword
        });
    } catch (err) {
        console.error('POST /api/admin/professionals/:id/password:', err.message);
        res.status(500).json({ error: 'Failed to assign a new password' });
    }
});

app.delete('/api/admin/professionals/:id', requireAdmin, async (req, res) => {
    try {
        const existing = await findProfessionalByIdInternal(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Professional not found' });
        if (usePersistentDb) {
            await db.deleteProfessional(existing.id);
        } else {
            const idx = professionalsStore.findIndex((p) => p.id === existing.id);
            if (idx >= 0) professionalsStore.splice(idx, 1);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/admin/professionals/:id:', err.message);
        res.status(500).json({ error: 'Failed to delete professional' });
    }
});

// ─── API: Clinic — Get all bookings ───
app.get('/api/clinic/bookings', requireAuth, async (req, res) => {
    try {
        const sortFn = (a, b) => {
            try {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                    return dateA - dateB;
                }
            } catch {}
            return new Date(b.createdAt) - new Date(a.createdAt);
        };

        let bookingsWithNotes;
        if (usePersistentDb) {
            bookingsWithNotes = (await db.findAllBookingsWithClinicalNotes()).sort(sortFn);
        } else {
            const sorted = [...bookingsStore].sort(sortFn);
            bookingsWithNotes = sorted.map((booking) => {
                const notes = clinicalNotesStore.find((n) => n.bookingRef === booking.bookingRef);
                return {
                    ...booking,
                    hasClinicalNotes: !!notes,
                    clinicalNotes: notes || null
                };
            });
        }

        res.json({ bookings: filterBookingsForStaff(bookingsWithNotes, req) });
    } catch (err) {
        console.error('GET /api/clinic/bookings:', err.message);
        res.status(500).json({ error: 'Failed to load clinic bookings' });
    }
});

function bookingDateIso(b) {
    const iso = (b && b.dateIso && String(b.dateIso).trim()) || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const key = bookingSortKey(b || {});
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(key);
    return m ? m[1] : '';
}

function formatPtDayRange(startIso, endIso) {
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(startIso || ''));
    const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(endIso || ''));
    if (!a || !b) return '—';
    const d1 = Number(a[3]);
    const d2 = Number(b[3]);
    const m1 = months[Number(a[2]) - 1];
    const m2 = months[Number(b[2]) - 1];
    if (a[2] === b[2] && a[1] === b[1]) return `${d1} - ${d2} ${m1}`;
    return `${d1} ${m1} - ${d2} ${m2}`;
}

function summarizeBillingPeriod(bookings, startIso, endIso, slotMinutes) {
    const patients = new Set();
    let consultations = 0;
    let paidCents = 0;
    for (const b of bookings || []) {
        if (!b || b.cancelled) continue;
        if (String(b.service || '') === 'entrevista') continue;
        const day = bookingDateIso(b);
        if (!day || day < startIso || day > endIso) continue;
        consultations += 1;
        const email = String(b.email || '').toLowerCase().trim();
        if (email) patients.add(email);
        else patients.add(`ref:${b.bookingRef || consultations}`);
        const amountCents = Math.max(0, Math.round(Number(b.amount) || 0));
        const paymentId = String(b.paymentId || '');
        const isComp = paymentId.startsWith('comp_') || amountCents === 0;
        const isPaid = isComp || b.markedPaid === true;
        if (isPaid && !isComp) paidCents += amountCents;
    }
    const hours = consultations * (Number(slotMinutes) || 30) / 60;
    return {
        startIso,
        endIso,
        rangeLabel: formatPtDayRange(startIso, endIso),
        hours,
        patients: patients.size,
        consultations,
        paidCents
    };
}

app.get('/api/clinic/billing-summary', requireAuth, async (req, res) => {
    try {
        let bookings;
        if (usePersistentDb) {
            bookings = await db.findAllBookings();
        } else {
            bookings = [...bookingsStore];
        }
        bookings = filterBookingsForStaff(bookings, req);
        const slotMinutes = Number(scheduleStore.slotDuration) || 30;
        const today = lisbonTodayUtcMidnight();
        const dow = today.getUTCDay();
        const monday = addUtcDays(today, -((dow + 6) % 7));
        const sunday = addUtcDays(monday, 6);
        const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
        const weekStartIso = isoFromUtcMidnight(monday);
        const weekEndIso = isoFromUtcMidnight(sunday);
        const monthStartIso = isoFromUtcMidnight(monthStart);
        const monthEndIso = isoFromUtcMidnight(monthEnd);
        res.json({
            currency: 'eur',
            slotMinutes,
            week: {
                label: 'Esta semana',
                ...summarizeBillingPeriod(bookings, weekStartIso, weekEndIso, slotMinutes)
            },
            month: {
                label: 'Este mês',
                ...summarizeBillingPeriod(bookings, monthStartIso, monthEndIso, slotMinutes)
            }
        });
    } catch (err) {
        console.error('GET /api/clinic/billing-summary:', err.message);
        res.status(500).json({ error: 'Failed to load billing summary' });
    }
});

const PAYOUT_MONTH_NAMES_PT = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

function isPayoutMonthKey(raw) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(raw || ''));
}

function currentPayoutMonthKey() {
    const today = lisbonTodayUtcMidnight();
    return `${today.getUTCFullYear()}-${pad2Interview(today.getUTCMonth() + 1)}`;
}

function shiftPayoutMonthKey(key, delta) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!m) return '';
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + Number(delta || 0), 1));
    return `${d.getUTCFullYear()}-${pad2Interview(d.getUTCMonth() + 1)}`;
}

function payoutMonthKeysInclusive(fromKey, toKey) {
    const keys = [];
    let k = fromKey;
    for (let i = 0; i < 36 && isPayoutMonthKey(k) && k <= toKey; i++) {
        keys.push(k);
        k = shiftPayoutMonthKey(k, 1);
    }
    return keys;
}

async function ensurePayoutsFromMonthInternal(username) {
    const currentKey = currentPayoutMonthKey();
    const profile = await getStaffProfileInternal(username);
    if (profile && isPayoutMonthKey(profile.payoutsFromMonth)) {
        return profile.payoutsFromMonth;
    }
    await saveStaffPayoutsFromMonthInternal(username, currentKey);
    const saved = await getStaffProfileInternal(username);
    return (saved && isPayoutMonthKey(saved.payoutsFromMonth)) ? saved.payoutsFromMonth : currentKey;
}

function normalizeIbanInput(raw) {
    const s = String(raw || '').toUpperCase().replace(/[\s-]+/g, '');
    if (!s) return { iban: '' };
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) {
        return { error: 'Enter a valid IBAN' };
    }
    return { iban: s.slice(0, 34) };
}

function payoutDueIso(year, monthIndex0) {
    return isoFromUtcMidnight(new Date(Date.UTC(year, monthIndex0 + 2, 0)));
}

function formatPayoutDueLabel(dueIso, workYear) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dueIso || ''));
    if (!m) return '—';
    const y = Number(m[1]);
    const monthName = PAYOUT_MONTH_NAMES_PT[Number(m[2]) - 1] || '';
    const day = Number(m[3]);
    if (y !== workYear) return `${day} de ${monthName} de ${y}`;
    return `${day} de ${monthName}`;
}

function capitalizePtMonth(name) {
    const s = String(name || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatPayoutEuroLabel(cents) {
    const n = (Number(cents) || 0) / 100;
    const formatted = n.toLocaleString('pt-PT', {
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    });
    return `${formatted} €`;
}

function availabilityDeadlineIso(year, monthIndex0) {
    return isoFromUtcMidnight(new Date(Date.UTC(year, monthIndex0 - 1, 15)));
}

function buildAvailabilityMonthRows(confirmations) {
    const byMonth = new Map();
    for (const row of confirmations || []) {
        if (row && row.month) byMonth.set(row.month, row);
    }
    const today = lisbonTodayUtcMidnight();
    const rows = [];
    for (let i = 0; i < 6; i++) {
        const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1));
        const y = start.getUTCFullYear();
        const mo = start.getUTCMonth();
        const key = `${y}-${pad2Interview(mo + 1)}`;
        const name = PAYOUT_MONTH_NAMES_PT[mo];
        const label = `${name} ${y}`;
        const confirmed = !!(byMonth.get(key) && byMonth.get(key).confirmed);
        const prior = new Date(Date.UTC(y, mo - 1, 1));
        const priorName = PAYOUT_MONTH_NAMES_PT[prior.getUTCMonth()];
        rows.push({
            month: key,
            label,
            confirmed,
            deadlineIso: availabilityDeadlineIso(y, mo),
            lineLabel: confirmed
                ? `${label}: availabilities defined`
                : `${label}: give your availabilities till 15 of ${priorName}`
        });
    }
    return rows;
}

function buildPayoutMonthRows(bookings, invoices, fromMonthKey) {
    const byMonth = new Map();
    for (const inv of invoices || []) {
        if (inv && inv.month) byMonth.set(inv.month, inv);
    }
    const currentKey = currentPayoutMonthKey();
    const endKey = shiftPayoutMonthKey(currentKey, 2);
    let startKey = isPayoutMonthKey(fromMonthKey) ? fromMonthKey : currentKey;
    if (startKey > currentKey) startKey = currentKey;
    for (const inv of invoices || []) {
        if (inv && isPayoutMonthKey(inv.month) && inv.month < startKey) {
            startKey = inv.month;
        }
    }
    const slotMinutes = Number(scheduleStore.slotDuration) || 30;
    const rows = [];
    for (const key of payoutMonthKeysInclusive(startKey, endKey)) {
        const y = Number(key.slice(0, 4));
        const mo = Number(key.slice(5, 7)) - 1;
        const start = new Date(Date.UTC(y, mo, 1));
        const end = new Date(Date.UTC(y, mo + 1, 0));
        const summary = summarizeBillingPeriod(
            bookings,
            isoFromUtcMidnight(start),
            isoFromUtcMidnight(end),
            slotMinutes
        );
        const dueIso = payoutDueIso(y, mo);
        const inv = byMonth.get(key);
        const monthName = PAYOUT_MONTH_NAMES_PT[mo];
        const totalLabel = formatPayoutEuroLabel(summary.paidCents);
        const dueLabel = formatPayoutDueLabel(dueIso, y);
        rows.push({
            month: key,
            label: capitalizePtMonth(monthName),
            year: y,
            totalCents: summary.paidCents,
            dueIso,
            dueLabel,
            lineLabel: `${capitalizePtMonth(monthName)}: total ${totalLabel} — pagamento até ${dueLabel}`,
            hasInvoice: !!(inv && inv.hasInvoice),
            invoiceName: (inv && inv.originalName) || '',
            invoiceUploadedAt: (inv && inv.uploadedAt) || null,
            paymentSent: !!(inv && inv.paymentSent),
            paymentSentAt: (inv && inv.paymentSentAt) || null
        });
    }
    return rows;
}

async function bookingsForPayouts() {
    if (usePersistentDb) return db.findAllBookings();
    return [...bookingsStore];
}

function sendStaffInvoiceFile(res, inv) {
    if (!inv || !inv.fileData) return false;
    const filename = String(inv.originalName || 'fatura').replace(/[\r\n"]/g, '');
    res.setHeader('Content-Type', inv.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.send(Buffer.isBuffer(inv.fileData) ? inv.fileData : Buffer.from(inv.fileData));
    return true;
}

app.get('/api/clinic/payouts', requireAuth, async (req, res) => {
    try {
        const username = staffSessionUsername(req);
        const profile = await getStaffProfileInternal(username);
        let bookings = await bookingsForPayouts();
        bookings = filterBookingsForStaff(bookings, req);
        const invoices = await listStaffInvoicesInternal(username);
        const fromMonth = await ensurePayoutsFromMonthInternal(username);
        res.json({
            iban: profile.iban || '',
            months: buildPayoutMonthRows(bookings, invoices, fromMonth)
        });
    } catch (err) {
        console.error('GET /api/clinic/payouts:', err.message);
        res.status(500).json({ error: 'Failed to load payouts' });
    }
});

app.put('/api/clinic/payouts/iban', requireAuth, rateLimitStaffProfile, express.json(), async (req, res) => {
    try {
        const parsed = normalizeIbanInput((req.body || {}).iban);
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const username = staffSessionUsername(req);
        const profile = await saveStaffIbanInternal(username, parsed.iban);
        res.json({ ok: true, iban: (profile && profile.iban) || parsed.iban });
    } catch (err) {
        console.error('PUT /api/clinic/payouts/iban:', err.message);
        res.status(500).json({ error: 'Failed to save IBAN' });
    }
});

app.get('/api/clinic/payouts/:month/invoice', requireAuth, async (req, res) => {
    try {
        const month = String(req.params.month || '').trim();
        if (!isPayoutMonthKey(month)) return res.status(400).json({ error: 'Invalid month' });
        const username = staffSessionUsername(req);
        const inv = await getStaffInvoiceInternal(username, month, { includeData: true });
        if (!sendStaffInvoiceFile(res, inv)) {
            return res.status(404).json({ error: 'No fatura uploaded' });
        }
    } catch (err) {
        console.error('GET /api/clinic/payouts invoice:', err.message);
        res.status(500).json({ error: 'Failed to download fatura' });
    }
});

app.post('/api/clinic/payouts/:month/invoice', requireAuth, rateLimitStaffProfile, (req, res) => {
    const month = String(req.params.month || '').trim();
    if (!isPayoutMonthKey(month)) {
        return res.status(400).json({ error: 'Invalid month' });
    }
    uploadStaffDocument.single('file')(req, res, async (uploadErr) => {
        if (uploadErr instanceof multer.MulterError) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Fatura must be 25MB or smaller.' });
            }
            return res.status(400).json({ error: 'Could not process the file.' });
        }
        if (uploadErr) {
            return res.status(400).json({ error: uploadErr.message || 'Could not process the file.' });
        }
        try {
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ error: 'Choose a fatura to upload' });
            }
            const username = staffSessionUsername(req);
            const saved = await saveStaffInvoiceFileInternal(username, month, {
                originalName: req.file.originalname || 'fatura',
                mime: req.file.mimetype || 'application/octet-stream',
                fileData: req.file.buffer
            });
            res.json({ ok: true, invoice: publicStaffInvoice(saved) });
        } catch (err) {
            console.error('POST /api/clinic/payouts invoice:', err.message);
            res.status(500).json({ error: 'Failed to save fatura' });
        }
    });
});

app.get('/api/clinic/availability-months', requireAuth, async (req, res) => {
    try {
        const username = staffSessionUsername(req);
        const rows = await listStaffMonthAvailabilityInternal(username);
        res.json({ months: buildAvailabilityMonthRows(rows) });
    } catch (err) {
        console.error('GET /api/clinic/availability-months:', err.message);
        res.status(500).json({ error: 'Failed to load availability months' });
    }
});

app.put('/api/clinic/availability-months/:month', requireAuth, rateLimitStaffProfile, express.json(), async (req, res) => {
    try {
        const month = String(req.params.month || '').trim();
        if (!isPayoutMonthKey(month)) return res.status(400).json({ error: 'Invalid month' });
        const username = staffSessionUsername(req);
        const confirmed = !!(req.body && req.body.confirmed);
        const saved = await setStaffMonthAvailabilityConfirmedInternal(username, month, confirmed);
        const rows = await listStaffMonthAvailabilityInternal(username);
        res.json({ ok: true, month: saved && saved.month, confirmed: !!(saved && saved.confirmed), months: buildAvailabilityMonthRows(rows) });
    } catch (err) {
        console.error('PUT /api/clinic/availability-months:', err.message);
        res.status(500).json({ error: 'Failed to save availability month' });
    }
});

app.get('/api/admin/payouts', requireAdmin, async (req, res) => {
    try {
        const bookings = await bookingsForPayouts();
        const invoices = await listAllStaffInvoicesInternal();
        const byUser = new Map();
        for (const inv of invoices) {
            if (!inv || !inv.username) continue;
            if (!byUser.has(inv.username)) byUser.set(inv.username, []);
            byUser.get(inv.username).push(inv);
        }
        const people = [];
        const seen = new Set();
        const addPerson = (username, displayName) => {
            const u = String(username || '').trim().toLowerCase();
            if (!u || seen.has(u)) return;
            seen.add(u);
            people.push({ username: u, displayName: displayName || u });
        };
        addPerson(CLINIC_USERNAME, CLINIC_USERNAME);
        const professionals = await listProfessionalsInternal();
        for (const p of professionals || []) {
            addPerson(p.username, p.displayName || p.username);
        }
        for (const u of byUser.keys()) addPerson(u, u);

        const staff = [];
        for (const person of people) {
            const fakeReq = person.username === String(CLINIC_USERNAME || '').trim().toLowerCase()
                ? req
                : {
                    session: {
                        clinicAuthenticated: true,
                        clinicRole: 'clinician',
                        clinicUsername: person.username,
                        clinicDisplayName: person.displayName
                    }
                };
            const filtered = filterBookingsForStaff(bookings, fakeReq);
            const profile = await getStaffProfileInternal(person.username);
            const fromMonth = await ensurePayoutsFromMonthInternal(person.username);
            staff.push({
                username: person.username,
                displayName: person.displayName,
                iban: (profile && profile.iban) || '',
                months: buildPayoutMonthRows(filtered, byUser.get(person.username) || [], fromMonth)
            });
        }
        res.json({ staff });
    } catch (err) {
        console.error('GET /api/admin/payouts:', err.message);
        res.status(500).json({ error: 'Failed to load payouts' });
    }
});

app.get('/api/admin/payouts/:username/:month/invoice', requireAdmin, async (req, res) => {
    try {
        const username = String(req.params.username || '').trim().toLowerCase();
        const month = String(req.params.month || '').trim();
        if (!username || !isPayoutMonthKey(month)) {
            return res.status(400).json({ error: 'Invalid staff or month' });
        }
        const inv = await getStaffInvoiceInternal(username, month, { includeData: true });
        if (!sendStaffInvoiceFile(res, inv)) {
            return res.status(404).json({ error: 'No fatura uploaded' });
        }
    } catch (err) {
        console.error('GET /api/admin/payouts invoice:', err.message);
        res.status(500).json({ error: 'Failed to download fatura' });
    }
});

app.patch('/api/admin/payouts/:username/:month', requireAdmin, express.json(), async (req, res) => {
    try {
        const username = String(req.params.username || '').trim().toLowerCase();
        const month = String(req.params.month || '').trim();
        if (!username || !isPayoutMonthKey(month)) {
            return res.status(400).json({ error: 'Invalid staff or month' });
        }
        const sent = !!(req.body && req.body.paymentSent);
        const saved = await setStaffInvoicePaymentSentInternal(username, month, sent);
        res.json({ ok: true, invoice: publicStaffInvoice(saved) });
    } catch (err) {
        console.error('PATCH /api/admin/payouts:', err.message);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

function bookingSortKey(b) {
    const iso = (b.dateIso && String(b.dateIso).trim()) || '';
    const datePart = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : String(b.date || '');
    const timePart = String(b.time || '00:00').slice(0, 5);
    return `${datePart}T${timePart}`;
}

function isBookingUpcoming(b, now = new Date()) {
    if (b.cancelled) return false;
    const key = bookingSortKey(b);
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(key);
    if (!m) {
        if (String(b.service || '') === 'entrevista') return true;
        try {
            const end = new Date(b.date);
            end.setHours(23, 59, 59, 999);
            return end >= now;
        } catch {
            return false;
        }
    }
    const when = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        0,
        0
    );
    return when >= now;
}

async function enrichBookingsWithSource(bookings) {
    const inviteByRef = new Map();
    if (usePersistentDb) {
        try {
            const invitations = await db.listInvitations(500);
            for (const inv of invitations) {
                if (inv.bookingRef) {
                    inviteByRef.set(String(inv.bookingRef).toUpperCase(), inv);
                }
            }
        } catch (e) {
            console.warn('enrichBookingsWithSource: invitations lookup failed:', e.message);
        }
    }
    return bookings.map((b) => {
        const ref = String(b.bookingRef || '').toUpperCase();
        const inv = inviteByRef.get(ref);
        const isComp = String(b.paymentId || '').startsWith('comp_');
        const isManual = String(b.paymentId || '').startsWith('manual_');
        const source = inv || isComp || isManual ? 'clinic' : 'patient';
        return {
            ...b,
            source,
            invitedBy: inv ? inv.createdBy || null : null,
            complimentary: isComp || (inv && Number(inv.amountCents || 0) === 0),
            withoutInvoice: isManual || (inv && inv.status === 'paid' && !inv.stripeSessionId && Number(inv.amountCents || 0) > 0)
        };
    });
}

// ─── API: Admin — Upcoming consultations schedule ───
app.get('/api/admin/upcoming-consultations', requireAdmin, async (req, res) => {
    try {
        const sortFn = (a, b) => bookingSortKey(a).localeCompare(bookingSortKey(b));
        let bookings;
        if (usePersistentDb) {
            bookings = await db.findAllBookingsWithClinicalNotes();
        } else {
            bookings = bookingsStore.map((booking) => {
                const notes = clinicalNotesStore.find((n) => n.bookingRef === booking.bookingRef);
                return {
                    ...booking,
                    hasClinicalNotes: !!notes,
                    clinicalNotes: notes || null
                };
            });
        }

        const now = new Date();
        const enriched = await enrichBookingsWithSource(bookings);
        const upcoming = enriched.filter((b) => isBookingUpcoming(b, now)).sort(sortFn);
        const sourceFilter = String(req.query.source || 'all').toLowerCase();
        const isInterview = (b) => String(b.service || '') === 'entrevista';
        const filtered = sourceFilter === 'clinic' || sourceFilter === 'patient'
            ? upcoming.filter((b) => b.source === sourceFilter)
            : sourceFilter === 'interview'
                ? upcoming.filter(isInterview)
                : upcoming;

        res.json({
            consultations: filtered,
            counts: {
                all: upcoming.length,
                clinic: upcoming.filter((b) => b.source === 'clinic').length,
                patient: upcoming.filter((b) => b.source === 'patient').length,
                interview: upcoming.filter(isInterview).length
            }
        });
    } catch (err) {
        console.error('GET /api/admin/upcoming-consultations:', err.message);
        res.status(500).json({ error: 'Failed to load upcoming consultations' });
    }
});

function consultationPatientType(consultationCount) {
    const n = Number(consultationCount) || 0;
    return n > 1 ? 'Regular' : 'One-time';
}

function normalizeStoredPatientType(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (s === 'regular') return 'Regular';
    if (s === 'one_time' || s === 'onetime') return 'One-time';
    return '';
}

function enrichPatientsWithReviews(bookings, reviews) {
    const reviewByEmail = new Map();
    for (const r of reviews || []) {
        const e = String(r.email || '').toLowerCase().trim();
        if (!e) continue;
        if (!reviewByEmail.has(e)) reviewByEmail.set(e, r);
    }

    const countByEmail = new Map();
    for (const b of bookings || []) {
        if (b.cancelled) continue;
        const e = String(b.email || '').toLowerCase().trim();
        if (!e) continue;
        countByEmail.set(e, (countByEmail.get(e) || 0) + 1);
    }

    const frequencyByEmail = new Map();
    const typeByEmail = new Map();
    for (const b of bookings || []) {
        const e = String(b.email || '').toLowerCase().trim();
        if (!e) continue;
        if (b.visitFrequency && !frequencyByEmail.has(e)) frequencyByEmail.set(e, b.visitFrequency);
        const typed = normalizeStoredPatientType(b.patientType);
        if (typed && !typeByEmail.has(e)) typeByEmail.set(e, typed);
    }

    return bookings.map((b) => {
        const email = String(b.email || '').toLowerCase().trim();
        const review = email ? reviewByEmail.get(email) : null;
        const phone = b.patientPhone || (b._invitePhone || '') || '';
        const consultationCount = email ? (countByEmail.get(email) || 0) : 1;
        const storedType = normalizeStoredPatientType(b.patientType) || typeByEmail.get(email) || '';
        return {
            ...b,
            patientPhone: phone,
            consultationCount,
            patientType: storedType || consultationPatientType(consultationCount),
            visitFrequency: b.visitFrequency || frequencyByEmail.get(email) || '',
            hasReviewed: !!review,
            reviewRating: review ? review.rating : null,
            reviewId: review ? review.id : null
        };
    });
}

function bookingMonthKey(b) {
    const iso = (b.dateIso && String(b.dateIso).trim()) || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.slice(0, 7);
    const key = bookingSortKey(b);
    const m = /^(\d{4}-\d{2})/.exec(key);
    if (m) return m[1];
    if (b.createdAt) {
        const d = new Date(b.createdAt);
        if (!Number.isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
    }
    return 'unknown';
}

function formatMonthLabel(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!m) return monthKey || 'Unknown';
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
}

/** Estimate Stripe fee for a card payment (EU default: 1.5% + €0.25). Override via env. */
function estimateStripeFeeCents(amountCents) {
    const amount = Math.max(0, Math.round(Number(amountCents) || 0));
    if (amount <= 0) return 0;
    const pct = Number(process.env.STRIPE_FEE_PERCENT);
    const fixed = Number(process.env.STRIPE_FEE_FIXED_CENTS);
    const percent = Number.isFinite(pct) && pct >= 0 ? pct : 1.5;
    const fixedCents = Number.isFinite(fixed) && fixed >= 0 ? Math.round(fixed) : 25;
    return Math.round(amount * (percent / 100)) + fixedCents;
}

function buildGrossBreakdown(grossCents, stripeFeeCents) {
    const gross = Math.max(0, Math.round(Number(grossCents) || 0));
    const stripe = Math.max(0, Math.round(Number(stripeFeeCents) || 0));
    const irsCents = Math.round(gross * 0.25);
    const ssCents = Math.round(gross * 0.15);
    const netCents = gross - stripe - irsCents - ssCents;
    return {
        grossCents: gross,
        stripeFeeCents: stripe,
        irsCents,
        ssCents,
        netCents,
        rates: {
            irsPercent: 25,
            ssPercent: 15,
            stripePercent: Number(process.env.STRIPE_FEE_PERCENT) || 1.5,
            stripeFixedCents: Number(process.env.STRIPE_FEE_FIXED_CENTS) >= 0
                ? Math.round(Number(process.env.STRIPE_FEE_FIXED_CENTS) || 0)
                : 25
        }
    };
}

// ─── API: Admin — Finances (paid revenue by month / patient) ───
app.get('/api/admin/finances', requireAdmin, async (req, res) => {
    try {
        let bookings;
        if (usePersistentDb) {
            bookings = await db.findAllBookings();
        } else {
            bookings = [...bookingsStore];
        }

        const monthFilter = String(req.query.month || '').trim(); // YYYY-MM or empty
        const byMonth = new Map();

        for (const b of bookings || []) {
            if (b.cancelled) continue;
            const month = bookingMonthKey(b);
            if (monthFilter && month !== monthFilter) continue;

            const amountCents = Math.max(0, Math.round(Number(b.amount) || 0));
            const paymentId = String(b.paymentId || '');
            const isComp = paymentId.startsWith('comp_') || amountCents === 0;
            const isManual = paymentId.startsWith('manual_');
            const isPaid = isComp || b.markedPaid === true;
            const viaStripe = isPaid && !isComp && !isManual && amountCents > 0;
            const stripeFee = viaStripe ? estimateStripeFeeCents(amountCents) : 0;

            if (!byMonth.has(month)) {
                byMonth.set(month, {
                    month,
                    label: formatMonthLabel(month),
                    paidCents: 0,
                    unpaidCents: 0,
                    complimentaryCount: 0,
                    paidConsultations: 0,
                    unpaidConsultations: 0,
                    stripeFeeCents: 0,
                    patients: new Map()
                });
            }
            const bucket = byMonth.get(month);
            const email = String(b.email || '').toLowerCase().trim() || 'unknown';
            if (!bucket.patients.has(email)) {
                bucket.patients.set(email, {
                    email: b.email || email,
                    patientName: b.patientName || '—',
                    paidCents: 0,
                    unpaidCents: 0,
                    complimentaryCount: 0,
                    stripeFeeCents: 0,
                    consultations: []
                });
            }
            const patient = bucket.patients.get(email);
            if (b.patientName) patient.patientName = b.patientName;

            const entry = {
                bookingRef: b.bookingRef,
                dateIso: b.dateIso || null,
                date: b.date || null,
                time: String(b.time || '').slice(0, 5),
                service: b.service,
                amountCents,
                paid: isPaid,
                complimentary: isComp,
                viaStripe,
                stripeFeeCents: stripeFee
            };

            if (isComp) {
                bucket.complimentaryCount += 1;
                patient.complimentaryCount += 1;
            } else if (isPaid) {
                bucket.paidCents += amountCents;
                bucket.paidConsultations += 1;
                bucket.stripeFeeCents += stripeFee;
                patient.paidCents += amountCents;
                patient.stripeFeeCents += stripeFee;
            } else {
                bucket.unpaidCents += amountCents;
                bucket.unpaidConsultations += 1;
                patient.unpaidCents += amountCents;
            }
            patient.consultations.push(entry);
        }

        const months = Array.from(byMonth.values())
            .map((m) => {
                const breakdown = buildGrossBreakdown(m.paidCents, m.stripeFeeCents);
                return {
                    month: m.month,
                    label: m.label,
                    paidCents: m.paidCents,
                    unpaidCents: m.unpaidCents,
                    complimentaryCount: m.complimentaryCount,
                    paidConsultations: m.paidConsultations,
                    unpaidConsultations: m.unpaidConsultations,
                    stripeFeeCents: m.stripeFeeCents,
                    breakdown,
                    patients: Array.from(m.patients.values())
                        .map((p) => ({
                            ...p,
                            breakdown: buildGrossBreakdown(p.paidCents, p.stripeFeeCents),
                            consultations: p.consultations.sort((a, b) =>
                                String(b.dateIso || b.date || '').localeCompare(String(a.dateIso || a.date || ''))
                            )
                        }))
                        .sort((a, b) => b.paidCents - a.paidCents || a.patientName.localeCompare(b.patientName))
                };
            })
            .sort((a, b) => String(b.month).localeCompare(String(a.month)));

        const totalsPaid = months.reduce((s, m) => s + m.paidCents, 0);
        const totalsStripe = months.reduce((s, m) => s + m.stripeFeeCents, 0);
        const totalsBreakdown = buildGrossBreakdown(totalsPaid, totalsStripe);

        res.json({
            currency: 'eur',
            totals: {
                paidCents: totalsPaid,
                unpaidCents: months.reduce((s, m) => s + m.unpaidCents, 0),
                complimentaryCount: months.reduce((s, m) => s + m.complimentaryCount, 0),
                stripeFeeCents: totalsStripe,
                breakdown: totalsBreakdown
            },
            months
        });
    } catch (err) {
        console.error('GET /api/admin/finances:', err.message);
        res.status(500).json({ error: 'Failed to load finances' });
    }
});

// ─── API: Admin — All patients / consultations table ───
app.get('/api/admin/patients', requireAdmin, async (req, res) => {
    try {
        let bookings;
        if (usePersistentDb) {
            bookings = await db.findAllBookingsWithClinicalNotes();
        } else {
            bookings = bookingsStore.map((booking) => {
                const notes = clinicalNotesStore.find((n) => n.bookingRef === booking.bookingRef);
                return {
                    ...booking,
                    hasClinicalNotes: !!notes,
                    clinicalNotes: notes || null
                };
            });
        }

        const enriched = await enrichBookingsWithSource(bookings);
        // Attach invite phone when booking has none
        if (usePersistentDb) {
            try {
                const invitations = await db.listInvitations(500);
                const phoneByRef = new Map();
                for (const inv of invitations) {
                    if (inv.bookingRef && inv.patientPhone) {
                        phoneByRef.set(String(inv.bookingRef).toUpperCase(), inv.patientPhone);
                    }
                }
                for (const b of enriched) {
                    if (!b.patientPhone && phoneByRef.has(String(b.bookingRef || '').toUpperCase())) {
                        b.patientPhone = phoneByRef.get(String(b.bookingRef).toUpperCase());
                    }
                }
            } catch (e) { /* ignore */ }
        }

        let reviews = [];
        if (usePersistentDb) {
            try {
                reviews = await db.listAllReviews(200);
            } catch (e) {
                console.warn('listAllReviews for patients failed:', e.message);
            }
        }

        const patients = enrichPatientsWithReviews(enriched, reviews).sort((a, b) =>
            bookingSortKey(b).localeCompare(bookingSortKey(a))
        );

        res.json({ patients, count: patients.length });
    } catch (err) {
        console.error('GET /api/admin/patients:', err.message);
        res.status(500).json({ error: 'Failed to load patients' });
    }
});

app.patch('/api/admin/patients/:bookingRef', requireAdmin, express.json(), async (req, res) => {
    if (!usePersistentDb) {
        return res.status(503).json({ error: 'Database required' });
    }
    try {
        const bookingRef = String(req.params.bookingRef || '').toUpperCase();
        const body = req.body || {};
        const fields = {};
        if (Object.prototype.hasOwnProperty.call(body, 'professional')) fields.professional = body.professional;
        if (Object.prototype.hasOwnProperty.call(body, 'markedPaid')) fields.markedPaid = body.markedPaid;
        if (Object.prototype.hasOwnProperty.call(body, 'invoiceSent')) fields.invoiceSent = body.invoiceSent;
        if (Object.prototype.hasOwnProperty.call(body, 'reviewRequested')) fields.reviewRequested = body.reviewRequested;
        if (Object.prototype.hasOwnProperty.call(body, 'consultationCompleted')) fields.consultationCompleted = body.consultationCompleted;
        if (Object.prototype.hasOwnProperty.call(body, 'patientPhone')) fields.patientPhone = body.patientPhone;
        if (Object.prototype.hasOwnProperty.call(body, 'visitFrequency')) fields.visitFrequency = body.visitFrequency;
        if (Object.prototype.hasOwnProperty.call(body, 'patientType')) fields.patientType = body.patientType;

        if (!Object.keys(fields).length) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const updated = await db.updateBookingAdminFields(bookingRef, fields);
        if (!updated) return res.status(404).json({ error: 'Booking not found' });

        let reviewEmailSent = false;
        if (fields.consultationCompleted === true && !updated.followupSent) {
            reviewEmailSent = await sendPostConsultationReviewEmail({
                ...updated,
                consultationCompleted: true
            });
        }

        const patient = reviewEmailSent
            ? { ...updated, followupSent: true, reviewRequested: true, consultationCompleted: true }
            : updated;
        res.json({ ok: true, patient, reviewEmailSent });
    } catch (err) {
        console.error('PATCH /api/admin/patients/:bookingRef:', err.message);
        res.status(500).json({ error: 'Failed to update patient row' });
    }
});

app.delete('/api/admin/patients/:bookingRef', requireAdmin, async (req, res) => {
    if (!usePersistentDb) {
        return res.status(503).json({ error: 'Database required' });
    }
    try {
        const bookingRef = String(req.params.bookingRef || '').toUpperCase();
        const deleted = await db.deleteBookingByRef(bookingRef);
        if (!deleted) return res.status(404).json({ error: 'Booking not found' });
        console.log(`   🗑️  Admin deleted booking ${bookingRef}`);
        res.json({ ok: true, deleted: deleted.bookingRef });
    } catch (err) {
        console.error('DELETE /api/admin/patients/:bookingRef:', err.message);
        res.status(500).json({ error: 'Failed to delete consultation' });
    }
});

function formatDateIsoLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseBookingDateLocal(b) {
    const iso = (b.dateIso && String(b.dateIso).trim()) || '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const fallback = new Date(b.date);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function addVisitFrequency(baseDate, frequency) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const f = String(frequency || '').toLowerCase();
    if (f === 'weekly') {
        d.setDate(d.getDate() + 7);
    } else if (f === 'every_2_weeks' || f === 'biweekly') {
        d.setDate(d.getDate() + 14);
    } else if (f === 'every_6_weeks') {
        d.setDate(d.getDate() + 42);
    } else if (f === 'monthly') {
        d.setMonth(d.getMonth() + 1);
    } else if (f === 'every_2_months') {
        d.setMonth(d.getMonth() + 2);
    } else if (f === 'quarterly') {
        d.setMonth(d.getMonth() + 3);
    } else if (f === 'once' || f === 'occasional' || f === 'as_needed' || !f) {
        d.setDate(d.getDate() + 7);
    } else {
        d.setDate(d.getDate() + 7);
    }
    return d;
}

function visitFrequencyReason(frequency) {
    const map = {
        weekly: 'Weekly recurrence',
        every_2_weeks: 'Every 2 weeks',
        every_6_weeks: 'Every 6 weeks',
        monthly: 'Monthly recurrence',
        every_2_months: 'Every 2 months',
        quarterly: 'Every 3 months',
        once: 'Default +1 week',
        occasional: 'Default +1 week',
        as_needed: 'Default +1 week'
    };
    return map[String(frequency || '')] || 'Same weekday next available week';
}

function pickClosestTime(preferred, available) {
    if (!available || !available.length) return null;
    const norm = String(preferred || '').slice(0, 5);
    if (available.includes(norm)) return norm;
    const toMins = (t) => {
        const [h, m] = String(t).split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const target = toMins(norm || '10:00');
    let best = available[0];
    let bestDiff = Math.abs(toMins(best) - target);
    for (const t of available) {
        const diff = Math.abs(toMins(t) - target);
        if (diff < bestDiff) {
            best = t;
            bestDiff = diff;
        }
    }
    return best;
}

async function findSuggestedSlotsForPatient(latest, visitFrequency) {
    const base = parseBookingDateLocal(latest);
    if (!base) return { suggestion: null, alternatives: [] };
    const preferredTime = String(latest.time || '10:00').slice(0, 5);
    const freq = visitFrequency || latest.visitFrequency || '';
    let cursor = addVisitFrequency(base, freq);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cursor < today && guard < 36) {
        cursor = addVisitFrequency(cursor, freq || 'weekly');
        guard += 1;
    }

    const candidates = [];
    for (let i = 0; i < 10 && candidates.length < 4; i++) {
        const dateIso = formatDateIsoLocal(cursor);
        let available = [];
        try {
            available = await getBookableSlotsForDateIso(dateIso, null, null, true);
        } catch (e) {
            available = [];
        }
        if (available.length) {
            const time = pickClosestTime(preferredTime, available);
            if (time) {
                candidates.push({
                    dateIso,
                    time,
                    exactTime: time === preferredTime,
                    weekday: cursor.toLocaleDateString('en-GB', { weekday: 'long' }),
                    availableCount: available.length
                });
            }
        }
        cursor = addVisitFrequency(cursor, freq || 'weekly');
    }

    const suggestion = candidates[0]
        ? {
            ...candidates[0],
            preferredTime,
            reason: `${visitFrequencyReason(freq)} · prefer ${preferredTime}`
        }
        : null;

    return {
        suggestion,
        alternatives: candidates.slice(1)
    };
}

// Suggest next appointment from recurrence + last day/time
app.get('/api/admin/patients/:bookingRef/suggest-next', requireAdmin, async (req, res) => {
    try {
        const bookingRef = String(req.params.bookingRef || '').toUpperCase();
        let latest = usePersistentDb
            ? await db.findBookingByRef(bookingRef)
            : bookingsStore.find((b) => b.bookingRef === bookingRef);
        if (!latest) return res.status(404).json({ error: 'Booking not found' });

        // Prefer the patient's most recent consultation by email
        if (usePersistentDb && latest.email) {
            try {
                const all = await db.findBookingsByEmail(latest.email, 50);
                const active = (all || []).filter((b) => !b.cancelled);
                if (active.length) {
                    active.sort((a, b) => bookingSortKey(b).localeCompare(bookingSortKey(a)));
                    latest = active[0];
                }
            } catch (e) { /* keep latest */ }
        }

        const frequency = String(req.query.frequency || latest.visitFrequency || '').trim();
        const { suggestion, alternatives } = await findSuggestedSlotsForPatient(latest, frequency);

        res.json({
            patient: {
                patientName: latest.patientName,
                email: latest.email,
                patientPhone: latest.patientPhone || '',
                service: latest.service,
                locale: latest.patientLocale || 'pt',
                professional: latest.professional || '',
                visitFrequency: frequency || latest.visitFrequency || '',
                patientType: latest.patientType || '',
                lastDateIso: latest.dateIso || null,
                lastTime: String(latest.time || '').slice(0, 5),
                bookingRef: latest.bookingRef
            },
            suggestion,
            alternatives
        });
    } catch (err) {
        console.error('GET /api/admin/patients/:bookingRef/suggest-next:', err.message);
        res.status(500).json({ error: 'Failed to suggest next appointment' });
    }
});

// Schedule next appointment for an existing patient
app.post('/api/admin/patients/schedule-next', requireAdmin, express.json(), async (req, res) => {
    if (!usePersistentDb) {
        return res.status(503).json({ error: 'Database required' });
    }
    try {
        const body = req.body || {};
        const sourceRef = String(body.sourceBookingRef || '').toUpperCase();
        const source = sourceRef ? await db.findBookingByRef(sourceRef) : null;
        if (!source && !body.patientEmail) {
            return res.status(400).json({ error: 'Missing patient' });
        }

        const patientName = String(body.patientName || (source && source.patientName) || '').trim();
        const patientEmail = String(body.patientEmail || (source && source.email) || '').trim().toLowerCase();
        const patientPhone = String(body.patientPhone || (source && source.patientPhone) || '').trim();
        const service = bookingServiceTag(body.service || (source && source.service) || 'clinica_geral');
        const dateIso = String(body.dateIso || '').trim();
        const time = normalizeTimeString({ time: String(body.time || '') });
        const locale = normalizePatientLocale(body.locale || (source && source.patientLocale) || 'pt');
        const professional = body.professional != null
            ? String(body.professional).trim()
            : (source && source.professional) || '';
        const visitFrequency = body.visitFrequency != null
            ? String(body.visitFrequency).trim()
            : (source && source.visitFrequency) || '';
        const patientType = body.patientType != null
            ? String(body.patientType).trim()
            : (source && source.patientType) || '';
        const sendInvoice = body.sendInvoice === true || body.sendInvoice === 'true' || body.sendInvoice === 1;

        if (!patientName || !patientEmail || !service || !dateIso || !time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
            return res.status(400).json({ error: 'Invalid date' });
        }

        const available = await getBookableSlotsForDateIso(dateIso, null, null, true);
        if (!available.includes(time)) {
            return res.status(409).json({ error: 'That time slot is no longer available.' });
        }

        const travellerCount = (() => {
            if (service !== 'travel') return 1;
            const n = parseInt(body.travellers, 10);
            if (!Number.isFinite(n) || n < 1) return 1;
            return Math.min(4, n);
        })();
        const hasInsurance = service === 'travel' && (body.hasInsurance === true || body.hasInsurance === 'true' || body.hasInsurance === 1 || body.hasInsurance === 'yes');
        const passengers = Array.from({ length: travellerCount }, (_, i) => ({
            firstName: i === 0 ? patientName : `Traveller ${i + 1}`,
            lastName: ''
        }));

        let amountCents = 0;
        const hasCustomAmount = body.amountCents != null && body.amountCents !== '';
        if (hasCustomAmount) {
            amountCents = Math.round(Number(body.amountCents));
            if (!Number.isFinite(amountCents) || amountCents < 0) {
                return res.status(400).json({ error: 'Invalid custom price' });
            }
            if (amountCents !== 0 && amountCents < 50) {
                return res.status(400).json({ error: 'Custom price must be €0 or at least €0.50' });
            }
            if (amountCents > 500000) {
                return res.status(400).json({ error: 'Custom price is too high' });
            }
        } else {
            try {
                const pricing = computeCheckoutTotalCents({
                    service,
                    passengers,
                    hasInsurance,
                    discountCode: null
                });
                if (pricing.ok) amountCents = pricing.totalCents;
            } catch (e) { /* keep 0 */ }
        }

        const wantInvoice = sendInvoice && amountCents > 0;
        if (wantInvoice && !isStripeConfigured) {
            return res.status(503).json({ error: 'Stripe is not configured — cannot send invoice.' });
        }

        const id = crypto.randomUUID();
        const token = crypto.randomBytes(24).toString('hex');
        let serviceLabel = invitationServiceLabel(service, locale);
        if (amountCents === 0) {
            serviceLabel = `${serviceLabel} · cortesia`;
        } else if (!wantInvoice) {
            serviceLabel = `${serviceLabel} · sem fatura`;
        } else if (hasCustomAmount) {
            serviceLabel = `${serviceLabel} · preço especial`;
        }

        let invitation = await db.insertInvitation({
            id,
            invitationToken: token,
            patientName: patientName.slice(0, 200),
            patientEmail,
            patientPhone: patientPhone.slice(0, 60),
            service: bookingServiceTag(service),
            serviceLabel,
            dateIso,
            time,
            locale,
            amountCents,
            currency: 'eur',
            status: 'pending',
            travellerCount,
            hasInsurance,
            createdBy: (req.session && req.session.clinicUsername) || 'admin'
        });

        // Optional: email Stripe payment invoice and keep slot reserved until paid
        if (wantInvoice) {
            const baseUrl = getBaseUrl(req);
            const session = await createInvitationStripeSession(invitation, baseUrl);
            invitation = await db.updateInvitationStripeSession(id, {
                id: session.id,
                url: session.url,
                expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
            });
            let emailDelivered = true;
            let emailError = null;
            try {
                await sendInvitationEmail(invitation, invitationPayUrl(invitation, baseUrl), baseUrl);
            } catch (e) {
                emailDelivered = false;
                emailError = e.message || 'Email failed';
            }
            return res.json({
                ok: true,
                withoutInvoice: false,
                invoiceSent: true,
                invitation,
                bookingRef: null,
                emailDelivered,
                emailError
            });
        }

        // Default: confirm now, no payment invoice
        const confirmed = await confirmInvitationWithoutPayment(invitation, {
            paymentPrefix: amountCents === 0 ? 'comp' : 'manual'
        });
        invitation = confirmed.invitation;

        const bookingRef = confirmed.bookingRef;
        if (bookingRef) {
            await db.updateBookingAdminFields(bookingRef, {
                professional: professional || null,
                visitFrequency: visitFrequency || null,
                patientType: patientType || null,
                patientPhone: patientPhone || null,
                markedPaid: amountCents === 0,
                invoiceSent: false
            });
        }

        const booking = bookingRef ? await db.findBookingByRef(bookingRef) : null;
        res.json({
            ok: true,
            withoutInvoice: true,
            invoiceSent: false,
            invitation,
            booking,
            bookingRef,
            emailDelivered: confirmed.emailDelivered !== false,
            emailError: confirmed.emailError || null
        });
    } catch (err) {
        console.error('POST /api/admin/patients/schedule-next:', err.message);
        res.status(500).json({ error: err.message || 'Failed to schedule next appointment' });
    }
});

// ─── API: Clinic — Get booking by reference ───
app.get('/api/clinic/booking/:bookingRef', requireAuth, async (req, res) => {
    const bookingRef = req.params.bookingRef.toUpperCase();
    try {
        const booking = usePersistentDb
            ? await db.findBookingByRef(bookingRef)
            : bookingsStore.find((b) => b.bookingRef === bookingRef);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (!staffCanAccessBooking(req, booking)) {
            return res.status(403).json({ error: 'This consultation is assigned to another professional' });
        }

        const notes = usePersistentDb
            ? await db.getClinicalNoteByRef(bookingRef)
            : clinicalNotesStore.find((n) => n.bookingRef === bookingRef);

        res.json({
            ...(() => {
                const { intakeToken, ...safe } = booking;
                return safe;
            })(),
            clinicalNotes: notes || null,
            patientIntake: booking.intake || null,
            hasPatientIntake: !!booking.intakeCompletedAt
        });
    } catch (err) {
        console.error('GET /api/clinic/booking:', err.message);
        res.status(500).json({ error: 'Failed to load booking' });
    }
});

// ─── API: Clinic — Save/Update clinical notes ───
app.post('/api/clinic/notes', requireAuth, express.json(), async (req, res) => {
    const {
        bookingRef,
        consultationDate,
        notes,
        diagnosis,
        prescriptions,
        followUp,
        createdBy
    } = req.body;

    if (!bookingRef) {
        return res.status(400).json({ error: 'Booking reference is required' });
    }

    const refUpper = bookingRef.toUpperCase();

    try {
        const booking = usePersistentDb
            ? await db.findBookingByRef(refUpper)
            : bookingsStore.find((b) => b.bookingRef === refUpper);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (!staffCanAccessBooking(req, booking)) {
            return res.status(403).json({ error: 'This consultation is assigned to another professional' });
        }

        const now = new Date().toISOString();
        let priorCreated = now;
        if (usePersistentDb) {
            const existing = await db.getClinicalNoteByRef(refUpper);
            if (existing && existing.createdAt) {
                priorCreated = existing.createdAt;
            }
        } else {
            const existingIndex = clinicalNotesStore.findIndex((n) => n.bookingRef === refUpper);
            if (existingIndex >= 0) {
                priorCreated = clinicalNotesStore[existingIndex].createdAt;
            }
        }

        const clinicalNote = {
            bookingRef: refUpper,
            consultationDate: consultationDate || booking.date,
            notes: notes || '',
            diagnosis: diagnosis || '',
            prescriptions: prescriptions || '',
            followUp: followUp || '',
            createdBy: createdBy || 'Doctor',
            createdAt: priorCreated,
            updatedAt: now
        };

        if (usePersistentDb) {
            await db.upsertClinicalNote(clinicalNote);
            console.log(`   📝 Clinical notes saved for booking ${bookingRef} (database)`);
        } else {
            const existingIndex = clinicalNotesStore.findIndex((n) => n.bookingRef === refUpper);
            if (existingIndex >= 0) {
                clinicalNotesStore[existingIndex] = clinicalNote;
                console.log(`   📝 Clinical notes updated for booking ${bookingRef}`);
            } else {
                clinicalNotesStore.push(clinicalNote);
                console.log(`   📝 Clinical notes created for booking ${bookingRef}`);
            }
        }

        res.json({
            success: true,
            clinicalNote
        });
    } catch (err) {
        console.error('POST /api/clinic/notes:', err.message);
        res.status(500).json({ error: 'Failed to save clinical notes' });
    }
});

// ─── API: Clinic — Get clinical notes by booking reference ───
app.get('/api/clinic/notes/:bookingRef', requireAuth, async (req, res) => {
    const bookingRef = req.params.bookingRef.toUpperCase();
    try {
        const booking = usePersistentDb
            ? await db.findBookingByRef(bookingRef)
            : bookingsStore.find((b) => b.bookingRef === bookingRef);
        if (booking && !staffCanAccessBooking(req, booking)) {
            return res.status(403).json({ error: 'This consultation is assigned to another professional' });
        }
        const notes = usePersistentDb
            ? await db.getClinicalNoteByRef(bookingRef)
            : clinicalNotesStore.find((n) => n.bookingRef === bookingRef);

        if (!notes) {
            return res.status(404).json({ error: 'Clinical notes not found' });
        }

        res.json(notes);
    } catch (err) {
        console.error('GET /api/clinic/notes:', err.message);
        res.status(500).json({ error: 'Failed to load clinical notes' });
    }
});

// ─── API: Admin — Get schedule settings ───
app.get('/api/admin/schedule', requireAdmin, (req, res) => {
    res.json(scheduleStore);
});

// ─── API: Admin — Update schedule settings ───
app.post('/api/admin/schedule', requireAdmin, express.json(), async (req, res) => {
    try {
        applySchedulePatch(req.body || {});
        scheduleStore.updatedAt = new Date().toISOString();
        await persistScheduleStore();
        console.log('   📅 Schedule settings updated');
        res.json({ success: true, schedule: scheduleStore });
    } catch (err) {
        console.error('POST /api/admin/schedule:', err.message);
        res.status(500).json({ error: 'Failed to persist schedule' });
    }
});

app.post('/api/clinic/schedule', requireAuth, express.json(), async (req, res) => {
    try {
        applySchedulePatch(req.body || {});
        scheduleStore.updatedAt = new Date().toISOString();
        await persistScheduleStore();
        console.log('   📅 Clinic schedule settings updated');
        res.json({ success: true, schedule: scheduleStore });
    } catch (err) {
        console.error('POST /api/clinic/schedule:', err.message);
        res.status(500).json({ error: 'Failed to persist schedule' });
    }
});

// ─── API: Public — Get schedule structure (for calendar rendering) ───
app.get('/api/schedule', (req, res) => {
    // Return schedule structure without sensitive data
    res.json({
        workingHours: scheduleStore.workingHours,
        slotDuration: scheduleStore.slotDuration,
        blockedDates: scheduleStore.blockedDates,
        dayOverrides: scheduleStore.dayOverrides,
        timezone: scheduleStore.timezone,
        smartSlotGrouping: !!scheduleStore.smartSlotGrouping
    });
});

async function loadNextSlotsBody(limit, withinHours) {
    const cacheKey = `${limit}:${withinHours}`;
    const hit = nextSlotsCache.get(cacheKey);
    if (hit && Date.now() - hit.ts < NEXT_SLOTS_TTL_MS) {
        return { body: hit.body, cache: 'HIT' };
    }
    if (nextSlotsInflight.has(cacheKey)) {
        const body = await nextSlotsInflight.get(cacheKey);
        return { body, cache: 'COALESCE' };
    }
    const pending = (async () => {
        const maxDays = Math.min(14, Math.max(7, Math.ceil(withinHours / 24) + 1));
        const slots = await getNextBookableSlots(limit, maxDays, withinHours);
        const body = {
            slots,
            withinHours,
            hasSlotsWithinHorizon: slots.length > 0,
            timezone: scheduleStore.timezone || 'Europe/Lisbon',
            service: 'clinica_geral',
            price: '€39',
            holdMinutes: Math.round(SLOT_HOLD_MS / 60000)
        };
        nextSlotsCache.set(cacheKey, { ts: Date.now(), body });
        return body;
    })();
    nextSlotsInflight.set(cacheKey, pending);
    try {
        const body = await pending;
        return { body, cache: hit ? 'STALE-REFRESH' : 'MISS' };
    } finally {
        nextSlotsInflight.delete(cacheKey);
    }
}

app.get('/api/next-slots', rateLimitNextSlots, async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 8);
        const withinHours = Math.min(Math.max(parseInt(req.query.withinHours, 10) || 168, 1), 336);
        const { body, cache } = await loadNextSlotsBody(limit, withinHours);
        res.set('Cache-Control', `public, max-age=${Math.ceil(NEXT_SLOTS_TTL_MS / 1000)}, stale-while-revalidate=60`);
        res.set('X-Slots-Cache', cache);
        res.json(body);
    } catch (err) {
        console.error('GET /api/next-slots:', err.message);
        res.status(500).json({ error: 'Failed to load next slots', slots: [], withinHours: 24 });
    }
});

app.post('/api/slot-hold', rateLimitSlotHold, async (req, res) => {
    try {
        const parsed = parseSlotId(req.body && req.body.slot);
        const dateIso = parsed
            ? parsed.date
            : String((req.body && req.body.date) || '').trim();
        const time = parsed
            ? parsed.time
            : normalizeTimeString({ time: (req.body && req.body.time) || '' });
        if (!parsed && !(dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso) && time)) {
            return res.status(400).json({ error: 'Invalid slot' });
        }
        const slotId = parsed ? parsed.id : slotIdFromDateTime(dateIso, time);
        const service = bookingServiceTag((req.body && req.body.service) || 'clinica_geral');
        const allowed = await getBookableSlotsForDateIso(dateIso, null, null, false);
        const holderToken = readCookieValue(req, 'lon_hold') || crypto.randomBytes(16).toString('hex');

        let existing = null;
        if (usePersistentDb) {
            try { existing = await db.findSlotHoldBySlot(dateIso, time); } catch (e) { /* ignore */ }
        }
        if (!existing) {
            existing = [...slotHoldsById.values()].find(
                (h) => h.dateIso === dateIso && h.time === time && h.expiresAt > Date.now()
            );
        }

        if (existing && existing.holderToken === holderToken) {
            const expiresAt = Date.now() + SLOT_HOLD_MS;
            existing.expiresAt = expiresAt;
            slotHoldsById.set(existing.id, existing);
            if (usePersistentDb) {
                try { await db.updateSlotHoldExpiry(existing.id, expiresAt); } catch (err) {
                    console.error('refresh hold:', err.message);
                }
            }
            setHoldCookie(req, res, holderToken);
            return res.json(memoryHoldToPublic(existing));
        }

        if (existing && existing.holderToken !== holderToken) {
            return res.status(409).json({ error: 'That time slot is being reserved by someone else' });
        }

        if (!allowed.includes(time)) {
            return res.status(409).json({ error: 'That time slot is not available' });
        }

        const previous = usePersistentDb
            ? await db.findSlotHoldByHolder(holderToken).catch(() => null)
            : [...slotHoldsById.values()].find((h) => h.holderToken === holderToken && h.expiresAt > Date.now());
        if (previous && previous.slotId !== slotId) {
            await releaseHold(previous.id);
        }

        const hold = {
            id: crypto.randomBytes(12).toString('hex'),
            slotId,
            dateIso,
            time,
            service,
            holderToken,
            expiresAt: Date.now() + SLOT_HOLD_MS
        };
        let saved = hold;
        if (usePersistentDb) {
            saved = await db.insertSlotHold(hold);
            if (!saved) {
                return res.status(409).json({ error: 'That time slot is being reserved by someone else' });
            }
        }
        slotHoldsById.set(saved.id, saved);
        invalidateNextSlotsCache();
        setHoldCookie(req, res, holderToken);
        res.json(memoryHoldToPublic(saved));
    } catch (err) {
        console.error('POST /api/slot-hold:', err.message);
        res.status(500).json({ error: 'Failed to reserve slot' });
    }
});

app.get('/api/renewal-prefill', rateLimitAnalytics, (req, res) => {
    const parsed = verifyRenewalFollowupToken(req.query.t || req.query.renew);
    if (!parsed) {
        return res.status(400).json({ error: 'Invalid or expired link' });
    }
    res.set('Cache-Control', 'no-store');
    res.json({
        email: parsed.email,
        name: parsed.name,
        service: 'renovacao'
    });
});

// ─── API: Admin — Get available time slots for a date ───
// Public (booking flow) respects smart grouping.
// Admin tools pass ?allSlots=1 to receive the full grid (admin sees every free time).
app.get('/api/admin/available-slots', async (req, res) => {
    const { date } = req.query; // Format: YYYY-MM-DD

    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
    if (!dateMatch) {
        return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const dateObj = new Date(year, month - 1, day);
    if (Number.isNaN(dateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid date value' });
    }
    const dateStr = date;
    const daySchedule = getEffectiveDaySchedule(dateStr);

    if (!daySchedule.enabled) {
        const reason =
            daySchedule.source === 'blocked'
                ? 'Date blocked'
                : daySchedule.source === 'override'
                  ? 'Day closed (custom)'
                  : 'Day not enabled';
        return res.json({ available: [], date, reason, effective: daySchedule });
    }

    try {
        const excludeInvitationId = req.query.excludeInvitation
            ? String(req.query.excludeInvitation)
            : null;
        const allSlots = req.query.allSlots === '1' || req.query.allSlots === 'true';
        const holderToken = readCookieValue(req, 'lon_hold');
        let excludeHoldId = null;
        if (holderToken) {
            try {
                const mine = usePersistentDb
                    ? await db.findSlotHoldByHolder(holderToken)
                    : [...slotHoldsById.values()].find((h) => h.holderToken === holderToken && h.expiresAt > Date.now());
                if (mine && mine.dateIso === dateStr) excludeHoldId = mine.id;
            } catch (e) { /* ignore */ }
        }
        const available = await getBookableSlotsForDateIso(dateStr, null, excludeInvitationId, allSlots, excludeHoldId);
        const referer = req.get('referer') || '';
        let bookingPath = '';
        try {
            bookingPath = new URL(referer, seo.SITE_ORIGIN).pathname || '';
        } catch {
            bookingPath = '';
        }
        if (
            !allSlots &&
            !isStaffRequest(req) &&
            /^\/(marcar|book-consultation|book\.html)/i.test(bookingPath)
        ) {
            emitServerAnalytics(
                'date_select',
                {
                    pagePath: bookingPath.slice(0, 240),
                    referrer: referer,
                    props: { via: 'slots-api', surface: 'booking', funnel: 'patient_booking' }
                },
                req
            ).catch(() => {});
        }
        res.json({
            available,
            date,
            workingHours: {
                enabled: daySchedule.enabled,
                start: daySchedule.start,
                end: daySchedule.end
            },
            effective: daySchedule,
            smartSlotGrouping: !!scheduleStore.smartSlotGrouping,
            bypassedSmartGrouping: allSlots
        });
    } catch (err) {
        console.error('GET /api/admin/available-slots:', err.message);
        res.status(500).json({ error: 'Failed to load available slots' });
    }
});

/* ========================================
   BOOKING INVITATIONS (admin pre-books for patient, patient pays via emailed link)
======================================== */

const INVITATION_EMAIL_I18N = {
    pt: {
        subject: (label) => `A sua consulta na Lon Clinic — ${label}`,
        greeting: (name) => `Olá ${name},`,
        intro: 'A sua marcação foi criada pela equipa da Lon Clinic. Está reservada e à sua espera — basta concluir o pagamento para confirmar.',
        slotLabel: 'Data e hora',
        serviceLabel: 'Tipo de consulta',
        amountLabel: 'Valor',
        payNow: 'Pagar e confirmar consulta',
        payNote: 'O pagamento é processado em segurança pela Stripe. Este link é válido até ao dia da consulta. A consulta só fica confirmada após o pagamento.',
        accessTitle: 'Como aceder à consulta',
        accessBody: 'À hora marcada, abra o link abaixo para entrar na sala de vídeo. Não precisa de instalar nada.',
        joinVideoButton: 'Abrir sala de vídeo',
        portalLine: (url) => `Pode também consultar e gerir a sua marcação aqui: <a href="${url}">${url}</a>`,
        footer: 'Se tiver qualquer dúvida, responda a este email.'
    },
    en: {
        subject: (label) => `Your Lon Clinic appointment — ${label}`,
        greeting: (name) => `Hi ${name},`,
        intro: 'Your appointment has been pre-booked by the Lon Clinic team and is reserved for you — simply complete payment to confirm.',
        slotLabel: 'Date & time',
        serviceLabel: 'Consultation',
        amountLabel: 'Amount',
        payNow: 'Pay & confirm appointment',
        payNote: 'Payment is processed securely by Stripe. This link remains valid until the day of your consultation. The appointment is confirmed only once payment is complete.',
        accessTitle: 'How to access the consultation',
        accessBody: 'At your scheduled time, open the link below to join the video room. No software required.',
        joinVideoButton: 'Open video room',
        portalLine: (url) => `You can also view and manage your booking here: <a href="${url}">${url}</a>`,
        footer: 'If you have any questions, just reply to this email.'
    },
    es: {
        subject: (label) => `Su consulta en Lon Clinic — ${label}`,
        greeting: (name) => `Hola ${name},`,
        intro: 'Su cita ha sido creada por el equipo de Lon Clinic y está reservada para usted — sólo falta completar el pago para confirmarla.',
        slotLabel: 'Fecha y hora',
        serviceLabel: 'Tipo de consulta',
        amountLabel: 'Importe',
        payNow: 'Pagar y confirmar cita',
        payNote: 'El pago se procesa de forma segura mediante Stripe. Este enlace es válido hasta el día de la consulta. La cita queda confirmada tras el pago.',
        accessTitle: 'Cómo acceder a la consulta',
        accessBody: 'A la hora acordada, abra el enlace para entrar en la sala de vídeo. No necesita instalar nada.',
        joinVideoButton: 'Abrir sala de vídeo',
        portalLine: (url) => `También puede consultar y gestionar su cita aquí: <a href="${url}">${url}</a>`,
        footer: 'Si tiene cualquier duda, responda a este correo.'
    }
};

function formatInvitationDateLabel(dateIso, locale) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
    if (!m) return dateIso || '';
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const localeTag = locale === 'pt' ? 'pt-PT' : locale === 'es' ? 'es-ES' : 'en-GB';
    try {
        return d.toLocaleDateString(localeTag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
        return dateIso;
    }
}

function buildInvitationEmail(invitation, paymentUrl, baseUrl) {
    const localeKey = (invitation.locale || 'pt').toLowerCase();
    const t = INVITATION_EMAIL_I18N[localeKey] || INVITATION_EMAIL_I18N.pt;
    const dateLabel = formatInvitationDateLabel(invitation.dateIso, localeKey);
    const time = (invitation.time || '').slice(0, 5);
    const priceLabel = `€${(invitation.amountCents / 100).toFixed(2)}`;
    const serviceLabel = invitation.serviceLabel || invitation.service;
    const subject = t.subject(serviceLabel);
    const portalUrl = emailLink(
        `${baseUrl}/patient-portal?email=${encodeURIComponent(invitation.patientEmail)}`,
        datedCampaign('invite_pay'),
        'portal'
    );
    const doxyUrl = doxyUrlFromEmailData({ doxyUrl: invitation.doxyUrl });
    const doxyHtml = doxyUrl
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0 0;"><tr><td>
             <a href="${escapeHtml(doxyUrl)}" target="_blank" rel="noopener" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;text-align:center;text-decoration:none;padding:14px 28px;border-radius:10px;">${t.joinVideoButton}</a>
           </td></tr></table>`
        : '';
    const html = `<!DOCTYPE html><html lang="${localeKey}"><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f7fa;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">Lon Clinic</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.55;color:#0f172a;">${t.greeting(invitation.patientName)}</p>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#334155;">${t.intro}</p>
        </td></tr>
        <tr><td style="padding:20px 28px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:12px;color:#64748b;display:block;text-transform:uppercase;letter-spacing:0.06em;">${t.slotLabel}</span>
              <strong style="font-size:15px;color:#0f172a;display:block;margin-top:4px;">${dateLabel} · ${time}</strong>
            </td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:12px;color:#64748b;display:block;text-transform:uppercase;letter-spacing:0.06em;">${t.serviceLabel}</span>
              <strong style="font-size:15px;color:#0f172a;display:block;margin-top:4px;">${serviceLabel}</strong>
            </td></tr>
            <tr><td style="padding:14px 16px;">
              <span style="font-size:12px;color:#64748b;display:block;text-transform:uppercase;letter-spacing:0.06em;">${t.amountLabel}</span>
              <strong style="font-size:15px;color:#0f172a;display:block;margin-top:4px;">${priceLabel}</strong>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;" align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td>
            <a href="${paymentUrl}" target="_blank" rel="noopener" style="display:inline-block;background-color:#1a6641;border:1px solid #14512f;color:#ffffff !important;font-family:inherit;font-size:16px;font-weight:600;text-align:center;text-decoration:none;padding:16px 36px;border-radius:10px;">${t.payNow}</a>
          </td></tr></table>
          <p style="margin:14px 0 0;font-size:12px;color:#64748b;line-height:1.5;">${t.payNote}</p>
        </td></tr>
        ${doxyUrl ? `
        <tr><td style="padding:24px 28px 8px;border-top:1px solid #e2e8f0;">
          <h2 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${t.accessTitle}</h2>
          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#334155;">${t.accessBody}</p>
          ${doxyHtml}
        </td></tr>` : ''}
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${t.portalLine(escapeHtml(portalUrl))}</p>
          <p style="margin:14px 0 0;font-size:13px;color:#64748b;line-height:1.6;">${t.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    const text = `${t.greeting(invitation.patientName)}\n\n${t.intro}\n\n${t.slotLabel}: ${dateLabel} · ${time}\n${t.serviceLabel}: ${serviceLabel}\n${t.amountLabel}: ${priceLabel}\n\n${t.payNow}: ${paymentUrl}\n\n${doxyUrl ? `${t.accessTitle}\n${t.accessBody}\n${doxyUrl}\n\n` : ''}${t.portalLine(portalUrl).replace(/<[^>]+>/g, '')}\n\n${t.footer}\n`;
    return { subject, html, text };
}

async function sendInvitationEmail(invitation, paymentUrl, baseUrl) {
    const { subject, html, text } = buildInvitationEmail(invitation, paymentUrl, baseUrl);
    return deliverEmail({
        from: process.env.EMAIL_FROM || 'Lon Clinic <info@lonclinic.com>',
        to: invitation.patientEmail,
        subject,
        html,
        text
    });
}

const INVITATION_SERVICE_LABEL = {
    clinica_geral: { pt: 'Consulta de Clínica Geral', en: 'General Practice Consultation', es: 'Consulta de Medicina General' },
    urgente: { pt: 'Consulta Médica Urgente', en: 'Urgent Medical Consultation', es: 'Consulta Médica Urgente' },
    infeccao_urinaria: { pt: 'Consulta de Infeção Urinária', en: 'Urinary Tract Infection Consultation', es: 'Consulta de Infección Urinaria' },
    travel: { pt: 'Consulta do Viajante', en: 'Travel Medicine Consultation', es: 'Consulta del Viajero' },
    saude_mental: { pt: 'Consulta de Saúde Mental', en: 'Mental Health Consultation', es: 'Consulta de Salud Mental' },
    burnout: { pt: 'Consulta Especializada em Burnout', en: 'Specialized Burnout Consultation', es: 'Consulta especializada en burnout' },
    burnout_mensal: { pt: 'Subscrição Anti-Burnout', en: 'Anti-Burnout Subscription', es: 'Suscripción Anti-Burnout' },
    burnout_programa: { pt: 'Programa Anti-Burnout (8 sessões)', en: 'Anti-Burnout Program (8 sessions)', es: 'Programa anti-burnout (8 sesiones)' },
    nutricao_programa: { pt: 'Programa Nutrição (6 meses)', en: 'Nutrition Program (6 months)', es: 'Programa de nutrición (6 meses)' },
    nutricao_completo: { pt: 'Programa Completo (6 meses)', en: 'Complete Metabolic Program (6 months)', es: 'Programa completo (6 meses)' },
    nutricao_completo_reforcado: { pt: 'Programa Completo — entrada reforçada', en: 'Complete Program — higher first payment', es: 'Programa completo — entrada reforzada' },
    longevidade: { pt: 'Consulta de Longevidade', en: 'Longevity Consultation', es: 'Consulta de Longevidad' },
    renovacao: { pt: 'Renovação de Receita', en: 'Prescription Renewal', es: 'Renovación de Receta' }
};
function invitationServiceLabel(service, locale) {
    const k = String(service || '').toLowerCase();
    const loc = (locale || 'pt').toLowerCase();
    if (INVITATION_SERVICE_LABEL[k] && INVITATION_SERVICE_LABEL[k][loc]) {
        return INVITATION_SERVICE_LABEL[k][loc];
    }
    if (INVITATION_SERVICE_LABEL[k]) return INVITATION_SERVICE_LABEL[k].pt;
    return SERVICE_LABELS[k] || k || 'Consultation';
}

function addDaysToDateIso(dateIso, days) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
    if (!m) return null;
    const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(days || 0));
    const d = new Date(utc);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Payment links stay valid through the end of the consultation calendar day (clinic timezone). */
function invitationPaymentDeadlineUtcMs(invitation) {
    const tz = scheduleStore.timezone || 'Europe/Lisbon';
    const nextDay = addDaysToDateIso(invitation && invitation.dateIso, 1);
    if (!nextDay) return NaN;
    return localWallTimeToUtcMs(nextDay, '00:00', tz);
}

function isInvitationPaymentDeadlinePassed(invitation) {
    const deadline = invitationPaymentDeadlineUtcMs(invitation);
    return Number.isFinite(deadline) && Date.now() >= deadline;
}

function invitationPayUrl(invitation, baseUrl) {
    return `${baseUrl}/invite/${encodeURIComponent(invitation.invitationToken)}`;
}

function renderInviteStatusHtml({ kind, locale }) {
    const loc = (locale || 'pt').toLowerCase();
    const lang = loc === 'en' || loc === 'es' ? loc : 'pt';
    const copy = {
        pt: {
            missing: { title: 'Link inválido', body: 'Este link de pagamento não é válido. Se precisar de ajuda, contacte a Lon Clinic.' },
            cancelled: { title: 'Convite cancelado', body: 'Este convite já não está activo. Contacte-nos se ainda pretender marcar a consulta.' },
            expired: { title: 'Link expirado', body: 'O prazo de pagamento terminou no dia da consulta. Contacte a Lon Clinic para remarcar.' },
            error: { title: 'Não foi possível abrir o pagamento', body: 'Tente novamente dentro de momentos. Se o problema continuar, contacte a Lon Clinic.' },
            home: 'Voltar ao site'
        },
        en: {
            missing: { title: 'Invalid link', body: 'This payment link is not valid. Please contact Lon Clinic if you need help.' },
            cancelled: { title: 'Invitation cancelled', body: 'This invitation is no longer active. Contact us if you still wish to book.' },
            expired: { title: 'Link expired', body: 'The payment window ended on the day of the consultation. Please contact Lon Clinic to reschedule.' },
            error: { title: 'Could not open payment', body: 'Please try again in a moment. If this continues, contact Lon Clinic.' },
            home: 'Back to the website'
        },
        es: {
            missing: { title: 'Enlace no válido', body: 'Este enlace de pago no es válido. Contacte a Lon Clinic si necesita ayuda.' },
            cancelled: { title: 'Invitación cancelada', body: 'Esta invitación ya no está activa. Contáctenos si aún desea reservar.' },
            expired: { title: 'Enlace caducado', body: 'El plazo de pago terminó el día de la consulta. Contacte a Lon Clinic para reprogramar.' },
            error: { title: 'No se pudo abrir el pago', body: 'Inténtelo de nuevo en unos momentos. Si continúa, contacte a Lon Clinic.' },
            home: 'Volver al sitio'
        }
    }[lang];
    const msg = copy[kind] || copy.error;
    return `<!DOCTYPE html>
<html lang="${lang}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${msg.title} — Lon Clinic</title>
<style>
body{margin:0;font-family:Inter,system-ui,sans-serif;background:#eaf2fb;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{max-width:440px;background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 12px 40px rgba(15,23,42,.08)}
h1{margin:0 0 12px;font-size:22px}p{margin:0 0 22px;line-height:1.55;color:#334155}
a{display:inline-block;background:#1a6641;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px}
</style></head>
<body><div class="card"><h1>${msg.title}</h1><p>${msg.body}</p><a href="/">${copy.home}</a></div></body></html>`;
}

function invitationStripeExpiresAtUnix(invitation) {
    const nowSec = Math.floor(Date.now() / 1000);
    const minExp = nowSec + 30 * 60;
    const maxExp = nowSec + 23 * 60 * 60;
    const deadlineMs = invitationPaymentDeadlineUtcMs(invitation);
    const deadlineSec = Number.isFinite(deadlineMs) ? Math.floor(deadlineMs / 1000) : maxExp;
    return Math.min(maxExp, Math.max(minExp, deadlineSec));
}

async function expireStalePendingInvitations() {
    if (!usePersistentDb) return;
    try {
        const pending = await db.listPendingInvitations(500);
        for (const inv of pending) {
            if (!isInvitationPaymentDeadlinePassed(inv)) continue;
            if (stripe && inv.stripeSessionId) {
                try { await stripe.checkout.sessions.expire(inv.stripeSessionId); } catch (e) { /* ignore */ }
            }
            await db.cancelInvitation(inv.id);
            console.log(`   ↩️  Invitation ${inv.id} released (consultation day passed)`);
        }
    } catch (err) {
        console.error('expireStalePendingInvitations:', err.message);
    }
}

const inviteCheckoutInFlight = new Map();

async function ensureOpenInvitationStripeSession(invitation, baseUrl) {
    if (!stripe) throw new Error('Stripe is not configured');
    const existingId = invitation.stripeSessionId;
    const expiresAtMs = invitation.stripeSessionExpiresAt
        ? Date.parse(invitation.stripeSessionExpiresAt)
        : NaN;
    const stillFresh = Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() > 2 * 60 * 1000;
    if (existingId && stillFresh) {
        try {
            const existing = await stripe.checkout.sessions.retrieve(existingId);
            if (existing && existing.status === 'complete') {
                return { session: existing, invitation };
            }
            if (existing && existing.status === 'open' && existing.url) {
                return { session: existing, invitation };
            }
        } catch (e) { /* mint a new session */ }
    }
    const session = await createInvitationStripeSession(invitation, baseUrl);
    const updated = await db.updateInvitationStripeSession(invitation.id, {
        id: session.id,
        url: session.url,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
    });
    return { session, invitation: updated || invitation };
}

async function getOrCreateInvitationCheckout(invitation, baseUrl) {
    const id = invitation.id;
    if (inviteCheckoutInFlight.has(id)) {
        return inviteCheckoutInFlight.get(id);
    }
    const pending = ensureOpenInvitationStripeSession(invitation, baseUrl).finally(() => {
        inviteCheckoutInFlight.delete(id);
    });
    inviteCheckoutInFlight.set(id, pending);
    return pending;
}

async function createInvitationStripeSession(invitation, baseUrl) {
    if (!stripe) throw new Error('Stripe is not configured');
    const travellerCount = Math.max(1, Math.min(4, parseInt(invitation.travellerCount, 10) || 1));
    const metadata = {
        service: bookingServiceTag(invitation.service),
        service_label: (invitation.serviceLabel || '').substring(0, 500),
        date: invitation.dateIso,
        time: invitation.time,
        date_iso: invitation.dateIso,
        contact_email: invitation.patientEmail,
        contact_phone: invitation.patientPhone || '',
        traveller_count: String(travellerCount),
        has_insurance: invitation.hasInsurance ? 'medicare' : 'none',
        locale: normalizePatientLocale(invitation.locale || 'pt'),
        invitation_id: invitation.id,
        p1_name: invitation.patientName.substring(0, 500)
    };
    // Mirror the same shape as the regular checkout for downstream finalisation.
    for (let i = 2; i <= travellerCount; i++) {
        metadata[`p${i}_name`] = `Traveller ${i}`;
    }
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_creation: 'always',
        customer_email: invitation.patientEmail,
        payment_intent_data: { receipt_email: invitation.patientEmail },
        line_items: [{
            price_data: {
                currency: invitation.currency || 'eur',
                product_data: {
                    name: invitation.serviceLabel || invitation.service,
                    description: `Online consultation — ${invitation.dateIso} at ${invitation.time}`
                },
                unit_amount: invitation.amountCents
            },
            quantity: 1
        }],
        metadata,
        success_url: `${baseUrl}/book-consultation?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/book-consultation?cancelled=true&invitation=${invitation.id}`,
        // Stripe Checkout max lifetime is 24h; our /invite/:token link is re-minted until the consultation day.
        expires_at: invitationStripeExpiresAtUnix(invitation)
    });
    return session;
}

function bookingDataFromInvitation(invitation, bookingRef) {
    const travellerCount = Math.max(1, Math.min(4, parseInt(invitation.travellerCount, 10) || 1));
    const passengers = [invitation.patientName];
    for (let i = 2; i <= travellerCount; i++) {
        passengers.push(`Traveller ${i}`);
    }
    const amountCents = Math.max(0, Math.round(Number(invitation.amountCents) || 0));
    return {
        bookingRef,
        patientName: invitation.patientName,
        email: invitation.patientEmail,
        service: invitation.service,
        serviceLabel: invitation.serviceLabel || invitation.service,
        date: invitation.dateIso,
        time: invitation.time,
        amount: amountCents,
        currency: invitation.currency || 'eur',
        travellerCount,
        hasInsurance: !!invitation.hasInsurance,
        passengers,
        travelDest: '',
        travelDates: '',
        contactPhone: invitation.patientPhone || '',
        locale: normalizePatientLocale(invitation.locale || 'pt')
    };
}

/** @deprecated Use bookingDataFromInvitation */
function bookingDataFromComplimentaryInvitation(invitation, bookingRef) {
    return bookingDataFromInvitation(invitation, bookingRef);
}

/**
 * Confirm an invitation immediately without Stripe (complimentary or "no invoice yet").
 * paymentPrefix: 'comp' for free, 'manual' when price is recorded but not invoiced.
 */
async function confirmInvitationWithoutPayment(invitation, { paymentPrefix = 'manual' } = {}) {
    const prefix = paymentPrefix === 'comp' ? 'comp' : 'manual';
    const paymentId = `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
    const shortId = paymentId.slice(-8).toUpperCase();
    const bookingRef = `LC-${shortId}`;
    const bookingData = bookingDataFromInvitation(invitation, bookingRef);
    const amountCents = bookingData.amount;

    const record = {
        bookingRef,
        email: String(invitation.patientEmail || '').toLowerCase().trim(),
        service: bookingServiceTag(invitation.service),
        date: invitation.dateIso,
        time: invitation.time,
        dateIso: invitation.dateIso,
        patientName: invitation.patientName,
        patientPhone: invitation.patientPhone || '',
        travellerCount: bookingData.travellerCount,
        amount: amountCents,
        currency: invitation.currency || 'eur',
        paymentId,
        patientLocale: normalizePatientLocale(invitation.locale || 'pt'),
        cancelled: false,
        rescheduleCount: 0,
        reminderSent: false,
        reminder1hSent: false,
        followupSent: false,
        createdAt: new Date().toISOString()
    };

    const inserted = await db.insertBooking(record);
    if (!inserted) {
        throw new Error('Booking already exists for this invitation');
    }
    const updated = await db.markInvitationPaid(invitation.id, bookingRef);

    let emailDelivered = true;
    let emailError = null;
    try {
        await sendConfirmationEmail(bookingData);
        await sendAdminNotificationEmail(bookingData);
    } catch (e) {
        emailDelivered = false;
        emailError = e.message || 'Email failed';
        console.error('   ⚠️  Direct confirmation email failed:', emailError);
    }

    const kind = amountCents === 0 ? 'Complimentary' : 'No-invoice';
    console.log(`   ✅ ${kind} booking ${bookingRef} confirmed for ${invitation.patientEmail} (€${(amountCents / 100).toFixed(2)})`);
    return { bookingRef, invitation: updated || invitation, bookingData, emailDelivered, emailError };
}

async function confirmComplimentaryInvitation(invitation) {
    return confirmInvitationWithoutPayment(invitation, { paymentPrefix: 'comp' });
}

// ─── API: Admin — Create booking invitation ───
app.post('/api/admin/invitations', requireAdmin, express.json(), async (req, res) => {
    if (!usePersistentDb) {
        return res.status(503).json({ error: 'Booking invitations require a database (DATABASE_URL).' });
    }
    try {
        const {
            patientName,
            patientEmail,
            patientPhone,
            service,
            dateIso,
            time,
            locale,
            travellers,
            hasInsurance,
            amountCents: customAmountCents,
            confirmWithoutInvoice
        } = req.body || {};

        if (!patientName || !patientEmail || !service || !dateIso || !time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(patientEmail))) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateIso))) {
            return res.status(400).json({ error: 'Invalid date (expected YYYY-MM-DD)' });
        }
        const normTime = normalizeTimeString({ time: String(time) });
        if (!normTime) {
            return res.status(400).json({ error: 'Invalid time' });
        }

        const travellerCount = (() => {
            if (service !== 'travel') return 1;
            const n = parseInt(travellers, 10);
            if (!Number.isFinite(n) || n < 1) return 1;
            return Math.min(4, n);
        })();
        const passengers = Array.from({ length: travellerCount }, (_, i) => ({
            firstName: i === 0 ? patientName : `Traveller ${i + 1}`,
            lastName: ''
        }));

        let amountCents;
        const hasCustomAmount = customAmountCents != null && customAmountCents !== '';
        if (hasCustomAmount) {
            const n = Math.round(Number(customAmountCents));
            if (!Number.isFinite(n) || (n !== 0 && n < 50)) {
                return res.status(400).json({ error: 'Custom price must be €0 (complimentary) or at least €0.50' });
            }
            if (n > 500000) {
                return res.status(400).json({ error: 'Custom price is too high' });
            }
            amountCents = n;
        } else {
            const pricing = computeCheckoutTotalCents({
                service,
                passengers,
                hasInsurance: !!hasInsurance,
                discountCode: null
            });
            if (!pricing.ok) {
                return res.status(400).json({ error: pricing.error });
            }
            amountCents = pricing.totalCents;
        }

        const isComplimentary = amountCents === 0;
        const skipInvoice = isComplimentary || !!confirmWithoutInvoice;
        if (!skipInvoice && !isStripeConfigured) {
            return res.status(503).json({ error: 'Stripe is not configured.' });
        }

        // Admin can book any free slot regardless of smart grouping.
        // 07:00–08:30 and 21:00 are always offerable on an open day so
        // morning/evening invites work even if weekly hours end at 17:00.
        const allowed = await isInvitationSlotAllowed(dateIso, normTime, null);
        if (!allowed) {
            return res.status(409).json({ error: 'That time slot is no longer available.' });
        }

        const id = crypto.randomUUID();
        const token = crypto.randomBytes(24).toString('hex');
        const normalizedLocale = normalizePatientLocale(locale || 'pt');
        let serviceLabel = invitationServiceLabel(service, normalizedLocale);
        if (service === 'travel') {
            const suffix = travellerCount > 1 ? ` (${travellerCount} travellers)` : '';
            const insuranceTag = hasInsurance ? ' · Medicare' : '';
            serviceLabel = `${serviceLabel}${suffix}${insuranceTag}`;
        }
        if (isComplimentary) {
            serviceLabel = `${serviceLabel} · cortesia`;
        } else if (confirmWithoutInvoice) {
            serviceLabel = `${serviceLabel} · sem fatura`;
        } else if (hasCustomAmount) {
            serviceLabel = `${serviceLabel} · preço especial`;
        }

        let invitation = await db.insertInvitation({
            id,
            invitationToken: token,
            patientName: String(patientName).trim().slice(0, 200),
            patientEmail: String(patientEmail).trim().toLowerCase(),
            patientPhone: patientPhone ? String(patientPhone).trim().slice(0, 60) : '',
            service: bookingServiceTag(service),
            serviceLabel,
            dateIso,
            time: normTime,
            locale: normalizedLocale,
            amountCents,
            currency: 'eur',
            status: 'pending',
            travellerCount,
            hasInsurance: !!hasInsurance,
            createdBy: (req.session && req.session.clinicUsername) || 'admin'
        });

        const baseUrl = getBaseUrl(req);
        let emailDelivered = true;
        let emailError = null;

        if (skipInvoice) {
            try {
                const confirmed = await confirmInvitationWithoutPayment(invitation, {
                    paymentPrefix: isComplimentary ? 'comp' : 'manual'
                });
                invitation = confirmed.invitation;
                emailDelivered = confirmed.emailDelivered !== false;
                emailError = confirmed.emailError || null;
                console.log(`   ✉️  Direct booking ready for ${invitation.patientEmail} (${invitation.dateIso} ${invitation.time})`);
            } catch (e) {
                emailError = e.message || 'Direct confirmation failed';
                console.error('   ⚠️  Direct invitation confirmation failed:', emailError);
                try { await db.cancelInvitation(id); } catch (cancelErr) { /* ignore */ }
                return res.status(500).json({ error: emailError });
            }
            emitServerAnalytics(
                isComplimentary ? 'booking_confirmed' : 'invite_sent',
                {
                    props: { service: bookingServiceTag(service), withoutInvoice: true, funnel: 'patient_booking' },
                    revenueCents: amountCents,
                    bookingRef: invitation.bookingRef || null
                },
                req
            ).catch(() => {});
            return res.json({
                ok: true,
                complimentary: isComplimentary,
                withoutInvoice: true,
                invitation,
                emailDelivered,
                emailError
            });
        }

        const session = await createInvitationStripeSession(invitation, baseUrl);

        invitation = await db.updateInvitationStripeSession(id, {
            id: session.id,
            url: session.url,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
        });

        try {
            await sendInvitationEmail(invitation, invitationPayUrl(invitation, baseUrl), baseUrl);
            console.log(`   ✉️  Invitation sent to ${invitation.patientEmail} for ${invitation.dateIso} ${invitation.time}`);
        } catch (e) {
            emailDelivered = false;
            emailError = e.message || 'Email failed';
            console.error('   ⚠️  Invitation email failed:', emailError);
        }

        emitServerAnalytics(
            'invite_sent',
            { props: { service: bookingServiceTag(service), funnel: 'patient_booking' }, revenueCents: amountCents },
            req
        ).catch(() => {});
        res.json({ ok: true, invitation, emailDelivered, emailError });
    } catch (err) {
        console.error('POST /api/admin/invitations:', err.message);
        res.status(500).json({ error: 'Failed to create invitation' });
    }
});

// ─── API: Admin — List invitations ───
app.get('/api/admin/invitations', requireAdmin, async (req, res) => {
    if (!usePersistentDb) return res.json({ invitations: [] });
    try {
        const invitations = await db.listInvitations(100);
        res.json({ invitations });
    } catch (err) {
        console.error('GET /api/admin/invitations:', err.message);
        res.status(500).json({ error: 'Failed to load invitations' });
    }
});

// ─── API: Admin — Resend invitation email ───
app.post('/api/admin/invitations/:id/resend', requireAdmin, async (req, res) => {
    if (!usePersistentDb) return res.status(503).json({ error: 'Database required' });
    try {
        const invitation = await db.findInvitationById(req.params.id);
        if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

        const isComplimentary = Number(invitation.amountCents || 0) === 0;
        // Paid invites confirmed without Stripe (complimentary or no-invoice) — resend confirmation, not invoice.
        const confirmedWithoutStripe = invitation.status === 'paid' && !invitation.stripeSessionId;

        if (confirmedWithoutStripe) {
            const bookingRef = invitation.bookingRef || `LC-COMP`;
            let bookingData = bookingDataFromInvitation(invitation, bookingRef);
            if (invitation.bookingRef) {
                try {
                    const existing = await db.findBookingByRef(invitation.bookingRef);
                    if (existing) {
                        bookingData = {
                            ...bookingData,
                            bookingRef: existing.bookingRef,
                            date: existing.dateIso || existing.date || invitation.dateIso,
                            time: existing.time || invitation.time,
                            amount: existing.amount != null ? existing.amount : bookingData.amount,
                            currency: existing.currency || 'eur'
                        };
                    }
                } catch (e) { /* use invitation-derived data */ }
            }
            await sendConfirmationEmail(bookingData);
            return res.json({ ok: true, complimentary: isComplimentary, withoutInvoice: true });
        }

        if (invitation.status !== 'pending') {
            return res.status(409).json({ error: `Cannot resend (status: ${invitation.status})` });
        }
        if (!invitation.invitationToken) {
            return res.status(409).json({ error: 'Missing payment link' });
        }
        const baseUrl = getBaseUrl(req);
        await sendInvitationEmail(invitation, invitationPayUrl(invitation, baseUrl), baseUrl);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/admin/invitations/:id/resend:', err.message);
        res.status(500).json({ error: 'Failed to resend' });
    }
});

// ─── API: Admin — Cancel invitation ───
app.post('/api/admin/invitations/:id/cancel', requireAdmin, async (req, res) => {
    if (!usePersistentDb) return res.status(503).json({ error: 'Database required' });
    try {
        const invitation = await db.findInvitationById(req.params.id);
        if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
        if (invitation.status !== 'pending') {
            return res.status(409).json({ error: `Cannot cancel (status: ${invitation.status})` });
        }
        // Best-effort expire the Stripe session so the patient's link stops working.
        if (stripe && invitation.stripeSessionId) {
            try { await stripe.checkout.sessions.expire(invitation.stripeSessionId); } catch (e) { /* ignore */ }
        }
        const updated = await db.cancelInvitation(invitation.id);
        res.json({ ok: true, invitation: updated });
    } catch (err) {
        console.error('POST /api/admin/invitations/:id/cancel:', err.message);
        res.status(500).json({ error: 'Failed to cancel' });
    }
});

// ─── Helper ───
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const rawHost = String(req.get('host') || '');
    const host = rawHost.split(':')[0].toLowerCase();
    if (host === 'lonclinic.com' || host === 'www.lonclinic.com') {
        return seo.SITE_ORIGIN;
    }
    return `${protocol}://${rawHost}`;
}

// Express's default 404 has no Cache-Control, so Cloudflare caches "Cannot GET"
// HTML for ~4h. Keep misses uncached so a later deploy is visible immediately.
app.use((req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store'
    });
    if (String(req.path || '').startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.status(404).type('text').send('Not found');
});

// ─── Start Server ───
(async () => {
    try {
        console.log('[bootstrap] usePersistentDb =', usePersistentDb, '(true if DATABASE_URL is set and non-whitespace; from db.isDatabaseEnabled())');
        console.log('[bootstrap] About to run bootstrapPersistence()');
        await bootstrapPersistence();
        console.log('[bootstrap] bootstrapPersistence() finished');
        if (usePersistentDb) {
            console.log('   💾 Persistence: PostgreSQL (DATABASE_URL)');
        } else {
            console.log('   💾 Persistence: in-memory bookings/notes; schedule file under data/');
            console.log('   ℹ️  Set DATABASE_URL (Supabase) to persist bookings and notes in production');
        }
    } catch (err) {
        console.error('   ❌ Failed to initialize persistence:', err.message);
        process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🏥 Longevity Clinic server running on http://0.0.0.0:${PORT}`);
        if (isStripeConfigured) {
            console.log(`   Stripe mode: ${STRIPE_SECRET.startsWith('sk_live') ? '🔴 LIVE' : '🟡 TEST'}`);
        } else {
            console.log(`   ⚠️  Stripe NOT configured — add your keys to .env`);
            console.log(`   Get keys at: https://dashboard.stripe.com/test/apikeys`);
        }
        if (isResendConfigured) {
            console.log('   ✉️  Email: Resend API (HTTPS) — outbound SMTP not required');
        } else if (isSmtpConfigured) {
            console.log(`   ✉️  Email: SMTP as ${EMAIL_USER}`);
        } else {
            console.log('   ⚠️  Email NOT configured — add RESEND_API_KEY (recommended on Railway) or SMTP variables');
            console.log('   Resend: https://resend.com — verify your domain and set RESEND_API_KEY + EMAIL_FROM');
        }
        if (DEFAULT_DOXY_ROOM_URL) {
            console.log(`   📹 Doxy.me room: ${DEFAULT_DOXY_ROOM_URL}`);
        } else {
            console.log(`   ⚠️  Doxy.me NOT configured — add DOXY_ROOM_URL to .env (https://doxy.me/your-room-name)`);
            console.log(`   Extra professionals and rooms can be added in Admin → Professionals`);
        }
        console.log(`\n   Open http://localhost:${PORT} to view the site`);
        console.log(`   Open http://localhost:${PORT}/book-consultation to test booking`);
        console.log(`   Open http://localhost:${PORT}/patient-portal for patient portal`);
        console.log(`   Diretório (admin): http://localhost:${PORT}/diretorio`);
        console.log(`   Candidatura pública: http://localhost:${PORT}/diretorio/candidatar`);
        console.log(`   Entrevista: http://localhost:${PORT}/recrutamento/entrevista`);
        if (fs.existsSync(path.join(__dirname, 'marcar.html'))) {
            console.log(`   Marcação: http://localhost:${PORT}/marcar/clinica-geral\n`);
        } else {
            console.log(`   ⚠️  marcar.html NOT FOUND — /marcar.html will fail until the file is deployed\n`);
        }
        if (isEmailConfigured || usePersistentDb) {
            startAppointmentReminderScheduler();
        }
    });
})();
