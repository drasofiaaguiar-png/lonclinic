(function () {
    'use strict';

    var PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
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

    function renderCalendar() {
        var year = state.calYear;
        var month = state.calMonth;
        calMonthEl.textContent = PT_MONTHS[month] + ' ' + year;

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

    function selectDate(year, month, day, btn) {
        state.date = new Date(year, month, day);
        state.dateLabel = state.date.toLocaleDateString('pt-PT', {
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
            timeslotHeading.textContent = 'Escolha primeiro um dia no calendário';
            timeslotGrid.innerHTML = '<p class="marcar-times-empty">Selecione uma data à esquerda.</p>';
            return;
        }

        timeslotHeading.textContent = state.dateLabel;
        timeslotGrid.innerHTML = '<p class="marcar-times-empty">A carregar horários…</p>';

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
                    timeslotGrid.innerHTML = '<p class="marcar-times-empty">Sem horários neste dia. Escolha outra data.</p>';
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
                    timeslotGrid.innerHTML = '<p class="marcar-times-empty">Sem horários. Tente outro dia.</p>';
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

        var payload = {
            service: consulta.serviceKey,
            tipo: tipo,
            serviceLabel: consulta.label,
            servicePrice: consulta.price,
            servicePriceCents: consulta.cents,
            dateISO: formatDateLocal(state.date),
            dateLabel: state.dateLabel,
            time: state.time,
            travellerCount: 1,
            hasInsurance: false
        };

        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) {
            console.error(e);
        }
        window.location.href = '/book-consultation';
    });

    loadSchedule().then(function () {
        renderCalendar();
    });
})();
