'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'guide', 'manifest.json');

const SMALL = new Set([
    '/image/guide/guide-opera-coast.jpg',
    '/image/guide/guide-sunset-lake.jpg',
    '/image/guide/guide-lake-boats.jpg',
    '/image/guide/guide-waterfall.jpg',
    '/image/guide/guide-coastal-sun.jpg',
    '/image/guide/guide-mountain-path.avif',
    '/image/image2.webp',
    '/image/guide/travel-cover-hq-1.png',
    '/image/guide/travel-cover-2.png',
    '/image/guide/travel-cover-3.png',
    '/image/guide/travel-cover-4.png',
    '/image/guide/travel-cover-5.png',
    '/image/guide/travel-cover-6.png',
    '/image/guide/travel-cover-7.png',
    '/image/guide/travel-cover-8.png'
]);

const NATURE = [
    '/image/guide/guide-hiker-view.jpg',
    '/image/guide/guide-group-walk.jpg',
    '/image/guide/guide-country-road.jpg',
    '/image/travel-clinic-mountain-bg.jpg'
];
const CLINIC = [
    '/image/image1_files/CoventGarden_Large_Desktop.jpg',
    '/image/image1_files/Marylebone_Large_Desktop.jpg',
    '/image/image1_files/ColmoreRow_Large_Desktop.jpg',
    '/image/image1_files/Ostermalmstorg_Large_Desktop.jpg',
    '/image/image1_files/LincolnSquare_Large_Desktop.jpg',
    '/image/image1_files/Spitalfields_Large_Desktop.jpg'
];
const TRAVEL = [
    '/image/guide/travel-cover-hq-2.webp',
    '/image/guide/travel-cover-hq-3.webp',
    '/image/guide/travel-cover-hq-4.webp',
    '/image/guide/travel-cover-hq-5.webp',
    '/image/guide/travel-cover-hq-6.webp',
    '/image/guide/travel-cover-hq-7.webp',
    '/image/guide/travel-cover-hq-8.webp',
    '/image/travel-clinic-mountain-bg.jpg'
];

function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
}
function pick(pool, slug) {
    return pool[hash(slug) % pool.length];
}
function remapImage(article) {
    const img = article.image;
    if (!img || !SMALL.has(img)) return article.image;
    const slug = String(article.slug || '');
    if (/vacina|viajante|travel|malaria|viajar/.test(slug)) return pick(TRAVEL, slug);
    if (/burnout/.test(slug) || article.about === 'Burnout') return pick(NATURE, slug);
    if (/nutricao|nutricionista|dietista|peso/.test(slug)) return pick(NATURE, slug + 'n');
    return pick([...NATURE, ...CLINIC], slug);
}

