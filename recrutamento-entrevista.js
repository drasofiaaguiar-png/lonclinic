(function () {
    'use strict';

    var MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    var form = document.getElementById('entForm');
    var submitBtn = document.getElementById('entSubmit');
    var errorEl = document.getElementById('entError');
    var calGrid = document.getElementById('entCalGrid');
    var calMonthEl = document.getElementById('entCalMonth');
    var timesGrid = document.getElementById('entTimesGrid');
    var timesHeading = document.getElementById('entTimesHeading');
    var screenForm = document.getElementById('screen-form');
    var screenDone = document.getElementById('screen-done');

    var state = {
        scheduleData: null,
        calMonth: new Date().getMonth(),
        calYear: new Date().getFullYear(),
        date: null,
        dateIso: '',
        dateLabel: '',
        time: null
    };

    function formatDateLocal(dateObj) {
        var year = dateObj.getFullYear();
        var month = String(dateObj.getMonth() + 1).padStart(2, '0');
        var day = String(dateObj.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function startOfDay(d) {
        var x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    }

    function isDateAvailable(dateObj) {
        var today = startOfDay(new Date());
        var max = startOfDay(new Date());
        max.setDate(max.getDate() + 60);
        if (dateObj < today || dateObj > max) return false;

        var dateStr = formatDateLocal(dateObj);
        var data = state.scheduleData;
        if (data && data.blockedDates && data.blockedDates.indexOf(dateStr) >= 0) {
            return false;
        }
        var overrides = data && data.dayOverrides;
        if (overrides && overrides.length) {
            for (var i = 0; i < overrides.length; i++) {
                if (overrides[i].date === dateStr) return !!overrides[i].enabled;
            }
        }
        var dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        var dayName = dayNames[dateObj.getDay()];
        if (data && data.workingHours) {
            var daySchedule = data.workingHours[dayName];
            if (!daySchedule || !daySchedule.enabled) return false;
        } else if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
            return false;
        }
        return true;
    }

    function renderCalendar() {
        if (!calGrid || !calMonthEl) return;
        calMonthEl.textContent = MONTHS[state.calMonth] + ' ' + state.calYear;
        calGrid.innerHTML = '';

        var first = new Date(state.calYear, state.calMonth, 1);
        var startPad = (first.getDay() + 6) % 7;
        var daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
        var today = startOfDay(new Date());

        for (var i = 0; i < startPad; i++) {
            var empty = document.createElement('span');
            empty.className = 'ent-cal-day is-empty';
            empty.setAttribute('aria-hidden', 'true');
            calGrid.appendChild(empty);
        }

        for (var d = 1; d <= daysInMonth; d++) {
            (function (day) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ent-cal-day';
                btn.textContent = String(day);
                var dateObj = new Date(state.calYear, state.calMonth, day);
                dateObj.setHours(0, 0, 0, 0);
                if (!isDateAvailable(dateObj)) {
                    btn.classList.add('is-disabled');
                    btn.disabled = true;
                } else {
                    btn.addEventListener('click', function () {
                        selectDate(dateObj, btn);
                    });
                }
                if (dateObj.getTime() === today.getTime()) btn.classList.add('is-today');
                if (state.date && dateObj.getTime() === state.date.getTime()) {
                    btn.classList.add('is-selected');
                }
                calGrid.appendChild(btn);
            })(d);
        }
    }

    function selectDate(dateObj, btn) {
        state.date = dateObj;
        state.dateIso = formatDateLocal(dateObj);
        state.dateLabel = dateObj.toLocaleDateString('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        state.time = null;
        calGrid.querySelectorAll('.ent-cal-day').forEach(function (el) {
            el.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        updateSubmit();
        renderTimeslots();
    }

    function filterPastSlots(slots) {
        if (!state.date) return slots;
        var today = startOfDay(new Date());
        if (state.date.getTime() !== today.getTime()) return slots;
        var now = new Date();
        var nowMins = now.getHours() * 60 + now.getMinutes();
        return slots.filter(function (slot) {
            var parts = String(slot).split(':').map(Number);
            return (parts[0] * 60 + parts[1]) > nowMins;
        });
    }

    function renderTimeslots() {
        if (!timesGrid || !timesHeading) return;
        if (!state.date) {
            timesHeading.textContent = 'Escolha primeiro um dia';
            timesGrid.innerHTML = '<p class="ent-times-empty">Selecione uma data à esquerda.</p>';
            return;
        }
        timesHeading.textContent = state.dateLabel;
        timesGrid.innerHTML = '<p class="ent-times-empty">A carregar horários…</p>';

        fetch('/api/admin/available-slots?date=' + encodeURIComponent(state.dateIso))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var available = filterPastSlots((data && data.available) ? data.available.slice() : []);
                timesGrid.innerHTML = '';
                if (!available.length) {
                    timesGrid.innerHTML = '<p class="ent-times-empty">Sem horários neste dia. Escolha outra data.</p>';
                    return;
                }
                available.forEach(function (slot) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'ent-slot';
                    b.textContent = slot;
                    b.addEventListener('click', function () {
                        state.time = slot;
                        timesGrid.querySelectorAll('.ent-slot').forEach(function (x) {
                            x.classList.remove('is-selected');
                        });
                        b.classList.add('is-selected');
                        updateSubmit();
                    });
                    timesGrid.appendChild(b);
                });
            })
            .catch(function () {
                timesGrid.innerHTML = '<p class="ent-times-empty">Não foi possível carregar os horários. Tente novamente.</p>';
            });
    }

    function showError(msg) {
        if (!errorEl) return;
        errorEl.textContent = msg || '';
        errorEl.classList.toggle('is-visible', !!msg);
    }

    function updateSubmit() {
        if (!submitBtn) return;
        var name = document.getElementById('entName').value.trim();
        var email = document.getElementById('entEmail').value.trim();
        var phone = document.getElementById('entPhone').value.trim();
        var role = document.getElementById('entRole').value;
        submitBtn.disabled = !(name && email && phone && role && state.dateIso && state.time);
    }

    ['entName', 'entEmail', 'entPhone', 'entRole', 'entNotes'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', updateSubmit);
        if (el) el.addEventListener('change', updateSubmit);
    });

    document.getElementById('entCalPrev').addEventListener('click', function () {
        state.calMonth -= 1;
        if (state.calMonth < 0) {
            state.calMonth = 11;
            state.calYear -= 1;
        }
        renderCalendar();
    });

    document.getElementById('entCalNext').addEventListener('click', function () {
        state.calMonth += 1;
        if (state.calMonth > 11) {
            state.calMonth = 0;
            state.calYear += 1;
        }
        renderCalendar();
    });

    form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        showError('');
        if (submitBtn.disabled) return;

        var payload = {
            name: document.getElementById('entName').value.trim(),
            email: document.getElementById('entEmail').value.trim(),
            phone: document.getElementById('entPhone').value.trim(),
            role: document.getElementById('entRole').value,
            notes: document.getElementById('entNotes').value.trim(),
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
                    return { ok: r.ok, status: r.status, data: data };
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
                    meta.textContent = (data.dateLabel || state.dateLabel) + ' · ' + (data.time || state.time) +
                        (data.bookingRef ? ' · ' + data.bookingRef : '');
                }
                if (doxyBtn && data.doxyUrl) {
                    doxyBtn.href = data.doxyUrl;
                }
                screenForm.classList.remove('is-active');
                screenForm.hidden = true;
                screenDone.hidden = false;
                screenDone.classList.add('is-active');
                window.scrollTo(0, 0);
            })
            .catch(function (err) {
                showError(err.message || 'Não foi possível confirmar. Tente novamente.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirmar entrevista';
                updateSubmit();
            });
    });

    fetch('/api/schedule')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
            state.scheduleData = d;
            renderCalendar();
        })
        .catch(function () {
            state.scheduleData = null;
            renderCalendar();
        });
})();
