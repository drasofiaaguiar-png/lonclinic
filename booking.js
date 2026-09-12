/* ========================================
   Booking Flow — JavaScript (Stripe Checkout)
   Multi-passenger support for Travel Medicine
======================================== */

/* ─── Route boundaries (not found / error) — mirrors the app root route's
   notFoundComponent / errorComponent, in plain DOM. ─── */
const BOOKING_BOUNDARY_COPY = {
    pt: {
        nfTitle: 'Consulta não encontrada',
        nfDesc: 'Este tipo de consulta não existe ou já não está disponível.',
        nfPrimary: 'Ver consultas',
        home: 'Ir para o início',
        errTitle: 'Esta página não carregou',
        errDesc: 'Algo falhou do nosso lado. Pode tentar de novo ou voltar ao início.',
        retry: 'Tentar novamente'
    },
    en: {
        nfTitle: 'Consultation not found',
        nfDesc: 'This consultation type doesn\'t exist or is no longer available.',
        nfPrimary: 'See consultations',
        home: 'Go home',
        errTitle: 'This page didn\'t load',
        errDesc: 'Something went wrong on our end. You can try again or head back home.',
        retry: 'Try again'
    },
    es: {
        nfTitle: 'Consulta no encontrada',
        nfDesc: 'Este tipo de consulta no existe o ya no está disponible.',
        nfPrimary: 'Ver consultas',
        home: 'Ir al inicio',
        errTitle: 'Esta página no cargó',
        errDesc: 'Algo falló de nuestro lado. Puede intentarlo de nuevo o volver al inicio.',
        retry: 'Intentar de nuevo'
    }
};

function bookingBoundaryLang() {
    try {
        if (window.CLINIC_I18N && typeof window.CLINIC_I18N.getLang === 'function') {
            const l = window.CLINIC_I18N.getLang();
            if (BOOKING_BOUNDARY_COPY[l]) return l;
        }
        const s = localStorage.getItem('clinic_lang');
        if (BOOKING_BOUNDARY_COPY[s]) return s;
    } catch (e) { /* ignore */ }
    return 'pt';
}

function hideBookingFlowChrome() {
    document.querySelectorAll('.booking-step').forEach((s) => s.classList.remove('active'));
    const progress = document.querySelector('.booking-progress');
    if (progress) progress.hidden = true;
    const banner = document.querySelector('.booking-container > .lon-lang-banner');
    if (banner) banner.hidden = true;
}

function reportBookingError(error, boundary) {
    try {
        if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
            window.LonAnalytics.track('client_error', {
                surface: 'booking',
                boundary,
                message: String((error && error.message) || error).slice(0, 300)
            });
        }
    } catch (e) { /* never block the boundary */ }
}

function showBookingNotFound(requestedService) {
    const el = document.getElementById('bookingNotFound');
    if (!el) return;
    const c = BOOKING_BOUNDARY_COPY[bookingBoundaryLang()];
    hideBookingFlowChrome();
    const title = document.getElementById('bookingNotFoundTitle');
    const desc = document.getElementById('bookingNotFoundDesc');
    const primary = document.getElementById('bookingNotFoundPrimary');
    const home = document.getElementById('bookingNotFoundHome');
    if (title) title.textContent = c.nfTitle;
    if (desc) desc.textContent = c.nfDesc;
    if (primary) primary.textContent = c.nfPrimary;
    if (home) home.textContent = c.home;
    el.hidden = false;
    reportBookingError(new Error('Unknown service: ' + requestedService), 'booking_not_found');
}

function showBookingError(error) {
    console.error(error);
    const el = document.getElementById('bookingError');
    if (!el) return;
    const c = BOOKING_BOUNDARY_COPY[bookingBoundaryLang()];
    hideBookingFlowChrome();
    const title = document.getElementById('bookingErrorTitle');
    const desc = document.getElementById('bookingErrorDesc');
    const retry = document.getElementById('bookingErrorRetry');
    const home = document.getElementById('bookingErrorHome');
    if (title) title.textContent = c.errTitle;
    if (desc) desc.textContent = c.errDesc;
    if (home) home.textContent = c.home;
    if (retry) {
        retry.textContent = c.retry;
        // "router.invalidate() + reset()" equivalent: reload the route, keeping the query string.
        retry.addEventListener('click', () => window.location.reload(), { once: true });
    }
    el.hidden = false;
    document.body.classList.add('loaded');
    reportBookingError(error, 'booking_root_error_component');
}

