import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

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
    console.log('Cleanup function started at:', new Date().toISOString());

    // Clean up purchased items older than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: deletedItems, error } = await supabase
      .from('shopping_list')
      .delete()
      .eq('is_purchased', true)
      .lt('updated_at', twentyFourHoursAgo.toISOString())
      .select();

    if (error) {
      console.error('Error cleaning up shopping list:', error);
      throw error;
    }

    const deletedCount = deletedItems?.length || 0;
    console.log(`Cleaned up ${deletedCount} purchased items older than 24 hours`);

    // Also clean up old conversation history (keep only last 100 per user)
    try {
      const { data: users } = await supabase
        .from('recipe_conversations')
        .select('user_id')
        .group('user_id');

      if (users) {
        for (const user of users) {
          const { data: oldConversations } = await supabase
            .from('recipe_conversations')
            .select('id')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })
            .range(100, 999); // Skip first 100, get the rest

          if (oldConversations && oldConversations.length > 0) {
            const idsToDelete = oldConversations.map(conv => conv.id);
            await supabase
              .from('recipe_conversations')
              .delete()
              .in('id', idsToDelete);

            console.log(`Cleaned up ${oldConversations.length} old conversations for user ${user.user_id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
      // Don't throw, just log - conversation cleanup is not critical
    }

    return new Response(JSON.stringify({ 
      success: true,
      deletedShoppingItems: deletedCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
