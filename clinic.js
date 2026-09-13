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
    const clinicOtp = document.getElementById('clinicOtp');
    const clinicOtpGroup = document.getElementById('clinicOtpGroup');
    const clinicLoginSubmit = document.getElementById('clinicLoginSubmit');
    const clinicOtpBack = document.getElementById('clinicOtpBack');
    const clinicOtpBackWrap = document.getElementById('clinicOtpBackWrap');
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
    const clinicTotpForm = document.getElementById('clinicTotpForm');
    const clinicTotpCode = document.getElementById('clinicTotpCode');
    const totpError = document.getElementById('totpError');
    const clinicTotpRecoverLink = document.getElementById('clinicTotpRecoverLink');
    const clinicTotpBack = document.getElementById('clinicTotpBack');
    const clinicTotpSetupForm = document.getElementById('clinicTotpSetupForm');
    const clinicTotpSecret = document.getElementById('clinicTotpSecret');
    const clinicTotpOtpauth = document.getElementById('clinicTotpOtpauth');
    const clinicTotpOtpauthWrap = document.getElementById('clinicTotpOtpauthWrap');
    const clinicTotpSetupCode = document.getElementById('clinicTotpSetupCode');
    const totpSetupError = document.getElementById('totpSetupError');
    const clinicTotpSetupBack = document.getElementById('clinicTotpSetupBack');
    const clinicTotpRecoverForm = document.getElementById('clinicTotpRecoverForm');
    const clinicTotpRecoverCode = document.getElementById('clinicTotpRecoverCode');
    const totpRecoverError = document.getElementById('totpRecoverError');
    const clinicTotpRecoverBack = document.getElementById('clinicTotpRecoverBack');
    const clinicTotpCodesPanel = document.getElementById('clinicTotpCodesPanel');
    const clinicTotpCodesList = document.getElementById('clinicTotpCodesList');
    const clinicTotpCodesContinue = document.getElementById('clinicTotpCodesContinue');
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
    const clinicAvailRows = document.getElementById('clinicAvailRows');
    const clinicAvailAddForm = document.getElementById('clinicAvailAddForm');
    const clinicAvailWeekday = document.getElementById('clinicAvailWeekday');
    const clinicAvailMonth = document.getElementById('clinicAvailMonth');
    const clinicAvailDate = document.getElementById('clinicAvailDate');
    const clinicAvailStart = document.getElementById('clinicAvailStart');
    const clinicAvailEnd = document.getElementById('clinicAvailEnd');
    const clinicAvailAddPreview = document.getElementById('clinicAvailAddPreview');
    const clinicAvailError = document.getElementById('clinicAvailError');
    const clinicAvailWeeklyHint = document.getElementById('clinicAvailWeeklyHint');
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
        profile: { title: 'Perfil', subtitle: 'Nome, email e foto da sua ficha' },
        availabilities: { title: 'Disponibilidades', subtitle: 'Os seus horários na clínica' },
        bookings: { title: 'Marcações', subtitle: 'Consultas atribuídas a si' }
    };
    const CLINIC_PANEL_ALIASES = {
        consultations: 'bookings',
        patients: 'bookings',
        resources: 'profile',
        management: 'profile'
    };

    let clinicRole = 'admin';
    let staffDisplayName = '';
    let clinicDoxyPatientUrl = '';
    let activeClinicPanel = 'profile';
    let clinicBillingSummary = null;
    let clinicPayPeriod = 'week';
    const CLINIC_PAY_IRS_KEY = 'lonClinicPayIrsPct';
    const CLINIC_PAY_SS_KEY = 'lonClinicPaySsPct';
    let clinicScheduleData = null;
    let clinicAvailMode = 'weekday';
    let clinicScheduleDirty = false;
    let clinicAvailSaveQueued = false;
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
                const resetTok = new URLSearchParams(window.location.search).get('reset') || '';
                if (/^[a-f0-9]{64}$/i.test(resetTok)) {
                    if (clinicResetCode) clinicResetCode.value = resetTok.toLowerCase();
                    setClinicAuthView('reset');
                }
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

    function resolveClinicPanel(panelId) {
        const raw = String(panelId || '').toLowerCase();
        const mapped = CLINIC_PANEL_ALIASES[raw] || raw;
        return CLINIC_PANEL_META[mapped] ? mapped : 'profile';
    }

    function setClinicPanel(panelId) {
        panelId = resolveClinicPanel(panelId);
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
            refreshBtn.style.display = panelId === 'bookings' ? '' : 'none';
        }
        if (clinicSaveScheduleBtn) {
            clinicSaveScheduleBtn.style.display = panelId === 'availabilities' ? '' : 'none';
        }
        closeClinicSidebar();
        if (location.hash !== `#${panelId}`) {
            try { history.replaceState(null, '', `${location.pathname}${location.search}#${panelId}`); } catch (err) { /* ignore */ }
        }

        if (panelId === 'bookings') {
            loadBookings();
        }
        if (panelId === 'availabilities') {
            if (clinicScheduleDirty || clinicAvailSaveInFlight) {
                void saveClinicAvailability({ quiet: true });
            } else {
                loadScheduleView();
            }
        }
        if (panelId === 'profile') loadClinicIdentity();
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

        if (clinicSidebarUser) {
            clinicSidebarUser.textContent = staffDisplayName || 'Portal';
        }
        if (clinicAdminLink) clinicAdminLink.hidden = true;

        setClinicPanel(initialClinicPanel());
        loadScheduleView();
    }

    function initialClinicPanel() {
        const hash = String(location.hash || '').replace(/^#/, '').toLowerCase();
        if (hash) return resolveClinicPanel(hash);
        try {
            if (/\/clinic-desk\/perfil\/?$/i.test(location.pathname)) return 'profile';
            const panel = new URLSearchParams(location.search).get('panel');
            if (panel) return resolveClinicPanel(panel);
        } catch (err) { /* ignore */ }
        return 'profile';
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

    function clinicTodayKey() {
        const t = clinicStartOfToday();
        return formatClinicOverrideDateKey(t.getFullYear(), t.getMonth(), t.getDate());
    }

    function clinicTimeToMinutes(hhmm) {
        const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
        if (!m) return null;
        return Number(m[1]) * 60 + Number(m[2]);
    }

    const CLINIC_WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const CLINIC_WEEKDAY_LABELS = {
        monday: 'Segundas', tuesday: 'Terças', wednesday: 'Quartas', thursday: 'Quintas',
        friday: 'Sextas', saturday: 'Sábados', sunday: 'Domingos'
    };
    const CLINIC_MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    function clinicWeekdayKeyFromDate(dateKey) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
        if (!m) return '';
        return CLINIC_WEEKDAY_KEYS[new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay()] || '';
    }

    /**
     * Rows are { date, enabled, start, end }. Several rows may share a date
     * (split days). Overlapping or touching blocks on one date are merged so
     * the list always mirrors what the server stores.
     */
    function normalizeClinicDayRows(list) {
        const byDate = new Map();
        (list || []).forEach((entry) => {
            if (!entry || entry.enabled === false || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || ''))) return;
            const start = String(entry.start || '').slice(0, 5);
            const end = String(entry.end || '').slice(0, 5);
            const from = clinicTimeToMinutes(start);
            const to = clinicTimeToMinutes(end);
            if (from == null || to == null || to <= from) return;
            if (!byDate.has(entry.date)) byDate.set(entry.date, []);
            byDate.get(entry.date).push({ start, end, from, to });
        });
        const out = [];
        Array.from(byDate.keys()).sort().forEach((date) => {
            const blocks = byDate.get(date).sort((a, b) => a.from - b.from);
            const merged = [];
            blocks.forEach((block) => {
                const last = merged[merged.length - 1];
                if (!last || block.from > last.to) {
                    merged.push({ ...block });
                } else if (block.to > last.to) {
                    last.to = block.to;
                    last.end = block.end;
                }
            });
            merged.forEach((block) => out.push({ date, enabled: true, start: block.start, end: block.end }));
        });
        return out;
    }

    function setClinicDayRows(rows) {
        if (!clinicScheduleData) return;
        clinicScheduleData.dayOverrides = normalizeClinicDayRows(rows);
    }

    function clinicRowKey(row) {
        return `${row.date}|${row.start}|${row.end}`;
    }

    function setClinicAvailError(message) {
        if (!clinicAvailError) return;
        clinicAvailError.textContent = message || '';
        clinicAvailError.style.display = message ? '' : 'none';
    }

    function clinicMonthKeyFromDate(dateKey) {
        return String(dateKey || '').slice(0, 7);
    }

    function clinicMonthLabel(monthKey) {
        const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
        if (!m) return String(monthKey || '');
        return `${CLINIC_MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
    }

    function fillClinicAvailMonthOptions() {
        if (!clinicAvailMonth || clinicAvailMonth.options.length) return;
        const t = clinicStartOfToday();
        for (let i = 0; i < 12; i++) {
            const d = new Date(t.getFullYear(), t.getMonth() + i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = clinicMonthLabel(value);
            clinicAvailMonth.appendChild(opt);
        }
        if (clinicAvailDate && !clinicAvailDate.value) {
            clinicAvailDate.min = clinicTodayKey();
        }
    }

    /** Dates (today onward) of one weekday inside a month, as YYYY-MM-DD keys. */
    function clinicDatesForWeekdayInMonth(weekdayKey, monthKey) {
        const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
        const dow = CLINIC_WEEKDAY_KEYS.indexOf(weekdayKey);
        if (!m || dow < 0) return [];
        const year = Number(m[1]);
        const month0 = Number(m[2]) - 1;
        const todayKey = clinicTodayKey();
        const daysInMonth = new Date(year, month0 + 1, 0).getDate();
        const out = [];
        for (let d = 1; d <= daysInMonth; d++) {
            if (new Date(year, month0, d).getDay() !== dow) continue;
            const key = formatClinicOverrideDateKey(year, month0, d);
            if (key >= todayKey) out.push(key);
        }
        return out;
    }

    function clinicAvailFormValues() {
        const start = String((clinicAvailStart && clinicAvailStart.value) || '').slice(0, 5);
        const end = String((clinicAvailEnd && clinicAvailEnd.value) || '').slice(0, 5);
        let dates = [];
        let error = '';
        if (clinicAvailMode === 'date') {
            const date = String((clinicAvailDate && clinicAvailDate.value) || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) error = 'Pick a date.';
            else if (date < clinicTodayKey()) error = 'That date is already in the past.';
            else dates = [date];
        } else {
            const weekday = (clinicAvailWeekday && clinicAvailWeekday.value) || 'monday';
            const month = (clinicAvailMonth && clinicAvailMonth.value) || '';
            dates = clinicDatesForWeekdayInMonth(weekday, month);
            if (!dates.length) error = `No upcoming ${CLINIC_WEEKDAY_LABELS[weekday] || 'days'} left in ${clinicMonthLabel(month)}.`;
        }
        const from = clinicTimeToMinutes(start);
        const to = clinicTimeToMinutes(end);
        if (!error) {
            if (from == null || to == null) error = 'Set a start and an end time.';
            else if (to <= from) error = 'End time must be after the start time.';
        }
        return { start, end, dates, error, from, to };
    }

    function renderClinicAvailPreview() {
        if (!clinicAvailAddPreview) return;
        const v = clinicAvailFormValues();
        if (v.error) {
            clinicAvailAddPreview.textContent = '';
            return;
        }
        const hours = `${v.start}–${v.end}`;
        if (clinicAvailMode === 'date') {
            const d = new Date(`${v.dates[0]}T12:00:00`);
            clinicAvailAddPreview.textContent = `Adds 1 line: ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, ${hours}.`;
            return;
        }
        const weekday = (clinicAvailWeekday && clinicAvailWeekday.value) || 'monday';
        const month = (clinicAvailMonth && clinicAvailMonth.value) || '';
        const days = v.dates.map((key) => Number(key.slice(8, 10))).join(', ');
        clinicAvailAddPreview.textContent =
            `Adds ${v.dates.length} line${v.dates.length === 1 ? '' : 's'}: ${CLINIC_WEEKDAY_LABELS[weekday]} in ${clinicMonthLabel(month)} (${days}), ${hours}.`;
    }

    function setClinicAvailMode(mode) {
        clinicAvailMode = mode === 'date' ? 'date' : 'weekday';
        document.querySelectorAll('[data-clinic-avail-mode]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-clinic-avail-mode') === clinicAvailMode);
        });
        document.querySelectorAll('[data-clinic-avail-field]').forEach((el) => {
            el.hidden = el.getAttribute('data-clinic-avail-field') !== clinicAvailMode;
        });
        setClinicAvailError('');
        renderClinicAvailPreview();
    }

    function addClinicAvailFromForm() {
        if (!clinicScheduleData) {
            setClinicAvailError('Availability is still loading. Try again.');
            return;
        }
        const v = clinicAvailFormValues();
        if (v.error) {
            setClinicAvailError(v.error);
            return;
        }
        setClinicAvailError('');
        const rows = (clinicScheduleData.dayOverrides || []).slice();
        v.dates.forEach((date) => rows.push({ date, enabled: true, start: v.start, end: v.end }));
        setClinicDayRows(rows);
        renderClinicAvailRows();
        markClinicScheduleDirty();
        if (clinicAvailMode === 'date' && clinicAvailDate) clinicAvailDate.value = '';
        renderClinicAvailPreview();
    }

    function renderClinicAvailWeeklyHint() {
        if (!clinicAvailWeeklyHint) return;
        const weekly = (clinicScheduleData && clinicScheduleData.weekly) || {};
        const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const parts = order
            .filter((key) => weekly[key] && weekly[key].enabled)
            .map((key) => `${key.slice(0, 3).replace(/^./, (c) => c.toUpperCase())} ${String(weekly[key].start).slice(0, 5)}–${String(weekly[key].end).slice(0, 5)}`);
        if (!parts.length) {
            clinicAvailWeeklyHint.hidden = true;
            clinicAvailWeeklyHint.textContent = '';
            return;
        }
        clinicAvailWeeklyHint.hidden = false;
        clinicAvailWeeklyHint.textContent =
            `O horário semanal da clínica (${parts.join(' · ')}) não se aplica enquanto tiver linhas abaixo — os pacientes só veem esses blocos.`;
    }

    function renderClinicAvailRows() {
        if (!clinicAvailRows) return;
        if (!clinicScheduleData) {
            clinicAvailRows.innerHTML = '<p class="clinic-avail-rows-empty">A carregar…</p>';
            return;
        }
        const todayKey = clinicTodayKey();
        const rows = (clinicScheduleData.dayOverrides || []).filter((row) => row && row.enabled !== false && row.date >= todayKey);
        if (!rows.length) {
            clinicAvailRows.innerHTML = '<p class="clinic-avail-rows-empty">Ainda não tem disponibilidade. Adicione o primeiro bloco acima — por exemplo segundas 10:00–12:00 em setembro.</p>';
            return;
        }
        const byMonth = new Map();
        rows.forEach((row) => {
            const key = clinicMonthKeyFromDate(row.date);
            if (!byMonth.has(key)) byMonth.set(key, []);
            byMonth.get(key).push(row);
        });
        clinicAvailRows.innerHTML = '';
        Array.from(byMonth.keys()).sort().forEach((monthKey) => {
            const list = byMonth.get(monthKey);
            const section = document.createElement('section');
            section.className = 'clinic-avail-month';
            const head = document.createElement('div');
            head.className = 'clinic-avail-month-head';
            const title = document.createElement('h3');
            title.textContent = clinicMonthLabel(monthKey);
            const count = document.createElement('span');
            count.className = 'clinic-avail-month-count';
            count.textContent = `${list.length} ${list.length === 1 ? 'bloco' : 'blocos'}`;
            const removeMonth = document.createElement('button');
            removeMonth.type = 'button';
            removeMonth.className = 'btn btn-outline btn-sm';
            removeMonth.textContent = 'Remover mês';
            removeMonth.addEventListener('click', () => {
                if (!window.confirm(`Remover os ${list.length} ${list.length === 1 ? 'bloco' : 'blocos'} de ${clinicMonthLabel(monthKey)}?`)) return;
                setClinicDayRows((clinicScheduleData.dayOverrides || []).filter((row) => clinicMonthKeyFromDate(row.date) !== monthKey || row.date < todayKey));
                renderClinicAvailRows();
                markClinicScheduleDirty();
            });
            head.appendChild(title);
            head.appendChild(count);
            head.appendChild(removeMonth);
            section.appendChild(head);

            const table = document.createElement('table');
            table.className = 'clinic-avail-table';
            const tbody = document.createElement('tbody');
            let lastDate = '';
            list.forEach((row) => {
                const tr = document.createElement('tr');
                tr.className = 'clinic-avail-row';
                if (row.date === lastDate) tr.classList.add('is-same-day');
                lastDate = row.date;
                const key = clinicRowKey(row);
                const d = new Date(`${row.date}T12:00:00`);
                const weekdayLabel = d.toLocaleDateString('pt-PT', { weekday: 'short' });
                const dayLabel = d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });

                const tdDate = document.createElement('td');
                tdDate.className = 'clinic-avail-cell-date';
                tdDate.innerHTML = `<span class="clinic-avail-row-weekday">${weekdayLabel}</span><strong>${dayLabel}</strong>`;

                const tdHours = document.createElement('td');
                tdHours.className = 'clinic-avail-cell-hours';
                const startInput = document.createElement('input');
                startInput.type = 'time';
                startInput.step = '1800';
                startInput.className = 'admin-time-input';
                startInput.value = row.start;
                startInput.setAttribute('aria-label', `Início em ${dayLabel}`);
                const sep = document.createElement('span');
                sep.className = 'clinic-avail-row-sep';
                sep.textContent = '–';
                const endInput = document.createElement('input');
                endInput.type = 'time';
                endInput.step = '1800';
                endInput.className = 'admin-time-input';
                endInput.value = row.end;
                endInput.setAttribute('aria-label', `Fim em ${dayLabel}`);
                const onEdit = () => {
                    const start = String(startInput.value || '').slice(0, 5);
                    const end = String(endInput.value || '').slice(0, 5);
                    const from = clinicTimeToMinutes(start);
                    const to = clinicTimeToMinutes(end);
                    if (from == null || to == null || to <= from) {
                        tr.classList.add('is-invalid');
                        setClinicAvailError(`${dayLabel}: a hora de fim tem de ser depois da de início.`);
                        return;
                    }
                    tr.classList.remove('is-invalid');
                    setClinicAvailError('');
                    const next = (clinicScheduleData.dayOverrides || []).map((item) =>
                        clinicRowKey(item) === key ? { ...item, start, end } : item
                    );
                    setClinicDayRows(next);
                    renderClinicAvailRows();
                    markClinicScheduleDirty();
                };
                startInput.addEventListener('change', onEdit);
                endInput.addEventListener('change', onEdit);
                tdHours.appendChild(startInput);
                tdHours.appendChild(sep);
                tdHours.appendChild(endInput);

                const tdActions = document.createElement('td');
                tdActions.className = 'clinic-avail-cell-actions';
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'admin-remove-btn';
                removeBtn.setAttribute('aria-label', `Remove ${dayLabel} ${row.start}–${row.end}`);
                removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                removeBtn.addEventListener('click', () => {
                    setClinicDayRows((clinicScheduleData.dayOverrides || []).filter((item) => clinicRowKey(item) !== key));
                    renderClinicAvailRows();
                    markClinicScheduleDirty();
                });
                tdActions.appendChild(removeBtn);

                tr.appendChild(tdDate);
                tr.appendChild(tdHours);
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            section.appendChild(table);
            clinicAvailRows.appendChild(section);
        });
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

    async function loadScheduleView() {
        if (!clinicAvailRows) return;
        if (clinicScheduleDirty || clinicAvailSaveInFlight) return;
        fillClinicAvailMonthOptions();
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
                dayOverrides: normalizeClinicDayRows(schedule.dayOverrides),
                timezone: schedule.timezone || 'Europe/Lisbon'
            };
            renderClinicAvailRows();
            renderClinicAvailWeeklyHint();
            renderClinicAvailPreview();
            clinicScheduleDirty = false;
            if (clinicSaveScheduleBtn) {
                clinicSaveScheduleBtn.classList.remove('admin-save-dirty');
                clinicSaveScheduleBtn.textContent = 'Save availability';
                clinicSaveScheduleBtn.disabled = false;
            }
        } catch (err) {
            console.error('Failed to load schedule view:', err);
            if (clinicScheduleData) return;
            if (clinicAvailRows) {
                clinicAvailRows.innerHTML = '<p class="clinic-avail-rows-empty">Não foi possível carregar a disponibilidade.</p>';
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
            // Only adopt the server list when nothing changed meanwhile; otherwise the
            // queued re-save below will send the newer rows.
            if (!clinicAvailSaveQueued) {
                const fromServer = normalizeClinicDayRows(
                    Array.isArray(data.dayOverrides) ? data.dayOverrides : dayOverrides
                );
                const changed = fromServer.map(clinicRowKey).join(',')
                    !== (clinicScheduleData.dayOverrides || []).map(clinicRowKey).join(',');
                clinicScheduleData.dayOverrides = fromServer;
                clinicScheduleDirty = false;
                if (changed) renderClinicAvailRows();
            }
            clinicAvailSaveAttempts = 0;
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

    document.querySelectorAll('[data-clinic-avail-mode]').forEach((btn) => {
        btn.addEventListener('click', () => setClinicAvailMode(btn.getAttribute('data-clinic-avail-mode')));
    });
    [clinicAvailWeekday, clinicAvailMonth, clinicAvailDate, clinicAvailStart, clinicAvailEnd].forEach((el) => {
        if (!el) return;
        el.addEventListener('change', () => {
            setClinicAvailError('');
            renderClinicAvailPreview();
        });
        el.addEventListener('input', renderClinicAvailPreview);
    });
    if (clinicAvailAddForm) {
        clinicAvailAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addClinicAvailFromForm();
        });
    }
    fillClinicAvailMonthOptions();

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
        const mode = ['forgot', 'reset', 'totp', 'totp-setup', 'totp-recover', 'totp-codes'].includes(view)
            ? view
            : 'signin';
        if (clinicLoginForm) clinicLoginForm.hidden = mode !== 'signin';
        if (clinicForgotForm) clinicForgotForm.hidden = mode !== 'forgot';
        if (clinicResetForm) clinicResetForm.hidden = mode !== 'reset';
        if (clinicTotpForm) clinicTotpForm.hidden = mode !== 'totp';
        if (clinicTotpSetupForm) clinicTotpSetupForm.hidden = mode !== 'totp-setup';
        if (clinicTotpRecoverForm) clinicTotpRecoverForm.hidden = mode !== 'totp-recover';
        if (clinicTotpCodesPanel) clinicTotpCodesPanel.hidden = mode !== 'totp-codes';
        if (clinicLoginTitle) {
            clinicLoginTitle.textContent = mode === 'signin'
                ? 'Portal dos profissionais'
                : mode === 'forgot'
                    ? 'Recuperar password'
                    : mode === 'reset'
                        ? 'Redefinir password'
                        : mode === 'totp-setup'
                            ? 'Ativar 2FA'
                            : mode === 'totp-codes'
                                ? 'Códigos de recuperação'
                                : mode === 'totp-recover'
                                    ? 'Código de recuperação'
                                    : 'Verificação 2FA';
        }
        if (clinicLoginDesc) {
            clinicLoginDesc.textContent = mode === 'signin'
                ? 'Acesso com email e código de 6 dígitos. Introduza o email da sua ficha para receber o código.'
                : mode === 'forgot'
                    ? 'Indique o email da ficha. Enviamos um link para definir uma nova password.'
                    : mode === 'reset'
                        ? 'Introduza o código enviado por email e escolha uma nova password.'
                        : mode === 'totp-setup'
                            ? 'A autenticação de dois fatores é obrigatória. Guarde o código secreto na aplicação autenticadora e confirme com um código de 6 dígitos.'
                            : mode === 'totp-codes'
                                ? 'Guarde estes códigos agora. Não voltarão a ser mostrados.'
                                : mode === 'totp-recover'
                                    ? 'Use um dos códigos de recuperação que guardou quando ativou o 2FA.'
                                    : 'Introduza o código de 6 dígitos da aplicação autenticadora.';
        }
        if (mode !== 'signin') hideAuthMessage(loginError);
        if (mode !== 'forgot') hideAuthMessage(forgotError);
        if (mode !== 'reset') hideAuthMessage(resetError);
        if (mode !== 'totp') hideAuthMessage(totpError);
        if (mode !== 'totp-setup') hideAuthMessage(totpSetupError);
        if (mode !== 'totp-recover') hideAuthMessage(totpRecoverError);
        if (mode === 'forgot' && clinicForgotEmail) {
            const fromLogin = clinicUsername && clinicUsername.value.trim();
            if (!clinicForgotEmail.value && fromLogin) clinicForgotEmail.value = fromLogin;
            clinicForgotEmail.focus();
        }
        if (mode === 'reset' && clinicResetCode) clinicResetCode.focus();
        if (mode === 'signin') setClinicOtpStep('request');
        if (mode === 'signin' && clinicUsername) clinicUsername.focus();
        if (mode === 'totp' && clinicTotpCode) clinicTotpCode.focus();
        if (mode === 'totp-setup' && clinicTotpSetupCode) clinicTotpSetupCode.focus();
        if (mode === 'totp-recover' && clinicTotpRecoverCode) clinicTotpRecoverCode.focus();
    }

    let pendingClinicLogin = null;

    function formatTotpSecret(secret) {
        return String(secret || '').replace(/(.{4})/g, '$1 ').trim();
    }

    function applyTotpSetup(data) {
        if (clinicTotpSecret) clinicTotpSecret.value = formatTotpSecret(data.secret || '');
        if (clinicTotpOtpauth && clinicTotpOtpauthWrap) {
            if (data.otpauthUrl) {
                clinicTotpOtpauth.href = data.otpauthUrl;
                clinicTotpOtpauthWrap.hidden = false;
            } else {
                clinicTotpOtpauth.removeAttribute('href');
                clinicTotpOtpauthWrap.hidden = true;
            }
        }
        setClinicAuthView('totp-setup');
    }

    function finishClinicLogin(data, identifier) {
        const enter = () => {
            showClinicPortal(data.displayName || identifier, data.role, data.username || identifier);
            if (clinicUsername) clinicUsername.value = '';
            if (clinicOtp) clinicOtp.value = '';
            if (clinicPassword) clinicPassword.value = '';
            if (clinicTotpCode) clinicTotpCode.value = '';
            if (clinicTotpSetupCode) clinicTotpSetupCode.value = '';
            if (clinicTotpRecoverCode) clinicTotpRecoverCode.value = '';
            pendingClinicLogin = null;
        };
        if (Array.isArray(data.recoveryCodes) && data.recoveryCodes.length) {
            pendingClinicLogin = { data, identifier };
            if (clinicTotpCodesList) clinicTotpCodesList.textContent = data.recoveryCodes.join('\n');
            setClinicAuthView('totp-codes');
            return;
        }
        enter();
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

    let clinicOtpStep = 'request';

    function setClinicOtpStep(step) {
        clinicOtpStep = step === 'verify' ? 'verify' : 'request';
        if (clinicOtpGroup) clinicOtpGroup.hidden = clinicOtpStep !== 'verify';
        if (clinicOtpBackWrap) clinicOtpBackWrap.hidden = clinicOtpStep !== 'verify';
        if (clinicLoginSubmit) clinicLoginSubmit.textContent = clinicOtpStep === 'verify' ? 'Entrar' : 'Enviar código';
        if (clinicUsername) clinicUsername.readOnly = clinicOtpStep === 'verify';
        if (clinicOtpStep === 'request' && clinicOtp) clinicOtp.value = '';
    }

    if (clinicOtpBack) {
        clinicOtpBack.addEventListener('click', () => {
            hideAuthMessage(loginError);
            showAuthOk('');
            setClinicOtpStep('request');
            if (clinicUsername) {
                clinicUsername.readOnly = false;
                clinicUsername.focus();
            }
        });
    }

    clinicLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessage(loginError);
        showAuthOk('');

        const email = clinicUsername ? clinicUsername.value.trim() : '';
        if (!email) {
            showAuthError(loginError, 'Indique o email da sua ficha.');
            return;
        }
        if (clinicLoginSubmit) clinicLoginSubmit.disabled = true;
        try {
            if (clinicOtpStep !== 'verify') {
                const res = await fetch('/api/clinic/otp/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    showAuthError(loginError, data.error || 'Não foi possível enviar o código. Tente novamente.');
                    return;
                }
                setClinicOtpStep('verify');
                showAuthOk('Se este email tiver acesso, enviámos um código. Verifique a caixa de entrada.');
                if (clinicOtp) clinicOtp.focus();
                return;
            }
            const code = (clinicOtp && clinicOtp.value || '').replace(/\D/g, '');
            if (code.length !== 6) {
                showAuthError(loginError, 'Introduza o código de 6 dígitos enviado por email.');
                return;
            }
            const res = await fetch('/api/clinic/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ email, code })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                setClinicOtpStep('request');
                finishClinicLogin(data, email);
            } else {
                showAuthError(loginError, data.error || 'Código inválido ou expirado.');
            }
        } catch (err) {
            console.error('Login error:', err);
            showAuthError(loginError, 'Não foi possível ligar ao servidor. Tente novamente.');
        } finally {
            if (clinicLoginSubmit) clinicLoginSubmit.disabled = false;
        }
    });

    async function submitClinicTotp(code, { recover } = {}) {
        const path = recover ? '/api/clinic/login/totp/recover' : '/api/clinic/login/totp';
        const errorEl = recover ? totpRecoverError : (clinicTotpSetupForm && !clinicTotpSetupForm.hidden ? totpSetupError : totpError);
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
        finishClinicLogin(data, (clinicUsername && clinicUsername.value.trim()) || data.username || '');
        hideAuthMessage(errorEl);
    }

    if (clinicTotpForm) {
        clinicTotpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthMessage(totpError);
            const code = clinicTotpCode ? clinicTotpCode.value.trim() : '';
            try {
                await submitClinicTotp(code);
            } catch (err) {
                showAuthError(totpError, err.message || 'Código inválido.');
            }
        });
    }
    if (clinicTotpSetupForm) {
        clinicTotpSetupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthMessage(totpSetupError);
            const code = clinicTotpSetupCode ? clinicTotpSetupCode.value.trim() : '';
            try {
                await submitClinicTotp(code);
            } catch (err) {
                showAuthError(totpSetupError, err.message || 'Código inválido.');
            }
        });
    }
    if (clinicTotpRecoverForm) {
        clinicTotpRecoverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthMessage(totpRecoverError);
            const code = clinicTotpRecoverCode ? clinicTotpRecoverCode.value.trim() : '';
            try {
                await submitClinicTotp(code, { recover: true });
            } catch (err) {
                showAuthError(totpRecoverError, err.message || 'Código inválido.');
            }
        });
    }
    if (clinicTotpRecoverLink) {
        clinicTotpRecoverLink.addEventListener('click', () => setClinicAuthView('totp-recover'));
    }
    if (clinicTotpBack) {
        clinicTotpBack.addEventListener('click', () => setClinicAuthView('signin'));
    }
    if (clinicTotpSetupBack) {
        clinicTotpSetupBack.addEventListener('click', () => setClinicAuthView('signin'));
    }
    if (clinicTotpRecoverBack) {
        clinicTotpRecoverBack.addEventListener('click', () => setClinicAuthView('totp'));
    }
    if (clinicTotpCodesContinue) {
        clinicTotpCodesContinue.addEventListener('click', () => {
            const pending = pendingClinicLogin;
            pendingClinicLogin = null;
            if (pending) finishClinicLogin({ ...pending.data, recoveryCodes: null }, pending.identifier);
        });
    }
    [clinicTotpCode, clinicTotpSetupCode].forEach((el) => {
        if (!el) return;
        el.addEventListener('input', () => {
            el.value = el.value.replace(/\D/g, '').slice(0, 6);
        });
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
            clinicResetCode.value = clinicResetCode.value.replace(/[^a-fA-F0-9]/g, '').toLowerCase().slice(0, 64);
        });
    }
    if (clinicResetForm) {
        clinicResetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAuthMessage(resetError);
            const email = clinicResetEmail || (clinicForgotEmail && clinicForgotEmail.value.trim()) || '';
            const code = clinicResetCode ? clinicResetCode.value.replace(/[^a-fA-F0-9]/g, '').toLowerCase() : '';
            const password = clinicResetPassword ? clinicResetPassword.value : '';
            const password2 = clinicResetPassword2 ? clinicResetPassword2.value : '';
            if (!email || code.length !== 64) {
                showAuthError(resetError, 'Introduza o código enviado por email.');
                return;
            }
            if (password.length < 12) {
                showAuthError(resetError, 'A nova password deve ter pelo menos 12 caracteres.');
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
                <td><span class="dash-status ${status}">${statusLabel(status)}</span></td>
                <td>
                    ${hasNotes 
                        ? '<span style="color: var(--accent); font-weight: 600;">✓ Notas</span>'
                        : '<span style="color: var(--text-muted);">Sem notas</span>'
                    }
                    ${booking.hasPatientIntake
                        ? '<br><span style="color: var(--accent); font-size: 0.85em;">Ficha ok</span>'
                        : '<br><span style="color: var(--text-muted); font-size: 0.85em;">Ficha pendente</span>'
                    }
                </td>
                <td>
                    <button class="btn btn-outline btn-sm view-consultation-btn" data-booking-ref="${escapeHtml(ref)}">
                        Abrir
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
    function statusLabel(status) {
        if (status === 'completed') return 'concluída';
        if (status === 'cancelled') return 'cancelada';
        return 'próxima';
    }

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
