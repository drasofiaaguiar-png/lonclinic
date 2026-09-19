# 🚀 Guia Rápido de Implementação - Melhorias SEO/AEO

## ✅ O Que JÁ ESTÁ FEITO

1. **Sitemap Dinâmico** - Funciona automaticamente em `/sitemap.xml`
2. **Structured Data** - Implementado em todos os artigos
3. **9 Artigos Novos** - Criados com internal linking estratégico
4. **CTAs Básicos** - Já existem nos artigos

## 🎯 O QUE FAZER AGORA (Por Ordem de Prioridade)

### PRIORIDADE 1: Adicionar CTAs Visuais (30 min)

**Passo 1**: Adicionar CSS ao site
```bash
# Opção A: Importar no CSS principal
# Adicionar ao início do ficheiro CSS principal:
@import url('cta-visual-styles.css');

# Opção B: Copiar conteúdo
# Copiar todo o conteúdo de cta-visual-styles.css para o CSS principal
```

**Passo 2**: Atualizar 1 artigo como teste
- Abrir `data/guide/articles/zepbound-portugal-existe-alternativa.md`
- Substituir 1-2 CTAs básicos existentes por CTAs visuais
- Usar exemplos do ficheiro `docs/cta-visual-guide.md`
- Testar no browser
- Se funcionar, replicar para os outros 8 artigos

**Tempo estimado**: 30 min (teste) + 2h (todos os 9 artigos)

---

### PRIORIDADE 2: Analisar Internal Linking (15 min)

**Executar script**:
```bash
cd c:\Users\User\Desktop\clinic
node scripts/analyze-internal-linking.js
```

**Ler output**:
- Verificar quantos artigos órfãos existem
- Identificar os 10 mais importantes
- Ler sugestões automáticas de links

**Tempo estimado**: 15 min

---

### PRIORIDADE 3: Corrigir Artigos Órfãos (2-4h)

**Para cada artigo órfão**:
1. Abrir o artigo órfão
2. Identificar 3-5 artigos relacionados (usar sugestões do script)
3. Abrir esses artigos relacionados
4. Adicionar 1-2 frases com link para o artigo órfão
5. Commit: `git commit -m "Add internal links to [slug]"`

**Exemplo prático**:

Se `resistencia-insulina-sintomas.md` é órfão, e o script sugere linkear de `diabetes-tipo-2.md`:

```markdown
# No artigo diabetes-tipo-2.md, adicionar:

A resistência à insulina é frequentemente um precursor da diabetes tipo 2. 
Saiba mais sobre [sintomas de resistência à insulina](/blog/resistencia-insulina-sintomas) 
para identificar sinais precoces.
```

**Tempo estimado**: 15 min por artigo órfão x 10 = 2.5h

---

### PRIORIDADE 4: Submeter Sitemap no GSC (5 min)

