# Como Configurar SMTP para Confirmações Automáticas

## 🎯 Objetivo

Configurar o sistema para enviar automaticamente emails de confirmação quando pacientes fazem agendamento.

---

## 📋 Opções Disponíveis

### Opção 1: Usar info@lonclinic.com (Recomendado)
**Vantagem:** Usa seu próprio domínio, mais profissional

### Opção 2: Usar Gmail Pessoal
**Vantagem:** Mais fácil de configurar, já tem conta

---

## 🔧 Opção 1: Configurar com info@lonclinic.com

### Passo 1: Obter Credenciais SMTP

Depende de onde você criou o email:

#### Se criou no Namecheap:
1. Acesse [namecheap.com](https://www.namecheap.com) → Domain List → Manage
2. Vá em **Email** ou **Private Email**
3. Procure por **SMTP Settings** ou **Mail Server Settings**
4. Anote:
   - **SMTP Server:** geralmente `mail.privateemail.com` ou `smtp.privateemail.com`
   - **Porta:** 587 (TLS) ou 465 (SSL)
   - **Usuário:** `info@lonclinic.com`
   - **Senha:** a senha que você criou para o email

#### Se criou no Google Workspace:
1. Use as configurações padrão do Gmail
2. **SMTP:** `smtp.gmail.com`
3. **Porta:** 587
4. **Usuário:** `info@lonclinic.com`
5. **Senha:** Use App Password (veja instruções abaixo)

#### Se criou em outro provedor:
- Consulte a documentação do seu provedor
- Procure por "SMTP settings" ou "Mail server configuration"

### Passo 2: Configurar no Railway/Render

1. Acesse seu projeto no Railway ou Render
2. Vá em **Variables** ou **Environment**
3. Adicione estas variáveis:

```
EMAIL_HOST=smtp.privateemail.com
EMAIL_PORT=587
EMAIL_USER=info@lonclinic.com
EMAIL_PASS=sua_senha_do_email
EMAIL_FROM=Longevity Clinic <info@lonclinic.com>
```

**Substitua:**
- `smtp.privateemail.com` pelo servidor SMTP do seu provedor
- `sua_senha_do_email` pela senha real do email

---

## 🔧 Opção 2: Configurar com Gmail Pessoal

### Passo 1: Criar App Password no Gmail

1. Acesse: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Faça login na sua conta Gmail
3. **Se não aparecer a opção:**
   - Ative a **Verificação em duas etapas** primeiro
   - Vá em: [myaccount.google.com/security](https://myaccount.google.com/security)
   - Ative "Verificação em duas etapas"
   - Depois volte para App Passwords

4. Em App Passwords:
   - **App:** Selecione "Mail"
   - **Device:** Selecione "Other (Custom name)"
   - **Name:** Digite "Longevity Clinic"
   - Clique em **Generate**

5. **Copie a senha gerada** (16 caracteres)
   - Exemplo: `abcd efgh ijkl mnop`
   - Você só verá uma vez! Guarde bem.

### Passo 2: Configurar no Railway/Render

1. Acesse seu projeto
2. Vá em **Variables** ou **Environment**
3. Adicione estas variáveis:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Longevity Clinic <seu-email@gmail.com>
```

**Substitua:**
- `seu-email@gmail.com` pelo seu Gmail
- `abcd efgh ijkl mnop` pela App Password gerada

---

## ✅ Verificar se Está Funcionando

### 1. Verificar Logs do Servidor

Após adicionar as variáveis e fazer deploy:

1. Vá nos logs do Railway/Render
2. Procure por esta mensagem:
   ```
   ✉️ Email transport verified and ready
   ```
3. Se aparecer, está funcionando! ✅

### 2. Testar com um Agendamento

1. Faça um agendamento de teste no site
2. Complete o pagamento
3. Verifique se o email de confirmação chegou
4. Se não chegou, verifique a pasta de spam

---

## 🔍 Troubleshooting

### Erro: "Email transport error"
- Verifique se a senha está correta
- Confirme que o servidor SMTP está correto
- Verifique se a porta está correta (587 ou 465)

### Gmail bloqueando?
- Certifique-se de usar **App Password**, não senha normal
- Verifique se a verificação em duas etapas está ativa

### Email não chega?
- Verifique a pasta de spam
- Confirme que o email do paciente está correto
- Veja os logs do servidor para erros

### Namecheap Private Email?
- Use `mail.privateemail.com` como SMTP
- Porta 587 para TLS
- Use o email completo como usuário

---

## 📝 Exemplo Completo - Namecheap

```
EMAIL_HOST=mail.privateemail.com
EMAIL_PORT=587
EMAIL_USER=info@lonclinic.com
EMAIL_PASS=MinhaSenha123
EMAIL_FROM=Longevity Clinic <info@lonclinic.com>
```

## 📝 Exemplo Completo - Gmail

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=meuemail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Longevity Clinic <meuemail@gmail.com>
```

---

## 🚀 Próximos Passos

1. **Adicione as variáveis** no Railway/Render
2. **Aguarde o deploy** (1-2 minutos)
3. **Verifique os logs** para confirmação
4. **Teste** fazendo um agendamento

---

## 💡 Dica

**Para produção:** Use `info@lonclinic.com` (mais profissional)
**Para testes:** Use Gmail pessoal (mais rápido)

Qual opção você quer usar? Posso ajudar com as configurações específicas!
