'use strict';

const CATEGORIES = [
    { id: 'termas', label: 'Termas & spa' },
    { id: 'yoga', label: 'Yoga & meditação' },
    { id: 'natureza', label: 'Natureza & bosque' },
    { id: 'longevidade', label: 'Longevidade' },
    { id: 'detox', label: 'Detox & nutrição' },
    { id: 'sono', label: 'Sono & recuperação' }
];

const DURATIONS = [
    { id: 'weekend', label: 'Fim de semana' },
    { id: 'short', label: '3–5 dias' },
    { id: 'week', label: '1 semana' },
    { id: 'extended', label: '2 semanas ou mais' }
];

const SETTINGS = [
    { id: 'costa', label: 'Costa' },
    { id: 'serra', label: 'Serra' },
    { id: 'campo', label: 'Campo' },
    { id: 'cidade', label: 'Cidade' }
];

const COUNTRIES = [
    { id: 'PT', label: 'Portugal' },
    { id: 'ES', label: 'Espanha' },
    { id: 'FR', label: 'França' },
    { id: 'IT', label: 'Itália' },
    { id: 'DE', label: 'Alemanha' },
    { id: 'CH', label: 'Suíça' }
];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const DURATION_IDS = new Set(DURATIONS.map((d) => d.id));
const SETTING_IDS = new Set(SETTINGS.map((s) => s.id));
const COUNTRY_IDS = new Set(COUNTRIES.map((c) => c.id));

