#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'canvases', 'scripts']);

function walk(dir, acc) {
    for (const name of fs.readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full, acc);
        else if (/\.(md|json|html|js)$/i.test(name)) acc.push(full);
    }
}

function isBurnoutSessionPriceFile(rel, text) {
    if (/54\s*€\s*\/\s*semana/i.test(text) || /54€\/semana/i.test(text)) return false;
    return /54\s*€\s*\/\s*sess[aã]o/i.test(text) || /54€\/sess/i.test(text);
}

function rewritePsychology(s) {
    let out = s;
    out = out.replace(/54\s*€\s*\/\s*semana/gi, '56 €/semana');
    out = out.replace(/54€\/semana/gi, '56 €/semana');
    out = out.replace(/54\s*€\/semana/gi, '56 €/semana');
    out = out.replace(/60\s*€\s*\/\s*56\s*€/g, '60 € / 56 €');
    out = out.replace(/Nunca 56 €\. Nunca 50 minutos neste serviço\.?\s*/g, '');
    out = out.replace(/Nunca 56 €\.?\s*/g, '');
    out = out.replace(/Sem 56 €\.?\s*/g, '');
    out = out.replace(/Não 56 €\.?\s*/g, '');
    out = out.replace(/não 56 €\.?\s*/gi, '');
    out = out.replace(/,\s*OPP\. Baixa/g, ', OPP. Baixa');
    out = out.replace(/45 minutos semanais — não 50/g, '50 minutos semanais');
    out = out.replace(/— não 50\.?/g, '');
    out = out.replace(/não 50 minutos neste serviço\.?\s*/gi, '');
    out = out.replace(/Nunca 50 minutos neste serviço\.?\s*/g, '');
    out = out.replace(/não 50 minutos/gi, '50 minutos');
    out = out.replace(/Nunca 50 minutos/g, '50 minutos');
    out = out.replace(/45 minutos semanais/g, '50 minutos semanais');
    out = out.replace(/sessão de 45 minutos/gi, 'sessão de 50 minutos');
    out = out.replace(/Sessão de 45 minutos/g, 'Sessão de 50 minutos');
    out = out.replace(/dura 45 minutos/g, 'dura 50 minutos');
    out = out.replace(/duram 45 minutos/g, 'duram 50 minutos');
    out = out.replace(/Duração 45 minutos/g, 'Duração 50 minutos');
    out = out.replace(/Duração \*\*45 minutos\*\*/g, 'Duração **50 minutos**');
    out = out.replace(/\*\*45 minutos\*\*/g, '**50 minutos**');
    out = out.replace(/45 minutos/g, '50 minutos');
    out = out.replace(/45 min semanais/g, '50 min semanais');
    out = out.replace(/€60 · 45 min/g, '€60 · 50 min');
    out = out.replace(/60 € · 45 min/g, '60 € · 50 min');
    out = out.replace(/45 min;/g, '50 min;');
    out = out.replace(/45 min,/g, '50 min,');
    out = out.replace(/45 min\./g, '50 min.');
    out = out.replace(/45 min /g, '50 min ');
    out = out.replace(/— 45 min;/g, '— 50 min;');
    out = out.replace(/Lon: 45 min/g, 'Lon: 50 min');
    out = out.replace(/: 45 min,/g, ': 50 min,');
    out = out.replace(/preçário da Lon Clinic, 2026 — 45 min/gi, 'Preçário da Lon Clinic, 2026 — 50 min');
    out = out.replace(/o slot Lon é 45/g, 'o slot Lon é 50');
    return out;
}

function rewriteNutritionDenials(s) {
    let out = s;
    out = out.replace(
        /Hub: 115 € \/ 75 €\/mês, 30 min, 100% online\. ADSE, Cheque Cuida-te \(12–35\) e quando marcar\. Sem 45 €\./g,
        'Hub: consulta avulsa 45 € (30 min) ou programa 115 € / 75 €/mês, 100% online. ADSE, Cheque Cuida-te (12–35) e quando marcar.'
    );
    out = out.replace(
        /Videochamada no browser, 115 € no mês 1 e 75 €\/mês, recibo ADSE\. Sem app e sem 45 € inventados\./g,
        'Videochamada no browser. Consulta avulsa 45 € (30 min) ou programa 115 € no mês 1 e 75 €/mês, recibo ADSE. Sem app.'
    );
    out = out.replace(
        /Na Lon Clinic: 115 € no mês 1 e 75 €\/mês — não 45 €\. ADSE e Cheque Cuida-te\./g,
        'Na Lon Clinic: consulta avulsa 45 € (30 min) ou programa 115 € no mês 1 e 75 €/mês. ADSE e Cheque Cuida-te.'
    );
    out = out.replace(
        /Não é 45 €\./g,
        'A consulta avulsa de nutricionista é 45 € (30 min); o programa é 115 € no mês 1 e 75 €/mês.'
    );
    out = out.replace(/sem 45 € inventados\.?/gi, 'consulta avulsa 45 € (30 min) ou programa 115 € / 75 €/mês.');
    out = out.replace(/Sem 45 €\.?/g, '');
    out = out.replace(/não 45 €\.?/gi, '45 € avulsa ou 115 € / 75 €/mês no programa');
    return out;
}

const files = [];
walk(path.join(ROOT, 'data'), files);
walk(path.join(ROOT, 'scripts'), files);
['queixas.js', 'nutricao-programa.html'].forEach((f) => {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) files.push(full);
});

let nPsi = 0;
let nNutri = 0;
for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (rel === 'scripts/_align-checkout-copy.js') continue;
    if (/data\/clinical-quizzes\//.test(rel)) continue;
    let text = fs.readFileSync(file, 'utf8');
    const orig = text;
    const isPsiCopy = /54\s*€\s*\/\s*semana|54€\/semana/i.test(text)
        || /psicolog/i.test(rel)
        || /queixas/.test(rel)
        || /psicolog/i.test(text) && /45 min/i.test(text);
    if (isPsiCopy && !isBurnoutSessionPriceFile(rel, text)) {
        text = rewritePsychology(text);
    }
    if (/Sem 45 €|não 45 €|Não é 45 €|sem 45 € inventados/i.test(text)) {
        text = rewriteNutritionDenials(text);
    }
    if (text !== orig) {
        fs.writeFileSync(file, text);
        if (isPsiCopy) nPsi += 1;
        if (/45 € avulsa|consulta avulsa 45/.test(text) && /Sem 45|não 45/.test(orig)) nNutri += 1;
        console.log('updated', rel);
    }
}
console.log('psychology-touch files', nPsi, 'nutrition-denial files', nNutri);
