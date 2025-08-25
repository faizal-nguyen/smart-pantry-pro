export default async function handler(req, res) {
  const { operation, ...params } = req.body;

  try {
    switch (operation) {
      case 'translate-batch':
        const { translateBatch } = await import('../src/services/batch-operations/translateBatch.js');
        const translateResult = await translateBatch(params);
        return res.status(200).json(translateResult);

      case 'extract-recipes-batch':
        const { extractRecipesBatch } = await import('../src/services/batch-operations/extractRecipesBatch.js');
        const extractResult = await extractRecipesBatch(params);
        return res.status(200).json(extractResult);

      case 'shopping-batch':
        const { processShoppingBatch } = await import('../src/services/batch-operations/shoppingBatch.js');
        const shoppingResult = await processShoppingBatch(params);
        return res.status(200).json(shoppingResult);

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    console.error('Batch operation error:', error);
    return res.status(500).json({ 
      error: 'Batch operation failed', 
      message: error.message 
    });
  }
}