/**
 * Centros de Vacinação Internacional — internal source of truth.
 *
 * Public magazine pages receive a derived view only (never raw call notes).
 * The authenticated recommender receives derived priority + IVR hints only.
 * Raw "Experiência do Utilizador" never leaves this module via HTTP.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data', 'cvi', 'centers.json');
const GEO_PATH = path.join(__dirname, 'data', 'cvi', 'geo.json');

const NEAR_KM = 14;
const FAR_KM = 32;
const PRIORITY_KM = { high: 0, medium: 8, unknown: 11, low: 26 };

const PAGE_REGION = {
    'vacina-febre-amarela-lisboa': 'lvt',
    'vacina-febre-amarela-porto': 'porto',
    'vacina-febre-amarela-coimbra': 'centro',
    'vacina-febre-amarela-braga': 'minho',
    'vacina-febre-amarela-algarve': 'algarve',
    'vacina-febre-amarela-cuf': null,
    'vacinas-viajante-lisboa': 'lvt',
    'vacinas-viajante-porto': 'porto',
    'vacinas-viajante-coimbra': 'centro',
    'vacinas-viajante-braga': 'minho',
    'vacinas-viajante-algarve': 'algarve',
    'vacinas-viajante-cuf': null
};

function isYellowFeverPublicArticle(slug) {
    return /vacina-febre-amarela/.test(String(slug || ''));
}

function isCviPublicArticle(slug) {
    return isYellowFeverPublicArticle(slug) || /vacinas-viajante/.test(String(slug || ''));
}

const MONTHS_PT = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const PRIORITY_RANK = { high: 0, medium: 1, unknown: 2, low: 3, exclude: 4 };

let cache = null;
let cacheMtime = 0;
let geoIndex = null;

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fold(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function slugify(s) {
    const slug = fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return slug.slice(0, 80) || 'centro';
}

function digits(s) {
    return String(s || '').replace(/\D+/g, '');
}

function normalizePhone(s) {
    let d = digits(s);
    if (d.startsWith('00351')) d = d.slice(5);
    if (d.startsWith('351') && d.length > 9) d = d.slice(3);
    return d;
}

function parsePhones(s) {
    const raw = String(s || '');
    const found = raw.match(/\+?\d[\d\s./-]{7,}\d/g) || [];
    const out = [];
    for (const piece of found) {
        const n = normalizePhone(piece);
        if (n.length >= 9 && !out.includes(n)) out.push(n);
    }
    const fallback = normalizePhone(raw);
    if (fallback.length >= 9 && !out.includes(fallback)) out.push(fallback);
    return out;
}

function formatDatePt(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const day = String(Number(m[3]));
    const month = MONTHS_PT[Number(m[2]) - 1];
    if (!month) return '';
    return `${day} de ${month} de ${m[1]}`;
}

function parseLooseDate(s) {
    const iso = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = String(s || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (!dmy) return '';
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
}

function cleanExperience(s) {
    const text = String(s || '').trim();
    if (!text) return '';
    if (/^ainda nao auditado$/i.test(fold(text))) return '';
    return text;
}

function combinedHours(row) {
    const consult = String(row.hoursConsult || '').trim();
    const vaccine = String(row.hoursVaccination || '').trim();
    if (consult && vaccine && fold(consult) !== fold(vaccine)) {
        return `Consultas: ${consult}\nVacinação: ${vaccine}`;
    }
    return consult || vaccine || String(row.hours || '').trim();
}

function isPublicHowToBook(s) {
    const text = String(s || '').trim();
    const t = fold(text);
    if (!t || t.length > 280) return false;
    if (/what about|did you|blood test|prescritpion/.test(t)) return false;
    return /telefone|e-mail|email|marcacao|inscri|site/.test(t);
}

function isWaitValue(s) {
    const t = fold(s);
    if (!t) return false;
    if (/liguei|nao atenderam|atendem|atenderam|chamada/.test(t)) return false;
    return /mes|semana|dia|hora|espera/.test(t) || /^[<>~0-9]/.test(t);
}

function phoneLooksBroken(s) {
    return /nao funciona|numero incorreto|nao existe/.test(fold(s));
}

function todayIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function isoDay(value) {
    const s = String(value || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function storeUpdatedAt() {
    return isoDay(loadStore().updatedAt);
}

function typeList(node) {
    if (!node || typeof node !== 'object') return [];
    const t = node['@type'];
    return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
}

function hasType(node, name) {
    return typeList(node).includes(name);
}

function laterIso(a, b) {
    const x = isoDay(a);
    const y = isoDay(b);
    if (!x) return y;
    if (!y) return x;
    return x >= y ? x : y;
}

function inferCity(address) {
    const a = String(address || '');
    const postal = a.match(/\d{4}-\d{3}\s+[–-]?\s*([^,;]+)/);
    if (postal) return postal[1].replace(/^[–-]\s*/, '').trim();
    const dash = a.match(/[–-]\s*([^,;]+)$/);
    if (dash) return dash[1].trim();
    return '';
}

function inferRegion(row) {
    const label = fold(row.regionLabel || row.district || '');
    const blob = fold(`${row.city || ''} ${row.name || ''} ${row.address || ''}`);
    if (/acores/.test(label)) return 'acores';
    if (/madeira/.test(label)) return 'madeira';
    if (/algarve/.test(label)) return 'algarve';
    if (/alentejo/.test(label)) return 'alentejo';
    if (/centro/.test(label)) return 'centro';
    if (/lisboa|vale do tejo|^lvt$/.test(label)) return 'lvt';
    if (/norte/.test(label)) {
        if (/braga|viana|guimaraes|barcelos|famalicao|minho/.test(blob)) return 'minho';
        if (/porto|matosinhos|gaia|maia|gondomar|leca/.test(blob)) return 'porto';
        return 'norte';
    }
    if (/faro|portimao|algarve/.test(blob)) return 'algarve';
    if (/braga|viana|guimaraes|barcelos|famalicao|minho/.test(blob)) return 'minho';
    if (/porto|matosinhos|gaia|maia|gondomar|valongo|povoa|penafiel|amarante|leca/.test(blob)) return 'porto';
    if (/coimbra|aveiro|viseu|guarda|castelo branco|leiria|figueira|marrazes/.test(blob)) return 'centro';
    if (/madeira|funchal/.test(blob)) return 'madeira';
    if (/ponta delgada|angra|horta|velas|madalena|vila do porto/.test(blob)) return 'acores';
    if (/lisboa|almada|amadora|cascais|estoril|setubal|sintra|oeiras|loures|seixal|barreiro|moita|montijo|palmela|sesimbra|alcochete|arslvt|garcia de orta|curry cabral|damaia|santarem|lavradio/.test(blob)) {
        return 'lvt';
    }
    return 'other';
}

function emptyStore() {
    return { version: 1, updatedAt: null, source: null, centers: [] };
}

function loadStore() {
    try {
        const st = fs.statSync(DATA_PATH);
        if (cache && st.mtimeMs === cacheMtime) return cache;
        const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        cache = parsed && Array.isArray(parsed.centers) ? parsed : emptyStore();
        cacheMtime = st.mtimeMs;
        return cache;
    } catch {
        cache = emptyStore();
        cacheMtime = 0;
        return cache;
    }
}