const NEW = [
    {
        slug: 'consulta-medica-viajantes-vacinas',
        title: 'Consulta Médica Para Viajantes: Vacinas e Cuidados Antes de Viajar',
        description: 'Quando marcar medicina do viajante (4–6 semanas), vacinas por destino e consulta Lon a 39 €. Vacina no CVI, não no ecrã.',
        about: 'Viagem',
        image: '/image/travel-clinic-mountain-bg.jpg',
        ctaKind: 'travel',
        liveSlots: true,
        slotService: 'travel',
        readingMinutes: 8,
        related: [
            'consulta-medica-online-vale-a-pena',
            'melhores-plataformas-telemedicina',
            'saude-preventiva-adultos-jovens',
            'quanto-custa-consulta-medicina-do-viajante',
            'vacinas-viajante-guia-completo',
            'centros-de-vacinacao-internacional-portugal',
            'consulta-do-viajante-urgente',
            'telemedicina-em-casa'
        ],
        faq: [
            { q: 'Quando devo marcar a consulta de medicina do viajante?', a: 'Idealmente 4 a 6 semanas antes da viagem, para dar tempo a que as vacinas façam efeito e, se forem necessárias várias doses, para as espaçar adequadamente. É orientação frequente, não uma garantia.' },
            { q: 'A consulta de medicina do viajante pode ser feita online?', a: 'Sim, a avaliação e o aconselhamento podem ser feitos por teleconsulta. A administração da vacina em si exige presença física num centro de vacinação.' },
            { q: 'Preciso mesmo de vacinas para todos os destinos fora da Europa?', a: 'Não necessariamente — depende do destino específico, da zona (urbana ou rural), da duração e do tipo de viagem. É por isso que a avaliação é individualizada, e não um pacote genérico de vacinas.' },
            { q: 'O que acontece se marcar a consulta em cima da viagem?', a: 'Ainda vale a pena. Mesmo sem tempo para todas as vacinas fazerem efeito completo, há sempre aconselhamento e cuidados práticos que reduzem o risco durante a viagem.' },
            { q: 'Quanto tempo demora uma consulta de medicina do viajante?', a: 'Na Lon Clinic, 20 minutos para 1 pessoa; 30 minutos a duas; 40 minutos a três ou quatro. Não é o slot de 30 minutos da clínica geral.' }
        ]
    },
    {
        slug: 'saude-preventiva-adultos-jovens',
        title: 'Saúde Preventiva Para Adultos Jovens: Por Que Começar Cedo',
        description: 'Prevenção aos 20–30 anos sem check-up Lon inventado. Clínica geral 39 €; análises no laboratório; interpretação em consulta.',
        about: 'Clínica geral',
        image: '/image/guide/guide-hiker-view.jpg',
        ctaKind: 'clinica_geral',
        liveSlots: true,
        slotService: 'clinica_geral',
        readingMinutes: 7,
        related: [
            'consulta-medica-online-vale-a-pena',
            'quanto-custa-consulta-nutricao-portugal',
            'o-que-e-burnout',
            'psicologia-online-para-burnout',
            'melhores-plataformas-telemedicina',
            'consulta-medica-viajantes-vacinas',
            'consulta-nutricao-online-como-funciona',
            'telemedicina-em-casa'
        ],
        faq: [
            { q: 'Aos 20 ou 30 anos já preciso de consultas preventivas?', a: 'Não é obrigatório estar doente. Vale uma conversa periódica se quiser mapear hábitos, história familiar e análises só quando fizerem sentido.' },
            { q: 'A Lon Clinic faz um check-up com análises incluídas?', a: 'Não. Não existe um produto check-up preventivo Lon. As análises são no laboratório; a consulta interpreta.' },
            { q: 'A teleconsulta mede a minha tensão arterial?', a: 'Não afirmamos isso. A tensão mede-se com aparelho, em contexto presencial ou em casa — não no ecrã.' },
            { q: 'De quanto em quanto tempo devo ir ao médico se me sinto bem?', a: 'Uma orientação frequente é 1 a 2 anos para adultos jovens saudáveis. Não é um protocolo Lon; fale com o médico.' }
        ]
    },
    {
        slug: 'melhores-plataformas-telemedicina',
        title: 'Melhores Plataformas de Telemedicina: Como Escolher',
        description: 'Critérios — ERS, cédula, receita eletrónica válida em Portugal, avaliações verificáveis. Sem ranking de concorrentes.',
        about: 'Telemedicina',
        image: '/image/image3.webp',
        ctaKind: 'clinica_geral',
        liveSlots: true,
        slotService: 'clinica_geral',
        readingMinutes: 7,
        related: [
            'consulta-medica-online-vale-a-pena',
            'renovar-receita-medica-online',
            'consulta-nutricao-online-como-funciona',
            'psicologia-online-vs-presencial',
            'psicologia-online-para-burnout',
            'consulta-medica-viajantes-vacinas',
            'saude-preventiva-adultos-jovens',
            'telemedicina-em-casa'
        ],
        faq: [
            { q: 'Qual é a melhor plataforma de telemedicina em Portugal?', a: 'Não há um ranking honesto sem o seu caso. Procure ERS, cédula na especialidade certa, receita eletrónica válida em Portugal se precisar de farmácia, e avaliações verificáveis.' },
            { q: 'A receita de uma teleconsulta estrangeira serve na farmácia em Portugal?', a: 'Nem sempre. O circuito da farmácia portuguesa é o da receita eletrónica nacional. Confirme o país da cédula antes de assumir que a receita passa.' },
            { q: 'A Lon Clinic está registada na ERS?', a: 'Sim. Número de registo 45475, publicado no site.' },
            { q: 'Preciso da mesma plataforma para médico, psicólogo e nutricionista?', a: 'Não é obrigatório. Ajuda ter o mesmo prestador se quiser continuidade. Na Lon Clinic essas três linhas existem, com preços e slots diferentes.' }
        ]
    },
    {
        slug: 'consulta-medica-online-vale-a-pena',
        title: 'Consulta Médica Online Vale a Pena? Guia Honesto',
        description: 'Vale para clínica do dia a dia e receita eletrónica. Não substitui urgência nem exame físico. Lon: 39 €, 30 min, ERS 45475.',
        about: 'Clínica geral',
        image: '/image/guide/guide-country-road.jpg',
        ctaKind: 'clinica_geral',
        liveSlots: true,
        slotService: 'clinica_geral',
        readingMinutes: 7,
        related: [
            'renovar-receita-medica-online',
            'melhores-plataformas-telemedicina',
            'consulta-medica-viajantes-vacinas',
            'saude-preventiva-adultos-jovens',
            'telemedicina-em-casa',
            'psicologia-online-vs-presencial',
            'consulta-nutricao-online-como-funciona',
            'o-que-e-burnout'
        ],
        faq: [
            { q: 'A consulta médica online vale a pena?', a: 'Sim, para clínica do dia a dia, renovação de receita já conhecida, seguimento e primeiras avaliações. Não substitui exame físico, procedimentos presenciais nem urgência.' },
            { q: 'A receita eletrónica da teleconsulta serve em qualquer farmácia em Portugal?', a: 'Quando o médico a emite, sim — é o circuito nacional. Na Lon Clinic o envio, quando indicado, é por SMS ou email.' },
            { q: 'A Lon Clinic atende urgências por videochamada?', a: 'Não. Dor no peito nova, falta de ar grave ou risco imediato: 112 ou SNS 24 (808 24 24 24).' },
            { q: 'Preciso de instalar uma aplicação?', a: 'Não. A videoconsulta da casa abre no browser.' },
            { q: 'Quanto custa a consulta de clínica geral online na Lon Clinic?', a: '39 €, slot de 30 minutos. A renovação de receita crónica estável é 19 €, outro acto.' }
        ]
    },
    {
        slug: 'renovar-receita-medica-online',
        title: 'Como Renovar a Receita Médica Online em Portugal',
        description: 'Sim, por teleconsulta com médico. Na Lon Clinic a renovação é 19 € em vídeo; receita eletrónica por SMS ou email. Sem urgência.',
        about: 'Clínica geral',
        image: '/image/image1_files/Marylebone_Large_Desktop.jpg',
        ctaKind: 'clinica_geral',
        liveSlots: true,
        slotService: 'clinica_geral',
        readingMinutes: 6,
        related: [
            'consulta-medica-online-vale-a-pena',
            'melhores-plataformas-telemedicina',
            'telemedicina-em-casa',
            'saude-preventiva-adultos-jovens',
            'consulta-medica-viajantes-vacinas'
        ],
        faq: [
            { q: 'Posso renovar a receita médica online em Portugal?', a: 'Sim, numa teleconsulta com um médico, em regra para medicação já conhecida e estável.' },
            { q: 'A Lon Clinic renova receita sem videochamada?', a: 'Não. O acto é consulta por vídeo, não um formulário isolado.' },
            { q: 'A receita chega à farmácia?', a: 'Quando emitida, é receita eletrónica (SMS ou email) válida em farmácia em Portugal.' },
            { q: 'A renovação online é mais barata do que ir ao consultório?', a: 'Na Lon Clinic custa 19 €. Não publicamos um desconto extra nem um preço médio nacional inventado.' },
            { q: 'Renovam-se todos os medicamentos?', a: 'Não. A decisão é clínica. Alguns fármacos pedem avaliação adicional. Não use esta página para urgência.' }
        ]
    },
    {
        slug: 'o-que-e-burnout',
        title: 'O Que É Burnout: Sintomas, Tipos, Teste e Como Sair',
        description: 'Burnout é fenómeno ocupacional (OMS/CID-11): exaustão, cinismo, ineficácia. Teste CBI Lon, tipos Farber, baixa só com médico.',
        about: 'Burnout',
        image: '/image/guide/guide-group-walk.jpg',
        ctaKind: 'burnout',
        liveSlots: true,
        slotService: 'burnout',
        readingMinutes: 9,
        related: [
            'burnout-sinais-quando-procurar-ajuda',
            'psicologia-online-para-burnout',
            'quando-ir-ao-psicologo-sinais',
            'psicologo-ansiedade-quando-procurar-ajuda',
            'primeira-consulta-psicologia-o-que-esperar',
            'consulta-medica-online-vale-a-pena',
            'burnout-ou-depressao',
            'burnout-e-baixa-medica-em-portugal'
        ],
        faq: [
            { q: 'O burnout é uma doença?', a: 'Não é classificado como doença em si, mas sim como um «fenómeno ocupacional» segundo a OMS — um conjunto de sintomas resultante de stress crónico no trabalho não gerido com sucesso.' },
            { q: 'Quanto tempo demora a recuperar de um burnout?', a: 'Varia muito de pessoa para pessoa e depende da gravidade, do tipo de tratamento e das mudanças feitas no ambiente de trabalho. Pode ir de algumas semanas a vários meses.' },
            { q: 'Burnout tem cura?', a: 'Os sintomas do burnout são reversíveis com o tratamento adequado e, sobretudo, com mudanças reais nas condições que o causaram. Sem essas mudanças, é comum o quadro reaparecer.' },
            { q: 'Posso ter burnout mesmo gostando do meu trabalho?', a: 'Sim. O burnout está mais ligado às condições e à carga de trabalho do que ao facto de gostar ou não da profissão.' },
            { q: 'Devo procurar um psicólogo ou um médico primeiro?', a: 'Qualquer um dos dois é um bom ponto de partida. O médico pode avaliar a necessidade de baixa e descartar outras causas físicas; o psicólogo trabalha a gestão do stress e a recuperação emocional.' }
        ]
    },
    {
        slug: 'psicologia-online-para-burnout',
        title: 'Psicologia Online Para Burnout: Como Funciona e Quando Marcar',
        description: 'Psicologia online para burnout: 45 min, 60 € / 54 €/semana, OPP. Sem 56 €. Baixa só o médico. Teste CBI, não MBI.',
        about: 'Burnout',
        image: '/image/guide/guide-hiker-view.jpg',
        ctaKind: 'burnout',
        liveSlots: true,
        slotService: 'burnout',
        readingMinutes: 7,
        related: [
            'o-que-e-burnout',
            'burnout-sinais-quando-procurar-ajuda',
            'psicologia-online-vs-presencial',
            'primeira-consulta-psicologia-o-que-esperar',
            'quando-ir-ao-psicologo-sinais',
            'consulta-medica-online-vale-a-pena',
            'saude-preventiva-adultos-jovens',
            'quanto-custa-consulta-psicologia-portugal'
        ],
        faq: [
            { q: 'A psicologia online funciona para burnout?', a: 'Para a maior parte dos adultos, o trabalho é conversacional e o formato online trata-se como equivalente ao presencial na evidência de psicoterapia. Não substitui crise nem avaliação médica.' },
            { q: 'Quanto custa a psicologia para burnout na Lon Clinic?', a: '60 € a sessão avulsa ou 54 €/semana. Duração 45 minutos. Não 56 €.' },
            { q: 'O psicólogo da Lon Clinic passa baixa médica?', a: 'Não. A baixa é decisão médica.' },
            { q: 'Posso mudar de psicólogo?', a: 'Sim. Sem perguntas, e recomeçar do zero.' },
            { q: 'O teste da Lon Clinic é o MBI?', a: 'Não. É o CBI (Copenhagen Burnout Inventory), em /burnout/teste. O MBI é um instrumento de investigação; não é o produto Lon.' }
        ]
    }
];

