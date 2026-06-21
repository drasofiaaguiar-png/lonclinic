/**
 * PostgreSQL persistence: DATABASE_URL, or DB_HOST + DB_USER + DB_PASSWORD (+ DB_PORT, DB_NAME).
 * When no DB config is present, the server uses in-memory arrays + file schedule (see server.js).
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let pool = null;

/** Remove sslmode from DATABASE_URL so libpq does not override Pool.ssl (e.g. sslmode=require). */
function stripSslModeFromConnectionString(connectionString) {
    const s = String(connectionString).trim();
    if (!s) return s;
    try {
        const u = new URL(s);
        for (const key of [...u.searchParams.keys()]) {
            if (key.toLowerCase() === 'sslmode') {
                u.searchParams.delete(key);
            }
        }
        return u.toString();
    } catch {
        const q = s.indexOf('?');
        if (q === -1) return s;
        const base = s.slice(0, q);
        const rest = s.slice(q + 1);
        const kept = rest.split('&').filter((pair) => {
            const name = pair.split('=')[0];
            return name && name.toLowerCase() !== 'sslmode';
        });
        return kept.length ? `${base}?${kept.join('&')}` : base;
    }
}

function hasDatabaseUrl() {
    return Boolean(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());
}

function hasDiscreteDbCredentials() {
    const host = process.env.DB_HOST && String(process.env.DB_HOST).trim();
    const user = process.env.DB_USER && String(process.env.DB_USER).trim();
    const password = process.env.DB_PASSWORD && String(process.env.DB_PASSWORD).trim();
    return Boolean(host && user && password);
}

function isDatabaseEnabled() {
    return hasDatabaseUrl() || hasDiscreteDbCredentials();
}

/** Build postgresql:// URL from DB_* when DATABASE_URL is not used. DB_NAME defaults to postgres. */
function buildDiscreteConnectionString() {
    const host = String(process.env.DB_HOST).trim();
    const user = String(process.env.DB_USER).trim();
    const password = String(process.env.DB_PASSWORD);
    const port = (process.env.DB_PORT && String(process.env.DB_PORT).trim()) || '5432';
    const dbName = (process.env.DB_NAME && String(process.env.DB_NAME).trim()) || 'postgres';
    const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
    return `postgresql://${auth}@${host}:${port}/${encodeURIComponent(dbName)}`;
}

function getConnectionStringForPool() {
    if (hasDatabaseUrl()) {
        return stripSslModeFromConnectionString(process.env.DATABASE_URL);
    }
    if (hasDiscreteDbCredentials()) {
        return buildDiscreteConnectionString();
    }
    return null;
}

function getHostnameFromConnectionString(connectionString) {
    try {
        return new URL(connectionString).hostname || '';
    } catch {
        return '';
    }
}

