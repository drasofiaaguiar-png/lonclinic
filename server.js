/* ========================================
   Longevity Clinic — Express + Stripe + Email Server
======================================== */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
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

/* ========================================
   IN-MEMORY BOOKINGS STORE
   (Replace with a database in production)
======================================== */
const bookingsStore = []; // { bookingRef, email, service, date, time, patientName, travellerCount, amount, currency, createdAt }

/* ========================================
   CLINICAL NOTES STORE
   (Replace with a database in production)
======================================== */
const clinicalNotesStore = []; // { bookingRef, consultationDate, notes, diagnosis, prescriptions, followUp, createdBy, createdAt, updatedAt }

/* ========================================
   SCHEDULE/AVAILABILITY STORE
   (Replace with a database in production)
======================================== */
const scheduleStore = {
    workingHours: {
        monday: { enabled: false, start: '09:00', end: '17:00' },
        tuesday: { enabled: false, start: '09:00', end: '17:00' },
        wednesday: { enabled: false, start: '09:00', end: '17:00' },
        thursday: { enabled: false, start: '09:00', end: '17:00' },
        friday: { enabled: false, start: '09:00', end: '17:00' },
        saturday: { enabled: true, start: '08:00', end: '13:00' },
        sunday: { enabled: false, start: '09:00', end: '17:00' }
    },
    slotDuration: 30, // minutes
    blockedDates: [], // Array of date strings (YYYY-MM-DD)
    blockedTimeSlots: [], // Array of { date: 'YYYY-MM-DD', time: 'HH:MM' }
    timezone: 'Europe/Lisbon',
    updatedAt: new Date().toISOString()
};

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

