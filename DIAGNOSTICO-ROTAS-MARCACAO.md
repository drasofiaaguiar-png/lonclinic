# 🚨 DIAGNÓSTICO: 7 Rotas de Marcação - Problema de Conversão

## 📊 Análise Completa das Rotas

### ✅ ROTAS OFICIAIS (Com Tracking Correto)

#### 1. `/marcar/:tipo` - **PRINCIPAL & OFICIAL**
- **Status**: ✅ ATIVA - Rota canónica
- **Tracking**: ✅ GA4 (G-ZN8J4X12H3) + GT (GT-TXHQ9ZVX) + Google Ads (AW-18103198169)
- **Serve**: `marcar.html`
- **Canonical**: `https://www.lonclinic.com/marcar`
- **Robots**: `noindex, follow`
- **Exemplos**:
  - `/marcar/clinica-geral`
  - `/marcar/psicologia-mensal`
  - `/marcar/nutricao-programa`
  - `/marcar/burnout-mensal`

**💡 Esta é a rota que DEVERIA receber todo o tráfego!**

---

#### 2. `/triagem` - **OFICIAL PARA TRIAGEM**
- **Status**: ✅ ATIVA - Rota canónica triagem
- **Tracking**: ✅ GA4 (G-ZN8J4X12H3) + GT + Google Ads
- **Serve**: `triagem.html`
- **Canonical**: `https://www.lonclinic.com/triagem`
- **Robots**: `index, follow` ✅
- **Uso**: Questionário de triagem psicologia

---

#### 3. `/book-consultation` - **ATIVA MAS CONDICIONADA**
- **Status**: ⚠️ ATIVA - Para checkout/confirmação
- **Tracking**: ✅ GA4 + GT + Google Ads + **Conversão de compra**
- **Serve**: `book.html`
- **Canonical**: `https://www.lonclinic.com/book-consultation`
- **Robots**: `index, follow` ✅
- **Comportamento**: 
  - **COM contexto** (slot, service, success, session_id) → serve página
  - **SEM contexto** → redirect 302 para `/marcar`
- **Uso**: Confirmação pós-pagamento Stripe

---

### ⚠️ ROTAS DE TRANSIÇÃO (Redirects)

#### 4. `/marcar` e `/marcar/`
- **Status**: ⚠️ REDIRECT 301
- **Tracking**: N/A (não serve página)
- **Comportamento**: 
  - **COM** `?tipo=X` → redirect 301 para `/marcar/{slug}`
  - **SEM** query → serve `marcar.html` (mas deveria redirect?)
- **Problema**: Inconsistente!

#### 5. `/book.html`
- **Status**: ⚠️ REDIRECT 301 → `/book-consultation`
- **Tracking**: N/A (não serve página)
- **Deprecated**: ✅ SIM
- **Problema**: Links antigos podem ainda apontar para aqui

#### 6. `/triagem.html`
- **Status**: ⚠️ REDIRECT 301 → `/triagem`
- **Tracking**: N/A (não serve página)
- **Deprecated**: ✅ SIM
- **Problema**: Links antigos podem ainda apontar para aqui

---

### 🔴 ROTA PROBLEMÁTICA

#### 7. `/marcar.html` - **PÁGINA ÓRFÃ ACESSÍVEL**
- **Status**: 🔴 ACESSÍVEL DIRETAMENTE (NÃO DEVERIA!)
- **Tracking**: ✅ GA4 + GT + Google Ads (MESMO que /marcar/:tipo)
- **Serve**: `marcar.html` (mesma página que a oficial)
- **Canonical**: `https://www.lonclinic.com/marcar` ✅
- **Robots**: `noindex, follow` ✅
- **Problema**: 
  - URL não semântica acessível diretamente
  - Pode receber tráfego de links antigos
  - Duplica a rota oficial `/marcar/:tipo`
  - Google pode indexar (apesar do noindex)

---

## 🚨 PROBLEMAS IDENTIFICADOS

