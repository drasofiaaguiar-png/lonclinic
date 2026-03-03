# Configuração de Email — Guia Completo

## Emails Usados no Sistema

### 1. Email de Contato (Mostrado no Site)
- **Email:** `hello@longevityclinic.com`
- **Onde aparece:** Footer do site, páginas de contato
- **Uso:** Para clientes entrarem em contato com você

### 2. Email de Envio (Confirmações Automáticas)
- **Email:** Configurado via variáveis de ambiente
- **Uso:** Sistema envia confirmações de agendamento automaticamente
- **Padrão:** `noreply@longevityclinic.com` (mas você pode usar qualquer email)

---

## Como Configurar o Email de Envio

### Opção 1: Gmail (Mais Fácil - Recomendado)

#### Passo 1: Criar App Password no Gmail

1. Acesse [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Faça login na sua conta Gmail
3. Se não aparecer, ative a **Verificação em duas etapas** primeiro
4. Selecione:
   - **App:** Mail
   - **Device:** Other (Custom name)
   - **Name:** Longevity Clinic
5. Clique em **Generate**
6. **Copie a senha gerada** (16 caracteres, sem espaços)

#### Passo 2: Configurar Variáveis de Ambiente

No Railway/Render, adicione estas variáveis:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=Longevity Clinic <seu-email@gmail.com>
```

**Importante:**
- `EMAIL_USER`: Seu email Gmail completo
- `EMAIL_PASS`: A senha de app gerada (16 caracteres)
- `EMAIL_FROM`: Nome que aparece nos emails enviados

#### Exemplo:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=dr.sofia@longevityclinic.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Longevity Clinic <dr.sofia@longevityclinic.com>
```

---

### Opção 2: SendGrid (Profissional - Grátis até 100 emails/dia)

#### Passo 1: Criar Conta SendGrid

1. Acesse [sendgrid.com](https://sendgrid.com)
2. Crie uma conta gratuita
3. Vá em **Settings** → **API Keys**
4. Clique em **Create API Key**
5. Dê um nome (ex: "Longevity Clinic")
6. Selecione **Full Access** ou **Mail Send**
7. **Copie a API Key** (você só verá uma vez!)

#### Passo 2: Configurar Variáveis

```
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=sua-api-key-do-sendgrid
EMAIL_FROM=Longevity Clinic <noreply@longevityclinic.com>
```

**Nota:** O `EMAIL_USER` sempre é `apikey` para SendGrid.

---

### Opção 3: Mailgun (Grátis até 5.000 emails/mês)

1. Crie conta em [mailgun.com](https://www.mailgun.com)
2. Vá em **Sending** → **Domain Settings**
3. Use as credenciais SMTP fornecidas
4. Configure as variáveis:

```
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@seudominio.mailgun.org
EMAIL_PASS=sua-senha-smtp
EMAIL_FROM=Longevity Clinic <noreply@longevityclinic.com>
```

---

## Qual Email Usar?

### Para EMAIL_USER (conta que envia):
- Pode ser qualquer email que você tenha acesso
- Gmail é mais fácil de configurar
- SendGrid/Mailgun são mais profissionais

### Para EMAIL_FROM (nome que aparece):
- Use um email profissional relacionado ao seu domínio
- Exemplo: `Longevity Clinic <noreply@longevityclinic.com>`
- Ou: `Longevity Clinic <hello@longevityclinic.com>`

### Para email de contato no site:
- Atualmente: `hello@longevityclinic.com`
- Você pode mudar nos arquivos HTML se quiser

---

## Verificar se Está Funcionando

### No Railway/Render:
1. Vá nos logs do servidor
2. Procure por: `✉️ Email transport verified and ready`
3. Se aparecer, está funcionando!

### Testar Envio:
1. Faça um agendamento de teste
2. Verifique se o email de confirmação chegou
3. Verifique a pasta de spam se não aparecer

---

## Exemplo Completo - Gmail

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=dr.sofia.aguiar@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Longevity Clinic <dr.sofia.aguiar@gmail.com>
```

**Lembre-se:**
- Use App Password do Gmail, não sua senha normal
- Ative verificação em duas etapas primeiro
- A senha de app tem 16 caracteres (com ou sem espaços)

---

## Mudar Email de Contato no Site

Se quiser mudar o email `hello@longevityclinic.com` que aparece no site:

1. Edite `index.html` e `travel.html`
2. Procure por: `hello@longevityclinic.com`
3. Substitua pelo seu email desejado

---

## Troubleshooting

### Email não está sendo enviado?
- Verifique se as variáveis estão configuradas corretamente
- Confirme que a senha de app está correta (Gmail)
- Verifique os logs do servidor para erros
- Teste com um email diferente

### Gmail bloqueando?
- Certifique-se de usar App Password, não senha normal
- Verifique se a verificação em duas etapas está ativa
- Pode levar alguns minutos para ativar

### Emails indo para spam?
- Use um serviço profissional (SendGrid/Mailgun)
- Configure SPF/DKIM records no DNS (para domínio próprio)
- Use um email com seu próprio domínio

---

## Recomendação

**Para começar rápido:** Use Gmail com App Password
**Para produção profissional:** Use SendGrid ou Mailgun

Qual você prefere configurar?
