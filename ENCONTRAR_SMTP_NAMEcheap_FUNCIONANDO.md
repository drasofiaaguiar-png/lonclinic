# Como Encontrar SMTP no Namecheap (Email Já Funcionando)

## ✅ Seu Email Já Funciona!

Como você já recebe emails em `info@lonclinic.com`, agora só precisa das **configurações SMTP para ENVIAR**.

---

## 🔍 Onde Encontrar SMTP no Namecheap

### Opção 1: Private Email Dashboard

1. **Acesse:** [namecheap.com](https://www.namecheap.com)
2. **Domain List** → **Manage** (ao lado de `lonclinic.com`)
3. Procure por:
   - **"Private Email"** ou **"Email"**
   - **"Mail Settings"**
   - **"Email Hosting"**

4. **Dentro do Private Email:**
   - Procure por **"Mail Client Configuration"**
   - Ou **"SMTP Settings"**
   - Ou **"Outgoing Mail Server"**
   - Ou **"Email Client Setup"**

### Opção 2: Configurações do Mailbox

1. No painel do Private Email
2. Clique no email `info@lonclinic.com`
3. Procure por:
   - **"Settings"** ou **"Configuration"**
   - **"SMTP"** ou **"Outgoing"**
   - **"Mail Client"**

### Opção 3: Documentação Namecheap

As configurações SMTP padrão do Namecheap Private Email são:

```
SMTP Server: mail.privateemail.com
Porta: 587 (TLS) ou 465 (SSL)
Usuário: info@lonclinic.com
Senha: [a senha que você criou para o email]
```

---

## 📧 Configurações Padrão Namecheap Private Email

Se não encontrar no painel, use estas configurações padrão:

**Para Railway/Render:**
```
EMAIL_HOST=mail.privateemail.com
EMAIL_PORT=587
EMAIL_USER=info@lonclinic.com
EMAIL_PASS=sua_senha_do_email
EMAIL_FROM=Longevity Clinic <info@lonclinic.com>
```

**Importante:**
- `EMAIL_USER`: Use o email completo `info@lonclinic.com`
- `EMAIL_PASS`: A senha que você criou quando criou o email
- `EMAIL_PORT`: Use `587` para TLS (mais comum)

---

## 🔍 Onde Ver a Senha do Email

Se não lembra da senha:

1. No painel do Private Email
2. Clique no email `info@lonclinic.com`
3. Procure por:
   - **"Change Password"** ou **"Reset Password"**
   - Ou **"Account Settings"**

---

## ✅ Teste Rápido

Depois de configurar no Railway/Render:

1. **Aguarde 1-2 minutos** (deploy automático)
2. **Verifique os logs** - deve aparecer:
   ```
   ✉️ Email transport verified and ready
   ```
3. **Faça um agendamento de teste** no site
4. **Verifique se o email de confirmação chegou**

---

## 🚀 Configurar Agora

**Se você tem a senha do email:**

1. Acesse Railway/Render → Variables
2. Adicione:
   ```
   EMAIL_HOST=mail.privateemail.com
   EMAIL_PORT=587
   EMAIL_USER=info@lonclinic.com
   EMAIL_PASS=sua_senha_aqui
   EMAIL_FROM=Longevity Clinic <info@lonclinic.com>
   ```
3. Salve e aguarde deploy

**Se não tem a senha:**
- Acesse o painel do Private Email
- Procure por "Change Password" ou "Account Settings"
- Anote a senha ou crie uma nova

---

## 💡 Dica

As configurações SMTP do Namecheap são geralmente sempre as mesmas:
- **Host:** `mail.privateemail.com`
- **Porta:** `587` (TLS) ou `465` (SSL)
- **Usuário:** Seu email completo
- **Senha:** A senha do email

Você só precisa da **senha do email** para configurar!

---

**Você tem a senha do email `info@lonclinic.com`?** Se tiver, posso ajudar a configurar agora no Railway/Render! 🚀
