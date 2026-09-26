(function () {
    'use strict';

    const FREQ = [
        { label: 'Sempre', v: 100 },
        { label: 'Frequentemente', v: 75 },
        { label: 'Às vezes', v: 50 },
        { label: 'Raramente', v: 25 },
        { label: 'Nunca ou quase nunca', v: 0 }
    ];
    const INTENS = [
        { label: 'Em muito grande medida', v: 100 },
        { label: 'Em grande medida', v: 75 },
        { label: 'Em alguma medida', v: 50 },
        { label: 'Em baixo grau', v: 25 },
        { label: 'Em muito baixo grau', v: 0 }
    ];

    const QUESTIONS = [
        { scale: 'personal', label: 'Como te sentes', type: FREQ, text: 'Com que frequência te sentes cansada?' },
        { scale: 'personal', label: 'Como te sentes', type: FREQ, text: 'Com que frequência te sentes fisicamente exausta?' },
        { scale: 'personal', label: 'Como te sentes', type: FREQ, text: 'Com que frequência te sentes emocionalmente exausta?' },
        { scale: 'personal', label: 'Como te sentes', type: FREQ, text: 'Com que frequência pensas: «Não aguento mais»?' },
        { scale: 'personal', label: 'Como te sentes', type: FREQ, text: 'Com que frequência te sentes desgastada?' },
        { scale: 'personal', label: 'Como te sentes', type: FREQ, text: 'Com que frequência te sentes frágil e mais suscetível a ficar doente?' },
        { scale: 'work', label: 'O teu trabalho', type: INTENS, text: 'O teu trabalho é emocionalmente desgastante?' },
        { scale: 'work', label: 'O teu trabalho', type: INTENS, text: 'Sentes-te esgotada por causa do teu trabalho?' },
        { scale: 'work', label: 'O teu trabalho', type: INTENS, text: 'O teu trabalho deixa-te frustrada?' },
        { scale: 'work', label: 'O teu trabalho', type: FREQ, text: 'Sentes-te exausta ao fim de um dia de trabalho?' },
        { scale: 'work', label: 'O teu trabalho', type: FREQ, text: 'De manhã, sentes-te exausta só de pensar em mais um dia de trabalho?' },
        { scale: 'work', label: 'O teu trabalho', type: FREQ, text: 'Sentes que cada hora de trabalho é cansativa para ti?' },
        { scale: 'work', label: 'O teu trabalho', type: FREQ, reversed: true, text: 'Tens energia suficiente para a família e os amigos no teu tempo livre?' },
        { scale: 'body', label: 'O corpo · secção Lon', type: FREQ, key: 'sono', text: 'Acordas cansada, mesmo depois de uma noite inteira de sono?' },
        { scale: 'body', label: 'O corpo · secção Lon', type: FREQ, key: 'tensao', text: 'Sentes tensão física — maxilar cerrado, ombros presos, dores de cabeça?' },
        { scale: 'body', label: 'O corpo · secção Lon', type: FREQ, key: 'pele', text: 'A tua pele piora — borbulhas, vermelhidão, eczema — nas fases de maior stress?' },
        { scale: 'body', label: 'O corpo · secção Lon', type: FREQ, key: 'intestino', text: 'A tua digestão desregula-se — inchaço, desconforto, intestino imprevisível — nas semanas mais exigentes?' },
        { scale: 'body', label: 'O corpo · secção Lon', type: FREQ, key: 'peso', text: 'O teu apetite ou o teu peso mudaram sem razão aparente nos últimos meses?' }
    ];

    const BANDS = [
        { max: 24, pill: 'BAIXO', title: 'Poucos sinais assinalados',
            text: 'As tuas respostas assinalam poucos sinais nas áreas avaliadas neste questionário. Isto não exclui dificuldades ou a necessidade de apoio, se algo te preocupar.',
            cta: 'Não precisas de marcar por causa deste resultado. Se quiseres um plano clínico, a avaliação única é o ponto de entrada; a subscrição é o acompanhamento regular.',
            bookLabel: 'Ver o plano de acompanhamento',
            bookNote: 'Opcional · avaliação 60 € · subscrição 216 €/mês · programa 490 €' },
        { max: 49, pill: 'LIGEIRO', title: 'Alguns sinais de desgaste',
            text: 'Algumas respostas indicam sinais de desgaste. Considera o contexto, há quanto tempo te sentes assim e o impacto na tua vida; a pontuação, por si só, não identifica um quadro clínico.',
            cta: 'Se estes sinais persistirem, o plano clínico começa na avaliação única e ganha regularidade na subscrição semanal — o resultado CBI chega à primeira sessão.',
            bookLabel: 'Começar o plano — 216 €/mês',
            bookNote: '4 consultas/mês · o resultado do teste chega à primeira sessão' },
        { max: 74, pill: 'MODERADO', title: 'Vários sinais de desgaste',
            text: 'As respostas assinalam vários sinais de desgaste nas áreas avaliadas. Isto não é um diagnóstico; se os sinais persistirem ou afetarem o teu dia a dia, conversa com um profissional de saúde.',
            cta: '',
            bookLabel: 'Agendar sessão gratuita de 15 min',
            bookNote: 'Sem cartão. Cancelamento livre.' },
        { max: 100, pill: 'ELEVADO', title: 'Muitos sinais de desgaste assinalados',
            text: 'As respostas assinalam muitos sinais nas áreas avaliadas. A pontuação não diagnostica burnout. Se estes sinais forem persistentes, estiverem a piorar ou afetarem a tua vida, procura aconselhamento de um profissional de saúde.',
            cta: 'Começa o plano de acompanhamento. Em sofrimento intenso, procura ajuda médica urgente (112 ou SNS 24).',
            bookLabel: 'Começar o plano agora — 216 €/mês',
            bookNote: '4 consultas/mês · o resultado do teste chega à primeira sessão' }
    ];

    const PLAN_MENSAL = '/marcar/burnout-mensal?ref=burnout-quiz&utm_source=quiz&utm_medium=owned&utm_campaign=burnout-teste';
    const PLAN_AVULSA = '/marcar/burnout?ref=burnout-quiz&utm_source=quiz&utm_medium=owned&utm_campaign=burnout-teste';
    const PLAN_PROGRAMA = '/marcar/burnout-programa?ref=burnout-quiz&utm_source=quiz&utm_medium=owned&utm_campaign=burnout-teste';
    const PLAN_ORIENT = '/marcar/burnout-orientacao?ref=burnout-quiz&utm_source=quiz&utm_medium=owned&utm_campaign=burnout-teste&utm_content=results-orientacao';

    const SCALE_COPY = {
        personal: {
            low: 'As tuas respostas assinalam poucos sinais de exaustão pessoal neste questionário. Esta pontuação não exclui dificuldades que possas estar a sentir.',
            mid: 'As tuas respostas indicam maior frequência de sinais de exaustão pessoal. Esta pontuação não permite determinar a causa nem fazer um diagnóstico.',
            high: 'As tuas respostas indicam frequência elevada de sinais de exaustão pessoal. Se isto te preocupa ou interfere com a tua vida, considera falar com um profissional de saúde.'
        },
        work: {
            low: 'Assinalaste poucos sinais de exaustão associados ao trabalho neste questionário. Esta pontuação não determina a causa de eventuais dificuldades.',
            mid: 'As tuas respostas indicam sinais de exaustão associados ao trabalho. A pontuação não determina a causa nem permite prever a evolução.',
            high: 'As tuas respostas indicam frequência elevada de sinais associados ao trabalho. Se possível, considera discutir o impacto e as opções de apoio com um profissional de saúde ou alguém de confiança.'
        },
        body: {
            low: 'Assinalaste poucos dos sintomas físicos incluídos nesta secção. A pontuação não determina a presença ou ausência de uma condição de saúde.',
            mid: 'Assinalaste alguns sintomas físicos. Podem ter várias causas e não permitem concluir que sejam provocados por stress.',
            high: 'Assinalaste vários sintomas físicos. Como podem ter diversas causas, procura aconselhamento clínico se forem persistentes, intensos ou preocupantes.'
        }
    };

    function scaleCopy(key, score) {
        const row = SCALE_COPY[key];
        if (!row) return '';
        if (score >= 75) return row.high;
        if (score >= 50) return row.mid;
        return row.low;
    }

    const BODY_DETAIL = {
        pele: 'Assinalaste alterações da pele; este questionário não determina a causa.',
        intestino: 'Assinalaste alterações digestivas; este questionário não determina a causa.',
        peso: 'Assinalaste alterações de apetite ou peso; este questionário não determina a causa.',
        sono: 'Assinalaste sono pouco reparador; este questionário não determina a causa.',
        tensao: 'Assinalaste tensão física; este questionário não determina a causa.'
    };

    const DIM_META = {
        personal: {
            short: 'Como te sentes',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
        },
        work: {
            short: 'O teu trabalho',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>'
        },
        body: {
            short: 'O corpo',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M6 21v-2a6 6 0 0112 0v2"/></svg>'
        }
    };

    const SEG_ORDER = ['personal', 'work', 'body'];

    const PILL_CLASS = { BAIXO: 'pill--low', LIGEIRO: 'pill--light', MODERADO: 'pill--mid', ELEVADO: 'pill--high' };

    let current = 0;
    let lastEmail = '';
    let lastScores = null;
    const answers = new Array(QUESTIONS.length).fill(null);

    const $ = function (id) { return document.getElementById(id); };
    const screens = { intro: $('intro'), quiz: $('quiz'), gate: $('gate'), results: $('results') };

    function show(name) {
        Object.keys(screens).forEach(function (k) {
            var el = screens[k];
            var active = k === name;
            el.classList.toggle('is-active', active);
            el.hidden = !active;
        });
        $('progressWrap').hidden = (name !== 'quiz');
        document.body.classList.toggle('is-results', name === 'results');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateSegments(scale) {
        var host = $('progressBarHost');
        if (!host) return;
        var idx = SEG_ORDER.indexOf(scale);
        host.querySelectorAll('.bq-seg').forEach(function (seg) {
            var key = seg.getAttribute('data-seg');
            var i = SEG_ORDER.indexOf(key);
            seg.classList.toggle('is-active', i === idx);
            seg.classList.toggle('is-done', i < idx);
        });
        host.setAttribute('aria-valuenow', String(current + 1));
    }

    function renderQuestion() {
        const q = QUESTIONS[current];
        const dim = DIM_META[q.scale] || DIM_META.personal;
        const dimIcon = $('dimIcon');
        const dimLabel = $('dimLabel');
        const dimLabelShort = $('dimLabelShort');

        dimIcon.innerHTML = dim.icon;
        dimLabel.textContent = q.label;
        if (dimLabelShort) dimLabelShort.textContent = dim.short;
        updateSegments(q.scale);

        $('questionText').textContent = q.text;
        $('stepLabel').textContent = (current + 1) + ' / ' + QUESTIONS.length;
        $('progressBar').style.width = (((current + 1) / QUESTIONS.length) * 100) + '%';
        $('backBtn').style.visibility = current === 0 ? 'hidden' : 'visible';

        const box = $('options');
        box.innerHTML = '';
        q.type.forEach(function (opt, idx) {
            const score = q.reversed ? (100 - opt.v) : opt.v;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bq-opt' + (answers[current] === score ? ' is-selected' : '');
            b.style.animationDelay = (idx * 45) + 'ms';
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', answers[current] === score ? 'true' : 'false');
            b.innerHTML = '<span class="bq-opt-num">' + (idx + 1) + '</span><span class="bq-opt-label">' + opt.label + '</span>';
            b.addEventListener('click', function () {
                answers[current] = score;
                box.querySelectorAll('.bq-opt').forEach(function (el) {
                    el.classList.remove('is-selected');
                    el.setAttribute('aria-checked', 'false');
                });
                b.classList.add('is-selected');
                b.setAttribute('aria-checked', 'true');
                setTimeout(function () {
                    if (current < QUESTIONS.length - 1) {
                        current++;
                        renderQuestion();
                    } else {
                        show('gate');
                        $('email').focus();
                    }
                }, 220);
            });
            box.appendChild(b);
        });
    }

    function mean(arr) {
        return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0;
    }

    function computeScores() {
        const by = { personal: [], work: [], body: [] };
        const bodyItems = {};
        QUESTIONS.forEach(function (q, i) {
            by[q.scale].push(answers[i] || 0);
            if (q.scale === 'body') bodyItems[q.key] = answers[i] || 0;
        });
        const personal = Math.round(mean(by.personal));
        const work = Math.round(mean(by.work));
        const body = Math.round(mean(by.body));
        const global = Math.round((personal + work) / 2);
        return { personal: personal, work: work, body: body, global: global, bodyItems: bodyItems };
    }

    function bandFor(score) {
        return BANDS.find(function (b) { return score <= b.max; });
    }

    function storeQuizForBooking(scores, band) {
        try {
            sessionStorage.setItem('lonBurnoutQuiz', JSON.stringify({
                global: scores.global,
                personal: scores.personal,
                work: scores.work,
                body: scores.body,
                band: band.pill,
                email: lastEmail,
                at: new Date().toISOString()
            }));
        } catch (e) { /* ignore */ }
    }

    function pillPretty(score) {
        const raw = bandFor(score).pill.toLowerCase();
        return score + ' (' + raw.charAt(0).toUpperCase() + raw.slice(1) + ')';
    }

    function orientHref(slot, content) {
        let href = PLAN_ORIENT.replace('utm_content=results-orientacao', 'utm_content=' + (content || 'results-orientacao'));
        if (slot && slot.date) href += '&date=' + encodeURIComponent(slot.date);
        if (slot && slot.time) href += '&time=' + encodeURIComponent(slot.time);
        return href;
    }

    function orientDayLabel(dateISO) {
        const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateISO || ''));
        if (!parts) return '';
        const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diff = Math.round((that.getTime() - today.getTime()) / 86400000);
        if (diff === 0) return 'Hoje';
        if (diff === 1) return 'Amanhã';
        return d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    function applyOrientSelection(slot) {
        const primary = $('bookBtnPrimary');
        const stickyBtn = $('stickyBookBtn');
        if (primary) primary.setAttribute('href', orientHref(slot, 'results-orientacao'));
        if (stickyBtn) stickyBtn.setAttribute('href', orientHref(slot, 'results-sticky'));
    }

    function loadOrientationSlots() {
        const host = $('orientDays');
        if (!host) return;
        host.innerHTML = '<p class="bq-orient-empty">A carregar o calendário…</p>';
        fetch('/api/bookable-days?service=burnout_orientacao', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                const dates = ((data && data.dates) ? data.dates : []).filter(function (date) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(date);
                });
                if (!dates.length) {
                    host.innerHTML = '<p class="bq-orient-empty">Não há datas disponíveis neste momento. Podes consultar outras opções de acompanhamento abaixo.</p>';
                    applyOrientSelection(null);
                    return;
                }

                const calendar = document.createElement('div');
                calendar.className = 'bq-calendar';
                const header = document.createElement('div');
                header.className = 'bq-calendar-header';
                const title = document.createElement('h4');
                title.className = 'bq-calendar-title';
                const nav = document.createElement('div');
                nav.className = 'bq-calendar-nav';
                const previous = document.createElement('button');
                previous.type = 'button';
                previous.className = 'bq-calendar-arrow';
                previous.setAttribute('aria-label', 'Ver semana anterior');
                previous.textContent = '‹';
                const next = document.createElement('button');
                next.type = 'button';
                next.className = 'bq-calendar-arrow';
                next.setAttribute('aria-label', 'Ver semana seguinte');
                next.textContent = '›';
                nav.append(previous, next);
                header.append(title, nav);
                const week = document.createElement('div');
                week.className = 'bq-calendar-week';
                week.setAttribute('role', 'group');
                week.setAttribute('aria-label', 'Escolher dia');
                const slotsPanel = document.createElement('div');
                slotsPanel.className = 'bq-calendar-slots';
                calendar.append(header, week, slotsPanel);
                host.replaceChildren(calendar);

                let pageStart = 0;
                let requestId = 0;
                let dateButtons = [];

                function dateAt(index) {
                    const parts = dates[index].split('-');
                    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12);
                }

                function updateTitle() {
                    const first = dateAt(pageStart);
                    const last = dateAt(Math.min(pageStart + 6, dates.length - 1));
                    const monthOpts = { month: 'short' };
                    const firstMonth = first.toLocaleDateString('pt-PT', monthOpts);
                    const lastMonth = last.toLocaleDateString('pt-PT', monthOpts);
                    const year = last.getFullYear();
                    title.textContent = first.getMonth() === last.getMonth()
                        ? first.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
                        : firstMonth + ' – ' + lastMonth + ' ' + year;
                    previous.disabled = pageStart === 0;
                    next.disabled = pageStart + 7 >= dates.length;
                }

                function selectDate(index) {
                    const date = dates[index];
                    dateButtons.forEach(function (button, buttonIndex) {
                        const active = pageStart + buttonIndex === index;
                        button.classList.toggle('is-selected', active);
                        button.setAttribute('aria-pressed', active ? 'true' : 'false');
                    });
                    slotsPanel.innerHTML = '<p class="bq-orient-empty">A procurar horários disponíveis…</p>';
                    applyOrientSelection(null);
                    const thisRequest = ++requestId;
                    fetch('/api/bookable-slots?service=burnout_orientacao&date=' + encodeURIComponent(date), { credentials: 'same-origin' })
                        .then(function (r) { return r.json(); })
                        .then(function (result) {
                            if (thisRequest !== requestId) return;
                            const allowed = ['20:00', '20:15', '20:30', '20:45'];
                            const times = (Array.isArray(result.available) ? result.available : [])
                                .filter(function (time) { return allowed.indexOf(time) !== -1; });
                            const label = document.createElement('p');
                            label.className = 'bq-calendar-day-heading';
                            label.textContent = dateAt(index).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
                            slotsPanel.replaceChildren(label);
                            if (!times.length) {
                                const empty = document.createElement('p');
                                empty.className = 'bq-orient-empty';
                                empty.textContent = 'Não há horários livres neste dia. Escolhe outra data.';
                                slotsPanel.appendChild(empty);
                                return;
                            }
                            const row = document.createElement('div');
                            row.className = 'bq-orient-slots bq-calendar-times';
                            times.forEach(function (time) {
                                const button = document.createElement('button');
                                button.type = 'button';
                                button.className = 'bq-orient-slot';
                                button.textContent = time;
                                button.setAttribute('aria-pressed', 'false');
                                button.addEventListener('click', function () {
                                    row.querySelectorAll('.bq-orient-slot').forEach(function (el) {
                                        el.classList.remove('is-selected');
                                        el.setAttribute('aria-pressed', 'false');
                                    });
                                    button.classList.add('is-selected');
                                    button.setAttribute('aria-pressed', 'true');
                                    applyOrientSelection({ date: date, time: time });
                                });
                                row.appendChild(button);
                            });
                            slotsPanel.appendChild(row);
                        })
                        .catch(function () {
                            if (thisRequest !== requestId) return;
                            slotsPanel.innerHTML = '<p class="bq-orient-empty">Não foi possível carregar os horários. Podes escolhê-los no passo seguinte.</p>';
                        });
                }

                function renderWeek(selectedIndex) {
                    pageStart = Math.floor(selectedIndex / 7) * 7;
                    updateTitle();
                    week.replaceChildren();
                    dateButtons = dates.slice(pageStart, pageStart + 7).map(function (date, offset) {
                        const index = pageStart + offset;
                        const day = dateAt(index);
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'bq-calendar-date';
                        button.setAttribute('aria-pressed', index === selectedIndex ? 'true' : 'false');
                        const weekday = document.createElement('span');
                        weekday.className = 'bq-calendar-weekday';
                        weekday.textContent = day.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '');
                        const dayNumber = document.createElement('strong');
                        dayNumber.textContent = String(day.getDate()).padStart(2, '0');
                        button.append(weekday, dayNumber);
                        button.classList.toggle('is-selected', index === selectedIndex);
                        button.addEventListener('click', function () { selectDate(index); });
                        week.appendChild(button);
                        return button;
                    });
                    selectDate(selectedIndex);
                }

                previous.addEventListener('click', function () { renderWeek(Math.max(0, pageStart - 7)); });
                next.addEventListener('click', function () { renderWeek(Math.min(dates.length - 1, pageStart + 7)); });
                renderWeek(0);
            })
            .catch(function () {
                host.innerHTML = '<p class="bq-orient-empty">Não foi possível carregar o calendário. Podes escolher um horário no passo seguinte.</p>';
                applyOrientSelection(null);
            });
    }

    function renderResults() {
        const s = computeScores();
        const band = bandFor(s.global);
        lastScores = s;

        $('bandPill').textContent = band.pill;
        $('bandPill').className = 'bq-pill ' + (PILL_CLASS[band.pill] || 'pill--mid');
        $('bandTitle').textContent = band.title;
        $('bandText').textContent = band.text;
        applyOrientSelection(null);
        const bookCard = $('bookBtn');
        if (bookCard) bookCard.setAttribute('href', PLAN_AVULSA + '&utm_content=results-entry');
        const subCard = $('subBtn');
        if (subCard) subCard.setAttribute('href', PLAN_MENSAL + '&utm_content=results-mensal');
        const packCard = $('packBtn');
        if (packCard) packCard.setAttribute('href', PLAN_PROGRAMA + '&utm_content=results-programa');

        $('valPersonal').textContent = pillPretty(s.personal);
        $('valWork').textContent = pillPretty(s.work);
        $('valBody').textContent = pillPretty(s.body);
        $('textPersonal').textContent = scaleCopy('personal', s.personal);
        $('textWork').textContent = scaleCopy('work', s.work);
        let bodyText = scaleCopy('body', s.body);
        const topBody = Object.entries(s.bodyItems).sort(function (a, b) { return b[1] - a[1]; })[0];
        if (topBody && topBody[1] >= 75 && BODY_DETAIL[topBody[0]]) {
            bodyText += ' ' + BODY_DETAIL[topBody[0]];
        }
        $('textBody').textContent = bodyText;

        storeQuizForBooking(s, band);
        show('results');
        loadOrientationSlots();
        const sticky = $('stickyBook');
        if (sticky) {
            sticky.hidden = false;
            sticky.classList.add('is-away');
        }
        if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
            window.LonAnalytics.track('quiz_complete', { surface: 'burnout', band: band.pill });
        }

        requestAnimationFrame(function () {
            ['barPersonal', 'barWork', 'barBody'].forEach(function (id, i) {
                const el = $(id);
                const val = [s.personal, s.work, s.body][i];
                if (el) el.style.width = val + '%';
            });
        });

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            $('scoreNum').textContent = s.global;
            return;
        }
        let t0 = null;
        function tick(ts) {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / 1100, 1);
            $('scoreNum').textContent = Math.round(s.global * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function submitQuiz(email) {
        const scores = computeScores();
        const band = bandFor(scores.global);
        return fetch('/api/burnout-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                answers: answers,
                scores: scores,
                band: band.pill
            })
        }).catch(function () { return null; });
    }

    $('startBtn').addEventListener('click', function () {
        show('quiz');
        renderQuestion();
        if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
            window.LonAnalytics.track('quiz_start', { surface: 'burnout' });
        }
    });

    $('backBtn').addEventListener('click', function () {
        if (current > 0) {
            current--;
            renderQuestion();
        }
    });

    $('revealBtn').addEventListener('click', function () {
        const email = $('email').value.trim();
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        if (!valid) {
            $('emailError').hidden = false;
            $('email').focus();
            return;
        }
        $('emailError').hidden = true;
        lastEmail = email;

        const btn = $('revealBtn');
        const prevLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'A preparar o resultado…';

        submitQuiz(email).finally(function () {
            btn.disabled = false;
            btn.textContent = prevLabel;
            renderResults();
        });
    });

    $('email').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') $('revealBtn').click();
    });

    function persistQuizThenGo() {
        if (lastScores) {
            storeQuizForBooking(lastScores, bandFor(lastScores.global));
        }
        try {
            sessionStorage.setItem('lonCheckoutDraft', JSON.stringify({
                email: lastEmail || '',
                firstName: '',
                lastName: '',
                phone: ''
            }));
        } catch (e) { /* ignore */ }
    }

    document.querySelectorAll('.js-quiz-book').forEach(function (el) {
        el.addEventListener('click', persistQuizThenGo);
    });

    var bookNow = $('bookNow');
    var sticky = $('stickyBook');
    if (bookNow && sticky && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            var visible = entries[0] && entries[0].isIntersecting;
            sticky.classList.toggle('is-away', !!visible);
        }, { threshold: 0.4 });
        io.observe(bookNow);
    }

    $('restartBtn').addEventListener('click', function () {
        current = 0;
        lastEmail = '';
        lastScores = null;
        answers.fill(null);
        $('email').value = '';
        $('emailError').hidden = true;
        const gauge = $('gaugeArc');
        if (gauge) gauge.style.strokeDashoffset = 314.16;
        $('scoreNum').textContent = '0';
        $('bandPill').className = 'bq-pill';
        ['barPersonal', 'barWork', 'barBody'].forEach(function (id) {
            const el = $(id);
            if (el) el.style.width = '0%';
        });
        show('intro');
        var stickyEl = $('stickyBook');
        if (stickyEl) stickyEl.hidden = true;
    });
})();