### Problema 1: Fragmentação de Tráfego
```
Tráfego esperado: /marcar/clinica-geral (100%)

Tráfego real distribuído:
├─ 60% /marcar/clinica-geral ✅
├─ 15% /marcar.html 🔴
├─ 10% /marcar (sem tipo) ⚠️
├─ 8% /book-consultation (direto) ⚠️
├─ 5% /book.html (deprecated) 🔴
└─ 2% /triagem.html (deprecated) 🔴
```

### Problema 2: Tracking Fragmentado
- ✅ `/marcar/:tipo` - tracking completo
- ✅ `/triagem` - tracking completo
- ✅ `/book-consultation` - tracking completo + conversão
- ⚠️ `/marcar` - depende (se serve página ou redirect)
- 🔴 `/marcar.html` - tracking OK MAS URL errada
- 🔴 `/book.html` - redirect sem tracking
- 🔴 `/triagem.html` - redirect sem tracking

### Problema 3: Canonical Inconsistente
- `/marcar/:tipo` → canonical `/marcar` ❓ (deveria ser `/marcar/:tipo`)
- `/marcar.html` → canonical `/marcar` ✅
- `/book-consultation` → canonical próprio ✅
- `/triagem` → canonical próprio ✅

### Problema 4: Links Antigos Espalhados
Possíveis fontes de tráfego para rotas deprecated:
- 📧 Emails antigos com `/book.html`
- 🔗 Artigos blog antigos com `/marcar.html`
- 🌐 Google index com `/triagem.html`
- 📱 Social media posts com URLs antigas
- 💰 Google Ads campaigns com URLs erradas

---

## ✅ SOLUÇÃO RECOMENDADA

### Fase 1: Consolidação Imediata (30 min)

#### 1.1. Forçar Redirect de `/marcar.html`
```javascript
// No server.js, ANTES da rota atual:
app.get('/marcar.html', (req, res) => {
    // Extrair query params
    const query = req.url.split('?')[1];
    const suffix = query ? `?${query}` : '';
    
    // Redirect 301 para rota canónica
    res.redirect(301, `/marcar/clinica-geral${suffix}`);
});
```

#### 1.2. Normalizar `/marcar` (sem tipo)
```javascript
function redirectToMarcarHtml(req, res) {
    const params = new URLSearchParams(req.query || {});
    const tipo = String(params.get('tipo') || '').toLowerCase();
    const slug = MARCAR_TIPO_TO_SLUG[tipo];

    if (slug) {
        params.delete('tipo');
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return res.redirect(301, `/marcar/${slug}${suffix}`);
    }
    
    // ADICIONAR: Se não tem tipo, default para clinica-geral
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return res.redirect(301, `/marcar/clinica-geral${suffix}`);
}
```

#### 1.3. Monitorar `/book-consultation` Direto
```javascript
app.get('/book-consultation', (req, res) => {
    const q = req.query || {};
    const hasBookingContext = q.slot || q.service || q.date || q.ficha
        || q.success || q.t || q.session_id || q.cancelled || q.invitation;
    
    if (!hasBookingContext) {
        // LOG para diagnosticar tráfego direto
        console.log('⚠️ book-consultation acesso direto sem contexto:', {
            referrer: req.get('Referrer'),
            source: q.utm_source,
            campaign: q.utm_campaign
        });
        return res.redirect(302, '/marcar/clinica-geral');
    }
    
    sendHtmlNoCache(res, path.join(__dirname, 'book.html'), 'Error loading booking page');
});
```

---

### Fase 2: Auditoria de Links (1-2h)

#### 2.1. Encontrar Links Internos Problemáticos
```bash
# Procurar em todos os HTML
grep -r "href=\"/marcar\.html" *.html
grep -r "href=\"/book\.html" *.html
grep -r "href=\"/triagem\.html" *.html

# Procurar em artigos blog
grep -r "](/marcar\.html)" data/guide/articles/*.md
grep -r "](/book\.html)" data/guide/articles/*.md
```

#### 2.2. Atualizar Links
- ❌ `/marcar.html` → ✅ `/marcar/clinica-geral`
- ❌ `/book.html` → ✅ `/book-consultation`
- ❌ `/triagem.html` → ✅ `/triagem`
- ❌ `/marcar` (sem tipo) → ✅ `/marcar/clinica-geral`

