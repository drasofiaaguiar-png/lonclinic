# 🔍 Auditoria UI/UX - Lon Clinic

## ❌ PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **HOMEPAGE - Seção de Introdução**

**Problema:** Texto com Open Sans 36px está gigante e desformatado
- Font-size 36px é excessivo para parágrafo introdutório
- Quebras de linha manuais (`<br>`) criam espaçamento irregular
- Padding left de 80px não está centralizado
- Falta hierarquia visual clara

**Solução:**
```css
/* Texto centralizado, tamanho adequado */
.lon-intro-text {
    font-size: clamp(1.25rem, 2.5vw, 1.75rem); /* 20-28px */
    text-align: center;
    max-width: 900px;
    margin: 0 auto 48px;
    padding: 0 24px;
    line-height: 1.6;
}
```

---

### 2. **HOMEPAGE - Cards de Categoria**

**Problema:** Cards com imagens de fundo ficam ilegíveis
- Overlay branco 85-90% esconde completamente as imagens
- Aspecto ratio 1:1 (quadrado) desperdiça espaço
- Cards muito pequenos em grid 4 colunas
- Falta contraste e impacto visual

**Solução:**
```css
/* Cards retangulares, maiores, com imagens visíveis */
.lon-category-card {
    aspect-ratio: 3/2; /* Retangular em vez de quadrado */
    min-height: 200px;
    padding: 40px 32px;
    position: relative;
    overflow: hidden;
}

/* Overlay mais suave, gradiente de baixo */
.lon-category-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.2) 0%,
        rgba(255, 255, 255, 0.95) 100%
    );
    z-index: 1;
}

.lon-category-card h3 {
    position: relative;
    z-index: 2;
    font-size: 1.75rem;
}
```

---

### 3. **PSICOLOGIA - Hero com Imagem**

**Problema:** Imagem `hero-bay.webp` não é adequada para psicologia
- Foto de praia não transmite contexto de saúde mental
- Overlay azul muito escuro (90%) esconde a imagem
- Badge branco translúcido com baixo contraste
- Título partido em 2 linhas arbitrariamente

**Solução:**
- Remover imagem de fundo OU usar imagem relevante (pessoa calma, espaço acolhedor)
- Usar gradiente sólido: `linear-gradient(135deg, #9BB1BC 0%, #537284 100%)`
- Simplificar hero sem imagem ou usar padrão abstrato

---

### 4. **PSICOLOGIA - Choice Cards**

**Problema:** Cards com imagens cortadas e overlay muito escuro
- Overlay preto 70% esconde as fotos
- `aspect-ratio: 4/3` corta rostos nas fotos
- Posicionamento do título na base dificulta leitura

**Solução:**
```css
.psi-choice-card {
    aspect-ratio: 1; /* Quadrado para melhor crop */
    border-radius: 20px;
}

.psi-choice-overlay {
    background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(0, 0, 0, 0.5) 100%
    );
}
```

---

### 5. **TIPOGRAFIA INCONSISTENTE**

**Problema:** Mistura de fontes sem sistema claro
- DM Sans (homepage)
- Open Sans (intro text)
- Font-sizes arbitrários (36px, 1.75rem, clamp...)
- Line-heights inconsistentes

**Solução - Sistema Tipográfico:**
```css
:root {
    /* Headline */
    --font-display: 'DM Sans', sans-serif;
    --h1: clamp(2.5rem, 5vw, 4rem);
    --h2: clamp(1.875rem, 4vw, 3rem);
    --h3: clamp(1.25rem, 2.5vw, 1.75rem);
    
    /* Body */
    --font-body: 'DM Sans', sans-serif;
    --body-lg: 1.125rem;
    --body: 1rem;
    --body-sm: 0.875rem;
    
    /* Line heights */
    --lh-tight: 1.2;
    --lh-normal: 1.5;
    --lh-relaxed: 1.7;
}
```

---

### 6. **ESPAÇAMENTO INCONSISTENTE**

**Problema:** Padding e margins sem padrão
- Seções com 80px, 48px, 60px aleatoriamente
- Cards com padding 32px, 24px, 40px
- Gaps em grids: 24px, 20px, 16px, 12px

**Solução - Sistema de Espaçamento:**
```css
:root {
    --space-xs: 8px;
    --space-sm: 16px;
    --space-md: 24px;
    --space-lg: 40px;
    --space-xl: 64px;
    --space-2xl: 96px;
}

.section {
    padding: var(--space-xl) 0;
}

@media (min-width: 768px) {
    .section {
        padding: var(--space-2xl) 0;
    }
}
```

---

### 7. **CORES SEM SISTEMA**

**Problema:** Paleta de cores descoordenada
- Azuis: #9BB1BC, #537284, #9BB1BC (repetido)
- Laranjas: #F09458, #ff6b35, #ff8c42
- Bege: #F3EDE5, #FFF8F0
- Verde, amarelo, vermelho nas páginas de especialidade

