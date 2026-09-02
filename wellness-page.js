/* Wellness experiences directory — list + ficha */
(function () {
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatPrice(n) {
        if (n == null || n === '') return '';
        return 'a partir de €' + Number(n).toLocaleString('pt-PT');
    }

    function fillSelect(el, items, placeholder, valueKey, labelKey) {
        if (!el) return;
        const current = el.value;
        el.innerHTML = '<option value="">' + placeholder + '</option>';
        items.forEach((item) => {
            const value = valueKey ? item[valueKey] : item;
            const label = labelKey ? item[labelKey] : item;
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            el.appendChild(opt);
        });
        if (current) el.value = current;
    }

    function cardHtml(item) {
        const loc = [item.city, item.countryLabel].filter(Boolean).join(' · ');
        const photo = item.image
            ? '<img class="wx-card-photo" src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">'
            : '<div class="wx-card-photo is-empty">Sem foto</div>';
        return (
            '<div class="wx-card-photo-wrap">' +
                photo +
                '<span class="wx-chip">' + escapeHtml(item.categoryLabel || '') + '</span>' +
                (item.priceFrom ? '<span class="wx-price">' + escapeHtml(formatPrice(item.priceFrom)) + '</span>' : '') +
            '</div>' +
            '<div class="wx-card-body">' +
                '<p class="wx-card-loc">' + escapeHtml(loc) + '</p>' +
                '<h2 class="wx-card-title">' + escapeHtml(item.name) + '</h2>' +
                '<p>' + escapeHtml(item.shortDescription || '') + '</p>' +
                '<div class="wx-card-meta">' +
                    '<span class="wx-tag">' + escapeHtml(item.durationLabel || '') + '</span>' +
                    '<span class="wx-tag">' + escapeHtml(item.settingLabel || '') + '</span>' +
                '</div>' +
            '</div>'
        );
    }

    function readFiltersFromUrl() {
        const p = new URLSearchParams(window.location.search);
        return {
            q: p.get('q') || '',
            country: p.get('country') || '',
            city: p.get('city') || '',
            category: p.get('category') || '',
            duration: p.get('duration') || '',
            setting: p.get('setting') || ''
        };
    }

    function writeFiltersToUrl(state) {
        const p = new URLSearchParams();
        Object.keys(state).forEach((key) => {
            if (state[key]) p.set(key, state[key]);
        });
        const qs = p.toString();
        const next = window.location.pathname + (qs ? '?' + qs : '');
        window.history.replaceState(null, '', next);
    }

    function hasActiveFilters(state) {
        return Object.keys(state).some((key) => state[key]);
    }

    async function initList() {
        const grid = document.getElementById('wxGrid');
        const countEl = document.getElementById('wxCount');
        const clearBtn = document.getElementById('wxClear');
        const qEl = document.getElementById('wxQ');
        const countryEl = document.getElementById('wxCountry');
        const cityEl = document.getElementById('wxCity');
        const catEl = document.getElementById('wxCategory');
        const durEl = document.getElementById('wxDuration');
        const setEl = document.getElementById('wxSetting');
        let all = [];
        let meta = null;
        let timer = null;

        function currentState() {
            return {
                q: (qEl && qEl.value.trim()) || '',
                country: (countryEl && countryEl.value) || '',
                city: (cityEl && cityEl.value) || '',
                category: (catEl && catEl.value) || '',
                duration: (durEl && durEl.value) || '',
                setting: (setEl && setEl.value) || ''
            };
        }

        function citiesFor(country) {
            const set = new Set();
            all.forEach((item) => {
                if (country && item.country !== country) return;
                if (item.city) set.add(item.city);
            });
            return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
        }

        function refreshCities(preserve) {
            const country = countryEl ? countryEl.value : '';
            const keep = preserve && cityEl ? cityEl.value : '';
            fillSelect(cityEl, citiesFor(country), 'Todas as cidades');
            if (keep && citiesFor(country).indexOf(keep) !== -1) cityEl.value = keep;
        }

        function apply(pushUrl) {
            const state = currentState();
            if (pushUrl !== false) writeFiltersToUrl(state);
            if (clearBtn) clearBtn.hidden = !hasActiveFilters(state);

            const q = state.q.toLowerCase();
            const list = all.filter((item) => {
                if (state.country && item.country !== state.country) return false;
                if (state.city && item.city !== state.city) return false;
                if (state.category && item.category !== state.category) return false;
                if (state.duration && item.duration !== state.duration) return false;
                if (state.setting && item.setting !== state.setting) return false;
                if (q) {
                    const blob = [
                        item.name,
                        item.shortDescription,
                        item.city,
                        item.region,
                        item.countryLabel,
                        item.categoryLabel
                    ].join(' ').toLowerCase();
                    if (blob.indexOf(q) === -1) return false;
                }
                return true;
            });

            if (countEl) {
                countEl.textContent = list.length === 1
                    ? '1 experiência'
                    : list.length + ' experiências';
            }

            if (!grid) return;
            if (!list.length) {
                grid.innerHTML = '<p class="wx-empty">Nenhuma experiência corresponde aos filtros.</p>';
                return;
            }
            grid.innerHTML = '';
            list.forEach((item) => {
                const a = document.createElement('a');
                a.className = 'wx-card';
                a.href = '/wellness/' + encodeURIComponent(item.slug);
                a.innerHTML = cardHtml(item);
                grid.appendChild(a);
            });
        }

        try {
            const res = await fetch('/api/wellness');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            all = data.experiences || [];
            meta = data.meta || {};
            fillSelect(countryEl, meta.countries || [], 'Todos os países', 'id', 'label');
            fillSelect(catEl, meta.categories || [], 'Todas as categorias', 'id', 'label');
            fillSelect(durEl, meta.durations || [], 'Qualquer duração', 'id', 'label');
            fillSelect(setEl, meta.settings || [], 'Qualquer ambiente', 'id', 'label');

            const initial = readFiltersFromUrl();
            if (qEl) qEl.value = initial.q;
            if (countryEl) countryEl.value = initial.country;
            refreshCities(false);
            if (cityEl) cityEl.value = initial.city;
            if (catEl) catEl.value = initial.category;
            if (durEl) durEl.value = initial.duration;
            if (setEl) setEl.value = initial.setting;
            apply(false);
        } catch (err) {
            console.error(err);
            if (grid) grid.innerHTML = '<p class="wx-error">Não foi possível carregar o diretório.</p>';
            if (countEl) countEl.textContent = '';
        }

        if (countryEl) {
            countryEl.addEventListener('change', () => {
                refreshCities(true);
                apply();
            });
        }
        [cityEl, catEl, durEl, setEl].forEach((el) => {
            if (el) el.addEventListener('change', apply);
        });
        if (qEl) {
            qEl.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(apply, 220);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (qEl) qEl.value = '';
                if (countryEl) countryEl.value = '';
                refreshCities(false);
                if (catEl) catEl.value = '';
                if (durEl) durEl.value = '';
                if (setEl) setEl.value = '';
                apply();
            });
        }
        const form = document.getElementById('wxFilters');
        if (form) {
            form.addEventListener('submit', (e) => e.preventDefault());
        }
    }

    async function initFicha() {
        const root = document.getElementById('wxFicha');
        if (!root) return;
        const parts = window.location.pathname.split('/').filter(Boolean);
        const slug = decodeURIComponent(parts[1] || '');
        if (!slug) {
            root.innerHTML = '<p class="wx-error">Experiência não encontrada.</p>';
            return;
        }
        try {
            const res = await fetch('/api/wellness/' + encodeURIComponent(slug));
            if (res.status === 404) {
                root.innerHTML = '<p class="wx-error">Experiência não encontrada. <a href="/wellness">Voltar ao diretório</a>.</p>';
                return;
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const item = data.experience;
            const related = data.related || [];
            document.title = (item.name || 'Wellness') + ' · Lon Clinic';
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) canonical.setAttribute('href', 'https://lonclinic.com/wellness/' + encodeURIComponent(item.slug));

            const paras = String(item.longDescription || '')
                .split(/\n\n+/)
                .map((p) => '<p>' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>')
                .join('');
            const highlights = (item.highlights || [])
                .map((h) => '<li>' + escapeHtml(h) + '</li>')
                .join('');
            const loc = [item.city, item.region, item.countryLabel].filter(Boolean).join(' · ');
            const relatedHtml = related.map((r) => {
                return (
                    '<a class="wx-card" href="/wellness/' + encodeURIComponent(r.slug) + '">' +
                    cardHtml(r) +
                    '</a>'
                );
            }).join('');

            root.innerHTML =
                '<a class="wx-back" href="/wellness">← Todas as experiências</a>' +
                '<p class="wx-ficha-kicker">' + escapeHtml(item.categoryLabel) + ' · ' + escapeHtml(loc) + '</p>' +
                '<h1>' + escapeHtml(item.name) + '</h1>' +
                '<p class="wx-lead">' + escapeHtml(item.shortDescription || '') + '</p>' +
                (item.image
                    ? '<img class="wx-hero-img" src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '">'
                    : '') +
                '<dl class="wx-dl">' +
                    '<div><dt>País</dt><dd>' + escapeHtml(item.countryLabel) + '</dd></div>' +
                    '<div><dt>Cidade</dt><dd>' + escapeHtml(item.city) + '</dd></div>' +
                    '<div><dt>Duração</dt><dd>' + escapeHtml(item.durationLabel) + '</dd></div>' +
                    '<div><dt>Ambiente</dt><dd>' + escapeHtml(item.settingLabel) + '</dd></div>' +
                    (item.priceFrom
                        ? '<div><dt>Preço indicativo</dt><dd>' + escapeHtml(formatPrice(item.priceFrom)) + '</dd></div>'
                        : '') +
                '</dl>' +
                '<div class="wx-copy">' + paras + '</div>' +
                (highlights ? '<ul class="wx-highlights">' + highlights + '</ul>' : '') +
                '<div class="wx-cta-row">' +
                    (item.website
                        ? '<a class="lon-btn lon-btn-primary" href="' + escapeHtml(item.website) + '" target="_blank" rel="noopener noreferrer">Site oficial</a>'
                        : '') +
                    '<a class="lon-btn lon-btn-ghost" href="/wellness">Voltar ao diretório</a>' +
                '</div>' +
                '<p class="wx-note">A Lon Clinic não opera nem fatura esta experiência. A marcação é feita com o espaço. Não substitui consulta médica.</p>' +
                (relatedHtml
                    ? '<section class="wx-related" aria-labelledby="wx-related-title"><h2 id="wx-related-title">Outras no mesmo país</h2><div class="wx-related-grid">' + relatedHtml + '</div></section>'
                    : '');
        } catch (err) {
            console.error(err);
            root.innerHTML = '<p class="wx-error">Não foi possível carregar esta experiência.</p>';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const page = document.body.getAttribute('data-wx-page');
        if (page === 'list') initList();
        if (page === 'ficha') initFicha();
    });
})();