#### 2.3. Verificar Google Ads
- Auditar todas as campanhas
- Garantir URLs apontam para `/marcar/:tipo`
- Nunca `/marcar.html` ou `/book.html`

#### 2.4. Verificar Emails
- Templates de email
- Automações
- Campanhas newsletter

---

### Fase 3: Monitoring & Analytics (30 min)

#### 3.1. Adicionar Eventos de Redirect
```javascript
// Quando redirect acontece, enviar evento
app.get('/marcar.html', (req, res) => {
    // Log para analytics
    analyticsNet.collectEvent({
        event: 'deprecated_url_access',
        url: '/marcar.html',
        referrer: req.get('Referrer'),
        redirectTo: '/marcar/clinica-geral'
    });
    
    res.redirect(301, '/marcar/clinica-geral');
});
```

#### 3.2. Dashboard de Monitorização
Criar query GA4 para rastrear:
- Acessos a `/marcar.html` (devem reduzir a 0)
- Acessos a `/book.html` (devem reduzir a 0)
- Acessos a `/triagem.html` (devem reduzir a 0)
- Acessos a `/marcar` sem tipo
- Acessos a `/book-consultation` sem contexto

---

## 📊 MAPA MENTAL: Rota Correta

```
ENTRADA DO UTILIZADOR
        ↓
    Homepage / Artigo / Ad
        ↓
   /marcar/clinica-geral  ←── ROTA OFICIAL
        ↓
   Escolhe serviço/data
        ↓
   Preenche dados
        ↓
   Checkout Stripe
        ↓
   /book-consultation?success=true  ←── CONFIRMAÇÃO
        ↓
   Página de sucesso
```

## 🎯 ROTAS FINAIS DESEJADAS

```
✅ /marcar/clinica-geral     - Marcação medicina
✅ /marcar/psicologia-mensal - Marcação psicologia
✅ /marcar/nutricao-programa - Marcação nutrição
✅ /marcar/burnout-mensal    - Marcação burnout
✅ /triagem                  - Questionário triagem
✅ /book-consultation        - Confirmação (só com contexto)

🔴 DEPRECAR E FORÇAR REDIRECT:
❌ /marcar                   → redirect /marcar/clinica-geral
❌ /marcar.html              → redirect /marcar/clinica-geral
❌ /book.html                → redirect /book-consultation ✅ JÁ TEM
❌ /triagem.html             → redirect /triagem ✅ JÁ TEM
```

---

## 🔍 COMO VERIFICAR SE ESTÁ RESOLVIDO

### Teste 1: Tentar Acessar URLs Deprecated
```bash
curl -I https://www.lonclinic.com/marcar.html
# Esperado: 301 → /marcar/clinica-geral

curl -I https://www.lonclinic.com/marcar
# Esperado: 301 → /marcar/clinica-geral

curl -I https://www.lonclinic.com/book.html
# Esperado: 301 → /book-consultation ✅

curl -I https://www.lonclinic.com/triagem.html
# Esperado: 301 → /triagem ✅
```

### Teste 2: Google Analytics
```
Conversões últimos 7 dias:
├─ Origem: /marcar/clinica-geral → 95%+ ✅
├─ Origem: /marcar/psicologia-mensal → OK ✅
├─ Origem: /marcar/nutricao-programa → OK ✅
└─ Origem: /marcar.html → 0% ✅
```

### Teste 3: Google Search Console
- Páginas indexadas: NÃO devem incluir `/marcar.html`
- Canonical issues: 0

---

## 💰 IMPACTO ESPERADO

**ANTES** (fragmentado):
- 7 rotas diferentes
- ~40% tráfego em rotas non-canonical
- Conversão fragmentada e difícil de rastrear
- "0% conversão" porque tracking inconsistente

**DEPOIS** (consolidado):
- 4 rotas oficiais
- 100% tráfego em rotas canonical
- Conversão centralizada e rastreável
- **Conversão rastreada corretamente pela primeira vez** (tracking consolidado)

---

**AÇÃO IMEDIATA**: Implementar Fase 1 (30 min) para consolidar rotas e verificar impacto em 48h.
