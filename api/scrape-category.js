// API endpoint pour scraper une catégorie de recettes Kannamma
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, maxRecipes = 10 } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🔍 Scraping category: ${url}`);

    // Fetch la page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const recipes = [];
    
    // Sélecteurs pour Kannamma Cooks
    $('article.post, .recipe-card, .entry-content').each((index, element) => {
      if (recipes.length >= maxRecipes) return false;
      
      const $el = $(element);
      
      // Extraire le lien
      const link = $el.find('a').first().attr('href') || 
                  $el.find('.entry-title a').attr('href') ||
                  $el.find('h2 a').attr('href');
      
      // Extraire le titre
      const title = $el.find('.entry-title').text().trim() ||
                   $el.find('h2').text().trim() ||
                   $el.find('h3').text().trim();
      
      // Extraire l'image
      const imageUrl = $el.find('img').first().attr('src') ||
                      $el.find('.wp-post-image').attr('src');
      
      if (link && title) {
        recipes.push({
          url: link.startsWith('http') ? link : `https://www.kannammacooks.com${link}`,
          title: title,
          category: new URL(url).pathname.split('/').filter(p => p)[0] || 'general',
          imageUrl: imageUrl
        });
      }
    });

    console.log(`✅ Found ${recipes.length} recipes`);

    res.status(200).json({
      success: true,
      recipes: recipes.slice(0, maxRecipes)
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape category'
    });
  }
}