const EXPERIENCES = [
    {
        slug: 'termas-sao-pedro-do-sul',
        name: 'Termas de São Pedro do Sul',
        shortDescription: 'O mais antigo complexo termal de Portugal — águas sulfúreas a 67 °C, no vale do Vouga.',
        longDescription:
            'São Pedro do Sul é o grande clássico do termalismo português. As águas nascem a mais de 60 °C e são usadas em banhos, hidromassagem e inalações, com um balneário clássico e um hotel termal no mesmo vale.\n\nO ritmo é lento: manhãs de tratamento, tardes a caminhar à beira do rio ou até à serra. Não é um spa de resort — é termalismo de raiz, com uma vila pequena à volta.\n\nA Lon Clinic não opera este programa. A marcação é feita directamente com o espaço. Se estiver a recuperar de burnout ou a planear uma pausa mais longa, uma consulta de longevidade ou anti-burnout pode ajudar a enquadrar a estadia.',
        category: 'termas',
        country: 'PT',
        city: 'São Pedro do Sul',
        region: 'Viseu',
        setting: 'campo',
        duration: 'short',
        durationLabel: '3–5 dias',
        priceFrom: 180,
        image: '/image/guide/guide-waterfall.jpg',
        highlights: [
            'Águas sulfúreas hipertermais',
            'Balneário clássico e hotel termal',
            'Vale do Vouga, a 1h do Porto'
        ],
        website: 'https://www.termas-spsul.com'
    },
    {
        slug: 'furnas-sao-miguel',
        name: 'Furnas, São Miguel',
        shortDescription: 'Vale vulcânico nos Açores: poças termais, Terra Nostra e cozinha de fumarola.',
        longDescription:
            'Furnas é um dos poucos sítios na Europa onde se banha em água termal no meio de um jardim botânico, com fumarolas a fumegar nas ruas. O Parque Terra Nostra tem a poça amarela clássica; à volta há nascentes, caldeiras e o cozido das Furnas, enterrado no chão quente.\n\nO ambiente é húmido, verde e lento. Ideal para 3 a 4 noites: um dia de jardim e poça, um dia de lagoa e trilhos, um dia a não fazer nada.\n\nLeve fatos de banho que possa manchar — a água é ferruginosa. Reserve com antecedência na época alta (julho–setembro).',
        category: 'termas',
        country: 'PT',
        city: 'Furnas',
        region: 'Açores',
        setting: 'campo',
        duration: 'short',
        durationLabel: '3–5 dias',
        priceFrom: 220,
        image: '/image/guide/guide-sunset-lake.jpg',
        highlights: [
            'Poça termal do Parque Terra Nostra',
            'Jardim botânico e fumarolas',
            'Voo directo para Ponta Delgada'
        ],
        website: 'https://www.parquetranostra.com'
    },
    {
        slug: 'peneda-geres-bosque',
        name: 'Peneda-Gerês — bosque e recuperação',
        shortDescription: 'O único parque nacional português: trilhos, cascatas e silêncio de serra.',
        longDescription:
            'O Gerês é o sítio certo quando o corpo pede movimento sem cidade. Trilhos junto a cascatas, aldeias de granito, noites frias e um telemóvel que finalmente perde o sinal.\n\nNão há um único “centro de wellness”: a experiência é o parque. Pode ficar numa casa de aldeia, numa Pousada, ou combinar com as termas do Gerês se quiser água quente no fim do dia.\n\nLeve calçado de montanha e um plano B para chuva. Primavera e setembro são os meses mais generosos.',
        category: 'natureza',
        country: 'PT',
        city: 'Terras de Bouro',
        region: 'Braga',
        setting: 'serra',
        duration: 'weekend',
        durationLabel: 'Fim de semana',
        priceFrom: 140,
        image: '/image/guide/guide-hiker-view.jpg',
        highlights: [
            'Parque Nacional da Peneda-Gerês',
            'Trilhos e cascatas',
            'Opção de termas no mesmo vale'
        ],
        website: 'https://www.natural.pt/portal/pt/AreaProtegida/Item/12'
    },
    {
        slug: 'vidago-palace-thermal',
        name: 'Vidago Palace Thermal',
        shortDescription: 'Palace revival no norte: águas minerais, spa e um parque de pinheiros.',
        longDescription:
            'O Vidago Palace é a versão palaciana do termalismo português — um hotel de 1910, um parque, um campo de golfe e um spa de águas minerais. O ritmo é mais resort do que vila termal.\n\nFunciona bem para uma semana de descompressão: tratamentos de água, caminhadas no parque, refeições lentas. Não é clínico; é conforto com história.\n\nA 1h30 do Porto. Melhor em primavera e outono, quando o parque está cheio e o hotel não está em lotação de casamento.',
        category: 'longevidade',
        country: 'PT',
        city: 'Vidago',
        region: 'Vila Real',
        setting: 'campo',
        duration: 'week',
        durationLabel: '1 semana',
        priceFrom: 890,
        image: '/image/guide/guide-country-road.jpg',
        highlights: [
            'Hotel palace de 1910',
            'Spa de águas minerais',
            'Parque e golfe no mesmo recinto'
        ],
        website: 'https://www.vidagopalace.com'
    },
    {
        slug: 'yoga-algarve-lagos',
        name: 'Retiro de yoga no Algarve',
        shortDescription: 'Semanas de prática à beira-mar, entre Lagos e a costa vicentina.',
        longDescription:
            'O Algarve ocidental — Lagos, Sagres, a Costa Vicentina — concentra retiros de yoga de primavera a outubro. A fórmula é estável: duas práticas por dia, refeições vegetais, mar ao lado, grupos pequenos.\n\nNão há um único operador. Procure retiros com professor identificado, grupo limitado e alojamento no mesmo sítio. Evite programas que prometem “transformação em 48 horas”.\n\nMaio, junho e setembro são os meses com melhor equilíbrio entre calor, preço e lotação.',
        category: 'yoga',
        country: 'PT',
        city: 'Lagos',
        region: 'Algarve',
        setting: 'costa',
        duration: 'week',
        durationLabel: '1 semana',
        priceFrom: 650,
        image: '/image/guide/guide-coastal-sun.jpg',
        highlights: [
            'Yoga e meditação junto ao mar',
            'Costa Vicentina a minutos',
            'Melhor em maio–junho e setembro'
        ],
        website: ''
    },
    {
        slug: 'comporta-semana-longevidade',
        name: 'Semana de longevidade na Comporta',
        shortDescription: 'Areia, pinhal e um ritmo de costa alentejana — dormir, andar, comer simples.',
        longDescription:
            'A Comporta não é um centro médico. É uma costa de areia e pinhal onde o programa é subtrair: menos ecrãs, mais luz de manhã, caminhadas longas, refeições simples, sono a horas de campo.\n\nFunciona como semana de reset entre estações — especialmente para quem vive em cidade e já fez o trabalho clínico (consulta, análises, plano) e precisa de um sítio para o cumprir.\n\nAlojamento de casa ou hotel pequeno. Evite agosto se o objectivo for silêncio.',
        category: 'longevidade',
        country: 'PT',
        city: 'Comporta',
        region: 'Alentejo',
        setting: 'costa',
        duration: 'week',
        durationLabel: '1 semana',
        priceFrom: 780,
        image: '/image/guide/guide-opera-coast.jpg',
        highlights: [
            'Praia e pinhal no mesmo passo',
            'Ritmo de costa, não de resort urbano',
            'Melhor fora de agosto'
        ],
        website: ''
    },
    {
        slug: 'termas-ourense',
        name: 'Termas de Ourense',
        shortDescription: 'A cidade termal da Galiza: poças públicas no Minho e spas de beira-rio.',
        longDescription:
            'Ourense tem mais águas termais urbanas do que qualquer outra cidade ibérica. Há poças públicas gratuitas junto ao Minho (A Chavasqueira, O Tinteiro, Outariz) e spas pagos a dois passos.\n\nPode fazer-se num fim de semana de comboio a partir do Porto: chegar, banhar ao fim do dia, jantar na cidade velha, repetir de manhã. Leve toalha e chinelos para as poças públicas.\n\nA água é alcalina e quente. As poças públicas têm horários e regras de higiene — confirme antes de ir à noite.',
        category: 'termas',
        country: 'ES',
        city: 'Ourense',
        region: 'Galiza',
        setting: 'cidade',
        duration: 'weekend',
        durationLabel: 'Fim de semana',
        priceFrom: 90,
        image: '/image/guide/guide-lake-boats.jpg',
        highlights: [
            'Poças públicas no rio Minho',
            'Spas urbanos a dois passos',
            'Comboio directo desde o Porto'
        ],
        website: 'https://turismodeourense.gal'
    },
    {
        slug: 'yoga-deia-mallorca',
        name: 'Yoga em Deià, Mallorca',
        shortDescription: 'A aldeia da serra de Tramuntana: prática, pedra e Mediterrâneo em baixo.',
        longDescription:
            'Deià é pequena, cara e vertical — casas de pedra na Tramuntana, o mar em baixo, um ritmo de aldeia de artistas. Os retiros de yoga aqui tendem a ser íntimos, com alojamento em casas de pedra e caminhadas até à cala.\n\nUma semana chega. Menos do que isso gasta-se só a aterrar no ritmo da serra. Fora de julho e agosto há mais silêncio e preços menos agressivos.\n\nReserve alojamento cedo: a aldeia enche e as estradas são estreitas. Aluguer de carro a partir de Palma é o mais prático.',
        category: 'yoga',
        country: 'ES',
        city: 'Deià',
        region: 'Mallorca',
        setting: 'costa',
        duration: 'week',
        durationLabel: '1 semana',
        priceFrom: 980,
        image: '/image/guide/travel-cover-hq-3.webp',
        highlights: [
            'Serra de Tramuntana e calas',
            'Retiros em casas de pedra',
            'Melhor em maio, junho e setembro'
        ],
        website: ''
    },
    {
        slug: 'abano-terme',
        name: 'Abano Terme',
        shortDescription: 'A capital italiana da fangoterapia, a 40 minutos de Veneza.',
        longDescription:
            'Abano e Montegrotto são uma conurbação termal no Euganei: hotéis com piscinas de água salgada-bromídica-iódica e tratamentos de lodo (fango) que a região pratica há décadas.\n\nO formato clássico é uma semana: fango de manhã, piscina à tarde, Veneza ou Pádua num dia livre. É mais médico-termal do que “wellness Instagram”.\n\nMuitos hotéis trabalham com médico termal no local. Confirme se o programa de fango exige avaliação prévia — em alguns casos sim.',
        category: 'termas',
        country: 'IT',
        city: 'Abano Terme',
        region: 'Véneto',
        setting: 'campo',
        duration: 'week',
        durationLabel: '1 semana',
        priceFrom: 720,
        image: '/image/guide/travel-cover-hq-5.webp',
        highlights: [
            'Fangoterapia eugânea',
            'Hotéis termais com piscina própria',
            'Veneza a 40 minutos'
        ],
        website: 'https://www.abanoterme.net'
    },
    {
        slug: 'baden-baden-friedrichsbad',
        name: 'Baden-Baden, Friedrichsbad',
        shortDescription: 'O ritual romano-irlandês mais famoso da Alemanha, na Floresta Negra.',
        longDescription:
            'O Friedrichsbad é um percurso de 17 estações — calor seco, vapor, banhos, massagem com escova, piscina circular — num edifício do século XIX. Não se trata de um spa de velas: é um ritual de duas horas, nua, com regras claras.\n\nBaden-Baden à volta oferece hotéis, o Caracalla Therme (mais contemporâneo, com fato de banho) e a Floresta Negra para caminhar no dia seguinte.\n\nUm fim de semana chega para o Friedrichsbad + uma noite. Reserve o horário do Friedrichsbad com antecedência; os slots mistos e separados por género têm calendário próprio.',
        category: 'termas',
        country: 'DE',
        city: 'Baden-Baden',
        region: 'Baden-Württemberg',
        setting: 'cidade',
        duration: 'weekend',
        durationLabel: 'Fim de semana',
        priceFrom: 160,
        image: '/image/guide/travel-cover-hq-4.webp',
        highlights: [
            'Ritual romano-irlandês de 17 estações',
            'Caracalla Therme no mesmo dia',
            'Floresta Negra à porta'
        ],
        website: 'https://www.carasana.de/en/friedrichsbad'
    },
    {
        slug: 'leukerbad-alpine-spa',
        name: 'Leukerbad Alpine Spa',
        shortDescription: 'A maior estação termal dos Alpes suíços — água a 51 °C a 1.400 m.',
        longDescription:
            'Leukerbad junta águas termais alpinas, um burgbath aberto com vista para a parede de rocha, e um burgbath indoor enorme (Burgerbad). No inverno combina-se com neve; no verão com trilhos e a Gemmi.\n\nTrês a cinco noites são o formato certo. Mais do que uma semana só faz sentido se quiser caminhar a sério na Lotschental ou na Gemmi.\n\nA água é rica em cálcio e sulfato. O Burgerbad é o complexo principal; o Lindner e outros hotéis têm piscinas próprias. Comboio até Leuk e autocarro até à estação.',
        category: 'termas',
        country: 'CH',
        city: 'Leukerbad',
        region: 'Valais',
        setting: 'serra',
        duration: 'short',
        durationLabel: '3–5 dias',
        priceFrom: 420,
        image: '/image/guide/travel-cover-hq-6.webp',
        highlights: [
            'Águas a 51 °C a 1.400 metros',
            'Burgerbad e piscinas de hotel',
            'Alpes no verão e no inverno'
        ],
        website: 'https://www.leukerbad.ch'
    },
    {
        slug: 'evian-les-bains',
        name: 'Évian-les-Bains',
        shortDescription: 'A margem francesa do Léman: spa, sono e o ritmo lento do lago.',
        longDescription:
            'Évian é a versão francesa do termalismo de lago: o Evian Resort, o spa, o casino antigo, e o Léman à frente. O programa típico é sono, tratamentos de água, caminhadas na margem e muito menos ecrã.\n\nFunciona bem para uma pausa de 3 a 5 noites quando o objectivo é recuperar sono e não “fazer coisas”. Genebra fica a menos de uma hora.\n\nNão é barato. Fora de julho–agosto o lago está mais quieto e os hotéis mais acessíveis. A fonte pública da água de Évian está na vila — vale a visita, mesmo que o spa seja noutro sítio.',
        category: 'sono',
        country: 'FR',
        city: 'Évian-les-Bains',
        region: 'Alta Saboia',
        setting: 'costa',
        duration: 'short',
        durationLabel: '3–5 dias',
        priceFrom: 540,
        image: '/image/guide/travel-cover-hq-7.webp',
        highlights: [
            'Lago Léman e spa de resort',
            'Genebra a menos de 1 hora',
            'Ritmo de sono, não de agenda cheia'
        ],
        website: 'https://www.evianresort.com'
    },
    {
        slug: 'detox-serra-estrela',
        name: 'Detox na Serra da Estrela',
        shortDescription: 'Ar frio, cozinha simples e dias sem ecrã no planalto mais alto de Portugal.',
        longDescription:
            'A Estrela dá para um detox sem voo: casas de aldeia, ar a 1.500 m, caminhadas no planalto, sopa e silêncio. Não há um único operador de “detox clínico” — e isso é uma vantagem. O programa é o sítio.\n\nCinco a sete dias funcionam melhor do que um fim de semana: o primeiro dia gasta-se a desacelerar. Leve camadas; o tempo muda depressa.\n\nSe o objectivo for nutricional (jejum, protocolos restritivos), fale primeiro com um médico. A serra não substitui avaliação clínica.',
        category: 'detox',
        country: 'PT',
        city: 'Manteigas',
        region: 'Guarda',
        setting: 'serra',
        duration: 'short',
        durationLabel: '3–5 dias',
        priceFrom: 260,
        image: '/image/guide/guide-group-walk.jpg',
        highlights: [
            'Planalto a 1.500 metros',
            'Aldeias e casas de serra',
            'Sem voo a partir de Lisboa ou Porto'
        ],
        website: ''
    }
];

