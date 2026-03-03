/* ========================================
   Longevity Clinic — Express + Stripe + Email Server
======================================== */

require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const isStripeConfigured = STRIPE_SECRET && !STRIPE_SECRET.includes('your_secret_key_here');
let stripe;
if (isStripeConfigured) {
    stripe = require('stripe')(STRIPE_SECRET);
}

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway, Render, etc.)
const PORT = process.env.PORT || 3000;

/* ========================================
   DOXY.ME CONFIGURATION
======================================== */
const DOXY_ROOM_URL = process.env.DOXY_ROOM_URL || ''; // e.g. https://doxy.me/longevityclinic

/* ========================================
   CONTACT EMAIL CONFIGURATION
======================================== */
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@lonclinic.com';

/* ========================================
   IN-MEMORY BOOKINGS STORE
   (Replace with a database in production)
======================================== */
const bookingsStore = []; // { bookingRef, email, service, date, time, patientName, travellerCount, amount, currency, createdAt }

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
                                or call <a href="tel:+442012345678" style="color: #3b82f6; text-decoration: none;">+44 20 1234 5678</a>
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

info@lonclinic.com | +44 20 1234 5678
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

            // Send confirmation email
            await sendConfirmationEmail({
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
                travelDates: meta.travel_dates
            });

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
app.use(express.static(path.join(__dirname)));

// ─── Serve index.html for root route ───
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── API: Get publishable key ───
app.get('/api/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// ─── API: Create Checkout Session ───
app.post('/api/create-checkout-session', async (req, res) => {
    if (!isStripeConfigured) {
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
            success_url: `${getBaseUrl(req)}/book.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${getBaseUrl(req)}/book.html?cancelled=true`,
            // Auto-expire after 30 minutes
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
        });

        res.json({ sessionId: session.id, url: session.url });

    } catch (err) {
        console.error('Error creating checkout session:', err.message);
        res.status(500).json({ error: 'Failed to create checkout session' });
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
    console.log(`   Open http://localhost:${PORT}/book.html to test booking`);
    console.log(`   Open http://localhost:${PORT}/dashboard.html for patient portal\n`);
});