function saveStore(store) {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = {
        version: 1,
        updatedAt: store.updatedAt || todayIso(),
        source: store.source || 'manual',
        centers: Array.isArray(store.centers) ? store.centers : []
    };
    fs.writeFileSync(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    cache = payload;
    try {
        cacheMtime = fs.statSync(DATA_PATH).mtimeMs;
    } catch {
        cacheMtime = Date.now();
    }
    return payload;
}

function isVerified(row) {
    const v = String((row && row.verified) || '').trim().toUpperCase();
    return v === 'OK' || v === 'TRUE' || v === 'SIM' || v === 'YES' || row.verified === true;
}

function extractIvrHint(raw) {
    const text = String(raw || '');
    if (!text.trim()) return null;
    const steps = [];
    const re = /(?:prima|tecla|marque|op(?:c|ç)(?:a|ã)o|depois)\s*(\d+)/gi;
    let match;
    while ((match = re.exec(text))) {
        if (!steps.includes(match[1])) steps.push(match[1]);
    }
    if (!steps.length) {
        if (/atendimento automatico|menu automatico|grava(?:c|ç)(?:a|ã)o|ivr/i.test(fold(text))) {
            return 'Há atendimento automático. Siga as opções de consulta do viajante.';
        }
        return null;
    }
    const viajante = /viajante|viagem|vacin/i.test(text);
    const first = viajante
        ? `prima ${steps[0]} para consulta do viajante`
        : `prima ${steps[0]}`;
    if (steps.length === 1) return `Ao ligar, ${first}.`;
    const rest = steps.slice(1).map((n, i) => (i === 0 ? `depois ${n}` : n)).join(', depois ');
    return `Ao ligar, ${first}, ${rest}.`;
}

function deriveExperience(raw) {
    const text = String(raw || '').trim();
    const t = fold(text);
    const contactHint = extractIvrHint(text);
    if (!t) {
        return {
            priority: 'unknown',
            excluded: false,
            excludeReason: null,
            contactHint,
            insistNote: null,
            attempts: null
        };
    }

    if (/numero (incorreto|errado|inexistente)|numero nao funciona|nao funciona|nao (e|e este) (o )?numero|numero nao existe/.test(t)) {
        return {
            priority: 'exclude',
            excluded: true,
            excludeReason: 'wrong_number',
            contactHint: null,
            insistNote: null,
            attempts: null
        };
    }

    let attempts = null;
    const att = t.match(/(\d+)\s*(a|ª)?\s*(vez|vezes|tentativa|tentativas)/);
    if (att) attempts = Number(att[1]);
    const lig = t.match(/lig(?:uei|amos|ar)\s+(\d+)/);
    if (attempts == null && lig) attempts = Number(lig[1]);

    const firstTry = /atendem a primeira|atendeu a primeira|atenderam a primeira|a primeira (chamada|vez|tentativa)|atendeu ja|atendeu de imediato/.test(t);
    const noAnswer = /nao atenderam|nao atendeu|ninguem atendeu|nao ha resposta|nao responderam/.test(t);
    const rejected = /chamada rejeitada|rejeitaram|chamada recusada|recusaram a chamada/.test(t);

    let priority = 'unknown';
    if (firstTry && !noAnswer && !rejected) priority = 'high';
    else if (rejected || (noAnswer && (attempts == null ? false : attempts >= 3)) || /muitas tentativas|varias tentativas/.test(t) && noAnswer) {
        priority = 'low';
    } else if (noAnswer || (attempts != null && attempts >= 1 && attempts <= 2)) {
        priority = 'medium';
    } else if (attempts != null && attempts >= 3) {
        priority = 'low';
    }

    if (noAnswer && attempts == null && priority === 'unknown') priority = 'medium';

    const insistNote = priority === 'medium' ? 'Pode ser preciso insistir.' : null;
    return {
        priority,
        excluded: false,
        excludeReason: null,
        contactHint,
        insistNote,
        attempts
    };
}

function publicView(row) {
    const hours = combinedHours(row);
    const broken = phoneLooksBroken(row.phone);
    return {
        id: row.id,
        n: row.n == null ? null : Number(row.n),
        name: row.name || '',
        address: row.address || '',
        city: row.city || '',
        district: row.district || '',
        region: row.region || inferRegion(row),
        phone: broken ? '' : (row.phone || ''),
        phones: Array.isArray(row.phones) && row.phones.length ? row.phones : parsePhones(row.phone),
        email: row.email || '',
        hours,
        hoursNote: row.hoursNote || '',
        howToBookPublic: row.verified && isPublicHowToBook(row.howToBook) ? String(row.howToBook).trim() : '',
        waitVaccinePublic: row.verified && isWaitValue(row.waitVaccine)
            ? String(row.waitVaccine).replace(/^tempo de espera\s*/i, '').trim()
            : '',
        verified: isVerified(row),
        verifiedAt: isVerified(row) ? (row.verifiedAt || null) : null,
        featured: Boolean(row.featured),
        privateClinic: Boolean(row.privateClinic)
    };
}

function recommendView(row) {
    const pub = publicView(row);
    const experience = phoneLooksBroken(row.phone)
        ? `${cleanExperience(row.experience)}\nNúmero incorreto`.trim()
        : cleanExperience(row.experience);
    const derived = deriveExperience(experience);
    return {
        ...pub,
        howToBook: String(row.howToBook || '').trim(),
        howToBookVaccine: String(row.howToBookVaccine || '').trim(),
        waitConsult: isWaitValue(row.waitConsult) ? String(row.waitConsult).trim() : '',
        waitVaccine: isWaitValue(row.waitVaccine) ? String(row.waitVaccine).trim() : '',
        prazoReal: {
            consultaLon: 'Geralmente no próprio dia ou no dia seguinte',
            marcacaoVacina: isWaitValue(row.waitVaccine)
                ? String(row.waitVaccine).replace(/^tempo de espera\s*/i, '').trim()
                : ''
        },
        priority: derived.priority,
        excluded: derived.excluded,
        excludeReason: derived.excludeReason,
        contactHint: derived.contactHint,
        insistNote: derived.insistNote
    };
}

function allCenters() {
    return loadStore().centers || [];
}

function publicCenters() {
    return allCenters().map(publicView);
}

function landmass(region) {
    const r = String(region || '');
    if (r === 'acores') return 'acores';
    if (r === 'madeira') return 'madeira';
    return 'continente';
}

function extractPostal4(s) {
    const m = String(s || '').match(/\b(\d{4})-(\d{3})\b/);
    if (m) return m[1];
    const only = String(s || '').trim().match(/^(\d{4})(?:-\d{3})?$/);
    return only ? only[1] : '';
}

function loadGeoIndex() {
    if (geoIndex) return geoIndex;
    let places = [];
    try {
        const parsed = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
        places = parsed && Array.isArray(parsed.places) ? parsed.places : [];
    } catch {
        places = [];
    }
    const byKey = new Map();
    const byPrefix = new Map();
    const list = [];
    for (const raw of places) {
        const lat = Number(raw.lat);
        const lng = Number(raw.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const place = {
            name: String(raw.name || '').trim(),
            region: String(raw.region || ''),
            lat,
            lng,
            landmass: landmass(raw.region)
        };
        if (!place.name) continue;
        list.push(place);
        const keys = [place.name, ...(Array.isArray(raw.aliases) ? raw.aliases : [])];
        for (const key of keys) {
            const f = fold(key);
            if (f && !byKey.has(f)) byKey.set(f, place);
        }
        for (const prefix of Array.isArray(raw.prefixes) ? raw.prefixes : []) {
            const p = String(prefix || '').replace(/\D+/g, '').slice(0, 4);
            if (p.length === 4) byPrefix.set(p, place);
        }
    }
    geoIndex = { list, byKey, byPrefix };
    return geoIndex;
}

function haversineKm(a, b) {
    if (!a || !b) return null;
    const r = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return Math.round(r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function lookupPlace(query) {
    const geo = loadGeoIndex();
    const q = fold(query);
    if (!q) return null;
    const postal = extractPostal4(query);
    if (postal && geo.byPrefix.has(postal)) return geo.byPrefix.get(postal);
    if (postal) {
        const two = postal.slice(0, 2);
        let best = null;
        let bestDiff = 9999;
        for (const [prefix, place] of geo.byPrefix) {
            if (!prefix.startsWith(two)) continue;
            const diff = Math.abs(Number(prefix) - Number(postal));
            if (diff < bestDiff) {
                best = place;
                bestDiff = diff;
            }
        }
        if (best && bestDiff <= 50) return best;
    }
    if (geo.byKey.has(q)) return geo.byKey.get(q);
    if (q.length < 3) return null;
    let found = null;
    let foundLen = 0;
    for (const [key, place] of geo.byKey) {
        if (key.length < 3) continue;
        if (q === key || q.includes(key) || key.includes(q)) {
            if (key.length > foundLen) {
                found = place;
                foundLen = key.length;
            }
        }
    }
    return found;
}

function parseLatLng(lat, lng) {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
    if (la < 32 || la > 43 || ln < -32 || ln > -6) return null;
    return { lat: la, lng: ln };
}

function nearestPlace(coords) {
    const geo = loadGeoIndex();
    let best = null;
    let bestKm = Infinity;
    for (const place of geo.list) {
        const km = haversineKm(coords, place);
        if (km != null && km < bestKm) {
            best = place;
            bestKm = km;
        }
    }
    return best;
}

function resolveOrigin(opts) {
    const coords = parseLatLng(opts && opts.lat, opts && opts.lng);
    if (coords) {
        const near = nearestPlace(coords);
        return {
            lat: coords.lat,
            lng: coords.lng,
            label: near ? near.name : 'a sua localização',
            region: near ? near.region : '',
            landmass: near ? near.landmass : landmass(''),
            resolved: true
        };
    }
    const query = String((opts && (opts.city || opts.query)) || '').trim();
    if (!query) return null;
    const place = lookupPlace(query);
    if (!place) {
        return { query, resolved: false, label: query };
    }
    return {
        lat: place.lat,
        lng: place.lng,
        label: place.name,
        region: place.region,
        landmass: place.landmass,
        resolved: true
    };
}

function coordsForCenter(row) {
    const postal = extractPostal4(row.address);
    const geo = loadGeoIndex();
    if (postal && geo.byPrefix.has(postal)) return geo.byPrefix.get(postal);
    return lookupPlace(row.city) || lookupPlace(row.regionLabel) || lookupPlace(row.region) || null;
}

function driveMinutes(km) {
    if (km == null) return null;
    return Math.max(8, Math.round(km * 1.5));
}

function distanceLabel(km) {
    if (km == null) return '';
    if (km < 1) return 'A menos de 1 km';
    const rounded = km < 10 ? km : Math.round(km);
    if (km > 80) return `A ${rounded} km`;
    return `A ${rounded} km · ~${driveMinutes(km)} min`;
}

function isReasonablePriority(priority) {
    return priority !== 'low';
}

function sameCatchment(row, origin) {
    if (!origin || !origin.label) return false;
    const here = lookupPlace(row.city);
    if (here && here.name === origin.label) return true;
    return fold(row.city) === fold(origin.label);
}

function proximityScore(row, origin, hasNearbyReasonable) {
    if (row.distanceKm == null) return 8000 + (PRIORITY_RANK[row.priority] ?? 2);
    let score = row.distanceKm + (PRIORITY_KM[row.priority] ?? 11);
    if (sameCatchment(row, origin)) score -= 10;
    if (origin.landmass && row.landmass && origin.landmass !== row.landmass) score += 5000;
    if (hasNearbyReasonable && row.distanceKm > FAR_KM) score += 250;
    return score;
}

function sortByContact(rows) {
    rows.sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority] ?? 2;
        const pb = PRIORITY_RANK[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        if (Boolean(b.verified) !== Boolean(a.verified)) return a.verified ? -1 : 1;
        return String(a.name).localeCompare(String(b.name), 'pt');
    });
    return rows;
}

function attachProximity(rows, origin) {
    if (!origin || !origin.resolved) {
        return rows.map((row) => ({ ...row, landmass: landmass(row.region) }));
    }
    return rows.map((row) => {
        const coords = coordsForCenter(row);
        const km = coords ? haversineKm(origin, coords) : null;
        return {
            ...row,
            landmass: landmass(row.region),
            distanceKm: km,
            driveMinutes: km != null && km <= 80 ? driveMinutes(km) : null,
            distanceLabel: distanceLabel(km),
            nearby: km != null && km <= NEAR_KM
        };
    });
}

function sortWithProximity(rows, origin) {
    if (!origin || !origin.resolved) return sortByContact(rows);
    const hasNearbyReasonable = rows.some((row) => row.nearby && isReasonablePriority(row.priority));
    rows.sort((a, b) => {
        const sa = proximityScore(a, origin, hasNearbyReasonable);
        const sb = proximityScore(b, origin, hasNearbyReasonable);
        if (sa !== sb) return sa - sb;
        const pa = PRIORITY_RANK[a.priority] ?? 2;
        const pb = PRIORITY_RANK[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        if ((a.distanceKm ?? 9999) !== (b.distanceKm ?? 9999)) {
            return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
        }
        return String(a.name).localeCompare(String(b.name), 'pt');
    });
    return rows;
}

function recommendCenters(opts) {
    const origin = resolveOrigin(opts || {});
    let rows = allCenters().map(recommendView).filter((row) => !row.excluded);
    const region = fold((opts && opts.region) || '');
    if (region) {
        rows = rows.filter((row) => row.region === region);
    }
    rows = attachProximity(rows, origin);
    return sortWithProximity(rows, origin);
}

function recommendPayload(opts) {
    const store = loadStore();
    const origin = resolveOrigin(opts || {});
    const centers = recommendCenters(opts);
    return {
        updatedAt: store.updatedAt || null,
        origin: origin
            ? {
                resolved: Boolean(origin.resolved),
                label: origin.label || '',
                nearbyCount: origin.resolved
                    ? centers.filter((row) => row.nearby && isReasonablePriority(row.priority)).length
                    : 0
            }
            : null,
        centers
    };
}

function telHref(phone) {
    const n = normalizePhone(phone);
    return n ? `tel:${n}` : '';
}

function formatHoursHtml(hours) {
    const text = String(hours || '').trim();
    if (!text) return '';
    return escapeHtml(text).replace(/\n+/g, '<br>');
}

function verifyBadgeHtml(row) {
    if (row.verified && row.verifiedAt) {
        const label = formatDatePt(row.verifiedAt);
        if (label) {
            return `<p class="alg-loc-verify"><span class="alg-badge-ok">Confirmado em ${escapeHtml(label)}</span></p>`;
        }
        return '<p class="alg-loc-verify"><span class="alg-badge-ok">Confirmado por contacto directo</span></p>';
    }
    return '<p class="alg-loc-verify"><span class="alg-badge-pending">Informação sujeita a confirmação</span></p>';
}

function locCardHtml(row, opts) {
    const featured = opts && opts.featured || row.featured;
    const badges = [];
    if (!row.privateClinic) badges.push('<span class="alg-badge-cv">Consulta</span><span class="alg-badge-vac">Vacinação</span>');
    else badges.push('<span class="alg-badge-cv">Consulta</span><span class="alg-badge-priv">Privado</span>');
    const phoneLink = row.phone
        ? `<div class="alg-loc-contact">📞 <a href="${escapeHtml(telHref(row.phone))}">${escapeHtml(row.phone)}</a></div>`
        : '';
    const emailLink = row.email
        ? `<div class="alg-loc-contact">✉️ <a href="mailto:${escapeHtml(row.email)}">${escapeHtml(row.email)}</a></div>`
        : '';
    const hours = row.hours
        ? `<div class="alg-loc-hours"><strong>Horário</strong>${formatHoursHtml(row.hours)}</div>`
        : '';
    const book = row.howToBookPublic
        ? `<div class="alg-loc-email-note"><strong>Como marcar</strong><br>${escapeHtml(row.howToBookPublic)}</div>`
        : '';
    const prazo = row.verified
        ? `<div class="alg-loc-prazo"><strong>Prazo real até à vacina</strong>Consulta LON: próprio dia ou dia seguinte${row.waitVaccinePublic ? `<br>Marcação neste centro: ${escapeHtml(row.waitVaccinePublic)}` : '<br>Marcação neste centro: confirmar no acto do contacto'}</div>`
        : '';
    const address = row.address
        ? `<div class="alg-loc-address">📍 ${escapeHtml(row.address).replace(/\n+/g, '<br>')}</div>`
        : '';
    return `<div class="alg-loc-card${featured ? ' featured' : ''}">
        <div class="alg-loc-card-header">
          <div class="alg-loc-name">${escapeHtml(row.name)}</div>
          <div class="alg-loc-badges">${badges.join('')}</div>
        </div>
        ${verifyBadgeHtml(row)}
        ${address}
        ${hours}
        ${prazo}
        ${book}
        <div class="alg-loc-contacts">${phoneLink}${emailLink}</div>
      </div>`;
}

function findMatchingDivEnd(html, start) {
    const open = html.indexOf('>', start);
    if (open === -1) return -1;
    let depth = 1;
    let i = open + 1;
    while (i < html.length && depth > 0) {
        const nextOpen = html.indexOf('<div', i);
        const nextClose = html.indexOf('</div>', i);
        if (nextClose === -1) return -1;
        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth += 1;
            i = nextOpen + 4;
        } else {
            depth -= 1;
            i = nextClose + 6;
        }
    }
    return i;
}

function extractDivsByClass(html, className) {
    const results = [];
    let i = 0;
    while (i < html.length) {
        const classPos = html.indexOf('class="', i);
        if (classPos === -1) break;
        const attrEnd = html.indexOf('"', classPos + 7);
        if (attrEnd === -1) break;
        const classes = html.slice(classPos + 7, attrEnd).split(/\s+/);
        if (!classes.includes(className)) {
            i = classPos + 7;
            continue;
        }
        const divStart = html.lastIndexOf('<div', classPos);
        if (divStart === -1 || divStart < i) {
            i = classPos + 7;
            continue;
        }
        const end = findMatchingDivEnd(html, divStart);
        if (end === -1) break;
        results.push({ start: divStart, end, html: html.slice(divStart, end) });
        i = end;
    }
    return results;
}

function indexByPhone(rows) {
    const map = new Map();
    for (const row of rows) {
        const phones = Array.isArray(row.phones) && row.phones.length ? row.phones : parsePhones(row.phone);
        for (const p of phones) {
            if (p && !map.has(p)) map.set(p, row);
        }
    }
    return map;
}

function matchRowFromHtml(block, byPhone, rows) {
    const tels = [];
    const re = /href="tel:([^"]+)"/gi;
    let match;
    while ((match = re.exec(block))) {
        const n = normalizePhone(match[1]);
        if (n) tels.push(n);
    }
    for (const n of tels) {
        if (byPhone.has(n)) return byPhone.get(n);
    }
    const nameMatch = block.match(/class="alg-loc-name">([^<]+)/);
    const nameFold = fold(nameMatch ? nameMatch[1] : '');
    if (!nameFold) return null;
    return rows.find((row) => {
        const n = fold(row.name);
        return n && (nameFold.includes(n) || n.includes(nameFold));
    }) || null;
}