function isLocalPostgresHost(hostname) {
    const h = String(hostname).toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

/**
 * TLS for remote Postgres (e.g. Supabase): verify the server certificate using the Supabase
 * root CA bundled at prod-ca-2021.crt (same file as Dashboard → Database → SSL Configuration).
 */
function getPostgresSslOptions() {
    return {
        rejectUnauthorized: true,
        ca: fs.readFileSync(path.join(__dirname, 'prod-ca-2021.crt')).toString()
    };
}

function getPool() {
    const connectionString = getConnectionStringForPool();
    if (!connectionString) return null;
    if (!pool) {
        const host = getHostnameFromConnectionString(connectionString);
        const useSsl = !isLocalPostgresHost(host);
        const config = {
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000
        };
        if (useSsl) {
            config.ssl = getPostgresSslOptions();
        }
        pool = new Pool(config);
        pool.on('error', (err) => {
            console.error('   ⚠️  PostgreSQL pool error:', err.message);
        });
    }
    return pool;
}

function rowToBooking(row) {
    const createdAt = row.created_at;
    return {
        bookingRef: row.booking_ref,
        email: row.email,
        service: row.service,
        date: row.date,
        time: row.time,
        dateIso: row.date_iso || null,
        patientName: row.patient_name,
        travellerCount: row.traveller_count,
        amount: row.amount,
        currency: row.currency,
        paymentId: row.payment_id,
        patientLocale: row.patient_locale || 'en',
        stripeCustomerId: row.stripe_customer_id || null,
        cancelled: row.cancelled === true,
        rescheduleCount: row.reschedule_count != null ? Number(row.reschedule_count) : 0,
        reminderSent: row.reminder_sent === true,
        reminder1hSent: row.reminder_1h_sent === true,
        followupSent: row.followup_sent === true,
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt
    };
}

function rowToClinicalNote(row) {
    return {
        bookingRef: row.booking_ref,
        consultationDate: row.consultation_date,
        notes: row.notes || '',
        diagnosis: row.diagnosis || '',
        prescriptions: row.prescriptions || '',
        followUp: row.follow_up || '',
        createdBy: row.created_by || '',
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
}

async function initSchema(p) {
    await p.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            booking_ref VARCHAR(64) UNIQUE NOT NULL,
            email VARCHAR(320) NOT NULL,
            service VARCHAR(128),
            date TEXT,
            time TEXT,
            patient_name TEXT,
            traveller_count INTEGER NOT NULL DEFAULT 1,
            amount INTEGER,
            currency VARCHAR(16),
            payment_id VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_bookings_email_lower ON bookings (LOWER(email))`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS clinical_notes (
            booking_ref VARCHAR(64) PRIMARY KEY REFERENCES bookings(booking_ref) ON DELETE CASCADE,
            consultation_date TEXT,
            notes TEXT,
            diagnosis TEXT,
            prescriptions TEXT,
            follow_up TEXT,
            created_by TEXT,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
    `);
    await p.query(`
        CREATE TABLE IF NOT EXISTS clinic_schedule (
            id SMALLINT PRIMARY KEY DEFAULT 1,
            payload JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT clinic_schedule_singleton CHECK (id = 1)
        )
    `);
    await p.query(
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE`
    );
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_bookings_reminder_pending ON bookings (reminder_sent) WHERE reminder_sent = FALSE`
    );
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS followup_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date_iso TEXT`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_locale VARCHAR(8) DEFAULT 'en'`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`);
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_bookings_stripe_customer_id ON bookings (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL`
    );
    await p.query(`
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id UUID PRIMARY KEY,
            claim_token VARCHAR(128) NOT NULL,
            quiz_id VARCHAR(64) NOT NULL,
            email VARCHAR(320),
            answers JSONB NOT NULL,
            result JSONB NOT NULL,
            score INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            claimed_at TIMESTAMPTZ
        )
    `);
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_email_lower ON quiz_attempts (LOWER(email)) WHERE email IS NOT NULL`
    );
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_unclaimed ON quiz_attempts (created_at) WHERE email IS NULL`
    );
    await p.query(`
        CREATE TABLE IF NOT EXISTS booking_invitations (
            id UUID PRIMARY KEY,
            invitation_token VARCHAR(128) UNIQUE NOT NULL,
            patient_name TEXT NOT NULL,
            patient_email VARCHAR(320) NOT NULL,
            patient_phone TEXT,
            service VARCHAR(64) NOT NULL,
            service_label TEXT,
            date_iso TEXT NOT NULL,
            time TEXT NOT NULL,
            locale VARCHAR(8) NOT NULL DEFAULT 'pt',
            amount_cents INTEGER NOT NULL,
            currency VARCHAR(8) NOT NULL DEFAULT 'eur',
            stripe_session_id VARCHAR(255),
            stripe_session_url TEXT,
            stripe_session_expires_at TIMESTAMPTZ,
            status VARCHAR(24) NOT NULL DEFAULT 'pending',
            booking_ref VARCHAR(64),
            created_by TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            paid_at TIMESTAMPTZ,
            cancelled_at TIMESTAMPTZ
        )
    `);
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_invitations_slot ON booking_invitations (date_iso, time) WHERE status = 'pending'`
    );
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_invitations_stripe_session ON booking_invitations (stripe_session_id) WHERE stripe_session_id IS NOT NULL`
    );
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_invitations_email_lower ON booking_invitations (LOWER(patient_email))`
    );
    await p.query(`ALTER TABLE booking_invitations ADD COLUMN IF NOT EXISTS traveller_count INTEGER NOT NULL DEFAULT 1`);
    await p.query(`ALTER TABLE booking_invitations ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS patient_reviews (
            id UUID PRIMARY KEY,
            author_name TEXT,
            email VARCHAR(320),
            rating SMALLINT NOT NULL DEFAULT 5,
            body TEXT NOT NULL,
            is_public BOOLEAN NOT NULL DEFAULT FALSE,
            locale VARCHAR(8) NOT NULL DEFAULT 'pt',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_patient_reviews_public ON patient_reviews (created_at DESC) WHERE is_public = TRUE`
    );
}

function rowToReview(row) {
    return {
        id: row.id,
        authorName: row.author_name || '',
        email: row.email || '',
        rating: row.rating != null ? row.rating : 5,
        body: row.body,
        isPublic: row.is_public === true,
        locale: row.locale || 'pt',
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
}

async function insertReview(record) {
    const p = getPool();
    const rating = Math.min(5, Math.max(1, parseInt(record.rating, 10) || 5));
    const r = await p.query(
        `INSERT INTO patient_reviews (id, author_name, email, rating, body, is_public, locale)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            record.id,
            record.authorName || null,
            record.email || null,
            rating,
            record.body,
            record.isPublic === true,
            record.locale || 'pt'
        ]
    );
    return rowToReview(r.rows[0]);
}

