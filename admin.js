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

    let scheduleDirty = false;
    function markScheduleDirty() {
        scheduleDirty = true;
        updateSaveButtonState();
    }
    function updateSaveButtonState() {
        if (!saveScheduleBtn) return;
        if (scheduleDirty) {
            saveScheduleBtn.classList.add('admin-save-dirty');
            saveScheduleBtn.textContent = 'Save Schedule •';
        } else {
            saveScheduleBtn.classList.remove('admin-save-dirty');
            if (saveScheduleBtn.textContent !== '✓ Saved') {
                saveScheduleBtn.textContent = 'Save Schedule';
            }
        }
    }

    function weekdayDefaultsForDate(dateStr) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
        if (!m || !scheduleData || !scheduleData.workingHours) return { enabled: true, start: '09:00', end: '17:00' };
        const dateObj = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const wh = scheduleData.workingHours[dayNames[dateObj.getDay()]];
        if (!wh) return { enabled: true, start: '09:00', end: '17:00' };
        return { enabled: !!wh.enabled, start: wh.start || '09:00', end: wh.end || '17:00' };
    }

    function syncBulkInputsToSelection() {
        if (!scheduleData) return;
        if (selectedOverrideDates.size !== 1) return; // only auto-fill when exactly one day is selected
        const [dateStr] = Array.from(selectedOverrideDates);
        const existing = (scheduleData.dayOverrides || []).find((o) => o.date === dateStr);
        const source = existing || weekdayDefaultsForDate(dateStr);
        if (bulkOverrideStart) bulkOverrideStart.value = source.start || '09:00';
        if (bulkOverrideEnd) bulkOverrideEnd.value = source.end || '17:00';
        if (bulkOverrideEnabled) bulkOverrideEnabled.checked = source.enabled !== false;
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
                markScheduleDirty();
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

            const num = document.createElement('span');
            num.className = 'admin-override-day-num';
            num.textContent = String(d);
            btn.appendChild(num);

            const ov = overrideMap.get(dateKey);
            if (ov) {
                const label = document.createElement('span');
                label.className = 'admin-override-day-hours' + (ov.enabled ? '' : ' is-closed');
                label.textContent = ov.enabled ? `${ov.start.slice(0,5)}–${ov.end.slice(0,5)}` : 'Closed';
                btn.appendChild(label);
                btn.classList.add('admin-override-has-rule');
            }

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
                    syncBulkInputsToSelection();
                });
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
        adminContent.style.display = 'flex';
        setAdminPanel('schedule');
    }

    // ─── Admin panels (sidebar) ───
    const PANEL_META = {
        schedule: { title: 'Schedule', subtitle: 'Upcoming consultations' },
        patients: { title: 'Patients', subtitle: 'All consultations & follow-up tracking' },
        invitations: { title: 'Invitations', subtitle: 'Send and manage booking invites' },
        availability: { title: 'Availability', subtitle: 'Working hours, blocks & slot preview' },
        reviews: { title: 'Reviews', subtitle: 'Patient feedback from the website' }
    };
    let activeAdminPanel = 'schedule';
    let scheduleFilter = 'all';
    let upcomingCache = { consultations: [], counts: { all: 0, clinic: 0, patient: 0 } };

    const adminGreeting = document.getElementById('adminGreeting');
    const adminUserInfo = document.getElementById('adminUserInfo');
    const adminSidebarToggle = document.getElementById('adminSidebarToggle');
    const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
    const adminScheduleList = document.getElementById('adminScheduleList');
    const scheduleRefreshBtn = document.getElementById('scheduleRefreshBtn');

    const SERVICE_LABELS_ADMIN = {
        clinica_geral: 'Clínica geral',
        urgente: 'Urgente',
        infeccao_urinaria: 'Infeção urinária',
        travel: 'Travel medicine',
        saude_mental: 'Saúde mental',
        burnout: 'Burnout especializada',
        burnout_mensal: 'Anti-burnout (semanal)',
        burnout_programa: 'Programa anti-burnout',
        longevidade: 'Longevidade',
        renovacao: 'Renovação receita',
        longevity: 'Longevity Assessment',
        'longevity-plus': 'Longevity Plus',
        followup: 'Follow-up'
    };

    function closeAdminSidebar() {
        if (!adminContent) return;
        adminContent.classList.remove('sidebar-open');
        if (adminSidebarBackdrop) adminSidebarBackdrop.hidden = true;
    }

    function openAdminSidebar() {
        if (!adminContent) return;
        adminContent.classList.add('sidebar-open');
        if (adminSidebarBackdrop) adminSidebarBackdrop.hidden = false;
    }

    function setAdminPanel(panelId) {
        if (!PANEL_META[panelId]) panelId = 'schedule';
        activeAdminPanel = panelId;

        document.querySelectorAll('[data-admin-panel]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-admin-panel') === panelId);
        });
        document.querySelectorAll('[data-admin-panel-content]').forEach((el) => {
            const match = el.getAttribute('data-admin-panel-content') === panelId;
            el.hidden = !match;
            el.classList.toggle('is-active', match);
        });

        const meta = PANEL_META[panelId];
        if (adminGreeting) adminGreeting.textContent = meta.title;
        if (adminUserInfo) adminUserInfo.textContent = meta.subtitle;
        if (saveScheduleBtn) {
            saveScheduleBtn.style.display = panelId === 'availability' ? '' : 'none';
        }
        closeAdminSidebar();

        if (panelId === 'schedule') loadUpcomingConsultations();
        if (panelId === 'patients') loadPatientsTable();
        if (panelId === 'invitations') loadInvitations();
        if (panelId === 'reviews') loadAdminReviews();
    }

    document.querySelectorAll('[data-admin-panel]').forEach((btn) => {
        btn.addEventListener('click', () => {
            setAdminPanel(btn.getAttribute('data-admin-panel'));
        });
    });

    if (adminSidebarToggle) {
        adminSidebarToggle.addEventListener('click', () => {
            if (adminContent.classList.contains('sidebar-open')) closeAdminSidebar();
            else openAdminSidebar();
        });
    }
    if (adminSidebarBackdrop) {
        adminSidebarBackdrop.addEventListener('click', closeAdminSidebar);
    }

    function consultationDateKey(c) {
        const iso = (c.dateIso && String(c.dateIso).trim()) || '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
        const fromDate = String(c.date || '');
        const m = /^(\d{4}-\d{2}-\d{2})/.exec(fromDate);
        return m ? m[1] : fromDate || 'unknown';
    }

    function formatAgendaDayHeading(dateKey) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
        if (!m) return dateKey;
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return d.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function updateScheduleCounts(counts) {
        const c = counts || { all: 0, clinic: 0, patient: 0 };
        const elAll = document.getElementById('schedCountAll');
        const elClinic = document.getElementById('schedCountClinic');
        const elPatient = document.getElementById('schedCountPatient');
        if (elAll) elAll.textContent = String(c.all || 0);
        if (elClinic) elClinic.textContent = String(c.clinic || 0);
        if (elPatient) elPatient.textContent = String(c.patient || 0);
    }

    function renderUpcomingConsultations(list, counts) {
        if (!adminScheduleList) return;
        updateScheduleCounts(counts);
        const filtered = scheduleFilter === 'clinic' || scheduleFilter === 'patient'
            ? (list || []).filter((c) => c.source === scheduleFilter)
            : (list || []);

        if (!filtered.length) {
            const emptyMsg = scheduleFilter === 'clinic'
                ? 'No clinic-scheduled consultations upcoming.'
                : scheduleFilter === 'patient'
                    ? 'No patient-booked consultations upcoming.'
                    : 'No upcoming consultations.';
            adminScheduleList.innerHTML = `<p class="admin-empty-list">${emptyMsg}</p>`;
            return;
        }

        const byDay = new Map();
        filtered.forEach((c) => {
            const key = consultationDateKey(c);
            if (!byDay.has(key)) byDay.set(key, []);
            byDay.get(key).push(c);
        });

        const dayKeys = Array.from(byDay.keys()).sort();
        adminScheduleList.innerHTML = '';
        dayKeys.forEach((dayKey) => {
            const section = document.createElement('section');
            section.className = 'admin-agenda-day';
            const heading = document.createElement('h3');
            heading.className = 'admin-agenda-day-heading';
            heading.textContent = formatAgendaDayHeading(dayKey);
            section.appendChild(heading);

            byDay.get(dayKey).forEach((c) => {
                const item = document.createElement('article');
                const source = c.source === 'clinic' ? 'clinic' : 'patient';
                item.className = `admin-agenda-item is-${source}`;
                const time = String(c.time || '').slice(0, 5) || '—';
                const service = SERVICE_LABELS_ADMIN[c.service] || c.service || 'Consultation';
                const name = c.patientName || '—';
                const email = c.email || '';
                const ref = c.bookingRef || '';
                const badgeLabel = source === 'clinic' ? 'Clinic' : 'Patient';
                const comp = c.complimentary
                    ? '<span class="admin-agenda-comp">Complimentary</span>'
                    : (c.withoutInvoice
                        ? '<span class="admin-agenda-comp">No invoice</span>'
                        : '');
                item.innerHTML = `
                    <div class="admin-agenda-time">${escapeHtml(time)}</div>
                    <div class="admin-agenda-body">
                        <p class="admin-agenda-name">${escapeHtml(name)}</p>
                        <div class="admin-agenda-meta">
                            <span>${escapeHtml(service)}</span>
                            ${email ? `<span>${escapeHtml(email)}</span>` : ''}
                        </div>
                    </div>
                    <div class="admin-agenda-side">
                        <span class="admin-source-badge is-${source}">${badgeLabel}</span>
                        ${comp}
                        ${ref ? `<span class="admin-agenda-ref">${escapeHtml(ref)}</span>` : ''}
                        ${ref ? `<a class="btn btn-outline btn-sm" href="/clinic-portal">Open notes</a>` : ''}
                    </div>
                `;
                section.appendChild(item);
            });
            adminScheduleList.appendChild(section);
        });
    }

    async function loadUpcomingConsultations() {
        if (!adminScheduleList) return;
        try {
            const res = await fetch('/api/admin/upcoming-consultations');
            if (res.status === 401) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            upcomingCache = {
                consultations: data.consultations || [],
                counts: data.counts || { all: 0, clinic: 0, patient: 0 }
            };
            renderUpcomingConsultations(upcomingCache.consultations, upcomingCache.counts);
        } catch (err) {
            console.error('Load upcoming consultations:', err);
            adminScheduleList.innerHTML = '<p class="admin-empty-list">Could not load schedule.</p>';
        }
    }

    document.querySelectorAll('[data-schedule-filter]').forEach((chip) => {
        chip.addEventListener('click', () => {
            scheduleFilter = chip.getAttribute('data-schedule-filter') || 'all';
            document.querySelectorAll('[data-schedule-filter]').forEach((c) => {
                c.classList.toggle('is-active', c === chip);
            });
            renderUpcomingConsultations(upcomingCache.consultations, upcomingCache.counts);
        });
    });

    if (scheduleRefreshBtn) {
        scheduleRefreshBtn.addEventListener('click', () => loadUpcomingConsultations());
    }

    // ─── Patients table ───
    let patientsCache = [];
    let patientsSearchQuery = '';
    const patientsExpanded = new Set();
    const patientsEditing = new Set();
    const adminPatientsBody = document.getElementById('adminPatientsBody');
    const patientsSearch = document.getElementById('patientsSearch');
    const patientsRefreshBtn = document.getElementById('patientsRefreshBtn');

    const PATIENT_FREQ_OPTIONS = [
        { value: '', label: '—' },
        { value: 'once', label: 'Once' },
        { value: 'occasional', label: 'Once in a while' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'every_2_weeks', label: 'Every 2 weeks' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'every_6_weeks', label: 'Every 6 weeks' },
        { value: 'every_2_months', label: 'Every 2 months' },
        { value: 'quarterly', label: 'Every 3 months' },
        { value: 'as_needed', label: 'As needed' }
    ];

    const ICON_EDIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
    const ICON_DELETE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
    const ICON_DONE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
    const ICON_ADD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;

    function freqLabel(value) {
        const opt = PATIENT_FREQ_OPTIONS.find((o) => o.value === value);
        return opt ? opt.label : (value || '—');
    }

    function freqClass(value) {
        const v = String(value || '');
        if (!v) return 'is-empty';
        if (v === 'once' || v === 'occasional' || v === 'as_needed') return 'is-light';
        if (v === 'weekly' || v === 'every_2_weeks') return 'is-frequent';
        if (v === 'monthly' || v === 'every_6_weeks' || v === 'every_2_months' || v === 'quarterly') return 'is-periodic';
        return 'is-light';
    }

    function formatPatientConsultDate(p) {
        const iso = (p.dateIso && String(p.dateIso).trim()) || '';
        const time = String(p.time || '').slice(0, 5);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
            const label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
            return time ? `${label} · ${time}` : label;
        }
        return [p.date || '—', time].filter(Boolean).join(' · ');
    }

    function patientSortKey(p) {
        const iso = (p.dateIso && String(p.dateIso).trim()) || '';
        const time = String(p.time || '00:00').slice(0, 5);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T${time}`;
        return String(p.date || '') + time;
    }

    function groupPatientsByEmail(list) {
        const map = new Map();
        (list || []).forEach((p) => {
            const key = String(p.email || '').toLowerCase().trim() || `ref:${p.bookingRef}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(p);
        });
        const groups = [];
        map.forEach((consultations, emailKey) => {
            const sorted = [...consultations].sort((a, b) => patientSortKey(b).localeCompare(patientSortKey(a)));
            const active = sorted.filter((c) => !c.cancelled);
            const latest = sorted[0];
            const count = active.length || sorted.length;
            const paidN = active.filter((c) => c.markedPaid).length;
            const invoiceN = active.filter((c) => c.invoiceSent).length;
            const reviewAskN = active.filter((c) => c.reviewRequested).length;
            const professional = sorted.find((c) => c.professional)?.professional
                || latest.professional
                || '';
            const visitFrequency = sorted.find((c) => c.visitFrequency)?.visitFrequency || '';
            const storedType = sorted.find((c) => {
                const t = String(c.patientType || '');
                return t === 'Regular' || t === 'One-time' || t === 'regular' || t === 'one_time';
            })?.patientType;
            const normalizedStored = (() => {
                const s = String(storedType || '').toLowerCase().replace(/[\s-]+/g, '_');
                if (s === 'regular') return 'Regular';
                if (s === 'one_time' || s === 'onetime') return 'One-time';
                return '';
            })();
            groups.push({
                emailKey,
                email: latest.email || '',
                patientName: latest.patientName || '',
                patientPhone: sorted.find((c) => c.patientPhone)?.patientPhone || '',
                consultations: sorted,
                latest,
                consultationCount: count,
                patientType: normalizedStored || (count > 1 ? 'Regular' : 'One-time'),
                visitFrequency,
                professional,
                hasReviewed: sorted.some((c) => c.hasReviewed),
                reviewRating: sorted.find((c) => c.hasReviewed)?.reviewRating || null,
                paidN,
                invoiceN,
                reviewAskN,
                activeCount: active.length || sorted.length,
                primaryRef: latest.bookingRef
            });
        });
        groups.sort((a, b) => patientSortKey(b.latest).localeCompare(patientSortKey(a.latest)));
        return groups;
    }

    function filteredPatientGroups() {
        const q = patientsSearchQuery.trim().toLowerCase();
        const base = patientsCache;
        const filtered = !q
            ? base
            : base.filter((p) => {
                const hay = [
                    p.patientName, p.email, p.patientPhone, p.bookingRef, p.service, p.professional
                ].map((x) => String(x || '').toLowerCase()).join(' ');
                return hay.includes(q);
            });
        return groupPatientsByEmail(filtered);
    }

    function fractionLabel(n, total) {
        if (!total) return '—';
        if (n >= total) return 'All';
        if (n <= 0) return 'None';
        return `${n}/${total}`;
    }

    async function patchPatientField(bookingRef, patch) {
        const res = await fetch(`/api/admin/patients/${encodeURIComponent(bookingRef)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        const idx = patientsCache.findIndex((p) => p.bookingRef === bookingRef);
        if (idx >= 0) {
            patientsCache[idx] = { ...patientsCache[idx], ...patch, ...(data.patient || {}) };
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'visitFrequency')) {
            const row = patientsCache.find((p) => p.bookingRef === bookingRef);
            if (row && row.email) {
                const email = String(row.email).toLowerCase();
                patientsCache.forEach((x) => {
                    if (String(x.email || '').toLowerCase() === email) {
                        x.visitFrequency = patch.visitFrequency;
                    }
                });
            }
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'patientType')) {
            const row = patientsCache.find((p) => p.bookingRef === bookingRef);
            const label = patch.patientType === 'regular' || patch.patientType === 'Regular'
                ? 'Regular'
                : 'One-time';
            if (row && row.email) {
                const email = String(row.email).toLowerCase();
                patientsCache.forEach((x) => {
                    if (String(x.email || '').toLowerCase() === email) {
                        x.patientType = label;
                    }
                });
            }
        }
        return data.patient;
    }

    async function deletePatientConsultation(bookingRef) {
        const res = await fetch(`/api/admin/patients/${encodeURIComponent(bookingRef)}`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        patientsCache = patientsCache.filter((p) => p.bookingRef !== bookingRef);
        return data;
    }

    function freqOptionsHtml(selected) {
        return PATIENT_FREQ_OPTIONS.map((o) =>
            `<option value="${o.value}" ${String(selected || '') === o.value ? 'selected' : ''}>${o.label}</option>`
        ).join('');
    }

    function bindPatientFieldEditors(root) {
        root.querySelectorAll('[data-field]').forEach((el) => {
            const field = el.getAttribute('data-field');
            const ref = el.getAttribute('data-ref');
            const save = async () => {
                const patch = {};
                if (field === 'professional') patch.professional = el.value;
                else if (field === 'visitFrequency') patch.visitFrequency = el.value;
                else if (field === 'patientType') patch.patientType = el.value;
                else patch[field] = el.checked;
                try {
                    el.disabled = true;
                    await patchPatientField(ref, patch);
                    if (field === 'visitFrequency' || field === 'professional' || field === 'patientType') {
                        renderPatientsTable();
                        return;
                    }
                    const span = el.parentElement && el.parentElement.querySelector('span');
                    if (span) {
                        if (field === 'markedPaid') {
                            const row = patientsCache.find((x) => x.bookingRef === ref);
                            span.textContent = row && row.complimentary && el.checked ? 'Free' : (el.checked ? 'Yes' : 'No');
                        } else {
                            span.textContent = el.checked ? 'Yes' : 'No';
                        }
                    }
                    // Refresh summary fractions without losing expand state
                    renderPatientsTable();
                } catch (err) {
                    alert('Could not save: ' + err.message);
                    if (el.type === 'checkbox') el.checked = !el.checked;
                } finally {
                    el.disabled = false;
                }
            };
            if (el.type === 'checkbox' || el.tagName === 'SELECT') el.addEventListener('change', save);
            else {
                let t;
                el.addEventListener('change', save);
                el.addEventListener('input', () => {
                    clearTimeout(t);
                    t = setTimeout(save, 600);
                });
            }
        });
    }

    function renderPatientsTable() {
        if (!adminPatientsBody) return;
        const groups = filteredPatientGroups();
        if (!groups.length) {
            adminPatientsBody.innerHTML = `<tr><td colspan="12" class="admin-empty-list">${
                patientsCache.length ? 'No matches.' : 'No patients yet.'
            }</td></tr>`;
            return;
        }

        adminPatientsBody.innerHTML = '';
        groups.forEach((g) => {
            const expanded = patientsExpanded.has(g.emailKey);
            const editing = patientsEditing.has(g.emailKey);
            const canExpand = g.consultations.length > 0;
            const phone = g.patientPhone || '';
            const reviewedHtml = g.hasReviewed
                ? `<span class="admin-patients-yes">Yes${g.reviewRating ? ` · ${g.reviewRating}★` : ''}</span>`
                : '<span class="admin-patients-no">No</span>';
            const latestService = SERVICE_LABELS_ADMIN[g.latest.service] || g.latest.service || '—';
            const moreCount = Math.max(0, g.consultations.length - 1);
            const typeClass = g.patientType === 'Regular' ? 'regular' : 'onetime';

            const typeCell = editing
                ? `<select class="admin-select admin-patients-type-select" data-field="patientType" data-ref="${escapeHtml(g.primaryRef)}">
                        <option value="one_time" ${g.patientType === 'One-time' ? 'selected' : ''}>One-time</option>
                        <option value="regular" ${g.patientType === 'Regular' ? 'selected' : ''}>Regular</option>
                   </select>`
                : `<span class="admin-patients-type is-${typeClass}">${escapeHtml(g.patientType)}</span>`;

            const freqCell = editing
                ? `<select class="admin-select admin-patients-frequency" data-field="visitFrequency" data-ref="${escapeHtml(g.primaryRef)}">
                        ${freqOptionsHtml(g.visitFrequency)}
                   </select>`
                : `<span class="admin-patients-freq ${freqClass(g.visitFrequency)}">${escapeHtml(freqLabel(g.visitFrequency))}</span>`;

            const professionalCell = editing
                ? `<input type="text" class="admin-input admin-patients-professional" list="adminProfessionalsList"
                        data-field="professional" data-ref="${escapeHtml(g.primaryRef)}"
                        value="${escapeHtml(g.professional || '')}" placeholder="Professional">`
                : `<span class="admin-patients-pro-text">${escapeHtml(g.professional || '—')}</span>`;

            const summary = document.createElement('tr');
            summary.className = 'admin-patients-summary'
                + (expanded ? ' is-expanded' : '')
                + (editing ? ' is-editing' : '');
            summary.dataset.emailKey = g.emailKey;
            summary.innerHTML = `
                <td class="admin-patients-expand-cell">
                    ${canExpand ? `<button type="button" class="admin-patients-expand-btn" data-expand="${escapeHtml(g.emailKey)}" aria-expanded="${expanded}" title="Show consultations">
                        <span class="admin-patients-chevron">${expanded ? '▾' : '▸'}</span>
                    </button>` : ''}
                </td>
                <td>
                    <div class="admin-patients-name">${escapeHtml(g.patientName || '—')}</div>
                    ${g.consultations.length > 1
                        ? `<div class="admin-patients-ref">${g.consultations.length} consultations</div>`
                        : `<div class="admin-patients-ref">${escapeHtml(g.primaryRef || '')}</div>`}
                </td>
                <td>
                    <div class="admin-patients-contact">
                        <a href="mailto:${escapeHtml(g.email || '')}">${escapeHtml(g.email || '—')}</a>
                        ${phone ? `<span>${escapeHtml(phone)}</span>` : ''}
                    </div>
                </td>
                <td>
                    <div>${escapeHtml(formatPatientConsultDate(g.latest))}</div>
                    <div class="admin-patients-service">${escapeHtml(latestService)}${moreCount ? ` · +${moreCount} more` : ''}</div>
                </td>
                <td>
                    ${typeCell}
                    ${g.consultationCount > 1 ? `<span class="admin-patients-count">${g.consultationCount} visits</span>` : ''}
                </td>
                <td>${freqCell}</td>
                <td>${professionalCell}</td>
                <td><span class="admin-patients-frac ${g.paidN >= g.activeCount ? 'is-all' : (g.paidN ? 'is-partial' : 'is-none')}">${fractionLabel(g.paidN, g.activeCount)}</span></td>
                <td><span class="admin-patients-frac ${g.invoiceN >= g.activeCount ? 'is-all' : (g.invoiceN ? 'is-partial' : 'is-none')}">${fractionLabel(g.invoiceN, g.activeCount)}</span></td>
                <td><span class="admin-patients-frac ${g.reviewAskN >= g.activeCount ? 'is-all' : (g.reviewAskN ? 'is-partial' : 'is-none')}">${fractionLabel(g.reviewAskN, g.activeCount)}</span></td>
                <td>${reviewedHtml}</td>
                <td class="admin-patients-actions-cell">
                    <div class="admin-patients-actions">
                        <button type="button" class="admin-patients-icon-btn is-add" data-schedule-next="${escapeHtml(g.primaryRef)}" title="Schedule next appointment">
                            ${ICON_ADD}
                        </button>
                        <button type="button" class="admin-patients-icon-btn is-edit" data-edit-key="${escapeHtml(g.emailKey)}" title="${editing ? 'Done' : 'Edit'}">
                            ${editing ? ICON_DONE : ICON_EDIT}
                        </button>
                        <button type="button" class="admin-patients-icon-btn is-delete" data-delete-patient="${escapeHtml(g.emailKey)}" title="Delete">
                            ${ICON_DELETE}
                        </button>
                    </div>
                </td>
            `;
            adminPatientsBody.appendChild(summary);

            if (expanded) {
                const detail = document.createElement('tr');
                detail.className = 'admin-patients-detail-row';
                const rowsHtml = g.consultations.map((c) => {
                    const serviceLabel = SERVICE_LABELS_ADMIN[c.service] || c.service || '—';
                    const paidChecked = c.markedPaid === true;
                    const complimentary = c.complimentary === true;
                    return `
                        <tr class="${c.cancelled ? 'is-cancelled' : ''}">
                            <td>
                                <div>${escapeHtml(formatPatientConsultDate(c))}</div>
                                <div class="admin-patients-ref">${escapeHtml(c.bookingRef || '')}${c.cancelled ? ' · cancelled' : ''}</div>
                            </td>
                            <td>${escapeHtml(serviceLabel)}</td>
                            <td>
                                ${editing
                                    ? `<input type="text" class="admin-input admin-patients-professional" list="adminProfessionalsList"
                                        data-field="professional" data-ref="${escapeHtml(c.bookingRef)}"
                                        value="${escapeHtml(c.professional || '')}" placeholder="Professional">`
                                    : `<span class="admin-patients-pro-text">${escapeHtml(c.professional || '—')}</span>`}
                            </td>
                            <td class="admin-patients-check-cell">
                                <label class="admin-patients-check">
                                    <input type="checkbox" data-field="markedPaid" data-ref="${escapeHtml(c.bookingRef)}" ${paidChecked ? 'checked' : ''} ${editing ? '' : 'disabled'}>
                                    <span>${complimentary && paidChecked ? 'Free' : (paidChecked ? 'Yes' : 'No')}</span>
                                </label>
                            </td>
                            <td class="admin-patients-check-cell">
                                <label class="admin-patients-check">
                                    <input type="checkbox" data-field="invoiceSent" data-ref="${escapeHtml(c.bookingRef)}" ${c.invoiceSent ? 'checked' : ''} ${editing ? '' : 'disabled'}>
                                    <span>${c.invoiceSent ? 'Yes' : 'No'}</span>
                                </label>
                            </td>
                            <td class="admin-patients-check-cell">
                                <label class="admin-patients-check">
                                    <input type="checkbox" data-field="reviewRequested" data-ref="${escapeHtml(c.bookingRef)}" ${c.reviewRequested ? 'checked' : ''} ${editing ? '' : 'disabled'}>
                                    <span>${c.reviewRequested ? 'Yes' : 'No'}</span>
                                </label>
                            </td>
                            <td class="admin-patients-actions-cell">
                                <button type="button" class="admin-patients-icon-btn is-delete" data-delete-ref="${escapeHtml(c.bookingRef)}" title="Delete consultation">
                                    ${ICON_DELETE}
                                </button>
                            </td>
                        </tr>`;
                }).join('');
                detail.innerHTML = `
                    <td colspan="12">
                        <div class="admin-patients-detail">
                            <table class="admin-patients-detail-table">
                                <thead>
                                    <tr>
                                        <th>Consultation</th>
                                        <th>Service</th>
                                        <th>Professional</th>
                                        <th>Paid</th>
                                        <th>Invoice sent</th>
                                        <th>Review asked</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>${rowsHtml}</tbody>
                            </table>
                        </div>
                    </td>`;
                adminPatientsBody.appendChild(detail);
            }
        });

        adminPatientsBody.querySelectorAll('[data-expand]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const key = btn.getAttribute('data-expand');
                if (patientsExpanded.has(key)) patientsExpanded.delete(key);
                else patientsExpanded.add(key);
                renderPatientsTable();
            });
        });

        adminPatientsBody.querySelectorAll('[data-edit-key]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const key = btn.getAttribute('data-edit-key');
                if (!key) return;
                if (patientsEditing.has(key)) patientsEditing.delete(key);
                else {
                    patientsEditing.add(key);
                    patientsExpanded.add(key);
                }
                renderPatientsTable();
            });
        });

        adminPatientsBody.querySelectorAll('[data-schedule-next]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ref = btn.getAttribute('data-schedule-next');
                if (ref) openScheduleNextModal(ref);
            });
        });

        adminPatientsBody.querySelectorAll('[data-delete-ref]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ref = btn.getAttribute('data-delete-ref');
                if (!ref) return;
                if (!confirm(`Delete consultation ${ref}? This cannot be undone.`)) return;
                btn.disabled = true;
                try {
                    await deletePatientConsultation(ref);
                    renderPatientsTable();
                } catch (err) {
                    alert('Could not delete: ' + err.message);
                    btn.disabled = false;
                }
            });
        });

        adminPatientsBody.querySelectorAll('[data-delete-patient]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const key = btn.getAttribute('data-delete-patient');
                const group = groups.find((g) => g.emailKey === key);
                if (!group) return;
                const n = group.consultations.length;
                const msg = n > 1
                    ? `Delete all ${n} consultations for ${group.patientName || group.email}? This cannot be undone.`
                    : `Delete consultation ${group.primaryRef}? This cannot be undone.`;
                if (!confirm(msg)) return;
                btn.disabled = true;
                try {
                    for (const c of group.consultations) {
                        await deletePatientConsultation(c.bookingRef);
                    }
                    patientsEditing.delete(key);
                    patientsExpanded.delete(key);
                    renderPatientsTable();
                } catch (err) {
                    alert('Could not delete: ' + err.message);
                    btn.disabled = false;
                    renderPatientsTable();
                }
            });
        });

        adminPatientsBody.querySelectorAll('tr.admin-patients-summary').forEach((tr) => {
            tr.addEventListener('click', (e) => {
                if (e.target.closest('input, select, a, button, label')) return;
                const key = tr.dataset.emailKey;
                if (!key) return;
                const group = groups.find((g) => g.emailKey === key);
                if (!group || group.consultations.length < 1) return;
                if (patientsExpanded.has(key)) patientsExpanded.delete(key);
                else patientsExpanded.add(key);
                renderPatientsTable();
            });
        });

        bindPatientFieldEditors(adminPatientsBody);
    }

    async function loadPatientsTable() {
        if (!adminPatientsBody) return;
        try {
            const res = await fetch('/api/admin/patients');
            if (res.status === 401) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            patientsCache = data.patients || [];
            renderPatientsTable();
        } catch (err) {
            console.error('Load patients:', err);
            adminPatientsBody.innerHTML = '<tr><td colspan="12" class="admin-empty-list">Could not load patients.</td></tr>';
        }
    }

    if (patientsSearch) {
        patientsSearch.addEventListener('input', () => {
            patientsSearchQuery = patientsSearch.value || '';
            renderPatientsTable();
        });
    }
    if (patientsRefreshBtn) {
        patientsRefreshBtn.addEventListener('click', () => loadPatientsTable());
    }

    // ─── Schedule next appointment modal ───
    const scheduleNextModal = document.getElementById('scheduleNextModal');
    const scheduleNextForm = document.getElementById('scheduleNextForm');
    const scheduleNextSourceRef = document.getElementById('scheduleNextSourceRef');
    const scheduleNextPatientLabel = document.getElementById('scheduleNextPatientLabel');
    const scheduleNextDesc = document.getElementById('scheduleNextDesc');
    const scheduleNextService = document.getElementById('scheduleNextService');
    const scheduleNextProfessional = document.getElementById('scheduleNextProfessional');
    const scheduleNextDate = document.getElementById('scheduleNextDate');
    const scheduleNextTime = document.getElementById('scheduleNextTime');
    const scheduleNextSuggestions = document.getElementById('scheduleNextSuggestions');
    const scheduleNextError = document.getElementById('scheduleNextError');
    const scheduleNextSubmit = document.getElementById('scheduleNextSubmit');
    let scheduleNextContext = null;

    function setScheduleNextError(msg) {
        if (!scheduleNextError) return;
        if (!msg) {
            scheduleNextError.style.display = 'none';
            scheduleNextError.textContent = '';
        } else {
            scheduleNextError.textContent = msg;
            scheduleNextError.style.display = '';
        }
    }

    function closeScheduleNextModal() {
        if (scheduleNextModal) scheduleNextModal.hidden = true;
        scheduleNextContext = null;
    }

    async function loadScheduleNextTimes(preferredTime) {
        if (!scheduleNextTime || !scheduleNextDate) return;
        const dateIso = scheduleNextDate.value;
        scheduleNextTime.innerHTML = '<option value="">Loading…</option>';
        if (!dateIso) {
            scheduleNextTime.innerHTML = '<option value="">Pick a date first…</option>';
            return;
        }
        try {
            const res = await fetch(`/api/admin/available-slots?date=${encodeURIComponent(dateIso)}&allSlots=1`);
            const data = await res.json();
            const slots = data.available || [];
            scheduleNextTime.innerHTML = '';
            if (!slots.length) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = data.reason || 'No slots available';
                scheduleNextTime.appendChild(opt);
                return;
            }
            slots.forEach((t) => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                scheduleNextTime.appendChild(opt);
            });
            const prefer = preferredTime || (scheduleNextContext && scheduleNextContext.suggestion && scheduleNextContext.suggestion.time);
            if (prefer && slots.includes(prefer)) scheduleNextTime.value = prefer;
            else scheduleNextTime.value = slots[0];
        } catch (err) {
            scheduleNextTime.innerHTML = '<option value="">Error loading slots</option>';
        }
    }

    function renderScheduleSuggestions(payload) {
        if (!scheduleNextSuggestions) return;
        const items = [];
        if (payload.suggestion) items.push(payload.suggestion);
        (payload.alternatives || []).forEach((a) => items.push(a));
        if (!items.length) {
            scheduleNextSuggestions.innerHTML = '<p class="admin-schedule-suggest-empty">No open slots found on the usual cadence — pick a date manually.</p>';
            return;
        }
        scheduleNextSuggestions.innerHTML = `
            <div class="admin-schedule-suggest-label">Suggestions</div>
            <div class="admin-schedule-suggest-list">
                ${items.map((s, idx) => `
                    <button type="button" class="admin-schedule-suggest-chip${idx === 0 ? ' is-primary' : ''}"
                        data-suggest-date="${escapeHtml(s.dateIso)}" data-suggest-time="${escapeHtml(s.time)}">
                        <strong>${escapeHtml(s.weekday || s.dateIso)}</strong>
                        <span>${escapeHtml(s.dateIso)} · ${escapeHtml(s.time)}</span>
                        ${s.exactTime ? '<em>same time</em>' : '<em>nearest time</em>'}
                    </button>
                `).join('')}
            </div>
            ${payload.suggestion && payload.suggestion.reason
                ? `<p class="admin-schedule-suggest-reason">${escapeHtml(payload.suggestion.reason)}</p>`
                : ''}
        `;
        scheduleNextSuggestions.querySelectorAll('[data-suggest-date]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const d = btn.getAttribute('data-suggest-date');
                const t = btn.getAttribute('data-suggest-time');
                if (scheduleNextDate) scheduleNextDate.value = d;
                await loadScheduleNextTimes(t);
            });
        });
    }

    async function openScheduleNextModal(bookingRef) {
        if (!scheduleNextModal) return;
        setScheduleNextError('');
        scheduleNextModal.hidden = false;
        if (scheduleNextPatientLabel) scheduleNextPatientLabel.textContent = 'Loading suggestion…';
        if (scheduleNextSuggestions) scheduleNextSuggestions.innerHTML = '';
        if (scheduleNextSourceRef) scheduleNextSourceRef.value = bookingRef;
        try {
            const res = await fetch(`/api/admin/patients/${encodeURIComponent(bookingRef)}/suggest-next`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            scheduleNextContext = data;
            const p = data.patient || {};
            if (scheduleNextPatientLabel) {
                scheduleNextPatientLabel.textContent = `${p.patientName || '—'} · ${p.email || ''}${
                    p.visitFrequency ? ` · ${freqLabel(p.visitFrequency)}` : ''
                }`;
            }
            if (scheduleNextDesc) {
                scheduleNextDesc.textContent = p.lastDateIso
                    ? `Last visit ${p.lastDateIso} at ${p.lastTime || '—'}. Suggested from recurrence and usual day/time.`
                    : 'Suggested from recurrence and last visit day/time.';
            }
            if (scheduleNextService && p.service) scheduleNextService.value = p.service;
            if (scheduleNextProfessional) scheduleNextProfessional.value = p.professional || '';
            const suggest = data.suggestion;
            if (scheduleNextDate) {
                scheduleNextDate.min = new Date().toISOString().slice(0, 10);
                scheduleNextDate.value = suggest ? suggest.dateIso : '';
            }
            renderScheduleSuggestions(data);
            await loadScheduleNextTimes(suggest ? suggest.time : (p.lastTime || ''));
        } catch (err) {
            setScheduleNextError(err.message || 'Could not load suggestion');
            if (scheduleNextPatientLabel) scheduleNextPatientLabel.textContent = '—';
        }
    }

    if (scheduleNextDate) {
        scheduleNextDate.addEventListener('change', () => loadScheduleNextTimes());
    }
    document.querySelectorAll('[data-close-schedule-modal]').forEach((el) => {
        el.addEventListener('click', closeScheduleNextModal);
    });
    if (scheduleNextForm) {
        scheduleNextForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setScheduleNextError('');
            const p = (scheduleNextContext && scheduleNextContext.patient) || {};
            const payload = {
                sourceBookingRef: scheduleNextSourceRef ? scheduleNextSourceRef.value : '',
                patientName: p.patientName,
                patientEmail: p.email,
                patientPhone: p.patientPhone || '',
                service: scheduleNextService ? scheduleNextService.value : p.service,
                dateIso: scheduleNextDate ? scheduleNextDate.value : '',
                time: scheduleNextTime ? scheduleNextTime.value : '',
                locale: p.locale || 'pt',
                professional: scheduleNextProfessional ? scheduleNextProfessional.value : '',
                visitFrequency: p.visitFrequency || '',
                patientType: p.patientType || 'regular'
            };
            if (!payload.dateIso || !payload.time) {
                setScheduleNextError('Pick a date and time.');
                return;
            }
            if (scheduleNextSubmit) {
                scheduleNextSubmit.disabled = true;
                scheduleNextSubmit.textContent = 'Confirming…';
            }
            try {
                const res = await fetch('/api/admin/patients/schedule-next', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                closeScheduleNextModal();
                await loadPatientsTable();
                loadUpcomingConsultations();
                if (data.emailDelivered === false) {
                    alert('Appointment created, but confirmation email failed: ' + (data.emailError || 'unknown'));
                }
            } catch (err) {
                setScheduleNextError(err.message || 'Failed to schedule');
            } finally {
                if (scheduleNextSubmit) {
                    scheduleNextSubmit.disabled = false;
                    scheduleNextSubmit.textContent = 'Confirm appointment';
                }
            }
        });
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
                markScheduleDirty();
                if (typeof updateWorkingHoursInModel === 'function') updateWorkingHoursInModel();
                renderOverrideCalendar();
            });
            dayCard.querySelectorAll('input[type="time"]').forEach((inp) => {
                inp.addEventListener('change', () => {
                    markScheduleDirty();
                    if (typeof updateWorkingHoursInModel === 'function') updateWorkingHoursInModel();
                    renderOverrideCalendar();
                });
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
                    markScheduleDirty();
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
                    markScheduleDirty();
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

    function updateWorkingHoursInModel() {
        if (!scheduleData) return;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (!scheduleData.workingHours) scheduleData.workingHours = {};
        days.forEach((day) => {
            const toggle = document.querySelector(`input[type="checkbox"][data-day="${day}"]`);
            const startInput = document.querySelector(`input[data-day="${day}"][data-type="start"]`);
            const endInput = document.querySelector(`input[data-day="${day}"][data-type="end"]`);
            if (toggle && startInput && endInput) {
                scheduleData.workingHours[day] = {
                    enabled: toggle.checked,
                    start: startInput.value,
                    end: endInput.value
                };
            }
        });
    }

    function applyOverrideToDates(dates, { clearSelection = true } = {}) {
        if (!scheduleData || !dates || dates.length === 0) return;
        const start = bulkOverrideStart && bulkOverrideStart.value ? bulkOverrideStart.value : '09:00';
        const end = bulkOverrideEnd && bulkOverrideEnd.value ? bulkOverrideEnd.value : '17:00';
        const enabled = bulkOverrideEnabled ? bulkOverrideEnabled.checked : true;
        const map = new Map((scheduleData.dayOverrides || []).map((o) => [o.date, { ...o }]));
        for (const dateStr of dates) {
            map.set(dateStr, { date: dateStr, enabled, start, end });
        }
        scheduleData.dayOverrides = Array.from(map.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
        );
        if (clearSelection) selectedOverrideDates.clear();
        renderOverrideCalendar();
        renderDayOverridesList();
        markScheduleDirty();
    }

    if (bulkOverrideApply) {
        bulkOverrideApply.addEventListener('click', () => {
            if (!scheduleData) return;
            if (selectedOverrideDates.size === 0) {
                alert('Select at least one future day in the calendar.');
                return;
            }
            applyOverrideToDates(Array.from(selectedOverrideDates));
        });
    }

    // Auto-apply when a single day is selected and the user tweaks the time inputs.
    // Multi-day selection still requires explicit "Apply to selected days" (avoids surprises).
    [bulkOverrideStart, bulkOverrideEnd, bulkOverrideEnabled].forEach((el) => {
        if (!el) return;
        el.addEventListener('change', () => {
            if (selectedOverrideDates.size === 1) {
                const onlyDate = Array.from(selectedOverrideDates)[0];
                applyOverrideToDates([onlyDate], { clearSelection: false });
            }
        });
    });

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
            markScheduleDirty();
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
            markScheduleDirty();
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
            markScheduleDirty();
        });
    }

    if (slotDurationSelect) {
        slotDurationSelect.addEventListener('change', markScheduleDirty);
    }
    if (bulkOverrideStart) bulkOverrideStart.addEventListener('change', () => { /* user-driven; no dirty until Apply */ });
    if (bulkOverrideEnd) bulkOverrideEnd.addEventListener('change', () => { /* same */ });

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

                const eff = data.effective || data.workingHours || null;
                if (eff) {
                    const banner = document.createElement('div');
                    banner.className = 'admin-preview-effective';
                    const source = eff.source === 'override'
                        ? 'Per-day override'
                        : eff.source === 'blocked'
                            ? 'Blocked date'
                            : 'Weekly default';
                    const hours = eff.enabled === false
                        ? 'Closed (no bookings)'
                        : `${(eff.start || '').slice(0,5)} – ${(eff.end || '').slice(0,5)}`;
                    banner.innerHTML = `<strong>${source}:</strong> ${hours}`;
                    if (scheduleData && scheduleData.smartSlotGrouping && eff.source !== 'override' && eff.enabled !== false) {
                        banner.innerHTML += ' <span class="admin-preview-note">· smart grouping ON — first &amp; last slot only until bookings exist</span>';
                    }
                    previewSlotsContainer.appendChild(banner);
                }

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
                    const empty = document.createElement('p');
                    empty.className = 'admin-preview-empty';
                    empty.textContent = `No available slots on ${new Date(date).toLocaleDateString()}. ${data.reason || 'This day may be disabled or fully blocked.'}`;
                    previewSlotsContainer.appendChild(empty);
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
                scheduleDirty = false;

                saveScheduleBtn.classList.remove('admin-save-dirty');
                saveScheduleBtn.textContent = '✓ Saved';
                setTimeout(() => {
                    if (!scheduleDirty) saveScheduleBtn.textContent = 'Save Schedule';
                    saveScheduleBtn.disabled = false;
                }, 2000);

                renderOverrideCalendar();
                renderDayOverridesList();
                if (previewDateInput && previewDateInput.value && previewSlotsBtn) {
                    previewSlotsBtn.click();
                }
                const inviteDateEl = document.getElementById('inviteDate');
                if (inviteDateEl && inviteDateEl.value && typeof loadInviteTimes === 'function') {
                    loadInviteTimes();
                }
            } catch (err) {
                console.error('Save error:', err);
                alert('Failed to save schedule. Please try again.');
                saveScheduleBtn.disabled = false;
                saveScheduleBtn.textContent = 'Save Schedule';
            }
        });
    }

    // ─── Booking invitations ───
    const inviteForm = document.getElementById('inviteForm');
    const inviteName = document.getElementById('inviteName');
    const inviteEmail = document.getElementById('inviteEmail');
    const invitePhone = document.getElementById('invitePhone');
    const inviteService = document.getElementById('inviteService');
    const inviteDate = document.getElementById('inviteDate');
    const inviteTime = document.getElementById('inviteTime');
    const inviteLocale = document.getElementById('inviteLocale');
    const inviteSubmitBtn = document.getElementById('inviteSubmitBtn');
    const inviteFormError = document.getElementById('inviteFormError');
    const inviteList = document.getElementById('inviteList');
    const inviteTravellers = document.getElementById('inviteTravellers');
    const inviteTravellersWrap = document.getElementById('inviteTravellersWrap');
    const inviteMedicare = document.getElementById('inviteMedicare');
    const inviteMedicareWrap = document.getElementById('inviteMedicareWrap');
    const inviteComputedPrice = document.getElementById('inviteComputedPrice');
    const inviteCustomPrice = document.getElementById('inviteCustomPrice');
    const inviteComplimentary = document.getElementById('inviteComplimentary');
    const inviteWithoutInvoice = document.getElementById('inviteWithoutInvoice');

    const SERVICE_BASE_CENTS = {
        clinica_geral: 3900,
        urgente: 3500,
        infeccao_urinaria: 3500,
        saude_mental: 6000,
        burnout: 7500,
        burnout_mensal: 5000,
        burnout_programa: 45000,
        longevidade: 7900,
        renovacao: 1900
    };
    const TRAVEL_TIER_CENTS = {
        standard: { 1: 3900, 2: 6900, 3: 10700, 4: 13600 },
        medicare: { 1: 3200, 2: 4200, 3: 4900, 4: 5500 }
    };

    function parseCustomPriceCents() {
        if (!inviteCustomPrice) return null;
        const raw = String(inviteCustomPrice.value || '').trim();
        if (!raw) return null;
        const euros = Number(raw.replace(',', '.'));
        if (!Number.isFinite(euros)) return null;
        return Math.round(euros * 100);
    }

    function computeInvitePriceCents() {
        const custom = parseCustomPriceCents();
        if (custom != null) return custom;
        const svc = inviteService ? inviteService.value : '';
        if (svc === 'travel') {
            const n = Math.max(1, Math.min(4, parseInt((inviteTravellers && inviteTravellers.value) || '1', 10)));
            const tier = inviteMedicare && inviteMedicare.checked ? 'medicare' : 'standard';
            return TRAVEL_TIER_CENTS[tier][n];
        }
        return SERVICE_BASE_CENTS[svc] || 0;
    }

    function refreshInvitePriceUI() {
        if (!inviteService) return;
        const isTravel = inviteService.value === 'travel';
        if (inviteTravellersWrap) inviteTravellersWrap.style.display = isTravel ? '' : 'none';
        if (inviteMedicareWrap) inviteMedicareWrap.style.display = isTravel ? '' : 'none';
        if (inviteComplimentary && inviteComplimentary.checked) {
            if (inviteWithoutInvoice) inviteWithoutInvoice.checked = true;
            if (inviteCustomPrice) {
                inviteCustomPrice.value = '0';
                inviteCustomPrice.disabled = true;
            }
            if (inviteComputedPrice) {
                inviteComputedPrice.textContent = 'Complimentary — free, confirmed immediately (no invoice)';
            }
            return;
        }
        if (inviteCustomPrice) inviteCustomPrice.disabled = false;
        if (inviteComputedPrice) {
            const custom = parseCustomPriceCents();
            const cents = computeInvitePriceCents();
            const noInvoice = inviteWithoutInvoice && inviteWithoutInvoice.checked;
            if (custom === 0) {
                inviteComputedPrice.textContent = 'Complimentary — free, confirmed immediately (no invoice)';
            } else if (cents > 0) {
                const label = custom != null ? 'Custom total' : 'Total';
                const mode = noInvoice
                    ? ' · confirm now, no payment invoice'
                    : ' · Stripe payment link';
                inviteComputedPrice.textContent = `${label}: €${(cents / 100).toFixed(2)}${mode}`;
            } else {
                inviteComputedPrice.textContent = '';
            }
        }
    }
    if (inviteService) inviteService.addEventListener('change', refreshInvitePriceUI);
    if (inviteTravellers) inviteTravellers.addEventListener('change', refreshInvitePriceUI);
    if (inviteMedicare) inviteMedicare.addEventListener('change', refreshInvitePriceUI);
    if (inviteCustomPrice) inviteCustomPrice.addEventListener('input', () => {
        if (inviteComplimentary && inviteCustomPrice.value !== '' && Number(inviteCustomPrice.value) === 0) {
            inviteComplimentary.checked = true;
        } else if (inviteComplimentary && inviteComplimentary.checked && Number(inviteCustomPrice.value) !== 0) {
            inviteComplimentary.checked = false;
        }
        refreshInvitePriceUI();
    });
    if (inviteComplimentary) {
        inviteComplimentary.addEventListener('change', () => {
            if (inviteComplimentary.checked && inviteCustomPrice) {
                inviteCustomPrice.value = '0';
                if (inviteWithoutInvoice) inviteWithoutInvoice.checked = true;
            } else if (!inviteComplimentary.checked && inviteCustomPrice && inviteCustomPrice.value === '0') {
                inviteCustomPrice.value = '';
            }
            refreshInvitePriceUI();
        });
    }
    if (inviteWithoutInvoice) {
        inviteWithoutInvoice.addEventListener('change', () => {
            if (!inviteWithoutInvoice.checked && inviteComplimentary && inviteComplimentary.checked) {
                inviteComplimentary.checked = false;
                if (inviteCustomPrice && inviteCustomPrice.value === '0') inviteCustomPrice.value = '';
            }
            refreshInvitePriceUI();
        });
    }
    refreshInvitePriceUI();

    function setInviteError(msg) {
        if (!inviteFormError) return;
        if (!msg) {
            inviteFormError.style.display = 'none';
            inviteFormError.textContent = '';
        } else {
            inviteFormError.textContent = msg;
            inviteFormError.style.display = '';
        }
    }

    async function loadInviteTimes() {
        if (!inviteTime || !inviteDate) return;
        const date = inviteDate.value;
        inviteTime.innerHTML = '';
        if (!date) {
            inviteTime.innerHTML = '<option value="">Pick a date first…</option>';
            return;
        }
        inviteTime.innerHTML = '<option value="">Loading…</option>';
        try {
            const res = await fetch(`/api/admin/available-slots?date=${encodeURIComponent(date)}&allSlots=1`);
            const data = await res.json();
            inviteTime.innerHTML = '';
            if (data.available && data.available.length > 0) {
                data.available.forEach((t) => {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.textContent = t;
                    inviteTime.appendChild(opt);
                });
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = data.reason ? `No slots — ${data.reason}` : 'No slots available';
                inviteTime.appendChild(opt);
            }
        } catch (err) {
            console.error('Load invite times error:', err);
            inviteTime.innerHTML = '<option value="">Error loading slots</option>';
        }
    }

    function renderInvitationList(invitations) {
        if (!inviteList) return;
        inviteList.innerHTML = '';
        if (!invitations || invitations.length === 0) {
            inviteList.innerHTML = '<p class="admin-empty-list">No invitations yet.</p>';
            return;
        }
        invitations.forEach((inv) => {
            const item = document.createElement('div');
            item.className = `admin-invite-item admin-invite-status-${inv.status}`;
            const dateLabel = (() => {
                const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inv.dateIso || '');
                if (!m) return inv.dateIso || '';
                return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                });
            })();
            const amountCents = Number(inv.amountCents || 0);
            const isComplimentary = amountCents === 0;
            const withoutStripe = inv.status === 'paid' && !inv.stripeSessionId;
            const amount = isComplimentary ? 'Complimentary' : `€${(amountCents / 100).toFixed(2)}`;
            const statusLabel = (() => {
                if (withoutStripe && isComplimentary) return 'Confirmed (free)';
                if (withoutStripe) return 'Confirmed (no invoice)';
                return ({
                    pending: 'Awaiting payment',
                    paid: 'Paid',
                    cancelled: 'Cancelled',
                    expired: 'Expired'
                }[inv.status] || inv.status);
            })();
            const paymentUrl = inv.stripeSessionUrl || '';
            let actions = '';
            if (inv.status === 'pending') {
                actions = `
                    ${paymentUrl ? `<button type="button" class="btn btn-outline btn-sm" data-invite-action="copy" data-invite-url="${paymentUrl}">Copy link</button>` : ''}
                    <button type="button" class="btn btn-outline btn-sm" data-invite-action="resend" data-invite-id="${inv.id}">Resend email</button>
                    <button type="button" class="btn btn-outline btn-sm admin-invite-cancel" data-invite-action="cancel" data-invite-id="${inv.id}">Cancel</button>
                `;
            } else if (withoutStripe) {
                actions = `
                    <button type="button" class="btn btn-outline btn-sm" data-invite-action="resend" data-invite-id="${inv.id}">Resend email</button>
                `;
            }
            const travellerSuffix = inv.travellerCount && inv.travellerCount > 1
                ? `<span>·</span><span>${inv.travellerCount} travellers${inv.hasInsurance ? ' · Medicare' : ''}</span>`
                : (inv.hasInsurance ? `<span>·</span><span>Medicare</span>` : '');
            item.innerHTML = `
                <div class="admin-invite-item-main">
                    <div class="admin-invite-item-name">${escapeHtml(inv.patientName)} <span class="admin-invite-item-email">· ${escapeHtml(inv.patientEmail)}</span></div>
                    <div class="admin-invite-item-meta">
                        <span>${escapeHtml(inv.serviceLabel || inv.service)}</span>
                        <span>·</span>
                        <span>${dateLabel} ${escapeHtml((inv.time || '').slice(0, 5))}</span>
                        <span>·</span>
                        <span>${amount}</span>
                        ${travellerSuffix}
                    </div>
                </div>
                <div class="admin-invite-item-side">
                    <span class="admin-invite-status-badge admin-invite-status-${inv.status}">${statusLabel}</span>
                    <div class="admin-invite-item-actions">${actions}</div>
                </div>
            `;
            inviteList.appendChild(item);
        });

        inviteList.querySelectorAll('[data-invite-action]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const action = btn.getAttribute('data-invite-action');
                const id = btn.getAttribute('data-invite-id');
                if (action === 'copy') {
                    const url = btn.getAttribute('data-invite-url');
                    if (!url) {
                        alert('No payment link for this invitation.');
                        return;
                    }
                    try {
                        await navigator.clipboard.writeText(url);
                        const original = btn.textContent;
                        btn.textContent = '✓ Copied';
                        setTimeout(() => { btn.textContent = original; }, 1500);
                    } catch (e) {
                        alert('Copy failed. Link: ' + url);
                    }
                    return;
                }
                if (action === 'resend' || action === 'cancel') {
                    const verb = action === 'resend' ? 'resend the email' : 'cancel this invitation (releases the slot)';
                    if (!confirm(`Are you sure you want to ${verb}?`)) return;
                    btn.disabled = true;
                    try {
                        const res = await fetch(`/api/admin/invitations/${id}/${action}`, { method: 'POST' });
                        if (!res.ok) {
                            const e = await res.json().catch(() => ({}));
                            throw new Error(e.error || `HTTP ${res.status}`);
                        }
                        await loadInvitations();
                    } catch (err) {
                        alert(`Failed: ${err.message}`);
                        btn.disabled = false;
                    }
                }
            });
        });
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    async function loadInvitations() {
        if (!inviteList) return;
        try {
            const res = await fetch('/api/admin/invitations');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderInvitationList(data.invitations || []);
        } catch (err) {
            console.error('Load invitations error:', err);
            inviteList.innerHTML = '<p class="admin-empty-list">Could not load invitations.</p>';
        }
    }

    if (inviteDate) {
        inviteDate.addEventListener('change', loadInviteTimes);
        const today = new Date().toISOString().split('T')[0];
        inviteDate.min = today;
    }

    if (inviteForm) {
        inviteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setInviteError('');
            const payload = {
                patientName: inviteName.value.trim(),
                patientEmail: inviteEmail.value.trim(),
                patientPhone: invitePhone.value.trim(),
                service: inviteService.value,
                dateIso: inviteDate.value,
                time: inviteTime.value,
                locale: inviteLocale.value,
                travellers: inviteService.value === 'travel'
                    ? parseInt((inviteTravellers && inviteTravellers.value) || '1', 10)
                    : 1,
                hasInsurance: inviteService.value === 'travel' && !!(inviteMedicare && inviteMedicare.checked)
            };
            const customCents = parseCustomPriceCents();
            if (inviteComplimentary && inviteComplimentary.checked) {
                payload.amountCents = 0;
            } else if (customCents != null) {
                if (customCents !== 0 && customCents < 50) {
                    setInviteError('Custom price must be €0 (complimentary) or at least €0.50.');
                    return;
                }
                payload.amountCents = customCents;
            }
            if (inviteWithoutInvoice && inviteWithoutInvoice.checked) {
                payload.confirmWithoutInvoice = true;
            }
            if (!payload.patientName || !payload.patientEmail || !payload.service || !payload.dateIso || !payload.time) {
                setInviteError('Please fill all required fields.');
                return;
            }
            const directConfirm = payload.amountCents === 0 || payload.confirmWithoutInvoice;
            inviteSubmitBtn.disabled = true;
            inviteSubmitBtn.textContent = directConfirm
                ? (payload.amountCents === 0 ? 'Confirming free booking…' : 'Confirming appointment…')
                : 'Sending payment link…';
            try {
                const res = await fetch('/api/admin/invitations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || `HTTP ${res.status}`);
                }
                const okLabel = payload.amountCents === 0
                    ? '✓ Free booking confirmed'
                    : (payload.confirmWithoutInvoice ? '✓ Appointment confirmed' : '✓ Invoice sent');
                inviteSubmitBtn.textContent = data.emailDelivered === false ? '⚠ Created (email failed)' : okLabel;
                if (data.emailDelivered === false) {
                    setInviteError(`Created but email could not be delivered (${data.emailError || 'unknown'}). Use “Resend email” below.`);
                }
                inviteForm.reset();
                if (inviteComplimentary) inviteComplimentary.checked = false;
                if (inviteWithoutInvoice) inviteWithoutInvoice.checked = false;
                if (inviteCustomPrice) inviteCustomPrice.disabled = false;
                inviteTime.innerHTML = '<option value="">Pick a date first…</option>';
                refreshInvitePriceUI();
                await loadInvitations();
                loadUpcomingConsultations();
                setTimeout(() => { inviteSubmitBtn.textContent = 'Create & send invitation'; inviteSubmitBtn.disabled = false; }, 2500);
            } catch (err) {
                console.error('Create invitation error:', err);
                setInviteError(err.message || 'Failed to send invitation');
                inviteSubmitBtn.textContent = 'Create & send invitation';
                inviteSubmitBtn.disabled = false;
            }
        });
    }

    if (inviteList) {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') loadInvitations();
        });
    }

    // ─── Patient reviews (admin) ───
    const adminReviewsList = document.getElementById('adminReviewsList');

    function renderAdminReviews(reviews) {
        if (!adminReviewsList) return;
        adminReviewsList.innerHTML = '';
        if (!reviews || reviews.length === 0) {
            adminReviewsList.innerHTML = '<p class="admin-empty-list">No reviews yet.</p>';
            return;
        }
        reviews.forEach((r) => {
            const item = document.createElement('div');
            item.className = 'admin-review-item' + (r.isPublic ? ' is-public' : ' is-private');
            const dateLabel = (() => {
                const d = new Date(r.createdAt);
                return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
            })();
            const excerpt = String(r.body || '').slice(0, 160) + (r.body && r.body.length > 160 ? '…' : '');
            item.innerHTML = `
                <div class="admin-review-main">
                    <div class="admin-review-meta-top">
                        <span class="admin-review-badge ${r.isPublic ? 'is-public' : 'is-private'}">${r.isPublic ? 'Public on site' : 'Private'}</span>
                        <span class="admin-review-rating">${'★'.repeat(Math.min(5, r.rating || 5))}</span>
                        <span class="admin-review-date">${escapeHtml(dateLabel)}</span>
                    </div>
                    <p class="admin-review-body">${escapeHtml(excerpt)}</p>
                    <div class="admin-review-author">${escapeHtml(r.authorName || 'Anonymous')} · ${escapeHtml(r.locale || 'pt')}${r.email ? ` · ${escapeHtml(r.email)}` : ''}</div>
                </div>
            `;
            adminReviewsList.appendChild(item);
        });
    }

    async function loadAdminReviews() {
        if (!adminReviewsList) return;
        try {
            const res = await fetch('/api/admin/reviews');
            if (res.status === 401) return;
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            renderAdminReviews(data.reviews || []);
        } catch (err) {
            console.error('Load admin reviews:', err);
            adminReviewsList.innerHTML = '<p class="admin-empty-list">Could not load reviews.</p>';
        }
    }

    // ─── Initialize ───
    await checkAuth();
    if (inviteList) loadInvitations();
    loadAdminReviews();
});
