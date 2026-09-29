/* ========================================
   Portal dos profissionais — JavaScript
   Início, marcações, disponibilidade e perfil
======================================== */

document.addEventListener('DOMContentLoaded', () => {

    const SERVICE_LABELS = {
        longevity: 'Medicina funcional',
        longevidade: 'Medicina funcional',
        medicina_funcional: 'Medicina funcional',
        'longevity-plus': 'Longevity Plus',
        travel: 'Medicina do viajante',
        followup: 'Consulta de seguimento',
        entrevista: 'Entrevista de emprego',
        clinica_geral: 'Clínica geral',
        urgente: 'Consulta urgente',
        infeccao_urinaria: 'Infeção urinária',
        saude_mental: 'Saúde mental',
        burnout: 'Burnout',
        burnout_mensal: 'Anti-burnout (subscrição)',
        burnout_programa: 'Programa anti-burnout',
        burnout_orientacao: 'Orientação burnout (15 min)',
        nutricao: 'Nutrição',
        nutricao_quinzenal: 'Nutrição (subscrição quinzenal)',
        nutricao_orientacao: 'Conversa inicial de nutrição (15 min)',
        renovacao: 'Renovação de receita',
        psicologia: 'Psicologia',
        psicologia_mensal: 'Psicologia (subscrição)',
        terapia_casal: 'Terapia de casal',
        terapia_casal_mensal: 'Terapia de casal (subscrição)'
    };

    function serviceLabel(code) {
        const raw = String(code || '').trim();
        if (!raw) return 'Consulta';
        if (SERVICE_LABELS[raw]) return SERVICE_LABELS[raw];
        const words = raw.replace(/[_-]+/g, ' ').trim();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    // ─── DOM: login ───
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

    // ─── DOM: portal ───
    const clinicPageTitle = document.getElementById('clinicPageTitle');
    const clinicPageSub = document.getElementById('clinicPageSub');
    const clinicRefreshBtn = document.getElementById('clinicRefreshBtn');
    const clinicSidebarUser = document.getElementById('clinicSidebarUser');
    const clinicSidebarEmail = document.getElementById('clinicSidebarEmail');

    const clinicStatToday = document.getElementById('clinicStatToday');
    const clinicStatWeek = document.getElementById('clinicStatWeek');
    const clinicStatAvail = document.getElementById('clinicStatAvail');
    const clinicStatAvailHint = document.getElementById('clinicStatAvailHint');
    const clinicAvailNudge = document.getElementById('clinicAvailNudge');
    const clinicAvailNudgeTitle = document.getElementById('clinicAvailNudgeTitle');
    const clinicAvailNudgeText = document.getElementById('clinicAvailNudgeText');
    const clinicHomeUpcoming = document.getElementById('clinicHomeUpcoming');

    const clinicBookingList = document.getElementById('clinicBookingList');
    const clinicBookingSearch = document.getElementById('clinicBookingSearch');

    const clinicAvailSaveState = document.getElementById('clinicAvailSaveState');
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

    const consultationModal = document.getElementById('consultationModal');
    const modalKicker = document.getElementById('modalKicker');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const CLINIC_PANELS = {
        home: { title: 'Início', subtitle: '' },
        bookings: { title: 'Marcações', subtitle: 'Consultas atribuídas a si. Toque numa consulta para ver a ficha e registar notas.' },
        availability: { title: 'Disponibilidade', subtitle: 'Os pacientes só conseguem marcar nos blocos que indicar aqui. As alterações ficam guardadas automaticamente.' },
        profile: { title: 'Perfil', subtitle: 'O nome e a foto aparecem aos pacientes. O email serve para entrar no portal.' }
    };
    const CLINIC_PANEL_ALIASES = {
        availabilities: 'availability',
        disponibilidade: 'availability',
        consultations: 'bookings',
        patients: 'bookings',
        marcacoes: 'bookings',
        perfil: 'profile',
        inicio: 'home'
    };

    let clinicRole = 'admin';
    let staffDisplayName = '';
    let staffEmail = '';
    let staffHasPhoto = false;
    let activeClinicPanel = 'home';
    let clinicBookings = null;
    let clinicBookingFilter = 'upcoming';
    let clinicScheduleData = null;
    let clinicAvailMode = 'weekday';
    let clinicScheduleDirty = false;
    let clinicAvailSaveQueued = false;
    let clinicAvailSaveTimer = null;
    let clinicAvailSaveInFlight = false;
    let clinicAvailSaveAttempts = 0;
    let sheetReturnFocus = null;

    // ─── Helpers ───
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setMessage(el, message) {
        if (!el) return;
        el.textContent = message || '';
        el.hidden = !message;
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function dateKeyOf(d) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }

    function dateFromKey(key) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
        return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
    }

    function clinicTodayKey() {
        return dateKeyOf(new Date());
    }

    function addDaysKey(key, days) {
        const d = dateFromKey(key);
        d.setDate(d.getDate() + days);
        return dateKeyOf(d);
    }

    function clinicTimeToMinutes(hhmm) {
        const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
        if (!m) return null;
        return Number(m[1]) * 60 + Number(m[2]);
    }

    function initials(name) {
        const parts = String(name || '').replace(/^(dra?\.?|dr\.?)\s+/i, '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '·';
        const first = parts[0].charAt(0);
        const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
        return (first + last).toUpperCase();
    }

    function firstName(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '';
        if (/^(dra?\.?|dr\.?)$/i.test(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
        return parts[0];
    }

    const DAY_LONG = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
    function dayHeading(key) {
        const today = clinicTodayKey();
        if (key === today) return 'Hoje';
        if (key === addDaysKey(today, 1)) return 'Amanhã';
        if (key === addDaysKey(today, -1)) return 'Ontem';
        const d = dateFromKey(key);
        if (!d) return 'Sem data';
        const label = `${CLINIC_WEEKDAY_SHORT[CLINIC_WEEKDAY_KEYS[d.getDay()]]}, ${d.getDate()} ${CLINIC_MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
        return d.getFullYear() === new Date().getFullYear() ? label : `${label} ${d.getFullYear()}`;
    }

    let toastTimer = null;
    function toast(message, kind) {
        let el = document.getElementById('proToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'proToast';
            el.className = 'pro-toast';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.dataset.kind = kind || 'ok';
        el.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('is-on'), 3200);
    }

    function renderAvatars() {
        document.querySelectorAll('[data-clinic-avatar]').forEach((el) => {
            if (el === clinicProfilePhotoPlaceholder) {
                el.textContent = initials(staffDisplayName);
                return;
            }
            el.textContent = '';
            if (staffHasPhoto) {
                const img = document.createElement('img');
                img.alt = '';
                img.src = `/api/clinic/profile/photo?t=${Date.now()}`;
                el.appendChild(img);
            } else {
                el.textContent = initials(staffDisplayName);
            }
        });
    }

    function renderIdentity() {
        if (clinicSidebarUser) clinicSidebarUser.textContent = staffDisplayName || 'Profissional';
        if (clinicSidebarEmail) clinicSidebarEmail.textContent = staffEmail || '';
        renderAvatars();
        if (activeClinicPanel === 'home') renderPageHead('home');
    }

    // ─── Auth status ───
    async function checkAuthStatus() {
        try {
            const res = await fetch('/api/clinic/auth-status?fresh=1', { cache: 'no-store', credentials: 'same-origin' });
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

    function showLogin() {
        document.body.classList.remove('clinic-logged-in');
        closeSheet();
        clinicLogin.style.display = '';
        clinicContent.hidden = true;
        setClinicAuthView('signin');
    }

    function showClinicPortal(username, role, loginUsername) {
        clinicLogin.style.display = 'none';
        clinicContent.hidden = false;
        document.body.classList.add('clinic-logged-in');
        clinicRole = role || 'admin';
        staffDisplayName = username || loginUsername || '';
        renderIdentity();
        const panel = initialClinicPanel();
        setClinicPanel(panel, { replace: true });
        if (panel !== 'profile') loadClinicIdentity();
        if (panel !== 'availability') loadScheduleView();
        loadBookings();
    }

    // ─── Panels ───
    function resolveClinicPanel(panelId) {
        const raw = String(panelId || '').toLowerCase();
        const mapped = CLINIC_PANEL_ALIASES[raw] || raw;
        return CLINIC_PANELS[mapped] ? mapped : 'home';
    }

    function initialClinicPanel() {
        const hash = String(location.hash || '').replace(/^#/, '');
        if (hash) return resolveClinicPanel(hash);
        try {
            const panel = new URLSearchParams(location.search).get('panel');
            if (panel) return resolveClinicPanel(panel);
        } catch (err) { /* ignore */ }
        return 'home';
    }

    function renderPageHead(panelId) {
        const meta = CLINIC_PANELS[panelId];
        if (panelId === 'home') {
            const hour = new Date().getHours();
            const hello = hour < 12 ? 'Bom dia' : (hour < 20 ? 'Boa tarde' : 'Boa noite');
            const name = firstName(staffDisplayName);
            clinicPageTitle.textContent = name ? `${hello}, ${name}` : hello;
            const today = DAY_LONG.format(new Date());
            clinicPageSub.textContent = today.charAt(0).toUpperCase() + today.slice(1);
            return;
        }
        clinicPageTitle.textContent = meta.title;
        clinicPageSub.textContent = meta.subtitle;
    }

    function setClinicPanel(panelId, { replace } = {}) {
        panelId = resolveClinicPanel(panelId);
        const previous = activeClinicPanel;
        activeClinicPanel = panelId;

        document.querySelectorAll('[data-clinic-panel]').forEach((btn) => {
            const on = btn.getAttribute('data-clinic-panel') === panelId;
            btn.classList.toggle('is-active', on);
            if (on) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });
        document.querySelectorAll('[data-clinic-panel-content]').forEach((el) => {
            el.hidden = el.getAttribute('data-clinic-panel-content') !== panelId;
        });
        renderPageHead(panelId);
        if (clinicRefreshBtn) clinicRefreshBtn.hidden = !(panelId === 'bookings' || panelId === 'home');
        renderSaveState();

        const hash = `#${panelId}`;
        if (location.hash !== hash) {
            try {
                if (replace) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
                else history.pushState(null, '', `${location.pathname}${location.search}${hash}`);
            } catch (err) { /* ignore */ }
        }
        if (previous !== panelId) window.scrollTo(0, 0);

        if (panelId === 'bookings' || panelId === 'home') {
            if (clinicBookings) renderBookingViews();
        }
        if (panelId === 'availability' && previous !== 'availability') {
            if (clinicScheduleDirty || clinicAvailSaveInFlight) void saveClinicAvailability({ quiet: true });
            else loadScheduleView();
        }
        if (panelId === 'profile') loadClinicIdentity();
    }

    // ─── Availability ───
    const CLINIC_WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const CLINIC_WEEKDAY_LABELS = {
        monday: 'Segundas', tuesday: 'Terças', wednesday: 'Quartas', thursday: 'Quintas',
        friday: 'Sextas', saturday: 'Sábados', sunday: 'Domingos'
    };
    const CLINIC_WEEKDAY_SHORT = {
        monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui',
        friday: 'Sex', saturday: 'Sáb', sunday: 'Dom'
    };
    const CLINIC_MONTH_NAMES = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const TIME_OPTIONS = [];
    for (let m = 6 * 60; m <= 23 * 60; m += 30) TIME_OPTIONS.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);

    function fillTimeSelect(select, value) {
        const options = TIME_OPTIONS.slice();
        if (value && !options.includes(value)) {
            options.push(value);
            options.sort();
        }
        select.innerHTML = options.map((t) => `<option value="${t}">${t}</option>`).join('');
        select.value = value || options[0];
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

    function upcomingAvailRows() {
        const todayKey = clinicTodayKey();
        return ((clinicScheduleData && clinicScheduleData.dayOverrides) || [])
            .filter((row) => row && row.enabled !== false && row.date >= todayKey);
    }

    function clinicMonthLabel(monthKey) {
        const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
        if (!m) return String(monthKey || '');
        const name = CLINIC_MONTH_NAMES[Number(m[2]) - 1];
        return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${m[1]}`;
    }

    function fillClinicAvailMonthOptions() {
        if (clinicAvailMonth && !clinicAvailMonth.options.length) {
            const t = new Date();
            for (let i = 0; i < 12; i++) {
                const d = new Date(t.getFullYear(), t.getMonth() + i, 1);
                const value = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
                const opt = document.createElement('option');
                opt.value = value;
                opt.textContent = clinicMonthLabel(value);
                clinicAvailMonth.appendChild(opt);
            }
            // After the 20th, people are usually planning next month.
            if (t.getDate() >= 20 && clinicAvailMonth.options[1]) clinicAvailMonth.selectedIndex = 1;
        }
        if (clinicAvailDate) clinicAvailDate.min = clinicTodayKey();
        [clinicAvailStart, clinicAvailEnd].forEach((select) => {
            if (select && !select.options.length) fillTimeSelect(select, select.dataset.default);
        });
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
            const key = `${year}-${pad2(month0 + 1)}-${pad2(d)}`;
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
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) error = 'Escolha uma data.';
            else if (date < clinicTodayKey()) error = 'Essa data já passou.';
            else dates = [date];
        } else {
            const weekday = (clinicAvailWeekday && clinicAvailWeekday.value) || 'monday';
            const month = (clinicAvailMonth && clinicAvailMonth.value) || '';
            dates = clinicDatesForWeekdayInMonth(weekday, month);
            if (!dates.length) error = `Já não há ${CLINIC_WEEKDAY_LABELS[weekday].toLowerCase()} por vir em ${clinicMonthLabel(month)}.`;
        }
        const from = clinicTimeToMinutes(start);
        const to = clinicTimeToMinutes(end);
        if (!error) {
            if (from == null || to == null) error = 'Indique a hora de início e de fim.';
            else if (to <= from) error = 'A hora de fim tem de ser depois da hora de início.';
        }
        return { start, end, dates, error };
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
            clinicAvailAddPreview.textContent = `Vai adicionar ${DAY_LONG.format(dateFromKey(v.dates[0]))}, ${hours}.`;
            return;
        }
        const days = v.dates.map((key) => Number(key.slice(8, 10))).join(', ');
        const n = v.dates.length;
        clinicAvailAddPreview.textContent =
            `Vai adicionar ${n} ${n === 1 ? 'dia' : 'dias'} (${days}), ${hours}.`;
    }

    function setClinicAvailMode(mode) {
        clinicAvailMode = mode === 'date' ? 'date' : 'weekday';
        document.querySelectorAll('[data-clinic-avail-mode]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-clinic-avail-mode') === clinicAvailMode);
        });
        document.querySelectorAll('[data-clinic-avail-field]').forEach((el) => {
            el.hidden = el.getAttribute('data-clinic-avail-field') !== clinicAvailMode;
        });
        setMessage(clinicAvailError, '');
        renderClinicAvailPreview();
    }

    function addClinicAvailFromForm() {
        if (!clinicScheduleData) {
            setMessage(clinicAvailError, 'A disponibilidade ainda está a carregar. Tente de novo.');
            return;
        }
        const v = clinicAvailFormValues();
        if (v.error) {
            setMessage(clinicAvailError, v.error);
            return;
        }
        setMessage(clinicAvailError, '');
        const rows = (clinicScheduleData.dayOverrides || []).slice();
        v.dates.forEach((date) => rows.push({ date, enabled: true, start: v.start, end: v.end }));
        setClinicDayRows(rows);
        renderClinicAvailRows();
        markClinicScheduleDirty();
        if (clinicAvailMode === 'date' && clinicAvailDate) clinicAvailDate.value = '';
        renderClinicAvailPreview();
        toast(v.dates.length === 1 ? 'Bloco adicionado' : `${v.dates.length} blocos adicionados`);
    }

    function renderClinicAvailWeeklyHint() {
        if (!clinicAvailWeeklyHint) return;
        const weekly = (clinicScheduleData && clinicScheduleData.weekly) || {};
        const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const parts = order
            .filter((key) => weekly[key] && weekly[key].enabled)
            .map((key) => `${CLINIC_WEEKDAY_SHORT[key]} ${String(weekly[key].start).slice(0, 5)}–${String(weekly[key].end).slice(0, 5)}`);
        if (!parts.length || !upcomingAvailRows().length) {
            clinicAvailWeeklyHint.hidden = true;
            clinicAvailWeeklyHint.textContent = '';
            return;
        }
        clinicAvailWeeklyHint.hidden = false;
        clinicAvailWeeklyHint.textContent =
            `O horário semanal da clínica (${parts.join(' · ')}) não se aplica enquanto tiver blocos abaixo — os pacientes só veem esses blocos.`;
    }

    function renderClinicAvailRows() {
        if (!clinicAvailRows) return;
        if (!clinicScheduleData) {
            clinicAvailRows.innerHTML = '<p class="pro-empty">A carregar…</p>';
            return;
        }
        const todayKey = clinicTodayKey();
        const rows = upcomingAvailRows();
        renderClinicAvailWeeklyHint();
        if (!rows.length) {
            clinicAvailRows.innerHTML = `
                <div class="pro-empty-state">
                    <strong>Ainda não tem disponibilidade</strong>
                    <p>Adicione o primeiro bloco acima, por exemplo às segundas das 10:00 às 13:00. Os pacientes passam a poder marcar nesses horários.</p>
                </div>`;
            return;
        }
        const byMonth = new Map();
        rows.forEach((row) => {
            const key = row.date.slice(0, 7);
            if (!byMonth.has(key)) byMonth.set(key, []);
            byMonth.get(key).push(row);
        });
        clinicAvailRows.innerHTML = '';
        Array.from(byMonth.keys()).sort().forEach((monthKey) => {
            const list = byMonth.get(monthKey);
            const section = document.createElement('section');
            section.className = 'pro-card pro-avail-month';

            const head = document.createElement('div');
            head.className = 'pro-card-head';
            const hours = list.reduce((sum, row) => sum + (clinicTimeToMinutes(row.end) - clinicTimeToMinutes(row.start)), 0) / 60;
            const days = new Set(list.map((row) => row.date)).size;
            head.innerHTML = `
                <div>
                    <h2 class="pro-card-title">${escapeHtml(clinicMonthLabel(monthKey))}</h2>
                    <p class="pro-card-sub">${days} ${days === 1 ? 'dia' : 'dias'} · ${String(Math.round(hours * 10) / 10).replace('.', ',')} h</p>
                </div>`;
            const removeMonth = document.createElement('button');
            removeMonth.type = 'button';
            removeMonth.className = 'pro-link pro-link-danger';
            removeMonth.textContent = 'Limpar mês';
            removeMonth.addEventListener('click', () => {
                const n = list.length;
                if (!window.confirm(`Remover ${n === 1 ? 'o bloco' : `os ${n} blocos`} de ${clinicMonthLabel(monthKey)}?`)) return;
                setClinicDayRows((clinicScheduleData.dayOverrides || []).filter((row) => row.date.slice(0, 7) !== monthKey || row.date < todayKey));
                renderClinicAvailRows();
                markClinicScheduleDirty();
            });
            head.appendChild(removeMonth);
            section.appendChild(head);

            const ul = document.createElement('ul');
            ul.className = 'pro-avail-list';
            let lastDate = '';
            list.forEach((row) => {
                const li = document.createElement('li');
                li.className = 'pro-avail-row';
                const sameDay = row.date === lastDate;
                if (sameDay) li.classList.add('is-same-day');
                lastDate = row.date;
                const key = clinicRowKey(row);
                const d = dateFromKey(row.date);
                const weekday = CLINIC_WEEKDAY_SHORT[CLINIC_WEEKDAY_KEYS[d.getDay()]];
                const dayLabel = `${d.getDate()} ${CLINIC_MONTH_NAMES[d.getMonth()].slice(0, 3)}`;

                const dateCell = document.createElement('div');
                dateCell.className = 'pro-avail-date';
                dateCell.innerHTML = sameDay ? '' : `<span>${escapeHtml(weekday)}</span><strong>${d.getDate()}</strong>`;
                if (row.date === todayKey && !sameDay) dateCell.classList.add('is-today');

                const hoursCell = document.createElement('div');
                hoursCell.className = 'pro-avail-hours';
                const startSel = document.createElement('select');
                startSel.className = 'pro-input pro-input-sm';
                fillTimeSelect(startSel, row.start);
                startSel.setAttribute('aria-label', `Início, ${dayLabel}`);
                const sep = document.createElement('span');
                sep.className = 'pro-avail-sep';
                sep.textContent = '–';
                const endSel = document.createElement('select');
                endSel.className = 'pro-input pro-input-sm';
                fillTimeSelect(endSel, row.end);
                endSel.setAttribute('aria-label', `Fim, ${dayLabel}`);
                const onEdit = () => {
                    const start = startSel.value;
                    const end = endSel.value;
                    if (clinicTimeToMinutes(end) <= clinicTimeToMinutes(start)) {
                        li.classList.add('is-invalid');
                        setMessage(clinicAvailError, `${dayLabel}: a hora de fim tem de ser depois da hora de início.`);
                        clinicAvailError.scrollIntoView({ block: 'nearest' });
                        return;
                    }
                    li.classList.remove('is-invalid');
                    setMessage(clinicAvailError, '');
                    setClinicDayRows((clinicScheduleData.dayOverrides || []).map((item) =>
                        clinicRowKey(item) === key ? { ...item, start, end } : item
                    ));
                    renderClinicAvailRows();
                    markClinicScheduleDirty();
                };
                startSel.addEventListener('change', onEdit);
                endSel.addEventListener('change', onEdit);
                hoursCell.append(startSel, sep, endSel);

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'pro-icon-btn';
                removeBtn.setAttribute('aria-label', `Remover ${dayLabel}, ${row.start}–${row.end}`);
                removeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
                removeBtn.addEventListener('click', () => {
                    setClinicDayRows((clinicScheduleData.dayOverrides || []).filter((item) => clinicRowKey(item) !== key));
                    renderClinicAvailRows();
                    markClinicScheduleDirty();
                });

                li.append(dateCell, hoursCell, removeBtn);
                ul.appendChild(li);
            });
            section.appendChild(ul);
            clinicAvailRows.appendChild(section);
        });
    }

    let clinicSaveState = 'idle';
    function setSaveState(state) {
        clinicSaveState = state;
        renderSaveState();
        if (state === 'saved') {
            setTimeout(() => {
                if (clinicSaveState === 'saved') setSaveState('idle');
            }, 2500);
        }
    }

    function renderSaveState() {
        if (!clinicAvailSaveState) return;
        const labels = {
            dirty: 'Alterações por guardar',
            saving: 'A guardar…',
            saved: 'Guardado',
            error: 'Sem ligação — a tentar de novo'
        };
        const label = labels[clinicSaveState];
        clinicAvailSaveState.hidden = !label || activeClinicPanel !== 'availability';
        clinicAvailSaveState.dataset.state = clinicSaveState;
        clinicAvailSaveState.textContent = label || '';
    }

    function markClinicScheduleDirty() {
        clinicScheduleDirty = true;
        setSaveState('dirty');
        renderHome();
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
        if (clinicScheduleDirty || clinicAvailSaveInFlight) return;
        fillClinicAvailMonthOptions();
        try {
            const res = await fetch('/api/clinic/schedule', { credentials: 'same-origin' });
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load schedule');
            const schedule = await res.json();
            if (clinicScheduleDirty) return;
            clinicScheduleData = {
                slotDuration: schedule.slotDuration || 30,
                weekly: schedule.weekly || {},
                dayOverrides: normalizeClinicDayRows(schedule.dayOverrides),
                timezone: schedule.timezone || 'Europe/Lisbon'
            };
            renderClinicAvailRows();
            renderClinicAvailPreview();
            renderHome();
        } catch (err) {
            console.error('Failed to load schedule view:', err);
            if (clinicScheduleData) return;
            if (clinicAvailRows) {
                clinicAvailRows.innerHTML = '<p class="pro-empty">Não foi possível carregar a disponibilidade. Atualize a página.</p>';
            }
        }
    }

    function clinicDayOverridesPayload() {
        return ((clinicScheduleData && clinicScheduleData.dayOverrides) || [])
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
        setSaveState('saving');
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
                setSaveState('saved');
            }
            clinicAvailSaveAttempts = 0;
            return true;
        } catch (err) {
            console.error('Failed to save availability:', err);
            setSaveState('error');
            if (!quiet) {
                toast('Não foi possível guardar a disponibilidade.', 'error');
            } else if (clinicAvailSaveAttempts < 3) {
                clinicAvailSaveAttempts += 1;
                clinicAvailSaveTimer = setTimeout(() => {
                    clinicAvailSaveTimer = null;
                    void saveClinicAvailability({ quiet: true });
                }, 2000);
            } else {
                toast('Não foi possível guardar a disponibilidade. Verifique a ligação.', 'error');
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
            setMessage(clinicAvailError, '');
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
    document.querySelectorAll('[data-clinic-logout]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            flushClinicAvailabilityBeacon();
            try {
                await fetch('/api/clinic/logout', { method: 'POST', credentials: 'same-origin' });
            } catch (err) {
                console.error('Logout error:', err);
            }
            clinicBookings = null;
            clinicScheduleData = null;
            showLogin();
        });
    });

    // ─── Bookings ───
    function parseBookingDate(booking) {
        const isoSource = String((booking && (booking.dateIso || booking.date)) || '').trim();
        const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoSource);
        if (isoMatch) {
            return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 12, 0, 0, 0);
        }
        const text = String((booking && booking.date) || '').trim();
        const months = {
            janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3, maio: 4, junho: 5,
            julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
            january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
            july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
            enero: 0, febrero: 1, marzo: 2, mayo: 4, junio: 5,
            julio: 6, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
        };
        const written = /(\d{1,2})\s+de\s+([a-záéíóúãõç]+)\s+de\s+(\d{4})/i.exec(text);
        if (written) {
            const month = months[written[2].toLowerCase()];
            if (month !== undefined) {
                return new Date(Number(written[3]), month, Number(written[1]), 12, 0, 0, 0);
            }
        }
        const parsed = new Date(text);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    function prepareBooking(booking) {
        const day = parseBookingDate(booking);
        const dayKey = day ? dateKeyOf(day) : '';
        const time = /^\d{1,2}:\d{2}/.test(String(booking.time || '')) ? String(booking.time).slice(0, 5).padStart(5, '0') : '';
        let startsAt = null;
        if (day) {
            startsAt = new Date(day);
            const minutes = clinicTimeToMinutes(time);
            if (minutes != null) startsAt.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
            else startsAt.setHours(0, 0, 0, 0);
        }
        return { ...booking, dayKey, time, startsAt };
    }

    function bookingStatus(b, now) {
        if (b.cancelled) return 'cancelled';
        if (!b.startsAt) return 'upcoming';
        const ends = new Date(b.startsAt);
        if (b.time) ends.setMinutes(ends.getMinutes() + 60);
        else ends.setHours(23, 59, 59, 999);
        return ends < now ? 'past' : 'upcoming';
    }

    const STATUS_LABELS = { upcoming: 'Agendada', past: 'Realizada', cancelled: 'Cancelada' };

    function bookingPatientLabel(b) {
        const name = b.patientName || b.email || 'Paciente sem nome';
        return b.travellerCount > 1 ? `${name} +${b.travellerCount - 1}` : name;
    }

    function bookingRowHtml(b, { showDate } = {}) {
        const status = b.status;
        const chips = [];
        if (status === 'cancelled') {
            chips.push('<span class="pro-chip pro-chip-danger">Cancelada</span>');
        } else if (status === 'past') {
            chips.push(b.hasClinicalNotes
                ? '<span class="pro-chip">Notas registadas</span>'
                : '<span class="pro-chip pro-chip-warn">Sem notas</span>');
        } else {
            chips.push(b.hasPatientIntake
                ? '<span class="pro-chip pro-chip-ok">Ficha preenchida</span>'
                : '<span class="pro-chip pro-chip-warn">Ficha em falta</span>');
            if (b.hasClinicalNotes) chips.push('<span class="pro-chip">Notas registadas</span>');
        }
        const when = showDate
            ? `<span class="pro-booking-day">${escapeHtml(b.dayKey ? dayHeading(b.dayKey) : (b.date || '—'))}</span>`
            : '';
        return `
            <button type="button" class="pro-booking${status === 'cancelled' ? ' is-cancelled' : ''}" data-booking-ref="${escapeHtml(b.bookingRef || '')}">
                <span class="pro-booking-time">${when}<strong>${escapeHtml(b.time || '—')}</strong></span>
                <span class="pro-booking-main">
                    <strong class="pro-booking-name">${escapeHtml(bookingPatientLabel(b))}</strong>
                    <span class="pro-booking-service">${escapeHtml(serviceLabel(b.service))}</span>
                    <span class="pro-booking-chips">${chips.join('')}</span>
                </span>
                <span class="pro-booking-ref">${escapeHtml(b.bookingRef || '')}</span>
                <svg class="pro-booking-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
            </button>`;
    }

    async function loadBookings() {
        try {
            const res = await fetch('/api/clinic/bookings', { credentials: 'same-origin' });
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load bookings');
            const data = await res.json();
            const now = new Date();
            clinicBookings = (Array.isArray(data.bookings) ? data.bookings : []).map((raw) => {
                const b = prepareBooking(raw);
                b.status = bookingStatus(b, now);
                return b;
            });
            renderBookingViews();
        } catch (err) {
            console.error('Failed to load bookings:', err);
            if (!clinicBookings) {
                const msg = '<p class="pro-empty">Não foi possível carregar as marcações. Tente atualizar.</p>';
                if (clinicBookingList) clinicBookingList.innerHTML = msg;
                if (clinicHomeUpcoming) clinicHomeUpcoming.innerHTML = msg;
            }
        }
    }

    function sortByStart(list, dir) {
        return list.slice().sort((a, b) => {
            const ta = a.startsAt ? a.startsAt.getTime() : Infinity;
            const tb = b.startsAt ? b.startsAt.getTime() : Infinity;
            return dir * (ta - tb);
        });
    }

    function renderBookingViews() {
        renderBookingList();
        renderHome();
    }

    function renderBookingList() {
        if (!clinicBookingList || !clinicBookings) return;
        const counts = { upcoming: 0, past: 0, cancelled: 0 };
        clinicBookings.forEach((b) => { counts[b.status] += 1; });
        document.querySelectorAll('[data-clinic-count]').forEach((el) => {
            const n = counts[el.getAttribute('data-clinic-count')] || 0;
            el.textContent = n ? String(n) : '';
        });
        document.querySelectorAll('[data-clinic-filter]').forEach((btn) => {
            const on = btn.getAttribute('data-clinic-filter') === clinicBookingFilter;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });

        const q = String((clinicBookingSearch && clinicBookingSearch.value) || '').trim().toLowerCase();
        let list = clinicBookings.filter((b) => b.status === clinicBookingFilter);
        if (q) {
            list = list.filter((b) => [b.patientName, b.email, b.bookingRef, serviceLabel(b.service)]
                .some((v) => String(v || '').toLowerCase().includes(q)));
        }
        list = sortByStart(list, clinicBookingFilter === 'upcoming' ? 1 : -1);

        if (!list.length) {
            const empty = q
                ? { title: 'Sem resultados', text: `Nenhuma marcação corresponde a “${q}”.` }
                : {
                    upcoming: { title: 'Sem consultas agendadas', text: 'Quando um paciente marcar consigo, a consulta aparece aqui.' },
                    past: { title: 'Ainda sem consultas realizadas', text: 'As consultas passam para aqui depois de acontecerem.' },
                    cancelled: { title: 'Nenhuma consulta cancelada', text: '' }
                }[clinicBookingFilter];
            clinicBookingList.innerHTML = `
                <div class="pro-empty-state">
                    <strong>${escapeHtml(empty.title)}</strong>
                    ${empty.text ? `<p>${escapeHtml(empty.text)}</p>` : ''}
                </div>`;
            return;
        }

        const groups = [];
        list.forEach((b) => {
            const key = b.dayKey || 'sem-data';
            let group = groups[groups.length - 1];
            if (!group || group.key !== key) {
                group = { key, items: [] };
                groups.push(group);
            }
            group.items.push(b);
        });
        clinicBookingList.innerHTML = groups.map((g) => `
            <section class="pro-day">
                <h3 class="pro-day-title${g.key === clinicTodayKey() ? ' is-today' : ''}">
                    ${escapeHtml(g.key === 'sem-data' ? 'Sem data' : dayHeading(g.key))}
                    <span>${g.items.length} ${g.items.length === 1 ? 'consulta' : 'consultas'}</span>
                </h3>
                <div class="pro-booking-list">${g.items.map((b) => bookingRowHtml(b)).join('')}</div>
            </section>`).join('');
    }

    function renderHome() {
        if (!clinicHomeUpcoming) return;
        const todayKey = clinicTodayKey();
        const weekEnd = addDaysKey(todayKey, 6);

        if (clinicBookings) {
            const active = clinicBookings.filter((b) => b.status !== 'cancelled');
            const today = active.filter((b) => b.dayKey === todayKey).length;
            const week = active.filter((b) => b.status === 'upcoming' && b.dayKey && b.dayKey <= weekEnd).length;
            clinicStatToday.textContent = String(today);
            clinicStatWeek.textContent = String(week);

            const upcoming = sortByStart(active.filter((b) => b.status === 'upcoming'), 1).slice(0, 5);
            clinicHomeUpcoming.innerHTML = upcoming.length
                ? upcoming.map((b) => bookingRowHtml(b, { showDate: true })).join('')
                : `<div class="pro-empty-state">
                        <strong>Sem consultas agendadas</strong>
                        <p>Mantenha a disponibilidade atualizada para os pacientes poderem marcar.</p>
                   </div>`;
        }

        if (clinicScheduleData) {
            const rows = upcomingAvailRows();
            const days = new Set(rows.map((r) => r.date));
            clinicStatAvail.textContent = String(days.size);
            const last = rows.length ? rows[rows.length - 1].date : '';
            clinicStatAvailHint.textContent = last
                ? `${days.size === 1 ? 'dia' : 'dias'} até ${dateFromKey(last).getDate()} ${CLINIC_MONTH_NAMES[dateFromKey(last).getMonth()].slice(0, 3)}`
                : 'dias com horário';

            const now = new Date();
            const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const nextKey = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`;
            const hasNext = rows.some((r) => r.date.startsWith(nextKey));
            let nudge = null;
            if (!rows.length) {
                nudge = {
                    title: 'Não tem horários disponíveis',
                    text: 'Enquanto não indicar disponibilidade, os pacientes não conseguem marcar consigo.'
                };
            } else if (!hasNext && now.getDate() >= 10) {
                nudge = {
                    title: `Falta a disponibilidade de ${CLINIC_MONTH_NAMES[next.getMonth()]}`,
                    text: 'Indique os seus horários para o próximo mês para a agenda abrir a tempo.'
                };
            }
            clinicAvailNudge.hidden = !nudge;
            if (nudge) {
                clinicAvailNudgeTitle.textContent = nudge.title;
                clinicAvailNudgeText.textContent = nudge.text;
            }
        }
    }

    if (clinicRefreshBtn) {
        clinicRefreshBtn.addEventListener('click', async () => {
            clinicRefreshBtn.disabled = true;
            await loadBookings();
            clinicRefreshBtn.disabled = false;
        });
    }
    document.querySelectorAll('[data-clinic-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
            clinicBookingFilter = btn.getAttribute('data-clinic-filter');
            renderBookingList();
        });
    });
    if (clinicBookingSearch) clinicBookingSearch.addEventListener('input', renderBookingList);
    document.addEventListener('click', (e) => {
        const row = e.target.closest('.pro-booking[data-booking-ref]');
        if (row) {
            const ref = row.getAttribute('data-booking-ref');
            if (ref) openBookingSheet(ref, row);
            return;
        }
        const go = e.target.closest('[data-clinic-go]');
        if (go) setClinicPanel(go.getAttribute('data-clinic-go'));
    });

    // ─── Consultation sheet ───
    function openSheet() {
        consultationModal.hidden = false;
        document.body.classList.add('pro-sheet-open');
        requestAnimationFrame(() => consultationModal.classList.add('is-open'));
        const close = consultationModal.querySelector('.pro-sheet-head [data-clinic-sheet-close]');
        if (close) close.focus();
    }

    function closeSheet() {
        if (!consultationModal || consultationModal.hidden) return;
        consultationModal.classList.remove('is-open');
        consultationModal.hidden = true;
        document.body.classList.remove('pro-sheet-open');
        if (sheetReturnFocus && document.contains(sheetReturnFocus)) sheetReturnFocus.focus();
        sheetReturnFocus = null;
    }

    consultationModal.querySelectorAll('[data-clinic-sheet-close]').forEach((el) => el.addEventListener('click', closeSheet));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSheet();
    });

    function detailItem(label, valueHtml) {
        if (!valueHtml) return '';
        return `<div class="pro-detail"><dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd></div>`;
    }

    function formatEuros(cents) {
        const n = Number(cents);
        if (!Number.isFinite(n)) return '';
        const euros = n / 100;
        return `${euros.toLocaleString('pt-PT', { minimumFractionDigits: euros % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
    }

    function formatStamp(value) {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function intakeHtml(booking) {
        const intake = booking.patientIntake || booking.intake;
        if (!intake || !(intake.concerns || intake.dob || intake.allergies || intake.medications)) {
            return '<p class="pro-muted">O paciente ainda não preencheu a ficha clínica.</p>';
        }
        const text = (v) => (v ? escapeHtml(v).replace(/\n/g, '<br>') : '');
        return `<dl class="pro-details">
            ${detailItem('Motivo da consulta', text(intake.concerns))}
            ${detailItem('Data de nascimento', text(intake.dob))}
            ${detailItem('País', text(intake.country))}
            ${detailItem('Medicação', text(intake.medications))}
            ${detailItem('Alergias', text(intake.allergies))}
            ${detailItem('Nº de utente (SNS)', text(intake.nhs))}
        </dl>`;
    }

    async function openBookingSheet(bookingRef, trigger) {
        sheetReturnFocus = trigger || document.activeElement;
        modalKicker.textContent = '';
        modalTitle.textContent = 'A carregar…';
        modalBody.innerHTML = '<p class="pro-empty">A carregar a consulta…</p>';
        openSheet();
        try {
            const res = await fetch(`/api/clinic/booking/${encodeURIComponent(bookingRef)}`, { credentials: 'same-origin' });
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) {
                modalTitle.textContent = 'Consulta indisponível';
                modalBody.innerHTML = '<p class="pro-empty">Esta consulta não está atribuída a si ou já não existe.</p>';
                return;
            }
            renderBookingSheet(prepareBooking(await res.json()));
        } catch (err) {
            console.error('Failed to load consultation:', err);
            modalTitle.textContent = 'Erro';
            modalBody.innerHTML = '<p class="pro-empty">Não foi possível carregar a consulta. Tente de novo.</p>';
        }
    }

    function renderBookingSheet(booking) {
        const status = bookingStatus(booking, new Date());
        const notes = booking.clinicalNotes || null;
        const when = booking.dayKey
            ? `${DAY_LONG.format(dateFromKey(booking.dayKey))}${booking.time ? `, ${booking.time}` : ''}`
            : [booking.date, booking.time].filter(Boolean).join(', ');
        const noteDate = (notes && /^\d{4}-\d{2}-\d{2}$/.test(String(notes.consultationDate || '')) && notes.consultationDate) || booking.dayKey || '';
        const field = (id, label, rows, value, placeholder) => `
            <label class="pro-field">
                <span>${label}</span>
                <textarea id="${id}" class="pro-input" rows="${rows}" placeholder="${placeholder}">${escapeHtml(value || '')}</textarea>
            </label>`;

        modalKicker.textContent = serviceLabel(booking.service);
        modalTitle.textContent = bookingPatientLabel(booking);
        modalBody.innerHTML = `
            <div class="pro-sheet-summary">
                <span class="pro-chip pro-chip-${status === 'cancelled' ? 'danger' : (status === 'past' ? 'muted' : 'ok')}">${STATUS_LABELS[status]}</span>
                <span>${escapeHtml(when || '—')}</span>
            </div>

            <section class="pro-sheet-section">
                <h3>Marcação</h3>
                <dl class="pro-details">
                    ${detailItem('Email', booking.email ? `<a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a>` : '—')}
                    ${detailItem('Referência', `<span class="pro-mono">${escapeHtml(booking.bookingRef || '—')}</span>`)}
                    ${booking.travellerCount > 1 ? detailItem('Viajantes', escapeHtml(booking.travellerCount)) : ''}
                    ${booking.amount != null ? detailItem('Valor pago', escapeHtml(formatEuros(booking.amount))) : ''}
                </dl>
            </section>

            <section class="pro-sheet-section">
                <h3>Ficha clínica do paciente</h3>
                ${intakeHtml(booking)}
            </section>

            <section class="pro-sheet-section">
                <h3>Notas clínicas</h3>
                ${notes ? `<p class="pro-muted pro-small">Última alteração ${escapeHtml(formatStamp(notes.updatedAt || notes.createdAt))}${notes.createdBy ? ` · ${escapeHtml(notes.createdBy)}` : ''}</p>` : ''}
                <form id="clinicalNotesForm" class="pro-form">
                    <div class="pro-form-row">
                        <label class="pro-field">
                            <span>Data da consulta</span>
                            <input type="date" id="consultationDate" class="pro-input" value="${escapeHtml(noteDate)}" required>
                        </label>
                        <label class="pro-field">
                            <span>Registado por</span>
                            <input type="text" id="createdBy" class="pro-input" value="${escapeHtml((notes && notes.createdBy) || staffDisplayName)}">
                        </label>
                    </div>
                    ${field('clinicalNotes', 'Notas da consulta', 6, notes && notes.notes, 'Observações, história clínica, achados…')}
                    ${field('diagnosis', 'Diagnóstico / avaliação', 3, notes && notes.diagnosis, '')}
                    ${field('prescriptions', 'Prescrições e recomendações', 3, notes && notes.prescriptions, '')}
                    ${field('followUp', 'Plano de seguimento', 3, notes && notes.followUp, 'Próximos passos, reavaliação…')}
                    <p class="pro-error" id="clinicNotesError" role="alert" hidden></p>
                    <div class="pro-form-actions pro-sheet-actions">
                        ${notes ? '<button type="button" class="pro-btn pro-btn-ghost" id="exportPdfBtn">Exportar PDF</button>' : ''}
                        <button type="submit" class="pro-btn pro-btn-primary" id="saveNotesBtn">Guardar notas</button>
                    </div>
                </form>
            </section>`;

        document.getElementById('clinicalNotesForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveClinicalNotes(booking.bookingRef);
        });
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => exportClinicalNotesToPDF(booking, notes));
    }

    async function saveClinicalNotes(bookingRef) {
        const val = (id) => document.getElementById(id).value;
        const errorEl = document.getElementById('clinicNotesError');
        const btn = document.getElementById('saveNotesBtn');
        setMessage(errorEl, '');
        btn.disabled = true;
        btn.textContent = 'A guardar…';
        try {
            const res = await fetch('/api/clinic/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    bookingRef,
                    consultationDate: val('consultationDate'),
                    notes: val('clinicalNotes'),
                    diagnosis: val('diagnosis'),
                    prescriptions: val('prescriptions'),
                    followUp: val('followUp'),
                    createdBy: val('createdBy') || staffDisplayName
                })
            });
            if (res.status === 401) {
                showLogin();
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save notes');
            closeSheet();
            toast('Notas guardadas');
            loadBookings();
        } catch (err) {
            console.error('Failed to save clinical notes:', err);
            setMessage(errorEl, 'Não foi possível guardar as notas. O texto continua aqui — tente de novo.');
            btn.disabled = false;
            btn.textContent = 'Guardar notas';
        }
    }

    // ─── Profile ───
    function isValidClinicEmail(raw) {
        const email = String(raw || '').trim().toLowerCase();
        return email.length >= 5 && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setClinicProfilePhoto(hasPhoto) {
        staffHasPhoto = !!hasPhoto;
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
        if (clinicProfilePhotoBtn) clinicProfilePhotoBtn.textContent = hasPhoto ? 'Mudar foto' : 'Adicionar foto';
        renderAvatars();
    }

    async function loadClinicIdentity() {
        try {
            const res = await fetch('/api/clinic/me', { cache: 'no-store', credentials: 'same-origin' });
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load profile');
            const data = await res.json();
            if (clinicFullName && document.activeElement !== clinicFullName) clinicFullName.value = data.fullName || '';
            if (clinicProfileEmail && document.activeElement !== clinicProfileEmail) clinicProfileEmail.value = data.email || '';
            if (data.fullName) staffDisplayName = data.fullName;
            staffEmail = data.email || '';
            setClinicProfilePhoto(!!data.hasPhoto);
            renderIdentity();
        } catch (err) {
            console.error('Failed to load clinic identity:', err);
            setMessage(clinicProfileFormError, 'Não foi possível carregar o perfil.');
        }
    }

    if (clinicProfileForm) {
        clinicProfileForm.addEventListener('input', () => { if (clinicProfileSaveConfirm) clinicProfileSaveConfirm.hidden = true; });
        clinicProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setMessage(clinicProfileFormError, '');
            if (clinicProfileSaveConfirm) clinicProfileSaveConfirm.hidden = true;
            const fullName = String(clinicFullName.value || '').trim();
            const email = String(clinicProfileEmail.value || '').trim();
            if (!fullName) {
                setMessage(clinicProfileFormError, 'Introduza o nome.');
                clinicFullName.focus();
                return;
            }
            if (clinicRole !== 'admin' && !email) {
                setMessage(clinicProfileFormError, 'Introduza o email.');
                clinicProfileEmail.focus();
                return;
            }
            if (email && !isValidClinicEmail(email)) {
                setMessage(clinicProfileFormError, 'Introduza um email completo, por exemplo nome@gmail.com.');
                clinicProfileEmail.focus();
                return;
            }
            clinicProfileSaveBtn.disabled = true;
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
                if (!res.ok) throw new Error(data.error || 'Não foi possível guardar o perfil.');
                staffDisplayName = data.fullName || fullName;
                staffEmail = data.email || email;
                clinicFullName.value = staffDisplayName;
                clinicProfileEmail.value = staffEmail;
                renderIdentity();
                if (clinicProfileSaveConfirm) clinicProfileSaveConfirm.hidden = false;
            } catch (err) {
                setMessage(clinicProfileFormError, err.message || 'Não foi possível guardar o perfil.');
            } finally {
                clinicProfileSaveBtn.disabled = false;
            }
        });
    }

    if (clinicProfilePhotoInput) {
        clinicProfilePhotoInput.addEventListener('change', async () => {
            setMessage(clinicPhotoError, '');
            const file = clinicProfilePhotoInput.files && clinicProfilePhotoInput.files[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) {
                setMessage(clinicPhotoError, 'A foto tem mais de 4 MB. Escolha uma imagem mais pequena.');
                clinicProfilePhotoInput.value = '';
                return;
            }
            const form = new FormData();
            form.append('photo', file);
            if (clinicProfilePhotoBtn) clinicProfilePhotoBtn.textContent = 'A enviar…';
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
                if (!res.ok) throw new Error(data.error || 'Não foi possível enviar a foto.');
                setClinicProfilePhoto(true);
                toast('Foto atualizada');
            } catch (err) {
                setMessage(clinicPhotoError, err.message || 'Não foi possível enviar a foto.');
                setClinicProfilePhoto(staffHasPhoto);
            } finally {
                clinicProfilePhotoInput.value = '';
            }
        });
    }

    // ─── Navigation ───
    document.querySelectorAll('[data-clinic-panel]').forEach((btn) => {
        btn.addEventListener('click', () => setClinicPanel(btn.getAttribute('data-clinic-panel')));
    });
    window.addEventListener('popstate', () => {
        if (!clinicContent.hidden) setClinicPanel(initialClinicPanel(), { replace: true });
    });

    // ─── Export clinical notes to PDF ───
    function exportClinicalNotesToPDF(booking, notes) {
        if (typeof window.jspdf === 'undefined') {
            toast('Não foi possível gerar o PDF. Atualize a página e tente de novo.', 'error');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const width = pageWidth - 2 * margin;
        let y = margin;

        const ensure = (h) => {
            if (y + h > pageHeight - 25) {
                doc.addPage();
                y = margin;
            }
        };
        const line = (text, { size = 10, style = 'normal', gap = 6 } = {}) => {
            doc.setFontSize(size);
            doc.setFont(undefined, style);
            doc.splitTextToSize(String(text), width).forEach((l) => {
                ensure(gap);
                doc.text(l, margin, y);
                y += gap;
            });
        };
        const block = (title, text) => {
            if (!text) return;
            y += 2;
            line(title, { style: 'bold' });
            line(text, { gap: 5 });
            y += 3;
        };

        line('Registo de consulta', { size: 18, style: 'bold', gap: 10 });
        line('Marcação', { size: 12, style: 'bold', gap: 8 });
        line(`Referência: ${booking.bookingRef || '—'}`);
        line(`Serviço: ${serviceLabel(booking.service)}`);
        line(`Data e hora: ${[booking.date, booking.time].filter(Boolean).join(', ') || '—'}`);
        line(`Paciente: ${booking.patientName || '—'}`);
        line(`Email: ${booking.email || '—'}`);
        if (booking.travellerCount > 1) line(`Viajantes: ${booking.travellerCount}`);
        y += 5;

        if (notes) {
            line('Notas clínicas', { size: 12, style: 'bold', gap: 8 });
            if (notes.consultationDate) line(`Data da consulta: ${notes.consultationDate}`);
            block('Notas da consulta', notes.notes);
            block('Diagnóstico / avaliação', notes.diagnosis);
            block('Prescrições e recomendações', notes.prescriptions);
            block('Plano de seguimento', notes.followUp);
            y += 4;
            line(`Registado por: ${notes.createdBy || '—'}`, { size: 8, style: 'italic', gap: 4 });
            if (notes.createdAt) line(`Criado: ${formatStamp(notes.createdAt)}`, { size: 8, style: 'italic', gap: 4 });
            if (notes.updatedAt) line(`Última alteração: ${formatStamp(notes.updatedAt)}`, { size: 8, style: 'italic', gap: 4 });
        } else {
            line('Ainda sem notas clínicas registadas.', { style: 'italic' });
        }

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.text('Atividade registada na Entidade Reguladora da Saúde', margin, pageHeight - 15);
            doc.text(`© ${new Date().getFullYear()} Lon Clinic. Registo clínico confidencial.`, margin, pageHeight - 10);
        }
        doc.save(`Notas_clinicas_${booking.bookingRef || 'consulta'}_${clinicTodayKey()}.pdf`);
    }

    // ─── Initial load ───
    checkAuthStatus();
});