async function listPublicReviews(limit = 50) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const r = await p.query(
        `SELECT id, author_name, rating, body, locale, created_at
         FROM patient_reviews
         WHERE is_public = TRUE
         ORDER BY created_at DESC
         LIMIT $1`,
        [cap]
    );
    return r.rows.map((row) => ({
        id: row.id,
        authorName: row.author_name || '',
        rating: row.rating,
        body: row.body,
        locale: row.locale || 'pt',
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));
}

async function listAllReviews(limit = 100) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const r = await p.query(
        `SELECT * FROM patient_reviews ORDER BY created_at DESC LIMIT $1`,
        [cap]
    );
    return r.rows.map(rowToReview);
}

function rowToInvitation(row) {
    return {
        id: row.id,
        invitationToken: row.invitation_token,
        patientName: row.patient_name,
        patientEmail: row.patient_email,
        patientPhone: row.patient_phone || '',
        service: row.service,
        serviceLabel: row.service_label || row.service,
        dateIso: row.date_iso,
        time: row.time,
        locale: row.locale || 'pt',
        amountCents: row.amount_cents,
        currency: row.currency || 'eur',
        stripeSessionId: row.stripe_session_id || null,
        stripeSessionUrl: row.stripe_session_url || null,
        stripeSessionExpiresAt:
            row.stripe_session_expires_at instanceof Date
                ? row.stripe_session_expires_at.toISOString()
                : row.stripe_session_expires_at,
        status: row.status,
        travellerCount: row.traveller_count != null ? row.traveller_count : 1,
        hasInsurance: row.has_insurance === true,
        bookingRef: row.booking_ref || null,
        createdBy: row.created_by || null,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        paidAt: row.paid_at instanceof Date ? row.paid_at.toISOString() : row.paid_at,
        cancelledAt:
            row.cancelled_at instanceof Date ? row.cancelled_at.toISOString() : row.cancelled_at
    };
}

async function insertInvitation(record) {
    const p = getPool();
    const r = await p.query(
        `INSERT INTO booking_invitations (
            id, invitation_token, patient_name, patient_email, patient_phone,
            service, service_label, date_iso, time, locale,
            amount_cents, currency, stripe_session_id, stripe_session_url, stripe_session_expires_at,
            status, booking_ref, created_by, traveller_count, has_insurance
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING *`,
        [
            record.id,
            record.invitationToken,
            record.patientName,
            record.patientEmail,
            record.patientPhone || null,
            record.service,
            record.serviceLabel || null,
            record.dateIso,
            record.time,
            record.locale || 'pt',
            record.amountCents,
            record.currency || 'eur',
            record.stripeSessionId || null,
            record.stripeSessionUrl || null,
            record.stripeSessionExpiresAt || null,
            record.status || 'pending',
            record.bookingRef || null,
            record.createdBy || null,
            Math.max(1, Math.min(4, parseInt(record.travellerCount, 10) || 1)),
            record.hasInsurance === true
        ]
    );
    return rowToInvitation(r.rows[0]);
}

async function updateInvitationStripeSession(id, session) {
    const p = getPool();
    const r = await p.query(
        `UPDATE booking_invitations
         SET stripe_session_id = $2, stripe_session_url = $3, stripe_session_expires_at = $4
         WHERE id = $1
         RETURNING *`,
        [id, session.id, session.url, session.expiresAt || null]
    );
    return r.rows[0] ? rowToInvitation(r.rows[0]) : null;
}

