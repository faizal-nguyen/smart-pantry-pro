/**
 * PRP-235 PR1 — NutritionWellbeingStub.
 *
 * Empty state cadré bien-être (PAS médical) avec disclaimer
 * explicite. Le coach complet + persistance des `nutrition_profiles`
 * arrivent via PRP-227. PR4 de PRP-235 livrera la section pleine
 * une fois PRP-227 PR1 mergée.
 *
 * Garde-fou wording : aucun terme médical (diagnostic, traitement,
 * prescription, médecin) — le grep gate du PRP les bloque.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Info, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NutritionWellbeingStub() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" aria-hidden="true" />
          Nutrition bien-être
        </CardTitle>
        <CardDescription>
          Définir ton objectif et tes contraintes alimentaires pour adapter les suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          La gestion détaillée du profil (objectif, allergies, régimes) arrive
          dans une prochaine mise à jour. En attendant, tu peux échanger
          directement avec l&apos;assistant pour adapter tes suggestions.
        </p>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              Cette section vise le bien-être au quotidien. Elle ne remplace
              pas l&apos;avis d&apos;un professionnel de santé pour tout symptôme
              persistant ou pathologie suivie.
            </span>
          </p>
        </div>

        <Button
          type="button"
          onClick={() => navigate('/assistant')}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Demander à l&apos;assistant
        </Button>
      </CardContent>
    </Card>
  );
}