function stripInjectedVerify(block) {
    return block.replace(/\s*<p class="alg-loc-verify">[\s\S]*?<\/p>/g, '');
}

function injectVerifyAfterName(block, badge) {
    if (/class="alg-loc-verify"/.test(block)) return block;
    return block.replace(
        /(<div class="alg-loc-name">[\s\S]*?<\/div>)/,
        `$1\n        ${badge}`
    );
}

function hoursFromCard(block) {
    const m = String(block || '').match(/<div class="alg-loc-hours">[\s\S]*?<\/div>/);
    return m ? m[0] : '';
}

function annotateLocCards(html, rows, byPhone) {
    const cards = extractDivsByClass(html, 'alg-loc-card');
    if (!cards.length) return { html, usedPhones: new Set() };
    const usedPhones = new Set();
    let out = html;
    for (let i = cards.length - 1; i >= 0; i -= 1) {
        const card = cards[i];
        const row = matchRowFromHtml(card.html, byPhone, rows);
        const pub = row ? publicView(row) : { verified: false, verifiedAt: null };
        if (row) {
            const phones = pub.phones || parsePhones(row.phone);
            phones.forEach((p) => usedPhones.add(p));
        }
        let next;
        if (row && pub.verified) {
            if (!pub.hours) {
                const kept = hoursFromCard(card.html);
                if (kept) {
                    const inner = kept.replace(/^<div class="alg-loc-hours">[\s\S]*?<strong>[^<]*<\/strong>/, '').replace(/<\/div>$/, '');
                    pub.hours = inner.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
                }
            }
            next = locCardHtml(pub, { featured: /\bfeatured\b/.test(card.html) });
        } else {
            next = stripInjectedVerify(card.html);
            next = injectVerifyAfterName(next, verifyBadgeHtml(pub));
        }
        out = out.slice(0, card.start) + next + out.slice(card.end);
    }
    return { html: out, usedPhones };
}

