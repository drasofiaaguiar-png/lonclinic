# Como Configurar Email de Contato para Pacientes

## Onde o Email Aparece

O email de contato aparece em:
- Footer do site principal (`index.html`)
- Footer da página de Travel Medicine (`travel.html`)
- Emails de confirmação enviados pelo sistema (`server.js`)

Atualmente configurado como: `info@lonclinic.com`

---

## Opções de Email

### Opção 1: Email com Seu Domínio (Recomendado - Mais Profissional)

**Exemplo:** `hello@lonclinic.com` ou `contato@lonclinic.com`

**Vantagens:**
- Mais profissional
- Usa seu próprio domínio
- Melhor para branding

**Como configurar:**
1. **Criar email no seu provedor de hospedagem:**
   - Se usar Namecheap: Email Hosting
   - Se usar Google Workspace: Criar conta
   - Se usar outro: Verificar com seu provedor

2. **Ou usar redirecionamento:**
   - Configure para redirecionar `hello@lonclinic.com` para seu email pessoal
   - Mais fácil de configurar

### Opção 2: Gmail Pessoal (Mais Simples)

**Exemplo:** `seuemail@gmail.com`

**Vantagens:**
- Já tem conta
- Fácil de acessar
- Não precisa configurar nada

**Desvantagens:**
- Menos profissional
- Não usa seu domínio

---

## Como Atualizar o Email no Site

Depois que você me disser qual email quer usar, eu atualizo automaticamente em todos os lugares:

1. `index.html` - Footer
2. `travel.html` - Footer  
3. `server.js` - Emails de confirmação

---

## Configuração Recomendada

**Para começar rápido:**
- Use seu Gmail pessoal temporariamente
- Depois configure um email profissional com seu domínio

**Para produção:**
- Configure `hello@lonclinic.com` ou similar
- Use Google Workspace ou email hosting do Namecheap

---

## Qual Email Você Quer Usar?

Me diga qual email você quer e eu atualizo tudo automaticamente!

Exemplos:
- `hello@lonclinic.com`
- `contato@lonclinic.com`
- `info@lonclinic.com`
- `seuemail@gmail.com`
