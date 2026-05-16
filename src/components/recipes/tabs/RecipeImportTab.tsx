/**
 * RecipeImportTab — onglet "Ajouter".
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx`. Présente les 3 sources
 * d'import : Instagram, Site web (URL), Réseaux sociaux. Les callbacks
 * remontent au parent (Recipes.tsx) qui gère les modales globales.
 */
import React from 'react';
import { motion } from 'framer-motion';
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ajouter des recettes</h2>
        <p className="text-gray-600">Importez depuis le web ou créez vos propres recettes</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Instagram</h3>
                <p className="text-gray-600 text-sm">
                  Importez des recettes depuis les vidéos Instagram
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

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Site web</h3>
                <p className="text-gray-600 text-sm">
                  Importez depuis n'importe quel site de recettes
                </p>
              </div>
              <Button onClick={onOpenAddDialog} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Importer depuis URL
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Réseaux sociaux</h3>
                <p className="text-gray-600 text-sm">TikTok, YouTube et autres plateformes</p>
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
