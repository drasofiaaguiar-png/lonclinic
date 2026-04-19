/**
 * Server-side booking price calculation (single source of truth for checkout).
 * Mirrors rules in booking.js — keep in sync when prices or tiers change.
 */

const SERVICE_ALIAS = {
    longevity: 'longevidade',
    followup: 'clinica_geral'
};

/** Base per-service prices (EUR cents). Travel uses tier tables below. */
const SERVICE_CENTS = {
    clinica_geral: 3900,
    urgente: 3500,
    travel: 3900,
    saude_mental: 4900,
    renovacao: 1900,
    longevidade: 7900
};

const TRAVEL_TIER_CENTS = {
    standard: {
        1: 3900,
        2: 6900,
        3: 10700,
        4: 13600
    },
    medicare: {
        1: 3200,
        2: 4200,
        3: 4900,
        4: 5500
    }
};

/** Uppercase codes → percent off (integer). Same as booking.js discountCodes. */
const DISCOUNT_CODES = {
    ME2026: 99
};

const STRIPE_MIN_CENTS = 50;

function normalizeServiceKey(service) {
    const raw = String(service || '')
        .trim()
        .toLowerCase()
        .replace(/-/g, '_');
    if (!raw) return null;
    if (SERVICE_ALIAS[raw]) return SERVICE_ALIAS[raw];
    if (SERVICE_CENTS[raw] !== undefined) return raw;
    return null;
}

/**
 * @param {object} opts
 * @param {string} opts.service
 * @param {Array} opts.passengers
 * @param {boolean} opts.hasInsurance - Medicare tier for travel only
 * @param {string|null|undefined} opts.discountCode
 * @returns {{ ok: true, subtotalCents: number, discountCents: number, totalCents: number } | { ok: false, error: string }}
 */
function computeCheckoutTotalCents(opts) {
    const { service, passengers, hasInsurance, discountCode } = opts;
    const key = normalizeServiceKey(service);
    if (!key) {
        return { ok: false, error: 'Invalid service' };
    }

    const passengerList = Array.isArray(passengers) ? passengers : [];
    const n = passengerList.length;
    if (n < 1) {
        return { ok: false, error: 'At least one passenger is required' };
    }

    let subtotalCents;
    if (key === 'travel') {
        if (n > 4) {
            return { ok: false, error: 'Maximum 4 travellers for travel consultations' };
        }
        const tier = hasInsurance ? 'medicare' : 'standard';
        const row = TRAVEL_TIER_CENTS[tier][n];
        if (row === undefined) {
            return { ok: false, error: 'Invalid traveller count for travel pricing' };
        }
        subtotalCents = row;
    } else {
        if (n !== 1) {
            return { ok: false, error: 'Only one patient is allowed for this service type' };
        }
        subtotalCents = SERVICE_CENTS[key];
        if (subtotalCents === undefined) {
            return { ok: false, error: 'Unknown service price' };
        }
    }

    let discountPercent = 0;
    if (discountCode) {
        const code = String(discountCode).toUpperCase().trim();
        if (Object.prototype.hasOwnProperty.call(DISCOUNT_CODES, code)) {
            discountPercent = DISCOUNT_CODES[code];
        }
    }

    let discountCents = 0;
    if (discountPercent > 0) {
        discountCents = Math.round(subtotalCents * (discountPercent / 100));
    }
    let totalCents = subtotalCents - discountCents;
    if (totalCents < STRIPE_MIN_CENTS) {
        discountCents = subtotalCents - STRIPE_MIN_CENTS;
        totalCents = STRIPE_MIN_CENTS;
    }

    return { ok: true, subtotalCents, discountCents, totalCents };
}

module.exports = {
    computeCheckoutTotalCents,
    normalizeServiceKey,
    STRIPE_MIN_CENTS
};
