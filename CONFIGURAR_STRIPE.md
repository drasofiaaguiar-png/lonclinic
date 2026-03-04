# Como Configurar Stripe — Guia Completo

## 🎯 Por Que Precisa do Stripe?

Sem o Stripe configurado:
- ❌ Pagamentos não funcionam
- ❌ Emails de confirmação não são enviados
- ❌ Agendamentos não são processados

Com o Stripe configurado:
- ✅ Pagamentos funcionam
- ✅ Emails automáticos enviados após pagamento
- ✅ Sistema completo funcionando

---

## 📋 O Que Você Precisa

1. **Conta Stripe** (grátis)
2. **Chaves da API** (Secret Key e Publishable Key)
3. **Webhook Secret** (para confirmações automáticas)

---

## 🚀 Passo 1: Criar Conta no Stripe

### 1.1. Criar Conta

1. Acesse: [stripe.com](https://stripe.com)
2. Clique em **"Start now"** ou **"Sign up"**
3. Preencha:
   - Email
   - Senha
   - País (ex: Portugal, Reino Unido)
4. Confirme seu email

### 1.2. Completar Perfil

1. Preencha informações da empresa/clínica:
   - Nome da empresa: "Longevity Clinic"
   - Tipo de negócio: Serviços médicos / Healthcare
   - Endereço
   - Informações bancárias (para receber pagamentos)

**Nota:** Você pode começar em **modo de teste** sem informações bancárias.

---

## 🔑 Passo 2: Obter Chaves da API

### 2.1. Acessar API Keys

1. Faça login no [Stripe Dashboard](https://dashboard.stripe.com)
2. No menu lateral, clique em **"Developers"**
3. Clique em **"API keys"**

### 2.2. Escolher Modo

**Modo de Teste (Recomendado para começar):**
- Use chaves que começam com `sk_test_` e `pk_test_`
- Permite testar sem cobrar cartões reais
- Use cartões de teste: `4242 4242 4242 4242`

**Modo Live (Para produção):**
- Use chaves que começam com `sk_live_` e `pk_live_`
- Cobra cartões reais
- Precisa completar verificação da conta

### 2.3. Copiar Chaves

Você verá duas chaves:

1. **Publishable key** (começa com `pk_test_` ou `pk_live_`)
   - Pode ser exposta no frontend
   - Copie esta chave

2. **Secret key** (começa com `sk_test_` ou `sk_live_`)
   - **NUNCA** exponha publicamente
   - Clique em **"Reveal test key"** para ver
   - Copie esta chave

---

## 🔗 Passo 3: Configurar Webhook

### 3.1. Criar Webhook Endpoint

1. No Stripe Dashboard, vá em **"Developers"** → **"Webhooks"**
2. Clique em **"Add endpoint"**
3. Configure:
   - **Endpoint URL:** `https://lonclinic.com/webhook`
   - **Description:** "Longevity Clinic - Booking Confirmations"
4. Clique em **"Add endpoint"**

### 3.2. Selecionar Eventos

Selecione estes eventos:
- ✅ `checkout.session.completed` (pagamento concluído)
- ✅ `checkout.session.expired` (sessão expirada)

Clique em **"Add events"**

### 3.3. Copiar Webhook Secret

1. Após criar o webhook, clique nele
2. Na seção **"Signing secret"**, clique em **"Reveal"**
3. Copie o secret (começa com `whsec_`)
4. **Guarde bem!** Você precisará dele

---

## ⚙️ Passo 4: Configurar no Railway/Render

### 4.1. Adicionar Variáveis

No Railway ou Render:

1. Acesse seu projeto → **Variables** ou **Environment**
2. Adicione estas variáveis:

```
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui
```

**Substitua:**
- `sk_test_sua_chave_secreta_aqui` pela Secret Key do Stripe
- `pk_test_sua_chave_publica_aqui` pela Publishable Key
- `whsec_seu_webhook_secret_aqui` pelo Webhook Secret

### 4.2. Exemplo Real

```
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

---

## ✅ Passo 5: Verificar se Está Funcionando

### 5.1. Verificar Logs

Após adicionar as variáveis e fazer deploy:

1. Veja os logs do servidor
2. Procure por:
   ```
   🟡 TEST (se usar chaves de teste)
   🔴 LIVE (se usar chaves de produção)
   ```
3. Se aparecer, está configurado! ✅

### 5.2. Testar Pagamento

1. Acesse: `https://lonclinic.com/book.html`
2. Faça um agendamento de teste
3. Use cartão de teste: `4242 4242 4242 4242`
   - Data: qualquer data futura
   - CVC: qualquer 3 dígitos
   - CEP: qualquer código postal
4. Complete o pagamento
5. Verifique:
   - ✅ Redirecionamento para página de confirmação
   - ✅ Email de confirmação enviado
   - ✅ Logs mostram "Payment successful!"

---

## 🧪 Cartões de Teste do Stripe

Para testar sem cobrar cartões reais:

**Pagamento bem-sucedido:**
- Número: `4242 4242 4242 4242`
- Data: qualquer data futura
- CVC: qualquer 3 dígitos

**Pagamento recusado:**
- Número: `4000 0000 0000 0002`

**Mais cartões de teste:** [stripe.com/docs/testing](https://stripe.com/docs/testing)

---

## 🔄 Modo Teste vs Modo Live

### Modo Teste (sk_test_ / pk_test_)
- ✅ Grátis
- ✅ Não cobra cartões reais
- ✅ Perfeito para testar
- ❌ Não recebe dinheiro real

### Modo Live (sk_live_ / pk_live_)
- ✅ Recebe pagamentos reais
- ✅ Dinheiro vai para sua conta
- ⚠️ Precisa completar verificação da conta
- ⚠️ Taxa de 2.9% + €0.25 por transação

**Recomendação:** Comece com modo teste, depois mude para live quando estiver pronto.

---

## 🔐 Segurança

**IMPORTANTE:**
- ❌ **NUNCA** compartilhe sua Secret Key
- ❌ **NUNCA** commite chaves no GitHub
- ✅ Use variáveis de ambiente sempre
- ✅ Secret Key só no servidor (Railway/Render)

---

## 📋 Checklist

- [ ] Conta Stripe criada
- [ ] Perfil completado
- [ ] Chaves da API copiadas
- [ ] Webhook criado em `https://lonclinic.com/webhook`
- [ ] Webhook Secret copiado
- [ ] Variáveis adicionadas no Railway/Render
- [ ] Deploy feito
- [ ] Logs mostram "TEST" ou "LIVE"
- [ ] Teste de pagamento funcionou
- [ ] Email de confirmação chegou

---

## 🆘 Troubleshooting

### Erro: "Stripe is not configured"
- Verifique se as variáveis estão salvas
- Confirme que não há espaços extras
- Aguarde deploy (1-2 minutos)

### Webhook não funciona
- Verifique se a URL está correta: `https://lonclinic.com/webhook`
- Confirme que o webhook secret está correto
- Veja logs do webhook no Stripe Dashboard

### Pagamento não processa
- Verifique se está usando chaves de teste
- Confirme que o cartão de teste está correto
- Veja logs do servidor para erros

---

## 🎯 Próximos Passos

1. **Configure o Stripe** (siga os passos acima)
2. **Teste um pagamento** com cartão de teste
3. **Verifique se email chegou**
4. **Quando estiver pronto:** Mude para modo Live

---

**Precisa de ajuda em algum passo?** Me diga onde está e eu ajudo! 🚀
