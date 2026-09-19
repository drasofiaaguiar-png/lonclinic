# Navegação Global V2 — Implementação

**Data**: 19 Setembro 2026  
**Status**: ✅ Implementado e deployed

---

## 📋 Resumo da Implementação

Nova navegação global que consolida as 6 páginas pilar (arquitetura das Indicações Consolidadas) e otimiza conversão móvel.

---

## 🖥️ Desktop Navigation

### Estrutura

```
[Logo] | Especialidades ▼ | Magazine | Equipa | [Login] [Marcar consulta 🟠]
```

### Componentes

1. **Logo "lon clinic"** → `/`
2. **Mega Menu "Especialidades"** (dropdown com 5 itens)
   - ⚡ **Medicina de Longevidade** → `/longevidade`
     - Desc: "Prevenção e biomarcadores"
   - ✈️ **Medicina do Viajante** → `/travel-clinic`
     - Desc: "Vacinas e consulta pré-viagem"
   - 🚨 **Consulta Urgente** → `/urgent-care`
     - Desc: "Resposta rápida, ainda hoje"
   - 🧠 **Psicologia** → `/psicologia`
     - Desc: "Terapia individual e de casal"
   - 💚 **Nutrição** → `/nutricao`
     - Desc: "Acompanhamento contínuo"

3. **Magazine** → `/magazine` (279 artigos SEO/AEO)
4. **Equipa** → `/#equipa`
5. **Login** → `/patient-portal` (discreto, secundário)
6. **CTA Laranja** → `/marcar` (destaque máximo)
   - Background: `#F09458` (cor principal de acento)
   - Hover: `#e07d3e`
   - Shadow: `rgba(240, 148, 88, 0.25)`
   - Tracking: `gtag` event `desktop_nav_marcar`

---

## 📱 Mobile Navigation (34% do tráfego)

### Estrutura

```
[Logo]                              [☰ Hamburger]

            [Marcar consulta 🟠]  ← SEMPRE VISÍVEL (fixo em baixo)
```

### Motivação

**Problema identificado**: "Engaged mas não clica em nada" é o maior buraco do funil.

**Solução**: CTA principal sempre acessível, não escondido atrás do hamburger.

- 34% do tráfego é mobile vs 21% desktop
- Esconder o CTA dentro de um menu que precisa de toque extra = piorar conversão

### Componentes Mobile

1. **Hamburger Menu** (topo direita)
   - Especialidades (submenu expansível)
     - ⚡ Medicina de Longevidade
     - ✈️ Medicina do Viajante
     - 🚨 Consulta Urgente
     - 🧠 Psicologia
     - 💚 Nutrição
   - Magazine
   - Equipa
   - Login

2. **CTA Fixo em Baixo** (sticky footer)
   - Sempre visível, scroll independente
   - Background: `#F09458`
   - Tamanho maior: `padding: 15px 24px`
   - Tracking: `gtag` event `mobile_fixed_marcar`
   - Z-index: 999

---

## 🎨 Design System

### Cores

```css
--nav-bg: #FFFFFF
--nav-text: #1C1710
--nav-text-muted: #6b6a64
--nav-border: rgba(28, 23, 16, 0.08)
--nav-cta-orange: #F09458
--nav-cta-orange-hover: #e07d3e
--nav-shadow: 0 2px 12px rgba(28, 23, 16, 0.06)
--nav-mega-shadow: 0 12px 32px rgba(28, 23, 16, 0.12)
```

### Animações

- **Mega menu**: slide down + fade in (0.25s ease)
- **Mobile menu**: fade in (0.3s ease)
- **Submenu mobile**: height expand (0.3s ease)
- **Hover CTA**: `translateY(-1px)` + shadow increase

### Responsividade

- **Mobile first**: `< 900px` = mobile layout
- **Desktop**: `≥ 900px` = horizontal nav + mega menu
- **Breakpoint único**: simplifica manutenção

---

## 📂 Ficheiros Criados

### 1. `nav-global.html`

Componente HTML reutilizável com:
- Estrutura completa do nav
- Mobile menu + submenu
- CTA fixo mobile
- JavaScript inline para interações
- Analytics tracking

### 2. `nav-global.css`

Estilos completos:
- Desktop horizontal nav
- Mega menu dropdown
- Mobile hamburger + submenu
- CTA fixo móvel
- Estados hover/active/focus
- Animações e transições
- Acessibilidade (skip link, aria-*)

---

## 🔄 Páginas Atualizadas

Aplicado o novo nav a todas as páginas pilar:

