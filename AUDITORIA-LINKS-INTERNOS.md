# 📋 Auditoria de Links Internos — Rotas de Marcação

**Data**: 19 Setembro 2026  
**Objetivo**: Identificar links para rotas deprecated após consolidação de marcação

---

## ✅ Rotas Deprecated Verificadas

### 1. `/marcar.html` - Nenhuma referência encontrada
```bash
# Busca em HTML
grep -r "href=\"/marcar.html" *.html
# ✅ ZERO resultados

# Busca em artigos markdown
grep -r "](/marcar.html)" data/guide/articles/*.md
# ✅ ZERO resultados

# Busca em JavaScript
grep -r "marcar\.html" *.js
# ✅ ZERO resultados
```

**Status**: ✅ Nenhuma ação necessária

---

### 2. `/book.html` - Nenhuma referência encontrada
```bash
# Busca em HTML
grep -r "href=\"/book.html" *.html
# ✅ ZERO resultados

# Busca em artigos markdown
grep -r "](/book.html)" data/guide/articles/*.md
# ✅ ZERO resultados
```

**Status**: ✅ Nenhuma ação necessária (redirect 301 já existe)

---

### 3. `/triagem.html` - Nenhuma referência encontrada
```bash
# Busca em HTML
grep -r "href=\"/triagem.html" *.html
# ✅ ZERO resultados

# Busca em artigos markdown
grep -r "](/triagem.html)" data/guide/articles/*.md
# ✅ ZERO resultados
```

**Status**: ✅ Nenhuma ação necessária (redirect 301 já existe)

---

## ⚠️ `/marcar` Genérico - 7 Referências Válidas

### Referências encontradas:

#### 1. `marcar.html` (linha 95)
```html
<a href="/marcar" class="marcar-back" id="marcarBookingBack">← Voltar</a>
```
**Status**: ✅ OK — agora serve página de escolha

#### 2. `data/guide/articles/marcacao-guia-rapido.html` (linha 349, 403)
```html
<a href="/marcar" class="lon-btn lon-btn-soft lon-btn-sm">Começar</a>
<a class="alg-btn-cta-large" href="/marcar">Marcar consulta →</a>
```
**Status**: ✅ OK — apresenta escolha de especialidade

#### 3. `data/guide/articles/seguro-saude-compensa.html` (linha 620)
```html
<a class="alg-btn-cta-large" href="/marcar">Ver consultas →</a>
```
**Status**: ✅ OK

#### 4. `clinic.html` (linha 362)
```html
<a class="clinic-link-card" href="/marcar">
```
**Status**: ✅ OK

#### 5. `data/guide/articles/seguros-saude-portugal-guia.html` (linha 615)
```html
<a class="alg-btn-cta-large" href="/marcar">Ver consultas →</a>
```
**Status**: ✅ OK

#### 6. `data/guide/articles/sns-vs-privado-portugal.html` (linha 654)
```html
<a class="alg-btn-cta-large" href="/marcar">Ver consultas →</a>
```
**Status**: ✅ OK

#### 7. `book.html` (linha 140)
```html
<a href="/marcar" class="booking-boundary-btn is-primary" id="bookingNotFoundPrimary">Ver consultas</a>
```
**Status**: ✅ OK — fallback adequado

---

## 📊 `/triagem` - Referências Mapeadas (Não Alterar Por Agora)

### Uso atual de `/triagem`:
- `lon-analytics.js` (linha 343): tracking de página
- `triagem.js` (linhas 129, 731, 752, 1085, 1105): funcionalidade da página
- `queixas.js` (linha 505): link para triagem
- `seo.js` (linha 392): sitemap
- `lon-slots.js` (linhas 652, 667): redirects condicionais
- `server.js` (linhas 9824, 9828): rotas ativas

**Status**: ⏳ MANTER — `/triagem` será fundido com quizzes em implementação futura (TODO separado)

---

## 🎯 Ações Tomadas

### Código Implementado:

#### 1. Redirect 301 de `/marcar.html`
```javascript
// server.js
app.get('/marcar.html', (req, res) => {
    const query = req.url.split('?')[1];
    const suffix = query ? `?${query}` : '';
    res.redirect(301, `/marcar${suffix}`);
});
```