function annotateTableRows(html, byPhone) {
    return html.replace(/<tr>([\s\S]*?)<\/tr>/gi, (full, inner) => {
        if (!/href="tel:/i.test(inner)) return full;
        if (/alg-badge-ok|alg-badge-pending/.test(inner)) return full;
        const tel = inner.match(/href="tel:([^"]+)"/i);
        const row = tel ? byPhone.get(normalizePhone(tel[1])) : null;
        const pub = row ? publicView(row) : { verified: false, verifiedAt: null };
        const badge = pub.verified
            ? `<br><span class="alg-badge-ok">${pub.verifiedAt ? `Confirmado em ${escapeHtml(formatDatePt(pub.verifiedAt))}` : 'Confirmado'}</span>`
            : '<br><span class="alg-badge-pending">Sujeito a confirmação</span>';
        if (/<\/td>\s*$/i.test(inner.trim())) {
            return `<tr>${inner.replace(/(<\/td>\s*)$/i, `${badge}$1`)}</tr>`;
        }
        return `<tr>${inner}${badge}</tr>`;
    });
}

function appendExtraVerified(html, slug, rows, usedPhones) {
    const region = PAGE_REGION[slug];
    if (!region) return html;
    const extras = rows
        .map(publicView)
        .filter((row) => row.verified && row.region === region)
        .filter((row) => {
            const phones = row.phones || parsePhones(row.phone);
            return phones.every((p) => !usedPhones.has(p));
        });
    if (!extras.length) return html;
    const cards = extras.map((row) => locCardHtml(row, { featured: false })).join('\n');
    const divider = `<div class="alg-region-divider">Confirmados por contacto directo</div>\n${cards}`;
    const gridOpen = html.lastIndexOf('alg-loc-grid');
    if (gridOpen === -1) return html;
    const gridDivStart = html.lastIndexOf('<div', gridOpen);
    const gridEnd = findMatchingDivEnd(html, gridDivStart);
    if (gridEnd === -1) return html;
    const insertAt = gridEnd - 6;
    if (insertAt < 0 || html.slice(insertAt, gridEnd) !== '</div>') return html;
    return html.slice(0, insertAt) + `\n      ${divider}\n    ` + html.slice(insertAt);
}

