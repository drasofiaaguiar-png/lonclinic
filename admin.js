/* ========================================
   Admin Portal — Schedule Management
======================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // ─── State ───
    let scheduleData = null;
    let overrideCalYear = null;
    let overrideCalMonth = null;
    const selectedOverrideDates = new Set();

    // ─── Elements ───
    const adminLogin = document.getElementById('adminLogin');
    const adminContent = document.getElementById('adminContent');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLoginError = document.getElementById('adminLoginError');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const saveScheduleBtn = document.getElementById('saveScheduleBtn');
    const workingHoursGrid = document.getElementById('workingHoursGrid');
    const slotDurationSelect = document.getElementById('slotDuration');
    const blockDateInput = document.getElementById('blockDateInput');
    const addBlockDateBtn = document.getElementById('addBlockDateBtn');
    const blockedDatesList = document.getElementById('blockedDatesList');
    const blockSlotDateInput = document.getElementById('blockSlotDateInput');
    const blockSlotTimeInput = document.getElementById('blockSlotTimeInput');
    const addBlockSlotBtn = document.getElementById('addBlockSlotBtn');
    const blockedSlotsList = document.getElementById('blockedSlotsList');
    const previewDateInput = document.getElementById('previewDateInput');
    const previewSlotsBtn = document.getElementById('previewSlotsBtn');
    const previewSlotsContainer = document.getElementById('previewSlotsContainer');
    const overrideCalPrev = document.getElementById('overrideCalPrev');
    const overrideCalNext = document.getElementById('overrideCalNext');
    const overrideCalMonthLabel = document.getElementById('overrideCalMonthLabel');
    const overrideCalGrid = document.getElementById('overrideCalGrid');
    const dayOverridesList = document.getElementById('dayOverridesList');
    const bulkOverrideStart = document.getElementById('bulkOverrideStart');
    const bulkOverrideEnd = document.getElementById('bulkOverrideEnd');
    const bulkOverrideEnabled = document.getElementById('bulkOverrideEnabled');
    const bulkOverrideApply = document.getElementById('bulkOverrideApply');
    const bulkOverrideRemove = document.getElementById('bulkOverrideRemove');
    const bulkOverrideSelectWeekdays = document.getElementById('bulkOverrideSelectWeekdays');
    const bulkOverrideClearSelection = document.getElementById('bulkOverrideClearSelection');

    function formatOverrideDateKey(y, m0, d) {
        return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    function startOfToday() {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }

    function ensureOverrideCalInitialized() {
        if (overrideCalYear === null || overrideCalMonth === null) {
            const t = new Date();
            overrideCalYear = t.getFullYear();
            overrideCalMonth = t.getMonth();
        }
    }

    function renderDayOverridesList() {
        if (!dayOverridesList || !scheduleData) return;
        dayOverridesList.innerHTML = '';
        const list = scheduleData.dayOverrides || [];
        if (list.length === 0) {
            dayOverridesList.innerHTML = '<p class="admin-empty-list">No per-day overrides yet</p>';
            return;
        }
        list.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'admin-blocked-item';
            const dateObj = new Date(`${entry.date}T12:00:00`);
            const formatted = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const hoursLabel = entry.enabled
                ? `${entry.start} – ${entry.end}`
                : 'Closed (no bookings)';
            item.innerHTML = `
                <span>${formatted}: ${hoursLabel}</span>
                <button type="button" class="admin-remove-btn" data-od="${entry.date}" aria-label="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            dayOverridesList.appendChild(item);
            item.querySelector('.admin-remove-btn').addEventListener('click', () => {
                scheduleData.dayOverrides = scheduleData.dayOverrides.filter((o) => o.date !== entry.date);
                selectedOverrideDates.delete(entry.date);
                renderDayOverridesList();
                renderOverrideCalendar();
            });
        });
    }

    function renderOverrideCalendar() {
        if (!overrideCalGrid || !overrideCalMonthLabel || !scheduleData) return;
        ensureOverrideCalInitialized();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        overrideCalMonthLabel.textContent = `${monthNames[overrideCalMonth]} ${overrideCalYear}`;

        const firstDay = new Date(overrideCalYear, overrideCalMonth, 1).getDay();
        const daysInMonth = new Date(overrideCalYear, overrideCalMonth + 1, 0).getDate();
        const startDay = (firstDay + 6) % 7;
        const today0 = startOfToday();

        overrideCalGrid.innerHTML = '';
        const overrideMap = new Map((scheduleData.dayOverrides || []).map((o) => [o.date, o]));

        for (let i = 0; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'admin-override-cal-empty';
            overrideCalGrid.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = formatOverrideDateKey(overrideCalYear, overrideCalMonth, d);
            const dateObj = new Date(overrideCalYear, overrideCalMonth, d);
            dateObj.setHours(0, 0, 0, 0);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'admin-override-day';
            btn.textContent = String(d);

            if (dateObj < today0) {
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => {
                    if (selectedOverrideDates.has(dateKey)) {
                        selectedOverrideDates.delete(dateKey);
                    } else {
                        selectedOverrideDates.add(dateKey);
                    }
                    renderOverrideCalendar();
                });
            }

            if (overrideMap.has(dateKey)) {
                btn.classList.add('admin-override-has-rule');
            }
            if (selectedOverrideDates.has(dateKey)) {
                btn.classList.add('admin-override-selected');
            }

            overrideCalGrid.appendChild(btn);
        }
    }

    // ─── Check authentication status ───
    async function checkAuth() {
        try {
            const res = await fetch('/api/clinic/auth-status');
            const data = await res.json();
            
            if (data.authenticated) {
                showAdminContent();
                await loadSchedule();
            } else {
                showLogin();
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            showLogin();
        }
    }

    // ─── Show login ───
    function showLogin() {
        adminLogin.style.display = 'flex';
        adminContent.style.display = 'none';
    }

    // ─── Show admin content ───
    function showAdminContent() {
        adminLogin.style.display = 'none';
        adminContent.style.display = 'block';
    }

    // ─── Login handler ───
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            adminLoginError.style.display = 'none';

            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;

            try {
                const res = await fetch('/api/clinic/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok) {
                    showAdminContent();
                    await loadSchedule();
                } else {
                    adminLoginError.textContent = data.error || 'Invalid username or password';
                    adminLoginError.style.display = 'block';
                }
            } catch (err) {
                adminLoginError.textContent = 'Connection error. Please try again.';
                adminLoginError.style.display = 'block';
            }
        });
    }

    // ─── Logout handler ───
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/clinic/logout', { method: 'POST' });
                showLogin();
                document.getElementById('adminUsername').value = '';
                document.getElementById('adminPassword').value = '';
            } catch (err) {
                console.error('Logout error:', err);
            }
        });
    }

    // ─── Load schedule ───
    async function loadSchedule() {
        try {
            const res = await fetch('/api/admin/schedule');
            if (!res.ok) throw new Error('Failed to load schedule');
            
            scheduleData = await res.json();
            renderSchedule();
        } catch (err) {
            console.error('Failed to load schedule:', err);
            alert('Failed to load schedule settings. Please refresh the page.');
        }
    }

    // ─── Render schedule ───
    function renderSchedule() {
        if (!scheduleData) return;

        // Render working hours
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        workingHoursGrid.innerHTML = '';

        days.forEach((day, idx) => {
            const dayData = scheduleData.workingHours[day] || { enabled: false, start: '09:00', end: '17:00' };
            
            const dayCard = document.createElement('div');
            dayCard.className = 'admin-day-card';
            dayCard.innerHTML = `
                <div class="admin-day-header">
                    <label class="admin-day-toggle">
                        <input type="checkbox" ${dayData.enabled ? 'checked' : ''} data-day="${day}">
                        <span class="admin-day-label">${dayLabels[idx]}</span>
                    </label>
                </div>
                <div class="admin-day-times" ${!dayData.enabled ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                    <div class="admin-time-group">
                        <label>Start</label>
                        <input type="time" value="${dayData.start}" data-day="${day}" data-type="start" class="admin-time-input">
                    </div>
                    <div class="admin-time-group">
                        <label>End</label>
                        <input type="time" value="${dayData.end}" data-day="${day}" data-type="end" class="admin-time-input">
                    </div>
                </div>
            `;
            workingHoursGrid.appendChild(dayCard);

            // Handle toggle
            const toggle = dayCard.querySelector('input[type="checkbox"]');
            toggle.addEventListener('change', (e) => {
                const timesDiv = dayCard.querySelector('.admin-day-times');
                if (e.target.checked) {
                    timesDiv.style.opacity = '1';
                    timesDiv.style.pointerEvents = 'auto';
                } else {
                    timesDiv.style.opacity = '0.5';
                    timesDiv.style.pointerEvents = 'none';
                }
            });
        });

        // Render slot duration
        if (slotDurationSelect) {
            slotDurationSelect.value = scheduleData.slotDuration || 30;
        }

        // Render blocked dates
        renderBlockedDates();
        renderBlockedSlots();

        if (!scheduleData.dayOverrides) {
            scheduleData.dayOverrides = [];
        }
        ensureOverrideCalInitialized();
        renderOverrideCalendar();
        renderDayOverridesList();

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        if (blockDateInput) blockDateInput.min = today;
        if (blockSlotDateInput) blockSlotDateInput.min = today;
        if (previewDateInput) previewDateInput.min = today;
    }

    // ─── Render blocked dates ───
    function renderBlockedDates() {
        if (!blockedDatesList || !scheduleData) return;

        blockedDatesList.innerHTML = '';

        if (scheduleData.blockedDates && scheduleData.blockedDates.length > 0) {
            scheduleData.blockedDates.forEach(date => {
                const item = document.createElement('div');
                item.className = 'admin-blocked-item';
                const dateObj = new Date(date);
                const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                item.innerHTML = `
                    <span>${formatted}</span>
                    <button type="button" class="admin-remove-btn" data-date="${date}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                `;
                blockedDatesList.appendChild(item);

                item.querySelector('.admin-remove-btn').addEventListener('click', () => {
                    scheduleData.blockedDates = scheduleData.blockedDates.filter(d => d !== date);
                    renderBlockedDates();
                });
            });
        } else {
            blockedDatesList.innerHTML = '<p class="admin-empty-list">No blocked dates</p>';
        }
    }

    // ─── Render blocked slots ───
    function renderBlockedSlots() {
        if (!blockedSlotsList || !scheduleData) return;

        blockedSlotsList.innerHTML = '';

        if (scheduleData.blockedTimeSlots && scheduleData.blockedTimeSlots.length > 0) {
            scheduleData.blockedTimeSlots.forEach(slot => {
                const item = document.createElement('div');
                item.className = 'admin-blocked-item';
                const dateObj = new Date(slot.date);
                const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                item.innerHTML = `
                    <span>${formatted} at ${slot.time}</span>
                    <button type="button" class="admin-remove-btn" data-date="${slot.date}" data-time="${slot.time}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                `;
                blockedSlotsList.appendChild(item);

                item.querySelector('.admin-remove-btn').addEventListener('click', () => {
                    scheduleData.blockedTimeSlots = scheduleData.blockedTimeSlots.filter(
                        s => !(s.date === slot.date && s.time === slot.time)
                    );
                    renderBlockedSlots();
                });
            });
        } else {
            blockedSlotsList.innerHTML = '<p class="admin-empty-list">No blocked time slots</p>';
        }
    }

    if (overrideCalPrev) {
        overrideCalPrev.addEventListener('click', () => {
            ensureOverrideCalInitialized();
            overrideCalMonth -= 1;
            if (overrideCalMonth < 0) {
                overrideCalMonth = 11;
                overrideCalYear -= 1;
            }
            renderOverrideCalendar();
        });
    }
    if (overrideCalNext) {
        overrideCalNext.addEventListener('click', () => {
            ensureOverrideCalInitialized();
            overrideCalMonth += 1;
            if (overrideCalMonth > 11) {
                overrideCalMonth = 0;
                overrideCalYear += 1;
            }
            renderOverrideCalendar();
        });
    }

    if (bulkOverrideApply) {
        bulkOverrideApply.addEventListener('click', () => {
            if (!scheduleData) return;
            if (selectedOverrideDates.size === 0) {
                alert('Select at least one future day in the calendar.');
                return;
            }
            const start = bulkOverrideStart && bulkOverrideStart.value ? bulkOverrideStart.value : '09:00';
            const end = bulkOverrideEnd && bulkOverrideEnd.value ? bulkOverrideEnd.value : '17:00';
            const enabled = bulkOverrideEnabled ? bulkOverrideEnabled.checked : true;
            const map = new Map((scheduleData.dayOverrides || []).map((o) => [o.date, { ...o }]));
            for (const dateStr of selectedOverrideDates) {
                map.set(dateStr, { date: dateStr, enabled, start, end });
            }
            scheduleData.dayOverrides = Array.from(map.values()).sort((a, b) =>
                a.date.localeCompare(b.date)
            );
            selectedOverrideDates.clear();
            renderOverrideCalendar();
            renderDayOverridesList();
        });
    }

    if (bulkOverrideRemove) {
        bulkOverrideRemove.addEventListener('click', () => {
            if (!scheduleData) return;
            if (selectedOverrideDates.size === 0) {
                alert('Select days to remove overrides from.');
                return;
            }
            for (const dateStr of selectedOverrideDates) {
                scheduleData.dayOverrides = (scheduleData.dayOverrides || []).filter(
                    (o) => o.date !== dateStr
                );
            }
            selectedOverrideDates.clear();
            renderOverrideCalendar();
            renderDayOverridesList();
        });
    }

    if (bulkOverrideSelectWeekdays) {
        bulkOverrideSelectWeekdays.addEventListener('click', () => {
            ensureOverrideCalInitialized();
            const y = overrideCalYear;
            const m = overrideCalMonth;
            const dim = new Date(y, m + 1, 0).getDate();
            const today0 = startOfToday();
            for (let d = 1; d <= dim; d++) {
                const dateObj = new Date(y, m, d);
                dateObj.setHours(0, 0, 0, 0);
                const dow = dateObj.getDay();
                if (dow >= 1 && dow <= 5 && dateObj >= today0) {
                    selectedOverrideDates.add(formatOverrideDateKey(y, m, d));
                }
            }
            renderOverrideCalendar();
        });
    }

    if (bulkOverrideClearSelection) {
        bulkOverrideClearSelection.addEventListener('click', () => {
            selectedOverrideDates.clear();
            renderOverrideCalendar();
        });
    }

    // ─── Add blocked date ───
    if (addBlockDateBtn) {
        addBlockDateBtn.addEventListener('click', () => {
            const date = blockDateInput.value;
            if (!date) {
                alert('Please select a date');
                return;
            }

            if (!scheduleData.blockedDates) {
                scheduleData.blockedDates = [];
            }

            if (scheduleData.blockedDates.includes(date)) {
                alert('This date is already blocked');
                return;
            }

            scheduleData.blockedDates.push(date);
            scheduleData.blockedDates.sort();
            blockDateInput.value = '';
            renderBlockedDates();
        });
    }

    // ─── Add blocked slot ───
    if (addBlockSlotBtn) {
        addBlockSlotBtn.addEventListener('click', () => {
            const date = blockSlotDateInput.value;
            const time = blockSlotTimeInput.value;
            
            if (!date || !time) {
                alert('Please select both date and time');
                return;
            }

            if (!scheduleData.blockedTimeSlots) {
                scheduleData.blockedTimeSlots = [];
            }

            if (scheduleData.blockedTimeSlots.some(s => s.date === date && s.time === time)) {
                alert('This time slot is already blocked');
                return;
            }

            scheduleData.blockedTimeSlots.push({ date, time });
            scheduleData.blockedTimeSlots.sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.time.localeCompare(b.time);
            });
            blockSlotDateInput.value = '';
            blockSlotTimeInput.value = '';
            renderBlockedSlots();
        });
    }

    // ─── Preview slots ───
    if (previewSlotsBtn) {
        previewSlotsBtn.addEventListener('click', async () => {
            const date = previewDateInput.value;
            if (!date) {
                alert('Please select a date');
                return;
            }

            try {
                const res = await fetch(`/api/admin/available-slots?date=${date}`);
                const data = await res.json();

                previewSlotsContainer.innerHTML = '';

                if (data.available && data.available.length > 0) {
                    const slotsGrid = document.createElement('div');
                    slotsGrid.className = 'admin-preview-grid';
                    data.available.forEach(slot => {
                        const slotBtn = document.createElement('div');
                        slotBtn.className = 'admin-preview-slot';
                        slotBtn.textContent = slot;
                        slotsGrid.appendChild(slotBtn);
                    });
                    previewSlotsContainer.appendChild(slotsGrid);
                } else {
                    previewSlotsContainer.innerHTML = `<p class="admin-preview-empty">No available slots on ${new Date(date).toLocaleDateString()}. ${data.reason || 'This day may be disabled or fully blocked.'}</p>`;
                }
            } catch (err) {
                console.error('Preview error:', err);
                previewSlotsContainer.innerHTML = '<p class="admin-preview-empty">Error loading preview. Please try again.</p>';
            }
        });
    }

    // ─── Save schedule ───
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', async () => {
            if (!scheduleData) {
                alert('Schedule data not loaded. Please refresh the page.');
                return;
            }

            // Collect working hours
            const workingHours = {};
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            days.forEach(day => {
                const toggle = document.querySelector(`input[type="checkbox"][data-day="${day}"]`);
                const startInput = document.querySelector(`input[data-day="${day}"][data-type="start"]`);
                const endInput = document.querySelector(`input[data-day="${day}"][data-type="end"]`);
                
                if (toggle && startInput && endInput) {
                    workingHours[day] = {
                        enabled: toggle.checked,
                        start: startInput.value,
                        end: endInput.value
                    };
                }
            });

            const payload = {
                workingHours,
                slotDuration: parseInt(slotDurationSelect.value),
                blockedDates: scheduleData.blockedDates || [],
                blockedTimeSlots: scheduleData.blockedTimeSlots || [],
                dayOverrides: scheduleData.dayOverrides || []
            };

            try {
                saveScheduleBtn.disabled = true;
                saveScheduleBtn.textContent = 'Saving...';

                const res = await fetch('/api/admin/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Failed to save');

                const data = await res.json();
                scheduleData = data.schedule;

                saveScheduleBtn.textContent = '✓ Saved';
                setTimeout(() => {
                    saveScheduleBtn.textContent = 'Save Schedule';
                    saveScheduleBtn.disabled = false;
                }, 2000);
            } catch (err) {
                console.error('Save error:', err);
                alert('Failed to save schedule. Please try again.');
                saveScheduleBtn.disabled = false;
                saveScheduleBtn.textContent = 'Save Schedule';
            }
        });
    }

    // ─── Initialize ───
    await checkAuth();
});
