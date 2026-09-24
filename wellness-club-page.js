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
        const reveal = partner.hasCodes
            ? '<button type="button" class="wclub-reveal" data-slug="' + escapeHtml(partner.slug) + '">Ver códigos</button>' +
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
        grid.addEventListener('click', async (event) => {
            const btn = event.target.closest('.wclub-reveal');
            if (!btn || btn.disabled) return;
            const slug = btn.getAttribute('data-slug');
            const box = btn.parentElement && btn.parentElement.querySelector('.wclub-codes');
            btn.disabled = true;
            btn.textContent = 'A abrir…';
            try {
                const res = await fetch('/api/wellness-club/' + encodeURIComponent(slug) + '/codes', { method: 'POST' });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Não foi possível mostrar os códigos.');
                if (window.LonAnalytics && typeof window.LonAnalytics.track === 'function') {
                    window.LonAnalytics.track('cta_click', { cta: 'wellness_club_code', partner: slug });
                }
                if (box) {
                    const card = btn.closest('.wclub-card');
                    const site = card ? card.getAttribute('data-website') : '';
                    box.innerHTML = codesHtml(data.codes, site);
                    box.hidden = false;
                }
                btn.hidden = true;
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Ver códigos';
            }
        });
    }

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
            grid.innerHTML = n
                ? partners.map(cardHtml).join('')
                : '<p class="wx-empty">Nenhum parceiro com estes filtros.</p>';
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
