(function () {
    'use strict';

    var form = document.getElementById('avaliacaoForm');
    if (!form) return;

    var TOTAL = 6;
    var step = 1;
    var submitting = false;

    var $ = function (id) { return document.getElementById(id); };

    function track(name, params) {
        if (typeof gtag === 'function') {
            gtag('event', name, Object.assign({
                event_category: 'nutricao_avaliacao',
                page_path: '/nutricao/avaliacao'
            }, params || {}));
        }
        if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
            window.LonAnalytics.track(name, Object.assign({ surface: 'nutricao-avaliacao' }, params || {}));
        }
    }

    function showStep(n) {
        step = n;
        for (var i = 1; i <= TOTAL; i++) {
            var el = $('screen-' + i);
            if (!el) continue;
            var on = i === n;
            el.hidden = !on;
            el.classList.toggle('is-active', on);
        }
        var result = $('screen-result');
        if (result) {
            result.hidden = true;
            result.classList.remove('is-active');
        }
        var wrap = $('progressWrap');
        if (wrap) wrap.hidden = false;
        var pct = Math.floor((n / TOTAL) * 100);
        if ($('stepLabel')) $('stepLabel').textContent = 'Passo ' + n + ' de ' + TOTAL;
        if ($('pctLabel')) $('pctLabel').textContent = pct + '%';
        if ($('progressBar')) $('progressBar').style.width = pct + '%';
        if ($('progressBarHost')) $('progressBarHost').setAttribute('aria-valuenow', String(n));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function selected(name) {
        var el = form.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : '';
    }

    function num(id) {
        var raw = String($(id).value || '').trim().replace(',', '.');
        return Number(raw);
    }

    function imcOf(kg, cm) {
        var m = cm / 100;
        if (!m) return null;
        return Math.round((kg / (m * m)) * 10) / 10;
    }

    function validateMetrics() {
        var age = num('age');
        var height = num('height');
        var weight = num('weight');
        var desired = num('desired');
        var err = $('metricsError');
        var msg = '';
        if (!Number.isFinite(age) || age < 16 || age > 90) msg = 'Indique uma idade entre 16 e 90 anos.';
        else if (!Number.isFinite(height) || height < 120 || height > 230) msg = 'Indique a altura em centímetros (ex.: 168).';
        else if (!Number.isFinite(weight) || weight < 30 || weight > 250) msg = 'Indique o peso atual em kg (ex.: 82).';
        else if (!Number.isFinite(desired) || desired < 30 || desired > 250) msg = 'Indique o peso desejado em kg (ex.: 70).';
        if (err) {
            err.hidden = !msg;
            err.textContent = msg;
        }
        return !msg;
    }

    function digits(s) {
        return String(s || '').replace(/\D/g, '');
    }

    function validateContact() {
        var name = String($('name').value || '').trim();
        var email = String($('email').value || '').trim();
        var phone = String($('phone').value || '').trim();
        var consent = $('consent') && $('consent').checked;
        var err = $('contactError');
        var msg = '';
        if (name.length < 2) msg = 'Indique o seu nome.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) msg = 'Indique um e-mail válido.';
        else if (digits(phone).length < 9) msg = 'Indique um telefone válido.';
        else if (!consent) msg = 'Para continuar, aceite os termos e a política de privacidade.';
        if (err) {
            err.hidden = !msg;
            err.textContent = msg;
        }
        return !msg;
    }

    function payload() {
        var height = num('height');
        var weight = num('weight');
        var eating = selected('eating');
        var plan = eating === 'frequent' ? 'completo' : 'nutricao';
        return {
            goal: selected('goal'),
            diets: selected('diets'),
            eating: eating,
            labs: selected('labs'),
            age: num('age'),
            height: height,
            weight: weight,
            desiredWeight: num('desired'),
            imc: imcOf(weight, height),
            name: String($('name').value || '').trim(),
            email: String($('email').value || '').trim().toLowerCase(),
            phone: String($('phone').value || '').trim(),
            plan: plan
        };
    }

    function storeForBooking(data) {
        try {
            sessionStorage.setItem('lonNutricaoAvaliacao', JSON.stringify({
                at: new Date().toISOString(),
                plan: data.plan,
                goal: data.goal,
                diets: data.diets,
                eating: data.eating,
                labs: data.labs,
                age: data.age,
                height: data.height,
                weight: data.weight,
                desiredWeight: data.desiredWeight,
                imc: data.imc,
                name: data.name,
                email: data.email,
                phone: data.phone
            }));
        } catch (e) { /* ignore */ }
    }

    function renderResults(data) {
        form.hidden = true;
        var wrap = $('progressWrap');
        if (wrap) wrap.hidden = true;
        var screen = $('screen-result');
        screen.hidden = false;
        screen.classList.add('is-active');

        var isComplete = data.plan === 'completo';
        $('resultKicker').textContent = 'Análise clínica concluída';
        $('resultTitle').textContent = isComplete
            ? 'Recomendamos o Programa Completo'
            : 'Recomendamos o Programa Nutrição';
        $('resultMessage').textContent = isComplete
            ? 'Identificámos que a ansiedade e o stress desempenham um papel crítico na gestão do seu peso. Para resultados sustentáveis, o acompanhamento emocional é indispensável.'
            : 'Com base no seu perfil, o seu principal desafio é a otimização metabólica e a reeducação alimentar contínua.';

        var bits = [];
        if (data.imc) bits.push('IMC aproximado ' + String(data.imc).replace('.', ','));
        if (data.weight && data.desiredWeight) {
            var delta = Math.round((data.weight - data.desiredWeight) * 10) / 10;
            if (delta > 0) bits.push('cerca de ' + String(delta).replace('.', ',') + ' kg até ao peso desejado');
        }
        $('resultMetrics').textContent = bits.join(' · ');

        var box = $('resultPlans');
        if (isComplete) {
            box.innerHTML =
                '<article class="mpq-plan is-featured">' +
                    '<p class="mpq-plan-label">Opção A · entrada flexível</p>' +
                    '<h2>Programa Completo</h2>' +
                    '<p class="mpq-plan-price">227 €</p>' +
                    '<p class="mpq-plan-then">no mês 1 · depois 187 €/mês (meses 2 a 6) · total 1 162 €</p>' +
                    '<p class="mpq-plan-then">Medicina, nutrição e 12 sessões de psicologia.</p>' +
                    '<a class="lon-btn lon-btn-dark js-mpq-book" data-plan="completo" href="/marcar/nutricao-completo?ref=avaliacao">Começar com 227 €</a>' +
                '</article>' +
                '<article class="mpq-plan">' +
                    '<p class="mpq-plan-label">Opção B · entrada reforçada</p>' +
                    '<h2>Mensalidade mais leve</h2>' +
                    '<p class="mpq-plan-price">322 €</p>' +
                    '<p class="mpq-plan-then">no mês 1 · depois 168 €/mês (meses 2 a 6) · total 1 162 €</p>' +
                    '<a class="lon-btn lon-btn-soft js-mpq-book" data-plan="completo_reforcado" href="/marcar/nutricao-completo-reforcado?ref=avaliacao">Começar com 322 €</a>' +
                '</article>';
        } else {
            box.innerHTML =
                '<article class="mpq-plan is-featured">' +
                    '<p class="mpq-plan-label">Plano recomendado</p>' +
                    '<h2>Programa Nutrição</h2>' +
                    '<p class="mpq-plan-price">115 €</p>' +
                    '<p class="mpq-plan-then">no mês 1 · depois 75 €/mês (meses 2 a 6) · total 490 €</p>' +
                    '<p class="mpq-plan-then">Medicina e nutrição durante 6 meses, com exames comparativos.</p>' +
                    '<a class="lon-btn lon-btn-dark js-mpq-book" data-plan="nutricao" href="/marcar/nutricao-programa?ref=avaliacao">Selecionar Plano Nutrição</a>' +
                '</article>' +
                '<p class="mpq-hint"><a href="/nutricao/programa#planos">Comparar com o Programa Completo</a> se também quiser psicologia quinzenal.</p>';
        }

        box.querySelectorAll('.js-mpq-book').forEach(function (a) {
            a.addEventListener('click', function () {
                track('cta_click', { event_label: a.getAttribute('data-plan') || 'book' });
            });
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
        track('quiz_complete', { event_label: data.plan });
    }

    document.querySelectorAll('.mpq-choice input[type="radio"]').forEach(function (input) {
        input.addEventListener('change', function () {
            var screen = input.closest('.mpq-screen');
            var n = screen ? Number(screen.getAttribute('data-step')) : 0;
            if (n >= 1 && n <= 4) {
                setTimeout(function () { showStep(n + 1); }, 180);
            }
        });
    });

    document.querySelectorAll('[data-prev]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (step > 1) showStep(step - 1);
        });
    });

    $('metricsNext').addEventListener('click', function () {
        if (validateMetrics()) showStep(6);
    });

    ['age', 'height', 'weight', 'desired'].forEach(function (id) {
        $(id).addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                $('metricsNext').click();
            }
        });
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (submitting) return;
        if (!selected('goal') || !selected('diets') || !selected('eating') || !selected('labs')) {
            showStep(1);
            return;
        }
        if (!validateMetrics()) {
            showStep(5);
            return;
        }
        if (!validateContact()) return;

        var data = payload();
        submitting = true;
        var btn = $('submitBtn');
        var prev = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'A preparar o resultado…';

        fetch('/api/nutricao-avaliacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(function () { return null; }).finally(function () {
            storeForBooking(data);
            track('quiz_complete', { event_label: data.plan });
            var dest = data.plan === 'completo'
                ? '/nutricao/programa?plano=completo&ref=avaliacao#pagamento'
                : '/nutricao/programa?plano=nutricao&ref=avaliacao#planos';
            window.location.href = dest;
        });
    });

    showStep(1);
    track('quiz_start');
})();
