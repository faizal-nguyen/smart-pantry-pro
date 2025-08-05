// Service de traduction optimisé avec cache et batch processing
// Économie maximale pour rester <200€/mois

import { supabase } from '@/integrations/supabase/client';
import { ScrapedRecipe } from './kannamma-scraper';

export interface TranslatedRecipe extends ScrapedRecipe {
  translated_title: string;
  translated_description: string;
  translated_instructions: string[];
  translated_ingredients: Array<{
    name: string;
    name_fr: string;
    quantity: number;
    unit: string;
    unit_fr: string;
    allergen_warnings_fr: string[];
  }>;
  translation_quality_score: number;
}

export class RecipeTranslationService {
  // Déterminer l'URL de base pour les API
  private readonly API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'https://smart-pantry-pro.vercel.app'
    : '';

  // Glossaire culinaire indien → français
  private readonly CULINARY_GLOSSARY = {
    // Épices
    'turmeric': 'curcuma',
    'cumin': 'cumin',
    'coriander': 'coriandre', 
    'mustard seeds': 'graines de moutarde',
    'curry leaves': 'feuilles de curry',
    'asafoetida': 'asafoetida (hing)',
    'fenugreek': 'fenugrec',
    'cardamom': 'cardamome',
    'cinnamon': 'cannelle',
    'cloves': 'clous de girofle',
    'black pepper': 'poivre noir',
    'red chili': 'piment rouge',
    'ginger': 'gingembre',
    'garlic': 'ail',
    
    // Légumes indiens
    'okra': 'gombo',
    'drumstick': 'moringa', 
    'ridge gourd': 'luffa',
    'bottle gourd': 'calebasse',
    'bitter gourd': 'margose',
    'snake gourd': 'courge serpent',
    
    // Légumineuses
    'toor dal': 'lentilles toor',
    'moong dal': 'lentilles moong',
    'urad dal': 'lentilles urad',
    'chana dal': 'pois chiches cassés',
    'masoor dal': 'lentilles corail',
    
    // Produits
    'jaggery': 'sucre de palme (jaggery)',
    'tamarind': 'tamarin',
    'coconut': 'noix de coco',
    'ghee': 'ghee (beurre clarifié)',
    'paneer': 'paneer (fromage indien)',
    
    // Unités
    'cup': 'tasse (250ml)',
    'tbsp': 'c. à soupe',
    'tsp': 'c. à café',
    'pinch': 'pincée',
    'handful': 'poignée'
  };

  // Traduction en batch avec cache intelligent
  async translateRecipesBatch(recipes: ScrapedRecipe[]): Promise<TranslatedRecipe[]> {
    console.log(`🌐 Translating batch of ${recipes.length} recipes...`);
    
    const translatedRecipes: TranslatedRecipe[] = [];
    
    // 1. Collecter tous les textes uniques à traduire
    const textsToTranslate = this.collectUniqueTexts(recipes);
    console.log(`📝 Unique texts to translate: ${textsToTranslate.length}`);
    
    // 2. Vérifier le cache pour les traductions existantes
    const { cachedTranslations, missingTexts } = await this.checkTranslationCache(textsToTranslate);
    console.log(`💾 Found ${Object.keys(cachedTranslations).length} cached translations`);
    console.log(`🆕 Need to translate ${missingTexts.length} new texts`);
    
    // 3. Traduire les textes manquants en batch
    let newTranslations: Record<string, string> = {};
    if (missingTexts.length > 0) {
      newTranslations = await this.translateTextsViaBatch(missingTexts);
      
      // Sauvegarder dans le cache
      await this.saveToCache(newTranslations);
    }
    
    // 4. Combiner cache + nouvelles traductions
    const allTranslations = { ...cachedTranslations, ...newTranslations };
    
    // 5. Appliquer les traductions aux recettes
    for (const recipe of recipes) {
      const translatedRecipe = this.applyTranslations(recipe, allTranslations);
      translatedRecipes.push(translatedRecipe);
    }
    
    return translatedRecipes;
  }

