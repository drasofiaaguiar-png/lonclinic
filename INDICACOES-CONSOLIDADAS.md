# LON Clinic — Indicações consolidadas

Resumo de tudo o que foi definido nas últimas conversas, para orientar implementação.

## 1. Arquitetura do site — 6 páginas pilar

Reduzido de 88 páginas principais para **6 páginas de conteúdo pilar** + infraestrutura funcional:

1. **Homepage**
2. **Medicina de Longevidade** (em vez de "clínica geral" — diferenciação deliberada da healion)
3. **Medicina do Viajante**
4. **Tourist Clinic** (distinta de Viajante: público turista/visita pontual, alimentada pelas 12 páginas internacionais em 4 línguas)
5. **Psicologia** (burnout, ansiedade no trabalho, ataques de pânico, terapia de casal vivem como secções/âncoras dentro desta página, não como rotas próprias)
6. **Nutrição** (Programa Integrado, fase inicial/manutenção, emagrecimento, pós-parto, diabetes tipo 2 como secções)

**Em aberto**: onde fica o **Programa Integrado** (490€, médico+nutrição+psicologia) — secção dentro de Nutrição (como já escrito) ou página própria por ser o produto mais diferenciador?

---

## 2. Quizzes como porta de entrada do funil

Os testes (Burnout, Big Five, testes de nutrição) deixam de ser conteúdo secundário dentro das páginas pilar e passam a **topo de funil**:

```
Quiz → Resultado personalizado → Página pilar correspondente → CTA de marcação
```

- **Teste de Burnout** → Psicologia
- **Testes de nutrição** → Nutrição
- **Big Five** → destino a confirmar (personalidade não é sintoma; pode ser mais conteúdo viral do que conversão direta)

A `/triagem` deixa de ser um passo clínico separado — **funde-se com o sistema de quizzes**.

**Consequência para o Instagram**: os posts do pilar "Educação" devem terminar com CTA para o quiz relevante, não diretamente para "marcar consulta" — reduz o salto de compromisso.

---

## 3. Fluxo de marcação (simplificado vs. healion)

**A healion usa**: 
```
CTA → questionário de pesquisa → marketplace com filtros → perfil do médico → calendário → conta
```

**A LON não precisa do passo de marketplace** porque não há escolha entre vários profissionais intercambiáveis — cada especialidade tem uma equipa curada.

**Fluxo LON**: 
```
Página pilar → CTA "Marcar consulta" → Calendário direto → Escolher hora → Criar conta (só no fim, como a healion faz)
```

**Um passo a menos que a healion**, mantendo o princípio certo deles (conta pedida depois da escolha, não antes).

⚠️ **Prioridade técnica**: consolidar as 7 rotas de marcação duplicadas (`/marcar`, `/marcar.html`, `/book-consultation`, `/book.html`, etc.) numa só rota canónica — provável causa do 0% de conversão diagnosticado.

---

## 4. Mapa de páginas — redirects a implementar

Documento completo já publicado: consolidação de 88 → 55 páginas técnicas (antes desta última simplificação para 6 pilares). 

**Regra geral**: toda rota `.html` redireciona (301) para a rota limpa equivalente. 

Ver ficheiro **"LON Clinic — mapa final de páginas (limpo)"**.

---

## 5. Sistema de cor da marca

**Cores reais extraídas do site** (não inventadas):
- Verde escuro: `#1F3D2B`
- Terracota: `#C97A54`
- Creme: `#F0ECE1`

### Decisão: cor fixa por valência, sem sobreposição

| Valência | Cor |
|---|---|
| **Nutrição** | Terracota |
| **Psicologia** | Teal (nova, oficializada como parte da paleta) |
| **Emagrecimento** | Verde escuro |
| **Médico geral / Longevidade + Medicina do Viajante** | Creme |
| **Testemunhos/prova social** | Tom neutro (branco/creme), transversal a todas as valências, não herda cor de especialidade |

**Fotografias reais** (não só cartões tipográficos): aplicar **duotone/overlay na cor da valência** para manter coerência no grid, em vez de usar a foto "crua".

**Decisão explícita tomada**: não adotar paleta fluorescente tipo healion — o posicionamento de longevidade/continuidade pede tons naturais e sérios, não urgência/conveniência.

---

## 6. Calendário de conteúdo Instagram — 40 posts

Publicado em tabela: **10 semanas, 4 posts/semana**, pilares (prova social, educação, preço/CTA, credibilidade, B2B/podcast) cruzados com as valências. 

Ver ficheiro **"LON Clinic — legendas para 40 posts"**.

**Regra de ordenação no grid**: nunca mais de 3-4 posts de preço seguidos sem intercalar prova social/educação — as primeiras 6-9 posições do perfil são as que mais pesam na decisão de seguir.

---

## 7. Preços confirmados

| Serviço | Preço | Observações |
|---|---|---|
| **Médico geral / Longevidade** | 39€/consulta | — |
| **Nutrição** | 45€/consulta, sempre | Só a cadência muda (quinzenal → mensal, decisão conjunta paciente+nutricionista, não escolha inicial) |
| **Psicologia individual** | 56€/consulta | 1x/semana |
| **Terapia de casal** | 260€/mês (4 sessões) ou 75€ avulsa | — |
| **Programa Integrado (6 meses)** | 490€ | Inclui: 1 avaliação médica inicial, reavaliação de exames, 6 consultas de nutrição quinzenais (3 primeiros meses) + 3 mensais (3 meses seguintes), 1 reavaliação médica aos 6 meses, extensão possível conforme evolução, add-on de psicologia opcional a 56€/semana |

⚠️ **Verificação pendente**: preço à peça dos componentes do Programa Integrado soma ~483€, muito próximo dos 490€ — vale a pena decidir se o pacote deve ficar mais vantajoso no preço ou se o valor está noutro lado (conveniência, extensão incluída).

---

## 8. Regras de conteúdo/copy

1. **Tratamento por "você"**, não "tu", em todo o conteúdo público
2. **Nunca atribuir decisões de prescrição/suplementação à nutricionista** — essa decisão é sempre médica, com base em estudo individual
3. Ao referir profissionais em FAQ genérico, usar **"o profissional"** em vez de nomear a especialidade específica quando o contexto for transversal

---

## 9. Conteúdo já escrito (pronto a usar)

- ✅ Página completa de **Nutrição** (hero, como funciona, preços, prova social, FAQ, nudge para Programa Integrado, CTA final)
- ✅ Tabela de **40 legendas de Instagram**

---

## 10. Por escrever, mesmo formato

- ⏳ **Medicina de Longevidade**
- ⏳ **Medicina do Viajante**
- ⏳ **Tourist Clinic**
- ⏳ **Psicologia** (com burnout, ansiedade, pânico, casal como secções)

---

**Data**: Setembro 19, 2026  
**Status**: Documento de referência estratégica — orientar toda implementação futura
