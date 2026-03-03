# Troubleshooting — Site Não Carrega em https://lonclinic.com/

## Problemas Comuns e Soluções

### 1. Verificar se o Servidor Está Rodando

**No Railway:**
1. Vá no dashboard do Railway
2. Clique no seu projeto
3. Vá em **"Deployments"** ou **"Metrics"**
4. Verifique se há um deploy ativo e rodando
5. Veja os logs para erros

**No Render:**
1. Vá no dashboard do Render
2. Clique no seu serviço
3. Veja a aba **"Logs"**
4. Verifique se o servidor iniciou corretamente

**O que procurar nos logs:**
```
🏥 Longevity Clinic server running on http://localhost:3000
```
Se não aparecer, há um problema no servidor.

---

### 2. Verificar DNS

O DNS pode não ter propagado ainda:

1. Acesse [whatsmydns.net](https://www.whatsmydns.net)
2. Digite: `lonclinic.com`
3. Veja se os registros DNS aparecem corretamente

**Se não aparecer:**
- Aguarde mais 30 minutos
- Verifique os registros DNS no Namecheap
- Confirme que os valores estão corretos

---

### 3. Verificar SSL/HTTPS

**Sintomas:**
- Site não carrega
- Erro de certificado SSL
- Aviso de "não seguro"

**Solução:**
- Aguarde 5-10 minutos após configurar DNS
- O SSL é provisionado automaticamente
- Verifique na plataforma se o SSL está ativo

---

### 4. Verificar Variáveis de Ambiente

**Problema:** Servidor pode não estar iniciando por falta de variáveis

**Verifique no Railway/Render:**
- Todas as variáveis estão configuradas?
- Não há erros de sintaxe?
- As variáveis estão salvas corretamente?

**Variáveis essenciais:**
- `PORT` (geralmente automático)
- `STRIPE_SECRET_KEY` (pode estar vazio, mas pode causar problemas)
- Outras variáveis opcionais

---

### 5. Verificar Rota da Raiz

**Problema:** Site pode não estar servindo `index.html` na raiz

**Solução:** Já adicionada no código - rota explícita para `/`

Se ainda não funcionar, verifique:
- O arquivo `index.html` existe?
- O servidor está servindo arquivos estáticos?

---

### 6. Verificar Erros no Console do Navegador

1. Abra o site no navegador
2. Pressione `F12` para abrir DevTools
3. Vá na aba **Console**
4. Veja se há erros em vermelho

**Erros comuns:**
- `Failed to load resource` - arquivo não encontrado
- `CORS error` - problema de CORS
- `404 Not Found` - rota não existe

---

### 7. Verificar Porta e URL

**Problema:** Servidor pode estar rodando em porta errada

**Verifique:**
- Railway/Render geralmente define `PORT` automaticamente
- O servidor deve escutar na porta fornecida pela plataforma
- Não force uma porta específica

---

### 8. Testar Localmente Primeiro

Antes de verificar o domínio, teste localmente:

```bash
npm install
npm start
```

Depois acesse: `http://localhost:3000`

Se funcionar localmente, o problema é no deploy ou DNS.

---

### 9. Verificar Deploy

**No Railway:**
1. Vá em **Deployments**
2. Veja o último deploy
3. Clique para ver os logs
4. Verifique se há erros de build

**No Render:**
1. Vá em **Events**
2. Veja o histórico de deploys
3. Verifique se o build foi bem-sucedido

**Erros comuns:**
- `npm install` falhou
- Dependências faltando
- Erro de sintaxe no código

---

### 10. Verificar Arquivo index.html

**Problema:** O arquivo pode não estar sendo servido

**Verifique:**
1. O arquivo `index.html` existe na raiz do projeto?
2. Está commitado no GitHub?
3. Está sendo incluído no deploy?

---

## Checklist de Diagnóstico

- [ ] Servidor está rodando? (verifique logs)
- [ ] DNS propagou? (whatsmydns.net)
- [ ] SSL está ativo? (verifique na plataforma)
- [ ] Variáveis de ambiente configuradas?
- [ ] Deploy foi bem-sucedido?
- [ ] Não há erros no console do navegador?
- [ ] Arquivo index.html existe?
- [ ] Testou localmente primeiro?

---

## Comandos Úteis para Debug

### Verificar se o site responde:
```bash
curl https://lonclinic.com
```

### Verificar DNS:
```bash
nslookup lonclinic.com
```

### Verificar SSL:
```bash
openssl s_client -connect lonclinic.com:443
```

---

## Próximos Passos

Se nenhuma das soluções acima funcionar:

1. **Verifique os logs da plataforma** (Railway/Render)
2. **Teste localmente** para isolar o problema
3. **Verifique o DNS** novamente
4. **Entre em contato com o suporte** da plataforma se necessário

---

## O Que Foi Corrigido

Adicionei uma rota explícita no `server.js` para servir `index.html` na raiz:

```javascript
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
```

Isso garante que quando alguém acessa `https://lonclinic.com/`, o `index.html` será servido corretamente.

**Próximo passo:** Faça commit e push dessa alteração para o GitHub, e a plataforma fará um novo deploy automaticamente.