1. Ir a [Google Search Console](https://search.google.com/search-console)
2. Selecionar propriedade `lonclinic.com`
3. Menu lateral: **Sitemaps**
4. Adicionar novo sitemap: `https://www.lonclinic.com/sitemap.xml`
5. Clicar **Submeter**

**Tempo estimado**: 5 min

---

### PRIORIDADE 5: Criar 2-3 Hub Pages (4-6h)

**Hub Page 1**: Guia Completo GLP-1 Portugal

Criar ficheiro: `data/guide/articles/guia-completo-glp1-portugal.md`

```markdown
---
title: "Guia Completo de GLP-1 em Portugal: Mounjaro, Wegovy, Ozempic e Saxenda"
meta_description: "Tudo sobre medicamentos GLP-1 em Portugal: tipos disponíveis, onde obter, custos, eficácia, efeitos secundários e como escolher. Guia completo 2026."
slug: guia-completo-glp1-portugal
keyword: glp-1 portugal
author: lon-clinic
published: 2026-09-17
updated: 2026-09-17
section: nutrition
featured: true
---

# Guia Completo de GLP-1 em Portugal

[Introdução explicando o que são GLP-1, contexto em Portugal]

## Medicamentos GLP-1 Disponíveis em Portugal

### Mounjaro (Tirzepatida)
[Breve resumo]
- [Mounjaro Portugal: guia completo](/blog/mounjaro-portugal-guia-completo)
- [Zepbound vs Mounjaro: qual a diferença?](/blog/zepbound-portugal-existe-alternativa)
- [Como obter Mounjaro passo a passo](/blog/mounjaro-portugal-onde-como-obter-passo-passo)
- [Quais médicos receitam Mounjaro](/blog/quais-medicos-receitam-mounjaro-portugal)

### Wegovy (Semaglutida 2,4mg)
[Breve resumo]
- [Wegovy Portugal: disponibilidade](/blog/wegovy-portugal-disponibilidade)
- [Mounjaro vs Wegovy vs Ozempic](/blog/mounjaro-vs-wegovy-vs-ozempic-diferencas)

### Saxenda (Liraglutida)
[Breve resumo]
- [Saxenda Portugal: guia completo](/blog/saxenda-portugal-guia-completo)

### Ozempic (Semaglutida 1mg)
[Breve resumo]
- [Ozempic em Portugal: diabetes vs perda peso](/blog/ozempic-portugal-diabetes-vs-perda-peso)
- [Ozempic em não diabéticos: riscos e alertas Infarmed](/blog/ozempic-nao-diabeticos-riscos-alertas-infarmed)

## Como Escolher o Medicamento Certo
[Seção comparativa]
- [Medicamentos para obesidade em Portugal: guia completo](/blog/medicamentos-obesidade-portugal-tipos-custos-resultados)
- [Semaglutida vs Tirzepatida: diferença real](/blog/semaglutida-vs-tirzepatida-diferenca-real)

## Onde Obter e Custos
[Seção sobre prescrição, farmácias, custos]
- [Mounjaro sem receita: é legal?](/blog/mounjaro-sem-receita-portugal-legal-generico)
- [Melhor clínica de emagrecimento em Portugal](/blog/qual-melhor-clinica-emagrecimento-portugal)

## Segurança e Efeitos Secundários
[Seção sobre safety]
- [Efeitos secundários GLP-1](/blog/efeitos-secundarios-glp1-nauseas-obstipacao)
- [Contraindicações GLP-1](/blog/contraindicacoes-glp1-quem-nao-deve-tomar)
- [GLP-1 e gravidez](/blog/mounjaro-gravidez-contracecao)
- [GLP-1 e cirurgia](/blog/glp1-cirurgia-anestesia-parar-antes)

## Eficácia e Manutenção
[Seção sobre resultados]
- [Peso volta após interromper GLP-1?](/blog/glp1-peso-volta-depois-interromper-tratamento)
- [GLP-1 e perda de massa muscular](/blog/glp1-perda-massa-muscular-como-reduzir)

## Estudos e Evidências
[Seção científica]
- [Mounjaro e apneia do sono](/blog/mounjaro-apneia-sono-estudos)
- [Mounjaro reduz risco de AVC](/blog/mounjaro-reduz-risco-avc-estudos)

[CTAs visuais distribuídos]
[FAQs gerais sobre GLP-1]
```

**Hub Page 2**: Guia de Perda de Peso Sustentável

**Hub Page 3**: Guia de Clínicas e Serviços de Emagrecimento

**Tempo estimado**: 2h por hub page x 3 = 6h

---

## 📊 CHECKLIST DE 1 SEMANA

### Dia 1 (Hoje) - 1h
- [x] Ler `SEO-IMPROVEMENTS-SUMMARY.md`
- [ ] Adicionar `cta-visual-styles.css` ao site
- [ ] Testar 1 CTA visual num artigo
- [ ] Executar `analyze-internal-linking.js`

### Dia 2 - 3h
- [ ] Atualizar 9 artigos novos com CTAs visuais
- [ ] Submeter sitemap no GSC
- [ ] Identificar 10 artigos órfãos prioritários

### Dia 3 - 2h
- [ ] Corrigir 5 artigos órfãos (adicionar links)

### Dia 4 - 2h
- [ ] Corrigir 5 artigos órfãos restantes

### Dia 5 - 3h
- [ ] Criar Hub Page 1: Guia Completo GLP-1

### Dia 6 - Descanso ou revisão

### Dia 7 - 4h
- [ ] Criar Hub Page 2 e 3
- [ ] Verificar GSC para indexação

**Total**: ~15h de trabalho distribuído em 1 semana

---

## 🎯 MÉTRICAS PARA ACOMPANHAR

### Google Search Console (Verificar semanalmente)

**Cobertura**:
- Páginas indexadas: objetivo 100% dos 279 artigos
- Páginas com erros: 0
- Páginas excluídas: revisar motivos

**Links Internos**:
- Top pages por inbound links
- Páginas com 0-1 links internos (órfãos)

**Desempenho**:
- Impressões nos últimos 28 dias
- CTR médio (objetivo >3%)
- Posição média por query

**Sitemaps**:
- Sitemap processado: SIM
- Páginas descobertas via sitemap: 279

### Google Analytics (Verificar mensalmente)

- Tempo médio na página (objetivo >2 min)
- Bounce rate (objetivo <60%)
- Páginas por sessão (objetivo >2)

### Conversão (Verificar quinzenalmente)

- CTR dos CTAs visuais vs simples (A/B test)
- Taxa de marcação por fonte de tráfego
- Artigos que mais convertem

---

## 📞 SUPORTE

**Dúvidas sobre implementação?**
- Consultar `docs/cta-visual-guide.md` para exemplos de CTAs
- Consultar `docs/TEMPLATE-ARTIGO-SEO-AEO.md` para estrutura completa
- Consultar `SEO-IMPROVEMENTS-SUMMARY.md` para visão geral

**Problemas técnicos?**
- Verificar se `cta-visual-styles.css` está carregado (Inspect > Sources)
- Testar sitemap: `curl https://www.lonclinic.com/sitemap.xml`
- Verificar structured data: [Rich Results Test](https://search.google.com/test/rich-results)

---

## ✅ QUICK WINS (Menos de 1h cada)

1. **Submeter sitemap no GSC** (5 min)
2. **Adicionar 1 CTA visual de teste** (15 min)
3. **Executar análise de linking** (15 min)
4. **Corrigir 3 artigos órfãos** (45 min)
5. **Adicionar 10 links internos em artigos populares** (30 min)

Começar pelos Quick Wins para ver resultados rápidos! 🚀
