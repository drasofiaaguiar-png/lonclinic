/**
 * LON Clinic — Questionário de Triagem (Psicologia)
 * PHQ-9 Q9 ≥ 1 → immediate crisis UI + priority clinical flag
 */
(function () {
    'use strict';

    var PHQ_ITEMS = [
        'Pouco interesse ou prazer em fazer as coisas',
        'Sentir-se em baixo, deprimida ou sem esperança',
        'Dificuldade em adormecer, manter o sono, ou dormir em excesso',
        'Sentir-se cansada ou com pouca energia',
        'Falta de apetite ou comer em excesso',
        'Sentir-se mal consigo mesma — ou que é um fracasso, ou que desiludiu a família',
        'Dificuldade em concentrar-se (ex.: ler, ver televisão)',
        'Lentidão ou agitação percetível por outros',
        'Pensamentos de que estaria melhor morta, ou de se magoar de alguma forma'
    ];

    var SCORE_OPTIONS = [
        { value: '0', label: 'Nunca' },
        { value: '1', label: 'Vários dias' },
        { value: '2', label: 'Mais de metade dos dias' },
        { value: '3', label: 'Quase todos os dias' }
    ];
    var TOTAL_STEPS = 6;

    var state = {
        step: 0, // 0 = intro, 1–6 = form, 7 = done
        riskFlagged: false,
        riskNotified: false
    };

    var form = document.getElementById('triagemForm');
    var progressWrap = document.getElementById('progressWrap');
    var progressBar = document.getElementById('progressBar');
    var riskPanel = document.getElementById('riskPanel');
    var consentRiskNote = document.getElementById('consentRiskNote');
    var formError = document.getElementById('formError');
    var submitBtn = document.getElementById('submitBtn');
    var emergencyModal = document.getElementById('emergencyResources');

    function track(eventName, params) {
        if (typeof gtag !== 'function') return;
        gtag('event', eventName, Object.assign({
            event_category: 'triagem',
            page_path: '/triagem'
        }, params || {}));
    }

    function buildPhq() {
        var host = document.getElementById('phqList');
        if (!host) return;
        var html = '';
        PHQ_ITEMS.forEach(function (text, i) {
            var n = i + 1;
            var isQ9 = n === 9;
            html += '<div class="triagem-phq-item' + (isQ9 ? ' is-risk-q' : '') + '" data-phq="' + n + '">';
            html += '<p class="triagem-phq-q" id="phq-q-' + n + '">' + n + '. ' + text + '</p>';
            html += '<div class="triagem-phq-scores" role="radiogroup" aria-labelledby="phq-q-' + n + '">';
            SCORE_OPTIONS.forEach(function (opt) {
                html += '<label class="triagem-choice triagem-choice--phq">';
                html += '<input type="radio" name="phq' + n + '" value="' + opt.value + '" required' +
                    (isQ9 ? ' data-phq9' : '') + '>';
                html += '<span><strong class="triagem-phq-num">' + opt.value + '</strong>' +
                    '<small class="triagem-phq-meaning">' + opt.label + '</small></span></label>';
            });
            html += '</div></div>';
        });
        host.innerHTML = html;

        host.querySelectorAll('input[data-phq9]').forEach(function (input) {
            input.addEventListener('change', onPhq9Change);
        });
    }

    function onPhq9Change(e) {
        var score = Number(e.target.value);
        if (score >= 1) {
            flagRiskImmediate(score);
        } else {
            // Only hide if user revises to 0 and we haven't already escalated permanently
            if (!state.riskFlagged) {
                riskPanel.hidden = true;
            }
        }
    }

    function flagRiskImmediate(score) {
        state.riskFlagged = true;
        riskPanel.hidden = false;
        if (consentRiskNote) consentRiskNote.hidden = false;

        // Scroll risk into view so it is never missed
        requestAnimationFrame(function () {
            riskPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        if (!state.riskNotified) {
            state.riskNotified = true;
            track('triagem_phq9_risk', { phq9_score: score });
            // Fire-and-forget priority ping so clinic is alerted before form completion
            pingPriorityAlert(score);
        }
    }

    function pingPriorityAlert(score) {
        var nome = (document.getElementById('nome') || {}).value || '';
        var email = (document.getElementById('email') || {}).value || '';
        var telefone = (document.getElementById('telefone') || {}).value || '';
        try {
            fetch('/api/triagem-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'phq9_q9',
                    score: score,
                    nome: String(nome).slice(0, 120),
                    email: String(email).slice(0, 160),
                    telefone: String(telefone).slice(0, 40),
                    partial: true
                }),
                keepalive: true
            }).catch(function () { /* non-blocking */ });
        } catch (err) { /* ignore */ }
    }

    function showScreen(id) {
        document.querySelectorAll('.triagem-screen').forEach(function (el) {
            var active = el.id === id;
            el.classList.toggle('is-active', active);
            el.hidden = !active;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateProgress(step) {
        if (step < 1 || step > TOTAL_STEPS) {
            progressWrap.hidden = true;
            return;
        }
        progressWrap.hidden = false;
        progressBar.setAttribute('aria-valuenow', String(step));
        progressBar.querySelectorAll('.triagem-seg').forEach(function (seg) {
            var n = Number(seg.getAttribute('data-seg'));
            seg.classList.toggle('is-active', n === step);
            seg.classList.toggle('is-done', n < step);
        });
    }

    function goTo(step) {
        state.step = step;
        if (step === 0) {
            showScreen('screen-intro');
            updateProgress(0);
            return;
        }
        if (step === 7) {
            showScreen('screen-done');
            updateProgress(0);
            return;
        }
        showScreen('screen-' + step);
        updateProgress(step);
        if (step === 5) syncTemaPreference();
        track('triagem_step', { step: step });
    }

    function selectedValues(name) {
        return Array.prototype.map.call(
            form.querySelectorAll('input[name="' + name + '"]:checked'),
            function (el) { return el.value; }
        );
    }

    function selectedValue(name) {
        var el = form.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : '';
    }

    function syncMotivoOutro() {
        var checked = document.getElementById('motivoOutroCheck').checked;
        var wrap = document.getElementById('motivoOutroWrap');
        wrap.hidden = !checked;
        if (!checked) document.getElementById('motivoOutro').value = '';
    }

    function syncTerapiaUtil() {
        var sim = document.getElementById('terapiaSim').checked;
        var wrap = document.getElementById('terapiaUtilWrap');
        wrap.hidden = !sim;
        if (!sim) {
            form.querySelectorAll('input[name="terapiaUtil"]').forEach(function (r) {
                r.checked = false;
                r.required = false;
            });
        } else {
            form.querySelectorAll('input[name="terapiaUtil"]').forEach(function (r) {
                r.required = true;
            });
        }
    }

    function syncDiagnostico() {
        var sim = document.getElementById('diagSim').checked;
        var wrap = document.getElementById('diagQualWrap');
        wrap.hidden = !sim;
        var input = document.getElementById('diagnosticoQual');
        input.required = sim;
        if (!sim) input.value = '';
    }

    function syncTemaPreference() {
        var motivos = selectedValues('motivos').filter(function (m) { return m !== 'Outro'; });
        var outro = (document.getElementById('motivoOutro') || {}).value || '';
        if (document.getElementById('motivoOutroCheck').checked && outro) {
            motivos.push(outro);
        }
        var label = document.getElementById('prefTemaLabel');
        var input = document.getElementById('prefExperiencia');
        if (motivos.length) {
            var tema = motivos.slice(0, 2).join(', ');
            label.textContent = 'Com experiência específica em: ' + tema;
            input.value = 'Com experiência específica em: ' + tema;
        } else {
            label.textContent = 'Com experiência específica no tema que selecionei';
            input.value = 'Com experiência específica no tema selecionado';
        }
    }

    function clearInvalid(stepEl) {
        stepEl.querySelectorAll('.is-invalid').forEach(function (el) {
            el.classList.remove('is-invalid');
        });
    }

    function markInvalid(el) {
        if (!el) return;
        var label = el.closest('.triagem-choice');
        if (label) label.classList.add('is-invalid');
        else el.classList.add('is-invalid');
    }

    function validateStep(step) {
        var stepEl = document.getElementById('screen-' + step);
        if (!stepEl) return true;
        clearInvalid(stepEl);
        var ok = true;
        var firstBad = null;

        if (step === 1) {
            ['nome', 'idade', 'localizacao', 'email', 'telefone'].forEach(function (id) {
                var el = document.getElementById(id);
                if (!el.checkValidity()) {
                    ok = false;
                    markInvalid(el);
                    if (!firstBad) firstBad = el;
                }
            });
            if (!selectedValue('genero')) {
                ok = false;
                stepEl.querySelectorAll('input[name="genero"]').forEach(function (r) {
                    markInvalid(r);
                });
                if (!firstBad) firstBad = stepEl.querySelector('input[name="genero"]');
            }
        }

        if (step === 2) {
            if (!selectedValues('motivos').length) {
                ok = false;
                stepEl.querySelectorAll('input[name="motivos"]').forEach(function (r) {
                    markInvalid(r);
                });
                if (!firstBad) firstBad = stepEl.querySelector('input[name="motivos"]');
            }
            var outroOn = document.getElementById('motivoOutroCheck').checked;
            var outroVal = document.getElementById('motivoOutro').value.trim();
            if (outroOn && !outroVal) {
                ok = false;
                markInvalid(document.getElementById('motivoOutro'));
                if (!firstBad) firstBad = document.getElementById('motivoOutro');
            }
            if (!selectedValue('duracao')) {
                ok = false;
                stepEl.querySelectorAll('input[name="duracao"]').forEach(function (r) {
                    markInvalid(r);
                });
                if (!firstBad) firstBad = stepEl.querySelector('input[name="duracao"]');
            }
        }

        if (step === 3) {
            for (var i = 1; i <= 9; i++) {
                if (!selectedValue('phq' + i)) {
                    ok = false;
                    stepEl.querySelectorAll('input[name="phq' + i + '"]').forEach(function (r) {
                        markInvalid(r);
                    });
                    if (!firstBad) firstBad = stepEl.querySelector('input[name="phq' + i + '"]');
                }
            }
            // Re-check Q9 in case user filled all then we advance
            var q9 = Number(selectedValue('phq9') || 0);
            if (q9 >= 1) flagRiskImmediate(q9);
        }

        if (step === 4) {
            if (!selectedValue('terapiaAntes')) {
                ok = false;
                stepEl.querySelectorAll('input[name="terapiaAntes"]').forEach(markInvalid);
                if (!firstBad) firstBad = stepEl.querySelector('input[name="terapiaAntes"]');
            }
            if (document.getElementById('terapiaSim').checked && !selectedValue('terapiaUtil')) {
                ok = false;
                stepEl.querySelectorAll('input[name="terapiaUtil"]').forEach(markInvalid);
                if (!firstBad) firstBad = stepEl.querySelector('input[name="terapiaUtil"]');
            }
            if (!selectedValue('medicacao')) {
                ok = false;
                stepEl.querySelectorAll('input[name="medicacao"]').forEach(markInvalid);
                if (!firstBad) firstBad = stepEl.querySelector('input[name="medicacao"]');
            }
            if (!selectedValue('diagnostico')) {
                ok = false;
                stepEl.querySelectorAll('input[name="diagnostico"]').forEach(markInvalid);
                if (!firstBad) firstBad = stepEl.querySelector('input[name="diagnostico"]');
            }
            if (document.getElementById('diagSim').checked) {
                var dq = document.getElementById('diagnosticoQual');
                if (!dq.value.trim()) {
                    ok = false;
                    markInvalid(dq);
                    if (!firstBad) firstBad = dq;
                }
            }
        }

        if (step === 5) {
            if (!selectedValues('prefPsicologa').length) {
                ok = false;
                stepEl.querySelectorAll('input[name="prefPsicologa"]').forEach(markInvalid);
                if (!firstBad) firstBad = stepEl.querySelector('input[name="prefPsicologa"]');
            }
            ['comunicacao', 'horario'].forEach(function (name) {
                if (!selectedValue(name)) {
                    ok = false;
                    stepEl.querySelectorAll('input[name="' + name + '"]').forEach(markInvalid);
                    if (!firstBad) firstBad = stepEl.querySelector('input[name="' + name + '"]');
                }
            });
        }

        if (step === 6) {
            var semRisco = document.getElementById('semRisco');
            var termos = document.getElementById('termos');
            if (!semRisco.checked) {
                ok = false;
                markInvalid(semRisco);
                if (!firstBad) firstBad = semRisco;
            }
            if (!termos.checked) {
                ok = false;
                markInvalid(termos);
                if (!firstBad) firstBad = termos;
            }
            // If risk flagged, still allow submit — clinical team already alerted —
            // but do not block on "sem risco" conflict: show note instead
            if (state.riskFlagged && semRisco.checked) {
                // User affirms no *immediate* risk now; Q9 flag remains for clinical review
            }
        }

        if (!ok && firstBad) {
            firstBad.focus({ preventScroll: false });
            firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return ok;
    }

    function phqTotal() {
        var sum = 0;
        for (var i = 1; i <= 9; i++) {
            sum += Number(selectedValue('phq' + i) || 0);
        }
        return sum;
    }

    function collectPayload() {
        var motivos = selectedValues('motivos');
        if (motivos.indexOf('Outro') !== -1) {
            var o = document.getElementById('motivoOutro').value.trim();
            if (o) motivos = motivos.map(function (m) {
                return m === 'Outro' ? 'Outro: ' + o : m;
            });
        }

        var phq = {};
        for (var i = 1; i <= 9; i++) {
            phq['q' + i] = Number(selectedValue('phq' + i) || 0);
        }

        return {
            nome: document.getElementById('nome').value.trim(),
            idade: Number(document.getElementById('idade').value),
            genero: selectedValue('genero'),
            localizacao: document.getElementById('localizacao').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefone: document.getElementById('telefone').value.trim(),
            motivos: motivos,
            duracao: selectedValue('duracao'),
            phq: phq,
            phqTotal: phqTotal(),
            phq9: phq.q9,
            riskFlagged: state.riskFlagged,
            terapiaAntes: selectedValue('terapiaAntes'),
            terapiaUtil: selectedValue('terapiaUtil') || null,
            medicacao: selectedValue('medicacao'),
            diagnostico: selectedValue('diagnostico'),
            diagnosticoQual: document.getElementById('diagnosticoQual').value.trim() || null,
            prefPsicologa: selectedValues('prefPsicologa'),
            comunicacao: selectedValue('comunicacao'),
            horario: selectedValue('horario'),
            encaminhamento: selectedValue('encaminhamento') || null,
            consentimentos: {
                semRiscoImediato: document.getElementById('semRisco').checked,
                termos: document.getElementById('termos').checked,
                comunicacoes: document.getElementById('comunicacoes').checked
            }
        };
    }

    async function submitForm(e) {
        e.preventDefault();
        formError.hidden = true;
        if (!validateStep(6)) {
            formError.textContent = 'Confirma os consentimentos obrigatórios para continuar.';
            formError.hidden = false;
            return;
        }

        var payload = collectPayload();
        submitBtn.disabled = true;
        submitBtn.textContent = 'A enviar…';

        try {
            var res = await fetch('/api/triagem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data = await res.json().catch(function () { return {}; });
            if (!res.ok) {
                throw new Error(data.error || 'Não foi possível enviar. Tenta novamente.');
            }

            track('triagem_submit', {
                risk_flagged: payload.riskFlagged ? 1 : 0,
                phq_total: payload.phqTotal
            });

            var doneMsg = document.getElementById('doneMessage');
            if (payload.riskFlagged) {
                doneMsg.innerHTML =
                    'Recebemos a tua triagem com <strong>sinalização prioritária</strong> para a equipa clínica. ' +
                    'Se precisares de ajuda imediata: <a href="tel:112">112</a> · ' +
                    '<a href="tel:808242424">SNS 24</a> · <a href="tel:213544545">SOS Voz Amiga</a>.';
            }

            goTo(7);
        } catch (err) {
            formError.textContent = err.message || 'Erro de rede. Tenta novamente.';
            formError.hidden = false;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar triagem';
        }
    }

    function bind() {
        document.getElementById('startBtn').addEventListener('click', function () {
            track('triagem_start');
            goTo(1);
        });

        form.querySelectorAll('[data-next]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var step = state.step;
                if (!validateStep(step)) return;
                goTo(step + 1);
            });
        });

        form.querySelectorAll('[data-prev]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var prev = state.step - 1;
                goTo(prev < 1 ? 0 : prev);
            });
        });

        form.addEventListener('submit', submitForm);

        document.getElementById('motivoOutroCheck').addEventListener('change', syncMotivoOutro);
        form.querySelectorAll('input[name="terapiaAntes"]').forEach(function (r) {
            r.addEventListener('change', syncTerapiaUtil);
        });
        form.querySelectorAll('input[name="diagnostico"]').forEach(function (r) {
            r.addEventListener('change', syncDiagnostico);
        });

        form.querySelectorAll('input[name="prefPsicologa"]').forEach(function (box) {
            box.addEventListener('change', function () {
                var none = document.getElementById('prefSemPreferencia');
                if (box === none && none.checked) {
                    form.querySelectorAll('input[name="prefPsicologa"]').forEach(function (el) {
                        if (el !== none) el.checked = false;
                    });
                } else if (box !== none && box.checked && none) {
                    none.checked = false;
                }
            });
        });

        document.getElementById('crisisResourcesLink').addEventListener('click', function (e) {
            e.preventDefault();
            emergencyModal.hidden = false;
        });
        document.getElementById('closeEmergency').addEventListener('click', function () {
            emergencyModal.hidden = true;
        });
        emergencyModal.addEventListener('click', function (e) {
            if (e.target === emergencyModal) emergencyModal.hidden = true;
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !emergencyModal.hidden) emergencyModal.hidden = true;
        });
    }

    buildPhq();
    bind();
})();
