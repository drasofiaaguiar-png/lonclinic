'use strict';
const fs = require('fs');
const path = require('path');
const man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'guide', 'manifest.json'), 'utf8'));
const bySlug = Object.fromEntries(man.articles.map((a) => [a.slug, a]));

const nutrition = [
    'consulta-nutricao-online-como-funciona',
    'consultas-nutricao-perda-de-peso',
    'quanto-custa-consulta-nutricao-portugal',
    'adse-consultas-nutricao-portugal',
    'cheque-nutricionista-2026',
    'nutricionista-ou-dietista-portugal'
];
const hubs = [
    'consultas-psicologia-gratuitas-portugal',
    'adse-seguros-psicologia-portugal',
    'psicologia-online-vs-presencial',
    'primeira-consulta-psicologia-o-que-esperar',
    'quando-ir-ao-psicologo-sinais',
    'psicologo-ansiedade-quando-procurar-ajuda',
    'burnout-sinais-quando-procurar-ajuda',
    'apoio-psicologico-universidades-portugal',
    'psicologia-online-portugal-por-distrito'
];
const cities = [
    'porto','lisboa','aveiro','braga','guimaraes','gondomar','matosinhos','penafiel',
    'marco-de-canaveses','vila-real','viana-do-castelo','guarda','ovar','coimbra',
    'figueira-da-foz','viseu','covilha','leiria','almada','seixal','barreiro','setubal',
    'sintra','cascais','loures','vila-franca-de-xira','torres-vedras','santarem','evora',
    'beja','faro','madeira','luanda'
].map((c) => `consultas-psicologia-${c}`);
const older = [
    'como-encontrar-um-psicologo',
    'quanto-custa-consulta-psicologia-portugal',
    'como-encontrar-um-nutricionista',
    'perda-de-peso-sustentavel',
    'nutricionista-plano-perda-de-peso',
    'fome-emocional-vs-fisica'
];
const all = [...nutrition, ...hubs, ...cities, ...older];

