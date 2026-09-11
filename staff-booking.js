'use strict';

/** Patient-facing psychology specialties → staff profile clinical areas. */
const PSYCHOLOGY_SPECIALTIES = [
    {
        id: 'ansiedade',
        label: {
            pt: 'Ansiedade / pânico',
            en: 'Anxiety / panic',
            es: 'Ansiedad / pánico'
        },
        areas: [
            'Ansiedade',
            'Perturbação de pânico / fobias',
            'Perturbação obsessivo-compulsiva (POC)'
        ]
    },
    {
        id: 'depressao',
        label: {
            pt: 'Depressão',
            en: 'Depression',
            es: 'Depresión'
        },
        areas: ['Depressão', 'Depressão pós-parto']
    },
    {
        id: 'burnout',
        label: {
            pt: 'Burnout',
            en: 'Burnout',
            es: 'Burnout'
        },
        areas: ['Burnout']
    },
    {
        id: 'casal',
        label: {
            pt: 'Terapia de casal',
            en: 'Couples therapy',
            es: 'Terapia de pareja'
        },
        areas: ['Relacionamentos']
    },
    {
        id: 'relacionamentos',
        label: {
            pt: 'Relacionamentos e família',
            en: 'Relationships and family',
            es: 'Relaciones y familia'
        },
        areas: [
            'Relacionamentos',
            'Questões familiares',
            'LGBT',
            'Sexologia / disfunções sexuais',
            'Coaching parental'
        ]
    },
    {
        id: 'trauma',
        label: {
            pt: 'Trauma / luto',
            en: 'Trauma / grief',
            es: 'Trauma / duelo'
        },
        areas: ['Trauma', 'Luto (geral)', 'Luto perinatal (perda gestacional)']
    },
    {
        id: 'neuro',
        label: {
            pt: 'PHDA / autismo / neurodiversidade',
            en: 'ADHD / autism / neurodiversity',
            es: 'TDAH / autismo / neurodiversidad'
        },
        areas: [
            'Neurodesenvolvimento no adulto (autismo, PHDA, etc.) — avaliação/testes',
            'Neurodesenvolvimento no adulto (autismo, PHDA, etc.) — acompanhamento'
        ]
    },
    {
        id: 'alimentacao',
        label: {
            pt: 'Alimentação e imagem corporal',
            en: 'Eating and body image',
            es: 'Alimentación e imagen corporal'
        },
        areas: ['Distúrbio alimentar (incluindo excesso de peso)']
    },
    {
        id: 'outro',
        label: {
            pt: 'Outro / ainda não sei',
            en: 'Other / not sure yet',
            es: 'Otro / aún no sé'
        },
        areas: null
    }
];

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PROFESSION_CONSULT_HINT = {
    medico: 'Clínica geral, viajante, renovação, saúde mental médica, longevidade e urgente',
    psicologo: 'Psicologia e burnout',
    nutricionista: 'Nutrição'
};

