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
        const inner =
            '<div class="wx-card-photo-wrap">' + photo +
            '<span class="wx-chip">' + escapeHtml(partner.categoryLabel || '') + '</span></div>' +
            '<div class="wx-card-body">' +
            '<p class="wx-card-loc">' + escapeHtml(partner.city || '') + '</p>' +
            '<h2 class="wx-card-title">' + escapeHtml(partner.name || '') + '</h2>' +
            '<p class="wclub-card-desc">' + escapeHtml(partner.description || '') + '</p>' +
            '</div>';
        if (partner.website) {
            return '<a class="wx-card wclub-card" href="' + escapeHtml(partner.website) + '" target="_blank" rel="noopener noreferrer">' +
                inner + '</a>';
        }
        return '<article class="wx-card wclub-card">' + inner + '</article>';
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
