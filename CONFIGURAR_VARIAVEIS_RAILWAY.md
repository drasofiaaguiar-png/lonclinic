# Como Adicionar Variáveis no Railway/Render — Guia Visual

## ⚠️ Importante: Use Environment Variables, NÃO Secret Files!

O sistema precisa de **Environment Variables** (Variáveis de Ambiente), não arquivos secretos.

---

## Ambiente de execução (produção)

No **Railway**, adiciona:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |

Isto garante que o Node e dependências (por exemplo `express`, rotas de debug condicionadas a `NODE_ENV !== 'production'`) comportam-se como em produção. No Railway: **Variables** → **+ New Variable** → `NODE_ENV` = `production` → guardar e voltar a fazer deploy se necessário.

---

## 🚀 Railway — Onde Adicionar Variáveis

### Passo 1: Acessar Variables

1. Acesse seu projeto no Railway
2. Clique na aba **"Variables"** (no menu lateral ou no topo)
3. Você verá uma lista de variáveis existentes

### Passo 2: Adicionar Variável

1. Clique em **"+ New Variable"** ou **"Add Variable"**
2. Preencha:
   - **Key:** `STRIPE_SECRET_KEY` (nome exato, maiúsculas)
   - **Value:** `sk_live_sua_chave_aqui` (sua chave do Stripe)
3. Clique em **"Add"** ou **"Save"**

### Passo 3: Repetir para Outras Variáveis

Adicione uma por uma:

1. **STRIPE_SECRET_KEY** = `sk_live_...` ou `sk_test_...`
2. **STRIPE_PUBLISHABLE_KEY** = `pk_live_...` ou `pk_test_...`
3. **EMAIL_HOST** = `mail.privateemail.com` ou `smtp.gmail.com`
4. **EMAIL_PORT** = `587`
5. **EMAIL_USER** = `info@lonclinic.com` ou seu Gmail
6. **EMAIL_PASS** = senha do email
7. **EMAIL_FROM** = `Longevity Clinic <info@lonclinic.com>`

---

## 🚀 Render — Onde Adicionar Variáveis

### Passo 1: Acessar Environment

1. Acesse seu serviço no Render
2. Vá em **"Environment"** (no menu lateral)
3. Você verá uma lista de variáveis

### Passo 2: Adicionar Variável

1. Role até **"Environment Variables"**
2. Clique em **"Add Environment Variable"**
3. Preencha:
   - **Key:** `STRIPE_SECRET_KEY`
   - **Value:** `sk_live_sua_chave_aqui`
4. Clique em **"Save Changes"**

### Passo 3: Repetir para Outras

Adicione todas as variáveis necessárias.

---

## ✅ Formato Correto

### Variável Stripe Secret Key

**Key (nome):**
```
STRIPE_SECRET_KEY
```

**Value (valor):**
```
sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefghijklmnopqrstuvwxyz
```

**Importante:**
- ✅ Nome em MAIÚSCULAS
- ✅ Com underscore (_)
- ✅ Valor começa com `sk_live_` ou `sk_test_`
- ✅ Sem espaços extras
- ✅ Sem aspas

---

## ❌ Erros Comuns

### Erro 1: Usar Secret Files ao invés de Variables
- ❌ **NÃO use:** Secret Files
- ✅ **USE:** Environment Variables / Variables

### Erro 2: Nome Errado
- ❌ `stripe_secret_key` (minúsculas)
- ❌ `STRIPE_SECRET` (faltando _KEY)
- ✅ `STRIPE_SECRET_KEY` (correto)

### Erro 3: Espaços ou Aspas
- ❌ `STRIPE_SECRET_KEY = sk_live_...` (espaços)
- ❌ `STRIPE_SECRET_KEY="sk_live_..."` (aspas)
- ✅ `STRIPE_SECRET_KEY=sk_live_...` (correto)

### Erro 4: Chave Errada
- ❌ `rk_live_...` (Restricted Key)
- ❌ `pk_live_...` (Publishable Key)
- ✅ `sk_live_...` ou `sk_test_...` (Secret Key)

---

## 📋 Checklist de Variáveis

Adicione estas variáveis no Railway/Render:

### Ambiente
- [ ] `NODE_ENV` = `production`

### Stripe (Obrigatório)
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...` ou `sk_test_...`
- [ ] `STRIPE_PUBLISHABLE_KEY` = `pk_live_...` ou `pk_test_...`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` (**obrigatório** — o servidor exige assinatura do webhook)

### Email SMTP (Obrigatório para envio)
- [ ] `EMAIL_HOST` = `mail.privateemail.com` ou `smtp.gmail.com`
- [ ] `EMAIL_PORT` = `587`
- [ ] `EMAIL_USER` = `info@lonclinic.com` ou seu Gmail
- [ ] `EMAIL_PASS` = senha do email
- [ ] `EMAIL_FROM` = `Longevity Clinic <info@lonclinic.com>`

### Outras (Opcional)
- [ ] `DOXY_ROOM_URL` = `https://doxy.me/your-room`
- [ ] `CONTACT_EMAIL` = `info@lonclinic.com`

---

## 🔍 Como Verificar se Está Correto

### 1. Ver Lista de Variáveis

No Railway/Render, você deve ver:
```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
EMAIL_HOST
EMAIL_PORT
...
```

### 2. Verificar Logs

Após adicionar e fazer deploy, veja os logs:

**Se correto:**
```
🟡 TEST (ou 🔴 LIVE)
✉️ Email transport verified and ready
```

**Se errado:**
```
⚠️ Stripe NOT configured
⚠️ Email NOT configured
```

### 3. Testar Endpoint de Debug

Acesse: `https://lonclinic.com/api/debug-stripe`

Deve mostrar informações sobre a configuração do Stripe.

---

## 🎯 Passo a Passo Rápido

### Railway:
1. Projeto → **Variables** (não Secret Files)
2. **+ New Variable**
3. Key: `STRIPE_SECRET_KEY`
4. Value: `sk_live_sua_chave`
5. **Add**
6. Repita para outras variáveis

### Render:
1. Serviço → **Environment**
2. **Add Environment Variable**
3. Key: `STRIPE_SECRET_KEY`
4. Value: `sk_live_sua_chave`
5. **Save Changes**
6. Repita para outras variáveis

---

## ⚠️ Lembrete

**NÃO use Secret Files!**
**USE Environment Variables / Variables!**

O código lê de `process.env.STRIPE_SECRET_KEY`, que vem de variáveis de ambiente, não de arquivos.

---

**Adicione as variáveis na seção correta e me avise quando terminar!** 🚀
