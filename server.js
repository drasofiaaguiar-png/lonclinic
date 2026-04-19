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
const { computeCheckoutTotalCents } = require('./pricing');
const express = require('express');
const path = require('path');
const fs = require('fs');
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

const rateLimitClinicLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
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
const DOXY_ROOM_URL = process.env.DOXY_ROOM_URL || ''; // e.g. https://doxy.me/longevityclinic

/* ========================================
   CONTACT EMAIL CONFIGURATION
======================================== */
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@lonclinic.com';

/* ========================================
   CLINIC PORTAL AUTHENTICATION
======================================== */

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.clinicAuthenticated) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
}

function sendHtmlNoCache(res, filePath, onErrorMessage) {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`❌ Error sending ${path.basename(filePath)}:`, err.message);
            res.status(500).send(onErrorMessage);
        }
    });
}

/* ========================================
   BOOKINGS + CLINICAL NOTES
   PostgreSQL (Supabase) when DATABASE_URL is set; otherwise in-memory.
======================================== */
const usePersistentDb = db.isDatabaseEnabled();
const bookingsStore = []; // memory fallback only
const clinicalNotesStore = []; // memory fallback only

/* ========================================
   SCHEDULE/AVAILABILITY STORE
   (Replace with a database in production)
======================================== */
const defaultScheduleStore = {
    workingHours: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '08:00', end: '13:00' },
        sunday: { enabled: false, start: '09:00', end: '17:00' }
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