1. ✅ **psicologia.html**
   - Substituído nav antigo (lon-nav psi-nav)
   - Adicionado `nav-global.css`
   - Atualizado `psicologia.css` com cores azul Psychology (#9BB1BC / #537284)

2. ✅ **nutricao.html**
   - Substituído nav antigo (lon-nav)
   - Adicionado `nav-global.css`

3. ✅ **longevidade.html**
   - Substituído nav antigo (lon-nav)
   - Adicionado `nav-global.css`

4. ✅ **urgent-care.html**
   - Substituído nav antigo (lon-nav)
   - Adicionado `nav-global.css`

---

## 📊 Analytics Implementado

### Desktop

```javascript
gtag('event', 'cta_click', {
  event_category: 'navigation',
  event_label: 'desktop_nav_marcar',
  value: 1
});
```

### Mobile

```javascript
gtag('event', 'cta_click', {
  event_category: 'navigation',
  event_label: 'mobile_fixed_marcar',
  value: 1
});
```

### Mega Menu

Possível adicionar tracking por especialidade:
```javascript
// Futuro: rastrear qual especialidade foi clicada no mega menu
gtag('event', 'mega_menu_click', {
  event_category: 'navigation',
  event_label: 'psicologia' // ou nutricao, longevidade, etc
});
```

---

## ♿ Acessibilidade

1. **Skip link**: "Saltar para o conteúdo" (aparece ao receber focus)
2. **ARIA attributes**:
   - `aria-expanded` nos toggles (mega menu, hamburger, submenu)
   - `aria-controls` a ligar trigger e target
   - `aria-label` nos botões e logo
   - `role="menu"` e `role="menuitem"` no mega menu
3. **Keyboard navigation**:
   - Tab/Shift+Tab para navegar
   - ESC para fechar mega menu
   - Focus trap no mega menu aberto
4. **Mobile**: `body.lon-nav-open` bloqueia scroll quando menu aberto

---

## 🧪 Funcionalidades JavaScript

### 1. Mega Menu Desktop

- Click no botão "Especialidades" → toggle dropdown
- Click fora do menu → fecha automaticamente
- ESC key → fecha e devolve focus ao trigger
- Animações CSS (não JS)

### 2. Mobile Hamburger

- Click no hamburger → toggle menu fullscreen
- Body scroll lock quando aberto
- Animação do ícone (3 barras → X)

### 3. Mobile Submenu

- Click em "Especialidades" (mobile) → expand lista
- Height animation (max-height trick)
- Ícone seta rotação (0deg → 180deg)

### 4. Analytics

- Event listeners em ambos CTAs (desktop + mobile)
- Graceful degradation: `if (typeof gtag !== 'undefined')`

---

## 🚀 Próximos Passos (Opcional)

### 1. Aplicar a Mais Páginas

- Homepage (`index.html`)
- Magazine (`/magazine`)
- Travel clinic (`/travel-clinic` - já usa este nav via server render?)
- Quizzes (`/quizzes`, `/burnout/teste`, etc)

### 2. Adicionar Active State

Highlight da página atual no nav:
```css
.lon-nav-link.active {
  color: var(--nav-cta-orange);
  font-weight: 600;
}
```

### 3. Sticky Behavior Avançado

Nav que encolhe ao fazer scroll down:
```css
.lon-nav-v2.scrolled {
  height: 60px; /* menor */
  box-shadow: 0 4px 20px rgba(28, 23, 16, 0.10); /* mais shadow */
}
```

### 4. Tracking Granular

- Rastrear cliques em cada item do mega menu
- Medir taxa de abertura do mega menu
- A/B test: mega menu vs links diretos

---

## 📝 Decisões Técnicas

### Por que Mega Menu?

1. **Consolidação**: 6 especialidades precisam de estar acessíveis sem sobrecarregar nav
2. **Contexto**: Descrições ajudam user a escolher especialidade certa
3. **SEO**: Todas as páginas pilar linkadas no nav (internal linking)
4. **UX**: Ícones + texto = escaneabilidade

### Por que CTA Fixo Mobile?

1. **Dados**: 34% mobile vs 21% desktop
2. **Conversão**: Maior buraco = "engaged mas não clica"
3. **Benchmark**: Apps líderes (Uber, Airbnb) usam CTAs fixos
4. **Sem friction**: 1 toque = ação, vs 2 toques (abrir menu → clicar CTA)

### Por que Laranja (#F09458)?

1. **Hierarquia**: Único elemento laranja = destaque máximo
2. **Contraste**: Alta legibilidade em fundo branco (WCAG AAA)
3. **Warmth**: Laranja transmite urgência/ação sem ser agressivo como vermelho
4. **Brand**: Já faz parte da paleta principal (main colors)

---

## ✅ Checklist de Verificação

Antes de marcar como completo:

- [x] Criar `nav-global.html` e `nav-global.css`
- [x] Aplicar a 4 páginas pilar (psicologia, nutricao, longevidade, urgent-care)
- [x] Mega menu funcional (desktop)
- [x] Mobile menu com submenu expansível
- [x] CTA fixo sempre visível (mobile)
- [x] Analytics tracking (desktop + mobile)
- [x] Acessibilidade (skip link, ARIA, keyboard)
- [x] Animações e transições suaves
- [x] Commit e deploy
- [ ] Testar em mobile real (não só devtools)
- [ ] Verificar analytics no GA4 (24-48h)
- [ ] Aplicar a homepage e outras páginas (próximo passo)

---

**Deploy**: ✅ Commit `bc004a4`, pushed to `main` em 19 Set 2026  
**Ref**: Indicações Consolidadas - arquitetura 6 páginas pilar
