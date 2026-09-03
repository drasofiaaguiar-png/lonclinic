/* Authenticated CVI recommender — never renders raw call notes. */
(function () {
    'use strict';

    var loginSection = document.getElementById('cviLogin');
    var resultsSection = document.getElementById('cviResults');
    var loginForm = document.getElementById('cviLoginForm');
    var emailInput = document.getElementById('cviEmail');
    var refInput = document.getElementById('cviRef');
    var errorBox = document.getElementById('cviLoginError');
    var list = document.getElementById('cviList');
    var cityInput = document.getElementById('cviCity');
    var geoBtn = document.getElementById('cviGeo');
    var originBox = document.getElementById('cviOrigin');

    var session = null;
    var centers = [];
    var origin = null;
    var coords = null;
    var debounceTimer = null;

    function getDashSession() {
        try {
            return JSON.parse(sessionStorage.getItem('dash_session')) || null;
        } catch {
            return null;
        }
    }

    function setDashSession(data) {
        sessionStorage.setItem('dash_session', JSON.stringify(data));
    }

    function showError(message) {
        if (!errorBox) return;
        errorBox.textContent = message || '';
        errorBox.style.display = message ? 'block' : 'none';
    }

    function pillClass(priority) {
        if (priority === 'high') return 'cvi-pill cvi-pill-high';
        if (priority === 'medium') return 'cvi-pill cvi-pill-medium';
        if (priority === 'low') return 'cvi-pill cvi-pill-low';
        return 'cvi-pill cvi-pill-unknown';
    }

    function pillLabel(priority) {
        if (priority === 'high') return 'Atendem com facilidade';
        if (priority === 'medium') return 'Pode ser preciso insistir';
        if (priority === 'low') return 'Contacto difícil';
        return 'Sem histórico de chamada';
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showOrigin() {
        if (!originBox) return;
        if (!origin) {
            originBox.hidden = true;
            originBox.textContent = '';
            originBox.classList.remove('is-warn');
            return;
        }
        originBox.hidden = false;
        if (origin.resolved) {
            originBox.classList.remove('is-warn');
            var extra = origin.nearbyCount
                ? ' · ' + origin.nearbyCount + ' centro(s) a curta distância'
                : '';
            originBox.textContent = 'A ordenar a partir de ' + origin.label + extra + '.';
        } else {
            originBox.classList.add('is-warn');
            originBox.textContent = 'Não reconhecemos essa localidade — a lista fica ordenada só por contacto. Tente a cidade ou o código postal.';
        }
    }

    function render() {
        if (!list) return;
        showOrigin();
        if (!centers.length) {
            list.innerHTML = '<p class="cvi-empty">Nenhum centro corresponde a esse filtro.</p>';
            return;
        }
        list.innerHTML = centers.map(function (row) {
            var hours = row.hours ? '<div class="cvi-meta">' + escapeHtml(row.hours).replace(/\n/g, '<br>') + '</div>' : '';
            var address = row.address ? '<div class="cvi-meta">' + escapeHtml(row.address).replace(/\n/g, '<br>') + '</div>' : '';
            var hint = row.contactHint ? '<p class="cvi-hint">' + escapeHtml(row.contactHint) + '</p>' : '';
            var insist = row.insistNote && !row.contactHint ? '<p class="cvi-hint">' + escapeHtml(row.insistNote) + '</p>' : '';
            var book = row.howToBook ? '<div class="cvi-meta"><strong>Como marcar:</strong> ' + escapeHtml(row.howToBook) + '</div>' : '';
            var bookVac = row.howToBookVaccine ? '<div class="cvi-meta"><strong>Com receita:</strong> ' + escapeHtml(row.howToBookVaccine) + '</div>' : '';
            var wait = '';
            if (row.prazoReal) {
                wait = '<div class="cvi-prazo"><strong>Prazo real até à vacina</strong>' +
                    '<span>Consulta LON: ' + escapeHtml(row.prazoReal.consultaLon) + '</span>' +
                    '<span>Marcação da vacina: ' + escapeHtml(row.prazoReal.marcacaoVacina || 'confirmar com o centro') + '</span></div>';
            }
            var dist = row.distanceLabel
                ? '<div class="cvi-dist">' + escapeHtml(row.distanceLabel) + '</div>'
                : '';
            var ok = row.verified ? '<span class="cvi-pill cvi-pill-ok">Dados confirmados</span>' : '';
            var tel = row.phone
                ? '<a href="tel:' + escapeHtml(String(row.phone).replace(/\D+/g, '')) + '">Ligar ' + escapeHtml(row.phone) + '</a>'
                : '';
            var mail = row.email ? '<a href="mailto:' + escapeHtml(row.email) + '">Enviar email</a>' : '';
            return '<article class="cvi-card" data-priority="' + escapeHtml(row.priority) + '"' +
                (row.nearby ? ' data-nearby="1"' : '') + '>' +
                '<div class="cvi-card-top">' +
                '<div>' + dist + '<h2>' + escapeHtml(row.name) + '</h2>' + address + hours + book + bookVac + wait + '</div>' +
                '<div><span class="' + pillClass(row.priority) + '">' + pillLabel(row.priority) + '</span></div>' +
                '</div>' +
                (ok ? '<p style="margin:8px 0 0">' + ok + '</p>' : '') +
                hint + insist +
                '<div class="cvi-actions">' + tel + mail + '</div>' +
                '</article>';
        }).join('');
    }

    async function loadCenters(email, ref) {
        var url = '/api/conta/vacina/centros?email=' + encodeURIComponent(email) +
            '&ref=' + encodeURIComponent(ref);
        var city = (cityInput && cityInput.value || '').trim();
        if (coords && coords.lat != null && coords.lng != null) {
            url += '&lat=' + encodeURIComponent(coords.lat) + '&lng=' + encodeURIComponent(coords.lng);
        } else if (city) {
            url += '&cidade=' + encodeURIComponent(city);
        }
        var res = await fetch(url, { headers: { Accept: 'application/json' } });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            throw new Error(data.error || 'Não foi possível validar a marcação.');
        }
        origin = data.origin || null;
        return Array.isArray(data.centers) ? data.centers : [];
    }

    async function refreshCenters() {
        if (!session) return;
        centers = await loadCenters(session.email, session.ref);
        render();
    }

    async function enter(email, ref) {
        showError('');
        session = { email: email, ref: ref };
        setDashSession(session);
        centers = await loadCenters(email, ref);
        if (loginSection) loginSection.hidden = true;
        if (resultsSection) resultsSection.hidden = false;
        render();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = (emailInput.value || '').trim();
            var ref = (refInput.value || '').trim();
            enter(email, ref).catch(function (err) {
                showError(err.message || 'Erro de rede.');
            });
        });
    }

    if (cityInput) {
        cityInput.addEventListener('input', function () {
            coords = null;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                refreshCenters().catch(function () {});
            }, 280);
        });
    }

    if (geoBtn) {
        geoBtn.addEventListener('click', function () {
            if (!navigator.geolocation) {
                if (originBox) {
                    originBox.hidden = false;
                    originBox.classList.add('is-warn');
                    originBox.textContent = 'O browser não permite obter a localização. Escreva a cidade ou o código postal.';
                }
                return;
            }
            geoBtn.disabled = true;
            navigator.geolocation.getCurrentPosition(function (pos) {
                coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                if (cityInput) cityInput.value = '';
                geoBtn.disabled = false;
                refreshCenters().catch(function () {
                    geoBtn.disabled = false;
                });
            }, function () {
                geoBtn.disabled = false;
                if (originBox) {
                    originBox.hidden = false;
                    originBox.classList.add('is-warn');
                    originBox.textContent = 'Não foi possível obter a localização. Escreva a cidade ou o código postal.';
                }
            }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
        });
    }

    var existing = getDashSession();
    var params = new URLSearchParams(window.location.search);
    var email = (params.get('email') || (existing && existing.email) || '').trim();
    var ref = (params.get('ref') || (existing && existing.ref) || '').trim();
    if (email && emailInput) emailInput.value = email;
    if (ref && refInput) refInput.value = ref;
    if (email && ref) {
        enter(email, ref).catch(function () {
            if (loginSection) loginSection.hidden = false;
        });
    }
})();
