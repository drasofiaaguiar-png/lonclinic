/**
 * Script para adicionar vagas específicas para Dra. Carolina Rocha
 * 21 de setembro (segunda): 20h e 21h
 * 22 de setembro (terça): 18h e 19h
 * 23 de setembro (quarta): 18h e 19h
 */

const db = require('../db.js');

async function main() {
    try {
        const username = 'carolina.rocha'; // Username da Dra. Carolina Rocha
        const dates = [
            { date: '2026-09-21', slots: ['20:00', '21:00'] }, // Segunda
            { date: '2026-09-22', slots: ['18:00', '19:00'] }, // Terça
            { date: '2026-09-23', slots: ['18:00', '19:00'] }  // Quarta
        ];
        
        console.log(`\n📅 A adicionar vagas para ${username}...\n`);
        
        // Obter disponibilidade atual
        const current = await db.getStaffAvailabilityDays(username);
        console.log('   Disponibilidade atual:', current ? 'existe' : 'não existe');
        
        // Preparar array de dias com as novas vagas
        const existingDays = current && Array.isArray(current.days) ? current.days : [];
        
        // Remover slots existentes para estas datas (se houver)
        const datesToAdd = dates.map(d => d.date);
        const filteredDays = existingDays.filter(d => !datesToAdd.includes(d.date));
        
        // Adicionar novos slots
        const newSlots = [];
        dates.forEach(({ date, slots }) => {
            slots.forEach(startTime => {
                const [hour] = startTime.split(':');
                const endTime = `${String(Number(hour) + 1).padStart(2, '0')}:00`;
                newSlots.push({
                    date: date,
                    enabled: true,
                    start: startTime,
                    end: endTime
                });
            });
        });
        
        const allDays = [...filteredDays, ...newSlots];
        
        // Manter configuração semanal existente
        const weekly = current && current.weekly ? current.weekly : {};
        
        // Guardar
        const result = await db.setStaffAvailabilityRecord(username, allDays, weekly);
        
        console.log(`\n✅ Vagas adicionadas com sucesso!\n`);
        console.log(`   Username: ${result.username}`);
        dates.forEach(({ date, slots }) => {
            console.log(`   ${date}: ${slots.join(', ')}`);
        });
        console.log(`   Total de slots adicionados: ${newSlots.length}`);
        console.log(`   Total de dias configurados: ${allDays.length}`);
        console.log(`\n   As vagas estão agora disponíveis para marcação.\n`);
        
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Erro ao adicionar vagas:', err.message);
        console.error(err);
        process.exit(1);
    }
}

main();
