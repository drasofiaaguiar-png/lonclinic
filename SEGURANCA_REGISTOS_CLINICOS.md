# Segurança dos Registos Clínicos

## ⚠️ Estado Atual

**IMPORTANTE:** O sistema atual utiliza armazenamento **em memória** (in-memory storage), o que significa:

### ❌ Limitações de Segurança Atuais:

1. **Dados não persistem** - Se o servidor reiniciar, todos os registos clínicos são perdidos
2. **Sem encriptação** - Os dados estão armazenados em texto simples na memória
3. **Sem autenticação** - Qualquer pessoa com acesso ao portal pode ver/editar registos
4. **Sem backup** - Não há cópias de segurança dos dados
5. **Sem auditoria** - Não há registo de quem acedeu ou modificou os dados

### ✅ Funcionalidades Implementadas:

- ✅ Estrutura de dados para registos clínicos
- ✅ API para guardar/recuperar registos
- ✅ Interface para adicionar/editar notas clínicas
- ✅ Exportação para PDF dos registos

---

## 🔒 Recomendações para Produção

### 1. **Base de Dados Segura**

**Recomendado:** Migrar para uma base de dados com encriptação:

- **PostgreSQL** com encriptação de colunas sensíveis
- **MongoDB** com encriptação em repouso
- **Firebase Firestore** com regras de segurança
- **AWS RDS** com encriptação automática

### 2. **Autenticação e Autorização**

Implementar:

- Autenticação por password para o portal clínico
- Controlo de acesso baseado em roles (médico, administrador, etc.)
- Sessões seguras com tokens JWT
- Timeout automático de sessões

### 3. **Encriptação**

- **Encriptação em trânsito:** HTTPS (já implementado)
- **Encriptação em repouso:** Encriptar dados sensíveis na base de dados
- **Encriptação de campos:** Encriptar campos específicos (diagnóstico, prescrições)

### 4. **Backup e Recuperação**

- Backups automáticos diários
- Retenção de backups (mínimo 7 anos para registos médicos)
- Testes regulares de recuperação

### 5. **Auditoria e Logging**

- Registar todas as ações (criar, ler, atualizar, eliminar)
- Guardar quem fez cada ação e quando
- Logs imutáveis para conformidade

### 6. **Conformidade Legal**

Para Portugal/UE, considerar:

- **RGPD (GDPR)** - Proteção de dados pessoais
- **Lei de Proteção de Dados de Saúde**
- **Normas da Entidade Reguladora da Saúde**
- Retenção mínima de 10 anos para registos médicos

---

## 📋 Checklist de Segurança

Antes de usar em produção com dados reais:

- [ ] Migrar para base de dados segura
- [ ] Implementar autenticação forte
- [ ] Adicionar encriptação de dados sensíveis
- [ ] Configurar backups automáticos
- [ ] Implementar sistema de auditoria
- [ ] Adicionar controlo de acesso
- [ ] Revisar conformidade com RGPD
- [ ] Testar recuperação de backups
- [ ] Documentar políticas de segurança
- [ ] Treinar equipa em segurança de dados

---

## 🚀 Implementação Rápida (Temporária)

Se precisar de usar o sistema agora, considere:

1. **Acesso restrito:** Proteger o portal clínico com password básico (HTTP Basic Auth)
2. **Backup manual:** Exportar registos para PDF regularmente
3. **Monitorização:** Verificar logs do servidor regularmente
4. **Limitação de acesso:** Restringir acesso ao portal apenas a IPs conhecidos

---

## 📞 Suporte

Para questões sobre segurança e conformidade, consulte:
- Entidade Reguladora da Saúde
- Comissão Nacional de Proteção de Dados (CNPD)
- Especialista em segurança de dados de saúde

---

**Última atualização:** 2026
