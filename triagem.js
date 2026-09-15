/**
 * LON Clinic — Triagem psicologia
 * Individual: BetterHelp-style + PHQ-9. Casal: triagem de relação + convite ao par.
 * Último passo: nome + email (e, no casal, dados do par). Depois, horários.
 */
(function () {
    'use strict';

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var PHQ9_ITEM = 'Pensamentos de que estaria melhor morta, ou de se magoar de alguma forma';
    var SCORE_OPTIONS = [
        { value: '0', label: 'Nunca' },
        { value: '1', label: 'Vários dias' },
        { value: '2', label: 'Mais de metade dos dias' },
        { value: '3', label: 'Quase todos os dias' }
    ];
    var MOTIVOS = [
        'Ansiedade',
        'Baixa de humor / tristeza persistente',
        'Stress relacionado com trabalho / burnout',
        'Dificuldades de sono',
        'Relações pessoais ou familiares',
        'Autoestima / autoconfiança',
        'Luto ou perda',
        'Trauma ou eventos passados',
        'Transições de vida (mudança, carreira, maternidade/paternidade)',
        'Outro'
    ];
    var CASAL_MOTIVOS = [
        'Melhorar a nossa comunicação',
        'Decidir se devemos separar-nos',
        'Resolver conflitos e desacordos',
        'Ultrapassar uma infidelidade',
        'Compreender-me melhor',
        'Compreender melhor o meu par',
        'Equilibrar melhor as tarefas do casal',
        'Reduzir a tensão entre nós',
        'Prevenir a separação ou divórcio',
        'Aprender formas “saudáveis” de discutir',
        'Parar de nos magoarmos mutuamente',
        'Reconquistar o amor do meu par',
        'Voltar a sentir amor pelo meu par',
        'Discutir questões sobre educar os filhos',
        'Melhorar a nossa vida sexual e intimidade',
        'Mediação de divórcio ou separação',
        'Outro'
    ];
    var CASAL_MOTIVO_FACTS = {
        'Melhorar a nossa comunicação': 'Todos os casais discutem — o que mais influencia a satisfação a longo prazo costuma ser como reparam a ligação depois do conflito, não a ausência dele.',
        'Ultrapassar uma infidelidade': 'A recuperação após uma infidelidade costuma passar por várias fases e raramente é rápida — dar tempo ao processo é normal, não um sinal de que não está a resultar.',
        'Equilibrar melhor as tarefas do casal': 'A perceção de injustiça na divisão de tarefas é uma das áreas de tensão mais comuns nos casais que procuram terapia — mesmo quando a divisão “no papel” parece equilibrada.',
        'Decidir se devemos separar-nos': 'Quando ainda não há certeza sobre continuar ou não, alguns terapeutas oferecem sessões de esclarecimento antes de decidir avançar com terapia de casal continuada.',
        'Discutir questões sobre educar os filhos': 'Desacordos sobre estilos parentais são um dos temas mais frequentes em terapia de casal, mesmo em relações que funcionam bem noutras áreas.'
    };
    var CASAL_EXPECT = [
        'Ouve, sem julgar',
        'Explora a dinâmica da nossa relação',
        'Ensina novas competências de comunicação',
        'Desafia as nossas crenças',
        'Faz mediação em situações difíceis',
        'Explora o impacto das famílias de origem',
        'Propõe exercícios para fazer entre sessões',
        'Ajuda-nos a definir objetivos',
        'Faz check-ins proativos',
        'Não sei'
    ];
    var GENDER_MORE = ['Não-binário', 'Transfeminino', 'Transmasculino', 'Agénero', 'Não sei', 'Prefiro não dizer', 'Outro'];
    var ORIENTATION_BASE = ['Heterossexual', 'Gay', 'Lésbica', 'Bi ou Pan', 'Prefiro não dizer'];
    var ORIENTATION_MORE = ['Questioning', 'Queer', 'Assexual', 'Não sei', 'Outro'];
    var REL_STATUS = ['Numa relação', 'Casado(a)', 'Separado(a)', 'Divorciado(a)', 'Viúvo(a)', 'Solteiro(a)', 'Relação poliamorosa', 'É complicado', 'Outro'];

    var state = {
        phase: 'choice', // choice | intro | quiz | done
        quizIndex: 0,
        riskFlagged: false,
        riskNotified: false,
        noSlotAsked: false,
        tipoTerapia: 'individual',
        parceiroConvite: false,
        genderExpanded: false,
        orientationExpanded: false,
        submitted: false,
        answers: {
            consentSaude: false,
            genero: '',
            idade: '',
            orientation: '',
            relStatus: '',
            cohabit: '',
            dv: '',
            motivos: [],
            motivoOutro: '',
            expect: [],
            duracao: '',
            terapiaAntes: '',
            priorNote: '',
            prefPsicologa: '',
            horario: '',
            medicacao: '',
            diagnostico: '',
            diagnosticoQual: '',
            phq: {},
            nome: '',
            email: '',
            partnerNome: '',
            partnerEmail: '',
            invitePartner: '',
            termos: false,
            semRisco: false,
            comunicacoes: false
        }
    };

    var form = document.getElementById('triagemForm');
    var quizMount = document.getElementById('quizMount');
    var quizNext = document.getElementById('quizNext');
    var quizBack = document.getElementById('quizBack');
    var quizCount = document.getElementById('quizCount');
    var quizMeter = document.getElementById('quizMeter');
    var formError = document.getElementById('formError');
    var emergencyModal = document.getElementById('emergencyResources');
    var autoTimer = null;
    var pointerArmed = false;

    function track(eventName, params) {
        var payload = Object.assign({
            event_category: 'triagem',
            page_path: '/triagem',
            surface: 'triage'
        }, params || {});
        if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
            window.LonAnalytics.track(eventName, payload);
            if (eventName === 'triagem_exit' || eventName === 'triagem_submit' || eventName === 'triagem_start' || eventName === 'triagem_step') {
                if (typeof window.LonAnalytics.flush === 'function') window.LonAnalytics.flush();
            }
            return;
        }
        if (typeof gtag === 'function') {
            gtag('event', eventName, payload);
        }
    }

    function currentStepMeta() {
        var step = currentStep() || {};
        return {
            step: state.quizIndex + 1,
            step_id: step.id || '',
            step_total: totalQuiz(),
            tipo_terapia: state.tipoTerapia
        };
    }

    function isCasal() {
        return state.tipoTerapia === 'casal';
    }

    function matchIntroCopy() {
        if (isCasal()) {
            if (state.parceiroConvite) {
                return {
                    title: 'O teu par já começou a triagem de casal.',
                    lead: 'Completa a tua parte para a Dra. Carolina Rocha vos conhecer melhor a ambos. As respostas não são partilhadas automaticamente com o teu par.'
                };
            }
            return {
                title: 'Ajuda-nos a fazer o matching para a terapia de casal.',
                lead: 'As perguntas seguintes ajudam a Dra. Carolina Rocha a perceber a vossa relação. No fim, podes convidar o teu par a fazer a triagem.'
            };
        }
        return {
            title: 'Ajuda-nos a fazer o matching com o psicólogo certo.',
            lead: 'É importante teres alguém com quem consigas estabelecer uma ligação pessoal. As perguntas seguintes ajudam-nos a atribuir um psicólogo com base nas tuas necessidades e preferências.'
        };
    }

    function setTipoTerapia(tipo) {
        var next = tipo === 'casal' ? 'casal' : 'individual';
        state.tipoTerapia = next;
        var input = document.getElementById('tipoTerapia');
        if (input) input.value = next;
    }

    function readTipoFromUrl() {
        try {
            var params = new URLSearchParams(window.location.search);
            var t = String(params.get('tipo') || '').toLowerCase();
            if (t === 'casal' || t === 'couples') return 'casal';
            if (t === 'individual' || t === 'solo') return 'individual';
        } catch (err) { /* ignore */ }
        return '';
    }

    function readParceiroFromUrl() {
        try {
            var params = new URLSearchParams(window.location.search);
            var p = String(params.get('parceiro') || params.get('partner') || '').toLowerCase();
            return p === '1' || p === 'sim' || p === 'true';
        } catch (err) { /* ignore */ }
        return false;
    }

    function setChoiceMode(on) {
        document.body.classList.toggle('is-choice', !!on);
        document.body.classList.toggle('is-quiz', !on && state.phase !== 'choice');
    }

    function showScreen(id) {
        document.querySelectorAll('.triagem-screen').forEach(function (el) {
            var active = el.id === id;
            el.classList.toggle('is-active', active);
            el.hidden = !active;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function clearAuto() {
        if (autoTimer) {
            clearTimeout(autoTimer);
            autoTimer = null;
        }
    }

    function goChoice() {
        clearAuto();
        state.phase = 'choice';
        setChoiceMode(true);
        showScreen('screen-intro');
    }

    function goQuiz(index) {
        clearAuto();
        state.phase = 'quiz';
        state.quizIndex = index;
        setChoiceMode(false);
        document.body.classList.add('is-quiz');
        showScreen('screen-quiz');
        
        // Show social proof after choosing therapy type
        var proofSection = document.getElementById('triagemProof');
        if (proofSection) {
            proofSection.hidden = false;
        }
        
        renderQuiz();
        var meta = currentStepMeta();
        if (form) {
            form.setAttribute('data-lon-form-started', '1');
            form.setAttribute('data-triagem-step', String(meta.step_id || ''));
        }
        track('triagem_step', meta);
    }

    function startCasalQuiz() {
        setTipoTerapia('casal');
        track('triagem_start', { tipo_terapia: 'casal', parceiro: state.parceiroConvite ? 1 : 0 });
        goQuiz(0);
    }

    function dvRisk() {
        return state.answers.dv === 'Sim' || state.answers.dv === 'Às vezes';
    }

    function quizSteps() {
        if (!isCasal()) {
            return [
                { id: 'motivoDuracao', type: 'combo' },
                { id: 'prefs', type: 'combo' },
                { id: 'historico', type: 'combo' },
                { id: 'contact', type: 'contact' }
            ];
        }
        var steps = [
            { id: 'consent', type: 'consent' },
            { id: 'idade', type: 'number' },
            { id: 'genero', type: 'single', optional: true },
            { id: 'orientation', type: 'single', optional: true },
            { id: 'relStatus', type: 'single' },
            { id: 'cohabit', type: 'single' },
            { id: 'dv', type: 'single' }
        ];
        if (dvRisk()) steps.push({ id: 'dvSafety', type: 'info' });
        steps.push(
            { id: 'terapiaAntes', type: 'single' },
            { id: 'motivos', type: 'multi' },
            { id: 'expect', type: 'multi' },
            { id: 'contact', type: 'contact' }
        );
        return steps;
    }

    function currentStep() {
        return quizSteps()[state.quizIndex];
    }

    function totalQuiz() {
        return quizSteps().length;
    }

    function goDone() {
        clearAuto();
        state.phase = 'done';
        document.body.classList.remove('is-choice');
        document.body.classList.add('is-quiz');
        showScreen('screen-done');
    }

    function eyebrow(text) {
        return '<p class="tri-eyebrow">' + escapeHtml(text) + '</p>';
    }

    function optionBtn(name, value, label, checked) {
        return '<label class="tri-opt' + (checked ? ' is-on' : '') + '">' +
            '<input type="radio" name="' + name + '" value="' + escapeHtml(value) + '"' + (checked ? ' checked' : '') + '>' +
            '<span>' + escapeHtml(label) + '</span></label>';
    }

    function checkBtn(name, value, label, checked) {
        return '<label class="tri-opt' + (checked ? ' is-on' : '') + '">' +
            '<input type="checkbox" name="' + name + '" value="' + escapeHtml(value) + '"' + (checked ? ' checked' : '') + '>' +
            '<span>' + escapeHtml(label) + '</span></label>';
    }

    function renderRadioGroup(name, title, options, selected) {
        var html = title ? '<p class="tri-group-title">' + escapeHtml(title) + '</p>' : '';
        html += '<div class="tri-opts">';
        options.forEach(function (v) {
            html += optionBtn(name, v, v, selected === v);
        });
        html += '</div>';
        return html;
    }

    function renderQuiz() {
        var step = currentStep();
        var a = state.answers;
        var total = totalQuiz();
        quizCount.textContent = 'Passo ' + (state.quizIndex + 1) + ' de ' + total;
        quizMeter.style.width = (((state.quizIndex + 1) / total) * 100) + '%';
        formError.hidden = true;
        formError.textContent = '';
        quizNext.hidden = false;
        quizNext.disabled = false;
        quizNext.textContent = step.id === 'contact' ? 'Ver horários' : 'Continuar';

        var html = '';
        if (state.quizIndex === 0) {
            var intro = matchIntroCopy();
            html += '<div class="tri-match-intro">';
            html += '<h1>' + escapeHtml(intro.title) + '</h1>';
            html += '<p>' + escapeHtml(intro.lead) + '</p>';
            html += '</div>';
        }
        if (step.id === 'motivoDuracao') {
            html += '<h2>O que te traz à terapia?</h2>';
            html += '<p class="tri-quiz-why">Podes escolher mais do que uma opção.</p>';
            html += '<div class="tri-opts">';
            MOTIVOS.forEach(function (v) {
                html += checkBtn('motivos', v, v, a.motivos.indexOf(v) !== -1);
            });
            html += '</div>';
            html += '<div class="tri-field" id="motivoOutroWrap"' + (a.motivos.indexOf('Outro') === -1 ? ' hidden' : '') + '>';
            html += '<input type="text" id="motivoOutro" maxlength="240" placeholder="Conta-nos um pouco mais" value="' + escapeHtml(a.motivoOutro) + '">';
            html += '</div>';
            html += renderRadioGroup('duracao', 'Há quanto tempo sentes isto?', ['Menos de 1 mês', '1–6 meses', '6 meses – 1 ano', 'Mais de 1 ano'], a.duracao);
        } else if (step.id === 'prefs') {
            html += '<h2>Preferências para o matching</h2>';
            html += '<p class="tri-quiz-why">Ainda estás a escolher — isto ajuda-nos a atribuir alguém com quem possas estabelecer uma ligação.</p>';
            html += renderRadioGroup('prefPsicologa', 'Preferes que o teu psicólogo seja', ['Sem preferência', 'Mulher', 'Homem'], a.prefPsicologa);
            html += renderRadioGroup('horario', 'Que horário te serve melhor para as sessões de vídeo?', ['Sem preferência', 'Manhã (antes das 12h)', 'Tarde (12h–17h)', 'Fim do dia (depois das 17h)'], a.horario);
        } else if (step.id === 'historico') {
            html += '<h2>Um pouco do teu histórico</h2>';
            html += '<p class="tri-quiz-why">Respostas curtas — só o necessário para o matching clínico.</p>';
            html += renderRadioGroup('terapiaAntes', 'Já fizeste terapia ou acompanhamento psicológico antes?', ['Sim', 'Não'], a.terapiaAntes);
            html += renderRadioGroup('medicacao', 'Tomas medicação para a saúde mental?', ['Sim', 'Não', 'Prefiro não dizer'], a.medicacao);
            html += renderRadioGroup('diagnostico', 'Tens um diagnóstico de saúde mental?', ['Sim', 'Não', 'Prefiro não dizer'], a.diagnostico);
            if (a.diagnostico === 'Sim') {
                html += '<div class="tri-field"><label for="diagnosticoQual">Qual? (opcional)</label>';
                html += '<input type="text" id="diagnosticoQual" maxlength="200" value="' + escapeHtml(a.diagnosticoQual) + '"></div>';
            }
            html += renderRiskQ9(a);
        } else if (step.id === 'consent') {
            html += eyebrow('Antes de começar');
            html += '<h2>Precisamos do vosso consentimento</h2>';
            html += '<div class="tri-consent">Para fazer o vosso encaminhamento e prestar consultas de terapia de casal, recolhemos dados sobre a vossa saúde e relação, considerados dados de categoria especial ao abrigo do RGPD. Podes consultar a <a href="/info.html?page=politica-privacidade" target="_blank" rel="noopener">Política de Privacidade</a> para saber como os tratamos e como retirar o consentimento.</div>';
            html += '<label class="tri-check"><input type="checkbox" id="consentSaude"' + (a.consentSaude ? ' checked' : '') + '><span>Autorizo a recolha e o tratamento dos meus dados de saúde para esta triagem e para as consultas de casal.</span></label>';
        } else if (step.id === 'genero') {
            html += eyebrow(isCasal() ? 'Passo 3 · opcional' : '');
            html += '<h2>' + (isCasal() ? 'Como te identificas em termos de género?' : 'Qual é o teu género?') + '</h2>';
            html += '<p class="tri-quiz-why">' + (isCasal()
                ? 'Isto ajuda o terapeuta a adaptar a linguagem desde a primeira sessão. Podes saltar esta pergunta.'
                : 'Usamos isto só para o matching — podes preferir um psicólogo do mesmo género.') + '</p>';
            html += '<div class="tri-opts">';
            genderOptions().forEach(function (v) {
                html += optionBtn('genero', v, v, a.genero === v);
            });
            html += '</div>';
            if (isCasal() && !state.genderExpanded) {
                html += '<button type="button" class="tri-more" data-expand="gender">Mostrar mais</button>';
            }
        } else if (step.id === 'orientation') {
            html += eyebrow('Passo 4 · opcional');
            html += '<h2>Como te identificas em termos de orientação?</h2>';
            html += '<p class="tri-quiz-why">Ajuda a Dra. Carolina Rocha a ter contexto relevante para a vossa relação. Podes saltar esta pergunta.</p>';
            html += '<div class="tri-opts">';
            orientationOptions().forEach(function (v) {
                html += optionBtn('orientation', v, v, a.orientation === v);
            });
            html += '</div>';
            if (!state.orientationExpanded) {
                html += '<button type="button" class="tri-more" data-expand="orientation">Mostrar mais</button>';
            }
        } else if (step.id === 'idade') {
            html += eyebrow(isCasal() ? 'Passo 2' : '');
            html += '<h2>Qual é a tua idade?</h2>';
            html += '<div class="tri-field"><input type="number" id="idade" name="idade" inputmode="numeric" min="16" max="120" placeholder="Ex.: 32" value="' + escapeHtml(a.idade) + '"></div>';
        } else if (step.id === 'relStatus') {
            html += eyebrow('Passo 5');
            html += '<h2>Qual é o vosso estado de relação?</h2>';
            html += '<div class="tri-opts">';
            REL_STATUS.forEach(function (v) {
                html += optionBtn('relStatus', v, v, a.relStatus === v);
            });
            html += '</div>';
            if (a.relStatus === 'Relação poliamorosa') {
                html += '<div class="tri-info"><b>Nota</b>Vamos ter isto em conta na terapia de casal, incluindo experiência em relações não-monogâmicas.</div>';
            }
        } else if (step.id === 'cohabit') {
            html += eyebrow('Passo 6');
            html += '<h2>Vivem atualmente juntos?</h2>';
            html += '<div class="tri-opts">';
            ['Sim', 'Não'].forEach(function (v) {
                html += optionBtn('cohabit', v, v, a.cohabit === v);
            });
            html += '</div>';
        } else if (step.id === 'dv') {
            html += eyebrow('Passo 7');
            html += '<h2>A violência doméstica é atualmente um problema na vossa relação?</h2>';
            html += '<p class="tri-quiz-why">Perguntamos isto a todos os casais — a resposta não é partilhada com o teu par.</p>';
            html += '<div class="tri-opts">';
            ['Sim', 'Não', 'Às vezes'].forEach(function (v) {
                html += optionBtn('dv', v, v, a.dv === v);
            });
            html += '</div>';
        } else if (step.id === 'dvSafety') {
            html += eyebrow('Antes de continuar');
            html += '<h2>A vossa segurança vem primeiro</h2>';
            html += '<div class="tri-safety"><b>O que acontece a seguir</b>Quando há violência ativa na relação, a terapia de casal conjunta nem sempre é o ponto de partida mais seguro. Um profissional da nossa equipa vai rever a vossa situação antes de qualquer sessão conjunta ser marcada. Se sentires que estás em perigo imediato, contacta já:</div>';
            html += '<ul class="triagem-emergency-list">';
            html += '<li><a href="tel:116006"><strong>116 006</strong> — APAV, apoio à vítima</a></li>';
            html += '<li><a href="tel:112"><strong>112</strong> — Emergência</a></li>';
            html += '</ul>';
        } else if (step.id === 'motivos') {
            html += eyebrow(isCasal() ? 'Passo 9' : '');
            html += '<h2>' + (isCasal() ? 'O que vos trouxe à terapia neste momento?' : 'O que te traz à terapia?') + '</h2>';
            html += '<p class="tri-quiz-why">Podes escolher mais do que uma opção.</p>';
            html += '<div class="tri-opts">';
            (isCasal() ? CASAL_MOTIVOS : MOTIVOS).forEach(function (v) {
                html += checkBtn('motivos', v, v, a.motivos.indexOf(v) !== -1);
            });
            html += '</div>';
            if (!isCasal()) {
                html += '<div class="tri-field" id="motivoOutroWrap"' + (a.motivos.indexOf('Outro') === -1 ? ' hidden' : '') + '>';
                html += '<input type="text" id="motivoOutro" maxlength="240" placeholder="Conta-nos um pouco mais" value="' + escapeHtml(a.motivoOutro) + '">';
                html += '</div>';
            } else {
                motivoFactsHtml(a.motivos).forEach(function (fact) {
                    html += '<div class="tri-info"><b>Sabia que?</b>' + escapeHtml(fact) + '</div>';
                });
            }
        } else if (step.id === 'expect') {
            html += eyebrow('Passo 10');
            html += '<h2>O que esperam do vosso terapeuta?</h2>';
            html += '<p class="tri-quiz-why">Um terapeuta que…</p>';
            html += '<div class="tri-opts">';
            CASAL_EXPECT.forEach(function (v) {
                html += checkBtn('expect', v, v, a.expect.indexOf(v) !== -1);
            });
            html += '</div>';
        } else if (step.id === 'duracao') {
            html += '<h2>Há quanto tempo sentes isto?</h2>';
            html += '<div class="tri-opts">';
            ['Menos de 1 mês', '1–6 meses', '6 meses – 1 ano', 'Mais de 1 ano'].forEach(function (v) {
                html += optionBtn('duracao', v, v, a.duracao === v);
            });
            html += '</div>';
        } else if (step.id === 'terapiaAntes') {
            html += eyebrow(isCasal() ? 'Passo 8' : '');
            html += '<h2>' + (isCasal() ? 'Já fizeram terapia de casal antes?' : 'Já fizeste terapia ou acompanhamento psicológico antes?') + '</h2>';
            html += '<div class="tri-opts">';
            ['Sim', 'Não'].forEach(function (v) {
                html += optionBtn('terapiaAntes', v, v, a.terapiaAntes === v);
            });
            html += '</div>';
            if (isCasal() && a.terapiaAntes === 'Sim') {
                html += '<div class="tri-field"><label for="priorNote">Sem entrar em detalhe, o que resultou ou não resultou dessa vez? (opcional)</label>';
                html += '<textarea id="priorNote" maxlength="600" rows="3">' + escapeHtml(a.priorNote) + '</textarea></div>';
            }
        } else if (step.id === 'prefPsicologa') {
            html += '<h2>Preferes que o teu psicólogo seja:</h2>';
            html += '<div class="tri-opts">';
            ['Sem preferência', 'Do mesmo género'].forEach(function (v) {
                html += optionBtn('prefPsicologa', v, v, a.prefPsicologa === v);
            });
            html += '</div>';
        } else if (step.id === 'contact') {
            html += renderContactStep(a);
        }
        quizMount.innerHTML = html;
        bindQuizInputs();
        var first = quizMount.querySelector('input:not([type="checkbox"]):not([type="radio"]), textarea');
        if (first && (step.type === 'number' || step.type === 'contact')) {
            try { first.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
        }
    }

    function genderOptions() {
        if (!isCasal()) return ['Feminino', 'Masculino', 'Prefiro não dizer', 'Outro'];
        var list = ['Mulher', 'Homem'];
        if (state.genderExpanded || GENDER_MORE.indexOf(state.answers.genero) !== -1) {
            state.genderExpanded = true;
            return list.concat(GENDER_MORE);
        }
        return list;
    }

    function orientationOptions() {
        if (state.orientationExpanded || ORIENTATION_MORE.indexOf(state.answers.orientation) !== -1) {
            state.orientationExpanded = true;
            return ORIENTATION_BASE.concat(ORIENTATION_MORE);
        }
        return ORIENTATION_BASE;
    }

    function motivoFactsHtml(selected) {
        var facts = [];
        (selected || []).forEach(function (s) {
            if (CASAL_MOTIVO_FACTS[s] && facts.indexOf(CASAL_MOTIVO_FACTS[s]) === -1) facts.push(CASAL_MOTIVO_FACTS[s]);
        });
        return facts.slice(0, 2);
    }

    function renderRiskQ9(a) {
        var sel = String(a.phq.q9 == null ? '' : a.phq.q9);
        var html = '<p class="tri-group-title">Nas últimas 2 semanas</p>';
        html += '<p class="tri-quiz-why">' + escapeHtml(PHQ9_ITEM) + '</p>';
        html += '<div class="tri-phq"><div class="tri-phq-item is-risk-q">';
        html += '<div class="tri-phq-scores" role="radiogroup" aria-label="' + escapeHtml(PHQ9_ITEM) + '">';
        SCORE_OPTIONS.forEach(function (opt) {
            html += '<label class="tri-phq-opt' + (sel === opt.value ? ' is-on' : '') + '">';
            html += '<input type="radio" name="phq9" value="' + opt.value + '" data-phq9' +
                (sel === opt.value ? ' checked' : '') + '>';
            html += '<span><strong>' + opt.value + '</strong><small>' + opt.label + '</small></span></label>';
        });
        html += '</div></div></div>';
        html += '<div class="triagem-risk" id="riskPanel"' + (state.riskFlagged ? '' : ' hidden') + ' role="alert">';
        html += '<h3>Contactos de emergência — prioridade clínica</h3>';
        html += '<p>A tua resposta indica que podes estar a passar por um momento de risco. <strong>Não esperes pelo fim deste questionário</strong> — usa já estes contactos se precisares de ajuda imediata:</p>';
        html += '<ul class="triagem-emergency-list">';
        html += '<li><a href="tel:112"><strong>112</strong> — Emergência</a></li>';
        html += '<li><a href="tel:808242424"><strong>808 24 24 24</strong> — SNS 24</a></li>';
        html += '<li><a href="tel:213544545"><strong>213 544 545</strong> — SOS Voz Amiga</a></li>';
        html += '</ul></div>';
        return html;
    }

    function renderContactStep(a) {
        var html = '';
        html += eyebrow(isCasal() ? 'Último passo' : '');
        html += '<h2>Quase lá.</h2>';
        if (isCasal()) {
            html += '<p class="tri-quiz-why">Indica o teu nome e email, e os do teu par, para mostrarmos os horários da Dra. Carolina Rocha.</p>';
            html += '<p class="tri-group-title">Quem está a marcar</p>';
        } else {
            html += '<p class="tri-quiz-why">Indica o teu nome, idade e email para te mostrarmos os horários disponíveis.</p>';
        }
        html += '<div class="tri-field"><label for="nome">Nome</label><input type="text" id="nome" name="nome" autocomplete="name" maxlength="120" value="' + escapeHtml(a.nome) + '"></div>';
        html += '<div class="tri-field"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="email" inputmode="email" maxlength="160" value="' + escapeHtml(a.email) + '"></div>';
        if (!isCasal()) {
            html += '<div class="tri-field"><label for="idade">Idade</label><input type="number" id="idade" name="idade" inputmode="numeric" min="16" max="120" placeholder="Ex.: 32" value="' + escapeHtml(a.idade) + '"></div>';
        }
        if (isCasal()) {
            html += '<p class="tri-group-title">O teu par</p>';
            html += '<div class="tri-field"><label for="partnerNome">Nome do teu par</label><input type="text" id="partnerNome" maxlength="120" value="' + escapeHtml(a.partnerNome) + '"></div>';
            html += '<div class="tri-field"><label for="partnerEmail">Email do teu par</label><input type="email" id="partnerEmail" inputmode="email" maxlength="160" value="' + escapeHtml(a.partnerEmail) + '"></div>';
            if (!state.parceiroConvite) {
                html += '<p class="tri-group-title">Podemos enviar o questionário ao teu par?</p>';
                html += '<p class="tri-quiz-why">Se disseres que sim, enviamos já um email com o link para completar a triagem.</p>';
                html += '<div class="tri-opts">';
                html += optionBtn('invitePartner', 'Sim', 'Sim, enviar agora', a.invitePartner === 'Sim');
                html += optionBtn('invitePartner', 'Não', 'Não, por agora', a.invitePartner === 'Não');
                html += '</div>';
            }
        }
        html += '<label class="tri-check"><input type="checkbox" id="termos"' + (a.termos ? ' checked' : '') + '><span>Li e aceito os <a href="/info.html?page=termos-condicoes" target="_blank" rel="noopener">Termos</a> e a <a href="/info.html?page=politica-privacidade" target="_blank" rel="noopener">Privacidade</a>.</span></label>';
        if (!isCasal() && !state.riskFlagged) {
            html += '<label class="tri-check"><input type="checkbox" id="semRisco"' + (a.semRisco ? ' checked' : '') + '><span>Confirmo que não estou em risco imediato neste momento.</span></label>';
        } else if (!isCasal() && state.riskFlagged) {
            html += '<p class="triagem-consent-note">Indicaste respostas de risco. Podes continuar — a equipa já foi sinalizada. Se estás em perigo imediato, liga <a href="tel:112">112</a>.</p>';
        }
        html += '<label class="tri-check tri-check--quiet"><input type="checkbox" id="comunicacoes"' + (a.comunicacoes ? ' checked' : '') + '><span>' +
            (isCasal()
                ? 'Aceito receber conteúdos úteis por email sobre relações. Posso cancelar quando quiser.'
                : 'Aceito receber comunicações sobre o acompanhamento (opcional).') +
            '</span></label>';
        return html;
    }

    function bindQuizInputs() {
        quizMount.querySelectorAll('.tri-opt input').forEach(function (input) {
            input.addEventListener('change', function () {
                var wrap = input.closest('.tri-opt');
                if (input.type === 'radio') {
                    quizMount.querySelectorAll('input[name="' + input.name + '"]').forEach(function (el) {
                        var lab = el.closest('.tri-opt');
                        if (lab) lab.classList.toggle('is-on', el.checked);
                    });
                    state.answers[input.name] = input.value;
                    if (input.name === 'dv') {
                        state.riskFlagged = dvRisk();
                        if (state.riskFlagged) pingDvAlert();
                    }
                    var stay = (isCasal() && (input.name === 'terapiaAntes' || input.name === 'relStatus' || input.name === 'invitePartner'))
                        || (currentStep().type === 'combo' && input.name === 'diagnostico');
                    if (stay) {
                        renderQuiz();
                        return;
                    }
                    if (currentStep().type === 'single' && pointerArmed && !isCasal()) {
                        pointerArmed = false;
                        clearAuto();
                        autoTimer = setTimeout(function () { advanceQuiz(); }, 220);
                    }
                } else {
                    if (wrap) wrap.classList.toggle('is-on', input.checked);
                    if (input.name === 'expect') {
                        state.answers.expect = selectedChecks('expect');
                    } else {
                        state.answers.motivos = selectedChecks('motivos');
                        var outroWrap = document.getElementById('motivoOutroWrap');
                        if (outroWrap) outroWrap.hidden = state.answers.motivos.indexOf('Outro') === -1;
                        if (isCasal() && currentStep().id === 'motivos') renderQuiz();
                    }
                }
            });
        });
        quizMount.querySelectorAll('.tri-phq-opt input').forEach(function (input) {
            input.addEventListener('change', function () {
                quizMount.querySelectorAll('input[name="' + input.name + '"]').forEach(function (el) {
                    var lab = el.closest('.tri-phq-opt');
                    if (lab) lab.classList.toggle('is-on', el.checked);
                });
                var n = input.name.replace('phq', '');
                state.answers.phq['q' + n] = Number(input.value);
                if (input.getAttribute('data-phq9') && Number(input.value) >= 1) {
                    flagRiskImmediate(Number(input.value));
                }
            });
        });
        quizMount.querySelectorAll('[data-expand]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.getAttribute('data-expand') === 'gender') state.genderExpanded = true;
                if (btn.getAttribute('data-expand') === 'orientation') state.orientationExpanded = true;
                renderQuiz();
            });
        });
        ['idade', 'nome', 'email', 'motivoOutro', 'partnerNome', 'partnerEmail', 'priorNote', 'diagnosticoQual'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', function () {
                state.answers[id] = el.value;
            });
        });
        ['termos', 'semRisco', 'comunicacoes', 'consentSaude'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', function () {
                state.answers[id] = el.checked;
            });
        });
    }

    function selectedChecks(name) {
        return Array.prototype.map.call(
            quizMount.querySelectorAll('input[name="' + name + '"]:checked'),
            function (el) { return el.value; }
        );
    }

    function flagRiskImmediate(score) {
        state.riskFlagged = true;
        var panel = document.getElementById('riskPanel');
        if (panel) {
            panel.hidden = false;
            requestAnimationFrame(function () {
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
        if (!state.riskNotified) {
            state.riskNotified = true;
            track('triagem_phq9_risk', { phq9_score: score });
            pingPriorityAlert(score);
        }
    }

    function pingPriorityAlert(score) {
        try {
            fetch('/api/triagem-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'phq9_q9',
                    score: score,
                    nome: String(state.answers.nome || '').slice(0, 120),
                    email: String(state.answers.email || '').slice(0, 160),
                    telefone: '',
                    partial: true
                }),
                keepalive: true
            }).catch(function () { /* non-blocking */ });
        } catch (err) { /* ignore */ }
    }

    function pingDvAlert() {
        if (state.riskNotified) return;
        state.riskNotified = true;
        track('triagem_dv_risk', { tipo_terapia: 'casal' });
        try {
            fetch('/api/triagem-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'dv',
                    score: 1,
                    nome: String(state.answers.nome || '').slice(0, 120),
                    email: String(state.answers.email || '').slice(0, 160),
                    telefone: '',
                    partial: true
                }),
                keepalive: true
            }).catch(function () { /* non-blocking */ });
        } catch (err) { /* ignore */ }
    }

    function validateQuiz() {
        var step = currentStep();
        var a = state.answers;
        formError.hidden = true;
        if (step.id === 'consent' && !a.consentSaude) return fail('Precisamos deste consentimento para continuar.');
        if (step.id === 'genero' && !step.optional && !a.genero) return fail('Escolhe uma opção para continuar.');
        if (step.id === 'idade') {
            var idade = Number(a.idade);
            if (!Number.isFinite(idade) || idade < 16 || idade > 120) return fail('Indica uma idade a partir dos 16 anos.');
        }
        if (step.id === 'relStatus' && !a.relStatus) return fail('Escolhe uma opção para continuar.');
        if (step.id === 'cohabit' && !a.cohabit) return fail('Escolhe uma opção para continuar.');
        if (step.id === 'dv' && !a.dv) return fail('Escolhe uma opção para continuar.');
        if (step.id === 'motivos') {
            a.motivos = selectedChecks('motivos');
            var outro = document.getElementById('motivoOutro');
            if (outro) a.motivoOutro = outro.value.trim();
            if (!a.motivos.length) return fail('Escolhe pelo menos um motivo.');
            if (!isCasal() && a.motivos.indexOf('Outro') !== -1 && !a.motivoOutro) return fail('Conta-nos um pouco mais.');
        }
        if (step.id === 'expect') {
            a.expect = selectedChecks('expect');
            if (!a.expect.length) return fail('Escolhe pelo menos uma opção.');
        }
        if (step.id === 'motivoDuracao') {
            a.motivos = selectedChecks('motivos');
            var outroMotivo = document.getElementById('motivoOutro');
            if (outroMotivo) a.motivoOutro = outroMotivo.value.trim();
            if (!a.motivos.length) return fail('Escolhe pelo menos um motivo.');
            if (a.motivos.indexOf('Outro') !== -1 && !a.motivoOutro) return fail('Conta-nos um pouco mais.');
            if (!a.duracao) return fail('Indica há quanto tempo sentes isto.');
        }
        if (step.id === 'prefs') {
            if (!a.prefPsicologa) return fail('Escolhe a preferência de psicólogo.');
            if (!a.horario) return fail('Escolhe o horário que te serve melhor.');
        }
        if (step.id === 'historico') {
            if (!a.terapiaAntes) return fail('Diz-nos se já fizeste terapia.');
            if (!a.medicacao) return fail('Diz-nos se tomas medicação.');
            if (!a.diagnostico) return fail('Diz-nos se tens um diagnóstico.');
            var diagEl = document.getElementById('diagnosticoQual');
            if (diagEl) a.diagnosticoQual = diagEl.value.trim();
            if (a.phq.q9 == null || a.phq.q9 === '') return fail('Responde à pergunta das últimas 2 semanas.');
            if (Number(a.phq.q9) >= 1) flagRiskImmediate(Number(a.phq.q9));
        }
        if (step.id === 'duracao' && !a.duracao) return fail('Escolhe uma opção para continuar.');
        if (step.id === 'terapiaAntes' && !a.terapiaAntes) return fail('Escolhe uma opção para continuar.');
        if (step.id === 'prefPsicologa' && !a.prefPsicologa) return fail('Escolhe uma opção para continuar.');
        if (step.id === 'contact') {
            a.nome = String((document.getElementById('nome') || {}).value || '').trim();
            a.email = String((document.getElementById('email') || {}).value || '').trim();
            a.termos = !!(document.getElementById('termos') || {}).checked;
            a.semRisco = !!(document.getElementById('semRisco') || {}).checked;
            a.comunicacoes = !!(document.getElementById('comunicacoes') || {}).checked;
            if (!a.nome) return fail('Indica o teu nome.');
            if (!EMAIL_RE.test(a.email)) return fail('Indica um email válido.');
            if (!isCasal()) {
                var idadeEl = document.getElementById('idade');
                if (idadeEl) a.idade = idadeEl.value;
                var idadeContacto = Number(a.idade);
                if (!Number.isFinite(idadeContacto) || idadeContacto < 16 || idadeContacto > 120) {
                    return fail('Indica uma idade a partir dos 16 anos.');
                }
            }
            if (!a.termos) return fail('Aceita os termos para continuar.');
            if (isCasal()) {
                a.partnerNome = String((document.getElementById('partnerNome') || {}).value || '').trim();
                a.partnerEmail = String((document.getElementById('partnerEmail') || {}).value || '').trim().toLowerCase();
                if (!a.partnerNome) return fail('Indica o nome do teu par.');
                if (!EMAIL_RE.test(a.partnerEmail)) return fail('Indica um email válido do teu par.');
                if (a.partnerEmail === a.email.toLowerCase()) return fail('O email do teu par tem de ser diferente do teu.');
                if (!state.parceiroConvite && a.invitePartner !== 'Sim' && a.invitePartner !== 'Não') {
                    return fail('Diz-nos se podemos enviar o questionário ao teu par.');
                }
            } else if (!state.riskFlagged && !a.semRisco) {
                return fail('Confirma que não estás em risco imediato, ou usa os contactos de emergência.');
            }
        }
        return true;
    }

    function fail(msg) {
        formError.textContent = msg;
        formError.hidden = false;
        return false;
    }

    function advanceQuiz() {
        if (!validateQuiz()) return;
        if (state.quizIndex >= totalQuiz() - 1) {
            submitQuiz();
            return;
        }
        goQuiz(state.quizIndex + 1);
    }

    function backQuiz() {
        clearAuto();
        if (state.quizIndex <= 0) {
            goChoice();
            return;
        }
        goQuiz(state.quizIndex - 1);
    }

    function collectPayload() {
        var a = state.answers;
        var motivos = a.motivos.slice();
        if (motivos.indexOf('Outro') !== -1 && a.motivoOutro) {
            motivos = motivos.map(function (m) {
                return m === 'Outro' ? 'Outro: ' + a.motivoOutro : m;
            });
        }
        var phq = {};
        var total = 0;
        if (!isCasal()) {
            phq.q9 = Number(a.phq.q9 || 0);
            total = phq.q9;
        }
        var payload = {
            nome: a.nome.trim(),
            idade: Number(a.idade),
            genero: a.genero,
            localizacao: '',
            email: a.email.trim(),
            telefone: '',
            tipoTerapia: state.tipoTerapia,
            motivos: motivos,
            duracao: a.duracao,
            phq: phq,
            phqTotal: total,
            phq9: isCasal() ? 0 : phq.q9,
            riskFlagged: isCasal() ? dvRisk() : state.riskFlagged,
            terapiaAntes: a.terapiaAntes,
            terapiaUtil: null,
            medicacao: isCasal() ? '' : a.medicacao,
            diagnostico: isCasal() ? '' : a.diagnostico,
            diagnosticoQual: isCasal() ? (a.priorNote || null) : (a.diagnosticoQual || null),
            prefPsicologa: a.prefPsicologa ? [a.prefPsicologa] : ['Sem preferência'],
            horario: a.horario || 'Sem preferência',
            encaminhamento: null,
            consentimentos: {
                semRiscoImediato: isCasal() ? !dvRisk() : (state.riskFlagged ? true : !!a.semRisco),
                dadosSaude: !!a.consentSaude,
                termos: !!a.termos,
                comunicacoes: !!a.comunicacoes
            }
        };
        if (isCasal()) {
            payload.orientation = a.orientation;
            payload.relStatus = a.relStatus;
            payload.cohabit = a.cohabit;
            payload.dv = a.dv;
            payload.expect = a.expect.slice();
            payload.parceiro = {
                nome: a.partnerNome.trim(),
                email: a.partnerEmail.trim().toLowerCase()
            };
            payload.invitePartner = !state.parceiroConvite && a.invitePartner === 'Sim';
            payload.parceiroConvite = !!state.parceiroConvite;
        }
        return payload;
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function initialsFromName(name) {
        var cleaned = String(name || '').replace(/\bDra?\.?\s+/gi, '').trim();
        var parts = cleaned.split(/\s+/).filter(Boolean);
        if (!parts.length) return 'P';
        return (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
    }

    function shortDisplayName(name) {
        var cleaned = String(name || '').replace(/\bDra?\.?\s+/gi, '').trim();
        var parts = cleaned.split(/\s+/).filter(Boolean);
        if (parts.length <= 2) return cleaned;
        return parts[0] + ' ' + parts[parts.length - 1];
    }

    function avatarHtml(pro, extraClass) {
        var name = (pro && pro.name) || '';
        var cls = extraClass || 'triagem-match-avatar';
        var fallback = '<span class="triagem-match-fallback" aria-hidden="true">' + escapeHtml(initialsFromName(name)) + '</span>';
        var img = pro && pro.photoUrl
            ? '<img src="' + escapeHtml(pro.photoUrl) + '" alt="' + escapeHtml(name) + '" onerror="this.remove()">'
            : '';
        return '<span class="' + cls + '">' + img + fallback + '</span>';
    }

    function formatSlotLabel(dateISO, time) {
        var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateISO || ''));
        if (!parts) return (dateISO || '') + ' · ' + (time || '');
        var d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
        var label = d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
        return label + ' · ' + time;
    }

    function renderMatch(match) {
        var wrap = document.getElementById('triagemMatch');
        var card = document.querySelector('.tri-quiz--done');
        var primary = document.getElementById('donePrimary');
        var doneMsg = document.getElementById('doneMessage');
        var crisisNote = document.getElementById('doneCrisisNote');
        var heading = card ? card.querySelector('h2') : null;
        if (!wrap) return;
        var list = match && Array.isArray(match.psychologists) ? match.psychologists : [];
        var fallbackHref = isCasal()
            ? '/marcar/terapia-casal-mensal?ref=triagem'
            : '/marcar/psicologia-mensal?ref=triagem';
        wrap.innerHTML = '';
        wrap.hidden = false;
        if (card) card.classList.add('has-match');
        if (heading) heading.textContent = isCasal() ? 'Os vossos horários' : 'Os teus horários';
        if (crisisNote) {
            crisisNote.hidden = !state.riskFlagged;
            if (isCasal() && state.riskFlagged) {
                crisisNote.innerHTML = 'Se estiveres em perigo imediato: <a href="tel:112">112</a> · <a href="tel:116006">APAV 116 006</a>.';
            }
        }
        if (primary) {
            primary.textContent = isCasal() ? 'Ver agenda de casal' : 'Ver a equipa';
            primary.className = 'lon-btn lon-btn-soft';
            if (isCasal()) primary.setAttribute('href', fallbackHref);
        }
        if (doneMsg) {
            if (isCasal()) {
                doneMsg.textContent = list.length
                    ? 'A terapia de casal é com a Dra. Carolina Rocha — escolhe um horário.'
                    : 'Ainda não há um horário publicado. Podes ver a agenda da Dra. Carolina Rocha.';
                if (state.inviteSent) {
                    doneMsg.textContent += ' Enviámos o questionário para o email do teu par.';
                }
            } else {
                doneMsg.textContent = list.length
                    ? 'Com base nas tuas respostas, estes são os psicólogos disponíveis agora — escolhe um horário.'
                    : 'Ainda não há um horário publicado neste momento. Podes ver a agenda da equipa.';
            }
        }

        if (!list.length) {
            wrap.innerHTML =
                '<p class="triagem-match-kicker">' + (isCasal() ? 'Dra. Carolina Rocha' : 'Marcar consulta') + '</p>' +
                '<article class="triagem-match-card">' +
                '<p class="triagem-match-bio">' + (isCasal()
                    ? 'Ainda não há um horário publicado neste momento. Podes ver a agenda da Dra. Carolina Rocha.'
                    : 'Ainda não há um horário publicado neste momento. Podes ver a agenda da equipa e escolher o psicólogo.') + '</p>' +
                '<a class="lon-btn lon-btn-primary" href="' + fallbackHref + '">Ver horários</a>' +
                '</article>';
            return;
        }

        var kicker = document.createElement('p');
        kicker.className = 'triagem-match-kicker';
        kicker.textContent = isCasal()
            ? 'Apenas Dra. Carolina Rocha'
            : (list.length === 1 ? 'A tua psicóloga' : 'Psicólogos disponíveis');
        wrap.appendChild(kicker);

        list.forEach(function (pro) {
            var article = document.createElement('article');
            article.className = 'triagem-match-card';
            var photo = avatarHtml(pro, 'triagem-match-avatar');
            var bio = pro.bio ? '<p class="triagem-match-bio">' + escapeHtml(pro.bio) + '</p>' : '';
            var hours = pro.hoursLabel
                ? '<p class="triagem-match-hours">' + escapeHtml(pro.hoursLabel) + '</p>'
                : '';
            var slots = (pro.slots || []).map(function (slot) {
                return '<a class="triagem-match-slot" href="' + escapeHtml(slot.href) + '">' +
                    escapeHtml(formatSlotLabel(slot.date, slot.time)) + '</a>';
            }).join('');
            var slotsBlock = slots
                ? '<div class="triagem-match-slots" aria-label="Horários disponíveis">' + slots + '</div>'
                : '';
            article.innerHTML =
                '<div class="triagem-match-head">' + photo +
                '<div><h3>' + escapeHtml(pro.name) + '</h3><p class="triagem-match-role">' +
                (isCasal() ? 'Psicóloga · terapia de casal' : 'Psicólogo(a)') +
                '</p></div></div>' +
                bio + hours + slotsBlock +
                '<a class="lon-btn lon-btn-primary" href="' + escapeHtml(pro.href || fallbackHref) + '">Marcar consulta</a>';
            wrap.appendChild(article);
        });

        var noslot = document.createElement('div');
        noslot.className = 'triagem-noslot';
        noslot.innerHTML =
            '<button type="button" class="triagem-noslot-cta" id="noSlotCta">Nenhum destes horários é adequado</button>' +
            '<p class="triagem-noslot-note" id="noSlotNote" hidden tabindex="-1">' +
            (isCasal()
                ? 'A nossa equipa contacta-vos ainda hoje para encontrar um horário que vos sirva.'
                : 'A nossa equipa contacta-te ainda hoje para encontrar um horário que te sirva.') +
            '</p>';
        wrap.appendChild(noslot);
        var cta = document.getElementById('noSlotCta');
        if (cta) cta.addEventListener('click', requestNoSlotFollowup);
    }

    function requestNoSlotFollowup() {
        if (state.noSlotAsked) return;
        state.noSlotAsked = true;
        var cta = document.getElementById('noSlotCta');
        var note = document.getElementById('noSlotNote');
        if (cta) cta.hidden = true;
        if (note) {
            note.hidden = false;
            if (typeof note.focus === 'function') note.focus();
        }
        track('triagem_no_slot', { tipo_terapia: state.tipoTerapia || 'individual' });
        try {
            fetch('/api/triagem-noslot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: String(state.answers.nome || '').slice(0, 120),
                    email: String(state.answers.email || '').slice(0, 160),
                    tipoTerapia: state.tipoTerapia || 'individual'
                }),
                keepalive: true
            }).catch(function () { /* non-blocking */ });
        } catch (err) { /* ignore */ }
    }

    async function submitQuiz() {
        quizNext.disabled = true;
        quizNext.textContent = 'A carregar horários…';
        formError.hidden = true;
            var payload = collectPayload();
            state.inviteSent = !!payload.invitePartner;
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
                phq_total: payload.phqTotal,
                tipo_terapia: payload.tipoTerapia || 'individual'
            });
            state.submitted = true;
            if (form) form.setAttribute('data-lon-form-submitted', '1');
            renderMatch(data.match);
            goDone();
        } catch (err) {
            formError.textContent = err.message || 'Erro de rede. Tenta novamente.';
            formError.hidden = false;
            quizNext.disabled = false;
            quizNext.textContent = 'Ver horários';
        }
    }

    function startWithTipo(tipo) {
        if (tipo === 'casal') {
            startCasalQuiz();
            return;
        }
        setTipoTerapia(tipo);
        track('triagem_start', { tipo_terapia: state.tipoTerapia });
        goQuiz(0);
    }

    function bind() {
        document.querySelectorAll('[data-tipo]').forEach(function (el) {
            el.addEventListener('click', function () {
                startWithTipo(el.getAttribute('data-tipo'));
            });
        });
        quizMount.addEventListener('pointerdown', function (e) {
            pointerArmed = !!(e.target && e.target.closest && e.target.closest('.tri-opt'));
        });
        quizNext.addEventListener('click', function () {
            advanceQuiz();
        });
        quizBack.addEventListener('click', function () {
            backQuiz();
        });
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            advanceQuiz();
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
        window.addEventListener('pagehide', function () {
            if (state.phase !== 'quiz' || state.submitted) return;
            track('triagem_exit', currentStepMeta());
        });
    }

    bind();
    state.parceiroConvite = readParceiroFromUrl();
    var urlTipo = readTipoFromUrl();
    if (state.parceiroConvite) {
        startCasalQuiz();
    } else if (urlTipo === 'casal') {
        startCasalQuiz();
    } else if (urlTipo) {
        setTipoTerapia(urlTipo);
        goQuiz(0);
    } else {
        goChoice();
    }
})();
