# Horários Dra. Carolina Rocha - Psicologia

## ⚠️ Base de Dados Não Configurada

O script automático requer PostgreSQL configurado. Configure a variável `DATABASE_URL` no ficheiro `.env` ou adicione manualmente os horários através do painel administrativo.

## 📅 Horários Semanais Recorrentes

### Segunda-feira
- ✅ **20:00 - 21:00**
- ✅ **21:00 - 22:00**

### Terça-feira
- ✅ **18:00 - 19:00**
- ✅ **19:00 - 20:00**

### Quarta-feira
- ✅ **18:00 - 19:00**
- ✅ **19:00 - 20:00**

### Quinta-feira
- ✅ **14:00 - 15:00**
- ✅ **14:30 - 15:30**
- ✅ **15:00 - 16:00**
- ✅ **15:30 - 16:30**
- ✅ **18:00 - 19:00**

### Sexta-feira
- ❌ Não disponível

### Sábado
- ✅ **11:00 - 12:00**

### Domingo
- ❌ Não disponível

---

## 📊 Resumo

**Total de slots semanais**: 12 horários  
**Horários de fim de tarde incluídos**: ✅ SIM (18h-22h)  
**Username**: `carolina.rocha`  
**Especialidade**: Psicologia

---

## 🔧 Como Adicionar Manualmente

### Opção 1: Painel Administrativo
1. Aceder a `/admin` ou painel de gestão
2. Ir a "Gestão de Equipa" → "Disponibilidade"
3. Selecionar "Dra. Carolina Rocha"
4. Adicionar os horários semanais listados acima

### Opção 2: Script Automático (Requer Base de Dados)

```bash
# 1. Configurar DATABASE_URL no .env
DATABASE_URL=postgresql://user:password@host:5432/database

# 2. Executar script
node scripts/add-carolina-psychology-schedule.js
```

O script irá:
- ✅ Adicionar 48 slots para as próximas 4 semanas
- ✅ Configurar horários semanais recorrentes
- ✅ Incluir todos os horários de fim de tarde (18h-22h)

---

## 📍 Próximas 4 Semanas (Exemplo)

### Semana 1 (18-24 Set 2026)
- **19 Set (Quinta)**: 14:00, 14:30, 15:00, 15:30, 18:00
- **21 Set (Sábado)**: 11:00

### Semana 2 (25 Set - 1 Out 2026)
- **23 Set (Segunda)**: 20:00, 21:00
- **24 Set (Terça)**: 18:00, 19:00
- **25 Set (Quarta)**: 18:00, 19:00
- **26 Set (Quinta)**: 14:00, 14:30, 15:00, 15:30, 18:00
- **28 Set (Sábado)**: 11:00

### Semana 3 (2-8 Out 2026)
- **30 Set (Segunda)**: 20:00, 21:00
- **1 Out (Terça)**: 18:00, 19:00
- **2 Out (Quarta)**: 18:00, 19:00
- **3 Out (Quinta)**: 14:00, 14:30, 15:00, 15:30, 18:00
- **5 Out (Sábado)**: 11:00

### Semana 4 (9-15 Out 2026)
- **7 Out (Segunda)**: 20:00, 21:00
- **8 Out (Terça)**: 18:00, 19:00
- **9 Out (Quarta)**: 18:00, 19:00
- **10 Out (Quinta)**: 14:00, 14:30, 15:00, 15:30, 18:00
- **12 Out (Sábado)**: 11:00

---

## ✅ Verificação

Após adicionar os horários, verificar:
- [ ] Slots aparecem no sistema de marcação
- [ ] Horários de fim de tarde (18h-22h) estão visíveis
- [ ] Username `carolina.rocha` está ativo
- [ ] Especialidade "Psicologia" está associada
- [ ] Pacientes conseguem marcar consultas

---

## 🔗 Scripts Relacionados

- `scripts/add-carolina-psychology-schedule.js` - Script principal (requer DB)
- `scripts/add-carolina-sept-slots.js` - Slots específicos setembro
- `scripts/_add-carolina-slots.js` - Script backup

---

**Data de criação**: 18 de setembro de 2026  
**Status**: Pendente configuração manual (DB não disponível)
