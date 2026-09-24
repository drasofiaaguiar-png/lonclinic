'use strict';

/** LON Wellness Club — partner marketplace. Editorial stays on /blog; this is a product page under /wellness. */

const CATEGORIES = [
    { id: 'pilates', label: 'Pilates' },
    { id: 'yoga', label: 'Yoga' },
    { id: 'treino', label: 'Treino' },
    { id: 'massagem', label: 'Massagem' },
    { id: 'meditacao', label: 'Meditação' },
    { id: 'movimento', label: 'Movimento' },
    { id: 'padel', label: 'Padel' }
];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

const SEED = [
    {
        id: '11111111-1111-4111-8111-111111111101',
        slug: 'atelier-pilates-lisboa',
        name: 'Atelier Pilates',
        description: 'Aulas de pilates em aparelho e solo, em grupos pequenos. Indicado para postura, força e recuperação de movimento.',
        category: 'pilates',
        city: 'Lisboa',
        image: '/image/funcional-hero-janela.webp',
        website: '',
        published: false
    },
    {
        id: '11111111-1111-4111-8111-111111111102',
        slug: 'yoga-restaurativo-porto',
        name: 'Yoga restaurativo',
        description: 'Sessões lentas de yoga restaurativo e respiração, para quem quer descomprimir sem intensidade.',
        category: 'yoga',
        city: 'Porto',
        image: '/image/funcional-yoga.webp',
        website: '',
        published: false
    },
    {
        id: '11111111-1111-4111-8111-111111111103',
        slug: 'treino-funcional-lisboa',
        name: 'Treino funcional',
        description: 'Treino de força em grupos reduzidos, com acompanhamento de um treinador. Sem aula aberta de ginásio.',
        category: 'treino',
        city: 'Lisboa',
        image: '/image/hero-run.webp',
        website: '',
        published: false
    },
    {
        id: '11111111-1111-4111-8111-111111111104',
        slug: 'massagem-terapeutica-coimbra',
        name: 'Massagem terapêutica',
        description: 'Massagem de recuperação muscular e relaxamento. Marcação directa com o espaço.',
        category: 'massagem',
        city: 'Coimbra',
        image: '/image/guide/guide-coastal-sun.jpg',
        website: '',
        published: false
    },
    {
        id: '11111111-1111-4111-8111-111111111105',
        slug: 'meditacao-guiada-online',
        name: 'Meditação guiada',
        description: 'Sessões online de meditação guiada, em português, para sono e regulação do stress.',
        category: 'meditacao',
        city: 'Online',
        image: '/image/guide/guide-sunset-lake.jpg',
        website: '',
        published: false
    },
    {
        id: '11111111-1111-4111-8111-111111111106',
        slug: 'caminhada-movimento-porto',
        name: 'Caminhada e movimento',
        description: 'Saídas guiadas a pé, ritmo conversável, para quem quer movimento ao ar livre sem um plano de treino.',
        category: 'movimento',
        city: 'Porto',
        image: '/image/guide/guide-group-walk.jpg',
        website: '',
        published: false
    },
    {
        id: '11111111-1111-4111-8111-111111111107',
        slug: 'soul-circle',
        name: 'Soul Circle',
        subtitle: 'Pilates clássico em Lisboa',
        priceLabel: '79€',
        description: 'Estúdio de pilates clássico em Lisboa, em grupos pequenos.',
        codes: [
            { code: 'LONINTRO', detail: '3 sessões por 79€ em vez de 89€, na primeira inscrição. Válido 21 dias.' },
            { code: 'LONCLINIC', detail: '10% de desconto no membership, enquanto estiver ativo.' }
        ],
        category: 'pilates',
        city: 'Lisboa',
        image: '/image/funcional-yoga.webp',
        website: 'https://soulcirclepilates.com',
        published: true
    },
    {
        id: '11111111-1111-4111-8111-111111111108',
        slug: 'clube-de-padel',
        name: 'Clube de Padel',
        subtitle: 'Doca de Santo Amaro, Lisboa',
        priceLabel: '5%',
        revealLabel: 'Ver condições',
        description: 'Reservas de campos e eventos na Doca de Santo Amaro.',
        codes: [
            { code: 'Protocolo', detail: '5% de desconto nas reservas de campos para clientes LON Clinic.' },
            { code: 'Eventos', detail: 'Torneios em breve, incluindo o Torneio Carlsberg.' }
        ],
        category: 'padel',
        city: 'Lisboa',
        image: '/image/hero-run.webp',
        website: 'https://www.clubedepadel.pt/',
        published: true
    }
];

