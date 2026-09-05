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
        renovacao: 'Renovação receita'
    };

    // ─── DOM Elements ───
    const clinicLogin = document.getElementById('clinicLogin');
    const clinicContent = document.getElementById('clinicContent');
    const clinicLoginForm = document.getElementById('clinicLoginForm');
    const clinicUsername = document.getElementById('clinicUsername');
    const clinicPassword = document.getElementById('clinicPassword');
    const loginError = document.getElementById('loginError');
    const clinicLogoutBtn = document.getElementById('clinicLogoutBtn');
    const clinicGreeting = document.getElementById('clinicGreeting');
    const clinicUserInfo = document.getElementById('clinicUserInfo');
    
    const clinicTable = document.getElementById('clinicTable');
    const clinicTableBody = document.getElementById('clinicTableBody');
    const clinicEmpty = document.getElementById('clinicEmpty');
    const refreshBtn = document.getElementById('refreshBtn');
    const smartSlotGroupingToggle = document.getElementById('smartSlotGroupingToggle');
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
    const clinicHoursList = document.getElementById('clinicHoursList');
    const clinicTimezoneLabel = document.getElementById('clinicTimezoneLabel');
    const clinicSlotDurationLabel = document.getElementById('clinicSlotDurationLabel');
    const clinicBlockedDatesList = document.getElementById('clinicBlockedDatesList');
    const clinicBookingsEmpty = document.getElementById('clinicBookingsEmpty');
    const clinicBookingsTable = document.getElementById('clinicBookingsTable');
    const clinicBookingsBody = document.getElementById('clinicBookingsBody');
    const clinicPatientsEmpty = document.getElementById('clinicPatientsEmpty');
    const clinicPatientsTable = document.getElementById('clinicPatientsTable');
    const clinicPatientsBody = document.getElementById('clinicPatientsBody');
    const clinicManagementAdminLinks = document.getElementById('clinicManagementAdminLinks');
    const clinicManagementClinicianNote = document.getElementById('clinicManagementClinicianNote');
    const clinicProfileName = document.getElementById('clinicProfileName');
    const clinicProfileUsername = document.getElementById('clinicProfileUsername');
    const clinicProfileRole = document.getElementById('clinicProfileRole');
    const clinicProfileDoxy = document.getElementById('clinicProfileDoxy');
    const clinicProfession = document.getElementById('clinicProfession');
    const clinicOrdemLabel = document.getElementById('clinicOrdemLabel');
    const clinicOrdemNumber = document.getElementById('clinicOrdemNumber');
    const clinicBio = document.getElementById('clinicBio');
    const clinicPrimaryArea = document.getElementById('clinicPrimaryArea');
    const clinicSecondaryArea = document.getElementById('clinicSecondaryArea');
    const clinicProfileForm = document.getElementById('clinicProfileForm');
    const clinicProfileFormError = document.getElementById('clinicProfileFormError');
    const clinicProfileSaveBtn = document.getElementById('clinicProfileSaveBtn');
    const clinicDocsBody = document.getElementById('clinicDocsBody');
    const clinicDocsError = document.getElementById('clinicDocsError');

    const CLINIC_PANEL_META = {
        consultations: { title: 'Consultations', subtitle: 'Clinical notes for every consultation' },
        availabilities: { title: 'Availabilities', subtitle: 'Weekly hours, slots, and blocked dates' },
        bookings: { title: 'Bookings', subtitle: 'Upcoming confirmed appointments' },
        patients: { title: 'Patients', subtitle: 'People attached to your consultations' },
        resources: { title: 'Resources', subtitle: 'Video room and everyday clinic links' },
        management: { title: 'Management', subtitle: 'Clinic-wide settings and admin tools' },
        profile: { title: 'Profile', subtitle: 'Ordem, bio, clinical areas and documents' }
    };

    const WEEKDAYS = [
        ['monday', 'Monday'],
        ['tuesday', 'Tuesday'],
        ['wednesday', 'Wednesday'],
        ['thursday', 'Thursday'],
        ['friday', 'Friday'],
        ['saturday', 'Saturday'],
        ['sunday', 'Sunday']
    ];

    let clinicRole = 'admin';
    let staffUsername = '';
    let staffDisplayName = '';
    let clinicDoxyPatientUrl = '';
    let activeClinicPanel = 'consultations';
    let bookingsCache = [];

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
        closeClinicSidebar();

        if (panelId === 'consultations' || panelId === 'bookings' || panelId === 'patients') {
            loadBookings();
        }
        if (panelId === 'availabilities') loadScheduleView();
        if (panelId === 'resources' || panelId === 'profile') loadDoxyRoom();
        if (panelId === 'profile') loadClinicProfile();
    }

    // ─── Show Login ───
    function showLogin() {
        document.body.classList.remove('clinic-logged-in');
        clinicLogin.style.display = '';
        clinicContent.style.display = 'none';
        closeClinicSidebar();
    }

    // ─── Show Clinic Portal ───
    function showClinicPortal(username, role, loginUsername) {
        clinicLogin.style.display = 'none';
        clinicContent.style.display = 'flex';
        document.body.classList.add('clinic-logged-in');
        clinicRole = role || 'admin';
        staffDisplayName = username || loginUsername || '';
        staffUsername = loginUsername || username || '';
        const isAdmin = clinicRole === 'admin';

        if (clinicSidebarUser) {
            clinicSidebarUser.textContent = staffDisplayName || 'Portal';
        }
        if (clinicManagementAdminLinks) {
            clinicManagementAdminLinks.hidden = !isAdmin;
        }
        if (clinicManagementClinicianNote) {
            clinicManagementClinicianNote.hidden = isAdmin;
        }
        if (clinicProfileName) clinicProfileName.textContent = staffDisplayName || '—';
        if (clinicProfileUsername) clinicProfileUsername.textContent = staffUsername || '—';
        if (clinicProfileRole) {
            clinicProfileRole.textContent = isAdmin ? 'Clinic administrator' : 'Clinician';
        }
        if (smartSlotGroupingToggle) {
            smartSlotGroupingToggle.disabled = !isAdmin;
        }

        setClinicPanel('consultations');
        loadDoxyRoom();
        loadScheduleView();
    }

    async function loadDoxyRoom() {
        if (!clinicDoxyRoomUrl || !clinicOpenDoxyBtn) return;
        try {
            const res = await fetch('/api/clinic/doxy');
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load Doxy room');
            const data = await res.json();
            clinicDoxyPatientUrl = data.patientRoomUrl || '';
            clinicOpenDoxyBtn.href = data.providerUrl || 'https://doxy.me';
            if (clinicDoxySubtitle) {
                clinicDoxySubtitle.textContent = data.displayName
                    ? `Open Doxy.me to admit patients waiting for ${data.displayName}`
                    : 'Open Doxy.me to admit patients from the waiting room';
            }
            if (clinicDoxyPatientUrl) {
                clinicDoxyRoomUrl.textContent = clinicDoxyPatientUrl;
                if (clinicProfileDoxy) clinicProfileDoxy.textContent = clinicDoxyPatientUrl;
                if (clinicDoxyHint) {
                    clinicDoxyHint.textContent = 'This is the link patients receive. Sign in to Doxy.me with your Doxy account (separate from Lon Clinic) to see the waiting room and start the call.';
                }
                if (clinicCopyDoxyBtn) clinicCopyDoxyBtn.disabled = false;
            } else {
                clinicDoxyRoomUrl.textContent = 'Not configured yet';
                if (clinicProfileDoxy) clinicProfileDoxy.textContent = 'Not configured yet';
                if (clinicDoxyHint) {
                    clinicDoxyHint.textContent = clinicRole === 'admin'
                        ? 'Set DOXY_ROOM_URL (e.g. https://doxy.me/lonclinic/ritaaguiar) or add a room for each professional in Admin → Professionals.'
                        : 'Ask an administrator to add your Doxy.me room URL to your professional account.';
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

    async function loadScheduleView() {
        if (!clinicHoursList) return;
        try {
            const res = await fetch('/api/schedule');
            if (!res.ok) throw new Error('Failed to load schedule');
            const schedule = await res.json();
            const hours = schedule.workingHours || {};
            const tz = schedule.timezone || 'Europe/Lisbon';
            if (clinicTimezoneLabel) {
                clinicTimezoneLabel.textContent = `Clinic booking hours in ${tz}`;
            }
            clinicHoursList.innerHTML = WEEKDAYS.map(([key, label]) => {
                const day = hours[key] || { enabled: false, start: '07:00', end: '17:00' };
                const open = !!day.enabled;
                const range = open ? `${day.start || '07:00'} – ${day.end || '17:00'}` : 'Closed';
                return `<div class="clinic-hours-row${open ? '' : ' is-off'}"><span>${label}</span><strong>${range}</strong></div>`;
            }).join('');
            if (clinicSlotDurationLabel) {
                clinicSlotDurationLabel.textContent = `${schedule.slotDuration || 30} minutes`;
            }
            if (smartSlotGroupingToggle) {
                smartSlotGroupingToggle.checked = !!schedule.smartSlotGrouping;
            }
            const blocked = Array.isArray(schedule.blockedDates) ? [...schedule.blockedDates].sort() : [];
            if (clinicBlockedDatesList) {
                clinicBlockedDatesList.innerHTML = blocked.length
                    ? blocked.map((d) => `<span class="clinic-blocked-chip">${escapeHtml(d)}</span>`).join('')
                    : '<p class="admin-empty-list">No blocked dates.</p>';
            }
        } catch (err) {
            console.error('Failed to load schedule view:', err);
            clinicHoursList.innerHTML = '<p class="admin-empty-list">Could not load availability.</p>';
        }
    }

    if (smartSlotGroupingToggle) {
        smartSlotGroupingToggle.addEventListener('change', async () => {
            if (clinicRole !== 'admin') {
                smartSlotGroupingToggle.checked = !smartSlotGroupingToggle.checked;
                return;
            }
            const enabled = smartSlotGroupingToggle.checked;
            try {
                const res = await fetch('/api/admin/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ smartSlotGrouping: enabled })
                });
                if (res.status === 401) {
                    showLogin();
                    return;
                }
                if (!res.ok) {
                    smartSlotGroupingToggle.checked = !enabled;
                }
            } catch (err) {
                console.error('Failed to save booking settings:', err);
                smartSlotGroupingToggle.checked = !enabled;
            }
        });
    }

    // ─── Login ───
    clinicLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';
        
        const username = clinicUsername.value.trim();
        const password = clinicPassword.value;
        
        if (!username || !password) {
            loginError.textContent = 'Please enter both username and password';
            loginError.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/api/clinic/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showClinicPortal(data.displayName || username, data.role, username);
                clinicUsername.value = '';
                clinicPassword.value = '';
            } else {
                loginError.textContent = data.error || 'Invalid username or password';
                loginError.style.display = 'block';
            }
        } catch (err) {
            console.error('Login error:', err);
            loginError.textContent = 'Failed to connect to server. Please try again.';
            loginError.style.display = 'block';
        }
    });

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

    const DEFAULT_ORDEM_LABELS = {
        medico: 'Número da Ordem dos Médicos',
        nutricionista: 'Número da Ordem dos Nutricionistas',
        psicologo: 'Número da Ordem dos Psicólogos'
    };
    const DEFAULT_DOC_KINDS = {
        contrato: 'Contrato',
        seguro: 'Seguro de responsabilidade civil',
        cv: 'CV',
        identificacao: 'Documento de identificação',
        cartao_ordem: 'Cartão da ordem'
    };
    let clinicProfileMeta = {
        professions: DEFAULT_ORDEM_LABELS,
        documentKinds: DEFAULT_DOC_KINDS,
        clinicalAreas: {},
        documents: []
    };

    function ordemLabelFor(profession) {
        const labels = clinicProfileMeta.professions || DEFAULT_ORDEM_LABELS;
        return labels[profession] || 'Número da ordem';
    }

    function fillAreaSelect(selectEl, profession, selected) {
        if (!selectEl) return;
        const areas = (clinicProfileMeta.clinicalAreas && clinicProfileMeta.clinicalAreas[profession]) || [];
        const value = selected || '';
        const opts = ['<option value="">Select</option>'].concat(
            areas.map((area) => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`)
        );
        if (value && !areas.includes(value)) {
            opts.push(`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
        }
        selectEl.innerHTML = opts.join('');
        selectEl.value = value;
        selectEl.disabled = !profession;
    }

    function updateOrdemLabel() {
        if (!clinicOrdemLabel) return;
        clinicOrdemLabel.textContent = ordemLabelFor(clinicProfession && clinicProfession.value);
    }

    function renderDocumentRows() {
        if (!clinicDocsBody) return;
        const kinds = clinicProfileMeta.documentKinds || DEFAULT_DOC_KINDS;
        const uploaded = {};
        (clinicProfileMeta.documents || []).forEach((doc) => {
            if (doc && doc.kind) uploaded[doc.kind] = doc;
        });
        clinicDocsBody.innerHTML = Object.keys(kinds).map((kind) => {
            const label = kinds[kind];
            const doc = uploaded[kind];
            const fileCell = doc
                ? `<a class="clinic-doc-link" href="/api/clinic/profile/documents/${encodeURIComponent(doc.id)}">${escapeHtml(doc.originalName || label)}</a>`
                : '<span class="clinic-doc-missing">Not uploaded</span>';
            const validity = doc && doc.validUntil ? escapeHtml(doc.validUntil) : '—';
            return `<tr data-doc-kind="${escapeHtml(kind)}">
                <td>${escapeHtml(label)}</td>
                <td>
                    ${fileCell}
                    <input type="file" class="clinic-doc-file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*">
                </td>
                <td>
                    <div class="clinic-doc-validity">${validity}</div>
                    <input type="date" class="admin-input clinic-doc-date" value="${doc && doc.validUntil ? escapeHtml(doc.validUntil) : ''}" required>
                </td>
                <td>
                    <button type="button" class="btn btn-outline btn-sm clinic-doc-upload">${doc ? 'Replace' : 'Upload'}</button>
                </td>
            </tr>`;
        }).join('');
    }

    async function loadClinicProfile() {
        if (!clinicProfession) return;
        try {
            const res = await fetch('/api/clinic/profile');
            if (res.status === 401) {
                showLogin();
                return;
            }
            if (!res.ok) throw new Error('Failed to load profile');
            const data = await res.json();
            clinicProfileMeta = {
                professions: data.professions || DEFAULT_ORDEM_LABELS,
                documentKinds: data.documentKinds || DEFAULT_DOC_KINDS,
                clinicalAreas: data.clinicalAreas || {},
                documents: data.documents || []
            };
            clinicProfession.value = data.profession || '';
            if (clinicOrdemNumber) clinicOrdemNumber.value = data.ordemNumber || '';
            if (clinicBio) clinicBio.value = data.bio || '';
            updateOrdemLabel();
            fillAreaSelect(clinicPrimaryArea, data.profession, data.primaryArea);
            fillAreaSelect(clinicSecondaryArea, data.profession, data.secondaryArea);
            renderDocumentRows();
            if (clinicProfileFormError) clinicProfileFormError.style.display = 'none';
            if (clinicDocsError) clinicDocsError.style.display = 'none';
        } catch (err) {
            console.error('Failed to load clinic profile:', err);
            if (clinicDocsBody) {
                clinicDocsBody.innerHTML = '<tr><td colspan="4" class="admin-empty-list">Could not load profile.</td></tr>';
            }
        }
    }

    function showProfileError(el, message) {
        if (!el) return;
        el.textContent = message;
        el.style.display = 'block';
    }

    if (clinicProfession) {
        clinicProfession.addEventListener('change', () => {
            updateOrdemLabel();
            fillAreaSelect(clinicPrimaryArea, clinicProfession.value, clinicPrimaryArea.value);
            fillAreaSelect(clinicSecondaryArea, clinicProfession.value, clinicSecondaryArea.value);
        });
    }

    if (clinicProfileForm) {
        clinicProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (clinicProfileFormError) clinicProfileFormError.style.display = 'none';
            const payload = {
                profession: clinicProfession.value,
                ordemNumber: clinicOrdemNumber ? clinicOrdemNumber.value.trim() : '',
                bio: clinicBio ? clinicBio.value.trim() : '',
                primaryArea: clinicPrimaryArea ? clinicPrimaryArea.value : '',
                secondaryArea: clinicSecondaryArea ? clinicSecondaryArea.value : ''
            };
            if (clinicProfileSaveBtn) clinicProfileSaveBtn.disabled = true;
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
                const prev = clinicProfileSaveBtn ? clinicProfileSaveBtn.textContent : '';
                if (clinicProfileSaveBtn) clinicProfileSaveBtn.textContent = 'Saved';
                setTimeout(() => {
                    if (clinicProfileSaveBtn) clinicProfileSaveBtn.textContent = prev || 'Save profile';
                }, 1600);
            } catch (err) {
                showProfileError(clinicProfileFormError, err.message || 'Failed to save profile');
            } finally {
                if (clinicProfileSaveBtn) clinicProfileSaveBtn.disabled = false;
            }
        });
    }

    if (clinicDocsBody) {
        clinicDocsBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('.clinic-doc-upload');
            if (!btn) return;
            const row = btn.closest('tr');
            const kind = row && row.getAttribute('data-doc-kind');
            const fileInput = row && row.querySelector('.clinic-doc-file');
            const dateInput = row && row.querySelector('.clinic-doc-date');
            if (!kind || !fileInput || !dateInput) return;
            if (clinicDocsError) clinicDocsError.style.display = 'none';
            if (!fileInput.files || !fileInput.files[0]) {
                showProfileError(clinicDocsError, 'Choose a file to upload.');
                return;
            }
            if (!dateInput.value) {
                showProfileError(clinicDocsError, 'Add the validity date.');
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
                await loadClinicProfile();
            } catch (err) {
                showProfileError(clinicDocsError, err.message || 'Failed to upload document');
            } finally {
                btn.disabled = false;
            }
        });
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
