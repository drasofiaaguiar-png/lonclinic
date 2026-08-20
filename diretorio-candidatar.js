document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dirApplyForm');
    const errorEl = document.getElementById('dirApplyError');
    const doneEl = document.getElementById('dirApplyDone');
    const wrapEl = document.getElementById('dirApplyWrap');
    const submitBtn = document.getElementById('dirApplySubmit');

    function showError(msg) {
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }

    function hideError() {
        if (!errorEl) return;
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    function checkedValues(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
    }

    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        const payload = {
            name: document.getElementById('prodName').value,
            shortDescription: document.getElementById('prodShort').value,
            longDescription: document.getElementById('prodLong').value,
            categories: checkedValues('categories'),
            district: document.getElementById('prodDistrict').value,
            municipality: document.getElementById('prodMunicipality').value,
            address: document.getElementById('prodAddress').value,
            lat: document.getElementById('prodLat').value,
            lng: document.getElementById('prodLng').value,
            certBody: document.getElementById('prodCertBody').value,
            certNumber: document.getElementById('prodCertNumber').value,
            website: document.getElementById('prodWebsite').value,
            email: document.getElementById('prodEmail').value,
            phone: document.getElementById('prodPhone').value,
            instagram: document.getElementById('prodInstagram').value,
            facebook: document.getElementById('prodFacebook').value,
            socialOther: document.getElementById('prodSocialOther').value,
            salesMethods: checkedValues('salesMethods')
        };
        if (!payload.name.trim() || !payload.shortDescription.trim()) {
            showError('Nome e descrição curta são obrigatórios.');
            return;
        }
        if (!payload.categories.length) {
            showError('Escolha pelo menos uma categoria.');
            return;
        }
        if (!payload.district) {
            showError('Indique o distrito.');
            return;
        }
        if (!payload.salesMethods.length) {
            showError('Escolha pelo menos um método de venda.');
            return;
        }

        const fd = new FormData();
        fd.append('payload', JSON.stringify(payload));
        const photos = document.getElementById('prodPhotos').files || [];
        for (let i = 0; i < Math.min(photos.length, 8); i += 1) {
            fd.append('photos', photos[i]);
        }
        const cert = document.getElementById('prodCertImage').files[0];
        if (cert) fd.append('certImage', cert);

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'A enviar…';
        }
        try {
            const res = await fetch('/api/diretorio/candidatar', { method: 'POST', body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showError(data.error || 'Não foi possível enviar a candidatura.');
                return;
            }
            if (wrapEl) wrapEl.hidden = true;
            if (doneEl) doneEl.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            showError('Erro de ligação. Tente novamente.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar candidatura';
            }
        }
    });
});
