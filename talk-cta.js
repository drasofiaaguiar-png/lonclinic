/**
 * Talk-first CTAs for content pages (blog, queixas, condition spokes).
 * Booking execution pages (/marcar/*) keep “Marcar”.
 *
 * Works in Node (require) and in the browser (window.LonTalkCta).
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.LonTalkCta = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const LABELS = {
        pt: {
            doctor: 'Fale com um médico',
            doctorNow: 'Fale com um médico agora',
            psych: 'Fale com um psicólogo',
            psychFind: 'Encontre o seu psicólogo',
            nutrition: 'Fale com um nutricionista',
            nutritionFind: 'Encontre o seu nutricionista'
        },
        en: {
            doctor: 'Talk to a doctor',
            doctorNow: 'Talk to a doctor now',
            psych: 'Talk to a psychologist',
            psychFind: 'Find your psychologist',
            nutrition: 'Talk to a nutritionist',
            nutritionFind: 'Find your nutritionist'
        },
        es: {
            doctor: 'Hable con un médico',
            doctorNow: 'Hable con un médico ahora',
            psych: 'Hable con un psicólogo',
            psychFind: 'Encuentre a su psicólogo',
            nutrition: 'Hable con un nutricionista',
            nutritionFind: 'Encuentre a su nutricionista'
        },
        fr: {
            doctor: 'Parlez à un médecin',
            doctorNow: 'Parlez à un médecin maintenant',
            psych: 'Parlez à un psychologue',
            psychFind: 'Trouvez votre psychologue',
            nutrition: 'Parlez à un nutritionniste',
            nutritionFind: 'Trouvez votre nutritionniste'
        },
        de: {
            doctor: 'Sprechen Sie mit einem Arzt',
            doctorNow: 'Sprechen Sie jetzt mit einem Arzt',
            psych: 'Sprechen Sie mit einem Psychologen',
            psychFind: 'Finden Sie Ihren Psychologen',
            nutrition: 'Sprechen Sie mit einem Ernährungsberater',
            nutritionFind: 'Finden Sie Ihren Ernährungsberater'
        }
    };

    const GENERIC_BOOK = /^(marcar( consulta( do viajante| online| de viagem| de psicologia| médica(?: online)?)?)?|marcar\s*[-–—]\s*\d+\s*€|book(?: consultation)?(?:\s*[-–—]\s*\d+\s*€)?|reservar consulta(?: de viaje)?|prendre rendez-vous|termin buchen|marcar consulta do viajante)$/i;

    function normLang(lang) {
        const l = String(lang || 'pt').toLowerCase().slice(0, 2);
        return LABELS[l] ? l : 'pt';
    }

    function hay({ kind, slug, path } = {}) {
        return [kind, slug, path].map((v) => String(v || '').toLowerCase()).join(' ');
    }

    function isGenericBookLabel(label) {
        const t = String(label || '')
            .trim()
            .replace(/[→⬅️]/g, '')
            .replace(/\s+/g, ' ')
            .toLowerCase();
        if (!t) return true;
        return GENERIC_BOOK.test(t) || /^marcar consulta/.test(t) || /^marcar —/.test(t) || /^marcar –/.test(t);
    }

    function roleFromContext(opts) {
        const o = opts || {};
        const s = hay(o);
        if (/como-encontrar-um-psicologo/.test(s)) return 'psychFind';
        if (/terapia-de-casal/.test(s)) return 'psych';
        if (/como-encontrar-um-nutricionista/.test(s)) return 'nutritionFind';
        if (/vacina-febre-amarela|consulta-do-viajante-urgente|vou-viajar-esta-semana/.test(s)) {
            return 'doctorNow';
        }
        if (/infecao-urinaria|infe[cç]ao urin[aá]ria|cistite/.test(s)) return 'doctorNow';

        const kind = String(o.kind || '').toLowerCase();
        if (kind === 'mental' || kind === 'neurodiversidade' || kind === 'psicologia') return 'psych';
        if (kind === 'nutrition' || kind === 'nutricao-programa' || kind === 'nutricao_programa') {
            return 'nutrition';
        }
        if (o.acute) return 'doctorNow';
        return 'doctor';
    }

    function label(role, lang, existingLabel) {
        if (existingLabel && !isGenericBookLabel(existingLabel)) return String(existingLabel);
        const pack = LABELS[normLang(lang)] || LABELS.pt;
        return pack[role] || pack.doctor;
    }

    function refQuery(slug, fallback) {
        const raw = String(slug || fallback || '').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '');
        return raw ? `ref=${encodeURIComponent(raw)}` : '';
    }

    function href(role, opts) {
        const o = opts || {};
        if (o.bookingHref) return String(o.bookingHref);
        const kind = String(o.kind || '').toLowerCase();
        const slug = String(o.slug || '');
        const q = refQuery(slug, o.ref);
        const withRef = (base) => (q ? `${base}${base.includes('?') ? '&' : '?'}${q}` : base);

        if (role === 'psychFind') return withRef('/marcar/psicologia-mensal');
        if (role === 'psych') {
            if (/terapia-de-casal/.test(hay(o))) return withRef('/marcar/terapia-casal');
            return withRef('/marcar/psicologia-mensal');
        }
        if (role === 'nutritionFind') return '/nutricao/avaliacao';
        if (role === 'nutrition') {
            if (kind === 'nutricao-programa' || kind === 'nutricao_programa') {
                return withRef('/marcar/nutricao-programa');
            }
            return withRef('/marcar/clinica-geral');
        }
        if (kind === 'travel' || /vacina|viajante|travel/.test(slug)) return withRef('/marcar/travel');
        if (kind === 'burnout') return withRef('/marcar/burnout-mensal');
        if (kind === 'longevity') return withRef('/marcar/longevidade');
        return withRef('/marcar/clinica-geral');
    }

    function resolve(opts) {
        const o = opts || {};
        const role = o.role || roleFromContext(o);
        return {
            role,
            label: label(role, o.lang, o.existingLabel),
            href: href(role, o)
        };
    }

    function shouldTalk(path, bodyClass) {
        const p = String(path || '').toLowerCase();
        if (!p || p === '/') return false;
        if (/\/marcar(\/|$)|book\.html|patient-portal|clinic-portal|\/profissional|\/admin/.test(p)) return false;
        if (/\/(travel-clinic|saudemental|psicologia)(\/|$)/.test(p)) return false;
        if (/\/nutricao\/programa(\/|$)/.test(p)) return false;
        if (p === '/consulta' || p === '/consulta/') return false;
        const cls = String(bodyClass || '');
        if (/\b(qx-body|cq-body|mag-body|guide-body|bo-body|nu-body)\b/.test(cls)) return true;
        if (/^\/(blog|magazine)(\/|$)/.test(p)) return true;
        if (/^\/consulta\//.test(p)) return true;
        if (/^\/nutricao\//.test(p)) return true;
        if (/^\/burnout\//.test(p)) return true;
        if (/^\/consultas(\/|$)/.test(p)) return true;
        return false;
    }

    function kindFromPath(path) {
        const p = String(path || '').toLowerCase();
        if (/como-encontrar-um-psicologo|\/(consultas|triagem)|ansiedade|depress|psicolog|terapia|autoconhecimento|talvez-devesses|adhd|autismo/.test(p)
            && !/\/consulta\//.test(p)) {
            return 'mental';
        }
        if (/como-encontrar-um-nutricionista|\/nutricao|perda-de-peso|fodmap|glp-1|dieta/.test(p)) {
            return 'nutrition';
        }
        if (/vacina|viajante|travel/.test(p)) return 'travel';
        if (/\/burnout/.test(p)) return 'burnout';
        return 'clinic';
    }

    function resolveFromPath(path, lang, bodyClass) {
        const p = String(path || '');
        const slug = (p.split('/').filter(Boolean).pop() || '').split('?')[0];
        return resolve({
            kind: kindFromPath(p),
            slug,
            path: p,
            lang
        });
    }

    return {
        LABELS,
        isGenericBookLabel,
        roleFromContext,
        label,
        href,
        resolve,
        shouldTalk,
        kindFromPath,
        resolveFromPath
    };
}));
