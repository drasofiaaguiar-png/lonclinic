# Segurança de dados clínicos

O site **não pede dados de saúde** (medicação, alergias, SNS, sintomas) no checkout. A marcação pública pede **email e telefone**. A ficha clínica é discutida na consulta, não num formulário web.

## Estado actual

- Autenticação de staff: só `/admin` (sessão httpOnly + bcrypt + 2FA TOTP + papéis). Não existe portal clínico autónomo.
- Autenticação de paciente: OTP por email; sessão httpOnly (20 min) com timeout de inactividade de 30 min
- Persistência: PostgreSQL obrigatória em produção (`DATABASE_URL`)
- Encriptação ao nível do campo: notas clínicas, IBAN, cartão de cidadão, intake legado e **respostas/resultados de quizzes** (AES-256-GCM). Preferir `CLINICAL_ENCRYPTION_KEY` dedicada; `SESSION_SECRET` só como fallback de leitura/escrita se a chave dedicada ainda não existir
- Pagamentos: Stripe Checkout; o preço e o desconto são resolvidos no servidor; `hasInsurance` do cliente não altera o preço
- Confirmação de pagamento: token opaco (`/api/confirmation/:token`), sem `session_id` Stripe no URL
- Videochamada: URL Doxy.me só depois de sala atribuída ao profissional (fail-closed; sem sala partilhada por omissão)
- Sessões: Postgres (`connect-pg-simple`); cookie `secure`, `httpOnly`, `sameSite=lax`; idle timeout 30 min em sessões autenticadas
- CSP: nonce por pedido em `<script>` e `<style>`; `script-src` sem `'unsafe-inline'`
- Auditoria: finanças, CV, apagar/exportar, convites e acções de portal em `audit_log`
- Retenção: quizzes não reclamados são apagados após 30 dias; pedidos de apagamento RGPD em `deletion_requests`
- Logs: emails e telefones são redigidos

## O que continua fora do site

Dados clínicos (sintomas, medicação, alergias, SNS) **não** são recolhidos no browser nem enviados ao Stripe. Notas clínicas escritas pelo profissional ficam na base de dados, visíveis só à conta de administração com acesso a essa marcação.

## Subprocessadores

- Stripe (pagamentos)
- Resend ou SMTP configurado (email transaccional)
- Doxy.me (videochamada)
- Railway / Postgres (alojamento e base de dados)
- Google Fonts (tipografia pública; sem tracking clínico)
