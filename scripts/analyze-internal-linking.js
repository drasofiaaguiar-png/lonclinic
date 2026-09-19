/**
 * Análise de Internal Linking - Lon Clinic
 * Identifica artigos órfãos e sugere melhorias de linking
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, 'data', 'guide', 'articles');
const OUTPUT_FILE = path.join(__dirname, 'internal-linking-report.json');

/**
 * Parse frontmatter de um artigo
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\s*\n([\s\S]+?)\n---/);
    if (!match) return null;
    
    const frontmatter = {};
    const lines = match[1].split('\n');
    
    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        frontmatter[key] = value;
    }
    
    return frontmatter;
}

/**
 * Extrai todos os links internos de um artigo
 */
function extractInternalLinks(content) {
    const links = [];
    
    // Regex para encontrar links markdown: [texto](/blog/slug)
    const markdownLinkRegex = /\[([^\]]+)\]\(\/blog\/([^)]+)\)/g;
    let match;
    
    while ((match = markdownLinkRegex.exec(content)) !== null) {
        links.push({
            text: match[1],
            slug: match[2]
        });
    }
    
    return links;
}

/**
 * Analisa todos os artigos
 */
function analyzeArticles() {
    if (!fs.existsSync(ARTICLES_DIR)) {
        console.error('❌ Diretório de artigos não encontrado');
        return null;
    }
    
    const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
    const articles = new Map();
    const linkGraph = new Map(); // slug -> array de slugs que linkam para ele
    
    console.log(`📊 Analisando ${files.length} artigos...\n`);
    
    // Primeira passagem: ler todos os artigos
    for (const file of files) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const frontmatter = parseFrontmatter(content);
        
        if (!frontmatter || !frontmatter.slug) continue;
        
        const slug = frontmatter.slug;
        const outboundLinks = extractInternalLinks(content);
        
        articles.set(slug, {
            slug,
            title: frontmatter.title || slug,
            section: frontmatter.section || 'blog',
            published: frontmatter.published || frontmatter.updated || 'unknown',
            outboundLinks: outboundLinks.map(l => l.slug),
            outboundCount: outboundLinks.length,
            inboundCount: 0,
            inboundLinks: []
        });
        
        // Inicializar linkGraph
        if (!linkGraph.has(slug)) {
            linkGraph.set(slug, []);
        }
        
        // Registar outbound links
        for (const link of outboundLinks) {
            if (!linkGraph.has(link.slug)) {
                linkGraph.set(link.slug, []);
            }
            linkGraph.get(link.slug).push(slug);
        }
    }
    
    // Segunda passagem: calcular inbound links
    for (const [slug, article] of articles) {
        if (linkGraph.has(slug)) {
            article.inboundLinks = linkGraph.get(slug);
            article.inboundCount = article.inboundLinks.length;
        }
    }
    
    return articles;
}

/**
 * Identifica artigos órfãos (sem inbound links)
 */
function findOrphans(articles) {
    const orphans = [];
    
    for (const [slug, article] of articles) {
        if (article.inboundCount === 0) {
            orphans.push(article);
        }
    }
    
    return orphans.sort((a, b) => b.published.localeCompare(a.published));
}

/**
 * Identifica artigos com poucos outbound links
 */
function findLowOutbound(articles, threshold = 3) {
    const lowOutbound = [];
    
    for (const [slug, article] of articles) {
        if (article.outboundCount < threshold) {
            lowOutbound.push(article);
        }
    }
    
    return lowOutbound.sort((a, b) => a.outboundCount - b.outboundCount);
}

/**
 * Identifica hubs (artigos com muitos inbound links)
 */
function findHubs(articles, threshold = 10) {
    const hubs = [];
    
    for (const [slug, article] of articles) {
        if (article.inboundCount >= threshold) {
            hubs.push(article);
        }
    }
    
    return hubs.sort((a, b) => b.inboundCount - a.inboundCount);
}

/**
 * Sugere links para artigos órfãos baseado em similaridade de tópicos
 */
function suggestLinksForOrphans(orphans, articles) {
    const suggestions = new Map();
    
    for (const orphan of orphans) {
        const keywords = extractKeywords(orphan.title + ' ' + orphan.slug);
        const candidates = [];
        
        for (const [slug, article] of articles) {
            if (slug === orphan.slug) continue;
            
            const articleKeywords = extractKeywords(article.title + ' ' + article.slug);
            const similarity = calculateSimilarity(keywords, articleKeywords);
            
            if (similarity > 0.2) {
                candidates.push({
                    slug: article.slug,
                    title: article.title,
                    similarity,
                    section: article.section
                });
            }
        }
        
        candidates.sort((a, b) => b.similarity - a.similarity);
        suggestions.set(orphan.slug, candidates.slice(0, 5));
    }
    
    return suggestions;
}

