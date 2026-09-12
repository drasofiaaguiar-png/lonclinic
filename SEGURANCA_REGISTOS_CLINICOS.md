# Segurança dos registos clínicos

Os registos clínicos (notas, diagnóstico, prescrições) são escritos **apenas no portal autenticado** do profissional, nunca num formulário público.

- Acesso: sessão staff (`requireAuth`) e filtro por profissional
- Persistência: PostgreSQL obrigatória em produção
- Auditoria: `audit_log` regista leitura de marcações e gravação de notas
- O site público pede só email e telefone na marcação; dados de saúde discutem-se na consulta