function normalizeServiceKey(service) {
    return String(service || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

function isCoupleTherapyService(service) {
    const key = normalizeServiceKey(service);
    return key === 'terapia_casal' || key === 'terapia_casal_mensal';
}

function isIndividualPsychologyService(service) {
    const key = normalizeServiceKey(service);
    return key === 'psicologia' || key === 'psicologia_mensal';
}

function isPsychologyStaffService(service) {
    const key = normalizeServiceKey(service);
    return isIndividualPsychologyService(key) || isCoupleTherapyService(key);
}

/**
 * Couples therapy is only offered by named psychologists (default: Dra. Carolina Rocha).
 * Override with COUPLES_THERAPY_PSYCHOLOGISTS="Nome Um, Nome Dois" (matched on full name or username).
 */
const DEFAULT_COUPLES_THERAPISTS = ['Carolina Rocha'];

function normalizePersonName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(dra?|doutora?|psicolog[ao])\.?\s+/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function coupleTherapistNames() {
    const raw = process.env.COUPLES_THERAPY_PSYCHOLOGISTS;
    const list = raw && String(raw).trim()
        ? String(raw).split(/[,;]/)
        : DEFAULT_COUPLES_THERAPISTS;
    return list.map(normalizePersonName).filter(Boolean);
}

function isCoupleTherapist(person) {
    if (!person) return false;
    const allowed = coupleTherapistNames();
    if (!allowed.length) return true;
    const candidates = [
        person.fullName,
        person.displayName,
        person.name,
        person.username
    ].map(normalizePersonName).filter(Boolean);
    return allowed.some((want) => candidates.some((have) => have === want || have.indexOf(want) >= 0));
}

function serviceProfession(service) {
    const key = normalizeServiceKey(service);
    if (isIndividualPsychologyService(key) || isCoupleTherapyService(key) || key === 'burnout' || key.startsWith('burnout_')) return 'psicologo';
    if (key.startsWith('nutricao')) return 'nutricionista';
    if (
        key === 'clinica_geral'
        || key === 'travel'
        || key === 'renovacao'
        || key === 'saude_mental'
        || key === 'longevidade'
        || key === 'longevity'
        || key === 'urgente'
        || key === 'infeccao_urinaria'
        || key === 'infecao_urinaria'
        || key === 'followup'
    ) return 'medico';
    return null;
}

function usesStaffCalendars(service) {
    return !!serviceProfession(service);
}

function requiresProfessionalChoice(service) {
    return isPsychologyStaffService(service);
}

function specialtyForService(service, specialty) {
    if (isCoupleTherapyService(service)) return 'relacionamentos';
    return String(specialty || '').trim().toLowerCase();
}

function emptyWeeklyHours() {
    const out = {};
    for (const day of WEEKDAY_KEYS) {
        out[day] = { enabled: false, start: '09:00', end: '17:00' };
    }
    return out;
}

function normalizeWeeklyHours(input) {
    const src = input && typeof input === 'object' ? input : {};
    const out = emptyWeeklyHours();
    for (const day of WEEKDAY_KEYS) {
        const row = src[day] && typeof src[day] === 'object' ? src[day] : {};
        let start = String(row.start || '09:00').slice(0, 5);
        let end = String(row.end || '17:00').slice(0, 5);
        if (!/^\d{2}:\d{2}$/.test(start)) start = '09:00';
        if (!/^\d{2}:\d{2}$/.test(end)) end = '17:00';
        out[day] = {
            enabled: !!row.enabled,
            start,
            end
        };
    }
    return out;
}

function weekdayKeyFromIso(dateIso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
    if (!m) return '';
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dt.getUTCDay()] || '';
}

function hasOpenDayRows(days) {
    return (Array.isArray(days) ? days : []).some((item) => item && item.date && item.enabled !== false);
}

/**
 * Open hour blocks for one date. A date may hold several rows (e.g. 10–12 and
 * 15–17). Any row on that date replaces the weekly template for that day.
 * Once a person has published dated rows, dates without a row stay closed —
 * leftover weekly hours must not invent slots the psychologist did not add.
 * A closed row (enabled === false) with no open rows closes the day.
 */
function hourRangesForDate(weekly, days, dateIso) {
    const allDays = Array.isArray(days) ? days : [];
    const rows = allDays.filter((item) => item && item.date === dateIso);
    if (rows.length) {
        return mergeHourRanges(rows.filter((item) => item.enabled !== false));
    }
    if (hasOpenDayRows(allDays)) return [];
    const key = weekdayKeyFromIso(dateIso);
    const wh = weekly && weekly[key];
    if (!wh || !wh.enabled) return [];
    return mergeHourRanges([{ start: wh.start, end: wh.end }]);
}

/** Legacy single-window view: envelope of all open blocks on that date. */
function hoursForDate(weekly, days, dateIso) {
    const ranges = hourRangesForDate(weekly, days, dateIso);
    if (!ranges.length) return null;
    return { start: ranges[0].start, end: ranges[ranges.length - 1].end };
}

function weeklyHasEnabled(weekly) {
    const src = weekly || {};
    return WEEKDAY_KEYS.some((day) => src[day] && src[day].enabled);
}

function hasBookableHours(weekly, days) {
    if (hasOpenDayRows(days)) {
        return (Array.isArray(days) ? days : []).some((item) => item && item.enabled !== false && item.date);
    }
    return weeklyHasEnabled(weekly);
}

function psychologySpecialty(id) {
    const key = String(id || '').trim().toLowerCase();
    return PSYCHOLOGY_SPECIALTIES.find((item) => item.id === key) || null;
}

function publicPsychologySpecialties(lang) {
    const loc = lang === 'en' || lang === 'es' ? lang : 'pt';
    return PSYCHOLOGY_SPECIALTIES.map((item) => ({
        id: item.id,
        label: item.label[loc] || item.label.pt
    }));
}

const AREA_MATCH_ALIASES = {
    'Stress / burnout': 'Burnout',
    'Luto': 'Luto (geral)',
    'Parentalidade': 'Coaching parental',
    'Perturbações alimentares': 'Distúrbio alimentar (incluindo excesso de peso)',
    'Relações interpessoais': 'Relacionamentos',
    'Relações de casal': 'Relacionamentos',
    'Psicologia da saúde': 'Ajustamento a doença crónica',
    'Perturbações do desenvolvimento': 'Neurodesenvolvimento no adulto (autismo, PHDA, etc.) — acompanhamento',
    'Desenvolvimento pessoal': 'Transições de vida / questões existenciais e de identidade',
    'Auto-estima': 'Autoestima',
    'Gestao emocional': 'Gestão emocional'
};

function canonicalClinicalArea(value) {
    const name = String(value || '').trim();
    return AREA_MATCH_ALIASES[name] || name;
}

function asAreaList(value) {
    if (Array.isArray(value)) return value;
    const s = String(value || '').trim();
    return s ? [s] : [];
}

/** Primary and secondary clinical areas on a staff profile, with legacy aliases folded. */
function profileClinicalAreas(profile) {
    const raw = [
        ...asAreaList(profile && (profile.primaryAreas != null ? profile.primaryAreas : profile.primaryArea)),
        ...asAreaList(profile && (profile.secondaryAreas != null ? profile.secondaryAreas : profile.secondaryArea))
    ];
    const have = new Set();
    for (const item of raw) {
        const name = canonicalClinicalArea(item);
        if (name) have.add(name);
    }
    return have;
}

/** Comma-separated specialty ids → known specialty entries (unknown ids dropped). */
function psychologySpecialtyList(specialtyId) {
    return String(specialtyId || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .map(psychologySpecialty)
        .filter(Boolean);
}

/**
 * `specialtyId` may hold several ids ("ansiedade,burnout"). The profile matches when
 * at least one chosen area sits in primary or secondary clinical areas.
 * No specialty yet (homepage slots) or "outro" → any psychologist with hours.
 * Unknown specialty ids do not match everyone.
 */
function profileMatchesSpecialty(profile, specialtyId) {
    if (!profile || profile.profession !== 'psicologo') return false;
    const ids = String(specialtyId || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    if (!ids.length) return true;
    const specs = psychologySpecialtyList(specialtyId);
    if (!specs.length) return false;
    if (specs.some((spec) => !spec.areas)) return true;
    const have = profileClinicalAreas(profile);
    if (!have.size) return false;
    return specs.some((spec) => spec.areas.some((area) => have.has(canonicalClinicalArea(area))));
}

function openHours(row) {
    if (!row || row.enabled === false) return null;
    const start = String(row.start || '').slice(0, 5);
    const end = String(row.end || '').slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
    return { start, end };
}

function timeToMinutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

/** Overlap of two { start, end } windows. Null if either is closed or they do not overlap. */
function intersectHours(a, b) {
    const left = openHours(a);
    const right = openHours(b);
    if (!left || !right) return null;
    const from = Math.max(timeToMinutes(left.start), timeToMinutes(right.start));
    const to = Math.min(timeToMinutes(left.end), timeToMinutes(right.end));
    if (from == null || to == null || to <= from) return null;
    return { start: minutesToTime(from), end: minutesToTime(to) };
}

function mergeHourRanges(ranges) {
    const open = (Array.isArray(ranges) ? ranges : [])
        .map((row) => openHours(row))
        .filter(Boolean)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    const merged = [];
    for (const row of open) {
        const last = merged[merged.length - 1];
        if (!last || timeToMinutes(row.start) > timeToMinutes(last.end)) {
            merged.push({ start: row.start, end: row.end });
        } else if (timeToMinutes(row.end) > timeToMinutes(last.end)) {
            last.end = row.end;
        }
    }
    return merged;
}

/** Staff hours that sit inside the clinic window, merged into contiguous ranges. */
function unionOfferedHours(staffRows, platformRow) {
    return mergeHourRanges(
        (Array.isArray(staffRows) ? staffRows : []).map((row) => intersectHours(row, platformRow))
    );
}

function platformHoursForDate(platform, dateIso) {
    const blocked = new Set((platform && platform.blockedDates) || []);
    if (!dateIso || blocked.has(dateIso)) return null;
    const ov = ((platform && platform.dayOverrides) || []).find((item) => item && item.date === dateIso);
    if (ov) return openHours(ov);
    const key = weekdayKeyFromIso(dateIso);
    const weekly = (platform && platform.weekly) || {};
    return openHours(weekly[key]);
}

function crossDayHours(staffRow, platformRow) {
    const staff = openHours(staffRow);
    const platform = openHours(platformRow);
    const bookable = intersectHours(staff, platform);
    return {
        staff,
        platform,
        bookable,
        outside: !!staff && !bookable,
        clipped: !!(bookable && staff && (bookable.start !== staff.start || bookable.end !== staff.end))
    };
}

function hasCrossedBookableHours(weekly, days, platform) {
    const openDays = (Array.isArray(days) ? days : []).filter(
        (item) => item && item.enabled !== false && item.date
    );
    if (openDays.length) {
        return openDays.some((item) =>
            intersectHours({ start: item.start, end: item.end }, platformHoursForDate(platform, item.date))
        );
    }
    const staffWeekly = normalizeWeeklyHours(weekly);
    const platformWeekly = normalizeWeeklyHours(platform && platform.weekly);
    for (const day of WEEKDAY_KEYS) {
        if (intersectHours(
            staffWeekly[day] && staffWeekly[day].enabled ? staffWeekly[day] : null,
            platformWeekly[day] && platformWeekly[day].enabled ? platformWeekly[day] : null
        )) {
            return true;
        }
    }
    return false;
}

function hasHoursOutsidePlatform(weekly, days, platform) {
    const staffWeekly = normalizeWeeklyHours(weekly);
    const platformWeekly = normalizeWeeklyHours(platform && platform.weekly);
    for (const day of WEEKDAY_KEYS) {
        const staff = staffWeekly[day] && staffWeekly[day].enabled ? staffWeekly[day] : null;
        if (!staff) continue;
        if (!intersectHours(staff, platformWeekly[day] && platformWeekly[day].enabled ? platformWeekly[day] : null)) {
            return true;
        }
    }
    for (const item of Array.isArray(days) ? days : []) {
        if (!item || item.enabled === false || !item.date) continue;
        if (!intersectHours({ start: item.start, end: item.end }, platformHoursForDate(platform, item.date))) {
            return true;
        }
    }
    return false;
}

function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timesFromHours(start, end, stepMinutes) {
    const step = Number(stepMinutes) || 30;
    const from = timeToMinutes(start);
    const to = timeToMinutes(end);
    if (from == null || to == null || to <= from) return [];
    const out = [];
    for (let t = from; t < to; t += step) {
        out.push(minutesToTime(t));
    }
    return out;
}

/** Start times that fit inside the given ranges (no booking/hold filtering). */
function bookableStartsFromRanges(ranges, opts) {
    const step = Number(opts && opts.step) || 30;
    const duration = Number(opts && opts.duration) || step;
    const hourly = !!(opts && opts.hourly);
    const gridSet = new Set();
    for (const range of Array.isArray(ranges) ? ranges : []) {
        if (!range) continue;
        for (const t of timesFromHours(range.start, range.end, step)) gridSet.add(t);
    }
    const grid = Array.from(gridSet).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    return grid.filter((start) => {
        if (hourly) {
            const mins = timeToMinutes(start);
            if (mins == null || mins % 60 !== 0) return false;
        }
        return startFitsDuration(grid, start, duration, step);
    });
}

function occupiedTimesFromStart(startHhmm, durationMinutes, stepMinutes) {
    const step = Number(stepMinutes) || 30;
    const dur = Math.max(step, Number(durationMinutes) || step);
    const start = timeToMinutes(startHhmm);
    if (start == null) return [];
    const out = [];
    for (let t = start; t < start + dur; t += step) {
        out.push(minutesToTime(t));
    }
    return out;
}

function startFitsDuration(allTimes, startHhmm, durationMinutes, stepMinutes) {
    const need = occupiedTimesFromStart(startHhmm, durationMinutes, stepMinutes);
    if (!need.length) return false;
    const set = new Set(allTimes);
    return need.every((t) => set.has(t));
}

module.exports = {
    PSYCHOLOGY_SPECIALTIES,
    WEEKDAY_KEYS,
    PROFESSION_CONSULT_HINT,
    serviceProfession,
    usesStaffCalendars,
    isCoupleTherapyService,
    isIndividualPsychologyService,
    isPsychologyStaffService,
    isCoupleTherapist,
    requiresProfessionalChoice,
    specialtyForService,
    emptyWeeklyHours,
    normalizeWeeklyHours,
    weekdayKeyFromIso,
    hoursForDate,
    hourRangesForDate,
    intersectHours,
    mergeHourRanges,
    unionOfferedHours,
    platformHoursForDate,
    crossDayHours,
    hasCrossedBookableHours,
    hasHoursOutsidePlatform,
    weeklyHasEnabled,
    hasBookableHours,
    psychologySpecialty,
    publicPsychologySpecialties,
    profileClinicalAreas,
    profileMatchesSpecialty,
    timeToMinutes,
    minutesToTime,
    timesFromHours,
    bookableStartsFromRanges,
    occupiedTimesFromStart,
    startFitsDuration
};
