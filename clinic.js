/* ========================================
   Clinic Portal — JavaScript
   Manage consultations and clinical records
======================================== */

document.addEventListener('DOMContentLoaded', () => {

    const SERVICE_LABELS = {
        longevity: 'Longevity Assessment',
        'longevity-plus': 'Longevity Plus',
        longevidade: 'Longevidade',
        travel: 'Travel Medicine Consultation',
        followup: 'Follow-Up Consultation',
        entrevista: 'Entrevista de emprego',
        clinica_geral: 'Clínica geral',
        urgente: 'Urgente',
        infeccao_urinaria: 'Infeção urinária',
        saude_mental: 'Saúde mental',
        burnout: 'Burnout especializada',
        burnout_mensal: 'Anti-burnout',
        burnout_programa: 'Programa anti-burnout',
        renovacao: 'Renovação receita',
        psicologia: 'Psicologia',
        terapia_casal: 'Terapia de casal',
        terapia_casal_mensal: 'Terapia de casal (subscrição)'
    };

    // ─── DOM Elements ───
    const clinicLogin = document.getElementById('clinicLogin');
    const clinicContent = document.getElementById('clinicContent');
    const clinicLoginForm = document.getElementById('clinicLoginForm');
    const clinicUsername = document.getElementById('clinicUsername');
    const clinicPassword = document.getElementById('clinicPassword');
    const loginError = document.getElementById('loginError');
    const clinicLoginTitle = document.getElementById('clinicLoginTitle');
    const clinicLoginDesc = document.getElementById('clinicLoginDesc');
    const clinicLoginOk = document.getElementById('clinicLoginOk');
    const clinicForgotForm = document.getElementById('clinicForgotForm');
    const clinicForgotEmail = document.getElementById('clinicForgotEmail');
    const clinicForgotLink = document.getElementById('clinicForgotLink');
    const clinicForgotBack = document.getElementById('clinicForgotBack');
    const clinicForgotSubmit = document.getElementById('clinicForgotSubmit');
    const forgotError = document.getElementById('forgotError');
    const clinicResetForm = document.getElementById('clinicResetForm');
    const clinicResetCode = document.getElementById('clinicResetCode');
    const clinicResetPassword = document.getElementById('clinicResetPassword');
    const clinicResetPassword2 = document.getElementById('clinicResetPassword2');
    const clinicResetSubmit = document.getElementById('clinicResetSubmit');
    const clinicResetResend = document.getElementById('clinicResetResend');
    const clinicResetBack = document.getElementById('clinicResetBack');
    const resetError = document.getElementById('resetError');
    let clinicResetEmail = '';
    const clinicLogoutBtn = document.getElementById('clinicLogoutBtn');
    const clinicAdminLink = document.getElementById('clinicAdminLink');
    const clinicGreeting = document.getElementById('clinicGreeting');
    const clinicUserInfo = document.getElementById('clinicUserInfo');
    
    const clinicTable = document.getElementById('clinicTable');
    const clinicTableBody = document.getElementById('clinicTableBody');
    const clinicEmpty = document.getElementById('clinicEmpty');
    const refreshBtn = document.getElementById('refreshBtn');
    const consultationModal = document.getElementById('consultationModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const clinicDoxyRoomUrl = document.getElementById('clinicDoxyRoomUrl');
    const clinicDoxyHint = document.getElementById('clinicDoxyHint');
    const clinicOpenDoxyBtn = document.getElementById('clinicOpenDoxyBtn');
    const clinicCopyDoxyBtn = document.getElementById('clinicCopyDoxyBtn');
    const clinicDoxySubtitle = document.getElementById('clinicDoxySubtitle');
    const clinicSidebarUser = document.getElementById('clinicSidebarUser');
    const clinicSidebarToggle = document.getElementById('clinicSidebarToggle');
    const clinicSidebarBackdrop = document.getElementById('clinicSidebarBackdrop');
    const clinicSaveScheduleBtn = document.getElementById('clinicSaveScheduleBtn');
    const clinicAvailHighlightList = document.getElementById('clinicAvailHighlightList');
    const clinicOverrideCalPrev = document.getElementById('clinicOverrideCalPrev');
    const clinicOverrideCalNext = document.getElementById('clinicOverrideCalNext');
    const clinicOverrideCalMonthLabel = document.getElementById('clinicOverrideCalMonthLabel');
    const clinicOverrideCalGrid = document.getElementById('clinicOverrideCalGrid');
    const clinicBulkOverrideStart = document.getElementById('clinicBulkOverrideStart');
    const clinicBulkOverrideEnd = document.getElementById('clinicBulkOverrideEnd');
    const clinicBulkOverrideRemove = document.getElementById('clinicBulkOverrideRemove');
    const clinicBulkOverrideClearSelection = document.getElementById('clinicBulkOverrideClearSelection');
    const clinicBookingsEmpty = document.getElementById('clinicBookingsEmpty');
    const clinicBookingsTable = document.getElementById('clinicBookingsTable');
    const clinicBookingsBody = document.getElementById('clinicBookingsBody');
    const clinicPatientsEmpty = document.getElementById('clinicPatientsEmpty');
    const clinicPatientsTable = document.getElementById('clinicPatientsTable');
    const clinicPatientsBody = document.getElementById('clinicPatientsBody');
    const clinicIbanForm = document.getElementById('clinicIbanForm');
    const clinicIban = document.getElementById('clinicIban');
    const clinicIbanSaveBtn = document.getElementById('clinicIbanSaveBtn');
    const clinicIbanError = document.getElementById('clinicIbanError');
    const clinicPayoutMonths = document.getElementById('clinicPayoutMonths');
    const clinicPayoutError = document.getElementById('clinicPayoutError');
    const clinicPayRange = document.getElementById('clinicPayRange');
    const clinicPayHours = document.getElementById('clinicPayHours');
    const clinicPayPatients = document.getElementById('clinicPayPatients');
    const clinicPayGross = document.getElementById('clinicPayGross');
    const clinicPayEmptyWeek = document.getElementById('clinicPayEmptyWeek');
    const clinicPayIrs = document.getElementById('clinicPayIrs');
    const clinicPaySs = document.getElementById('clinicPaySs');
    const clinicPayNet = document.getElementById('clinicPayNet');
    const clinicProfilePhoto = document.getElementById('clinicProfilePhoto');
    const clinicProfilePhotoPlaceholder = document.getElementById('clinicProfilePhotoPlaceholder');
    const clinicProfilePhotoInput = document.getElementById('clinicProfilePhotoInput');
    const clinicProfilePhotoBtn = document.getElementById('clinicProfilePhotoBtn');
    const clinicPhotoError = document.getElementById('clinicPhotoError');
    const clinicFullName = document.getElementById('clinicFullName');
    const clinicProfileEmail = document.getElementById('clinicProfileEmail');
    const clinicProfileForm = document.getElementById('clinicProfileForm');
    const clinicProfileFormError = document.getElementById('clinicProfileFormError');
    const clinicProfileSaveBtn = document.getElementById('clinicProfileSaveBtn');
    const clinicProfileSaveConfirm = document.getElementById('clinicProfileSaveConfirm');

    const CLINIC_PANEL_META = {
        consultations: { title: 'Consultations', subtitle: 'Clinical notes for consultations assigned to you' },
        availabilities: { title: 'Availabilities', subtitle: 'Your days only — they stay saved on your account' },
        bookings: { title: 'Bookings', subtitle: 'Upcoming appointments assigned to you' },
        patients: { title: 'Patients', subtitle: 'Only people scheduled with you' },
        resources: { title: 'Resources', subtitle: 'Video room and everyday clinic links' },
        management: { title: 'Management', subtitle: 'IBAN, faturas mensais e pagamentos' },
        profile: { title: 'Perfil', subtitle: 'Foto, nome e email desta conta' }
    };

    let clinicRole = 'admin';
    let staffDisplayName = '';
    let clinicDoxyPatientUrl = '';
    let activeClinicPanel = 'consultations';
    let clinicBillingSummary = null;
    let clinicPayPeriod = 'week';
    const CLINIC_PAY_IRS_KEY = 'lonClinicPayIrsPct';
    const CLINIC_PAY_SS_KEY = 'lonClinicPaySsPct';
    let clinicScheduleData = null;
    let clinicSavedDayHours = [];
    let clinicOverrideCalYear = null;
    let clinicOverrideCalMonth = null;
    const clinicSelectedOverrideDates = new Set();
    let clinicScheduleDirty = false;
    let clinicAvailSaveTimer = null;
    let clinicAvailSaveInFlight = false;
    let clinicAvailSaveAttempts = 0;

    // ─── Check Authentication Status ───
    async function checkAuthStatus() {
        try {
            const res = await fetch('/api/clinic/auth-status');
            const data = await res.json();
            
            if (data.authenticated) {
                showClinicPortal(data.displayName || data.username, data.role, data.username);
            } else {
                showLogin();
            }
        } catch (err) {
            console.error('Failed to check auth status:', err);
            showLogin();
        }
    }

    function closeClinicSidebar() {
        if (!clinicContent) return;
        clinicContent.classList.remove('sidebar-open');
        if (clinicSidebarBackdrop) clinicSidebarBackdrop.hidden = true;
    }

    function openClinicSidebar() {
        if (!clinicContent) return;
        clinicContent.classList.add('sidebar-open');
        if (clinicSidebarBackdrop) clinicSidebarBackdrop.hidden = false;
    }

    function setClinicPanel(panelId) {
        if (!CLINIC_PANEL_META[panelId]) panelId = 'consultations';
        activeClinicPanel = panelId;

        document.querySelectorAll('[data-clinic-panel]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-clinic-panel') === panelId);
        });
        document.querySelectorAll('[data-clinic-panel-content]').forEach((el) => {
            const match = el.getAttribute('data-clinic-panel-content') === panelId;
            el.hidden = !match;
            el.classList.toggle('is-active', match);
        });

        const meta = CLINIC_PANEL_META[panelId];
        if (clinicGreeting) clinicGreeting.textContent = meta.title;
        if (clinicUserInfo) clinicUserInfo.textContent = meta.subtitle;
        if (refreshBtn) {
            refreshBtn.style.display = ['consultations', 'bookings', 'patients'].includes(panelId) ? '' : 'none';
        }
        if (clinicSaveScheduleBtn) {
            clinicSaveScheduleBtn.style.display = panelId === 'availabilities' ? '' : 'none';
        }
        closeClinicSidebar();
        if (location.hash !== `#${panelId}`) {
            try { history.replaceState(null, '', `${location.pathname}${location.search}#${panelId}`); } catch (err) { /* ignore */ }
        }

        if (panelId === 'consultations' || panelId === 'bookings' || panelId === 'patients') {
            loadBookings();
        }
        if (panelId === 'availabilities') {
            if (clinicScheduleDirty || clinicAvailSaveInFlight) {
                void saveClinicAvailability({ quiet: true });
            } else {
                loadScheduleView();
            }
        }
        if (panelId === 'resources') loadDoxyRoom();
        if (panelId === 'profile') loadClinicIdentity();
        if (panelId === 'management') {
            loadClinicBillingSummary();
            loadClinicPayouts();
        }
    }

    // ─── Show Login ───
    function showLogin() {
        document.body.classList.remove('clinic-logged-in');
        clinicLogin.style.display = '';
        clinicContent.style.display = 'none';
        closeClinicSidebar();
        if (clinicAdminLink) clinicAdminLink.hidden = true;
        setClinicAuthView('signin');
    }

    // ─── Show Clinic Portal ───
    function showClinicPortal(username, role, loginUsername) {
        clinicLogin.style.display = 'none';
        clinicContent.style.display = 'flex';
        document.body.classList.add('clinic-logged-in');
        clinicRole = role || 'admin';
        staffDisplayName = username || loginUsername || '';
        const isAdmin = clinicRole === 'admin';

        if (clinicSidebarUser) {
            clinicSidebarUser.textContent = staffDisplayName || 'Portal';
        }
        if (clinicAdminLink) clinicAdminLink.hidden = !isAdmin;

        setClinicPanel(initialClinicPanel());
        loadDoxyRoom();
        loadScheduleView();
    }

    function initialClinicPanel() {
        const hash = String(location.hash || '').replace(/^#/, '').toLowerCase();
        if (CLINIC_PANEL_META[hash]) return hash;
        try {
            if (/\/clinic-desk\/perfil\/?$/i.test(location.pathname)) return 'profile';
            const panel = new URLSearchParams(location.search).get('panel');
            if (panel && CLINIC_PANEL_META[panel]) return panel;
        } catch (err) { /* ignore */ }
        return 'consultations';
    }

    async function loadDoxyRoom() {
        if (!clinicDoxyRoomUrl || !clinicOpenDoxyBtn) return;
        try {
            const res = await fetch('/api/clinic/doxy', { cache: 'no-store', credentials: 'same-origin' });
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load Doxy room');
            const data = await res.json();
            clinicDoxyPatientUrl = data.pending ? '' : (data.patientRoomUrl || '');
            clinicOpenDoxyBtn.href = data.providerUrl || 'https://doxy.me';
            if (clinicDoxySubtitle) {
                clinicDoxySubtitle.textContent = data.pending
                    ? 'Your Doxy.me room is pending'
                    : (data.displayName
                        ? `Open Doxy.me to admit patients waiting for ${data.displayName}`
                        : 'Open Doxy.me to admit patients from the waiting room');
            }
            if (clinicDoxyRoomUrl) clinicDoxyRoomUrl.classList.toggle('is-pending', !!data.pending);
            if (data.pending) {
                clinicDoxyRoomUrl.textContent = 'Pending';
                if (clinicDoxyHint) {
                    clinicDoxyHint.textContent = 'Your own patient waiting room is not ready yet. You will get a personal Doxy.me link — the clinic room is only for Dra. Sofia Aguiar.';
                }
                if (clinicCopyDoxyBtn) clinicCopyDoxyBtn.disabled = true;
            } else if (clinicDoxyPatientUrl) {
                clinicDoxyRoomUrl.textContent = clinicDoxyPatientUrl;
                if (clinicDoxyHint) {
                    clinicDoxyHint.textContent = 'This is the link patients receive. Sign in to Doxy.me with your Doxy account (separate from Lon Clinic) to see the waiting room and start the call.';
                }
                if (clinicCopyDoxyBtn) clinicCopyDoxyBtn.disabled = false;
            } else {
                clinicDoxyRoomUrl.textContent = 'Pending';
                if (clinicDoxyRoomUrl) clinicDoxyRoomUrl.classList.add('is-pending');
                if (clinicDoxyHint) {
                    clinicDoxyHint.textContent = 'Your own patient waiting room is not ready yet. You will get a personal Doxy.me link — the clinic room is only for Dra. Sofia Aguiar.';
                }
                if (clinicCopyDoxyBtn) clinicCopyDoxyBtn.disabled = true;
            }
        } catch (err) {
            console.error('Failed to load Doxy room:', err);
            clinicDoxyRoomUrl.textContent = 'Could not load room';
        }
    }

    if (clinicCopyDoxyBtn) {
        clinicCopyDoxyBtn.addEventListener('click', async () => {
            if (!clinicDoxyPatientUrl) return;
            try {
                await navigator.clipboard.writeText(clinicDoxyPatientUrl);
                const prev = clinicCopyDoxyBtn.textContent;
                clinicCopyDoxyBtn.textContent = 'Copied';
                setTimeout(() => {
                    clinicCopyDoxyBtn.textContent = prev;
                }, 1600);
            } catch {
                window.prompt('Copy patient Doxy link', clinicDoxyPatientUrl);
            }
        });
    }

    function formatClinicOverrideDateKey(y, m0, d) {
        return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    function clinicStartOfToday() {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }

    function formatClinicAvailHoursLabel(entry) {
        const start = String(entry && entry.start || '').slice(0, 5);
        const end = String(entry && entry.end || '').slice(0, 5);
        return `${start} – ${end}`;
    }

    function enabledClinicDayHours(list) {
        const today = clinicStartOfToday();
        const todayKey = formatClinicOverrideDateKey(today.getFullYear(), today.getMonth(), today.getDate());
        return (list || [])
            .filter((entry) => entry && entry.enabled !== false && entry.date && entry.date >= todayKey)
            .map((entry) => ({
                date: entry.date,
                enabled: true,
                start: String(entry.start || '07:00').slice(0, 5),
                end: String(entry.end || '17:00').slice(0, 5)
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    function snapshotClinicSavedDays() {
        clinicSavedDayHours = enabledClinicDayHours(clinicScheduleData && clinicScheduleData.dayOverrides);
        renderClinicAvailHighlight();
    }

    function renderClinicAvailHighlight() {
        if (!clinicAvailHighlightList) return;
        const upcoming = clinicSavedDayHours;
        if (!upcoming.length) {
            clinicAvailHighlightList.innerHTML = '<li class="clinic-avail-highlight-empty">No saved days yet. Click days on the calendar — they are saved to your account automatically.</li>';
            return;
        }
        clinicAvailHighlightList.innerHTML = upcoming.map((entry) => {
            const dateObj = new Date(`${entry.date}T12:00:00`);
            const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const dateLabel = dateObj.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const hoursLabel = formatClinicAvailHoursLabel(entry);
            return `<li class="clinic-avail-day-card">
                <span class="clinic-avail-day-weekday">${weekday}</span>
                <span class="clinic-avail-highlight-date">${dateLabel}</span>
                <span class="clinic-avail-highlight-hours">${hoursLabel}</span>
            </li>`;
        }).join('');
    }

    function ensureClinicOverrideCalInitialized() {
        if (clinicOverrideCalYear === null || clinicOverrideCalMonth === null) {
            const t = new Date();
            clinicOverrideCalYear = t.getFullYear();
            clinicOverrideCalMonth = t.getMonth();
        }
    }

    function markClinicScheduleDirty() {
        clinicScheduleDirty = true;
        if (!clinicSaveScheduleBtn) return;
        clinicSaveScheduleBtn.classList.add('admin-save-dirty');
        clinicSaveScheduleBtn.textContent = 'Save availability •';
        queueClinicAvailabilitySave();
    }

    function queueClinicAvailabilitySave() {
        if (clinicAvailSaveTimer) clearTimeout(clinicAvailSaveTimer);
        clinicAvailSaveTimer = setTimeout(() => {
            clinicAvailSaveTimer = null;
            void saveClinicAvailability({ quiet: true });
        }, 500);
    }

    function clinicHoursFromInputs() {
        return {
            enabled: true,
            start: (clinicBulkOverrideStart && clinicBulkOverrideStart.value) || '07:00',
            end: (clinicBulkOverrideEnd && clinicBulkOverrideEnd.value) || '17:00'
        };
    }

    function clinicWeeklyHoursForDate(dateKey) {
        const weekly = (clinicScheduleData && clinicScheduleData.weekly) || {};
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
        if (!m) return null;
        const dateObj = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const key = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
        const row = weekly[key];
        if (!row || !row.enabled) return null;
        return { start: row.start || '09:00', end: row.end || '17:00' };
    }

    function syncClinicBulkInputsToSelection() {
        if (!clinicScheduleData || clinicSelectedOverrideDates.size !== 1) return;
        const [dateStr] = Array.from(clinicSelectedOverrideDates);
        const existing = (clinicScheduleData.dayOverrides || []).find((o) => o.date === dateStr && o.enabled !== false);
        const source = existing || clinicHoursFromInputs();
        if (clinicBulkOverrideStart) clinicBulkOverrideStart.value = source.start || '07:00';
        if (clinicBulkOverrideEnd) clinicBulkOverrideEnd.value = source.end || '17:00';
    }

    function renderClinicOverrideCalendar() {
        if (!clinicOverrideCalGrid || !clinicOverrideCalMonthLabel || !clinicScheduleData) return;
        ensureClinicOverrideCalInitialized();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        clinicOverrideCalMonthLabel.textContent = `${monthNames[clinicOverrideCalMonth]} ${clinicOverrideCalYear}`;
        const firstDay = new Date(clinicOverrideCalYear, clinicOverrideCalMonth, 1).getDay();
        const daysInMonth = new Date(clinicOverrideCalYear, clinicOverrideCalMonth + 1, 0).getDate();
        const startDay = (firstDay + 6) % 7;
        const today0 = clinicStartOfToday();
        clinicOverrideCalGrid.innerHTML = '';
        const overrideMap = new Map(
            (clinicScheduleData.dayOverrides || [])
                .filter((o) => o && o.enabled !== false)
                .map((o) => [o.date, o])
        );
        for (let i = 0; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'admin-override-cal-empty';
            clinicOverrideCalGrid.appendChild(empty);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = formatClinicOverrideDateKey(clinicOverrideCalYear, clinicOverrideCalMonth, d);
            const dateObj = new Date(clinicOverrideCalYear, clinicOverrideCalMonth, d);
            dateObj.setHours(0, 0, 0, 0);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'admin-override-day';
            const num = document.createElement('span');
            num.className = 'admin-override-day-num';
            num.textContent = String(d);
            btn.appendChild(num);
            const ov = overrideMap.get(dateKey);
            const weeklyRow = !ov ? clinicWeeklyHoursForDate(dateKey) : null;
            if (ov) {
                const label = document.createElement('span');
                label.className = 'admin-override-day-hours';
                label.textContent = `${String(ov.start).slice(0, 5)}–${String(ov.end).slice(0, 5)}`;
                btn.appendChild(label);
                btn.classList.add('admin-override-has-rule');
            } else if (weeklyRow) {
                const label = document.createElement('span');
                label.className = 'admin-override-day-hours is-template';
                label.textContent = `${String(weeklyRow.start).slice(0, 5)}–${String(weeklyRow.end).slice(0, 5)}`;
                btn.appendChild(label);
            }
            if (dateObj < today0) {
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => {
                    if (clinicSelectedOverrideDates.has(dateKey)) {
                        clinicSelectedOverrideDates.delete(dateKey);
                    } else {
                        clinicSelectedOverrideDates.add(dateKey);
                        const existing = (clinicScheduleData.dayOverrides || []).find((o) => o.date === dateKey && o.enabled !== false);
                        if (!existing) {
                            applyClinicOverrideToDates([dateKey], { clearSelection: false });
                            syncClinicBulkInputsToSelection();
                            return;
                        }
                    }
                    renderClinicOverrideCalendar();
                    syncClinicBulkInputsToSelection();
                });
            }
            if (clinicSelectedOverrideDates.has(dateKey)) btn.classList.add('admin-override-selected');
            clinicOverrideCalGrid.appendChild(btn);
        }
    }

    function applyClinicOverrideToDates(dates, { clearSelection = true, hours } = {}) {
        if (!clinicScheduleData || !dates || dates.length === 0) return;
        const source = hours || clinicHoursFromInputs();
        const start = source.start || '07:00';
        const end = source.end || '17:00';
        const map = new Map((clinicScheduleData.dayOverrides || []).map((o) => [o.date, { ...o }]));
        for (const dateStr of dates) {
            map.set(dateStr, { date: dateStr, enabled: true, start, end });
        }
        clinicScheduleData.dayOverrides = Array.from(map.values())
            .filter((o) => o && o.enabled !== false)
            .sort((a, b) => a.date.localeCompare(b.date));
        if (clearSelection) clinicSelectedOverrideDates.clear();
        renderClinicOverrideCalendar();
        markClinicScheduleDirty();
    }

    async function loadScheduleView() {
        if (!clinicOverrideCalGrid) return;
        if (clinicScheduleDirty || clinicAvailSaveInFlight) return;
        try {
            const res = await fetch('/api/clinic/schedule', { credentials: 'same-origin' });
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load schedule');
            if (clinicScheduleDirty) return;
            const schedule = await res.json();
            if (clinicScheduleDirty) return;
            clinicScheduleData = {
                slotDuration: schedule.slotDuration || 30,
                weekly: schedule.weekly || {},
                dayOverrides: Array.isArray(schedule.dayOverrides)
                    ? schedule.dayOverrides.filter((o) => o && o.enabled !== false).map((o) => ({ ...o, enabled: true }))
                    : [],
                timezone: schedule.timezone || 'Europe/Lisbon'
            };
            ensureClinicOverrideCalInitialized();
            renderClinicOverrideCalendar();
            snapshotClinicSavedDays();
            clinicScheduleDirty = false;
            if (clinicSaveScheduleBtn) {
                clinicSaveScheduleBtn.classList.remove('admin-save-dirty');
                clinicSaveScheduleBtn.textContent = 'Save availability';
                clinicSaveScheduleBtn.disabled = false;
            }
        } catch (err) {
            console.error('Failed to load schedule view:', err);
            if (clinicScheduleData) return;
            clinicSavedDayHours = [];
            if (clinicAvailHighlightList) {
                clinicAvailHighlightList.innerHTML = '<li class="clinic-avail-highlight-empty">Could not load availability.</li>';
            }
        }
    }

    function clinicDayOverridesPayload() {
        return (clinicScheduleData && clinicScheduleData.dayOverrides || [])
            .filter((o) => o && o.enabled !== false && o.date)
            .map((o) => ({
                date: o.date,
                enabled: true,
                start: String(o.start || '07:00').slice(0, 5),
                end: String(o.end || '17:00').slice(0, 5)
            }));
    }

    async function saveClinicAvailability({ quiet } = {}) {
        if (!clinicScheduleData) return false;
        if (clinicAvailSaveTimer) {
            clearTimeout(clinicAvailSaveTimer);
            clinicAvailSaveTimer = null;
        }
        if (clinicAvailSaveInFlight) {
            clinicAvailSaveQueued = true;
            return false;
        }
        clinicAvailSaveInFlight = true;
        if (clinicSaveScheduleBtn) {
            clinicSaveScheduleBtn.disabled = true;
            clinicSaveScheduleBtn.textContent = 'Saving…';
        }
        const dayOverrides = clinicDayOverridesPayload();
        try {
            const res = await fetch('/api/clinic/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dayOverrides }),
                credentials: 'same-origin'
            });
            if (res.status === 401) {
                clinicAvailSaveQueued = false;
                showLogin();
                return false;
            }
            if (!res.ok) throw new Error('Failed to save');
            const data = await res.json().catch(() => ({}));
            clinicScheduleData.dayOverrides = Array.isArray(data.dayOverrides)
                ? data.dayOverrides.filter((o) => o && o.enabled !== false).map((o) => ({ ...o, enabled: true }))
                : dayOverrides;
            clinicScheduleDirty = false;
            clinicAvailSaveAttempts = 0;
            snapshotClinicSavedDays();
            if (clinicSaveScheduleBtn) {
                clinicSaveScheduleBtn.classList.remove('admin-save-dirty');
                clinicSaveScheduleBtn.textContent = 'Saved';
                setTimeout(() => {
                    if (!clinicScheduleDirty && clinicSaveScheduleBtn) {
                        clinicSaveScheduleBtn.textContent = 'Save availability';
                        clinicSaveScheduleBtn.disabled = false;
                    }
                }, 1600);
            }
            return true;
        } catch (err) {
            console.error('Failed to save availability:', err);
            if (clinicSaveScheduleBtn) {
                clinicSaveScheduleBtn.disabled = false;
                clinicSaveScheduleBtn.textContent = 'Save availability •';
                clinicSaveScheduleBtn.classList.add('admin-save-dirty');
            }
            if (!quiet) {
                alert('Failed to save availability. Please try again.');
            } else if (clinicAvailSaveAttempts < 3) {
                clinicAvailSaveAttempts += 1;
                clinicAvailSaveTimer = setTimeout(() => {
                    clinicAvailSaveTimer = null;
                    void saveClinicAvailability({ quiet: true });
                }, 2000);
            }
            return false;
        } finally {
            clinicAvailSaveInFlight = false;
            if (clinicAvailSaveQueued) {
                clinicAvailSaveQueued = false;
                queueClinicAvailabilitySave();
            }
        }
    }

    function flushClinicAvailabilityBeacon() {
        if (!clinicScheduleDirty || !clinicScheduleData) return;
        try {
            fetch('/api/clinic/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dayOverrides: clinicDayOverridesPayload() }),
                credentials: 'same-origin',
                keepalive: true
            });
            clinicScheduleDirty = false;
        } catch (err) { /* ignore */ }
    }

    if (clinicOverrideCalPrev) {
        clinicOverrideCalPrev.addEventListener('click', () => {
            ensureClinicOverrideCalInitialized();
            clinicOverrideCalMonth -= 1;
            if (clinicOverrideCalMonth < 0) {
                clinicOverrideCalMonth = 11;
                clinicOverrideCalYear -= 1;
            }
            renderClinicOverrideCalendar();
        });
    }
    if (clinicOverrideCalNext) {
        clinicOverrideCalNext.addEventListener('click', () => {
            ensureClinicOverrideCalInitialized();
            clinicOverrideCalMonth += 1;
            if (clinicOverrideCalMonth > 11) {
                clinicOverrideCalMonth = 0;
                clinicOverrideCalYear += 1;
            }
            renderClinicOverrideCalendar();
        });
    }

    [clinicBulkOverrideStart, clinicBulkOverrideEnd].forEach((el) => {
        if (!el) return;
        el.addEventListener('change', () => {
            if (!clinicScheduleData || clinicSelectedOverrideDates.size === 0) return;
            applyClinicOverrideToDates(Array.from(clinicSelectedOverrideDates), { clearSelection: false });
        });
    });
    if (clinicBulkOverrideRemove) {
        clinicBulkOverrideRemove.addEventListener('click', () => {
            if (!clinicScheduleData) return;
            if (clinicSelectedOverrideDates.size === 0) {
                alert('Select days to remove.');
                return;
            }
            clinicScheduleData.dayOverrides = (clinicScheduleData.dayOverrides || []).filter(
                (o) => !clinicSelectedOverrideDates.has(o.date)
            );
            clinicSelectedOverrideDates.clear();
            renderClinicOverrideCalendar();
            markClinicScheduleDirty();
        });
    }
    if (clinicBulkOverrideClearSelection) {
        clinicBulkOverrideClearSelection.addEventListener('click', () => {
            clinicSelectedOverrideDates.clear();
            renderClinicOverrideCalendar();
        });
    }

    if (clinicSaveScheduleBtn) {
        clinicSaveScheduleBtn.addEventListener('click', () => {
            if (!clinicScheduleData) {
                alert('Availability is still loading. Try again.');
                return;
            }
            void saveClinicAvailability();
        });
    }

    window.addEventListener('pagehide', flushClinicAvailabilityBeacon);
    window.addEventListener('beforeunload', (e) => {
        if (!clinicScheduleDirty) return;
        flushClinicAvailabilityBeacon();
        e.preventDefault();
        e.returnValue = '';
    });

    // ─── Login ───
    function hideAuthMessage(el) {
        if (!el) return;
        el.style.display = 'none';
        el.hidden = true;
        el.textContent = '';
    }

    function showAuthError(el, message) {
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
        el.hidden = !message;
    }

    function showAuthOk(message) {
        if (!clinicLoginOk) return;
        if (!message) {
            clinicLoginOk.hidden = true;
            clinicLoginOk.textContent = '';
            return;
        }
        clinicLoginOk.hidden = false;
        clinicLoginOk.textContent = message;
    }

    function setClinicAuthView(view) {
        const mode = view === 'forgot' || view === 'reset' ? view : 'signin';
        if (clinicLoginForm) clinicLoginForm.hidden = mode !== 'signin';
        if (clinicForgotForm) clinicForgotForm.hidden = mode !== 'forgot';
        if (clinicResetForm) clinicResetForm.hidden = mode !== 'reset';
        if (clinicLoginTitle) {
            clinicLoginTitle.textContent = mode === 'signin'
                ? 'Clinic Portal'
                : mode === 'forgot'
                    ? 'Recuperar password'
                    : 'Redefinir password';
        }
        if (clinicLoginDesc) {
            clinicLoginDesc.textContent = mode === 'signin'
                ? `Portal ${document.body.getAttribute('data-clinic-build') || '10set-pw'} — Use o email da sua ficha para entrar.`
                : mode === 'forgot'
                    ? 'Indique o email da ficha. Enviamos um código para definir uma nova password.'
                    : 'Introduza o código enviado por email e escolha uma nova password.';
        }
        if (mode !== 'signin') hideAuthMessage(loginError);
        if (mode !== 'forgot') hideAuthMessage(forgotError);
        if (mode !== 'reset') hideAuthMessage(resetError);
        if (mode === 'forgot' && clinicForgotEmail) {
            const fromLogin = clinicUsername && clinicUsername.value.trim();
            if (!clinicForgotEmail.value && fromLogin) clinicForgotEmail.value = fromLogin;
            clinicForgotEmail.focus();
        }
        if (mode === 'reset' && clinicResetCode) clinicResetCode.focus();
        if (mode === 'signin' && clinicUsername) clinicUsername.focus();
    }

    async function requestPasswordResetCode(email, { fromResend } = {}) {
        const res = await fetch('/api/clinic/password-reset/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || 'Não foi possível enviar o código. Tente novamente.');
        }
        clinicResetEmail = email;
        showAuthOk(data.message || 'Se este email tiver uma conta, enviámos um código. Verifique a caixa de entrada.');
        if (!fromResend) setClinicAuthView('reset');
        return data;
    }

    clinicLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessage(loginError);
        showAuthOk('');
        
        const identifier = clinicUsername.value.trim();
        const password = clinicPassword.value;
        
        if (!identifier || !password) {
            showAuthError(loginError, 'Please enter your email and password');
            return;
        }

        try {
            const res = await fetch('/api/clinic/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ email: identifier, username: identifier, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showClinicPortal(data.displayName || identifier, data.role, data.username || identifier);
                clinicUsername.value = '';
                clinicPassword.value = '';
            } else {
                showAuthError(loginError, data.error || 'Invalid email or password');
            }
        } catch (err) {
            console.error('Login error:', err);
            showAuthError(loginError, 'Failed to connect to server. Please try again.');
        }
    });

    if (clinicForgotLink) {
        clinicForgotLink.addEventListener('click', () => {
            showAuthOk('');
            setClinicAuthView('forgot');
        });
    }
    if (clinicForgotBack) {
        clinicForgotBack.addEventListener('click', () => {
            showAuthOk('');
            setClinicAuthView('signin');
        });
    }
    if (clinicResetBack) {
        clinicResetBack.addEventListener('click', () => {
            showAuthOk('');
            setClinicAuthView('signin');
        });
    }
    if (clinicForgotForm) {
        clinicForgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthMessage(forgotError);
            showAuthOk('');
            const email = clinicForgotEmail ? clinicForgotEmail.value.trim() : '';
            if (!email) {
                showAuthError(forgotError, 'Introduza o email da ficha.');
                return;
            }
            if (clinicForgotSubmit) clinicForgotSubmit.disabled = true;
            try {
                await requestPasswordResetCode(email);
            } catch (err) {
                showAuthError(forgotError, err.message || 'Não foi possível enviar o código. Tente novamente.');
            } finally {
                if (clinicForgotSubmit) clinicForgotSubmit.disabled = false;
            }
        });
    }
    if (clinicResetResend) {
        clinicResetResend.addEventListener('click', async () => {
            hideAuthMessage(resetError);
            const email = clinicResetEmail || (clinicForgotEmail && clinicForgotEmail.value.trim()) || '';
            if (!email) {
                setClinicAuthView('forgot');
                return;
            }
            clinicResetResend.disabled = true;
            try {
                await requestPasswordResetCode(email, { fromResend: true });
            } catch (err) {
                showAuthError(resetError, err.message || 'Não foi possível enviar o código. Tente novamente.');
            } finally {
                clinicResetResend.disabled = false;
            }
        });
    }
    if (clinicResetCode) {
        clinicResetCode.addEventListener('input', () => {
            clinicResetCode.value = clinicResetCode.value.replace(/\D/g, '').slice(0, 6);
        });
    }
    if (clinicResetForm) {
        clinicResetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthMessage(resetError);
            const email = clinicResetEmail || (clinicForgotEmail && clinicForgotEmail.value.trim()) || '';
            const code = clinicResetCode ? clinicResetCode.value.replace(/\D/g, '') : '';
            const password = clinicResetPassword ? clinicResetPassword.value : '';
            const password2 = clinicResetPassword2 ? clinicResetPassword2.value : '';
            if (!email || code.length !== 6) {
                showAuthError(resetError, 'Introduza o código de 6 dígitos enviado por email.');
                return;
            }
            if (password.length < 8) {
                showAuthError(resetError, 'A nova password deve ter pelo menos 8 caracteres.');
                return;
            }
            if (password !== password2) {
                showAuthError(resetError, 'As passwords não coincidem.');
                return;
            }
            if (clinicResetSubmit) clinicResetSubmit.disabled = true;
            try {
                const res = await fetch('/api/clinic/password-reset/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email, code, password })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    showAuthError(resetError, data.error || 'Código inválido ou expirado.');
                    return;
                }
                if (clinicResetPassword) clinicResetPassword.value = '';
                if (clinicResetPassword2) clinicResetPassword2.value = '';
                if (clinicResetCode) clinicResetCode.value = '';
                if (clinicUsername && email) clinicUsername.value = email;
                if (clinicPassword) clinicPassword.value = '';
                setClinicAuthView('signin');
                showAuthOk(data.message || 'Password atualizada. Entre com o email e a nova password.');
            } catch (err) {
                showAuthError(resetError, 'Failed to connect to server. Please try again.');
            } finally {
                if (clinicResetSubmit) clinicResetSubmit.disabled = false;
            }
        });
    }

    // ─── Logout ───
    clinicLogoutBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/clinic/logout', {
                method: 'POST'
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                showLogin();
            } else {
                console.error('Logout error:', data);
            }
        } catch (err) {
            console.error('Logout error:', err);
            // Still show login even if logout request fails
            showLogin();
        }
    });

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function patientIntakeBlock(booking) {
        const intake = booking.patientIntake || booking.intake;
        if (intake && (intake.concerns || intake.dob || intake.allergies || intake.medications)) {
            const row = (label, value) => value
                ? `<div class="clinic-detail-item"><span class="clinic-detail-label">${escapeHtml(label)}</span><span class="clinic-detail-value">${escapeHtml(value)}</span></div>`
                : '';
            return `
                <div class="clinic-booking-details">
                    <h3 class="clinic-section-title">Patient intake</h3>
                    <div class="clinic-details-grid">
                        ${row('Date of birth', intake.dob)}
                        ${row('Country', intake.country)}
                        ${row('Symptoms / reason', intake.concerns)}
                        ${row('Medications', intake.medications)}
                        ${row('Allergies', intake.allergies)}
                        ${row('NHS / SNS', intake.nhs)}
                    </div>
                </div>`;
        }
        return `
            <div class="clinic-booking-details">
                <h3 class="clinic-section-title">Patient intake</h3>
                <p style="color: var(--text-muted); margin: 0;">Clinical form not submitted yet.</p>
            </div>`;
    }

    function formatClinicPayHours(hours) {
        const n = Number(hours) || 0;
        if (Math.abs(n - Math.round(n)) < 0.05) return `${Math.round(n)}h`;
        return `${n.toFixed(1).replace('.', ',')}h`;
    }

    function formatClinicPayEuro(cents) {
        const n = (Number(cents) || 0) / 100;
        const formatted = n.toLocaleString('pt-PT', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
        return `${formatted} €`;
    }

    function parseClinicPayPct(el) {
        if (!el) return null;
        const raw = String(el.value || '').trim().replace(',', '.');
        if (!raw) return null;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return null;
        return n;
    }

    function updateClinicPayNet() {
        if (!clinicPayNet || !clinicBillingSummary) return;
        const period = clinicBillingSummary[clinicPayPeriod] || clinicBillingSummary.week;
        const gross = Number(period && period.paidCents) || 0;
        const irs = parseClinicPayPct(clinicPayIrs);
        const ss = parseClinicPayPct(clinicPaySs);
        if (irs == null && ss == null) {
            clinicPayNet.hidden = true;
            return;
        }
        const irsAmt = Math.round(gross * ((irs || 0) / 100));
        const ssAmt = Math.round(gross * ((ss || 0) / 100));
        const net = Math.max(0, gross - irsAmt - ssAmt);
        clinicPayNet.hidden = false;
        clinicPayNet.textContent = `Líquido estimado: ${formatClinicPayEuro(net)}`;
    }

    function renderClinicPayCard() {
        if (!clinicBillingSummary) return;
        const period = clinicBillingSummary[clinicPayPeriod] || clinicBillingSummary.week || {};
        if (clinicPayRange) clinicPayRange.textContent = period.rangeLabel || '—';
        if (clinicPayHours) clinicPayHours.textContent = formatClinicPayHours(period.hours);
        if (clinicPayPatients) clinicPayPatients.textContent = String(period.patients || 0);
        if (clinicPayGross) clinicPayGross.textContent = formatClinicPayEuro(period.paidCents);
        if (clinicPayEmptyWeek) {
            const week = clinicBillingSummary.week || {};
            clinicPayEmptyWeek.hidden = (Number(week.consultations) || 0) > 0;
        }
        document.querySelectorAll('[data-pay-period]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-pay-period') === clinicPayPeriod);
        });
        updateClinicPayNet();
    }

    async function loadClinicBillingSummary() {
        if (!clinicPayGross) return;
        try {
            const res = await fetch('/api/clinic/billing-summary');
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load billing summary');
            clinicBillingSummary = await res.json();
            renderClinicPayCard();
        } catch (err) {
            console.error('Failed to load billing summary:', err);
            if (clinicPayHours) clinicPayHours.textContent = '—';
            if (clinicPayPatients) clinicPayPatients.textContent = '—';
            if (clinicPayGross) clinicPayGross.textContent = '—';
        }
    }

    document.querySelectorAll('[data-pay-period]').forEach((btn) => {
        btn.addEventListener('click', () => {
            clinicPayPeriod = btn.getAttribute('data-pay-period') === 'month' ? 'month' : 'week';
            renderClinicPayCard();
        });
    });

    try {
        const savedIrs = localStorage.getItem(CLINIC_PAY_IRS_KEY);
        const savedSs = localStorage.getItem(CLINIC_PAY_SS_KEY);
        if (clinicPayIrs && savedIrs != null) clinicPayIrs.value = savedIrs;
        if (clinicPaySs && savedSs != null) clinicPaySs.value = savedSs;
    } catch (e) { /* ignore */ }

    [clinicPayIrs, clinicPaySs].forEach((el) => {
        if (!el) return;
        el.addEventListener('input', () => {
            try {
                if (el === clinicPayIrs) localStorage.setItem(CLINIC_PAY_IRS_KEY, el.value);
                if (el === clinicPaySs) localStorage.setItem(CLINIC_PAY_SS_KEY, el.value);
            } catch (e) { /* ignore */ }
            updateClinicPayNet();
        });
    });

    function renderClinicPayouts(data) {
        if (clinicIban && data && data.iban != null) {
            clinicIban.value = data.iban;
        }
        if (!clinicPayoutMonths) return;
        const months = (data && data.months) || [];
        if (!months.length) {
            clinicPayoutMonths.innerHTML = '<p class="admin-empty-list">No months yet.</p>';
            return;
        }
        clinicPayoutMonths.innerHTML = months.map((m) => {
            const month = escapeHtml(m.month || '');
            const line = escapeHtml(m.lineLabel || m.label || m.month || '');
            const faturaOn = m.hasInvoice ? ' is-on' : '';
            const paidOn = m.paymentSent ? ' is-on' : '';
            const faturaText = m.hasInvoice
                ? `Fatura uploaded${m.invoiceName ? ` (${escapeHtml(m.invoiceName)})` : ''}`
                : 'Fatura uploaded';
            const download = m.hasInvoice
                ? `<a class="btn btn-outline btn-sm" href="/api/clinic/payouts/${month}/invoice">Download fatura</a>`
                : '';
            return `<details class="clinic-payout-item">
                <summary>${line}</summary>
                <div class="clinic-payout-body">
                    <label class="btn btn-outline btn-sm">
                        ${m.hasInvoice ? 'Replace fatura' : 'Upload fatura'}
                        <input type="file" class="clinic-payout-file" data-payout-month="${month}" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp" hidden>
                    </label>
                    ${download}
                    <div class="clinic-payout-checks">
                        <p class="clinic-payout-check${faturaOn}">${faturaText}</p>
                        <p class="clinic-payout-check${paidOn}">Payment sent</p>
                    </div>
                </div>
            </details>`;
        }).join('');
    }

    async function loadClinicPayouts() {
        if (!clinicPayoutMonths && !clinicIban) return;
        if (clinicPayoutError) clinicPayoutError.style.display = 'none';
        try {
            const res = await fetch('/api/clinic/payouts');
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load payouts');
            renderClinicPayouts(await res.json());
        } catch (err) {
            console.error('Failed to load payouts:', err);
            if (clinicPayoutMonths) {
                clinicPayoutMonths.innerHTML = '<p class="admin-empty-list">Could not load monthly payouts.</p>';
            }
        }
    }

    if (clinicIbanForm) {
        clinicIbanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (clinicIbanError) clinicIbanError.style.display = 'none';
            if (clinicIbanSaveBtn) clinicIbanSaveBtn.disabled = true;
            try {
                const res = await fetch('/api/clinic/payouts/iban', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ iban: clinicIban ? clinicIban.value : '' })
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) throw new Error(data.error || 'Failed to save IBAN');
                if (clinicIban && data.iban != null) clinicIban.value = data.iban;
                const prev = clinicIbanSaveBtn ? clinicIbanSaveBtn.textContent : '';
                if (clinicIbanSaveBtn) clinicIbanSaveBtn.textContent = 'Saved';
                setTimeout(() => {
                    if (clinicIbanSaveBtn) clinicIbanSaveBtn.textContent = prev || 'Save IBAN';
                }, 1600);
            } catch (err) {
                showProfileError(clinicIbanError, err.message || 'Failed to save IBAN');
            } finally {
                if (clinicIbanSaveBtn) clinicIbanSaveBtn.disabled = false;
            }
        });
    }

    if (clinicPayoutMonths) {
        clinicPayoutMonths.addEventListener('change', async (e) => {
            const input = e.target.closest('.clinic-payout-file');
            if (!input) return;
            const month = input.getAttribute('data-payout-month');
            const file = input.files && input.files[0];
            if (!month || !file) return;
            if (clinicPayoutError) clinicPayoutError.style.display = 'none';
            const form = new FormData();
            form.append('file', file);
            try {
                const res = await fetch(`/api/clinic/payouts/${encodeURIComponent(month)}/invoice`, {
                    method: 'POST',
                    body: form
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) throw new Error(data.error || 'Failed to upload fatura');
                await loadClinicPayouts();
            } catch (err) {
                showProfileError(clinicPayoutError, err.message || 'Failed to upload fatura');
            } finally {
                input.value = '';
            }
        });
    }

    async function loadBookings() {
        try {
            const res = await fetch('/api/clinic/bookings');
            
            if (res.status === 401) {
                showLogin();
                return;
            }
            
            if (!res.ok) {
                throw new Error('Failed to load bookings');
            }
            
            const data = await res.json();
            bookingsCache = Array.isArray(data.bookings) ? data.bookings : [];
            renderBookings(bookingsCache);
            renderUpcomingBookings(bookingsCache);
            renderPatients(bookingsCache);
        } catch (err) {
            console.error('Failed to load bookings:', err);
            bookingsCache = [];
            renderBookings([]);
            renderUpcomingBookings([]);
            renderPatients([]);
        }
    }

    function renderBookings(bookings) {
        if (!clinicTableBody) return;
        clinicTableBody.innerHTML = '';
        if (!bookings.length) {
            clinicEmpty.style.display = '';
            clinicTable.style.display = 'none';
            return;
        }
        clinicEmpty.style.display = 'none';
        clinicTable.style.display = 'table';

        const now = new Date();

        bookings.forEach(booking => {
            const row = document.createElement('tr');
            const serviceLabel = SERVICE_LABELS[booking.service] || booking.service;
            const status = getStatus(booking, now);
            const hasNotes = booking.hasClinicalNotes;
            const ref = booking.bookingRef || '';

            row.innerHTML = `
                <td class="ref-cell">${escapeHtml(ref || '—')}</td>
                <td class="service-cell">${escapeHtml(serviceLabel)}</td>
                <td>${escapeHtml(booking.date || '—')}${booking.time ? ' · ' + escapeHtml(booking.time) : ''}</td>
                <td>${escapeHtml(booking.patientName || '—')}${booking.travellerCount > 1 ? ` +${booking.travellerCount - 1}` : ''}</td>
                <td>${escapeHtml(booking.email || '—')}</td>
                <td><span class="dash-status ${status}">${status}</span></td>
                <td>
                    ${hasNotes 
                        ? '<span style="color: var(--accent); font-weight: 600;">✓ Notes</span>'
                        : '<span style="color: var(--text-muted);">No notes</span>'
                    }
                    ${booking.hasPatientIntake
                        ? '<br><span style="color: var(--accent); font-size: 0.85em;">Ficha ok</span>'
                        : '<br><span style="color: var(--text-muted); font-size: 0.85em;">Ficha pendente</span>'
                    }
                </td>
                <td>
                    <button class="btn btn-outline btn-sm view-consultation-btn" data-booking-ref="${escapeHtml(ref)}">
                        View & Edit
                    </button>
                </td>
            `;

            const viewBtn = row.querySelector('.view-consultation-btn');
            viewBtn.addEventListener('click', () => showConsultationModal(ref));

            clinicTableBody.appendChild(row);
        });
    }

    function renderUpcomingBookings(bookings) {
        if (!clinicBookingsBody) return;
        const now = new Date();
        const upcoming = bookings.filter((b) => !b.cancelled && getStatus(b, now) === 'upcoming');
        clinicBookingsBody.innerHTML = '';
        if (!upcoming.length) {
            clinicBookingsEmpty.style.display = '';
            clinicBookingsTable.style.display = 'none';
            return;
        }
        clinicBookingsEmpty.style.display = 'none';
        clinicBookingsTable.style.display = 'table';
        upcoming.forEach((booking) => {
            const row = document.createElement('tr');
            const ref = booking.bookingRef || '';
            const serviceLabel = SERVICE_LABELS[booking.service] || booking.service;
            row.innerHTML = `
                <td>${escapeHtml(booking.date || '—')}${booking.time ? ' · ' + escapeHtml(booking.time) : ''}</td>
                <td>${escapeHtml(booking.patientName || '—')}</td>
                <td>${escapeHtml(serviceLabel)}</td>
                <td class="ref-cell">${escapeHtml(ref || '—')}</td>
                <td>
                    <button class="btn btn-outline btn-sm view-consultation-btn" data-booking-ref="${escapeHtml(ref)}">Open</button>
                </td>
            `;
            row.querySelector('.view-consultation-btn').addEventListener('click', () => showConsultationModal(ref));
            clinicBookingsBody.appendChild(row);
        });
    }

    function renderPatients(bookings) {
        if (!clinicPatientsBody) return;
        const groups = new Map();
        bookings.forEach((b) => {
            if (b.cancelled) return;
            const key = String(b.email || '').trim().toLowerCase() || String(b.patientName || '').trim().toLowerCase() || b.bookingRef;
            if (!key) return;
            if (!groups.has(key)) {
                groups.set(key, {
                    name: b.patientName || '—',
                    email: b.email || '',
                    visits: []
                });
            }
            groups.get(key).visits.push(b);
        });
        const patients = [...groups.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
        clinicPatientsBody.innerHTML = '';
        if (!patients.length) {
            clinicPatientsEmpty.style.display = '';
            clinicPatientsTable.style.display = 'none';
            return;
        }
        clinicPatientsEmpty.style.display = 'none';
        clinicPatientsTable.style.display = 'table';
        const now = new Date();
        patients.forEach((patient) => {
            const visits = [...patient.visits].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
            const latest = visits[0];
            const latestRef = latest && latest.bookingRef ? latest.bookingRef : '';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(patient.name)}</td>
                <td>${escapeHtml(patient.email || '—')}</td>
                <td>${visits.length}</td>
                <td>${escapeHtml(latest.date || '—')}${latest.time ? ' · ' + escapeHtml(latest.time) : ''} · ${escapeHtml(getStatus(latest, now))}</td>
                <td>
                    ${latestRef ? `<button class="btn btn-outline btn-sm view-consultation-btn" data-booking-ref="${escapeHtml(latestRef)}">Latest visit</button>` : ''}
                </td>
            `;
            const btn = row.querySelector('.view-consultation-btn');
            if (btn) btn.addEventListener('click', () => showConsultationModal(latestRef));
            clinicPatientsBody.appendChild(row);
        });
    }

    // ─── Get Status ───
    function getStatus(booking, now) {
        if (!booking.date) return 'upcoming';
        try {
            const parsed = new Date(booking.date);
            if (isNaN(parsed.getTime())) return 'upcoming';
            const endOfDay = new Date(parsed);
            endOfDay.setHours(23, 59, 59, 999);
            if (endOfDay < now) return 'completed';
            return 'upcoming';
        } catch {
            return 'upcoming';
        }
    }

    // ─── Show Consultation Modal ───
    async function showConsultationModal(bookingRef) {
        try {
            const res = await fetch(`/api/clinic/booking/${bookingRef}`);
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) {
                alert('This consultation is not assigned to you.');
                return;
            }
            const booking = await res.json();

            modalTitle.textContent = `Consultation: ${booking.bookingRef}`;
            
            const serviceLabel = SERVICE_LABELS[booking.service] || booking.service;
            const notes = booking.clinicalNotes;

            modalBody.innerHTML = `
                <div class="clinic-booking-details">
                    <h3 class="clinic-section-title">Booking Information</h3>
                    <div class="clinic-details-grid">
                        <div class="clinic-detail-item">
                            <span class="clinic-detail-label">Service</span>
                            <span class="clinic-detail-value">${serviceLabel}</span>
                        </div>
                        <div class="clinic-detail-item">
                            <span class="clinic-detail-label">Date & Time</span>
                            <span class="clinic-detail-value">${booking.date || '—'} at ${booking.time || '—'}</span>
                        </div>
                        <div class="clinic-detail-item">
                            <span class="clinic-detail-label">Patient</span>
                            <span class="clinic-detail-value">${booking.patientName || '—'}</span>
                        </div>
                        <div class="clinic-detail-item">
                            <span class="clinic-detail-label">Email</span>
                            <span class="clinic-detail-value">${booking.email || '—'}</span>
                        </div>
                        ${booking.travellerCount > 1 ? `
                        <div class="clinic-detail-item">
                            <span class="clinic-detail-label">Travellers</span>
                            <span class="clinic-detail-value">${booking.travellerCount}</span>
                        </div>
                        ` : ''}
                        <div class="clinic-detail-item">
                            <span class="clinic-detail-label">Amount Paid</span>
                            <span class="clinic-detail-value">€${(booking.amount / 100).toFixed(0)}</span>
                        </div>
                    </div>
                </div>

                ${patientIntakeBlock(booking)}

                <div class="clinic-notes-section">
                    <h3 class="clinic-section-title">Clinical Notes</h3>
                    <form id="clinicalNotesForm" class="clinic-notes-form">
                        <div class="clinic-form-group">
                            <label for="consultationDate">Consultation Date</label>
                            <input type="date" id="consultationDate" value="${notes ? notes.consultationDate || booking.date : booking.date}" required>
                        </div>
                        <div class="clinic-form-group">
                            <label for="clinicalNotes">Clinical Notes</label>
                            <textarea id="clinicalNotes" rows="6" placeholder="Enter consultation notes, observations, and findings...">${notes ? notes.notes || '' : ''}</textarea>
                        </div>
                        <div class="clinic-form-group">
                            <label for="diagnosis">Diagnosis</label>
                            <textarea id="diagnosis" rows="3" placeholder="Enter diagnosis or assessment...">${notes ? notes.diagnosis || '' : ''}</textarea>
                        </div>
                        <div class="clinic-form-group">
                            <label for="prescriptions">Prescriptions & Recommendations</label>
                            <textarea id="prescriptions" rows="3" placeholder="Enter prescriptions, medications, or recommendations...">${notes ? notes.prescriptions || '' : ''}</textarea>
                        </div>
                        <div class="clinic-form-group">
                            <label for="followUp">Follow-Up Plan</label>
                            <textarea id="followUp" rows="3" placeholder="Enter follow-up instructions or next steps...">${notes ? notes.followUp || '' : ''}</textarea>
                        </div>
                        <div class="clinic-form-group">
                            <label for="createdBy">Recorded By</label>
                            <input type="text" id="createdBy" value="${notes ? notes.createdBy || 'Doctor' : 'Doctor'}" placeholder="Doctor name">
                        </div>
                        ${notes ? `
                        <div class="clinic-notes-meta">
                            <p><strong>Created:</strong> ${new Date(notes.createdAt).toLocaleString()}</p>
                            <p><strong>Last Updated:</strong> ${new Date(notes.updatedAt).toLocaleString()}</p>
                        </div>
                        ` : ''}
                        <div class="clinic-form-actions">
                            <button type="button" class="btn btn-outline" id="cancelNotesBtn">Cancel</button>
                            ${notes ? `<button type="button" class="btn btn-outline" id="exportPdfBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                Export PDF
                            </button>` : ''}
                            <button type="submit" class="btn btn-primary">Save Clinical Notes</button>
                        </div>
                    </form>
                </div>
            `;

            // Add form handler
            const form = document.getElementById('clinicalNotesForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveClinicalNotes(bookingRef);
            });

            // Cancel button
            const cancelBtn = document.getElementById('cancelNotesBtn');
            cancelBtn.addEventListener('click', () => {
                consultationModal.style.display = 'none';
            });

            // Export PDF button
            const exportPdfBtn = document.getElementById('exportPdfBtn');
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', () => {
                    exportClinicalNotesToPDF(booking, notes);
                });
            }

            consultationModal.style.display = 'flex';
        } catch (err) {
            console.error('Failed to load consultation:', err);
            alert('Failed to load consultation details. Please try again.');
        }
    }

    // ─── Save Clinical Notes ───
    async function saveClinicalNotes(bookingRef) {
        const consultationDate = document.getElementById('consultationDate').value;
        const notes = document.getElementById('clinicalNotes').value;
        const diagnosis = document.getElementById('diagnosis').value;
        const prescriptions = document.getElementById('prescriptions').value;
        const followUp = document.getElementById('followUp').value;
        const createdBy = document.getElementById('createdBy').value || 'Doctor';

        try {
            const res = await fetch('/api/clinic/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingRef,
                    consultationDate,
                    notes,
                    diagnosis,
                    prescriptions,
                    followUp,
                    createdBy
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert('Clinical notes saved successfully!');
                consultationModal.style.display = 'none';
                loadBookings(); // Refresh the table
            } else {
                throw new Error(data.error || 'Failed to save notes');
            }
        } catch (err) {
            console.error('Failed to save clinical notes:', err);
            alert('Failed to save clinical notes. Please try again.');
        }
    }

    function showProfileError(el, message) {
        if (!el) return;
        el.textContent = message;
        el.style.display = 'block';
    }

    function hideProfileError(el) {
        if (!el) return;
        el.textContent = '';
        el.style.display = 'none';
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

    function isValidClinicEmail(raw) {
        const email = String(raw || '').trim().toLowerCase();
        return email.length >= 5 && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setClinicProfilePhoto(hasPhoto) {
        if (clinicProfilePhoto) {
            if (hasPhoto) {
                clinicProfilePhoto.src = `/api/clinic/profile/photo?t=${Date.now()}`;
                clinicProfilePhoto.hidden = false;
            } else {
                clinicProfilePhoto.removeAttribute('src');
                clinicProfilePhoto.hidden = true;
            }
        }
        if (clinicProfilePhotoPlaceholder) clinicProfilePhotoPlaceholder.hidden = !!hasPhoto;
        if (clinicProfilePhotoBtn) clinicProfilePhotoBtn.textContent = hasPhoto ? 'Substituir foto' : 'Adicionar foto';
    }

    async function loadClinicIdentity() {
        if (!clinicProfileForm) return;
        hideProfileError(clinicProfileFormError);
        hideProfileError(clinicPhotoError);
        try {
            const res = await fetch('/api/clinic/me', { cache: 'no-store', credentials: 'same-origin' });
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load profile');
            const data = await res.json();
            if (clinicFullName) clinicFullName.value = data.fullName || '';
            if (clinicProfileEmail) clinicProfileEmail.value = data.email || '';
            setClinicProfilePhoto(!!data.hasPhoto);
            if (data.fullName && clinicSidebarUser) clinicSidebarUser.textContent = data.fullName;
        } catch (err) {
            console.error('Failed to load clinic identity:', err);
            showProfileError(clinicProfileFormError, 'Não foi possível carregar o perfil.');
        }
    }

    // ─── Event Listeners ───
    if (refreshBtn) refreshBtn.addEventListener('click', loadBookings);
    document.querySelectorAll('[data-clinic-panel]').forEach((btn) => {
        btn.addEventListener('click', () => {
            setClinicPanel(btn.getAttribute('data-clinic-panel'));
        });
    });
    if (clinicSidebarToggle) {
        clinicSidebarToggle.addEventListener('click', () => {
            if (clinicContent.classList.contains('sidebar-open')) closeClinicSidebar();
            else openClinicSidebar();
        });
    }
    if (clinicSidebarBackdrop) {
        clinicSidebarBackdrop.addEventListener('click', closeClinicSidebar);
    }
    if (clinicProfileForm) {
        clinicProfileForm.addEventListener('input', () => hideProfileSavedConfirm(clinicProfileSaveConfirm));
        clinicProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideProfileError(clinicProfileFormError);
            hideProfileSavedConfirm(clinicProfileSaveConfirm);
            const fullName = String(clinicFullName && clinicFullName.value ? clinicFullName.value : '').trim();
            const email = String(clinicProfileEmail && clinicProfileEmail.value ? clinicProfileEmail.value : '').trim();
            if (!fullName) {
                showProfileError(clinicProfileFormError, 'Introduza o nome.');
                if (clinicFullName) clinicFullName.focus();
                return;
            }
            if (clinicRole !== 'admin' && !email) {
                showProfileError(clinicProfileFormError, 'Introduza o email.');
                if (clinicProfileEmail) clinicProfileEmail.focus();
                return;
            }
            if (email && !isValidClinicEmail(email)) {
                showProfileError(
                    clinicProfileFormError,
                    'Introduza um email completo, por exemplo nome@gmail.com.'
                );
                if (clinicProfileEmail) clinicProfileEmail.focus();
                return;
            }
            if (clinicProfileSaveBtn) clinicProfileSaveBtn.disabled = true;
            try {
                const res = await fetch('/api/clinic/me', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ fullName, email })
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) throw new Error(data.error || 'Failed to save profile');
                staffDisplayName = data.fullName || fullName;
                if (clinicSidebarUser) clinicSidebarUser.textContent = staffDisplayName || 'Portal';
                if (clinicFullName) clinicFullName.value = data.fullName || fullName;
                if (clinicProfileEmail) clinicProfileEmail.value = data.email || email;
                showProfileSavedConfirm(clinicProfileSaveConfirm);
            } catch (err) {
                showProfileError(clinicProfileFormError, err.message || 'Failed to save profile');
            } finally {
                if (clinicProfileSaveBtn) clinicProfileSaveBtn.disabled = false;
            }
        });
    }
    if (clinicProfilePhotoInput) {
        clinicProfilePhotoInput.addEventListener('change', async () => {
            hideProfileError(clinicPhotoError);
            const file = clinicProfilePhotoInput.files && clinicProfilePhotoInput.files[0];
            if (!file) return;
            const form = new FormData();
            form.append('photo', file);
            try {
                const res = await fetch('/api/clinic/profile/photo', {
                    method: 'POST',
                    body: form,
                    credentials: 'same-origin'
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
                setClinicProfilePhoto(true);
            } catch (err) {
                showProfileError(clinicPhotoError, err.message || 'Failed to upload photo');
            } finally {
                clinicProfilePhotoInput.value = '';
            }
        });
    }
    modalOverlay.addEventListener('click', () => {
        consultationModal.style.display = 'none';
    });
    modalClose.addEventListener('click', () => {
        consultationModal.style.display = 'none';
    });

    // ─── Export Clinical Notes to PDF ───
    function exportClinicalNotesToPDF(booking, notes) {
        if (typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please refresh the page and try again.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const SERVICE_LABELS = {
            longevity: 'Longevity Assessment',
            travel: 'Travel Medicine Consultation',
            followup: 'Follow-Up Consultation',
            entrevista: 'Entrevista de emprego'
        };

        const serviceLabel = SERVICE_LABELS[booking.service] || booking.service;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPos = margin;

        // Header
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Clinical Consultation Record', margin, yPos);
        yPos += 10;

        // Booking Information
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Booking Information', margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Booking Reference: ${booking.bookingRef}`, margin, yPos);
        yPos += 6;
        doc.text(`Service: ${serviceLabel}`, margin, yPos);
        yPos += 6;
        doc.text(`Date & Time: ${booking.date || '—'} at ${booking.time || '—'}`, margin, yPos);
        yPos += 6;
        doc.text(`Patient: ${booking.patientName || '—'}`, margin, yPos);
        yPos += 6;
        doc.text(`Email: ${booking.email || '—'}`, margin, yPos);
        yPos += 6;
        if (booking.travellerCount > 1) {
            doc.text(`Number of Travellers: ${booking.travellerCount}`, margin, yPos);
            yPos += 6;
        }
        yPos += 5;

        // Clinical Notes
        if (notes) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Clinical Notes', margin, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            // Consultation Date
            if (notes.consultationDate) {
                doc.setFont(undefined, 'bold');
                doc.text('Consultation Date:', margin, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(notes.consultationDate, margin + 50, yPos);
                yPos += 8;
            }

            // Clinical Notes
            if (notes.notes) {
                doc.setFont(undefined, 'bold');
                doc.text('Notes:', margin, yPos);
                yPos += 6;
                doc.setFont(undefined, 'normal');
                const notesLines = doc.splitTextToSize(notes.notes, pageWidth - 2 * margin);
                doc.text(notesLines, margin, yPos);
                yPos += notesLines.length * 5 + 5;
            }

            // Diagnosis
            if (notes.diagnosis) {
                doc.setFont(undefined, 'bold');
                doc.text('Diagnosis:', margin, yPos);
                yPos += 6;
                doc.setFont(undefined, 'normal');
                const diagnosisLines = doc.splitTextToSize(notes.diagnosis, pageWidth - 2 * margin);
                doc.text(diagnosisLines, margin, yPos);
                yPos += diagnosisLines.length * 5 + 5;
            }

            // Prescriptions
            if (notes.prescriptions) {
                doc.setFont(undefined, 'bold');
                doc.text('Prescriptions & Recommendations:', margin, yPos);
                yPos += 6;
                doc.setFont(undefined, 'normal');
                const prescriptionLines = doc.splitTextToSize(notes.prescriptions, pageWidth - 2 * margin);
                doc.text(prescriptionLines, margin, yPos);
                yPos += prescriptionLines.length * 5 + 5;
            }

            // Follow-Up
            if (notes.followUp) {
                doc.setFont(undefined, 'bold');
                doc.text('Follow-Up Plan:', margin, yPos);
                yPos += 6;
                doc.setFont(undefined, 'normal');
                const followUpLines = doc.splitTextToSize(notes.followUp, pageWidth - 2 * margin);
                doc.text(followUpLines, margin, yPos);
                yPos += followUpLines.length * 5 + 5;
            }

            // Metadata
            yPos += 5;
            doc.setFontSize(8);
            doc.setFont(undefined, 'italic');
            doc.text(`Recorded by: ${notes.createdBy || 'Doctor'}`, margin, yPos);
            yPos += 4;
            doc.text(`Created: ${new Date(notes.createdAt).toLocaleString()}`, margin, yPos);
            yPos += 4;
            doc.text(`Last Updated: ${new Date(notes.updatedAt).toLocaleString()}`, margin, yPos);
        } else {
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.text('No clinical notes recorded yet.', margin, yPos);
        }

        // Footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('Atividade registada na Entidade Reguladora da Saúde', margin, pageHeight - 15);
        doc.text('© 2026 Longevity Clinic. Confidential medical record.', margin, pageHeight - 10);

        // Save PDF
        const fileName = `Clinical_Notes_${booking.bookingRef}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }

    // ─── Initial Load ───
    checkAuthStatus();
});
