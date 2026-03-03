# Como Configurar DNS no Namecheap — Guia Passo a Passo

## Instruções Detalhadas para Namecheap

### 1️⃣ Acessar o Painel do Namecheap

1. Acesse [namecheap.com](https://www.namecheap.com)
2. Faça login na sua conta
3. Clique em **"Domain List"** no menu lateral esquerdo
4. Encontre seu domínio na lista
5. Clique no botão **"Manage"** ao lado do domínio

---

### 2️⃣ Ir para Advanced DNS

1. Na página de gerenciamento do domínio, você verá várias abas
2. Clique na aba **"Advanced DNS"** (no topo da página)
3. Você verá uma seção chamada **"Host Records"**

---

### 3️⃣ Adicionar Registros DNS

Você precisa adicionar registros baseado na plataforma que está usando:

#### Se estiver usando Railway:

**Registro 1: CNAME para www**
1. Role até a seção "Host Records"
2. Clique em **"Add New Record"**
3. Configure:
   - **Type:** Selecione `CNAME Record`
   - **Host:** Digite `www`
   - **Value:** Digite o valor fornecido pelo Railway (ex: `seu-app.up.railway.app`)
   - **TTL:** Selecione `Automatic` ou `30 min`
4. Clique no ícone de **✓ (checkmark)** para salvar

**Registro 2: A Record para domínio raiz (@)**
1. Clique em **"Add New Record"** novamente
2. Configure:
   - **Type:** Selecione `A Record`
   - **Host:** Digite `@` (isso representa o domínio raiz)
   - **Value:** Digite o **IP address** fornecido pelo Railway
   - **TTL:** Selecione `Automatic` ou `30 min`
3. Clique no ícone de **✓ (checkmark)** para salvar

#### Se estiver usando Render:

**Registro 1: CNAME para www**
1. Clique em **"Add New Record"**
2. Configure:
   - **Type:** `CNAME Record`
   - **Host:** `www`
   - **Value:** O valor fornecido pelo Render (ex: `seu-app.onrender.com`)
   - **TTL:** `Automatic`
3. Salve com ✓

**Registro 2: A Record para @ (se necessário)**
- O Render pode fornecer um IP para o domínio raiz
- Siga as mesmas instruções do Railway acima

---

### 4️⃣ Exemplo Visual

Aqui está como deve ficar na interface do Namecheap:

```
Host Records:
┌──────────┬──────────┬─────────────────────────────┬──────────┐
│ Type     │ Host     │ Value                        │ TTL      │
├──────────┼──────────┼─────────────────────────────┼──────────┤
│ CNAME    │ www      │ seu-app.up.railway.app       │ Automatic│
│ A Record │ @        │ 35.123.45.67                 │ Automatic│
└──────────┴──────────┴─────────────────────────────┴──────────┘
```

---

### 5️⃣ Remover Registros Antigos (se houver)

Se você já tem registros DNS configurados que não precisa mais:

1. Encontre o registro antigo na lista
2. Clique no ícone de **lixeira (trash)** ao lado dele
3. Confirme a exclusão

**Importante:** Não remova registros que você não tem certeza do que fazem, especialmente:
- Registros de email (MX records)
- Registros SPF/DKIM (para email)
- Outros registros importantes

---

### 6️⃣ Verificar e Salvar

1. Revise todos os registros que você adicionou
2. Certifique-se de que os valores estão corretos (sem espaços extras)
3. Os registros são salvos automaticamente quando você clica no ✓

---

### 7️⃣ Aguardar Propagação

- **Tempo esperado:** 5-30 minutos
- **Máximo:** Pode levar até 48 horas (raro)

**Como verificar se funcionou:**
1. Acesse [whatsmydns.net](https://www.whatsmydns.net)
2. Digite seu domínio
3. Veja se os registros DNS aparecem corretamente em diferentes locais do mundo

---

## Troubleshooting no Namecheap

### O registro não aparece após salvar?
- Recarregue a página (F5)
- Verifique se você clicou no ✓ para salvar
- Certifique-se de que não há erros de digitação

### Erro ao adicionar registro?
- Verifique se o valor está correto (sem http:// ou https://)
- Para CNAME, não inclua o domínio completo, apenas o subdomínio da plataforma
- Certifique-se de que o TTL está configurado

### Domínio não funciona após 30 minutos?
1. Verifique se os registros estão salvos corretamente
2. Use [whatsmydns.net](https://www.whatsmydns.net) para verificar propagação
3. Verifique na plataforma (Railway/Render) se o domínio está ativo
4. Limpe o cache do navegador e tente novamente

---

## Checklist Namecheap

- [ ] Fez login no Namecheap
- [ ] Acessou Domain List → Manage
- [ ] Abriu a aba Advanced DNS
- [ ] Adicionou registro CNAME para www
- [ ] Adicionou registro A para @ (se necessário)
- [ ] Verificou que os valores estão corretos
- [ ] Salvou os registros (clicou no ✓)
- [ ] Aguardou 10-30 minutos
- [ ] Testou acesso ao domínio

---

## Dicas Importantes

1. **Não use @ no CNAME:** Namecheap não permite CNAME no domínio raiz (@). Use A Record com IP.

2. **TTL:** Deixe em "Automatic" para propagação mais rápida.

3. **Propagação:** Pode levar tempo. Seja paciente e verifique periodicamente.

4. **SSL:** O certificado SSL será ativado automaticamente pela plataforma após o DNS propagar.

5. **Backup:** Anote os valores dos registros antes de alterar, caso precise reverter.

---

## Precisa de Ajuda?

Se tiver problemas:
1. Tire um screenshot da tela de DNS do Namecheap
2. Verifique os valores fornecidos pela plataforma (Railway/Render)
3. Compare com os exemplos acima

**Lembre-se:** O domínio precisa estar deployado na plataforma ANTES de configurar o DNS!
