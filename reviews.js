/**
 * Patient reviews — load public opinions + submit form with optional public visibility.
 */
(function () {
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

    function buildCard(review, cardClass) {
        const cls = cardClass || 'lon-testimonial-card';
        const dateLabel = formatReviewDate(review.createdAt, review.locale || detectLocale());
        const block = document.createElement('blockquote');
        block.className = cls;
        block.dataset.reviewId = review.id || '';
        block.innerHTML =
            '<div class="lon-testimonial-stars testimonial-stars" aria-hidden="true">' +
            starsHtml(review.rating) +
            '</div>' +
            '<p class="lon-testimonial-quote testimonial-quote">' +
            escapeHtml(review.body) +
            '</p>' +
            '<footer class="lon-testimonial-meta testimonial-meta">' +
            '<span class="lon-testimonial-author testimonial-author">' +
            escapeHtml(review.authorName || 'Paciente verificada') +
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
            list.forEach(function (review) {
                if (review.id && container.querySelector('[data-review-id="' + review.id + '"]')) return;
                container.appendChild(buildCard(review, cardClass));
            });
        } catch (e) {
            console.error('Load reviews:', e);
        }
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
                    grid.insertBefore(buildCard(data.review, cardClass), grid.firstChild);
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

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-reviews-list]').forEach(loadPublicReviews);
        document.querySelectorAll('.lon-review-form').forEach(bindForm);
    });
})();