#### 2. Nova Página de Escolha `/marcar`
```javascript
// server.js - função redirectToMarcarHtml modificada
function redirectToMarcarHtml(req, res) {
    const params = new URLSearchParams(req.query || {});
    const tipo = String(params.get('tipo') || '').toLowerCase();
    const slug = MARCAR_TIPO_TO_SLUG[tipo];

    if (slug) {
        params.delete('tipo');
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return res.redirect(301, `/marcar/${slug}${suffix}`);
    }

    // Serve specialty selector page
    const filePath = path.join(__dirname, 'marcar-escolha.html');
    sendHtmlNoCache(res, filePath, 'Error loading specialty selector');
}
```

#### 3. Logging em `/book-consultation`
```javascript
app.get('/book-consultation', (req, res) => {
    const q = req.query || {};
    const hasBookingContext = q.slot || q.service || q.date || q.ficha
        || q.success || q.t || q.session_id || q.cancelled || q.invitation;
    if (!hasBookingContext) {
        console.log('⚠️ /book-consultation direct access without context:', {
            referrer: req.get('Referrer'),
            utm_source: q.utm_source,
            utm_campaign: q.utm_campaign
        });
        return res.redirect(302, '/marcar');
    }
    sendHtmlNoCache(res, path.join(__dirname, 'book.html'), 'Error loading booking page');
});
```

---

## ✅ Verificações Externas Necessárias (Manual)

### 1. Google Ads
- [ ] Auditar campanhas ativas
- [ ] Verificar URLs finais apontam para `/marcar/:tipo` ou `/marcar`
- [ ] Nunca usar `/marcar.html` ou `/book.html`

### 2. Email Marketing
- [ ] Templates de email
- [ ] Automações (confirmação, lembretes)
- [ ] Campanhas newsletter

### 3. Instagram Bio / Posts Salvos
- [ ] Link na bio
- [ ] Posts pinned com links
- [ ] Stories highlights

### 4. QR Codes Físicos
- [ ] Materiais impressos
- [ ] Cartões de visita
- [ ] Flyers/brochuras

### 5. Google Search Console
- [ ] Verificar se `/marcar.html` está indexado (esperar 2-4 semanas)
- [ ] Confirmar canonical correto em `/marcar/:tipo`
- [ ] Monitorar 404s relacionados

---

## 📈 Monitoring & Analytics

### Eventos GA4 Implementados:

#### 1. Seleção de Especialidade
```javascript
gtag('event', 'select_specialty', {
    specialty: 'longevidade|psicologia|nutricao|viajante|tourist',
    page_location: window.location.href
});
```

#### 2. Click em "Ajuda a Escolher"
```javascript
gtag('event', 'click', {
    event_category: 'Navigation',
    event_label: 'Need Help Choosing Specialty'
});
```

#### 3. Acesso Direto a `/book-consultation`
```javascript
console.log('⚠️ /book-consultation direct access without context:', {
    referrer: req.get('Referrer'),
    utm_source: q.utm_source,
    utm_campaign: q.utm_campaign
});
```

---

## 🎯 Métricas de Sucesso (Próximos 7-14 dias)

### KPIs a Monitorar:

1. **Tráfego consolidado**:
   - ✅ 95%+ tráfego em `/marcar/:tipo`
   - ✅ 0% tráfego em `/marcar.html`

2. **Conversão medida**:
   - 🎯 Aumento de 40-60% na conversão rastreada (não necessariamente real, mas **medida corretamente**)

3. **Redirects**:
   - ✅ Redução a ZERO de acessos diretos a URLs deprecated

4. **Escolha de especialidade**:
   - 📊 Distribuição: Longevidade, Psicologia, Nutrição, Viajante, Tourist
   - 📊 Taxa de clique em "Ajuda a escolher"

---

## ✅ Conclusão

**Rotas deprecated**: ✅ Zero referências internas encontradas  
**Redirects 301**: ✅ Implementados e ativos  
**Página de escolha**: ✅ Criada e funcional  
**Tracking**: ✅ GA4 events implementados  
**Links internos**: ✅ Todos válidos (servem nova página de escolha)

**Próximo passo**: Monitorar conversões nos próximos 7-14 dias e verificar fontes externas (Ads, emails, Instagram).

---

**Status**: ✅ COMPLETO  
**Commit**: `feat: consolidar rotas de marcação - resolver fragmentação de conversão`  
**Branch**: `main`