function labelFor(list, id) {
    const hit = list.find((item) => item.id === id);
    return hit ? hit.label : id;
}

function countryLabel(id) {
    return labelFor(COUNTRIES, id);
}

function categoryLabel(id) {
    return labelFor(CATEGORIES, id);
}

function settingLabel(id) {
    return labelFor(SETTINGS, id);
}

function durationLabelFor(id, fallback) {
    return fallback || labelFor(DURATIONS, id);
}

function publicItem(item) {
    return {
        slug: item.slug,
        name: item.name,
        shortDescription: item.shortDescription,
        longDescription: item.longDescription,
        category: item.category,
        categoryLabel: categoryLabel(item.category),
        country: item.country,
        countryLabel: countryLabel(item.country),
        city: item.city,
        region: item.region || '',
        setting: item.setting,
        settingLabel: settingLabel(item.setting),
        duration: item.duration,
        durationLabel: durationLabelFor(item.duration, item.durationLabel),
        priceFrom: item.priceFrom,
        image: item.image,
        highlights: item.highlights || [],
        website: item.website || ''
    };
}

function list() {
    return EXPERIENCES.map(publicItem);
}

function getBySlug(slug) {
    const id = String(slug || '').trim().toLowerCase();
    const item = EXPERIENCES.find((e) => e.slug === id);
    return item ? publicItem(item) : null;
}

