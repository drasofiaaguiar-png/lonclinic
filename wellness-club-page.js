(function () {
    'use strict';

    const form = document.getElementById('wclubFilters');
    const qInput = document.getElementById('wclubQ');
    const categorySelect = document.getElementById('wclubCategory');
    const citySelect = document.getElementById('wclubCity');
    const grid = document.getElementById('wclubGrid');
    const countEl = document.getElementById('wclubCount');
    const clearBtn = document.getElementById('wclubClear');
    if (!form || !grid) return;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fillSelect(select, items, allLabel, selected) {
        const current = selected != null ? selected : select.value;
        const options = ['<option value="">' + escapeHtml(allLabel) + '</option>'];
        items.forEach((item) => {
            const id = typeof item === 'string' ? item : item.id;
            const label = typeof item === 'string' ? item : item.label;
            options.push(
                '<option value="' + escapeHtml(id) + '"' + (id === current ? ' selected' : '') + '>' +
                escapeHtml(label) + '</option>'
            );
        });
        select.innerHTML = options.join('');
    }

    function cardHtml(partner) {
        const photo = partner.image
            ? '<img class="wx-card-photo" src="' + escapeHtml(partner.image) + '" alt="" loading="lazy" decoding="async">'
            : '<div class="wx-card-photo is-empty">Sem imagem</div>';
        const label = partner.revealLabel || 'Ver códigos';
        const ask = /condi/i.test(label)
            ? 'Introduza o seu email para ver as condições.'
            : 'Introduza o seu email para ver os códigos.';
        const reveal = partner.hasCodes
            ? '<button type="button" class="wclub-reveal" data-slug="' + escapeHtml(partner.slug) + '" data-label="' + escapeHtml(label) + '">' + escapeHtml(label) + '</button>' +
              '<form class="wclub-email" hidden>' +
              '<p>' + ask + '</p>' +
              '<input type="email" name="email" required maxlength="320" autocomplete="email" placeholder="O seu email" aria-label="' + ask + '">' +
              '<button type="submit" class="wclub-email-submit">' + escapeHtml(label) + '</button>' +
              '<p class="wclub-email-error" hidden></p>' +
              '</form>' +
              '<div class="wclub-codes" hidden></div>'
            : '';
        return '<article class="wx-card wclub-card" data-website="' + escapeHtml(partner.website || '') + '">' +
            '<div class="wx-card-photo-wrap">' + photo +
            '<span class="wx-chip">' + escapeHtml(partner.categoryLabel || '') + '</span></div>' +
            '<div class="wx-card-body">' +
            '<h2 class="wx-card-title">' + escapeHtml(partner.name || '') + '</h2>' +
            '<p class="wclub-sub">' + escapeHtml(partner.subtitle || partner.description || '') + '</p>' +
            (partner.priceLabel ? '<p class="wclub-price">' + escapeHtml(partner.priceLabel) + '</p>' : '') +
            reveal +
            '</div></article>';
    }

    function codesHtml(codes, website) {
        const lines = (codes || []).map((item) =>
            '<p class="wclub-code"><strong>' + escapeHtml(item.code) + '</strong> ' + escapeHtml(item.detail || '') + '</p>'
        ).join('');
        const link = website
            ? '<a class="wclub-site" href="' + escapeHtml(website) + '" target="_blank" rel="noopener noreferrer">Abrir o site</a>'
            : '';
        return lines + link;
    }

    if (!grid.dataset.codesBound) {
        grid.dataset.codesBound = '1';
        async function revealCodes(card, email) {
            const btn = card.querySelector('.wclub-reveal');
            const form = card.querySelector('.wclub-email');
            const box = card.querySelector('.wclub-codes');
            const slug = btn ? btn.getAttribute('data-slug') : '';
            const submit = form && form.querySelector('.wclub-email-submit');
            const errorEl = form && form.querySelector('.wclub-email-error');
            if (submit) {
                submit.disabled = true;
                submit.textContent = 'A abrir…';
            }
            if (errorEl) errorEl.hidden = true;
            try {
                const res = await fetch('/api/wellness-club/' + encodeURIComponent(slug) + '/codes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Não foi possível mostrar os códigos.');
                try { sessionStorage.setItem('lon-wclub-email', email); } catch (e) { /* ignore */ }
                if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
                    window.LonAnalytics.track('cta_click', { cta: 'wellness_club_code', partner: slug });
                }
                if (box) {
                    box.innerHTML = codesHtml(data.codes, card.getAttribute('data-website') || '');
                    box.hidden = false;
                }
                if (btn) btn.hidden = true;
                if (form) form.hidden = true;
            } catch (err) {
                if (submit) {
                    submit.disabled = false;
                    submit.textContent = (btn && btn.getAttribute('data-label')) || 'Ver códigos';
                }
                if (errorEl) {
                    errorEl.textContent = err.message || 'Não foi possível mostrar os códigos.';
                    errorEl.hidden = false;
                }
                if (btn) btn.hidden = true;
                if (form) form.hidden = false;
            }
        }

        grid.addEventListener('click', (event) => {
            const btn = event.target.closest('.wclub-reveal');
            if (!btn || btn.disabled) return;
            const card = btn.closest('.wclub-card');
            const form = card && card.querySelector('.wclub-email');
            if (!card || !form) return;
            let saved = '';
            try { saved = sessionStorage.getItem('lon-wclub-email') || ''; } catch (e) { saved = ''; }
            if (saved) {
                btn.hidden = true;
                revealCodes(card, saved);
                return;
            }
            const input = form.querySelector('input[name="email"]');
            btn.hidden = true;
            form.hidden = false;
            if (input) input.focus();
        });
        grid.addEventListener('submit', (event) => {
            const form = event.target.closest('.wclub-email');
            if (!form) return;
            event.preventDefault();
            const card = form.closest('.wclub-card');
            const input = form.querySelector('input[name="email"]');
            const email = input ? input.value.trim() : '';
            if (!card || !email) return;
            revealCodes(card, email);
        });
    }

    function ctaHtml() {
        return '<a class="wx-card wclub-cta" href="https://wa.me/351928372775?text=Ol%C3%A1%2C%20quero%20ser%20parceiro%20do%20LON%20Wellness%20Club." target="_blank" rel="noopener noreferrer">' +
            '<div class="wclub-cta-panel" aria-hidden="true"></div>' +
            '<div class="wx-card-body">' +
            '<h2 class="wx-card-title">Quer ser parceiro?</h2>' +
            '<p class="wclub-sub">Estúdios e espaços de movimento. Escreva-nos e o cartão entra nesta página.</p>' +
            '<span class="wclub-reveal">Falar connosco</span>' +
            '</div></a>';
    }

    function matchCtaPanel() {
        const photo = grid.querySelector('.wx-card-photo-wrap');
        const panel = grid.querySelector('.wclub-cta-panel');
        if (!photo || !panel) return;
        panel.style.height = Math.round(photo.getBoundingClientRect().height) + 'px';
    }

    window.addEventListener('resize', matchCtaPanel);

    function filtersActive() {
        return Boolean(
            (qInput && qInput.value.trim()) ||
            (categorySelect && categorySelect.value) ||
            (citySelect && citySelect.value)
        );
    }

    let requestId = 0;

    async function load() {
        const id = ++requestId;
        const params = new URLSearchParams();
        if (qInput && qInput.value.trim()) params.set('q', qInput.value.trim());
        if (categorySelect && categorySelect.value) params.set('category', categorySelect.value);
        if (citySelect && citySelect.value) params.set('city', citySelect.value);
        if (clearBtn) clearBtn.hidden = !filtersActive();
        try {
            const res = await fetch('/api/wellness-club' + (params.toString() ? '?' + params.toString() : ''));
            if (!res.ok) throw new Error('load failed');
            const data = await res.json();
            if (id !== requestId) return;
            const meta = data.meta || {};
            if (categorySelect && meta.categories) {
                fillSelect(categorySelect, meta.categories, 'Todas as categorias');
            }
            if (citySelect && meta.cities) {
                fillSelect(citySelect, meta.cities, 'Todas as cidades');
            }
            const partners = data.partners || [];
            const n = partners.length;
            if (countEl) {
                countEl.textContent = n === 1 ? '1 parceiro' : n + ' parceiros';
            }
            const empty = n ? '' : '<p class="wx-empty">Nenhum parceiro com estes filtros.</p>';
            grid.innerHTML = empty + partners.map(cardHtml).join('') + ctaHtml();
            grid.querySelectorAll('.wx-card-photo').forEach((img) => {
                if (!img.complete) img.addEventListener('load', matchCtaPanel, { once: true });
            });
            matchCtaPanel();
        } catch (err) {
            if (id !== requestId) return;
            grid.innerHTML = '<p class="wx-error">Não foi possível carregar os parceiros.</p>';
            if (countEl) countEl.textContent = '';
        }
    }

    let timer = 0;
    function schedule() {
        window.clearTimeout(timer);
        timer = window.setTimeout(load, 180);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        load();
    });
    if (qInput) qInput.addEventListener('input', schedule);
    if (categorySelect) categorySelect.addEventListener('change', load);
    if (citySelect) citySelect.addEventListener('change', load);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (qInput) qInput.value = '';
            if (categorySelect) categorySelect.value = '';
            if (citySelect) citySelect.value = '';
            load();
        });
    }

    load();
})();
