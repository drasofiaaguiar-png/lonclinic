# Tipos de Chaves Stripe — Explicação

## 🔑 Tipos de Chaves do Stripe

### `rk_live_...` = Restricted Key (Chave Restrita)
- **O que é:** Chave com permissões limitadas
- **Uso:** Mais segura, mas com funcionalidades restritas
- **Onde usar:** Em situações específicas onde você quer limitar o que a chave pode fazer
- **Para este sistema:** ❌ **NÃO é a chave correta**

### `sk_live_...` = Secret Key (Chave Secreta) ✅
- **O que é:** Chave completa com todas as permissões
- **Uso:** Para o servidor/backend processar pagamentos
- **Onde usar:** No Railway/Render como `STRIPE_SECRET_KEY`
- **Para este sistema:** ✅ **ESTA é a chave que você precisa!**

### `pk_live_...` = Publishable Key (Chave Pública)
- **O que é:** Chave que pode ser exposta no frontend
- **Uso:** Para criar sessões de checkout no navegador
- **Onde usar:** No código JavaScript (já está configurado)
- **Para este sistema:** ✅ **Também precisa desta**

---

## 🎯 Qual Chave Usar?

### Para `STRIPE_SECRET_KEY` (Railway/Render):
✅ **Use:** `sk_live_...` (Secret Key)
❌ **NÃO use:** `rk_live_...` (Restricted Key)

### Para `STRIPE_PUBLISHABLE_KEY`:
✅ **Use:** `pk_live_...` (Publishable Key)

---

## 🔍 Onde Encontrar a Secret Key Correta (`sk_live_`)

1. Acesse: [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vá em: **Developers** → **API keys**
3. Procure por: **"Secret key"** (não "Restricted key")
4. Deve começar com: `sk_live_...` (modo live) ou `sk_test_...` (modo teste)
5. Clique em **"Reveal test key"** ou **"Reveal live key"** para ver

---

## ⚠️ Diferença Importante

**Restricted Key (`rk_live_`):**
- Permissões limitadas
- Mais segura, mas pode não ter todas as funcionalidades
- Não é o que o sistema precisa

**Secret Key (`sk_live_`):**
- Permissões completas
- Necessária para processar pagamentos
- **Esta é a que você precisa!**

---

## ✅ Configuração Correta

No Railway/Render, use:

```
STRIPE_SECRET_KEY=sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz...
STRIPE_PUBLISHABLE_KEY=pk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz...
```

**Importante:** 
- Se você tem `rk_live_...`, precisa encontrar a `sk_live_...`
- A Restricted Key não vai funcionar para este sistema
- Precisa da Secret Key completa

---

## 🔍 Se Só Tem Restricted Key

Se você só vê Restricted Keys no dashboard:

1. **Verifique se está no modo correto:**
   - Modo Live: Precisa completar verificação da conta
   - Modo Test: Deve aparecer Secret Key

2. **Crie uma Secret Key:**
   - Vá em Developers → API keys
   - Procure por "Create secret key" ou similar
   - Ou use a chave padrão que já existe

3. **Se não aparecer:**
   - Pode precisar completar verificação da conta Stripe
   - Ou usar modo de teste primeiro (`sk_test_`)

---

## 💡 Recomendação

**Para começar:**
- Use **modo de teste** (`sk_test_` e `pk_test_`)
- Mais fácil de configurar
- Não precisa verificação completa
- Perfeito para testar

**Depois:**
- Quando estiver pronto, mude para **modo live** (`sk_live_` e `pk_live_`)
- Precisa completar verificação da conta

---

**Você consegue ver a Secret Key (`sk_live_` ou `sk_test_`) no dashboard do Stripe?** Se não, me diga o que aparece e eu ajudo a encontrar! 🚀