const PRAZO_FAQ_YF_Q = 'Qual é o prazo real até tomar a vacina da febre amarela?';
const PRAZO_FAQ_YF_A = 'O prazo real não é o da consulta: marca a consulta no site, por telefone ou WhatsApp; a consulta é geralmente no próprio dia ou no dia seguinte; com a prescrição marca a vacina num Centro de Vacinação Internacional; o tempo de agendamento da vacina depende do centro. O certificado internacional só é válido 10 dias após a vacinação.';
const PRAZO_FAQ_TRAVEL_Q = 'Qual é o prazo real até tomar as vacinas do viajante?';
const PRAZO_FAQ_TRAVEL_A = 'O prazo real não é o da consulta: marca a consulta no site, por telefone ou WhatsApp; a consulta é geralmente no próprio dia ou no dia seguinte; com a prescrição marca a vacina num Centro de Vacinação Internacional; o tempo de agendamento depende do centro. Algumas vacinas pedem mais do que uma dose. Se precisar de febre amarela, o certificado só é válido 10 dias após a vacinação.';

function prazoFaqForSlug(slug) {
    if (isYellowFeverPublicArticle(slug)) {
        return { q: PRAZO_FAQ_YF_Q, a: PRAZO_FAQ_YF_A };
    }
    return { q: PRAZO_FAQ_TRAVEL_Q, a: PRAZO_FAQ_TRAVEL_A };
}

function isPrazoFaqQuestion(name) {
    return name === PRAZO_FAQ_YF_Q || name === PRAZO_FAQ_TRAVEL_Q;
}

function prazoStep04Text(slug) {
    if (isYellowFeverPublicArticle(slug)) {
        return 'Varia por centro — de um dia a vários meses. Nos centros já confirmados por nós, esse prazo aparece no cartão. Depois da vacina, o certificado só é válido 10 dias depois.';
    }
    return 'Varia por centro — de um dia a vários meses. Nos centros já confirmados por nós, esse prazo aparece no cartão. Algumas vacinas pedem série de doses. Se precisar de febre amarela, o certificado só é válido 10 dias depois.';
}

function prazoTimelineHtml(slug) {
    const step04 = prazoStep04Text(slug);
    return `<section class="alg-section alg-prazo-section" id="prazo-real-vacina">
    <div class="alg-section-label">Prazo real até à vacina</div>
    <h3>Do agendamento à vacina — o tempo que conta</h3>
    <p class="alg-section-sub">A consulta médica é rápida. O prazo até tomar a vacina é a soma da consulta LON com o tempo de marcação no Centro de Vacinação Internacional.</p>
    <div class="alg-prazo-steps">
      <div class="alg-prazo-step"><span>01</span><div><h4>Agendar consulta</h4><p>No <a href="/marcar/travel">site</a>, por <a href="tel:+351928372775">telefone</a> ou por <a href="https://wa.me/351928372775" target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p></div></div>
      <div class="alg-prazo-step"><span>02</span><div><h4>Ter a consulta</h4><p>Geralmente no próprio dia ou no dia seguinte. Sai com prescrição, se houver indicação.</p></div></div>
      <div class="alg-prazo-step"><span>03</span><div><h4>Marcação da vacina</h4><p>Com a receita, contacta o Centro de Vacinação Internacional (telefone, email ou, quando existe, o site do centro).</p></div></div>
      <div class="alg-prazo-step"><span>04</span><div><h4>Tempo de agendamento da vacina</h4><p>${step04}</p></div></div>
    </div>
  </section>`;
}

function injectPrazoSection(html, slug) {
    if (/id="prazo-real-vacina"/.test(html)) return html;
    const block = prazoTimelineHtml(slug);
    if (/class="alg-locations-section"/.test(html)) {
        return html.replace(/<section class="alg-locations-section">/, `${block}\n  <section class="alg-locations-section">`);
    }
    if (/class="alg-faq-list"/.test(html)) {
        return html.replace(/<section class="alg-section"[^>]*>\s*<div class="alg-section-label">Perguntas frequentes/, `${block}\n  $&`);
    }
    return html;
}

