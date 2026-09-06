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
        patientPhone: row.patient_phone || '',
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
        consultationCompleted: row.consultation_completed === true,
        professional: row.professional || '',
        markedPaid: row.marked_paid === true,
        invoiceSent: row.invoice_sent === true,
        reviewRequested: row.review_requested === true,
        visitFrequency: row.visit_frequency || '',
        patientType: row.patient_type || '',
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
        intakeToken: row.intake_token || '',
        intakeCompletedAt: row.intake_completed_at
            ? (row.intake_completed_at instanceof Date
                ? row.intake_completed_at.toISOString()
                : row.intake_completed_at)
            : null,
        intakeReminderSent: row.intake_reminder_sent === true,
        intake: parseIntakeJson(row.intake_json),
        hasPatientIntake: !!row.intake_completed_at
    };
}

function parseIntakeJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
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
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_phone TEXT`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS professional TEXT`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marked_paid BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_requested BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consultation_completed BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS visit_frequency VARCHAR(64)`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_type VARCHAR(32)`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS intake_token VARCHAR(128)`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS intake_json JSONB`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMPTZ`);
    await p.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS intake_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    await p.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_intake_token ON bookings (intake_token) WHERE intake_token IS NOT NULL`
    );
    try {
        await p.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
            ON bookings (date_iso, (LEFT(TRIM(time), 5)))
            WHERE cancelled = FALSE
              AND date_iso IS NOT NULL
              AND TRIM(COALESCE(time, '')) <> ''
        `);
    } catch (err) {
        console.warn('   ⚠️  idx_bookings_active_slot skipped:', err.message);
    }
    await p.query(`
        CREATE TABLE IF NOT EXISTS slot_holds (
            id VARCHAR(64) PRIMARY KEY,
            slot_id VARCHAR(32) NOT NULL,
            date_iso CHAR(10) NOT NULL,
            time VARCHAR(5) NOT NULL,
            service VARCHAR(64),
            holder_token VARCHAR(64) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_holds_slot ON slot_holds (date_iso, time)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_slot_holds_holder ON slot_holds (holder_token)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_slot_holds_expires ON slot_holds (expires_at)`);
    // Backfill Stripe (and complimentary) rows that were never admin-edited for tracking fields.
    await p.query(`
        UPDATE bookings
        SET marked_paid = TRUE, invoice_sent = TRUE
        WHERE payment_id NOT LIKE 'manual_%'
          AND payment_id NOT LIKE 'comp_%'
          AND marked_paid = FALSE
          AND invoice_sent = FALSE
          AND review_requested = FALSE
          AND (professional IS NULL OR TRIM(professional) = '')
    `);
    await p.query(`
        UPDATE bookings
        SET marked_paid = TRUE
        WHERE payment_id LIKE 'comp_%'
          AND marked_paid = FALSE
          AND invoice_sent = FALSE
          AND review_requested = FALSE
          AND (professional IS NULL OR TRIM(professional) = '')
    `);
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
    await p.query(`
        CREATE TABLE IF NOT EXISTS psychologist_applications (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            name TEXT NOT NULL,
            email VARCHAR(320) NOT NULL,
            phone TEXT,
            score INTEGER NOT NULL DEFAULT 0,
            score_band VARCHAR(32) NOT NULL,
            eligible BOOLEAN NOT NULL DEFAULT FALSE,
            elimination_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
            payload JSONB NOT NULL,
            cv_filename TEXT
        )
    `);
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_psychologist_applications_email_lower ON psychologist_applications (LOWER(email))`
    );
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_psychologist_applications_created ON psychologist_applications (created_at DESC)`
    );
    // Denormalized form fields for filtering / matching
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS localidade TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS pais TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS cedula_opp TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS grau_academico TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS anos_clinica TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS anos_individuais TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS experiencia_online TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS areas_clinicas JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS populacoes JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS idiomas JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS modelos JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS dias_semana JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS horas_iniciais TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS horarios_fixos TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS disponibilidade_estavel TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS bolsa_autorizacao TEXT`);
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await p.query(
        `ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'novo'`
    );
    await p.query(`ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
    await p.query(
        `ALTER TABLE psychologist_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    );
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_psychologist_applications_status ON psychologist_applications (status)`
    );
    await p.query(
        `CREATE INDEX IF NOT EXISTS idx_psychologist_applications_band ON psychologist_applications (score_band)`
    );
    await p.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
            id BIGSERIAL PRIMARY KEY,
            event_id UUID NOT NULL UNIQUE,
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            name VARCHAR(64) NOT NULL,
            source VARCHAR(16) NOT NULL DEFAULT 'client',
            visitor_id VARCHAR(64),
            session_id VARCHAR(64),
            page_path TEXT,
            page_title TEXT,
            referrer TEXT,
            landing_path TEXT,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_content TEXT,
            utm_term TEXT,
            gclid TEXT,
            fbclid TEXT,
            channel VARCHAR(32),
            device VARCHAR(16),
            browser VARCHAR(32),
            os VARCHAR(32),
            country VARCHAR(8),
            lang VARCHAR(16),
            props JSONB NOT NULL DEFAULT '{}'::jsonb,
            revenue_cents INTEGER,
            currency VARCHAR(8),
            booking_ref VARCHAR(64)
        )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_analytics_occurred ON analytics_events (occurred_at DESC)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_analytics_name_time ON analytics_events (name, occurred_at DESC)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events (session_id, occurred_at DESC)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_analytics_channel ON analytics_events (channel, occurred_at DESC)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_analytics_path ON analytics_events (page_path, occurred_at DESC)`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS professionals (
            id SERIAL PRIMARY KEY,
            username VARCHAR(64) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            doxy_room_url TEXT,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_username_lower ON professionals (LOWER(username))`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_professionals_display_lower ON professionals (LOWER(TRIM(display_name)))`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS staff_profiles (
            username VARCHAR(64) PRIMARY KEY,
            profession VARCHAR(32) NOT NULL DEFAULT '',
            ordem_number TEXT NOT NULL DEFAULT '',
            bio TEXT NOT NULL DEFAULT '',
            primary_area TEXT NOT NULL DEFAULT '',
            secondary_area TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS photo_mime TEXT`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS photo_data BYTEA`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS credentials TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS iban TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS nif TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS citizen_card TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS insurer TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS insurance_policy TEXT NOT NULL DEFAULT ''`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS insurance_valid_until DATE`);
    await p.query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS payouts_from_month VARCHAR(7) NOT NULL DEFAULT ''`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS staff_invoices (
            username VARCHAR(64) NOT NULL,
            month VARCHAR(7) NOT NULL,
            original_name TEXT NOT NULL DEFAULT '',
            mime TEXT NOT NULL DEFAULT '',
            file_data BYTEA,
            uploaded_at TIMESTAMPTZ,
            payment_sent BOOLEAN NOT NULL DEFAULT FALSE,
            payment_sent_at TIMESTAMPTZ,
            PRIMARY KEY (username, month)
        )
    `);
    await p.query(`ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS staff_month_availability (
            username VARCHAR(64) NOT NULL,
            month VARCHAR(7) NOT NULL,
            confirmed BOOLEAN NOT NULL DEFAULT FALSE,
            confirmed_at TIMESTAMPTZ,
            reminder_10_sent BOOLEAN NOT NULL DEFAULT FALSE,
            reminder_15_sent BOOLEAN NOT NULL DEFAULT FALSE,
            PRIMARY KEY (username, month)
        )
    `);
    await p.query(`
        CREATE TABLE IF NOT EXISTS staff_documents (
            id SERIAL PRIMARY KEY,
            username VARCHAR(64) NOT NULL,
            kind VARCHAR(32) NOT NULL,
            original_name TEXT NOT NULL,
            mime TEXT NOT NULL DEFAULT 'application/octet-stream',
            valid_until DATE,
            file_data BYTEA NOT NULL,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_documents_user_kind ON staff_documents (username, kind)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_staff_documents_username ON staff_documents (username)`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS producers (
            id UUID PRIMARY KEY,
            slug VARCHAR(160) UNIQUE NOT NULL,
            name TEXT NOT NULL,
            short_description TEXT NOT NULL DEFAULT '',
            long_description TEXT NOT NULL DEFAULT '',
            categories JSONB NOT NULL DEFAULT '[]'::jsonb,
            district VARCHAR(64) NOT NULL DEFAULT '',
            municipality TEXT NOT NULL DEFAULT '',
            address TEXT NOT NULL DEFAULT '',
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            cert_body TEXT NOT NULL DEFAULT '',
            cert_number TEXT NOT NULL DEFAULT '',
            cert_image TEXT,
            website TEXT NOT NULL DEFAULT '',
            email VARCHAR(320) NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            social JSONB NOT NULL DEFAULT '{}'::jsonb,
            photos JSONB NOT NULL DEFAULT '[]'::jsonb,
            sales_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
            status VARCHAR(16) NOT NULL DEFAULT 'pendente',
            admin_notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_producers_status ON producers (status)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_producers_district ON producers (district)`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_producers_name_lower ON producers (LOWER(name))`);
}

