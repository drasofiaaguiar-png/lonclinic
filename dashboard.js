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

    // Dashboard elements
    const dashGreeting = document.getElementById('dashGreeting');
    const dashEmail = document.getElementById('dashEmail');
    const upcomingSection = document.getElementById('dashUpcoming');
    const dashTableBody = document.getElementById('dashTableBody');
    const dashTable = document.getElementById('dashTable');
    const dashEmpty = document.getElementById('dashEmpty');

    // Upcoming elements
    const upcomingService = document.getElementById('upcomingService');
    const upcomingDate = document.getElementById('upcomingDate');
    const upcomingTime = document.getElementById('upcomingTime');
    const upcomingPatient = document.getElementById('upcomingPatient');
    const upcomingRef = document.getElementById('upcomingRef');
    const joinDoxyBtn = document.getElementById('joinDoxyBtn');
    const joinHint = document.getElementById('joinHint');

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

    // ─── Check existing session ───
    const existing = getSession();
    if (existing && existing.email && existing.ref) {
        showDashboard(existing.email, existing.ref);
    } else if (existing && existing.email && !existing.ref) {
        clearSession();
    }

    // ─── Login Form ───
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideLoginApiError();
        const email = loginEmail.value.trim();
        const ref = loginRef.value.trim();
        if (!email || !ref) return;
        setSession({ email, ref });
        showDashboard(email, ref);
    });

    // ─── Logout ───
    logoutBtn.addEventListener('click', () => {
        clearSession();
        hideLoginApiError();
        loginSection.style.display = '';
        contentSection.style.display = 'none';
        loginEmail.value = '';
        loginRef.value = '';
    });

    // ─── Show Dashboard ───
    async function showDashboard(email, ref) {
        if (!email || !String(ref || '').trim()) {
            clearSession();
            loginSection.style.display = '';
            contentSection.style.display = 'none';
            return;
        }

        loginSection.style.display = 'none';
        contentSection.style.display = 'block';

        // Set greeting
        const name = email.split('@')[0];
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
        dashGreeting.textContent = `Welcome, ${capitalized}`;
        dashEmail.textContent = email;

        // Fetch bookings (API requires email + booking reference)
        try {
            const params = new URLSearchParams({ email, ref: ref.trim() });
            const res = await fetch(`/api/bookings?${params.toString()}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                clearSession();
                loginSection.style.display = '';
                contentSection.style.display = 'none';
                showLoginApiError(data.error || 'Could not verify your booking. Please try again.');
                return;
            }

            if (data.bookings && data.bookings.length > 0) {
                renderBookings(data.bookings, data.doxyUrl);
            } else {
                dashEmpty.style.display = '';
                dashTable.style.display = 'none';
                upcomingSection.style.display = 'none';
            }
        } catch (err) {
            console.error('Failed to load bookings:', err);
            clearSession();
            loginSection.style.display = '';
            contentSection.style.display = 'none';
            showLoginApiError('Could not connect to the server. Please try again.');
        }
    }

    // ─── Render Bookings ───
    function renderBookings(bookings, doxyUrl) {
        dashTableBody.innerHTML = '';
        dashEmpty.style.display = 'none';
        dashTable.style.display = 'table';

        // Sort by date (newest first for display, but find upcoming)
        const now = new Date();
        let nextUpcoming = null;

        bookings.forEach(b => {
            const row = document.createElement('tr');
            const status = getStatus(b, now);
            const serviceLabel = SERVICE_LABELS[b.service] || b.service;
            const doxyLink = doxyUrl ? doxyUrl : '#';

            row.innerHTML = `
                <td class="ref-cell">${b.bookingRef || '—'}</td>
                <td class="service-cell">${serviceLabel}</td>
                <td>${b.date || '—'}${b.time ? ' · ' + b.time : ''}</td>
                <td>${b.patientName || '—'}${b.travellerCount > 1 ? ` +${b.travellerCount - 1}` : ''}</td>
                <td><span class="dash-status ${status}">${status}</span></td>
                <td>${status === 'upcoming'
                    ? `<a href="${doxyLink}" target="_blank" rel="noopener" class="join-link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                        Join
                       </a>`
                    : status === 'completed' ? '<span style="color:var(--text-muted);font-size:0.75rem;">Completed</span>' : '—'
                }</td>
            `;
            dashTableBody.appendChild(row);

            // Track next upcoming
            if (status === 'upcoming' && !nextUpcoming) {
                nextUpcoming = b;
            }
        });

        // Show upcoming card
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

    // ─── Determine booking status ───
    function getStatus(booking, now) {
        // Try to parse the date
        if (!booking.date) return 'upcoming';
        try {
            // Expected format: "Wednesday, 18 February 2026" or similar
            const parsed = new Date(booking.date);
            if (isNaN(parsed.getTime())) return 'upcoming';
            // If date is in the past, mark as completed
            const endOfDay = new Date(parsed);
            endOfDay.setHours(23, 59, 59, 999);
            if (endOfDay < now) return 'completed';
            return 'upcoming';
        } catch {
            return 'upcoming';
        }
    }
});