function injectPrazoFaq(html, dataDate, slug) {
    const faq = prazoFaqForSlug(slug);
    if (html.includes(faq.q)) return html;
    const item = `<div class="alg-faq-item"><div class="alg-faq-q">${escapeHtml(faq.q)}</div><div class="alg-faq-a">${escapeHtml(faq.a)}</div></div>`;
    let out = html;
    if (/<div class="alg-faq-list">/.test(out)) {
        out = out.replace('<div class="alg-faq-list">', `<div class="alg-faq-list">\n      ${item}`);
    }
    const q = {
        '@type': 'Question',
        name: faq.q,
        dateModified: isoDay(dataDate) || undefined,
        acceptedAnswer: {
            '@type': 'Answer',
            text: faq.a,
            dateModified: isoDay(dataDate) || undefined
        }
    };
    out = out.replace(/("@type":\s*"FAQPage"[\s\S]*?"mainEntity":\s*\[)/, `$1\n    ${JSON.stringify(q)},`);
    return out;
}

function questionDate(node, articleDate, dataDate) {
    const name = String((node && node.name) || '');
    if (isPrazoFaqQuestion(name)) return isoDay(dataDate) || isoDay(articleDate);
    return isoDay(articleDate) || isoDay(dataDate);
}

function stampJsonLdNode(node, articleDate, dataDate) {
    if (Array.isArray(node)) {
        return node.map((item) => stampJsonLdNode(item, articleDate, dataDate));
    }
    if (!node || typeof node !== 'object') return node;
    const next = { ...node };
    if (hasType(next, 'Question')) {
        const day = next.dateModified || questionDate(next, articleDate, dataDate);
        if (day) next.dateModified = day;
        if (next.acceptedAnswer && typeof next.acceptedAnswer === 'object') {
            next.acceptedAnswer = { ...next.acceptedAnswer };
            if (day && !next.acceptedAnswer.dateModified) next.acceptedAnswer.dateModified = day;
        }
    } else if (hasType(next, 'FAQPage') || hasType(next, 'MedicalClinic') || hasType(next, 'MedicalWebPage') || hasType(next, 'Article')) {
        const fallback = hasType(next, 'FAQPage')
            ? laterIso(dataDate, articleDate)
            : isoDay(dataDate) || isoDay(articleDate);
        if (fallback && !next.dateModified) next.dateModified = fallback;
    }
    for (const key of Object.keys(next)) {
        if (key === '@context' || key === '@type' || key === '@id') continue;
        const val = next[key];
        if (val && typeof val === 'object') next[key] = stampJsonLdNode(val, articleDate, dataDate);
    }
    if (hasType(next, 'FAQPage') && Array.isArray(next.mainEntity)) {
        const maxQ = next.mainEntity.reduce((acc, q) => laterIso(acc, q && q.dateModified), '');
        if (maxQ) next.dateModified = maxQ;
    }
    return next;
}

function stampEmbeddedJsonLd(html, articleDate, dataDate) {
    return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (full, raw) => {
        try {
            const data = JSON.parse(raw);
            const stamped = stampJsonLdNode(data, articleDate, dataDate);
            return `<script type="application/ld+json">\n${JSON.stringify(stamped, null, 2)}\n</script>`;
        } catch {
            return full;
        }
    });
}

function locCardFallback(block) {
    const name = String((block.match(/class="alg-loc-name">([^<]+)/) || [])[1] || '').trim();
    const telRaw = String((block.match(/href="tel:([^"]+)"/i) || [])[1] || '');
    const email = String((block.match(/href="mailto:([^"]+)"/i) || [])[1] || '').trim();
    const addrRaw = String((block.match(/class="alg-loc-address">([\s\S]*?)<\/div>/) || [])[1] || '');
    const address = addrRaw.replace(/<[^>]+>/g, ' ').replace(/📍/g, '').replace(/\s+/g, ' ').trim();
    return {
        id: '',
        name,
        address,
        city: '',
        phone: telRaw.replace(/\D+/g, '').replace(/^351/, '') ? telRaw : '',
        email,
        hours: '',
        verified: /alg-badge-ok/.test(block),
        verifiedAt: null
    };
}

function locCardSlug(pub) {
    if (pub.id) return String(pub.id);
    return `loc-${fold(pub.name || pub.phone || 'centro').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}`;
}

function centerEntryDate(pub, articleDate, dataDate) {
    if (pub.verified) return isoDay(pub.verifiedAt) || isoDay(dataDate) || isoDay(articleDate);
    return isoDay(articleDate) || isoDay(dataDate);
}

function clinicAboutNode(pub, day) {
    const node = {
        '@type': 'MedicalClinic',
        name: pub.name
    };
    if (day) node.dateModified = day;
    if (pub.address) {
        node.address = {
            '@type': 'PostalAddress',
            streetAddress: pub.address,
            addressLocality: pub.city || undefined,
            addressCountry: 'PT'
        };
    }
    if (pub.phone) node.telephone = pub.phone;
    if (pub.email) node.email = pub.email;
    return node;
}

function collectPageCenters(html) {
    const rows = allCenters();
    const byPhone = indexByPhone(rows);
    const cards = extractDivsByClass(html, 'alg-loc-card');
    const pubs = [];
    const seen = new Set();
    for (const card of cards) {
        const row = matchRowFromHtml(card.html, byPhone, rows);
        const pub = row ? publicView(row) : locCardFallback(card.html);
        if (!pub.name) continue;
        const key = locCardSlug(pub);
        if (seen.has(key)) continue;
        seen.add(key);
        pubs.push(pub);
    }
    return pubs;
}

function centersItemListJsonLd(pubs, opts) {
    const pageUrl = String((opts && opts.pageUrl) || '');
    const articleDate = isoDay(opts && opts.articleDate);
    const dataDate = isoDay(opts && opts.dataDate);
    if (!pubs.length) return null;
    const elements = pubs.map((pub, i) => {
        const day = centerEntryDate(pub, articleDate, dataDate);
        const id = pageUrl ? `${pageUrl}#${locCardSlug(pub)}` : undefined;
        return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'WebPageElement',
                '@id': id,
                name: pub.name,
                dateModified: day || undefined,
                about: clinicAboutNode(pub, day)
            }
        };
    });
    const listDate = elements.reduce((acc, el) => laterIso(acc, el.item && el.item.dateModified), dataDate || articleDate);
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Centros de Vacinação Internacional',
        dateModified: listDate || undefined,
        itemListElement: elements
    };
}

function jsonLdForArticle(slug, html, opts) {
    if (!html || !isCviPublicArticle(slug)) return [];
    const list = centersItemListJsonLd(collectPageCenters(html), opts);
    return list ? [list] : [];
}

function annotatePublicArticle(html, slug, opts) {
    if (!html || !isCviPublicArticle(slug)) return html;
    const articleDate = isoDay(opts && opts.articleDate);
    const dataDate = isoDay(opts && opts.dataDate) || storeUpdatedAt();
    const rows = allCenters();
    const byPhone = indexByPhone(rows);
    const loc = annotateLocCards(html, rows, byPhone);
    let out = annotateTableRows(loc.html, byPhone);
    out = appendExtraVerified(out, slug, rows, loc.usedPhones);
    out = injectPrazoSection(out, slug);
    out = injectPrazoFaq(out, dataDate, slug);
    out = stampEmbeddedJsonLd(out, articleDate, dataDate);
    return out;
}

function headerKey(name) {
    return fold(name).replace(/[^a-z0-9]+/g, ' ').trim();
}

