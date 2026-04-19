# Webhook Stripe — Verificação de assinatura obrigatória

## Resposta curta

- **Endpoint do webhook** no Stripe Dashboard: necessário para receber `checkout.session.completed` e confirmar marcações.
- **`STRIPE_WEBHOOK_SECRET`**: **obrigatório** em produção. O servidor **rejeita** pedidos ao `/webhook` se o secret estiver em falta ou for um placeholder.

O código usa `stripe.webhooks.constructEvent()` e **não** processa eventos sem assinatura válida.

---

## O que configurar

### 1. Endpoint no Stripe

1. [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. URL: `https://lonclinic.com/webhook` (ou o teu domínio)
3. Eventos:
   - `checkout.session.completed`
   - `checkout.session.expired`

### 2. Variável `STRIPE_WEBHOOK_SECRET`

1. No endpoint criado, em **Signing secret** → **Reveal**
2. Copia o valor (começa com `whsec_`)
3. No Railway/Render, adiciona:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Valores como `whsec_placeholder` ou `whsec_your_webhook_secret_here` são **rejeitados** — o webhook responde com erro até configurares um secret real.

---

## Comportamento se o secret estiver mal configurado

- Respostas **500** (`Webhook not configured`) ou **400** (assinatura inválida) em `/webhook`
- Pagamentos podem concluir-se no Stripe, mas a **finalização no servidor** (emails, base de dados) depende do webhook — por isso o secret e o endpoint têm de estar corretos.

---

## Variáveis mínimas relacionadas com Stripe

```
STRIPE_SECRET_KEY=sk_live_... ou sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_... ou pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Consulta também `CONFIGURAR_STRIPE.md` para o passo a passo completo.
