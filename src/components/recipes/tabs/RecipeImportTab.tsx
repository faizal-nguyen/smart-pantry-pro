/**
 * RecipeImportTab — onglet "Ajouter".
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx`.
 * PRP-237 PR4 §10 (2026-05-17) — refondu :
 *  - tokenise les 3 source-cards (anciens gradients purple/blue/green
 *    incompatibles avec la palette PRP-237) ;
 *  - absorbe la section "À vérifier" (anciens imports en cours
 *    d'extraction, ex-onglet Inbox quasi vide en pratique).
 */
import React, { useState } from 'react';
import { ChevronDown, Inbox, Instagram, Link2, Plus, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { InstagramVideoExtractor } from '@/components/recipes/InstagramVideoExtractor';
import { SocialImportCard } from '@/components/social/SocialImportCard';
import { RecipeInbox } from '@/components/recipes/RecipeInbox';
import type { CurrentDraftResponse } from '@/services/recipe-import/types';

interface RecipeImportTabProps {
  // Le payload extrait reste hétérogène (Instagram extractor + SocialImportCard
  // ont des shapes différents) ; un typage strict viendra avec PRP-220.16/17
  // qui unifie l'ExtractedRecipeModal.
  onRecipeExtracted: (recipe: unknown, sourceUrl?: string) => void;
  onOpenAddDialog: () => void;
  pendingCount?: number;
  onVerifyDraft?: (payload: CurrentDraftResponse) => void;
}

interface SourceCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SourceCard({ icon: Icon, title, description, children }: SourceCardProps) {
  return (
    <Card className="border-border hover:border-foreground/20 hover:shadow-sm transition-shadow">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground shrink-0"
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

export default function RecipeImportTab({
  onRecipeExtracted,
  onOpenAddDialog,
  pendingCount = 0,
  onVerifyDraft,
}: RecipeImportTabProps) {
  // PRP-237 PR4 — la zone "À vérifier" est repliable et n'apparaît
  // que quand il y a au moins un import en cours. Évite le faux
  // signal d'un onglet vide observé dans l'audit 2026-05-17.
  const [showInbox, setShowInbox] = useState(pendingCount > 0);

  return (
    <div className="space-y-8">
      {pendingCount > 0 && onVerifyDraft && (
        <section
          aria-labelledby="import-inbox-heading"
          className="rounded-lg border border-border bg-surface-muted/50"
        >
          <button
            type="button"
            onClick={() => setShowInbox(prev => !prev)}
            aria-expanded={showInbox}
            aria-controls="import-inbox-panel"
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"
              >
                <Inbox className="h-4 w-4" />
              </span>
              <h2
                id="import-inbox-heading"
                className="text-base font-semibold text-foreground"
              >
                À vérifier
              </h2>
              <Badge variant="secondary" className="font-normal">
                {pendingCount}
              </Badge>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showInbox ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showInbox && (
            <div
              id="import-inbox-panel"
              className="border-t border-border p-4"
            >
              <RecipeInbox onVerifyDraft={onVerifyDraft} />
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="import-sources-heading">
        <div className="mb-4">
          <h2
            id="import-sources-heading"
            className="text-base font-semibold text-foreground"
          >
            Ajouter une recette
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Importe depuis le web, des réseaux sociaux, ou crée à la main.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SourceCard
            icon={Instagram}
            title="Instagram"
            description="Extraction depuis les vidéos et posts Instagram."
          >
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
          </SourceCard>

          <SourceCard
            icon={Link2}
            title="URL ou site web"
            description="Colle un lien vers une recette publiée n'importe où."
          >
            <Button onClick={onOpenAddDialog} variant="default" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Importer depuis URL
            </Button>
          </SourceCard>

          <SourceCard
            icon={Video}
            title="TikTok, YouTube, autres"
            description="Capture depuis les autres plateformes sociales."
          >
            <SocialImportCard
              onImport={async recipe => onRecipeExtracted(recipe)}
            />
          </SourceCard>
        </div>
      </section>
    </div>
  );
}
