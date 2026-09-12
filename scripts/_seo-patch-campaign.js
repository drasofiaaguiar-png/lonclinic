'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'data', 'guide', 'articles');
const MANIFEST = path.join(ROOT, 'data', 'guide', 'manifest.json');

function mdPath(slug) {
    return path.join(ART, `${slug}.md`);
}
function read(slug) {
    return fs.readFileSync(mdPath(slug), 'utf8');
}
function write(slug, body) {
    fs.writeFileSync(mdPath(slug), body.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '') + (body.endsWith('\n') ? '' : '\n'));
}

function blog(slug, label) {
    return `[${label}](/blog/${slug})`;
}

const N = {
    distrito: blog('psicologia-online-portugal-por-distrito', 'psicologia online por distrito'),
    quanto: blog('quanto-custa-consulta-psicologia-portugal', 'quanto custa uma consulta de psicologia'),
    gratuitas: blog('consultas-psicologia-gratuitas-portugal', 'consultas de psicologia gratuitas'),
    online: blog('psicologia-online-vs-presencial', 'psicologia online vs presencial'),
    unis: blog('apoio-psicologico-universidades-portugal', 'apoio psicológico nas universidades'),
    adse: blog('adse-seguros-psicologia-portugal', 'ADSE e seguros na psicologia'),
    encontrar: blog('como-encontrar-um-psicologo', 'como encontrar um psicólogo'),
    primeira: blog('primeira-consulta-psicologia-o-que-esperar', 'primeira consulta de psicologia')
};

function cityArticle(c) {
    const prep = c.prep;
    const city = c.name;
    const map = (c.map || []).map((x) => `<a href="/blog/consultas-psicologia-${x.slug}">${x.label}</a>`).join(' · ');
    const near = (c.near || []).map((x) => `[${x.label}](/blog/consultas-psicologia-${x.slug})`).join(' · ');
    const uniH2 = c.uniH2
        ? `\n## ${c.uniH2}\n\n${c.uniBody}\n`
        : '';
    const extraBullet = c.extraBullet ? `\n- ${c.extraBullet}` : '';
    const fontes = (c.fontes || []).map((f) => `- ${f}`).join('\n');
    const faqUni = c.faqUniQ
        ? `\n### ${c.faqUniQ}\n\n${c.faqUniA}\n`
        : '';
    const luandaNote = c.slug === 'luanda'
        ? `\nQuem pesquisa psicologia em Luanda e quer um psicólogo **português** usa a queixa [psicólogo para emigrantes](/psicologo-emigrantes) — **não há um produto Lon Clinic em Luanda**.\n`
        : '';

    return `<aside class="guide-keyfacts">
<p class="guide-keyfacts-kicker">Resposta directa</p>
<ul>
<li>${c.key1}</li>
<li>${c.key2}</li>
<li>Mapa: <a href="/blog/psicologia-online-portugal-por-distrito">psicologia online por distrito</a>${map ? ` · ${map}` : ''}.</li>
</ul>
</aside>

${c.lead}

Números nacionais: ${N.quanto}. Gratuitas: ${N.gratuitas}. Formato: ${N.online}. Universidades: ${N.unis}.${luandaNote}

## Onde encontrar consultas de psicologia ${prep} ${city}?

${c.onde}

Não publicamos tempos de espera. Em crise: **SNS 24 (808 24 24 24)** ou **112**.

{{cta}}

## Porquê psicologia online ${prep} ${city}?

${c.why}

- Sem viagem. Link no browser (Doxy.me); sem instalar aplicações.
- **60 €** avulsa ou **56 €/semana** — o preço **não muda** com a cidade.
- **50 minutos**, semanal, incluindo a primeira.
- Especialidade, não código postal: [ansiedade](/ansiedade-no-trabalho), [burnout](/psicologia-burnout), [terapia de casal](/terapia-de-casal), [ataques de pânico](/ataques-de-panico), [gestão de stress](/gestao-de-stress). Só queixas que o site publica.
- **Podes mudar de psicólogo sempre que quiseres, sem justificação, e recomeçar do zero.**
- Inscritos na **OPP**; recibo ADSE/seguro — ${N.adse}.${extraBullet}

Cidades próximas: ${near} · ${N.distrito}.
${uniH2}
## ${c.adseH2 || `A ADSE cobre psicologia ${prep} ${city}?`}

${c.adse}

{{cta}}

[lon-slots: serviço="psicologia"]

## Perguntas frequentes

### Onde encontrar consultas de psicologia ${prep} ${city}?

${c.faqOnde}

### Quanto custa uma consulta de psicologia ${prep} ${city}?

${c.faqCusto}

### Há psicologia online ${prep} ${city}?

${c.faqOnline}
${faqUni}
### Como marcar consulta de psicologia ${prep} ${city}?

${c.faqMarcar}

### ${c.adseH2 || `A ADSE cobre psicologia ${prep} ${city}?`}

${c.faqAdse || c.adse.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}

---

Este artigo tem fins informativos e não substitui uma avaliação clínica ou psicológica individual. Se está a atravessar uma crise ou tem pensamentos de fazer mal a si próprio, procure ajuda imediata através da linha **SNS 24 (808 24 24 24)** ou dos serviços de urgência (**112**).

## Fontes

${fontes}
- [OPP — Directório](https://www.ordemdospsicologos.pt/pt/membros)
- Preçário da Lon Clinic, 2026 — 50 min; 60 € / 56 €/semana
`;
}

