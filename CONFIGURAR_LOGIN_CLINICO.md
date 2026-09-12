# Como Configurar o Login do Portal Clínico

## 🔐 Configuração de Credenciais

O sistema de login do portal clínico usa variáveis de ambiente para as credenciais.

### Variáveis Necessárias

Adicione estas variáveis no Railway/Render:

1. **CLINIC_USERNAME** - Nome de utilizador para o portal clínico
2. **CLINIC_PASSWORD** - Palavra-passe para o portal clínico
3. **SESSION_SECRET** - Chave secreta para as sessões (obrigatório em produção)
4. **CLINICAL_ENCRYPTION_KEY** (opcional) - Chave para encriptar notas clínicas, IBAN e dados de intake em disco. Se não existir, usa-se um derivado de `SESSION_SECRET`.

O login do portal clínico e do admin exige **2FA (TOTP)**. No primeiro acesso após a password, o site mostra um código secreto para a aplicação autenticadora (Google Authenticator, Authy, etc.). Guarde os códigos de recuperação — cada um só pode ser usado uma vez.

---

## 📋 Passo a Passo

### Railway

1. Acesse seu projeto no Railway
2. Vá em **"Variables"**
3. Clique em **"+ New Variable"**
4. Adicione:

   **Key:** `CLINIC_USERNAME`  
   **Value:** `seu_usuario` (ex: `admin`, `medico`, etc.)

5. Clique em **"Add"**
6. Repita para:

   **Key:** `CLINIC_PASSWORD`  
   **Value:** `sua_senha_segura` (use uma senha forte!)

7. Adicione também:

   **Key:** `SESSION_SECRET`  
   **Value:** `uma_chave_secreta_aleatoria_muito_longa` (ex: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Render

1. Acesse seu serviço no Render
2. Vá em **"Environment"**
3. Clique em **"Add Environment Variable"**
4. Adicione as mesmas variáveis acima

---

## ⚠️ IMPORTANTE: Segurança

### Senha Forte

Use uma senha forte para `CLINIC_PASSWORD`:
- Mínimo 12 caracteres
- Misture letras maiúsculas, minúsculas, números e símbolos
- Não use palavras comuns ou informações pessoais

Exemplo de senha forte: `K9#mP2$vL8@xQ4!`

### SESSION_SECRET

A `SESSION_SECRET` deve ser:
- Uma string aleatória longa (mínimo 32 caracteres)
- Única para cada instalação
- Mantida em segredo (nunca commitar no código)

Pode gerar uma com:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔄 Sem valores por omissão

O servidor **não arranca** sem `CLINIC_USERNAME`, `CLINIC_PASSWORD` e `SESSION_SECRET`. Não existem credenciais padrão. Gere o secret com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Verificação

Após adicionar as variáveis:

1. Faça deploy da aplicação
2. Acesse `/clinic.html`
3. Deve aparecer a tela de login
4. Use as credenciais configuradas
5. Deve conseguir aceder ao portal clínico

---

## 🔒 Segurança Adicional (Recomendado)

Para maior segurança em produção:

1. **HTTPS obrigatório** - Configure SSL/TLS
2. **Rate limiting** - Limite tentativas de login
3. **2FA** - Obrigatório no login clínico e admin (TOTP + códigos de recuperação)
4. **Logs de acesso** - Monitore tentativas de login
5. **Timeout de sessão** - Sessões expiram após 8 horas
6. **Encriptação de campos** - Notas clínicas, IBAN e intake são gravados com AES-256-GCM

---

## 📝 Notas

- As sessões são válidas por 8 horas
- Todas as tentativas de login são registadas nos logs do servidor
- O logout destrói a sessão imediatamente
- As rotas da API clínica são protegidas e requerem autenticação

---

**Configure as variáveis e faça deploy para ativar o sistema de login!** 🔐