/**
 * Extrai palavras-chave simples
 */
function extractKeywords(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .filter(w => !['para', 'como', 'qual', 'guia', 'portugal', 'blog'].includes(w));
}

/**
 * Calcula similaridade simples entre dois conjuntos de palavras
 */
function calculateSimilarity(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(w => set2.has(w)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
}

/**
 * Gera relatório completo
 */
function generateReport() {
    const articles = analyzeArticles();
    if (!articles) return;
    
    const orphans = findOrphans(articles);
    const lowOutbound = findLowOutbound(articles, 5);
    const hubs = findHubs(articles, 10);
    const suggestions = suggestLinksForOrphans(orphans, articles);
    
    const report = {
        summary: {
            totalArticles: articles.size,
            orphanCount: orphans.length,
            orphanPercentage: ((orphans.length / articles.size) * 100).toFixed(1),
            lowOutboundCount: lowOutbound.length,
            hubCount: hubs.length,
            avgInboundLinks: (Array.from(articles.values()).reduce((sum, a) => sum + a.inboundCount, 0) / articles.size).toFixed(1),
            avgOutboundLinks: (Array.from(articles.values()).reduce((sum, a) => sum + a.outboundCount, 0) / articles.size).toFixed(1)
        },
        orphans: orphans.map(a => ({
            slug: a.slug,
            title: a.title,
            section: a.section,
            published: a.published,
            outboundLinks: a.outboundCount
        })),
        lowOutbound: lowOutbound.slice(0, 20).map(a => ({
            slug: a.slug,
            title: a.title,
            outboundCount: a.outboundCount,
            inboundCount: a.inboundCount
        })),
        hubs: hubs.map(a => ({
            slug: a.slug,
            title: a.title,
            inboundCount: a.inboundCount,
            outboundCount: a.outboundCount
        })),
        suggestions: Object.fromEntries(
            Array.from(suggestions.entries()).map(([slug, suggs]) => [
                slug,
                suggs.map(s => ({ slug: s.slug, title: s.title, similarity: s.similarity.toFixed(2) }))
            ])
        )
    };
    
    // Salvar JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    
    // Imprimir resumo
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 RELATÓRIO DE INTERNAL LINKING');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📈 ESTATÍSTICAS GERAIS:');
    console.log(`   Total de artigos: ${report.summary.totalArticles}`);
    console.log(`   Média inbound links: ${report.summary.avgInboundLinks}`);
    console.log(`   Média outbound links: ${report.summary.avgOutboundLinks}\n`);
    
    console.log(`🔴 ARTIGOS ÓRFÃOS (sem inbound links): ${report.summary.orphanCount} (${report.summary.orphanPercentage}%)`);
    if (orphans.length > 0) {
        console.log('   Top 10 órfãos mais recentes:');
        orphans.slice(0, 10).forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.title}`);
            console.log(`      Slug: ${a.slug}`);
            console.log(`      Publicado: ${a.published}`);
            console.log(`      Outbound links: ${a.outboundCount}\n`);
        });
    }
    
    console.log(`\n⚠️  ARTIGOS COM POUCOS OUTBOUND LINKS (<5): ${report.summary.lowOutboundCount}`);
    if (lowOutbound.length > 0) {
        console.log('   Top 10:');
        lowOutbound.slice(0, 10).forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.title} (${a.outboundCount} links)`);
        });
    }
    
    console.log(`\n⭐ HUBS (≥10 inbound links): ${report.summary.hubCount}`);
    if (hubs.length > 0) {
        hubs.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.title}`);
            console.log(`      ${a.inboundCount} artigos linkam para este`);
            console.log(`      ${a.outboundCount} outbound links\n`);
        });
    }
    
    console.log(`\n💡 SUGESTÕES DE LINKING:`);
    console.log(`   Geradas ${suggestions.size} sugestões para artigos órfãos`);
    console.log(`   Veja detalhes completos em: ${OUTPUT_FILE}\n`);
    
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Relatório salvo em: ${OUTPUT_FILE}`);
    console.log('═══════════════════════════════════════════════════\n');
    
    return report;
}

// Executar se chamado diretamente
if (require.main === module) {
    generateReport();
}

module.exports = {
    analyzeArticles,
    findOrphans,
    findHubs,
    generateReport
};
