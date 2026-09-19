# UI Modules System — LON Clinic

Sistema modular de UI inspirado em design patterns modernos de health & wellness (Beasty, etc.). Focado em fotografia real, espaçamento generoso, e layouts limpos.

## Princípios

1. **Fotografia Real**: Sempre que possível, usar fotos reais de pessoas (não ilustrações)
2. **Espaçamento Generoso**: Respirar bem entre elementos
3. **Cantos Arredondados**: Border-radius consistente em todos os módulos
4. **Sombras Subtis**: Usar shadows para dar profundidade
5. **Tipografia Limpa**: Inter font, hierarquia clara
6. **Mobile First**: Todos os módulos são responsivos por padrão

## Módulos Disponíveis

### 1. Photo Card
**Uso**: Cards grandes com foto e texto sobreposto (hero cards, feature showcases)

```html
<div class="module-photo-card">
    <img src="/image/example.webp" alt="Description">
    <div class="module-photo-card-overlay">
        <h3 class="module-photo-card-title">Title Here</h3>
        <p class="module-photo-card-subtitle">Subtitle text</p>
    </div>
</div>
```

**Onde usar**:
- Hero sections
- Feature showcases
- Category cards

---

### 2. Transformation Card
**Uso**: Testemunhos visuais com foto + métricas (before/after style)

```html
<div class="module-transformation">
    <div class="module-transformation-photo">
        <img src="/image/person.webp" alt="Patient transformation">
    </div>
    <div class="module-transformation-metrics">
        <div class="module-transformation-metric">
            <span class="module-transformation-metric-value">-12kg</span>
            <span class="module-transformation-metric-label">Lost</span>
        </div>
        <div class="module-transformation-metric">
            <span class="module-transformation-metric-value">3 meses</span>
            <span class="module-transformation-metric-label">Duração</span>
        </div>
    </div>
    <blockquote class="module-transformation-quote">
        "Quote from the patient about their journey"
    </blockquote>
    <cite class="module-transformation-author">Patient Name</cite>
</div>
```

**Onde usar**:
- Testemunhos visuais
- Resultados de programas
- Case studies
- Páginas de nutrição/emagrecimento

---

### 3. Product Showcase
**Uso**: Display de produtos/serviços com imagem clean

```html
<div class="module-product">
    <div class="module-product-image">
        <img src="/image/service.webp" alt="Service">
    </div>
    <div class="module-product-content">
        <span class="module-product-tag">Featured</span>
        <h3 class="module-product-title">Service Name</h3>
        <p class="module-product-description">Brief description of the service</p>
        <a href="/link" class="module-product-cta">Learn more →</a>
    </div>
</div>
```

**Onde usar**:
- Grids de serviços
- Programas em destaque
- Product pages

---

### 4. Testimonial with Photo
**Uso**: Testemunho com avatar + quote (mais compacto que transformation)

```html
<div class="module-testimonial-visual">
    <div class="module-testimonial-avatar">
        <img src="/image/avatar.webp" alt="Patient">
    </div>
    <div class="module-testimonial-content">
        <div class="module-testimonial-stars">★★★★★</div>
        <p class="module-testimonial-text">"The testimonial quote goes here."</p>
        <p class="module-testimonial-author">Patient Name</p>
        <p class="module-testimonial-role">Via Trustpilot</p>
    </div>
</div>
```

**Onde usar**:
- Grids de testemunhos (homepage, pillar pages)
- Prova social sections
- Trustpilot reviews

---

### 5. Image Grid
**Uso**: Grid de imagens com hover effect

```html
<div class="module-image-grid">
    <div class="module-image-grid-item">
        <img src="/image/1.webp" alt="">
    </div>
    <div class="module-image-grid-item">
        <img src="/image/2.webp" alt="">
    </div>
    <!-- more items -->
</div>
```

**Onde usar**:
- Galleries
- Team photos
- Portfolio showcases

---

### 6. Stat Card
**Uso**: Métricas grandes com número + label

```html
<div class="module-stat-card">
    <span class="module-stat-value">5.000+</span>
    <p class="module-stat-label">Consultas realizadas</p>
</div>
```

**Onde usar**:
- About pages
- Trust indicators
- Results sections

---

### 7. Feature Block
**Uso**: Icon + título + descrição (substituiu os numbered points)

```html
<div class="module-feature">
    <div class="module-feature-icon">✓</div>
    <h3 class="module-feature-title">Feature Title</h3>
    <p class="module-feature-description">Description of the feature</p>
</div>
```

**Onde usar**:
- "Why choose us" sections
- Feature lists
- Benefits grids

---

### 8. Hero Split
**Uso**: Hero full-width com conteúdo + imagem lado a lado

```html
<div class="module-hero-split">
    <div class="module-hero-content">
        <p class="module-hero-eyebrow">Tagline</p>
        <h1 class="module-hero-title">Main Headline</h1>
        <p class="module-hero-subtitle">Supporting text</p>
        <div class="module-hero-actions">
            <a href="#" class="home-btn home-btn-primary">Primary CTA</a>
            <a href="#" class="home-btn home-btn-secondary">Secondary</a>
        </div>
    </div>
    <div class="module-hero-image">
        <img src="/image/hero.webp" alt="">
    </div>
</div>
```

**Onde usar**:
- Landing pages
- Pillar page heroes (alternativa ao hero atual)

---

## CSS Variables

Todos os módulos usam o mesmo sistema de design tokens:

```css
--space-xs: 8px
--space-sm: 16px
--space-md: 24px
--space-lg: 40px
--space-xl: 64px
--space-2xl: 96px

--radius-sm: 8px
--radius-md: 16px
--radius-lg: 24px
--radius-xl: 32px

--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04)
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08)
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12)
```

## Implementação por Página

### Homepage ✅
- Hero: split com imagem
- Need cards: imagens reais
- Testimonials: module-testimonial-visual
- Features: module-feature

### Pillar Pages (próximos)
- Hero: module-hero-split ou module-photo-card
- Como funciona: module-feature
- Testemunhos: module-testimonial-visual
- Resultados: module-transformation (nutrição/psicologia)

### Blog Articles ✅
- CTAs: já implementado (guide-cta-visual)
- Social proof: grid de testemunhos

---

## Best Practices

1. **Sempre usar imagens reais** da pasta `/image/`
2. **Sempre incluir alt text** descritivo
3. **Usar lazy loading** para imagens abaixo do fold
4. **Manter consistência** de border-radius (lg para cards, md para fotos internas)
5. **Espaçamento**: usar sempre os tokens (--space-lg, etc.)
6. **Mobile first**: testar sempre em mobile primeiro

## Próximos Passos

1. ✅ Homepage atualizada com modules
2. ⏳ Atualizar pillar pages (psicologia, nutrição, longevidade, urgent care)
3. ⏳ Criar exemplos de transformation cards para nutrição
4. ⏳ Adicionar mais fotos reais à pasta /image/
5. ⏳ Criar página de demonstração de todos os módulos

---

**Ficheiro CSS**: `ui-modules.css`  
**Versão**: 2026-09-19  
**Link**: Incluir em todas as páginas: `<link rel="stylesheet" href="/ui-modules.css?v=20260919">`