function relatedFor(slug, limit) {
    const item = getBySlug(slug);
    if (!item) return [];
    const max = Math.max(1, Number(limit) || 3);
    const rest = list().filter((e) => e.slug !== item.slug);
    const picked = [];
    const take = (pred) => {
        rest.forEach((e) => {
            if (picked.length >= max) return;
            if (!pred(e) || picked.some((x) => x.slug === e.slug)) return;
            picked.push(e);
        });
    };
    take((e) => e.country === item.country);
    take((e) => e.category === item.category);
    return picked.slice(0, max);
}

function cities(country) {
    const set = new Set();
    EXPERIENCES.forEach((e) => {
        if (country && e.country !== country) return;
        if (e.city) set.add(e.city);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
}

function normalizeFilter(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const country = String(src.country || '').trim().toUpperCase();
    const category = String(src.category || '').trim();
    const duration = String(src.duration || '').trim();
    const setting = String(src.setting || '').trim();
    return {
        q: String(src.q || '').trim().toLowerCase(),
        country: COUNTRY_IDS.has(country) ? country : '',
        city: String(src.city || '').trim(),
        category: CATEGORY_IDS.has(category) ? category : '',
        duration: DURATION_IDS.has(duration) ? duration : '',
        setting: SETTING_IDS.has(setting) ? setting : ''
    };
}

function filterList(raw) {
    const f = normalizeFilter(raw);
    return list().filter((item) => {
        if (f.country && item.country !== f.country) return false;
        if (f.city && item.city !== f.city) return false;
        if (f.category && item.category !== f.category) return false;
        if (f.duration && item.duration !== f.duration) return false;
        if (f.setting && item.setting !== f.setting) return false;
        if (f.q) {
            const blob = [
                item.name,
                item.shortDescription,
                item.city,
                item.region,
                item.countryLabel,
                item.categoryLabel
            ].join(' ').toLowerCase();
            if (!blob.includes(f.q)) return false;
        }
        return true;
    });
}

function meta() {
    return {
        categories: CATEGORIES,
        countries: COUNTRIES.filter((c) => EXPERIENCES.some((e) => e.country === c.id)),
        cities: cities(),
        durations: DURATIONS,
        settings: SETTINGS
    };
}

module.exports = {
    CATEGORIES,
    COUNTRIES,
    DURATIONS,
    SETTINGS,
    list,
    getBySlug,
    relatedFor,
    filterList,
    cities,
    meta
};
