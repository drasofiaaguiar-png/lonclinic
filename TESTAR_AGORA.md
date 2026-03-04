# Como Testar se Está Funcionando

## ✅ Variáveis Configuradas!

Agora vamos verificar se tudo está funcionando.

---

## 🔍 Passo 1: Verificar Logs do Servidor

### No Railway:
1. Acesse seu projeto
2. Vá em **"Deployments"** ou **"Metrics"**
3. Clique nos **logs**
4. Procure por estas mensagens:

**Se Stripe está configurado:**
```
🟡 TEST (se usar sk_test_)
🔴 LIVE (se usar sk_live_)
```

**Se Email está configurado:**
```
✉️ Email transport verified and ready
```

**Se não está configurado:**
```
⚠️ Stripe NOT configured
⚠️ Email NOT configured
```

### No Render:
1. Acesse seu serviço
2. Vá na aba **"Logs"**
3. Procure pelas mesmas mensagens

---

## 🧪 Passo 2: Testar Endpoint de Debug

1. Acesse: `https://lonclinic.com/api/debug-stripe`
2. Deve retornar JSON com informações sobre a configuração
3. Verifique:
   - `isStripeConfigured: true` → ✅ Funcionando
   - `isStripeConfigured: false` → ❌ Ainda há problema

---

## 💳 Passo 3: Testar Agendamento Completo

1. Acesse: `https://lonclinic.com/book.html`
2. Selecione um serviço
3. Escolha data (amanhã ou depois)
4. Escolha hora
5. Preencha o formulário
6. Use código de desconto: **ME2026** (99% off)
7. Clique em "Proceed to secure payment"
8. **Deve redirecionar para Stripe** (não deve dar erro)

---

## 📧 Passo 4: Testar Pagamento

### Com Cartão de Teste:
- **Número:** `4242 4242 4242 4242`
- **Data:** Qualquer data futura (ex: 12/25)
- **CVC:** Qualquer 3 dígitos (ex: 123)
- **CEP:** Qualquer código postal

### Após Pagamento:
1. Deve redirecionar para página de confirmação
2. Verifique se email de confirmação chegou
3. Verifique pasta de spam se não aparecer

---

## ✅ Checklist de Teste

- [ ] Logs mostram "TEST" ou "LIVE" (Stripe configurado)
- [ ] Logs mostram "Email transport verified" (SMTP configurado)
- [ ] Endpoint `/api/debug-stripe` mostra `isStripeConfigured: true`
- [ ] Agendamento não dá erro "Stripe is not configured"
- [ ] Redireciona para Stripe Checkout
- [ ] Pagamento com cartão de teste funciona
- [ ] Email de confirmação chegou

---

## 🆘 Se Ainda Não Funcionar

### Erro: "Stripe is not configured"

**Verifique:**
1. Variável `STRIPE_SECRET_KEY` existe?
2. Valor começa com `sk_live_` ou `sk_test_`?
3. Não há espaços extras?
4. Servidor foi reiniciado após adicionar? (aguarde 1-2 min)

**Teste:**
- Acesse: `https://lonclinic.com/api/debug-stripe`
- Veja o que retorna
- Me mostre o resultado

### Erro: Não redireciona para Stripe

**Verifique:**
1. `STRIPE_PUBLISHABLE_KEY` está configurada?
2. Logs mostram algum erro?
3. Console do navegador (F12) mostra erros?

---

## 🎯 O Que Esperar

**Se tudo está correto:**
1. ✅ Logs mostram "TEST" ou "LIVE"
2. ✅ Agendamento funciona sem erros
3. ✅ Redireciona para Stripe
4. ✅ Pagamento processa
5. ✅ Email de confirmação chega

---

**Teste agora e me diga o que acontece!** 🚀

Se ainda der erro, me mostre:
- O que aparece nos logs
- O que retorna em `/api/debug-stripe`
- Qual erro específico aparece
