import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Translation mapping for common Indian ingredients
const ingredientTranslations: Record<string, string> = {
  // Spices
  'curcuma': 'turmeric',
  'poudre de curcuma': 'turmeric powder',
  'coriandre': 'coriander',
  'feuilles de coriandre': 'coriander leaves',
  'graines de coriandre': 'coriander seeds',
  'cumin': 'cumin',
  'graines de cumin': 'cumin seeds',
  'moutarde': 'mustard',
  'graines de moutarde': 'mustard seeds',
  'graines de moutarde noire': 'black mustard seeds',
  'fenugrec': 'fenugreek',
  'graines de fenugrec': 'fenugreek seeds',
  'feuilles de fenugrec': 'fenugreek leaves',
  'kasuri methi': 'dried fenugreek leaves',
  'cardamome': 'cardamom',
  'poudre de cardamome': 'cardamom powder',
  'clou de girofle': 'cloves',
  'cannelle': 'cinnamon',
  'bâton de cannelle': 'cinnamon stick',
  'piment rouge': 'red chili',
  'poudre de piment': 'chili powder',
  'piment vert': 'green chili',
  'gingembre': 'ginger',
  'ail': 'garlic',
  'asafoetida': 'asafoetida',
  'hing': 'asafoetida',
  'garam masala': 'garam masala',
  'curry': 'curry powder',
  'poudre de curry': 'curry powder',
  'feuilles de curry': 'curry leaves',
  'safran': 'saffron',
  'fenouil': 'fennel',
  'graines de fenouil': 'fennel seeds',
  'ajwain': 'carom seeds',
  'kalonji': 'nigella seeds',
  'pavot': 'poppy seeds',
  'graines de pavot': 'poppy seeds',
  'sésame': 'sesame seeds',
  'graines de sésame': 'sesame seeds',
  
  // Lentils and Pulses
  'lentilles': 'lentils',
  'lentilles toor': 'toor dal',
  'lentilles rouges': 'red lentils',
  'lentilles vertes': 'green lentils',
  'lentilles noires': 'black lentils',
  'urad dal': 'urad dal',
  'chana dal': 'chana dal',
  'moong dal': 'moong dal',
  'masoor dal': 'masoor dal',
  'pois chiches': 'chickpeas',
  
  // Rice and Grains
  'riz basmati': 'basmati rice',
  'riz': 'rice',
  'farine de blé complet': 'whole wheat flour',
  'atta': 'whole wheat flour',
  'farine': 'all purpose flour',
  'maida': 'all purpose flour',
  'farine de pois chiche': 'gram flour',
  'besan': 'gram flour',
  'semoule': 'semolina',
  'sooji': 'semolina',
  'rava': 'semolina',
  
  // Dairy and Proteins
  'paneer': 'paneer',
  'ghee': 'ghee',
  'lait': 'milk',
  'yaourt': 'yogurt',
  'lait de coco': 'coconut milk',
  
  // Vegetables
  'oignon': 'onion',
  'tomate': 'tomato',
  'pomme de terre': 'potato',
  'épinards': 'spinach',
  'okra': 'okra',
  'aubergine': 'eggplant',
  'chou-fleur': 'cauliflower',
  
  // Others
  'tamarin': 'tamarind',
  'pâte de tamarin': 'tamarind paste',
  'noix de coco': 'coconut',
  'noix de coco râpée': 'grated coconut',
  'jaggery': 'jaggery',
  'noix de cajou': 'cashews',
  'amandes': 'almonds',
  'pistaches': 'pistachios',
  'raisins secs': 'raisins'
};

