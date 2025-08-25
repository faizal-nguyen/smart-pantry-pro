/**
 * Mock API endpoint for video recipe parsing
 * This is a temporary solution while the external API server is being fixed
 */

export default function handler(req: any, res: any) {
  // Enable CORS
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
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    console.log('📹 Processing video URL:', videoUrl);

    // Return mock recipe data
    const mockRecipe = {
      title: "Tarte aux pommes maison",
      description: "Une délicieuse tarte aux pommes avec une pâte croustillante et des pommes fondantes.",
      cookingTime: 45,
      prepTime: 30,
      servings: 8,
      difficulty: "Moyen",
      category: "Dessert",
      ingredients: [
        {
          name: "Pâte brisée",
          quantity: 1,
          unit: "rouleau",
          category: "Base"
        },
        {
          name: "Pommes",
          quantity: 6,
          unit: "unités",
          category: "Fruits"
        },
        {
          name: "Sucre",
          quantity: 100,
          unit: "g",
          category: "Sucres"
        },
        {
          name: "Cannelle",
          quantity: 1,
          unit: "cuillère à café",
          category: "Épices"
        },
        {
          name: "Beurre",
          quantity: 50,
          unit: "g",
          category: "Produits laitiers"
        }
      ],
      instructions: [
        {
          step: 1,
          instruction: "Préchauffer le four à 180°C",
          duration: 5
        },
        {
          step: 2,
          instruction: "Étaler la pâte dans un moule à tarte",
          duration: 5
        },
        {
          step: 3,
          instruction: "Éplucher et couper les pommes en lamelles",
          duration: 10
        },
        {
          step: 4,
          instruction: "Disposer les pommes sur la pâte en rosace",
          duration: 10
        },
        {
          step: 5,
          instruction: "Saupoudrer de sucre et de cannelle",
          duration: 2
        },
        {
          step: 6,
          instruction: "Parsemer de noisettes de beurre",
          duration: 2
        },
        {
          step: 7,
          instruction: "Enfourner pour 45 minutes",
          duration: 45
        }
      ],
      tips: [
        "Utilisez des pommes acidulées pour un meilleur goût",
        "Vous pouvez ajouter de la compote de pommes sur le fond de tarte"
      ],
      nutritionalInfo: {
        calories: 320,
        protein: 3,
        carbs: 45,
        fat: 15,
        fiber: 3
      },
      tags: ["dessert", "tarte", "pommes", "pâtisserie", "fait-maison"],
      videoUrl: videoUrl,
      metadata: {
        extractionMethod: "mock",
        processingTime: 100,
        confidence: 0.95
      }
    };

    // Simulate processing delay
    setTimeout(() => {
      res.status(200).json({
        success: true,
        data: mockRecipe,
        message: "Recette extraite avec succès (mode démonstration)",
        processingTime: "100ms"
      });
    }, 1000);

  } catch (error) {
    console.error('Error in parse-video-recipe:', error);
    res.status(500).json({
      error: 'Failed to parse video recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}