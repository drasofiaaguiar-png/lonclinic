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

function serviceProfession(service) {
    const key = normalizeServiceKey(service);
    if (key === 'psicologia' || key === 'burnout' || key.startsWith('burnout_')) return 'psicologo';
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
    return serviceProfession(service) === 'psicologo' && normalizeServiceKey(service) === 'psicologia';
}

function specialtyForService(service, specialty) {
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

function hoursForDate(weekly, days, dateIso) {
    const override = (Array.isArray(days) ? days : []).find((item) => item && item.date === dateIso);
    if (override) {
        if (override.enabled === false) return null;
        return { start: override.start, end: override.end };
    }
    const key = weekdayKeyFromIso(dateIso);
    const wh = weekly && weekly[key];
    if (!wh || !wh.enabled) return null;
    return { start: wh.start, end: wh.end };
}

function weeklyHasEnabled(weekly) {
    const src = weekly || {};
    return WEEKDAY_KEYS.some((day) => src[day] && src[day].enabled);
}

function hasBookableHours(weekly, days) {
    if (weeklyHasEnabled(weekly)) return true;
    return (Array.isArray(days) ? days : []).some((item) => item && item.enabled !== false && item.date);
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

function profileMatchesSpecialty(profile, specialtyId) {
    if (!profile || profile.profession !== 'psicologo') return false;
    const spec = psychologySpecialty(specialtyId);
    if (!spec || !spec.areas) return true;
    const have = new Set([
        ...((profile.primaryAreas || profile.primaryArea) || []),
        ...((profile.secondaryAreas || profile.secondaryArea) || [])
    ].map((item) => String(item || '').trim()).filter(Boolean));
    return spec.areas.some((area) => have.has(area));
}

function timeToMinutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
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
    requiresProfessionalChoice,
    specialtyForService,
    emptyWeeklyHours,
    normalizeWeeklyHours,
    weekdayKeyFromIso,
    hoursForDate,
    weeklyHasEnabled,
    hasBookableHours,
    psychologySpecialty,
    publicPsychologySpecialties,
    profileMatchesSpecialty,
    timeToMinutes,
    minutesToTime,
    timesFromHours,
    occupiedTimesFromStart,
    startFitsDuration
};
