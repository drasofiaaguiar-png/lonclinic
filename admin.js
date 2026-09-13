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
    const adminTotpForm = document.getElementById('adminTotpForm');
    const adminTotpCode = document.getElementById('adminTotpCode');
    const adminTotpError = document.getElementById('adminTotpError');
    const adminTotpRecoverLink = document.getElementById('adminTotpRecoverLink');
    const adminTotpSetupForm = document.getElementById('adminTotpSetupForm');
    const adminTotpSecret = document.getElementById('adminTotpSecret');
    const adminTotpOtpauth = document.getElementById('adminTotpOtpauth');
    const adminTotpOtpauthWrap = document.getElementById('adminTotpOtpauthWrap');
    const adminTotpSetupCode = document.getElementById('adminTotpSetupCode');
    const adminTotpSetupError = document.getElementById('adminTotpSetupError');
    const adminTotpRecoverForm = document.getElementById('adminTotpRecoverForm');
    const adminTotpRecoverCode = document.getElementById('adminTotpRecoverCode');
    const adminTotpRecoverError = document.getElementById('adminTotpRecoverError');
    const adminTotpRecoverBack = document.getElementById('adminTotpRecoverBack');
    const adminTotpCodesPanel = document.getElementById('adminTotpCodesPanel');
    const adminTotpCodesList = document.getElementById('adminTotpCodesList');
    const adminTotpCodesContinue = document.getElementById('adminTotpCodesContinue');
    const adminStaffPasswordForm = document.getElementById('adminStaffPasswordForm');
    const adminStaffPasswordEmail = document.getElementById('adminStaffPasswordEmail');
    const adminStaffPassword = document.getElementById('adminStaffPassword');
    const adminStaffPasswordError = document.getElementById('adminStaffPasswordError');
    const staffResetCode = new URLSearchParams(window.location.search).get('reset')
        || new URLSearchParams(window.location.search).get('setup')
        || '';
    if (staffResetCode && adminStaffPasswordForm) {
        adminStaffPasswordForm.hidden = false;
        if (adminLoginForm) adminLoginForm.hidden = true;
        adminStaffPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminStaffPasswordError) {
                adminStaffPasswordError.style.display = 'none';
                adminStaffPasswordError.textContent = '';
            }
            try {
                const res = await fetch('/api/clinic/password-reset/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: adminStaffPasswordEmail ? adminStaffPasswordEmail.value : '',
                        code: staffResetCode,
                        password: adminStaffPassword ? adminStaffPassword.value : ''
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    if (adminStaffPasswordError) {
                        adminStaffPasswordError.textContent = data.error || 'Could not update password.';
                        adminStaffPasswordError.style.display = 'block';
                    }
                    return;
                }
                adminStaffPasswordForm.hidden = true;
                if (adminLoginForm) adminLoginForm.hidden = false;
                history.replaceState({}, '', '/admin');
            } catch {
                if (adminStaffPasswordError) {
                    adminStaffPasswordError.textContent = 'Network error. Try again.';
                    adminStaffPasswordError.style.display = 'block';
                }
            }
        });
    }
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
    let staffAvailDirty = false;
    let staffAvailUsername = '';
    let staffAvailData = null;
    let staffAvailPeople = [];
    let hoursBoardPlatform = { weekly: {}, dayOverrides: [], blockedDates: [] };
    let staffAvailCalYear = null;
    let staffAvailCalMonth = null;
    const staffAvailSelectedDates = new Set();
    const STAFF_WEEKDAYS = [
        ['monday', 'Mon', 'Monday'],
        ['tuesday', 'Tue', 'Tuesday'],
        ['wednesday', 'Wed', 'Wednesday'],
        ['thursday', 'Thu', 'Thursday'],
        ['friday', 'Fri', 'Friday'],
        ['saturday', 'Sat', 'Saturday'],
        ['sunday', 'Sun', 'Sunday']
    ];

    function updateSaveButtonState() {
        if (!saveScheduleBtn) return;
        const staffMode = !!staffAvailUsername;
        const dirty = staffMode ? staffAvailDirty : scheduleDirty;
        if (dirty) {
            saveScheduleBtn.classList.add('admin-save-dirty');
            saveScheduleBtn.textContent = staffMode ? 'Save availability •' : 'Save Schedule •';
        } else {
            saveScheduleBtn.classList.remove('admin-save-dirty');
            if (saveScheduleBtn.textContent !== '✓ Saved') {
                saveScheduleBtn.textContent = staffMode ? 'Save availability' : 'Save Schedule';
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
                    showLogin({ clinicianSession: true });
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
    function showLogin(opts) {
        document.body.classList.remove('admin-logged-in');
        adminLogin.style.display = 'flex';
        adminContent.style.display = 'none';
        setAdminAuthView('signin');
        const clinicianNote = document.getElementById('adminClinicianNote');
        if (clinicianNote) {
            clinicianNote.hidden = !(opts && opts.clinicianSession);
        }
    }

    // ─── Show admin content ───
    function showAdminContent() {
        document.body.classList.add('admin-logged-in');
        adminLogin.style.display = 'none';
        adminContent.style.display = 'flex';
        setAdminPanel('schedule');
    }

    // ─── Admin panels (sidebar) ───
    const PANEL_META = {
        schedule: { title: 'Schedule', subtitle: 'Upcoming consultations' },
        patients: { title: 'Patients', subtitle: 'All consultations & follow-up tracking' },
        finances: { title: 'Finances', subtitle: 'Monthly revenue by patient' },
        analytics: { title: 'Analytics', subtitle: 'Patient booking vs job application funnels' },
        invitations: { title: 'Invitations', subtitle: 'Send and manage booking invites' },
        availability: { title: 'Availability', subtitle: 'Hours per professional, used on each consultation type' },
        'hours-board': { title: 'Hours board', subtitle: 'Combined hours per profession, inside clinic opening hours' },
        reviews: { title: 'Reviews', subtitle: 'Patient feedback from the website' },
        professionals: { title: 'Professionals', subtitle: 'Directory of clinic professionals' },
        psychologists: { title: 'Bolsa de Profissionais', subtitle: 'Candidaturas e pipeline de profissionais' },
        producers: { title: 'Diretório produtores', subtitle: 'Moderar candidaturas de produtores biológicos' },
        profile: { title: 'Perfil', subtitle: 'Identificação, dados profissionais, documentos e candidatura' }
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
    const scheduleStripeSyncBtn = document.getElementById('scheduleStripeSyncBtn');

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
        psicologia: 'Psicologia',
        terapia_casal: 'Terapia de casal',
        terapia_casal_mensal: 'Terapia de casal (subscrição)',
        longevity: 'Longevity Assessment',
        'longevity-plus': 'Longevity Plus',
        followup: 'Follow-up',
        unspecified: 'Untagged',
        entrevista: 'Entrevista de emprego'
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
        if (panelId === 'invitations') {
            loadInvitations();
            fillInviteProfessionalSelect();
        }
        if (panelId === 'reviews') loadAdminReviews();
        if (panelId === 'availability') loadStaffAvailabilityPicker();
        if (panelId === 'hours-board') loadHoursBoard();
        if (panelId === 'professionals') loadAdminProfessionals();
        if (panelId === 'psychologists') loadAdminPsychologists();
        if (panelId === 'producers') loadAdminProducers();
        if (panelId === 'profile') loadAdminProfile();
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
        const c = counts || { all: 0, clinic: 0, patient: 0, interview: 0 };
        const elAll = document.getElementById('schedCountAll');
        const elClinic = document.getElementById('schedCountClinic');
        const elPatient = document.getElementById('schedCountPatient');
        const elInterview = document.getElementById('schedCountInterview');
        if (elAll) elAll.textContent = String(c.all || 0);
        if (elClinic) elClinic.textContent = String(c.clinic || 0);
        if (elPatient) elPatient.textContent = String(c.patient || 0);
        if (elInterview) elInterview.textContent = String(c.interview || 0);
    }

    function renderUpcomingConsultations(list, counts) {
        if (!adminScheduleList) return;
        updateScheduleCounts(counts);
        const filtered = scheduleFilter === 'clinic' || scheduleFilter === 'patient'
            ? (list || []).filter((c) => c.source === scheduleFilter)
            : scheduleFilter === 'interview'
                ? (list || []).filter((c) => c.service === 'entrevista')
                : (list || []);

        if (!filtered.length) {
            const emptyMsg = scheduleFilter === 'clinic'
                ? 'No clinic-scheduled consultations upcoming.'
                : scheduleFilter === 'patient'
                    ? 'No patient-booked consultations upcoming.'
                    : scheduleFilter === 'interview'
                        ? 'No interviews upcoming.'
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
                const isInterview = c.service === 'entrevista';
                const source = c.source === 'clinic' ? 'clinic' : 'patient';
                item.className = `admin-agenda-item is-${source}${isInterview ? ' is-interview' : ''}`;
                const time = String(c.time || '').slice(0, 5) || '—';
                const service = SERVICE_LABELS_ADMIN[c.service] || c.service || 'Consultation';
                const name = isInterview ? (c.email || c.patientName || '—') : (c.patientName || '—');
                const email = isInterview ? '' : (c.email || '');
                const ref = c.bookingRef || '';
                const badgeLabel = isInterview ? 'Interview' : (source === 'clinic' ? 'Clinic' : 'Patient');
                const comp = isInterview
                    ? '<span class="admin-agenda-comp">Job interview</span>'
                    : (c.complimentary
                        ? '<span class="admin-agenda-comp">Complimentary</span>'
                        : (c.withoutInvoice
                            ? '<span class="admin-agenda-comp">No invoice</span>'
                            : ''));
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
                        <span class="admin-source-badge is-${isInterview ? 'interview' : source}">${badgeLabel}</span>
                        ${comp}
                        ${ref ? `<span class="admin-agenda-ref">${escapeHtml(ref)}</span>` : ''}
                        ${ref && !isInterview ? `<button type="button" class="btn btn-outline btn-sm" data-resend-confirm="${escapeHtml(ref)}">Send confirmation</button>` : ''}
                        ${ref && !isInterview ? `<button type="button" class="btn btn-outline btn-sm" data-admin-panel="patients">Patients</button>` : ''}
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
                counts: data.counts || { all: 0, clinic: 0, patient: 0, interview: 0 }
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

    async function sendBookingConfirmationEmail(ref, btn) {
        const bookingRef = String(ref || '').trim();
        if (!bookingRef) return;
        const original = btn ? btn.textContent : 'Send confirmation';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending…';
        }
        try {
            const res = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingRef)}/resend-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) return;
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            if (btn) btn.textContent = 'Sent';
            alert(`Confirmation sent to ${data.email || 'the patient'}, with the video-room link.`);
        } catch (err) {
            alert(err.message || 'Could not send confirmation.');
            if (btn) btn.textContent = original;
        } finally {
            if (btn) {
                setTimeout(() => {
                    btn.textContent = original;
                    btn.disabled = false;
                }, 2200);
            }
        }
    }

    if (adminScheduleList) {
        adminScheduleList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-resend-confirm]');
            if (!btn) return;
            sendBookingConfirmationEmail(btn.getAttribute('data-resend-confirm'), btn);
        });
    }

    if (scheduleStripeSyncBtn) {
        scheduleStripeSyncBtn.addEventListener('click', async () => {
            const original = scheduleStripeSyncBtn.textContent;
            scheduleStripeSyncBtn.disabled = true;
            scheduleStripeSyncBtn.textContent = 'Checking Stripe…';
            try {
                const res = await fetch('/api/admin/reconcile-stripe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hours: 72 })
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) return;
                if (!res.ok) {
                    throw new Error(data.error || `HTTP ${res.status}`);
                }
                const recovered = Array.isArray(data.recovered) ? data.recovered.length : 0;
                scheduleStripeSyncBtn.textContent = recovered
                    ? `Recovered ${recovered}`
                    : 'No missing payments';
                await loadUpcomingConsultations();
                if (typeof loadPatientsTable === 'function') {
                    await loadPatientsTable();
                }
            } catch (err) {
                console.error('Stripe reconcile:', err);
                scheduleStripeSyncBtn.textContent = 'Sync failed';
                alert(err.message || 'Could not recover Stripe payments.');
            } finally {
                setTimeout(() => {
                    scheduleStripeSyncBtn.textContent = original;
                    scheduleStripeSyncBtn.disabled = false;
                }, 2500);
            }
        });
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
                                ${c.cancelled || !c.bookingRef
                                    ? ''
                                    : `<button type="button" class="btn btn-outline btn-sm" data-resend-confirm="${escapeHtml(c.bookingRef)}">Send confirmation</button>`}
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

        adminPatientsBody.querySelectorAll('[data-resend-confirm]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendBookingConfirmationEmail(btn.getAttribute('data-resend-confirm'), btn);
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
            if (scheduleNextService && p.service) {
                const want = String(p.service);
                if (want && !Array.from(scheduleNextService.options).some((o) => o.value === want)) {
                    const opt = document.createElement('option');
                    opt.value = want;
                    opt.textContent = SERVICE_LABELS_ADMIN[want] || want;
                    scheduleNextService.appendChild(opt);
                }
                scheduleNextService.value = want;
            }
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
    const adminPayoutsList = document.getElementById('adminPayoutsList');

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
            await loadAdminPayouts();
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

    function payoutCheckLabel(on, label) {
        return `<span class="clinic-payout-check${on ? ' is-on' : ''}">${escapeHtml(label)}</span>`;
    }

    async function loadAdminPayouts() {
        if (!adminPayoutsList) return;
        try {
            const res = await fetch('/api/admin/payouts');
            if (res.status === 401) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const staff = data.staff || [];
            if (!staff.length) {
                adminPayoutsList.innerHTML = '<p class="admin-empty-list">No professionals yet.</p>';
                return;
            }
            adminPayoutsList.innerHTML = staff.map((person) => {
                const months = (person.months || []).map((m) => {
                    const month = encodeURIComponent(m.month || '');
                    const user = encodeURIComponent(person.username || '');
                    const download = m.hasInvoice
                        ? `<a class="btn btn-outline btn-sm" href="/api/admin/payouts/${user}/${month}/invoice">Download fatura</a>`
                        : '<span class="dash-section-subtitle">No fatura</span>';
                    const checked = m.paymentSent ? ' checked' : '';
                    return `<div class="admin-payout-month">
                        <p class="admin-payout-month-line">${escapeHtml(m.lineLabel || m.label || '')}</p>
                        <div class="admin-payout-month-actions">
                            ${payoutCheckLabel(!!m.hasInvoice, 'Fatura uploaded')}
                            ${download}
                            <label class="clinic-toggle-label">
                                <input type="checkbox" class="admin-payout-sent" data-payout-user="${escapeHtml(person.username || '')}" data-payout-month="${escapeHtml(m.month || '')}"${checked}>
                                <span>Payment sent</span>
                            </label>
                        </div>
                    </div>`;
                }).join('');
                const iban = person.iban
                    ? `IBAN: ${escapeHtml(person.iban)}`
                    : 'No IBAN saved';
                return `<article class="admin-payout-card">
                    <h3>${escapeHtml(person.displayName || person.username || '')}</h3>
                    <p class="admin-payout-iban">${iban}</p>
                    <div class="admin-payout-months">${months}</div>
                </article>`;
            }).join('');
        } catch (err) {
            console.error('Load payouts:', err);
            adminPayoutsList.innerHTML = '<p class="admin-empty-list">Could not load faturas.</p>';
        }
    }

    if (adminPayoutsList) {
        adminPayoutsList.addEventListener('change', async (e) => {
            const box = e.target.closest('.admin-payout-sent');
            if (!box) return;
            const username = box.getAttribute('data-payout-user');
            const month = box.getAttribute('data-payout-month');
            if (!username || !month) return;
            box.disabled = true;
            try {
                const res = await fetch(`/api/admin/payouts/${encodeURIComponent(username)}/${encodeURIComponent(month)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentSent: box.checked })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Failed to update payment');
            } catch (err) {
                box.checked = !box.checked;
                alert(err.message || 'Failed to update payment');
            } finally {
                box.disabled = false;
            }
        });
    }

    function showLoginError(el, message) {
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    }

    function setAdminAuthView(view) {
        const mode = ['totp', 'totp-setup', 'totp-recover', 'totp-codes', 'staff-password'].includes(view) ? view : 'signin';
        if (adminLoginForm) adminLoginForm.hidden = mode !== 'signin';
        if (adminStaffPasswordForm) adminStaffPasswordForm.hidden = mode !== 'staff-password';
        if (adminTotpForm) adminTotpForm.hidden = mode !== 'totp';
        if (adminTotpSetupForm) adminTotpSetupForm.hidden = mode !== 'totp-setup';
        if (adminTotpRecoverForm) adminTotpRecoverForm.hidden = mode !== 'totp-recover';
        if (adminTotpCodesPanel) adminTotpCodesPanel.hidden = mode !== 'totp-codes';
        showLoginError(adminLoginError, '');
        showLoginError(adminTotpError, '');
        showLoginError(adminTotpSetupError, '');
        showLoginError(adminTotpRecoverError, '');
        if (mode === 'totp' && adminTotpCode) adminTotpCode.focus();
        if (mode === 'totp-setup' && adminTotpSetupCode) adminTotpSetupCode.focus();
        if (mode === 'totp-recover' && adminTotpRecoverCode) adminTotpRecoverCode.focus();
        if (mode === 'staff-password' && adminStaffPasswordEmail) adminStaffPasswordEmail.focus();
    }

    if (staffResetCode) setAdminAuthView('staff-password');

    let pendingAdminLogin = null;

    async function enterAdminSession() {
        const next = safeDirectoryNext();
        if (next) {
            window.location.replace(next);
            return;
        }
        showAdminContent();
        await loadSchedule();
    }

    function finishAdminLogin(data) {
        if (data.role && data.role !== 'admin') {
            setAdminAuthView('signin');
            showLoginError(adminLoginError, 'This account is not an administrator. Use the administrator username.');
            return;
        }
        if (Array.isArray(data.recoveryCodes) && data.recoveryCodes.length) {
            pendingAdminLogin = data;
            if (adminTotpCodesList) adminTotpCodesList.textContent = data.recoveryCodes.join('\n');
            setAdminAuthView('totp-codes');
            return;
        }
        void enterAdminSession();
    }

    // ─── Login handler ───
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoginError(adminLoginError, '');

            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;

            try {
                const res = await fetch('/api/clinic/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok && data.requiresTotpSetup) {
                    if (adminTotpSecret) {
                        adminTotpSecret.value = String(data.secret || '').replace(/(.{4})/g, '$1 ').trim();
                    }
                    if (adminTotpOtpauth && adminTotpOtpauthWrap) {
                        if (data.otpauthUrl) {
                            adminTotpOtpauth.href = data.otpauthUrl;
                            adminTotpOtpauthWrap.hidden = false;
                        } else {
                            adminTotpOtpauthWrap.hidden = true;
                        }
                    }
                    setAdminAuthView('totp-setup');
                } else if (res.ok && data.requiresTotp) {
                    setAdminAuthView('totp');
                } else if (res.ok && data.success) {
                    finishAdminLogin(data);
                } else {
                    showLoginError(adminLoginError, data.error || 'Invalid username or password');
                }
            } catch (err) {
                showLoginError(adminLoginError, 'Connection error. Please try again.');
            }
        });
    }

    async function submitAdminTotp(code, { recover } = {}) {
        const path = recover ? '/api/clinic/login/totp/recover' : '/api/clinic/login/totp';
        const res = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ code })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Código inválido.');
        }
        finishAdminLogin(data);
    }

    if (adminTotpForm) {
        adminTotpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await submitAdminTotp(adminTotpCode ? adminTotpCode.value.trim() : '');
            } catch (err) {
                showLoginError(adminTotpError, err.message || 'Código inválido.');
            }
        });
    }
    if (adminTotpSetupForm) {
        adminTotpSetupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await submitAdminTotp(adminTotpSetupCode ? adminTotpSetupCode.value.trim() : '');
            } catch (err) {
                showLoginError(adminTotpSetupError, err.message || 'Código inválido.');
            }
        });
    }
    if (adminTotpRecoverForm) {
        adminTotpRecoverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await submitAdminTotp(adminTotpRecoverCode ? adminTotpRecoverCode.value.trim() : '', { recover: true });
            } catch (err) {
                showLoginError(adminTotpRecoverError, err.message || 'Código inválido.');
            }
        });
    }
    if (adminTotpRecoverLink) {
        adminTotpRecoverLink.addEventListener('click', () => setAdminAuthView('totp-recover'));
    }
    if (adminTotpRecoverBack) {
        adminTotpRecoverBack.addEventListener('click', () => setAdminAuthView('totp'));
    }
    if (adminTotpCodesContinue) {
        adminTotpCodesContinue.addEventListener('click', () => {
            const pending = pendingAdminLogin;
            pendingAdminLogin = null;
            if (pending) finishAdminLogin({ ...pending, recoveryCodes: null });
            else void enterAdminSession();
        });
    }
    [adminTotpCode, adminTotpSetupCode].forEach((el) => {
        if (!el) return;
        el.addEventListener('input', () => {
            el.value = el.value.replace(/\D/g, '').slice(0, 6);
        });
    });

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

    // ─── Staff availability (per professional) ───
    const staffAvailSelect = document.getElementById('staffAvailSelect');
    const staffAvailHint = document.getElementById('staffAvailHint');
    const staffAvailError = document.getElementById('staffAvailError');
    const staffAvailEditor = document.getElementById('staffAvailEditor');
    const staffWeeklyDays = document.getElementById('staffWeeklyDays');
    const staffWeeklyStart = document.getElementById('staffWeeklyStart');
    const staffWeeklyEnd = document.getElementById('staffWeeklyEnd');
    const staffWeeklyHoursRow = document.getElementById('staffWeeklyHoursRow');
    const staffWeeklyHoursHint = document.getElementById('staffWeeklyHoursHint');
    const staffWeeklyPlatformHint = document.getElementById('staffWeeklyPlatformHint');
    const staffAvailCalPrev = document.getElementById('staffAvailCalPrev');
    const staffAvailCalNext = document.getElementById('staffAvailCalNext');
    const staffAvailCalMonthLabel = document.getElementById('staffAvailCalMonthLabel');
    const staffAvailCalGrid = document.getElementById('staffAvailCalGrid');
    const staffAvailDaysList = document.getElementById('staffAvailDaysList');
    const staffAvailBulkStart = document.getElementById('staffAvailBulkStart');
    const staffAvailBulkEnd = document.getElementById('staffAvailBulkEnd');
    const staffAvailBulkEnabled = document.getElementById('staffAvailBulkEnabled');
    const staffAvailBulkApply = document.getElementById('staffAvailBulkApply');
    const staffAvailBulkRemove = document.getElementById('staffAvailBulkRemove');
    const staffAvailBulkClear = document.getElementById('staffAvailBulkClear');

    function staffTimeToMinutes(hhmm) {
        const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
        if (!m) return null;
        return Number(m[1]) * 60 + Number(m[2]);
    }

    function staffMinutesToTime(mins) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function intersectHoursClient(a, b) {
        const left = a && a.enabled !== false ? a : null;
        const right = b && b.enabled !== false ? b : null;
        if (!left || !right) return null;
        const fromA = staffTimeToMinutes(left.start);
        const fromB = staffTimeToMinutes(right.start);
        const toA = staffTimeToMinutes(left.end);
        const toB = staffTimeToMinutes(right.end);
        if (fromA == null || fromB == null || toA == null || toB == null) return null;
        const from = Math.max(fromA, fromB);
        const to = Math.min(toA, toB);
        if (to <= from) return null;
        return { start: staffMinutesToTime(from), end: staffMinutesToTime(to) };
    }

    function mergeHourRangesClient(ranges) {
        const open = (ranges || []).filter((row) => row && row.start && row.end)
            .slice()
            .sort((a, b) => staffTimeToMinutes(a.start) - staffTimeToMinutes(b.start));
        const merged = [];
        open.forEach((row) => {
            const last = merged[merged.length - 1];
            const start = staffTimeToMinutes(row.start);
            const end = staffTimeToMinutes(row.end);
            if (start == null || end == null || end <= start) return;
            if (!last || start > staffTimeToMinutes(last.end)) {
                merged.push({ start: row.start, end: row.end });
            } else if (end > staffTimeToMinutes(last.end)) {
                last.end = row.end;
            }
        });
        return merged;
    }

    function formatMergedRanges(ranges) {
        if (!ranges || !ranges.length) return '';
        return ranges.map((row) => formatHourRange(row.start, row.end)).join(' · ');
    }

    function currentPlatformSource() {
        if (hoursBoardPlatform && hoursBoardPlatform.weekly && hoursBoardPlatform.weekly.monday) {
            return hoursBoardPlatform;
        }
        return scheduleData || hoursBoardPlatform || {};
    }

    function platformWeeklyRow(day, source) {
        const src = source || currentPlatformSource();
        const weekly = src.weekly || src.workingHours || {};
        return weekly[day] || null;
    }

    function formatHourRange(start, end) {
        return `${String(start || '').slice(0, 5)}–${String(end || '').slice(0, 5)}`;
    }

    function compactWeeklyLabel(weekly) {
        if (!weekly) return '';
        const groups = [];
        STAFF_WEEKDAYS.forEach(([day, short]) => {
            const row = weekly[day];
            const key = !row || !row.enabled ? 'off' : `${row.start}-${row.end}`;
            const last = groups[groups.length - 1];
            if (last && last.key === key) last.days.push(short);
            else groups.push({ key, days: [short], row });
        });
        return groups.map((g) => {
            const span = g.days.length === 1 ? g.days[0] : `${g.days[0]}–${g.days[g.days.length - 1]}`;
            if (g.key === 'off') return `${span} closed`;
            return `${span} ${formatHourRange(g.row.start, g.row.end)}`;
        }).join(' · ');
    }

    function updateStaffWeeklyPlatformHint() {
        if (!staffWeeklyPlatformHint) return;
        const weekly = (staffAvailData && staffAvailData.weekly) || {};
        const enabledDays = STAFF_WEEKDAYS.filter(([day]) => weekly[day] && weekly[day].enabled);
        const platformSrc = currentPlatformSource();
        const platformWeekly = platformSrc.weekly || platformSrc.workingHours;
        if (!enabledDays.length) {
            const windowLabel = compactWeeklyLabel(platformWeekly);
            staffWeeklyPlatformHint.textContent = windowLabel
                ? `Clinic window: ${windowLabel}. These hours join everyone else in this profession — patients book the combined coverage.`
                : 'These hours join everyone else in this profession. Patients book the combined coverage, inside clinic opening hours.';
            return;
        }
        const offered = [];
        const outside = [];
        enabledDays.forEach(([day, , longLabel]) => {
            const staff = weekly[day];
            const plat = platformWeeklyRow(day, platformSrc);
            const book = intersectHoursClient(staff, plat);
            if (!book) {
                const platLabel = plat && plat.enabled ? formatHourRange(plat.start, plat.end) : 'closed';
                outside.push(`${longLabel} (${platLabel})`);
                return;
            }
            offered.push(`${longLabel} ${formatHourRange(book.start, book.end)}`);
        });
        if (outside.length && !offered.length) {
            staffWeeklyPlatformHint.textContent = `These hours sit outside the clinic window (${outside.join(', ')}), so they do not add to this profession’s booking page.`;
            return;
        }
        if (outside.length) {
            staffWeeklyPlatformHint.textContent = `Adds ${offered.join('; ')} to this profession’s combined hours. Not added: ${outside.join(', ')}.`;
            return;
        }
        staffWeeklyPlatformHint.textContent = `Adds ${offered.join('; ')} to this profession’s combined hours. Patients see the union of the whole team.`;
    }

    function emptyStaffWeekly() {
        const out = {};
        STAFF_WEEKDAYS.forEach(([day]) => {
            out[day] = { enabled: false, start: '09:00', end: '17:00' };
        });
        return out;
    }

    function staffWeekdayFromDate(dateStr) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
        if (!m) return '';
        const dateObj = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()] || '';
    }

    function markStaffAvailDirty() {
        staffAvailDirty = true;
        updateSaveButtonState();
    }

    function setStaffAvailError(message) {
        if (!staffAvailError) return;
        if (!message) {
            staffAvailError.style.display = 'none';
            staffAvailError.textContent = '';
            return;
        }
        staffAvailError.textContent = message;
        staffAvailError.style.display = 'block';
    }

    function staffWeeklyHoursForDate(dateStr) {
        const weekly = (staffAvailData && staffAvailData.weekly) || {};
        const key = staffWeekdayFromDate(dateStr);
        const row = weekly[key];
        if (!row || !row.enabled) return null;
        return { start: row.start || '09:00', end: row.end || '17:00' };
    }

    function staffWeeklyHourDefaults() {
        return {
            start: (staffWeeklyStart && staffWeeklyStart.value) || '09:00',
            end: (staffWeeklyEnd && staffWeeklyEnd.value) || '17:00'
        };
    }

    function firstEnabledStaffWeeklyDay(weekly) {
        const hours = weekly || {};
        return STAFF_WEEKDAYS.find(([day]) => hours[day] && hours[day].enabled);
    }

    function syncStaffWeeklyHourInputs() {
        const weekly = (staffAvailData && staffAvailData.weekly) || emptyStaffWeekly();
        const first = firstEnabledStaffWeeklyDay(weekly);
        const row = first ? weekly[first[0]] : null;
        if (staffWeeklyStart) staffWeeklyStart.value = (row && row.start) || '09:00';
        if (staffWeeklyEnd) staffWeeklyEnd.value = (row && row.end) || '17:00';
    }

    function applyStaffWeeklyHoursToEnabledDays() {
        if (!staffAvailData) return;
        const weekly = staffAvailData.weekly || emptyStaffWeekly();
        const hours = staffWeeklyHourDefaults();
        STAFF_WEEKDAYS.forEach(([day]) => {
            const row = weekly[day] || { enabled: false, start: hours.start, end: hours.end };
            if (row.enabled) {
                row.start = hours.start;
                row.end = hours.end;
            }
            weekly[day] = row;
        });
        staffAvailData.weekly = weekly;
    }

    function readStaffWeeklyFromGrid() {
        if (staffAvailData && staffAvailData.weekly) return staffAvailData.weekly;
        return emptyStaffWeekly();
    }

    function renderStaffWeeklyGrid() {
        if (!staffWeeklyDays || !staffAvailData) return;
        const weekly = staffAvailData.weekly || emptyStaffWeekly();
        const selectedCount = STAFF_WEEKDAYS.filter(([day]) => weekly[day] && weekly[day].enabled).length;
        staffWeeklyDays.innerHTML = '';
        STAFF_WEEKDAYS.forEach(([day, shortLabel, longLabel]) => {
            const dayData = weekly[day] || { enabled: false, start: '09:00', end: '17:00' };
            const plat = platformWeeklyRow(day);
            const outside = !!(dayData.enabled && !intersectHoursClient(dayData, plat));
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'admin-weekly-day'
                + (dayData.enabled ? ' is-selected' : '')
                + (outside ? ' is-outside' : '');
            btn.textContent = shortLabel;
            btn.setAttribute('aria-pressed', dayData.enabled ? 'true' : 'false');
            btn.setAttribute('aria-label', longLabel);
            btn.addEventListener('click', () => {
                const next = staffAvailData.weekly || emptyStaffWeekly();
                const row = next[day] || { enabled: false, start: '09:00', end: '17:00' };
                row.enabled = !row.enabled;
                if (row.enabled) {
                    const hours = staffWeeklyHourDefaults();
                    row.start = hours.start;
                    row.end = hours.end;
                }
                next[day] = row;
                staffAvailData.weekly = next;
                markStaffAvailDirty();
                renderStaffWeeklyGrid();
                renderStaffAvailCalendar();
            });
            staffWeeklyDays.appendChild(btn);
        });
        if (staffWeeklyHoursRow) {
            staffWeeklyHoursRow.classList.toggle('is-idle', selectedCount === 0);
        }
        if (staffWeeklyHoursHint) {
            staffWeeklyHoursHint.textContent = selectedCount
                ? 'These hours apply to the selected days, every week.'
                : 'Select the days first, then set the hours.';
        }
        if (selectedCount) syncStaffWeeklyHourInputs();
        updateStaffWeeklyPlatformHint();
    }

    function ensureStaffAvailCalInitialized() {
        if (staffAvailCalYear === null || staffAvailCalMonth === null) {
            const t = new Date();
            staffAvailCalYear = t.getFullYear();
            staffAvailCalMonth = t.getMonth();
        }
    }

    function renderStaffAvailDaysList() {
        if (!staffAvailDaysList || !staffAvailData) return;
        const list = (staffAvailData.dayOverrides || []).slice().sort((a, b) =>
            a.date.localeCompare(b.date) || String(a.start || '').localeCompare(String(b.start || ''))
        );
        staffAvailDaysList.innerHTML = '';
        if (!list.length) return;
        list.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'admin-blocked-item';
            const formatted = new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
            const hoursLabel = entry.enabled !== false
                ? `${entry.start} – ${entry.end}`
                : 'Closed';
            item.innerHTML = `
                <span>${formatted}: ${hoursLabel}</span>
                <button type="button" class="admin-remove-btn" data-staff-od="${entry.date}" aria-label="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            staffAvailDaysList.appendChild(item);
            item.querySelector('.admin-remove-btn').addEventListener('click', () => {
                // Remove only this block; other blocks on the same date stay.
                staffAvailData.dayOverrides = (staffAvailData.dayOverrides || []).filter((o) => o !== entry);
                if (!(staffAvailData.dayOverrides || []).some((o) => o.date === entry.date)) {
                    staffAvailSelectedDates.delete(entry.date);
                }
                markStaffAvailDirty();
                renderStaffAvailDaysList();
                renderStaffAvailCalendar();
            });
        });
    }

    function renderStaffAvailCalendar() {
        if (!staffAvailCalGrid || !staffAvailCalMonthLabel || !staffAvailData) return;
        ensureStaffAvailCalInitialized();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        staffAvailCalMonthLabel.textContent = `${monthNames[staffAvailCalMonth]} ${staffAvailCalYear}`;
        const firstDay = new Date(staffAvailCalYear, staffAvailCalMonth, 1).getDay();
        const daysInMonth = new Date(staffAvailCalYear, staffAvailCalMonth + 1, 0).getDate();
        const startDay = (firstDay + 6) % 7;
        const today0 = startOfToday();
        staffAvailCalGrid.innerHTML = '';
        // A date may hold several blocks (e.g. 10–12 and 15–17).
        const overrideMap = new Map();
        (staffAvailData.dayOverrides || []).forEach((o) => {
            if (!o || !o.date) return;
            if (!overrideMap.has(o.date)) overrideMap.set(o.date, []);
            overrideMap.get(o.date).push(o);
        });
        for (let i = 0; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'admin-override-cal-empty';
            staffAvailCalGrid.appendChild(empty);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = formatOverrideDateKey(staffAvailCalYear, staffAvailCalMonth, d);
            const dateObj = new Date(staffAvailCalYear, staffAvailCalMonth, d);
            dateObj.setHours(0, 0, 0, 0);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'admin-override-day';
            const num = document.createElement('span');
            num.className = 'admin-override-day-num';
            num.textContent = String(d);
            btn.appendChild(num);
            const ovList = overrideMap.get(dateKey) || [];
            const openBlocks = ovList.filter((o) => o.enabled !== false);
            const weekly = !ovList.length ? staffWeeklyHoursForDate(dateKey) : null;
            if (ovList.length) {
                const label = document.createElement('span');
                label.className = 'admin-override-day-hours' + (openBlocks.length ? '' : ' is-closed');
                label.textContent = openBlocks.length
                    ? openBlocks
                        .slice()
                        .sort((a, b) => String(a.start).localeCompare(String(b.start)))
                        .map((o) => `${String(o.start).slice(0, 5)}–${String(o.end).slice(0, 5)}`)
                        .join(' · ')
                    : 'Closed';
                btn.appendChild(label);
                btn.classList.add('admin-override-has-rule');
            } else if (weekly) {
                const label = document.createElement('span');
                label.className = 'admin-override-day-hours is-template';
                label.textContent = `${String(weekly.start).slice(0, 5)}–${String(weekly.end).slice(0, 5)}`;
                btn.appendChild(label);
            }
            if (dateObj < today0) {
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => {
                    if (staffAvailSelectedDates.has(dateKey)) staffAvailSelectedDates.delete(dateKey);
                    else staffAvailSelectedDates.add(dateKey);
                    renderStaffAvailCalendar();
                });
            }
            if (staffAvailSelectedDates.has(dateKey)) btn.classList.add('admin-override-selected');
            staffAvailCalGrid.appendChild(btn);
        }
    }

    function applyStaffAvailToSelection() {
        if (!staffAvailData || !staffAvailSelectedDates.size) return;
        const start = (staffAvailBulkStart && staffAvailBulkStart.value) || '09:00';
        const end = (staffAvailBulkEnd && staffAvailBulkEnd.value) || '17:00';
        const enabled = staffAvailBulkEnabled ? staffAvailBulkEnabled.checked : true;
        // Replace every block on the selected dates with the new one; leave other dates untouched.
        const kept = (staffAvailData.dayOverrides || []).filter((o) => o && !staffAvailSelectedDates.has(o.date));
        staffAvailSelectedDates.forEach((date) => {
            kept.push({ date, enabled, start, end });
        });
        staffAvailData.dayOverrides = kept.sort((a, b) =>
            a.date.localeCompare(b.date) || String(a.start || '').localeCompare(String(b.start || ''))
        );
        markStaffAvailDirty();
        renderStaffAvailCalendar();
        renderStaffAvailDaysList();
    }

    function removeStaffAvailSelection() {
        if (!staffAvailData || !staffAvailSelectedDates.size) return;
        staffAvailData.dayOverrides = (staffAvailData.dayOverrides || [])
            .filter((o) => !staffAvailSelectedDates.has(o.date));
        markStaffAvailDirty();
        renderStaffAvailCalendar();
        renderStaffAvailDaysList();
    }

    function renderStaffAvailHint(person) {
        if (!staffAvailHint) return;
        if (!person) {
            staffAvailHint.hidden = true;
            staffAvailHint.textContent = '';
            return;
        }
        if (!person.profession) {
            staffAvailHint.hidden = false;
            staffAvailHint.innerHTML = 'Set this person’s profession in <strong>Professionals</strong> so the hours appear on the right consultation.';
            return;
        }
        staffAvailHint.hidden = false;
        staffAvailHint.textContent = `${person.professionLabel || person.profession}: ${person.consultHint || 'hours feed that profession’s booking pages.'} Patients book the combined hours of everyone in this profession.`;
    }

    function fillStaffAvailSelect() {
        if (!staffAvailSelect) return;
        const current = staffAvailSelect.value;
        staffAvailSelect.innerHTML = '<option value="">Choose a professional…</option>';
        staffAvailPeople.forEach((person) => {
            const opt = document.createElement('option');
            opt.value = person.username;
            const tag = person.professionLabel || 'No profession';
            const hours = person.hasHours
                ? `${person.weeklyDays} weekly day${person.weeklyDays === 1 ? '' : 's'}`
                : 'no hours yet';
            opt.textContent = `${person.displayName} · ${tag} · ${hours}`;
            staffAvailSelect.appendChild(opt);
        });
        if (current && staffAvailPeople.some((p) => p.username === current)) {
            staffAvailSelect.value = current;
        }
    }

    async function loadStaffAvailabilityPicker() {
        setStaffAvailError('');
        try {
            const res = await fetch('/api/admin/staff-availability', { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Failed to load professionals');
            const data = await res.json();
            staffAvailPeople = data.people || [];
            if (data.platform) hoursBoardPlatform = data.platform;
            fillStaffAvailSelect();
            if (staffAvailUsername) {
                if (staffAvailSelect) staffAvailSelect.value = staffAvailUsername;
                updateSaveButtonState();
                return loadSelectedStaffAvailability(staffAvailUsername);
            }
            updateSaveButtonState();
        } catch (err) {
            console.error('Load staff availability list:', err);
            setStaffAvailError('Could not load professionals.');
        }
    }

    let hoursBoardPeople = [];
    let hoursBoardFilter = 'all';
    const hoursBoardSearch = document.getElementById('hoursBoardSearch');
    const hoursBoardRefreshBtn = document.getElementById('hoursBoardRefreshBtn');
    const hoursBoardBody = document.getElementById('hoursBoardBody');
    const hoursBoardSummary = document.getElementById('hoursBoardSummary');

    function platformHoursForDateClient(dateStr) {
        const plat = hoursBoardPlatform || {};
        if ((plat.blockedDates || []).includes(dateStr)) return null;
        const ov = (plat.dayOverrides || []).find((item) => item && item.date === dateStr);
        if (ov) return ov.enabled === false ? null : ov;
        return platformWeeklyRow(staffWeekdayFromDate(dateStr), plat);
    }

    function formatCrossedHoursCell(staffRow, platformRow) {
        const staff = staffRow && staffRow.enabled ? staffRow : null;
        const plat = platformRow && platformRow.enabled ? platformRow : null;
        if (!staff) {
            return {
                html: '<span class="admin-hours-off">—</span>',
                outside: false
            };
        }
        const bookable = intersectHoursClient(staff, plat);
        if (!bookable) {
            return {
                html: `<div class="admin-hours-cell"><span class="admin-hours-outside">${escapeHtml(formatHourRange(staff.start, staff.end))}</span><span class="admin-hours-clip">outside clinic</span></div>`,
                outside: true
            };
        }
        const clipped = bookable.start !== staff.start || bookable.end !== staff.end;
        const clip = clipped
            ? `<span class="admin-hours-clip">adds ${escapeHtml(formatHourRange(bookable.start, bookable.end))}</span>`
            : '';
        return {
            html: `<div class="admin-hours-cell"><span class="admin-hours-on">${escapeHtml(formatHourRange(staff.start, staff.end))}</span>${clip}</div>`,
            outside: false
        };
    }

    function formatHoursException(entry) {
        const date = new Date(`${entry.date}T12:00:00`);
        const when = Number.isNaN(date.getTime())
            ? String(entry.date || '')
            : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        if (entry.enabled === false) return `${when}: closed`;
        const staffRange = formatHourRange(entry.start, entry.end);
        const plat = platformHoursForDateClient(entry.date);
        const bookable = intersectHoursClient(
            { enabled: true, start: entry.start, end: entry.end },
            plat
        );
        if (bookable) {
            const bookRange = formatHourRange(bookable.start, bookable.end);
            if (bookRange !== staffRange) return `${when}: ${bookRange} (staff ${staffRange})`;
            return `${when}: ${bookRange}`;
        }
        return `${when}: ${staffRange} (outside clinic)`;
    }

    function hoursBoardVisiblePeople() {
        const q = String((hoursBoardSearch && hoursBoardSearch.value) || '').trim().toLowerCase();
        return (hoursBoardPeople || []).filter((person) => {
            if (hoursBoardFilter === 'missing' && person.hasHours) return false;
            if (hoursBoardFilter === 'outside' && !person.hasOutsideHours) return false;
            if (!q) return true;
            const hay = [
                person.displayName,
                person.username,
                person.professionLabel,
                person.profession
            ].join(' ').toLowerCase();
            return hay.indexOf(q) >= 0;
        });
    }

    function hoursBoardPlatformRowHtml() {
        const weekly = (hoursBoardPlatform && hoursBoardPlatform.weekly) || {};
        return `<tr class="admin-hours-platform-row">
            <td><strong>Clinic open</strong></td>
            <td>Outer window</td>
            ${STAFF_WEEKDAYS.map(([day]) => {
                const row = weekly[day];
                if (!row || !row.enabled) return '<td><span class="admin-hours-off">Closed</span></td>';
                return `<td><span class="admin-hours-platform">${escapeHtml(formatHourRange(row.start, row.end))}</span></td>`;
            }).join('')}
            <td class="admin-hours-extra"><span class="admin-hours-off">Clinic exceptions apply</span></td>
            <td></td>
        </tr>`;
    }

    const HOURS_BOARD_PROFESSIONS = [
        ['psicologo', 'Psicologia'],
        ['medico', 'Medicina'],
        ['nutricionista', 'Nutrição']
    ];

    function hoursBoardProfessionRowsHtml() {
        const platformWeekly = (hoursBoardPlatform && hoursBoardPlatform.weekly) || {};
        return HOURS_BOARD_PROFESSIONS.map(([profession, label]) => {
            const team = (hoursBoardPeople || []).filter((p) => p.profession === profession && p.hasHours);
            const count = team.length;
            const countLabel = count
                ? `${count} professional${count === 1 ? '' : 's'}`
                : 'no hours set';
            return `<tr class="admin-hours-profession-row">
                <td><strong>${escapeHtml(label)}</strong></td>
                <td>${escapeHtml(countLabel)}</td>
                ${STAFF_WEEKDAYS.map(([day]) => {
                    const ranges = mergeHourRangesClient(
                        team.map((person) => intersectHoursClient(
                            (person.weekly || {})[day],
                            platformWeekly[day]
                        )).filter(Boolean)
                    );
                    if (!ranges.length) {
                        return '<td><span class="admin-hours-off">—</span></td>';
                    }
                    return `<td><span class="admin-hours-offered">${escapeHtml(formatMergedRanges(ranges))}</span></td>`;
                }).join('')}
                <td class="admin-hours-extra"><span class="admin-hours-off">Offered to patients</span></td>
                <td></td>
            </tr>`;
        }).join('');
    }

    function renderHoursBoard() {
        if (!hoursBoardBody) return;
        const missing = (hoursBoardPeople || []).filter((p) => !p.hasHours).length;
        const outside = (hoursBoardPeople || []).filter((p) => p.hasOutsideHours).length;
        const platformLabel = compactWeeklyLabel((hoursBoardPlatform && hoursBoardPlatform.weekly) || {});
        if (hoursBoardSummary) {
            const n = (hoursBoardPeople || []).length;
            const bits = [];
            if (platformLabel) bits.push(`Clinic: ${platformLabel}`);
            if (n) bits.push(`${n} professional${n === 1 ? '' : 's'}`);
            if (n) bits.push(`${missing} without hours`);
            if (n) bits.push(`${outside} outside clinic`);
            hoursBoardSummary.textContent = bits.join(' · ');
        }
        const rows = hoursBoardVisiblePeople();
        const headRows = hoursBoardPlatformRowHtml() + hoursBoardProfessionRowsHtml();
        if (!rows.length) {
            hoursBoardBody.innerHTML = headRows
                + '<tr><td colspan="11" class="admin-empty-list">No professionals match this view.</td></tr>';
            return;
        }
        const todayKey = formatOverrideDateKey(
            startOfToday().getFullYear(),
            startOfToday().getMonth(),
            startOfToday().getDate()
        );
        const platformWeekly = (hoursBoardPlatform && hoursBoardPlatform.weekly) || {};
        hoursBoardBody.innerHTML = headRows + rows.map((person) => {
            const weekly = person.weekly || {};
            const extras = (person.dayOverrides || [])
                .filter((item) => item && item.date && item.date >= todayKey)
                .sort((a, b) => String(a.date).localeCompare(String(b.date)));
            const extraHtml = extras.length
                ? extras.slice(0, 4).map((item) => escapeHtml(formatHoursException(item))).join('<br>')
                    + (extras.length > 4 ? `<br><span class="admin-hours-off">+${extras.length - 4} more</span>` : '')
                : '<span class="admin-hours-off">—</span>';
            const role = person.professionLabel || 'No profession';
            const flags = [];
            if (!person.hasHours) flags.push('No hours');
            if (!person.profession) flags.push('No profession');
            if (person.hasOutsideHours) flags.push('Outside clinic');
            else if (person.hasHours && person.hasOverlap === false) flags.push('No overlap');
            const flagHtml = flags.length
                ? `<div class="admin-hours-flags">${flags.map((f) => `<span>${escapeHtml(f)}</span>`).join('')}</div>`
                : '';
            const rowClass = !person.hasHours
                ? ' class="is-missing"'
                : person.hasOutsideHours
                    ? ' class="is-outside"'
                    : '';
            return `<tr${rowClass}>
                <td>
                    <strong>${escapeHtml(person.displayName || person.username)}</strong>
                    ${flagHtml}
                </td>
                <td>${escapeHtml(role)}</td>
                ${STAFF_WEEKDAYS.map(([day]) => {
                    const cell = formatCrossedHoursCell(weekly[day], platformWeekly[day]);
                    return `<td${cell.outside ? ' class="is-hours-outside"' : ''}>${cell.html}</td>`;
                }).join('')}
                <td class="admin-hours-extra">${extraHtml}</td>
                <td><button type="button" class="btn btn-outline btn-sm" data-hours-edit="${escapeHtml(person.username)}">Edit</button></td>
            </tr>`;
        }).join('');
        hoursBoardBody.querySelectorAll('[data-hours-edit]').forEach((btn) => {
            btn.addEventListener('click', () => {
                staffAvailUsername = btn.getAttribute('data-hours-edit') || '';
                setAdminPanel('availability');
            });
        });
    }

    async function loadHoursBoard() {
        if (!hoursBoardBody) return;
        hoursBoardBody.innerHTML = '<tr><td colspan="11" class="admin-empty-list">Loading…</td></tr>';
        try {
            const res = await fetch('/api/admin/staff-availability', { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            hoursBoardPlatform = data.platform || { weekly: {}, dayOverrides: [], blockedDates: [] };
            hoursBoardPeople = (data.people || []).slice().sort((a, b) => {
                if (!!a.hasHours !== !!b.hasHours) return a.hasHours ? 1 : -1;
                if (!!a.hasOutsideHours !== !!b.hasOutsideHours) return a.hasOutsideHours ? -1 : 1;
                return String(a.displayName || '').localeCompare(String(b.displayName || ''), 'pt');
            });
            renderHoursBoard();
        } catch (err) {
            console.error('Load hours board:', err);
            hoursBoardBody.innerHTML = '<tr><td colspan="11" class="admin-empty-list">Could not load hours.</td></tr>';
        }
    }

    if (hoursBoardSearch) {
        hoursBoardSearch.addEventListener('input', () => renderHoursBoard());
    }
    if (hoursBoardRefreshBtn) {
        hoursBoardRefreshBtn.addEventListener('click', () => loadHoursBoard());
    }
    document.querySelectorAll('[data-hours-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
            hoursBoardFilter = btn.getAttribute('data-hours-filter') || 'all';
            document.querySelectorAll('[data-hours-filter]').forEach((el) => {
                el.classList.toggle('is-active', el === btn);
            });
            renderHoursBoard();
        });
    });

    async function loadSelectedStaffAvailability(username) {
        if (!username) {
            staffAvailUsername = '';
            staffAvailData = null;
            staffAvailDirty = false;
            staffAvailSelectedDates.clear();
            if (staffAvailEditor) staffAvailEditor.hidden = true;
            renderStaffAvailHint(null);
            updateSaveButtonState();
            return;
        }
        if (staffAvailDirty && staffAvailUsername && staffAvailUsername !== username) {
            const keep = window.confirm('Save hours for the current professional before switching?');
            if (keep) {
                const ok = await saveStaffAvailability();
                if (!ok) {
                    if (staffAvailSelect) staffAvailSelect.value = staffAvailUsername;
                    return;
                }
            }
        }
        setStaffAvailError('');
        try {
            const res = await fetch(`/api/admin/staff-availability/${encodeURIComponent(username)}`, {
                credentials: 'same-origin'
            });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            staffAvailUsername = username;
            staffAvailData = {
                weekly: data.weekly || emptyStaffWeekly(),
                dayOverrides: Array.isArray(data.dayOverrides) ? data.dayOverrides : []
            };
            staffAvailDirty = false;
            staffAvailSelectedDates.clear();
            if (staffAvailEditor) staffAvailEditor.hidden = false;
            renderStaffWeeklyGrid();
            renderStaffAvailCalendar();
            renderStaffAvailDaysList();
            renderStaffAvailHint(staffAvailPeople.find((p) => p.username === username) || null);
            updateSaveButtonState();
        } catch (err) {
            console.error('Load staff availability:', err);
            setStaffAvailError('Could not load this professional’s hours.');
        }
    }

    async function saveStaffAvailability() {
        if (!staffAvailUsername || !staffAvailData) return false;
        staffAvailData.weekly = readStaffWeeklyFromGrid();
        if (saveScheduleBtn) {
            saveScheduleBtn.disabled = true;
            saveScheduleBtn.textContent = 'Saving...';
        }
        try {
            const res = await fetch(`/api/admin/staff-availability/${encodeURIComponent(staffAvailUsername)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    weekly: staffAvailData.weekly,
                    dayOverrides: staffAvailData.dayOverrides || []
                })
            });
            if (!res.ok) throw new Error('Failed to save');
            const data = await res.json();
            staffAvailData.weekly = data.weekly || staffAvailData.weekly;
            staffAvailData.dayOverrides = Array.isArray(data.dayOverrides) ? data.dayOverrides : staffAvailData.dayOverrides;
            staffAvailDirty = false;
            renderStaffWeeklyGrid();
            renderStaffAvailCalendar();
            renderStaffAvailDaysList();
            if (saveScheduleBtn) {
                saveScheduleBtn.classList.remove('admin-save-dirty');
                saveScheduleBtn.textContent = '✓ Saved';
                setTimeout(() => {
                    if (!staffAvailDirty && saveScheduleBtn) {
                        saveScheduleBtn.textContent = 'Save availability';
                        saveScheduleBtn.disabled = false;
                    }
                }, 1600);
            }
            return true;
        } catch (err) {
            console.error('Save staff availability:', err);
            setStaffAvailError('Could not save hours. Try again.');
            if (saveScheduleBtn) {
                saveScheduleBtn.disabled = false;
                saveScheduleBtn.textContent = 'Save availability •';
                saveScheduleBtn.classList.add('admin-save-dirty');
            }
            return false;
        }
    }

    if (staffAvailSelect) {
        staffAvailSelect.addEventListener('change', () => {
            void loadSelectedStaffAvailability(staffAvailSelect.value);
        });
    }
    if (staffAvailCalPrev) {
        staffAvailCalPrev.addEventListener('click', () => {
            ensureStaffAvailCalInitialized();
            staffAvailCalMonth -= 1;
            if (staffAvailCalMonth < 0) {
                staffAvailCalMonth = 11;
                staffAvailCalYear -= 1;
            }
            renderStaffAvailCalendar();
        });
    }
    if (staffAvailCalNext) {
        staffAvailCalNext.addEventListener('click', () => {
            ensureStaffAvailCalInitialized();
            staffAvailCalMonth += 1;
            if (staffAvailCalMonth > 11) {
                staffAvailCalMonth = 0;
                staffAvailCalYear += 1;
            }
            renderStaffAvailCalendar();
        });
    }
    if (staffAvailBulkApply) staffAvailBulkApply.addEventListener('click', applyStaffAvailToSelection);
    if (staffAvailBulkRemove) staffAvailBulkRemove.addEventListener('click', removeStaffAvailSelection);
    if (staffAvailBulkClear) {
        staffAvailBulkClear.addEventListener('click', () => {
            staffAvailSelectedDates.clear();
            renderStaffAvailCalendar();
        });
    }
    function onStaffWeeklyHoursChange() {
        if (!staffAvailData) return;
        applyStaffWeeklyHoursToEnabledDays();
        markStaffAvailDirty();
        renderStaffWeeklyGrid();
        renderStaffAvailCalendar();
    }
    if (staffWeeklyStart) staffWeeklyStart.addEventListener('change', onStaffWeeklyHoursChange);
    if (staffWeeklyEnd) staffWeeklyEnd.addEventListener('change', onStaffWeeklyHoursChange);

    // ─── Save schedule ───
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', async () => {
            if (staffAvailUsername) {
                await saveStaffAvailability();
                return;
            }
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
    const inviteProfessional = document.getElementById('inviteProfessional');
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
        psicologia: 6000,
        terapia_casal: 7500,
        terapia_casal_mensal: 26000,
        psicologia_mensal: 22400,
        burnout: 6000,
        burnout_mensal: 21600,
        burnout_programa: 49000,
        longevidade: 7900,
        renovacao: 1900
    };

    function inviteProfessionForService(svc) {
        const key = String(svc || '');
        if (key === 'psicologia' || key.indexOf('terapia_casal') === 0 || key === 'burnout' || key.indexOf('burnout_') === 0) {
            return 'psicologo';
        }
        if (key.indexOf('nutricao') === 0) return 'nutricionista';
        if (
            key === 'clinica_geral'
            || key === 'urgente'
            || key === 'travel'
            || key === 'renovacao'
            || key === 'saude_mental'
            || key === 'longevidade'
            || key === 'infeccao_urinaria'
        ) return 'medico';
        return '';
    }

    async function ensureInviteStaffPeople() {
        if (staffAvailPeople && staffAvailPeople.length) return staffAvailPeople;
        try {
            const res = await fetch('/api/admin/staff-availability', { credentials: 'same-origin' });
            if (!res.ok) return staffAvailPeople || [];
            const data = await res.json();
            staffAvailPeople = data.people || [];
            if (data.platform) hoursBoardPlatform = data.platform;
            return staffAvailPeople;
        } catch (err) {
            console.error('Load invite professionals:', err);
            return staffAvailPeople || [];
        }
    }

    async function fillInviteProfessionalSelect() {
        if (!inviteProfessional) return;
        const current = inviteProfessional.value;
        const want = inviteProfessionForService(inviteService && inviteService.value);
        const people = await ensureInviteStaffPeople();
        let list = (people || []).slice();
        if (want) list = list.filter((p) => p.profession === want);
        list.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''), 'pt'));
        inviteProfessional.innerHTML = '<option value="">Choose a professional…</option>';
        list.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.username || p.displayName || '';
            opt.textContent = p.professionLabel
                ? `${p.displayName} · ${p.professionLabel}`
                : (p.displayName || p.username || '');
            inviteProfessional.appendChild(opt);
        });
        if (current && list.some((p) => (p.username || p.displayName) === current)) {
            inviteProfessional.value = current;
        }
    }

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
    if (inviteService) inviteService.addEventListener('change', () => {
        refreshInvitePriceUI();
        fillInviteProfessionalSelect();
    });
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
                professional: inviteProfessional ? inviteProfessional.value.trim() : '',
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
                fillInviteProfessionalSelect();
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
    const psychologistsRefreshBtn = document.getElementById('psychologistsRefreshBtn');
    const psychologistsAssignLoginsBtn = document.getElementById('psychologistsAssignLoginsBtn');
    const adminPsychCreds = document.getElementById('adminPsychCreds');
    const adminPsychCredsList = document.getElementById('adminPsychCredsList');
    const psychCredsCopyBtn = document.getElementById('psychCredsCopyBtn');
    let psychologistsCache = [];
    let lastPsychCredsText = '';

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

    const YES_NO = ['Sim', 'Não'];
    const BOLSA_FIELD_GROUPS = [
        {
            title: 'Dados pessoais',
            fields: [
                { key: 'nome', label: 'Nome completo', type: 'text', required: true, max: 120 },
                { key: 'email', label: 'Email', type: 'email', required: true, max: 160 },
                { key: 'telefone', label: 'Telefone', type: 'text', max: 40 },
                { key: 'localidade', label: 'Localidade', type: 'text', max: 120 },
                { key: 'pais', label: 'País', type: 'select', options: ['Portugal', 'Outro'] },
                { key: 'pais_especificar', label: 'País (se outro)', type: 'text', max: 80 }
            ]
        },
        {
            title: 'Formação e inscrição profissional',
            fields: [
                { key: 'opp_inscrito', label: 'Inscrito/a na OPP', type: 'select', options: YES_NO },
                { key: 'cedula_opp', label: 'Cédula OPP', type: 'text', max: 40 },
                { key: 'grau_academico', label: 'Grau académico', type: 'select', options: ['Mestrado Integrado em Psicologia', 'Licenciatura + Mestrado em Psicologia', 'Outro'] },
                { key: 'formacao_complementar', label: 'Formação complementar', type: 'textarea', max: 3000 }
            ]
        },
        {
            title: 'Experiência profissional',
            fields: [
                { key: 'anos_clinica', label: 'Anos em Psicologia Clínica', type: 'select', options: ['Menos de 1 ano', '1–2 anos', '3–5 anos', '6–10 anos', 'Mais de 10 anos'] },
                { key: 'anos_individuais', label: 'Anos em consultas individuais', type: 'select', options: ['Menos de 1 ano', '1–2 anos', '3–5 anos', '6–10 anos', 'Mais de 10 anos'] },
                { key: 'experiencia_online', label: 'Experiência em consultas online', type: 'select', options: ['Sim, atualmente', 'Sim, mas não atualmente', 'Não'] },
                { key: 'n_consultas_online', label: 'N.º consultas online', type: 'select', options: ['Menos de 20', '20–50', '50–100', '100–300', 'Mais de 300'] },
                { key: 'areas_clinicas', label: 'Áreas clínicas (separadas por vírgula)', type: 'text', max: 800, wide: true },
                { key: 'areas_outro', label: 'Outra área', type: 'text', max: 200 },
                { key: 'populacoes', label: 'Populações (separadas por vírgula)', type: 'text', max: 400, wide: true },
                { key: 'tipos_casos', label: 'Tipos de casos', type: 'textarea', max: 3000 }
            ]
        },
        {
            title: 'Disponibilidade',
            fields: [
                { key: 'horas_iniciais', label: 'Horas semanais iniciais', type: 'select', options: ['1 hora', '2 horas', '3 horas', '4 horas', 'Mais de 4 horas'] },
                { key: 'dias_semana', label: 'Dias da semana (separados por vírgula)', type: 'text', max: 200, wide: true },
                { key: 'horarios_fixos', label: 'Horários fixos', type: 'textarea', max: 2000 },
                { key: 'disponibilidade_estavel', label: 'Disponibilidade estável', type: 'select', options: ['Sim', 'Na maioria das semanas', 'Não'] },
                { key: 'aumento_futuro', label: 'Aumento de horas', type: 'select', options: ['Sim, a curto prazo', 'Sim, mas apenas futuramente', 'Talvez', 'Não'] },
                { key: 'horas_aumento', label: 'Horas para as quais poderia aumentar', type: 'select', options: ['3–4 horas', '5–8 horas', '9–12 horas', 'Mais de 12 horas', 'Depende da procura'] }
            ]
        },
        {
            title: 'Perfil clínico',
            fields: [
                { key: 'aceita_condicoes', label: 'Aceita as condições', type: 'select', options: YES_NO },
                { key: 'abordagem_terapeutica', label: 'Abordagem terapêutica', type: 'textarea', max: 2000 },
                { key: 'modelos', label: 'Modelos / abordagens (separados por vírgula)', type: 'text', max: 400, wide: true },
                { key: 'idiomas', label: 'Idiomas (separados por vírgula)', type: 'text', max: 200, wide: true },
                { key: 'videoconferencia', label: 'Videoconferência', type: 'select', options: YES_NO }
            ]
        },
        {
            title: 'Administrativo',
            fields: [
                { key: 'atividade_profissional', label: 'Atividade profissional aberta', type: 'select', options: ['Sim', 'Não', 'Posso abrir caso seja necessário'] },
                { key: 'rc_profissional', label: 'Seguro de responsabilidade civil', type: 'select', options: ['Sim', 'Não', 'Em processo de obtenção'] },
                { key: 'limitacoes', label: 'Limitações relevantes', type: 'textarea', max: 2000 },
                { key: 'entrevista_disponibilidade', label: 'Disponibilidade para entrevista', type: 'select', options: YES_NO },
                { key: 'periodos_entrevista', label: 'Períodos para entrevista', type: 'textarea', max: 1000 },
                { key: 'bolsa_autorizacao', label: 'Autorização bolsa / contactos futuros', type: 'select', options: YES_NO },
                { key: 'linkedin', label: 'LinkedIn / website', type: 'text', max: 300, wide: true }
            ]
        }
    ];

    function bolsaFieldValue(value) {
        if (Array.isArray(value)) return value.join(', ');
        return value == null ? '' : String(value);
    }

    function bolsaPayloadFromApp(a) {
        const p = (a && a.payload && typeof a.payload === 'object') ? a.payload : {};
        return {
            ...p,
            nome: p.nome || (a && a.name) || '',
            email: p.email || (a && a.email) || '',
            telefone: p.telefone || (a && a.phone) || '',
            localidade: p.localidade || (a && a.localidade) || '',
            pais: p.pais || (a && a.pais) || '',
            cedula_opp: p.cedula_opp || (a && a.cedulaOpp) || '',
            grau_academico: p.grau_academico || (a && a.grauAcademico) || '',
            anos_clinica: p.anos_clinica || (a && a.anosClinica) || '',
            anos_individuais: p.anos_individuais || (a && a.anosIndividuais) || '',
            experiencia_online: p.experiencia_online || (a && a.experienciaOnline) || '',
            areas_clinicas: p.areas_clinicas || (a && a.areasClinicas) || [],
            populacoes: p.populacoes || (a && a.populacoes) || [],
            idiomas: p.idiomas || (a && a.idiomas) || [],
            modelos: p.modelos || (a && a.modelos) || [],
            dias_semana: p.dias_semana || (a && a.diasSemana) || [],
            horas_iniciais: p.horas_iniciais || (a && a.horasIniciais) || '',
            horarios_fixos: p.horarios_fixos || (a && a.horariosFixos) || '',
            disponibilidade_estavel: p.disponibilidade_estavel || (a && a.disponibilidadeEstavel) || '',
            bolsa_autorizacao: p.bolsa_autorizacao || (a && a.bolsaAutorizacao) || ''
        };
    }

    function renderBolsaFieldControl(field, value, idPrefix) {
        const name = field.key;
        const id = `${idPrefix}-${name}`;
        const val = bolsaFieldValue(value);
        if (field.type === 'textarea') {
            return `<textarea id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="admin-input" rows="3" maxlength="${field.max || 3000}">${escapeHtml(val)}</textarea>`;
        }
        if (field.type === 'select') {
            const options = ['', ...(field.options || [])];
            return `<select id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="admin-select">
                ${options.map((o) => `<option value="${escapeHtml(o)}" ${val === o ? 'selected' : ''}>${escapeHtml(o || '—')}</option>`).join('')}
            </select>`;
        }
        return `<input id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="${escapeHtml(field.type || 'text')}" class="admin-input" value="${escapeHtml(val)}" maxlength="${field.max || 200}" ${field.required ? 'required' : ''}>`;
    }

    function renderBolsaFormHtml(payload, opts) {
        const prefix = (opts && opts.idPrefix) || 'bolsa';
        const data = payload || {};
        const groups = BOLSA_FIELD_GROUPS.map((group) => `
            <section class="admin-psych-section">
                <h4>${escapeHtml(group.title)}</h4>
                <div class="admin-bolsa-form-grid">
                    ${group.fields.map((field) => `
                        <div class="admin-form-group${field.wide || field.type === 'textarea' ? ' is-wide' : ''}">
                            <label for="${escapeHtml(prefix + '-' + field.key)}">${escapeHtml(field.label)}</label>
                            ${renderBolsaFieldControl(field, data[field.key], prefix)}
                        </div>
                    `).join('')}
                </div>
            </section>
        `).join('');
        const status = (opts && opts.status) || 'bolsa';
        const meta = `
            <section class="admin-psych-section">
                <h4>Pipeline</h4>
                <div class="admin-bolsa-form-grid">
                    <div class="admin-form-group">
                        <label for="${escapeHtml(prefix)}-status">Status</label>
                        <select id="${escapeHtml(prefix)}-status" name="status" class="admin-select">
                            ${PSYCH_STATUS_OPTIONS.map((s) => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    ${opts && opts.createLogin
                        ? `<label class="clinic-toggle-label is-wide" for="${escapeHtml(prefix)}-createLogin">
                            <input type="checkbox" id="${escapeHtml(prefix)}-createLogin" name="createLogin">
                            <span>Também criar ficha e login da clínica</span>
                        </label>`
                        : ''}
                </div>
            </section>
        `;
        return groups + meta;
    }

    function readBolsaForm(form) {
        if (!form) return { payload: {}, status: '', adminNotes: '', createLogin: false };
        const payload = {};
        form.querySelectorAll('[name]').forEach((el) => {
            const key = el.getAttribute('name');
            if (!key || key === 'status' || key === 'adminNotes' || key === 'createLogin') return;
            payload[key] = el.value;
        });
        const statusEl = form.querySelector('[name="status"]');
        const notesEl = form.querySelector('[name="adminNotes"]');
        const loginEl = form.querySelector('[name="createLogin"]');
        return {
            payload,
            status: statusEl ? statusEl.value : '',
            adminNotes: notesEl ? notesEl.value : '',
            createLogin: !!(loginEl && loginEl.checked)
        };
    }

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
        return `
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
                    ${a.hasCv
                        ? `<div class="admin-psych-qa">
                            <dt>CV enviado</dt>
                            <dd><a class="clinic-doc-link" href="/api/admin/psychologists/${encodeURIComponent(a.id)}/cv">${escapeHtml(a.cvFilename || 'Descarregar CV')}</a></dd>
                        </div>`
                        : psychQa('CV enviado', a.cvFilename || '—')}
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
            try {
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
                        ${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '—'}
                    </span>
                    <span class="admin-psych-col admin-psych-col-phone">
                        ${phone ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>` : '—'}
                    </span>
                    <span class="admin-psych-col admin-psych-col-role"><span class="admin-psych-role-tag">Psicólogo</span></span>
                    <span class="admin-psych-col admin-psych-col-status">${escapeHtml(a.status || 'novo')}</span>
                    <span class="admin-psych-col admin-psych-col-login">
                        ${a.professional && a.professional.username
                            ? `<span class="admin-psych-login-tag">${escapeHtml(a.professional.email || a.professional.username)}</span>`
                            : '<span class="admin-psych-login-tag is-off">sem login</span>'}
                    </span>
                    <span class="admin-psych-chevron" aria-hidden="true"></span>
                </summary>
                <div class="admin-psych-body">
                    <div class="admin-psych-view">${renderPsychFullAnswers(a)}</div>
                    <form class="admin-psych-edit-form admin-create-form" data-psych-edit-form="${escapeHtml(a.id)}" hidden></form>
                    <div class="admin-psych-actions">
                        <label>
                            Status
                            <select class="admin-select admin-psych-status" data-psych-id="${escapeHtml(a.id)}">
                                ${PSYCH_STATUS_OPTIONS.map((s) =>
                                    `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`
                                ).join('')}
                            </select>
                        </label>
                        <button type="button" class="btn btn-primary btn-sm admin-psych-save" data-psych-id="${escapeHtml(a.id)}">Guardar</button>
                        <div class="admin-psych-login-row">
                            <button type="button" class="btn btn-outline btn-sm" data-psych-edit="${escapeHtml(a.id)}">Editar dados</button>
                            <button type="button" class="btn btn-outline btn-sm" data-psych-delete="${escapeHtml(a.id)}">Eliminar</button>
                            ${a.professional && a.professional.username
                                ? `<span>Clinic login: <code>${escapeHtml(a.professional.email || a.professional.username)}</code> — managed in <a href="/admin">/admin</a></span>
                                   <button type="button" class="btn btn-outline btn-sm" data-psych-password="${escapeHtml(a.id)}">New password</button>`
                                : `<button type="button" class="btn btn-primary btn-sm" data-psych-login="${escapeHtml(a.id)}">Assign clinic login</button>`}
                        </div>
                    </div>
                </div>
            `;
            item.querySelector('summary')?.addEventListener('click', (e) => {
                if (e.target.closest('a')) e.stopPropagation();
            });
            adminPsychologistsList.appendChild(item);
            } catch (err) {
                console.error('Render psychologist row:', err);
            }
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
            if (psychologistsSearch && psychologistsSearch.value.trim()) {
                params.set('q', psychologistsSearch.value.trim());
            }
            const qs = params.toString();
            const res = await fetch('/api/admin/psychologists' + (qs ? `?${qs}` : ''));
            if (res.status === 401) return;
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            psychologistsCache = data.applications || [];
            const psychCount = document.getElementById('adminPsychCount');
            if (psychCount) {
                const n = psychologistsCache.length;
                const withLogin = psychologistsCache.filter((a) => a.professional && a.professional.username).length;
                psychCount.textContent = n
                    ? `${n} profissional${n === 1 ? '' : 'is'} na bolsa · ${withLogin} com login`
                    : 'Candidaturas recebidas (ex.: /recrutamento/psicologia).';
            }
            renderAdminPsychologists(psychologistsCache);
        } catch (err) {
            console.error('Load admin psychologists:', err);
            adminPsychologistsList.innerHTML = '<p class="admin-empty-list">Não foi possível carregar a bolsa. A base de dados está configurada?</p>';
        }
    }

    function hidePsychCreds() {
        if (adminPsychCreds) adminPsychCreds.hidden = true;
        lastPsychCredsText = '';
    }

    function showPsychCreds(rows) {
        if (!adminPsychCreds || !adminPsychCredsList || !rows || !rows.length) return;
        const portal = `${window.location.origin}/admin`;
        adminPsychCredsList.innerHTML = `
            <p class="admin-pro-creds-line">Admin: <a href="/admin">${escapeHtml(portal)}</a></p>
            <table class="admin-psych-creds-table">
                <thead><tr><th>Name</th><th>Email</th><th>Setup</th></tr></thead>
                <tbody>
                    ${rows.map((row) => `<tr>
                        <td>${escapeHtml(row.name || '')}</td>
                        <td><code>${escapeHtml(row.email || '')}</code></td>
                        <td>${escapeHtml(row.setupEmailSent === false ? 'No email on file' : 'Setup email sent')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
            lastPsychCredsText = [
            `Portal: ${portal}`,
            ...rows.map((row) => `${row.name || ''}\t${row.email || ''}\tsetup email`)
        ].join('\n');
        adminPsychCreds.hidden = false;
        adminPsychCreds.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function assignPsychologistLogin(id, { resetPassword } = {}) {
        const app = psychologistsCache.find((a) => String(a.id) === String(id))
            || (typeof boardProfessionalsCache !== 'undefined' ? boardProfessionalsCache.find((a) => String(a.id) === String(id)) : null);
        const label = app && app.name ? app.name : 'this professional';
        if (resetPassword && !window.confirm(`Assign a new password to ${label}? The current password will stop working.`)) return;
        try {
            const res = await fetch(`/api/admin/psychologists/${encodeURIComponent(id)}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetPassword: !!resetPassword })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
            await loadAdminPsychologists();
            if (typeof loadAdminProfessionals === 'function') await loadAdminProfessionals();
            if (data.setupEmailSent || data.professional) {
                showPsychCreds([{
                    name: (data.application && data.application.name) || label,
                    email: data.emailedTo || data.professional.email || (app && app.email) || '',
                    setupEmailSent: data.setupEmailSent !== false
                }]);
            } else {
                hidePsychCreds();
                alert(`${label} is already connected as ${(data.professional && data.professional.username) || 'a clinic login'}.`);
            }
        } catch (err) {
            console.error('Assign psychologist login:', err);
            alert(err.message || 'Não foi possível atribuir o login.');
        }
    }

    async function assignAllPsychologistLogins() {
        if (!window.confirm('Assign a clinic username and password to everyone on the board and every name already used on bookings who does not have a login yet? Rejected/eliminated applications are skipped. Copy the passwords when they appear — they cannot be shown again.')) return;
        try {
            const res = await fetch('/api/admin/psychologists/logins', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
            await loadAdminPsychologists();
            if (typeof loadAdminProfessionals === 'function') await loadAdminProfessionals();
            const created = (data.created || []).filter((row) => row.professional);
            if (created.length) {
                showPsychCreds(created.map((row) => ({
                    name: row.name || (row.professional && row.professional.displayName) || '',
                    email: row.emailedTo || (row.professional && row.professional.email) || row.email || '',
                    setupEmailSent: row.setupEmailSent !== false
                })));
            } else {
                hidePsychCreds();
                alert(data.linked && data.linked.length
                    ? 'Everyone already has a clinic login. Use New password on a person if you need to reset one.'
                    : 'No professionals to assign.');
            }
        } catch (err) {
            console.error('Assign all psychologist logins:', err);
            alert(err.message || 'Não foi possível atribuir os logins.');
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

    async function saveBolsaApplicationFromForm(id, form) {
        const data = readBolsaForm(form);
        if (!data.payload.nome || !data.payload.email) {
            alert('Nome e email são obrigatórios.');
            return;
        }
        try {
            const res = await fetch(`/api/admin/psychologists/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payload: data.payload,
                    status: data.status
                })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
            await loadAdminPsychologists();
            if (typeof loadAdminProfessionals === 'function') await loadAdminProfessionals();
        } catch (err) {
            console.error('Save bolsa data:', err);
            alert(err.message || 'Não foi possível guardar os dados.');
        }
    }

    async function createBolsaApplicationFromForm(form) {
        const data = readBolsaForm(form);
        if (!data.payload.nome || !data.payload.email) {
            alert('Nome e email são obrigatórios.');
            return;
        }
        try {
            const res = await fetch('/api/admin/psychologists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payload: data.payload,
                    status: data.status || 'bolsa',
                    createLogin: data.createLogin
                })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
            form.reset();
            fillBolsaCreateForm();
            const details = document.getElementById('adminBolsaCreateDetails');
            if (details) details.open = false;
            await loadAdminPsychologists();
            if (typeof loadAdminProfessionals === 'function') await loadAdminProfessionals();
            if (body.setupEmailSent || body.professional) {
                showPsychCreds([{
                    name: (body.application && body.application.name) || data.payload.nome,
                    email: body.emailedTo || body.professional.email || data.payload.email || '',
                    setupEmailSent: body.setupEmailSent !== false
                }]);
            }
        } catch (err) {
            console.error('Create bolsa:', err);
            alert(err.message || 'Não foi possível adicionar à bolsa.');
        }
    }

    async function deleteBolsaApplication(id) {
        const app = psychologistsCache.find((a) => String(a.id) === String(id));
        const label = (app && app.name) || 'este profissional';
        if (!window.confirm(`Eliminar ${label} da bolsa? A ficha e o login da clínica, se existirem, mantêm-se.`)) return;
        try {
            const res = await fetch(`/api/admin/psychologists/${encodeURIComponent(id)}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
            await loadAdminPsychologists();
        } catch (err) {
            console.error('Delete bolsa:', err);
            alert(err.message || 'Não foi possível eliminar.');
        }
    }

    function fillBolsaCreateForm() {
        const form = document.getElementById('adminBolsaCreateForm');
        if (!form) return;
        form.innerHTML = `
            ${renderBolsaFormHtml({}, { idPrefix: 'bolsa-new', status: 'bolsa', createLogin: true })}
            <div class="admin-invite-actions">
                <button type="submit" class="btn btn-primary">Adicionar à bolsa</button>
            </div>
        `;
    }

    function toggleBolsaEditForm(id) {
        const row = adminPsychologistsList && adminPsychologistsList.querySelector(`.admin-psych-row[data-id="${id}"]`);
        if (!row) return;
        const view = row.querySelector('.admin-psych-view');
        const form = row.querySelector('[data-psych-edit-form]');
        const editBtn = row.querySelector('[data-psych-edit]');
        if (!form) return;
        const opening = form.hidden;
        if (opening) {
            const app = psychologistsCache.find((a) => String(a.id) === String(id));
            form.innerHTML = `
                ${renderBolsaFormHtml(bolsaPayloadFromApp(app), {
                    idPrefix: `bolsa-${id}`,
                    status: (app && app.status) || 'novo'
                })}
                <div class="admin-psych-edit-actions">
                    <button type="submit" class="btn btn-primary btn-sm">Guardar dados</button>
                    <button type="button" class="btn btn-outline btn-sm" data-psych-edit-cancel="${escapeHtml(id)}">Cancelar</button>
                </div>
            `;
            form.hidden = false;
            if (view) view.hidden = true;
            if (editBtn) editBtn.textContent = 'Fechar edição';
            row.open = true;
        } else {
            form.hidden = true;
            form.innerHTML = '';
            if (view) view.hidden = false;
            if (editBtn) editBtn.textContent = 'Editar dados';
        }
    }

    fillBolsaCreateForm();
    const adminBolsaCreateForm = document.getElementById('adminBolsaCreateForm');
    if (adminBolsaCreateForm) {
        adminBolsaCreateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createBolsaApplicationFromForm(adminBolsaCreateForm);
        });
    }
    const psychologistsAddBtn = document.getElementById('psychologistsAddBtn');
    const adminBolsaCreateDetails = document.getElementById('adminBolsaCreateDetails');
    if (psychologistsAddBtn && adminBolsaCreateDetails) {
        psychologistsAddBtn.addEventListener('click', () => {
            adminBolsaCreateDetails.open = true;
            adminBolsaCreateDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const first = adminBolsaCreateForm && adminBolsaCreateForm.querySelector('input, select, textarea');
            if (first) first.focus();
        });
    }

    if (psychologistsRefreshBtn) {
        psychologistsRefreshBtn.addEventListener('click', () => loadAdminPsychologists());
    }
    if (psychologistsAssignLoginsBtn) {
        psychologistsAssignLoginsBtn.addEventListener('click', () => assignAllPsychologistLogins());
    }
    if (psychologistsStatusFilter) {
        psychologistsStatusFilter.addEventListener('change', () => loadAdminPsychologists());
    }
    let psychSearchTimer = null;
    if (psychologistsSearch) {
        psychologistsSearch.addEventListener('input', () => {
            clearTimeout(psychSearchTimer);
            psychSearchTimer = setTimeout(() => loadAdminPsychologists(), 280);
        });
    }
    if (psychCredsCopyBtn) {
        psychCredsCopyBtn.addEventListener('click', async () => {
            if (!lastPsychCredsText) return;
            try {
                await navigator.clipboard.writeText(lastPsychCredsText);
                psychCredsCopyBtn.textContent = 'Copied';
                setTimeout(() => { psychCredsCopyBtn.textContent = 'Copy logins'; }, 1600);
            } catch (err) {
                alert('Could not copy. Select the usernames and passwords above.');
            }
        });
    }
    if (adminPsychologistsList) {
        adminPsychologistsList.addEventListener('click', (e) => {
            const saveBtn = e.target.closest('.admin-psych-save');
            if (saveBtn) {
                savePsychologistApplication(saveBtn.getAttribute('data-psych-id'));
                return;
            }
            const loginBtn = e.target.closest('[data-psych-login]');
            if (loginBtn) {
                assignPsychologistLogin(loginBtn.getAttribute('data-psych-login'));
                return;
            }
            const passwordBtn = e.target.closest('[data-psych-password]');
            if (passwordBtn) {
                assignPsychologistLogin(passwordBtn.getAttribute('data-psych-password'), { resetPassword: true });
                return;
            }
            const editBtn = e.target.closest('[data-psych-edit]');
            if (editBtn) {
                toggleBolsaEditForm(editBtn.getAttribute('data-psych-edit'));
                return;
            }
            const cancelBtn = e.target.closest('[data-psych-edit-cancel]');
            if (cancelBtn) {
                toggleBolsaEditForm(cancelBtn.getAttribute('data-psych-edit-cancel'));
                return;
            }
            const deleteBtn = e.target.closest('[data-psych-delete]');
            if (deleteBtn) {
                deleteBolsaApplication(deleteBtn.getAttribute('data-psych-delete'));
            }
        });
        adminPsychologistsList.addEventListener('submit', (e) => {
            const form = e.target.closest('[data-psych-edit-form]');
            if (!form) return;
            e.preventDefault();
            saveBolsaApplicationFromForm(form.getAttribute('data-psych-edit-form'), form);
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
        purchase: 'Paid / booked',
        apply: 'Application sent',
        interview: 'Interview booked'
    };
    const FUNNEL_KIND_LABELS = {
        patient_booking: {
            title: 'Acquisition → booking funnel',
            services: 'Booked services',
            conversion: 'Conversion'
        },
        job_application: {
            title: 'Acquisition → application funnel',
            services: 'Interview bookings',
            conversion: 'Apply rate'
        }
    };
    const CHANNEL_LABELS = {
        paid_search: 'Paid search',
        paid_social: 'Paid social',
        organic_google: 'Google organic',
        organic_other: 'Other organic',
        email: 'Email',
        sms: 'SMS / WhatsApp',
        organic_social: 'Organic social',
        owned: 'Owned',
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

    function analyticsHtmlResponseError(status) {
        if (status === 401 || status === 403) {
            return 'Session expired. Sign in again to load analytics.';
        }
        return 'Server returned a page instead of analytics data. Refresh the admin, or sign in again.';
    }

    async function fetchAdminAnalyticsJson(url, options) {
        const res = await fetch(url, {
            credentials: 'same-origin',
            cache: 'no-store',
            ...options,
            headers: {
                Accept: 'application/json',
                ...((options && options.headers) || {})
            }
        });
        const contentType = String(res.headers.get('content-type') || '');
        const raw = await res.text();
        const looksHtml = /html/i.test(contentType) || /^\s*</.test(raw);
        if (looksHtml) throw new Error(analyticsHtmlResponseError(res.status));
        let data = {};
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch {
                throw new Error('Analytics response was not valid JSON.');
            }
        }
        if (res.status === 401 || res.status === 403) {
            const err = String((data && data.error) || '');
            if (err === 'session_expired' || err === 'Authentication required' || /auth/i.test(err)) {
                throw new Error('Session expired. Sign in again to load analytics.');
            }
            throw new Error((data && data.error) || 'Admin access required to load analytics.');
        }
        if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
        return data;
    }

    async function loadAnalyticsPanel() {
        const kpis = document.getElementById('analyticsKpis');
        const live = document.getElementById('analyticsLive');
        const rangeEl = document.getElementById('analyticsRange');
        const range = rangeEl ? rangeEl.value : '7d';
        const audienceBtn = document.querySelector('#analyticsAudience .an-audience-btn.is-active');
        const audience = (audienceBtn && audienceBtn.getAttribute('data-audience')) || 'public';
        const funnelBtn = document.querySelector('#analyticsFunnelKind .an-audience-btn.is-active');
        const funnelKind = (funnelBtn && funnelBtn.getAttribute('data-funnel')) || 'patient_booking';
        const isJobs = funnelKind === 'job_application';
        if (kpis) kpis.innerHTML = '<p class="admin-empty-list">Loading analytics…</p>';
        try {
            const data = await fetchAdminAnalyticsJson(
                `/api/admin/analytics?range=${encodeURIComponent(range)}&audience=${encodeURIComponent(audience)}&funnel=${encodeURIComponent(funnelKind)}`
            );
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
                        : isJobs
                            ? 'Recruitment metrics start as people visit /recrutamento. Applications and interviews also come from the jobs ledger.'
                            : 'Visit metrics start as people browse the public site. Bookings and revenue already come from the payment ledger. Job applications are excluded.';
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
                        : (k.staffSessions ? `${k.staffSessions} admin sessions excluded` : (isJobs ? 'Recruitment traffic only' : 'Public clinical traffic'));
                const kpiRows = isJobs
                    ? [
                        ['Visitors', k.visitors],
                        ['Sessions', k.sessions],
                        ['Pageviews', k.pageviews],
                        ['Engaged', `${k.engagedRate || 0}%`],
                        ['Applications', k.applications || 0],
                        ['Interviews', k.interviews || 0],
                        ['Apply rate', `${k.conversionRate || 0}%`]
                    ]
                    : [
                        ['Visitors', k.visitors],
                        ['Sessions', k.sessions],
                        ['Pageviews', k.pageviews],
                        ['Engaged', `${k.engagedRate || 0}%`],
                        ['Bookings', k.bookings],
                        ['Revenue', anEuro(k.revenueCents)],
                        ['Conversion', `${k.conversionRate || 0}%`]
                    ];
                kpis.innerHTML = kpiRows.map(([label, val]) => `<div class="an-kpi"><span class="an-kpi-label">${label}</span><span class="an-kpi-val">${val}</span></div>`).join('') +
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
            const funnelEl = document.getElementById('analyticsFunnel');
            const funnelTitle = document.getElementById('analyticsFunnelTitle');
            const servicesTitle = document.getElementById('analyticsServicesTitle');
            const kindMeta = FUNNEL_KIND_LABELS[isJobs ? 'job_application' : 'patient_booking'];
            if (funnelTitle) funnelTitle.textContent = kindMeta.title;
            if (servicesTitle) servicesTitle.textContent = kindMeta.services;
            if (funnelEl) {
                const steps = data.funnel || [];
                const top = Math.max(1, ...(steps.map((s) => s.sessions)));
                const stepLabels = isJobs ? { ...FUNNEL_LABELS, intent: 'Started form' } : FUNNEL_LABELS;
                funnelEl.innerHTML = `<ol class="an-funnel">${steps.map((s) => `<li>
                    <span>${stepLabels[s.id] || s.id}</span>
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
            set('analyticsServices', anBarList(data.services, (k) => SERVICE_LABELS_ADMIN[k] || k));
            const tracked = document.getElementById('analyticsTrackedLinks');
            if (tracked) {
                const links = data.trackedLinks || [];
                tracked.innerHTML = links.length
                    ? `<p class="an-tracked-hint">Paste these in Instagram bio, WhatsApp broadcasts, and stories. In-app browsers strip referrers, so a bare lonclinic.com link always counts as Direct.</p>
                    <ul class="an-tracked">${links.map((l) => `<li>
                        <span class="an-tracked-label">${escapeHtml(l.label || '')}</span>
                        <code class="an-tracked-url">${escapeHtml(l.url || '')}</code>
                        <button type="button" class="btn btn-outline btn-sm an-copy-link" data-copy="${escapeHtml(l.url || '')}">Copy</button>
                    </li>`).join('')}</ul>`
                    : '<p class="admin-empty-list">Tracked links appear after the next deploy.</p>';
            }
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
    const analyticsFunnelKind = document.getElementById('analyticsFunnelKind');
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
    if (analyticsFunnelKind) {
        analyticsFunnelKind.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-funnel]');
            if (!btn) return;
            analyticsFunnelKind.querySelectorAll('.an-audience-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
            loadAnalyticsPanel();
        });
    }
    const analyticsTrackedLinks = document.getElementById('analyticsTrackedLinks');
    if (analyticsTrackedLinks) {
        analyticsTrackedLinks.addEventListener('click', (e) => {
            const btn = e.target.closest('.an-copy-link');
            if (!btn) return;
            const url = btn.getAttribute('data-copy') || '';
            if (!url || !navigator.clipboard) return;
            navigator.clipboard.writeText(url).then(() => {
                const prev = btn.textContent;
                btn.textContent = 'Copied';
                setTimeout(() => { btn.textContent = prev; }, 1400);
            }).catch(() => {});
        });
    }
    const analyticsMarkDeviceBtn = document.getElementById('analyticsMarkDeviceBtn');
    if (analyticsMarkDeviceBtn) {
        analyticsMarkDeviceBtn.addEventListener('click', async () => {
            analyticsMarkDeviceBtn.disabled = true;
            try {
                await fetchAdminAnalyticsJson('/api/admin/analytics/mark-device', { method: 'POST' });
                analyticsMarkDeviceBtn.textContent = 'Browser marked';
                loadAnalyticsPanel();
            } catch (err) {
                analyticsMarkDeviceBtn.disabled = false;
                analyticsMarkDeviceBtn.textContent = 'Mark this browser as admin';
                alert(err.message || 'Could not mark this browser');
            }
        });
    }

    // ─── Professionals directory ───
    const adminProfessionalsBody = document.getElementById('adminProfessionalsBody');
    const adminDirDetail = document.getElementById('adminDirDetail');
    const adminDirSearch = document.getElementById('adminDirSearch');
    const adminDirCount = document.getElementById('adminDirCount');
    const adminProfessionalError = document.getElementById('adminProfessionalError');
    const adminProfessionalCreds = document.getElementById('adminProfessionalCreds');
    const proCredsPortal = document.getElementById('proCredsPortal');
    const proCredsName = document.getElementById('proCredsName');
    const proCredsUsername = document.getElementById('proCredsUsername');
    const proCredsPassword = document.getElementById('proCredsPassword');
    const proCredsCopyBtn = document.getElementById('proCredsCopyBtn');
    const proCredsSendBtn = document.getElementById('proCredsSendBtn');
    const proCredsSendStatus = document.getElementById('proCredsSendStatus');
    const sendLoginEmailModal = document.getElementById('sendLoginEmailModal');
    const sendLoginEmailForm = document.getElementById('sendLoginEmailForm');
    const sendLoginProId = document.getElementById('sendLoginProId');
    const sendLoginNameLabel = document.getElementById('sendLoginNameLabel');
    const sendLoginEmailTo = document.getElementById('sendLoginEmailTo');
    const sendLoginNote = document.getElementById('sendLoginNote');
    const sendLoginResetWarn = document.getElementById('sendLoginResetWarn');
    const sendLoginEmailError = document.getElementById('sendLoginEmailError');
    const sendLoginSubmitBtn = document.getElementById('sendLoginSubmitBtn');
    let professionalsCache = [];
    let boardProfessionalsCache = [];
    let namedProfessionalsCache = [];
    let staffProfilesCache = [];
    let staffDocumentKindsCache = {};
    const STAFF_PROFESSION_LABELS = {
        medico: 'Médico',
        nutricionista: 'Nutricionista',
        psicologo: 'Psicólogo'
    };
    let staffProfessionTitlesCache = { ...STAFF_PROFESSION_LABELS };
    const freshPasswordsById = Object.create(null);
    let dirSearchQuery = '';
    let dirProfessionFilter = '';
    let selectedProfessionalKey = '';
    let dirEditing = false;

    function rememberFreshPassword(pro, password) {
        if (!pro || !password) return;
        const id = pro.id || pro.professionalId;
        if (id) freshPasswordsById[String(id)] = String(password);
    }

    function defaultProfessionalLoginNote(name) {
        const who = String(name || '').trim();
        const greeting = who ? `Olá ${who},` : 'Olá,';
        return `${greeting}\n\nSeguem os dados de acesso ao portal da Lon Clinic. Abra o link abaixo, introduza o email e a password e inicie sessão.`;
    }

    function professionalKey(p) {
        if (!p) return '';
        const username = String(p.username || '').trim().toLowerCase();
        if (username) return `u:${username}`;
        if (p.id != null && p.id !== '') return `id:${p.id}`;
        return '';
    }

    function professionalRecordById(id) {
        const key = String(id || '');
        if (!key) return null;
        return directoryProfessionals().find((p) => String(p.id || p.professionalId || '') === key) || null;
    }

    function professionalByKey(key) {
        if (!key) return null;
        return directoryProfessionals().find((p) => professionalKey(p) === key) || null;
    }

    function setSendLoginError(message) {
        if (!sendLoginEmailError) return;
        if (!message) {
            sendLoginEmailError.style.display = 'none';
            sendLoginEmailError.textContent = '';
            return;
        }
        sendLoginEmailError.textContent = message;
        sendLoginEmailError.style.display = 'block';
    }

    function setProfessionalCredsSendStatus(message) {
        if (!proCredsSendStatus) return;
        if (!message) {
            proCredsSendStatus.hidden = true;
            proCredsSendStatus.textContent = '';
            return;
        }
        proCredsSendStatus.hidden = false;
        proCredsSendStatus.textContent = message;
    }

    function closeSendLoginEmailModal() {
        if (sendLoginEmailModal) sendLoginEmailModal.hidden = true;
        setSendLoginError('');
    }

    function openSendLoginEmailModal(pro) {
        if (!pro || !pro.id) return;
        const name = pro.displayName || pro.fullName || pro.username || 'this professional';
        const email = String(pro.email || '').trim();
        const fresh = freshPasswordsById[String(pro.id)] || '';
        if (sendLoginProId) sendLoginProId.value = String(pro.id);
        if (sendLoginNameLabel) sendLoginNameLabel.textContent = name;
        if (sendLoginEmailTo) sendLoginEmailTo.value = email;
        if (sendLoginNote) sendLoginNote.value = defaultProfessionalLoginNote(name);
        if (sendLoginResetWarn) sendLoginResetWarn.hidden = !!fresh;
        if (sendLoginSubmitBtn) {
            sendLoginSubmitBtn.textContent = fresh ? 'Send email' : 'Generate password & send';
            sendLoginSubmitBtn.disabled = false;
        }
        const hint = document.getElementById('sendLoginEmailHint');
        if (hint) {
            hint.textContent = email
                ? 'Saved on the ficha if it is missing or you change it here.'
                : 'Required — this address is saved on the ficha.';
        }
        setSendLoginError('');
        if (sendLoginEmailModal) sendLoginEmailModal.hidden = false;
        if (sendLoginEmailTo) sendLoginEmailTo.focus();
    }

    async function submitSendLoginEmail(forceReset) {
        const id = sendLoginProId ? sendLoginProId.value : '';
        const email = sendLoginEmailTo ? sendLoginEmailTo.value.trim() : '';
        const note = sendLoginNote ? sendLoginNote.value.trim() : '';
        const password = forceReset ? '' : (freshPasswordsById[String(id)] || '');
        if (!id) {
            setSendLoginError('Professional not found.');
            return;
        }
        if (!email) {
            setSendLoginError('Add an email before sending.');
            if (sendLoginEmailTo) sendLoginEmailTo.focus();
            return;
        }
        const confirmReset = !password;
        if (confirmReset && !forceReset) {
            const label = sendLoginNameLabel ? sendLoginNameLabel.textContent : 'this professional';
            if (!window.confirm(`Assign a new password to ${label} and email it? The current password will stop working.`)) return;
        }
        if (sendLoginSubmitBtn) sendLoginSubmitBtn.disabled = true;
        setSendLoginError('');
        try {
            const res = await fetch(`/api/admin/professionals/${encodeURIComponent(id)}/send-login-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    note,
                    password: password || undefined,
                    confirmReset
                })
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 409 && data.code === 'needs_reset' && !forceReset) {
                if (!window.confirm('The current password cannot be shown again. Generate a new password and email it? The old password will stop working.')) {
                    if (sendLoginSubmitBtn) sendLoginSubmitBtn.disabled = false;
                    return;
                }
                return submitSendLoginEmail(true);
            }
            if (!res.ok) {
                setSendLoginError(data.error || 'Could not send login email.');
                if (sendLoginSubmitBtn) sendLoginSubmitBtn.disabled = false;
                return;
            }
            closeSendLoginEmailModal();
            await loadAdminProfessionals();
            const sentPro = data.professional || professionalRecordById(id);
            if (sentPro) showProfessionalCreds(sentPro);
            const to = data.emailedTo || email;
            setProfessionalCredsSendStatus(`Password setup email sent to ${to}.`);
            if (!adminProfessionalCreds || adminProfessionalCreds.hidden) {
                showProfessionalError(`Password setup email sent to ${to}.`);
            }
        } catch (err) {
            setSendLoginError('Network error. Please try again.');
            if (sendLoginSubmitBtn) sendLoginSubmitBtn.disabled = false;
        }
    }

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

    function showProfessionalCreds(pro) {
        if (!adminProfessionalCreds || !pro) return;
        const portal = `${window.location.origin}/admin`;
        if (proCredsPortal) {
            proCredsPortal.href = '/admin';
            proCredsPortal.textContent = portal;
        }
        if (proCredsName) proCredsName.textContent = (pro && (pro.displayName || pro.fullName)) || '';
        if (proCredsUsername) proCredsUsername.textContent = (pro && pro.email) || '';
        if (adminProfessionalCreds && pro && pro.id) adminProfessionalCreds.dataset.proId = String(pro.id);
        setProfessionalCredsSendStatus('Password setup email sent — the professional chooses their own password.');
        adminProfessionalCreds.hidden = false;
        adminProfessionalCreds.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

    function professionalTypeLabel(p) {
        if (!p) return '';
        const titles = staffProfessionTitlesCache || STAFF_PROFESSION_LABELS;
        if (p.professionLabel) return p.professionLabel;
        const key = String(p.profession || '').trim();
        if (key && titles[key]) return titles[key];
        return '';
    }

    function directoryProfessionals() {
        const byUser = new Map(
            (professionalsCache || []).map((a) => [String(a.username || '').trim().toLowerCase(), a])
        );
        const seen = new Set();
        const files = [];
        (staffProfilesCache || []).forEach((staff) => {
            if (staff.hasFile === false && staff.hasLogin !== true && staff.isClinicAdmin !== true) return;
            const key = professionalKey(staff);
            if (!key || seen.has(key)) return;
            seen.add(key);
            const account = byUser.get(String(staff.username || '').trim().toLowerCase());
            files.push({
                ...staff,
                id: staff.id || (account && account.id) || null,
                displayName: staff.fullName || staff.displayName || (account && account.displayName) || staff.username || '',
                email: staff.email || (account && account.email) || '',
                // The email the login account actually has; password recovery only looks at this one.
                loginEmail: (account && account.email) || '',
                doxyRoomUrl: staff.doxyRoomUrl || (account && account.doxyRoomUrl) || '',
                doxyPending: staff.doxyPending != null
                    ? staff.doxyPending
                    : !(account && account.doxyRoomUrl),
                hasLogin: staff.hasLogin === true || staff.isClinicAdmin === true || !!(account && account.username),
                active: staff.active !== false && (!account || account.active !== false)
            });
        });
        (professionalsCache || []).forEach((account) => {
            const userKey = String(account.username || '').trim().toLowerCase();
            const key = professionalKey(account);
            if ((userKey && seen.has(`u:${userKey}`)) || (key && seen.has(key))) return;
            if (userKey) seen.add(`u:${userKey}`);
            if (key) seen.add(key);
            files.push({
                ...account,
                fullName: account.displayName || account.username || '',
                displayName: account.displayName || account.username || '',
                loginEmail: account.email || '',
                hasLogin: true,
                active: account.active !== false,
                hasPhoto: false
            });
        });
        files.sort((a, b) => String(a.displayName || a.fullName || a.username || '')
            .localeCompare(String(b.displayName || b.fullName || b.username || ''), 'pt', { sensitivity: 'base' }));
        return files;
    }

    function filteredDirectoryProfessionals() {
        const q = dirSearchQuery.trim().toLowerCase();
        return directoryProfessionals().filter((p) => {
            if (dirProfessionFilter && String(p.profession || '') !== dirProfessionFilter) return false;
            if (!q) return true;
            const hay = [
                p.displayName, p.fullName, p.username, p.email, professionalTypeLabel(p)
            ].map((v) => String(v || '').toLowerCase()).join(' ');
            return hay.includes(q);
        });
    }

    function initialsFromName(name) {
        const parts = String(name || '').trim().split(/\s+/).filter((p) => p && !/^(dra?|prof\.?a?)$/i.test(p));
        if (!parts.length) return '·';
        const first = parts[0][0] || '';
        const last = parts.length > 1 ? (parts[parts.length - 1][0] || '') : '';
        return (first + last).toUpperCase();
    }

    function professionalPhotoHtml(p, className) {
        const title = p.fullName || p.displayName || p.username || '';
        if (p.hasPhoto && p.username) {
            return `<img class="${className}" src="/api/admin/staff-profiles/${encodeURIComponent(p.username)}/photo" alt="">`;
        }
        return `<span class="${className} is-initials" aria-hidden="true">${escapeHtml(initialsFromName(title))}</span>`;
    }

    function professionalStatusLabel(p) {
        if (!p.hasLogin) return { text: 'File only', off: true };
        if (p.active) return { text: 'Active', off: false };
        return { text: 'Disabled', off: true };
    }

    function dashText(value) {
        const s = String(value || '').trim();
        return s ? escapeHtml(s) : '—';
    }

    function areaTagsHtml(items) {
        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        if (!list.length) return '';
        return `<div class="admin-dir-tags">${list.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
    }

    function isInternalBolsaProfileItem(row) {
        const label = String((row && row.label) || '').toLowerCase();
        return /score|pontua|nota interna|notas internas|elegível|elegivel|eliminação|eliminacao/.test(label);
    }

    function isInternalBolsaProfileGroup(group) {
        const title = String((group && group.title) || '').toLowerCase();
        return /score|pontua|notas internas/.test(title);
    }

    function renderBolsaProfileHtml(bolsa, opts) {
        if (!bolsa || !Array.isArray(bolsa.groups) || !bolsa.groups.length) {
            return `<p class="admin-empty-list">${escapeHtml((opts && opts.emptyMessage) || 'Ainda não há dados de registo ligados a esta conta.')}</p>`;
        }
        const cvHref = String((opts && opts.cvHref) || '');
        return bolsa.groups.filter((g) => !isInternalBolsaProfileGroup(g)).map((g) => `
            <section class="admin-psych-section">
                <h4>${escapeHtml(g.title || '')}</h4>
                <dl class="admin-psych-qa-list">
                    ${(g.items || []).filter((row) => !isInternalBolsaProfileItem(row)).map((row) => {
                        const text = String((row && row.value) || '').trim();
                        const isCv = (row && row.kind) === 'cv' || String((row && row.label) || '') === 'CV';
                        const canDownload = isCv && bolsa.hasCv && cvHref;
                        const display = text || '—';
                        const long = !canDownload && (display.includes('\n') || display.length > 120);
                        const dd = canDownload
                            ? `<a class="clinic-doc-link" href="${escapeHtml(cvHref)}">${escapeHtml(text || bolsa.cvFilename || 'Descarregar CV')}</a>`
                            : escapeHtml(display).replace(/\n/g, '<br>');
                        return `<div class="admin-psych-qa${long ? ' is-long' : ''}">
                            <dt>${escapeHtml((row && row.label) || '')}</dt>
                            <dd>${dd}</dd>
                        </div>`;
                    }).join('')}
                </dl>
            </section>
        `).join('');
    }

    function showBolsaProfileSection(wrapId, bodyId, subtitleId, bolsa, opts) {
        const wrap = document.getElementById(wrapId);
        const body = document.getElementById(bodyId);
        const subtitle = document.getElementById(subtitleId);
        const linked = !!(bolsa && (bolsa.id || bolsa.email || (Array.isArray(bolsa.groups) && bolsa.groups.length)));
        if (body) body.innerHTML = renderBolsaProfileHtml(bolsa, opts);
        if (wrap) wrap.hidden = false;
        const details = wrap && wrap.querySelector('details');
        if (details) details.open = linked;
        if (subtitle) {
            subtitle.textContent = linked
                ? (bolsa.email
                    ? `Candidatura ligada (${bolsa.email})`
                    : 'Candidatura ligada — respostas da Bolsa de Profissionais')
                : 'Sem candidatura ligada a esta conta. Pode guardar o perfil na mesma.';
        }
    }

    function renderDirectoryDetail(p) {
        if (!adminDirDetail) return;
        if (!p) {
            adminDirDetail.hidden = true;
            adminDirDetail.innerHTML = '';
            return;
        }
        const title = p.fullName || p.displayName || p.username || '—';
        const role = professionalTypeLabel(p);
        const status = professionalStatusLabel(p);
        const kinds = staffDocumentKindsCache || {};
        const user = encodeURIComponent(p.username || '');
        const docs = Object.keys(kinds).map((kind) => {
            const doc = (p.documents || []).find((d) => d && d.kind === kind);
            const label = kinds[kind] || kind;
            if (!doc) {
                return `<li><span>${escapeHtml(label)}</span><span class="clinic-doc-missing">Por enviar</span></li>`;
            }
            const validity = doc.validUntil ? `Validade ${escapeHtml(doc.validUntil)}` : '';
            const href = p.username
                ? `/api/admin/staff-profiles/${user}/documents/${encodeURIComponent(doc.id)}`
                : '#';
            return `<li>
                <span>${escapeHtml(label)}</span>
                <a class="clinic-doc-link" href="${escapeHtml(href)}">${escapeHtml(doc.originalName || label)}</a>
                ${validity ? `<span class="clinic-doc-validity">${validity}</span>` : ''}
            </li>`;
        }).join('');
        const doxy = p.doxyPending || !p.doxyRoomUrl
            ? 'Pending'
            : `<a href="${escapeHtml(p.doxyRoomUrl)}" target="_blank" rel="noopener">${escapeHtml(String(p.doxyRoomUrl).replace(/^https?:\/\//, ''))}</a>`;
        const sendLogin = p.hasLogin && p.id && !p.isClinicAdmin
            ? `<button type="button" class="btn btn-primary btn-sm" data-pro-send-login="${escapeHtml(String(p.id))}">Send login email</button>`
            : '';
        const canEdit = !!p.username && !p.isClinicAdmin;
        const editBtn = canEdit
            ? `<button type="button" class="btn btn-outline btn-sm" data-pro-edit="${escapeHtml(p.username)}">Editar ficha</button>`
            : '';
        const assignLogin = canEdit && !p.hasLogin
            ? `<button type="button" class="btn btn-primary btn-sm" data-pro-assign-login="${escapeHtml(p.username)}">Atribuir login</button>`
            : '';
        const loginEmailRow = p.hasLogin && !p.isClinicAdmin
            ? `<div><dt>Email de login</dt><dd>${p.loginEmail
                ? escapeHtml(p.loginEmail)
                : '<span class="admin-dir-login-warn">Sem email na conta — a recuperação de password não funciona até o guardar</span>'}</dd></div>`
            : '';
        adminDirDetail.hidden = false;
        if (dirEditing && canEdit) {
            adminDirDetail.innerHTML = `
                <div class="admin-dir-detail-head">
                    ${professionalPhotoHtml(p, 'admin-dir-detail-photo')}
                    <div>
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(role || 'Professional')} · a editar</p>
                    </div>
                    <span class="admin-pro-status${status.off ? ' is-off' : ''}">${escapeHtml(status.text)}</span>
                </div>
                ${renderDirectoryEditForm(p)}
            `;
            const first = adminDirDetail.querySelector('input[name="fullName"]');
            if (first) first.focus();
            return;
        }
        adminDirDetail.innerHTML = `
            <div class="admin-dir-detail-head">
                ${professionalPhotoHtml(p, 'admin-dir-detail-photo')}
                <div>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${[role, p.hasLogin ? (p.loginEmail || p.email || 'no email on file') : ''].filter(Boolean).map(escapeHtml).join(' · ') || '—'}</p>
                </div>
                <span class="admin-pro-status${status.off ? ' is-off' : ''}">${escapeHtml(status.text)}</span>
            </div>
            <dl class="admin-staff-profile-dl">
                ${loginEmailRow}
                <div><dt>${p.hasLogin && !p.isClinicAdmin ? 'Email (bolsa / ficha)' : 'Email'}</dt><dd>${dashText(p.email)}</dd></div>
                <div><dt>Telefone</dt><dd>${dashText(p.phone || (p.bolsa && p.bolsa.phone))}</dd></div>
                <div><dt>Sala Doxy.me</dt><dd>${doxy}</dd></div>
                <div><dt>NIF</dt><dd>${dashText(p.nif)}</dd></div>
                <div><dt>Cédula</dt><dd>${dashText(p.ordemNumber)}</dd></div>
                <div><dt>Cartão de Cidadão</dt><dd>${dashText(p.citizenCard)}</dd></div>
                <div><dt>Morada</dt><dd>${dashText(p.address)}</dd></div>
                <div><dt>Seguro</dt><dd>${dashText([p.insurer, p.insurancePolicy, p.insuranceValidUntil].filter(Boolean).join(' · '))}</dd></div>
                <div><dt>IBAN</dt><dd>${dashText(p.iban)}</dd></div>
            </dl>
            ${p.bio ? `<div class="admin-staff-profile-block"><h4>Bio</h4><p>${dashText(p.bio)}</p></div>` : ''}
            ${p.credentials ? `<div class="admin-staff-profile-block"><h4>Credenciais</h4><p>${dashText(p.credentials)}</p></div>` : ''}
            ${areaTagsHtml(p.consultLanguages) ? `<div class="admin-staff-profile-block"><h4>Idiomas</h4>${areaTagsHtml(p.consultLanguages)}</div>` : ''}
            ${areaTagsHtml(p.primaryAreas) ? `<div class="admin-staff-profile-block"><h4>Áreas primárias</h4>${areaTagsHtml(p.primaryAreas)}</div>` : ''}
            ${areaTagsHtml(p.secondaryAreas) ? `<div class="admin-staff-profile-block"><h4>Áreas secundárias</h4>${areaTagsHtml(p.secondaryAreas)}</div>` : ''}
            ${docs ? `<div class="admin-staff-profile-block"><h4>Documentos</h4><ul class="admin-staff-docs">${docs}</ul></div>` : ''}
            ${!p.hasLogin && canEdit ? '<p class="admin-dir-edit-note">Esta ficha ainda não tem conta de login, por isso a recuperação de password não funciona. Atribua um login e depois envie o email de acesso.</p>' : ''}
            ${editBtn || sendLogin || assignLogin ? `<div class="admin-dir-detail-actions">${editBtn}${assignLogin}${sendLogin}</div>` : ''}
        `;
    }

    async function assignLoginToStaffFile(username, btn) {
        const p = professionalByKey(selectedProfessionalKey) || {};
        if (btn) btn.disabled = true;
        showProfessionalError('');
        try {
            const res = await fetch(`/api/admin/staff-profiles/${encodeURIComponent(username)}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: String(p.email || '').trim() })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showProfessionalError(data.error || 'Não foi possível atribuir o login.');
                return;
            }
            await loadAdminProfessionals();
            if (data.professional) showProfessionalCreds(data.professional);
            showProfessionalError(`Login atribuído a ${(data.professional && data.professional.displayName) || username}. ${data.setupEmailSent ? 'Email de definição de password enviado.' : 'Adicione um email na ficha para enviar o convite.'}`);
        } catch (err) {
            showProfessionalError('Erro de rede. Tente novamente.');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    const adminDirAssignLoginsBtn = document.getElementById('adminDirAssignLoginsBtn');
    if (adminDirAssignLoginsBtn) {
        adminDirAssignLoginsBtn.addEventListener('click', async () => {
            if (!window.confirm('Criar uma conta de login para todas as fichas que ainda não têm? O email vem da candidatura da bolsa quando existe; os restantes ficam para preencher em "Editar ficha".')) return;
            adminDirAssignLoginsBtn.disabled = true;
            showProfessionalError('');
            try {
                const res = await fetch('/api/admin/staff-profiles/logins', { method: 'POST' });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    showProfessionalError(data.error || 'Não foi possível atribuir os logins.');
                    return;
                }
                await loadAdminProfessionals();
                const created = data.created || [];
                if (!created.length) {
                    showProfessionalError('Todas as fichas já têm login.');
                    return;
                }
                const missing = created.filter((row) => !row.email).map((row) => row.displayName || row.username);
                showProfessionalError(
                    `${created.length} login(s) criado(s): ${created.map((row) => row.displayName || row.username).join(', ')}.`
                    + (missing.length ? ` Sem email ainda: ${missing.join(', ')} — preencha em "Editar ficha".` : '')
                    + ' Cada profissional pode entrar com "Esqueci a password" ou receber o email de acesso.'
                );
            } catch (err) {
                showProfessionalError('Erro de rede. Tente novamente.');
            } finally {
                adminDirAssignLoginsBtn.disabled = false;
            }
        });
    }

    function inputField(name, label, value, opts) {
        const o = opts || {};
        const type = o.type || 'text';
        const attrs = [
            `type="${type}"`,
            `name="${name}"`,
            `class="admin-input"`,
            `value="${escapeHtml(value == null ? '' : String(value))}"`,
            o.placeholder ? `placeholder="${escapeHtml(o.placeholder)}"` : '',
            o.required ? 'required' : '',
            o.maxlength ? `maxlength="${o.maxlength}"` : '',
            type === 'email' ? 'inputmode="email" autocomplete="off"' : 'autocomplete="off"'
        ].filter(Boolean).join(' ');
        return `<label class="${o.wide ? 'is-wide' : ''}"><span>${escapeHtml(label)}</span><input ${attrs}></label>`;
    }

    function textareaField(name, label, value, rows) {
        return `<label class="is-wide"><span>${escapeHtml(label)}</span><textarea name="${name}" class="admin-input" rows="${rows || 3}">${escapeHtml(value == null ? '' : String(value))}</textarea></label>`;
    }

    function renderDirectoryEditForm(p) {
        const hasAccount = !!(p.hasLogin && p.id && !p.isClinicAdmin);
        const professionOptions = Object.entries(staffProfessionTitlesCache || STAFF_PROFESSION_LABELS)
            .map(([key, label]) => `<option value="${escapeHtml(key)}"${String(p.profession || '') === key ? ' selected' : ''}>${escapeHtml(label)}</option>`)
            .join('');
        const validUntil = String(p.insuranceValidUntil || '').slice(0, 10);
        const emailValue = hasAccount ? (p.loginEmail || p.email || '') : (p.email || '');
        const emailHint = hasAccount
            ? 'É com este email que o profissional entra no portal e recebe o código de recuperação de password.'
            : 'Esta ficha ainda não tem login; o email fica apenas na ficha.';
        return `
            <form class="admin-dir-edit-form" data-pro-edit-form="${escapeHtml(p.username)}" data-pro-id="${escapeHtml(String(p.id || ''))}">
                ${inputField('fullName', 'Nome completo', p.fullName || p.displayName || '', { required: true, maxlength: 160 })}
                <label><span>Profissão</span>
                    <select name="profession" class="admin-select">
                        <option value=""${!p.profession ? ' selected' : ''}>—</option>
                        ${professionOptions}
                    </select>
                </label>
                <label class="is-wide"><span>${hasAccount ? 'Email de login' : 'Email'}</span>
                    <input type="email" name="email" class="admin-input" value="${escapeHtml(emailValue)}" placeholder="nome@email.com" inputmode="email" autocomplete="off"${hasAccount ? ' required' : ''}>
                    <small>${escapeHtml(emailHint)}</small>
                </label>
                ${hasAccount ? inputField('doxyRoomUrl', 'Sala Doxy.me', p.doxyPending ? '' : (p.doxyRoomUrl || ''), { type: 'url', placeholder: 'https://doxy.me/…', wide: true }) : ''}
                ${inputField('ordemNumber', 'Cédula / n.º da Ordem', p.ordemNumber, { maxlength: 80 })}
                ${inputField('nif', 'NIF', p.nif, { maxlength: 20 })}
                ${inputField('citizenCard', 'Cartão de Cidadão', p.citizenCard, { maxlength: 32 })}
                ${inputField('address', 'Morada', p.address, { maxlength: 400, wide: true })}
                ${inputField('insurer', 'Seguradora', p.insurer, { maxlength: 120 })}
                ${inputField('insurancePolicy', 'Apólice', p.insurancePolicy, { maxlength: 80 })}
                ${inputField('insuranceValidUntil', 'Validade do seguro', validUntil, { type: 'date' })}
                ${textareaField('bio', 'Bio', p.bio, 4)}
                ${textareaField('credentials', 'Credenciais', p.credentials, 3)}
                ${hasAccount ? `<label class="admin-dir-edit-check is-wide"><input type="checkbox" name="active"${p.active ? ' checked' : ''}> Conta ativa (pode entrar no portal)</label>` : ''}
                ${p.iban ? `<p class="admin-dir-edit-note is-wide">IBAN: <code>${escapeHtml(p.iban)}</code> — só o profissional o altera, no portal.</p>` : ''}
                <div class="admin-dir-edit-actions">
                    <button type="submit" class="btn btn-primary btn-sm">Guardar alterações</button>
                    <button type="button" class="btn btn-outline btn-sm" data-pro-edit-cancel>Cancelar</button>
                </div>
            </form>
        `;
    }

    async function submitDirectoryEdit(form) {
        const username = form.getAttribute('data-pro-edit-form') || '';
        const id = form.getAttribute('data-pro-id') || '';
        const p = professionalByKey(selectedProfessionalKey) || {};
        const hasAccount = !!(p.hasLogin && id && !p.isClinicAdmin);
        const fd = new FormData(form);
        const text = (name) => String(fd.get(name) || '').trim();
        const fullName = text('fullName');
        if (!fullName) {
            showProfessionalError('O nome é obrigatório.');
            return;
        }
        const email = text('email').toLowerCase();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showProfessionalError('Email inválido.');
            return;
        }
        if (hasAccount && !email) {
            showProfessionalError('Uma conta com login precisa de um email.');
            return;
        }
        const profileBody = {
            fullName,
            profession: text('profession'),
            ordemNumber: text('ordemNumber'),
            nif: text('nif'),
            citizenCard: text('citizenCard'),
            address: text('address'),
            insurer: text('insurer'),
            insurancePolicy: text('insurancePolicy'),
            insuranceValidUntil: text('insuranceValidUntil'),
            bio: text('bio'),
            credentials: text('credentials')
        };
        // The account PATCH checks that no other login owns the email; the profile PATCH does not.
        if (!hasAccount && email) profileBody.email = email;
        const accountBody = {};
        if (hasAccount) {
            if (email !== String(p.loginEmail || '').toLowerCase()) accountBody.email = email;
            const doxy = text('doxyRoomUrl');
            const currentDoxy = p.doxyPending ? '' : String(p.doxyRoomUrl || '');
            if (doxy !== currentDoxy) accountBody.doxyRoomUrl = doxy;
            const active = fd.get('active') === 'on';
            if (active !== (p.active !== false)) accountBody.active = active;
            if (fullName !== String(p.displayName || '')) accountBody.displayName = fullName;
        }
        const buttons = form.querySelectorAll('button');
        buttons.forEach((b) => { b.disabled = true; });
        showProfessionalError('');
        try {
            if (Object.keys(accountBody).length) {
                const res = await fetch(`/api/admin/professionals/${encodeURIComponent(id)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(accountBody)
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    showProfessionalError(data.error || 'Não foi possível guardar a conta.');
                    return;
                }
            }
            const res = await fetch(`/api/admin/staff-profiles/${encodeURIComponent(username)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileBody)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showProfessionalError(data.error || 'Não foi possível guardar a ficha.');
                return;
            }
            dirEditing = false;
            await loadAdminProfessionals();
            showProfessionalError(`Ficha guardada: ${fullName}${accountBody.email ? ` · email de login ${accountBody.email}` : ''}`);
        } catch (err) {
            showProfessionalError('Erro de rede. Tente novamente.');
        } finally {
            buttons.forEach((b) => { b.disabled = false; });
        }
    }

    function renderAdminProfessionals() {
        if (!adminProfessionalsBody) return;
        const all = directoryProfessionals();
        const files = filteredDirectoryProfessionals();
        if (adminDirCount) {
            const noun = all.length === 1 ? 'professional' : 'professionals';
            adminDirCount.textContent = files.length === all.length
                ? `${all.length} ${noun}`
                : `${files.length} of ${all.length} ${noun}`;
        }
        if (!all.length) {
            adminProfessionalsBody.innerHTML = '<p class="admin-empty-list">No professionals yet.</p>';
            renderDirectoryDetail(null);
            return;
        }
        if (!files.length) {
            adminProfessionalsBody.innerHTML = '<p class="admin-empty-list">No professionals match this filter.</p>';
            renderDirectoryDetail(null);
            return;
        }
        if (selectedProfessionalKey && !files.some((p) => professionalKey(p) === selectedProfessionalKey)) {
            selectedProfessionalKey = professionalKey(files[0]);
        }
        adminProfessionalsBody.innerHTML = files.map((p) => {
            const key = professionalKey(p);
            const title = p.fullName || p.displayName || p.username || '—';
            const role = professionalTypeLabel(p) || 'Professional';
            const status = professionalStatusLabel(p);
            const selected = key && key === selectedProfessionalKey;
            return `<button type="button" class="admin-dir-card${selected ? ' is-selected' : ''}" data-dir-key="${escapeHtml(key)}" aria-pressed="${selected ? 'true' : 'false'}">
                ${professionalPhotoHtml(p, 'admin-dir-photo')}
                <strong class="admin-dir-name">${escapeHtml(title)}</strong>
                <span class="admin-dir-role">${escapeHtml(role)}</span>
                <span class="admin-pro-status${status.off ? ' is-off' : ''}">${escapeHtml(status.text)}</span>
            </button>`;
        }).join('');
        renderDirectoryDetail(professionalByKey(selectedProfessionalKey));
    }

    async function loadAdminStaffProfiles() {
        try {
            const res = await fetch('/api/admin/staff-profiles');
            if (res.status === 401 || res.status === 403) {
                renderAdminProfessionals();
                return;
            }
            if (!res.ok) throw new Error('Failed to load staff profiles');
            const data = await res.json();
            staffProfilesCache = data.staff || [];
            staffDocumentKindsCache = data.documentKinds || {};
            if (data.professions && typeof data.professions === 'object') {
                staffProfessionTitlesCache = { ...STAFF_PROFESSION_LABELS, ...data.professions };
            }
            renderAdminProfessionals();
        } catch (err) {
            console.error('Load staff profiles:', err);
            renderAdminProfessionals();
        }
    }

    async function loadAdminProfessionals() {
        if (!adminProfessionalsBody) return;
        try {
            const res = await fetch('/api/admin/professionals');
            if (res.status === 401 || res.status === 403) {
                if (res.status === 403) showLogin();
                else showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            professionalsCache = data.professionals || [];
            boardProfessionalsCache = data.board || [];
            namedProfessionalsCache = data.named || [];
            fillProfessionalsDatalist(professionalsCache.concat(
                boardProfessionalsCache.map((a) => ({ displayName: a.name })),
                namedProfessionalsCache.map((row) => ({ displayName: row.name }))
            ).filter((p) => p.displayName));
            await loadAdminStaffProfiles();
        } catch (err) {
            console.error('Load professionals:', err);
            adminProfessionalsBody.innerHTML = '<p class="admin-empty-list">Could not load professionals.</p>';
        }
    }

    if (adminDirSearch) {
        adminDirSearch.addEventListener('input', () => {
            dirSearchQuery = adminDirSearch.value || '';
            renderAdminProfessionals();
        });
    }

    document.querySelectorAll('[data-dir-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
            dirProfessionFilter = btn.getAttribute('data-dir-type') || '';
            document.querySelectorAll('[data-dir-type]').forEach((el) => {
                const on = (el.getAttribute('data-dir-type') || '') === dirProfessionFilter;
                el.classList.toggle('btn-primary', on);
                el.classList.toggle('btn-outline', !on);
                el.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            renderAdminProfessionals();
        });
    });

    if (adminProfessionalsBody) {
        adminProfessionalsBody.addEventListener('click', (e) => {
            const card = e.target.closest('[data-dir-key]');
            if (!card) return;
            const nextKey = card.getAttribute('data-dir-key') || '';
            if (nextKey !== selectedProfessionalKey) dirEditing = false;
            selectedProfessionalKey = nextKey;
            renderAdminProfessionals();
            if (adminDirDetail) adminDirDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

    if (adminDirDetail) {
        adminDirDetail.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-pro-edit]');
            if (editBtn) {
                dirEditing = true;
                showProfessionalError('');
                renderAdminProfessionals();
                return;
            }
            if (e.target.closest('[data-pro-edit-cancel]')) {
                dirEditing = false;
                showProfessionalError('');
                renderAdminProfessionals();
                return;
            }
            const assignBtn = e.target.closest('[data-pro-assign-login]');
            if (assignBtn) {
                void assignLoginToStaffFile(assignBtn.getAttribute('data-pro-assign-login') || '', assignBtn);
                return;
            }
            const sendLoginBtn = e.target.closest('[data-pro-send-login]');
            if (!sendLoginBtn) return;
            const pro = professionalRecordById(sendLoginBtn.getAttribute('data-pro-send-login'));
            if (!pro || !pro.id) {
                showProfessionalError('Could not find this professional.');
                return;
            }
            openSendLoginEmailModal(pro);
        });
        adminDirDetail.addEventListener('submit', (e) => {
            const form = e.target.closest('[data-pro-edit-form]');
            if (!form) return;
            e.preventDefault();
            void submitDirectoryEdit(form);
        });
    }

    if (proCredsCopyBtn) {
        proCredsCopyBtn.addEventListener('click', async () => {
            const portal = proCredsPortal ? proCredsPortal.textContent : `${window.location.origin}/admin`;
            const email = proCredsUsername ? proCredsUsername.textContent : '';
            const text = [
                name ? `Name: ${name}` : '',
                `Portal: ${portal}`,
                `Email: ${email}`,
                'Password: the professional sets their own via the email link'
            ].filter(Boolean).join('\n');
            try {
                await navigator.clipboard.writeText(text);
                proCredsCopyBtn.textContent = 'Copied';
                setTimeout(() => { proCredsCopyBtn.textContent = 'Copy login'; }, 1600);
            } catch (err) {
                showProfessionalError('Could not copy. Select the email and password above.');
            }
        });
    }

    if (proCredsSendBtn) {
        proCredsSendBtn.addEventListener('click', () => {
            const id = adminProfessionalCreds && adminProfessionalCreds.dataset.proId;
            const person = professionalRecordById(id);
            const username = proCredsUsername ? proCredsUsername.textContent : '';
            const name = proCredsName ? proCredsName.textContent : '';
            const pro = person || { id, username, displayName: name };
            if (!pro.id) {
                showProfessionalError('Could not find this professional.');
                return;
            }
            openSendLoginEmailModal(pro);
        });
    }
    document.querySelectorAll('[data-close-send-login-modal]').forEach((el) => {
        el.addEventListener('click', closeSendLoginEmailModal);
    });
    if (sendLoginEmailForm) {
        sendLoginEmailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitSendLoginEmail(false);
        });
    }

    const DEFAULT_ORDEM_LABELS = {
        medico: 'Número da Ordem dos Médicos',
        nutricionista: 'Número da Ordem dos Nutricionistas',
        psicologo: 'Número da Ordem dos Psicólogos'
    };
    const DEFAULT_DOC_KINDS = {
        identificacao: 'Cartão de Cidadão',
        cartao_ordem: 'Cópia da cédula',
        cv: 'CV',
        seguro: 'Seguro de responsabilidade civil',
        contrato: 'Contrato'
    };
    const OPTIONAL_DOC_VALIDITY = new Set(['cv']);
    const DEFAULT_CONSULT_LANGUAGES = ['Português', 'Inglês', 'Espanhol', 'Francês'];
    let adminProfileMeta = {
        professions: DEFAULT_ORDEM_LABELS,
        documentKinds: DEFAULT_DOC_KINDS,
        clinicalAreas: {},
        consultLanguageOptions: DEFAULT_CONSULT_LANGUAGES,
        documents: []
    };
    let adminProfileLoaded = null;

    function firstFilledText(...values) {
        for (const value of values) {
            const s = String(value == null ? '' : value).trim();
            if (s) return s;
        }
        return '';
    }

    function isValidProfileEmail(raw) {
        const email = String(raw || '').trim().toLowerCase();
        return email.length >= 5 && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function firstFilledList(...values) {
        for (const value of values) {
            const list = parseAreaList(value);
            if (list.length) return list;
        }
        return [];
    }
    const adminProfileUsername = document.getElementById('adminProfileUsername');
    const adminProfileEmail = document.getElementById('adminProfileEmail');
    const adminProfilePhone = document.getElementById('adminProfilePhone');
    const adminProfileDoxy = document.getElementById('adminProfileDoxy');
    const adminProfilePhoto = document.getElementById('adminProfilePhoto');
    const adminProfilePhotoPlaceholder = document.getElementById('adminProfilePhotoPlaceholder');
    const adminProfilePhotoInput = document.getElementById('adminProfilePhotoInput');
    const adminProfilePhotoBtn = document.getElementById('adminProfilePhotoBtn');
    const adminPhotoError = document.getElementById('adminPhotoError');
    const adminProfession = document.getElementById('adminProfession');
    const adminOrdemLabel = document.getElementById('adminOrdemLabel');
    const adminOrdemNumber = document.getElementById('adminOrdemNumber');
    const adminFullName = document.getElementById('adminFullName');
    const adminNif = document.getElementById('adminNif');
    const adminCitizenCard = document.getElementById('adminCitizenCard');
    const adminAddress = document.getElementById('adminAddress');
    const adminInsurer = document.getElementById('adminInsurer');
    const adminInsurancePolicy = document.getElementById('adminInsurancePolicy');
    const adminInsuranceValidUntil = document.getElementById('adminInsuranceValidUntil');
    const adminBio = document.getElementById('adminBio');
    const adminCredentials = document.getElementById('adminCredentials');
    const adminConsultLanguages = document.getElementById('adminConsultLanguages');
    const adminConsultLangOtherWrap = document.getElementById('adminConsultLangOtherWrap');
    const adminConsultLangOther = document.getElementById('adminConsultLangOther');
    const adminPrimaryAreas = document.getElementById('adminPrimaryAreas');
    const adminSecondaryAreas = document.getElementById('adminSecondaryAreas');
    const adminProfileForm = document.getElementById('adminProfileForm');
    const adminProfileFormError = document.getElementById('adminProfileFormError');
    const adminProfileSaveBtn = document.getElementById('adminProfileSaveBtn');
    const adminProfileSaveConfirm = document.getElementById('adminProfileSaveConfirm');
    const adminDocsBody = document.getElementById('adminDocsBody');
    const adminDocsError = document.getElementById('adminDocsError');

    function ordemLabelFor(profession) {
        const labels = adminProfileMeta.professions || DEFAULT_ORDEM_LABELS;
        return labels[profession] || 'Cédula profissional';
    }

    function parseAreaList(value) {
        if (Array.isArray(value)) {
            return [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))];
        }
        const s = String(value || '').trim();
        if (!s) return [];
        if (s.startsWith('[')) {
            try { return parseAreaList(JSON.parse(s)); } catch (e) { /* ignore */ }
        }
        return [s];
    }

    function areaGroupsFor(profession) {
        const groups = (adminProfileMeta.clinicalAreas && adminProfileMeta.clinicalAreas[profession]) || [];
        return groups.filter((g) => g && Array.isArray(g.items));
    }

    function renderAreaChecks(container, profession, selected, fieldName) {
        if (!container) return;
        const selectedSet = new Set(parseAreaList(selected));
        const inputName = fieldName || 'areas';
        if (!profession) {
            container.innerHTML = '<p class="clinic-pref-empty">Seleccione a profissão primeiro</p>';
            return;
        }
        const groups = areaGroupsFor(profession);
        const known = new Set(groups.flatMap((g) => g.items || []));
        const extra = [...selectedSet].filter((v) => !known.has(v));
        const allGroups = extra.length ? groups.concat([{ group: 'Outras', items: extra }]) : groups;
        container.innerHTML = allGroups.map((g) => `
            <div class="clinic-pref-group">
                <h3 class="clinic-pref-group-title">${escapeHtml(g.group)}</h3>
                <div class="clinic-pref-list">
                    ${(g.items || []).map((item) => `
                        <label class="clinic-pref-check">
                            <input type="checkbox" name="${escapeHtml(inputName)}" value="${escapeHtml(item)}" ${selectedSet.has(item) ? 'checked' : ''}>
                            <span>${escapeHtml(item)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('') || '<p class="clinic-pref-empty">Sem áreas para esta profissão</p>';
    }

    function readAreaChecks(container) {
        if (!container) return [];
        return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
    }

    function fillConsultLanguageChecks(selected) {
        if (!adminConsultLanguages) return;
        const options = adminProfileMeta.consultLanguageOptions || DEFAULT_CONSULT_LANGUAGES;
        const selectedList = parseAreaList(selected);
        const known = new Set(options);
        const extras = selectedList.filter((v) => !known.has(v));
        const otherValue = extras.join(', ');
        adminConsultLanguages.innerHTML = options.map((item) => `
            <label class="clinic-pref-check">
                <input type="checkbox" name="consultLanguages" value="${escapeHtml(item)}" ${selectedList.includes(item) ? 'checked' : ''}>
                <span>${escapeHtml(item)}</span>
            </label>
        `).join('') + `
            <label class="clinic-pref-check">
                <input type="checkbox" name="consultLanguagesOther" id="adminConsultLangOtherCheck" ${otherValue ? 'checked' : ''}>
                <span>Outro</span>
            </label>
        `;
        if (adminConsultLangOther) adminConsultLangOther.value = otherValue;
        const syncOther = () => {
            const checked = document.getElementById('adminConsultLangOtherCheck');
            if (adminConsultLangOtherWrap) adminConsultLangOtherWrap.hidden = !(checked && checked.checked);
        };
        syncOther();
        const otherCheck = document.getElementById('adminConsultLangOtherCheck');
        if (otherCheck) otherCheck.addEventListener('change', syncOther);
    }

    function readConsultLanguages() {
        const values = adminConsultLanguages
            ? [...adminConsultLanguages.querySelectorAll('input[name="consultLanguages"]:checked')].map((el) => el.value)
            : [];
        const otherCheck = document.getElementById('adminConsultLangOtherCheck');
        const extra = adminConsultLangOther ? adminConsultLangOther.value.trim() : '';
        if (otherCheck && otherCheck.checked && extra) values.push(extra);
        return values;
    }

    function keepKnownAreas(profession, selected) {
        const known = new Set(areaGroupsFor(profession).flatMap((g) => g.items || []));
        return parseAreaList(selected).filter((item) => known.has(item));
    }

    function fillAdminAreaChecks(profession, primarySelected, secondarySelected) {
        renderAreaChecks(adminPrimaryAreas, profession, primarySelected, 'primaryAreas');
        renderAreaChecks(adminSecondaryAreas, profession, secondarySelected, 'secondaryAreas');
    }

    function updateAdminOrdemLabel() {
        if (!adminOrdemLabel) return;
        adminOrdemLabel.textContent = ordemLabelFor(adminProfession && adminProfession.value);
    }

    function renderAdminDocumentRows() {
        if (!adminDocsBody) return;
        const kinds = adminProfileMeta.documentKinds || DEFAULT_DOC_KINDS;
        const uploaded = {};
        (adminProfileMeta.documents || []).forEach((doc) => {
            if (doc && doc.kind) uploaded[doc.kind] = doc;
        });
        adminDocsBody.innerHTML = Object.keys(kinds).map((kind) => {
            const label = kinds[kind];
            const doc = uploaded[kind];
            const fileCell = doc
                ? `<a class="clinic-doc-link" href="/api/clinic/profile/documents/${encodeURIComponent(doc.id)}">${escapeHtml(doc.originalName || label)}</a>`
                : '<span class="clinic-doc-missing">Por enviar</span>';
            const validity = doc && doc.validUntil ? escapeHtml(doc.validUntil) : '—';
            const dateRequired = OPTIONAL_DOC_VALIDITY.has(kind) ? '' : ' required';
            return `<tr data-doc-kind="${escapeHtml(kind)}">
                <td>${escapeHtml(label)}</td>
                <td>
                    ${fileCell}
                    <input type="file" class="clinic-doc-file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*">
                </td>
                <td>
                    <div class="clinic-doc-validity">${validity}</div>
                    <input type="date" class="admin-input clinic-doc-date" value="${doc && doc.validUntil ? escapeHtml(doc.validUntil) : ''}"${dateRequired}>
                </td>
                <td class="clinic-doc-actions">
                    <button type="button" class="btn btn-outline btn-sm clinic-doc-upload">${doc ? 'Substituir' : 'Enviar'}</button>
                    ${doc ? `<button type="button" class="btn btn-outline btn-sm clinic-doc-delete" data-doc-id="${escapeHtml(String(doc.id))}">Eliminar</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    }

    function showAdminProfileError(el, message) {
        if (!el) return;
        el.textContent = message;
        el.style.display = 'block';
    }

    function showProfileSavedConfirm(el) {
        if (!el) return;
        el.hidden = false;
        el.classList.add('is-on');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(() => {
            el.hidden = true;
            el.classList.remove('is-on');
        }, 5000);
    }

    function hideProfileSavedConfirm(el) {
        if (!el || el.dataset.locked === '1') return;
        clearTimeout(el._hideTimer);
        el.hidden = true;
        el.classList.remove('is-on');
    }

    function setAdminProfilePhoto(hasPhoto) {
        if (adminProfilePhoto) {
            if (hasPhoto) {
                adminProfilePhoto.src = `/api/clinic/profile/photo?t=${Date.now()}`;
                adminProfilePhoto.hidden = false;
            } else {
                adminProfilePhoto.removeAttribute('src');
                adminProfilePhoto.hidden = true;
            }
        }
        if (adminProfilePhotoPlaceholder) {
            adminProfilePhotoPlaceholder.hidden = !!hasPhoto;
        }
        if (adminProfilePhotoBtn) adminProfilePhotoBtn.textContent = hasPhoto ? 'Substituir foto' : 'Adicionar foto';
    }

    async function loadAdminProfile() {
        if (!adminProfession) return;
        try {
            const [profileRes, doxyRes] = await Promise.all([
                fetch('/api/clinic/ficha', { cache: 'no-store', credentials: 'same-origin' }),
                fetch('/api/clinic/doxy', { cache: 'no-store', credentials: 'same-origin' })
            ]);
            if (profileRes.status === 401) {
                showLogin();
                return;
            }
            if (!profileRes.ok) throw new Error('Failed to load profile');
            const data = await profileRes.json();
            adminProfileLoaded = data;
            adminProfileMeta = {
                professions: data.professions || DEFAULT_ORDEM_LABELS,
                documentKinds: data.documentKinds || DEFAULT_DOC_KINDS,
                clinicalAreas: data.clinicalAreas || {},
                consultLanguageOptions: data.consultLanguageOptions || DEFAULT_CONSULT_LANGUAGES,
                documents: data.documents || []
            };
            if (adminProfileUsername) adminProfileUsername.textContent = data.username || '—';
            if (adminProfileEmail) {
                if ('value' in adminProfileEmail) adminProfileEmail.value = data.email || (data.bolsa && data.bolsa.email) || '';
                else adminProfileEmail.textContent = data.email || (data.bolsa && data.bolsa.email) || '—';
            }
            if (adminProfilePhone) adminProfilePhone.textContent = data.phone || (data.bolsa && data.bolsa.phone) || '—';
            adminProfession.value = data.profession || (data.bolsa ? 'psicologo' : '');
            if (adminFullName) adminFullName.value = data.fullName || data.displayName || (data.bolsa && data.bolsa.name) || '';
            if (adminNif) adminNif.value = data.nif || '';
            if (adminCitizenCard) adminCitizenCard.value = data.citizenCard || '';
            if (adminAddress) adminAddress.value = data.address || (data.bolsa && data.bolsa.localidade) || '';
            if (adminInsurer) adminInsurer.value = data.insurer || '';
            if (adminInsurancePolicy) adminInsurancePolicy.value = data.insurancePolicy || '';
            if (adminInsuranceValidUntil) adminInsuranceValidUntil.value = data.insuranceValidUntil || '';
            if (adminOrdemNumber) adminOrdemNumber.value = data.ordemNumber || (data.bolsa && data.bolsa.cedula) || '';
            if (adminBio) adminBio.value = data.bio || '';
            if (adminCredentials) adminCredentials.value = data.credentials || '';
            setAdminProfilePhoto(!!data.hasPhoto);
            updateAdminOrdemLabel();
            fillAdminAreaChecks(data.profession || adminProfession.value, data.primaryAreas, data.secondaryAreas);
            fillConsultLanguageChecks(
                (data.consultLanguages && data.consultLanguages.length)
                    ? data.consultLanguages
                    : ((data.bolsa && data.bolsa.consultLanguages) || [])
            );
            renderAdminDocumentRows();
            showBolsaProfileSection('adminBolsaProfileWrap', 'adminBolsaProfile', 'adminRegistoSubtitle', data.bolsa, {
                cvHref: '/api/clinic/profile/bolsa-cv'
            });
            if (adminProfileFormError) adminProfileFormError.style.display = 'none';
            if (adminDocsError) adminDocsError.style.display = 'none';
            if (doxyRes.ok) {
                const doxy = await doxyRes.json().catch(() => ({}));
                if (adminProfileDoxy) {
                    adminProfileDoxy.textContent = doxy.pending
                        ? 'Pending'
                        : (doxy.patientRoomUrl || 'Pending');
                }
            }
        } catch (err) {
            console.error('Failed to load admin profile:', err);
            if (adminDocsBody) {
                adminDocsBody.innerHTML = '<tr><td colspan="4" class="admin-empty-list">Could not load profile.</td></tr>';
            }
        }
    }

    if (adminProfession) {
        adminProfession.addEventListener('change', () => {
            updateAdminOrdemLabel();
            fillAdminAreaChecks(
                adminProfession.value,
                keepKnownAreas(adminProfession.value, readAreaChecks(adminPrimaryAreas)),
                keepKnownAreas(adminProfession.value, readAreaChecks(adminSecondaryAreas))
            );
        });
    }

    function bindAdminPrefExclusive(source, other) {
        if (!source) return;
        source.addEventListener('change', (e) => {
            const input = e.target.closest('input[type="checkbox"]');
            if (!input || !input.checked || !other) return;
            other.querySelectorAll('input[type="checkbox"]').forEach((el) => {
                if (el.value === input.value) el.checked = false;
            });
        });
    }
    bindAdminPrefExclusive(adminPrimaryAreas, adminSecondaryAreas);
    bindAdminPrefExclusive(adminSecondaryAreas, adminPrimaryAreas);

    if (adminProfileForm) {
        adminProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminProfileFormError) adminProfileFormError.style.display = 'none';
            hideProfileSavedConfirm(adminProfileSaveConfirm);
            const typedEmail = String(
                adminProfileEmail && 'value' in adminProfileEmail ? adminProfileEmail.value : ''
            ).trim();
            if (typedEmail && !isValidProfileEmail(typedEmail)) {
                showAdminProfileError(
                    adminProfileFormError,
                    'Introduza um email completo, por exemplo nome@gmail.com. Não é preciso confirmá-lo noutro passo.'
                );
                if (adminProfileEmail && adminProfileEmail.focus) adminProfileEmail.focus();
                return;
            }
            const loaded = adminProfileLoaded || {};
            const bolsa = loaded.bolsa || {};
            const languages = firstFilledList(readConsultLanguages(), loaded.consultLanguages, bolsa.consultLanguages);
            const payload = {
                profession: firstFilledText(adminProfession.value, loaded.profession, bolsa.id || bolsa.email ? 'psicologo' : ''),
                fullName: firstFilledText(adminFullName && adminFullName.value, loaded.fullName, loaded.displayName, bolsa.name),
                email: firstFilledText(
                    typedEmail,
                    loaded.email,
                    bolsa.email
                ),
                nif: firstFilledText(adminNif && adminNif.value, loaded.nif),
                citizenCard: firstFilledText(adminCitizenCard && adminCitizenCard.value, loaded.citizenCard),
                address: firstFilledText(adminAddress && adminAddress.value, loaded.address, bolsa.localidade),
                insurer: firstFilledText(adminInsurer && adminInsurer.value, loaded.insurer),
                insurancePolicy: firstFilledText(adminInsurancePolicy && adminInsurancePolicy.value, loaded.insurancePolicy),
                insuranceValidUntil: firstFilledText(adminInsuranceValidUntil && adminInsuranceValidUntil.value, loaded.insuranceValidUntil),
                ordemNumber: firstFilledText(adminOrdemNumber && adminOrdemNumber.value, loaded.ordemNumber, bolsa.cedula),
                bio: firstFilledText(adminBio && adminBio.value, loaded.bio),
                credentials: firstFilledText(adminCredentials && adminCredentials.value, loaded.credentials),
                consultLanguages: languages,
                primaryAreas: firstFilledList(readAreaChecks(adminPrimaryAreas), loaded.primaryAreas),
                secondaryAreas: firstFilledList(readAreaChecks(adminSecondaryAreas), loaded.secondaryAreas)
            };
            if (adminProfileSaveBtn) adminProfileSaveBtn.disabled = true;
            try {
                const res = await fetch('/api/clinic/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to save profile');
                }
                showProfileSavedConfirm(adminProfileSaveConfirm);
                if (adminProfileSaveConfirm) adminProfileSaveConfirm.dataset.locked = '1';
                try {
                    await loadAdminProfile();
                } finally {
                    if (adminProfileSaveConfirm) {
                        requestAnimationFrame(() => {
                            delete adminProfileSaveConfirm.dataset.locked;
                        });
                    }
                }
            } catch (err) {
                hideProfileSavedConfirm(adminProfileSaveConfirm);
                showAdminProfileError(adminProfileFormError, err.message || 'Failed to save profile');
            } finally {
                if (adminProfileSaveBtn) adminProfileSaveBtn.disabled = false;
            }
        });
    }

    const adminPanelProfile = document.getElementById('adminPanelProfile');
    if (adminPanelProfile) {
        adminPanelProfile.addEventListener('input', () => hideProfileSavedConfirm(adminProfileSaveConfirm));
        adminPanelProfile.addEventListener('change', () => hideProfileSavedConfirm(adminProfileSaveConfirm));
    }

    if (adminProfilePhotoInput) {
        adminProfilePhotoInput.addEventListener('change', async () => {
            if (adminPhotoError) adminPhotoError.style.display = 'none';
            const file = adminProfilePhotoInput.files && adminProfilePhotoInput.files[0];
            if (!file) return;
            const form = new FormData();
            form.append('photo', file);
            try {
                const res = await fetch('/api/clinic/profile/photo', { method: 'POST', body: form });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
                setAdminProfilePhoto(true);
            } catch (err) {
                showAdminProfileError(adminPhotoError, err.message || 'Failed to upload photo');
            } finally {
                adminProfilePhotoInput.value = '';
            }
        });
    }

    if (adminDocsBody) {
        adminDocsBody.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.clinic-doc-delete');
            if (deleteBtn) {
                const docId = deleteBtn.getAttribute('data-doc-id');
                if (!docId) return;
                if (adminDocsError) adminDocsError.style.display = 'none';
                if (!window.confirm('Eliminar este ficheiro?')) return;
                deleteBtn.disabled = true;
                try {
                    const res = await fetch(`/api/clinic/profile/documents/${encodeURIComponent(docId)}`, {
                        method: 'DELETE',
                        credentials: 'same-origin'
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 401) {
                        showLogin();
                        return;
                    }
                    if (!res.ok) throw new Error(data.error || 'Failed to delete document');
                    await loadAdminProfile();
                } catch (err) {
                    showAdminProfileError(adminDocsError, err.message || 'Failed to delete document');
                    deleteBtn.disabled = false;
                }
                return;
            }
            const btn = e.target.closest('.clinic-doc-upload');
            if (!btn) return;
            const row = btn.closest('tr');
            const kind = row && row.getAttribute('data-doc-kind');
            const fileInput = row && row.querySelector('.clinic-doc-file');
            const dateInput = row && row.querySelector('.clinic-doc-date');
            if (!kind || !fileInput || !dateInput) return;
            if (adminDocsError) adminDocsError.style.display = 'none';
            if (!fileInput.files || !fileInput.files[0]) {
                showAdminProfileError(adminDocsError, 'Escolha um ficheiro para enviar.');
                return;
            }
            if (dateInput.required && !dateInput.value) {
                showAdminProfileError(adminDocsError, 'Indique a validade do documento.');
                return;
            }
            const form = new FormData();
            form.append('kind', kind);
            form.append('validUntil', dateInput.value);
            form.append('file', fileInput.files[0]);
            btn.disabled = true;
            try {
                const res = await fetch('/api/clinic/profile/documents', {
                    method: 'POST',
                    body: form
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to upload document');
                }
                await loadAdminProfile();
            } catch (err) {
                showAdminProfileError(adminDocsError, err.message || 'Failed to upload document');
            } finally {
                btn.disabled = false;
            }
        });
    }

    // ─── Initialize ───
    await checkAuth();
    if (inviteList) loadInvitations();
    loadAdminReviews();
});
