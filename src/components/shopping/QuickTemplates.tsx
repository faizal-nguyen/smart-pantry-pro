import React from 'react';
import { Button } from '@/components/ui/button';

interface QuickTemplate {
  name: string;
  items: string;
  description?: string;
}

interface QuickTemplatesProps {
  onSelect: (text: string, templateName?: string) => void;
  className?: string;
}

export const QuickTemplates: React.FC<QuickTemplatesProps> = ({ 
  onSelect,
  className 
}) => {
  const templates: QuickTemplate[] = [
    {
      name: "🥗 Salade fraîche",
      items: "salade verte, tomates cerises, concombre, feta, olives noires, vinaigrette balsamique",
      description: "Ingrédients pour une salade complète"
    },
    {
      name: "🍝 Pâtes Bolognaise", 
      items: "500g pâtes spaghetti, 400g bœuf haché, sauce tomate, oignon, ail, parmesan râpé, basilic",
      description: "Plat principal italien classique"
    },
    {
      name: "🥘 Curry de légumes",
      items: "lait de coco, pâte de curry, courgettes, poivrons, aubergine, oignon, ail, gingembre, riz basmati",
      description: "Curry végétarien épicé"
    },
    {
      name: "🍳 Petit déjeuner complet",
      items: "œufs, bacon, pain de mie, beurre, confiture, jus d'orange, café, lait",
      description: "Petit déjeuner traditionnel"
    },
    {
      name: "🧹 Produits ménage",
      items: "liquide vaisselle, éponges, sacs poubelle, papier toilette, lessive, produit vitre, désinfectant",
      description: "Essentiels pour l'entretien"
    },
    {
      name: "🎂 Gâteau au chocolat",
      items: "farine, sucre, œufs, beurre, chocolat noir, levure chimique, vanille, cacao en poudre",
      description: "Ingrédients pour pâtisserie"
    },
    {
      name: "🥪 Sandwich club",
      items: "pain de mie, poulet, jambon, salade, tomates, mayonnaise, moutarde, fromage",
      description: "Sandwichs pour déjeuner"
    },
    {
      name: "🍲 Soupe de légumes",
      items: "carottes, poireaux, pommes de terre, courgettes, bouillon de légumes, crème fraîche, persil",
      description: "Soupe réconfortante"
    }
  ];

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Templates rapides
      </h3>
      <div className="flex gap-2 flex-wrap">
        {templates.map((template, index) => (
          <Button
            key={index}
            size="sm"
            variant="outline"
            onClick={() => onSelect(template.items, template.name)}
            className="text-xs h-8"
            title={template.description}
          >
            {template.name}
          </Button>
        ))}
      </div>
    </div>
  );
};