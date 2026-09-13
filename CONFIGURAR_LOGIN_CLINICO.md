# Como configurar o login de administração

Há dois portais:

- **`/admin`** — administração (utilizador + password + 2FA TOTP)
- **`/profissional`** — profissionais (Rita, psicólogos, nutricionistas): **email + código OTP**. Não há password de portal clínico.

## Variáveis necessárias

Defina no Railway (ou no `.env` local):

1. **CLINIC_USERNAME** — utilizador administrador
2. **CLINIC_PASSWORD** — palavra-passe do administrador (forte, única, nunca no repositório)
3. **SESSION_SECRET** — chave aleatória longa para sessões (obrigatória)
4. **CLINICAL_ENCRYPTION_KEY** — chave dedicada para encriptar notas, IBAN, intake e resultados de quizzes. Em produção deve ser distinta de `SESSION_SECRET`.

O login de `/admin` exige **2FA (TOTP)**. No primeiro acesso após a password, o site mostra um código secreto para a aplicação autenticadora. Guarde os códigos de recuperação — cada um só pode ser usado uma vez.

---

## Railway / Render

Em **Variables** / **Environment**, adicione as chaves acima. Os valores devem ser gerados por si — o servidor **não arranca** com credenciais vazias e **não existem valores por omissão**.

Gere o `SESSION_SECRET` e a `CLINICAL_ENCRYPTION_KEY` com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use uma password longa (mínimo 12 caracteres), com letras, números e símbolos. Não commite `.env`.

---

## Verificação

1. Faça deploy
2. Abra `/admin`
3. Entre com `CLINIC_USERNAME` / `CLINIC_PASSWORD` e complete o 2FA

O portal do paciente (`/patient-portal`) é independente e usa um código OTP enviado por email. Os profissionais entram em `/profissional` com o mesmo tipo de código (email + OTP), não com password.

---

## Segurança adicional

- HTTPS obrigatório
- Rate limiting no login
- 2FA TOTP + códigos de recuperação (128 bits)
- Sessões com timeout de inactividade de 30 minutos
- Encriptação AES-256-GCM de campos clínicos