function rowToAnalyticsEvent(row) {
    if (!row) return null;
    return {
        eventId: row.event_id,
        occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
        name: row.name,
        source: row.source,
        visitorId: row.visitor_id,
        sessionId: row.session_id,
        pagePath: row.page_path,
        pageTitle: row.page_title,
        referrer: row.referrer,
        landingPath: row.landing_path,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        utmContent: row.utm_content,
        utmTerm: row.utm_term,
        gclid: row.gclid,
        fbclid: row.fbclid,
        channel: row.channel,
        device: row.device,
        browser: row.browser,
        os: row.os,
        country: row.country,
        lang: row.lang,
        props: row.props && typeof row.props === 'object' ? row.props : {},
        revenueCents: row.revenue_cents,
        currency: row.currency,
        bookingRef: row.booking_ref,
        staff:
            row.channel === 'internal' ||
            !!(row.props && typeof row.props === 'object' && (row.props.audience === 'staff' || row.props.audience === 'admin'))
    };
}

async function insertAnalyticsEvents(rows) {
    const p = getPool();
    if (!p || !Array.isArray(rows) || !rows.length) return 0;
    let inserted = 0;
    for (const row of rows) {
        try {
            const r = await p.query(
                `INSERT INTO analytics_events (
                    event_id, occurred_at, name, source, visitor_id, session_id,
                    page_path, page_title, referrer, landing_path,
                    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                    gclid, fbclid, channel, device, browser, os, country, lang,
                    props, revenue_cents, currency, booking_ref
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10,
                    $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20, $21, $22, $23,
                    $24::jsonb, $25, $26, $27
                ) ON CONFLICT (event_id) DO NOTHING`,
                [
                    row.eventId,
                    row.occurredAt,
                    row.name,
                    row.source,
                    row.visitorId,
                    row.sessionId,
                    row.pagePath,
                    row.pageTitle,
                    row.referrer,
                    row.landingPath,
                    row.utmSource,
                    row.utmMedium,
                    row.utmCampaign,
                    row.utmContent,
                    row.utmTerm,
                    row.gclid,
                    row.fbclid,
                    row.channel,
                    row.device,
                    row.browser,
                    row.os,
                    row.country,
                    row.lang,
                    JSON.stringify(row.props || {}),
                    row.revenueCents,
                    row.currency,
                    row.bookingRef
                ]
            );
            inserted += r.rowCount || 0;
        } catch (err) {
            console.error('insertAnalyticsEvents:', err.message);
        }
    }
    return inserted;
}

async function listAnalyticsEventsBetween(fromIso, toIso, { excludeHeartbeat } = {}) {
    const p = getPool();
    const r = await p.query(
        `SELECT * FROM analytics_events
         WHERE occurred_at >= $1::timestamptz AND occurred_at <= $2::timestamptz
           AND ($3::boolean IS NOT TRUE OR name <> 'heartbeat')
         ORDER BY occurred_at ASC
         LIMIT 50000`,
        [fromIso, toIso, !!excludeHeartbeat]
    );
    return r.rows.map(rowToAnalyticsEvent);
}

async function listLiveAnalyticsSessions(sinceIso) {
    const p = getPool();
    const r = await p.query(
        `SELECT session_id,
                BOOL_OR(channel = 'internal' OR COALESCE(props->>'audience', '') IN ('staff', 'admin')) AS staff
         FROM analytics_events
         WHERE occurred_at >= $1::timestamptz AND session_id IS NOT NULL
           AND name IN ('heartbeat', 'page_view')
         GROUP BY session_id`,
        [sinceIso]
    );
    return r.rows.map((row) => ({ sessionId: row.session_id, staff: row.staff === true }));
}

async function listStaffVisitorIds() {
    const p = getPool();
    const r = await p.query(
        `SELECT DISTINCT visitor_id
         FROM analytics_events
         WHERE visitor_id IS NOT NULL
           AND (channel = 'internal' OR COALESCE(props->>'audience', '') IN ('staff', 'admin'))
         LIMIT 8000`
    );
    return r.rows.map((row) => row.visitor_id).filter(Boolean);
}

async function analyticsBookingStats(fromIso, toIso, { funnel } = {}) {
    const p = getPool();
    const isJobs = funnel === 'job_application';
    const serviceFilter = isJobs
        ? `AND service = 'entrevista'`
        : `AND service IS DISTINCT FROM 'entrevista'`;
    const r = await p.query(
        `SELECT COUNT(*)::int AS c, COALESCE(SUM(amount), 0)::int AS revenue
         FROM bookings
         WHERE cancelled = FALSE
           AND created_at >= $1::timestamptz AND created_at <= $2::timestamptz
           ${serviceFilter}`,
        [fromIso, toIso]
    );
    const s = await p.query(
        `SELECT COALESCE(NULLIF(TRIM(service), ''), 'unspecified') AS service, COUNT(*)::int AS c
         FROM bookings
         WHERE cancelled = FALSE
           AND created_at >= $1::timestamptz AND created_at <= $2::timestamptz
           ${serviceFilter}
         GROUP BY 1
         ORDER BY c DESC
         LIMIT 10`,
        [fromIso, toIso]
    );
    return {
        count: r.rows[0] ? r.rows[0].c : 0,
        revenueCents: isJobs ? 0 : (r.rows[0] ? r.rows[0].revenue : 0),
        services: s.rows.map((row) => ({ service: row.service, count: row.c }))
    };
}