document.addEventListener('DOMContentLoaded', () => {
    const printBtn = document.getElementById('printConfirmationBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
    initBookingFlow().catch(showBookingError);
});

async function initBookingFlow() {

    // ─── State ───
    const state = {
        currentStep: 1,
        service: null,
        serviceLabel: '',
        servicePrice: '',
        servicePriceCents: 0,
        travellerCount: 1,   // 1–4 for travel
        hasInsurance: false,  // Medicare toggle
        date: null,
        dateLabel: '',
        time: null,
        calMonth: new Date().getMonth(),
        calYear: new Date().getFullYear(),
        discountCode: '',
        discountPercent: 0,
        scheduleData: null, // Admin schedule configuration
        fromMarcar: false,
        marcarTipo: null,
        renewToken: null,
        holdId: null,
        slotId: null,
        consultLangPolicy: false,
        professionalId: null,
        professionalName: null,
        professionalBio: null,
        professionalPhotoUrl: null,
        specialty: null,
        bookableDates: [],
        slotMode: 'clinic',
        checkoutProsAtTime: [],
        checkoutContextKey: null
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

    function formatDateLocal(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function parseStoredDate(dateValue) {
        if (!dateValue) return null;
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue));
        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        }
        const parsed = new Date(dateValue);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    // Load schedule on page load
    await loadSchedule();

    const services = {
        clinica_geral: { label: 'Consulta Clínica Geral / Check Up', price: '39 €', cents: 3900 },
        urgente: { label: 'Consulta Médica Urgente (Adultos)', price: '35 €', cents: 3500 },
        travel: { label: 'Consulta do Viajante', price: '39 €', cents: 3900 },
        saude_mental: { label: 'Consulta Médica de Saúde Mental', price: '60 €', cents: 6000 },
        burnout: { label: 'Consulta Especializada em Burnout', price: '60 €', cents: 6000 },
        burnout_mensal: { label: 'Subscrição Anti-Burnout', price: '216 €/mês', cents: 21600 },
        burnout_programa: { label: 'Programa Anti-Burnout (8 sessões)', price: '490 €', cents: 49000 },
        renovacao: { label: 'Renovação de Tratamento Médico', price: '19 €', cents: 1900 },
        longevidade: { label: 'Consulta de Longevidade e Saúde Preventiva', price: '79 €', cents: 7900 },
        nutricao_consulta: { label: 'Consulta de nutrição', price: '45 €', cents: 4500 },
        nutricao_programa: { label: 'Programa de perda de peso · 6 meses (acompanhamento médico + nutrição)', price: '115 €', cents: 11500 },
        nutricao_completo: { label: 'Programa Completo (nutrição + psicologia) — mês 1', price: '227 €', cents: 22700 },
        nutricao_completo_reforcado: { label: 'Programa Completo — entrada reforçada', price: '322 €', cents: 32200 },
        psicologia: { label: 'Sessão de Psicologia', price: '60 €', cents: 6000 },
        psicologia_mensal: { label: 'Subscrição de Psicologia', price: '224 €/mês', cents: 22400 },
        terapia_casal: { label: 'Terapia de casal', price: '75 €', cents: 7500 },
        terapia_casal_mensal: { label: 'Subscrição de terapia de casal', price: '260 €/mês', cents: 26000 }
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

    /** Locale for confirmation email: en (default), pt, es — matches i18n + hidden #bookingLocale */
    function getBookingLocale() {
        const hidden = document.getElementById('bookingLocale');
        if (hidden && hidden.value) return hidden.value;
        if (window.CLINIC_I18N && typeof window.CLINIC_I18N.getLang === 'function') {
            return window.CLINIC_I18N.getLang();
        }
        try {
            const s = localStorage.getItem('clinic_lang');
            if (s === 'pt' || s === 'es') return s;
        } catch (e) { /* ignore */ }
        return 'en';
    }

    const TYPE_DROPDOWN_KEYS = [
        'clinica_geral', 'urgente', 'psicologia', 'terapia_casal', 'nutricao_programa',
        'burnout', 'travel', 'longevidade', 'renovacao'
    ];
    const TYPE_TO_SLUG = {
        urgente: 'urgente',
        infeccao_urinaria: 'infeccao-urinaria',
        clinica_geral: 'clinica-geral',
        renovacao: 'renovacao',
        travel: 'travel',
        saude_mental: 'saude-mental',
        burnout: 'burnout',
        burnout_mensal: 'burnout-mensal',
        burnout_programa: 'burnout-programa',
        longevidade: 'longevidade',
        nutricao_consulta: 'nutricao-consulta',
        nutricao_programa: 'nutricao-programa',
        nutricao_completo: 'nutricao-completo',
        nutricao_completo_reforcado: 'nutricao-completo-reforcado',
        psicologia: 'psicologia',
        psicologia_mensal: 'psicologia-mensal',
        terapia_casal: 'terapia-casal',
        terapia_casal_mensal: 'terapia-casal-mensal'
    };
    /* Subscription / program first (preferred), one-off second. */
    const CHECKOUT_PLAN_FAMILIES = {
        psicologia: ['psicologia_mensal', 'psicologia'],
        terapia_casal: ['terapia_casal_mensal', 'terapia_casal'],
        nutricao: ['nutricao_programa', 'nutricao_consulta']
    };
    function planFamilyFor(serviceKey) {
        const key = String(serviceKey || '');
        if (key === 'psicologia' || key === 'psicologia_mensal') return 'psicologia';
        if (key === 'terapia_casal' || key === 'terapia_casal_mensal') return 'terapia_casal';
        if (key.indexOf('nutricao_') === 0) return 'nutricao';
        return null;
    }
    function isPsychStaffService(serviceKey) {
        const family = planFamilyFor(serviceKey);
        return family === 'psicologia' || family === 'terapia_casal';
    }
    const TYPE_DROPDOWN_FALLBACK = {
        clinica_geral: 'Clínica Geral / Check-up',
        urgente: 'Consulta Médica Urgente',
        psicologia: 'Saúde Mental / Psicologia',
        terapia_casal: 'Terapia de casal',
        nutricao_programa: 'Nutrição',
        burnout: 'Burnout',
        travel: 'Medicina do Viajante',
        longevidade: 'Longevidade',
        renovacao: 'Renovação de tratamento'
    };

    function bookingString(key, fallback) {
        if (window.CLINIC_I18N && typeof window.CLINIC_I18N.getBookingString === 'function') {
            const value = window.CLINIC_I18N.getBookingString(key);
            if (value != null && value !== '') return value;
        }
        return fallback;
    }

    function dropdownValueFor(serviceKey) {
        if (!serviceKey) return 'clinica_geral';
        if (serviceKey.indexOf('burnout') === 0) return 'burnout';
        if (serviceKey.indexOf('psicologia') === 0) return 'psicologia';
        if (serviceKey.indexOf('terapia_casal') === 0) return 'terapia_casal';
        if (serviceKey.indexOf('nutricao_') === 0) return 'nutricao_programa';
        return serviceKey;
    }

    function formatEurFromCents(cents) {
        const value = Number(cents || 0) / 100;
        if (Number.isInteger(value)) return value + ' €';
        return value.toFixed(2).replace('.', ',') + ' €';
    }

    function isMonthlySubscription(serviceKey) {
        return serviceKey === 'psicologia_mensal'
            || serviceKey === 'terapia_casal_mensal'
            || serviceKey === 'burnout_mensal';
    }

    function monthlyPriceSuffix() {
        const lang = getBookingLocale();
        if (lang === 'en') return '/month';
        if (lang === 'es') return '/mes';
        return '/mês';
    }

    function formatPayablePrice(cents, serviceKey) {
        const text = formatEurFromCents(cents);
        if (isMonthlySubscription(serviceKey || state.service)) return text + monthlyPriceSuffix();
        return text;
    }

    function currentTotalCents() {
        const isTravel = state.service === 'travel';
        const count = isTravel ? 1 : Math.max(1, state.travellerCount || 1);
        let subtotalCents = isTravel ? state.servicePriceCents : state.servicePriceCents * count;
        let discountCents = 0;
        if (state.discountPercent > 0) {
            discountCents = Math.round(subtotalCents * (state.discountPercent / 100));
        }
        let totalCents = subtotalCents - discountCents;
        if (totalCents < 50) totalCents = 50;
        return totalCents;
    }

    function serviceDurationLabel(serviceKey) {
        if (state.service === 'travel') {
            const tp = getCurrentTravelPrice();
            if (tp && tp.duration) return tp.duration;
        }
        const durations = bookingString('durations', null);
        if (durations && durations[serviceKey]) return durations[serviceKey];
        if (state.serviceDuration) return state.serviceDuration;
        return '';
    }

    function payButtonLabel(priceText) {
        const tmpl = bookingString('payCta', 'Pagar {price}');
        return String(tmpl).replace('{price}', priceText);
    }

    function slotServiceLocked() {
        return !!(state.date && state.time);
    }

    function fillCheckoutTypeSelect() {
        const select = document.getElementById('checkoutServiceType');
        if (!select) return;
        const labels = bookingString('typeOptions', TYPE_DROPDOWN_FALLBACK) || TYPE_DROPDOWN_FALLBACK;
        const selected = dropdownValueFor(state.service);
        const keys = TYPE_DROPDOWN_KEYS.slice();
        if (state.service && keys.indexOf(selected) < 0) keys.unshift(state.service);
        select.innerHTML = keys.map((key) => {
            const label = labels[key] || i18nServiceLabel(key) || (services[key] && services[key].label) || key;
            return `<option value="${key}">${label}</option>`;
        }).join('');
        select.value = selected;
        const locked = slotServiceLocked();
        const typeName = document.getElementById('checkoutTypeName');
        const typeLabel = document.getElementById('checkoutTypeLabel');
        const typeRow = select.closest('.checkout-type-row');
        select.hidden = locked;
        select.disabled = locked;
        if (typeLabel) typeLabel.hidden = locked;
        if (typeRow) typeRow.classList.toggle('is-locked', locked);
        if (typeName) {
            const fromSelect = select.options[select.selectedIndex]
                ? select.options[select.selectedIndex].textContent
                : '';
            typeName.textContent = state.serviceLabel || fromSelect || '';
            typeName.hidden = !locked || !typeName.textContent;
        }
    }

    function saveCheckoutDraft() {
        try {
            const first = document.querySelector('.p-firstName');
            const last = document.querySelector('.p-lastName');
            const email = document.getElementById('email');
            const phone = document.getElementById('phone');
            sessionStorage.setItem('lonCheckoutDraft', JSON.stringify({
                firstName: first ? first.value : '',
                lastName: last ? last.value : '',
                email: email ? email.value : '',
                phone: phone ? phone.value : ''
            }));
        } catch (e) { /* ignore */ }
    }

    function restoreCheckoutDraft() {
        try {
            const raw = sessionStorage.getItem('lonCheckoutDraft');
            if (!raw) return;
            const draft = JSON.parse(raw);
            sessionStorage.removeItem('lonCheckoutDraft');
            const first = document.querySelector('.p-firstName');
            const last = document.querySelector('.p-lastName');
            const email = document.getElementById('email');
            const phone = document.getElementById('phone');
            if (first && draft.firstName && !first.value) first.value = draft.firstName;
            if (last && draft.lastName && !last.value) last.value = draft.lastName;
            if (email && draft.email && !email.value) email.value = draft.email;
            if (phone && draft.phone && !phone.value) phone.value = draft.phone;
        } catch (e) { /* ignore */ }
    }

    function updatePayButton() {
        const label = document.getElementById('next-2-label');
        const priceText = formatPayablePrice(currentTotalCents(), state.service);
        if (label) label.textContent = payButtonLabel(priceText);
        const payAmount = document.getElementById('checkoutPayAmount');
        if (payAmount) payAmount.textContent = priceText;
    }

    function updateCheckoutSummary() {
        fillCheckoutTypeSelect();
        const whenEl = document.getElementById('checkoutWhen');
        const priceEl = document.getElementById('checkoutPrice');
        const durationEl = document.getElementById('checkoutDuration');
        const priceText = formatPayablePrice(currentTotalCents(), state.service);
        const duration = serviceDurationLabel(state.service);
        if (whenEl) {
            if (state.dateLabel && state.time) {
                whenEl.textContent = `${state.dateLabel} · ${state.time}`;
            } else {
                whenEl.textContent = '';
            }
        }
        if (priceEl) priceEl.textContent = priceText;
        if (durationEl) durationEl.textContent = duration;
        updatePayButton();
    }

    function bindCheckoutTypeSelect() {
        const select = document.getElementById('checkoutServiceType');
        if (!select || select.dataset.bound === '1') return;
        select.dataset.bound = '1';
        select.addEventListener('change', () => {
            if (slotServiceLocked()) return;
            const next = select.value;
            if (!next || next === dropdownValueFor(state.service)) return;
            saveCheckoutDraft();
            const slug = TYPE_TO_SLUG[next] || next.replace(/_/g, '-');
            window.location.href = '/marcar/' + slug;
        });
    }

    function intakeCopy() {
        const lang = getBookingLocale();
        const map = {
            pt: {
                doneTitle: 'Ficha clínica recebida',
                submit: 'Enviar ficha clínica',
                sending: 'A enviar…',
                genericError: 'Não foi possível guardar. Tente novamente.',
                missing: 'Este link da ficha já não é válido. Use o email de confirmação ou contacte-nos.'
            },
            en: {
                doneTitle: 'Clinical form received',
                submit: 'Send clinical form',
                sending: 'Sending…',
                genericError: 'Could not save. Please try again.',
                missing: 'This form link is no longer valid. Use your confirmation email or contact us.'
            },
            es: {
                doneTitle: 'Ficha clínica recibida',
                submit: 'Enviar ficha clínica',
                sending: 'Enviando…',
                genericError: 'No se pudo guardar. Inténtelo de nuevo.',
                missing: 'Este enlace ya no es válido. Use el correo de confirmación o contáctenos.'
            }
        };
        return map[lang] || map.pt;
    }

    function fillIntakePrefill(prefill) {
        const p = prefill || {};
        const dob = document.getElementById('intakeDob');
        const country = document.getElementById('intakeCountry');
        const concerns = document.getElementById('intakeConcerns');
        const meds = document.getElementById('intakeMedications');
        const allergies = document.getElementById('intakeAllergies');
        const nhs = document.getElementById('intakeNhs');
        if (dob && p.dob) dob.value = p.dob;
        if (country && p.country) country.value = p.country;
        if (concerns && p.concerns && !concerns.value) concerns.value = p.concerns;
        if (meds && p.medications) meds.value = p.medications;
        if (allergies && p.allergies) allergies.value = p.allergies;
        if (nhs && p.nhs) nhs.value = p.nhs;
    }

    function showIntakeCompleted() {
        const form = document.getElementById('intakeForm');
        const done = document.getElementById('intakeDone');
        if (form) form.hidden = true;
        if (done) done.hidden = false;
    }

    function bindIntakeForm(token) {
        const form = document.getElementById('intakeForm');
        if (!form || form.dataset.bound === '1') return;
        form.dataset.bound = '1';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const copy = intakeCopy();
            const errEl = document.getElementById('intakeFormError');
            const btn = document.getElementById('intakeSubmitBtn');
            const dob = document.getElementById('intakeDob');
            const concerns = document.getElementById('intakeConcerns');
            let valid = true;
            [dob, concerns].forEach((field) => {
                const group = field && field.closest('.form-group');
                if (!field || !String(field.value || '').trim()) {
                    if (group) group.classList.add('invalid');
                    valid = false;
                } else if (group) group.classList.remove('invalid');
            });
            if (!valid) return;
            if (errEl) {
                errEl.hidden = true;
                errEl.textContent = '';
            }
            if (btn) {
                btn.disabled = true;
                btn.textContent = copy.sending;
            }
            try {
                const response = await fetch('/api/intake/' + encodeURIComponent(token), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dob: dob.value,
                        country: document.getElementById('intakeCountry')?.value || '',
                        concerns: concerns.value.trim(),
                        medications: document.getElementById('intakeMedications')?.value?.trim() || '',
                        allergies: document.getElementById('intakeAllergies')?.value?.trim() || '',
                        nhs: document.getElementById('intakeNhs')?.value?.trim() || ''
                    })
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || copy.genericError);
                showIntakeCompleted();
                if (window.LonAnalytics) window.LonAnalytics.track('intake_submit', { surface: 'booking', funnel: 'patient_booking' });
            } catch (err) {
                if (errEl) {
                    errEl.textContent = err.message || copy.genericError;
                    errEl.hidden = false;
                }
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = copy.submit;
                }
            }
        });
    }

    function markConfirmationStep() {
        document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
        const step4 = document.getElementById('step-4');
        if (step4) step4.classList.add('active');
        document.querySelectorAll('.progress-step').forEach(ps => {
            ps.classList.remove('active');
            ps.classList.add('completed');
        });
        const last = document.querySelector('.progress-step[data-step="4"]');
        if (last) {
            last.classList.remove('completed');
            last.classList.add('active');
        }
        document.querySelectorAll('.progress-line').forEach(l => l.classList.add('filled'));
    }

    async function showStandaloneIntake(token) {
        markConfirmationStep();
        const card = document.querySelector('.confirmation-card');
        const intakeCard = document.getElementById('intakeCard');
        if (card) card.hidden = true;
        if (intakeCard) {
            intakeCard.hidden = false;
        }
        void token;
    }

    // ─── Check for Stripe return / intake form ───
    const urlParams = new URLSearchParams(window.location.search);
    const fichaToken = (urlParams.get('ficha') || '').trim();

    if (fichaToken) {
        await showStandaloneIntake(fichaToken);
        return;
    }

    // Returning from Stripe Checkout — show confirmation
    if (urlParams.get('success') === 'true' && urlParams.get('session_id')) {
        await handleStripeReturn(urlParams.get('session_id'));
        return; // Don't initialise rest of booking flow
    }

    // Returning from cancelled Stripe Checkout
    if (urlParams.get('cancelled') === 'true') {
        showCancelledMessage();
    }

    const serviceAlias = {
        longevity: 'longevidade',
        followup: 'clinica_geral',
        itu: 'clinica_geral',
        infecao_urinaria: 'clinica_geral',
        infeccao_urinaria: 'clinica_geral'
    };

    function applyServiceKey(key) {
        const resolved = services[key] ? key : serviceAlias[key];
        if (!resolved || !services[resolved]) return;
        state.service = resolved;
        state.serviceLabel = services[resolved].label;
        state.servicePrice = services[resolved].price;
        state.servicePriceCents = services[resolved].cents;
        if ((resolved === 'terapia_casal' || resolved === 'terapia_casal_mensal') && !state.specialty) {
            state.specialty = 'relacionamentos';
        }
        updateTravellerCountVisibility();
        updateCheckoutSummary();
    }

    const preselect = urlParams.get('service');
    if (preselect) {
        const known = services[preselect] || serviceAlias[preselect];
        if (!known) {
            // Unknown route param → not-found boundary (instead of silently falling back to clínica geral).
            showBookingNotFound(preselect);
            return;
        }
        applyServiceKey(preselect);
    }
    if (!state.service) {
        applyServiceKey('clinica_geral');
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

        if (step === 1) renderCalendar();
        if (step === 2) {
            initDetailsForm();
            restoreCheckoutDraft();
            updateSlotSummary();
            bindCheckoutTypeSelect();
            applyCheckoutHeroCopy();
            relabelNutritionProgress();
        }
        if (step === 3) updateReviewAndSummary();
        relabelNutritionProgress();
    }

    function updateSlotSummary() {
        const el = document.getElementById('bookingSlotSummary');
        const wrap = document.getElementById('bookingSlotChangeWrap');
        const change = document.getElementById('bookingSlotChange');
        const slug = TYPE_TO_SLUG[state.service] || 'clinica-geral';
        const psych = isPsychStaffService(state.service);
        if (change) change.href = '/marcar/' + slug;
        if (state.date && state.time) {
            if (el) {
                el.hidden = true;
                el.textContent = `${state.serviceLabel} · ${state.dateLabel} · ${state.time} · ${state.servicePrice}`;
            }
            if (wrap) wrap.hidden = psych;
        } else {
            if (el) el.hidden = true;
            if (wrap) wrap.hidden = true;
        }
        updateCheckoutSummary();
        renderCheckoutPsychology();
    }

    // ═══════════════════════════════════════
    //  Psychology checkout: chosen professional + plan (subscription first) + minimal alternatives
    // ═══════════════════════════════════════
    function checkoutPsiCopy() {
        const lang = (window.CLINIC_I18N && typeof window.CLINIC_I18N.getLang === 'function')
            ? window.CLINIC_I18N.getLang()
            : getBookingLocale();
        const map = {
            pt: {
                yourPsychologist: 'O seu psicólogo',
                recommended: 'Recomendado',
                oneOff: 'Avulsa',
                perMonth: '/mês',
                perWeek: '/semana',
                perSession: 'por sessão',
                subTitle: 'Subscrição de Psicologia',
                subNote: 'Cobrado mensalmente · 224 €/mês',
                oneTitle: 'Sessão única',
                oneNote: '50 min · sem compromisso',
                casalSubTitle: 'Subscrição de casal',
                casalSubNote: '65 €/semana · cobrado mensalmente',
                casalOneTitle: 'Sessão de casal',
                casalOneNote: '50–60 min · os dois na videochamada',
                perConsult: 'por consulta',
                month1: 'mês 1',
                nutriProgramTitle: 'Programa de perda de peso · 6 meses',
                nutriProgramNote: 'Acompanhamento médico + nutrição · depois 75 €/mês · total 490 €',
                nutriOneTitle: 'Consulta de nutrição',
                nutriOneNote: '30 min · sem compromisso',
                nutriCompletoTitle: 'Programa Completo · nutrição + psicologia',
                nutriCompletoNote: 'Depois 187 €/mês · total 1 162 €',
                nutriReforcadoTitle: 'Programa Completo · entrada reforçada',
                nutriReforcadoNote: 'Depois 168 €/mês · total 1 162 €',
                altSummary: 'Alterar horário, psicólogo ou tema',
                altSummaryCasal: 'Alterar horário ou psicólogo',
                otherTimes: 'Outros horários',
                otherPros: 'Outro psicólogo nesta hora',
                changeTheme: 'Mudar tema',
                fullCalendar: 'Ver calendário completo',
                keepPro: 'Manter',
                proRole: 'Psicólogo clínico',
                proRoleCasal: 'Psicólogo · terapia de casal',
                videoCall: 'Videochamada'
            },
            en: {
                yourPsychologist: 'Your psychologist',
                recommended: 'Recommended',
                oneOff: 'One-off',
                perMonth: '/month',
                perWeek: '/week',
                perSession: 'per session',
                subTitle: 'Psychology subscription',
                subNote: 'Billed monthly · €224/month',
                oneTitle: 'Single session',
                oneNote: '50 min · no commitment',
                casalSubTitle: 'Couples subscription',
                casalSubNote: '€65/week · billed monthly',
                casalOneTitle: 'Couples session',
                casalOneNote: '50–60 min · both partners on the call',
                perConsult: 'per consultation',
                month1: 'month 1',
                nutriProgramTitle: 'Weight-loss program · 6 months',
                nutriProgramNote: 'Medical follow-up + nutrition · then €75/month · total €490',
                nutriOneTitle: 'Nutrition consultation',
                nutriOneNote: '30 min · no commitment',
                nutriCompletoTitle: 'Complete program · nutrition + psychology',
                nutriCompletoNote: 'Then €187/month · total €1,162',
                nutriReforcadoTitle: 'Complete program · higher first payment',
                nutriReforcadoNote: 'Then €168/month · total €1,162',
                altSummary: 'Change time, psychologist or topic',
                altSummaryCasal: 'Change time or psychologist',
                otherTimes: 'Other times',
                otherPros: 'Another psychologist at this time',
                changeTheme: 'Change topic',
                fullCalendar: 'See full calendar',
                keepPro: 'Keep',
                proRole: 'Clinical psychologist',
                proRoleCasal: 'Psychologist · couples therapy',
                videoCall: 'Video call'
            },
            es: {
                yourPsychologist: 'Su psicólogo',
                recommended: 'Recomendado',
                oneOff: 'Suelta',
                perMonth: '/mes',
                perWeek: '/semana',
                perSession: 'por sesión',
                subTitle: 'Suscripción de psicología',
                subNote: 'Cobrado mensualmente · 224 €/mes',
                oneTitle: 'Sesión única',
                oneNote: '50 min · sin compromiso',
                casalSubTitle: 'Suscripción de pareja',
                casalSubNote: '65 €/semana · cobrado mensualmente',
                casalOneTitle: 'Sesión de pareja',
                casalOneNote: '50–60 min · los dos en videollamada',
                perConsult: 'por consulta',
                month1: 'mes 1',
                nutriProgramTitle: 'Programa de pérdida de peso · 6 meses',
                nutriProgramNote: 'Seguimiento médico + nutrición · luego 75 €/mes · total 490 €',
                nutriOneTitle: 'Consulta de nutrición',
                nutriOneNote: '30 min · sin compromiso',
                nutriCompletoTitle: 'Programa completo · nutrición + psicología',
                nutriCompletoNote: 'Luego 187 €/mes · total 1 162 €',
                nutriReforcadoTitle: 'Programa completo · entrada reforzada',
                nutriReforcadoNote: 'Luego 168 €/mes · total 1 162 €',
                altSummary: 'Cambiar horario, psicólogo o tema',
                altSummaryCasal: 'Cambiar horario o psicólogo',
                otherTimes: 'Otros horarios',
                otherPros: 'Otro psicólogo a esta hora',
                changeTheme: 'Cambiar tema',
                fullCalendar: 'Ver calendario completo',
                keepPro: 'Mantener',
                proRole: 'Psicólogo clínico',
                proRoleCasal: 'Psicólogo · terapia de pareja',
                videoCall: 'Videollamada'
            }
        };
        return map[lang] || map.pt;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[ch]);
    }

    function initialsFromName(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'P';
        return (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
    }

    function planCardsFor(family) {
        const c = checkoutPsiCopy();
        if (family === 'nutricao') {
            const month1 = '· ' + c.month1;
            if (state.service === 'nutricao_completo' || state.service === 'nutricao_completo_reforcado') {
                return [
                    { key: 'nutricao_completo', badge: c.recommended, title: c.nutriCompletoTitle, price: services.nutricao_completo.price, unit: month1, note: c.nutriCompletoNote, featured: state.service === 'nutricao_completo' },
                    { key: 'nutricao_completo_reforcado', badge: '', title: c.nutriReforcadoTitle, price: services.nutricao_completo_reforcado.price, unit: month1, note: c.nutriReforcadoNote, featured: state.service === 'nutricao_completo_reforcado' }
                ];
            }
            if (state.service === 'nutricao_consulta') {
                return [
                    { key: 'nutricao_programa', badge: c.recommended, title: c.nutriProgramTitle, price: services.nutricao_programa.price, unit: month1, note: c.nutriProgramNote, featured: true },
                    { key: 'nutricao_consulta', badge: c.oneOff, title: c.nutriOneTitle, price: services.nutricao_consulta.price, unit: c.perConsult, note: c.nutriOneNote, featured: false }
                ];
            }
            return [
                { key: 'nutricao_programa', badge: c.recommended, title: c.nutriProgramTitle, price: services.nutricao_programa.price, unit: month1, note: c.nutriProgramNote, featured: true },
                { key: 'nutricao_completo', badge: 'Completo', title: c.nutriCompletoTitle, price: services.nutricao_completo.price, unit: month1, note: c.nutriCompletoNote, featured: false }
            ];
        }
        if (family === 'terapia_casal') {
            return [
                { key: 'terapia_casal_mensal', badge: c.recommended, title: c.casalSubTitle, price: '260 €', unit: c.perMonth, note: c.casalSubNote, featured: true },
                { key: 'terapia_casal', badge: c.oneOff, title: c.casalOneTitle, price: '75 €', unit: c.perSession, note: c.casalOneNote, featured: false }
            ];
        }
        return [
            { key: 'psicologia_mensal', badge: c.recommended, title: c.subTitle, price: '56 €', unit: c.perWeek, note: c.subNote, featured: true },
            { key: 'psicologia', badge: c.oneOff, title: c.oneTitle, price: '60 €', unit: c.perSession, note: c.oneNote, featured: false }
        ];
    }

    function switchCheckoutPlan(nextKey) {
        if (!services[nextKey] || nextKey === state.service) return;
        const prevNote = clinicalIntentNote();
        state.serviceDuration = '';
        state.discountCode = '';
        state.discountPercent = 0;
        const msg = document.getElementById('discountMessageStep2');
        if (msg) msg.style.display = 'none';
        applyServiceKey(nextKey);
        state.serviceLabel = i18nServiceLabel(nextKey);
        if (planFamilyFor(nextKey) === 'nutricao') {
            // The auto-filled intake note names the plan — regenerate it for the new plan,
            // but never overwrite text the patient typed.
            state.clinicalIntent = null;
            state.prefillConcerns = '';
            const ta = document.querySelector('.passenger-panel[data-passenger="1"] .p-concerns');
            if (ta && (!ta.value.trim() || ta.value.trim() === String(prevNote || '').trim())) {
                ta.value = clinicalIntentNote();
            }
        }
        if (window.LonAnalytics) {
            window.LonAnalytics.track('plan_switch', { surface: 'booking', service: nextKey });
        }
        updateSlotSummary();
    }

    function renderCheckoutPlanPicker(family) {
        const wrap = document.getElementById('checkoutPlanPicker');
        if (!wrap) return;
        wrap.innerHTML = '';
        planCardsFor(family).forEach((card) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'checkout-plan-card' + (card.key === state.service ? ' is-active' : '') + (card.featured ? ' is-featured' : '');
            btn.setAttribute('aria-pressed', card.key === state.service ? 'true' : 'false');
            btn.innerHTML =
                '<span class="checkout-plan-badge">' + escapeHtml(card.badge) + '</span>' +
                '<span class="checkout-plan-title">' + escapeHtml(card.title) + '</span>' +
                '<span class="checkout-plan-price">' + escapeHtml(card.price) + '<small>' + escapeHtml(card.unit) + '</small></span>' +
                '<span class="checkout-plan-note">' + escapeHtml(card.note) + '</span>';
            btn.addEventListener('click', () => switchCheckoutPlan(card.key));
            wrap.appendChild(btn);
        });
        wrap.hidden = false;
    }

    function setCheckoutProfessional(pro) {
        state.professionalId = pro ? (Number(pro.id) || null) : null;
        state.professionalName = pro ? (pro.name || null) : null;
        state.professionalBio = pro ? (pro.bio || null) : null;
        state.professionalPhotoUrl = pro ? (pro.photoUrl || null) : null;
    }

    function renderCheckoutPro() {
        const wrap = document.getElementById('checkoutPro');
        if (!wrap) return;
        if (!state.professionalName) {
            wrap.hidden = true;
            wrap.innerHTML = '';
            return;
        }
        const c = checkoutPsiCopy();
        const photo = state.professionalPhotoUrl
            ? '<img class="checkout-pro-photo" src="' + escapeHtml(state.professionalPhotoUrl) + '" alt="">'
            : '<span class="checkout-pro-fallback" aria-hidden="true">' + escapeHtml(initialsFromName(state.professionalName)) + '</span>';
        const bio = state.professionalBio ? '<p class="checkout-pro-bio">' + escapeHtml(state.professionalBio) + '</p>' : '';
        const role = planFamilyFor(state.service) === 'terapia_casal' ? c.proRoleCasal : c.proRole;
        wrap.innerHTML =
            '<p class="checkout-pro-kicker">' + escapeHtml(c.yourPsychologist) + '</p>' +
            '<div class="checkout-pro-card">' + photo +
            '<div class="checkout-pro-copy"><strong>' + escapeHtml(state.professionalName) + '</strong>' +
            '<span class="checkout-pro-role">' + escapeHtml(role) + ' · ' + escapeHtml(c.videoCall) + '</span>' +
            bio + '</div></div>';
        wrap.hidden = false;
    }

    function currentSlotIdKey() {
        return state.date && state.time ? formatDateLocal(state.date) + '|' + state.time + '|' + (state.specialty || '') : '';
    }

    async function loadCheckoutSlotContext() {
        if (!state.date || !state.time) return;
        const key = currentSlotIdKey();
        if (state.checkoutContextKey === key) {
            renderCheckoutAltPros();
            return;
        }
        state.checkoutContextKey = key;
        try {
            const res = await fetch(
                '/api/bookable-slots?date=' + encodeURIComponent(formatDateLocal(state.date)) +
                '&service=' + encodeURIComponent(state.service) +
                (state.specialty ? '&specialty=' + encodeURIComponent(state.specialty) : '')
            );
            if (!res.ok) return;
            const data = await res.json();
            const list = (data && data.professionalsByTime && data.professionalsByTime[state.time]) || [];
            state.checkoutProsAtTime = list;
            let chosen = list.find((p) => Number(p.id) === Number(state.professionalId)) || null;
            if (!chosen && list.length) chosen = list[0];
            if (chosen && (Number(chosen.id) !== Number(state.professionalId) || !state.professionalName || !state.professionalBio)) {
                setCheckoutProfessional(chosen);
                renderCheckoutPro();
            }
            renderCheckoutAltPros();
        } catch (e) { /* professional card stays as prefilled */ }
    }

    function renderCheckoutAltPros() {
        const wrap = document.getElementById('checkoutAltProsWrap');
        const row = document.getElementById('checkoutAltPros');
        const label = document.getElementById('checkoutAltProsLabel');
        if (!wrap || !row) return;
        const others = (state.checkoutProsAtTime || []).filter((p) => Number(p.id) !== Number(state.professionalId));
        if (!others.length) {
            wrap.hidden = true;
            row.innerHTML = '';
            return;
        }
        if (label) label.textContent = checkoutPsiCopy().otherPros;
        row.innerHTML = '';
        others.slice(0, 3).forEach((pro) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'checkout-alt-chip';
            btn.textContent = pro.name;
            btn.addEventListener('click', () => {
                setCheckoutProfessional(pro);
                refreshSlotHold();
                renderCheckoutPro();
                renderCheckoutAltPros();
            });
            row.appendChild(btn);
        });
        wrap.hidden = false;
    }

    function slotLabelForChip(slot) {
        const d = parseStoredDate(slot.date);
        if (!d) return slot.time;
        const lang = window.CLINIC_I18N ? window.CLINIC_I18N.getLang() : 'pt';
        const locale = lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-GB' : 'pt-PT';
        return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + slot.time;
    }

    function applyCheckoutAltSlot(slot) {
        const d = parseStoredDate(slot.date);
        if (!d) return;
        const lang = window.CLINIC_I18N ? window.CLINIC_I18N.getLang() : 'pt';
        const locale = lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-GB' : 'pt-PT';
        state.date = d;
        state.time = String(slot.time).length === 4 ? '0' + slot.time : slot.time;
        state.dateLabel = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        state.calMonth = d.getMonth();
        state.calYear = d.getFullYear();
        state.slotId = slotIdFromDateTime(slot.date, state.time);
        state.holdId = null;
        const pros = Array.isArray(slot.professionals) ? slot.professionals : [];
        const keep = pros.find((p) => Number(p.id) === Number(state.professionalId));
        setCheckoutProfessional(keep || pros[0] || null);
        state.checkoutProsAtTime = pros;
        state.checkoutContextKey = null;
        refreshSlotHold();
        if (window.LonAnalytics) window.LonAnalytics.track('slot_select', { surface: 'checkout_alt', time: state.time });
        updateSlotSummary();
    }

    async function loadCheckoutAltSlots() {
        const wrap = document.getElementById('checkoutAltSlotsWrap');
        const row = document.getElementById('checkoutAltSlots');
        const label = document.getElementById('checkoutAltSlotsLabel');
        if (!wrap || !row) return;
        try {
            const res = await fetch(
                '/api/next-slots?limit=6&withinHours=336&service=' + encodeURIComponent(state.service) +
                (state.specialty ? '&specialty=' + encodeURIComponent(state.specialty) : '') +
                (state.professionalId ? '&professionalId=' + encodeURIComponent(state.professionalId) : '')
            );
            if (!res.ok) return;
            const data = await res.json();
            const current = state.date && state.time ? slotIdFromDateTime(formatDateLocal(state.date), state.time) : '';
            const slots = ((data && data.slots) || []).filter((s) => s && s.id !== current).slice(0, 4);
            row.innerHTML = '';
            if (!slots.length) {
                wrap.hidden = true;
                return;
            }
            if (label) label.textContent = checkoutPsiCopy().otherTimes;
            slots.forEach((slot) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'checkout-alt-chip';
                btn.textContent = slotLabelForChip(slot);
                btn.addEventListener('click', () => applyCheckoutAltSlot(slot));
                row.appendChild(btn);
            });
            wrap.hidden = false;
        } catch (e) { /* alternatives are optional */ }
    }

    function renderCheckoutAltLinks(family) {
        const links = document.getElementById('checkoutAltLinks');
        if (!links) return;
        const c = checkoutPsiCopy();
        const slug = TYPE_TO_SLUG[state.service] || 'psicologia';
        const slotParams = new URLSearchParams();
        if (state.date && state.time) {
            slotParams.set('date', formatDateLocal(state.date));
            slotParams.set('time', state.time);
        }
        const parts = [];
        if (family === 'psicologia') {
            // No specialty in the URL → marcar shows the topic picker again, keeping the slot.
            const q = slotParams.toString();
            parts.push('<a href="/marcar/' + slug + (q ? '?' + q : '') + '">' + escapeHtml(c.changeTheme) + '</a>');
        }
        const calParams = new URLSearchParams(slotParams);
        if (state.specialty && family === 'psicologia') calParams.set('specialty', state.specialty);
        if (state.professionalId) calParams.set('professionalId', String(state.professionalId));
        const cq = calParams.toString();
        parts.push('<a href="/marcar/' + slug + (cq ? '?' + cq : '') + '">' + escapeHtml(c.fullCalendar) + '</a>');
        links.innerHTML = parts.join('<span class="checkout-alt-sep"> · </span>');
    }

    function specialtyCheckoutLabel() {
        const lang = (window.CLINIC_I18N && typeof window.CLINIC_I18N.getLang === 'function')
            ? window.CLINIC_I18N.getLang()
            : getBookingLocale();
        const loc = lang === 'en' || lang === 'es' ? lang : 'pt';
        const map = {
            ansiedade: { pt: 'Ansiedade / pânico', en: 'Anxiety / panic', es: 'Ansiedad / pánico' },
            depressao: { pt: 'Depressão', en: 'Depression', es: 'Depresión' },
            burnout: { pt: 'Burnout', en: 'Burnout', es: 'Burnout' },
            casal: { pt: 'Terapia de casal', en: 'Couples therapy', es: 'Terapia de pareja' },
            relacionamentos: { pt: 'Relacionamentos e família', en: 'Relationships and family', es: 'Relaciones y familia' },
            trauma: { pt: 'Trauma / luto', en: 'Trauma / grief', es: 'Trauma / duelo' },
            neuro: { pt: 'PHDA / autismo / neurodiversidade', en: 'ADHD / autism / neurodiversity', es: 'TDAH / autismo / neurodiversidad' },
            alimentacao: { pt: 'Alimentação e imagem corporal', en: 'Eating and body image', es: 'Alimentación e imagen corporal' },
            outro: { pt: 'Outro / ainda não sei', en: 'Other / not sure yet', es: 'Otro / aún no sé' }
        };
        const row = map[String(state.specialty || '')];
        return row ? (row[loc] || row.pt) : '';
    }

    function setPsychCheckoutChrome(on) {
        document.body.classList.toggle('is-psych-checkout', !!on);
        const typeName = document.getElementById('checkoutTypeName');
        const specChip = document.getElementById('checkoutSpecialtyChip');
        const modeChip = document.getElementById('checkoutModeChip');
        if (modeChip && on) modeChip.textContent = checkoutPsiCopy().videoCall;
        if (!on) {
            if (typeName) {
                typeName.hidden = true;
                typeName.textContent = '';
            }
            if (specChip) {
                specChip.hidden = true;
                specChip.textContent = '';
            }
            return;
        }
        if (typeName) {
            const select = document.getElementById('checkoutServiceType');
            const fromSelect = select && select.options[select.selectedIndex]
                ? select.options[select.selectedIndex].textContent
                : '';
            typeName.textContent = state.serviceLabel || fromSelect || '';
            typeName.hidden = !typeName.textContent;
        }
        if (specChip) {
            const label = planFamilyFor(state.service) === 'nutricao'
                ? (state.prefillGoal || '')
                : specialtyCheckoutLabel();
            specChip.textContent = label;
            specChip.hidden = !label;
        }
    }

    function applyCheckoutHeroCopy() {
        const lead = document.getElementById('checkoutHeroLead');
        const eyebrow = document.getElementById('checkoutEyebrow');
        if (planFamilyFor(state.service) !== 'nutricao') return;
        const lang = (window.CLINIC_I18N && typeof window.CLINIC_I18N.getLang === 'function')
            ? window.CLINIC_I18N.getLang()
            : getBookingLocale();
        const copy = {
            pt: {
                eyebrow: 'Confirmar e pagar',
                lead: 'Reveja o plano e o horário, confirme o contacto e conclua o pagamento seguro.'
            },
            en: {
                eyebrow: 'Confirm and pay',
                lead: 'Review the plan and time, confirm your contact details, then complete secure payment.'
            },
            es: {
                eyebrow: 'Confirmar y pagar',
                lead: 'Revise el plan y el horario, confirme su contacto y complete el pago seguro.'
            }
        };
        const row = copy[lang] || copy.pt;
        if (eyebrow) eyebrow.textContent = row.eyebrow;
        if (lead) lead.textContent = row.lead;
    }

    function relabelNutritionProgress() {
        if (planFamilyFor(state.service) !== 'nutricao') return;
        const labels = document.querySelectorAll('.booking-progress .progress-label');
        if (!labels.length) return;
        const lang = (window.CLINIC_I18N && typeof window.CLINIC_I18N.getLang === 'function')
            ? window.CLINIC_I18N.getLang()
            : getBookingLocale();
        const first = state.fromMarcar
            ? { pt: 'Plano e horário', en: 'Plan & time', es: 'Plan y hora' }
            : { pt: 'Horário', en: 'Time', es: 'Horario' };
        const second = { pt: 'Dados e pagamento', en: 'Details and payment', es: 'Datos y pago' };
        const third = { pt: 'Confirmado', en: 'Confirmed', es: 'Confirmado' };
        if (labels[0]) labels[0].textContent = first[lang] || first.pt;
        if (labels[1]) labels[1].textContent = second[lang] || second.pt;
        if (labels[2]) labels[2].textContent = third[lang] || third.pt;
    }

    function renderCheckoutPsychology() {
        const family = planFamilyFor(state.service);
        const picker = document.getElementById('checkoutPlanPicker');
        const proWrap = document.getElementById('checkoutPro');
        const alt = document.getElementById('checkoutAlt');
        const psych = isPsychStaffService(state.service);
        const nutri = family === 'nutricao';
        setPsychCheckoutChrome(psych || nutri);
        applyCheckoutHeroCopy();
        relabelNutritionProgress();
        if (!family || !state.date || !state.time) {
            if (picker) picker.hidden = true;
            if (proWrap) proWrap.hidden = true;
            if (alt) alt.hidden = true;
            return;
        }
        if (nutri && state.fromMarcar) {
            // Plan was already chosen on /marcar — don't ask again on a second form.
            if (picker) picker.hidden = true;
            if (proWrap) proWrap.hidden = true;
            if (alt) alt.hidden = true;
            return;
        }
        renderCheckoutPlanPicker(family);
        if (!psych) {
            // Nutrition: plan choice only — no psychologist card or alternatives block.
            if (proWrap) proWrap.hidden = true;
            if (alt) alt.hidden = true;
            return;
        }
        renderCheckoutPro();
        if (alt) {
            const summary = document.getElementById('checkoutAltSummary');
            if (summary) summary.textContent = family === 'terapia_casal' ? checkoutPsiCopy().altSummaryCasal : checkoutPsiCopy().altSummary;
            renderCheckoutAltLinks(family);
            alt.hidden = false;
        }
        loadCheckoutSlotContext();
        loadCheckoutAltSlots();
    }

    // ═══════════════════════════════════════
    //  Travel pricing & insurance (shown on schedule step when service is travel)
    // ═══════════════════════════════════════
    function updateTravellerCountVisibility() {
        const section = document.getElementById('travellerCountSection');
        const insuranceSection = document.getElementById('insuranceSection');

        if (state.service === 'travel') {
            if (section) section.style.display = 'block';
            if (insuranceSection) insuranceSection.style.display = 'block';
            updateTravellerPriceLabels();
            updateTravellerPriceNote();
        } else {
            if (section) section.style.display = 'none';
            if (insuranceSection) insuranceSection.style.display = 'none';
            state.travellerCount = 1;
            state.hasInsurance = false;
            const toggle = document.getElementById('insuranceToggle');
            if (toggle) toggle.checked = false;
        }
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
            updateTravellerPriceLabels();
            updateTravellerPriceNote();
        });
    }

    // ═══════════════════════════════════════
    //  STEP 1 — Calendar
    // ═══════════════════════════════════════
    const calGrid = document.getElementById('calGrid');
    const calMonth = document.getElementById('calMonth');
    const timeslotGrid = document.getElementById('timeslotGrid');
    const timeslotHeading = document.getElementById('timeslotHeading');

    function applyUrgentContactHint() {
        const el = document.getElementById('timeslotUrgentHint');
        if (!el) return;
        if (!state.date) {
            el.hidden = true;
            return;
        }
        el.hidden = false;
        const fallback =
            'Urgent or need a time that is not listed? Contact us at info@lonclinic.com or (+351) 928 372 775.';
        el.textContent =
            window.CLINIC_I18N && typeof window.CLINIC_I18N.getBookingString === 'function'
                ? window.CLINIC_I18N.getBookingString('urgentContactHint') || fallback
                : fallback;
    }

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

    async function loadBookableDays() {
        const service = state.service || 'clinica_geral';
        try {
            let url = '/api/bookable-days?service=' + encodeURIComponent(service);
            if (isPsychStaffService(service) && state.specialty) {
                url += '&specialty=' + encodeURIComponent(state.specialty);
            }
            if (state.professionalId) {
                url += '&professionalId=' + encodeURIComponent(state.professionalId);
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error('bookable-days');
            const data = await res.json();
            state.bookableDates = (data && data.dates) || [];
            state.slotMode = (data && data.mode)
                || (isPsychStaffService(service) || state.bookableDates.length ? 'staff' : 'clinic');
            if (state.slotMode === 'staff' && !state.bookableDates.length && !isPsychStaffService(service)) {
                state.slotMode = 'clinic';
            }
        } catch (err) {
            state.bookableDates = [];
            state.slotMode = isPsychStaffService(state.service || '') ? 'staff' : 'clinic';
        }
    }

    function isDateAvailable(dateObj) {
        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj <= today) return false;

        // Check if date is blocked
        const dateStr = formatDateLocal(dateObj);
        if (isPsychStaffService(state.service || '') || state.slotMode === 'staff') {
            return (state.bookableDates || []).includes(dateStr);
        }

        if (state.scheduleData && state.scheduleData.blockedDates && state.scheduleData.blockedDates.includes(dateStr)) {
            return false;
        }

        const overrides = state.scheduleData && state.scheduleData.dayOverrides;
        if (overrides && overrides.length > 0) {
            const ov = overrides.find((o) => o.date === dateStr);
            if (ov) return ov.enabled;
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
        document.getElementById('next-1').disabled = true;
        if (window.LonAnalytics) window.LonAnalytics.track('date_select', { surface: 'booking' });
        return renderTimeslots();
    }

    function formatQuickSlotLabel(slot) {
        const d = parseStoredDate(slot.date);
        if (!d) return slot.time;
        const lang = window.CLINIC_I18N ? window.CLINIC_I18N.getLang() : 'pt';
        const locale = lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-GB' : 'pt-PT';
        return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + slot.time;
    }

    function findCalendarDayButton(dateObj) {
        const day = String(dateObj.getDate());
        return [...calGrid.querySelectorAll('.cal-day')].find((el) =>
            el.textContent === day &&
            !el.classList.contains('cal-empty') &&
            !el.classList.contains('cal-disabled')
        );
    }

    async function applyQuickSlot(slot, opts) {
        const d = parseStoredDate(slot.date);
        if (!d) return;
        state.calMonth = d.getMonth();
        state.calYear = d.getFullYear();
        await renderCalendar();
        const btn = findCalendarDayButton(d);
        if (!btn) return;
        await selectDate(d.getFullYear(), d.getMonth(), d.getDate(), btn);
        if (opts && opts.selectTime === false) return;
        const want = String(slot.time).length === 4 ? '0' + slot.time : slot.time;
        timeslotGrid.querySelectorAll('.timeslot-btn').forEach((b) => {
            if (b.textContent === want) b.click();
        });
        if (state.date && state.time && !(opts && opts.stayOnStep)) {
            goToStep(2);
        }
    }

    async function loadQuickSlots() {
        const wrap = document.getElementById('bookingQuickSlots');
        try {
            const res = await fetch(
                '/api/next-slots?limit=6&withinHours=336&service=' + encodeURIComponent(state.service || 'clinica_geral') +
                (state.specialty ? '&specialty=' + encodeURIComponent(state.specialty) : '') +
                (state.professionalId ? '&professionalId=' + encodeURIComponent(state.professionalId) : '')
            );
            if (!res.ok) return;
            const data = await res.json();
            const slots = (data && data.slots) || [];
            if (!slots.length) return;
            if (wrap) {
                const row = wrap.querySelector('[data-quick-row]');
                if (row) {
                    row.innerHTML = '';
                    slots.forEach((slot) => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'booking-quick-slot';
                        btn.textContent = formatQuickSlotLabel(slot);
                        btn.addEventListener('click', () => applyQuickSlot(slot));
                        row.appendChild(btn);
                    });
                    wrap.hidden = false;
                }
            }
            if (!state.date && slots[0]) {
                await applyQuickSlot(slots[0], { selectTime: false, stayOnStep: true });
            }
        } catch (e) { /* calendar still works */ }
    }

    async function renderTimeslots() {
        timeslotHeading.textContent = state.dateLabel;
        applyUrgentContactHint();
        timeslotGrid.innerHTML = '<p class="timeslot-empty">Loading available slots...</p>';

        // Format date as YYYY-MM-DD
        const dateStr = formatDateLocal(state.date);

        try {
            // Fetch available slots from admin schedule
            const res = await fetch(
                '/api/bookable-slots?date=' + encodeURIComponent(dateStr) +
                '&service=' + encodeURIComponent(state.service || 'clinica_geral') +
                (state.specialty ? '&specialty=' + encodeURIComponent(state.specialty) : '') +
                (state.professionalId ? '&professionalId=' + encodeURIComponent(state.professionalId) : '')
            );
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

            const byTime = data.professionalsByTime || {};
            availableSlots.forEach(slot => {
                const btn = document.createElement('button');
                btn.className = 'timeslot-btn';
                btn.textContent = slot;
                btn.addEventListener('click', () => {
                    state.time = slot;
                    const pros = byTime[slot] || [];
                    if (pros.length === 1) {
                        state.professionalId = pros[0].id;
                    } else if (!isPsychStaffService(state.service)) {
                        state.professionalId = null;
                    }
                    timeslotGrid.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    document.getElementById('next-1').disabled = false;
                    if (window.LonAnalytics) {
                        window.LonAnalytics.track('slot_select', { surface: 'booking', time: slot });
                        window.LonAnalytics.track('time_slot_clicked', { surface: 'booking', time: slot });
                    }
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
                    document.getElementById('next-1').disabled = false;
                    if (window.LonAnalytics) {
                        window.LonAnalytics.track('slot_select', { surface: 'booking', time: slot });
                        window.LonAnalytics.track('time_slot_clicked', { surface: 'booking', time: slot });
                    }
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

    document.getElementById('next-1').addEventListener('click', () => {
        if (state.date && state.time) goToStep(2);
    });

    document.getElementById('back-1').addEventListener('click', () => {
        if (state.fromMarcar && state.marcarTipo) {
            var tipoSlugMap = {
                urgente: 'urgente',
                infeccao_urinaria: 'infeccao-urinaria',
                clinica_geral: 'clinica-geral',
                renovacao: 'renovacao',
                travel: 'travel',
                saude_mental: 'saude-mental',
                burnout: 'burnout',
                burnout_mensal: 'burnout-mensal',
                burnout_programa: 'burnout-programa',
                longevidade: 'longevidade',
                nutricao_consulta: 'nutricao-consulta',
                nutricao_programa: 'nutricao-programa',
                nutricao_completo: 'nutricao-completo',
                nutricao_completo_reforcado: 'nutricao-completo-reforcado'
            };
            var slug = tipoSlugMap[state.marcarTipo] || encodeURIComponent(state.marcarTipo);
            window.location.href = '/marcar/' + slug;
            return;
        }
        window.location.href = '/';
    });

    document.getElementById('back-2').addEventListener('click', () => goToStep(1));

    // ═══════════════════════════════════════
    //  STEP 2 — Details Form (Multi-Passenger)
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
            panel1Title.hidden = count <= 1;
            panel1Title.textContent = count > 1 ? 'Traveller 1' : 'Patient details';
        }

        // Single-patient checkout asks for contact details only; multi-passenger needs a name per traveller
        const nameFields = document.getElementById('checkoutNameFields');
        if (nameFields) {
            nameFields.hidden = count <= 1;
            nameFields.querySelectorAll('input').forEach((input) => { input.required = count > 1; });
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
        applyClinicalIntentToForm();
    }

    // Collect all passenger data
    function clinicalIntentNote() {
        if (state.prefillConcerns) return state.prefillConcerns;
        const intent = state.clinicalIntent;
        if (intent && (intent.concerns || intent.goal || intent.label)) {
            if (intent.concerns) return intent.concerns;
            const bits = [intent.label || intent.goal].filter(Boolean);
            if (intent.goal && intent.label && intent.goal !== intent.label) bits.push(intent.goal);
            if (intent.cbiBand) {
                bits.push('CBI ' + intent.cbiBand + (intent.cbiGlobal != null ? ' (' + intent.cbiGlobal + '/100)' : ''));
            }
            return bits.join(' · ');
        }
        if (state.service === 'nutricao_consulta') {
            return 'Consulta de nutrição avulsa (sem programa). Sem prescrição de aGLP-1.';
        }
        if (state.service === 'nutricao_programa' || state.service === 'nutricao_completo' || state.service === 'nutricao_completo_reforcado') {
            try {
                const meta = JSON.parse(sessionStorage.getItem('lonNutricaoAvaliacao') || 'null');
                if (meta && (meta.plan || meta.eating)) {
                    const eatingMap = { rare: 'raras vezes', some: 'algumas vezes', frequent: 'fome emocional frequente' };
                    const labsMap = { recent: 'análises < 6 meses', year: 'análises há mais de 1 ano', unknown: 'análises antigas ou desconhecidas' };
                    const bits = ['Avaliação metabólica'];
                    bits.push(meta.plan === 'completo' ? 'recomendado Completo' : 'recomendado Nutrição');
                    if (meta.eating) bits.push('stress/comida: ' + (eatingMap[meta.eating] || meta.eating));
                    if (meta.imc) bits.push('IMC ' + String(meta.imc).replace('.', ','));
                    if (meta.weight && meta.desiredWeight) bits.push(meta.weight + ' → ' + meta.desiredWeight + ' kg');
                    if (meta.age) bits.push(meta.age + ' anos');
                    if (meta.labs && labsMap[meta.labs]) bits.push(labsMap[meta.labs]);
                    return bits.join(' · ');
                }
            } catch (e) { /* ignore */ }
            try {
                const quiz = JSON.parse(sessionStorage.getItem('lonClinicalQuiz') || 'null');
                if (quiz && quiz.instrument) {
                    return 'Objectivo: perda de peso / reeducação metabólica. Teste ' + quiz.instrument +
                        (quiz.band ? ' · ' + quiz.band : '');
                }
            } catch (e) { /* ignore */ }
            return 'Objectivo: perda de peso / reeducação metabólica. Programa de perda de peso 6 meses (acompanhamento médico + nutrição) — sem prescrição de aGLP-1.';
        }
        if (state.service === 'burnout' || state.service === 'burnout_mensal' || state.service === 'burnout_programa') {
            try {
                const quiz = JSON.parse(sessionStorage.getItem('lonBurnoutQuiz') || 'null');
                if (quiz && quiz.band) {
                    return 'Programa anti-burnout / CBI · ' + quiz.band +
                        (quiz.global != null ? ' (' + quiz.global + '/100)' : '');
                }
            } catch (e) { /* ignore */ }
            return 'Programa anti-burnout / CBI';
        }
        return '';
    }

    function applyClinicalIntentToForm() {
        try {
            const raw = sessionStorage.getItem('lonClinicalQuiz');
            if (raw) {
                const q = JSON.parse(raw);
                const emailEl = document.getElementById('email');
                const phoneEl = document.getElementById('phone');
                const first = document.querySelector('.p-firstName');
                if (emailEl && q.email && !emailEl.value) emailEl.value = q.email;
                if (phoneEl && q.phone && !phoneEl.value) phoneEl.value = q.phone;
                if (first && q.name && !first.value) first.value = q.name;
            }
        } catch (e) { /* ignore */ }
        try {
            const raw = sessionStorage.getItem('lonNutricaoAvaliacao');
            if (!raw) return;
            const q = JSON.parse(raw);
            const emailEl = document.getElementById('email');
            const phoneEl = document.getElementById('phone');
            const first = document.querySelector('.p-firstName');
            const last = document.querySelector('.p-lastName');
            if (emailEl && q.email && !emailEl.value) emailEl.value = q.email;
            if (phoneEl && q.phone && !phoneEl.value) phoneEl.value = q.phone;
            if (q.name) {
                const parts = String(q.name).trim().split(/\s+/);
                if (first && !first.value) first.value = parts[0] || '';
                if (last && !last.value && parts.length > 1) last.value = parts.slice(1).join(' ');
            }
            const detailsTitle = document.getElementById('checkoutDetailsTitle');
            if (detailsTitle && (q.email || q.phone || q.name)) {
                const lang = getBookingLocale();
                detailsTitle.textContent = lang === 'en'
                    ? 'Confirm the contact from your assessment:'
                    : lang === 'es'
                        ? 'Confirme el contacto de su evaluación:'
                        : 'Confirme o contacto da avaliação:';
            }
        } catch (e2) { /* ignore */ }
    }

    function getPassengersData() {
        const passengers = [];
        const count = state.service === 'travel' ? state.travellerCount : 1;
        for (let i = 1; i <= count; i++) {
            const panel = document.querySelector(`.passenger-panel[data-passenger="${i}"]`);
            if (!panel) continue;
            passengers.push({
                firstName: panel.querySelector('.p-firstName')?.value?.trim() || '',
                lastName: panel.querySelector('.p-lastName')?.value?.trim() || ''
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
            const group = field && field.closest('.form-group');
            if (!field || !group) return;
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
                { cls: '.p-lastName', msg: 'last name' }
            ];

            required.forEach(({ cls }) => {
                const field = panel.querySelector(cls);
                if (field && field.closest('[hidden]')) return;
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
            const group = checkbox && checkbox.closest('.form-checkbox-group');
            if (!checkbox || !group) return;
            if (!checkbox.checked) {
                group.classList.add('invalid');
                valid = false;
            } else {
                group.classList.remove('invalid');
            }
        });

        if (state.consultLangPolicy) {
            const langAck = document.getElementById('consultLangAck');
            const langGroup = langAck && langAck.closest('.form-checkbox-group');
            if (langAck && !langAck.checked) {
                if (langGroup) langGroup.classList.add('invalid');
                valid = false;
            } else if (langGroup) {
                langGroup.classList.remove('invalid');
            }
        }

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

    // ═══════════════════════════════════════
    //  STEP 3 — Review & Pay (Stripe)
    // ═══════════════════════════════════════
    
    // Discount codes
    const discountCodes = {
        'ME2026': 99,  // 99% discount
        'VERAO082026': 10  // 10% discount — summer 2026
    };

    function validateDiscountCode(code) {
        const noDiscount = {
            burnout_mensal: 1,
            psicologia_mensal: 1,
            terapia_casal_mensal: 1,
            burnout_programa: 1,
            nutricao_programa: 1,
            nutricao_completo: 1,
            nutricao_completo_reforcado: 1
        };
        if (noDiscount[state.service]) return null;
        const upperCode = code.toUpperCase().trim();
        if (discountCodes[upperCode]) {
            return discountCodes[upperCode];
        }
        return null;
    }

    function applyDiscount() {
        const codeInput = document.getElementById('discountCodeStep2') || document.getElementById('discountCode');
        const messageEl = document.getElementById('discountMessageStep2') || document.getElementById('discountMessage');
        if (!codeInput || !messageEl) return;
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
    const discountInput = document.getElementById('discountCodeStep2') || document.getElementById('discountCode');
    const applyDiscountBtn = document.getElementById('applyDiscountBtnStep2') || document.getElementById('applyDiscountBtn');
    
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
        document.getElementById('reviewService').textContent = state.serviceLabel;
        document.getElementById('reviewDate').textContent = state.dateLabel;
        document.getElementById('reviewTime').textContent = state.time;

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
                    <span class="review-value">${`${p.firstName} ${p.lastName}`.trim() || emailVal}</span>
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
            document.getElementById('summaryPatient').textContent =
                `${passengers[0].firstName} ${passengers[0].lastName}`.trim() || emailVal;
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
        updateCheckoutSummary();
    }

    document.getElementById('back-3').addEventListener('click', () => goToStep(2));

    // ─── Pay Button → Create Stripe Checkout Session ───
    const payBtn = document.getElementById('next-2');
    const stripeError = document.getElementById('stripeErrorStep2') || document.getElementById('stripeError');

    if (payBtn) payBtn.addEventListener('click', async () => {
        if (!validateForm()) return;
        updateReviewAndSummary();
        payBtn.disabled = true;
        payBtn.innerHTML = `
            <div class="processing-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></div>
            ${bookingString('redirecting', 'A redirecionar…')}
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
            if (window.LonAnalytics) {
                window.LonAnalytics.track('checkout_start', { service: state.service, surface: 'booking', funnel: 'patient_booking', step: 'pay' });
                window.LonAnalytics.flush();
            }
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service: state.service,
                    serviceLabel: state.serviceLabel,
                    discountCode: state.discountCode || null,
                    hasInsurance: state.hasInsurance,
                    date: state.dateLabel,
                    dateIso: formatDateLocal(state.date),
                    time: state.time,
                    patientName: `${passengers[0].firstName} ${passengers[0].lastName}`.trim(),
                    patientEmail: document.getElementById('email').value,
                    patientPhone: document.getElementById('phone')?.value || '',
                    passengers: passengers,
                    travelDest: document.getElementById('travelDest')?.value || '',
                    travelDates: document.getElementById('travelDates')?.value || '',
                    locale: getBookingLocale(),
                    holdId: state.holdId || null,
                    professionalId: state.professionalId || null,
                    specialty: state.specialty || null
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
                <span id="next-2-label">${payButtonLabel(formatPayablePrice(currentTotalCents(), state.service))}</span>
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
            let durationMinutes = 30; // Default
            if (data.service === 'travel') {
                // Travel duration depends on traveller count
                const count = data.travellerCount || 1;
                if (count === 1) durationMinutes = 20;
                else if (count === 2) durationMinutes = 30;
                else durationMinutes = 40;
            } else if (data.service === 'urgente' || data.service === 'renovacao') {
                durationMinutes = 15;
            } else if (data.service === 'saude_mental') {
                durationMinutes = 45;
            } else if (isPsychStaffService(data.service)) {
                durationMinutes = 60;
            } else if (data.service === 'burnout' || data.service === 'burnout_mensal' || data.service === 'burnout_programa') {
                durationMinutes = 60;
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
            const serviceLabel = i18nServiceLabel(data.service) || (services[data.service] && services[data.service].label);
            const eventTitle = encodeURIComponent(serviceLabel || data.service || 'Medical Consultation');
            
            let description = `Booking Reference: ${data.bookingRef || 'N/A'}\n`;
            description += `Service: ${serviceLabel || data.service}\n`;
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
        document.getElementById('step-4').classList.add('active');

        // Update progress bar to completed
        document.querySelectorAll('.progress-step').forEach(ps => {
            ps.classList.remove('active');
            ps.classList.add('completed');
        });
        document.querySelector('.progress-step[data-step="4"]').classList.remove('completed');
        document.querySelector('.progress-step[data-step="4"]').classList.add('active');
        document.querySelectorAll('.progress-line').forEach(l => l.classList.add('filled'));

        try {
            const response = await fetch(`/api/session/${sessionId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load booking details');
            }

            document.getElementById('confirmEmail').textContent = data.email || '—';
            document.getElementById('confirmService').textContent =
                (services[data.service] && services[data.service].label) || i18nServiceLabel(data.service) || data.service;
            document.getElementById('confirmDateTime').textContent = `${data.date} at ${data.time}`;
            document.getElementById('confirmAmount').textContent = `€${(data.amount / 100).toFixed(0)}`;
            document.getElementById('confirmRef').textContent = data.bookingRef || '—';

            const timeHint = document.getElementById('intakeTimeHint');
            if (timeHint && data.time) timeHint.textContent = data.time;

            const dashboardBtn = document.getElementById('goToDashboardBtn');
            if (dashboardBtn && data.email) {
                const portalParams = new URLSearchParams({ email: data.email });
                if (data.bookingRef) portalParams.set('ref', data.bookingRef);
                dashboardBtn.href = `/patient-portal?${portalParams.toString()}`;
                dashboardBtn.style.display = '';
            }

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

            // Google Ads — Purchase conversion; new_customer from server (prior paid bookings by email)
            if (typeof gtag === 'function') {
                const value =
                    typeof data.amount === 'number' && data.amount > 0 ? data.amount / 100 : 1.0;
                const conv = {
                    send_to: 'AW-18103198169/bLl8COjQ6J4cENnDo7hD',
                    value,
                    currency: (data.currency || 'eur').toUpperCase(),
                    transaction_id: sessionId
                };
                if (typeof data.isNewCustomer === 'boolean') {
                    conv.new_customer = data.isNewCustomer;
                }
                gtag('event', 'conversion', conv);
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
        if (state.currentStep === 1) renderCalendar();

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

        updateSlotSummary();

        if (state.date && state.currentStep === 1) {
            applyUrgentContactHint();
        }

        applyCheckoutHeroCopy();
        relabelNutritionProgress();

        // Re-render review if on payment step
        if (state.currentStep === 3) updateReviewAndSummary();
    };

    function applyMarcarPrefill() {
        let raw;
        try {
            raw = sessionStorage.getItem('lonConsultaPrefill');
        } catch (e) {
            raw = null;
        }
        let prefill = null;
        if (raw) {
            try {
                prefill = JSON.parse(raw);
            } catch (e) {
                try { sessionStorage.removeItem('lonConsultaPrefill'); } catch (e2) { /* ignore */ }
            }
        }
        if (prefill && prefill.service && services[prefill.service]) {
            try { sessionStorage.removeItem('lonConsultaPrefill'); } catch (e) { /* ignore */ }
            state.service = prefill.service;
            state.serviceLabel = prefill.serviceLabel || services[prefill.service].label;
            state.servicePrice = prefill.servicePrice || services[prefill.service].price;
            state.servicePriceCents = typeof prefill.servicePriceCents === 'number'
                ? prefill.servicePriceCents
                : services[prefill.service].cents;
            state.serviceDuration = prefill.duration || '';
            state.date = parseStoredDate(prefill.dateISO);
            state.dateLabel = prefill.dateLabel;
            state.time = prefill.time;
            state.calMonth = state.date ? state.date.getMonth() : state.calMonth;
            state.calYear = state.date ? state.date.getFullYear() : state.calYear;
            state.travellerCount = prefill.travellerCount || 1;
            state.hasInsurance = !!prefill.hasInsurance;
            state.fromMarcar = true;
            state.marcarTipo = prefill.tipo || null;
            if (prefill.holdId) state.holdId = prefill.holdId;
            if (prefill.slotId) state.slotId = prefill.slotId;
            if (prefill.renew) state.renewToken = prefill.renew;
            if (prefill.consultLangPolicy) state.consultLangPolicy = true;
            if (prefill.clinicalIntent) state.clinicalIntent = prefill.clinicalIntent;
            if (prefill.goal) state.prefillGoal = prefill.goal;
            if (prefill.concerns) state.prefillConcerns = prefill.concerns;
            if (prefill.professionalId) state.professionalId = Number(prefill.professionalId) || null;
            if (prefill.professionalName) state.professionalName = String(prefill.professionalName);
            if (prefill.professionalBio) state.professionalBio = String(prefill.professionalBio);
            if (prefill.professionalPhotoUrl) state.professionalPhotoUrl = String(prefill.professionalPhotoUrl);
            if (prefill.specialty) state.specialty = prefill.specialty;
            if (prefill.locale) {
                const loc = document.getElementById('bookingLocale');
                if (loc) loc.value = prefill.locale;
            }
        }

        const dateQ = urlParams.get('date');
        const timeQ = urlParams.get('time');
        const serviceQ = urlParams.get('service');
        const renewQ = urlParams.get('renew');
        const slotQ = urlParams.get('slot');
        const holdQ = urlParams.get('hold');
        const proQ = urlParams.get('professionalId');
        const specQ = urlParams.get('specialty');
        if (serviceQ) applyServiceKey(serviceQ);
        if (renewQ) state.renewToken = renewQ;
        if (holdQ) state.holdId = holdQ;
        if (proQ) state.professionalId = Number(proQ) || state.professionalId;
        if (specQ) state.specialty = specQ;
        const slotMatch = slotQ && /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/.exec(slotQ);
        if (slotMatch) {
            state.slotId = slotQ;
            const slotDate = `${slotMatch[1]}-${slotMatch[2]}-${slotMatch[3]}`;
            const slotTime = `${slotMatch[4]}:${slotMatch[5]}`;
            const parsedSlot = parseStoredDate(slotDate);
            if (parsedSlot) {
                state.date = parsedSlot;
                state.time = slotTime;
                const locale = (window.CLINIC_I18N && window.CLINIC_I18N.getLang() === 'es') ? 'es-ES'
                    : (window.CLINIC_I18N && window.CLINIC_I18N.getLang() === 'en') ? 'en-GB' : 'pt-PT';
                state.dateLabel = state.date.toLocaleDateString(locale, {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });
                state.calMonth = state.date.getMonth();
                state.calYear = state.date.getFullYear();
                state.fromMarcar = true;
            }
        } else if (dateQ && timeQ && /^\d{4}-\d{2}-\d{2}$/.test(dateQ) && /^\d{1,2}:\d{2}$/.test(timeQ)) {
            const parsed = parseStoredDate(dateQ);
            if (parsed) {
                state.date = parsed;
                state.time = timeQ.length === 4 ? '0' + timeQ : timeQ;
                const locale = (window.CLINIC_I18N && window.CLINIC_I18N.getLang() === 'es') ? 'es-ES'
                    : (window.CLINIC_I18N && window.CLINIC_I18N.getLang() === 'en') ? 'en-GB' : 'pt-PT';
                state.dateLabel = state.date.toLocaleDateString(locale, {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });
                state.calMonth = state.date.getMonth();
                state.calYear = state.date.getFullYear();
                state.fromMarcar = true;
            }
        }

        const refQ = urlParams.get('ref') || '';
        if (urlParams.get('langpolicy') === 'en-es-pt' || /-(fr|de)$/i.test(refQ)) {
            state.consultLangPolicy = true;
        }

        updateTravellerCountVisibility();
        if (state.date && state.time) {
            refreshSlotHold();
            goToStep(2);
            applyClinicalIntentToForm();
        }
    }

    function syncConsultLangPolicyUI() {
        const on = !!state.consultLangPolicy;
        document.querySelectorAll('[data-consult-lang-banner]').forEach((el) => {
            el.hidden = !on;
        });
        const wrap = document.getElementById('consultLangAckWrap');
        const ack = document.getElementById('consultLangAck');
        if (wrap) wrap.hidden = !on;
        if (ack) ack.required = on;
    }

    function slotIdFromDateTime(dateISO, time) {
        const d = String(dateISO || '').replace(/-/g, '');
        const t = String(time || '').replace(':', '');
        return d + '-' + t.slice(0, 4);
    }

    async function refreshSlotHold() {
        if (!state.date || !state.time) return;
        const slot = state.slotId || slotIdFromDateTime(formatDateLocal(state.date), state.time);
        try {
            const res = await fetch('/api/slot-hold', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slot,
                    service: state.service || 'clinica_geral',
                    professionalId: state.professionalId || null,
                    specialty: state.specialty || null
                })
            });
            if (res.status === 409) {
                state.holdId = null;
                return;
            }
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.holdId) state.holdId = data.holdId;
        } catch (e) { /* checkout still validates availability */ }
    }

    async function applyRenewalAndNextSlot() {
        let renewal = null;
        if (state.renewToken) {
            try {
                const res = await fetch('/api/renewal-prefill?t=' + encodeURIComponent(state.renewToken));
                if (res.ok) renewal = await res.json();
            } catch (e) { /* ignore */ }
            if (renewal) applyServiceKey('renovacao');
        }
        if (!state.date || !state.time) {
            if (state.renewToken || urlParams.get('service') === 'renovacao') {
                try {
                    const res = await fetch('/api/next-slots?limit=1&withinHours=336');
                    if (res.ok) {
                        const data = await res.json();
                        const slot = data && data.slots && data.slots[0];
                        if (slot) {
                            state.date = parseStoredDate(slot.date);
                            if (state.date) {
                                state.time = slot.time;
                                state.dateLabel = state.date.toLocaleDateString('pt-PT', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                });
                                state.fromMarcar = true;
                                goToStep(2);
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        }
        if (renewal) {
            const emailEl = document.getElementById('email');
            if (emailEl && renewal.email) emailEl.value = renewal.email;
            if (renewal.name) {
                const parts = String(renewal.name).trim().split(/\s+/);
                const first = document.querySelector('.p-firstName');
                const last = document.querySelector('.p-lastName');
                if (first && parts[0]) first.value = parts[0];
                if (last && parts.length > 1) last.value = parts.slice(1).join(' ');
            }
        }
    }

    applyMarcarPrefill();
    syncConsultLangPolicyUI();
    applyRenewalAndNextSlot();
    applyClinicalIntentToForm();
    await loadBookableDays();

    if (state.currentStep === 1) {
        renderCalendar();
        loadQuickSlots();
    }

    document.querySelectorAll('[data-pay-method]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-pay-method]').forEach(function (el) {
                el.classList.toggle('is-active', el === btn);
            });
            var method = btn.getAttribute('data-pay-method') || 'card';
            state.preferredPayment = method;
            if (window.LonAnalytics) {
                window.LonAnalytics.track('payment_method_selected', {
                    method: method,
                    surface: 'booking',
                    funnel: 'patient_booking'
                });
            }
        });
    });

    (function setupExitIntent() {
        var modal = document.getElementById('lonExitIntent');
        if (!modal) return;
        var shown = false;
        try {
            if (sessionStorage.getItem('lon_exit_book') === '1') return;
        } catch (e) { /* ignore */ }

        function canShow() {
            return state.currentStep < 4 && !shown;
        }

        function showExit() {
            if (!canShow()) return;
            shown = true;
            modal.hidden = false;
            document.body.classList.add('lon-exit-open');
            try { sessionStorage.setItem('lon_exit_book', '1'); } catch (e2) { /* ignore */ }
            if (window.LonAnalytics) {
                window.LonAnalytics.track('exit_intent', { surface: 'booking', step: state.currentStep });
            }
        }

        function hideExit() {
            modal.hidden = true;
            document.body.classList.remove('lon-exit-open');
        }

        modal.querySelectorAll('[data-exit-dismiss]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                if (el.tagName === 'A' && el.getAttribute('href') === '#step-1') e.preventDefault();
                hideExit();
            });
        });

        document.addEventListener('mouseout', function (e) {
            if (!e.relatedTarget && e.clientY <= 0) showExit();
        });

        if (window.matchMedia && window.matchMedia('(max-width: 700px)').matches) {
            try { history.pushState({ lonExit: 1 }, ''); } catch (e3) { /* ignore */ }
            window.addEventListener('popstate', function () {
                if (canShow()) {
                    showExit();
                    try { history.pushState({ lonExit: 1 }, ''); } catch (e4) { /* ignore */ }
                }
            });
        }
    })();

    // ─── Preload ───
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

}