/* ========================================
   EMAIL TEMPLATE
======================================== */

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
        travelDates
    } = data;

    const currencySymbol = currency === 'eur' ? '€' : currency === 'gbp' ? '£' : '$';
    const formattedAmount = `${currencySymbol}${(amount / 100).toFixed(0)}`;
    const isTravel = service === 'travel';
    const isMulti = travellerCount > 1;

    // Build passenger rows for multi-traveller
    let passengerRows = '';
    if (isMulti && passengers && passengers.length > 0) {
        passengerRows = passengers.map((name, i) => `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Traveller ${i + 1}</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${name}</td>
            </tr>
        `).join('');
    }

    // Build travel details rows
    let travelRows = '';
    if (isTravel && (travelDest || travelDates)) {
        travelRows = `
            ${travelDest ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Destination(s)</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${travelDest}</td>
            </tr>` : ''}
            ${travelDates ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Travel Dates</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${travelDates}</td>
            </tr>` : ''}
        `;
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
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

                            <!-- Confirmation Icon -->
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; width: 56px; height: 56px; background: #e8f5e9; border-radius: 50%; line-height: 56px; text-align: center;">
                                    <span style="font-size: 28px;">&#10003;</span>
                                </div>
                            </div>

                            <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center;">Booking Confirmed</h2>
                            <p style="margin: 0 0 32px; font-size: 15px; color: #64748b; text-align: center; line-height: 1.5;">
                                Thank you, ${patientName}. Your consultation has been booked and payment received.
                            </p>

                            <!-- Booking Reference -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; text-align: center; margin-bottom: 28px;">
                                <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Booking Reference</p>
                                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.05em;">${bookingRef}</p>
                            </div>

                            <!-- Booking Details Table -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Service</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${serviceLabel}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Date</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Time</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${time}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Format</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">Secure video call</td>
                                </tr>
                                ${isMulti ? `
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Travellers</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right; border-bottom: 1px solid #f1f5f9;">${travellerCount}</td>
                                </tr>` : ''}
                                ${passengerRows}
                                ${travelRows}
                                <tr>
                                    <td style="padding: 12px 0 8px; color: #64748b; font-size: 14px; font-weight: 600;">Total Paid</td>
                                    <td style="padding: 12px 0 8px; color: #0f172a; font-size: 18px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 28px;">

                            <!-- What's Next -->
                            <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">What happens next?</h3>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">1</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">Pre-consultation questionnaire</strong><br>
                                        You'll receive a separate email with a health questionnaire to complete before your appointment.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">2</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">Video call link</strong><br>
                                        ${DOXY_ROOM_URL
                                            ? `Join your consultation via our secure video room: <a href="${DOXY_ROOM_URL}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">${DOXY_ROOM_URL}</a>. Open this link at your scheduled time — no download required.`
                                            : `24 hours before your appointment, we'll send you a secure video call link.`}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">3</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">Your consultation</strong><br>
                                        Meet your physician for an unhurried, comprehensive ${isTravel ? 'travel health' : 'longevity'} consultation.
                                    </td>
                                </tr>
                                ${!isTravel ? `
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">4</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">Personalised report</strong><br>
                                        Within 48 hours, you'll receive a detailed report with actionable insights and a personalised health plan.
                                    </td>
                                </tr>` : `
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 32px;">
                                        <div style="width: 24px; height: 24px; background: #eef4fb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #3b82f6;">4</div>
                                    </td>
                                    <td style="padding: 8px 0 8px 12px; font-size: 14px; color: #475569; line-height: 1.5;">
                                        <strong style="color: #0f172a;">Prescriptions &amp; vaccines</strong><br>
                                        Any required prescriptions or vaccine recommendations will be provided during or shortly after your consultation.
                                    </td>
                                </tr>`}
                            </table>

                            <!-- Reschedule Note -->
                            <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-top: 28px;">
                                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                                    <strong>Need to reschedule?</strong> Free rescheduling is available up to 24 hours before your appointment. Simply reply to this email or contact us.
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 20px; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
                                If you have any questions, contact us at
                                <a href="mailto:info@lonclinic.com" style="color: #3b82f6; text-decoration: none;">info@lonclinic.com</a>
                            </p>
                            <p style="margin: 0 0 16px; font-size: 13px; color: #94a3b8;">
                                or call <a href="tel:+351928372775" style="color: #3b82f6; text-decoration: none;">+351 928 372 775</a>
                            </p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
                            <p style="margin: 0; font-size: 11px; color: #cbd5e1;">&copy; 2026 Longevity Clinic. All rights reserved.</p>
                            <p style="margin: 4px 0 0; font-size: 11px; color: #cbd5e1;">This is an automated confirmation email. Please do not reply directly to this address.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    // Plain text fallback
    const text = `
BOOKING CONFIRMED — ${bookingRef}

Thank you, ${patientName}. Your consultation has been booked and payment received.

BOOKING DETAILS
───────────────
Service:     ${serviceLabel}
Date:        ${date}
Time:        ${time}
Format:      Secure video call
${isMulti ? `Travellers:  ${travellerCount}\n` : ''}${isTravel && travelDest ? `Destination: ${travelDest}\n` : ''}${isTravel && travelDates ? `Travel dates: ${travelDates}\n` : ''}Total Paid:  ${formattedAmount}

WHAT HAPPENS NEXT
─────────────────
1. Pre-consultation questionnaire — check your inbox.
2. Video call link — sent 24 hours before your appointment.
3. Your consultation — meet your physician online.
4. ${isTravel ? 'Prescriptions & vaccines — provided during/after consultation.' : 'Personalised report — within 48 hours.'}

Need to reschedule? Free rescheduling up to 24 hours before. Reply to this email or contact us.

info@lonclinic.com | +351 928 372 775
© 2026 Longevity Clinic
`;

    return { html, text };
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

    try {
        const { html, text } = buildConfirmationEmail(data);

        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: data.email,
            subject: `Booking Confirmed — ${data.serviceLabel} on ${data.date} | Ref: ${data.bookingRef}`,
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
   SERVICE LABELS MAP
======================================== */

const SERVICE_LABELS = {
    longevity: 'Longevity Assessment',
    'longevity-plus': 'Longevity Plus',
    travel: 'Travel Medicine Consultation',
    followup: 'Follow-up Consultation'
};

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
        case 'checkout.session.completed':
            const session = event.data.object;
            const meta = session.metadata || {};
            const travellerCount = parseInt(meta.traveller_count) || 1;

            console.log('✅ Payment successful!');
            console.log('   Session ID:', session.id);
            console.log('   Customer email:', session.customer_details?.email);
            console.log('   Amount:', session.amount_total / 100, session.currency?.toUpperCase());
            console.log('   Service:', meta.service);
            console.log('   Travellers:', travellerCount);

            // Collect passenger names
            const passengerNames = [];
            for (let i = 1; i <= travellerCount; i++) {
                if (meta[`p${i}_name`]) {
                    passengerNames.push(meta[`p${i}_name`]);
                    console.log(`   Traveller ${i}: ${meta[`p${i}_name`]} (NHS: ${meta[`p${i}_nhs`] || 'N/A'})`);
                }
            }

            const bookingRef = 'LC-' + (session.payment_intent?.slice(-8) || Date.now().toString(36)).toUpperCase();

            const bookingData = {
                bookingRef,
                patientName: passengerNames[0] || meta.contact_email?.split('@')[0] || 'Patient',
                email: session.customer_details?.email || session.customer_email || meta.contact_email,
                service: meta.service,
                serviceLabel: SERVICE_LABELS[meta.service] || meta.service,
                date: meta.date,
                time: meta.time,
                amount: session.amount_total,
                currency: session.currency,
                travellerCount,
                hasInsurance: meta.has_insurance === 'medicare',
                passengers: passengerNames,
                travelDest: meta.travel_destinations,
                travelDates: meta.travel_dates,
                contactPhone: meta.contact_phone || ''
            };

            // Send confirmation email to patient
            await sendConfirmationEmail(bookingData);

            // Send notification email to clinic
            await sendAdminNotificationEmail(bookingData);

            // Save booking to in-memory store
            bookingsStore.push({
                bookingRef,
                email: (session.customer_details?.email || session.customer_email || meta.contact_email || '').toLowerCase(),
                service: meta.service,
                date: meta.date,
                time: meta.time,
                patientName: passengerNames[0] || 'Patient',
                travellerCount,
                amount: session.amount_total,
                currency: session.currency,
                paymentId: session.payment_intent,
                createdAt: new Date().toISOString()
            });
            console.log(`   📋 Booking ${bookingRef} saved (${bookingsStore.length} total in memory)`);
            break;

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

// Friendly URL /marcar → static file marcar.html (more reliable than sendFile in some hosts)
function redirectToMarcarHtml(req, res) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, '/marcar.html' + qs);
}
app.get('/marcar', redirectToMarcarHtml);
app.get('/marcar/', redirectToMarcarHtml);

