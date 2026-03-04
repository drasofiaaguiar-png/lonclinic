# Webhook Secret — É Obrigatório?

## ✅ Resposta Curta

**Webhook Secret:** Pode deixar vazio para começar (funciona sem ele)
**Webhook Endpoint:** Precisa configurar no Stripe (para receber eventos)

---

## 🔍 Como Funciona

### Sem Webhook Secret Configurado

O código está preparado para funcionar **sem** o webhook secret:

```javascript
// Se não tiver webhook secret, funciona mesmo assim
if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
    // Processa o webhook sem verificação de assinatura
    event = JSON.parse(req.body);
    console.log('⚠️  Webhook received WITHOUT signature verification');
}
```

**O que significa:**
- ✅ Sistema funciona sem o secret
- ⚠️ Menos seguro (sem verificação de assinatura)
- ✅ Perfeito para testar

### Com Webhook Secret Configurado

- ✅ Mais seguro (verifica assinatura)
- ✅ Recomendado para produção
- ✅ Valida que o evento veio do Stripe

---

## 🎯 O Que Você Precisa Fazer

### 1. Configurar Webhook Endpoint no Stripe (OBRIGATÓRIO)

**Isso é necessário** para receber eventos de pagamento:

1. Acesse: [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em **"Add endpoint"**
3. URL: `https://lonclinic.com/webhook`
4. Eventos:
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`
5. Clique em **"Add endpoint"**

**Importante:** Mesmo sem o secret, você precisa criar o endpoint!

### 2. Webhook Secret (OPCIONAL para começar)

**Pode deixar vazio:**
```
STRIPE_WEBHOOK_SECRET=
```

Ou não adicionar a variável.

**Depois pode adicionar:**
- Quando o webhook estiver funcionando
- Copie o secret do Stripe
- Adicione como `STRIPE_WEBHOOK_SECRET`

---

## 📋 Configuração Mínima (Para Começar)

No Railway/Render, adicione apenas:

```
STRIPE_SECRET_KEY=sk_live_sua_chave_aqui
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_aqui
```

**Webhook Secret:** Pode deixar vazio ou não adicionar.

---

## ⚠️ Importante

**O webhook endpoint precisa ser criado no Stripe**, mesmo sem o secret:

- Sem endpoint: ❌ Emails não são enviados
- Com endpoint (sem secret): ✅ Funciona, mas menos seguro
- Com endpoint + secret: ✅ Funciona e é seguro

---

## 🚀 Passo a Passo Simplificado

### 1. Configure as Chaves da API
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 2. Crie Webhook no Stripe
- URL: `https://lonclinic.com/webhook`
- Eventos: `checkout.session.completed`, `checkout.session.expired`

### 3. Webhook Secret (Opcional)
- Pode deixar vazio por enquanto
- Adicione depois se quiser mais segurança

---

## ✅ Resumo

**Para começar:**
- ✅ Configure `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY`
- ✅ Crie webhook endpoint no Stripe
- ⚪ Webhook secret pode ficar vazio

**Para produção:**
- ✅ Adicione o webhook secret depois
- ✅ Mais segurança

---

**Pode começar sem o webhook secret!** Só precisa criar o endpoint no Stripe. 🚀
