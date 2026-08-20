/* Diretório de produtores — list + ficha (admin only) */
(function () {
    const CATEGORY_LABELS = {
        hortofruticolas: 'Hortofrutícolas',
        lacticinios: 'Laticínios',
        mel: 'Mel',
        vinho: 'Vinho',
        azeite: 'Azeite',
        padaria: 'Padaria',
        cosmetica_natural: 'Cosmética natural'
    };
    const SALES_LABELS = {
        loja_fisica: 'Loja física',
        entrega: 'Entrega',
        mercado: 'Mercado',
        encomenda_online: 'Encomenda online'
    };

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fileUrl(producer, filename) {
        if (!producer || !filename) return '';
        return `/api/admin/producers/${encodeURIComponent(producer.id)}/files/${encodeURIComponent(filename)}`;
    }

    function statusBadge(status) {
        const s = status || 'pendente';
        return `<span class="dir-status dir-status-${escapeHtml(s)}">${escapeHtml(s)}</span>`;
    }

    function tagsHtml(ids, map) {
        return (ids || [])
            .map((id) => `<span class="dir-tag">${escapeHtml(map[id] || id)}</span>`)
            .join('');
    }

    async function requireAdminOrRedirect() {
        try {
            const res = await fetch('/api/clinic/auth-status');
            const data = await res.json();
            if (data.authenticated && data.role === 'admin') return true;
            if (data.authenticated) {
                window.location.replace('/clinic-portal');
                return false;
            }
        } catch (e) { /* fall through */ }
        const next = encodeURIComponent(window.location.pathname || '/diretorio');
        window.location.replace('/admin?next=' + next);
        return false;
    }

    async function initList() {
        const ok = await requireAdminOrRedirect();
        if (!ok) return;
        const grid = document.getElementById('dirGrid');
        const qEl = document.getElementById('dirQ');
        const catEl = document.getElementById('dirCategory');
        const distEl = document.getElementById('dirDistrict');
        const salesEl = document.getElementById('dirSales');
        const statusEl = document.getElementById('dirStatus');
        let meta = null;
        let timer = null;

        function fillSelect(el, items, placeholder, valueKey, labelKey) {
            if (!el) return;
            const current = el.value;
            el.innerHTML = `<option value="">${placeholder}</option>`;
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

        async function load() {
            if (!grid) return;
            grid.innerHTML = '<p class="dir-empty">A carregar…</p>';
            const params = new URLSearchParams();
            if (qEl && qEl.value.trim()) params.set('q', qEl.value.trim());
            if (catEl && catEl.value) params.set('category', catEl.value);
            if (distEl && distEl.value) params.set('district', distEl.value);
            if (salesEl && salesEl.value) params.set('sales', salesEl.value);
            if (statusEl && statusEl.value) params.set('status', statusEl.value);
            const qs = params.toString();
            try {
                const res = await fetch('/api/admin/producers' + (qs ? '?' + qs : ''));
                if (res.status === 401 || res.status === 403) {
                    window.location.replace('/admin?next=/diretorio');
                    return;
                }
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                if (!meta && data.meta) {
                    meta = data.meta;
                    fillSelect(catEl, meta.categories || [], 'Todas as categorias', 'id', 'label');
                    fillSelect(distEl, meta.districts || [], 'Todos os distritos');
                    fillSelect(salesEl, meta.salesMethods || [], 'Todos os métodos', 'id', 'label');
                }
                const list = data.producers || [];
                if (!list.length) {
                    grid.innerHTML = '<p class="dir-empty">Nenhum produtor corresponde aos filtros.</p>';
                    return;
                }
                grid.innerHTML = '';
                list.forEach((p) => {
                    const a = document.createElement('a');
                    a.className = 'dir-card';
                    a.href = '/diretorio/' + encodeURIComponent(p.slug);
                    const photo = p.photos && p.photos[0] ? fileUrl(p, p.photos[0].filename) : '';
                    a.innerHTML = `
                        ${photo
                            ? `<img class="dir-card-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(p.name)}" loading="lazy">`
                            : `<div class="dir-card-photo is-empty">Sem foto</div>`}
                        <div class="dir-card-body">
                            <div class="dir-card-top">
                                <h2>${escapeHtml(p.name)}</h2>
                                ${statusBadge(p.status)}
                            </div>
                            <p>${escapeHtml(p.shortDescription || '')}</p>
                            <p>${escapeHtml([p.municipality, p.district].filter(Boolean).join(' · '))}</p>
                            <div class="dir-tags">${tagsHtml(p.categories, CATEGORY_LABELS)}${tagsHtml(p.salesMethods, SALES_LABELS)}</div>
                        </div>
                    `;
                    grid.appendChild(a);
                });
            } catch (err) {
                console.error(err);
                grid.innerHTML = '<p class="dir-error">Não foi possível carregar o diretório.</p>';
            }
        }

        [catEl, distEl, salesEl, statusEl].forEach((el) => {
            if (el) el.addEventListener('change', load);
        });
        if (qEl) {
            qEl.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(load, 280);
            });
        }
        load();
    }

    async function initFicha() {
        const ok = await requireAdminOrRedirect();
        if (!ok) return;
        const root = document.getElementById('dirFicha');
        if (!root) return;
        const parts = window.location.pathname.split('/').filter(Boolean);
        const slug = decodeURIComponent(parts[1] || '');
        if (!slug) {
            root.innerHTML = '<p class="dir-error">Produtor não encontrado.</p>';
            return;
        }
        try {
            const res = await fetch('/api/admin/producers/slug/' + encodeURIComponent(slug));
            if (res.status === 401 || res.status === 403) {
                window.location.replace('/admin?next=' + encodeURIComponent(window.location.pathname));
                return;
            }
            if (res.status === 404) {
                root.innerHTML = '<p class="dir-error">Produtor não encontrado.</p>';
                return;
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const p = data.producer;
            const photos = (p.photos || [])
                .map((ph) => `<img src="${escapeHtml(fileUrl(p, ph.filename))}" alt="${escapeHtml(p.name)}">`)
                .join('');
            const certImg = p.certImage
                ? `<img src="${escapeHtml(fileUrl(p, p.certImage))}" alt="Certificado" style="max-width:280px;border-radius:12px;border:1px solid var(--dir-line);">`
                : '';
            const map = (p.lat != null && p.lng != null)
                ? `<p><a href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(p.lat)}&mlon=${encodeURIComponent(p.lng)}#map=12/${encodeURIComponent(p.lat)}/${encodeURIComponent(p.lng)}" target="_blank" rel="noopener noreferrer">Ver no mapa</a></p>`
                : '';
            const social = p.social || {};
            document.title = (p.name || 'Produtor') + ' — Diretório | LON Clinic';
            root.innerHTML = `
                <a class="dir-back" href="/diretorio">← Voltar ao diretório</a>
                <div class="dir-card-top" style="margin-bottom:8px;">
                    <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(1.8rem,3vw,2.4rem);margin:0;">${escapeHtml(p.name)}</h1>
                    ${statusBadge(p.status)}
                </div>
                <p style="color:var(--dir-muted);">${escapeHtml([p.municipality, p.district].filter(Boolean).join(' · '))}</p>
                <p>${escapeHtml(p.shortDescription || '')}</p>
                ${photos ? `<div class="dir-gallery">${photos}</div>` : ''}
                <dl class="dir-dl">
                    <div><dt>Descrição</dt><dd>${escapeHtml(p.longDescription || '—').replace(/\n/g, '<br>')}</dd></div>
                    <div><dt>Categorias</dt><dd>${escapeHtml((p.categories || []).map((id) => CATEGORY_LABELS[id] || id).join(', ') || '—')}</dd></div>
                    <div><dt>Métodos de venda</dt><dd>${escapeHtml((p.salesMethods || []).map((id) => SALES_LABELS[id] || id).join(', ') || '—')}</dd></div>
                    <div><dt>Morada</dt><dd>${escapeHtml(p.address || '—')}${map}</dd></div>
                    <div><dt>Certificação biológica</dt><dd>${escapeHtml([p.certBody, p.certNumber].filter(Boolean).join(' · ') || '—')}${certImg ? '<div style="margin-top:10px;">' + certImg + '</div>' : ''}</dd></div>
                    <div><dt>Contactos</dt><dd>
                        ${p.website ? `<div><a href="${escapeHtml(p.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.website)}</a></div>` : ''}
                        ${p.email ? `<div><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></div>` : ''}
                        ${p.phone ? `<div><a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a></div>` : ''}
                        ${social.instagram ? `<div>Instagram: ${escapeHtml(social.instagram)}</div>` : ''}
                        ${social.facebook ? `<div>Facebook: ${escapeHtml(social.facebook)}</div>` : ''}
                        ${social.other ? `<div><a href="${escapeHtml(social.other)}" target="_blank" rel="noopener noreferrer">${escapeHtml(social.other)}</a></div>` : ''}
                        ${!p.website && !p.email && !p.phone && !social.instagram && !social.facebook && !social.other ? '—' : ''}
                    </dd></div>
                    ${p.adminNotes ? `<div><dt>Notas internas</dt><dd>${escapeHtml(p.adminNotes)}</dd></div>` : ''}
                </dl>
                <p class="dir-apply-note"><a href="/admin">Moderar no painel admin</a></p>
            `;
        } catch (err) {
            console.error(err);
            root.innerHTML = '<p class="dir-error">Não foi possível carregar este produtor.</p>';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const page = document.body.getAttribute('data-dir-page');
        if (page === 'list') initList();
        if (page === 'ficha') initFicha();
    });
})();
