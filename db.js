/**
 * PostgreSQL persistence (Supabase) via DATABASE_URL.
 * When DATABASE_URL is unset, the server uses in-memory arrays + file schedule (see dataLayer wiring in server.js).
 */

const util = require('util');
const { Pool } = require('pg');

let pool = null;

function getPool() {
    if (!process.env.DATABASE_URL) return null;
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000
        });
        pool.on('error', (err) => {
            console.error('   ⚠️  PostgreSQL pool error:', err.message);
        });
    }
    return pool;
}

function isDatabaseEnabled() {
    return Boolean(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());
}

function rowToBooking(row) {
    const createdAt = row.created_at;
    return {
        bookingRef: row.booking_ref,
        email: row.email,
        service: row.service,
        date: row.date,
        time: row.time,
        patientName: row.patient_name,
        travellerCount: row.traveller_count,
        amount: row.amount,
        currency: row.currency,
        paymentId: row.payment_id,
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
}

async function initDatabase() {
    const rawUrl = process.env.DATABASE_URL;
    const hasUrl = Boolean(rawUrl && String(rawUrl).trim());
    console.log(`   🗄️  initDatabase(): DATABASE_URL is ${hasUrl ? 'set' : 'NOT set'}`);
    if (hasUrl) {
        const trimmed = String(rawUrl).trim();
        console.log(
            `   🗄️  initDatabase(): connection string length: ${trimmed.length} (credentials not logged)`
        );
    }

    const p = getPool();
    if (!p) {
        return { ok: false, reason: 'no_database_url' };
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

async function insertBooking(booking) {
    const p = getPool();
    const r = await p.query(
        `INSERT INTO bookings (
            booking_ref, email, service, date, time, patient_name, traveller_count,
            amount, currency, payment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            booking.paymentId
        ]
    );
    return r.rowCount > 0;
}

async function findBookingsByEmail(email, optionalRef) {
    const p = getPool();
    const e = email.toLowerCase().trim();
    const r = await p.query(
        `SELECT * FROM bookings WHERE LOWER(email) = $1 ORDER BY created_at DESC`,
        [e]
    );
    let rows = r.rows.map(rowToBooking);
    if (optionalRef) {
        const ref = optionalRef.trim().toUpperCase();
        const has = rows.some((b) => b.bookingRef === ref);
        if (!has) {
            const extra = await p.query('SELECT * FROM bookings WHERE booking_ref = $1 LIMIT 1', [ref]);
            if (extra.rows[0]) {
                rows = [...rows, rowToBooking(extra.rows[0])];
            }
        }
    }
    return rows;
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
    const has = Boolean(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());
    console.log(`   🗄️  DATABASE_URL is ${has ? 'set' : 'NOT set'} (startup, db module)`);
})();

module.exports = {
    getPool,
    isDatabaseEnabled,
    initDatabase,
    bookingExistsByPaymentId,
    insertBooking,
    findBookingsByEmail,
    findAllBookings,
    findAllBookingsWithClinicalNotes,
    findBookingByRef,
    getClinicalNoteByRef,
    upsertClinicalNote,
    getSchedulePayload,
    saveSchedulePayload,
    closePool
};
