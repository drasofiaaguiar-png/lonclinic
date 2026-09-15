/**
 * Script para adicionar vagas específicas para Dra. Carolina Rocha
 * Dia 21 de setembro às 20h e 21h
 */

const db = require('../db.js');

async function main() {
    try {
        const username = 'carolina.rocha'; // Username da Dra. Carolina Rocha
        const date = '2026-09-21'; // Dia 21 de setembro
        
        console.log(`\n📅 A adicionar vagas para ${username} no dia ${date}...\n`);
        
        // Obter disponibilidade atual
        const current = await db.getStaffAvailabilityRecordInternal(username);
        console.log('   Disponibilidade atual:', current ? 'existe' : 'não existe');
        
        // Preparar array de dias com as novas vagas
        const existingDays = current && Array.isArray(current.days) ? current.days : [];
        
        // Remover slots existentes para esta data (se houver)
        const filteredDays = existingDays.filter(d => d.date !== date);
        
        // Adicionar novos slots: 20:00-21:00 e 21:00-22:00
        const newDays = [
            ...filteredDays,
            {
                date: date,
                enabled: true,
                start: '20:00',
                end: '21:00'
            },
            {
                date: date,
                enabled: true,
                start: '21:00',
                end: '22:00'
            }
        ];
        
        // Manter configuração semanal existente
        const weekly = current && current.weekly ? current.weekly : {};
        
        // Guardar
        const result = await db.setStaffAvailabilityRecordInternal(username, newDays, weekly);
        
        console.log(`\n✅ Vagas adicionadas com sucesso!\n`);
        console.log(`   Username: ${result.username}`);
        console.log(`   Data: ${date}`);
        console.log(`   Slots: 20:00-21:00 e 21:00-22:00`);
        console.log(`   Total de dias configurados: ${newDays.length}`);
        console.log(`\n   As vagas estão agora disponíveis para marcação.\n`);
        
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Erro ao adicionar vagas:', err.message);
        console.error(err);
        process.exit(1);
    }
}

main();