function categoryLabel(id) {
    const hit = CATEGORIES.find((c) => c.id === id);
    return hit ? hit.label : String(id || '');
}

function slugify(name) {
    const base = String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return base || 'parceiro';
}

function cleanUrl(raw, { allowPath }) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (allowPath && s.startsWith('/') && !s.startsWith('//') && !s.includes('..')) return s.slice(0, 500);
    try {
        const u = new URL(s);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
        return u.toString().slice(0, 500);
    } catch (_) {
        return null;
    }
}

function normalizeInput(body, { existingSlug } = {}) {
    const src = body && typeof body === 'object' ? body : {};
    const name = String(src.name || '').trim().slice(0, 120);
    const description = String(src.description || '').trim().slice(0, 900);
    const category = String(src.category || '').trim();
    const city = String(src.city || '').trim().slice(0, 80);
    if (name.length < 2) return { error: 'Indique o nome do parceiro.' };
    if (description.length < 10) return { error: 'A descrição precisa de pelo menos 10 caracteres.' };
    if (!CATEGORY_IDS.has(category)) return { error: 'Escolha uma categoria.' };
    if (city.length < 2) return { error: 'Indique a cidade.' };
    const image = cleanUrl(src.image, { allowPath: true });
    if (image == null) return { error: 'A imagem tem de ser um caminho do site ou um URL http(s).' };
    const website = cleanUrl(src.website, { allowPath: false });
    if (website == null) return { error: 'O site tem de ser um URL http(s), ou ficar vazio.' };
    const published = src.published === false || src.published === 'false' ? false : true;
    const slug = existingSlug || slugify(name);
    return {
        value: { name, description, category, city, image, website, published, slug }
    };
}

function toPublic(row) {
    if (!row || row.published === false) return null;
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        subtitle: row.subtitle || '',
        priceLabel: row.priceLabel || '',
        description: row.description,
        category: row.category,
        hasCodes: Array.isArray(row.codes) && row.codes.length > 0,
        revealLabel: row.revealLabel || '',
        categoryLabel: categoryLabel(row.category),
        city: row.city,
        image: row.image || '',
        website: row.website || ''
    };
}

function filterPartners(rows, query) {
    const q = String((query && query.q) || '').trim().toLowerCase();
    const category = String((query && query.category) || '').trim();
    const city = String((query && query.city) || '').trim().toLowerCase();
    return (rows || [])
        .map(toPublic)
        .filter(Boolean)
        .filter((row) => {
            if (category && row.category !== category) return false;
            if (city && String(row.city || '').toLowerCase() !== city) return false;
            if (!q) return true;
            const hay = `${row.name} ${row.subtitle} ${row.priceLabel} ${row.description} ${row.city} ${row.categoryLabel}`.toLowerCase();
            return hay.includes(q);
        });
}

function metaFrom(rows) {
    const cities = [];
    const seen = new Set();
    for (const row of rows || []) {
        if (row.published === false) continue;
        const city = String(row.city || '').trim();
        const key = city.toLowerCase();
        if (!city || seen.has(key)) continue;
        seen.add(key);
        cities.push(city);
    }
    cities.sort((a, b) => a.localeCompare(b, 'pt'));
    return { categories: CATEGORIES, cities };
}

module.exports = {
    CATEGORIES,
    SEED,
    categoryLabel,
    slugify,
    normalizeInput,
    toPublic,
    filterPartners,
    metaFrom
};
