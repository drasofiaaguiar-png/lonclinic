# LON Clinic - Modern Design System V2

Cohesive, premium, minimal design system inspired by contemporary health & wellness brands.

## 🎨 Color Palette

### Neutrals (Mildly Grey)
Soft, stone-inspired grays for a premium, organic feel:
- **Gray 50-900**: Stone-based neutral scale
- **Text Primary**: `#1c1917` - Deep charcoal
- **Text Secondary**: `#57534e` - Medium stone
- **Text Tertiary**: `#78716c` - Soft stone
- **Text Muted**: `#a8a29e` - Light stone

### Brand (Warm & Earthy)
- **Primary**: `#d97757` - Terracotta (warm, inviting)
- **Primary Light**: `#e89b7d` - Soft terracotta
- **Primary Dark**: `#c56647` - Deep terracotta

### Specialty Colors (Soft & Muted)
- **Green Soft**: `#9FBD84` - Sage green (Nutrition)
- **Blue Soft**: `#8FA8B3` - Slate blue (Psychology)
- **Beige Soft**: `#D4B896` - Warm beige (Medicine)

### Backgrounds (Layered)
- **Base**: `#ffffff` - Pure white
- **Soft**: `#fafaf9` - Off-white
- **Muted**: `#f5f5f4` - Light stone

## ✍️ Typography

### Font Family
`'Inter'` - Modern, clean, highly legible

### Font Features
- Optical sizing enabled
- CV ligatures active (02, 03, 04, 11)
- Antialiasing optimized

### Scale
- **H1**: 2.5rem → 5.5rem (800 weight)
- **H2**: 2rem → 4rem (700 weight)
- **H3**: 1.5rem → 2.5rem (600 weight)
- **Body**: 1rem (400 weight)
- **Lead**: 1.125rem
- **Small**: 0.875rem

### Letter Spacing
Tighter tracking for modern aesthetic:
- H1: `-0.035em`
- H2: `-0.03em`
- H3: `-0.02em`

## 🧱 Components

### Buttons
**Primary**:
- Background: Terracotta (`var(--primary)`)
- Soft shadow
- Hover: slight lift + deeper shadow

**Secondary**:
- Background: White
- Border: Light gray
- Hover: subtle gray background

### Cards
- Border radius: `2rem` (organic, soft)
- Shadow: Multi-layer subtle shadows
- Hover: Lift + shadow increase

### Glassmorphism
- Background: `rgba(255, 255, 255, 0.85)`
- Backdrop blur: `24px`
- Subtle border

## 📐 Spacing & Sizing

### Spacing Scale
CSS custom properties:
- `--space-xs` → `--space-2xl`

### Border Radius
Organic, smooth corners:
- Cards: `2rem`
- Buttons: `624.9375rem` (full round)
- Small elements: `1rem`

## 🎭 Shadows

### Soft & Natural
Inspired by organic materials:
- **Light**: `0 1px 3px rgba(0,0,0,0.05)`
- **Medium**: `0 4px 12px rgba(0,0,0,0.06)`
- **Premium**: `0 12px 40px rgba(0,0,0,0.08)`

## 🌈 Section Backgrounds

### Alternating Soft Tones
For visual rhythm and hierarchy:
- `.bg-green-soft`: `#f0f4ec` (Nutrition sections)
- `.bg-blue-soft`: `#eef2f5` (Psychology sections)
- `.bg-beige-soft`: `#f7f3ed` (Medicine sections)
- `.bg-warm-soft`: `#faf8f5` (General sections)

## 🎯 Design Principles

1. **Cohesive**: Unified color language across all sections
2. **Muted**: Soft, earthy tones instead of vibrant primaries
3. **Organic**: Smooth curves, natural shadows
4. **Premium**: Attention to detail, refined spacing
5. **Modern**: Clean typography, minimal aesthetic
6. **Accessible**: High contrast, readable text

## 📱 Responsive

- Mobile-first approach
- Container max-width: `1400px`
- Fluid typography using `clamp()`
- Responsive padding and spacing

---

**Version**: 2.0  
**Last Updated**: September 2026