async function findInvitationById(id) {
    const p = getPool();
    const r = await p.query(`SELECT * FROM booking_invitations WHERE id = $1`, [id]);
    return r.rows[0] ? rowToInvitation(r.rows[0]) : null;
}

async function findInvitationByStripeSessionId(sessionId) {
    const p = getPool();
    const r = await p.query(`SELECT * FROM booking_invitations WHERE stripe_session_id = $1`, [sessionId]);
    return r.rows[0] ? rowToInvitation(r.rows[0]) : null;
}

async function listInvitations(limit = 100) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const r = await p.query(
        `SELECT * FROM booking_invitations ORDER BY created_at DESC LIMIT $1`,
        [cap]
    );
    return r.rows.map(rowToInvitation);
}

async function listPendingInvitationsForDateIso(dateIso) {
    const p = getPool();
    const r = await p.query(
        `SELECT * FROM booking_invitations WHERE date_iso = $1 AND status = 'pending'`,
        [dateIso]
    );
    return r.rows.map(rowToInvitation);
}

async function markInvitationPaid(id, bookingRef) {
    const p = getPool();
    const r = await p.query(
        `UPDATE booking_invitations
         SET status = 'paid', paid_at = NOW(), booking_ref = $2
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id, bookingRef || null]
    );
    return r.rows[0] ? rowToInvitation(r.rows[0]) : null;
}

async function cancelInvitation(id) {
    const p = getPool();
    const r = await p.query(
        `UPDATE booking_invitations
         SET status = 'cancelled', cancelled_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id]
    );
    return r.rows[0] ? rowToInvitation(r.rows[0]) : null;
}

function rowToQuizAttempt(row) {
    return {
        id: row.id,
        claimToken: row.claim_token,
        quizId: row.quiz_id,
        email: row.email || null,
        answers: row.answers,
        result: row.result,
        score: row.score,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        claimedAt: row.claimed_at instanceof Date ? row.claimed_at.toISOString() : row.claimed_at || null
    };
}

async function insertQuizAttempt(record) {
    const p = getPool();
    const r = await p.query(
        `INSERT INTO quiz_attempts (id, claim_token, quiz_id, email, answers, result, score)
         VALUES ($1, $2, $3, NULL, $4, $5, $6)
         RETURNING *`,
        [record.id, record.claimToken, record.quizId, JSON.stringify(record.answers), JSON.stringify(record.result), record.score]
    );
    return rowToQuizAttempt(r.rows[0]);
}

async function findQuizAttemptById(id) {
    const p = getPool();
    const r = await p.query(`SELECT * FROM quiz_attempts WHERE id = $1`, [id]);
    return r.rows[0] ? rowToQuizAttempt(r.rows[0]) : null;
}

async function claimQuizAttempt(id, claimToken, email) {
    const p = getPool();
    const e = email.toLowerCase().trim();
    const r = await p.query(
        `UPDATE quiz_attempts
         SET email = $3, claimed_at = NOW()
         WHERE id = $1 AND claim_token = $2 AND email IS NULL
         RETURNING *`,
        [id, claimToken, e]
    );
    return r.rows[0] ? rowToQuizAttempt(r.rows[0]) : null;
}

async function findQuizAttemptsByEmail(email, limit = 50) {
    const p = getPool();
    const e = email.toLowerCase().trim();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const r = await p.query(
        `SELECT * FROM quiz_attempts
         WHERE LOWER(TRIM(email)) = $1
         ORDER BY COALESCE(claimed_at, created_at) DESC
         LIMIT $2`,
        [e, cap]
    );
    return r.rows.map(rowToQuizAttempt);
}

/** IANA name for PostgreSQL AT TIME ZONE (schedule timezone). */
function sanitizeTimeZoneName(raw) {
    const s = String(raw || '').trim();
    if (/^[A-Za-z0-9_+\/-]+$/.test(s) && s.length <= 64) return s;
    return 'Europe/Lisbon';
}

