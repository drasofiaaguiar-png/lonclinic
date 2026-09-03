(function () {
    'use strict';

    var nav = document.getElementById('lonNav');
    var toggle = document.getElementById('lonNavToggle');
    var mobileMenu = document.getElementById('lonMobileMenu');
    var tabButtons = document.querySelectorAll('.lon-tab');
    var cards = document.querySelectorAll('.lon-service-card');
    var servicesGrid = document.querySelector('.lon-services .lon-service-grid');

    function setActiveTab(tabId) {
        var visibleCount = 0;
        tabButtons.forEach(function (btn) {
            var on = btn.getAttribute('data-tab') === tabId;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        cards.forEach(function (card) {
            var cat = card.getAttribute('data-category');
            var show = cat === tabId;
            card.classList.toggle('is-visible', show);
            if (show) visibleCount += 1;
        });
        if (servicesGrid) {
            servicesGrid.setAttribute('data-visible-count', String(visibleCount));
        }
    }

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            setActiveTab(btn.getAttribute('data-tab'));
        });
    });

    var initialTab = 'urgencias';
    var hash = window.location.hash;
    if (hash.indexOf('#servicos-') === 0) {
        var part = hash.replace('#servicos-', '');
        if (['urgencias', 'especialidades', 'mental', 'longevidade'].indexOf(part) >= 0) {
            initialTab = part;
        }
    }
    setActiveTab(initialTab);

    document.querySelectorAll('[data-open-tab]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var t = link.getAttribute('data-open-tab');
            if (t) {
                e.preventDefault();
                setActiveTab(t);
                var el = document.getElementById('servicos');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                if (history.replaceState) {
                    history.replaceState(null, '', '#servicos-' + t);
                }
            }
        });
    });

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    if (toggle && mobileMenu) {
        toggle.addEventListener('click', function () {
            var open = mobileMenu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        mobileMenu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', closeMobileMenu);
        });
    }

    window.addEventListener('scroll', function () {
        if (!nav) return;
        if (window.scrollY > 12) nav.classList.add('is-scrolled');
        else nav.classList.remove('is-scrolled');
    });

    var CONTACT_STRINGS = {
        en: { sending: 'Sending…', success: 'Thank you! Your message has been sent.', error: 'Unable to send your message right now.', btn: 'Send message' },
        pt: { sending: 'A enviar...', success: 'Obrigado! A sua mensagem foi enviada.', error: 'Não foi possível enviar a sua mensagem.', btn: 'Enviar mensagem' },
        es: { sending: 'Enviando…', success: '¡Gracias! Su mensaje ha sido enviado.', error: 'No se pudo enviar su mensaje.', btn: 'Enviar mensaje' }
    };

    function getContactLang() {
        return (window.CLINIC_I18N && window.CLINIC_I18N.getLang()) || localStorage.getItem('clinic_lang') || 'en';
    }
    function getCS() {
        return CONTACT_STRINGS[getContactLang()] || CONTACT_STRINGS.en;
    }

    var form = document.getElementById('lonContactForm');
    var statusEl = document.getElementById('lonContactStatus');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var button = form.querySelector('button[type="submit"]');
            var nameEl = form.querySelector('[name="name"]');
            var emailEl = form.querySelector('[name="email"]');
            var phoneEl = form.querySelector('[name="phone"]');
            var messageEl = form.querySelector('[name="message"]');
            var payload = {
                name: String((nameEl && nameEl.value) || '').trim(),
                email: String((emailEl && emailEl.value) || '').trim(),
                phone: String((phoneEl && phoneEl.value) || '').trim(),
                message: String((messageEl && messageEl.value) || '').trim(),
                locale: getContactLang()
            };

            if (statusEl) {
                statusEl.textContent = '';
                statusEl.classList.remove('is-success', 'is-error');
            }

            if (button) {
                button.disabled = true;
                button.textContent = getCS().sending;
            }

            try {
                var response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                var raw = await response.text();
                var result = {};
                try {
                    if (raw) result = JSON.parse(raw);
                } catch (parseErr) {
                    throw new Error(getCS().error);
                }

                if (!response.ok) {
                    throw new Error(result.error || getCS().error);
                }

                form.reset();
                if (statusEl) {
                    statusEl.textContent = getCS().success;
                    statusEl.classList.add('is-success');
                }
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err.message || getCS().error;
                    statusEl.classList.add('is-error');
                }
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = getCS().btn;
                }
            }
        });
    }

    function formatNextSlotWhen(dateIso, time) {
        var htmlLang = (document.documentElement.lang || 'pt-PT').toLowerCase();
        var localeStr = htmlLang.indexOf('es') === 0 ? 'es-ES' : htmlLang.indexOf('en') === 0 ? 'en-GB' : 'pt-PT';
        var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
        if (!parts) return String(dateIso || '') + ' · ' + String(time || '');
        var d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
        var label = d.toLocaleDateString(localeStr, { weekday: 'long', day: 'numeric', month: 'short' });
        return label + ' · ' + time;
    }

    function goClinicaGeralCheckout(slot) {
        if (!slot || !slot.date || !slot.time) {
            window.location.href = '/marcar/clinica-geral';
            return;
        }
        var lang = getContactLang();
        var payload = {
            service: 'clinica_geral',
            tipo: 'clinica_geral',
            serviceLabel: lang === 'en'
                ? 'General Medicine Consultation / Check-Up (Adults)'
                : lang === 'es'
                    ? 'Consulta de Medicina General / Chequeo (Adultos)'
                    : 'Consulta Clínica Geral / Check Up (Adultos)',
            servicePrice: '€39',
            servicePriceCents: 3900,
            dateISO: slot.date,
            dateLabel: formatNextSlotWhen(slot.date, slot.time),
            time: slot.time,
            travellerCount: 1,
            hasInsurance: false,
            locale: lang
        };
        try {
            sessionStorage.setItem('lonConsultaPrefill', JSON.stringify(payload));
        } catch (e) { /* private mode */ }
        var dest = '/book-consultation?service=clinica_geral&date=' +
            encodeURIComponent(slot.date) + '&time=' + encodeURIComponent(slot.time);
        if (window.LonAnalytics) {
            window.LonAnalytics.track('cta_click', { surface: 'home', service: 'clinica_geral', step: 'next_slot' });
            window.LonAnalytics.flush();
        }
        window.location.href = dest;
    }

    var heroBook = document.getElementById('lonHeroBook');
    var nextSlotEl = document.getElementById('lonNextSlot');
    var nextSlotWhen = document.getElementById('lonNextSlotWhen');
    if (heroBook || nextSlotEl) {
        fetch('/api/next-slots?limit=1')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var slot = data && data.slots && data.slots[0];
                if (!slot) return;
                if (nextSlotWhen) nextSlotWhen.textContent = formatNextSlotWhen(slot.date, slot.time);
                if (nextSlotEl) nextSlotEl.hidden = false;
                if (heroBook) {
                    heroBook.addEventListener('click', function (e) {
                        e.preventDefault();
                        goClinicaGeralCheckout(slot);
                    });
                }
            })
            .catch(function () { /* keep fallback /marcar/clinica-geral */ });
    }
})();
