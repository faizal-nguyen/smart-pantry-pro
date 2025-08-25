async function handler(req, res) {
  // CORS Headers
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
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and must not be empty' });
    }

    // Validate each item structure
    for (const item of items) {
      if (!item.productName || typeof item.productName !== 'string') {
        return res.status(400).json({ error: 'Each item must have a valid productName' });
      }
    }

    // Here you would normally add items to your database
    // For now, we'll simulate the operation
    console.log(`Adding ${items.length} items to shopping list:`, items);

    // Transform items to match your database schema
    const processedItems = items.map((item, index) => ({
      id: `smart-${Date.now()}-${index}`,
      product_name: item.productName,
      quantity: item.quantity || 1,
      unit: item.unit || 'pièce',
      category: item.category || 'Divers',
      store_section: item.storeSection || 'Autres',
      estimated_price: item.estimatedPrice || 0,
      is_purchased: false,
      priority: 1,
      added_via: item.addedVia || 'smart-input',
      confidence: item.confidence || 0.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // TODO: Actual database insertion would happen here
    // Example with Supabase:
    // const { data, error } = await supabase
    //   .from('shopping_list_items')
    //   .insert(processedItems);

    // For now, just return success
    res.status(200).json({
      success: true,
      message: `${items.length} items added successfully`,
      items: processedItems,
      stats: {
        total_items: items.length,
        total_estimated_cost: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0),
        categories: [...new Set(items.map((item) => item.category))],
        store_sections: [...new Set(items.map((item) => item.storeSection))]
      }
    });

  } catch (error) {
    console.error('Erreur batch add:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'ajout des produits',
      details: error.message || 'Unknown error'
    });
  }
}

export default handler;