/** Candidates for 24h reminder — server filters by appointment window. */
async function findBookingsNeeding24hReminder() {
    const p = getPool();
    const r = await p.query(
        `SELECT * FROM bookings
         WHERE cancelled = FALSE AND reminder_sent = FALSE
         ORDER BY created_at DESC`
    );
    return r.rows.map(rowToBooking);
}

/** Candidates for 1h reminder — server filters by appointment window. */
async function findBookingsNeeding1hReminder() {
    const p = getPool();
    const r = await p.query(
        `SELECT * FROM bookings
         WHERE cancelled = FALSE AND reminder_1h_sent = FALSE
         ORDER BY created_at DESC`
    );
    return r.rows.map(rowToBooking);
}

/** Post-consultation follow-up — server filters by end time + 1h. */
async function findBookingsNeedingFollowup() {
    const p = getPool();
    const r = await p.query(
        `SELECT * FROM bookings
         WHERE cancelled = FALSE AND followup_sent = FALSE
         ORDER BY created_at DESC`
    );
    return r.rows.map(rowToBooking);
}

async function markReminderSent(bookingRef) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings SET reminder_sent = TRUE WHERE booking_ref = $1 AND reminder_sent = FALSE`,
        [bookingRef]
    );
    return r.rowCount > 0;
}

async function markReminder1hSent(bookingRef) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings SET reminder_1h_sent = TRUE WHERE booking_ref = $1 AND reminder_1h_sent = FALSE`,
        [bookingRef]
    );
    return r.rowCount > 0;
}

async function markFollowupSent(bookingRef) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings SET followup_sent = TRUE WHERE booking_ref = $1 AND followup_sent = FALSE`,
        [bookingRef]
    );
    return r.rowCount > 0;
}

async function cancelBookingByRef(bookingRef) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings SET cancelled = TRUE WHERE booking_ref = $1 AND cancelled = FALSE RETURNING *`,
        [bookingRef]
    );
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
}

