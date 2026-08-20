'use strict';

const CATEGORIES = [
    { id: 'hortofruticolas', label: 'Hortofrutícolas' },
    { id: 'lacticinios', label: 'Laticínios' },
    { id: 'mel', label: 'Mel' },
    { id: 'vinho', label: 'Vinho' },
    { id: 'azeite', label: 'Azeite' },
    { id: 'padaria', label: 'Padaria' },
    { id: 'cosmetica_natural', label: 'Cosmética natural' }
];

const SALES_METHODS = [
    { id: 'loja_fisica', label: 'Loja física' },
    { id: 'entrega', label: 'Entrega' },
    { id: 'mercado', label: 'Mercado' },
    { id: 'encomenda_online', label: 'Encomenda online' }
];

const DISTRICTS = [
    'Aveiro',
    'Beja',
    'Braga',
    'Bragança',
    'Castelo Branco',
    'Coimbra',
    'Évora',
    'Faro',
    'Guarda',
    'Leiria',
    'Lisboa',
    'Portalegre',
    'Porto',
    'Santarém',
    'Setúbal',
    'Viana do Castelo',
    'Vila Real',
    'Viseu',
    'Açores',
    'Madeira'
];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const SALES_IDS = new Set(SALES_METHODS.map((s) => s.id));
const DISTRICT_SET = new Set(DISTRICTS);
const STATUSES = new Set(['pendente', 'aprovado', 'rejeitado']);

function slugifyName(name) {
    const base = String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return base || 'produtor';
}

function str(raw, max) {
    return String(raw == null ? '' : raw).trim().slice(0, max);
}

function pickIds(raw, allowed, maxItems) {
    const arr = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? [raw] : [];
    const out = [];
    const seen = new Set();
    for (const item of arr) {
        const id = String(item || '').trim();
        if (!allowed.has(id) || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= maxItems) break;
    }
    return out;
}

function parseCoord(raw, min, max) {
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return Math.round(n * 1e6) / 1e6;
}

function sanitizePayload(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const website = str(src.website, 300);
    const websiteOk = !website || /^https?:\/\/.+/i.test(website);
    const otherSocial = str(src.socialOther || src.social_other, 300);
    return {
        name: str(src.name || src.nome, 160),
        shortDescription: str(src.shortDescription || src.descricaoCurta || src.short_description, 280),
        longDescription: str(src.longDescription || src.descricaoLonga || src.long_description, 8000),
        categories: pickIds(src.categories || src.categorias, CATEGORY_IDS, 7),
        district: DISTRICT_SET.has(str(src.district || src.distrito, 64))
            ? str(src.district || src.distrito, 64)
            : '',
        municipality: str(src.municipality || src.concelho, 128),
        address: str(src.address || src.morada, 300),
        lat: parseCoord(src.lat, -90, 90),
        lng: parseCoord(src.lng, -180, 180),
        certBody: str(src.certBody || src.cert_body || src.certificadora, 160),
        certNumber: str(src.certNumber || src.cert_number || src.selo, 120),
        website: websiteOk ? website : '',
        email: str(src.email, 320).toLowerCase(),
        phone: str(src.phone || src.telefone, 40),
        social: {
            instagram: str(src.instagram || (src.social && src.social.instagram), 120),
            facebook: str(src.facebook || (src.social && src.social.facebook), 200),
            other: otherSocial && /^https?:\/\/.+/i.test(otherSocial) ? otherSocial : str(otherSocial, 200)
        },
        salesMethods: pickIds(src.salesMethods || src.metodosVenda || src.sales_methods, SALES_IDS, 4)
    };
}

function labelFor(list, id) {
    const hit = list.find((item) => item.id === id);
    return hit ? hit.label : id;
}

function categoryLabels(ids) {
    return (Array.isArray(ids) ? ids : []).map((id) => labelFor(CATEGORIES, id));
}

function salesLabels(ids) {
    return (Array.isArray(ids) ? ids : []).map((id) => labelFor(SALES_METHODS, id));
}

function meta() {
    return { categories: CATEGORIES, salesMethods: SALES_METHODS, districts: DISTRICTS };
}

module.exports = {
    CATEGORIES,
    SALES_METHODS,
    DISTRICTS,
    CATEGORY_IDS,
    SALES_IDS,
    DISTRICT_SET,
    STATUSES,
    slugifyName,
    sanitizePayload,
    categoryLabels,
    salesLabels,
    meta
};