  // Collecter tous les textes uniques à traduire
  private collectUniqueTexts(recipes: ScrapedRecipe[]): string[] {
    const texts = new Set<string>();
    
    for (const recipe of recipes) {
      // Titre et description
      texts.add(recipe.name);
      texts.add(recipe.description);
      
      // Instructions
      recipe.instructions.forEach(inst => texts.add(inst));
      
      // Ingrédients (noms seulement, quantités restent en chiffres)
      recipe.ingredients.forEach(ing => {
        texts.add(ing.name);
        texts.add(ing.unit);
      });
    }
    
    return Array.from(texts).filter(text => text && text.trim());
  }

  // Vérifier le cache de traductions
  private async checkTranslationCache(texts: string[]): Promise<{
    cachedTranslations: Record<string, string>,
    missingTexts: string[]
  }> {
    const cached: Record<string, string> = {};
    const missing: string[] = [];
    
    // Requête batch au cache
    const { data: cacheData } = await supabase
      .from('translation_cache')
      .select('source_text, translated_text')
      .in('source_text', texts)
      .eq('source_language', 'en')
      .eq('target_language', 'fr')
      .gt('expires_at', new Date().toISOString());
    
    // Construire map des traductions cachées
    if (cacheData) {
      cacheData.forEach(row => {
        cached[row.source_text] = row.translated_text;
      });
    }
    
    // Identifier textes manquants
    texts.forEach(text => {
      if (!cached[text]) {
        missing.push(text);
      }
    });
    
    return { cachedTranslations: cached, missingTexts: missing };
  }

  // Traduire via API en batch (optimisé coûts)
  private async translateTextsViaBatch(texts: string[]): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    // D'abord vérifier le glossaire local
    texts.forEach(text => {
      const glossaryTranslation = this.CULINARY_GLOSSARY[text.toLowerCase()];
      if (glossaryTranslation) {
        translations[text] = glossaryTranslation;
      }
    });
    
    // Filtrer les textes déjà traduits par glossaire
    const remainingTexts = texts.filter(t => !translations[t]);
    
    if (remainingTexts.length === 0) {
      return translations;
    }
    
