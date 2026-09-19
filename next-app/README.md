# LON Clinic — Migração Next.js

Migração incremental de HTML estático para **Next.js 16** com **React 19**, **TypeScript** e **Tailwind CSS v4**.

## ✅ Fase 1 Completa — Setup e Homepage

### O que foi criado

1. **Next.js App** (`/next-app`)
   - Server-side rendering (ótimo para SEO)
   - TypeScript
   - Tailwind CSS v4
   - Porta 3001 (não conflita com Express na 3000)

2. **UI Modules como Componentes React** (`/next-app/components/modules`)
   - `TestimonialVisual.tsx` — Testemunhos com avatar
   - `FeatureBlock.tsx` — Features com ícones
   - `PhotoCard.tsx` — Cards com foto e overlay
   - `HeroSplit.tsx` — Hero com imagem lado a lado
   - `NeedCard.tsx` — Cards de necessidades da homepage

3. **Homepage Migrada** (`/next-app/app/page.tsx`)
   - Componente React Server
   - Todas as secções: Hero, Needs, Badges, Testimonials, Why, Footer
   - SEO metadata completo no `layout.tsx`
   - Imagens otimizadas com `next/image`

4. **Design Tokens** (`/next-app/app/globals.css`)
   - Cores da brand (primary, text, bg, etc.)
   - Cores por especialidade (nutrição, psicologia, etc.)
   - Spacing scale
   - Border radius
   - Tudo em CSS variables

---

## 🚀 Como usar

### Rodar o Next.js (porta 3001)

```bash
cd next-app
npm run dev
```

Abre em: **http://localhost:3001**

### Rodar o Express (porta 3000)

```bash
node server.js
```

Abre em: **http://localhost:3000**

**Ambos podem rodar em paralelo!**

---

## 📐 Estrutura

```
next-app/
├── app/
│   ├── layout.tsx          → Root layout + SEO metadata
│   ├── page.tsx             → Homepage (Server Component)
│   └── globals.css          → Design tokens + Tailwind
│
├── components/
│   ├── modules/             → UI modules reutilizáveis
│   │   ├── TestimonialVisual.tsx
│   │   ├── FeatureBlock.tsx
│   │   ├── PhotoCard.tsx
│   │   ├── HeroSplit.tsx
│   │   └── NeedCard.tsx
│   └── layout/              → (Futuro: Nav, Footer)
│
└── public/
    └── image/               → Imagens copiadas de /image
```

---

## 🎨 Design Tokens (CSS Variables)

Todos disponíveis em `globals.css`:

```css
--primary: #F09458
--primary-dark: #e07d3e
--text: #1C1710
--text-muted: #64748b
--bg: #FFFFFF
--bg-alt: #F9F8F6
--border: #e2e8f0

/* Specialty Colors */
--nutricao-light: #9FBD84
--nutricao-dark: #3F574C
--psicologia-light: #9BB1BC
--psicologia-dark: #537284
--longevidade-light: #ECD281
--longevidade-dark: #CBB068
--urgente-light: #BD4f4F
--urgente-dark: #A5584E
--travel-light: #A794C9
--travel-dark: #405266

/* Spacing: xs, sm, md, lg, xl, 2xl */
/* Radius: sm, md, lg, xl */
```

---

## 🔄 Próximos Passos

### Fase 2 — Navegação e Layout Global

- [ ] Criar `<NavGlobal />` componente
- [ ] Criar `<Footer />` componente
- [ ] Adicionar ao `layout.tsx`

### Fase 3 — Pillar Pages

- [ ] `/psicologia` em Next.js
- [ ] `/nutricao` em Next.js
- [ ] `/longevidade` em Next.js
- [ ] `/urgent-care` em Next.js
- [ ] `/travel-clinic` em Next.js

### Fase 4 — Blog (279 artigos)

- [ ] `/blog/[slug]` route
- [ ] Ler markdown de `data/guide/articles/`
- [ ] Renderizar com MDX ou remark
- [ ] Aplicar SEO per-article

### Fase 5 — Cutover

- [ ] Deprecar HTML antigo
- [ ] Apontar todas as rotas para Next.js
- [ ] Deploy production

---

## 📊 Comparação: HTML vs Next.js

| Aspecto | HTML Atual | Next.js |
|---------|-----------|---------|
| **Rendering** | Client-side | Server-side (SSR/SSG) |
| **SEO** | Bom | Excelente |
| **Performance** | OK | Otimizado (Image, Font, etc.) |
| **Manutenção** | Duplicação de código | Componentes reutilizáveis |
| **Deploy** | Simple | Vercel / Node.js |
| **Hot Reload** | ❌ | ✅ |
| **TypeScript** | ❌ | ✅ |
| **Imagens** | Manual | Otimizadas automaticamente |

---

## 🛠️ Comandos Úteis

```bash
# Dev server
npm run dev

# Build para produção
npm run build

# Rodar produção
npm start

# Lint
npm run lint
```

---

## 📝 Notas Técnicas

- **Next.js 16.3.5** com Turbopack
- **React 19.2.8** (Server Components)
- **Tailwind CSS v4** (@tailwindcss/postcss)
- **TypeScript 5**
- **Image Optimization** via `next/image`
- **Font Optimization** via Google Fonts
- **SEO** via Metadata API

---

## ⚠️ Importante

- Express continua a servir o site atual na **porta 3000**
- Next.js roda na **porta 3001**
- Imagens são servidas de `/public/image` no Next.js
- Nenhuma rota foi quebrada no site atual

---

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [React Server Components](https://react.dev/reference/rsc/server-components)

---

**Status**: ✅ Fase 1 completa — Homepage funcional em Next.js  
**Próximo**: Criar navegação global e footer como componentes React
