(function () {
    'use strict';

    var QUESTIONS = [
        { t: 'O', s: 'Tenho uma imaginação muito ativa.', r: false },
        { t: 'O', s: 'Interesso-me por ideias abstratas e teóricas.', r: false },
        { t: 'O', s: 'Prefiro rotinas previsíveis a experiências novas.', r: true },
        { t: 'O', s: 'Aprecio arte, música ou literatura de formas pouco convencionais.', r: false },
        { t: 'C', s: 'Sou uma pessoa organizada e metódica.', r: false },
        { t: 'C', s: 'Cumpro prazos e compromissos com rigor.', r: false },
        { t: 'C', s: 'Costumo deixar tarefas por terminar.', r: true },
        { t: 'C', s: 'Penso bem antes de agir.', r: false },
        { t: 'E', s: 'Sinto-me com energia quando estou rodeado de pessoas.', r: false },
        { t: 'E', s: 'Tomo facilmente a iniciativa em conversas.', r: false },
        { t: 'E', s: 'Prefiro passar tempo sozinho a estar em grupo.', r: true },
        { t: 'E', s: 'Sinto-me confortável a ser o centro das atenções.', r: false },
        { t: 'A', s: 'Preocupo-me genuinamente com o bem-estar dos outros.', r: false },
        { t: 'A', s: 'Confio facilmente nas intenções das pessoas.', r: false },
        { t: 'A', s: 'Tenho tendência a ser crítico e desconfiado.', r: true },
        { t: 'A', s: 'Evito conflitos e procuro cooperar.', r: false },
        { t: 'N', s: 'Preocupo-me com frequência sem motivo aparente.', r: false },
        { t: 'N', s: 'Sinto-me facilmente sobrecarregado(a) pelo stress.', r: false },
        { t: 'N', s: 'Mantenho a calma mesmo sob pressão.', r: true },
        { t: 'N', s: 'O meu humor varia bastante ao longo do dia.', r: false }
    ];

    var ORDER = ['O', 'C', 'E', 'A', 'N'];

    var TRAIT_INFO = {
        O: {
            name: 'Abertura à experiência',
            desc: 'Curiosidade intelectual, imaginação e abertura a novas ideias.',
            low: 'Tende a preferir o concreto, o familiar e rotinas previsíveis.',
            mid: 'Equilíbrio entre curiosidade e preferência pelo conhecido.',
            high: 'Curiosidade intelectual marcada, imaginação e gosto por ideias novas.'
        },
        C: {
            name: 'Conscienciosidade',
            desc: 'Organização, disciplina e orientação para objetivos.',
            low: 'Mais espontâneo(a); pode deixar tarefas por concluir ou improvisar o plano.',
            mid: 'Organização e disciplina em equilíbrio com alguma flexibilidade.',
            high: 'Organização, disciplina e orientação clara para objetivos e prazos.'
        },
        E: {
            name: 'Extroversão',
            desc: 'Sociabilidade, energia e procura de estimulação social.',
            low: 'Recarrega sozinho(a); grupos longos tendem a gastar energia.',
            mid: 'Sociável em alguns contextos, com necessidade regular de recolhimento.',
            high: 'Energia social elevada: iniciativa, conversa e gosto por estímulo em grupo.'
        },
        A: {
            name: 'Amabilidade',
            desc: 'Cooperação, empatia e confiança nos outros.',
            low: 'Mais cético(a) e direto(a); prioriza o próprio critério face à harmonia.',
            mid: 'Cooperação e empatia, com espaço para desacordo quando importa.',
            high: 'Cooperação, empatia e confiança nos outros — evita conflito quando pode.'
        },
        N: {
            name: 'Neuroticismo',
            desc: 'Tendência para experienciar emoções negativas e instabilidade.',
            low: 'Estabilidade emocional: recupera com relativa facilidade sob pressão.',
            mid: 'Sente stress e variação de humor, mas recupera na maior parte das vezes.',
            high: 'Maior tendência a preocupação, sobrecarga e variação emocional.'
        }
    };

    var LABELS = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];

    var DIM_ICONS = {
        O: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
        C: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
        E: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
        A: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
        N: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v4M12 17v4M5 7l2.5 2.5M16.5 14.5L19 17M3 12h4M17 12h4M5 17l2.5-2.5M16.5 9.5L19 7"/></svg>'
    };

    var answers = new Array(QUESTIONS.length).fill(null);
    var current = 0;

    var $ = function (id) { return document.getElementById(id); };
    var screens = { intro: $('intro'), quiz: $('quiz'), results: $('results') };

    function show(name) {
        Object.keys(screens).forEach(function (k) {
            var el = screens[k];
            var active = k === name;
            el.classList.toggle('is-active', active);
            el.hidden = !active;
        });
        $('progressWrap').hidden = (name !== 'quiz');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateSegments(trait) {
        var host = $('progressBarHost');
        if (!host) return;
        var idx = ORDER.indexOf(trait);
        host.querySelectorAll('.bq-seg').forEach(function (seg) {
            var key = seg.getAttribute('data-seg');
            var i = ORDER.indexOf(key);
            seg.classList.toggle('is-active', i === idx);
            seg.classList.toggle('is-done', i < idx);
        });
        host.setAttribute('aria-valuenow', String(current + 1));
    }

    function renderQuestion() {
        var q = QUESTIONS[current];
        var info = TRAIT_INFO[q.t];

        $('dimIcon').innerHTML = DIM_ICONS[q.t] || '';
        $('dimLabel').textContent = info.name;
        $('dimLabelShort').textContent = info.name;
        updateSegments(q.t);

        $('questionText').textContent = q.s;
        $('stepLabel').textContent = (current + 1) + ' / ' + QUESTIONS.length;
        $('progressBar').style.width = ((current / QUESTIONS.length) * 100) + '%';
        $('backBtn').style.visibility = current === 0 ? 'hidden' : 'visible';
        $('nextBtn').textContent = current === QUESTIONS.length - 1 ? 'Ver resultado →' : 'Seguinte →';
        $('err').hidden = true;

        var box = $('options');
        box.innerHTML = '';
        LABELS.forEach(function (label, idx) {
            var v = idx + 1;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'bq-opt' + (answers[current] === v ? ' is-selected' : '');
            b.style.animationDelay = (idx * 45) + 'ms';
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', answers[current] === v ? 'true' : 'false');
            b.innerHTML = '<span class="bq-opt-num">' + v + '</span><span class="bq-opt-label"></span>';
            b.querySelector('.bq-opt-label').textContent = label;
            b.addEventListener('click', function () {
                answers[current] = v;
                $('err').hidden = true;
                box.querySelectorAll('.bq-opt').forEach(function (el) {
                    el.classList.remove('is-selected');
                    el.setAttribute('aria-checked', 'false');
                });
                b.classList.add('is-selected');
                b.setAttribute('aria-checked', 'true');
            });
            box.appendChild(b);
        });
    }

    function computeScores() {
        var sums = { O: 0, C: 0, E: 0, A: 0, N: 0 };
        var counts = { O: 0, C: 0, E: 0, A: 0, N: 0 };
        QUESTIONS.forEach(function (q, i) {
            var v = answers[i];
            if (q.r) v = 6 - v;
            sums[q.t] += v;
            counts[q.t]++;
        });
        var scores = {};
        ORDER.forEach(function (t) {
            var avg = sums[t] / counts[t];
            scores[t] = Math.round(((avg - 1) / 4) * 100);
        });
        return scores;
    }

    function levelLabel(pct) {
        if (pct < 40) return 'Baixo';
        if (pct <= 70) return 'Médio';
        return 'Alto';
    }

    function levelKey(pct) {
        if (pct < 40) return 'low';
        if (pct <= 70) return 'mid';
        return 'high';
    }

    function renderResults() {
        var scores = computeScores();
        var ranked = ORDER.slice().sort(function (a, b) { return scores[b] - scores[a]; });
        var highest = ranked[0];
        var lowest = ranked[ranked.length - 1];

        $('resultsLead').textContent =
            'A dimensão mais marcada é ' + TRAIT_INFO[highest].name.toLowerCase() +
            ' (' + scores[highest] + '%). A menos marcada é ' +
            TRAIT_INFO[lowest].name.toLowerCase() + ' (' + scores[lowest] + '%).';

        var host = $('traitScales');
        host.innerHTML = '';
        ORDER.forEach(function (t) {
            var info = TRAIT_INFO[t];
            var pct = scores[t];
            var key = levelKey(pct);
            var row = document.createElement('div');
            row.className = 'bq-scale';
            row.innerHTML =
                '<div class="bq-scale-head">' +
                    '<h3 class="bf-scale-head-name"></h3>' +
                    '<span><span class="bf-level bf-level--' + key + '"></span> · ' + pct + '%</span>' +
                '</div>' +
                '<div class="bq-bar"><div class="bq-bar-fill" data-bar="' + t + '"></div></div>' +
                '<p class="bq-scale-note"></p>';
            row.querySelector('h3').textContent = info.name;
            row.querySelector('.bf-level').textContent = levelLabel(pct);
            row.querySelector('.bq-scale-note').textContent = info[key] || info.desc;
            host.appendChild(row);
        });

        var box = $('insights');
        box.innerHTML = '';
        [
            { title: 'Mais marcada', t: highest },
            { title: 'Menos marcada', t: lowest }
        ].forEach(function (item, i) {
            if (highest === lowest && i === 1) return;
            var info = TRAIT_INFO[item.t];
            var div = document.createElement('div');
            div.className = 'bq-insight';
            div.style.animationDelay = (i * 80) + 'ms';
            div.innerHTML = '<h3></h3><p></p>';
            div.querySelector('h3').textContent = item.title + ' · ' + info.name;
            div.querySelector('p').textContent = info[levelKey(scores[item.t])] || info.desc;
            box.appendChild(div);
        });

        show('results');

        requestAnimationFrame(function () {
            ORDER.forEach(function (t) {
                var bar = host.querySelector('[data-bar="' + t + '"]');
                if (bar) bar.style.width = scores[t] + '%';
            });
        });
    }

    $('startBtn').addEventListener('click', function () {
        show('quiz');
        renderQuestion();
    });

    $('backBtn').addEventListener('click', function () {
        if (current > 0) {
            current--;
            renderQuestion();
        }
    });

    $('nextBtn').addEventListener('click', function () {
        if (answers[current] === null) {
            $('err').hidden = false;
            return;
        }
        if (current < QUESTIONS.length - 1) {
            current++;
            renderQuestion();
        } else {
            renderResults();
        }
    });

    $('restartBtn').addEventListener('click', function () {
        current = 0;
        answers = new Array(QUESTIONS.length).fill(null);
        $('progressBar').style.width = '0%';
        show('intro');
    });
})();