    // Batch de maximum 50 textes par appel API
    const BATCH_SIZE = 50;
    for (let i = 0; i < remainingTexts.length; i += BATCH_SIZE) {
      const batch = remainingTexts.slice(i, i + BATCH_SIZE);
      
      try {
        // Estimer et tracker le coût
        const estimatedCost = await this.estimateTranslationCost(batch.length);
        console.log(`💰 Batch translation cost: €${estimatedCost.toFixed(3)}`);
        
        // Appel API de traduction
        const response = await fetch(`${this.API_BASE_URL}/api/translate-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: batch,
            sourceLang: 'en',
            targetLang: 'fr',
            context: 'culinary'
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Tracker le coût réel
          if (result.cost) {
            await this.trackApiUsage('translation', result.cost, batch.length);
          }
          
          // Stocker les traductions
          batch.forEach((text, idx) => {
            if (result.translations[idx]) {
              translations[text] = result.translations[idx];
            }
          });
        }
        
      } catch (error) {
        console.error('Translation batch error:', error);
        // Fallback: traduction basique pour les textes manqués
        batch.forEach(text => {
          translations[text] = this.basicTranslation(text);
        });
      }
    }
    
    return translations;
  }

  // Sauvegarder les traductions dans le cache
  private async saveToCache(translations: Record<string, string>): Promise<void> {
    const cacheEntries = Object.entries(translations).map(([source, translated]) => ({
      source_text: source,
      source_language: 'en',
      target_language: 'fr',
      translated_text: translated,
      context: 'recipe'
    }));
    
    if (cacheEntries.length > 0) {
      await supabase.from('translation_cache').insert(cacheEntries);
    }
  }

  // Appliquer les traductions à une recette
  private applyTranslations(recipe: ScrapedRecipe, translations: Record<string, string>): TranslatedRecipe {
    return {
      ...recipe,
      translated_title: translations[recipe.name] || recipe.name,
      translated_description: translations[recipe.description] || recipe.description,
      translated_instructions: recipe.instructions.map(inst => 
        translations[inst] || inst
      ),
      translated_ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        name_fr: translations[ing.name] || ing.name,
        unit_fr: this.translateUnit(ing.unit, translations),
        allergen_warnings_fr: this.detectAllergensFr(ing.name)
      })),
      translation_quality_score: this.calculateQualityScore(recipe, translations)
    };
  }

  // Traduction des unités
  private translateUnit(unit: string, translations: Record<string, string>): string {
    // Priorité au cache/API
    if (translations[unit]) return translations[unit];
    
    // Sinon glossaire
    const glossaryUnit = this.CULINARY_GLOSSARY[unit.toLowerCase()];
    if (glossaryUnit) return glossaryUnit;
    
    // Conversions communes
    const unitMap: Record<string, string> = {
      'cup': 'tasse (250ml)',
      'cups': 'tasses (250ml)',
      'tbsp': 'c. à soupe',
      'tsp': 'c. à café',
      'oz': 'oz (30g)',
      'lb': 'livre (450g)',
      'pinch': 'pincée',
      'handful': 'poignée',
      'bunch': 'bouquet',
      'piece': 'pièce',
      'pieces': 'pièces'
    };
    
    return unitMap[unit.toLowerCase()] || unit;
  }

  // Détecter les allergènes en français
  private detectAllergensFr(ingredientName: string): string[] {
    const allergens: string[] = [];
    const ingredient = ingredientName.toLowerCase();
    
    // Mapping allergènes
    const allergenMap = {
      'peanut': 'arachides',
      'groundnut': 'arachides',
      'milk': 'produits laitiers',
      'dairy': 'produits laitiers',
      'ghee': 'produits laitiers',
      'paneer': 'produits laitiers',
      'wheat': 'gluten',
      'flour': 'gluten',
      'egg': 'œufs',
      'cashew': 'fruits à coque',
      'almond': 'fruits à coque',
      'pistachio': 'fruits à coque',
      'sesame': 'sésame',
      'til': 'sésame'
    };
    
    Object.entries(allergenMap).forEach(([key, value]) => {
      if (ingredient.includes(key)) {
        allergens.push(value);
      }
    });
    
    return [...new Set(allergens)];
  }

  // Calculer le score de qualité de traduction
  private calculateQualityScore(recipe: ScrapedRecipe, translations: Record<string, string>): number {
    let translatedCount = 0;
    let totalTexts = 0;
    
    // Compter les traductions réussies
    if (translations[recipe.name]) translatedCount++;
    totalTexts++;
    
    if (translations[recipe.description]) translatedCount++;
    totalTexts++;
    
    recipe.instructions.forEach(inst => {
      if (translations[inst]) translatedCount++;
      totalTexts++;
    });
    
    recipe.ingredients.forEach(ing => {
      if (translations[ing.name]) translatedCount++;
      totalTexts++;
    });
    
    return Math.round((translatedCount / totalTexts) * 100);
  }

  // Traduction basique de fallback
  private basicTranslation(text: string): string {
    // Remplacer les mots du glossaire
    let translated = text;
    
    Object.entries(this.CULINARY_GLOSSARY).forEach(([en, fr]) => {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      translated = translated.replace(regex, fr);
    });
    
    return translated;
  }

  // Helpers
  private async estimateTranslationCost(textCount: number): Promise<number> {
    const { data } = await supabase.rpc('estimate_api_cost', {
      p_service: 'translation',
      p_operation: 'translate_batch',
      p_batch_size: textCount
    });
    return data || 0;
  }

  private async trackApiUsage(service: string, cost: number, batchSize: number): Promise<void> {
    await supabase.from('api_usage_tracking').insert({
      service,
      cost,
      batch_size: batchSize,
      endpoint: 'translate_batch'
    });
  }
}