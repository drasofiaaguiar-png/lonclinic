# Como Adicionar Registro TXT no DNS para Verificação do Google

## 📋 Informações Necessárias

**Domínio:** `lonclinic.com`  
**Tipo de Registro:** `TXT`  
**Nome/Host:** `@` ou `lonclinic.com` (depende do provedor)  
**Valor:** `google-site-verification=4IWPZnAlHtVVSu-0SO8UX_7pFGqqygcjTW5qZ8uid0k`  
**TTL:** 3600 (ou padrão do provedor)

---

## 🔍 Passo a Passo por Provedor

### **1. GoDaddy**

1. Acesse: https://www.godaddy.com/
2. Faça login na sua conta
3. Vá em **"Meus Produtos"** → **"DNS"** (ao lado de `lonclinic.com`)
4. Role até a seção **"Registros"**
5. Clique em **"Adicionar"** ou **"Add"**
6. Preencha:
   - **Tipo:** `TXT`
   - **Nome:** `@` (ou deixe em branco)
   - **Valor:** `google-site-verification=4IWPZnAlHtVVSu-0SO8UX_7pFGqqygcjTW5qZ8uid0k`
   - **TTL:** 1 hora (ou padrão)
7. Clique em **"Salvar"**
8. Aguarde 5-30 minutos para propagação

---

### **2. Namecheap**

1. Acesse: https://www.namecheap.com/
2. Faça login
3. Vá em **"Domain List"** → Clique em **"Manage"** ao lado de `lonclinic.com`
4. Vá na aba **"Advanced DNS"**
5. Na seção **"Host Records"**, clique em **"Add New Record"**
6. Preencha:
   - **Type:** `TXT Record`
   - **Host:** `@`
   - **Value:** `google-site-verification=4IWPZnAlHtVVSu-0SO8UX_7pFGqqygcjTW5qZ8uid0k`
   - **TTL:** Automatic (ou 3600)
7. Clique no ícone de **"✓"** para salvar
8. Aguarde 5-30 minutos

---

### **3. Cloudflare**

1. Acesse: https://dash.cloudflare.com/
2. Selecione o domínio `lonclinic.com`
3. Vá em **"DNS"** → **"Records"**
4. Clique em **"Add record"**
5. Preencha:
   - **Type:** `TXT`
   - **Name:** `@` (ou `lonclinic.com`)
   - **Content:** `google-site-verification=4IWPZnAlHtVVSu-0SO8UX_7pFGqqygcjTW5qZ8uid0k`
   - **TTL:** Auto (ou 3600)
6. Clique em **"Save"**
7. Aguarde 5-30 minutos

---

### **4. Google Domains / Squarespace Domains**

1. Acesse: https://domains.google.com/ ou https://domains.squarespace.com/
2. Clique no domínio `lonclinic.com`
3. Vá em **"DNS"** ou **"DNS Records"**
4. Clique em **"Add record"** ou **"Create record"**
5. Preencha:
   - **Type:** `TXT`
   - **Host/Name:** `@` (ou deixe em branco)
   - **Data/Value:** `google-site-verification=4IWPZnAlHtVVSu-0SO8UX_7pFGqqygcjTW5qZ8uid0k`
   - **TTL:** 3600
6. Salve
7. Aguarde 5-30 minutos

---

### **5. Outros Provedores (Registro.br, Hostinger, etc.)**

O processo é similar:

1. Acesse o painel do seu provedor
2. Encontre a seção **"DNS"**, **"DNS Records"**, **"Zone File"** ou **"Gerenciamento DNS"**
3. Adicione um novo registro:
   - **Tipo:** `TXT`
   - **Nome/Host:** `@` ou `lonclinic.com` (ou deixe em branco)
   - **Valor/Conteúdo:** `google-site-verification=4IWPZnAlHtVVSu-0SO8UX_7pFGqqygcjTW5qZ8uid0k`
4. Salve
5. Aguarde propagação (5-30 minutos, às vezes até 24h)

---

## ⚠️ Dicas Importantes

### **Nome do Registro:**
- Use `@` se o provedor permitir (representa o domínio raiz)
- Ou use `lonclinic.com` (sem www)
- **NÃO** use `www.lonclinic.com` (isso é para subdomínio)

### **Valor Completo:**
Certifique-se de copiar o valor **COMPLETO**, incluindo:
```
google-site-verification=4IWPZnAlHtVVSu-0SO8UX_7pFGqqygcjTW5qZ8uid0k
```

### **Não Adicione Aspas:**
- ❌ `"google-site-verification=..."`
- ✅ `google-site-verification=...`

### **Múltiplos Registros TXT:**
Se já existir um registro TXT para `@`, você pode:
- Adicionar um novo registro TXT (múltiplos são permitidos)
- Ou editar o existente e adicionar o valor em uma nova linha

---

## ✅ Verificar se Funcionou

### **1. Verificar no Terminal/CMD (Windows):**

```cmd
nslookup -type=TXT lonclinic.com
```

Ou:

```cmd
nslookup -type=TXT @8.8.8.8 lonclinic.com
```

Você deve ver o registro `google-site-verification=...` na resposta.

### **2. Verificar Online:**

Use ferramentas online:
- https://mxtoolbox.com/TXTLookup.aspx
- https://www.whatsmydns.net/#TXT/lonclinic.com

Digite `lonclinic.com` e procure pelo registro de verificação do Google.

### **3. Verificar no Google Search Console:**

1. Após adicionar o registro TXT, aguarde 5-30 minutos
2. Volte ao Google Search Console
3. Clique em **"Verificar"** ou **"Verify"**
4. Se não funcionar imediatamente, aguarde até 24 horas e tente novamente

---

## ⏱️ Tempo de Propagação

- **Mínimo:** 5-30 minutos
- **Normal:** 1-4 horas
- **Máximo:** 24-48 horas (raro)

**Dica:** Se não funcionar imediatamente, não se preocupe! DNS pode demorar. Tente novamente após algumas horas.

---

## ❌ Problemas Comuns

### **"Verificação falhou"**
- ✅ Aguardou pelo menos 30 minutos?
- ✅ Copiou o valor completo (sem aspas)?
- ✅ Usou `@` ou `lonclinic.com` como nome?
- ✅ Verificou com `nslookup` se o registro existe?

### **"Não consigo encontrar DNS"**
- Verifique qual é o seu provedor de domínio
- Procure por "DNS", "DNS Records", "Zone File" no painel
- Se não encontrar, entre em contato com o suporte do provedor

### **"Já existe um registro TXT"**
- Você pode ter múltiplos registros TXT
- Adicione um novo registro (não substitua o existente)
- Ou edite o existente e adicione o valor do Google em uma nova linha

---

## 🎯 Após Verificação Bem-Sucedida

1. ✅ Domínio verificado no Google Search Console
2. 📤 Submeta o sitemap: `sitemap.xml`
3. 🔍 Solicite indexação manual das páginas principais
4. ⏱️ Aguarde 3-7 dias para primeira indexação

---

## 📞 Precisa de Ajuda?

Se não souber qual é o seu provedor de domínio:

1. Acesse: https://whois.net/
2. Digite: `lonclinic.com`
3. Procure por **"Registrar"** ou **"Name Server"**
4. Isso mostrará onde o domínio está registrado

---

**Boa sorte! 🚀**
