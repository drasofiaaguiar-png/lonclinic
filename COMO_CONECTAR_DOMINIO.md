# Como Conectar Seu Domínio — Guia em Português

## Passo a Passo Completo

### 1️⃣ Primeiro: Fazer Deploy do Site

Você precisa fazer o deploy do site em uma plataforma de hospedagem antes de conectar o domínio.

#### Opção A: Railway (Mais Fácil - Recomendado)
1. Acesse [railway.app](https://railway.app) e crie uma conta
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Conecte sua conta do GitHub
4. Selecione o repositório: `drasofiaaguiar-png/lonclinic`
5. O Railway vai fazer o deploy automaticamente

#### Opção B: Render (Tem Plano Grátis)
1. Acesse [render.com](https://render.com) e crie uma conta
2. Clique em "New +" → "Web Service"
3. Conecte sua conta do GitHub
4. Selecione o repositório
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Clique em "Create Web Service"

---

### 2️⃣ Adicionar Variáveis de Ambiente

Depois do deploy, adicione as variáveis de ambiente na plataforma:

**No Railway:**
- Vá em Settings → Variables
- Adicione todas as variáveis do arquivo `ENV_SETUP.txt`

**No Render:**
- Vá em Environment
- Adicione as mesmas variáveis

---

### 3️⃣ Adicionar Domínio na Plataforma

#### Se estiver usando Railway:
1. Vá em **Settings** → **Domains**
2. Clique em **"Add Domain"**
3. Digite seu domínio (ex: `seuclinica.com`)
4. O Railway vai mostrar os registros DNS que você precisa adicionar

#### Se estiver usando Render:
1. Vá em **Settings** → **Custom Domains**
2. Clique em **"Add"**
3. Digite seu domínio
4. Siga as instruções de DNS que aparecerem

---

### 4️⃣ Configurar DNS no Registrador do Domínio

Agora você precisa ir onde comprou o domínio e adicionar os registros DNS.

#### Onde encontrar as configurações de DNS:

**Namecheap:**
1. Faça login → Domain List
2. Clique em "Manage" ao lado do seu domínio
3. Vá na aba "Advanced DNS"
4. Adicione os registros lá

**GoDaddy:**
1. Faça login → My Products
2. Clique em "DNS" ao lado do seu domínio
3. Vá em DNS Management
4. Adicione os registros

**Cloudflare:**
1. Faça login → Selecione seu domínio
2. Vá em "DNS" → "Records"
3. Adicione os registros

**Registro.br / Outros:**
1. Faça login no painel
2. Procure por "DNS" ou "Zona DNS"
3. Adicione os registros fornecidos pela plataforma

---

### 5️⃣ Tipos de Registros DNS

#### Para Railway:

**Opção 1: CNAME para www**
```
Tipo: CNAME
Nome: www
Valor: seu-app.up.railway.app
TTL: 3600
```

**Opção 2: Registro A para domínio raiz (@)**
```
Tipo: A
Nome: @ (ou deixe em branco)
Valor: [IP que o Railway fornecerá]
TTL: 3600
```

#### Para Render:

```
Tipo: CNAME
Nome: www
Valor: seu-app.onrender.com
TTL: 3600
```

**Para o domínio raiz (@):**
- Alguns registradores permitem CNAME no @ (chamado "CNAME flattening")
- Outros precisam de registro A com IP fornecido pelo Render

---

### 6️⃣ Aguardar Propagação DNS

- Geralmente leva **5-30 minutos**
- Pode levar até 48 horas (raro)
- Verifique o status em: [whatsmydns.net](https://www.whatsmydns.net)

---

### 7️⃣ Certificado SSL

A maioria das plataformas fornece certificado SSL automaticamente após configurar o DNS. Seu site ficará acessível via `https://seudominio.com` automaticamente.

---

## Exemplo Prático Completo

### Cenário: Domínio `longevityclinic.com` no Railway

1. **No Railway:**
   - Settings → Domains → Add Domain
   - Digite: `longevityclinic.com`
   - Railway mostra: `seu-app.up.railway.app` e um IP

2. **No Registrador (ex: Namecheap):**
   - Advanced DNS → Add New Record
   - Registro 1:
     - Tipo: CNAME
     - Host: www
     - Value: seu-app.up.railway.app
     - TTL: Automatic
   - Registro 2:
     - Tipo: A
     - Host: @
     - Value: [IP do Railway]
     - TTL: Automatic

3. **Aguardar 10-30 minutos**

4. **Testar:**
   - Acesse `https://www.longevityclinic.com`
   - Acesse `https://longevityclinic.com`

---

## Resolução de Problemas

### Domínio não funciona após 30 minutos?

1. **Verifique propagação DNS:**
   - Acesse [whatsmydns.net](https://www.whatsmydns.net)
   - Digite seu domínio
   - Veja se os registros DNS estão propagados globalmente

2. **Verifique os registros:**
   - Confirme que os valores estão exatamente como a plataforma forneceu
   - Verifique se não há espaços extras
   - Confirme que o TTL está configurado

3. **Verifique na plataforma:**
   - Confirme que o domínio está adicionado no Railway/Render
   - Veja se o status mostra "Active" ou "Configured"
   - Verifique os logs de deploy

### Erros de SSL?

- Aguarde mais alguns minutos (SSL pode levar 5-10 minutos após DNS)
- Confirme que o DNS está totalmente propagado
- Verifique se a plataforma mostra o domínio como "Active"

### Domínio mostra "Not configured"?

- Verifique se os registros DNS correspondem exatamente ao que a plataforma forneceu
- Certifique-se de que o TTL está definido (não deixe em branco)
- Tente remover e readicionar o domínio na plataforma

---

## Precisa de Ajuda?

**Qual é o seu registrador de domínio?** Posso dar instruções específicas para:
- Namecheap
- GoDaddy
- Cloudflare
- Registro.br
- Google Domains
- Outros

**Qual plataforma de hospedagem você está usando?** Posso ajudar com:
- Railway
- Render
- DigitalOcean
- Outros

---

## Checklist Rápido

- [ ] Site deployado no Railway/Render
- [ ] Variáveis de ambiente configuradas
- [ ] Domínio adicionado na plataforma
- [ ] Registros DNS adicionados no registrador
- [ ] Aguardou 10-30 minutos para propagação
- [ ] Testou acesso via `https://seudominio.com`
- [ ] SSL funcionando (cadeado verde no navegador)
