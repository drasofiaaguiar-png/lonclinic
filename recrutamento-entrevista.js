(function () {
    'use strict';

    var form = document.getElementById('entForm');
    var submitBtn = document.getElementById('entSubmit');
    var errorEl = document.getElementById('entError');
    var daysEl = document.getElementById('entDays');
    var screenForm = document.getElementById('screen-form');
    var screenDone = document.getElementById('screen-done');
    var emailEl = document.getElementById('entEmail');

    var state = { dateIso: '', dateLabel: '', time: null };

    function showError(msg) {
        if (!errorEl) return;
        errorEl.textContent = msg || '';
        errorEl.classList.toggle('is-visible', !!msg);
    }

    function updateSubmit() {
        if (!submitBtn) return;
        var email = emailEl && emailEl.value.trim();
        submitBtn.disabled = !(email && state.dateIso && state.time);
    }

    function renderDays(days) {
        if (!daysEl) return;
        daysEl.innerHTML = '';
        if (!days || !days.length) {
            daysEl.innerHTML = '<p class="ent-times-empty">Não há horários disponíveis de momento.</p>';
            return;
        }
        days.forEach(function (day) {
            var wrap = document.createElement('div');
            wrap.className = 'ent-day';
            var h = document.createElement('h3');
            h.textContent = day.label;
            wrap.appendChild(h);
            var grid = document.createElement('div');
            grid.className = 'ent-times-grid';
            if (!day.slots || !day.slots.length) {
                var empty = document.createElement('p');
                empty.className = 'ent-times-empty';
                empty.textContent = 'Sem horários neste dia.';
                wrap.appendChild(empty);
            } else {
                day.slots.forEach(function (slot) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'ent-slot';
                    b.textContent = slot;
                    b.addEventListener('click', function () {
                        state.dateIso = day.dateIso;
                        state.dateLabel = day.label;
                        state.time = slot;
                        daysEl.querySelectorAll('.ent-slot').forEach(function (x) {
                            x.classList.remove('is-selected');
                        });
                        b.classList.add('is-selected');
                        updateSubmit();
                        if (window.LonAnalytics) {
                            window.LonAnalytics.track('slot_select', {
                                funnel: 'job_application',
                                surface: 'recruitment',
                                service: 'entrevista'
                            });
                        }
                    });
                    grid.appendChild(b);
                });
                wrap.appendChild(grid);
            }
            daysEl.appendChild(wrap);
        });
    }

    if (emailEl) {
        emailEl.addEventListener('input', updateSubmit);
        emailEl.addEventListener('change', updateSubmit);
    }

    form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        showError('');
        if (submitBtn.disabled) return;

        var payload = {
            email: emailEl.value.trim(),
            dateIso: state.dateIso,
            time: state.time
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'A confirmar…';

        fetch('/api/recrutamento/entrevista', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) {
                return r.json().then(function (data) {
                    return { ok: r.ok, data: data };
                });
            })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error((res.data && res.data.error) || 'Não foi possível confirmar. Tente outro horário.');
                }
                var data = res.data || {};
                var summary = document.getElementById('entDoneSummary');
                var meta = document.getElementById('entDoneMeta');
                var doxyBtn = document.getElementById('entDoxyBtn');
                if (summary) {
                    summary.textContent = 'A sua entrevista ficou reservada. Enviámos a confirmação para ' + payload.email + '.';
                }
                if (meta) {
                    meta.textContent = (data.dateLabel || state.dateLabel) + ' · ' + (data.time || state.time);
                }
                if (doxyBtn && data.doxyUrl) doxyBtn.href = data.doxyUrl;
                screenForm.classList.remove('is-active');
                screenForm.hidden = true;
                screenDone.hidden = false;
                screenDone.classList.add('is-active');
                window.scrollTo(0, 0);
                if (window.LonAnalytics) {
                    window.LonAnalytics.track('interview_booked', {
                        funnel: 'job_application',
                        surface: 'recruitment',
                        service: 'entrevista'
                    });
                    window.LonAnalytics.flush();
                }
            })
            .catch(function (err) {
                showError(err.message || 'Não foi possível confirmar. Tente novamente.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirmar entrevista';
                updateSubmit();
            });
    });

    fetch('/api/recrutamento/entrevista/slots?_=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (data) {
            renderDays(data && data.days);
        })
        .catch(function () {
            daysEl.innerHTML = '<p class="ent-times-empty">Não foi possível carregar os horários. Tente novamente.</p>';
        });
})();
