/* ========================================
   Booking Flow — JavaScript (Stripe Checkout)
   Multi-passenger support for Travel Medicine
======================================== */

document.addEventListener('DOMContentLoaded', async () => {

    // ─── State ───
    const state = {
        currentStep: 1,
        service: null,
        serviceLabel: '',
        servicePrice: '',
        servicePriceCents: 0,
        travellerCount: 1,   // 1–4 for travel
        hasInsurance: false,  // Medicare toggle
        policyNumber: '',     // Medicare policy number
        date: null,
        dateLabel: '',
        time: null,
        calMonth: new Date().getMonth(),
        calYear: new Date().getFullYear(),
        discountCode: '',
        discountPercent: 0,
        scheduleData: null // Admin schedule configuration
    };

    // ─── Load schedule data ───
    async function loadSchedule() {
        try {
            const res = await fetch('/api/schedule');
            if (res.ok) {
                state.scheduleData = await res.json();
            }
        } catch (err) {
            console.log('Schedule API not available, using defaults');
        }
    }

    // Load schedule on page load
    await loadSchedule();

    const services = {
        longevity:  { label: 'Longevity Assessment',           price: '€195', cents: 19500, medicareCents: null,  medicarePrice: null },
        travel:     { label: 'Travel Medicine Consultation',    price: '€39',  cents: 3900,  medicareCents: 3200,  medicarePrice: '€32' },
        lifestyle:  { label: 'Medicina de Estilo de Vida',      price: '€50',  cents: 5000,  medicareCents: 3900,  medicarePrice: '€39' },
        cessation:  { label: 'Cessação Tabágica',               price: '€50',  cents: 5000,  medicareCents: 3900,  medicarePrice: '€39' },
        renewal:    { label: 'Renovação de Receituário Crónico', price: '€18', cents: 1800,  medicareCents: 1200,  medicarePrice: '€12' },
        followup:   { label: 'Follow-Up Consultation',          price: '€95',  cents: 9500,  medicareCents: null,  medicarePrice: null }
    };

    // Travel tiered pricing: [count] → { cents, price, duration }
    const travelPricing = {
        standard: {
            1: { cents: 3900,  price: '€39',  duration: '20 min' },
            2: { cents: 6900,  price: '€69',  duration: '30 min' },
            3: { cents: 10700, price: '€107', duration: '40 min' },
            4: { cents: 13600, price: '€136', duration: '40 min' }
        },
        medicare: {
            1: { cents: 3200,  price: '€32',  duration: '20 min' },
            2: { cents: 4200,  price: '€42',  duration: '30 min' },
            3: { cents: 4900,  price: '€49',  duration: '40 min' },
            4: { cents: 5500,  price: '€55',  duration: '40 min' }
        }
    };

    function getTravelTier() {
        return state.hasInsurance ? travelPricing.medicare : travelPricing.standard;
    }

    function getCurrentTravelPrice() {
        const tier = getTravelTier();
        return tier[state.travellerCount] || tier[1];
    };

    /* i18n helpers — gracefully fall back if i18n.js not loaded */
    function i18nServiceLabel(key) {
        if (window.CLINIC_I18N && window.CLINIC_I18N.getServiceLabel) {
            return window.CLINIC_I18N.getServiceLabel(key) || services[key].label;
        }
        return services[key].label;
    }
    function i18nMonths() {
        if (window.CLINIC_I18N && window.CLINIC_I18N.getMonthNames) return window.CLINIC_I18N.getMonthNames();
        return monthNames;
    }

    // ─── Check for Stripe return ───
    const urlParams = new URLSearchParams(window.location.search);

    // Returning from Stripe Checkout — show confirmation
    if (urlParams.get('success') === 'true' && urlParams.get('session_id')) {
        await handleStripeReturn(urlParams.get('session_id'));
        return; // Don't initialise rest of booking flow
    }

    // Returning from cancelled Stripe Checkout
    if (urlParams.get('cancelled') === 'true') {
        showCancelledMessage();
    }

    // Auto-select service from URL param
    const preselect = urlParams.get('service');
    if (preselect && services[preselect]) {
        const radio = document.querySelector(`input[name="service"][value="${preselect}"]`);
        if (radio) {
            radio.checked = true;
            state.service = preselect;
            state.serviceLabel = services[preselect].label;
            state.servicePrice = services[preselect].price;
            state.servicePriceCents = services[preselect].cents;
            document.getElementById('next-1').disabled = false;
            updateTravellerCountVisibility();
        }
    }

    // ─── Mobile Menu ───
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // ─── Step Navigation ───
    function goToStep(step) {
        document.querySelector('.booking-step.active').classList.remove('active');
        document.getElementById(`step-${step}`).classList.add('active');

        document.querySelectorAll('.progress-step').forEach(ps => {
            const s = parseInt(ps.dataset.step);
            ps.classList.remove('active', 'completed');
            if (s < step) ps.classList.add('completed');
            if (s === step) ps.classList.add('active');
        });

        const lines = document.querySelectorAll('.progress-line');
        lines.forEach((line, i) => {
            if (i < step - 1) {
                line.classList.add('filled');
            } else {
                line.classList.remove('filled');
            }
        });

        state.currentStep = step;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (step === 2) renderCalendar();
        if (step === 3) initDetailsForm();
        if (step === 4) updateReviewAndSummary();
    }

    // ═══════════════════════════════════════
    //  STEP 1 — Service Selection
    // ═══════════════════════════════════════
    function updateTravellerCountVisibility() {
        const travelSection = document.getElementById('travellerCountSection');
        const insuranceSection = document.getElementById('insuranceSection');
        const serviceOptions = document.querySelectorAll('.service-option');
        const changeServiceBtn = document.getElementById('changeServiceBtn');

        if (state.service) {
            // Hide other service cards, keep only selected
            serviceOptions.forEach(opt => {
                if (opt.dataset.service !== state.service) {
                    opt.style.display = 'none';
                }
            });
            if (changeServiceBtn) changeServiceBtn.style.display = 'inline-flex';

            // Show insurance section for all services
            insuranceSection.style.display = 'block';

            if (state.service === 'travel') {
                // Show traveller count section for travel
                travelSection.style.display = 'block';
                updateTravellerPriceLabels();
                updateTravellerPriceNote();
            } else {
                travelSection.style.display = 'none';
                state.travellerCount = 1;
                updateNonTravelMedicareDisplay();
            }
        } else {
            // Show all service cards
            serviceOptions.forEach(opt => {
                opt.style.display = '';
            });
            travelSection.style.display = 'none';
            insuranceSection.style.display = 'none';
            if (changeServiceBtn) changeServiceBtn.style.display = 'none';
            state.travellerCount = 1;
            state.hasInsurance = false;
            state.policyNumber = '';
            const toggle = document.getElementById('insuranceToggle');
            if (toggle) toggle.checked = false;
            const policySection = document.getElementById('policyNumberSection');
            if (policySection) policySection.style.display = 'none';
            const priceNote = document.getElementById('medicarePriceNote');
            if (priceNote) priceNote.style.display = 'none';
        }
    }

    /* Show Medicare price for non-travel services */
    function updateNonTravelMedicareDisplay() {
        const priceNote = document.getElementById('medicarePriceNote');
        const priceDisplay = document.getElementById('medicarePriceDisplay');
        const svc = services[state.service];
        if (!svc) return;

        if (state.hasInsurance && svc.medicareCents) {
            // Update state prices to Medicare
            state.servicePrice = svc.medicarePrice;
            state.servicePriceCents = svc.medicareCents;
            if (priceNote) priceNote.style.display = 'block';
            if (priceDisplay) priceDisplay.textContent = svc.medicarePrice;
            // Update price tag on service card
            updateServicePriceTags();
        } else {
            // Use standard prices
            state.servicePrice = svc.price;
            state.servicePriceCents = svc.cents;
            if (priceNote) priceNote.style.display = 'none';
            updateServicePriceTags();
        }
    }

    /* Update price tags shown on service cards */
    function updateServicePriceTags() {
        const priceTagIds = {
            lifestyle: 'lifestylePrice',
            cessation: 'cessationPrice',
            renewal: 'renewalPrice'
        };
        Object.keys(priceTagIds).forEach(key => {
            const el = document.getElementById(priceTagIds[key]);
            if (!el) return;
            const svc = services[key];
            if (state.hasInsurance && svc.medicareCents) {
                el.textContent = svc.medicarePrice;
                el.style.color = '#c5c72c';
            } else {
                el.textContent = svc.price;
                el.style.color = '';
            }
        });
    }

    function resetServiceSelection() {
        // Deselect all radios
        document.querySelectorAll('input[name="service"]').forEach(r => r.checked = false);
        // Show all options again
        document.querySelectorAll('.service-option').forEach(opt => {
            opt.style.display = '';
        });
        // Hide traveller section and insurance
        document.getElementById('travellerCountSection').style.display = 'none';
        document.getElementById('insuranceSection').style.display = 'none';
        const changeServiceBtn = document.getElementById('changeServiceBtn');
        if (changeServiceBtn) changeServiceBtn.style.display = 'none';
        // Reset state
        state.service = null;
        state.travellerCount = 1;
        state.hasInsurance = false;
        state.policyNumber = '';
        document.getElementById('next-1').disabled = true;
        // Reset traveller count buttons
        document.querySelectorAll('.tc-card').forEach(b => b.classList.remove('selected'));
        const firstBtn = document.querySelector('.tc-card[data-count="1"]');
        if (firstBtn) firstBtn.classList.add('selected');
        // Reset insurance toggle and policy number
        const toggle = document.getElementById('insuranceToggle');
        if (toggle) toggle.checked = false;
        const policySection = document.getElementById('policyNumberSection');
        if (policySection) policySection.style.display = 'none';
        const policyInput = document.getElementById('policyNumber');
        if (policyInput) policyInput.value = '';
        const priceNote = document.getElementById('medicarePriceNote');
        if (priceNote) priceNote.style.display = 'none';
        // Reset price tags
        updateServicePriceTags();
    }

    // "Change service" button
    const changeServiceBtn = document.getElementById('changeServiceBtn');
    if (changeServiceBtn) {
        changeServiceBtn.addEventListener('click', resetServiceSelection);
    }

    /* Update price labels on each traveller count button */
    function updateTravellerPriceLabels() {
        const tier = getTravelTier();
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`travelPrice${i}`);
            if (el) el.textContent = tier[i].price;
        }
    }

    function updateTravellerPriceNote() {
        const tp = getCurrentTravelPrice();
        // Sync state price for downstream (review, Stripe)
        state.servicePrice = tp.price;
        state.servicePriceCents = tp.cents;
        const personLabel = state.travellerCount === 1 ? '1 person' : `${state.travellerCount} persons`;
        const insuranceTag = state.hasInsurance ? ' · Medicare' : '';
        document.getElementById('travellerPriceTotal').textContent = tp.price;
        document.getElementById('travellerPriceBreakdown').textContent =
            `${personLabel} · ${tp.duration} · Video call${insuranceTag}`;
    }

    document.querySelectorAll('input[name="service"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const svc = services[radio.value];
            state.service = radio.value;
            state.serviceLabel = svc.label;
            // If Medicare is already toggled, use Medicare price
            if (state.hasInsurance && svc.medicareCents) {
                state.servicePrice = svc.medicarePrice;
                state.servicePriceCents = svc.medicareCents;
            } else {
                state.servicePrice = svc.price;
                state.servicePriceCents = svc.cents;
            }
            document.getElementById('next-1').disabled = false;
            updateTravellerCountVisibility();
        });
    });

    // Traveller count buttons
    document.querySelectorAll('.tc-card').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tc-card').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.travellerCount = parseInt(btn.dataset.count);
            updateTravellerPriceNote();
        });
    });

    // Insurance toggle
    const insuranceToggle = document.getElementById('insuranceToggle');
    if (insuranceToggle) {
        insuranceToggle.addEventListener('change', () => {
            state.hasInsurance = insuranceToggle.checked;
            const policySection = document.getElementById('policyNumberSection');
            if (policySection) {
                policySection.style.display = state.hasInsurance ? 'block' : 'none';
            }
            if (!state.hasInsurance) {
                state.policyNumber = '';
                const policyInput = document.getElementById('policyNumber');
                if (policyInput) policyInput.value = '';
            }
            if (state.service === 'travel') {
                updateTravellerPriceLabels();
                updateTravellerPriceNote();
            } else {
                updateNonTravelMedicareDisplay();
            }
        });
    }

    // Policy number input
    const policyInput = document.getElementById('policyNumber');
    if (policyInput) {
        policyInput.addEventListener('input', () => {
            state.policyNumber = policyInput.value.trim();
        });
    }

    document.getElementById('next-1').addEventListener('click', () => {
        if (state.service) goToStep(2);
    });

    // ═══════════════════════════════════════
    //  STEP 2 — Calendar
    // ═══════════════════════════════════════
    const calGrid = document.getElementById('calGrid');
    const calMonth = document.getElementById('calMonth');
    const timeslotGrid = document.getElementById('timeslotGrid');
    const timeslotHeading = document.getElementById('timeslotHeading');

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    async function loadSchedule() {
        try {
            const res = await fetch('/api/schedule');
            if (res.ok) {
                state.scheduleData = await res.json();
            }
        } catch (err) {
            console.log('Schedule API not available, using defaults');
        }
    }

    function isDateAvailable(dateObj) {
        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj <= today) return false;

        // Check if date is blocked
        const dateStr = dateObj.toISOString().split('T')[0];
        if (state.scheduleData && state.scheduleData.blockedDates && state.scheduleData.blockedDates.includes(dateStr)) {
            return false;
        }

        // Check if day of week is enabled
        const dayOfWeek = dateObj.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];

        if (state.scheduleData && state.scheduleData.workingHours) {
            const daySchedule = state.scheduleData.workingHours[dayName];
            if (!daySchedule || !daySchedule.enabled) {
                return false;
            }
        } else {
            // Default: disable weekends if no schedule data
            if (dayOfWeek === 0 || dayOfWeek === 6) return false;
        }

        return true;
    }

    async function renderCalendar() {
        const year = state.calYear;
        const month = state.calMonth;
        const mNames = i18nMonths();
        calMonth.textContent = `${mNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDay = (firstDay + 6) % 7;

        // Schedule data should already be loaded on page init

        calGrid.innerHTML = '';

        for (let i = 0; i < startDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day cal-empty';
            calGrid.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const btn = document.createElement('button');
            btn.className = 'cal-day';
            btn.textContent = d;

            const dateObj = new Date(year, month, d);
            dateObj.setHours(0, 0, 0, 0);
            const dayOfWeek = dateObj.getDay();

            // Check availability based on schedule
            if (!isDateAvailable(dateObj)) {
                btn.classList.add('cal-disabled');
            } else {
                btn.addEventListener('click', () => selectDate(year, month, d, btn));
            }

            if (dateObj.getTime() === today.getTime()) btn.classList.add('cal-today');
            if (state.date && state.date.getTime() === dateObj.getTime()) btn.classList.add('cal-selected');

            calGrid.appendChild(btn);
        }
    }

    function selectDate(year, month, day, btn) {
        state.date = new Date(year, month, day);
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const locale = (window.CLINIC_I18N && window.CLINIC_I18N.getLang() === 'pt') ? 'pt-PT' : 'en-US';
        state.dateLabel = state.date.toLocaleDateString(locale, options);

        calGrid.querySelectorAll('.cal-day').forEach(d => d.classList.remove('cal-selected'));
        btn.classList.add('cal-selected');

        state.time = null;
        document.getElementById('next-2').disabled = true;
        renderTimeslots();
    }

    async function renderTimeslots() {
        timeslotHeading.textContent = state.dateLabel;
        timeslotGrid.innerHTML = '<p class="timeslot-empty">Loading available slots...</p>';

        // Format date as YYYY-MM-DD
        const dateStr = state.date.toISOString().split('T')[0];

        try {
            // Fetch available slots from admin schedule
            const res = await fetch(`/api/admin/available-slots?date=${dateStr}`);
            const data = await res.json();

            timeslotGrid.innerHTML = '';

            if (!data.available || data.available.length === 0) {
                timeslotGrid.innerHTML = '<p class="timeslot-empty">No available slots on this date. Please try another day.</p>';
                return;
            }

            // Filter out past hours if selected date is today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(state.date);
            selectedDate.setHours(0, 0, 0, 0);
            const isToday = selectedDate.getTime() === today.getTime();
            const currentHour = new Date().getHours();
            const currentMinute = new Date().getMinutes();

            let availableSlots = data.available;
            if (isToday) {
                availableSlots = data.available.filter(slot => {
                    const [hour, minute] = slot.split(':').map(Number);
                    const slotTime = hour * 60 + minute;
                    const currentTime = currentHour * 60 + currentMinute;
                    return slotTime > currentTime;
                });
            }

            if (availableSlots.length === 0) {
                timeslotGrid.innerHTML = '<p class="timeslot-empty">No available slots on this date. Please try another day.</p>';
                return;
            }

            availableSlots.forEach(slot => {
                const btn = document.createElement('button');
                btn.className = 'timeslot-btn';
                btn.textContent = slot;
                btn.addEventListener('click', () => {
                    state.time = slot;
                    timeslotGrid.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    document.getElementById('next-2').disabled = false;
                });
                timeslotGrid.appendChild(btn);
            });
        } catch (err) {
            console.error('Failed to load schedule:', err);
            // Fallback to default behavior if schedule API fails
            const slots = [];
            for (let h = 9; h < 17; h++) {
                slots.push(`${h.toString().padStart(2, '0')}:00`);
                slots.push(`${h.toString().padStart(2, '0')}:30`);
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(state.date);
            selectedDate.setHours(0, 0, 0, 0);
            const isToday = selectedDate.getTime() === today.getTime();
            const currentHour = new Date().getHours();
            const currentMinute = new Date().getMinutes();

            let filteredSlots = slots;
            if (isToday) {
                filteredSlots = slots.filter(slot => {
                    const [hour, minute] = slot.split(':').map(Number);
                    const slotTime = hour * 60 + minute;
                    const currentTime = currentHour * 60 + currentMinute;
                    return slotTime > currentTime;
                });
            }

            if (filteredSlots.length === 0) {
                timeslotGrid.innerHTML = '<p class="timeslot-empty">No available slots on this date. Please try another day.</p>';
                return;
            }

            filteredSlots.forEach(slot => {
                const btn = document.createElement('button');
                btn.className = 'timeslot-btn';
                btn.textContent = slot;
                btn.addEventListener('click', () => {
                    state.time = slot;
                    timeslotGrid.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    document.getElementById('next-2').disabled = false;
                });
                timeslotGrid.appendChild(btn);
            });
        }
    }

    document.getElementById('calPrev').addEventListener('click', () => {
        state.calMonth--;
        if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
        renderCalendar();
    });

    document.getElementById('calNext').addEventListener('click', () => {
        state.calMonth++;
        if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
        renderCalendar();
    });

    document.getElementById('next-2').addEventListener('click', () => {
        if (state.date && state.time) goToStep(3);
    });

    document.getElementById('back-2').addEventListener('click', () => goToStep(1));

    // ═══════════════════════════════════════
    //  STEP 3 — Details Form (Multi-Passenger)
    // ═══════════════════════════════════════

    // Passenger panel HTML template
    function createPassengerPanelHTML(index) {
        return `
        <div class="passenger-panel" data-passenger="${index}">
            <h3 class="form-section-title passenger-panel-title">Traveller ${index}</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>First name *</label>
                    <input type="text" class="p-firstName" required placeholder="First name">
                    <span class="form-error">Please enter first name</span>
                </div>
                <div class="form-group">
                    <label>Last name *</label>
                    <input type="text" class="p-lastName" required placeholder="Last name">
                    <span class="form-error">Please enter last name</span>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Date of birth *</label>
                    <input type="date" class="p-dob" required>
                    <span class="form-error">Please enter date of birth</span>
                </div>
                <div class="form-group">
                    <label>NHS number</label>
                    <input type="text" class="p-nhs" placeholder="e.g. 485 777 3456">
                    <span class="form-hint">10-digit NHS number (optional)</span>
                </div>
            </div>
            <div class="form-group">
                <label>Country of residence *</label>
                <select class="p-country" required>
                    <option value="" disabled selected>Select country</option>
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="SE">Sweden</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="NL">Netherlands</option>
                    <option value="NO">Norway</option>
                    <option value="DK">Denmark</option>
                    <option value="FI">Finland</option>
                    <option value="CH">Switzerland</option>
                    <option value="AT">Austria</option>
                    <option value="BE">Belgium</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="PT">Portugal</option>
                    <option value="IE">Ireland</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="NZ">New Zealand</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="SG">Singapore</option>
                    <option value="HK">Hong Kong</option>
                    <option value="JP">Japan</option>
                    <option value="OTHER">Other</option>
                </select>
                <span class="form-error">Please select country</span>
            </div>
            <h4 class="form-subsection-title">Medical background</h4>
            <div class="form-group">
                <label>Health concerns or goals</label>
                <textarea class="p-concerns" rows="3" placeholder="Describe any specific concerns, conditions, or health goals..."></textarea>
            </div>
            <div class="form-group">
                <label>Current medications</label>
                <textarea class="p-medications" rows="2" placeholder="List any current medications, supplements, or treatments..."></textarea>
            </div>
            <div class="form-group">
                <label>Known allergies</label>
                <input type="text" class="p-allergies" placeholder="e.g. Penicillin, latex, none">
            </div>
        </div>`;
    }

    function buildPassengerTabs() {
        const tabsContainer = document.getElementById('passengerTabs');
        const panelsContainer = document.getElementById('passengerPanels');
        const isTravel = state.service === 'travel';
        const count = isTravel ? state.travellerCount : 1;

        // Show/hide tabs
        tabsContainer.style.display = count > 1 ? 'flex' : 'none';

        // Update panel 1 title
        const panel1Title = panelsContainer.querySelector('.passenger-panel[data-passenger="1"] .passenger-panel-title');
        if (panel1Title) {
            panel1Title.textContent = count > 1 ? 'Traveller 1' : 'Patient details';
        }

        // Remove extra panels
        panelsContainer.querySelectorAll('.passenger-panel').forEach(panel => {
            const idx = parseInt(panel.dataset.passenger);
            if (idx > count) panel.remove();
        });

        // Add new panels if needed
        for (let i = 2; i <= count; i++) {
            if (!panelsContainer.querySelector(`.passenger-panel[data-passenger="${i}"]`)) {
                panelsContainer.insertAdjacentHTML('beforeend', createPassengerPanelHTML(i));
            }
        }

        // Build tab buttons
        if (count > 1) {
            tabsContainer.innerHTML = '';
            for (let i = 1; i <= count; i++) {
                const tab = document.createElement('button');
                tab.type = 'button';
                tab.className = `passenger-tab${i === 1 ? ' active' : ''}`;
                tab.dataset.passenger = i;
                tab.innerHTML = `<span class="passenger-tab-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>Traveller ${i}`;
                tab.addEventListener('click', () => switchPassengerTab(i));
                tabsContainer.appendChild(tab);
            }
        }

        // Show first panel, hide rest
        switchPassengerTab(1);

        // Re-bind live validation on all new fields
        bindLiveValidation();
    }

    function switchPassengerTab(index) {
        document.querySelectorAll('.passenger-tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.passenger-tab[data-passenger="${index}"]`);
        if (activeTab) activeTab.classList.add('active');

        document.querySelectorAll('.passenger-panel').forEach(p => {
            p.classList.toggle('active', parseInt(p.dataset.passenger) === index);
        });
    }

    function initDetailsForm() {
        const isTravel = state.service === 'travel';

        // Show/hide shared travel section
        const sharedTravelSection = document.getElementById('sharedTravelSection');
        if (sharedTravelSection) sharedTravelSection.style.display = isTravel ? 'block' : 'none';

        // Build passenger panels / tabs
        buildPassengerTabs();
    }

    // Collect all passenger data
    function getPassengersData() {
        const passengers = [];
        const count = state.service === 'travel' ? state.travellerCount : 1;
        for (let i = 1; i <= count; i++) {
            const panel = document.querySelector(`.passenger-panel[data-passenger="${i}"]`);
            if (!panel) continue;
            passengers.push({
                firstName: panel.querySelector('.p-firstName')?.value?.trim() || '',
                lastName: panel.querySelector('.p-lastName')?.value?.trim() || '',
                dob: panel.querySelector('.p-dob')?.value || '',
                nhs: panel.querySelector('.p-nhs')?.value?.trim() || '',
                country: panel.querySelector('.p-country')?.value || '',
                concerns: panel.querySelector('.p-concerns')?.value?.trim() || '',
                medications: panel.querySelector('.p-medications')?.value?.trim() || '',
                allergies: panel.querySelector('.p-allergies')?.value?.trim() || ''
            });
        }
        return passengers;
    }

    function validateForm() {
        let valid = true;
        const count = state.service === 'travel' ? state.travellerCount : 1;
        let firstInvalidTab = null;

        // Contact fields
        ['email', 'phone'].forEach(id => {
            const field = document.getElementById(id);
            const group = field.closest('.form-group');
            if (!field.value.trim()) {
                group.classList.add('invalid');
                valid = false;
            } else {
                group.classList.remove('invalid');
            }
        });

        const email = document.getElementById('email');
        if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            email.closest('.form-group').classList.add('invalid');
            valid = false;
        }

        // Shared travel fields
        if (state.service === 'travel') {
            const dest = document.getElementById('travelDest');
            if (dest && !dest.value.trim()) {
                dest.closest('.form-group').classList.add('invalid');
                valid = false;
            } else if (dest) {
                dest.closest('.form-group').classList.remove('invalid');
            }
            const dates = document.getElementById('travelDates');
            if (dates && !dates.value.trim()) {
                dates.closest('.form-group').classList.add('invalid');
                valid = false;
            } else if (dates) {
                dates.closest('.form-group').classList.remove('invalid');
            }
        }

        // Per-passenger validation
        for (let i = 1; i <= count; i++) {
            const panel = document.querySelector(`.passenger-panel[data-passenger="${i}"]`);
            if (!panel) continue;

            const required = [
                { cls: '.p-firstName', msg: 'first name' },
                { cls: '.p-lastName', msg: 'last name' },
                { cls: '.p-dob', msg: 'date of birth' },
                { cls: '.p-country', msg: 'country' }
            ];

            required.forEach(({ cls }) => {
                const field = panel.querySelector(cls);
                const group = field?.closest('.form-group');
                if (field && !field.value.trim()) {
                    group?.classList.add('invalid');
                    valid = false;
                    if (!firstInvalidTab) firstInvalidTab = i;
                } else {
                    group?.classList.remove('invalid');
                }
            });
        }

        // Checkboxes
        ['consent', 'terms'].forEach(id => {
            const checkbox = document.getElementById(id);
            const group = checkbox.closest('.form-checkbox-group');
            if (!checkbox.checked) {
                group.classList.add('invalid');
                valid = false;
            } else {
                group.classList.remove('invalid');
            }
        });

        // Switch to the tab with the first error
        if (firstInvalidTab && count > 1) {
            switchPassengerTab(firstInvalidTab);
        }

        return valid;
    }

    // Live validation clearing
    function bindLiveValidation() {
        document.querySelectorAll('.details-form input, .details-form select, .details-form textarea').forEach(el => {
            // Remove old listener by cloning (simple approach)
            el.addEventListener('input', () => {
                const group = el.closest('.form-group') || el.closest('.form-checkbox-group');
                if (group) group.classList.remove('invalid');
            });
        });

        document.querySelectorAll('.details-form input[type="checkbox"]').forEach(el => {
            el.addEventListener('change', () => {
                const group = el.closest('.form-checkbox-group');
                if (group) group.classList.remove('invalid');
            });
        });
    }
    bindLiveValidation();

    document.getElementById('next-3').addEventListener('click', () => {
        if (validateForm()) goToStep(4);
    });

    document.getElementById('back-3').addEventListener('click', () => goToStep(2));

    // ═══════════════════════════════════════
    //  STEP 4 — Review & Pay (Stripe)
    // ═══════════════════════════════════════
    
    // Discount codes
    const discountCodes = {
        'ME2026': 99  // 99% discount
    };

    function validateDiscountCode(code) {
        const upperCode = code.toUpperCase().trim();
        if (discountCodes[upperCode]) {
            return discountCodes[upperCode];
        }
        return null;
    }

    function applyDiscount() {
        const codeInput = document.getElementById('discountCode');
        const messageEl = document.getElementById('discountMessage');
        const code = codeInput.value.trim();
        
        if (!code) {
            messageEl.style.display = 'none';
            state.discountCode = '';
            state.discountPercent = 0;
            updateReviewAndSummary();
            return;
        }

        const discount = validateDiscountCode(code);
        if (discount !== null) {
            state.discountCode = code.toUpperCase();
            state.discountPercent = discount;
            // Calculate actual discount considering Stripe minimum
            const subtotalCents = state.service === 'travel' ? state.servicePriceCents : state.servicePriceCents * state.travellerCount;
            const maxDiscountCents = Math.round(subtotalCents * (discount / 100));
            const finalCents = Math.max(50, subtotalCents - maxDiscountCents);
            const actualDiscountPercent = Math.round(((subtotalCents - finalCents) / subtotalCents) * 100);
            messageEl.textContent = `Discount code "${state.discountCode}" applied: ${actualDiscountPercent}% off (minimum €0.50)`;
            messageEl.className = 'discount-message discount-success';
            messageEl.style.display = 'block';
            updateReviewAndSummary();
        } else {
            state.discountCode = '';
            state.discountPercent = 0;
            messageEl.textContent = 'Invalid discount code';
            messageEl.className = 'discount-message discount-error';
            messageEl.style.display = 'block';
            updateReviewAndSummary();
        }
    }

    // Discount code event listeners
    const discountInput = document.getElementById('discountCode');
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');
    
    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', applyDiscount);
    }
    
    if (discountInput) {
        discountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyDiscount();
            }
        });
    }

    function updateReviewAndSummary() {
        const emailVal = document.getElementById('email').value;
        const passengers = getPassengersData();
        const count = passengers.length;
        const isTravel = state.service === 'travel';
        // For travel: flat tiered price already set in state.servicePriceCents
        // For others: price × count
        let subtotalCents = isTravel ? state.servicePriceCents : state.servicePriceCents * count;
        
        // Apply discount
        let discountCents = 0;
        if (state.discountPercent > 0) {
            discountCents = Math.round(subtotalCents * (state.discountPercent / 100));
        }
        let totalCents = subtotalCents - discountCents;
        // Ensure minimum of 50 cents (Stripe minimum for EUR)
        const STRIPE_MINIMUM = 50;
        if (totalCents < STRIPE_MINIMUM) {
            discountCents = subtotalCents - STRIPE_MINIMUM;
            totalCents = STRIPE_MINIMUM;
        }
        const totalFormatted = `€${(totalCents / 100).toFixed(0)}`;
        const subtotalFormatted = `€${(subtotalCents / 100).toFixed(0)}`;
        const discountFormatted = discountCents > 0 ? `-€${(discountCents / 100).toFixed(0)}` : '';

        // Appointment review card
        const serviceText = state.hasInsurance ? `${state.serviceLabel} (Medicare)` : state.serviceLabel;
        document.getElementById('reviewService').textContent = serviceText;
        document.getElementById('reviewDate').textContent = state.dateLabel;
        document.getElementById('reviewTime').textContent = state.time;

        // Medicare card
        const medicareCard = document.getElementById('reviewMedicareCard');
        if (medicareCard) {
            if (state.hasInsurance) {
                medicareCard.style.display = 'block';
                document.getElementById('reviewPolicyNumber').textContent = state.policyNumber || '—';
            } else {
                medicareCard.style.display = 'none';
            }
        }

        // Travel card
        const travelCard = document.getElementById('reviewTravelCard');
        if (isTravel) {
            travelCard.style.display = 'block';
            document.getElementById('reviewDest').textContent = document.getElementById('travelDest')?.value || '—';
            document.getElementById('reviewTravelDates').textContent = document.getElementById('travelDates')?.value || '—';
        } else {
            travelCard.style.display = 'none';
        }

        // Patient(s) review cards
        const container = document.getElementById('reviewPatientsContainer');
        container.innerHTML = '';

        passengers.forEach((p, i) => {
            const card = document.createElement('div');
            card.className = 'review-card';
            const title = count > 1 ? `Traveller ${i + 1}` : 'Patient';
            card.innerHTML = `
                <h3 class="review-card-title">${title}</h3>
                <div class="review-row">
                    <span class="review-label">Name</span>
                    <span class="review-value">${p.firstName} ${p.lastName}</span>
                </div>
                ${p.nhs ? `<div class="review-row"><span class="review-label">NHS number</span><span class="review-value">${p.nhs}</span></div>` : ''}
                <div class="review-row">
                    <span class="review-label">Date of birth</span>
                    <span class="review-value">${p.dob}</span>
                </div>
                ${i === 0 ? `<div class="review-row"><span class="review-label">Email</span><span class="review-value">${emailVal}</span></div>` : ''}
            `;
            container.appendChild(card);
        });

        // Summary sidebar
        document.getElementById('summaryService').textContent = state.serviceLabel;
        document.getElementById('summaryPrice').textContent = state.servicePrice;
        document.getElementById('summaryDate').textContent = state.dateLabel;
        document.getElementById('summaryTime').textContent = state.time;

        // Patient vs travellers
        const patientRow = document.getElementById('summaryPatientRow');
        const travellersRow = document.getElementById('summaryTravellersRow');
        const subtotalRow = document.getElementById('summarySubtotalRow');

        if (count > 1) {
            patientRow.style.display = 'none';
            travellersRow.style.display = 'flex';
            document.getElementById('summaryTravellers').textContent = passengers.map(p => `${p.firstName} ${p.lastName}`).join(', ');
            if (isTravel) {
                // Flat tiered price, no per-person breakdown
                subtotalRow.style.display = 'flex';
                const personLabel = count === 1 ? '1 person' : `${count} persons`;
                const insuranceNote = state.hasInsurance ? ' (Medicare)' : '';
                document.getElementById('summarySubtotalLabel').textContent = `${personLabel}${insuranceNote}`;
                document.getElementById('summarySubtotal').textContent = totalFormatted;
            } else {
                subtotalRow.style.display = 'flex';
                document.getElementById('summarySubtotalLabel').textContent = `${state.servicePrice} × ${count} travellers`;
                document.getElementById('summarySubtotal').textContent = totalFormatted;
            }
        } else {
            patientRow.style.display = 'flex';
            travellersRow.style.display = 'none';
            if (isTravel && state.hasInsurance) {
                subtotalRow.style.display = 'flex';
                document.getElementById('summarySubtotalLabel').textContent = 'Medicare rate';
                document.getElementById('summarySubtotal').textContent = totalFormatted;
            } else {
                subtotalRow.style.display = 'none';
            }
            document.getElementById('summaryPatient').textContent = `${passengers[0].firstName} ${passengers[0].lastName}`;
        }

        // Show/hide discount row
        const discountRow = document.getElementById('summaryDiscountRow');
        if (discountCents > 0) {
            discountRow.style.display = 'flex';
            document.getElementById('summaryDiscount').textContent = discountFormatted;
        } else {
            discountRow.style.display = 'none';
        }

        document.getElementById('summaryTotal').textContent = totalFormatted;
    }

    document.getElementById('back-4').addEventListener('click', () => goToStep(3));

    // ─── Pay Button → Create Stripe Checkout Session ───
    const payBtn = document.getElementById('next-4');
    const stripeError = document.getElementById('stripeError');

    payBtn.addEventListener('click', async () => {
        payBtn.disabled = true;
        payBtn.innerHTML = `
            <div class="processing-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></div>
            Redirecting to Stripe...
        `;
        if (stripeError) stripeError.style.display = 'none';

        const passengers = getPassengersData();
        const isTravel = state.service === 'travel';
        // Travel uses flat tiered pricing; others use per-person
        let subtotalCents = isTravel ? state.servicePriceCents : state.servicePriceCents * passengers.length;
        
        // Apply discount
        let discountCents = 0;
        if (state.discountPercent > 0) {
            discountCents = Math.round(subtotalCents * (state.discountPercent / 100));
        }
        let totalCents = subtotalCents - discountCents;
        // Ensure minimum of 50 cents (Stripe minimum for EUR)
        const STRIPE_MINIMUM = 50;
        if (totalCents < STRIPE_MINIMUM) {
            discountCents = subtotalCents - STRIPE_MINIMUM;
            totalCents = STRIPE_MINIMUM;
        }

        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service: state.service,
                    serviceLabel: state.serviceLabel,
                    priceAmount: totalCents,
                    discountCode: state.discountCode || null,
                    discountPercent: state.discountPercent || 0,
                    travellerCount: passengers.length,
                    hasInsurance: state.hasInsurance,
                    policyNumber: state.policyNumber || '',
                    date: state.dateLabel,
                    time: state.time,
                    patientName: `${passengers[0].firstName} ${passengers[0].lastName}`,
                    patientEmail: document.getElementById('email').value,
                    patientPhone: document.getElementById('phone').value,
                    passengers: passengers,
                    travelDest: document.getElementById('travelDest')?.value || '',
                    travelDates: document.getElementById('travelDates')?.value || ''
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create payment session');
            }

            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (err) {
            console.error('Stripe checkout error:', err);
            if (stripeError) {
                stripeError.textContent = `Payment error: ${err.message}. Please try again.`;
                stripeError.style.display = 'block';
            }
            payBtn.disabled = false;
            payBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Proceed to secure payment
            `;
        }
    });

    // ═══════════════════════════════════════
    //  STRIPE RETURN HANDLERS
    // ═══════════════════════════════════════
    
    // Generate Google Calendar URL
    function generateGoogleCalendarUrl(data) {
        try {
            // Parse date and time
            // Date format: "Wednesday, 18 February 2026" or similar locale-specific format
            // Time format: "14:30" or "09:00"
            const dateStr = data.date || '';
            const timeStr = data.time || '';
            
            if (!dateStr || !timeStr) {
                return null;
            }

            // Try multiple parsing strategies
            let appointmentDate = null;
            
            // Strategy 1: Try parsing the date string directly
            appointmentDate = new Date(dateStr);
            
            // Strategy 2: If that fails, try combining date and time
            if (isNaN(appointmentDate.getTime())) {
                appointmentDate = new Date(`${dateStr} ${timeStr}`);
            }
            
            // Strategy 3: Try parsing with common date formats
            if (isNaN(appointmentDate.getTime())) {
                // Try to extract date parts from common formats
                // Format: "Wednesday, 18 February 2026" or "Wednesday, February 18, 2026"
                const dateMatch = dateStr.match(/(\d{1,2})[\s,]+(\w+)[\s,]+(\d{4})/);
                if (dateMatch) {
                    const day = parseInt(dateMatch[1]);
                    const monthName = dateMatch[2];
                    const year = parseInt(dateMatch[3]);
                    
                    const monthMap = {
                        'january': 0, 'february': 1, 'march': 2, 'april': 3,
                        'may': 4, 'june': 5, 'july': 6, 'august': 7,
                        'september': 8, 'october': 9, 'november': 10, 'december': 11
                    };
                    const month = monthMap[monthName.toLowerCase()];
                    if (month !== undefined) {
                        appointmentDate = new Date(year, month, day);
                    }
                }
            }
            
            if (!appointmentDate || isNaN(appointmentDate.getTime())) {
                console.warn('Could not parse date:', dateStr);
                return null;
            }

            // Extract hour and minute from time string (format: "HH:MM")
            const [hours, minutes] = timeStr.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) {
                console.warn('Could not parse time:', timeStr);
                return null;
            }
            
            appointmentDate.setHours(hours, minutes, 0, 0);

            // Calculate end time based on service type
            let durationMinutes = 45; // Default
            if (data.service === 'travel') {
                // Travel duration depends on traveller count
                const count = data.travellerCount || 1;
                if (count === 1) durationMinutes = 20;
                else if (count === 2) durationMinutes = 30;
                else durationMinutes = 40;
            } else if (data.service === 'followup') {
                durationMinutes = 30;
            } else if (data.service === 'longevity') {
                durationMinutes = 60;
            } else if (data.service === 'lifestyle' || data.service === 'cessation') {
                durationMinutes = 30;
            } else if (data.service === 'renewal') {
                durationMinutes = 15;
            }

            const endDate = new Date(appointmentDate);
            endDate.setMinutes(endDate.getMinutes() + durationMinutes);

            // Format dates for Google Calendar (YYYYMMDDTHHMMSS format, local time)
            // Google Calendar will handle timezone conversion
            function formatGoogleDate(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}${month}${day}T${hours}${minutes}${seconds}`;
            }

            const startDateStr = formatGoogleDate(appointmentDate);
            const endDateStr = formatGoogleDate(endDate);

            // Build event details
            const serviceLabels = {
                longevity: i18nServiceLabel('longevity'),
                travel: i18nServiceLabel('travel'),
                lifestyle: i18nServiceLabel('lifestyle'),
                cessation: i18nServiceLabel('cessation'),
                renewal: i18nServiceLabel('renewal'),
                followup: i18nServiceLabel('followup'),
            };
            
            const eventTitle = encodeURIComponent(serviceLabels[data.service] || data.service || 'Medical Consultation');
            
            let description = `Booking Reference: ${data.bookingRef || 'N/A'}\n`;
            description += `Service: ${serviceLabels[data.service] || data.service}\n`;
            if (data.patientName) {
                description += `Patient: ${data.patientName}\n`;
            }
            description += `\nThis is a secure video consultation. You will receive a video call link via email.\n`;
            description += `\nFor any questions, please contact us.`;
            
            const encodedDescription = encodeURIComponent(description);
            const location = encodeURIComponent('Video Consultation - Link will be sent via email');

            // Build Google Calendar URL
            const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
                `&text=${eventTitle}` +
                `&dates=${startDateStr}/${endDateStr}` +
                `&details=${encodedDescription}` +
                `&location=${location}` +
                `&sf=true` +
                `&output=xml`;

            return calendarUrl;
        } catch (err) {
            console.error('Error generating Google Calendar URL:', err);
            return null;
        }
    }

    async function handleStripeReturn(sessionId) {
        // Show loading state
        document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
        document.getElementById('step-5').classList.add('active');

        // Update progress bar to completed
        document.querySelectorAll('.progress-step').forEach(ps => {
            ps.classList.remove('active');
            ps.classList.add('completed');
        });
        document.querySelector('.progress-step[data-step="5"]').classList.remove('completed');
        document.querySelector('.progress-step[data-step="5"]').classList.add('active');
        document.querySelectorAll('.progress-line').forEach(l => l.classList.add('filled'));

        try {
            const response = await fetch(`/api/session/${sessionId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load booking details');
            }

            // Map service key to label (i18n-aware)
            const serviceLabels = {
                longevity: i18nServiceLabel('longevity'),
                travel: i18nServiceLabel('travel'),
                lifestyle: i18nServiceLabel('lifestyle'),
                cessation: i18nServiceLabel('cessation'),
                renewal: i18nServiceLabel('renewal'),
                followup: i18nServiceLabel('followup'),
            };

            document.getElementById('confirmEmail').textContent = data.email || '—';
            document.getElementById('confirmService').textContent = serviceLabels[data.service] || data.service;
            document.getElementById('confirmDateTime').textContent = `${data.date} at ${data.time}`;
            document.getElementById('confirmAmount').textContent = `€${(data.amount / 100).toFixed(0)}`;
            document.getElementById('confirmRef').textContent = data.bookingRef || '—';

            // Generate and set Google Calendar URL
            const calendarBtn = document.getElementById('addToCalendarBtn');
            if (calendarBtn) {
                const calendarUrl = generateGoogleCalendarUrl(data);
                if (calendarUrl) {
                    calendarBtn.href = calendarUrl;
                    // Button is visible by default, no need to set display
                } else {
                    // Hide button if we can't generate the URL
                    calendarBtn.style.display = 'none';
                }
            }

        } catch (err) {
            console.error('Error loading confirmation:', err);
            document.getElementById('confirmEmail').textContent = '—';
            document.getElementById('confirmService').textContent = 'Your consultation';
            document.getElementById('confirmDateTime').textContent = 'Check your email for details';
            document.getElementById('confirmAmount').textContent = '—';
            document.getElementById('confirmRef').textContent = 'See confirmation email';
            
            // Hide calendar button on error
            const calendarBtn = document.getElementById('addToCalendarBtn');
            if (calendarBtn) {
                calendarBtn.style.display = 'none';
            }
        }
    }

    function showCancelledMessage() {
        // User came back from Stripe without paying — just let them continue from step 1
        console.log('Payment was cancelled. User can restart booking.');
    }

    // ─── i18n language change callback ───
    window.BOOKING_LANG_CHANGED = function (lang) {
        // Re-render calendar with new month names
        if (state.currentStep === 2) renderCalendar();

        // Update weekday headers
        const wdays = window.CLINIC_I18N ? window.CLINIC_I18N.getWeekdayNames() : null;
        if (wdays) {
            document.querySelectorAll('.calendar-weekdays span').forEach((span, i) => {
                if (wdays[i]) span.textContent = wdays[i];
            });
        }

        // Update service label in state
        if (state.service && services[state.service]) {
            state.serviceLabel = i18nServiceLabel(state.service);
        }

        // Re-render review if on step 4
        if (state.currentStep === 4) updateReviewAndSummary();
    };

    // ─── Preload ───
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

});
