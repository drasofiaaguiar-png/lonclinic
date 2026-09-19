/**
 * Sitemap dinâmico para Lon Clinic
 * Gera automaticamente URLs de todos os artigos do blog
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, 'data', 'guide', 'articles');
const BASE_URL = 'https://www.lonclinic.com';

/**
 * Parse frontmatter YAML simples de um ficheiro Markdown
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
        
        // Remove aspas
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        frontmatter[key] = value;
    }
    
    return frontmatter;
}

/**
 * Lê todos os artigos da pasta de artigos
 */
function getAllArticles() {
    if (!fs.existsSync(ARTICLES_DIR)) {
        return [];
    }
    
    const files = fs.readdirSync(ARTICLES_DIR);
    const articles = [];
    
    for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        const filePath = path.join(ARTICLES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const frontmatter = parseFrontmatter(content);
        
        if (frontmatter && frontmatter.slug) {
            articles.push({
                slug: frontmatter.slug,
                published: frontmatter.published || frontmatter.updated || new Date().toISOString().split('T')[0],
                updated: frontmatter.updated || frontmatter.published || new Date().toISOString().split('T')[0],
                section: frontmatter.section || 'blog'
            });
        }
    }
    
    return articles;
}

/**
 * Gera sitemap XML
 */
function generateSitemap() {
    const articles = getAllArticles();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
    
    // Páginas principais estáticas
    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'weekly' },
        { url: '/travel-clinic', priority: '1.0', changefreq: 'weekly' },
        { url: '/tourist-clinic', priority: '0.92', changefreq: 'weekly' },
        { url: '/consulta', priority: '0.9', changefreq: 'weekly' },
        { url: '/burnout', priority: '0.95', changefreq: 'weekly' },
        { url: '/burnout/teste', priority: '0.9', changefreq: 'monthly' },
        { url: '/saudemental', priority: '0.9', changefreq: 'weekly' },
        { url: '/nutricao', priority: '0.9', changefreq: 'weekly' },
        { url: '/blog', priority: '0.8', changefreq: 'weekly' },
        { url: '/magazine', priority: '0.85', changefreq: 'weekly' }
    ];
    
    for (const page of staticPages) {
        const lastmod = new Date().toISOString().split('T')[0];
        xml += `    <url>\n`;
        xml += `        <loc>${BASE_URL}${page.url}</loc>\n`;
        xml += `        <lastmod>${lastmod}</lastmod>\n`;
        xml += `        <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `        <priority>${page.priority}</priority>\n`;
        xml += `    </url>\n`;
    }
    
    // Artigos do blog
    for (const article of articles) {
        xml += `    <url>\n`;
        xml += `        <loc>${BASE_URL}/blog/${article.slug}</loc>\n`;
        xml += `        <lastmod>${article.updated}</lastmod>\n`;
        xml += `        <changefreq>monthly</changefreq>\n`;
        xml += `        <priority>0.75</priority>\n`;
        xml += `    </url>\n`;
    }
    
    xml += '</urlset>\n';
    
    return xml;
}

/**
 * Endpoint para Express
 */
function sitemapEndpoint(req, res) {
    try {
        const xml = generateSitemap();
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Erro ao gerar sitemap:', error);
        res.status(500).send('Erro ao gerar sitemap');
    }
}

// Gerar sitemap.xml estático se executado diretamente
if (require.main === module) {
    const xml = generateSitemap();
    fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml);
    console.log(`✅ Sitemap gerado com ${getAllArticles().length} artigos`);
}

module.exports = {
    generateSitemap,
    sitemapEndpoint,
    getAllArticles
};