function baseMeta(entry) {
    return {
        slug: entry.slug,
        title: entry.title,
        description: entry.description,
        datePublished: '2026-09-09',
        dateModified: '2026-09-09',
        format: 'markdown',
        lang: 'pt',
        hreflang: 'pt-PT',
        about: entry.about,
        image: entry.image,
        verified: false,
        ctaKind: entry.ctaKind,
        liveSlots: entry.liveSlots,
        slotService: entry.slotService,
        readingMinutes: entry.readingMinutes,
        related: entry.related,
        faq: entry.faq
    };
}

const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const bySlug = new Map(man.articles.map((a) => [a.slug, a]));

let remapped = 0;
for (const a of man.articles) {
    const next = remapImage(a);
    if (next !== a.image) {
        a.image = next;
        remapped += 1;
    }
}

const inserted = [];
for (const entry of NEW) {
    if (bySlug.has(entry.slug)) {
        Object.assign(bySlug.get(entry.slug), baseMeta(entry));
        continue;
    }
    const row = baseMeta(entry);
    man.articles.unshift(row);
    bySlug.set(entry.slug, row);
    inserted.push(entry.slug);
}

function addRel(slug, other) {
    const a = bySlug.get(slug);
    if (!a || !bySlug.has(other) || slug === other) return;
    a.related = Array.isArray(a.related) ? a.related : [];
    if (!a.related.includes(other) && a.related.length < 8) a.related.push(other);
}

