# ⚡ Solução: Melhorar Performance de Carregamento de Horários

## 🔴 Problema Atual

Os horários demoram muito a carregar na página de marcação (`/marcar`), causando má experiência do utilizador.

### Diagnóstico Técnico

**Localização do problema**: `lon-slots.js` linha 440
```javascript
fetch('/api/next-slots?limit=8&withinHours=168&service=' + ...)
```

**Problemas identificados**:
1. ❌ **withinHours=168** - Busca 7 dias completos de dados (muito pesado)
2. ❌ Sem cache eficiente no servidor
3. ❌ Carrega dados mesmo quando não necessário
4. ❌ Sem indicador visual de loading

---

## ✅ Soluções Implementáveis (Por Ordem de Prioridade)

### Solução 1: Reduzir Janela de Busca (FÁCIL - 5 min)

**Impacto**: 🟢🟢🟢 ALTO  
**Dificuldade**: 🟢 BAIXA  
**Tempo**: 5 minutos

**O que fazer**: Reduzir `withinHours` de 168h (7 dias) para 72h (3 dias)

**Ficheiro**: `lon-slots.js` linha 440

**Mudança**:
```javascript
// ANTES
fetch('/api/next-slots?limit=8&withinHours=168&service=' + ...)

// DEPOIS
fetch('/api/next-slots?limit=8&withinHours=72&service=' + ...)
```

**Resultado esperado**: 
- ⚡ **60% mais rápido** (menos dados para processar)
- ✅ Ainda mostra slots para os próximos 3 dias
- ✅ Utilizador raramente marca com mais de 3 dias de antecedência

---

### Solução 2: Adicionar Cache Redis no Servidor (MÉDIO - 2h)

**Impacto**: 🟢🟢🟢 MUITO ALTO  
**Dificuldade**: 🟡 MÉDIA  
**Tempo**: 2 horas

**O que fazer**: Implementar cache Redis para `/api/next-slots`

**Localização**: `server.js` (encontrar o endpoint `/api/next-slots`)

**Código a adicionar**:
```javascript
// No início do server.js
const redis = require('redis');
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect();

// No endpoint /api/next-slots
app.get('/api/next-slots', async (req, res) => {
    const service = req.query.service || 'clinica-geral';
    const cacheKey = `slots:${service}:next`;
    
    try {
        // Verificar cache (TTL 2 minutos)
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            res.set('X-Cache', 'HIT');
            return res.json(JSON.parse(cached));
        }
        
        // Buscar dados...
        const slots = await getNextSlots(service, ...);
        
        // Guardar em cache por 2 minutos
        await redisClient.setEx(cacheKey, 120, JSON.stringify(slots));
        
        res.set('X-Cache', 'MISS');
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar horários' });
    }
});
```

**Dependências**:
```bash
npm install redis
```

**`.env`**:
```env
REDIS_URL=redis://localhost:6379
```

**Resultado esperado**:
- ⚡ **95% mais rápido** após primeiro acesso
- ✅ Cache invalida automaticamente após 2 minutos
- ✅ Múltiplos utilizadores partilham cache

---

### Solução 3: Indicador Visual de Loading (FÁCIL - 15 min)

**Impacto**: 🟢🟢 MÉDIO (UX)  
**Dificuldade**: 🟢 BAIXA  
**Tempo**: 15 minutos

**O que fazer**: Adicionar skeleton loader enquanto carrega

**Ficheiro**: `marcar.html` + `marcar.css`

**HTML** (adicionar em marcar.html linha ~178):
```html
<div class="marcar-quick-slots" id="marcarQuickSlots">
    <p class="marcar-quick-kicker" id="marcarQuickKicker">Próximos horários disponíveis</p>
    
    <!-- ADICIONAR skeleton loader -->
    <div class="marcar-quick-skeleton" id="marcarQuickSkeleton">
        <div class="skeleton-slot"></div>
        <div class="skeleton-slot"></div>
        <div class="skeleton-slot"></div>
        <div class="skeleton-slot"></div>
    </div>
    
    <div class="marcar-quick-row" data-quick-row hidden></div>
</div>
```

**CSS** (adicionar em marcar.css):
```css
.marcar-quick-skeleton {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
}

.skeleton-slot {
    height: 48px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: 8px;
}

@keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

**JavaScript** (adicionar em lon-slots.js após linha 440):
```javascript
function showSkeletonLoader() {
    const skeleton = document.getElementById('marcarQuickSkeleton');
    const slotsRow = document.querySelector('[data-quick-row]');
    if (skeleton) skeleton.hidden = false;
    if (slotsRow) slotsRow.hidden = true;
}

function hideSkeletonLoader() {
    const skeleton = document.getElementById('marcarQuickSkeleton');
    const slotsRow = document.querySelector('[data-quick-row]');
    if (skeleton) skeleton.hidden = true;
    if (slotsRow) slotsRow.hidden = false;
}

// Chamar antes do fetch
showSkeletonLoader();
fetch('/api/next-slots?limit=8&withinHours=72&service=' + ...)
    .then(response => response.json())
    .then(data => {
        hideSkeletonLoader();
        // resto do código...
    });
