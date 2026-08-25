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
        if (!m || !scheduleData || !scheduleData.workingHours) return { enabled: true, start: '07:00', end: '17:00' };
        const dateObj = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const wh = scheduleData.workingHours[dayNames[dateObj.getDay()]];
        if (!wh) return { enabled: true, start: '07:00', end: '17:00' };
        return { enabled: !!wh.enabled, start: wh.start || '07:00', end: wh.end || '17:00' };
    }

    function syncBulkInputsToSelection() {
        if (!scheduleData) return;
        if (selectedOverrideDates.size !== 1) return; // only auto-fill when exactly one day is selected
        const [dateStr] = Array.from(selectedOverrideDates);
        const existing = (scheduleData.dayOverrides || []).find((o) => o.date === dateStr);
        const source = existing || weekdayDefaultsForDate(dateStr);
        if (bulkOverrideStart) bulkOverrideStart.value = source.start || '07:00';
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
    function safeDirectoryNext() {
        try {
            const next = new URLSearchParams(window.location.search).get('next') || '';
            if (!next.startsWith('/diretorio')) return '';
            if (next.startsWith('//') || next.includes('\\') || next.includes('://')) return '';
            return next;
        } catch (e) {
            return '';
        }
    }

    async function checkAuth() {
        try {
            const res = await fetch('/api/clinic/auth-status');
            const data = await res.json();
            
            if (data.authenticated) {
                if (data.role && data.role !== 'admin') {
                    window.location.href = '/clinic-portal';
                    return;
                }
                const next = safeDirectoryNext();
                if (next) {
                    window.location.replace(next);
                    return;
                }
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
        finances: { title: 'Finances', subtitle: 'Monthly revenue by patient' },
        analytics: { title: 'Analytics', subtitle: 'First-party acquisition, funnel and live sessions' },
        invitations: { title: 'Invitations', subtitle: 'Send and manage booking invites' },
        availability: { title: 'Availability', subtitle: 'Working hours, blocks & slot preview' },
        reviews: { title: 'Reviews', subtitle: 'Patient feedback from the website' },
        professionals: { title: 'Professionals & Doxy', subtitle: 'Clinician logins and video rooms' },
        psychologists: { title: 'Bolsa de Profissionais', subtitle: 'Candidaturas e pipeline de profissionais' },
        producers: { title: 'Diretório produtores', subtitle: 'Moderar candidaturas de produtores biológicos' }
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
    const TRAVEL_TIER_CENTS = {
        standard: { 1: 3900, 2: 6900, 3: 10700, 4: 13600 },
        medicare: { 1: 3200, 2: 4200, 3: 4900, 4: 5500 }
    };

    function radioValue(root, name, fallback) {
        const el = root && root.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : fallback;
    }

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
        if (panelId === 'finances') loadFinancesPanel();
        if (panelId === 'analytics') loadAnalyticsPanel();
        if (panelId === 'invitations') loadInvitations();
        if (panelId === 'reviews') loadAdminReviews();
        if (panelId === 'professionals') loadAdminProfessionals();
        if (panelId === 'psychologists') loadAdminPsychologists();
        if (panelId === 'producers') loadAdminProducers();
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
            const completedN = active.filter((c) => c.consultationCompleted).length;
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
                completedN,
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
            adminPatientsBody.innerHTML = `<tr><td colspan="13" class="admin-empty-list">${
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
                <td><span class="admin-patients-frac ${g.completedN >= g.activeCount ? 'is-all' : (g.completedN ? 'is-partial' : 'is-none')}">${fractionLabel(g.completedN, g.activeCount)}</span></td>
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
                                    <input type="checkbox" data-field="consultationCompleted" data-ref="${escapeHtml(c.bookingRef)}" ${c.consultationCompleted ? 'checked' : ''} ${editing ? '' : 'disabled'}>
                                    <span>${c.consultationCompleted ? 'Yes' : 'No'}</span>
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
                    <td colspan="13">
                        <div class="admin-patients-detail">
                            <table class="admin-patients-detail-table">
                                <thead>
                                    <tr>
                                        <th>Consultation</th>
                                        <th>Service</th>
                                        <th>Professional</th>
                                        <th>Paid</th>
                                        <th>Invoice sent</th>
                                        <th>Completed</th>
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
            loadAdminProfessionals();
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
    const scheduleNextSendInvoice = document.getElementById('scheduleNextSendInvoice');
    const scheduleNextNote = document.getElementById('scheduleNextNote');
    const scheduleNextPrice = document.getElementById('scheduleNextPrice');
    const scheduleNextTravelOptions = document.getElementById('scheduleNextTravelOptions');
    const scheduleNextTravelPrice = document.getElementById('scheduleNextTravelPrice');
    let scheduleNextContext = null;

    function scheduleNextHasInsurance() {
        return radioValue(scheduleNextTravelOptions, 'scheduleNextInsurance', 'no') === 'yes';
    }

    function scheduleNextTravellerCount() {
        return Math.max(1, Math.min(4, parseInt(radioValue(scheduleNextTravelOptions, 'scheduleNextTravellers', '1'), 10) || 1));
    }

    function refreshScheduleNextTravelUI() {
        const isTravel = scheduleNextService && scheduleNextService.value === 'travel';
        if (scheduleNextTravelOptions) {
            scheduleNextTravelOptions.hidden = !isTravel;
            scheduleNextTravelOptions.classList.toggle('is-insured', isTravel && scheduleNextHasInsurance());
        }
        if (!isTravel) {
            if (scheduleNextTravelPrice) scheduleNextTravelPrice.textContent = '';
            return;
        }
        const insured = scheduleNextHasInsurance();
        const n = scheduleNextTravellerCount();
        const tier = insured ? TRAVEL_TIER_CENTS.medicare : TRAVEL_TIER_CENTS.standard;
        if (scheduleNextTravelPrice) {
            const euros = (tier[n] / 100).toFixed(2);
            scheduleNextTravelPrice.textContent = `Total: €${euros} · ${n === 1 ? '1 pessoa' : n + ' pessoas'} · ${insured ? 'com seguro' : 'sem seguro'}`;
        }
    }
    if (scheduleNextService) scheduleNextService.addEventListener('change', refreshScheduleNextTravelUI);
    if (scheduleNextTravelOptions) scheduleNextTravelOptions.addEventListener('change', refreshScheduleNextTravelUI);

    function refreshScheduleNextNote() {
        if (!scheduleNextNote) return;
        if (scheduleNextSendInvoice && scheduleNextSendInvoice.checked) {
            scheduleNextNote.textContent = 'Will email a Stripe payment link and reserve the slot until they pay. The booking is confirmed after payment.';
        } else {
            scheduleNextNote.textContent = 'Confirms the slot now without a payment invoice. Patient still gets the confirmation email. Tick the box above to send an invoice instead.';
        }
    }
    if (scheduleNextSendInvoice) {
        scheduleNextSendInvoice.addEventListener('change', refreshScheduleNextNote);
    }

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
        if (scheduleNextModal) {
            scheduleNextModal.hidden = true;
            scheduleNextModal.setAttribute('hidden', '');
        }
        scheduleNextContext = null;
        if (scheduleNextForm) scheduleNextForm.reset();
        if (scheduleNextSendInvoice) scheduleNextSendInvoice.checked = false;
        if (scheduleNextPrice) scheduleNextPrice.value = '';
        if (scheduleNextSuggestions) scheduleNextSuggestions.innerHTML = '';
        setScheduleNextError('');
        refreshScheduleNextNote();
    }

    // Never show on load (CSS display:flex was overriding the hidden attribute)
    closeScheduleNextModal();

    function fillTimeDatalist(datalistId, slots, extraSlots) {
        const list = document.getElementById(datalistId);
        if (!list) return;
        const merged = [...new Set(['07:00', '08:00', ...(extraSlots || []), ...(slots || [])])].sort((a, b) => a.localeCompare(b));
        list.innerHTML = merged.map((t) => `<option value="${t}"></option>`).join('');
    }

    async function loadScheduleNextTimes(preferredTime) {
        if (!scheduleNextTime || !scheduleNextDate) return;
        const dateIso = scheduleNextDate.value;
        if (!dateIso) {
            fillTimeDatalist('scheduleNextTimeSlots', []);
            scheduleNextTime.value = '';
            return;
        }
        try {
            const res = await fetch(`/api/admin/available-slots?date=${encodeURIComponent(dateIso)}&allSlots=1`);
            const data = await res.json();
            const slots = data.available || [];
            fillTimeDatalist('scheduleNextTimeSlots', slots);
            const prefer = preferredTime || (scheduleNextContext && scheduleNextContext.suggestion && scheduleNextContext.suggestion.time);
            if (prefer) scheduleNextTime.value = prefer;
            else if (slots.length) scheduleNextTime.value = slots[0];
            else if (!scheduleNextTime.value) scheduleNextTime.value = '07:00';
        } catch (err) {
            fillTimeDatalist('scheduleNextTimeSlots', []);
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
        if (!scheduleNextModal || !bookingRef) return;
        setScheduleNextError('');
        scheduleNextContext = null;
        scheduleNextModal.hidden = false;
        scheduleNextModal.removeAttribute('hidden');
        if (scheduleNextPatientLabel) scheduleNextPatientLabel.textContent = 'Loading suggestion…';
        if (scheduleNextSuggestions) scheduleNextSuggestions.innerHTML = '';
        if (scheduleNextSourceRef) scheduleNextSourceRef.value = bookingRef;
        if (scheduleNextProfessional) scheduleNextProfessional.value = '';
        if (scheduleNextPrice) scheduleNextPrice.value = '';
        if (scheduleNextDate) scheduleNextDate.value = '';
        if (scheduleNextTime) scheduleNextTime.value = '';
        try {
            const res = await fetch(`/api/admin/patients/${encodeURIComponent(bookingRef)}/suggest-next`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            scheduleNextContext = data;
            const p = data.patient || {};
            if (!p.email) throw new Error('Missing patient');
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
            refreshScheduleNextTravelUI();
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
                patientType: p.patientType || 'regular',
                sendInvoice: !!(scheduleNextSendInvoice && scheduleNextSendInvoice.checked),
                travellers: (scheduleNextService && scheduleNextService.value === 'travel')
                    ? scheduleNextTravellerCount()
                    : 1,
                hasInsurance: !!(scheduleNextService && scheduleNextService.value === 'travel' && scheduleNextHasInsurance())
            };
            if (scheduleNextPrice) {
                const raw = String(scheduleNextPrice.value || '').trim();
                if (raw !== '') {
                    const euros = Number(raw.replace(',', '.'));
                    if (!Number.isFinite(euros) || euros < 0) {
                        setScheduleNextError('Enter a valid custom price (or leave empty).');
                        return;
                    }
                    const cents = Math.round(euros * 100);
                    if (cents !== 0 && cents < 50 && payload.sendInvoice) {
                        setScheduleNextError('Invoiced custom price must be €0 or at least €0.50.');
                        return;
                    }
                    payload.amountCents = cents;
                }
            }
            if (!payload.patientEmail || !payload.patientName) {
                setScheduleNextError('Missing patient — close and open again from the patient row (+).');
                return;
            }
            if (!payload.dateIso || !payload.time) {
                setScheduleNextError('Pick a date and time.');
                return;
            }
            if (scheduleNextSubmit) {
                scheduleNextSubmit.disabled = true;
                scheduleNextSubmit.textContent = payload.sendInvoice ? 'Sending invoice…' : 'Confirming…';
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
                if (typeof loadInvitations === 'function') loadInvitations();
                if (data.emailDelivered === false) {
                    alert(
                        (data.invoiceSent ? 'Invoice created, but email failed: ' : 'Appointment created, but confirmation email failed: ')
                        + (data.emailError || 'unknown')
                    );
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

    // ─── Finances panel ───
    let financesCache = null;
    const financesSummary = document.getElementById('financesSummary');
    const financesMonthsList = document.getElementById('financesMonthsList');
    const financesMonthSelect = document.getElementById('financesMonthSelect');
    const financesRefreshBtn = document.getElementById('financesRefreshBtn');

    function formatEuroFromCents(cents) {
        const n = Number(cents) || 0;
        return `€${(n / 100).toFixed(2)}`;
    }

    function renderFinancesPanel() {
        if (!financesSummary || !financesMonthsList || !financesCache) return;
        const months = financesCache.months || [];
        const filter = financesMonthSelect ? financesMonthSelect.value : '';
        const visible = filter ? months.filter((m) => m.month === filter) : months;
        const totals = filter && visible[0]
            ? {
                paidCents: visible[0].paidCents,
                unpaidCents: visible[0].unpaidCents,
                complimentaryCount: visible[0].complimentaryCount,
                stripeFeeCents: visible[0].stripeFeeCents,
                breakdown: visible[0].breakdown
            }
            : (financesCache.totals || { paidCents: 0, unpaidCents: 0, complimentaryCount: 0 });
        const bd = totals.breakdown || {};
        const stripePct = (bd.rates && bd.rates.stripePercent) != null ? bd.rates.stripePercent : 1.5;
        const stripeFixed = (bd.rates && bd.rates.stripeFixedCents) != null ? bd.rates.stripeFixedCents : 25;

        financesSummary.innerHTML = `
            <div class="admin-finances-cards">
                <div class="admin-finances-card is-paid">
                    <span class="admin-finances-card-label">Receita bruta</span>
                    <strong class="admin-finances-card-value">${formatEuroFromCents(totals.paidCents)}</strong>
                </div>
                <div class="admin-finances-card is-stripe">
                    <span class="admin-finances-card-label">Stripe (~${stripePct}% + €${(stripeFixed / 100).toFixed(2)})</span>
                    <strong class="admin-finances-card-value">${formatEuroFromCents(bd.stripeFeeCents || totals.stripeFeeCents || 0)}</strong>
                </div>
                <div class="admin-finances-card is-irs">
                    <span class="admin-finances-card-label">IRS (25%)</span>
                    <strong class="admin-finances-card-value">${formatEuroFromCents(bd.irsCents || 0)}</strong>
                </div>
                <div class="admin-finances-card is-ss">
                    <span class="admin-finances-card-label">SS (15%)</span>
                    <strong class="admin-finances-card-value">${formatEuroFromCents(bd.ssCents || 0)}</strong>
                </div>
                <div class="admin-finances-card is-net">
                    <span class="admin-finances-card-label">Líquido</span>
                    <strong class="admin-finances-card-value">${formatEuroFromCents(bd.netCents || 0)}</strong>
                </div>
                <div class="admin-finances-card is-unpaid">
                    <span class="admin-finances-card-label">Por receber</span>
                    <strong class="admin-finances-card-value">${formatEuroFromCents(totals.unpaidCents)}</strong>
                </div>
            </div>
            <p class="admin-finances-footnote">IRS e SS calculados sobre a receita bruta paga. Stripe só em pagamentos online (não em marcações manuais sem fatura). Valores estimativos.</p>
        `;

        if (!visible.length) {
            financesMonthsList.innerHTML = '<p class="admin-empty-list">Ainda não há consultas pagas.</p>';
            return;
        }

        financesMonthsList.innerHTML = visible.map((m) => {
            const mbd = m.breakdown || {};
            const patientsHtml = (m.patients || []).map((p) => {
                const pbd = p.breakdown || {};
                const consultLines = (p.consultations || []).map((c) => {
                    const svc = SERVICE_LABELS_ADMIN[c.service] || c.service || '—';
                    const when = c.dateIso || c.date || '—';
                    const status = c.complimentary ? 'Cortesia' : (c.paid ? 'Pago' : 'Por receber');
                    return `<li><span>${escapeHtml(when)}${c.time ? ` · ${escapeHtml(c.time)}` : ''} · ${escapeHtml(svc)}</span><span>${c.complimentary ? '—' : formatEuroFromCents(c.amountCents)} · ${status}</span></li>`;
                }).join('');
                return `
                    <div class="admin-finances-patient">
                        <div class="admin-finances-patient-head">
                            <div>
                                <div class="admin-finances-patient-name">${escapeHtml(p.patientName || '—')}</div>
                                <div class="admin-finances-patient-email">${escapeHtml(p.email || '')}</div>
                            </div>
                            <div class="admin-finances-patient-totals">
                                <strong>${formatEuroFromCents(p.paidCents)} bruto</strong>
                                <span class="is-net">líq. ${formatEuroFromCents(pbd.netCents || 0)}</span>
                                ${p.unpaidCents ? `<span class="is-unpaid">deve ${formatEuroFromCents(p.unpaidCents)}</span>` : ''}
                            </div>
                        </div>
                        <div class="admin-finances-patient-breakdown">
                            <span>Stripe ${formatEuroFromCents(pbd.stripeFeeCents || 0)}</span>
                            <span>IRS ${formatEuroFromCents(pbd.irsCents || 0)}</span>
                            <span>SS ${formatEuroFromCents(pbd.ssCents || 0)}</span>
                        </div>
                        <ul class="admin-finances-patient-list">${consultLines}</ul>
                    </div>`;
            }).join('');

            return `
                <section class="admin-finances-month">
                    <div class="admin-finances-month-head">
                        <h3>${escapeHtml(m.label)}</h3>
                        <div class="admin-finances-month-totals">
                            <span class="is-paid">${formatEuroFromCents(m.paidCents)} bruto</span>
                            <span class="is-stripe">Stripe ${formatEuroFromCents(mbd.stripeFeeCents || 0)}</span>
                            <span class="is-irs">IRS ${formatEuroFromCents(mbd.irsCents || 0)}</span>
                            <span class="is-ss">SS ${formatEuroFromCents(mbd.ssCents || 0)}</span>
                            <span class="is-net">${formatEuroFromCents(mbd.netCents || 0)} líquido</span>
                        </div>
                    </div>
                    ${patientsHtml || '<p class="admin-empty-list">Sem pacientes neste mês.</p>'}
                </section>`;
        }).join('');
    }

    async function loadFinancesPanel() {
        if (!financesSummary) return;
        try {
            const res = await fetch('/api/admin/finances');
            if (res.status === 401) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            financesCache = await res.json();
            if (financesMonthSelect) {
                const current = financesMonthSelect.value;
                const months = financesCache.months || [];
                financesMonthSelect.innerHTML = '<option value="">All months</option>' + months.map((m) =>
                    `<option value="${escapeHtml(m.month)}">${escapeHtml(m.label)} — ${formatEuroFromCents(m.paidCents)}</option>`
                ).join('');
                if (current && months.some((m) => m.month === current)) financesMonthSelect.value = current;
            }
            renderFinancesPanel();
        } catch (err) {
            console.error('Load finances:', err);
            financesSummary.innerHTML = '<p class="admin-empty-list">Could not load finances.</p>';
            if (financesMonthsList) financesMonthsList.innerHTML = '';
        }
    }

    if (financesMonthSelect) {
        financesMonthSelect.addEventListener('change', renderFinancesPanel);
    }
    if (financesRefreshBtn) {
        financesRefreshBtn.addEventListener('click', () => loadFinancesPanel());
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
                    if (data.role && data.role !== 'admin') {
                        window.location.href = '/clinic-portal';
                        return;
                    }
                    const next = safeDirectoryNext();
                    if (next) {
                        window.location.replace(next);
                        return;
                    }
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
            const dayData = scheduleData.workingHours[day] || { enabled: false, start: '07:00', end: '17:00' };
            
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
        const start = bulkOverrideStart && bulkOverrideStart.value ? bulkOverrideStart.value : '07:00';
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
    const inviteTravelOptions = document.getElementById('inviteTravelOptions');
    const inviteComputedPrice = document.getElementById('inviteComputedPrice');
    const inviteCustomPrice = document.getElementById('inviteCustomPrice');
    const inviteComplimentary = document.getElementById('inviteComplimentary');
    const inviteWithoutInvoice = document.getElementById('inviteWithoutInvoice');

    const SERVICE_BASE_CENTS = {
        clinica_geral: 3900,
        urgente: 3500,
        infeccao_urinaria: 3500,
        saude_mental: 6000,
        burnout: 6000,
        burnout_mensal: 21600,
        burnout_programa: 49000,
        longevidade: 7900,
        renovacao: 1900
    };

    function parseCustomPriceCents() {
        if (!inviteCustomPrice) return null;
        const raw = String(inviteCustomPrice.value || '').trim();
        if (!raw) return null;
        const euros = Number(raw.replace(',', '.'));
        if (!Number.isFinite(euros)) return null;
        return Math.round(euros * 100);
    }

    function inviteHasInsurance() {
        return radioValue(inviteTravelOptions, 'inviteInsurance', 'no') === 'yes';
    }

    function inviteTravellerCount() {
        return Math.max(1, Math.min(4, parseInt(radioValue(inviteTravelOptions, 'inviteTravellers', '1'), 10) || 1));
    }

    function computeInvitePriceCents() {
        const custom = parseCustomPriceCents();
        if (custom != null) return custom;
        const svc = inviteService ? inviteService.value : '';
        if (svc === 'travel') {
            const n = inviteTravellerCount();
            const tier = inviteHasInsurance() ? 'medicare' : 'standard';
            return TRAVEL_TIER_CENTS[tier][n];
        }
        return SERVICE_BASE_CENTS[svc] || 0;
    }

    function refreshInvitePriceUI() {
        if (!inviteService) return;
        const isTravel = inviteService.value === 'travel';
        if (inviteTravelOptions) {
            inviteTravelOptions.hidden = !isTravel;
            inviteTravelOptions.classList.toggle('is-insured', isTravel && inviteHasInsurance());
        }
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
                const people = inviteTravellerCount();
                const travelBit = isTravel && custom == null
                    ? ` · ${people === 1 ? '1 pessoa' : people + ' pessoas'} · ${inviteHasInsurance() ? 'com seguro' : 'sem seguro'}`
                    : '';
                const label = custom != null ? 'Custom total' : 'Total';
                const mode = noInvoice
                    ? ' · confirm now, no payment invoice'
                    : ' · Stripe payment link';
                inviteComputedPrice.textContent = `${label}: €${(cents / 100).toFixed(2)}${travelBit}${mode}`;
            } else {
                inviteComputedPrice.textContent = '';
            }
        }
    }
    if (inviteService) inviteService.addEventListener('change', refreshInvitePriceUI);
    if (inviteTravelOptions) inviteTravelOptions.addEventListener('change', refreshInvitePriceUI);
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
        const hint = document.getElementById('inviteTimeHint');
        if (!date) {
            fillTimeDatalist('inviteTimeSlots', [], ['21:00']);
            inviteTime.value = '';
            if (hint) hint.textContent = '07:00, 08:00 and 21:00 are available on open weekdays.';
            return;
        }
        try {
            const res = await fetch(`/api/admin/available-slots?date=${encodeURIComponent(date)}&allSlots=1`);
            const data = await res.json();
            const slots = data.available || [];
            fillTimeDatalist('inviteTimeSlots', slots, ['21:00']);
            if (!inviteTime.value) {
                inviteTime.value = slots.includes('07:00') ? '07:00' : (slots[0] || '07:00');
            }
            if (hint) {
                hint.textContent = data.reason
                    ? data.reason
                    : '07:00, 08:00 and 21:00 are available on open weekdays.';
            }
        } catch (err) {
            console.error('Load invite times error:', err);
            fillTimeDatalist('inviteTimeSlots', [], ['21:00']);
            if (hint) hint.textContent = 'Could not load slots — you can still type 07:00, 08:00 or 21:00.';
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
            const paymentUrl = inv.invitationToken
                ? `${window.location.origin}/invite/${inv.invitationToken}`
                : (inv.stripeSessionUrl || '');
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
                travellers: inviteService.value === 'travel' ? inviteTravellerCount() : 1,
                hasInsurance: inviteService.value === 'travel' && inviteHasInsurance()
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
                inviteTime.value = '';
                fillTimeDatalist('inviteTimeSlots', [], ['21:00']);
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

    // ─── Psychologists (recrutamento) ───
    const adminPsychologistsList = document.getElementById('adminPsychologistsList');
    const psychologistsSearch = document.getElementById('psychologistsSearch');
    const psychologistsStatusFilter = document.getElementById('psychologistsStatusFilter');
    const psychologistsBandFilter = document.getElementById('psychologistsBandFilter');
    const psychologistsRefreshBtn = document.getElementById('psychologistsRefreshBtn');
    let psychologistsCache = [];

    const PSYCH_STATUS_OPTIONS = [
        'novo',
        'prioritario',
        'shortlist',
        'entrevista',
        'aceite',
        'bolsa',
        'rejeitado',
        'eliminado'
    ];

    function formatPsychDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
        } catch (e) {
            return String(iso);
        }
    }

    function joinList(arr) {
        return Array.isArray(arr) && arr.length ? arr.join(', ') : '—';
    }

    function psychAnswer(value) {
        if (value == null || value === '') return '—';
        if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
        return String(value);
    }

    function psychQa(label, value) {
        const text = psychAnswer(value);
        const multiline = text.includes('\n') || text.length > 120;
        return `
            <div class="admin-psych-qa${multiline ? ' is-long' : ''}">
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(text).replace(/\n/g, '<br>')}</dd>
            </div>
        `;
    }

    function renderPsychFullAnswers(a) {
        const p = a.payload || {};
        const pais =
            p.pais === 'Outro' && p.pais_especificar
                ? `Outro: ${p.pais_especificar}`
                : p.pais || a.pais || '';
        const scoreBits = a.scoreBreakdown || {};
        return `
            <div class="admin-psych-scoreline">
                <strong>Score interno:</strong> ${escapeHtml(String(a.score ?? 0))} · ${escapeHtml(a.scoreBand || '—')}
                ${a.eligible === false ? ' · não elegível' : ''}
                ${Array.isArray(a.eliminationReasons) && a.eliminationReasons.length
                    ? ` · eliminação: ${escapeHtml(a.eliminationReasons.join(', '))}`
                    : ''}
                ${scoreBits.experiencia != null
                    ? `<span class="admin-psych-score-break">exp ${escapeHtml(String(scoreBits.experiencia))}/30 · disp ${escapeHtml(String(scoreBits.disponibilidade))}/25 · perfil ${escapeHtml(String(scoreBits.perfil))}/25 · qualidade ${escapeHtml(String(scoreBits.qualidade))}/20</span>`
                    : ''}
            </div>
            <section class="admin-psych-section">
                <h4>Dados pessoais</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('Nome completo', p.nome || a.name)}
                    ${psychQa('Email', p.email || a.email)}
                    ${psychQa('Telefone', p.telefone || a.phone)}
                    ${psychQa('Localidade onde reside', p.localidade || a.localidade)}
                    ${psychQa('País onde exerce profissionalmente', pais)}
                </dl>
            </section>
            <section class="admin-psych-section">
                <h4>Formação e inscrição profissional</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('Inscrito/a na OPP', p.opp_inscrito)}
                    ${psychQa('Número de Cédula Profissional da OPP', p.cedula_opp || a.cedulaOpp)}
                    ${psychQa('Grau académico', p.grau_academico || a.grauAcademico)}
                    ${psychQa('Formação complementar', p.formacao_complementar)}
                </dl>
            </section>
            <section class="admin-psych-section">
                <h4>Experiência profissional</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('Anos de experiência em Psicologia Clínica', p.anos_clinica || a.anosClinica)}
                    ${psychQa('Anos em consultas psicológicas individuais', p.anos_individuais || a.anosIndividuais)}
                    ${psychQa('Experiência em consultas online', p.experiencia_online || a.experienciaOnline)}
                    ${psychQa('Nº aproximado de consultas online', p.n_consultas_online)}
                    ${psychQa('Áreas de maior experiência clínica', p.areas_clinicas || a.areasClinicas)}
                    ${psychQa('Populações', p.populacoes || a.populacoes)}
                    ${psychQa('Tipos de casos que prefere acompanhar', p.tipos_casos)}
                </dl>
            </section>
            <section class="admin-psych-section">
                <h4>Disponibilidade</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('Horas semanais iniciais', p.horas_iniciais || a.horasIniciais)}
                    ${psychQa('Dias da semana', p.dias_semana || a.diasSemana)}
                    ${psychQa('Horários fixos semanais', p.horarios_fixos || a.horariosFixos)}
                    ${psychQa('Disponibilidade estável', p.disponibilidade_estavel || a.disponibilidadeEstavel)}
                    ${psychQa('Disponibilidade para aumentar horas', p.aumento_futuro)}
                    ${psychQa('Horas para as quais poderia aumentar', p.horas_aumento)}
                </dl>
            </section>
            <section class="admin-psych-section">
                <h4>Condições</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('Aceita as condições da colaboração', p.aceita_condicoes)}
                </dl>
            </section>
            <section class="admin-psych-section">
                <h4>Experiência prática / perfil</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('Abordagem terapêutica', p.abordagem_terapeutica)}
                    ${psychQa('Modelos / abordagens', p.modelos || a.modelos)}
                    ${psychQa('Idiomas', p.idiomas || a.idiomas)}
                    ${psychQa('Experiência em videoconferência', p.videoconferencia)}
                </dl>
            </section>
            <section class="admin-psych-section">
                <h4>Questões administrativas e entrevista</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('Atividade profissional aberta', p.atividade_profissional)}
                    ${psychQa('Seguro de responsabilidade civil', p.rc_profissional)}
                    ${psychQa('Limitações relevantes', p.limitacoes)}
                    ${psychQa('Disponibilidade para entrevista online', p.entrevista_disponibilidade)}
                    ${psychQa('Períodos para entrevista', p.periodos_entrevista)}
                    ${psychQa('Autorização bolsa / contactos futuros', p.bolsa_autorizacao || a.bolsaAutorizacao)}
                </dl>
            </section>
            <section class="admin-psych-section">
                <h4>CV</h4>
                <dl class="admin-psych-qa-list">
                    ${psychQa('CV enviado', a.cvFilename || '—')}
                    ${psychQa('LinkedIn / website', p.linkedin)}
                    ${psychQa('Recebido em', formatPsychDate(a.createdAt))}
                </dl>
            </section>
        `;
    }

    function renderAdminPsychologists(list) {
        if (!adminPsychologistsList) return;
        if (!list.length) {
            adminPsychologistsList.innerHTML = '<p class="admin-empty-list">Ainda não há profissionais na bolsa.</p>';
            return;
        }
        adminPsychologistsList.innerHTML = '';
        list.forEach((a) => {
            const item = document.createElement('details');
            item.className = 'admin-psych-row';
            item.dataset.id = a.id;
            const p = a.payload || {};
            const email = a.email || '';
            const phone = a.phone || p.telefone || '';
            item.innerHTML = `
                <summary class="admin-psych-summary">
                    <span class="admin-psych-col admin-psych-col-name">${escapeHtml(a.name || '—')}</span>
                    <span class="admin-psych-col admin-psych-col-email">
                        ${email ? `<a href="mailto:${escapeHtml(email)}" onclick="event.stopPropagation()">${escapeHtml(email)}</a>` : '—'}
                    </span>
                    <span class="admin-psych-col admin-psych-col-phone">
                        ${phone ? `<a href="tel:${escapeHtml(phone)}" onclick="event.stopPropagation()">${escapeHtml(phone)}</a>` : '—'}
                    </span>
                    <span class="admin-psych-col admin-psych-col-role"><span class="admin-psych-role-tag">Psicólogo</span></span>
                    <span class="admin-psych-col admin-psych-col-status">${escapeHtml(a.status || 'novo')}</span>
                    <span class="admin-psych-chevron" aria-hidden="true"></span>
                </summary>
                <div class="admin-psych-body">
                    ${renderPsychFullAnswers(a)}
                    <div class="admin-psych-actions">
                        <label>
                            Status
                            <select class="admin-select admin-psych-status" data-psych-id="${escapeHtml(a.id)}">
                                ${PSYCH_STATUS_OPTIONS.map((s) =>
                                    `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`
                                ).join('')}
                            </select>
                        </label>
                        <label class="admin-psych-notes-label">
                            Notas
                            <textarea class="admin-input admin-psych-notes" data-psych-id="${escapeHtml(a.id)}" rows="2" maxlength="4000">${escapeHtml(a.adminNotes || '')}</textarea>
                        </label>
                        <button type="button" class="btn btn-primary btn-sm admin-psych-save" data-psych-id="${escapeHtml(a.id)}">Guardar</button>
                    </div>
                </div>
            `;
            adminPsychologistsList.appendChild(item);
        });
    }

    async function loadAdminPsychologists() {
        if (!adminPsychologistsList) return;
        adminPsychologistsList.innerHTML = '<p class="admin-empty-list">Loading…</p>';
        try {
            const params = new URLSearchParams();
            if (psychologistsStatusFilter && psychologistsStatusFilter.value) {
                params.set('status', psychologistsStatusFilter.value);
            }
            if (psychologistsBandFilter && psychologistsBandFilter.value) {
                params.set('band', psychologistsBandFilter.value);
            }
            if (psychologistsSearch && psychologistsSearch.value.trim()) {
                params.set('q', psychologistsSearch.value.trim());
            }
            const qs = params.toString();
            const res = await fetch('/api/admin/psychologists' + (qs ? `?${qs}` : ''));
            if (res.status === 401) return;
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            psychologistsCache = data.applications || [];
            renderAdminPsychologists(psychologistsCache);
        } catch (err) {
            console.error('Load admin psychologists:', err);
            adminPsychologistsList.innerHTML = '<p class="admin-empty-list">Não foi possível carregar a bolsa. A base de dados está configurada?</p>';
        }
    }

    async function savePsychologistApplication(id) {
        const statusEl = document.querySelector(`.admin-psych-status[data-psych-id="${id}"]`);
        const notesEl = document.querySelector(`.admin-psych-notes[data-psych-id="${id}"]`);
        try {
            const res = await fetch(`/api/admin/psychologists/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: statusEl ? statusEl.value : undefined,
                    adminNotes: notesEl ? notesEl.value : undefined
                })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            await loadAdminPsychologists();
        } catch (err) {
            console.error('Save psychologist:', err);
            alert('Não foi possível guardar.');
        }
    }

    if (psychologistsRefreshBtn) {
        psychologistsRefreshBtn.addEventListener('click', () => loadAdminPsychologists());
    }
    if (psychologistsStatusFilter) {
        psychologistsStatusFilter.addEventListener('change', () => loadAdminPsychologists());
    }
    if (psychologistsBandFilter) {
        psychologistsBandFilter.addEventListener('change', () => loadAdminPsychologists());
    }
    let psychSearchTimer = null;
    if (psychologistsSearch) {
        psychologistsSearch.addEventListener('input', () => {
            clearTimeout(psychSearchTimer);
            psychSearchTimer = setTimeout(() => loadAdminPsychologists(), 280);
        });
    }
    if (adminPsychologistsList) {
        adminPsychologistsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.admin-psych-save');
            if (!btn) return;
            savePsychologistApplication(btn.getAttribute('data-psych-id'));
        });
    }

    const PRODUCER_CATEGORY_LABELS = {
        hortofruticolas: 'Hortofrutícolas',
        lacticinios: 'Laticínios',
        mel: 'Mel',
        vinho: 'Vinho',
        azeite: 'Azeite',
        padaria: 'Padaria',
        cosmetica_natural: 'Cosmética natural'
    };
    const PRODUCER_SALES_LABELS = {
        loja_fisica: 'Loja física',
        entrega: 'Entrega',
        mercado: 'Mercado',
        encomenda_online: 'Encomenda online'
    };
    const PRODUCER_STATUS_OPTIONS = ['pendente', 'aprovado', 'rejeitado'];
    const adminProducersList = document.getElementById('adminProducersList');
    const producersSearch = document.getElementById('producersSearch');
    const producersStatusFilter = document.getElementById('producersStatusFilter');
    const producersRefreshBtn = document.getElementById('producersRefreshBtn');

    function producerFileUrl(p, filename) {
        if (!p || !filename) return '';
        return `/api/admin/producers/${encodeURIComponent(p.id)}/files/${encodeURIComponent(filename)}`;
    }

    function labelList(ids, map) {
        return (ids || []).map((id) => map[id] || id).join(', ') || '—';
    }

    function renderAdminProducers(list) {
        if (!adminProducersList) return;
        if (!list.length) {
            adminProducersList.innerHTML = '<p class="admin-empty-list">Ainda não há candidaturas neste filtro.</p>';
            return;
        }
        adminProducersList.innerHTML = '';
        list.forEach((p) => {
            const item = document.createElement('details');
            item.className = 'admin-psych-row';
            item.dataset.id = p.id;
            const social = p.social || {};
            const photos = (p.photos || [])
                .map((ph) => `<img src="${escapeHtml(producerFileUrl(p, ph.filename))}" alt="" width="96" height="72" style="object-fit:cover;border-radius:8px;margin:4px 6px 0 0;">`)
                .join('');
            const cert = p.certImage
                ? `<img src="${escapeHtml(producerFileUrl(p, p.certImage))}" alt="Certificado" width="120" style="border-radius:8px;margin-top:8px;">`
                : '';
            item.innerHTML = `
                <summary class="admin-psych-summary">
                    <span class="admin-psych-col admin-psych-col-name">${escapeHtml(p.name || '—')}</span>
                    <span class="admin-psych-col admin-psych-col-email">${escapeHtml(p.district || '—')}</span>
                    <span class="admin-psych-col admin-psych-col-phone">${escapeHtml(labelList(p.categories, PRODUCER_CATEGORY_LABELS))}</span>
                    <span class="admin-psych-col admin-psych-col-status">${escapeHtml(p.status || 'pendente')}</span>
                    <span class="admin-psych-chevron" aria-hidden="true"></span>
                </summary>
                <div class="admin-psych-body">
                    <section class="admin-psych-section">
                        <h4>Perfil</h4>
                        <dl class="admin-psych-qa-list">
                            ${psychQa('Descrição curta', p.shortDescription)}
                            ${psychQa('Descrição longa', p.longDescription)}
                            ${psychQa('Concelho / morada', [p.municipality, p.address].filter(Boolean).join(' — '))}
                            ${psychQa('Coordenadas', p.lat != null && p.lng != null ? `${p.lat}, ${p.lng}` : '')}
                            ${psychQa('Venda', labelList(p.salesMethods, PRODUCER_SALES_LABELS))}
                            ${psychQa('Certificação', [p.certBody, p.certNumber].filter(Boolean).join(' · '))}
                            ${psychQa('Website', p.website)}
                            ${psychQa('Email', p.email)}
                            ${psychQa('Telefone', p.phone)}
                            ${psychQa('Instagram', social.instagram)}
                            ${psychQa('Facebook', social.facebook)}
                            ${psychQa('Outra rede', social.other)}
                            ${psychQa('Recebido em', formatPsychDate(p.createdAt))}
                        </dl>
                        ${photos ? `<div style="margin-top:12px;">${photos}</div>` : ''}
                        ${cert}
                        <p style="margin:12px 0 0;"><a href="/diretorio/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Abrir ficha</a></p>
                    </section>
                    <div class="admin-psych-actions">
                        <label>
                            Status
                            <select class="admin-select admin-prod-status" data-prod-id="${escapeHtml(p.id)}">
                                ${PRODUCER_STATUS_OPTIONS.map((s) =>
                                    `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`
                                ).join('')}
                            </select>
                        </label>
                        <label class="admin-psych-notes-label">
                            Notas
                            <textarea class="admin-input admin-prod-notes" data-prod-id="${escapeHtml(p.id)}" rows="2" maxlength="4000">${escapeHtml(p.adminNotes || '')}</textarea>
                        </label>
                        <button type="button" class="btn btn-primary btn-sm admin-prod-save" data-prod-id="${escapeHtml(p.id)}">Guardar</button>
                    </div>
                </div>
            `;
            adminProducersList.appendChild(item);
        });
    }

    async function loadAdminProducers() {
        if (!adminProducersList) return;
        adminProducersList.innerHTML = '<p class="admin-empty-list">Loading…</p>';
        try {
            const params = new URLSearchParams();
            if (producersStatusFilter && producersStatusFilter.value) {
                params.set('status', producersStatusFilter.value);
            }
            if (producersSearch && producersSearch.value.trim()) {
                params.set('q', producersSearch.value.trim());
            }
            const qs = params.toString();
            const res = await fetch('/api/admin/producers' + (qs ? `?${qs}` : ''));
            if (res.status === 401) return;
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            renderAdminProducers(data.producers || []);
        } catch (err) {
            console.error('Load admin producers:', err);
            adminProducersList.innerHTML = '<p class="admin-empty-list">Não foi possível carregar o diretório.</p>';
        }
    }

    async function saveProducerApplication(id) {
        const statusEl = document.querySelector(`.admin-prod-status[data-prod-id="${id}"]`);
        const notesEl = document.querySelector(`.admin-prod-notes[data-prod-id="${id}"]`);
        try {
            const res = await fetch(`/api/admin/producers/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: statusEl ? statusEl.value : undefined,
                    adminNotes: notesEl ? notesEl.value : undefined
                })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            await loadAdminProducers();
        } catch (err) {
            console.error('Save producer:', err);
            alert('Não foi possível guardar.');
        }
    }

    if (producersRefreshBtn) {
        producersRefreshBtn.addEventListener('click', () => loadAdminProducers());
    }
    if (producersStatusFilter) {
        producersStatusFilter.addEventListener('change', () => loadAdminProducers());
    }
    let prodSearchTimer = null;
    if (producersSearch) {
        producersSearch.addEventListener('input', () => {
            clearTimeout(prodSearchTimer);
            prodSearchTimer = setTimeout(() => loadAdminProducers(), 280);
        });
    }
    if (adminProducersList) {
        adminProducersList.addEventListener('click', (e) => {
            const btn = e.target.closest('.admin-prod-save');
            if (!btn) return;
            saveProducerApplication(btn.getAttribute('data-prod-id'));
        });
    }

    const FUNNEL_LABELS = {
        visit: 'Visit',
        engage: 'Engaged (10s)',
        intent: 'Intent (CTA)',
        schedule: 'Picked slot',
        checkout: 'Checkout',
        purchase: 'Paid / booked'
    };
    const CHANNEL_LABELS = {
        paid_search: 'Paid search',
        paid_social: 'Paid social',
        organic_google: 'Google organic',
        organic_other: 'Other organic',
        email: 'Email',
        sms: 'SMS / WhatsApp',
        invite: 'Clinic invite',
        internal: 'Admin / staff',
        referral: 'Referral',
        campaign: 'Campaign',
        direct: 'Direct'
    };

    function anEuro(cents) {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
    }

    function anBarList(items, labelFn) {
        if (!items || !items.length) return '<p class="admin-empty-list">No data yet</p>';
        const max = Math.max(1, ...items.map((i) => i.count));
        return `<ul class="an-bars">${items.map((i) => {
            const label = labelFn ? labelFn(i.key) : i.key;
            const pct = Math.round((i.count / max) * 100);
            return `<li><span class="an-bar-label" title="${escapeHtml(String(label))}">${escapeHtml(String(label))}</span>
                <span class="an-bar-track"><span class="an-bar-fill" style="width:${pct}%"></span></span>
                <span class="an-bar-n">${i.count}</span></li>`;
        }).join('')}</ul>`;
    }

    function anSpark(values) {
        if (!values || !values.length) return '';
        const w = 640;
        const h = 88;
        const max = Math.max(1, ...values);
        const step = w / Math.max(1, values.length - 1);
        const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 8) - 4).toFixed(1)}`).join(' ');
        return `<svg class="an-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Pageviews">
            <polyline fill="none" stroke="currentColor" stroke-width="2.5" points="${pts}" /></svg>`;
    }

    async function loadAnalyticsPanel() {
        const kpis = document.getElementById('analyticsKpis');
        const live = document.getElementById('analyticsLive');
        const rangeEl = document.getElementById('analyticsRange');
        const range = rangeEl ? rangeEl.value : '7d';
        const audienceBtn = document.querySelector('#analyticsAudience .an-audience-btn.is-active');
        const audience = (audienceBtn && audienceBtn.getAttribute('data-audience')) || 'public';
        if (kpis) kpis.innerHTML = '<p class="admin-empty-list">Loading analytics…</p>';
        try {
            const res = await fetch(`/api/admin/analytics?range=${encodeURIComponent(range)}&audience=${encodeURIComponent(audience)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            const k = data.kpis || {};
            if (live) {
                const publicLive = k.publicLive || 0;
                const staffLive = k.staffLive || 0;
                if (audience === 'staff') {
                    live.innerHTML = `<span class="an-live-dot"></span> ${staffLive} admin live now`;
                } else if (audience === 'all') {
                    live.innerHTML = `<span class="an-live-dot"></span> ${k.liveVisitors || 0} live now <span class="an-live-split">${publicLive} visitors · ${staffLive} admin</span>`;
                } else {
                    live.innerHTML = `<span class="an-live-dot"></span> ${publicLive} live now${staffLive ? ` <span class="an-live-split">${staffLive} admin excluded</span>` : ''}`;
                }
            }
            const note = document.getElementById('analyticsTrackingNote');
            if (note) {
                const scanner = k.scannerEvents || 0;
                if (scanner) {
                    note.hidden = false;
                    note.textContent = `Excluded ${scanner} scanner hits (${k.scannerSessions || 0} probe sessions), including path probes and same-second path floods. Figures below are human traffic.`;
                } else if (data.trackingEmpty) {
                    note.hidden = false;
                    note.textContent = audience === 'staff'
                        ? 'No admin sessions in this range. Open the public site while logged in to tag a staff visit.'
                        : 'Visit metrics start as people browse the public site. Bookings and revenue already come from the payment ledger.';
                } else {
                    note.hidden = true;
                    note.textContent = '';
                }
            }
            if (kpis) {
                const sessionHint = audience === 'all'
                    ? `${k.publicSessions || 0} visitors · ${k.staffSessions || 0} admin`
                    : audience === 'staff'
                        ? 'This browser and other marked admin devices'
                        : (k.staffSessions ? `${k.staffSessions} admin sessions excluded` : 'Public traffic');
                kpis.innerHTML = [
                    ['Visitors', k.visitors],
                    ['Sessions', k.sessions],
                    ['Pageviews', k.pageviews],
                    ['Engaged', `${k.engagedRate || 0}%`],
                    ['Bookings', k.bookings],
                    ['Revenue', anEuro(k.revenueCents)],
                    ['Conversion', `${k.conversionRate || 0}%`]
                ].map(([label, val]) => `<div class="an-kpi"><span class="an-kpi-label">${label}</span><span class="an-kpi-val">${val}</span></div>`).join('') +
                    `<p class="an-split-hint">${escapeHtml(sessionHint)}</p>`;
            }
            const deviceHint = document.getElementById('analyticsDeviceHint');
            if (deviceHint) {
                deviceHint.textContent = data.deviceMarked
                    ? 'This browser is marked as admin. Past visits from it in this range are moved to Admin (not Direct).'
                    : 'Your own visits look like Direct until this browser is marked. Use the button, or open any public page after logging in.';
            }
            const chart = document.getElementById('analyticsChart');
            if (chart) chart.innerHTML = anSpark(data.hourly || []);
            const funnel = document.getElementById('analyticsFunnel');
            if (funnel) {
                const steps = data.funnel || [];
                const top = Math.max(1, ...(steps.map((s) => s.sessions)));
                funnel.innerHTML = `<ol class="an-funnel">${steps.map((s) => `<li>
                    <span>${FUNNEL_LABELS[s.id] || s.id}</span>
                    <span class="an-funnel-track"><span style="width:${Math.round((s.sessions / top) * 100)}%"></span></span>
                    <strong>${s.sessions}</strong>
                    <em>${s.stepConversion}%</em>
                </li>`).join('')}</ol>`;
            }
            const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
            set('analyticsChannels', anBarList(data.channels, (k) => CHANNEL_LABELS[k] || k));
            set('analyticsPages', anBarList(data.pages));
            set('analyticsLandings', anBarList(data.landings));
            set('analyticsDevices', anBarList(data.devices));
            set('analyticsCampaigns', anBarList(data.campaigns));
            set('analyticsCtas', anBarList(data.ctas));
            set('analyticsServices', anBarList(data.services));
            const recent = document.getElementById('analyticsRecent');
            if (recent) {
                const rows = data.recent || [];
                recent.innerHTML = rows.length
                    ? `<table class="an-table"><thead><tr><th>When</th><th>Who</th><th>Event</th><th>Path</th><th>Channel</th><th>Device</th></tr></thead><tbody>${
                        rows.map((r) => `<tr><td>${escapeHtml(String(r.at || '').replace('T', ' ').slice(0, 19))}</td>
                        <td>${r.staff ? '<span class="an-badge an-badge-staff">Admin</span>' : '<span class="an-badge">Visitor</span>'}</td>
                        <td>${escapeHtml(r.name || '')}</td><td>${escapeHtml(r.path || '')}</td>
                        <td>${escapeHtml(CHANNEL_LABELS[r.channel] || r.channel || '')}</td>
                        <td>${escapeHtml(r.device || '')}</td></tr>`).join('')
                    }</tbody></table>`
                    : '<p class="admin-empty-list">No events yet — browse the public site to seed the graph.</p>';
            }
        } catch (err) {
            if (kpis) kpis.innerHTML = `<p class="admin-empty-list">${escapeHtml(err.message || 'Failed')}</p>`;
        }
    }

    const analyticsRange = document.getElementById('analyticsRange');
    const analyticsRefreshBtn = document.getElementById('analyticsRefreshBtn');
    const analyticsAudience = document.getElementById('analyticsAudience');
    if (analyticsRange) analyticsRange.addEventListener('change', () => loadAnalyticsPanel());
    if (analyticsRefreshBtn) analyticsRefreshBtn.addEventListener('click', () => loadAnalyticsPanel());
    if (analyticsAudience) {
        analyticsAudience.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-audience]');
            if (!btn) return;
            analyticsAudience.querySelectorAll('.an-audience-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
            loadAnalyticsPanel();
        });
    }
    const analyticsMarkDeviceBtn = document.getElementById('analyticsMarkDeviceBtn');
    if (analyticsMarkDeviceBtn) {
        analyticsMarkDeviceBtn.addEventListener('click', async () => {
            analyticsMarkDeviceBtn.disabled = true;
            try {
                const res = await fetch('/api/admin/analytics/mark-device', { method: 'POST' });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                analyticsMarkDeviceBtn.textContent = 'Browser marked';
                loadAnalyticsPanel();
            } catch (err) {
                analyticsMarkDeviceBtn.disabled = false;
                analyticsMarkDeviceBtn.textContent = 'Mark this browser as admin';
                alert(err.message || 'Could not mark this browser');
            }
        });
    }

    // ─── Professionals & Doxy rooms ───
    const adminProfessionalsBody = document.getElementById('adminProfessionalsBody');
    const adminProfessionalForm = document.getElementById('adminProfessionalForm');
    const adminProfessionalError = document.getElementById('adminProfessionalError');
    const adminDefaultDoxyUrl = document.getElementById('adminDefaultDoxyUrl');
    const proEditId = document.getElementById('proEditId');
    const proDisplayName = document.getElementById('proDisplayName');
    const proUsername = document.getElementById('proUsername');
    const proPassword = document.getElementById('proPassword');
    const proDoxyUrl = document.getElementById('proDoxyUrl');
    const proActive = document.getElementById('proActive');
    const proSubmitBtn = document.getElementById('proSubmitBtn');
    const proCancelEditBtn = document.getElementById('proCancelEditBtn');
    let professionalsCache = [];

    function showProfessionalError(message) {
        if (!adminProfessionalError) return;
        if (!message) {
            adminProfessionalError.style.display = 'none';
            adminProfessionalError.textContent = '';
            return;
        }
        adminProfessionalError.textContent = message;
        adminProfessionalError.style.display = 'block';
    }

    function fillProfessionalsDatalist(list) {
        const dl = document.getElementById('adminProfessionalsList');
        if (!dl) return;
        const names = new Set();
        (list || []).forEach((p) => {
            if (p.displayName) names.add(p.displayName);
        });
        if (names.size === 0) names.add('Dra. Sofia Aguiar');
        dl.innerHTML = [...names].map((n) => `<option value="${escapeHtml(n)}"></option>`).join('');
    }

    function resetProfessionalForm() {
        if (adminProfessionalForm) adminProfessionalForm.reset();
        if (proEditId) proEditId.value = '';
        if (proActive) proActive.checked = true;
        if (proUsername) proUsername.disabled = false;
        if (proPassword) {
            proPassword.required = true;
            proPassword.placeholder = 'Min. 8 characters';
        }
        if (proSubmitBtn) proSubmitBtn.textContent = 'Add professional';
        if (proCancelEditBtn) proCancelEditBtn.hidden = true;
        showProfessionalError('');
    }

    function startEditProfessional(pro) {
        if (!pro) return;
        if (proEditId) proEditId.value = String(pro.id);
        if (proDisplayName) proDisplayName.value = pro.displayName || '';
        if (proUsername) {
            proUsername.value = pro.username || '';
            proUsername.disabled = true;
        }
        if (proPassword) {
            proPassword.value = '';
            proPassword.required = false;
            proPassword.placeholder = 'Leave blank to keep current password';
        }
        if (proDoxyUrl) proDoxyUrl.value = pro.doxyRoomUrl || '';
        if (proActive) proActive.checked = pro.active !== false;
        if (proSubmitBtn) proSubmitBtn.textContent = 'Save changes';
        if (proCancelEditBtn) proCancelEditBtn.hidden = false;
        showProfessionalError('');
        if (proDisplayName) proDisplayName.focus();
    }

    function renderAdminProfessionals(list) {
        if (!adminProfessionalsBody) return;
        if (!list.length) {
            adminProfessionalsBody.innerHTML = '<tr><td colspan="5" class="admin-empty-list">No professionals yet. Add one above — they can then sign in at the clinic portal and open their Doxy room.</td></tr>';
            return;
        }
        adminProfessionalsBody.innerHTML = list.map((p) => {
            const statusClass = p.active !== false ? 'admin-pro-status' : 'admin-pro-status is-off';
            const statusLabel = p.active !== false ? 'Active' : 'Disabled';
            return `<tr>
                <td>${escapeHtml(p.displayName || '')}</td>
                <td>${escapeHtml(p.username || '')}</td>
                <td>${p.doxyRoomUrl ? `<a href="${escapeHtml(p.doxyRoomUrl)}" target="_blank" rel="noopener">${escapeHtml(p.doxyRoomUrl)}</a>` : '—'}</td>
                <td><span class="${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="admin-pro-actions">
                        <button type="button" class="btn btn-outline btn-sm" data-pro-edit="${p.id}">Edit</button>
                        <button type="button" class="btn btn-outline btn-sm" data-pro-delete="${p.id}">Remove</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    async function loadAdminProfessionals() {
        if (!adminProfessionalsBody) return;
        try {
            const res = await fetch('/api/admin/professionals');
            if (res.status === 401 || res.status === 403) {
                if (res.status === 403) window.location.href = '/clinic-portal';
                else showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            professionalsCache = data.professionals || [];
            if (adminDefaultDoxyUrl) {
                adminDefaultDoxyUrl.textContent = data.defaultDoxyRoomUrl
                    ? `Default clinic room (admin / unassigned bookings): ${data.defaultDoxyRoomUrl}`
                    : 'Default clinic room is not set. Add DOXY_ROOM_URL to the server environment, or set a room on each professional.';
            }
            renderAdminProfessionals(professionalsCache);
            fillProfessionalsDatalist(professionalsCache);
        } catch (err) {
            console.error('Load professionals:', err);
            adminProfessionalsBody.innerHTML = '<tr><td colspan="5" class="admin-empty-list">Could not load professionals.</td></tr>';
        }
    }

    if (proCancelEditBtn) {
        proCancelEditBtn.addEventListener('click', () => resetProfessionalForm());
    }

    if (adminProfessionalForm) {
        adminProfessionalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showProfessionalError('');
            const editingId = proEditId && proEditId.value ? proEditId.value : '';
            const payload = {
                displayName: proDisplayName ? proDisplayName.value.trim() : '',
                username: proUsername ? proUsername.value.trim() : '',
                doxyRoomUrl: proDoxyUrl ? proDoxyUrl.value.trim() : '',
                active: proActive ? proActive.checked : true
            };
            if (proPassword && proPassword.value) payload.password = proPassword.value;
            if (!editingId && !payload.password) {
                showProfessionalError('Password is required for a new account.');
                return;
            }
            try {
                const res = await fetch(editingId ? `/api/admin/professionals/${encodeURIComponent(editingId)}` : '/api/admin/professionals', {
                    method: editingId ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    showProfessionalError(data.error || 'Could not save professional.');
                    return;
                }
                resetProfessionalForm();
                await loadAdminProfessionals();
            } catch (err) {
                showProfessionalError('Network error. Please try again.');
            }
        });
    }

    if (adminProfessionalsBody) {
        adminProfessionalsBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('[data-pro-edit]');
            const delBtn = e.target.closest('[data-pro-delete]');
            if (editBtn) {
                const id = Number(editBtn.getAttribute('data-pro-edit'));
                const pro = professionalsCache.find((p) => p.id === id);
                startEditProfessional(pro);
                return;
            }
            if (delBtn) {
                const id = delBtn.getAttribute('data-pro-delete');
                if (!id || !window.confirm('Remove this professional account? Existing bookings keep the name, but they will no longer be able to sign in.')) return;
                try {
                    const res = await fetch(`/api/admin/professionals/${encodeURIComponent(id)}`, { method: 'DELETE' });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        alert(data.error || 'Could not remove professional.');
                        return;
                    }
                    if (proEditId && proEditId.value === String(id)) resetProfessionalForm();
                    await loadAdminProfessionals();
                } catch (err) {
                    alert('Network error. Please try again.');
                }
            }
        });
    }

    // ─── Initialize ───
    await checkAuth();
    if (inviteList) loadInvitations();
    loadAdminReviews();
});
