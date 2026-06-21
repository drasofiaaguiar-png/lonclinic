/**
 * Patient reviews — load public opinions + submit form with optional public visibility.
 */
(function () {
    var SEED_PT =
        'Eu adorei a consulta! A doutora que me atendeu era super simpática, muito clara na abordagem do tema e esclareceu-me todas as dúvidas! Sem dúvida voltarei a contactar-vos nas minhas próximas viagens! Muito obrigada.';

    var STRINGS = {
        pt: {
            verifiedPatient: 'Paciente verificada',
            translationNote: '',
            originalNote: ''
        },
        en: {
            verifiedPatient: 'Verified patient',
            translationNote: 'Translated from Portuguese (not the original text)',
            originalNote: 'Original text in Portuguese (not translated)',
            seedQuote: 'I loved the consultation! The doctor who saw me was very friendly, very clear in her approach and answered all my questions! I will definitely contact you again for my upcoming trips! Thank you so much.'
        },
        es: {
            verifiedPatient: 'Paciente verificada',
            translationNote: 'Traducción del portugués (no es el texto original)',
            originalNote: 'Texto original en portugués (sin traducción)',
            seedQuote: '¡Me encantó la consulta! La doctora que me atendió fue muy amable, muy clara en su enfoque y resolvió todas mis dudas. Sin duda volveré a contactaros en mis próximos viajes. Muchas gracias.'
        }
    };

    function detectLocale() {
        if (window.CLINIC_I18N && typeof window.CLINIC_I18N.getLang === 'function') {
            return window.CLINIC_I18N.getLang();
        }
        const active = document.querySelector('.lang-section.active');
        if (active && active.id) {
            const m = active.id.match(/^lang-(.+)$/);
            if (m) return m[1];
        }
        return document.documentElement.lang === 'en' ? 'en' : document.documentElement.lang === 'es' ? 'es' : 'pt';
    }

    function normalizeBody(str) {
        return String(str || '')
            .replace(/[«»""]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function isSeedReview(review) {
        return normalizeBody(review.body) === normalizeBody(SEED_PT);
    }

    function getStrings(locale) {
        return STRINGS[locale] || STRINGS.pt;
    }

    function getDisplayContent(review, pageLocale) {
        const reviewLocale = review.locale || 'pt';
        const strings = getStrings(pageLocale);
        let body = review.body;
        let showTranslationNote = false;

        if (pageLocale === 'pt') {
            return { body: body, note: '' };
        }

        if (reviewLocale === pageLocale) {
            return { body: body, note: '' };
        }

        if (isSeedReview(review) && strings.seedQuote) {
            return { body: strings.seedQuote, note: strings.translationNote };
        }

        if (reviewLocale === 'pt') {
            return { body: body, note: strings.originalNote };
        }

        return { body: body, note: strings.originalNote };
    }

    function starsHtml(rating) {
        const n = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
        return '★'.repeat(n) + (n < 5 ? '☆'.repeat(5 - n) : '');
    }

    function formatReviewDate(iso, locale) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const tag = locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : 'pt-PT';
        try {
            return d.toLocaleDateString(tag, { month: 'long', year: 'numeric' });
        } catch (e) {
            return d.toISOString().slice(0, 7);
        }
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function buildCard(review, cardClass, pageLocale) {
        const locale = pageLocale || detectLocale();
        const cls = cardClass || 'lon-testimonial-card';
        const strings = getStrings(locale);
        const display = getDisplayContent(review, locale);
        const dateLabel = formatReviewDate(review.createdAt, locale);
        const author = review.authorName || strings.verifiedPatient;
        const noteClass = cls.indexOf('lon-') === 0
            ? 'lon-testimonial-translation-note testimonial-translation-note'
            : 'testimonial-translation-note';

        let noteHtml = '';
        if (display.note) {
            noteHtml =
                '<p class="' + noteClass + '">' +
                escapeHtml(display.note) +
                '</p>';
        }

        const block = document.createElement('blockquote');
        block.className = cls;
        block.dataset.reviewId = review.id || '';
        block.innerHTML =
            '<div class="lon-testimonial-stars testimonial-stars" aria-hidden="true">' +
            starsHtml(review.rating) +
            '</div>' +
            '<p class="lon-testimonial-quote testimonial-quote">' +
            escapeHtml(display.body) +
            '</p>' +
            noteHtml +
            '<footer class="lon-testimonial-meta testimonial-meta">' +
            '<span class="lon-testimonial-author testimonial-author">' +
            escapeHtml(author) +
            '</span>' +
            (dateLabel ? '<time datetime="' + escapeHtml((review.createdAt || '').slice(0, 10)) + '">' + escapeHtml(dateLabel) + '</time>' : '') +
            '</footer>';
        return block;
    }

    async function loadPublicReviews(container) {
        if (!container) return;
        try {
            const res = await fetch('/api/reviews/public');
            if (!res.ok) return;
            const data = await res.json();
            const list = data.reviews || [];
            const cardClass = container.dataset.cardClass || 'lon-testimonial-card';
            const locale = detectLocale();
            list.forEach(function (review) {
                if (review.id && container.querySelector('[data-review-id="' + review.id + '"]')) return;
                container.appendChild(buildCard(review, cardClass, locale));
            });
        } catch (e) {
            console.error('Load reviews:', e);
        }
    }

    function refreshDynamicReviews() {
        document.querySelectorAll('[data-reviews-list]').forEach(function (container) {
            container.querySelectorAll('[data-review-id]').forEach(function (el) {
                el.remove();
            });
            loadPublicReviews(container);
        });
    }

    function bindForm(form) {
        if (!form || form.dataset.reviewsBound) return;
        form.dataset.reviewsBound = '1';
        const statusEl = form.querySelector('.lon-review-status');
        const gridId = form.getAttribute('data-reviews-grid');
        const grid = gridId ? document.getElementById(gridId) : null;
        const cardClass = grid ? (grid.dataset.cardClass || 'lon-testimonial-card') : 'lon-testimonial-card';

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const locale = form.getAttribute('data-locale') || detectLocale();
            const btn = form.querySelector('button[type="submit"]');
            const bodyEl = form.querySelector('[name="body"]');
            const nameEl = form.querySelector('[name="authorName"]');
            const emailEl = form.querySelector('[name="email"]');
            const publicEl = form.querySelector('[name="isPublic"]');
            const ratingEl = form.querySelector('[name="rating"]:checked');

            const payload = {
                body: String((bodyEl && bodyEl.value) || '').trim(),
                authorName: String((nameEl && nameEl.value) || '').trim(),
                email: String((emailEl && emailEl.value) || '').trim(),
                isPublic: !!(publicEl && publicEl.checked),
                rating: ratingEl ? ratingEl.value : '5',
                locale: locale
            };

            if (statusEl) {
                statusEl.textContent = '';
                statusEl.classList.remove('is-success', 'is-error');
            }
            if (btn) {
                btn.disabled = true;
                btn.dataset.prevLabel = btn.textContent;
                btn.textContent = btn.getAttribute('data-sending') || 'A enviar…';
            }

            try {
                const res = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed');

                form.reset();
                if (statusEl) {
                    statusEl.textContent = data.message || 'Obrigada!';
                    statusEl.classList.add('is-success');
                }
                if (grid && data.review && data.isPublic) {
                    grid.insertBefore(buildCard(data.review, cardClass, locale), grid.firstChild);
                }
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err.message || 'Erro ao enviar. Tente novamente.';
                    statusEl.classList.add('is-error');
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = btn.dataset.prevLabel || btn.textContent;
                }
            }
        });
    }

    function bindReviewToggles() {
        document.querySelectorAll('.lon-review-toggle').forEach(function (btn) {
            if (btn.dataset.reviewToggleBound) return;
            btn.dataset.reviewToggleBound = '1';

            btn.addEventListener('click', function () {
                const panelId = btn.getAttribute('data-review-panel') || btn.getAttribute('aria-controls');
                const panel = panelId ? document.getElementById(panelId) : null;
                const section = panel ? panel.closest('.lon-leave-review, .leave-review') : null;
                const target = section || panel;
                if (!target) return;

                const isOpen = !target.hidden;
                if (isOpen) {
                    target.hidden = true;
                    btn.setAttribute('aria-expanded', 'false');
                    return;
                }

                target.hidden = false;
                btn.setAttribute('aria-expanded', 'true');
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });

                const focusEl = panel && panel.querySelector('input, textarea, select, button');
                if (focusEl) {
                    window.setTimeout(function () { focusEl.focus(); }, 350);
                }
            });
        });
    }

    window.REVIEWS_LANG_CHANGED = function () {
        refreshDynamicReviews();
    };

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-reviews-list]').forEach(loadPublicReviews);
        document.querySelectorAll('.lon-review-form').forEach(bindForm);
        bindReviewToggles();
    });
})();
