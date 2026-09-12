/**
 * Server-side booking price calculation (single source of truth for checkout).
 * Mirrors rules in booking.js — keep in sync when prices or tiers change.
 */

const SERVICE_ALIAS = {
    longevity: 'longevidade',
    followup: 'clinica_geral',
    itu: 'clinica_geral',
    infecao_urinaria: 'clinica_geral',
    infeccao_urinaria: 'clinica_geral'
};

/** Base per-service prices (EUR cents). Travel uses tier tables below. */
const SERVICE_CENTS = {
    clinica_geral: 3900,
    urgente: 3500,
    travel: 3900,
    saude_mental: 6000,
    burnout: 6000,
    burnout_mensal: 21600,
    burnout_programa: 49000,
    renovacao: 1900,
    longevidade: 7900,
    psicologia: 6000,
    psicologia_mensal: 22400,
    terapia_casal: 7500,
    terapia_casal_mensal: 26000,
    nutricao_consulta: 4500,
    nutricao_programa: 11500,
    nutricao_completo: 22700,
    nutricao_completo_reforcado: 32200
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

const STRIPE_MIN_CENTS = 50;

/** Fixed amount the provider is paid per completed paid session (not a % of patient charge). */
const PROVIDER_PAYOUT_CENTS = {
    clinica_geral: 2000,
    urgente: 2000,
    travel: 2000,
    saude_mental: 2000,
    burnout: 2000,
    burnout_mensal: 2000,
    burnout_programa: 2000,
    renovacao: 1500,
    longevidade: 2500,
    psicologia: 2000,
    psicologia_mensal: 2000,
    terapia_casal: 2500,
    terapia_casal_mensal: 2500,
    nutricao_consulta: 1600,
    nutricao_programa: 1600,
    nutricao_completo: 1600,
    nutricao_completo_reforcado: 1600
};

const B2B_CORPORATE_BONUS_CENTS = 20000;
const CONTINUITY_CLINIC_TAX = 0.2;

const STRIPE_SUBSCRIPTION_SERVICES = new Set(['burnout_mensal', 'psicologia_mensal', 'terapia_casal_mensal']);

function isStripeSubscriptionService(serviceKey) {
    return STRIPE_SUBSCRIPTION_SERVICES.has(serviceKey);
}

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
 * @param {number|null|undefined} opts.discountPercent — server-resolved percent off; never trust a client table
 * @returns {{ ok: true, subtotalCents: number, discountCents: number, totalCents: number } | { ok: false, error: string }}
 */
function computeCheckoutTotalCents(opts) {
    const { service, passengers, hasInsurance, discountPercent: discountPercentRaw } = opts;
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
    const noDiscountServices = new Set([
        'burnout_mensal',
        'burnout_programa',
        'psicologia_mensal',
        'terapia_casal_mensal',
        'nutricao_programa',
        'nutricao_completo',
        'nutricao_completo_reforcado'
    ]);
    if (!noDiscountServices.has(key)) {
        const pct = Number(discountPercentRaw);
        if (Number.isFinite(pct) && pct > 0) {
            discountPercent = Math.min(99, Math.round(pct));
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

function discountsAllowedForService(service) {
    const key = normalizeServiceKey(service);
    if (!key) return false;
    return ![
        'burnout_mensal',
        'burnout_programa',
        'psicologia_mensal',
        'terapia_casal_mensal',
        'nutricao_programa',
        'nutricao_completo',
        'nutricao_completo_reforcado'
    ].includes(key);
}

/**
 * What the clinic owes the provider for one paid booking — fixed fee, optional
 * B2B bonus, 20% clinic tax after a public programme (Cheque-Psicólogo / Cuida-te).
 */
function providerPayoutCents(booking) {
    if (!booking || booking.cancelled) return 0;
    const paymentId = String(booking.paymentId || '');
    const amountCents = Math.max(0, Math.round(Number(booking.amount) || 0));
    const isComp = paymentId.startsWith('comp_') || amountCents === 0;
    const isPaid = isComp || booking.markedPaid === true;
    if (!isPaid || isComp) return 0;
    if (String(booking.service || '') === 'entrevista') return 0;
    const key = normalizeServiceKey(booking.service);
    const fee = key && PROVIDER_PAYOUT_CENTS[key] != null ? PROVIDER_PAYOUT_CENTS[key] : 0;
    if (fee <= 0) return 0;
    const continuity = booking.continuityAfterProgram === true;
    let cents = continuity ? Math.round(fee * (1 - CONTINUITY_CLINIC_TAX)) : fee;
    const channel = String(booking.payoutChannel || booking.channel || 'direct').toLowerCase();
    if (channel === 'b2b_corporate') cents += B2B_CORPORATE_BONUS_CENTS;
    return cents;
}

module.exports = {
    computeCheckoutTotalCents,
    normalizeServiceKey,
    isStripeSubscriptionService,
    discountsAllowedForService,
    providerPayoutCents,
    PROVIDER_PAYOUT_CENTS,
    B2B_CORPORATE_BONUS_CENTS,
    CONTINUITY_CLINIC_TAX,
    STRIPE_MIN_CENTS
};