function md(slug) {
    const p = path.join(__dirname, '..', 'data', 'guide', 'articles', `${slug}.md`);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function h2s(body) {
    return [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}
function h3s(body) {
    return [...body.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
}
function blogLinks(body) {
    return [...body.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
}
function productLinks(body) {
    return [...body.matchAll(/\]\((\/(?:saudemental|triagem|nutricao|burnout|psicologia-burnout|psicologo-emigrantes|marcar|clinica-anti-burnout|ansiedade[^)]*|terapia-de-casal|ataques-de-panico|gestao-de-stress)[^)]*)\)/g)].map((m) => m[1]);
}

const rows = [];
for (const slug of all) {
    const a = bySlug[slug];
    const body = md(slug);
    if (!a) {
        rows.push({ slug, missing: true });
        continue;
    }
    const rel = a.related || [];
    const faqQs = (a.faq || []).map((x) => x.q);
    const hs = h3s(body);
    const faqMismatch = faqQs.filter((q) => !hs.includes(q));
    const extraH3 = hs.filter((h) => !faqQs.includes(h));
    const ctaCount = (body.match(/\{\{cta\}\}/g) || []).length;
    const slots = [...body.matchAll(/\[lon-slots:[^\]]+\]/g)].map((m) => m[0]);
    const firstCta = body.indexOf('{{cta}}');
    const faqIdx = body.indexOf('## Perguntas frequentes');
    const firstH2 = body.search(/^## /m);
    const midOk = firstCta > 0 && firstCta < faqIdx && firstCta > firstH2;
    const links = blogLinks(body);
    const products = productLinks(body);
    const city = slug.replace('consultas-psicologia-', '');
    const cityNameGuess = city.replace(/-/g, ' ');
    const first100 = body.replace(/<[^>]+>/g, ' ').slice(0, 800);
    rows.push({
        slug,
        title: a.title,
        titleLen: a.title.length,
        descLen: (a.description || '').length,
        ctaKind: a.ctaKind,
        liveSlots: a.liveSlots,
        slotService: a.slotService,
        related: rel,
        relatedN: rel.length,
        selfRel: rel.includes(slug),
        missingRel: rel.filter((s) => !bySlug[s]),
        ctaCount,
        slots,
        midOk,
        firstCta,
        faqIdx,
        faqN: faqQs.length,
        faqMismatch,
        extraH3,
        inBodyBlog: [...new Set(links)],
        products: [...new Set(products)],
        h2: h2s(body),
        hasH1: /^# /m.test(body),
        bad56: /56\s*€/.test(body) || /56\s*€/.test(JSON.stringify(a)),
        bad45nut: /45\s*€/.test(body) && nutrition.includes(slug),
        cityInTitle: !slug.startsWith('consultas-psicologia-') || a.title.toLowerCase().includes(cityNameGuess.split(' ')[0]),
        wordCount: body.split(/\s+/).length
    });
}

const issues = [];
for (const r of rows) {
    if (r.missing) { issues.push(`${r.slug}: FILE MISSING`); continue; }
    if (r.selfRel) issues.push(`${r.slug}: related includes self`);
    if (r.relatedN < 4) issues.push(`${r.slug}: related only ${r.relatedN}`);
    if (r.relatedN > 8) issues.push(`${r.slug}: related ${r.relatedN} (>8)`);
    if (r.missingRel.length) issues.push(`${r.slug}: related unknown ${r.missingRel.join(',')}`);
    if (r.ctaCount === 0) issues.push(`${r.slug}: no {{cta}}`);
    if (r.ctaCount > 2) issues.push(`${r.slug}: ${r.ctaCount} CTAs`);
    if (!r.slots.length && r.liveSlots) issues.push(`${r.slug}: liveSlots but no lon-slots token`);
    if (!r.midOk) issues.push(`${r.slug}: CTA not mid (cta@${r.firstCta} faq@${r.faqIdx})`);
    if (r.faqMismatch.length) issues.push(`${r.slug}: FAQ q not in ### ${JSON.stringify(r.faqMismatch)}`);
    if (r.inBodyBlog.length < 3 && !r.slug.startsWith('consultas-psicologia-')) issues.push(`${r.slug}: few in-body blog links (${r.inBodyBlog.length})`);
    if (r.hasH1) issues.push(`${r.slug}: H1 in markdown`);
    if (r.bad56) issues.push(`${r.slug}: 56€`);
    if (r.titleLen > 70) issues.push(`${r.slug}: title ${r.titleLen} chars`);
    if ((r.faqN || 0) < 3) issues.push(`${r.slug}: faq only ${r.faqN}`);
}

// bidirectional among campaign
const camp = new Set([...nutrition, ...hubs, ...cities]);
const relatedMap = {};
for (const slug of camp) {
    relatedMap[slug] = new Set((bySlug[slug] && bySlug[slug].related) || []);
}
const uni = [];
for (const a of camp) {
    for (const b of relatedMap[a] || []) {
        if (!camp.has(b)) continue;
        if (!(relatedMap[b] || new Set()).has(a)) uni.push(`${a} -> ${b} (not back in related)`);
    }
}

// city unique first sentences
const cityLeads = cities.map((slug) => {
    const body = md(slug);
    const lead = body.split('\n').filter((l) => l && !l.startsWith('<') && !l.startsWith('##') && !l.startsWith('{{')).slice(0, 3).join(' | ').slice(0, 220);
    return { slug, lead, words: body.split(/\s+/).length };
});

console.log('=== ISSUES ===');
issues.forEach((i) => console.log(i));
console.log('\n=== RELATED SUMMARY ===');
for (const r of rows.filter((x) => !x.missing && camp.has(x.slug))) {
    console.log(r.slug, '| cta', r.ctaKind, '| slots', r.slotService, '| rel', r.relatedN, relPreview(r), '| ctaN', r.ctaCount, '| blog', r.inBodyBlog.length, '| products', r.products.join(','));
}
function relPreview(r) { return (r.related || []).join(','); }

console.log('\n=== UNIDIRECTIONAL (sample, first 80) ===');
uni.slice(0, 80).forEach((u) => console.log(u));
console.log('unidirectional count', uni.length);

console.log('\n=== CITY LEADS ===');
cityLeads.forEach((c) => console.log(c.words, c.slug, c.lead));

console.log('\n=== OLDER RELATED ===');
for (const slug of older) {
    const a = bySlug[slug];
    console.log(slug, a && a.related);
}