async function analyticsApplicationStats(fromIso, toIso) {
    const p = getPool();
    const r = await p.query(
        `SELECT COUNT(*)::int AS c
         FROM psychologist_applications
         WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz`,
        [fromIso, toIso]
    );
    return { count: r.rows[0] ? r.rows[0].c : 0 };
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

async function insertPsychologistApplication(record) {
    const p = getPool();
    const payload = record.payload && typeof record.payload === 'object' ? record.payload : {};
    const asArr = (v) => (Array.isArray(v) ? v : []);
    const r = await p.query(
        `INSERT INTO psychologist_applications
            (id, name, email, phone, score, score_band, eligible, elimination_reasons, payload, cv_filename,
             localidade, pais, cedula_opp, grau_academico, anos_clinica, anos_individuais, experiencia_online,
             areas_clinicas, populacoes, idiomas, modelos, dias_semana,
             horas_iniciais, horarios_fixos, disponibilidade_estavel, bolsa_autorizacao,
             score_breakdown, status, admin_notes, updated_at)
         VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10,
            $11, $12, $13, $14, $15, $16, $17,
            $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, $22::jsonb,
            $23, $24, $25, $26,
            $27::jsonb, $28, $29, NOW()
         )
         RETURNING *`,
        [
            record.id,
            record.name,
            record.email,
            record.phone || null,
            Number.isFinite(record.score) ? record.score : 0,
            record.scoreBand || 'nao_avanca',
            record.eligible === true,
            JSON.stringify(record.eliminationReasons || []),
            JSON.stringify(payload),
            record.cvFilename || null,
            payload.localidade || null,
            payload.pais || null,
            payload.cedula_opp || null,
            payload.grau_academico || null,
            payload.anos_clinica || null,
            payload.anos_individuais || null,
            payload.experiencia_online || null,
            JSON.stringify(asArr(payload.areas_clinicas)),
            JSON.stringify(asArr(payload.populacoes)),
            JSON.stringify(asArr(payload.idiomas)),
            JSON.stringify(asArr(payload.modelos)),
            JSON.stringify(asArr(payload.dias_semana)),
            payload.horas_iniciais || null,
            payload.horarios_fixos || null,
            payload.disponibilidade_estavel || null,
            payload.bolsa_autorizacao || null,
            JSON.stringify(record.scoreBreakdown || {}),
            record.status || (record.eligible === false ? 'eliminado' : record.scoreBand || 'novo'),
            record.adminNotes || null
        ]
    );
    return rowToPsychologistApplication(r.rows[0]);
}

function rowToPsychologistApplication(row) {
    if (!row) return null;
    return {
        id: row.id,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        localidade: row.localidade || '',
        pais: row.pais || '',
        cedulaOpp: row.cedula_opp || '',
        grauAcademico: row.grau_academico || '',
        anosClinica: row.anos_clinica || '',
        anosIndividuais: row.anos_individuais || '',
        experienciaOnline: row.experiencia_online || '',
        areasClinicas: Array.isArray(row.areas_clinicas) ? row.areas_clinicas : [],
        populacoes: Array.isArray(row.populacoes) ? row.populacoes : [],
        idiomas: Array.isArray(row.idiomas) ? row.idiomas : [],
        modelos: Array.isArray(row.modelos) ? row.modelos : [],
        diasSemana: Array.isArray(row.dias_semana) ? row.dias_semana : [],
        horasIniciais: row.horas_iniciais || '',
        horariosFixos: row.horarios_fixos || '',
        disponibilidadeEstavel: row.disponibilidade_estavel || '',
        bolsaAutorizacao: row.bolsa_autorizacao || '',
        score: row.score != null ? Number(row.score) : 0,
        scoreBand: row.score_band || '',
        scoreBreakdown: row.score_breakdown && typeof row.score_breakdown === 'object' ? row.score_breakdown : {},
        eligible: row.eligible === true,
        eliminationReasons: Array.isArray(row.elimination_reasons) ? row.elimination_reasons : [],
        status: row.status || 'novo',
        adminNotes: row.admin_notes || '',
        cvFilename: row.cv_filename || '',
        payload: row.payload && typeof row.payload === 'object' ? row.payload : {}
    };
}

async function listPsychologistApplications({ status, band, q, limit } = {}) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 300);
    const clauses = [];
    const params = [];
    if (status) {
        params.push(String(status));
        clauses.push(`status = $${params.length}`);
    }
    if (band) {
        params.push(String(band));
        clauses.push(`score_band = $${params.length}`);
    }
    if (q && String(q).trim()) {
        params.push(`%${String(q).trim().toLowerCase()}%`);
        clauses.push(
            `(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(COALESCE(cedula_opp, '')) LIKE $${params.length})`
        );
    }
    params.push(cap);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await p.query(
        `SELECT * FROM psychologist_applications ${where}
         ORDER BY score DESC NULLS LAST, created_at DESC
         LIMIT $${params.length}`,
        params
    );
    return r.rows.map(rowToPsychologistApplication);
}

async function findPsychologistApplicationById(id) {
    const p = getPool();
    const r = await p.query(`SELECT * FROM psychologist_applications WHERE id = $1 LIMIT 1`, [id]);
    return rowToPsychologistApplication(r.rows[0]);
}