const CITIES = [
    {
        slug: 'braga', name: 'Braga', prep: 'em',
        title: 'Consultas de Psicologia em Braga: Online, SNS e UMinho',
        description: 'Psicologia em Braga: ULS de Braga, SASUM da UMinho (Braga e Guimarães) e online Lon a 60 € / 56 €/semana.',
        key1: 'Em Braga pode marcar psicologia online na Lon Clinic sem consultório: videochamada a <strong>60 €</strong> (ou <strong>56 €/semana</strong>), <strong>50 minutos</strong> semanais.',
        key2: 'O SNS passa pela <strong>ULS de Braga</strong>. Estudantes da Universidade do Minho usam o <a href="https://www.sas.uminho.pt/saude-e-bem-estar/psicologia">SASUM — Psicologia</a> em Braga e Guimarães.',
        lead: 'Em Braga, o particular de psicologia cai na faixa nacional (cerca de **40 € a 70 €**). O SNS passa pela **ULS de Braga**. Quem está inscrito na **Universidade do Minho** pede apoio no **SASUM — Psicologia**, com consultas em **Braga e Guimarães**. A Lon Clinic acrescenta a consulta **online** em Braga: sem deslocação ao centro, **60 €** ou **56 €/semana**, **50 minutos**.',
        onde: 'Três caminhos: particular local; SNS via médico de família da **ULS de Braga**; e, para inscritos na UMinho, o [SASUM — Psicologia](https://www.sas.uminho.pt/saude-e-bem-estar/psicologia) (tabela no site: bolseiros vs não bolseiros). A Lon Clinic é a via online a partir de Braga.',
        why: 'Braga tem oferta privada, mas a especialidade (casal, burnout, pânico) nem sempre está no código postal. A videochamada a partir de Braga, Guimarães ou Famalicão usa a mesma agenda nacional.',
        uniH2: 'A Universidade do Minho tem apoio psicológico em Braga?',
        uniBody: 'Sim. O **SASUM — Psicologia** (Serviços de Ação Social da UMinho) presta consultas de psicologia clínica e da educação em **Braga e Guimarães**. Marcação na app ou no [portal SASUM](https://www.sas.uminho.pt/saude-e-bem-estar/psicologia). A tabela distingue bolseiros (gratuita) e não bolseiros (5 €) — confirme no site. Não inventamos tempos de espera.',
        adse: 'Sim. A ADSE comparticipa psicologia clínica em regime livre em Braga como no resto do país, com recibo. A cidade não altera o direito. Detalhe: [ADSE e seguros na psicologia](/blog/adse-seguros-psicologia-portugal).',
        faqOnde: 'No particular de Braga, no SNS via médico de família da ULS de Braga, no SASUM da Universidade do Minho (estudantes inscritos) ou online na Lon Clinic, a partir de Braga.',
        faqCusto: 'No particular de Braga a faixa habitual é a nacional: cerca de 40 € a 70 €. Na Lon Clinic o preço é fixo: 60 € avulsa ou 56 €/semana, sessão de 50 minutos.',
        faqOnline: 'Sim. A Lon Clinic atende por videochamada a partir de Braga, no browser, sem instalar aplicações.',
        faqUniQ: 'A Universidade do Minho tem apoio psicológico em Braga?',
        faqUniA: 'Sim. O SASUM — Psicologia atende em Braga e Guimarães. Confirme preço e canal no portal SASUM. A Lon Clinic não é o gabinete da UMinho.',
        faqMarcar: 'Escolha o psicólogo na página de saúde mental da Lon Clinic por especialidade, ou faça a triagem. Marca, recebe o link Doxy.me por email e faz a sessão de 50 minutos a partir de Braga.',
        map: [{ slug: 'porto', label: 'Porto' }, { slug: 'guimaraes', label: 'Guimarães' }],
        near: [{ slug: 'guimaraes', label: 'Guimarães' }, { slug: 'porto', label: 'Porto' }, { slug: 'viana-do-castelo', label: 'Viana do Castelo' }],
        related: ['psicologia-online-portugal-por-distrito', 'consultas-psicologia-guimaraes', 'consultas-psicologia-porto', 'apoio-psicologico-universidades-portugal', 'consultas-psicologia-gratuitas-portugal', 'quanto-custa-consulta-psicologia-portugal', 'psicologia-online-vs-presencial', 'adse-seguros-psicologia-portugal'],
        fontes: ['[SASUM — Psicologia (UMinho)](https://www.sas.uminho.pt/saude-e-bem-estar/psicologia)']
    },
    {
        slug: 'guimaraes', name: 'Guimarães', prep: 'em',
        title: 'Consultas de Psicologia em Guimarães: Online, SNS e UMinho',
        description: 'Psicologia em Guimarães: ULS do Alto Ave, SASUM também no campus de Guimarães, online Lon 60 €.',
        key1: 'Em Guimarães pode marcar psicologia online na Lon Clinic: videochamada a <strong>60 €</strong> (ou <strong>56 €/semana</strong>), <strong>50 minutos</strong>.',
        key2: 'O SNS está na <strong>ULS do Alto Ave</strong>. Os <a href="https://www.sas.uminho.pt/saude-e-bem-estar/psicologia">SASUM</a> da UMinho prestam psicologia também em Guimarães, não só em Braga.',
        lead: 'Em Guimarães, o SNS de psicologia passa pela **ULS do Alto Ave**. Os **SASUM** da Universidade do Minho prestam consultas **também em Guimarães**, além de Braga. O particular local é mais curto do que no Porto. A Lon Clinic é a consulta **online** em Guimarães: **60 €** ou **56 €/semana**, **50 minutos**.',
        onde: 'Particular de Guimarães; SNS via **ULS do Alto Ave**; estudantes da UMinho no [SASUM — Psicologia](https://www.sas.uminho.pt/saude-e-bem-estar/psicologia) (Braga e Guimarães). A Lon Clinic atende a partir de Guimarães sem deslocação a Braga.',
        why: 'Muita especialidade privada concentra-se em Braga ou no Porto. A videochamada a partir de Guimarães evita essa viagem sem inventar consultórios locais.',
        uniH2: 'A Universidade do Minho tem apoio psicológico em Guimarães?',
        uniBody: 'Sim. Os [SASUM](https://www.sas.uminho.pt/saude-e-bem-estar/psicologia) descrevem consultas em **Braga e Guimarães**. Confirme canal e tabela no portal. O guia de [Braga](/blog/consultas-psicologia-braga) detalha a mesma instituição.',
        adse: 'Sim. A ADSE comparticipa psicologia clínica em regime livre em Guimarães como no resto do país, com recibo.',
        faqOnde: 'No particular de Guimarães, no SNS via ULS do Alto Ave, no SASUM da UMinho (estudantes) ou online na Lon Clinic a partir de Guimarães.',
        faqCusto: 'No particular a faixa habitual é a nacional (cerca de 40 € a 70 €). Na Lon Clinic: 60 € avulsa ou 56 €/semana, 50 minutos.',
        faqOnline: 'Sim. A Lon Clinic atende por videochamada a partir de Guimarães, no browser.',
        faqUniQ: 'A Universidade do Minho tem apoio psicológico em Guimarães?',
        faqUniA: 'Sim. O SASUM presta psicologia também em Guimarães. Confirme no portal SASUM. A Lon Clinic não substitui o gabinete da UMinho.',
        faqMarcar: 'Escolha o psicólogo na página de saúde mental da Lon Clinic ou faça a triagem. Recebe o link por email e faz a sessão de 50 minutos a partir de Guimarães.',
        map: [{ slug: 'braga', label: 'Braga' }, { slug: 'porto', label: 'Porto' }],
        near: [{ slug: 'braga', label: 'Braga' }, { slug: 'porto', label: 'Porto' }],
        related: ['psicologia-online-portugal-por-distrito', 'consultas-psicologia-braga', 'consultas-psicologia-porto', 'apoio-psicologico-universidades-portugal', 'consultas-psicologia-gratuitas-portugal', 'quanto-custa-consulta-psicologia-portugal', 'psicologia-online-vs-presencial', 'como-encontrar-um-psicologo'],
        fontes: ['[SASUM — Psicologia (UMinho)](https://www.sas.uminho.pt/saude-e-bem-estar/psicologia)']
    }
];

