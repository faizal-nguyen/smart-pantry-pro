/**
 * RecipeImportTab — onglet "Ajouter".
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx`. Présente les 3 sources
 * d'import : Instagram, Site web (URL), Réseaux sociaux. Les callbacks
 * remontent au parent (Recipes.tsx) qui gère les modales globales.
 */
import React from 'react';
import { Heart, Plus, Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { InstagramVideoExtractor } from '@/components/recipes/InstagramVideoExtractor';
import { SocialImportCard } from '@/components/social/SocialImportCard';

interface RecipeImportTabProps {
  // Le payload extrait reste hétérogène (Instagram extractor + SocialImportCard
  // ont des shapes différents) ; un typage strict viendra avec PRP-220.16/17
  // qui unifie l'ExtractedRecipeModal.
  onRecipeExtracted: (recipe: unknown, sourceUrl?: string) => void;
  onOpenAddDialog: () => void;
}

export default function RecipeImportTab({
  onRecipeExtracted,
  onOpenAddDialog,
}: RecipeImportTabProps) {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-semibold text-foreground mb-1">Ajouter des recettes</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Importez depuis le web ou créez vos propres recettes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-surface-muted rounded-md flex items-center justify-center">
                <Heart className="h-6 w-6 text-saffron" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">Instagram</h3>
                <p className="text-muted-foreground text-sm">
                  Importez des recettes depuis les vidéos Instagram.
                </p>
              </div>
              <InstagramVideoExtractor
                onRecipeExtracted={recipe => onRecipeExtracted(recipe)}
                onError={error => {
                  toast({
                    title: "Erreur d'extraction",
                    description: error.message,
                    variant: 'destructive',
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-surface-muted rounded-md flex items-center justify-center">
                <Search className="h-6 w-6 text-foreground" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">Site web</h3>
                <p className="text-muted-foreground text-sm">
                  Importez depuis n'importe quel site de recettes.
                </p>
              </div>
              <Button onClick={onOpenAddDialog} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Importer depuis URL
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-surface-muted rounded-md flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-tomato" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">Réseaux sociaux</h3>
                <p className="text-muted-foreground text-sm">
                  TikTok, YouTube et autres plateformes.
                </p>
              </div>
              <SocialImportCard
                onImport={async recipe => onRecipeExtracted(recipe)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
