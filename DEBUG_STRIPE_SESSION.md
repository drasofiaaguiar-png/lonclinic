# Debug — Stripe Configurado mas Erro ao Criar Sessão

## ✅ Status Atual

O debug mostra que está tudo configurado:
- ✅ `isStripeConfigured: true`
- ✅ `hasSecretKey: true`
- ✅ `startsWithSk: true`
- ✅ `publishableKeyExists: true`

**Problema:** Erro ao criar sessão de checkout.

---

## 🔍 O Que Verificar Agora

### 1. Ver Logs do Servidor

Quando você tentar fazer um agendamento, os logs devem mostrar:

```
Creating Stripe checkout session...
   Service: ...
   Amount: ... cents
   Email: ...
```

E depois:
```
❌ Error creating checkout session:
   Error type: ...
   Error message: ...
   Error code: ...
```

**Me mostre essas mensagens dos logs!**

---

## 🎯 Possíveis Causas

### 1. Preço Muito Baixo (99% Desconto)

Com 99% de desconto, o preço pode ficar muito baixo:
- Stripe mínimo: 50 centavos (EUR)
- Se o preço original é €39, com 99% desconto = €0.39 = 39 centavos
- **Solução:** Já adicionei validação para mínimo de 50 centavos

### 2. Chave Stripe Incorreta

Mesmo que comece com `sk_live_`, pode estar:
- Incompleta
- De outra conta
- Com caracteres inválidos

### 3. Problema com URLs

As URLs de sucesso/cancelamento podem estar incorretas.

---

## 🧪 Teste Sem Desconto

Para isolar o problema:

1. Faça um agendamento **SEM usar o código ME2026**
2. Veja se funciona
3. Se funcionar → problema é o preço muito baixo
4. Se não funcionar → problema é outra coisa

---

## 📋 O Que Preciso Ver

**Me mostre os logs do servidor quando você tentar fazer o agendamento:**

1. Acesse os logs no Railway/Render
2. Tente fazer um agendamento
3. Procure por:
   - `Creating Stripe checkout session...`
   - `❌ Error creating checkout session:`
   - Mensagens de erro específicas

4. **Copie e me envie essas mensagens**

---

## 🔧 Solução Temporária

Se o problema for o preço muito baixo com 99% desconto:

**Opção 1:** Reduzir desconto para 90% ou 95%
**Opção 2:** Manter mínimo de 50 centavos (já implementado)

---

**Me mostre os logs do servidor quando tentar fazer o agendamento!** Isso vai mostrar exatamente qual é o erro. 🚀