const MORE = []
    .concat(require('./_seo-city-data.js'))
    .concat(require('./_seo-city-data2.js'))
    .concat(require('./_seo-city-data3.js'))
    .concat(require('./_seo-city-data4.js'));
const ALL_CITIES = CITIES.concat(MORE);

function stripMd(s) {
    return String(s || '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*/g, '')
        .replace(/\n+/g, ' ')
        .trim();
}

function faqFromCity(c) {
    const faq = [
        { q: `Onde encontrar consultas de psicologia ${c.prep} ${c.name}?`, a: stripMd(c.faqOnde) },
        { q: `Quanto custa uma consulta de psicologia ${c.prep} ${c.name}?`, a: stripMd(c.faqCusto) },
        { q: `Há psicologia online ${c.prep} ${c.name}?`, a: stripMd(c.faqOnline) }
    ];
    if (c.faqUniQ) faq.push({ q: c.faqUniQ, a: stripMd(c.faqUniA) });
    faq.push({ q: `Como marcar consulta de psicologia ${c.prep} ${c.name}?`, a: stripMd(c.faqMarcar) });
    faq.push({
        q: c.adseH2 || `A ADSE cobre psicologia ${c.prep} ${c.name}?`,
        a: stripMd(c.faqAdse || c.adse)
    });
    return faq;
}

function patchManifest(man) {
    const bySlug = Object.fromEntries(man.articles.map((a) => [a.slug, a]));
    function set(slug, patch) {
        const a = bySlug[slug];
        if (!a) throw new Error('missing ' + slug);
        Object.assign(a, patch);
        a.dateModified = '2026-09-09';
    }
    function rel(slug, arr) {
        const seen = new Set();
        const out = [];
        for (const s of arr) {
            if (s === slug || seen.has(s) || !bySlug[s]) continue;
            seen.add(s);
            out.push(s);
            if (out.length === 8) break;
        }
        set(slug, { related: out });
    }

    for (const c of ALL_CITIES) {
        const slug = `consultas-psicologia-${c.slug}`;
        set(slug, {
            title: c.title,
            description: c.description,
            ctaKind: 'mental',
            liveSlots: true,
            slotService: 'psicologia',
            faq: faqFromCity(c)
        });
        rel(slug, c.related);
    }

    // Nutrition cluster
    const nutCluster = [
        'consulta-nutricao-online-como-funciona',
        'consultas-nutricao-perda-de-peso',
        'quanto-custa-consulta-nutricao-portugal',
        'adse-consultas-nutricao-portugal',
        'cheque-nutricionista-2026',
        'nutricionista-ou-dietista-portugal',
        'como-encontrar-um-nutricionista'
    ];
    rel('consulta-nutricao-online-como-funciona', [...nutCluster, 'psicologia-online-vs-presencial']);
    rel('consultas-nutricao-perda-de-peso', [...nutCluster.filter((s) => s !== 'consulta-nutricao-online-como-funciona'), 'consulta-nutricao-online-como-funciona', 'perda-de-peso-sustentavel', 'fome-emocional-vs-fisica']);
    rel('quanto-custa-consulta-nutricao-portugal', nutCluster.filter((s) => s !== 'quanto-custa-consulta-nutricao-portugal').concat(['consultas-nutricao-perda-de-peso']));
    rel('adse-consultas-nutricao-portugal', ['quanto-custa-consulta-nutricao-portugal', 'cheque-nutricionista-2026', 'nutricionista-ou-dietista-portugal', 'consulta-nutricao-online-como-funciona', 'consultas-nutricao-perda-de-peso', 'como-encontrar-um-nutricionista', 'adse-seguros-psicologia-portugal']);
    rel('cheque-nutricionista-2026', ['quanto-custa-consulta-nutricao-portugal', 'adse-consultas-nutricao-portugal', 'nutricionista-ou-dietista-portugal', 'consultas-nutricao-perda-de-peso', 'consulta-nutricao-online-como-funciona', 'consultas-psicologia-gratuitas-portugal', 'apoio-psicologico-universidades-portugal', 'como-encontrar-um-nutricionista']);
    rel('nutricionista-ou-dietista-portugal', ['quanto-custa-consulta-nutricao-portugal', 'adse-consultas-nutricao-portugal', 'cheque-nutricionista-2026', 'consulta-nutricao-online-como-funciona', 'consultas-nutricao-perda-de-peso', 'como-encontrar-um-nutricionista']);

    set('cheque-nutricionista-2026', {
        title: 'Cheque-Nutricionista 2026: Gratuitas dos 12 aos 35 Anos',
        description: 'Cheque Cuida-te — Nutrição (IPDJ): 12–35 anos, 2+2 consultas no gov.pt. A Lon Clinic não se apresenta como aderente.'
    });
    set('consulta-nutricao-online-como-funciona', {
        title: 'Consulta de Nutrição Online: Como Funciona em 2026',
        description: 'Videochamada no browser. Consulta avulsa 45 € (30 min) ou programa 115 € no mês 1 e 75 €/mês, recibo ADSE. Sem app.'
    });

    // Psych hubs
    rel('consultas-psicologia-gratuitas-portugal', [
        'quanto-custa-consulta-psicologia-portugal', 'como-encontrar-um-psicologo', 'apoio-psicologico-universidades-portugal',
        'adse-seguros-psicologia-portugal', 'psicologia-online-portugal-por-distrito', 'cheque-nutricionista-2026',
        'quando-ir-ao-psicologo-sinais', 'sns-vs-privado-portugal'
    ]);
    rel('adse-seguros-psicologia-portugal', [
        'consultas-psicologia-gratuitas-portugal', 'quanto-custa-consulta-psicologia-portugal', 'como-encontrar-um-psicologo',
        'psicologia-online-vs-presencial', 'adse-consultas-nutricao-portugal', 'seguros-saude-portugal-guia',
        'primeira-consulta-psicologia-o-que-esperar', 'psicologia-online-portugal-por-distrito'
    ]);
    rel('psicologia-online-vs-presencial', [
        'psicologia-online-portugal-por-distrito', 'primeira-consulta-psicologia-o-que-esperar', 'quanto-custa-consulta-psicologia-portugal',
        'como-encontrar-um-psicologo', 'consultas-psicologia-gratuitas-portugal', 'adse-seguros-psicologia-portugal',
        'telemedicina-em-casa', 'consultas-psicologia-lisboa'
    ]);
    rel('primeira-consulta-psicologia-o-que-esperar', [
        'como-encontrar-um-psicologo', 'psicologia-online-vs-presencial', 'quando-ir-ao-psicologo-sinais',
        'consultas-psicologia-gratuitas-portugal', 'quanto-custa-consulta-psicologia-portugal', 'adse-seguros-psicologia-portugal'
    ]);
    rel('quando-ir-ao-psicologo-sinais', [
        'primeira-consulta-psicologia-o-que-esperar', 'como-encontrar-um-psicologo', 'psicologo-ansiedade-quando-procurar-ajuda',
        'burnout-sinais-quando-procurar-ajuda', 'quando-procurar-ajuda-para-a-depressao', 'consultas-psicologia-gratuitas-portugal',
        'psicologia-online-vs-presencial'
    ]);
    rel('psicologo-ansiedade-quando-procurar-ajuda', [
        'quando-ir-ao-psicologo-sinais', 'tcc-para-ansiedade', 'ansiedade-normal-ou-perturbacao',
        'primeira-consulta-psicologia-o-que-esperar', 'como-encontrar-um-psicologo', 'psicologia-online-vs-presencial',
        'consultas-psicologia-gratuitas-portugal'
    ]);
    rel('burnout-sinais-quando-procurar-ajuda', [
        'burnout-o-que-e-sinais-cansaco', 'burnout-ou-depressao', '9-sinais-de-burnout-no-trabalho',
        'quando-ir-ao-psicologo-sinais', 'psicologo-ansiedade-quando-procurar-ajuda',
        'como-as-empresas-podem-prevenir-o-burnout', 'como-encontrar-um-psicologo', 'quanto-custa-consulta-psicologia-portugal'
    ]);
    set('burnout-sinais-quando-procurar-ajuda', {
        title: 'Burnout: Sinais e Quando Procurar Ajuda',
        description: 'Sinais de burnout (OMS/Maslach), teste CBI e psicologia Lon a 60 € / 56 €/semana. Liga ao centro /burnout.',
        ctaKind: 'burnout',
        liveSlots: true,
        slotService: 'psicologia'
    });
    rel('apoio-psicologico-universidades-portugal', [
        'consultas-psicologia-gratuitas-portugal', 'psicologia-online-portugal-por-distrito',
        'consultas-psicologia-porto', 'consultas-psicologia-lisboa', 'consultas-psicologia-coimbra',
        'consultas-psicologia-braga', 'consultas-psicologia-faro', 'cheque-nutricionista-2026'
    ]);
    rel('psicologia-online-portugal-por-distrito', [
        'consultas-psicologia-porto', 'consultas-psicologia-lisboa', 'consultas-psicologia-aveiro',
        'consultas-psicologia-coimbra', 'consultas-psicologia-braga', 'consultas-psicologia-luanda',
        'psicologia-online-vs-presencial', 'apoio-psicologico-universidades-portugal'
    ]);
    set('psicologia-online-portugal-por-distrito', {
        title: 'Psicologia Online em Portugal por Distrito (2026)',
        description: 'Psicologia online em qualquer distrito, Madeira e Açores, hora de Lisboa. 60 € / 56 €/semana. Guias Porto, Lisboa, Aveiro.'
    });
    const distritoFaq = bySlug['psicologia-online-portugal-por-distrito'].faq;
    distritoFaq.forEach((item) => {
        if (item.q.includes('Como marcar')) {
            item.a = 'Escolha o psicólogo na página de saúde mental da Lon Clinic (/saudemental) ou faça a triagem, marque (60 € ou 56 €/semana) e receba o link Doxy.me no browser. A sessão dura 50 minutos.';
        }
        if (item.q.includes('Madeira')) {
            item.a = 'Na Madeira e nos Açores a Lon Clinic usa a mesma videochamada, à hora de Lisboa. No estrangeiro — incluindo quem pesquisa Luanda — use a página de psicólogo para emigrantes. Não há um produto Lon Clinic em Luanda.';
        }
    });

    // Gold city extras
    rel('consultas-psicologia-porto', [
        'psicologia-online-portugal-por-distrito', 'consultas-psicologia-lisboa', 'consultas-psicologia-gondomar',
        'apoio-psicologico-universidades-portugal', 'consultas-psicologia-gratuitas-portugal',
        'quanto-custa-consulta-psicologia-portugal', 'psicologia-online-vs-presencial', 'adse-seguros-psicologia-portugal'
    ]);
    rel('consultas-psicologia-lisboa', [
        'psicologia-online-portugal-por-distrito', 'consultas-psicologia-porto', 'consultas-psicologia-almada',
        'apoio-psicologico-universidades-portugal', 'consultas-psicologia-gratuitas-portugal',
        'quanto-custa-consulta-psicologia-portugal', 'psicologia-online-vs-presencial', 'adse-seguros-psicologia-portugal'
    ]);
    rel('consultas-psicologia-aveiro', [
        'psicologia-online-portugal-por-distrito', 'consultas-psicologia-porto', 'consultas-psicologia-coimbra',
        'apoio-psicologico-universidades-portugal', 'consultas-psicologia-gratuitas-portugal',
        'quanto-custa-consulta-psicologia-portugal', 'psicologia-online-vs-presencial', 'consultas-psicologia-ovar'
    ]);
    set('consultas-psicologia-aveiro', {
        title: 'Consultas de Psicologia em Aveiro: Online, SNS e UA',
        description: 'Psicologia em Aveiro: SAS da Universidade de Aveiro, SNS e online Lon a 60 € / 56 €/semana.'
    });

    // Older guides we touch
    rel('como-encontrar-um-psicologo', [
        'consultas-psicologia-gratuitas-portugal', 'quanto-custa-consulta-psicologia-portugal',
        'primeira-consulta-psicologia-o-que-esperar', 'quando-ir-ao-psicologo-sinais',
        'psicologia-online-vs-presencial', 'como-encontrar-um-nutricionista',
        'tcc-para-ansiedade', 'telemedicina-em-casa'
    ]);
    rel('quanto-custa-consulta-psicologia-portugal', [
        'consultas-psicologia-gratuitas-portugal', 'como-encontrar-um-psicologo',
        'adse-seguros-psicologia-portugal', 'psicologia-online-vs-presencial',
        'psicologia-online-portugal-por-distrito', 'seguros-saude-portugal-guia',
        'seguro-saude-compensa', 'primeira-consulta-psicologia-o-que-esperar'
    ]);
    rel('como-encontrar-um-nutricionista', [
        'quanto-custa-consulta-nutricao-portugal', 'nutricionista-ou-dietista-portugal',
        'consultas-nutricao-perda-de-peso', 'consulta-nutricao-online-como-funciona',
        'adse-consultas-nutricao-portugal', 'cheque-nutricionista-2026',
        'perda-de-peso-sustentavel', 'como-encontrar-um-psicologo'
    ]);
    if (bySlug['perda-de-peso-sustentavel']) {
        rel('perda-de-peso-sustentavel', [
            'consultas-nutricao-perda-de-peso', 'como-encontrar-um-nutricionista',
            'nutricionista-plano-perda-de-peso', 'efeito-ioio', 'deficit-calorico',
            'quanto-custa-consulta-nutricao-portugal'
        ]);
    }
    if (bySlug['nutricionista-plano-perda-de-peso']) {
        rel('nutricionista-plano-perda-de-peso', [
            'consultas-nutricao-perda-de-peso', 'perda-de-peso-sustentavel',
            'como-encontrar-um-nutricionista', 'consulta-nutricao-online-como-funciona',
            'quanto-custa-consulta-nutricao-portugal'
        ]);
    }
    if (bySlug['fome-emocional-vs-fisica']) {
        rel('fome-emocional-vs-fisica', [
            'consultas-nutricao-perda-de-peso', 'stress-e-perda-de-peso',
            'alimentacao-intuitiva', 'gatilhos-emocionais',
            'como-encontrar-um-nutricionista', 'quando-ir-ao-psicologo-sinais'
        ]);
    }

    // Bidirectional: if A related B among campaign, ensure B has A if room
    const camp = new Set([
        ...nutCluster,
        'consultas-psicologia-gratuitas-portugal', 'adse-seguros-psicologia-portugal',
        'psicologia-online-vs-presencial', 'primeira-consulta-psicologia-o-que-esperar',
        'quando-ir-ao-psicologo-sinais', 'psicologo-ansiedade-quando-procurar-ajuda',
        'burnout-sinais-quando-procurar-ajuda', 'apoio-psicologico-universidades-portugal',
        'psicologia-online-portugal-por-distrito',
        ...ALL_CITIES.map((c) => `consultas-psicologia-${c.slug}`),
        'consultas-psicologia-porto', 'consultas-psicologia-lisboa', 'consultas-psicologia-aveiro'
    ]);
    for (const slug of camp) {
        const a = bySlug[slug];
        if (!a) continue;
        for (const b of a.related || []) {
            if (!camp.has(b) || !bySlug[b]) continue;
            const rb = bySlug[b].related || [];
            if (!rb.includes(slug) && rb.length < 8) {
                rb.push(slug);
                bySlug[b].related = rb;
            }
        }
    }
}

function insertAfterFirstH2Block(body, token) {
    if (body.includes(token.trim()) && (body.match(/\{\{cta\}\}/g) || []).length >= 2) return body;
    const parts = body.split(/\n(?=## )/);
    if (parts.length < 3) return body;
    // after first real H2 section (index 1)
    if (parts[1].includes('{{cta}}')) return body;
    parts[1] = parts[1].replace(/\s*$/, '\n\n{{cta}}\n');
    return parts.join('\n');
}

function patchHubMarkdown() {
    // gratuitas: universidades in-body
    let g = read('consultas-psicologia-gratuitas-portugal');
    if (!g.includes('/blog/apoio-psicologico-universidades-portugal')) {
        g = g.replace(
            'A generalidade das universidades públicas portuguesas — Coimbra, Porto, Lisboa, Minho, Aveiro, Algarve, entre outras — tem gabinete de apoio psicopedagógico ou serviço de aconselhamento psicológico **gratuito para estudantes inscritos**.',
            'A generalidade das universidades públicas portuguesas — Coimbra, Porto, Lisboa, Minho, Aveiro, Algarve, entre outras — tem gabinete de apoio psicopedagógico ou serviço de aconselhamento psicológico **gratuito para estudantes inscritos**. O mapa verificado está em [apoio psicológico nas universidades](/blog/apoio-psicologico-universidades-portugal).'
        );
        write('consultas-psicologia-gratuitas-portugal', g);
    }

    let adse = read('adse-seguros-psicologia-portugal');
    if ((adse.match(/\{\{cta\}\}/g) || []).length < 2) {
        adse = adse.replace(
            '## ADSE: regime convencionado vs regime livre',
            '{{cta}}\n\n## ADSE: regime convencionado vs regime livre'
        );
        write('adse-seguros-psicologia-portugal', adse);
    }

    let cheque = read('cheque-nutricionista-2026');
    if (!cheque.includes('/blog/consulta-nutricao-online-como-funciona')) {
        cheque = cheque.replace(
            'Preços do particular: [quanto custa uma consulta de nutrição](/blog/quanto-custa-consulta-nutricao-portugal). Recibo ADSE: [ADSE e nutrição](/blog/adse-consultas-nutricao-portugal).',
            'Preços do particular: [quanto custa uma consulta de nutrição](/blog/quanto-custa-consulta-nutricao-portugal). Recibo ADSE: [ADSE e nutrição](/blog/adse-consultas-nutricao-portugal). Formato: [consulta de nutrição online](/blog/consulta-nutricao-online-como-funciona). Perda de peso: [consultas de nutrição para perda de peso](/blog/consultas-nutricao-perda-de-peso). Títulos: [nutricionista ou dietista](/blog/nutricionista-ou-dietista-portugal). O irmão em psicologia: [consultas de psicologia gratuitas](/blog/consultas-psicologia-gratuitas-portugal) e [apoio nas universidades](/blog/apoio-psicologico-universidades-portugal).'
        );
    }
    if ((cheque.match(/\{\{cta\}\}/g) || []).length < 2) {
        cheque = cheque.replace(
            '## Quantas consultas dá o Cheque-Nutricionista?',
            '{{cta}}\n\n## Quantas consultas dá o Cheque-Nutricionista?'
        );
    }
    write('cheque-nutricionista-2026', cheque);

    let adseN = read('adse-consultas-nutricao-portugal');
    if (!adseN.includes('/blog/consulta-nutricao-online-como-funciona')) {
        adseN = adseN.replace(
            'Há um guia irmão para psicologia: [ADSE e seguros na psicologia](/blog/adse-seguros-psicologia-portugal).',
            'Há um guia irmão para psicologia: [ADSE e seguros na psicologia](/blog/adse-seguros-psicologia-portugal). Formato da consulta Lon: [consulta de nutrição online](/blog/consulta-nutricao-online-como-funciona). Programa: [reeducação metabólica](/nutricao/programa).'
        );
    }
    if ((adseN.match(/\{\{cta\}\}/g) || []).length < 2) {
        adseN = adseN.replace(
            '## Quanto recebo de volta se pagar uma consulta de nutrição em regime livre?',
            '{{cta}}\n\n## Quanto recebo de volta se pagar uma consulta de nutrição em regime livre?'
        );
    }
    write('adse-consultas-nutricao-portugal', adseN);

    let diet = read('nutricionista-ou-dietista-portugal');
    if (!diet.includes('/blog/consultas-nutricao-perda-de-peso')) {
        diet = diet.replace(
            'Hub: [/nutricao](/nutricao).',
            'Hub: [/nutricao](/nutricao). Perda de peso: [consultas de nutrição para perda de peso](/blog/consultas-nutricao-perda-de-peso). Online: [consulta de nutrição online](/blog/consulta-nutricao-online-como-funciona).'
        );
        write('nutricionista-ou-dietista-portugal', diet);
    }

    let unis = read('apoio-psicologico-universidades-portugal');
    if (!unis.includes('/blog/consultas-psicologia-coimbra')) {
        unis = unis.replace(
            'O mapa nacional sem custo de consulta:',
            'Guias de cidade com SAS: [Porto](/blog/consultas-psicologia-porto), [Lisboa](/blog/consultas-psicologia-lisboa), [Aveiro](/blog/consultas-psicologia-aveiro), [Coimbra](/blog/consultas-psicologia-coimbra), [Braga](/blog/consultas-psicologia-braga), [Guimarães](/blog/consultas-psicologia-guimaraes), [Covilhã](/blog/consultas-psicologia-covilha), [Faro](/blog/consultas-psicologia-faro), [Évora](/blog/consultas-psicologia-evora), [Vila Real](/blog/consultas-psicologia-vila-real). O mapa nacional sem custo de consulta:'
        );
        write('apoio-psicologico-universidades-portugal', unis);
    }

    let dist = read('psicologia-online-portugal-por-distrito');
    dist = dist.replace(
        'Escolhe psicólogo em /saudemental ou faz a triagem, marca (60 € ou 56 €/semana), recebe o link Doxy.me no browser. A sessão dura 50 minutos.',
        'Escolha o psicólogo na página de saúde mental da Lon Clinic (/saudemental) ou faça a [triagem](/triagem), marque (60 € ou 56 €/semana) e receba o link Doxy.me no browser. A sessão dura 50 minutos.'
    );
    write('psicologia-online-portugal-por-distrito', dist);

    let lisboa = read('consultas-psicologia-lisboa');
    if (!lisboa.includes('/blog/apoio-psicologico-universidades-portugal')) {
        lisboa = lisboa.replace(
            'Formato: [online vs presencial](/blog/psicologia-online-vs-presencial).',
            'Formato: [online vs presencial](/blog/psicologia-online-vs-presencial). Universidades: [apoio psicológico nas universidades](/blog/apoio-psicologico-universidades-portugal). AML: [Almada](/blog/consultas-psicologia-almada) · [Cascais](/blog/consultas-psicologia-cascais) · [Sintra](/blog/consultas-psicologia-sintra).'
        );
        write('consultas-psicologia-lisboa', lisboa);
    }

    let porto = read('consultas-psicologia-porto');
    if (!porto.includes('/blog/apoio-psicologico-universidades-portugal')) {
        porto = porto.replace(
            'Formato: [online vs presencial](/blog/psicologia-online-vs-presencial).',
            'Formato: [online vs presencial](/blog/psicologia-online-vs-presencial). Universidades: [apoio psicológico nas universidades](/blog/apoio-psicologico-universidades-portugal).'
        );
        write('consultas-psicologia-porto', porto);
    }

    let burnout = read('burnout-sinais-quando-procurar-ajuda');
    if (!burnout.includes('[lon-slots: serviço="psicologia"]')) {
        /* already has */
    }
    if (!burnout.includes('/blog/quando-ir-ao-psicologo-sinais')) {
        burnout = burnout.replace(
            'A definição e a diferença para o cansaço estão em [burnout: o que é e sinais](/blog/burnout-o-que-e-sinais-cansaco).',
            'A definição e a diferença para o cansaço estão em [burnout: o que é e sinais](/blog/burnout-o-que-e-sinais-cansaco). O panorama geral de ir ao psicólogo: [quando ir ao psicólogo](/blog/quando-ir-ao-psicologo-sinais). Ansiedade no trabalho: [psicólogo para ansiedade](/blog/psicologo-ansiedade-quando-procurar-ajuda).'
        );
        write('burnout-sinais-quando-procurar-ajuda', burnout);
    }

    let encontrarP = read('como-encontrar-um-psicologo');
    if (!encontrarP.includes('/blog/psicologia-online-vs-presencial')) {
        encontrarP = encontrarP.replace(
            '- **Formato**: presencial ou online? Para muita gente em Portugal, sobretudo fora dos grandes centros urbanos, a telepsicologia resolve o problema de simplesmente não haver oferta suficiente perto de casa.',
            '- **Formato**: presencial ou online? O detalhe está em [psicologia online vs presencial](/blog/psicologia-online-vs-presencial). Fora dos grandes centros, a telepsicologia resolve a falta de oferta perto de casa; o mapa está em [psicologia online por distrito](/blog/psicologia-online-portugal-por-distrito).'
        );
        write('como-encontrar-um-psicologo', encontrarP);
    }

    let encontrarN = read('como-encontrar-um-nutricionista');
    if (!encontrarN.includes('/blog/cheque-nutricionista-2026')) {
        encontrarN = encontrarN.replace(
            'O acompanhamento é continuado, não pontual — o [programa de reeducação metabólica](/nutricao/programa) custa 115 € no primeiro mês e 75 €/mês a partir daí (duas consultas por mês, compromisso de três meses).',
            'O acompanhamento é continuado, não pontual — o [programa de reeducação metabólica](/nutricao/programa) custa 115 € no primeiro mês e 75 €/mês a partir daí (duas consultas por mês, compromisso de três meses). Custos e ADSE: [quanto custa uma consulta de nutrição](/blog/quanto-custa-consulta-nutricao-portugal) · [ADSE e nutrição](/blog/adse-consultas-nutricao-portugal). Cheque público (12–35): [Cheque-Nutricionista 2026](/blog/cheque-nutricionista-2026) — a Lon **não** se apresenta como aderente. Títulos: [nutricionista ou dietista](/blog/nutricionista-ou-dietista-portugal).'
        );
        write('como-encontrar-um-nutricionista', encontrarN);
    }

    let qn = read('quanto-custa-consulta-psicologia-portugal');
    if (!qn.includes('/blog/psicologia-online-portugal-por-distrito')) {
        qn = qn.replace(
            'Se ainda está a escolher com quem falar, [como encontrar um psicólogo](/blog/como-encontrar-um-psicologo) cobre cédula da OPP, primeira sessão e quando mudar.',
            'Se ainda está a escolher com quem falar, [como encontrar um psicólogo](/blog/como-encontrar-um-psicologo) cobre cédula da OPP, primeira sessão e quando mudar. Por cidade: [psicologia online por distrito](/blog/psicologia-online-portugal-por-distrito).'
        );
        write('quanto-custa-consulta-psicologia-portugal', qn);
    }

    let pds = read('perda-de-peso-sustentavel');
    if (!pds.includes('/blog/consultas-nutricao-perda-de-peso')) {
        pds = pds.replace(
            '{{cta}}',
            'O desenho clínico da casa está em [consultas de nutrição para perda de peso](/blog/consultas-nutricao-perda-de-peso) e no [programa de reeducação metabólica](/nutricao/programa) (115 € / 75 €/mês, sem aGLP-1).\n\n{{cta}}',
            1
        );
        write('perda-de-peso-sustentavel', pds);
    }

    let fome = read('fome-emocional-vs-fisica');
    if (!fome.includes('/blog/consultas-nutricao-perda-de-peso')) {
        fome = fome.replace(
            '{{cta}}',
            'Quando a fome emocional manda no peso, o [programa de reeducação](/nutricao/programa) articula nutrição com [psicologia](/saudemental). O percurso nutricional está em [consultas de nutrição para perda de peso](/blog/consultas-nutricao-perda-de-peso).\n\n{{cta}}',
            1
        );
        write('fome-emocional-vs-fisica', fome);
    }
}

function main() {
    for (const c of ALL_CITIES) {
        write(`consultas-psicologia-${c.slug}`, cityArticle(c));
    }
    patchHubMarkdown();
    const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    patchManifest(man);
    fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 4) + '\n');
    console.log('patched', ALL_CITIES.length, 'city articles + manifest');
}

main();
