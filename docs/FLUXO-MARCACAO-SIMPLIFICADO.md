# Fluxo de Marcação Simplificado — LON Clinic

**Status**: ✅ Implementado  
**Data**: 19 Setembro 2026

---

## 📋 Fluxo Atual (Simplificado)

```
Homepage / Página Pilar
        ↓
   [Marcar consulta] → /marcar (escolha especialidade)
        ↓
   Escolher especialidade (5 cards)
        ↓
   /marcar/:tipo (calendário direto)
        ↓
   Escolher data e hora
        ↓
   Criar conta / Login
        ↓
   Confirmação
```

---

## 🎯 O Que Foi Removido

❌ **Marketplace de médicos** — Não há escolha entre vários profissionais  
❌ **Questionário de pesquisa** — Removido o passo extra de triagem dentro da marcação  
❌ **Rotas duplicadas** — 7 rotas consolidadas em 3 canónicas

---

## ✅ Rotas Canónicas

### 1. `/marcar` (Selector de Especialidade)

**Ficheiro**: `marcar-escolha.html`

**Conteúdo**:
- 5 cards de especialidades:
  - ⚡ Medicina de Longevidade → `/longevidade`
  - ✈️ Medicina do Viajante → `/travel-clinic`
  - 🚨 Consulta Urgente → `/urgent-care`
  - 🧠 Psicologia → `/psicologia`
  - 💚 Nutrição → `/nutricao`
- Link "Ajuda a escolher" → `/quizzes`

### 2. `/marcar/:tipo` (Calendário)

**Tipos suportados**:
- `psicologia-mensal`
- `psicologia-casal`
- `nutricao-programa`
- `medicina-longevidade`
- `travel-clinic`
- `urgent-care`

**Comportamento**:
- Mostra calendário direto com slots disponíveis
- Sem passo de "marketplace"
- Direto à escolha de hora

### 3. `/book-consultation` (Confirmação)

**Comportamento**:
- Se chegar sem contexto (slot, service, date) → redirect para `/marcar`
- Se chegar com contexto de marcação → processa confirmação

---

## 🚫 Rotas Deprecated (301 Redirects)

```
/marcar.html → /marcar
/triagem → /quizzes
/triagem.html → /quizzes
/book.html → (mantém funcionalidade antiga temporariamente)
```

---

## 📊 Analytics Implementado

### Specialty Selector
```javascript
gtag('event', 'specialty_selection', {
  event_category: 'booking',
  event_label: [especialidade],
  value: 1
});
```

### Help Link
```javascript
gtag('event', 'help_link_click', {
  event_category: 'booking',
  event_label: 'nao_sei_escolher_quizzes',
  value: 1
});
```

---

## 🔄 Integração com Páginas Pilar

Todas as páginas pilar (`/psicologia`, `/nutricao`, `/longevidade`, `/urgent-care`, `/travel-clinic`) têm CTAs que apontam diretamente para `/marcar`.

**Homepage** também tem 2 CTAs principais:
- "Marcar consulta" → `/marcar`
- "Ajude-me a escolher" → `/quizzes`

---

## 🎨 Design

- **Marcar escolha**: Cards grandes com ícones, hover laranja
- **Mobile**: Layout stack, fácil de tocar
- **Consistente**: Usa mesmo design system que homepage

---

## ⚙️ Implementação Técnica

### Server.js Routes

```javascript
// Canonical route
app.get('/marcar', redirectToMarcarHtml);
app.get('/marcar/', redirectToMarcarHtml);

// Deprecated redirects
app.get('/marcar.html', (req, res) => {
    const query = req.url.split('?')[1];
    const suffix = query ? `?${query}` : '';
    res.redirect(301, `/marcar${suffix}`);
});

app.get('/triagem', (req, res) => {
    const query = req.url.split('?')[1];
    const suffix = query ? `?${query}` : '';
    res.redirect(301, `/quizzes${suffix}`);
});

app.get('/triagem.html', (req, res) => {
    res.redirect(301, '/quizzes');
});

// Book consultation with context check
app.get('/book-consultation', (req, res) => {
    const q = req.query || {};
    const hasBookingContext = q.slot || q.service || q.date || q.ficha
        || q.success || q.t || q.session_id || q.cancelled || q.invitation;
    if (!hasBookingContext) {
        return res.redirect(302, '/marcar');
    }
    sendHtmlNoCache(res, path.join(__dirname, 'book.html'), 'Error loading booking page');
});
```

---

## ✅ Vantagens do Novo Fluxo

1. **Menos passos**: 3 passos vs 5-6 anteriormente
2. **Sem "escolha de médico"**: LON não compete por quantidade, compete por especialidade certa
3. **Tracking correto**: Todas as conversões rastreáveis via GA4
4. **Quizzes como alternativa**: Para quem não sabe o que precisa
5. **Mobile-first**: CTA sempre visível em mobile (fixo em baixo)

---

## 📝 Documentação Relacionada

- `DIAGNOSTICO-ROTAS-MARCACAO.md` — Análise inicial das 7 rotas
- `RESUMO-CONSOLIDACAO-ROTAS.md` — Implementação consolidação
- `AUDITORIA-LINKS-INTERNOS.md` — Verificação links deprecated
- `nav-global.css` — CTA laranja no nav

---

**Última atualização**: 19 Setembro 2026  
**Status**: ✅ Live em produção