const CSV_FIELDS = [
    { key: 'n', aliases: ['n', 'no', 'numero', 'num'] },
    { key: 'name', aliases: ['nome', 'instituicao', 'centro', 'local', 'designacao', 'centro de vacinacao internacional'] },
    { key: 'address', aliases: ['morada', 'endereco', 'morada postal'] },
    { key: 'city', aliases: ['cidade', 'concelho', 'localidade'] },
    { key: 'district', aliases: ['distrito'] },
    { key: 'regionLabel', aliases: ['regiao'] },
    { key: 'phone', aliases: ['telefone', 'tel', 'contacto', 'contato', 'telefone 1'] },
    { key: 'email', aliases: ['email', 'e mail', 'e-mail', 'correio'] },
    { key: 'howToBook', aliases: ['como marcar'] },
    { key: 'hoursConsult', aliases: ['horario consultas', 'horario consulta'] },
    { key: 'waitConsult', aliases: ['tempo de espera para consulta', 'tempo de espera consulta'] },
    { key: 'hoursVaccination', aliases: ['horario vacinacao', 'horario vacina'] },
    { key: 'waitVaccine', aliases: ['tempo de espera para vacina', 'tempo de espera vacina'] },
    { key: 'howToBookVaccine', aliases: ['como marcar vacina ja tendo receita', 'como marcar vacina'] },
    { key: 'hours', aliases: ['horario', 'horarios', 'horario de funcionamento'] },
    { key: 'verified', aliases: ['verificado'] },
    { key: 'experience', aliases: ['experiencia do utilizador', 'experiencia', 'experiencia do usuario'] },
    { key: 'verifiedAt', aliases: ['data de confirmacao', 'data verificado', 'confirmado em', 'data'] }
];

function parseCsvRecords(text, delimiter) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < raw.length; i += 1) {
        const ch = raw[i];
        if (quoted) {
            if (ch === '"') {
                if (raw[i + 1] === '"') {
                    cur += '"';
                    i += 1;
                } else {
                    quoted = false;
                }
            } else {
                cur += ch;
            }
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === delimiter) {
            row.push(cur);
            cur = '';
        } else if (ch === '\n') {
            row.push(cur);
            cur = '';
            if (row.some((cell) => String(cell).trim())) rows.push(row);
            row = [];
        } else if (ch !== '\r') {
            cur += ch;
        }
    }
    row.push(cur);
    if (row.some((cell) => String(cell).trim())) rows.push(row);
    return rows;
}

function parseCsvLine(line, delimiter) {
    const rows = parseCsvRecords(line, delimiter);
    return rows[0] || [];
}

function parseCsv(text) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    if (!raw.trim()) return [];
    const firstLine = raw.split(/\r?\n/, 1)[0];
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    const records = parseCsvRecords(raw, delimiter);
    if (!records.length) return [];
    const headers = records[0].map((h) => headerKey(h));
    const col = {};
    for (const field of CSV_FIELDS) {
        const idx = headers.findIndex((h) => field.aliases.includes(h) || field.aliases.some((a) => h === a || h.startsWith(`${a} `)));
        if (idx !== -1) col[field.key] = idx;
    }
    const rows = [];
    let lastN = 0;
    for (let i = 1; i < records.length; i += 1) {
        const cells = records[i];
        const get = (key) => {
            const idx = col[key];
            return idx == null ? '' : String(cells[idx] || '').trim();
        };
        const name = get('name');
        const nRaw = get('n');
        if (!name && !nRaw) continue;
        if (!name && /^ainda nao auditado$/i.test(fold(get('experience')))) continue;
        const okInN = /^ok$/i.test(nRaw);
        const verifiedCol = /^ok$/i.test(get('verified'));
        const verified = okInN || verifiedCol;
        const nParsed = Number(String(nRaw).replace(/\D+/g, ''));
        let n = Number.isFinite(nParsed) && nParsed > 0 ? nParsed : null;
        if (n == null && (okInN || name)) n = lastN + 1;
        if (n != null) lastN = Math.max(lastN, n);
        const phone = get('phone');
        const address = get('address');
        const regionLabel = get('regionLabel');
        const hoursConsult = get('hoursConsult').replace(/\\n/g, '\n');
        const hoursVaccination = get('hoursVaccination').replace(/\\n/g, '\n');
        const incoming = {
            n,
            name,
            address,
            city: get('city') || inferCity(address),
            district: get('district') || regionLabel,
            regionLabel,
            phone,
            phones: parsePhones(phone),
            email: get('email'),
            howToBook: get('howToBook'),
            howToBookVaccine: get('howToBookVaccine'),
            hoursConsult,
            hoursVaccination,
            waitConsult: get('waitConsult'),
            waitVaccine: get('waitVaccine'),
            hours: get('hours').replace(/\\n/g, '\n'),
            verified: verified ? 'OK' : '',
            experience: cleanExperience(get('experience')),
            verifiedAt: get('verifiedAt')
        };
        incoming.hours = combinedHours(incoming);
        incoming.region = inferRegion(incoming);
        rows.push(incoming);
    }
    return rows;
}

function mergeImported(existing, incoming, importedAt) {
    const byN = new Map();
    const byPhone = new Map();
    const byName = new Map();
    for (const row of existing) {
        if (row.n != null) byN.set(Number(row.n), row);
        for (const p of (row.phones || parsePhones(row.phone))) {
            if (p && !byPhone.has(p)) byPhone.set(p, row);
        }
        const nf = fold(row.name);
        if (nf && !byName.has(nf)) byName.set(nf, row);
    }

    const used = new Set();
    const merged = [];

    for (const src of incoming) {
        let prev = null;
        if (src.n != null && byN.has(src.n)) prev = byN.get(src.n);
        if (!prev) {
            for (const p of src.phones || []) {
                if (byPhone.has(p)) {
                    prev = byPhone.get(p);
                    break;
                }
            }
        }
        if (!prev && src.name && byName.has(fold(src.name))) prev = byName.get(fold(src.name));

        const verified = src.verified === 'OK';
        let verifiedAt = prev && prev.verifiedAt ? prev.verifiedAt : null;
        if (verified) {
            const parsedDate = parseLooseDate(src.verifiedAt);
            if (parsedDate) verifiedAt = parsedDate;
            else if (!verifiedAt) verifiedAt = importedAt;
        } else {
            verifiedAt = null;
        }

        const id = (prev && prev.id) || (src.n != null ? `cvi-${String(src.n).padStart(2, '0')}` : `cvi-${slugify(src.name)}`);
        const hoursConsult = src.hoursConsult || (prev && prev.hoursConsult) || '';
        const hoursVaccination = src.hoursVaccination || (prev && prev.hoursVaccination) || '';
        const row = {
            id,
            n: src.n != null ? src.n : (prev && prev.n != null ? prev.n : null),
            name: src.name || (prev && prev.name) || '',
            address: src.address || (prev && prev.address) || '',
            city: src.city || (prev && prev.city) || '',
            district: src.district || (prev && prev.district) || '',
            regionLabel: src.regionLabel || (prev && prev.regionLabel) || '',
            region: inferRegion({ ...prev, ...src }),
            phone: src.phone || (prev && prev.phone) || '',
            phones: (src.phones && src.phones.length ? src.phones : null) || (prev && prev.phones) || parsePhones(src.phone || (prev && prev.phone)),
            email: src.email || (prev && prev.email) || '',
            howToBook: src.howToBook || (prev && prev.howToBook) || '',
            howToBookVaccine: src.howToBookVaccine || (prev && prev.howToBookVaccine) || '',
            hoursConsult,
            hoursVaccination,
            waitConsult: src.waitConsult || (prev && prev.waitConsult) || '',
            waitVaccine: src.waitVaccine || (prev && prev.waitVaccine) || '',
            hours: combinedHours({
                hoursConsult,
                hoursVaccination,
                hours: src.hours || (prev && prev.hours) || ''
            }),
            hoursNote: (prev && prev.hoursNote) || '',
            featured: Boolean(prev && prev.featured),
            privateClinic: Boolean(prev && prev.privateClinic),
            verified: verified ? 'OK' : '',
            verifiedAt,
            experience: src.experience || ''
        };
        merged.push(row);
        if (prev) used.add(prev.id);
    }

    for (const row of existing) {
        if (!used.has(row.id)) merged.push(row);
    }

    merged.sort((a, b) => {
        const na = a.n == null ? 9999 : a.n;
        const nb = b.n == null ? 9999 : b.n;
        if (na !== nb) return na - nb;
        return String(a.name).localeCompare(String(b.name), 'pt');
    });
    return merged;
}

