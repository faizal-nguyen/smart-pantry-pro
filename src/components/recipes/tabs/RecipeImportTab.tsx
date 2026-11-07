import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecipeInbox } from '@/components/recipes/RecipeInbox';
import type { CurrentDraftResponse } from '@/services/recipe-import/types';

interface RecipeImportTabProps {
  onOpenAddDialog: () => void;
  pendingCount?: number;
  onVerifyDraft: (payload: CurrentDraftResponse) => void;
}

/** All imported links keep their import identity through the canonical editor. */
export default function RecipeImportTab({ onOpenAddDialog, pendingCount = 0, onVerifyDraft }: RecipeImportTabProps) {
  return <div className="space-y-6 min-w-0">
    <header className="space-y-2">
      <h2 className="text-lg font-semibold">Importer un lien</h2>
      <p className="text-sm text-muted-foreground">Colle une recette ou une publication. Relis le brouillon et ses informations manquantes avant de l’ajouter.</p>
      {pendingCount > 0 && <p className="text-sm">{pendingCount} import{pendingCount > 1 ? 's' : ''} en cours ou à vérifier.</p>}
    </header>
    <RecipeInbox onVerifyDraft={onVerifyDraft} />
    <section className="rounded-lg border p-4 space-y-3" aria-label="Écrire une recette">
      <h2 className="font-semibold">Ma recette personnelle</h2>
      <p className="text-sm text-muted-foreground">Pour un plat que tu connais, écris les ingrédients et les étapes.</p>
      <Button className="min-h-11 w-full" variant="outline" onClick={onOpenAddDialog}><Plus className="h-4 w-4" aria-hidden="true" />Écrire une recette</Button>
    </section>
  </div>;
}
