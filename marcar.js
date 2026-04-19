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
                label: 'Adult Mental Health Consultation',
                duration: '30–45 min',
                bullets: [
                    'First approach or ongoing mental health care.',
                    'Clinical assessment and guidance; referrals when necessary.',
                    'Privacy and adequate time for clinical conversation.'
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
                label: 'Consulta de Salud Mental Adultos',
                duration: '30–45 min',
                bullets: [
                    'Primera aproximación o continuidad en salud mental.',
                    'Evaluación clínica y orientación; derivaciones cuando sea necesario.',
                    'Privacidad y tiempo adecuado para la conversación clínica.'
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
        longevidade: 'longevidade'
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
        longevidade: 'longevidade'
    };

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
            price: '€35',
            cents: 3500,
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
            label: 'Consulta de Saúde Mental Adultos',
            price: '€49',
            cents: 4900,
            duration: '30–45 min',
            serviceKey: 'saude_mental',
            bullets: [
                'Primeira abordagem ou continuidade de cuidados em saúde mental.',
                'Avaliação clínica e orientação; encaminhamento quando necessário.',
                'Privacidade e tempo adequado à conversa clínica.'
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

    var state = {
        scheduleData: null,
        calMonth: new Date().getMonth(),
        calYear: new Date().getFullYear(),
        date: null,
        dateLabel: '',
        time: null
    };

    document.getElementById('marcarTitle').textContent = consulta.label;
    document.getElementById('marcarPrice').textContent = consulta.price;
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
        renderTimeslots();
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

        fetch('/api/admin/available-slots?date=' + encodeURIComponent(dateStr))
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
            locale: lang
        };

        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) {
            console.error(e);
        }
        window.location.href = '/book-consultation';
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
    });
})();