async function rescheduleBookingByRef(bookingRef, fields) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings SET
            date = $2,
            time = $3,
            date_iso = $4,
            reschedule_count = $5
         WHERE booking_ref = $1 AND cancelled = FALSE
         RETURNING *`,
        [
            bookingRef,
            fields.date,
            fields.time,
            fields.dateIso,
            fields.rescheduleCount
        ]
    );
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
}

/** True if another active booking uses the same slot (excluding optional bookingRef). */
async function isSlotTakenByOther(dateIso, time, excludeBookingRef) {
    const p = getPool();
    const r = await p.query(
        `SELECT 1 FROM bookings
         WHERE cancelled = FALSE
           AND date_iso = $1
           AND time = $2
           AND ($3::text IS NULL OR booking_ref <> $3)
         LIMIT 1`,
        [dateIso, time, excludeBookingRef || null]
    );
    return r.rowCount > 0;
}

/** Active bookings on a calendar day (for progressive slot grouping). */
async function listBookingsForDateIso(dateIso) {
    const p = getPool();
    if (!p) return [];
    const r = await p.query(
        `SELECT * FROM bookings WHERE cancelled = FALSE AND date_iso = $1`,
        [dateIso]
    );
    return r.rows.map(rowToBooking);
}

async function initDatabase() {
    const rawUrl = process.env.DATABASE_URL;
    const hasUrl = hasDatabaseUrl();
    const discrete = hasDiscreteDbCredentials();
    console.log(`   🗄️  initDatabase(): DATABASE_URL is ${hasUrl ? 'set' : 'NOT set'}`);
    if (discrete && !hasUrl) {
        console.log('   🗄️  initDatabase(): using DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
    }
    if (hasUrl) {
        const trimmed = String(rawUrl).trim();
        console.log(
            `   🗄️  initDatabase(): connection string length: ${trimmed.length} (credentials not logged)`
        );
    }

    const p = getPool();
    if (!p) {
        return { ok: false, reason: 'no_db_config' };
    }

    try {
        await p.query('SELECT 1');
        await initSchema(p);
        console.log('   🗄️  PostgreSQL connected (bookings, clinical_notes, clinic_schedule)');
        return { ok: true };
    } catch (err) {
        console.error('   ❌ PostgreSQL connection or schema init failed');
        console.error('   Full error message:', err && err.message);
        console.error('   Full error stack:\n', err && err.stack);
        if (err && err.code) {
            console.error('   PostgreSQL / libpq code:', err.code);
        }
        if (err && err.detail) {
            console.error('   Detail:', err.detail);
        }
        if (err && err.hint) {
            console.error('   Hint:', err.hint);
        }
        if (err && err.severity) {
            console.error('   Severity:', err.severity);
        }
        console.error('   Full error (util.inspect):', util.inspect(err, { depth: 8, colors: false }));
        throw err;
    }
}

async function bookingExistsByPaymentId(paymentId) {
    const p = getPool();
    const r = await p.query('SELECT 1 FROM bookings WHERE payment_id = $1 LIMIT 1', [paymentId]);
    return r.rowCount > 0;
}

/**
 * Prior paid bookings for the same person (normalized email OR Stripe Customer id), excluding this payment.
 * Used for Google Ads new_customer when Stripe links repeat purchases to cus_* even if email differs.
 */
async function countPriorBookingsExcludingPayment(paymentId, email, stripeCustomerId) {
    const p = getPool();
    const e = (email || '').toLowerCase().trim();
    const sc = (stripeCustomerId || '').trim();
    if (!paymentId) return 0;
    if (!e && !sc) return 0;
    const r = await p.query(
        `SELECT COUNT(*)::int AS c FROM bookings
         WHERE payment_id <> $1
         AND (
           ($2::text <> '' AND LOWER(TRIM(email)) = $2)
           OR ($3::text <> '' AND stripe_customer_id IS NOT NULL AND stripe_customer_id = $3)
         )`,
        [paymentId, e, sc]
    );
    return r.rows[0] ? r.rows[0].c : 0;
}

async function insertBooking(booking) {
    const p = getPool();
    const r = await p.query(
        `INSERT INTO bookings (
            booking_ref, email, service, date, time, patient_name, traveller_count,
            amount, currency, payment_id, stripe_customer_id,
            date_iso, patient_locale,
            cancelled, reschedule_count, reminder_sent, reminder_1h_sent, followup_sent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (payment_id) DO NOTHING
        RETURNING *`,
        [
            booking.bookingRef,
            booking.email,
            booking.service,
            booking.date,
            booking.time,
            booking.patientName,
            booking.travellerCount,
            booking.amount,
            booking.currency,
            booking.paymentId,
            booking.stripeCustomerId || null,
            booking.dateIso || null,
            booking.patientLocale || 'en',
            booking.cancelled === true,
            booking.rescheduleCount != null ? booking.rescheduleCount : 0,
            booking.reminderSent === true,
            booking.reminder1hSent === true,
            booking.followupSent === true
        ]
    );
    return r.rowCount > 0;
}

/** Patient portal: only return a booking when email and booking reference both match. */
async function findBookingsByEmailAndRef(email, bookingRef) {
    const p = getPool();
    const e = email.toLowerCase().trim();
    const ref = bookingRef.trim().toUpperCase();
    const r = await p.query(
        `SELECT * FROM bookings
         WHERE LOWER(TRIM(email)) = $1 AND UPPER(TRIM(booking_ref)) = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [e, ref]
    );
    return r.rows.map(rowToBooking);
}