const mesh = {
    'burnout-sinais-quando-procurar-ajuda': ['o-que-e-burnout', 'psicologia-online-para-burnout'],
    'quando-ir-ao-psicologo-sinais': ['o-que-e-burnout', 'psicologia-online-para-burnout'],
    'psicologo-ansiedade-quando-procurar-ajuda': ['o-que-e-burnout'],
    'primeira-consulta-psicologia-o-que-esperar': ['psicologia-online-para-burnout'],
    'psicologia-online-vs-presencial': ['psicologia-online-para-burnout', 'consulta-medica-online-vale-a-pena', 'melhores-plataformas-telemedicina'],
    'telemedicina-em-casa': ['consulta-medica-online-vale-a-pena', 'melhores-plataformas-telemedicina', 'consulta-medica-viajantes-vacinas'],
    'quanto-custa-consulta-medicina-do-viajante': ['consulta-medica-viajantes-vacinas'],
    'vacinas-viajante-guia-completo': ['consulta-medica-viajantes-vacinas'],
    'consulta-nutricao-online-como-funciona': ['melhores-plataformas-telemedicina', 'saude-preventiva-adultos-jovens'],
    'quanto-custa-consulta-nutricao-portugal': ['saude-preventiva-adultos-jovens']
};
for (const [from, tos] of Object.entries(mesh)) {
    for (const to of tos) addRel(from, to);
}

// Drop related slugs that still have no article file / entry except known product hrefs
for (const a of man.articles) {
    if (!Array.isArray(a.related)) continue;
    a.related = a.related.filter((s) => {
        if (String(s).startsWith('/')) return true;
        return bySlug.has(s);
    });
}

fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 4) + '\n');
console.log(JSON.stringify({ remapped, inserted, articles: man.articles.length }, null, 2));
