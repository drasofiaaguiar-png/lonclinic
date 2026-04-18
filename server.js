/* ========================================
   Longevity Clinic — Express + Stripe + Email Server
======================================== */

require('dotenv').config();
const db = require('./db');
const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const session = require('express-session');

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

/* ========================================
   SESSION CONFIGURATION
======================================== */
app.use(session({
    secret: process.env.SESSION_SECRET || 'longevity-clinic-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
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
const CLINIC_USERNAME = process.env.CLINIC_USERNAME || 'admin';
const CLINIC_PASSWORD = process.env.CLINIC_PASSWORD || 'admin123'; // CHANGE IN PRODUCTION!

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
    timezone: 'Europe/Lisbon',
    updatedAt: new Date().toISOString()
};

const scheduleFilePath = path.join(__dirname, 'data', 'schedule.json');

function cloneDefaultSchedule() {
    return JSON.parse(JSON.stringify(defaultScheduleStore));
}

function ensureScheduleStoreShape(raw) {
    const base = cloneDefaultSchedule();
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
        ...base,
        ...input,
        workingHours: { ...base.workingHours, ...(input.workingHours || {}) },
        blockedDates: Array.isArray(input.blockedDates) ? input.blockedDates : base.blockedDates,
        blockedTimeSlots: Array.isArray(input.blockedTimeSlots) ? input.blockedTimeSlots : base.blockedTimeSlots,
        slotDuration: Number.isFinite(input.slotDuration) ? input.slotDuration : base.slotDuration,
        timezone: typeof input.timezone === 'string' && input.timezone ? input.timezone : base.timezone,
        updatedAt: input.updatedAt || new Date().toISOString()
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

async function sendContactInquiryEmail(data) {
    if (!isEmailConfigured) {
        console.log('   ⚠️  Email not configured — cannot send contact inquiry');
        return false;
    }

    try {
        const { html, text } = buildContactInquiryEmail(data);
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: CONTACT_EMAIL,
            replyTo: data.email,
            subject: `Contact form: ${data.name}`,
            text,
            html
        });

        console.log('   📩 Contact inquiry sent to:', CONTACT_EMAIL, '| Message ID:', info.messageId);
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

/** Avoid duplicate finalize when webhook and success-page API run together */
const checkoutFinalizeInFlight = new Set();

function paymentIntentIdFromSession(session) {
    const pi = session && session.payment_intent;
    if (!pi) return '';
    return typeof pi === 'string' ? pi : (pi.id || '');
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
        ).toLowerCase();
        const record = {
            bookingRef,
            email: emailNorm,
            service: meta.service,
            date: meta.date,
            time: meta.time,
            patientName: passengerNames[0] || 'Patient',
            travellerCount,
            amount: session.amount_total,
            currency: session.currency,
            paymentId,
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // If no webhook secret configured, skip signature verification (dev only)
    if (!webhookSecret || webhookSecret === 'whsec_placeholder' || webhookSecret === 'whsec_your_webhook_secret_here') {
        try {
            event = JSON.parse(req.body);
            console.log('⚠️  Webhook received WITHOUT signature verification (no secret configured)');
        } catch (err) {
            return res.status(400).send('Invalid JSON');
        }
    } else {
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('⚠️  Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    // Handle events
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const meta = session.metadata || {};
            const travellerCount = parseInt(meta.traveller_count, 10) || 1;

            console.log('✅ Payment successful!');
            console.log('   Session ID:', session.id);
            console.log('   Customer email:', session.customer_details?.email);
            console.log('   Amount:', session.amount_total / 100, session.currency?.toUpperCase());
            console.log('   Service:', meta.service);
            console.log('   Travellers:', travellerCount);

            for (let i = 1; i <= travellerCount; i++) {
                if (meta[`p${i}_name`]) {
                    console.log(`   Traveller ${i}: ${meta[`p${i}_name`]} (NHS: ${meta[`p${i}_nhs`] || 'N/A'})`);
                }
            }

            const fin = await finalizePaidCheckoutSession(session, '   ');
            if (fin.reason === 'already_recorded' || fin.reason === 'awaited_peer') {
                console.log('   ℹ️  Checkout already finalized (idempotent skip)');
            }
            break;
        }

        case 'checkout.session.expired':
            console.log('⏰ Checkout session expired:', event.data.object.id);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// ─── Middleware ───
app.use(express.json());

// ─── Debug middleware (log all requests) ───
app.use((req, res, next) => {
    if (req.path === '/travel-clinic') {
        console.log('🔍 [MIDDLEWARE] Request to /travel-clinic detected');
        console.log('🔍 [MIDDLEWARE] Method:', req.method);
        console.log('🔍 [MIDDLEWARE] Path:', req.path);
        console.log('🔍 [MIDDLEWARE] URL:', req.url);
    }
    next();
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
// ─── Test route ───
app.get('/test-travel', (req, res) => {
    res.send('TEST: This route works!');
});

// ─── Friendly URLs (without .html) - MUST come before root route ───
app.get('/travel-clinic', (req, res) => {
    console.log('✅ [ROUTE HANDLER] /travel-clinic route handler called!');
    const filePath = path.join(__dirname, 'travel.html');
    console.log('✅ [ROUTE HANDLER] File path:', filePath);
    console.log('✅ [ROUTE HANDLER] File exists:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
        console.error('❌ [ERROR] travel.html not found!');
        return res.status(404).send('travel.html not found');
    }
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('❌ [ERROR] Error sending file:', err);
            return res.status(500).send('Error: ' + err.message);
        }
        console.log('✅ [SUCCESS] File sent successfully!');
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

// ─── API: Debug Stripe configuration (remove in production) ───
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
            attachmentBuffer: attachment ? attachment.buffer : null
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
app.post('/api/contact', async (req, res) => {
    const name = (req.body?.name || '').trim();
    const email = (req.body?.email || '').trim();
    const phone = (req.body?.phone || '').trim();
    const message = (req.body?.message || '').trim();

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
        message: message.slice(0, 4000)
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
        message: message.slice(0, 4000)
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
app.post('/api/create-checkout-session', async (req, res) => {
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
            priceAmount,  // total in cents (flat tiered price for travel, per-person × count for others)
            travellerCount,
            hasInsurance,
            date,
            time,
            patientName,
            patientEmail,
            patientPhone,
            passengers,   // array of { firstName, lastName, dob, nhs, country, concerns, medications, allergies }
            travelDest,
            travelDates,
            locale
        } = req.body;

        // Validate required fields
        if (!service || !priceAmount || !patientEmail || !patientName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate price amount (Stripe minimum is 50 cents for EUR)
        if (priceAmount < 50) {
            console.warn('⚠️  Price too low, setting minimum to 50 cents');
            priceAmount = 50; // Stripe minimum for EUR
        }

        const count = travellerCount || 1;
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

        // Create Stripe Checkout Session
        console.log('Creating Stripe checkout session...');
        console.log('   Service:', service);
        console.log('   Amount:', priceAmount, 'cents');
        console.log('   Email:', patientEmail);
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
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
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: err.message || 'Unknown error'
        });
    }
});

// ─── API: Retrieve session details (for confirmation page) ───
app.get('/api/session/:sessionId', async (req, res) => {
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

        res.json({
            email: session.customer_details?.email || session.customer_email || session.metadata?.contact_email,
            service: session.metadata.service,
            date: session.metadata.date,
            time: session.metadata.time,
            patientName: passengerNames[0] || session.metadata.patient_name,
            travellerCount,
            passengers: passengerNames,
            amount: session.amount_total,
            currency: session.currency,
            paymentId: piId,
            bookingRef: 'LC-' + bookingRefShort
        });

    } catch (err) {
        console.error('Error retrieving session:', err.message);
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

// ─── API: Patient Dashboard — Fetch bookings by email ───
app.get('/api/bookings', async (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    const ref = (req.query.ref || '').trim();

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        let results;
        if (usePersistentDb) {
            results = await db.findBookingsByEmail(email, ref);
        } else {
            results = bookingsStore.filter((b) => b.email === email);
            if (ref) {
                const refBooking = bookingsStore.find((b) => b.bookingRef === ref);
                if (refBooking && !results.find((b) => b.bookingRef === ref)) {
                    results.push(refBooking);
                }
            }
        }

        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            bookings: results,
            doxyUrl: DOXY_ROOM_URL || null
        });
    } catch (err) {
        console.error('GET /api/bookings:', err.message);
        res.status(500).json({ error: 'Failed to load bookings' });
    }
});

// ─── API: Doxy.me config (for client) ───
app.get('/api/doxy-config', (req, res) => {
    res.json({
        roomUrl: DOXY_ROOM_URL || null,
        configured: !!DOXY_ROOM_URL
    });
});

// ─── API: Send test email (for debugging) ───
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

// ─── API: Clinic — Login ───
app.post('/api/clinic/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Simple authentication (in production, use bcrypt for password hashing)
    if (username === CLINIC_USERNAME && password === CLINIC_PASSWORD) {
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
    const { workingHours, slotDuration, blockedDates, blockedTimeSlots, timezone } = req.body;

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
    if (timezone) {
        scheduleStore.timezone = timezone;
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
        timezone: scheduleStore.timezone
    });
});

// ─── API: Admin — Get available time slots for a date ───
app.get('/api/admin/available-slots', (req, res) => {
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
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
    const daySchedule = scheduleStore.workingHours[dayOfWeek];

    if (!daySchedule || !daySchedule.enabled) {
        return res.json({ available: [], date, reason: 'Day not enabled' });
    }

    // Generate slots based on working hours
    const [startHour, startMin] = daySchedule.start.split(':').map(Number);
    const [endHour, endMin] = daySchedule.end.split(':').map(Number);
    const slotDuration = scheduleStore.slotDuration || 30;

    const slots = [];
    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const slotTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        const dateStr = date; // YYYY-MM-DD format
        
        // Check if this slot is blocked
        const isBlocked = scheduleStore.blockedTimeSlots.some(
            blocked => blocked.date === dateStr && blocked.time === slotTime
        );

        // Check if date is blocked
        const isDateBlocked = scheduleStore.blockedDates.includes(dateStr);

        if (!isBlocked && !isDateBlocked) {
            slots.push(slotTime);
        }

        // Move to next slot
        currentMin += slotDuration;
        if (currentMin >= 60) {
            currentMin = 0;
            currentHour++;
        }
    }

    res.json({ available: slots, date, workingHours: daySchedule });
});

// ─── Helper ───
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    return `${protocol}://${req.get('host')}`;
}

// ─── Start Server ───
(async () => {
    try {
        await bootstrapPersistence();
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
    });
})();