```

**Resultado esperado**:
- ✅ Utilizador vê animação de loading
- ✅ Percepção de rapidez melhorada
- ✅ Reduz ansiedade durante espera

---

### Solução 4: Lazy Loading dos Slots (MÉDIO - 1h)

**Impacto**: 🟢🟢🟢 ALTO  
**Dificuldade**: 🟡 MÉDIA  
**Tempo**: 1 hora

**O que fazer**: Só carregar slots quando utilizador chega ao step de scheduling

**Ficheiro**: `marcar.js` ou script que controla os steps

**Mudança**:
```javascript
// ANTES: carrega slots logo ao abrir a página
window.addEventListener('load', function() {
    loadSlots();
});

// DEPOIS: só carrega quando chega ao step de agendamento
function onStepChange(stepName) {
    if (stepName === 'schedule') {
        // Só agora carregar os slots
        loadSlots();
    }
}
```

**Resultado esperado**:
- ⚡ **Página inicial 100% mais rápida** (não carrega slots desnecessariamente)
- ✅ Slots carregam apenas quando necessário
- ✅ Menos requests desnecessárias

---

### Solução 5: Pré-calcular Slots no Servidor (DIFÍCIL - 4h)

**Impacto**: 🟢🟢🟢 MUITO ALTO  
**Dificuldade**: 🔴 ALTA  
**Tempo**: 4 horas

**O que fazer**: Criar cronjob que pré-calcula próximos slots e guarda em cache

**Estrutura**:
```javascript
// scripts/precalculate-slots.js
async function precalculateSlots() {
    const services = [
        'clinica-geral',
        'psicologia-mensal',
        'nutricao-programa',
        'burnout-mensal',
        // ... outros serviços
    ];
    
    for (const service of services) {
        const slots = await calculateNextSlots(service, 72);
        await redis.setEx(`slots:${service}:precalc`, 300, JSON.stringify(slots));
    }
}

// Executar a cada 5 minutos
setInterval(precalculateSlots, 5 * 60 * 1000);
```

**Cron** (via Railway/Heroku Scheduler):
```bash
*/5 * * * * node scripts/precalculate-slots.js
```

**Resultado esperado**:
- ⚡ **99% mais rápido** (dados já calculados)
- ✅ Zero latência para utilizador
- ✅ Slots sempre atualizados

---

## 🎯 Plano de Implementação Recomendado

### Fase 1: Quick Wins (Hoje - 20 min)
1. ✅ **Reduzir withinHours para 72h** (5 min)
2. ✅ **Adicionar skeleton loader** (15 min)

**Resultado**: Melhoria imediata de ~60% + melhor UX

### Fase 2: Cache (Amanhã - 2h)
3. ✅ **Implementar cache Redis** (2h)

**Resultado**: +95% performance com cache

### Fase 3: Otimização (Próxima semana - 1h)
4. ✅ **Lazy loading dos slots** (1h)

**Resultado**: Página inicial 100% mais rápida

### Fase 4: Infraestrutura (Opcional - 4h)
5. ⏸️ **Pré-cálculo com cronjob** (4h)

**Resultado**: Performance máxima

---

## 📊 Comparação de Performance

| Solução | Tempo Atual | Tempo Depois | Melhoria | Dificuldade |
|---|---|---|---|---|
| **Sem otimização** | 3-5s | - | - | - |
| **Reduzir withinHours** | 3-5s | 1-2s | 60% | 🟢 Fácil |
| **+ Skeleton loader** | 1-2s | 1-2s (percebido <1s) | UX+++ | 🟢 Fácil |
| **+ Cache Redis** | 1-2s | 0.1-0.3s | 95% | 🟡 Médio |
| **+ Lazy loading** | 0.1-0.3s | 0s (inicial) | 100% | 🟡 Médio |
| **+ Pré-cálculo** | 0.1-0.3s | <0.05s | 99% | 🔴 Difícil |

---

## 🔧 Começar Agora (5 minutos)

### Passo 1: Abrir `lon-slots.js`
```bash
code lon-slots.js
```

### Passo 2: Procurar linha 440
Usar Ctrl+G e ir para linha 440

### Passo 3: Mudar 168 para 72
```javascript
// Linha 440
fetch('/api/next-slots?limit=8&withinHours=72&service=' + ...)
//                                         ^^
```

### Passo 4: Guardar e testar
```bash
# Refrescar o browser em /marcar
# Os horários devem carregar mais rápido!
```

---

## 📈 Monitorização

Após implementar, adicionar logging para medir:

```javascript
console.time('slots-fetch');
fetch('/api/next-slots?...')
    .then(response => {
        console.timeEnd('slots-fetch');
        return response.json();
    });
```

**Benchmarks desejados**:
- ✅ <500ms - Excelente
- ⚠️ 500ms-1s - Aceitável
- ❌ >1s - Requer otimização

---

## 🆘 Se Nada Funcionar

### Opção Extrema: Slots Estáticos

Mostrar sempre 3-4 slots "populares" estaticamente:
```javascript
const DEFAULT_SLOTS = [
    { date: 'hoje', time: '14:00' },
    { date: 'hoje', time: '15:30' },
    { date: 'amanhã', time: '10:00' },
    { date: 'amanhã', time: '18:00' }
];
```

Melhor ter slots aproximados rápidos do que precisos lentos!

---

**Próxima ação**: Implementar Solução 1 (5 min) + Solução 3 (15 min) = **20 minutos para melhoria imediata**