/** Patient portal: all bookings for an email (most recent first). */
async function findBookingsByEmail(email, limit = 50) {
    const p = getPool();
    const e = email.toLowerCase().trim();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const r = await p.query(
        `SELECT * FROM bookings
         WHERE LOWER(TRIM(email)) = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [e, cap]
    );
    return r.rows.map(rowToBooking);
}

async function findAllBookings() {
    const p = getPool();
    const r = await p.query('SELECT * FROM bookings');
    return r.rows.map(rowToBooking);
}

function joinedRowToBookingWithNotes(row) {
    const booking = rowToBooking(row);
    let clinicalNotes = null;
    if (row.n_created_at != null) {
        clinicalNotes = {
            bookingRef: row.booking_ref,
            consultationDate: row.n_consultation_date,
            notes: row.n_notes || '',
            diagnosis: row.n_diagnosis || '',
            prescriptions: row.n_prescriptions || '',
            followUp: row.n_follow_up || '',
            createdBy: row.n_created_by || '',
            createdAt:
                row.n_created_at instanceof Date ? row.n_created_at.toISOString() : row.n_created_at,
            updatedAt:
                row.n_updated_at instanceof Date ? row.n_updated_at.toISOString() : row.n_updated_at
        };
    }
    return {
        ...booking,
        hasClinicalNotes: !!clinicalNotes,
        clinicalNotes
    };
}

async function findAllBookingsWithClinicalNotes() {
    const p = getPool();
    const r = await p.query(`
        SELECT b.*,
            n.consultation_date AS n_consultation_date,
            n.notes AS n_notes,
            n.diagnosis AS n_diagnosis,
            n.prescriptions AS n_prescriptions,
            n.follow_up AS n_follow_up,
            n.created_by AS n_created_by,
            n.created_at AS n_created_at,
            n.updated_at AS n_updated_at
        FROM bookings b
        LEFT JOIN clinical_notes n ON n.booking_ref = b.booking_ref
    `);
    return r.rows.map(joinedRowToBookingWithNotes);
}

async function findBookingByRef(bookingRef) {
    const p = getPool();
    const r = await p.query('SELECT * FROM bookings WHERE booking_ref = $1 LIMIT 1', [bookingRef]);
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
}

async function getClinicalNoteByRef(bookingRef) {
    const p = getPool();
    const r = await p.query('SELECT * FROM clinical_notes WHERE booking_ref = $1 LIMIT 1', [bookingRef]);
    return r.rows[0] ? rowToClinicalNote(r.rows[0]) : null;
}

async function upsertClinicalNote(note) {
    const p = getPool();
    await p.query(
        `INSERT INTO clinical_notes (
            booking_ref, consultation_date, notes, diagnosis, prescriptions, follow_up, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz)
        ON CONFLICT (booking_ref) DO UPDATE SET
            consultation_date = EXCLUDED.consultation_date,
            notes = EXCLUDED.notes,
            diagnosis = EXCLUDED.diagnosis,
            prescriptions = EXCLUDED.prescriptions,
            follow_up = EXCLUDED.follow_up,
            created_by = EXCLUDED.created_by,
            updated_at = EXCLUDED.updated_at`,
        [
            note.bookingRef,
            note.consultationDate,
            note.notes,
            note.diagnosis,
            note.prescriptions,
            note.followUp,
            note.createdBy,
            note.createdAt,
            note.updatedAt
        ]
    );
}

async function getSchedulePayload() {
    const p = getPool();
    const r = await p.query('SELECT payload FROM clinic_schedule WHERE id = 1 LIMIT 1');
    return r.rows[0] ? r.rows[0].payload : null;
}

async function saveSchedulePayload(payload) {
    const p = getPool();
    await p.query(
        `INSERT INTO clinic_schedule (id, payload, updated_at) VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [JSON.stringify(payload)]
    );
}

async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

(() => {
    const url = hasDatabaseUrl();
    const discrete = hasDiscreteDbCredentials();
    const on = isDatabaseEnabled();
    console.log(
        `   🗄️  PostgreSQL ${on ? 'enabled' : 'disabled'} — DATABASE_URL: ${url ? 'set' : 'not set'}; DB_HOST/USER/PASSWORD: ${discrete ? 'all set' : 'incomplete'} (startup, db module)`
    );
})();

module.exports = {
    getPool,
    isDatabaseEnabled,
    initDatabase,
    bookingExistsByPaymentId,
    countPriorBookingsExcludingPayment,
    insertBooking,
    findBookingsByEmailAndRef,
    findBookingsByEmail,
    insertQuizAttempt,
    findQuizAttemptById,
    claimQuizAttempt,
    findQuizAttemptsByEmail,
    insertInvitation,
    updateInvitationStripeSession,
    findInvitationById,
    findInvitationByStripeSessionId,
    listInvitations,
    listPendingInvitationsForDateIso,
    markInvitationPaid,
    cancelInvitation,
    insertReview,
    listPublicReviews,
    listAllReviews,
    findAllBookings,
    findAllBookingsWithClinicalNotes,
    findBookingByRef,
    getClinicalNoteByRef,
    upsertClinicalNote,
    getSchedulePayload,
    saveSchedulePayload,
    findBookingsNeeding24hReminder,
    findBookingsNeeding1hReminder,
    findBookingsNeedingFollowup,
    markReminderSent,
    markReminder1hSent,
    markFollowupSent,
    cancelBookingByRef,
    rescheduleBookingByRef,
    isSlotTakenByOther,
    listBookingsForDateIso,
    closePool
};
