# CTAs Visuais para Artigos - Guia de Implementação

Este documento contém exemplos de CTAs visuais apelat

ivos para intercalar no conteúdo dos artigos do blog.

## 1. CTA Visual com Imagem (Recomendado)

### Exemplo 1: Consulta de Nutrição com GLP-1

```html
<div class="guide-cta-visual">
    <div class="guide-cta-visual-image">
        <img src="/image/nutricao-consulta.webp" alt="Consulta de nutrição para perda de peso" width="600" height="400" loading="lazy">
    </div>
    <div class="guide-cta-visual-content">
        <span class="guide-cta-visual-badge">Acompanhamento Integrado</span>
        <h3>Programa de Emagrecimento com Mounjaro</h3>
        <p>Avaliação clínica completa, prescrição quando indicado e acompanhamento médico + nutricional integrado.</p>
        <ul class="guide-cta-visual-features">
            <li>Consulta médica + nutricional na mesma sessão</li>
            <li>Prescrição Mounjaro quando clinicamente indicado</li>
            <li>Plano alimentar personalizado</li>
            <li>Acompanhamento contínuo incluído</li>
        </ul>
        <a href="/marcar" class="guide-cta-visual-button">Marcar consulta</a>
    </div>
</div>
```

### Exemplo 2: Avaliação Clínica (Imagem à direita)

```html
<div class="guide-cta-visual image-right">
    <div class="guide-cta-visual-image">
        <img src="/image/consulta-clinica-geral.webp" alt="Avaliação clínica para perda de peso" width="600" height="400" loading="lazy">
    </div>
    <div class="guide-cta-visual-content">
        <span class="guide-cta-visual-badge">Consulta Inicial</span>
        <h3>Avaliação Personalizada de Emagrecimento</h3>
        <p>Não sabe qual a melhor estratégia para o seu caso? Consulta médica + nutricional integrada identifica a abordagem ideal.</p>
        <ul class="guide-cta-visual-features">
            <li>Avaliação IMC e composição corporal</li>
            <li>Análise histórico e comorbilidades</li>
            <li>Discussão GLP-1 vs plano alimentar</li>
            <li>Decisão conjunta transparente</li>
        </ul>
        <a href="/marcar" class="guide-cta-visual-button">Agendar avaliação</a>
    </div>
</div>
```

## 2. CTA Compacto com Ícone (Para meio do artigo)

### Exemplo 1: Dúvidas Rápidas

```html
<div class="guide-cta-compact">
    <span class="guide-cta-compact-icon">💬</span>
    <div class="guide-cta-compact-content">
        <h4>Ainda tem dúvidas sobre Mounjaro?</h4>
        <p>Fale com um médico especializado. Esclarecemos todas as suas questões numa consulta sem compromisso.</p>
    </div>
    <a href="/marcar" class="guide-cta-compact-button">Falar com médico</a>
</div>
```

### Exemplo 2: Urgente/Prioritário

```html
<div class="guide-cta-compact guide-cta-urgent">
    <span class="guide-cta-compact-icon">⚡</span>
    <div class="guide-cta-compact-content">
        <h4>Consultas disponíveis esta semana</h4>
        <p>Vagas limitadas para avaliação médica + nutricional. Reserve o seu horário hoje.</p>
    </div>
    <a href="/marcar" class="guide-cta-compact-button">Ver horários</a>
</div>
```

### Exemplo 3: Recursos Gratuitos

```html
<div class="guide-cta-compact">
    <span class="guide-cta-compact-icon">📋</span>
    <div class="guide-cta-compact-content">
        <h4>Guia completo de medicamentos para obesidade</h4>
        <p>Compare Mounjaro, Wegovy, Saxenda, Mysimba e Orlistato num único artigo detalhado.</p>
    </div>
    <a href="/blog/medicamentos-obesidade-portugal-tipos-custos-resultados" class="guide-cta-compact-button">Ler guia</a>
</div>
```

## 3. CTA Card Simples (Já existente, melhorado)

```html
<div class="guide-cta-card">
    <div class="guide-cta-card-content">
        <h3>Consulta de medicina e nutrição integrada</h3>
        <p>Não sabe se Mounjaro é indicado para si? Avaliação clínica completa com médico + nutricionista. Prescrição personalizada quando indicado.</p>
        <a href="/marcar" class="guide-cta-button">Agendar avaliação</a>
    </div>
</div>
```

## Onde Colocar os CTAs

### Estratégia de Posicionamento

1. **Início do artigo (após introdução)**: CTA Visual com imagem
2. **Meio do artigo (após seção principal)**: CTA Compacto ou Card
3. **Final do artigo (antes das FAQs)**: CTA Visual com imagem
4. **Após FAQs importantes**: CTA Compacto

### Exemplo de Estrutura de Artigo

```markdown
# Título do Artigo

<aside class="guide-keyfacts">
...
</aside>

Introdução do artigo...

<figure class="guide-figure">
...
</figure>

## Primeira seção importante

Conteúdo...

<!-- CTA VISUAL 1 - Após introdução -->
<div class="guide-cta-visual">
...
</div>

## Segunda seção

Conteúdo...

<!-- CTA COMPACTO - Meio do artigo -->
<div class="guide-cta-compact">
...
</div>

## Terceira seção

Conteúdo...

<!-- CTA VISUAL 2 - Antes das FAQs -->
<div class="guide-cta-visual image-right">
...
</div>

## Perguntas frequentes

...
```

## Ícones Disponíveis (Emojis)

- 💬 Conversa/Dúvidas
- ⚡ Urgente/Rápido
- 📋 Guia/Documento
- 🎯 Objetivo/Meta
- 💊 Medicamento
- 🏥 Médico/Clínica
- 📞 Contacto
- ✓ Verificado/Aprovado
- 🔬 Ciência/Estudo
- 📊 Análise/Avaliação

## Variações de Badge

```html
<!-- Verde - Recomendado -->
<span class="guide-cta-visual-badge">Acompanhamento Integrado</span>

<!-- Pode adicionar mais variações com CSS inline -->
<span class="guide-cta-visual-badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">Consulta Inicial</span>

<span class="guide-cta-visual-badge" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">Programa Completo</span>
```

## Imagens Disponíveis para CTAs

- `/image/nutricao-consulta.webp` - Consulta de nutrição
- `/image/consulta-clinica-geral.webp` - Consulta médica
- `/image/consulta-telemedicina.webp` - Telemedicina
- `/image/consulta-telemedicina-mesa.webp` - Telemedicina desktop
- `/image/consulta-urgente.webp` - Consulta urgente
- `/image/nutricao-emagrecimento.webp` - Emagrecimento
- `/image/nutricao-alimentos.webp` - Alimentação

## Regras de Ouro

1. **Máximo 3 CTAs por artigo** - Não sobrecarregar
2. **Varia o tipo de CTA** - Visual + Compacto + Card
3. **Personaliza a mensagem** - Adapta ao contexto do artigo
4. **Usa verbos de ação** - "Marcar", "Agendar", "Começar", "Falar"
5. **Mantém consistência** - Mesmo estilo em artigos relacionados