async function updatePsychologistApplication(id, patch) {
    const p = getPool();
    const allowedStatus = new Set([
        'novo',
        'prioritario',
        'shortlist',
        'entrevista',
        'aceite',
        'bolsa',
        'rejeitado',
        'eliminado'
    ]);
    const status =
        patch.status && allowedStatus.has(String(patch.status)) ? String(patch.status) : null;
    const adminNotes = patch.adminNotes !== undefined ? String(patch.adminNotes || '').slice(0, 4000) : null;
    if (status == null && adminNotes == null) {
        return findPsychologistApplicationById(id);
    }
    const r = await p.query(
        `UPDATE psychologist_applications SET
            status = COALESCE($2, status),
            admin_notes = COALESCE($3, admin_notes),
            updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, status, adminNotes]
    );
    return rowToPsychologistApplication(r.rows[0]);
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

async function findInvitationByToken(token) {
    const p = getPool();
    const r = await p.query(`SELECT * FROM booking_invitations WHERE invitation_token = $1`, [token]);
    return r.rows[0] ? rowToInvitation(r.rows[0]) : null;
}

async function listPendingInvitations(limit = 500) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 1000);
    const r = await p.query(
        `SELECT * FROM booking_invitations WHERE status = 'pending' ORDER BY date_iso ASC, time ASC LIMIT $1`,
        [cap]
    );
    return r.rows.map(rowToInvitation);
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

async function findDueQuizRecoveries(nowMs, limit = 20) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const r = await p.query(
        `SELECT * FROM quiz_attempts
         WHERE email IS NOT NULL
           AND COALESCE(result->>'recoveredAt','') = ''
           AND COALESCE(result->>'convertedAt','') = ''
           AND COALESCE(result->>'recoverAt','') ~ '^[0-9]+$'
           AND (result->>'recoverAt')::bigint <= $1
           AND claimed_at > NOW() - INTERVAL '48 hours'
         ORDER BY claimed_at ASC
         LIMIT $2`,
        [Number(nowMs) || Date.now(), cap]
    );
    return r.rows.map(rowToQuizAttempt);
}

async function findDueNutricaoNurture(limit = 50) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 80);
    const r = await p.query(
        `SELECT * FROM quiz_attempts
         WHERE quiz_id = 'nutricao-avaliacao'
           AND email IS NOT NULL
           AND COALESCE(result->>'convertedAt','') IN ('', '0')
           AND COALESCE(NULLIF(result->>'nurtureStep',''),'0') ~ '^[0-9]+$'
           AND COALESCE((result->>'nurtureStep')::int, 0) < 3
           AND claimed_at > NOW() - INTERVAL '5 days'
         ORDER BY claimed_at ASC
         LIMIT $1`,
        [cap]
    );
    return r.rows.map(rowToQuizAttempt);
}

async function claimNutricaoNurtureStep(id, fromStep, toStep, sentAtMs) {
    const p = getPool();
    const from = Number(fromStep) || 0;
    const to = Number(toStep);
    if (!id || to < 1 || to > 3 || to !== from + 1) return null;
    const patch = { nurtureStep: to };
    patch['nurture' + to + 'At'] = Number(sentAtMs) || Date.now();
    const r = await p.query(
        `UPDATE quiz_attempts
         SET result = COALESCE(result, '{}'::jsonb) || $2::jsonb
         WHERE id = $1
           AND quiz_id = 'nutricao-avaliacao'
           AND email IS NOT NULL
           AND COALESCE(result->>'convertedAt','') IN ('', '0')
           AND COALESCE((NULLIF(result->>'nurtureStep',''))::int, 0) = $3
         RETURNING *`,
        [id, JSON.stringify(patch), from]
    );
    return r.rows[0] ? rowToQuizAttempt(r.rows[0]) : null;
}

async function mergeQuizAttemptResultByEmail(email, patch, quizId) {
    const p = getPool();
    const e = String(email || '').toLowerCase().trim();
    if (!e || !patch || typeof patch !== 'object') return 0;
    const qid = quizId ? String(quizId) : null;
    const r = await p.query(
        `UPDATE quiz_attempts
         SET result = COALESCE(result, '{}'::jsonb) || $2::jsonb
         WHERE LOWER(TRIM(email)) = $1
           AND claimed_at > NOW() - INTERVAL '7 days'
           AND ($3::text IS NULL OR quiz_id = $3)`,
        [e, JSON.stringify(patch), qid]
    );
    return r.rowCount;
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

/** Post-consultation review email — only after staff mark the visit completed. */
async function findBookingsNeedingFollowup() {
    const p = getPool();
    const r = await p.query(
        `SELECT * FROM bookings
         WHERE cancelled = FALSE
           AND followup_sent = FALSE
           AND consultation_completed = TRUE
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

async function markReviewRequested(bookingRef) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings SET review_requested = TRUE WHERE booking_ref = $1 AND review_requested = FALSE`,
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
function rowToSlotHold(row) {
    if (!row) return null;
    const expiresAt = row.expires_at instanceof Date ? row.expires_at.getTime() : Date.parse(row.expires_at);
    return {
        id: row.id,
        slotId: row.slot_id,
        dateIso: row.date_iso,
        time: String(row.time || '').slice(0, 5),
        service: row.service || '',
        holderToken: row.holder_token,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0
    };
}

async function purgeExpiredSlotHolds() {
    const p = getPool();
    if (!p) return;
    await p.query(`DELETE FROM slot_holds WHERE expires_at <= NOW()`);
}

async function insertSlotHold(hold) {
    const p = getPool();
    if (!p) return null;
    await purgeExpiredSlotHolds();
    try {
        const r = await p.query(
            `INSERT INTO slot_holds (id, slot_id, date_iso, time, service, holder_token, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
             RETURNING *`,
            [
                hold.id,
                hold.slotId,
                hold.dateIso,
                hold.time,
                hold.service || '',
                hold.holderToken,
                hold.expiresAt
            ]
        );
        return rowToSlotHold(r.rows[0]);
    } catch (err) {
        if (err && err.code === '23505') return null;
        throw err;
    }
}

async function findSlotHoldById(id) {
    const p = getPool();
    if (!p || !id) return null;
    const r = await p.query(
        `SELECT * FROM slot_holds WHERE id = $1 AND expires_at > NOW() LIMIT 1`,
        [String(id)]
    );
    return rowToSlotHold(r.rows[0]);
}

async function findSlotHoldBySlot(dateIso, time) {
    const p = getPool();
    if (!p) return null;
    const r = await p.query(
        `SELECT * FROM slot_holds
         WHERE date_iso = $1 AND time = $2 AND expires_at > NOW()
         LIMIT 1`,
        [dateIso, String(time || '').slice(0, 5)]
    );
    return rowToSlotHold(r.rows[0]);
}

async function findSlotHoldByHolder(holderToken) {
    const p = getPool();
    if (!p || !holderToken) return null;
    const r = await p.query(
        `SELECT * FROM slot_holds
         WHERE holder_token = $1 AND expires_at > NOW()
         ORDER BY expires_at DESC
         LIMIT 1`,
        [String(holderToken)]
    );
    return rowToSlotHold(r.rows[0]);
}

async function updateSlotHoldExpiry(id, expiresAt) {
    const p = getPool();
    if (!p) return null;
    const r = await p.query(
        `UPDATE slot_holds
         SET expires_at = to_timestamp($2 / 1000.0)
         WHERE id = $1 AND expires_at > NOW()
         RETURNING *`,
        [id, expiresAt]
    );
    return rowToSlotHold(r.rows[0]);
}

async function deleteSlotHoldById(id) {
    const p = getPool();
    if (!p || !id) return;
    await p.query(`DELETE FROM slot_holds WHERE id = $1`, [id]);
}

async function deleteSlotHoldsForSlot(dateIso, time) {
    const p = getPool();
    if (!p) return;
    await p.query(
        `DELETE FROM slot_holds WHERE date_iso = $1 AND time = $2`,
        [dateIso, String(time || '').slice(0, 5)]
    );
}

async function listActiveHoldTimesForDateIso(dateIso, excludeHoldId) {
    const p = getPool();
    if (!p) return [];
    const r = await p.query(
        `SELECT time FROM slot_holds
         WHERE date_iso = $1
           AND expires_at > NOW()
           AND ($2::text IS NULL OR id <> $2)`,
        [dateIso, excludeHoldId || null]
    );
    return r.rows.map((row) => String(row.time || '').slice(0, 5));
}

async function isSlotTakenByOther(dateIso, time, excludeBookingRef) {
    const p = getPool();
    const slotTime = String(time || '').trim().slice(0, 5);
    const r = await p.query(
        `SELECT 1 FROM bookings
         WHERE cancelled = FALSE
           AND date_iso = $1
           AND LEFT(TRIM(time), 5) = $2
           AND ($3::text IS NULL OR booking_ref <> $3)
         LIMIT 1`,
        [dateIso, slotTime, excludeBookingRef || null]
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

async function findBookingByPaymentId(paymentId) {
    const p = getPool();
    const r = await p.query('SELECT * FROM bookings WHERE payment_id = $1 LIMIT 1', [paymentId]);
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
}

async function findBookingByIntakeToken(token) {
    const p = getPool();
    const t = String(token || '').trim();
    if (!t || t.length < 16) return null;
    const r = await p.query(
        `SELECT * FROM bookings WHERE intake_token = $1 AND cancelled = FALSE LIMIT 1`,
        [t]
    );
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
}

async function setBookingIntakeToken(bookingRef, token) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings
         SET intake_token = COALESCE(NULLIF(intake_token, ''), $2)
         WHERE booking_ref = $1
         RETURNING *`,
        [bookingRef, token]
    );
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
}

async function savePatientIntake(bookingRef, intake) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings
         SET intake_json = $2::jsonb,
             intake_completed_at = COALESCE(intake_completed_at, NOW())
         WHERE booking_ref = $1
         RETURNING *`,
        [bookingRef, JSON.stringify(intake || {})]
    );
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
}

async function findBookingsNeedingIntakeReminder() {
    const p = getPool();
    const r = await p.query(
        `SELECT * FROM bookings
         WHERE cancelled = FALSE
           AND intake_reminder_sent = FALSE
           AND intake_completed_at IS NULL
           AND created_at < NOW() - INTERVAL '90 minutes'
         ORDER BY created_at DESC`
    );
    return r.rows.map(rowToBooking);
}

async function markIntakeReminderSent(bookingRef) {
    const p = getPool();
    const r = await p.query(
        `UPDATE bookings
         SET intake_reminder_sent = TRUE
         WHERE booking_ref = $1 AND intake_reminder_sent = FALSE`,
        [bookingRef]
    );
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
    const paymentId = String(booking.paymentId || '');
    const isManual = paymentId.startsWith('manual_');
    const isComp = paymentId.startsWith('comp_');
    const markedPaid = booking.markedPaid != null
        ? booking.markedPaid === true
        : !isManual;
    const invoiceSent = booking.invoiceSent != null
        ? booking.invoiceSent === true
        : !(isManual || isComp);
    const r = await p.query(
        `INSERT INTO bookings (
            booking_ref, email, service, date, time, patient_name, traveller_count,
            amount, currency, payment_id, stripe_customer_id,
            date_iso, patient_locale, patient_phone,
            cancelled, reschedule_count, reminder_sent, reminder_1h_sent, followup_sent,
            professional, marked_paid, invoice_sent, review_requested, visit_frequency, patient_type,
            consultation_completed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        ON CONFLICT (payment_id) DO NOTHING
        RETURNING *`,
        [
            booking.bookingRef,
            booking.email,
            String(booking.service || '').trim() || 'unspecified',
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
            booking.patientPhone || null,
            booking.cancelled === true,
            booking.rescheduleCount != null ? booking.rescheduleCount : 0,
            booking.reminderSent === true,
            booking.reminder1hSent === true,
            booking.followupSent === true,
            booking.professional || null,
            markedPaid,
            invoiceSent,
            booking.reviewRequested === true,
            booking.visitFrequency || null,
            booking.patientType || null,
            booking.consultationCompleted === true
        ]
    );
    return r.rowCount > 0;
}

async function insertBookingSafe(booking) {
    try {
        return await insertBooking(booking);
    } catch (err) {
        if (err && (err.code === '23505' || /idx_bookings_active_slot|duplicate key/i.test(String(err.message || '')))) {
            return false;
        }
        throw err;
    }
}

async function updateBookingAdminFields(bookingRef, fields) {
    const p = getPool();
    const ref = String(bookingRef || '').trim().toUpperCase();
    const existing = await findBookingByRef(ref);
    if (!existing) return null;

    const normalizePatientType = (v) => {
        const s = String(v || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (s === 'regular') return 'regular';
        if (s === 'one_time' || s === 'onetime' || s === 'one-time') return 'one_time';
        if (s === '') return null;
        return null;
    };

    const map = {
        professional: 'professional',
        markedPaid: 'marked_paid',
        invoiceSent: 'invoice_sent',
        reviewRequested: 'review_requested',
        consultationCompleted: 'consultation_completed',
        patientPhone: 'patient_phone',
        visitFrequency: 'visit_frequency',
        patientType: 'patient_type'
    };

    const patientLevelKeys = new Set(['visitFrequency', 'patientType']);
    const hasPatientLevel = [...patientLevelKeys].some((k) =>
        Object.prototype.hasOwnProperty.call(fields, k)
    );

    if (hasPatientLevel && existing.email) {
        const email = String(existing.email).toLowerCase().trim();
        if (Object.prototype.hasOwnProperty.call(fields, 'visitFrequency')) {
            const freqVal = fields.visitFrequency == null || String(fields.visitFrequency).trim() === ''
                ? null
                : String(fields.visitFrequency).trim().slice(0, 64);
            await p.query(`UPDATE bookings SET visit_frequency = $1 WHERE LOWER(TRIM(email)) = $2`, [freqVal, email]);
        }
        if (Object.prototype.hasOwnProperty.call(fields, 'patientType')) {
            const typeVal = normalizePatientType(fields.patientType);
            await p.query(`UPDATE bookings SET patient_type = $1 WHERE LOWER(TRIM(email)) = $2`, [typeVal, email]);
        }
    }

    const sets = [];
    const vals = [];
    let i = 1;
    for (const [jsKey, col] of Object.entries(map)) {
        if (patientLevelKeys.has(jsKey)) continue;
        if (!Object.prototype.hasOwnProperty.call(fields, jsKey)) continue;
        let v = fields[jsKey];
        if (jsKey === 'professional' || jsKey === 'patientPhone') {
            v = v == null ? null : String(v).trim().slice(0, 200);
            if (v === '') v = null;
        } else {
            v = v === true || v === 'true' || v === 1 || v === '1';
        }
        sets.push(`${col} = $${i++}`);
        vals.push(v);
    }

    if (sets.length) {
        vals.push(ref);
        await p.query(
            `UPDATE bookings SET ${sets.join(', ')} WHERE UPPER(TRIM(booking_ref)) = $${i}`,
            vals
        );
    } else if (!hasPatientLevel) {
        return existing;
    }

    return findBookingByRef(ref);
}

async function deleteBookingByRef(bookingRef) {
    const p = getPool();
    const ref = String(bookingRef || '').trim().toUpperCase();
    // Clear invitation links first (booking_ref is not always FK-constrained).
    try {
        await p.query(
            `UPDATE booking_invitations SET booking_ref = NULL WHERE UPPER(TRIM(booking_ref)) = $1`,
            [ref]
        );
    } catch (e) { /* table may not exist in odd setups */ }
    const r = await p.query(
        `DELETE FROM bookings WHERE UPPER(TRIM(booking_ref)) = $1 RETURNING *`,
        [ref]
    );
    return r.rows[0] ? rowToBooking(r.rows[0]) : null;
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

function rowToProfessional(row) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        passwordHash: row.password_hash,
        displayName: row.display_name || '',
        doxyRoomUrl: row.doxy_room_url || '',
        email: row.email || '',
        active: row.active !== false,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
}

async function listProfessionals() {
    const p = getPool();
    const r = await p.query('SELECT * FROM professionals ORDER BY LOWER(display_name) ASC, id ASC');
    return r.rows.map(rowToProfessional);
}

async function findProfessionalById(id) {
    const p = getPool();
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) return null;
    const r = await p.query('SELECT * FROM professionals WHERE id = $1 LIMIT 1', [n]);
    return r.rows[0] ? rowToProfessional(r.rows[0]) : null;
}

async function findProfessionalByUsername(username) {
    const p = getPool();
    const u = String(username || '').trim();
    if (!u) return null;
    const r = await p.query(
        'SELECT * FROM professionals WHERE LOWER(username) = LOWER($1) LIMIT 1',
        [u]
    );
    return r.rows[0] ? rowToProfessional(r.rows[0]) : null;
}

async function findProfessionalByDisplayName(name) {
    const p = getPool();
    const n = String(name || '').trim();
    if (!n) return null;
    const r = await p.query(
        `SELECT * FROM professionals
         WHERE LOWER(TRIM(display_name)) = LOWER(TRIM($1))
           AND active = TRUE
         ORDER BY id ASC
         LIMIT 1`,
        [n]
    );
    return r.rows[0] ? rowToProfessional(r.rows[0]) : null;
}

async function insertProfessional(pro) {
    const p = getPool();
    const r = await p.query(
        `INSERT INTO professionals (username, password_hash, display_name, doxy_room_url, email, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            pro.username,
            pro.passwordHash,
            pro.displayName,
            pro.doxyRoomUrl || null,
            String(pro.email || '').trim().toLowerCase().slice(0, 320),
            pro.active !== false
        ]
    );
    return rowToProfessional(r.rows[0]);
}

