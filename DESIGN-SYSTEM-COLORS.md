# LON Clinic — Sistema de Cores por Valência

**Data**: 19 Setembro 2026  
**Status**: Definição oficial — aplicar em todas as páginas pilar

---

## 🎨 Cores Principais (Base)

```css
--color-main-dark: #1C1710;      /* Preto suave */
--color-main-white: #FFFFFF;     /* Branco puro */
--color-main-cream: #F3EDE5;     /* Creme claro */
--color-main-accent: #F09458;    /* Laranja acento */
```

**Uso**: 
- Texto principal, backgrounds neutros, acentos gerais
- Aplicar em elementos comuns (nav, footer, botões genéricos)

---

## 💚 Nutrição

```css
--color-nutri-primary: #9FBD84;   /* Verde suave */
--color-nutri-secondary: #3F574C; /* Verde escuro */
```

**Páginas**: `/nutricao`, `/nutricao/programa`, `/nutricao/emagrecimento`

**Aplicação**:
- Hero backgrounds, gradients
- CTAs primários
- Badges, cards
- Hover states

---

## 🧠 Psicologia

```css
--color-psi-primary: #9BB1BC;     /* Azul claro */
--color-psi-secondary: #537284;   /* Azul médio */
```

**Páginas**: `/psicologia`, `/burnout`, páginas de queixas psicológicas

**Aplicação**:
- Hero backgrounds, gradients
- CTAs primários
- Badges, cards
- Mockup phone accents

---

## ⚡ Medicina de Longevidade

```css
--color-long-primary: #ECD281;    /* Amarelo suave */
--color-long-secondary: #CBB068;  /* Dourado */
```

**Páginas**: `/longevidade`

**Aplicação**:
- Hero backgrounds, gradients
- CTAs primários
- Badges, cards
- Ícones, ilustrações

---

## 🚨 Consulta de Medicina + Urgent Care

```css
--color-urgent-primary: #BD4F4F;   /* Vermelho */
--color-urgent-secondary: #A5584E; /* Vermelho escuro */
```

**Páginas**: `/urgent-care`, consultas médicas gerais

**Aplicação**:
- Hero backgrounds (tom de urgência)
- CTAs de ação imediata
- Avisos e alertas
- Badges de "ainda hoje", "resposta rápida"

---

## ✈️ Travel Medicine (Medicina do Viajante)

```css
--color-travel-primary: #A794C9;   /* Roxo */
--color-travel-secondary: #405266; /* Azul escuro */
```

**Páginas**: `/travel-clinic`, páginas de vacinas do viajante

**Aplicação**:
- Hero backgrounds, gradients
- CTAs primários
- Badges, cards
- Ilustrações de viagem

---

## 📐 Regras de Aplicação

### 1. **Hierarquia Visual**

```
Primary color → Hero, CTAs principais, títulos destacados
Secondary color → Hover states, badges, subtítulos
Main colors → Texto, backgrounds neutros, nav/footer
```

### 2. **Contraste e Legibilidade**

- Texto escuro (#1C1710) em backgrounds claros (primary colors)
- Texto branco (#FFFFFF) em backgrounds escuros (secondary colors)
- Sempre garantir ratio WCAG AA (4.5:1 para texto normal)

### 3. **Gradientes Suaves**

```css
/* Exemplo: Psicologia */
background: linear-gradient(135deg, #9BB1BC 0%, #537284 100%);

/* Exemplo: Nutrição */
background: linear-gradient(135deg, #9FBD84 0%, #3F574C 100%);
```

### 4. **Estados Interativos**

- **Hover**: Escurecer primary em ~10-15%
- **Active**: Escurecer primary em ~20%
- **Focus**: Outline com primary color

### 5. **Badges e Tags**

- Background: Primary color com 15-20% opacity
- Border: Primary color sólido
- Text: Secondary color (mais escuro)

---

## 🎯 Meta Tags `theme-color`

Atualizar em cada página:

```html
<!-- Nutrição -->
<meta name="theme-color" content="#9FBD84">

<!-- Psicologia -->
<meta name="theme-color" content="#9BB1BC">

<!-- Medicina Longevidade -->
<meta name="theme-color" content="#ECD281">

<!-- Urgent Care -->
<meta name="theme-color" content="#BD4F4F">

<!-- Travel Medicine -->
<meta name="theme-color" content="#A794C9">
```

---

## 📂 Estrutura CSS Recomendada

### Opção A: CSS Variables por Página

Cada página pilar tem CSS próprio com variables:

```css
/* nutricao.css */
:root {
  --page-primary: #9FBD84;
  --page-secondary: #3F574C;
}

/* psicologia.css */
:root {
  --page-primary: #9BB1BC;
  --page-secondary: #537284;
}
```

### Opção B: Classes Utilitárias Globais

Criar classes globais em `landing.css`:

```css
/* Nutrição */
.nutri-bg-primary { background-color: #9FBD84; }
.nutri-text-primary { color: #9FBD84; }
.nutri-border-primary { border-color: #9FBD84; }

/* Psicologia */
.psi-bg-primary { background-color: #9BB1BC; }
.psi-text-primary { color: #9BB1BC; }
.psi-border-primary { border-color: #9BB1BC; }

/* (repetir para todas valências) */
```

---

## ✅ Checklist de Implementação

Por página pilar:

- [ ] Atualizar `<meta name="theme-color">`
- [ ] Aplicar primary color no hero background/gradient
- [ ] Aplicar secondary color em CTAs principais
- [ ] Badges com primary color (background subtle)
- [ ] Mockup phone com accent color
- [ ] Hover states consistentes
- [ ] Verificar contraste WCAG AA

---

## 🚫 O Que NÃO Fazer

1. ❌ **Não misturar cores de valências diferentes** na mesma página
2. ❌ **Não usar cores vibrantes em texto corrido** (só em accents)
3. ❌ **Não ignorar contraste** — sempre testar legibilidade
4. ❌ **Não aplicar cores em elementos neutros** (nav, footer mantém main colors)

---

## 📊 Referência Visual

```
Nutrição      ████ #9FBD84  ███ #3F574C  (Verde natural)
Psicologia    ████ #9BB1BC  ███ #537284  (Azul calmo)
Longevidade   ████ #ECD281  ███ #CBB068  (Dourado vitalidade)
Urgent Care   ████ #BD4F4F  ███ #A5584E  (Vermelho urgência)
Travel Med    ████ #A794C9  ███ #405266  (Roxo aventura)
```

---

**Nota**: Este sistema substitui as cores anteriores mencionadas nas Indicações Consolidadas:
- ❌ Terracota (#C97A54) → ✅ Verde (#9FBD84) para Nutrição
- ❌ Verde escuro (#1F3D2B) → ✅ Vermelho (#BD4F4F) para Urgent Care
- ❌ Creme (#F0ECE1) → ✅ Amarelo/Dourado (#ECD281) para Longevidade

**Data de atualização**: 19 Setembro 2026