function importCsvText(text, opts) {
    const incoming = parseCsv(text);
    const importedAt = (opts && opts.importedAt) || todayIso();
    const store = loadStore();
    const existing = incoming.length >= 30 ? [] : (store.centers || []);
    const centers = mergeImported(existing, incoming, importedAt);
    const next = saveStore({
        updatedAt: importedAt,
        source: (opts && opts.source) || 'sophia-csv',
        centers
    });
    return {
        imported: incoming.length,
        total: next.centers.length,
        verified: next.centers.filter((c) => isVerified(c)).length,
        withExperience: next.centers.filter((c) => String(c.experience || '').trim()).length,
        updatedAt: next.updatedAt
    };
}

function importCsvFile(filePath, opts) {
    const text = fs.readFileSync(filePath, 'utf8');
    return importCsvText(text, { ...opts, source: path.basename(filePath) });
}

function priorityLabel(priority) {
    if (priority === 'high') return 'Atendem com facilidade';
    if (priority === 'medium') return 'Pode ser preciso insistir';
    if (priority === 'low') return 'Contacto difícil';
    return 'Sem histórico de chamada';
}

function renderRecommendPage(origin) {
    const o = String(origin || '').replace(/\/+$/, '');
    return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marcar a vacina — Lon Clinic</title>
    <meta name="description" content="Sugestão de centros de vacinação internacional após a consulta do viajante.">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <link rel="canonical" href="${escapeHtml(o)}/conta/vacina">
    <link rel="stylesheet" href="/landing.css?v=20260418k">
    <link rel="stylesheet" href="/dashboard.css?v=20260517">
    <link rel="stylesheet" href="/cvi-recommend.css?v=20260903d">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet">
    <meta name="theme-color" content="#142018">
</head>
<body class="dash-portal cvi-page">
    <a class="lon-skip" href="#conteudo-principal">Saltar para o conteúdo</a>
    <header class="lon-nav" id="lonNav">
        <div class="lon-container lon-nav-inner">
            <a href="/" class="lon-logo" aria-label="Lon Clinic homepage">
                <span class="lon-logo-name">LON Clinic</span>
            </a>
            <div class="lon-nav-actions">
                <a href="/patient-portal" class="lon-btn lon-btn-ghost lon-btn-sm">Área do paciente</a>
                <a href="/marcar/travel" class="lon-btn lon-btn-primary lon-btn-sm">Marcar consulta</a>
            </div>
        </div>
    </header>
    <main class="dash-page" id="conteudo-principal">
        <section class="dash-login" id="cviLogin">
            <div class="dash-login-card">
                <h1 class="dash-login-title">Marcar a vacina</h1>
                <p class="dash-login-desc">Esta área é só para quem já fez a consulta do viajante. Use o email e a referência da marcação.</p>
                <form class="dash-login-form" id="cviLoginForm">
                    <div id="cviLoginError" class="dash-login-error" style="display:none" role="alert"></div>
                    <div class="dash-form-group">
                        <label for="cviEmail">Email da consulta</label>
                        <input type="email" id="cviEmail" required autocomplete="email">
                    </div>
                    <div class="dash-form-group">
                        <label for="cviRef">Referência da marcação</label>
                        <input type="text" id="cviRef" required placeholder="ex. LC-A1B2C3D4" autocomplete="off">
                    </div>
                    <button type="submit" class="btn btn-primary btn-lg dash-login-btn">Ver centros sugeridos</button>
                </form>
                <p class="dash-login-note">Ainda não tem consulta? <a href="/marcar/travel">Marque a consulta do viajante</a> primeiro.</p>
            </div>
        </section>
        <section class="cvi-results" id="cviResults" hidden>
            <div class="cvi-results-head">
                <p class="cvi-kicker">Após a consulta</p>
                <h1>Centros de vacinação sugeridos</h1>
                <ol class="cvi-prazo-ol">
                    <li><strong>Agendar consulta</strong> — no site, por telefone ou WhatsApp</li>
                    <li><strong>Ter a consulta</strong> — geralmente no próprio dia ou no dia seguinte</li>
                    <li><strong>Marcação da vacina</strong> — no centro, com a prescrição</li>
                    <li><strong>Tempo de agendamento da vacina</strong> — o prazo de cada centro está no cartão</li>
                </ol>
                <p class="cvi-lead">Ordenados por proximidade e facilidade de contacto. Um centro perto e razoável passa à frente de um que atende depressa mas fica longe.</p>
                <div class="cvi-filter">
                    <label for="cviCity">A sua localização</label>
                    <div class="cvi-filter-row">
                        <input type="search" id="cviCity" placeholder="Cidade ou código postal — Porto, 4400, Faro…" autocomplete="address-level2">
                        <button type="button" class="cvi-geo-btn" id="cviGeo">Usar a minha localização</button>
                    </div>
                    <p class="cvi-origin" id="cviOrigin" hidden></p>
                </div>
            </div>
            <div id="cviList" class="cvi-list"></div>
        </section>
    </main>
    <script src="/cvi-recommend.js?v=20260903d"></script>
</body>
</html>`;
}

module.exports = {
    DATA_PATH,
    loadStore,
    saveStore,
    allCenters,
    publicCenters,
    publicView,
    recommendView,
    recommendCenters,
    recommendPayload,
    deriveExperience,
    extractIvrHint,
    parseCsv,
    importCsvText,
    importCsvFile,
    annotatePublicArticle,
    isCviPublicArticle,
    jsonLdForArticle,
    storeUpdatedAt,
    locCardHtml,
    renderRecommendPage,
    normalizePhone,
    isVerified,
    formatDatePt,
    priorityLabel
};