async function updateProfessional(id, fields) {
    const p = getPool();
    const existing = await findProfessionalById(id);
    if (!existing) return null;
    const map = {
        displayName: 'display_name',
        doxyRoomUrl: 'doxy_room_url',
        email: 'email',
        passwordHash: 'password_hash',
        active: 'active'
    };
    const sets = ['updated_at = NOW()'];
    const vals = [];
    let i = 1;
    for (const [jsKey, col] of Object.entries(map)) {
        if (!Object.prototype.hasOwnProperty.call(fields, jsKey)) continue;
        let v = fields[jsKey];
        if (jsKey === 'displayName') v = String(v || '').trim().slice(0, 200);
        if (jsKey === 'doxyRoomUrl') {
            v = v == null || String(v).trim() === '' ? null : String(v).trim().slice(0, 300);
        }
        if (jsKey === 'email') v = String(v || '').trim().toLowerCase().slice(0, 320);
        if (jsKey === 'active') v = v === true || v === 'true' || v === 1;
        sets.push(`${col} = $${i}`);
        vals.push(v);
        i += 1;
    }
    if (vals.length === 0) return existing;
    vals.push(existing.id);
    const r = await p.query(
        `UPDATE professionals SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        vals
    );
    return r.rows[0] ? rowToProfessional(r.rows[0]) : existing;
}

async function deleteProfessional(id) {
    const p = getPool();
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) return false;
    const r = await p.query('DELETE FROM professionals WHERE id = $1', [n]);
    return r.rowCount > 0;
}

function isoDateOnly(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    const s = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

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

function serializeStaffAreaList(value) {
    return JSON.stringify(parseStaffAreaList(value));
}

const STAFF_PROFILE_RETURNING = `username, profession, ordem_number, bio, credentials, iban,
            full_name, nif, citizen_card, address, insurer, insurance_policy, insurance_valid_until,
            payouts_from_month, primary_area, secondary_area, updated_at, (photo_data IS NOT NULL) AS has_photo`;

function rowToStaffProfile(row) {
    if (!row) return null;
    return {
        username: row.username,
        profession: row.profession || '',
        ordemNumber: row.ordem_number || '',
        fullName: row.full_name || '',
        nif: row.nif || '',
        citizenCard: row.citizen_card || '',
        address: row.address || '',
        insurer: row.insurer || '',
        insurancePolicy: row.insurance_policy || '',
        insuranceValidUntil: isoDateOnly(row.insurance_valid_until) || '',
        bio: row.bio || '',
        credentials: row.credentials || '',
        iban: row.iban || '',
        payoutsFromMonth: row.payouts_from_month || '',
        primaryAreas: parseStaffAreaList(row.primary_area),
        secondaryAreas: parseStaffAreaList(row.secondary_area),
        hasPhoto: !!(row.has_photo || row.photo_data),
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
}

function rowToStaffDocument(row, { includeData } = {}) {
    if (!row) return null;
    const doc = {
        id: row.id,
        username: row.username,
        kind: row.kind,
        originalName: row.original_name || '',
        mime: row.mime || 'application/octet-stream',
        validUntil: isoDateOnly(row.valid_until),
        uploadedAt: row.uploaded_at instanceof Date ? row.uploaded_at.toISOString() : row.uploaded_at
    };
    if (includeData) {
        doc.fileData = row.file_data || null;
    }
    return doc;
}

async function getStaffProfile(username) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u) return null;
    const r = await p.query(
        `SELECT ${STAFF_PROFILE_RETURNING}
         FROM staff_profiles WHERE username = $1 LIMIT 1`,
        [u]
    );
    return r.rows[0] ? rowToStaffProfile(r.rows[0]) : null;
}

async function listStaffProfiles() {
    const p = getPool();
    const r = await p.query(
        `SELECT ${STAFF_PROFILE_RETURNING}
         FROM staff_profiles
         ORDER BY LOWER(username) ASC`
    );
    return r.rows.map((row) => rowToStaffProfile(row));
}

async function upsertStaffProfile(username, fields) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u) return null;
    const profession = String(fields.profession || '').trim().slice(0, 32);
    const ordemNumber = String(fields.ordemNumber || '').trim().slice(0, 80);
    const fullName = String(fields.fullName || '').trim().slice(0, 160);
    const nif = String(fields.nif || '').trim().slice(0, 20);
    const citizenCard = String(fields.citizenCard || '').trim().slice(0, 32);
    const address = String(fields.address || '').trim().slice(0, 400);
    const insurer = String(fields.insurer || '').trim().slice(0, 120);
    const insurancePolicy = String(fields.insurancePolicy || '').trim().slice(0, 80);
    const insuranceValidUntil = isoDateOnly(fields.insuranceValidUntil);
    const bio = String(fields.bio || '').trim().slice(0, 4000);
    const credentials = String(fields.credentials || '').trim().slice(0, 2000);
    const primaryArea = serializeStaffAreaList(fields.primaryAreas != null ? fields.primaryAreas : fields.primaryArea);
    const secondaryArea = serializeStaffAreaList(fields.secondaryAreas != null ? fields.secondaryAreas : fields.secondaryArea);
    const r = await p.query(
        `INSERT INTO staff_profiles (
            username, profession, ordem_number, full_name, nif, citizen_card, address,
            insurer, insurance_policy, insurance_valid_until, bio, credentials, primary_area, secondary_area, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
         ON CONFLICT (username) DO UPDATE SET
            profession = EXCLUDED.profession,
            ordem_number = EXCLUDED.ordem_number,
            full_name = EXCLUDED.full_name,
            nif = EXCLUDED.nif,
            citizen_card = EXCLUDED.citizen_card,
            address = EXCLUDED.address,
            insurer = EXCLUDED.insurer,
            insurance_policy = EXCLUDED.insurance_policy,
            insurance_valid_until = EXCLUDED.insurance_valid_until,
            bio = EXCLUDED.bio,
            credentials = EXCLUDED.credentials,
            primary_area = EXCLUDED.primary_area,
            secondary_area = EXCLUDED.secondary_area,
            updated_at = NOW()
         RETURNING ${STAFF_PROFILE_RETURNING}`,
        [
            u, profession, ordemNumber, fullName, nif, citizenCard, address,
            insurer, insurancePolicy, insuranceValidUntil, bio, credentials, primaryArea, secondaryArea
        ]
    );
    return rowToStaffProfile(r.rows[0]);
}

async function upsertStaffPhoto(username, { mime, data }) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u || !data) return null;
    const photoMime = String(mime || 'image/jpeg').slice(0, 80);
    const r = await p.query(
        `INSERT INTO staff_profiles (username, photo_mime, photo_data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (username) DO UPDATE SET
            photo_mime = EXCLUDED.photo_mime,
            photo_data = EXCLUDED.photo_data,
            updated_at = NOW()
         RETURNING ${STAFF_PROFILE_RETURNING}`,
        [u, photoMime, data]
    );
    return rowToStaffProfile(r.rows[0]);
}

async function getStaffPhoto(username) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u) return null;
    const r = await p.query(
        'SELECT photo_mime, photo_data FROM staff_profiles WHERE username = $1 LIMIT 1',
        [u]
    );
    const row = r.rows[0];
    if (!row || !row.photo_data) return null;
    return {
        mime: row.photo_mime || 'image/jpeg',
        data: row.photo_data
    };
}

function rowToStaffInvoice(row, { includeData } = {}) {
    if (!row) return null;
    const inv = {
        username: row.username,
        month: row.month,
        originalName: row.original_name || '',
        mime: row.mime || '',
        uploadedAt: row.uploaded_at instanceof Date ? row.uploaded_at.toISOString() : row.uploaded_at,
        paymentSent: !!row.payment_sent,
        paymentSentAt: row.payment_sent_at instanceof Date ? row.payment_sent_at.toISOString() : row.payment_sent_at,
        hasInvoice: !!(row.has_invoice || row.file_data)
    };
    if (includeData) inv.fileData = row.file_data || null;
    return inv;
}

async function upsertStaffIban(username, iban) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u) return null;
    const value = String(iban || '').trim().slice(0, 42);
    const r = await p.query(
        `INSERT INTO staff_profiles (username, iban, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (username) DO UPDATE SET
            iban = EXCLUDED.iban,
            updated_at = NOW()
         RETURNING ${STAFF_PROFILE_RETURNING}`,
        [u, value]
    );
    return rowToStaffProfile(r.rows[0]);
}

async function upsertStaffPayoutsFromMonth(username, monthKey) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    const month = String(monthKey || '').trim();
    if (!u || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
    const r = await p.query(
        `INSERT INTO staff_profiles (username, payouts_from_month, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (username) DO UPDATE SET
            payouts_from_month = EXCLUDED.payouts_from_month,
            updated_at = NOW()
         WHERE staff_profiles.payouts_from_month IS NULL
            OR TRIM(staff_profiles.payouts_from_month) = ''
         RETURNING ${STAFF_PROFILE_RETURNING}`,
        [u, month]
    );
    if (r.rows[0]) return rowToStaffProfile(r.rows[0]);
    return getStaffProfile(u);
}

async function listStaffInvoices(username) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u) return [];
    const r = await p.query(
        `SELECT username, month, original_name, mime, uploaded_at, payment_sent, payment_sent_at,
                (file_data IS NOT NULL) AS has_invoice
         FROM staff_invoices WHERE username = $1
         ORDER BY month DESC`,
        [u]
    );
    return r.rows.map((row) => rowToStaffInvoice(row));
}

async function listAllStaffInvoices() {
    const p = getPool();
    const r = await p.query(
        `SELECT username, month, original_name, mime, uploaded_at, payment_sent, payment_sent_at,
                (file_data IS NOT NULL) AS has_invoice
         FROM staff_invoices
         ORDER BY month DESC, username ASC`
    );
    return r.rows.map((row) => rowToStaffInvoice(row));
}

async function getStaffInvoice(username, month, { includeData } = {}) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (!u || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return null;
    const r = await p.query(
        includeData
            ? 'SELECT * FROM staff_invoices WHERE username = $1 AND month = $2 LIMIT 1'
            : `SELECT username, month, original_name, mime, uploaded_at, payment_sent, payment_sent_at,
                      (file_data IS NOT NULL) AS has_invoice
               FROM staff_invoices WHERE username = $1 AND month = $2 LIMIT 1`,
        [u, m]
    );
    return r.rows[0] ? rowToStaffInvoice(r.rows[0], { includeData }) : null;
}

async function upsertStaffInvoiceFile(username, month, { originalName, mime, fileData }) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (!u || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m) || !fileData) return null;
    const r = await p.query(
        `INSERT INTO staff_invoices (username, month, original_name, mime, file_data, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (username, month) DO UPDATE SET
            original_name = EXCLUDED.original_name,
            mime = EXCLUDED.mime,
            file_data = EXCLUDED.file_data,
            uploaded_at = NOW()
         RETURNING username, month, original_name, mime, uploaded_at, payment_sent, payment_sent_at,
                   (file_data IS NOT NULL) AS has_invoice`,
        [
            u,
            m,
            String(originalName || 'fatura').slice(0, 200),
            String(mime || 'application/octet-stream').slice(0, 120),
            fileData
        ]
    );
    return rowToStaffInvoice(r.rows[0]);
}

async function setStaffInvoicePaymentSent(username, month, sent) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (!u || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return null;
    const on = !!sent;
    const r = await p.query(
        `INSERT INTO staff_invoices (username, month, payment_sent, payment_sent_at)
         VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END)
         ON CONFLICT (username, month) DO UPDATE SET
            payment_sent = EXCLUDED.payment_sent,
            payment_sent_at = CASE WHEN EXCLUDED.payment_sent THEN NOW() ELSE NULL END
         RETURNING username, month, original_name, mime, uploaded_at, payment_sent, payment_sent_at,
                   (file_data IS NOT NULL) AS has_invoice`,
        [u, m, on]
    );
    return rowToStaffInvoice(r.rows[0]);
}

function rowToStaffMonthAvailability(row) {
    if (!row) return null;
    return {
        username: row.username,
        month: row.month,
        confirmed: !!row.confirmed,
        confirmedAt: row.confirmed_at instanceof Date ? row.confirmed_at.toISOString() : row.confirmed_at,
        reminder10Sent: !!row.reminder_10_sent,
        reminder15Sent: !!row.reminder_15_sent
    };
}

async function listStaffMonthAvailability(username) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u) return [];
    const r = await p.query(
        `SELECT username, month, confirmed, confirmed_at, reminder_10_sent, reminder_15_sent
         FROM staff_month_availability WHERE username = $1
         ORDER BY month ASC`,
        [u]
    );
    return r.rows.map(rowToStaffMonthAvailability);
}

async function listAllStaffMonthAvailability() {
    const p = getPool();
    const r = await p.query(
        `SELECT username, month, confirmed, confirmed_at, reminder_10_sent, reminder_15_sent
         FROM staff_month_availability`
    );
    return r.rows.map(rowToStaffMonthAvailability);
}

async function getStaffMonthAvailability(username, month) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (!u || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return null;
    const r = await p.query(
        `SELECT username, month, confirmed, confirmed_at, reminder_10_sent, reminder_15_sent
         FROM staff_month_availability WHERE username = $1 AND month = $2 LIMIT 1`,
        [u, m]
    );
    return r.rows[0] ? rowToStaffMonthAvailability(r.rows[0]) : null;
}

async function setStaffMonthAvailabilityConfirmed(username, month, confirmed) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    if (!u || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return null;
    const on = !!confirmed;
    const r = await p.query(
        `INSERT INTO staff_month_availability (username, month, confirmed, confirmed_at)
         VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END)
         ON CONFLICT (username, month) DO UPDATE SET
            confirmed = EXCLUDED.confirmed,
            confirmed_at = CASE WHEN EXCLUDED.confirmed THEN NOW() ELSE NULL END
         RETURNING username, month, confirmed, confirmed_at, reminder_10_sent, reminder_15_sent`,
        [u, m, on]
    );
    return rowToStaffMonthAvailability(r.rows[0]);
}

async function markStaffMonthAvailabilityReminder(username, month, which) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    const m = String(month || '').trim();
    const col = which === 15 ? 'reminder_15_sent' : 'reminder_10_sent';
    if (!u || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return null;
    const r = await p.query(
        `INSERT INTO staff_month_availability (username, month, ${col})
         VALUES ($1, $2, TRUE)
         ON CONFLICT (username, month) DO UPDATE SET ${col} = TRUE
         RETURNING username, month, confirmed, confirmed_at, reminder_10_sent, reminder_15_sent`,
        [u, m]
    );
    return rowToStaffMonthAvailability(r.rows[0]);
}

async function listStaffDocuments(username) {
    const p = getPool();
    const u = String(username || '').trim().toLowerCase();
    if (!u) return [];
    const r = await p.query(
        `SELECT id, username, kind, original_name, mime, valid_until, uploaded_at
         FROM staff_documents
         WHERE username = $1
         ORDER BY kind ASC`,
        [u]
    );
    return r.rows.map((row) => rowToStaffDocument(row));
}

async function listAllStaffDocuments() {
    const p = getPool();
    const r = await p.query(
        `SELECT id, username, kind, original_name, mime, valid_until, uploaded_at
         FROM staff_documents
         ORDER BY username ASC, kind ASC`
    );
    return r.rows.map((row) => rowToStaffDocument(row));
}

async function upsertStaffDocument(doc) {
    const p = getPool();
    const u = String(doc.username || '').trim().toLowerCase();
    const kind = String(doc.kind || '').trim();
    if (!u || !kind || !doc.fileData) return null;
    const r = await p.query(
        `INSERT INTO staff_documents (username, kind, original_name, mime, valid_until, file_data, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (username, kind) DO UPDATE SET
            original_name = EXCLUDED.original_name,
            mime = EXCLUDED.mime,
            valid_until = EXCLUDED.valid_until,
            file_data = EXCLUDED.file_data,
            uploaded_at = NOW()
         RETURNING id, username, kind, original_name, mime, valid_until, uploaded_at`,
        [
            u,
            kind,
            String(doc.originalName || 'document').slice(0, 200),
            String(doc.mime || 'application/octet-stream').slice(0, 120),
            isoDateOnly(doc.validUntil),
            doc.fileData
        ]
    );
    return rowToStaffDocument(r.rows[0]);
}

async function getStaffDocument(id, username) {
    const p = getPool();
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) return null;
    const u = String(username || '').trim().toLowerCase();
    const r = await p.query(
        'SELECT * FROM staff_documents WHERE id = $1 AND username = $2 LIMIT 1',
        [n, u]
    );
    return r.rows[0] ? rowToStaffDocument(r.rows[0], { includeData: true }) : null;
}

const PRODUCER_STATUSES = new Set(['pendente', 'aprovado', 'rejeitado']);

function rowToProducer(row) {
    if (!row) return null;
    const social = row.social && typeof row.social === 'object' && !Array.isArray(row.social) ? row.social : {};
    return {
        id: row.id,
        slug: row.slug || '',
        name: row.name || '',
        shortDescription: row.short_description || '',
        longDescription: row.long_description || '',
        categories: Array.isArray(row.categories) ? row.categories : [],
        district: row.district || '',
        municipality: row.municipality || '',
        address: row.address || '',
        lat: row.lat == null ? null : Number(row.lat),
        lng: row.lng == null ? null : Number(row.lng),
        certBody: row.cert_body || '',
        certNumber: row.cert_number || '',
        certImage: row.cert_image || null,
        website: row.website || '',
        email: row.email || '',
        phone: row.phone || '',
        social: {
            instagram: social.instagram || '',
            facebook: social.facebook || '',
            other: social.other || ''
        },
        photos: Array.isArray(row.photos) ? row.photos : [],
        salesMethods: Array.isArray(row.sales_methods) ? row.sales_methods : [],
        status: row.status || 'pendente',
        adminNotes: row.admin_notes || '',
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
}

async function insertProducer(record) {
    const p = getPool();
    const r = await p.query(
        `INSERT INTO producers (
            id, slug, name, short_description, long_description, categories,
            district, municipality, address, lat, lng,
            cert_body, cert_number, cert_image,
            website, email, phone, social, photos, sales_methods,
            status, admin_notes
        ) VALUES (
            $1, $2, $3, $4, $5, $6::jsonb,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17, $18::jsonb, $19::jsonb, $20::jsonb,
            $21, $22
        ) RETURNING *`,
        [
            record.id,
            record.slug,
            record.name,
            record.shortDescription || '',
            record.longDescription || '',
            JSON.stringify(record.categories || []),
            record.district || '',
            record.municipality || '',
            record.address || '',
            record.lat == null ? null : record.lat,
            record.lng == null ? null : record.lng,
            record.certBody || '',
            record.certNumber || '',
            record.certImage || null,
            record.website || '',
            record.email || '',
            record.phone || '',
            JSON.stringify(record.social || {}),
            JSON.stringify(record.photos || []),
            JSON.stringify(record.salesMethods || []),
            record.status || 'pendente',
            record.adminNotes || ''
        ]
    );
    return rowToProducer(r.rows[0]);
}

async function listProducers({ status, category, district, salesMethod, q, limit } = {}) {
    const p = getPool();
    const cap = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 400);
    const clauses = [];
    const params = [];
    if (status && PRODUCER_STATUSES.has(String(status))) {
        params.push(String(status));
        clauses.push(`status = $${params.length}`);
    }
    if (category) {
        params.push(String(category));
        clauses.push(`categories ? $${params.length}`);
    }
    if (district) {
        params.push(String(district));
        clauses.push(`district = $${params.length}`);
    }
    if (salesMethod) {
        params.push(String(salesMethod));
        clauses.push(`sales_methods ? $${params.length}`);
    }
    if (q && String(q).trim()) {
        params.push(`%${String(q).trim().toLowerCase()}%`);
        clauses.push(
            `(LOWER(name) LIKE $${params.length} OR LOWER(short_description) LIKE $${params.length} OR LOWER(COALESCE(municipality, '')) LIKE $${params.length})`
        );
    }
    params.push(cap);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await p.query(
        `SELECT * FROM producers ${where}
         ORDER BY
            CASE status WHEN 'pendente' THEN 0 WHEN 'aprovado' THEN 1 ELSE 2 END,
            name ASC
         LIMIT $${params.length}`,
        params
    );
    return r.rows.map(rowToProducer);
}

async function findProducerById(id) {
    const p = getPool();
    const r = await p.query(`SELECT * FROM producers WHERE id = $1 LIMIT 1`, [id]);
    return rowToProducer(r.rows[0]);
}

async function findProducerBySlug(slug) {
    const p = getPool();
    const r = await p.query(`SELECT * FROM producers WHERE slug = $1 LIMIT 1`, [String(slug || '')]);
    return rowToProducer(r.rows[0]);
}

async function producerSlugTaken(slug, excludeId) {
    const p = getPool();
    if (excludeId) {
        const r = await p.query(
            `SELECT 1 FROM producers WHERE slug = $1 AND id <> $2 LIMIT 1`,
            [slug, excludeId]
        );
        return r.rows.length > 0;
    }
    const r = await p.query(`SELECT 1 FROM producers WHERE slug = $1 LIMIT 1`, [slug]);
    return r.rows.length > 0;
}

async function updateProducer(id, patch) {
    const p = getPool();
    const status =
        patch.status && PRODUCER_STATUSES.has(String(patch.status)) ? String(patch.status) : null;
    const adminNotes = patch.adminNotes !== undefined ? String(patch.adminNotes || '').slice(0, 4000) : null;
    if (status == null && adminNotes == null) {
        return findProducerById(id);
    }
    const r = await p.query(
        `UPDATE producers SET
            status = COALESCE($2, status),
            admin_notes = COALESCE($3, admin_notes),
            updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, status, adminNotes]
    );
    return rowToProducer(r.rows[0]);
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
    findBookingByPaymentId,
    findBookingByIntakeToken,
    setBookingIntakeToken,
    savePatientIntake,
    findBookingsNeedingIntakeReminder,
    markIntakeReminderSent,
    countPriorBookingsExcludingPayment,
    insertBooking,
    insertBookingSafe,
    updateBookingAdminFields,
    deleteBookingByRef,
    findBookingsByEmailAndRef,
    findBookingsByEmail,
    insertQuizAttempt,
    findQuizAttemptById,
    claimQuizAttempt,
    findQuizAttemptsByEmail,
    findDueQuizRecoveries,
    findDueNutricaoNurture,
    claimNutricaoNurtureStep,
    mergeQuizAttemptResultByEmail,
    insertInvitation,
    updateInvitationStripeSession,
    findInvitationById,
    findInvitationByToken,
    findInvitationByStripeSessionId,
    listInvitations,
    listPendingInvitations,
    listPendingInvitationsForDateIso,
    markInvitationPaid,
    cancelInvitation,
    insertReview,
    insertPsychologistApplication,
    listPsychologistApplications,
    findPsychologistApplicationById,
    updatePsychologistApplication,
    listPublicReviews,
    listAllReviews,
    findAllBookings,
    findAllBookingsWithClinicalNotes,
    findBookingByRef,
    getClinicalNoteByRef,
    upsertClinicalNote,
    getSchedulePayload,
    saveSchedulePayload,
    listProfessionals,
    findProfessionalById,
    findProfessionalByUsername,
    findProfessionalByDisplayName,
    insertProfessional,
    updateProfessional,
    deleteProfessional,
    getStaffProfile,
    listStaffProfiles,
    upsertStaffProfile,
    upsertStaffPhoto,
    getStaffPhoto,
    upsertStaffIban,
    upsertStaffPayoutsFromMonth,
    listStaffInvoices,
    listAllStaffInvoices,
    getStaffInvoice,
    upsertStaffInvoiceFile,
    setStaffInvoicePaymentSent,
    listStaffMonthAvailability,
    listAllStaffMonthAvailability,
    getStaffMonthAvailability,
    setStaffMonthAvailabilityConfirmed,
    markStaffMonthAvailabilityReminder,
    listStaffDocuments,
    listAllStaffDocuments,
    upsertStaffDocument,
    getStaffDocument,
    insertProducer,
    listProducers,
    findProducerById,
    findProducerBySlug,
    producerSlugTaken,
    updateProducer,
    findBookingsNeeding24hReminder,
    findBookingsNeeding1hReminder,
    findBookingsNeedingFollowup,
    markReminderSent,
    markReminder1hSent,
    markFollowupSent,
    markReviewRequested,
    cancelBookingByRef,
    rescheduleBookingByRef,
    isSlotTakenByOther,
    insertSlotHold,
    findSlotHoldById,
    findSlotHoldBySlot,
    findSlotHoldByHolder,
    updateSlotHoldExpiry,
    deleteSlotHoldById,
    deleteSlotHoldsForSlot,
    listActiveHoldTimesForDateIso,
    purgeExpiredSlotHolds,
    listBookingsForDateIso,
    insertAnalyticsEvents,
    listAnalyticsEventsBetween,
    listLiveAnalyticsSessions,
    listStaffVisitorIds,
    analyticsBookingStats,
    analyticsApplicationStats,
    closePool
};
