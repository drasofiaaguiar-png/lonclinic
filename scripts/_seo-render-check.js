'use strict';
const fs = require('fs');
const g = require('../guide');
const samples = [
    'consultas-psicologia-braga',
    'consultas-psicologia-luanda',
    'consultas-psicologia-coimbra',
    'consultas-nutricao-perda-de-peso',
    'adse-seguros-psicologia-portugal',
    'cheque-nutricionista-2026',
    'burnout-sinais-quando-procurar-ajuda',
    'consultas-psicologia-lisboa'
];
for (const s of samples) {
    const out = g.renderBlogArticle('https://www.lonclinic.com', s);
    const html = out && out.html;
    if (!html) {
        console.log('FAIL render', s);
        continue;
    }
    const bad = [];
    if (!html.includes('FAQPage')) bad.push('no FAQPage');
    if (/56\s*€/.test(html)) bad.push('56e');
    if (!html.includes('data-next-slots')) bad.push('no slots');
    if (!html.includes('guide-actions') && !html.includes('guide-book')) bad.push('no cta');
    const slot = html.indexOf('data-next-slots');
    const faqH2 = html.search(/perguntas frequentes/i);
    if (slot > 0 && faqH2 > 0 && slot > faqH2) bad.push('slots after FAQ');
    const ctas = (html.match(/guide-book/g) || []).length;
    console.log(s, 'len', html.length, 'ctas', ctas, 'slot@', slot, 'faq@', faqH2, bad.join(',') || 'ok');
}