function ensureScheduleStoreShape(raw) {
    const base = cloneDefaultSchedule();
    const input = raw && typeof raw === 'object' ? raw : {};
    const mergedOverrides =
        input.dayOverrides !== undefined
            ? normalizeDayOverrides(input.dayOverrides)
            : normalizeDayOverrides(base.dayOverrides);
    return {
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
            await db.saveSchedulePayload(scheduleStore);
        }
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

const isEmailConfigured = EMAIL_USER && EMAIL_PASS &&
    !EMAIL_USER.includes('your_email') &&
    !EMAIL_PASS.includes('your_app_password');

let transporter;
if (isEmailConfigured) {
    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });

    // Verify connection on startup
    transporter.verify()
        .then(() => console.log('   ✉️  Email transport verified and ready'))
        .catch(err => console.error('   ⚠️  Email transport error:', err.message));
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
        step1Title: 'Pre-consultation questionnaire',
        step1Body: "You'll receive a separate email with a health questionnaire to complete before your appointment.",
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
        rescheduleStrong: 'Need to reschedule?',
        rescheduleRest: 'Free rescheduling is available up to 24 hours before your appointment. Simply reply to this email or contact us.',
        footerContact: 'If you have any questions, contact us at',
        footerOrCall: 'or call',
        footerCopy: '© 2026 Longevity Clinic. All rights reserved.',
        footerAuto: 'This is an automated confirmation email. Please do not reply directly to this address.',
        subject: (service, date, ref) => `Booking Confirmed — ${service} on ${date} | Ref: ${ref}`,
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
        textStep1: 'Pre-consultation questionnaire — check your inbox.',
        textStep2Doxy: (url) => `Video call link — join your secure video room at your scheduled time (no download required):\n   ${url}`,
        textStep2NoDoxy: 'Video call link — we will send a secure link 24 hours before your appointment.',
        textStep3: 'Your consultation — meet your physician online.',
        textStep4Report: 'Personalised report — within 48 hours.',
        textStep4Travel: 'Prescriptions & vaccines — provided during or after consultation.',
        textReschedule: 'Need to reschedule? Free rescheduling up to 24 hours before. Reply to this email or contact us.',
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    pt: {
        htmlLang: 'pt',
        emailTitle: 'Confirmação de marcação',
        h2Confirmed: 'Marcação confirmada',
        thankYou: (name) => `Obrigado, ${name}. A sua consulta foi marcada e o pagamento foi recebido.`,
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
        step1Title: 'Questionário pré-consulta',
        step1Body: 'Receberá um email separado com um questionário de saúde a preencher antes da consulta.',
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
        rescheduleStrong: 'Precisa de reagendar?',
        rescheduleRest: 'O reagendamento é gratuito até 24 horas antes da consulta. Responda a este email ou contacte-nos.',
        footerContact: 'Em caso de dúvidas, contacte-nos em',
        footerOrCall: 'ou ligue para',
        footerCopy: '© 2026 Longevity Clinic. Todos os direitos reservados.',
        footerAuto: 'Este é um email de confirmação automático. Por favor não responda diretamente a este endereço.',
        subject: (service, date, ref) => `Marcação confirmada — ${service} · ${date} | Ref.: ${ref}`,
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
        textStep1: 'Questionário pré-consulta — verifique a sua caixa de entrada.',
        textStep2Doxy: (url) => `Ligação por vídeo — aceda à sala segura à hora marcada (sem instalação):\n   ${url}`,
        textStep2NoDoxy: 'Ligação por vídeo — enviaremos uma ligação segura 24 horas antes da consulta.',
        textStep3: 'A sua consulta — encontre-se com o seu médico online.',
        textStep4Report: 'Relatório personalizado — no prazo de 48 horas.',
        textStep4Travel: 'Receitas e vacinas — fornecidas durante ou após a consulta.',
        textReschedule: 'Precisa de reagendar? Reagendamento gratuito até 24 horas antes. Responda a este email ou contacte-nos.',
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    es: {
        htmlLang: 'es',
        emailTitle: 'Confirmación de cita',
        h2Confirmed: 'Cita confirmada',
        thankYou: (name) => `Gracias, ${name}. Su consulta ha sido reservada y hemos recibido el pago.`,
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
        step1Title: 'Cuestionario previo a la consulta',
        step1Body: 'Recibirá un correo aparte con un cuestionario de salud que deberá completar antes de la cita.',
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
        rescheduleStrong: '¿Necesita cambiar la fecha?',
        rescheduleRest: 'Puede reprogramar sin coste hasta 24 horas antes de la cita. Responda a este correo o contáctenos.',
        footerContact: 'Si tiene alguna pregunta, escríbanos a',
        footerOrCall: 'o llame al',
        footerCopy: '© 2026 Longevity Clinic. Todos los derechos reservados.',
        footerAuto: 'Este es un correo de confirmación automático. No responda directamente a esta dirección.',
        subject: (service, date, ref) => `Cita confirmada — ${service} · ${date} | Ref.: ${ref}`,
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
        textStep1: 'Cuestionario previo — revise su bandeja de entrada.',
        textStep2Doxy: (url) => `Enlace de videollamada — acceda a la sala segura a la hora acordada (sin descargas):\n   ${url}`,
        textStep2NoDoxy: 'Enlace de videollamada — le enviaremos un enlace seguro 24 horas antes de la cita.',
        textStep3: 'Su consulta — conéctese con su médico en línea.',
        textStep4Report: 'Informe personalizado — en un plazo de 48 horas.',
        textStep4Travel: 'Recetas y vacunas — facilitadas durante o después de la consulta.',
        textReschedule: '¿Necesita cambiar la fecha? Reprogramación gratuita hasta 24 horas antes. Responda a este correo o contáctenos.',
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
        locale: rawLocale
    } = data;

    const t = confirmationEmailStrings(rawLocale);

    const currencySymbol = currency === 'eur' ? '€' : currency === 'gbp' ? '£' : '$';
    const formattedAmount = `${currencySymbol}${(amount / 100).toFixed(0)}`;
    const isTravel = service === 'travel';
    const isMulti = travellerCount > 1;

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

    const doxyCtaButton = DOXY_ROOM_URL
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 20px;">
    <tr>
        <td align="center" style="padding:0;">
            <a href="${DOXY_ROOM_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">${t.joinVideoButton}</a>
        </td>
    </tr>
</table>`
        : '';

    const step2Html = DOXY_ROOM_URL
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
                            <p style="margin: 0 0 32px; font-size: 15px; color: #64748b; text-align: center; line-height: 1.5;">
                                ${t.thankYou(patientName)}
                            </p>

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

    const textStep2 = DOXY_ROOM_URL ? t.textStep2Doxy(DOXY_ROOM_URL) : t.textStep2NoDoxy;
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
1. ${t.textStep1}
2. ${textStep2}
3. ${t.textStep3}
4. ${textStep4}

${t.textReschedule}

info@lonclinic.com | +351 928 372 775
${t.textFooterCopy}
`;

    return { html, text, subject: t.subject(serviceLabel, date, bookingRef) };
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
        const { html, text, subject } = buildConfirmationEmail(data);

        const info = await transporter.sendMail({
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

        const info = await transporter.sendMail({
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
      <img src="https://lonclinic.com/logo.png" alt="Lon Clinic" height="32" style="display:block;height:32px;" onerror="this.style.display='none'">
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
        const info = await transporter.sendMail({
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
                await transporter.sendMail({ from: EMAIL_FROM, to: data.email, subject: rSubject, text: rText, html: rHtml });
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

        const info = await transporter.sendMail(mailOptions);
        console.log('   📩 Careers application sent to:', CONTACT_EMAIL, '| Message ID:', info.messageId);

        // Send auto-reply to applicant (non-critical)
        if (data.email) {
            try {
                const locale = data.locale || 'pt';
                const { html: rHtml, text: rText, subject: rSubject } = buildAutoReplyEmail('careers', data.name, locale);
                await transporter.sendMail({ from: EMAIL_FROM, to: data.email, subject: rSubject, text: rText, html: rHtml });
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
        const info = await transporter.sendMail({
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
                await transporter.sendMail({ from: EMAIL_FROM, to: data.email, subject: rSubject, text: rText, html: rHtml });
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
    followup: 'Follow-up Consultation'
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
        rescheduleRest: 'Free rescheduling up to 24 hours before your appointment. Reply to this email or contact us.'
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
    const { patientName, serviceLabel, date, time, bookingRef, locale: rawLocale, reminderVariant } = data;
    const variant = reminderVariant === '1h' ? '1h' : '24h';
    const t = reminderEmailStrings(rawLocale, variant);
    const name = (patientName || 'Patient').trim();

    const doxyCtaButton = DOXY_ROOM_URL
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 20px;">
    <tr>
        <td align="center" style="padding:0;">
            <a href="${DOXY_ROOM_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">${t.joinVideoButton}</a>
        </td>
    </tr>
</table>`
        : '';

    const videoBlock = DOXY_ROOM_URL
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

    const textVideo = DOXY_ROOM_URL ? t.textDoxy(DOXY_ROOM_URL) : t.textNoDoxy;
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
        const { html, text, subject } = buildReminderEmail(data);
        const info = await transporter.sendMail({
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

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://www.lonclinic.com';

const FOLLOWUP_EMAIL_I18N = {
    en: {
        htmlLang: 'en',
        emailTitle: 'Thank you for your consultation',
        h2: 'Thank you for visiting Longevity Clinic',
        body: (name) =>
            `Dear ${name}, thank you for attending your online consultation with us today. We hope the session was helpful and that you feel supported in your health journey.`,
        feedbackTitle: 'We would love your feedback',
        feedbackBody: `Your experience matters to us. If you have a moment, please reply to this email with any comments or suggestions. You can also reach us through our website: ${PUBLIC_SITE_URL}`,
        subject: (ref) => `Thank you — we value your feedback | ${ref}`,
        textHead: 'THANK YOU',
        textBody: (name) =>
            `Dear ${name}, thank you for attending your online consultation with Longevity Clinic. We hope it was helpful.`,
        textFeedback: `We would love your feedback — reply to this email or visit ${PUBLIC_SITE_URL}`,
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    pt: {
        htmlLang: 'pt',
        emailTitle: 'Obrigado pela sua consulta',
        h2: 'Obrigado por ter escolhido a Longevity Clinic',
        body: (name) =>
            `Exmo.(a) ${name}, obrigado por ter participado na sua consulta online connosco. Esperamos que tenha sido útil e que se sinta acompanhado na sua saúde.`,
        feedbackTitle: 'Gostaríamos de saber a sua opinião',
        feedbackBody: `A sua experiência é importante. Se tiver um momento, responda a este email com comentários ou sugestões. Também pode contactar-nos através do nosso site: ${PUBLIC_SITE_URL}`,
        subject: (ref) => `Obrigado — a sua opinião conta | ${ref}`,
        textHead: 'OBRIGADO',
        textBody: (name) =>
            `Exmo.(a) ${name}, obrigado pela sua consulta online na Longevity Clinic.`,
        textFeedback: `Gostaríamos de feedback — responda a este email ou visite ${PUBLIC_SITE_URL}`,
        textFooterCopy: '© 2026 Longevity Clinic'
    },
    es: {
        htmlLang: 'es',
        emailTitle: 'Gracias por su consulta',
        h2: 'Gracias por confiar en Longevity Clinic',
        body: (name) =>
            `Estimado/a ${name}, gracias por asistir a su consulta online con nosotros. Esperamos que le haya resultado útil.`,
        feedbackTitle: 'Nos gustaría conocer su opinión',
        feedbackBody: `Su experiencia es importante. Si puede, responda a este correo con comentarios o sugerencias. También puede contactarnos en nuestro sitio web: ${PUBLIC_SITE_URL}`,
        subject: (ref) => `Gracias — valoramos su opinión | ${ref}`,
        textHead: 'GRACIAS',
        textBody: (name) =>
            `Estimado/a ${name}, gracias por su consulta online en Longevity Clinic.`,
        textFeedback: `Nos gustaría su feedback — responda a este correo o visite ${PUBLIC_SITE_URL}`,
        textFooterCopy: '© 2026 Longevity Clinic'
    }
};

function followupEmailStrings(locale) {
    const k = normalizePatientLocale(locale);
    return FOLLOWUP_EMAIL_I18N[k] || FOLLOWUP_EMAIL_I18N.en;
}

function buildFollowupEmail(data) {
    const { patientName, bookingRef, locale: rawLocale } = data;
    const t = followupEmailStrings(rawLocale);
    const name = (patientName || 'Patient').trim();
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
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
<p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;">Ref.</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${bookingRef}</p>
</div>
<h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a;">${t.feedbackTitle}</h3>
<p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${t.feedbackBody}</p>
</td></tr>
<tr><td style="padding:32px 20px;text-align:center;">
<p style="margin:0;font-size:11px;color:#cbd5e1;">${t.textFooterCopy}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
    const text = `${t.textHead} — ${bookingRef}\n\n${t.textBody(name)}\n\n${t.textFeedback}`;
    return { html, text, subject: t.subject(bookingRef) };
}

async function sendFollowupEmail(data) {
    if (!isEmailConfigured) return false;
    const to = (data.email || '').trim();
    if (!to || !to.includes('@')) return false;
    try {
        const { html, text, subject } = buildFollowupEmail(data);
        await transporter.sendMail({ from: EMAIL_FROM, to, subject, text, html });
        console.log('   ✉️  Follow-up email sent to:', data.email);
        return true;
    } catch (err) {
        console.error('   ❌ Follow-up email failed:', err.message);
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
    const doxyBtn = DOXY_ROOM_URL
        ? `<table role="presentation" width="100%" style="margin:16px 0;"><tr><td align="center">
<a href="${DOXY_ROOM_URL}" style="display:inline-block;background-color:#255235;border:1px solid #1a3d22;color:#fff!important;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">${t.joinVideoButton}</a>
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
    const text = `${t.textHead} — ${bookingRef}\n${t.lead(name)}\n${serviceLabel} — ${date} ${time}\nVideo: ${DOXY_ROOM_URL || 'see email'}`;
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
        await transporter.sendMail({
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
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
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

function memoryBookingsNeedingFollowup(tz) {
    const now = Date.now();
    return bookingsStore.filter((b) => {
        if (b.cancelled || b.followupSent) return false;
        const endMs = getAppointmentEndUtcMs(b, tz);
        if (!Number.isFinite(endMs)) return false;
        return now >= endMs + 60 * 60 * 1000;
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
    const [startHour, startMin] = daySchedule.start.split(':').map(Number);
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
 * Progressive slot grouping: empty day → first/last anchor slots only; then
 * slot immediately before and after the contiguous occupied block.
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
        return [allSlots[0], allSlots[allSlots.length - 1]];
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

/**
 * Slots patients may book for a date: schedule + optional smart grouping + not already taken.
 */
async function getBookableSlotsForDateIso(dateIso, excludeBookingRef) {
    const base = slotsForDateIso(dateIso);
    if (!base.length) return [];
    const slotDuration = scheduleStore.slotDuration || 30;
    let bookings = await fetchBookingsForDateIso(dateIso);
    if (excludeBookingRef) {
        bookings = bookings.filter((b) => b.bookingRef !== excludeBookingRef);
    }
    let slots;
    if (scheduleStore.smartSlotGrouping) {
        slots = computeSmartGroupedSlotTimes(base, bookings, slotDuration);
    } else {
        slots = base.slice();
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

const AUTOMATION_JOB_INTERVAL_MS = 15 * 60 * 1000;
let automationJobStarted = false;

async function runAutomationJobs() {
    if (!isEmailConfigured) {
        return;
    }
    const tz = scheduleStore.timezone || 'Europe/Lisbon';
    try {
        let list24 = [];
        let list1h = [];
        let listFu = [];
        if (usePersistentDb) {
            list24 = await db.findBookingsNeeding24hReminder();
            list1h = await db.findBookingsNeeding1hReminder();
            listFu = await db.findBookingsNeedingFollowup();
        } else {
            list24 = memoryBookingsNeeding24h(tz);
            list1h = memoryBookingsNeeding1h(tz);
            listFu = memoryBookingsNeedingFollowup(tz);
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
        const winFu = listFu.filter((b) => {
            const endMs = getAppointmentEndUtcMs(b, tz);
            return Number.isFinite(endMs) && now >= endMs + 60 * 60 * 1000;
        });

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
                reminderVariant: '24h'
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
                reminderVariant: '1h'
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
            const locale = b.patientLocale || 'en';
            const sent = await sendFollowupEmail({
                email: b.email,
                patientName: b.patientName,
                serviceLabel: serviceLabelFromCode(b.service),
                bookingRef: b.bookingRef,
                locale
            });
            if (!sent) continue;
            try {
                if (usePersistentDb) await db.markFollowupSent(b.bookingRef);
                else {
                    const row = bookingsStore.find((x) => x.bookingRef === b.bookingRef);
                    if (row) row.followupSent = true;
                }
            } catch (err) {
                console.error('   ❌ mark followup_sent:', b.bookingRef, err.message);
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
    setTimeout(() => {
        void runAutomationJobs();
    }, 15_000);
    console.log('   ⏰ Automation (24h + 1h reminders, follow-up): every 15m (first run ~15s after startup)');
}

/** Avoid duplicate finalize when webhook and success-page API run together */
const checkoutFinalizeInFlight = new Set();

function paymentIntentIdFromSession(session) {
    const pi = session && session.payment_intent;
    if (!pi) return '';
    return typeof pi === 'string' ? pi : (pi.id || '');
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
            const allowed = await getBookableSlotsForDateIso(isoRaw, null);
            if (!allowed.includes(normTimeFinal)) {
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

        const bookingData = {
            bookingRef,
            patientName: passengerNames[0] || meta.contact_email?.split('@')[0] || 'Patient',
            email: session.customer_details?.email || session.customer_email || meta.contact_email,
            service: meta.service,
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
            locale: meta.locale || 'en'
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
            service: meta.service,
            date: meta.date,
            time: meta.time,
            dateIso: meta.date_iso && String(meta.date_iso).trim() ? String(meta.date_iso).trim() : null,
            patientName: passengerNames[0] || 'Patient',
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
            createdAt: new Date().toISOString()
        };

        if (usePersistentDb) {
            const inserted = await db.insertBooking(record);
            if (!inserted) {
                return { ok: true, reason: 'already_recorded' };
            }
            console.log(`${logPrefix}📋 Booking ${bookingRef} saved (database)`);
        } else {
            bookingsStore.push(record);
            console.log(`${logPrefix}📋 Booking ${bookingRef} saved (${bookingsStore.length} total in memory)`);
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
            break;
        }

        case 'checkout.session.expired':
            console.log(
                '⏰ Checkout session expired (…' + stripeSessionIdSuffixForLog(event.data.object.id) + ')'
            );
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// ─── Middleware ───
app.use(express.json());

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

// Technical SEO: prevent private/utility areas from being indexed.
app.use((req, res, next) => {
    const noIndexPrefixes = [
        '/admin',
        '/doctors',
        '/clinic-portal',
        '/patient-portal',
        '/api/clinic',
        '/api/admin',
        '/api/debug-stripe',
        '/api/test-email'
    ];
    const shouldNoIndex = noIndexPrefixes.some((prefix) => req.path.startsWith(prefix));
    if (shouldNoIndex) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    next();
});

// ─── IMPORTANT: Routes must come BEFORE express.static ───
// ─── Friendly URLs (without .html) - MUST come before root route ───
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

const MARCAR_TIPO_TO_SLUG = {
    urgente: 'urgente',
    infeccao_urinaria: 'infeccao-urinaria',
    clinica_geral: 'clinica-geral',
    renovacao: 'renovacao',
    travel: 'travel',
    saude_mental: 'saude-mental',
    longevidade: 'longevidade'
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

app.get('/faq', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'faq.html'), 'Error loading FAQ page');
});

app.get('/consulta', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'consulta.html'), 'Error loading consulta landing page');
});

app.get('/patient-portal', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'dashboard.html'), 'Error loading patient portal');
});

app.get('/clinic-portal', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'clinic.html'), 'Error loading clinic portal');
});

app.get('/admin', (req, res) => {
    sendHtmlNoCache(res, path.join(__dirname, 'admin.html'), 'Error loading admin page');
});

app.get('/info.html', (req, res) => {
    const noIndexPages = new Set([
        'termos-condicoes',
        'politica-privacidade',
        'cookies',
        'politica-nao-discriminacao',
        'livro-reclamacoes',
        'reclamacoes'
    ]);
    const page = String(req.query.page || '').toLowerCase();
    if (page === 'perguntas-frequentes') {
        return res.redirect(301, '/faq');
    }
    if (noIndexPages.has(page)) {
        res.setHeader('X-Robots-Tag', 'noindex, follow, noarchive');
    }
    sendHtmlNoCache(res, path.join(__dirname, 'info.html'), 'Error loading info page');
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

app.get('/doctors.html', (req, res) => {
    res.redirect(301, '/doctors');
});

// ─── Sitemap and Robots ───
app.get('/sitemap.xml', (req, res) => {
    res.sendFile(path.join(__dirname, 'sitemap.xml'), {
        headers: {
            'Content-Type': 'application/xml'
        }
    });
});

app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'robots.txt'), {
        headers: {
            'Content-Type': 'text/plain'
        }
    });
});

// ─── Static files (CSS, JS, images, etc.) ───
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
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
            discountCode
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
        if (isoCheckout && /^\d{4}-\d{2}-\d{2}$/.test(isoCheckout) && normTimeCheckout) {
            const allowed = await getBookableSlotsForDateIso(isoCheckout, null);
            if (!allowed.includes(normTimeCheckout)) {
                return res.status(400).json({ error: 'That time slot is not available' });
            }
        }

        // Create Stripe Checkout Session
        console.log('Creating Stripe checkout session...');
        console.log('   Service:', service);
        console.log('   Amount:', priceAmount, 'cents');
        console.log('   Email:', patientEmail);
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_creation: 'always',
            customer_email: patientEmail,
            // Enable Stripe automatic receipt
            payment_intent_data: {
                receipt_email: patientEmail,
            },
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: itemName,
                        description: description,
                        images: [],
                    },
                    unit_amount: priceAmount,
                },
                quantity: 1,
            }],
            metadata,
            success_url: `${getBaseUrl(req)}/book-consultation?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${getBaseUrl(req)}/book-consultation?cancelled=true`,
            // Auto-expire after 30 minutes
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
        });

        console.log('✅ Checkout session created:', session.id);
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

        const travellerCount = parseInt(session.metadata?.traveller_count, 10) || 1;
        const passengerNames = [];
        for (let i = 1; i <= travellerCount; i++) {
            if (session.metadata[`p${i}_name`]) passengerNames.push(session.metadata[`p${i}_name`]);
        }

        const piId = paymentIntentIdFromSession(session);
        const bookingRefShort = piId.length >= 8 ? piId.slice(-8).toUpperCase() : (piId || Date.now().toString(36)).toUpperCase();

        const emailNorm = (
            session.customer_details?.email ||
            session.customer_email ||
            session.metadata?.contact_email ||
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
            service: session.metadata.service,
            date: session.metadata.date,
            time: session.metadata.time,
            travellerCount,
            amount: session.amount_total,
            currency: session.currency,
            bookingRef: 'LC-' + bookingRefShort,
            isNewCustomer
        });

    } catch (err) {
        console.error('Error retrieving session:', err.message);
        res.status(500).json({ error: 'Failed to retrieve session' });
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

        res.json({
            bookings: results.map(enrichBookingForPatientApi),
            doxyUrl: DOXY_ROOM_URL || null
        });
    } catch (err) {
        console.error('GET /api/bookings:', err.message);
        res.status(500).json({ error: 'Failed to load bookings' });
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
                await transporter.sendMail({
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
                    email: booking.email
                });
                await transporter.sendMail({
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
        roomUrl: DOXY_ROOM_URL || null,
        configured: !!DOXY_ROOM_URL
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
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const usernameMatch = username === CLINIC_USERNAME;
    const passwordMatch = clinicPasswordHash
        ? await bcrypt.compare(password, clinicPasswordHash)
        : false;

    if (usernameMatch && passwordMatch) {
        req.session.clinicAuthenticated = true;
        req.session.clinicUsername = username;
        req.session.clinicLoginTime = new Date().toISOString();
        
        console.log(`   🔐 Clinic portal login: ${username}`);
        res.json({ success: true, message: 'Login successful' });
    } else {
        console.log(`   ⚠️  Failed clinic login attempt: ${username}`);
        res.status(401).json({ error: 'Invalid username or password' });
    }
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
    res.json({
        authenticated: !!(req.session && req.session.clinicAuthenticated),
        username: req.session?.clinicUsername || null
    });
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

        res.json({ bookings: bookingsWithNotes });
    } catch (err) {
        console.error('GET /api/clinic/bookings:', err.message);
        res.status(500).json({ error: 'Failed to load clinic bookings' });
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

        const notes = usePersistentDb
            ? await db.getClinicalNoteByRef(bookingRef)
            : clinicalNotesStore.find((n) => n.bookingRef === bookingRef);

        res.json({
            ...booking,
            clinicalNotes: notes || null
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
app.get('/api/admin/schedule', requireAuth, (req, res) => {
    res.json(scheduleStore);
});

// ─── API: Admin — Update schedule settings ───
app.post('/api/admin/schedule', requireAuth, express.json(), async (req, res) => {
    const {
        workingHours,
        slotDuration,
        blockedDates,
        blockedTimeSlots,
        dayOverrides,
        timezone,
        smartSlotGrouping
    } = req.body;

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

    scheduleStore.updatedAt = new Date().toISOString();
    try {
        await persistScheduleStore();
        console.log('   📅 Schedule settings updated');
        res.json({ success: true, schedule: scheduleStore });
    } catch (err) {
        console.error('POST /api/admin/schedule:', err.message);
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

// ─── API: Admin — Get available time slots for a date (public + clinic; respects smart grouping) ───
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
        const available = await getBookableSlotsForDateIso(dateStr, null);
        res.json({
            available,
            date,
            workingHours: {
                enabled: daySchedule.enabled,
                start: daySchedule.start,
                end: daySchedule.end
            },
            effective: daySchedule,
            smartSlotGrouping: !!scheduleStore.smartSlotGrouping
        });
    } catch (err) {
        console.error('GET /api/admin/available-slots:', err.message);
        res.status(500).json({ error: 'Failed to load available slots' });
    }
});

// ─── Helper ───
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    return `${protocol}://${req.get('host')}`;
}

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

    app.listen(PORT, () => {
        console.log(`\n🏥 Longevity Clinic server running on http://localhost:${PORT}`);
        if (isStripeConfigured) {
            console.log(`   Stripe mode: ${STRIPE_SECRET.startsWith('sk_live') ? '🔴 LIVE' : '🟡 TEST'}`);
        } else {
            console.log(`   ⚠️  Stripe NOT configured — add your keys to .env`);
            console.log(`   Get keys at: https://dashboard.stripe.com/test/apikeys`);
        }
        if (isEmailConfigured) {
            console.log(`   ✉️  Email configured: ${EMAIL_USER}`);
        } else {
            console.log(`   ⚠️  Email NOT configured — add SMTP credentials to .env`);
            console.log(`   For Gmail: use an App Password (https://myaccount.google.com/apppasswords)`);
        }
        if (DOXY_ROOM_URL) {
            console.log(`   📹 Doxy.me room: ${DOXY_ROOM_URL}`);
        } else {
            console.log(`   ⚠️  Doxy.me NOT configured — add DOXY_ROOM_URL to .env`);
            console.log(`   Example: DOXY_ROOM_URL=https://doxy.me/your-room-name`);
        }
        console.log(`\n   Open http://localhost:${PORT} to view the site`);
        console.log(`   Open http://localhost:${PORT}/book-consultation to test booking`);
        console.log(`   Open http://localhost:${PORT}/patient-portal for patient portal`);
        if (fs.existsSync(path.join(__dirname, 'marcar.html'))) {
            console.log(`   Marcação: http://localhost:${PORT}/marcar/clinica-geral\n`);
        } else {
            console.log(`   ⚠️  marcar.html NOT FOUND — /marcar.html will fail until the file is deployed\n`);
        }
        if (isEmailConfigured) {
            startAppointmentReminderScheduler();
        }
    });
})();
