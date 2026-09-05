(function () {
    'use strict';

    var PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    /* ── Multilingual consultation data ── */
    var CONSULTATION_I18N = {
        en: {
            urgente: {
                label: 'Urgent Medical Consultation (Adults)',
                duration: '20–30 min',
                bullets: [
                    'For situations that cannot wait days for an in-person appointment.',
                    'Clinical video assessment with guidance and a clear next-step plan.',
                    'Does not replace emergency services in serious emergencies.'
                ]
            },
            infeccao_urinaria: {
                label: 'Urinary Infection Consultation',
                duration: '20–30 min',
                bullets: [
                    'For symptoms suggestive of a urinary tract infection.',
                    'Clinical history and appropriate therapeutic guidance.',
                    'Video consultation in a secure and private environment.'
                ]
            },
            clinica_geral: {
                label: 'General Medicine Consultation / Check-Up (Adults)',
                duration: '25–35 min',
                bullets: [
                    'General symptom assessment or health review.',
                    'Ideal for concerns that are not a hospital emergency.',
                    'Continuity with the same doctor in follow-up consultations.'
                ]
            },
            renovacao: {
                label: 'Medical Treatment Renewal',
                duration: '15–20 min',
                bullets: [
                    'For patients with an established and stable treatment.',
                    'Brief reassessment and prescription renewal when clinically appropriate.',
                    'Subject to medical criteria and applicable legislation.'
                ]
            },
            travel: {
                label: "Traveler's Consultation",
                duration: '20 min (1 person)',
                bullets: [
                    'Health planning for your trip (vaccines, prophylaxis, advice).',
                    'First person included; additional travelers can be indicated in the next form.',
                    'Secure video call; same Lon Clinic payment flow.'
                ]
            },
            saude_mental: {
                label: 'Medical Mental Health Consultation',
                duration: '30–45 min',
                bullets: [
                    'First approach or ongoing mental health care.',
                    'Clinical assessment and guidance; referrals when necessary.',
                    'Privacy and adequate time for clinical conversation.'
                ]
            },
            burnout: {
                label: 'Specialized Burnout Consultation',
                duration: '60 min',
                bullets: [
                    'Specialized medical assessment of exhaustion, work stress and recovery.',
                    'Review of sleep, energy and body signals with a personalised plan.',
                    'Ideal as a first step or after the burnout index test.'
                ]
            },
            burnout_mensal: {
                label: 'Anti-Burnout Subscription',
                duration: '60 min · 4 sessions/month',
                bullets: [
                    '4 anti-burnout consultations per month (€54/session — 10% off single price).',
                    'Cancelable monthly subscription.',
                    'Same 60-minute clinical protocol as the single consultation.',
                    'Ideal for gradual recovery with regular follow-up.'
                ]
            },
            burnout_programa: {
                label: 'Anti-Burnout Program',
                duration: '8 sessions · 60 min',
                bullets: [
                    '8 structured anti-burnout consultations with a dedicated protocol.',
                    'Burnout Index (CBI) before and after — objective progress tracking.',
                    'Written final report: clinical assessment, CBI evolution and maintenance plan.',
                    'Lab test requisitions when clinically indicated.',
                    'Dedicated support throughout the 8-session program.'
                ]
            },
            longevidade: {
                label: 'Longevity & Preventive Health Consultation',
                duration: '45–60 min',
                bullets: [
                    'Focus on prevention, long-term risk, and a personalized plan.',
                    'Lifestyle review and screening priorities.',
                    'For those who want to invest in health before chronic diseases arise.'
                ]
            },
            nutricao_programa: {
                label: 'Initial metabolic nutrition consultation',
                duration: 'Initial visit · then 2 consults/month',
                bullets: [
                    'Start of the metabolic re-education program (115 € now, then 75 €/month).',
                    '2 nutrition consults/month, portal chat and fortnightly plan adjustments. No aGLP-1 prescription.',
                    'Minimum 3 months. Weight-loss / re-education goal is added to the booking notes.'
                ]
            },
            nutricao_completo: {
                label: 'Complete program (nutrition + psychology) — month 1',
                duration: 'Initial visit · nutrition + psychology',
                bullets: [
                    'Nutrition plus 12 psychology sessions (227 € now, then 187 €/month). Total 1,162 €.',
                    'Same habit-change program, with psychology when emotional eating leads. No aGLP-1.',
                    'Minimum 3 months.'
                ]
            },
            nutricao_completo_reforcado: {
                label: 'Complete program — higher first payment',
                duration: 'Initial visit · nutrition + psychology',
                bullets: [
                    'Higher first payment: 322 € now, then 168 €/month. Total still 1,162 €.',
                    'Same re-education and psychology plan, lighter later months. No aGLP-1 prescription.',
                    'Minimum 3 months.'
                ]
            }
        },
        es: {
            urgente: {
                label: 'Consulta Médica Urgente (Adultos)',
                duration: '20–30 min',
                bullets: [
                    'Para situaciones que no pueden esperar días para una cita presencial.',
                    'Evaluación clínica por vídeo con orientación y plan de acción.',
                    'No sustituye al servicio de urgencias en emergencias graves.'
                ]
            },
            infeccao_urinaria: {
                label: 'Consulta de Infección Urinaria',
                duration: '20–30 min',
                bullets: [
                    'Para síntomas sugestivos de infección del tracto urinario.',
                    'Historia clínica y orientación terapéutica adecuada al caso.',
                    'Consulta por vídeo en un entorno seguro y privado.'
                ]
            },
            clinica_geral: {
                label: 'Consulta de Medicina General / Chequeo (Adultos)',
                duration: '25–35 min',
                bullets: [
                    'Evaluación general de síntomas o revisión de salud.',
                    'Ideal para dudas que no son una urgencia hospitalaria.',
                    'Continuidad con el mismo médico en las consultas de seguimiento.'
                ]
            },
            renovacao: {
                label: 'Renovación de Tratamiento Médico',
                duration: '15–20 min',
                bullets: [
                    'Para pacientes con un tratamiento ya establecido y estable.',
                    'Breve reevaluación y renovación de receta cuando sea clínicamente apropiado.',
                    'Sujeto a criterio médico y legislación aplicable.'
                ]
            },
            travel: {
                label: 'Consulta del Viajero',
                duration: '20 min (1 persona)',
                bullets: [
                    'Planificación de salud para su viaje (vacunas, profilaxis, consejos).',
                    'Primera persona incluida; viajeros adicionales pueden indicarse en el siguiente formulario.',
                    'Videollamada segura; mismo flujo de pago de Lon Clinic.'
                ]
            },
            saude_mental: {
                label: 'Consulta médica de salud mental',
                duration: '30–45 min',
                bullets: [
                    'Primera aproximación o continuidad en salud mental.',
                    'Evaluación clínica y orientación; derivaciones cuando sea necesario.',
                    'Privacidad y tiempo adecuado para la conversación clínica.'
                ]
            },
            burnout: {
                label: 'Consulta especializada en burnout',
                duration: '60 min',
                bullets: [
                    'Evaluación médica especializada del agotamiento, estrés laboral y recuperación.',
                    'Revisión del sueño, energía y señales corporales con plan personalizado.',
                    'Ideal como primer paso o tras el test de burnout.'
                ]
            },
            burnout_mensal: {
                label: 'Suscripción Anti-Burnout',
                duration: '60 min · 4 consultas/mes',
                bullets: [
                    '4 consultas anti-burnout al mes (54 €/sesión — 10% menos que suelta).',
                    'Suscripción mensual cancelable en cualquier momento.',
                    'Consultas de 60 min con el mismo protocolo clínico que la suelta.',
                    'Ideal para recuperación gradual con seguimiento regular.'
                ]
            },
            burnout_programa: {
                label: 'Programa anti-burnout',
                duration: '8 sesiones · 60 min',
                bullets: [
                    '8 consultas con protocolo estructurado anti-burnout.',
                    'Índice de Burnout (CBI) antes y después — evolución objetiva.',
                    'Informe final escrito: evaluación, evolución CBI y plan de mantenimiento.',
                    'Petición de análisis cuando esté clínicamente indicado.',
                    'Acompañamiento dedicado a lo largo de las 8 sesiones.'
                ]
            },
            longevidade: {
                label: 'Consulta de Longevidad y Salud Preventiva',
                duration: '45–60 min',
                bullets: [
                    'Enfoque en prevención, riesgo a largo plazo y plan personalizado.',
                    'Revisión del estilo de vida y prioridades de cribado.',
                    'Para quienes quieren invertir en su salud antes de que aparezcan enfermedades crónicas.'
                ]
            },
            nutricao_programa: {
                label: 'Consulta inicial de nutrición metabólica',
                duration: 'Consulta inicial · luego 2 consultas/mes',
                bullets: [
                    'Inicio del programa de reeducación metabólica (115 € ahora, luego 75 €/mes).',
                    '2 consultas/mes, chat en el portal y ajustes quincenales. Sin prescripción de aGLP-1.',
                    'Fidelización mínima de 3 meses. El objetivo (pérdida de peso) va en las notas.'
                ]
            },
            nutricao_completo: {
                label: 'Programa completo (nutrición + psicología) — mes 1',
                duration: 'Consulta inicial · nutrición + psicología',
                bullets: [
                    'Nutrición y 12 sesiones de psicología (227 € ahora, luego 187 €/mes). Total 1 162 €.',
                    'El mismo programa de hábitos, con psicología si manda el hambre emocional. Sin aGLP-1.',
                    'Fidelización mínima de 3 meses.'
                ]
            },
            nutricao_completo_reforcado: {
                label: 'Programa completo — entrada reforzada',
                duration: 'Consulta inicial · nutrición + psicología',
                bullets: [
                    'Entrada reforzada: 322 € ahora y 168 €/mes. Total 1 162 €.',
                    'El mismo programa de reeducación y psicología. Sin prescripción de aGLP-1.',
                    'Fidelización mínima de 3 meses.'
                ]
            }
        }
    };
    var TYPE_TO_SLUG = {
        urgente: 'urgente',
        infeccao_urinaria: 'infeccao-urinaria',
        clinica_geral: 'clinica-geral',
        renovacao: 'renovacao',
        travel: 'travel',
        saude_mental: 'saude-mental',
        burnout: 'burnout',
        burnout_mensal: 'burnout-mensal',
        burnout_programa: 'burnout-programa',
        longevidade: 'longevidade',
        nutricao_programa: 'nutricao-programa',
        nutricao_completo: 'nutricao-completo',
        nutricao_completo_reforcado: 'nutricao-completo-reforcado'
    };
    var SLUG_TO_TYPE = {
        urgente: 'urgente',
        'infeccao-urinaria': 'infeccao_urinaria',
        infeccao_urinaria: 'infeccao_urinaria',
        'clinica-geral': 'clinica_geral',
        clinica_geral: 'clinica_geral',
        renovacao: 'renovacao',
        travel: 'travel',
        'saude-mental': 'saude_mental',
        saude_mental: 'saude_mental',
        burnout: 'burnout',
        'burnout-mensal': 'burnout_mensal',
        burnout_mensal: 'burnout_mensal',
        'burnout-programa': 'burnout_programa',
        burnout_programa: 'burnout_programa',
        longevidade: 'longevidade',
        'nutricao-programa': 'nutricao_programa',
        nutricao_programa: 'nutricao_programa',
        'nutricao-completo': 'nutricao_completo',
        nutricao_completo: 'nutricao_completo',
        'nutricao-completo-reforcado': 'nutricao_completo_reforcado',
        nutricao_completo_reforcado: 'nutricao_completo_reforcado'
    };

    var BURNOUT_FAMILY = ['burnout', 'burnout_mensal', 'burnout_programa'];
    function burnoutClinicalIntent(tipo) {
        var quiz = null;
        try { quiz = JSON.parse(sessionStorage.getItem('lonBurnoutQuiz') || 'null'); } catch (e) { quiz = null; }
        var intent = {
            category: 'burnout',
            product: tipo,
            label: tipo === 'burnout_mensal'
                ? 'Programa anti-burnout · subscrição mensal (CBI)'
                : tipo === 'burnout_programa'
                    ? 'Programa anti-burnout · 8 sessões (CBI)'
                    : 'Avaliação única anti-burnout (CBI)'
        };
        if (quiz && quiz.band) {
            intent.source = 'cbi';
            intent.cbiBand = quiz.band;
            if (quiz.global != null) intent.cbiGlobal = quiz.global;
        }
        return intent;
    }
    var BURNOUT_PLAN_CARDS = [
        {
            tipo: 'burnout',
            badge: 'Avulsa',
            title: 'Consulta especializada',
            price: '€60',
            unit: 'por sessão',
            note: '60 min · consulta médica',
            featured: false
        },
        {
            tipo: 'burnout_mensal',
            badge: 'Semanal',
            title: 'Subscrição Anti-Burnout',
            price: '€216',
            unit: '/mês',
            note: '4 consultas · 54€/sessão',
            featured: true
        },
        {
            tipo: 'burnout_programa',
            badge: 'Programa',
            title: 'Programa completo',
            price: '€490',
            unit: '8 sessões',
            note: 'CBI + relatório final escrito',
            featured: false
        }
    ];
    var NUTRICAO_FAMILY = ['nutricao_programa', 'nutricao_completo', 'nutricao_completo_reforcado'];
    var NUTRICAO_PLAN_CARDS = [
        {
            tipo: 'nutricao_programa',
            badge: 'Nutrição',
            title: 'Reeducação metabólica',
            price: '115 €',
            unit: 'mês 1',
            note: '2 consultas/mês · depois 75 €/mês',
            featured: false
        },
        {
            tipo: 'nutricao_completo',
            badge: 'Completo',
            title: 'Programa Completo',
            price: '227 €',
            unit: 'mês 1',
            note: 'Depois 187 €/mês · total 1 162 €',
            featured: true
        },
        {
            tipo: 'nutricao_completo_reforcado',
            badge: 'Entrada reforçada',
            title: 'Mensalidade leve',
            price: '322 €',
            unit: 'mês 1',
            note: 'Depois 168 €/mês · total 1 162 €',
            featured: false
        }
    ];

    var CONSULTATION_TYPES = {
        urgente: {
            label: 'Consulta Médica Urgente (Adultos)',
            price: '€35',
            cents: 3500,
            duration: '20–30 min',
            serviceKey: 'urgente',
            bullets: [
                'Para situações que não podem esperar dias por uma consulta presencial.',
                'Avaliação clínica por vídeo, com orientação e plano seguinte.',
                'Não substitui o serviço de urgência hospitalar em emergências graves.'
            ]
        },
        infeccao_urinaria: {
            label: 'Consulta de Infeção Urinária',
            price: '€35',
            cents: 3500,
            duration: '20–30 min',
            serviceKey: 'infeccao_urinaria',
            bullets: [
                'Queixas sugestivas de infeção do trato urinário.',
                'História clínica e orientação terapêutica adequada ao caso.',
                'Consulta por vídeo em ambiente seguro e privado.'
            ]
        },
            clinica_geral: {
            label: 'Consulta Clínica Geral / Check Up (Adultos)',
            price: '€39',
            cents: 3900,
            duration: '25–35 min',
            serviceKey: 'clinica_geral',
            bullets: [
                'Avaliação de sintomas gerais ou revisão de saúde.',
                'Ideal para dúvidas que não são urgência hospitalar.',
                'Continuidade com o mesmo médico nas consultas seguintes.'
            ]
        },
        renovacao: {
            label: 'Renovação de Tratamento Médico',
            price: '€19',
            cents: 1900,
            duration: '15–20 min',
            serviceKey: 'renovacao',
            bullets: [
                'Para doentes com tratamento já estabelecido e estável.',
                'Reavaliação breve e renovação de prescrição quando clinicamente adequado.',
                'Sujeita a critério médico e legislação aplicável.'
            ]
        },
        travel: {
            label: 'Consulta do Viajante',
            price: '€39',
            cents: 3900,
            duration: '20 min (1 pessoa)',
            serviceKey: 'travel',
            bullets: [
                'Planeamento de saúde para a sua viagem (vacinas, profilaxias, conselhos).',
                'Primeira pessoa incluída; viajantes adicionais podem ser indicados no formulário seguinte.',
                'Videochamada segura; mesmo fluxo de pagamento da Lon Clinic.'
            ]
        },
        saude_mental: {
            label: 'Consulta Médica de Saúde Mental',
            price: '€60',
            cents: 6000,
            duration: '30–45 min',
            serviceKey: 'saude_mental',
            bullets: [
                'Primeira abordagem ou continuidade de cuidados em saúde mental.',
                'Avaliação clínica e orientação; encaminhamento quando necessário.',
                'Privacidade e tempo adequado à conversa clínica.'
            ]
        },
        burnout: {
            label: 'Consulta Especializada em Burnout',
            price: '€60',
            cents: 6000,
            duration: '60 min',
            serviceKey: 'burnout',
            bullets: [
                'Consulta médica especializada em exaustão, stress laboral e recuperação.',
                'Revisão de sono, energia e sinais no corpo com plano personalizado.',
                'Ideal como primeiro passo ou após o teste de burnout.'
            ]
        },
        burnout_mensal: {
            label: 'Subscrição Anti-Burnout',
            price: '€216',
            priceNote: '/mês',
            cents: 21600,
            duration: '4 consultas · 60 min',
            serviceKey: 'burnout_mensal',
            bullets: [
                '4 consultas anti-burnout por mês (54€/sessão — 10% face à avulsa).',
                'Subscrição mensal cancelável a qualquer momento.',
                'Mesmo protocolo clínico de 60 minutos da consulta avulsa.',
                'Ideal para recuperação gradual com acompanhamento regular.'
            ]
        },
        burnout_programa: {
            label: 'Programa Anti-Burnout',
            price: '€490',
            cents: 49000,
            duration: '8 sessões · 60 min',
            serviceKey: 'burnout_programa',
            bullets: [
                '8 consultas com protocolo estruturado anti-burnout.',
                'Índice de Burnout (CBI) antes e depois — evolução objetiva.',
                'Relatório final escrito: avaliação, evolução CBI e plano de manutenção.',
                'Requisição de análises quando clinicamente indicado.',
                'Acompanhamento dedicado ao longo das 8 sessões.'
            ]
        },
        longevidade: {
            label: 'Consulta de Longevidade e Saúde Preventiva',
            price: '€79',
            cents: 7900,
            duration: '45–60 min',
            serviceKey: 'longevidade',
            bullets: [
                'Foco em prevenção, risco a longo prazo e plano personalizado.',
                'Revisão de estilo de vida e prioridades de rastreio.',
                'Para quem quer investir na saúde antes de surgirem doenças crónicas.'
            ]
        },
        nutricao_programa: {
            label: 'Consulta inicial de nutrição metabólica',
            price: '115 €',
            priceNote: ' · mês 1 do programa',
            cents: 11500,
            duration: 'Consulta inicial · depois 2 consultas/mês',
            serviceKey: 'nutricao_programa',
            bullets: [
                'Arranque do Programa de Reeducação Metabólica: 115 € agora e 75 €/mês nos meses seguintes (total 490 € em 6 meses).',
                '2 consultas/mês com nutricionista, chat no portal e ajustes quinzenais do plano. Sem prescrição de aGLP-1.',
                'Fidelização mínima de 3 meses. Objectivo (perda de peso / reeducação) vai nas notas da marcação.'
            ]
        },
        nutricao_completo: {
            label: 'Programa Completo (nutrição + psicologia) — mês 1',
            price: '227 €',
            priceNote: ' · mês 1 do programa',
            cents: 22700,
            duration: 'Consulta inicial · nutrição + psicologia',
            serviceKey: 'nutricao_completo',
            bullets: [
                'Nutrição mensal e 12 sessões de psicologia: 227 € agora e 187 €/mês (total 1 162 € em 6 meses).',
                'Mesma reeducação metabólica do plano Nutrição, com psicologia quando a fome emocional manda. Sem aGLP-1.',
                'Fidelização mínima de 3 meses.'
            ]
        },
        nutricao_completo_reforcado: {
            label: 'Programa Completo — entrada reforçada',
            price: '322 €',
            priceNote: ' · mês 1 do programa',
            cents: 32200,
            duration: 'Consulta inicial · nutrição + psicologia',
            serviceKey: 'nutricao_completo_reforcado',
            bullets: [
                'Entrada reforçada: 322 € agora e 168 €/mês (total 1 162 € em 6 meses).',
                'O mesmo programa de reeducação e psicologia, com mensalidades mais leves. Sem prescrição de aGLP-1.',
                'Fidelização mínima de 3 meses.'
            ]
        }
    };

    function resolveTipoFromUrl() {
        var params = new URLSearchParams(window.location.search);
        var queryTipo = params.get('tipo');
        if (queryTipo) {
            return queryTipo;
        }
        var m = window.location.pathname.match(/^\/marcar\/([^/?#]+)/);
        if (!m || !m[1]) return null;
        var slug = decodeURIComponent(m[1]).toLowerCase();
        return SLUG_TO_TYPE[slug] || null;
    }

    function getPrettyMarcarUrl(tipoKey) {
        var slug = TYPE_TO_SLUG[tipoKey] || tipoKey;
        var params = new URLSearchParams(window.location.search);
        params.delete('tipo');
        var rest = params.toString();
        return '/marcar/' + slug + (rest ? '?' + rest : '');
    }

    function applyPrettyUrlIfNeeded(tipoKey) {
        if (!window.history || typeof window.history.replaceState !== 'function') return;
        var pretty = getPrettyMarcarUrl(tipoKey);
        var current = window.location.pathname + window.location.search;
        if (current !== pretty) {
            window.history.replaceState(null, '', pretty);
        }
    }

    var tipo = resolveTipoFromUrl();
    var consulta = tipo && CONSULTATION_TYPES[tipo] ? CONSULTATION_TYPES[tipo] : null;

    if (!consulta) {
        var err = document.getElementById('marcarError');
        var main = document.getElementById('marcarMain');
        if (err) err.style.display = 'block';
        if (main) main.style.display = 'none';
        return;
    }

    var errHide = document.getElementById('marcarError');
    if (errHide) errHide.style.display = 'none';
    applyPrettyUrlIfNeeded(tipo);

    function needsConsultLangPolicy() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('langpolicy') === 'en-es-pt') return true;
        var ref = params.get('ref') || '';
        return /-(fr|de)$/i.test(ref);
    }

    function showConsultLangBanner() {
        var banner = document.getElementById('marcarLangBanner');
        if (banner) banner.hidden = !needsConsultLangPolicy();
    }
    showConsultLangBanner();

    function isBurnoutFamily(t) {
        return BURNOUT_FAMILY.indexOf(t) >= 0;
    }

    function isNutricaoFamily(t) {
        return NUTRICAO_FAMILY.indexOf(t) >= 0;
    }

    function renderPlanPicker(activeTipo, cards, kicker, heading) {
        var section = document.getElementById('marcarPlanSection');
        var grid = document.getElementById('marcarPlans');
        if (!section || !grid) return;
        section.hidden = false;
        var kickerEl = document.getElementById('marcarPlanKicker');
        var headingEl = document.getElementById('marcarPlanHeading');
        if (kickerEl && kicker) kickerEl.textContent = kicker;
        if (headingEl && heading) headingEl.textContent = heading;
        grid.innerHTML = '';
        cards.forEach(function (card) {
            var btn = document.createElement('a');
            btn.href = getPrettyMarcarUrl(card.tipo);
            btn.className = 'marcar-plan-card' + (card.tipo === activeTipo ? ' is-active' : '') + (card.featured ? ' is-featured' : '');
            btn.setAttribute('aria-current', card.tipo === activeTipo ? 'true' : 'false');
            btn.innerHTML =
                '<span class="marcar-plan-badge">' + card.badge + '</span>' +
                '<span class="marcar-plan-title">' + card.title + '</span>' +
                '<span class="marcar-plan-price">' + card.price + '<small>' + card.unit + '</small></span>' +
                '<span class="marcar-plan-note">' + card.note + '</span>';
            grid.appendChild(btn);
        });
    }

    if (isBurnoutFamily(tipo)) {
        renderPlanPicker(tipo, BURNOUT_PLAN_CARDS, 'Anti-burnout', 'Escolhe o formato');
        var burnoutLink = document.getElementById('marcarBurnoutLink');
        if (burnoutLink) burnoutLink.hidden = false;
    }

    if (isNutricaoFamily(tipo)) {
        renderPlanPicker(tipo, NUTRICAO_PLAN_CARDS, 'Reeducação metabólica', 'Escolha o plano — sem aGLP-1');
        var nutricaoLink = document.getElementById('marcarNutricaoLink');
        if (nutricaoLink) nutricaoLink.hidden = false;
        var nutricaoTrust = document.getElementById('marcarBuyTrust');
        if (nutricaoTrust) nutricaoTrust.hidden = false;
    }

    var state = {
        scheduleData: null,
        calMonth: new Date().getMonth(),
        calYear: new Date().getFullYear(),
        date: null,
        dateLabel: '',
        time: null
    };

    document.getElementById('marcarTitle').textContent = consulta.label;
    document.getElementById('marcarPrice').textContent = consulta.price + (consulta.priceNote || '');
    document.getElementById('marcarDuration').textContent = consulta.duration;

    var ul = document.getElementById('marcarBullets');
    ul.innerHTML = '';
    consulta.bullets.forEach(function (t) {
        var li = document.createElement('li');
        li.textContent = t;
        ul.appendChild(li);
    });

    // Apply i18n immediately if language is already set
    if (window.CLINIC_I18N && window.CLINIC_I18N.getLang() !== 'pt') {
        applyConsultaI18n();
    }

    function loadSchedule() {
        return fetch('/api/schedule')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { state.scheduleData = d; })
            .catch(function () { state.scheduleData = null; });
    }

    function formatDateLocal(dateObj) {
        var year = dateObj.getFullYear();
        var month = String(dateObj.getMonth() + 1).padStart(2, '0');
        var day = String(dateObj.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function isDateAvailable(dateObj) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj <= today) return false;

        var dateStr = formatDateLocal(dateObj);
        if (state.scheduleData && state.scheduleData.blockedDates && state.scheduleData.blockedDates.indexOf(dateStr) >= 0) {
            return false;
        }

        var overrides = state.scheduleData && state.scheduleData.dayOverrides;
        if (overrides && overrides.length > 0) {
            for (var i = 0; i < overrides.length; i++) {
                if (overrides[i].date === dateStr) return overrides[i].enabled;
            }
        }

        var dayOfWeek = dateObj.getDay();
        var dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        var dayName = dayNames[dayOfWeek];

        if (state.scheduleData && state.scheduleData.workingHours) {
            var daySchedule = state.scheduleData.workingHours[dayName];
            if (!daySchedule || !daySchedule.enabled) return false;
        } else {
            if (dayOfWeek === 0 || dayOfWeek === 6) return false;
        }
        return true;
    }

    var calGrid = document.getElementById('marcarCalGrid');
    var calMonthEl = document.getElementById('marcarCalMonth');

    function getMonths() {
        if (window.CLINIC_I18N) return window.CLINIC_I18N.getMonthNames();
        return PT_MONTHS;
    }

    function getString(key) {
        if (window.CLINIC_I18N) return window.CLINIC_I18N.getBookingString(key) || '';
        var defaults = {
            selectDateFirst: 'Escolha primeiro um dia no calendário',
            pickDate: 'Selecione uma data à esquerda.',
            noSlots: 'Sem horários neste dia. Escolha outra data.',
            loading: 'A carregar horários…',
            urgentContactHint: 'Precisa com urgência ou de um horário que não está listado? Contacte-nos em info@lonclinic.com ou (+351) 928 372 775.'
        };
        return defaults[key] || '';
    }

    function applyConsultaI18n() {
        if (!consulta) return;
        var lang = window.CLINIC_I18N ? window.CLINIC_I18N.getLang() : 'pt';
        var i18n = CONSULTATION_I18N[lang];
        var tipoKey = tipo;
        if (i18n && i18n[tipoKey]) {
            var data = i18n[tipoKey];
            var titleEl = document.getElementById('marcarTitle');
            if (titleEl) titleEl.textContent = data.label;
            var durationEl = document.getElementById('marcarDuration');
            if (durationEl) durationEl.textContent = data.duration;
            var ul = document.getElementById('marcarBullets');
            if (ul) {
                ul.innerHTML = '';
                data.bullets.forEach(function (t) {
                    var li = document.createElement('li');
                    li.textContent = t;
                    ul.appendChild(li);
                });
            }
        }
    }

    function getLang() {
        return window.CLINIC_I18N ? window.CLINIC_I18N.getLang() : 'pt';
    }

    function renderCalendar() {
        var year = state.calYear;
        var month = state.calMonth;
        calMonthEl.textContent = getMonths()[month] + ' ' + year;

        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var startDay = (firstDay + 6) % 7;

        calGrid.innerHTML = '';

        for (var i = 0; i < startDay; i++) {
            var empty = document.createElement('div');
            empty.className = 'marcar-cal-day marcar-cal-empty';
            calGrid.appendChild(empty);
        }

        for (var d = 1; d <= daysInMonth; d++) {
            (function (day) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'marcar-cal-day';
                btn.textContent = day;

                var dateObj = new Date(year, month, day);
                dateObj.setHours(0, 0, 0, 0);

                if (!isDateAvailable(dateObj)) {
                    btn.classList.add('marcar-cal-disabled');
                } else {
                    btn.addEventListener('click', function () {
                        selectDate(year, month, day, btn);
                    });
                }

                if (dateObj.getTime() === today.getTime()) btn.classList.add('marcar-cal-today');
                if (state.date && state.date.getTime() === dateObj.getTime()) {
                    btn.classList.add('marcar-cal-selected');
                }

                calGrid.appendChild(btn);
            })(d);
        }
    }

    var timeslotGrid = document.getElementById('marcarTimesGrid');
    var timeslotHeading = document.getElementById('marcarTimesHeading');
    var btnNext = document.getElementById('marcarContinue');
    var marcarUrgentHint = document.getElementById('marcarUrgentHint');
    var marcarUrgentHintText = getString('urgentContactHint');

    function setMarcarUrgentHint(visible) {
        if (!marcarUrgentHint) return;
        if (visible) {
            marcarUrgentHint.textContent = getString('urgentContactHint');
        }
        marcarUrgentHint.hidden = !visible;
    }

    function selectDate(year, month, day, btn) {
        state.date = new Date(year, month, day);
        var lang = getLang();
        var localeStr = lang === 'pt' ? 'pt-PT' : lang === 'es' ? 'es-ES' : 'en-GB';
        state.dateLabel = state.date.toLocaleDateString(localeStr, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        calGrid.querySelectorAll('.marcar-cal-day').forEach(function (el) {
            el.classList.remove('marcar-cal-selected');
        });
        btn.classList.add('marcar-cal-selected');

        state.time = null;
        btnNext.disabled = true;
        if (window.LonAnalytics) window.LonAnalytics.track('date_select', { surface: 'booking' });
        return renderTimeslots();
    }

    function formatQuickSlotLabel(slot) {
        var bits = String(slot.date || '').split('-').map(Number);
        if (bits.length < 3) return slot.time;
        var d = new Date(bits[0], bits[1] - 1, bits[2]);
        var lang = getLang();
        var localeStr = lang === 'pt' ? 'pt-PT' : lang === 'es' ? 'es-ES' : 'en-GB';
        return d.toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + slot.time;
    }

    function findMarcarDayButton(dateObj) {
        var day = String(dateObj.getDate());
        var found = null;
        calGrid.querySelectorAll('.marcar-cal-day').forEach(function (el) {
            if (el.textContent === day && !el.classList.contains('marcar-cal-empty') && !el.classList.contains('marcar-cal-disabled')) {
                found = el;
            }
        });
        return found;
    }

    function applyQuickSlot(slot, opts) {
        var bits = String(slot.date || '').split('-').map(Number);
        if (bits.length < 3) return Promise.resolve();
        var dateObj = new Date(bits[0], bits[1] - 1, bits[2]);
        state.calMonth = dateObj.getMonth();
        state.calYear = dateObj.getFullYear();
        renderCalendar();
        var dayBtn = findMarcarDayButton(dateObj);
        if (!dayBtn) return Promise.resolve();
        return Promise.resolve(selectDate(bits[0], bits[1] - 1, bits[2], dayBtn)).then(function () {
            if (opts && opts.selectTime === false) return;
            var want = String(slot.time).length === 4 ? '0' + slot.time : slot.time;
            timeslotGrid.querySelectorAll('.marcar-slot-btn').forEach(function (b) {
                if (b.textContent === want) b.click();
            });
            if (!(opts && opts.stayOnStep) && state.date && state.time && btnNext && !btnNext.disabled) {
                btnNext.click();
            }
        });
    }

    function loadQuickSlots() {
        var wrap = document.getElementById('marcarQuickSlots');
        return fetch('/api/next-slots?limit=6&withinHours=336')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var slots = data && data.slots ? data.slots : [];
                if (!slots.length) return;
                if (wrap) {
                    var row = wrap.querySelector('[data-quick-row]');
                    if (row) {
                        row.innerHTML = '';
                        slots.forEach(function (slot) {
                            var btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'marcar-quick-slot';
                            btn.textContent = formatQuickSlotLabel(slot);
                            btn.addEventListener('click', function () { applyQuickSlot(slot); });
                            row.appendChild(btn);
                        });
                        wrap.hidden = false;
                    }
                }
                if (!state.date && slots[0]) {
                    return applyQuickSlot(slots[0], { selectTime: false, stayOnStep: true });
                }
            })
            .catch(function () { /* calendar still works */ });
    }

    function renderTimeslots() {
        if (!state.date) {
            setMarcarUrgentHint(false);
            timeslotHeading.textContent = getString('selectDateFirst');
            timeslotGrid.innerHTML = '<p class="marcar-times-empty">' + getString('pickDate') + '</p>';
            return;
        }

        setMarcarUrgentHint(true);
        timeslotHeading.textContent = state.dateLabel;
        timeslotGrid.innerHTML = '<p class="marcar-times-empty">' + getString('loading') + '</p>';

        var dateStr = formatDateLocal(state.date);

        return fetch('/api/admin/available-slots?date=' + encodeURIComponent(dateStr))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                timeslotGrid.innerHTML = '';
                var available = (data && data.available) ? data.available.slice() : [];

                var today = new Date();
                today.setHours(0, 0, 0, 0);
                var selectedDate = new Date(state.date);
                selectedDate.setHours(0, 0, 0, 0);
                var isToday = selectedDate.getTime() === today.getTime();

                if (isToday) {
                    var ch = new Date().getHours();
                    var cm = new Date().getMinutes();
                    available = available.filter(function (slot) {
                        var parts = slot.split(':').map(Number);
                        return (parts[0] * 60 + parts[1]) > (ch * 60 + cm);
                    });
                }

                if (!available.length) {
                    timeslotGrid.innerHTML = '<p class="marcar-times-empty">' + getString('noSlots') + '</p>';
                    return;
                }

                available.forEach(function (slot) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'marcar-slot-btn';
                    b.textContent = slot;
                    b.addEventListener('click', function () {
                        state.time = slot;
                        timeslotGrid.querySelectorAll('.marcar-slot-btn').forEach(function (x) {
                            x.classList.remove('selected');
                        });
                        b.classList.add('selected');
                        btnNext.disabled = false;
                        if (window.LonAnalytics) {
                            window.LonAnalytics.track('slot_select', { surface: 'booking' });
                            window.LonAnalytics.track('time_slot_clicked', { surface: 'marcar' });
                        }
                    });
                    timeslotGrid.appendChild(b);
                });
            })
            .catch(function () {
                var slots = [];
                for (var h = 9; h < 17; h++) {
                    slots.push(String(h).padStart(2, '0') + ':00');
                    slots.push(String(h).padStart(2, '0') + ':30');
                }
                timeslotGrid.innerHTML = '';
                var today = new Date();
                today.setHours(0, 0, 0, 0);
                var selectedDate = new Date(state.date);
                selectedDate.setHours(0, 0, 0, 0);
                var isToday = selectedDate.getTime() === today.getTime();
                var ch = new Date().getHours();
                var cm = new Date().getMinutes();
                var filtered = isToday
                    ? slots.filter(function (slot) {
                        var parts = slot.split(':').map(Number);
                        return (parts[0] * 60 + parts[1]) > (ch * 60 + cm);
                    })
                    : slots;

                if (!filtered.length) {
                    timeslotGrid.innerHTML = '<p class="marcar-times-empty">' + getString('noSlots') + '</p>';
                    return;
                }

                filtered.forEach(function (slot) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'marcar-slot-btn';
                    b.textContent = slot;
                    b.addEventListener('click', function () {
                        state.time = slot;
                        timeslotGrid.querySelectorAll('.marcar-slot-btn').forEach(function (x) {
                            x.classList.remove('selected');
                        });
                        b.classList.add('selected');
                        btnNext.disabled = false;
                        if (window.LonAnalytics) {
                            window.LonAnalytics.track('slot_select', { surface: 'booking' });
                            window.LonAnalytics.track('time_slot_clicked', { surface: 'marcar' });
                        }
                    });
                    timeslotGrid.appendChild(b);
                });
            });
    }

    document.getElementById('marcarCalPrev').addEventListener('click', function () {
        state.calMonth--;
        if (state.calMonth < 0) {
            state.calMonth = 11;
            state.calYear--;
        }
        renderCalendar();
    });

    document.getElementById('marcarCalNext').addEventListener('click', function () {
        state.calMonth++;
        if (state.calMonth > 11) {
            state.calMonth = 0;
            state.calYear++;
        }
        renderCalendar();
    });

    btnNext.addEventListener('click', function () {
        if (!state.date || !state.time) return;

        var lang = getLang();
        var i18nData = CONSULTATION_I18N[lang];
        var localizedLabel = (i18nData && i18nData[tipo]) ? i18nData[tipo].label : consulta.label;
        var payload = {
            service: consulta.serviceKey,
            tipo: tipo,
            serviceLabel: localizedLabel,
            servicePrice: consulta.price,
            servicePriceCents: consulta.cents,
            dateISO: formatDateLocal(state.date),
            dateLabel: state.dateLabel,
            time: state.time,
            travellerCount: 1,
            hasInsurance: false,
            locale: lang,
            renew: new URLSearchParams(window.location.search).get('renew') || null,
            consultLangPolicy: needsConsultLangPolicy(),
            ref: new URLSearchParams(window.location.search).get('ref') || null,
            slotId: formatDateLocal(state.date).replace(/-/g, '') + '-' + String(state.time).replace(':', ''),
            clinicalIntent: BURNOUT_FAMILY.indexOf(tipo) >= 0
                ? burnoutClinicalIntent(tipo)
                : (NUTRICAO_FAMILY.indexOf(tipo) >= 0 ? {
                    category: 'weight-loss',
                    product: consulta.serviceKey,
                    goal: 'Perda de peso / reeducação metabólica',
                    concerns: 'Objectivo: perda de peso / reeducação metabólica. Consulta inicial de nutrição metabólica — programa de reeducação, sem prescrição de aGLP-1.',
                    label: 'Consulta inicial de nutrição metabólica'
                } : null)
        };
        if (payload.clinicalIntent && payload.clinicalIntent.goal) {
            payload.goal = payload.clinicalIntent.goal;
            payload.concerns = payload.clinicalIntent.concerns;
        }

        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) {
            console.error(e);
        }
        if (window.LonAnalytics) {
            window.LonAnalytics.track('checkout_start', {
                surface: 'booking',
                funnel: 'patient_booking',
                service: consulta.serviceKey,
                step: 'details'
            });
            window.LonAnalytics.flush();
        }
        var dest = '/book-consultation?slot=' + encodeURIComponent(payload.slotId) +
            '&service=' + encodeURIComponent(consulta.serviceKey) +
            '&date=' + encodeURIComponent(payload.dateISO) +
            '&time=' + encodeURIComponent(state.time);
        if (payload.consultLangPolicy) dest += '&langpolicy=en-es-pt';
        window.location.href = dest;
    });

    // Language change handler
    window.MARCAR_LANG_CHANGED = function (lang) {
        applyConsultaI18n();
        renderCalendar();
        // Re-render timeslots heading if date not selected
        if (!state.date) {
            timeslotHeading.textContent = getString('selectDateFirst');
            var emptyEl = timeslotGrid.querySelector('.marcar-times-empty');
            if (emptyEl) emptyEl.textContent = getString('pickDate');
        }
        setMarcarUrgentHint(!marcarUrgentHint.hidden);
    };

    loadSchedule().then(function () {
        renderCalendar();
        var params = new URLSearchParams(window.location.search);
        var dateQ = params.get('date');
        var timeQ = params.get('time');
        if (dateQ && /^\d{4}-\d{2}-\d{2}$/.test(dateQ)) {
            var bits = dateQ.split('-').map(Number);
            var dateObj = new Date(bits[0], bits[1] - 1, bits[2]);
            if (isDateAvailable(dateObj) || formatDateLocal(dateObj) === dateQ) {
                state.calMonth = dateObj.getMonth();
                state.calYear = dateObj.getFullYear();
                renderCalendar();
                var dayBtn = null;
                calGrid.querySelectorAll('.marcar-cal-day').forEach(function (el) {
                    if (el.textContent === String(bits[2]) && !el.classList.contains('marcar-cal-empty')) {
                        dayBtn = el;
                    }
                });
                if (dayBtn && !dayBtn.classList.contains('marcar-cal-disabled')) {
                    selectDate(bits[0], bits[1] - 1, bits[2], dayBtn);
                    if (timeQ) {
                        var want = timeQ.length === 4 ? '0' + timeQ : timeQ;
                        setTimeout(function () {
                            timeslotGrid.querySelectorAll('.marcar-slot-btn').forEach(function (b) {
                                if (b.textContent === want) b.click();
                            });
                        }, 400);
                    }
                }
            }
        }
        loadQuickSlots();
    });
})();
