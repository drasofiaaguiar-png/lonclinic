# Como Configurar DNS para Private Email no Namecheap

## 📋 Registros DNS Necessários

Você precisa adicionar estes 3 registros DNS:

1. **MX Record 1:**
   - Hostname: `@`
   - Record type: `MX`
   - Priority: `10`
   - Value: `mx1.privateemail.com`

2. **MX Record 2:**
   - Hostname: `@`
   - Record type: `MX`
   - Priority: `10`
   - Value: `mx2.privateemail.com`

3. **TXT Record (SPF):**
   - Hostname: `@`
   - Record type: `TXT`
   - Value: `v=spf1 include:spf.privateemail.com ~all`

---

## 🔧 Passo a Passo no Namecheap

### 1. Acessar Advanced DNS

1. Acesse [namecheap.com](https://www.namecheap.com)
2. Faça login
3. Vá em **Domain List** (menu lateral)
4. Clique em **"Manage"** ao lado de `lonclinic.com`
5. Clique na aba **"Advanced DNS"** (no topo)

### 2. Adicionar MX Record 1

1. Role até a seção **"Mail Settings"** ou **"Host Records"**
2. Clique em **"Add New Record"**
3. Configure:
   - **Type:** Selecione `MX Record`
   - **Host:** Digite `@` (ou deixe em branco se não tiver campo Host)
   - **Value:** Digite `mx1.privateemail.com`
   - **Priority:** Digite `10`
   - **TTL:** Selecione `Automatic` ou `30 min`
4. Clique no ícone **✓ (checkmark)** para salvar

### 3. Adicionar MX Record 2

1. Clique em **"Add New Record"** novamente
2. Configure:
   - **Type:** Selecione `MX Record`
   - **Host:** Digite `@` (ou deixe em branco)
   - **Value:** Digite `mx2.privateemail.com`
   - **Priority:** Digite `10`
   - **TTL:** Selecione `Automatic`
3. Clique no **✓** para salvar

### 4. Adicionar TXT Record (SPF)

1. Clique em **"Add New Record"** novamente
2. Configure:
   - **Type:** Selecione `TXT Record`
   - **Host:** Digite `@` (ou deixe em branco)
   - **Value:** Digite `v=spf1 include:spf.privateemail.com ~all`
   - **TTL:** Selecione `Automatic`
3. Clique no **✓** para salvar

---

## ✅ Verificar

Após adicionar os 3 registros, você deve ver:

```
Type        Host    Value                              Priority
MX Record   @       mx1.privateemail.com               10
MX Record   @       mx2.privateemail.com               10
TXT Record  @       v=spf1 include:spf.privateemail.com ~all
```

---

## ⏰ Aguardar Propagação

- **Tempo esperado:** Até 4 horas (geralmente 30-60 minutos)
- **Como verificar:** Use [whatsmydns.net](https://www.whatsmydns.net)
  1. Selecione "MX" no menu
  2. Digite `lonclinic.com`
  3. Veja se os registros aparecem

---

## 🚀 Depois que Propagar

Após os registros DNS propagarem (até 4 horas):

1. **Volte ao painel do Namecheap**
2. **Acesse Private Email** novamente
3. **Agora você poderá:**
   - Criar a caixa de email `info@lonclinic.com`
   - Ver as configurações SMTP
   - Obter as credenciais para configurar no Railway/Render

---

## 📧 Configurações SMTP (Depois que Email Estiver Ativo)

Quando o email estiver funcionando, as configurações SMTP serão:

```
EMAIL_HOST=mail.privateemail.com
EMAIL_PORT=587
EMAIL_USER=info@lonclinic.com
EMAIL_PASS=sua_senha_do_email
EMAIL_FROM=Longevity Clinic <info@lonclinic.com>
```

---

## 💡 Dica

Enquanto aguarda a propagação DNS (até 4 horas), você pode:
- Usar Gmail temporariamente para testar
- Depois mudar para `info@lonclinic.com` quando estiver pronto

---

## ❓ Problemas?

### Não consigo adicionar os registros?
- Verifique se está na aba "Advanced DNS"
- Certifique-se de que não há registros MX antigos (remova primeiro)
- Tente limpar o cache do navegador

### Registros não aparecem após salvar?
- Recarregue a página (F5)
- Verifique se clicou no ✓ para salvar
- Aguarde alguns minutos e verifique novamente

---

**Adicione os 3 registros DNS e me avise quando terminar!** Depois aguardamos a propagação e configuramos o SMTP. 🚀