// Price database (EUR per kg or per liter)
// These are estimated prices based on typical Indian grocery stores
const indianIngredientPrices: Record<string, number> = {
  // Basic ingredients (EUR/L or EUR/kg)
  'water': 0.001,  // Almost free
  'eau': 0.001,
  'eau chaude': 0.001,
  'hot water': 0.001,
  'oil': 3.0,  // Generic oil
  'vegetable oil': 3.0,
  'huile': 3.0,
  'huile végétale': 3.0,
  'sunflower oil': 2.5,
  'huile de tournesol': 2.5,
  'mustard oil': 4.0,
  'huile de moutarde': 4.0,
  'coconut oil': 5.0,
  'huile de coco': 5.0,
  'ghee': 15.0,
  'clarified butter': 15.0,
  
  // Spices (EUR/kg)
  'turmeric': 8.0,
  'turmeric powder': 8.0,
  'coriander leaves': 15.0,
  'coriander seeds': 10.0,
  'cumin': 15.0,
  'cumin seeds': 15.0,
  'mustard seeds': 8.0,
  'black mustard seeds': 8.0,
  'fenugreek': 10.0,
  'fenugreek seeds': 10.0,
  'fenugreek leaves': 12.0,
  'dried fenugreek leaves': 25.0,
  'cardamom': 80.0,
  'cardamom powder': 80.0,
  'cloves': 40.0,
  'cinnamon': 25.0,
  'cinnamon stick': 25.0,
  'red chili': 20.0,
  'chili powder': 15.0,
  'green chili': 8.0,
  'ginger': 10.0,
  'garlic': 6.0,
  'asafoetida': 50.0,
  'garam masala': 20.0,
  'curry powder': 12.0,
  'curry leaves': 40.0,
  'saffron': 5000.0,
  'fennel seeds': 8.0,
  'carom seeds': 15.0,
  'nigella seeds': 12.0,
  'poppy seeds': 25.0,
  'sesame seeds': 10.0,
  
  // Lentils and Pulses (EUR/kg)
  'lentils': 3.0,
  'toor dal': 4.0,
  'red lentils': 3.5,
  'green lentils': 3.5,
  'black lentils': 4.0,
  'urad dal': 4.0,
  'chana dal': 3.5,
  'moong dal': 4.0,
  'masoor dal': 3.0,
  'chickpeas': 3.0,
  
  // Rice and Grains (EUR/kg)
  'basmati rice': 3.5,
  'rice': 2.5,
  'whole wheat flour': 1.5,
  'all purpose flour': 1.2,
  'gram flour': 2.5,
  'semolina': 2.0,
  
  // Dairy and Proteins (EUR/kg or EUR/L)
  'paneer': 15.0,
  'ghee': 15.0,
  'milk': 1.2,
  'yogurt': 2.0,
  'coconut milk': 3.0,
  
  // Vegetables (EUR/kg)
  'onion': 1.8,
  'tomato': 2.5,
  'potato': 1.2,
  'spinach': 4.0,
  'okra': 5.0,
  'eggplant': 2.8,
  'cauliflower': 2.5,
  
  // Others
  'tamarind': 10.0,
  'tamarind paste': 10.0,
  'coconut': 5.0,
  'grated coconut': 5.0,
  'jaggery': 5.0,
  'cashews': 25.0,
  'almonds': 20.0,
  'pistachios': 30.0,
  'raisins': 8.0
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, recipeId } = await req.json();

    if (!ingredients || !Array.isArray(ingredients)) {
      throw new Error('Ingredients array is required');
    }

    console.log('Estimating prices for ingredients:', ingredients);

    const priceEstimates = ingredients.map(ingredient => {
      const { name, quantity = 1, unit = 'kg' } = ingredient;
      
      // Translate French ingredient name to English
      const frenchName = name.toLowerCase().trim();
      const englishName = ingredientTranslations[frenchName] || frenchName;
      
      // Get base price
      let basePrice = indianIngredientPrices[englishName];
      
      // If not found in Indian prices, try to find a similar ingredient
      if (!basePrice) {
        // Search for partial matches
        const matchingKey = Object.keys(indianIngredientPrices).find(key => 
          englishName.includes(key) || key.includes(englishName)
        );
        
        if (matchingKey) {
          basePrice = indianIngredientPrices[matchingKey];
        } else {
          // Default price for unknown ingredients
          basePrice = 5.0;
          console.log(`Price not found for ${name} (${englishName}), using default`);
        }
      }
      
      // Calculate price based on quantity and unit
      let finalPrice = basePrice;
      const unitLower = unit.toLowerCase();
      
      // Convert units to calculate price
      if (unitLower.includes('g') && !unitLower.includes('kg')) {
        finalPrice = basePrice * (quantity / 1000);
      } else if (unitLower.includes('ml')) {
        // Fixed: handle 'ml' properly even with spaces or other characters
        finalPrice = basePrice * (quantity / 1000);
      } else if (unitLower.includes('cl')) {
        finalPrice = basePrice * (quantity / 100);
      } else if (unitLower === 'l' || unitLower === 'litre' || unitLower === 'litres' || 
                 unitLower === 'kg' || unitLower === 'kilogramme' || unitLower === 'kilogrammes') {
        finalPrice = basePrice * quantity;
      } else if (unitLower.includes('cuillère à soupe') || unitLower.includes('c.à.s') || 
                 unitLower.includes('cas') || unitLower.includes('c.a.s')) {
        finalPrice = basePrice * (quantity * 15 / 1000);
      } else if (unitLower.includes('cuillère à café') || unitLower.includes('c.à.c') || 
                 unitLower.includes('cac') || unitLower.includes('c.a.c')) {
        finalPrice = basePrice * (quantity * 5 / 1000);
      } else if (unitLower.includes('tasse') || unitLower.includes('cup')) {
        finalPrice = basePrice * (quantity * 250 / 1000);
      } else if (unitLower.includes('pincée') || unitLower.includes('pinch')) {
        finalPrice = basePrice * (quantity / 1000);
      } else if (unitLower.includes('feuille') || unitLower.includes('leaf') || unitLower.includes('leaves')) {
        // Special handling for curry leaves, etc.
        finalPrice = 0.01 * quantity;
      } else if (unitLower.includes('gousse') || unitLower.includes('clove')) {
        // For garlic cloves
        finalPrice = basePrice * (quantity * 5 / 1000);
      } else if (unitLower.includes('bâton') || unitLower.includes('stick')) {
        // For cinnamon sticks
        finalPrice = basePrice * (quantity * 5 / 1000);
      } else if (unitLower === '' || unitLower === 'unité' || unitLower === 'unités' || 
                 unitLower === 'pièce' || unitLower === 'pièces') {
        // For unit-based items, assume a reasonable weight
        // 100g for most items, but could vary
        finalPrice = basePrice * quantity * 0.1;
      } else {
        // For truly unrecognized units, log warning and use conservative estimate
        console.log(`⚠️ Unrecognized unit "${unit}" for ${name}, using conservative estimate`);
        // Assume it's a small quantity (like a spice) - 10g per unit
        finalPrice = basePrice * (quantity * 10 / 1000);
      }
      
      return {
        name,
        frenchName,
        englishName,
        quantity,
        unit,
        estimatedPrice: Math.round(finalPrice * 100) / 100,
        basePrice,
        source: 'indian-grocery-estimate'
      };
    });

    // Calculate total estimated cost
    const totalCost = priceEstimates.reduce((sum, item) => sum + item.estimatedPrice, 0);

    // Optionally save to database for future reference
    if (recipeId) {
      try {
        await supabase
          .from('recipe_price_estimates')
          .upsert({
            recipe_id: recipeId,
            ingredient_estimates: priceEstimates,
            total_estimated_cost: totalCost,
            estimate_source: 'indian-grocery-api',
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error saving price estimate:', error);
        // Don't fail the request if saving fails
      }
    }

    return new Response(JSON.stringify({ 
      estimates: priceEstimates,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: 'EUR',
      source: 'Indian grocery price estimation',
      disclaimer: 'Les prix sont des estimations basées sur les prix moyens des épiceries indiennes'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in indian-price-estimator:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});