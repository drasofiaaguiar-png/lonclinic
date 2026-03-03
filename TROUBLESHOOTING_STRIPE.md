# Troubleshooting — Erro "Stripe is not configured"

## ❌ Erro Recebido

```
Payment error: Stripe is not configured. Add your STRIPE_SECRET_KEY to the .env file.
```

Mas você já configurou? Vamos verificar!

---

## 🔍 Possíveis Causas

### 1. Variável Não Foi Salva Corretamente

**Verifique no Railway/Render:**
1. Acesse seu projeto → **Variables** ou **Environment**
2. Procure por `STRIPE_SECRET_KEY`
3. Confirme que:
   - ✅ A variável existe
   - ✅ O valor está correto (começa com `sk_live_` ou `sk_test_`)
   - ✅ Não há espaços extras no início/fim
   - ✅ Não está comentada

### 2. Servidor Não Foi Reiniciado

**Após adicionar variáveis:**
- Railway: Faz deploy automático (aguarde 1-2 minutos)
- Render: Faz deploy automático (aguarde 1-2 minutos)

**Se não reiniciou:**
- As variáveis antigas ainda estão em uso
- Precisa fazer novo deploy

### 3. Chave Incorreta

**Verifique se a chave está correta:**
- ✅ Deve começar com `sk_live_` ou `sk_test_`
- ❌ NÃO use `rk_live_` (Restricted Key)
- ❌ NÃO use `pk_live_` (Publishable Key)

### 4. Nome da Variável Errado

**Deve ser exatamente:**
```
STRIPE_SECRET_KEY
```

**NÃO:**
- `STRIPE_SECRET` (faltando _KEY)
- `stripe_secret_key` (minúsculas)
- `Stripe_Secret_Key` (maiúsculas erradas)

---

## ✅ Como Verificar

### Passo 1: Verificar Variáveis no Railway/Render

1. Acesse seu projeto
2. Vá em **Variables** ou **Environment**
3. Procure por:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`

4. **Confirme:**
   - Nome exato: `STRIPE_SECRET_KEY` (maiúsculas)
   - Valor começa com: `sk_live_` ou `sk_test_`
   - Não há espaços extras

### Passo 2: Verificar Logs do Servidor

**No Railway/Render:**
1. Acesse os logs
2. Procure por:
   ```
   🟡 TEST (se usar sk_test_)
   🔴 LIVE (se usar sk_live_)
   ```
3. **Se aparecer:** Stripe está configurado ✅
4. **Se aparecer:** `⚠️ Stripe NOT configured` → Problema nas variáveis ❌

### Passo 3: Testar Endpoint da API

1. Acesse: `https://lonclinic.com/api/config`
2. Deve retornar JSON com `publishableKey`
3. Se retornar `null` ou erro → Problema na configuração

---

## 🔧 Soluções

### Solução 1: Verificar e Corrigir Variável

1. **No Railway/Render:**
   - Vá em Variables
   - Encontre `STRIPE_SECRET_KEY`
   - Clique para editar
   - Verifique o valor:
     - Deve começar com `sk_live_` ou `sk_test_`
     - Não deve ter espaços
     - Deve ser a chave completa
   - Salve novamente

2. **Aguarde deploy** (1-2 minutos)

3. **Verifique logs** novamente

### Solução 2: Remover e Adicionar Novamente

1. **Remova** a variável `STRIPE_SECRET_KEY`
2. **Aguarde** deploy
3. **Adicione novamente** com o valor correto
4. **Aguarde** deploy
5. **Teste** novamente

### Solução 3: Verificar Formato da Chave

**Formato correto:**
```
STRIPE_SECRET_KEY=sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefghijklmnopqrstuvwxyz
```

**Erros comuns:**
- ❌ `STRIPE_SECRET_KEY= rk_live_...` (espaço no início)
- ❌ `STRIPE_SECRET_KEY=sk_live_... ` (espaço no fim)
- ❌ `STRIPE_SECRET_KEY=rk_live_...` (tipo errado de chave)
- ❌ `STRIPE_SECRET_KEY="sk_live_..."` (aspas desnecessárias)

---

## 🧪 Teste Rápido

### 1. Verificar Variável Está Sendo Lida

Adicione temporariamente no código (apenas para debug):

```javascript
console.log('STRIPE_SECRET:', process.env.STRIPE_SECRET_KEY ? 'EXISTS' : 'MISSING');
console.log('STRIPE_SECRET length:', process.env.STRIPE_SECRET_KEY?.length || 0);
console.log('Starts with sk_:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_'));
```

**Ou verifique nos logs:**
- Se aparecer "MISSING" → Variável não está sendo lida
- Se aparecer "EXISTS" mas não funciona → Problema no valor

### 2. Verificar no Stripe Dashboard

1. Acesse: [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Confirme que você copiou a **Secret Key** (não Publishable)
3. Deve começar com `sk_live_` ou `sk_test_`

---

## 📋 Checklist de Verificação

- [ ] Variável `STRIPE_SECRET_KEY` existe no Railway/Render
- [ ] Nome está correto (maiúsculas, com underscore)
- [ ] Valor começa com `sk_live_` ou `sk_test_`
- [ ] Não há espaços extras
- [ ] Não está comentada
- [ ] Servidor foi reiniciado após adicionar
- [ ] Logs mostram "TEST" ou "LIVE"
- [ ] Chave foi copiada corretamente do Stripe

---

## 🆘 Se Ainda Não Funcionar

**Me envie:**
1. O que aparece nos logs do servidor
2. Se a variável aparece na lista de variáveis
3. As primeiras letras da chave (ex: `sk_live_51...` - só as primeiras)
4. Qual plataforma está usando (Railway ou Render)

**Vou ajudar a diagnosticar!** 🚀