**Solução - Design Tokens:**
```css
:root {
    /* Brand */
    --brand-primary: #1e5e3f;
    --brand-accent: #F09458;
    
    /* Neutrals */
    --neutral-50: #F9FAFB;
    --neutral-100: #F3EDE5;
    --neutral-900: #1C1710;
    
    /* Specialty Colors */
    --color-psychology: #9BB1BC;
    --color-nutrition: #9FBD84;
    --color-medicine: #ECD281;
}
```

---

### 8. **NAVEGAÇÃO INCONSISTENTE**

**Problema:** Navbar diferente entre páginas
- Homepage: branco transparente que vira sólido
- Outras páginas: sólido desde início
- Logo muda de cor em algumas páginas
- Links com cores diferentes

**Solução:** Navbar único e consistente em todas as páginas

---

### 9. **BUTTONS/CTAs SEM HIERARQUIA**

**Problema:** Todos os botões parecem iguais
- `.lon-btn-dark`, `.psi-btn-primary`, `.psi-pill` - visualmente similares
- Falta distinção entre primary/secondary
- Hover states inconsistentes

**Solução:**
```css
/* Primary - Ação principal */
.btn-primary {
    background: var(--brand-accent);
    color: white;
    padding: 16px 32px;
    border-radius: 12px;
    font-weight: 600;
}

/* Secondary - Ação secundária */
.btn-secondary {
    background: transparent;
    border: 2px solid currentColor;
    color: var(--brand-primary);
}

/* Ghost - Ação terciária */
.btn-ghost {
    background: transparent;
    color: var(--brand-primary);
    text-decoration: underline;
}
```

---

### 10. **CARDS GENÉRICOS SEM IDENTIDADE**

**Problema:** Todos os cards usam mesmo estilo
- Borders 1px #e5e5e5
- Border-radius 16px sempre
- Box-shadow genérico
- Background branco plano

**Solução - Cards com Personalidade:**
```css
.card {
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
}

.card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    transform: translateY(-4px);
}

/* Variantes */
.card--elevated {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.card--bordered {
    border: 2px solid var(--neutral-100);
}

.card--gradient {
    background: linear-gradient(135deg, var(--color-start), var(--color-end));
}
```

---

## 📋 PLANO DE AÇÃO PRIORITÁRIO

### FASE 1: FIXES CRÍTICOS (Urgente)
1. ✅ Reduzir font-size do texto intro de 36px para 20-24px
2. ✅ Centralizar texto intro (remover padding-left 80px)
3. ✅ Reduzir overlay branco dos cards de 85% para 20-40%
4. ✅ Mudar aspect-ratio dos cards de 1:1 para 3:2
5. ✅ Substituir imagem hero-bay.webp por gradiente sólido na página psicologia

### FASE 2: SISTEMA DE DESIGN (Importante)
6. Implementar design tokens (cores, espaçamentos, tipografia)
7. Unificar navbar em todas as páginas
8. Criar sistema de botões com hierarquia clara
9. Padronizar cards com variantes consistentes

### FASE 3: REFINAMENTO (Desejável)
10. Adicionar micro-interações
11. Melhorar estados de hover/focus
12. Otimizar imagens e lazy loading
13. Adicionar skeleton loaders

---

## 🎨 MOCKUPS DE MELHORIAS

### Homepage - Texto Intro (Antes vs Depois)

**ANTES:**
```
[Texto gigante 36px]
[Muito espaço]
[Padding left 80px descentralizado]
```

**DEPOIS:**
```
[Texto 24px centralizado]
[Espaçamento harmonioso]
[Largura máxima 900px centrada]
```

### Cards de Categoria (Antes vs Depois)

**ANTES:**
- Cards quadrados pequenos
- Imagem 100% escondida por overlay branco
- Títulos genéricos

**DEPOIS:**
- Cards retangulares maiores (3:2)
- Imagem visível com gradiente inferior
- Títulos maiores, mais legíveis

---

## 📊 IMPACTO ESTIMADO

| Melhoria | Impacto UX | Dificuldade | Tempo |
|----------|-----------|-------------|-------|
| Texto intro | ⭐⭐⭐⭐⭐ | 🟢 Fácil | 5 min |
| Cards overlay | ⭐⭐⭐⭐⭐ | 🟢 Fácil | 10 min |
| Hero psicologia | ⭐⭐⭐⭐ | 🟢 Fácil | 10 min |
| Design tokens | ⭐⭐⭐⭐⭐ | 🟡 Médio | 30 min |
| Sistema botões | ⭐⭐⭐⭐ | 🟢 Fácil | 15 min |

---

**CONCLUSÃO:** O site tem boa estrutura mas execução visual inconsistente. Fixes rápidos na tipografia, overlay e espaçamento terão impacto imenso na percepção de qualidade.
