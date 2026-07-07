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
        { max: 24, pill: 'BAIXO', title: 'Energia sob controlo',
            text: 'Os teus níveis estão dentro do esperado. O melhor momento para proteger a energia é exatamente este — antes de precisares de a recuperar.',
            cta: 'Prevenir é mais fácil do que tratar. Uma consulta de avaliação ajuda a manter o que está a funcionar — e a corrigir cedo o que ainda é pequeno.' },
        { max: 49, pill: 'LIGEIRO', title: 'Sinais de alerta iniciais',
            text: 'Ainda não é burnout instalado, mas há dimensões da tua energia a pedir atenção. Nesta fase, mudanças relativamente simples têm um efeito enorme.',
            cta: 'Uma consulta agora vale por dez mais tarde: avaliamos as tuas dimensões críticas e sais com um plano concreto de sono, energia e limites.' },
        { max: 74, pill: 'MODERADO', title: 'O teu corpo já está a pagar a conta',
            text: 'O teu resultado sugere um nível de esgotamento significativo, que provavelmente já sentes no corpo, no sono e na cabeça. Não se resolve com um fim de semana — mas resolve-se.',
            cta: 'Este é o momento de falar com uma médica. Na consulta de burnout avaliamos o quadro completo — energia, sono, corpo — e construímos um plano de recuperação realista.' },
        { max: 100, pill: 'ELEVADO', title: 'É altura de parar e pedir apoio',
            text: 'O teu resultado indica sinais sérios de esgotamento. Não estás a exagerar e não é fraqueza — é um estado fisiológico real que merece acompanhamento profissional, e quanto mais cedo, melhor a recuperação.',
            cta: 'Recomendamos vivamente uma avaliação com um profissional de saúde. Podes marcar uma consulta connosco — e se estiveres em sofrimento intenso, procura apoio médico o quanto antes.' }
    ];

    const SCALE_INSIGHTS = {
        personal: { title: 'Exaustão pessoal',
            text: 'A tua exaustão geral está elevada. Cansaço que não melhora com descanso é o sinal central do burnout — e o primeiro a merecer atenção médica, porque raramente se resolve apenas com força de vontade.' },
        work: { title: 'Exaustão ligada ao trabalho',
            text: 'O teu esgotamento está fortemente ligado ao trabalho: é aí que a intervenção rende mais — carga, limites, recuperação entre dias. É também o padrão mais reversível quando é apanhado a tempo.' },
        body: { title: 'O corpo a falar',
            text: 'O teu corpo já está a traduzir o stress. Pele, intestino, apetite e tensão respondem todos ao mesmo eixo do cortisol — quando o esgotamento aparece no corpo, deixou de ser «só cansaço»: é fisiologia.' }
    };

    const BODY_DETAIL = {
        pele: 'Nota clínica: a tua pele parece ser o órgão que mais reage ao teu stress — é um padrão real (o eixo cérebro–pele) e tratável.',
        intestino: 'Nota clínica: o teu intestino parece ser o órgão que mais reage ao teu stress — o eixo intestino–cérebro é dos mecanismos mais estudados do stress crónico.',
        peso: 'Nota clínica: alterações de apetite e peso sob stress crónico têm explicação hormonal (cortisol) — não é falta de disciplina.',
        sono: 'Nota clínica: sono que não repara mantém o cortisol elevado e alimenta o ciclo do esgotamento — costuma ser o primeiro alvo do tratamento.',
        tensao: 'Nota clínica: tensão muscular persistente é das formas mais comuns de o corpo armazenar stress — e das que melhor respondem a intervenção.'
    };

    const BOOKING_URL = '/marcar/burnout?ref=burnout-quiz';

    const DIM_META = {
        personal: {
            short: 'Como te sentes',
            cls: 'dim-badge--personal',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
        },
        work: {
            short: 'O teu trabalho',
            cls: 'dim-badge--work',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>'
        },
        body: {
            short: 'O corpo',
            cls: 'dim-badge--body',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v1a4 4 0 01-8 0V6a4 4 0 014-4z"/><path d="M6 21v-2a6 6 0 0112 0v2"/></svg>'
        }
    };

    const PILL_CLASS = { BAIXO: 'pill--low', LIGEIRO: 'pill--light', MODERADO: 'pill--mid', ELEVADO: 'pill--high' };

    let current = 0;
    let lastEmail = '';
    let lastScores = null;
    const answers = new Array(QUESTIONS.length).fill(null);

    const $ = function (id) { return document.getElementById(id); };
    const screens = { intro: $('intro'), quiz: $('quiz'), gate: $('gate'), results: $('results') };

    function show(name) {
        Object.keys(screens).forEach(function (k) { screens[k].classList.remove('active'); });
        void screens[name].offsetWidth;
        screens[name].classList.add('active');
        $('progressWrap').hidden = (name !== 'quiz');
        window.scrollTo({ top: 0 });
    }

    function renderQuestion() {
        const q = QUESTIONS[current];
        const dim = DIM_META[q.scale] || DIM_META.personal;
        const badge = $('dimBadge');
        const dimIcon = $('dimIcon');
        const dimLabel = $('dimLabel');
        const dimLabelShort = $('dimLabelShort');

        badge.hidden = false;
        badge.className = 'dim-badge ' + dim.cls;
        dimIcon.innerHTML = dim.icon;
        dimLabel.textContent = q.label;
        if (dimLabelShort) dimLabelShort.textContent = dim.short;

        $('questionText').textContent = q.text;
        $('stepLabel').textContent = (current + 1) + ' / ' + QUESTIONS.length;
        $('progressBar').style.width = (((current + 1) / QUESTIONS.length) * 100) + '%';
        $('backBtn').style.visibility = current === 0 ? 'hidden' : 'visible';

        const box = $('options');
        box.innerHTML = '';
        q.type.forEach(function (opt, idx) {
            const score = q.reversed ? (100 - opt.v) : opt.v;
            const b = document.createElement('button');
            b.className = 'opt' + (answers[current] === score ? ' selected' : '');
            b.style.animationDelay = (idx * 45) + 'ms';
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', answers[current] === score ? 'true' : 'false');
            b.innerHTML = '<span class="opt-num">' + (idx + 1) + '</span><span class="opt-label">' + opt.label + '</span>';
            b.addEventListener('click', function () {
                answers[current] = score;
                box.querySelectorAll('.opt').forEach(function (el) { el.classList.remove('selected'); });
                b.classList.add('selected');
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

    function renderResults() {
        const s = computeScores();
        const band = bandFor(s.global);
        lastScores = s;

        $('bandPill').textContent = band.pill;
        $('bandPill').className = 'pill ' + (PILL_CLASS[band.pill] || 'pill--mid');
        $('bandTitle').textContent = band.title;
        $('bandText').textContent = band.text;
        $('ctaText').textContent = band.cta;

        $('valPersonal').textContent = s.personal + ' · ' + bandFor(s.personal).pill.toLowerCase();
        $('valWork').textContent = s.work + ' · ' + bandFor(s.work).pill.toLowerCase();
        $('valBody').textContent = s.body + ' · ' + bandFor(s.body).pill.toLowerCase();

        const box = $('insights');
        box.innerHTML = '';
        const ranked = [['personal', s.personal], ['work', s.work], ['body', s.body]]
            .filter(function (pair) { return pair[1] >= 50; })
            .sort(function (a, b) { return b[1] - a[1]; })
            .slice(0, 2);
        ranked.forEach(function (pair, i) {
            const k = pair[0];
            const ins = SCALE_INSIGHTS[k];
            let extra = '';
            if (k === 'body') {
                const top = Object.entries(s.bodyItems).sort(function (a, b) { return b[1] - a[1]; })[0];
                if (top && top[1] >= 75) extra = '<p style="margin-top:8px">' + BODY_DETAIL[top[0]] + '</p>';
            }
            const div = document.createElement('div');
            div.className = 'insight';
            div.style.animationDelay = (i * 80) + 'ms';
            div.innerHTML = '<h3>' + ins.title + '</h3><p>' + ins.text + '</p>' + extra;
            box.appendChild(div);
        });

        storeQuizForBooking(s, band);
        show('results');

        const ARC = 314.16;
        requestAnimationFrame(function () {
            $('gaugeArc').style.strokeDashoffset = ARC * (1 - s.global / 100);
            $('barPersonal').style.width = s.personal + '%';
            $('barWork').style.width = s.work + '%';
            $('barBody').style.width = s.body + '%';
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
            $('emailError').style.display = 'block';
            $('email').focus();
            return;
        }
        $('emailError').style.display = 'none';
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

    $('bookBtn').addEventListener('click', function () {
        if (lastScores) {
            storeQuizForBooking(lastScores, bandFor(lastScores.global));
        }
    });

    $('restartBtn').addEventListener('click', function () {
        current = 0;
        lastEmail = '';
        lastScores = null;
        answers.fill(null);
        $('email').value = '';
        $('gaugeArc').style.strokeDashoffset = 314.16;
        $('scoreNum').textContent = '0';
        $('bandPill').className = 'pill';
        ['barPersonal', 'barWork', 'barBody'].forEach(function (id) { $(id).style.width = '0%'; });
        show('intro');
    });
})();
