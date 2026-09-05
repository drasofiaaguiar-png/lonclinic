(function () {
    'use strict';

    var cfg = window.CLINICAL_QUIZ;
    if (!cfg || !cfg.questions || !window.ClinicalQuizScore) return;

    var QUESTIONS = cfg.questions;
    var PILL_CLASS = {
        BAIXO: 'pill--low',
        MÍNIMO: 'pill--low',
        MINIMO: 'pill--low',
        BOM: 'pill--low',
        ELEVADO: 'pill--low',
        'SEM INSÓNIA': 'pill--low',
        'SEM INDICADORES': 'pill--low',
        NORMAL: 'pill--low',
        'BAIXO PESO': 'pill--light',
        'EXCESSO DE PESO': 'pill--mid',
        'OBESIDADE I': 'pill--high',
        'OBESIDADE II': 'pill--high',
        'OBESIDADE III': 'pill--high',
        LIGEIRO: 'pill--light',
        SUBCLÍNICO: 'pill--light',
        LIMITE: 'pill--light',
        MODERADO: 'pill--mid',
        'MODERADO-GRAVE': 'pill--high',
        GRAVE: 'pill--high',
        'MUITO BAIXO': 'pill--high'
    };

    var current = 0;
    var lastEmail = '';
    var lastName = '';
    var lastPhone = '';
    var lastScores = null;
    var answers = new Array(QUESTIONS.length).fill(null);
    var holdTimer = null;
    var isNutrition = cfg.cluster === 'nutrition' || cfg.scoring === 'imc';

    var $ = function (id) { return document.getElementById(id); };
    var screens = { intro: $('intro'), quiz: $('quiz'), gate: $('gate'), processing: $('processing'), results: $('results') };
    var SEG_ORDER = (cfg.scales || []).map(function (s) { return s.id; });

    function show(name) {
        Object.keys(screens).forEach(function (k) {
            var el = screens[k];
            if (!el) return;
            var active = k === name;
            el.classList.toggle('is-active', active);
            el.hidden = !active;
        });
        if ($('progressWrap')) $('progressWrap').hidden = (name !== 'quiz' && name !== 'gate');
        if (name === 'gate' && $('stepLabel')) {
            $('stepLabel').textContent = 'Último passo — email e WhatsApp';
            if ($('progressBar')) $('progressBar').style.width = '100%';
            if ($('dimLabelShort')) $('dimLabelShort').textContent = 'Captura';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function scaleMeta(scaleId) {
        for (var i = 0; i < (cfg.scales || []).length; i++) {
            if (cfg.scales[i].id === scaleId) return cfg.scales[i];
        }
        return { id: scaleId, title: cfg.instrument, short: cfg.instrument, icon: '' };
    }

    function updateSegments(scale) {
        var host = $('progressBarHost');
        if (!host) return;
        var idx = SEG_ORDER.indexOf(scale);
        host.querySelectorAll('.bq-seg').forEach(function (seg) {
            var key = seg.getAttribute('data-seg');
            var i = SEG_ORDER.indexOf(key);
            seg.classList.toggle('is-active', i === idx);
            seg.classList.toggle('is-done', idx >= 0 && i < idx);
        });
        host.setAttribute('aria-valuenow', String(current + 1));
    }

    function renderQuestion() {
        var q = QUESTIONS[current];
        var dim = scaleMeta(q.scale);
        if ($('dimIcon')) $('dimIcon').innerHTML = dim.icon || '';
        if ($('dimLabel')) $('dimLabel').textContent = q.label || dim.title;
        if ($('dimLabelShort')) $('dimLabelShort').textContent = dim.short || dim.title;
        updateSegments(q.scale);

        var stem = $('stemText');
        if (stem) {
            stem.textContent = cfg.stem || '';
            stem.hidden = !cfg.stem;
        }
        $('questionText').textContent = q.text;
        var total = QUESTIONS.length;
        var pct = Math.round(((current + 1) / total) * 100);
        $('stepLabel').textContent = 'Passo ' + (current + 1) + ' de ' + total + ' — ' + pct + '% concluído';
        $('progressBar').style.width = pct + '%';
        $('backBtn').style.visibility = current === 0 ? 'hidden' : 'visible';

        var box = $('options');
        box.innerHTML = '';

        if (q.input === 'number') {
            renderNumberQuestion(q, box);
            return;
        }

        (q.options || []).forEach(function (opt, idx) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'bq-opt' + (answers[current] === opt.v ? ' is-selected' : '');
            b.style.animationDelay = (idx * 45) + 'ms';
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', answers[current] === opt.v ? 'true' : 'false');
            b.innerHTML = '<span class="bq-opt-num">' + (idx + 1) + '</span><span class="bq-opt-label"></span>';
            b.querySelector('.bq-opt-label').textContent = opt.label;
            b.addEventListener('click', function () {
                answers[current] = opt.v;
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

    function parseNumInput(raw) {
        var t = String(raw || '').trim().replace(',', '.');
        if (!t) return NaN;
        return Number(t);
    }

    function goNext() {
        if (current < QUESTIONS.length - 1) {
            current++;
            renderQuestion();
        } else {
            show('gate');
            $('email').focus();
        }
    }

    function renderNumberQuestion(q, box) {
        var wrap = document.createElement('div');
        wrap.className = 'bq-num';
        if (q.hint) {
            var hint = document.createElement('p');
            hint.className = 'bq-hint';
            hint.textContent = q.hint;
            wrap.appendChild(hint);
        }
        var row = document.createElement('div');
        row.className = 'bq-num-row';
        var input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.className = 'bq-num-input';
        input.setAttribute('aria-label', q.text);
        if (q.placeholder) input.placeholder = q.placeholder;
        if (answers[current] != null && answers[current] !== 0) {
            input.value = String(answers[current]).replace('.', ',');
        }
        var unit = document.createElement('span');
        unit.className = 'bq-num-unit';
        unit.textContent = q.unit || '';
        row.appendChild(input);
        row.appendChild(unit);
        wrap.appendChild(row);
        var err = document.createElement('p');
        err.className = 'bq-error';
        err.hidden = true;
        wrap.appendChild(err);
        var actions = document.createElement('div');
        actions.className = 'bq-num-actions';
        var cont = document.createElement('button');
        cont.type = 'button';
        cont.className = 'bq-btn bq-btn-primary';
        cont.textContent = 'Continuar';
        function submitNum(skip) {
            err.hidden = true;
            if (skip) {
                answers[current] = 0;
                goNext();
                return;
            }
            var v = parseNumInput(input.value);
            var invalid = null;
            if (q.id === 'height') {
                var m = v > 3 ? v / 100 : v;
                if (!Number.isFinite(m) || m < 1.2 || m > 2.3) invalid = 'Escreve a altura em cm (ex.: 165) ou em metros (1,65).';
            } else if (!Number.isFinite(v) || (q.min != null && v < q.min) || (q.max != null && v > q.max)) {
                invalid = 'Escreve um valor válido' + (q.unit ? ' em ' + q.unit : '') + '.';
            }
            if (invalid) {
                err.textContent = invalid;
                err.hidden = false;
                input.focus();
                return;
            }
            answers[current] = v;
            goNext();
        }
        cont.addEventListener('click', function () { submitNum(false); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitNum(false);
            }
        });
        actions.appendChild(cont);
        if (q.optional) {
            var skip = document.createElement('button');
            skip.type = 'button';
            skip.className = 'bq-back';
            skip.textContent = q.skipLabel || 'Saltar';
            skip.addEventListener('click', function () { submitNum(true); });
            actions.appendChild(skip);
        }
        wrap.appendChild(actions);
        box.appendChild(wrap);
        setTimeout(function () { input.focus(); }, 50);
    }

    function storeQuizForBooking(scored) {
        try {
            sessionStorage.setItem('lonClinicalQuiz', JSON.stringify({
                quizId: cfg.id,
                instrument: cfg.instrument,
                display: scored.display,
                displayMax: scored.displayMax,
                band: scored.band && scored.band.pill,
                extra: scored.extra || null,
                crisis: scored.crisis,
                email: lastEmail,
                name: lastName,
                phone: lastPhone,
                at: new Date().toISOString()
            }));
        } catch (e) { /* ignore */ }
    }

    function concernPillClass(band) {
        if (!band) return 'pill--mid';
        var byConcern = { low: 'pill--low', light: 'pill--light', mid: 'pill--mid', high: 'pill--high' };
        return byConcern[band.concern] || PILL_CLASS[band.pill] || 'pill--mid';
    }

    function renderResults() {
        var scored = window.ClinicalQuizScore.scoreQuiz(cfg, answers);
        if (!scored) return;
        lastScores = scored;
        var band = scored.band || {};

        var crisisEl = $('crisisBanner');
        if (crisisEl) crisisEl.hidden = !scored.crisis;

        $('bandPill').textContent = band.pill || '';
        $('bandPill').className = 'bq-pill ' + concernPillClass(band);
        $('bandTitle').textContent = band.title || '';
        $('bandText').textContent = band.text || '';
        $('ctaText').textContent = band.cta || '';
        if ($('bookBtnPrimary')) $('bookBtnPrimary').textContent = band.bookLabel || $('bookBtnPrimary').textContent;
        if ($('bookNowNote')) $('bookNowNote').textContent = band.bookNote || '';

        var subBtn = $('subBtn');
        if (subBtn && cfg.booking && Array.isArray(cfg.booking.hideSubOn)) {
            subBtn.hidden = cfg.booking.hideSubOn.indexOf(band.pill) !== -1;
        }
        if (cfg.scoring === 'imc' && band.pill && /NORMAL|BAIXO PESO/.test(band.pill) && $('bookBtnPrimary')) {
            $('bookBtnPrimary').setAttribute('href', '/marcar/clinica-geral?ref=imc-quiz');
            if ($('stickyBookBtn')) $('stickyBookBtn').setAttribute('href', '/marcar/clinica-geral?ref=imc-quiz');
        }

        var scalesBox = $('scales');
        scalesBox.innerHTML = '';
        (cfg.scales || []).forEach(function (s) {
            var val = scored.scales[s.id] ? scored.scales[s.id].value : 0;
            var wrap = document.createElement('div');
            wrap.className = 'bq-scale';
            wrap.innerHTML = '<div class="bq-scale-head"><h3></h3><span></span></div><div class="bq-bar"><div class="bq-bar-fill"></div></div><p class="bq-scale-note"></p>';
            wrap.querySelector('h3').textContent = s.title;
            var lab = scored.scales[s.id] && scored.scales[s.id].label;
            wrap.querySelector('span').textContent = lab || (val + '%');
            wrap.querySelector('.bq-scale-note').textContent = s.note || '';
            wrap.querySelector('.bq-bar-fill').id = 'bar-' + s.id;
            wrap.querySelector('.bq-bar-fill').style.width = '0%';
            scalesBox.appendChild(wrap);
        });

        var box = $('insights');
        box.innerHTML = '';
        var ranked = (cfg.scales || []).map(function (s) {
            return [s.id, scored.scales[s.id] ? scored.scales[s.id].value : 0];
        }).filter(function (pair) {
            return cfg.higherIsBetter ? pair[1] <= 55 : pair[1] >= 50;
        }).sort(function (a, b) {
            return cfg.higherIsBetter ? a[1] - b[1] : b[1] - a[1];
        }).slice(0, 2);
        if (cfg.scoring === 'imc') {
            ranked = [['imc', 100], ['waist', 100]];
        }
        ranked.forEach(function (pair, i) {
            var ins = cfg.insights[pair[0]];
            if (!ins) return;
            var div = document.createElement('div');
            div.className = 'bq-insight';
            div.style.animationDelay = (i * 80) + 'ms';
            div.innerHTML = '<h3></h3><p></p>';
            div.querySelector('h3').textContent = ins.title;
            var body = ins.text;
            if (cfg.scoring === 'imc' && pair[0] === 'imc' && scored.extra) {
                if (scored.extra.kgToLose > 0) {
                    body = 'Para um IMC 24,9 (limite superior do peso normal), o alvo é cerca de ' +
                        String(scored.extra.healthyMax).replace('.', ',') +
                        ' kg. Faltam cerca de ' +
                        String(scored.extra.kgToLose).replace('.', ',') +
                        ' kg. A faixa considerada normal para a tua altura: ' +
                        String(scored.extra.healthyMin).replace('.', ',') +
                        '–' +
                        String(scored.extra.healthyMax).replace('.', ',') +
                        ' kg.';
                } else if (scored.extra.kgToGain > 0) {
                    body = 'Para um IMC 18,5, o alvo é cerca de ' +
                        String(scored.extra.healthyMin).replace('.', ',') +
                        ' kg — cerca de ' +
                        String(scored.extra.kgToGain).replace('.', ',') +
                        ' kg a ganhar. A faixa normal: ' +
                        String(scored.extra.healthyMin).replace('.', ',') +
                        '–' +
                        String(scored.extra.healthyMax).replace('.', ',') +
                        ' kg.';
                } else {
                    body = 'Já estás na faixa de peso considerada normal (' +
                        String(scored.extra.healthyMin).replace('.', ',') +
                        '–' +
                        String(scored.extra.healthyMax).replace('.', ',') +
                        ' kg). O IMC não pede perda de peso. A cintura e a composição corporal ainda podem.';
                }
            }
            div.querySelector('p').textContent = body;
            box.appendChild(div);
        });

        var rel = $('related');
        if (rel && cfg.related && cfg.related.length) {
            rel.innerHTML = '<p class="bq-related-label">Outros testes</p>';
            cfg.related.forEach(function (r) {
                var a = document.createElement('a');
                a.href = r.href;
                a.className = 'bq-related-link';
                a.innerHTML = '<strong></strong><span></span>';
                a.querySelector('strong').textContent = r.title;
                a.querySelector('span').textContent = r.meta;
                rel.appendChild(a);
            });
        }

        storeQuizForBooking(scored);
        if (isNutrition && $('quizTrust')) {
            $('quizTrust').innerHTML = '🔒 Fidelização 3 meses no programa · sem cláusulas abusivas<br>🩺 1.ª consulta médica agendada logo após o pagamento';
        }
        show('results');
        startHoldTimer();
        var sticky = $('stickyBook');
        if (sticky) {
            sticky.hidden = false;
            sticky.classList.add('is-away');
        }
        if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
            window.LonAnalytics.track('quiz_complete', { surface: cfg.id, band: band.pill });
        }

        var ARC = 314.16;
        requestAnimationFrame(function () {
            $('gaugeArc').style.strokeDashoffset = ARC * (1 - scored.gaugePct / 100);
            (cfg.scales || []).forEach(function (s) {
                var el = document.getElementById('bar-' + s.id);
                if (el && scored.scales[s.id]) el.style.width = scored.scales[s.id].value + '%';
            });
        });

        var shown = scored.display;
        var decimals = scored.extra && scored.extra.decimals ? scored.extra.decimals : 0;
        function formatShown(n) {
            if (decimals) return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
            return String(Math.round(n));
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            $('scoreNum').textContent = formatShown(shown);
            return;
        }
        var t0 = null;
        function tick(ts) {
            if (!t0) t0 = ts;
            var p = Math.min((ts - t0) / 1100, 1);
            var eased = shown * (1 - Math.pow(1 - p, 3));
            $('scoreNum').textContent = formatShown(eased);
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function submitQuiz(email, extras) {
        return fetch('/api/clinical-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quizId: cfg.id,
                email: email,
                name: extras && extras.name || '',
                phone: extras && extras.phone || '',
                answers: answers
            })
        }).catch(function () { return null; });
    }

    function normalizePhone(raw) {
        var d = String(raw || '').replace(/\D/g, '');
        if (d.indexOf('351') === 0) d = d.slice(3);
        if (d.length === 9 && d.charAt(0) === '9') return '+351' + d;
        return '';
    }

    function startHoldTimer() {
        var box = $('quizHold');
        var clock = $('quizHoldClock');
        var label = $('quizHoldLabel');
        if (!box || !clock) return;
        box.hidden = false;
        var key = 'lon_quiz_hold_' + (cfg.id || 'x');
        var until = 0;
        try {
            until = parseInt(sessionStorage.getItem(key) || '0', 10) || 0;
        } catch (e) { until = 0; }
        if (!until || until < Date.now()) until = Date.now() + 15 * 60 * 1000;
        try { sessionStorage.setItem(key, String(until)); } catch (e2) { /* ignore */ }
        if (holdTimer) clearInterval(holdTimer);
        function tick() {
            var left = Math.max(0, until - Date.now());
            var m = Math.floor(left / 60000);
            var s = Math.floor((left % 60000) / 1000);
            clock.textContent = m + ':' + (s < 10 ? '0' : '') + s;
            if (left <= 0) {
                clearInterval(holdTimer);
                clock.textContent = '0:00';
            }
        }
        tick();
        holdTimer = setInterval(tick, 1000);
        fetch('/api/next-slots?limit=1&withinHours=72').then(function (r) { return r.json(); }).then(function (data) {
            var slot = data && data.slots && data.slots[0];
            if (!slot || !label) return;
            var when = slot.date + ' · ' + slot.time;
            label.textContent = 'Próxima vaga: ' + when;
            var btn = $('bookBtnPrimary');
            if (btn && slot.date && slot.time) {
                var href = btn.getAttribute('href') || '/marcar/clinica-geral';
                var join = href.indexOf('?') >= 0 ? '&' : '?';
                if (href.indexOf('date=') < 0) btn.setAttribute('href', href + join + 'date=' + encodeURIComponent(slot.date) + '&time=' + encodeURIComponent(slot.time));
            }
        }).catch(function () {});
    }

    function runProcessingThen(done) {
        var title = $('processingTitle');
        var text = $('processingText');
        if (title) {
            title.textContent = isNutrition
                ? 'A analisar o seu perfil com base nos parâmetros metabólicos…'
                : 'A analisar o seu perfil com base nas suas respostas…';
        }
        if (text) {
            text.textContent = isNutrition
                ? 'IMC, cintura e faixa clínica — a preparar o próximo passo médico.'
                : 'A cruzar as respostas com os intervalos clínicos deste questionário.';
        }
        show('processing');
        var wait = 3800;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) wait = 400;
        setTimeout(done, wait);
    }

    $('startBtn').addEventListener('click', function () {
        show('quiz');
        renderQuestion();
        if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
            window.LonAnalytics.track('quiz_start', { surface: cfg.id });
        }
    });

    $('backBtn').addEventListener('click', function () {
        if (current > 0) {
            current--;
            renderQuestion();
        }
    });

    $('revealBtn').addEventListener('click', function () {
        var email = $('email').value.trim();
        var name = $('leadName') ? $('leadName').value.trim() : '';
        var phoneRaw = $('leadPhone') ? $('leadPhone').value.trim() : '';
        var phone = normalizePhone(phoneRaw);
        var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        if ($('emailError')) $('emailError').hidden = valid;
        if ($('phoneError')) $('phoneError').hidden = true;
        if (!valid) {
            $('email').focus();
            return;
        }
        if (isNutrition && !phone) {
            if ($('phoneError')) $('phoneError').hidden = false;
            if ($('leadPhone')) $('leadPhone').focus();
            return;
        }
        if (phoneRaw && !phone) {
            if ($('phoneError')) $('phoneError').hidden = false;
            if ($('leadPhone')) $('leadPhone').focus();
            return;
        }
        lastEmail = email;
        lastName = name;
        lastPhone = phone;
        var btn = $('revealBtn');
        var prevLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'A preparar…';
        submitQuiz(email, { name: name, phone: phone }).finally(function () {
            btn.disabled = false;
            btn.textContent = prevLabel;
            runProcessingThen(renderResults);
        });
    });

    $('email').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') $('revealBtn').click();
    });

    document.querySelectorAll('.js-quiz-book').forEach(function (el) {
        el.addEventListener('click', function () {
            if (lastScores) storeQuizForBooking(lastScores);
        });
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

    var copyBtn = document.querySelector('.lon-share-copy');
    if (copyBtn && navigator.clipboard) {
        copyBtn.addEventListener('click', function () {
            var url = copyBtn.getAttribute('data-copy') || '';
            navigator.clipboard.writeText(url).then(function () {
                copyBtn.textContent = 'Copiado';
                setTimeout(function () { copyBtn.textContent = 'Copiar link'; }, 1600);
            }).catch(function () {});
        });
    }

    $('restartBtn').addEventListener('click', function () {
        current = 0;
        lastEmail = '';
        lastName = '';
        lastPhone = '';
        lastScores = null;
        answers = new Array(QUESTIONS.length).fill(null);
        $('email').value = '';
        if ($('leadName')) $('leadName').value = '';
        if ($('leadPhone')) $('leadPhone').value = '';
        $('emailError').hidden = true;
        if ($('phoneError')) $('phoneError').hidden = true;
        if (holdTimer) clearInterval(holdTimer);
        $('gaugeArc').style.strokeDashoffset = 314.16;
        $('scoreNum').textContent = '0';
        $('bandPill').className = 'bq-pill';
        show('intro');
        var stickyEl = $('stickyBook');
        if (stickyEl) stickyEl.hidden = true;
    });
})();
