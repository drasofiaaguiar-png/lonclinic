# Segurança de dados clínicos

O site **não pede dados de saúde** (medicação, alergias, SNS, sintomas) no checkout. A marcação pública pede **email e telefone**. A ficha clínica é discutida na consulta, não num formulário web.

## Estado actual

- Autenticação de staff: sessão httpOnly + bcrypt + 2FA TOTP obrigatório + papéis admin/clínico
- Persistência: PostgreSQL obrigatória em produção (`DATABASE_URL`)
- Encriptação ao nível do campo: notas clínicas, IBAN, cartão de cidadão e intake legado (AES-256-GCM)
- Pagamentos: Stripe Checkout; metadata só com dados de marcação (serviço, data, contacto)
- Videochamada: URL Doxy.me só no portal do paciente (email + referência) ou no portal clínico autenticado
- Sessões: Postgres (`connect-pg-simple`); cookie `secure`, `httpOnly`, `sameSite=lax`
- CSP: nonce por pedido em `<script>`; `script-src` sem `'unsafe-inline'`
- Auditoria: acessos a marcações/notas clínicas são registados em `audit_log`

## O que continua fora do site

Dados clínicos (sintomas, medicação, alergias, SNS) **não** são recolhidos no browser nem enviados ao Stripe. Notas clínicas escritas pelo profissional ficam na base de dados, visíveis só à conta com acesso a essa marcação.
