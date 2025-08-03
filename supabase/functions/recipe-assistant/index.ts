import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    console.log('Fetching user inventory for userId:', userId);

    // Fetch user's inventory
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        quantity,
        expiry_date,
        location,
        product:products(name, category, unit_type)
      `)
      .eq('user_id', userId);

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      throw new Error('Failed to fetch inventory');
    }

    console.log('Inventory fetched:', inventory?.length, 'items');

    // Format inventory for AI
    const inventoryText = inventory?.map(item => 
      `${item.quantity} ${item.product?.unit_type} de ${item.product?.name} (${item.product?.category})`
    ).join(', ') || 'Aucun produit en stock';

    console.log('Formatted inventory:', inventoryText);

    // Prepare system prompt
    const systemPrompt = `Tu es un assistant culinaire expert. Voici l'inventaire actuel de l'utilisateur : ${inventoryText}.

Règles importantes :
1. Analyse l'inventaire disponible pour suggérer des recettes réalisables
2. Indique toujours les ingrédients manquants s'il y en a
3. Propose des alternatives si certains ingrédients manquent
4. Donne des conseils pratiques et des astuces culinaires
5. Réponds de façon conversationnelle et amicale
6. Si demandé, structure tes réponses avec des sections claires

Quand tu suggères une recette, structure ta réponse ainsi :
📍 **Nom de la recette**
⏱️ **Temps de préparation** 
👥 **Portions**
✅ **Ingrédients disponibles** : [liste]
❌ **Ingrédients manquants** : [liste]
📝 **Instructions** : [étapes]

Si l'utilisateur te demande d'analyser ce qu'il peut cuisiner, suggère 2-3 recettes différentes.`;

    console.log('Sending request to OpenAI...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('OpenAI response received, length:', aiResponse?.length);

    // Save conversation to database (optional)
    try {
      await supabase
        .from('recipe_conversations')
        .insert({
          user_id: userId,
          user_message: message,
          ai_response: aiResponse,
          inventory_snapshot: inventoryText
        });
      console.log('Conversation saved to database');
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw, just log - conversation saving is not critical
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      inventoryCount: inventory?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in recipe-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});