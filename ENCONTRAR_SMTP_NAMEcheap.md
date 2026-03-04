# Como Encontrar SMTP no Namecheap — Guia Detalhado

## 🔍 Onde Procurar no Namecheap

### Opção 1: Private Email (Mais Comum)

1. **Acesse:** [namecheap.com](https://www.namecheap.com)
2. **Faça login**
3. **Vá em:** Domain List (menu lateral)
4. **Clique em:** "Manage" ao lado de `lonclinic.com`
5. **Procure por:**
   - Aba "Email" ou "Private Email"
   - Ou "Email Forwarding"
   - Ou "Mail Settings"

6. **Se encontrar "Private Email":**
   - Clique para acessar
   - Procure por "Mail Client Configuration" ou "SMTP Settings"
   - Ou "Outgoing Mail Server"

### Opção 2: Verificar se Email Hosting Está Ativo

1. No painel do domínio, procure por:
   - "Email Hosting"
   - "Private Email"
   - "Business Email"

2. **Se não estiver ativado:**
   - Pode precisar ativar o serviço primeiro
   - Ou o email foi criado em outro lugar

### Opção 3: Verificar Advanced DNS

1. Vá em "Advanced DNS"
2. Procure por registros MX (Mail Exchange)
3. Se houver registros MX, o email está configurado
4. Mas as credenciais SMTP podem estar em outro lugar

---

## ❓ Perguntas para Identificar

**Onde você criou o email `info@lonclinic.com`?**

- [ ] No painel do Namecheap (Domain List → Manage)
- [ ] Em outro serviço (Google Workspace, etc.)
- [ ] Não tenho certeza

**O que você vê quando acessa o painel do domínio?**

- [ ] Opção "Email" ou "Private Email"
- [ ] Opção "Email Forwarding"
- [ ] Nenhuma opção de email
- [ ] Outro

---

## 🚀 Solução Alternativa: Usar Gmail (Mais Fácil)

Se não conseguir encontrar as configurações SMTP no Namecheap, **recomendo usar Gmail** como solução rápida e confiável:

### Vantagens do Gmail:
- ✅ Muito fácil de configurar
- ✅ Confiável e rápido
- ✅ Funciona imediatamente
- ✅ Você já tem conta (provavelmente)

### Como Configurar Gmail:

1. **Criar App Password:**
   - Acesse: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Ative verificação em duas etapas (se necessário)
   - Gere App Password para "Mail"
   - Copie a senha (16 caracteres)

2. **Configurar no Railway/Render:**
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=seu-email@gmail.com
   EMAIL_PASS=app_password_aqui
   EMAIL_FROM=Longevity Clinic <seu-email@gmail.com>
   ```

3. **Pronto!** Funciona em 2 minutos

---

## 📞 Alternativa: Suporte Namecheap

Se realmente quiser usar `info@lonclinic.com`:

1. **Entre em contato com suporte Namecheap:**
   - Chat ao vivo no site
   - Pergunte: "Como obtenho as configurações SMTP para info@lonclinic.com?"

2. **Ou verifique a documentação:**
   - [namecheap.com/support/knowledgebase](https://www.namecheap.com/support/knowledgebase)
   - Procure por "SMTP settings" ou "mail server configuration"

---

## 💡 Minha Recomendação

**Para começar rápido:** Use Gmail agora
- Configura em 2 minutos
- Funciona imediatamente
- Você pode mudar depois se quiser

**Depois (opcional):** Configure `info@lonclinic.com`
- Quando tiver tempo
- Com ajuda do suporte Namecheap
- Para usar seu próprio domínio

---

## 🎯 Próximo Passo

**O que você prefere?**

1. **Tentar encontrar no Namecheap mais uma vez** (posso ajudar com screenshots/descrições)
2. **Usar Gmail agora** (mais rápido, funciona bem)
3. **Contatar suporte Namecheap** (para usar info@lonclinic.com)

Me diga qual opção prefere e eu ajudo a configurar!
