/**
 * Adicionar horários recorrentes Dra. Carolina Rocha - Psicologia
 * Horários de fim de tarde incluídos
 */

const db = require('../db.js');

async function main() {
    try {
        const username = 'carolina.rocha';
        
        // Data de hoje para referência
        const today = new Date('2026-09-18');
        
        // Gerar próximas 4 semanas de disponibilidade
        const slots = [];
        
        for (let week = 0; week < 4; week++) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() + (week * 7));
            
            // Segunda-feira: 20:00 e 21:00
            const monday = new Date(weekStart);
            monday.setDate(weekStart.getDate() + (1 - weekStart.getDay() + 7) % 7);
            if (monday.getDay() === 1) {
                slots.push(
                    { date: monday.toISOString().split('T')[0], start: '20:00', end: '21:00' },
                    { date: monday.toISOString().split('T')[0], start: '21:00', end: '22:00' }
                );
            }
            
            // Terça-feira: 18:00 e 19:00
            const tuesday = new Date(weekStart);
            tuesday.setDate(weekStart.getDate() + (2 - weekStart.getDay() + 7) % 7);
            if (tuesday.getDay() === 2) {
                slots.push(
                    { date: tuesday.toISOString().split('T')[0], start: '18:00', end: '19:00' },
                    { date: tuesday.toISOString().split('T')[0], start: '19:00', end: '20:00' }
                );
            }
            
            // Quarta-feira: 18:00 e 19:00
            const wednesday = new Date(weekStart);
            wednesday.setDate(weekStart.getDate() + (3 - weekStart.getDay() + 7) % 7);
            if (wednesday.getDay() === 3) {
                slots.push(
                    { date: wednesday.toISOString().split('T')[0], start: '18:00', end: '19:00' },
                    { date: wednesday.toISOString().split('T')[0], start: '19:00', end: '20:00' }
                );
            }
            
            // Quinta-feira: 14:00, 14:30, 15:00, 15:30, 18:00
            const thursday = new Date(weekStart);
            thursday.setDate(weekStart.getDate() + (4 - weekStart.getDay() + 7) % 7);
            if (thursday.getDay() === 4) {
                slots.push(
                    { date: thursday.toISOString().split('T')[0], start: '14:00', end: '15:00' },
                    { date: thursday.toISOString().split('T')[0], start: '14:30', end: '15:30' },
                    { date: thursday.toISOString().split('T')[0], start: '15:00', end: '16:00' },
                    { date: thursday.toISOString().split('T')[0], start: '15:30', end: '16:30' },
                    { date: thursday.toISOString().split('T')[0], start: '18:00', end: '19:00' }
                );
            }
            
            // Sábado: 11:00
            const saturday = new Date(weekStart);
            saturday.setDate(weekStart.getDate() + (6 - weekStart.getDay() + 7) % 7);
            if (saturday.getDay() === 6) {
                slots.push(
                    { date: saturday.toISOString().split('T')[0], start: '11:00', end: '12:00' }
                );
            }
        }
        
        console.log(`\n📅 A adicionar ${slots.length} vagas para ${username}...\n`);
        
        // Obter disponibilidade atual
        const current = await db.getStaffAvailabilityDays(username);
        
        // Preparar dias
        const existingDays = current && Array.isArray(current.days) ? current.days : [];
        const newDates = [...new Set(slots.map(s => s.date))];
        const filteredDays = existingDays.filter(d => !newDates.includes(d.date));
        
        // Formatar novos slots
        const newSlots = slots.map(slot => ({
            date: slot.date,
            enabled: true,
            start: slot.start,
            end: slot.end
        }));
        
        const allDays = [...filteredDays, ...newSlots];
        
        // Configurar horários semanais recorrentes também
        const weekly = {
            monday: {
                enabled: true,
                slots: [
                    { start: '20:00', end: '21:00' },
                    { start: '21:00', end: '22:00' }
                ]
            },
            tuesday: {
                enabled: true,
                slots: [
                    { start: '18:00', end: '19:00' },
                    { start: '19:00', end: '20:00' }
                ]
            },
            wednesday: {
                enabled: true,
                slots: [
                    { start: '18:00', end: '19:00' },
                    { start: '19:00', end: '20:00' }
                ]
            },
            thursday: {
                enabled: true,
                slots: [
                    { start: '14:00', end: '15:00' },
                    { start: '14:30', end: '15:30' },
                    { start: '15:00', end: '16:00' },
                    { start: '15:30', end: '16:30' },
                    { start: '18:00', end: '19:00' }
                ]
            },
            friday: { enabled: false, slots: [] },
            saturday: {
                enabled: true,
                slots: [
                    { start: '11:00', end: '12:00' }
                ]
            },
            sunday: { enabled: false, slots: [] }
        };
        
        // Guardar
        const result = await db.setStaffAvailabilityRecord(username, allDays, weekly);
        
        console.log(`✅ Horários configurados com sucesso!\n`);
        console.log(`   Username: ${result.username}`);
        console.log(`\n   HORÁRIOS SEMANAIS RECORRENTES:`);
        console.log(`   Segunda: 20h-21h, 21h-22h`);
        console.log(`   Terça: 18h-19h, 19h-20h`);
        console.log(`   Quarta: 18h-19h, 19h-20h`);
        console.log(`   Quinta: 14h-15h, 14h30-15h30, 15h-16h, 15h30-16h30, 18h-19h`);
        console.log(`   Sábado: 11h-12h`);
        console.log(`\n   Total de slots específicos adicionados: ${newSlots.length}`);
        console.log(`   Próximas 4 semanas configuradas`);
        console.log(`\n   ✅ Horários de fim de tarde incluídos!\n`);
        
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Erro:', err.message);
        console.error(err);
        process.exit(1);
    }
}

main();
