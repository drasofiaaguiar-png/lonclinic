/**
 * LON Clinic — Candidatura Psicólogos Clínicos
 * Multi-step public application form
 */
(function () {
    'use strict';

    var TOTAL_STEPS = 8;

    var state = {
        step: 0 // 0 intro, 1–9 form, 'exit-opp' | 'exit-condicoes' | 'done'
    };

    var form = document.getElementById('recForm');
    var progressWrap = document.getElementById('progressWrap');
    var progressBar = document.getElementById('progressBar');
    var formError = document.getElementById('formError');
    var submitBtn = document.getElementById('submitBtn');

    function track(eventName, params) {
        if (typeof gtag !== 'function') return;
        gtag('event', eventName, Object.assign({
            event_category: 'recrutamento_psicologia',
            page_path: '/recrutamento/psicologia'
        }, params || {}));
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

    function showScreen(id) {
        document.querySelectorAll('.rec-screen').forEach(function (el) {
            var active = el.id === id;
            el.classList.toggle('is-active', active);
            el.hidden = !active;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateProgress(step) {
        if (typeof step !== 'number' || step < 1 || step > TOTAL_STEPS) {
            progressWrap.hidden = true;
            return;
        }
        progressWrap.hidden = false;
        progressBar.setAttribute('aria-valuenow', String(step));
        progressBar.querySelectorAll('.rec-seg').forEach(function (seg) {
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
        if (step === 'exit-opp') {
            showScreen('screen-exit-opp');
            updateProgress(0);
            track('recrutamento_early_exit', { reason: 'opp' });
            return;
        }
        if (step === 'exit-condicoes') {
            showScreen('screen-exit-condicoes');
            updateProgress(0);
            track('recrutamento_early_exit', { reason: 'condicoes' });
            return;
        }
        if (step === 'done') {
            showScreen('screen-done');
            updateProgress(0);
            return;
        }
        showScreen('screen-' + step);
        updateProgress(step);
        track('recrutamento_step', { step: step });
    }

    function clearInvalid(stepEl) {
        stepEl.querySelectorAll('.is-invalid').forEach(function (el) {
            el.classList.remove('is-invalid');
        });
    }

    function markInvalid(el) {
        if (!el) return;
        var choice = el.closest('.rec-choice');
        if (choice) {
            choice.classList.add('is-invalid');
            return;
        }
        var field = el.closest('.rec-field');
        if (field) field.classList.add('is-invalid');
        else el.classList.add('is-invalid');
    }

    function requireRadio(stepEl, name, okState) {
        if (selectedValue(name)) return okState;
        okState.ok = false;
        stepEl.querySelectorAll('input[name="' + name + '"]').forEach(markInvalid);
        if (!okState.firstBad) okState.firstBad = stepEl.querySelector('input[name="' + name + '"]');
        return okState;
    }

    function requireChecks(stepEl, name, okState) {
        if (selectedValues(name).length) return okState;
        okState.ok = false;
        stepEl.querySelectorAll('input[name="' + name + '"]').forEach(markInvalid);
        if (!okState.firstBad) okState.firstBad = stepEl.querySelector('input[name="' + name + '"]');
        return okState;
    }

    function requireInput(id, okState) {
        var el = document.getElementById(id);
        if (!el) return okState;
        var val = (el.value || '').trim();
        var bad = !val;
        if (el.type === 'email' && val && !el.checkValidity()) bad = true;
        if (el.type === 'number' && val && !el.checkValidity()) bad = true;
        if (el.type === 'url' && val && !el.checkValidity()) bad = true;
        if (bad) {
            okState.ok = false;
            markInvalid(el);
            if (!okState.firstBad) okState.firstBad = el;
        }
        return okState;
    }

    function syncPaisOutro() {
        var isOutro = selectedValue('pais') === 'Outro';
        var wrap = document.getElementById('paisOutroWrap');
        wrap.hidden = !isOutro;
        if (!isOutro) document.getElementById('pais_especificar').value = '';
    }

    function syncOnlineConsultas() {
        var v = selectedValue('experiencia_online');
        var show = v === 'Sim, atualmente' || v === 'Sim, mas não atualmente';
        var wrap = document.getElementById('nConsultasOnlineWrap');
        wrap.hidden = !show;
        if (!show) {
            form.querySelectorAll('input[name="n_consultas_online"]').forEach(function (el) {
                el.checked = false;
            });
        }
    }

    function syncAumento() {
        var v = selectedValue('aumento_futuro');
        var show = v === 'Sim, a curto prazo' || v === 'Sim, mas apenas futuramente';
        var wrap = document.getElementById('horasAumentoWrap');
        wrap.hidden = !show;
        if (!show) {
            form.querySelectorAll('input[name="horas_aumento"]').forEach(function (el) {
                el.checked = false;
            });
        }
    }

    function syncOutroCheck(checkId, wrapId, inputId) {
        var checked = document.getElementById(checkId).checked;
        var wrap = document.getElementById(wrapId);
        wrap.hidden = !checked;
        if (!checked) document.getElementById(inputId).value = '';
    }

    function validateStep(step) {
        var stepEl = document.getElementById('screen-' + step);
        if (!stepEl) return true;
        clearInvalid(stepEl);
        var s = { ok: true, firstBad: null };

        if (step === 1) {
            requireInput('nome', s);
            requireInput('email', s);
            requireInput('telefone', s);
            requireRadio(stepEl, 'pais', s);
            if (selectedValue('pais') === 'Outro') requireInput('pais_especificar', s);
        }

        if (step === 2) {
            requireRadio(stepEl, 'opp_inscrito', s);
            if (selectedValue('opp_inscrito') === 'Sim') {
                requireInput('cedula_opp', s);
                requireRadio(stepEl, 'grau_academico', s);
            }
        }

        if (step === 3) {
            requireRadio(stepEl, 'anos_clinica', s);
            requireRadio(stepEl, 'anos_individuais', s);
            requireRadio(stepEl, 'experiencia_online', s);
            var online = selectedValue('experiencia_online');
            if (online === 'Sim, atualmente' || online === 'Sim, mas não atualmente') {
                requireRadio(stepEl, 'n_consultas_online', s);
            }
            requireChecks(stepEl, 'areas_clinicas', s);
            if (document.getElementById('areasOutroCheck').checked) requireInput('areas_outro', s);
            requireChecks(stepEl, 'populacoes', s);
            if (document.getElementById('populacoesOutroCheck').checked) requireInput('populacoes_outro', s);
            requireInput('tipos_casos', s);
        }

        if (step === 4) {
            requireRadio(stepEl, 'horas_iniciais', s);
            requireChecks(stepEl, 'dias_semana', s);
            requireInput('horarios_fixos', s);
            requireRadio(stepEl, 'disponibilidade_estavel', s);
            requireRadio(stepEl, 'aumento_futuro', s);
            var aum = selectedValue('aumento_futuro');
            if (aum === 'Sim, a curto prazo' || aum === 'Sim, mas apenas futuramente') {
                requireRadio(stepEl, 'horas_aumento', s);
            }
        }

        if (step === 5) {
            requireRadio(stepEl, 'aceita_condicoes', s);
        }

        if (step === 6) {
            requireInput('motivacao_interesse', s);
            requireInput('motivacao_diferencial', s);
            requireInput('motivacao_procura', s);
        }

        if (step === 7) {
            requireInput('abordagem_terapeutica', s);
            requireChecks(stepEl, 'modelos', s);
            if (document.getElementById('modelosOutroCheck').checked) requireInput('modelos_outro', s);
            requireChecks(stepEl, 'idiomas', s);
            if (document.getElementById('idiomasOutroCheck').checked) requireInput('idiomas_outro', s);
            requireRadio(stepEl, 'videoconferencia', s);
        }

        if (step === 8) {
            var cv = document.getElementById('cv');
            if (!cv.files || !cv.files.length) {
                s.ok = false;
                markInvalid(cv);
                if (!s.firstBad) s.firstBad = cv;
            } else {
                var file = cv.files[0];
                var name = (file.name || '').toLowerCase();
                var isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
                if (!isPdf) {
                    s.ok = false;
                    markInvalid(cv);
                    if (!s.firstBad) s.firstBad = cv;
                    formError.textContent = 'O CV deve ser um ficheiro PDF.';
                    formError.classList.add('is-visible');
                } else if (file.size > 5 * 1024 * 1024) {
                    s.ok = false;
                    markInvalid(cv);
                    if (!s.firstBad) s.firstBad = cv;
                    formError.textContent = 'O CV não pode exceder 5 MB.';
                    formError.classList.add('is-visible');
                }
            }
            var linkedin = document.getElementById('linkedin');
            if (linkedin.value.trim() && !linkedin.checkValidity()) {
                s.ok = false;
                markInvalid(linkedin);
                if (!s.firstBad) s.firstBad = linkedin;
            }
            requireRadio(stepEl, 'bolsa_autorizacao', s);
        }

        if (!s.ok && s.firstBad) {
            try { s.firstBad.focus({ preventScroll: false }); } catch (e) { /* ignore */ }
            s.firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return s.ok;
    }

    function withOutro(list, checkId, inputId, outroLabel) {
        var values = list.slice();
        var label = outroLabel || 'Outro';
        if (document.getElementById(checkId).checked) {
            var o = document.getElementById(inputId).value.trim();
            if (o) {
                values = values.map(function (v) {
                    return v === label ? label + ': ' + o : v;
                });
            }
        }
        return values;
    }

    function collectPayload() {
        var pais = selectedValue('pais');
        return {
            nome: document.getElementById('nome').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefone: document.getElementById('telefone').value.trim(),
            localidade: document.getElementById('localidade').value.trim(),
            pais: pais,
            pais_especificar: pais === 'Outro' ? document.getElementById('pais_especificar').value.trim() : '',
            opp_inscrito: selectedValue('opp_inscrito'),
            cedula_opp: document.getElementById('cedula_opp').value.trim(),
            grau_academico: selectedValue('grau_academico'),
            formacao_complementar: document.getElementById('formacao_complementar').value.trim(),
            anos_clinica: selectedValue('anos_clinica'),
            anos_individuais: selectedValue('anos_individuais'),
            experiencia_online: selectedValue('experiencia_online'),
            n_consultas_online: selectedValue('n_consultas_online') || null,
            areas_clinicas: withOutro(selectedValues('areas_clinicas'), 'areasOutroCheck', 'areas_outro', 'Outro'),
            populacoes: withOutro(selectedValues('populacoes'), 'populacoesOutroCheck', 'populacoes_outro', 'Outro'),
            tipos_casos: document.getElementById('tipos_casos').value.trim(),
            horas_iniciais: selectedValue('horas_iniciais'),
            dias_semana: selectedValues('dias_semana'),
            horarios_fixos: document.getElementById('horarios_fixos').value.trim(),
            disponibilidade_estavel: selectedValue('disponibilidade_estavel'),
            aumento_futuro: selectedValue('aumento_futuro'),
            horas_aumento: selectedValue('horas_aumento') || '',
            aceita_condicoes: selectedValue('aceita_condicoes'),
            motivacao_interesse: document.getElementById('motivacao_interesse').value.trim(),
            motivacao_diferencial: document.getElementById('motivacao_diferencial').value.trim(),
            motivacao_procura: document.getElementById('motivacao_procura').value.trim(),
            abordagem_terapeutica: document.getElementById('abordagem_terapeutica').value.trim(),
            modelos: withOutro(selectedValues('modelos'), 'modelosOutroCheck', 'modelos_outro', 'Outra'),
            idiomas: withOutro(selectedValues('idiomas'), 'idiomasOutroCheck', 'idiomas_outro', 'Outro'),
            videoconferencia: selectedValue('videoconferencia'),
            bolsa_autorizacao: selectedValue('bolsa_autorizacao'),
            linkedin: document.getElementById('linkedin').value.trim()
        };
    }

    async function submitForm(e) {
        e.preventDefault();
        formError.classList.remove('is-visible');
        formError.textContent = '';
        if (!validateStep(8)) {
            if (!formError.textContent) {
                formError.textContent = 'Complete os campos obrigatórios para enviar.';
                formError.classList.add('is-visible');
            }
            return;
        }

        var payload = collectPayload();
        var fd = new FormData();
        fd.append('payload', JSON.stringify(payload));
        fd.append('cv', document.getElementById('cv').files[0]);

        submitBtn.disabled = true;
        submitBtn.textContent = 'A enviar…';

        try {
            var res = await fetch('/api/recrutamento/psicologia', {
                method: 'POST',
                body: fd
            });
            var data = await res.json().catch(function () { return {}; });
            if (!res.ok) {
                throw new Error(data.error || 'Não foi possível enviar. Tente novamente.');
            }
            track('recrutamento_submit', { success: 1 });
            goTo('done');
        } catch (err) {
            formError.textContent = err.message || 'Erro de rede. Tente novamente.';
            formError.classList.add('is-visible');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar candidatura';
        }
    }

    function onNext() {
        var step = state.step;
        if (!validateStep(step)) return;

        if (step === 2 && selectedValue('opp_inscrito') === 'Não') {
            goTo('exit-opp');
            return;
        }
        if (step === 5 && selectedValue('aceita_condicoes') === 'Não') {
            goTo('exit-condicoes');
            return;
        }
        goTo(step + 1);
    }

    function bind() {
        document.getElementById('startBtn').addEventListener('click', function () {
            track('recrutamento_start');
            goTo(1);
        });

        form.querySelectorAll('[data-next]').forEach(function (btn) {
            btn.addEventListener('click', onNext);
        });

        form.querySelectorAll('[data-prev]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var prev = state.step - 1;
                goTo(prev < 1 ? 0 : prev);
            });
        });

        form.addEventListener('submit', submitForm);

        form.querySelectorAll('input[name="pais"]').forEach(function (r) {
            r.addEventListener('change', syncPaisOutro);
        });
        form.querySelectorAll('input[name="experiencia_online"]').forEach(function (r) {
            r.addEventListener('change', syncOnlineConsultas);
        });
        form.querySelectorAll('input[name="aumento_futuro"]').forEach(function (r) {
            r.addEventListener('change', syncAumento);
        });

        document.getElementById('areasOutroCheck').addEventListener('change', function () {
            syncOutroCheck('areasOutroCheck', 'areasOutroWrap', 'areas_outro');
        });
        document.getElementById('populacoesOutroCheck').addEventListener('change', function () {
            syncOutroCheck('populacoesOutroCheck', 'populacoesOutroWrap', 'populacoes_outro');
        });
        document.getElementById('modelosOutroCheck').addEventListener('change', function () {
            syncOutroCheck('modelosOutroCheck', 'modelosOutroWrap', 'modelos_outro');
        });
        document.getElementById('idiomasOutroCheck').addEventListener('change', function () {
            syncOutroCheck('idiomasOutroCheck', 'idiomasOutroWrap', 'idiomas_outro');
        });
    }

    bind();
})();