// Explicit handler so /marcar.html always works (do not rely on express.static alone)
app.get('/marcar.html', (req, res) => {
    const filePath = path.join(__dirname, 'marcar.html');
    if (!fs.existsSync(filePath)) {
        console.error('❌ marcar.html missing at:', filePath);
        return res.status(500).send('marcar.html not found on server');
    }
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('❌ Error sending marcar.html:', err.message);
            res.status(500).send('Error loading marcar page');
        }
    });
});

app.get('/book-consultation', (req, res) => {
    res.sendFile(path.join(__dirname, 'book.html'));
});

app.get('/patient-portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/clinic-portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'clinic.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ─── Serve index.html for root route ───
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
app.use(express.static(path.join(__dirname)));

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
        const {
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
            travelDates
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
            travel_dates: travelDates || ''
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

        const travellerCount = parseInt(session.metadata?.traveller_count) || 1;
        const passengerNames = [];
        for (let i = 1; i <= travellerCount; i++) {
            if (session.metadata[`p${i}_name`]) passengerNames.push(session.metadata[`p${i}_name`]);
        }

        res.json({
            email: session.customer_details?.email || session.customer_email,
            service: session.metadata.service,
            date: session.metadata.date,
            time: session.metadata.time,
            patientName: passengerNames[0] || session.metadata.patient_name,
            travellerCount,
            passengers: passengerNames,
            amount: session.amount_total,
            currency: session.currency,
            paymentId: session.payment_intent,
            bookingRef: 'LC-' + session.payment_intent?.slice(-8)?.toUpperCase()
        });

    } catch (err) {
        console.error('Error retrieving session:', err.message);
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

// ─── API: Patient Dashboard — Fetch bookings by email ───
app.get('/api/bookings', (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    const ref = (req.query.ref || '').trim();

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Filter bookings by email (and optionally by reference)
    let results = bookingsStore.filter(b => b.email === email);

    // If a reference is provided, also include that specific booking even if email differs
    if (ref) {
        const refBooking = bookingsStore.find(b => b.bookingRef === ref);
        if (refBooking && !results.find(b => b.bookingRef === ref)) {
            results.push(refBooking);
        }
    }

    // Sort: upcoming first, then by creation date (newest first)
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
        bookings: results,
        doxyUrl: DOXY_ROOM_URL || null
    });
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
    const { to } = req.body;
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
        travelDates: ''
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
app.get('/api/clinic/bookings', requireAuth, (req, res) => {
    // Sort by date (upcoming first, then by creation date)
    const sorted = [...bookingsStore].sort((a, b) => {
        // Try to parse dates for sorting
        try {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                return dateA - dateB;
            }
        } catch {}
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Attach clinical notes to each booking
    const bookingsWithNotes = sorted.map(booking => {
        const notes = clinicalNotesStore.find(n => n.bookingRef === booking.bookingRef);
        return {
            ...booking,
            hasClinicalNotes: !!notes,
            clinicalNotes: notes || null
        };
    });

    res.json({ bookings: bookingsWithNotes });
});

// ─── API: Clinic — Get booking by reference ───
app.get('/api/clinic/booking/:bookingRef', requireAuth, (req, res) => {
    const bookingRef = req.params.bookingRef.toUpperCase();
    const booking = bookingsStore.find(b => b.bookingRef === bookingRef);
    
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    const notes = clinicalNotesStore.find(n => n.bookingRef === bookingRef);
    
    res.json({
        ...booking,
        clinicalNotes: notes || null
    });
});

// ─── API: Clinic — Save/Update clinical notes ───
app.post('/api/clinic/notes', requireAuth, express.json(), (req, res) => {
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

    // Verify booking exists
    const booking = bookingsStore.find(b => b.bookingRef === bookingRef.toUpperCase());
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    const now = new Date().toISOString();
    const existingIndex = clinicalNotesStore.findIndex(n => n.bookingRef === bookingRef.toUpperCase());

    const clinicalNote = {
        bookingRef: bookingRef.toUpperCase(),
        consultationDate: consultationDate || booking.date,
        notes: notes || '',
        diagnosis: diagnosis || '',
        prescriptions: prescriptions || '',
        followUp: followUp || '',
        createdBy: createdBy || 'Doctor',
        createdAt: existingIndex >= 0 ? clinicalNotesStore[existingIndex].createdAt : now,
        updatedAt: now
    };

    if (existingIndex >= 0) {
        // Update existing
        clinicalNotesStore[existingIndex] = clinicalNote;
        console.log(`   📝 Clinical notes updated for booking ${bookingRef}`);
    } else {
        // Create new
        clinicalNotesStore.push(clinicalNote);
        console.log(`   📝 Clinical notes created for booking ${bookingRef}`);
    }

    res.json({
        success: true,
        clinicalNote
    });
});

// ─── API: Clinic — Get clinical notes by booking reference ───
app.get('/api/clinic/notes/:bookingRef', requireAuth, (req, res) => {
    const bookingRef = req.params.bookingRef.toUpperCase();
    const notes = clinicalNotesStore.find(n => n.bookingRef === bookingRef);
    
    if (!notes) {
        return res.status(404).json({ error: 'Clinical notes not found' });
    }

    res.json(notes);
});

// ─── API: Admin — Get schedule settings ───
app.get('/api/admin/schedule', requireAuth, (req, res) => {
    res.json(scheduleStore);
});

// ─── API: Admin — Update schedule settings ───
app.post('/api/admin/schedule', requireAuth, express.json(), (req, res) => {
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
    console.log('   📅 Schedule settings updated');

    res.json({ success: true, schedule: scheduleStore });
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

    const dateObj = new Date(date);
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
        console.log(`   Marcação: http://localhost:${PORT}/marcar.html?tipo=clinica_geral\n`);
    } else {
        console.log(`   ⚠️  marcar.html NOT FOUND — /marcar.html will fail until the file is deployed\n`);
    }
});
