/* ========================================
   Patient Dashboard — JavaScript
   Fetches bookings, integrates Doxy.me links
======================================== */

document.addEventListener('DOMContentLoaded', () => {

    const SERVICE_LABELS = {
        longevity: 'Longevity Assessment',
        travel: 'Travel Medicine Consultation',
        followup: 'Follow-Up Consultation'
    };

    // ─── DOM Elements ───
    const loginSection = document.getElementById('dashLogin');
    const contentSection = document.getElementById('dashContent');
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginRef = document.getElementById('loginRef');
    const loginApiError = document.getElementById('dashLoginApiError');
    const logoutBtn = document.getElementById('logoutBtn');

    const dashStats = document.getElementById('dashStats');
    const statUpcoming = document.getElementById('statUpcoming');
    const statCompleted = document.getElementById('statCompleted');
    const statTotal = document.getElementById('statTotal');

    const dashGreeting = document.getElementById('dashGreeting');
    const dashEmail = document.getElementById('dashEmail');
    const upcomingSection = document.getElementById('dashUpcoming');
    const dashTableBody = document.getElementById('dashTableBody');
    const dashTable = document.getElementById('dashTable');
    const dashEmpty = document.getElementById('dashEmpty');

    const upcomingService = document.getElementById('upcomingService');
    const upcomingDate = document.getElementById('upcomingDate');
    const upcomingTime = document.getElementById('upcomingTime');
    const upcomingPatient = document.getElementById('upcomingPatient');
    const upcomingRef = document.getElementById('upcomingRef');
    const joinDoxyBtn = document.getElementById('joinDoxyBtn');
    const joinHint = document.getElementById('joinHint');

    const rescheduleModal = document.getElementById('rescheduleModal');
    const rescheduleModalBackdrop = document.getElementById('rescheduleModalBackdrop');
    const rescheduleDate = document.getElementById('rescheduleDate');
    const rescheduleTime = document.getElementById('rescheduleTime');
    const rescheduleError = document.getElementById('rescheduleError');
    const rescheduleCancelBtn = document.getElementById('rescheduleCancelBtn');
    const rescheduleConfirmBtn = document.getElementById('rescheduleConfirmBtn');
    const rescheduleModalRef = document.getElementById('rescheduleModalRef');

    let pendingRescheduleRef = null;

    // ─── Session Storage ───
    function getSession() {
        try {
            return JSON.parse(sessionStorage.getItem('dash_session')) || null;
        } catch { return null; }
    }

    function setSession(data) {
        sessionStorage.setItem('dash_session', JSON.stringify(data));
    }

    function clearSession() {
        sessionStorage.removeItem('dash_session');
    }

    function getDashboardLocale() {
        const lang = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
        if (lang.startsWith('pt')) return 'pt';
        if (lang.startsWith('es')) return 'es';
        return 'en';
    }

    function hideLoginApiError() {
        if (loginApiError) {
            loginApiError.style.display = 'none';
            loginApiError.textContent = '';
        }
    }

    function showLoginApiError(message) {
        if (loginApiError) {
            loginApiError.textContent = message;
            loginApiError.style.display = 'block';
        }
    }

    function parseUrlLoginParams() {
        const params = new URLSearchParams(window.location.search);
        const email = (params.get('email') || '').trim();
        const ref = (params.get('ref') || '').trim();
        return { email, ref };
    }

    function displayNameFromEmail(email) {
        const local = (email || '').split('@')[0] || 'there';
        return local.charAt(0).toUpperCase() + local.slice(1);
    }

    // ─── Check existing session or URL params ───
    const urlParams = parseUrlLoginParams();
    if (urlParams.email) {
        loginEmail.value = urlParams.email;
        if (urlParams.ref) loginRef.value = urlParams.ref;
        setSession({ email: urlParams.email, ref: urlParams.ref || null });
        showDashboard(urlParams.email, urlParams.ref || null);
    } else {
        const existing = getSession();
        if (existing && existing.email) {
            showDashboard(existing.email, existing.ref || null);
        }
    }

    // ─── Login Form ───
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideLoginApiError();
        const email = loginEmail.value.trim();
        const ref = loginRef.value.trim();
        if (!email) return;
        setSession({ email, ref: ref || null });
        showDashboard(email, ref || null);
    });

    // ─── Logout ───
    logoutBtn.addEventListener('click', () => {
        clearSession();
        hideLoginApiError();
        loginSection.style.display = '';
        contentSection.style.display = 'none';
        loginEmail.value = '';
        loginRef.value = '';
        if (dashStats) dashStats.style.display = 'none';
    });

    function closeRescheduleModal() {
        pendingRescheduleRef = null;
        if (rescheduleModal) rescheduleModal.style.display = 'none';
        if (rescheduleError) {
            rescheduleError.style.display = 'none';
            rescheduleError.textContent = '';
        }
    }

    if (rescheduleModalBackdrop) {
        rescheduleModalBackdrop.addEventListener('click', closeRescheduleModal);
    }
    if (rescheduleCancelBtn) {
        rescheduleCancelBtn.addEventListener('click', closeRescheduleModal);
    }

    async function loadSlotsForReschedule(dateIso) {
        if (!rescheduleTime) return;
        rescheduleTime.innerHTML = '<option value="">Loading…</option>';
        rescheduleTime.disabled = true;
        if (!dateIso) return;
        try {
            const res = await fetch(`/api/admin/available-slots?date=${encodeURIComponent(dateIso)}`);
            const data = await res.json();
            rescheduleTime.innerHTML = '<option value="">Choose a time…</option>';
            if (data.available && data.available.length) {
                data.available.forEach((slot) => {
                    const opt = document.createElement('option');
                    opt.value = slot;
                    opt.textContent = slot;
                    rescheduleTime.appendChild(opt);
                });
                rescheduleTime.disabled = false;
            } else {
                rescheduleTime.innerHTML = '<option value="">No slots</option>';
            }
        } catch {
            rescheduleTime.innerHTML = '<option value="">Error</option>';
        }
        if (rescheduleConfirmBtn) {
            rescheduleConfirmBtn.disabled = !rescheduleTime.value;
        }
    }

    if (rescheduleDate) {
        rescheduleDate.addEventListener('change', () => {
            loadSlotsForReschedule(rescheduleDate.value);
        });
    }
    if (rescheduleTime) {
        rescheduleTime.addEventListener('change', () => {
            if (rescheduleConfirmBtn) rescheduleConfirmBtn.disabled = !rescheduleTime.value;
        });
    }

    if (rescheduleConfirmBtn) {
        rescheduleConfirmBtn.addEventListener('click', async () => {
            const sess = getSession();
            if (!sess || !pendingRescheduleRef || !rescheduleDate || !rescheduleTime) return;
            const dateIso = rescheduleDate.value;
            const time = rescheduleTime.value;
            if (!dateIso || !time) return;
            if (rescheduleError) {
                rescheduleError.style.display = 'none';
                rescheduleError.textContent = '';
            }
            rescheduleConfirmBtn.disabled = true;
            let dateLabel = dateIso;
            try {
                const d = new Date(`${dateIso}T12:00:00`);
                dateLabel = d.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });
            } catch { /* keep ISO */ }
            try {
                const res = await fetch('/api/patient/booking/reschedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: sess.email,
                        ref: pendingRescheduleRef,
                        dateIso,
                        time,
                        dateLabel,
                        locale: getDashboardLocale()
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    if (rescheduleError) {
                        rescheduleError.textContent = data.error || 'Could not reschedule.';
                        rescheduleError.style.display = 'block';
                    }
                    rescheduleConfirmBtn.disabled = false;
                    return;
                }
                closeRescheduleModal();
                await showDashboard(sess.email, sess.ref || null);
            } catch {
                if (rescheduleError) {
                    rescheduleError.textContent = 'Network error. Please try again.';
                    rescheduleError.style.display = 'block';
                }
                rescheduleConfirmBtn.disabled = false;
            }
        });
    }

    dashTableBody.addEventListener('click', async (e) => {
        const cancelBtn = e.target.closest('.dash-cancel-btn');
        const resBtn = e.target.closest('.dash-reschedule-btn');
        const sess = getSession();
        if (!sess || !sess.email) return;

        if (cancelBtn) {
            const ref = cancelBtn.getAttribute('data-ref');
            if (!ref || !window.confirm('Cancel this appointment? You can only cancel up to 24 hours before the start time.')) return;
            try {
                const res = await fetch('/api/patient/booking/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: sess.email,
                        ref,
                        locale: getDashboardLocale()
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    alert(data.error || 'Could not cancel.');
                    return;
                }
                await showDashboard(sess.email, sess.ref || null);
            } catch {
                alert('Could not connect. Please try again.');
            }
            return;
        }

        if (resBtn) {
            const ref = resBtn.getAttribute('data-ref');
            if (!ref || !rescheduleModal || !rescheduleDate) return;
            pendingRescheduleRef = ref;
            if (rescheduleModalRef) rescheduleModalRef.textContent = `Reference: ${ref}`;
            const today = new Date();
            const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            rescheduleDate.min = iso;
            rescheduleDate.value = iso;
            rescheduleModal.style.display = 'flex';
            if (rescheduleConfirmBtn) rescheduleConfirmBtn.disabled = true;
            loadSlotsForReschedule(iso);
        }
    });

    // ─── Show Dashboard ───
    async function showDashboard(email, ref) {
        if (!email) {
            clearSession();
            loginSection.style.display = '';
            contentSection.style.display = 'none';
            return;
        }

        loginSection.style.display = 'none';
        contentSection.style.display = 'block';

        dashGreeting.textContent = `Welcome, ${displayNameFromEmail(email)}`;
        dashEmail.textContent = email;

        const params = new URLSearchParams({ email });
        const refTrim = ref ? String(ref).trim() : '';
        if (refTrim) params.set('ref', refTrim);

        try {
            const res = await fetch(`/api/bookings?${params.toString()}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                clearSession();
                loginSection.style.display = '';
                contentSection.style.display = 'none';
                showLoginApiError(data.error || 'Could not load your bookings. Please try again.');
                return;
            }

            setSession({ email, ref: refTrim || null });

            if (data.bookings && data.bookings.length > 0) {
                renderBookings(data.bookings, data.doxyUrl);
            } else {
                dashEmpty.style.display = '';
                dashTable.style.display = 'none';
                upcomingSection.style.display = 'none';
                if (dashStats) dashStats.style.display = 'none';
            }
        } catch (err) {
            console.error('Failed to load bookings:', err);
            clearSession();
            loginSection.style.display = '';
            contentSection.style.display = 'none';
            showLoginApiError('Could not connect to the server. Please try again.');
        }
    }

    function updateStats(bookings, now) {
        if (!dashStats || !statUpcoming || !statCompleted || !statTotal) return;
        let upcoming = 0;
        let completed = 0;
        bookings.forEach((b) => {
            const status = getStatus(b, now);
            if (status === 'upcoming') upcoming += 1;
            else if (status === 'completed') completed += 1;
        });
        statUpcoming.textContent = String(upcoming);
        statCompleted.textContent = String(completed);
        statTotal.textContent = String(bookings.length);
        dashStats.style.display = bookings.length > 0 ? 'grid' : 'none';
    }

    // ─── Render Bookings ───
    function renderBookings(bookings, doxyUrl) {
        dashTableBody.innerHTML = '';
        dashEmpty.style.display = 'none';
        dashTable.style.display = 'table';

        const now = new Date();
        updateStats(bookings, now);

        let nextUpcoming = null;

        bookings.forEach((b) => {
            const row = document.createElement('tr');
            const status = getStatus(b, now);
            const serviceLabel = SERVICE_LABELS[b.service] || b.service;
            const doxyLink = doxyUrl ? doxyUrl : '#';

            const joinHtml =
                status === 'upcoming' && !b.cancelled
                    ? `<a href="${doxyLink}" target="_blank" rel="noopener" class="join-link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                        Join
                       </a>`
                    : '';
            const cancelHtml =
                b.canCancel
                    ? `<button type="button" class="btn btn-outline btn-sm dash-cancel-btn" data-ref="${b.bookingRef || ''}">Cancel</button>`
                    : '';
            const rescheduleHtml =
                b.canReschedule
                    ? `<button type="button" class="btn btn-outline btn-sm dash-reschedule-btn" data-ref="${b.bookingRef || ''}">Reschedule</button>`
                    : '';
            const completedHtml =
                status === 'completed'
                    ? '<span style="color:var(--text-muted);font-size:0.75rem;">Completed</span>'
                    : '';
            const cancelledHtml =
                status === 'cancelled'
                    ? '<span style="color:var(--text-muted);font-size:0.75rem;">Cancelled</span>'
                    : '';

            let actionsHtml = '<div class="dash-action-btns">';
            if (cancelledHtml) actionsHtml += cancelledHtml;
            else {
                if (joinHtml) actionsHtml += joinHtml;
                if (cancelHtml) actionsHtml += cancelHtml;
                if (rescheduleHtml) actionsHtml += rescheduleHtml;
                if (!joinHtml && !cancelHtml && !rescheduleHtml && completedHtml) actionsHtml += completedHtml;
                if (!joinHtml && !cancelHtml && !rescheduleHtml && !completedHtml && !cancelledHtml) {
                    actionsHtml += '—';
                }
            }
            actionsHtml += '</div>';

            row.innerHTML = `
                <td class="ref-cell">${b.bookingRef || '—'}</td>
                <td class="service-cell">${serviceLabel}</td>
                <td>${b.date || '—'}${b.time ? ' · ' + b.time : ''}</td>
                <td>${b.patientName || '—'}${b.travellerCount > 1 ? ` +${b.travellerCount - 1}` : ''}</td>
                <td><span class="dash-status ${status}">${status}</span></td>
                <td>${actionsHtml}</td>
            `;
            dashTableBody.appendChild(row);

            if (status === 'upcoming' && !nextUpcoming && !b.cancelled) {
                nextUpcoming = b;
            }
        });

        if (nextUpcoming) {
            upcomingSection.style.display = 'block';
            upcomingService.textContent = SERVICE_LABELS[nextUpcoming.service] || nextUpcoming.service;
            upcomingDate.textContent = nextUpcoming.date || '—';
            upcomingTime.textContent = nextUpcoming.time || '—';
            upcomingPatient.textContent = nextUpcoming.patientName || '—';
            upcomingRef.textContent = nextUpcoming.bookingRef || '—';

            if (doxyUrl) {
                joinDoxyBtn.href = doxyUrl;
                joinDoxyBtn.style.opacity = '1';
                joinDoxyBtn.style.pointerEvents = 'auto';
                joinHint.textContent = 'Click to enter the waiting room when your appointment is due.';
            } else {
                joinDoxyBtn.href = '#';
                joinDoxyBtn.style.opacity = '0.5';
                joinDoxyBtn.style.pointerEvents = 'none';
                joinHint.textContent = 'The video consultation link will be available once configured by the clinic.';
            }
        } else {
            upcomingSection.style.display = 'none';
        }
    }

    function getStatus(booking, now) {
        if (booking.cancelled) return 'cancelled';
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
});
