/**
 * AddChefIdeaDialog — PRP-239 PR-D.
 *
 * Lets the user convert a "Idées chef hors bibliothèque" text block
 * from the chef agent into a real recipe in their library. The dialog
 * opens with a best-effort parse of the off-DB text (first line →
 * title, remaining lines → instructions, ingredients empty) and lets
 * the user tweak everything before saving. Submit calls
 * `POST /api/assistant/save-chef-idea`, which runs
 * RecipePolicySanitizer.run() server-side (defence in depth per PRP
 * V3.1) and inserts the row into `recipes` + `recipe_ingredients`
 * with `source_type='assistant_chef'`.
 *
 * No LLM call client-side — the parse is heuristic but cheap. The
 * user is in the loop for everything that matters (title, ingredients,
 * instructions), so a mediocre initial parse is acceptable.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';

interface AddChefIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw "Idées chef hors bibliothèque" text from the chef synthesis. */
  ideaText: string;
  /** Optional conversation id so the saved recipe can be linked back. */
  conversationId?: string;
}

interface IngredientRow {
  name: string;
  quantity?: string; // free-text in the UI, parsed before submit
  unit?: string;
  notes?: string;
}

interface SaveResponse {
  recipe_id: string;
  sanitization: {
    changes: Array<{ ruleId: string; oldValue: string; newValue: string }>;
    quality_flags: string[];
    violations_remaining: unknown[];
  };
}

/**
 * Heuristic split: first non-empty line = title, the rest = instructions
 * (each line is one step). Ingredients are left empty because they
 * rarely appear cleanly enumerated in free-form chef text — the user
 * adds them manually.
 */
function parseIdeaText(text: string): { title: string; instructions: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { title: '', instructions: [] };

  // Title: the first line, stripped of common bullet/numeric prefixes.
  const title = lines[0]
    .replace(/^[*#\-–•]+\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .slice(0, 200);

  // Instructions: the rest. We keep them as one line each — the user
  // can split or merge in the textarea before saving.
  const instructions = lines.slice(1).map((l) =>
    l.replace(/^[*#\-–•]+\s*/, '').replace(/^\d+\.\s*/, '').trim(),
  ).filter(Boolean);

  return { title, instructions };
}

export function AddChefIdeaDialog({
  open,
  onOpenChange,
  ideaText,
  conversationId,
}: AddChefIdeaDialogProps) {
  const initial = useMemo(() => parseIdeaText(ideaText), [ideaText]);
  const [title, setTitle] = useState(initial.title);
  const [instructionsText, setInstructionsText] = useState(initial.instructions.join('\n'));
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-parse when the dialog re-opens on a different idea.
  useEffect(() => {
    if (open) {
      setTitle(initial.title);
      setInstructionsText(initial.instructions.join('\n'));
      setIngredients([]);
    }
  }, [open, initial.title, initial.instructions]);

  const addIngredient = (): void => {
    setIngredients((prev) => [...prev, { name: '' }]);
  };

  const updateIngredient = (idx: number, patch: Partial<IngredientRow>): void => {
    setIngredients((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  };

  const removeIngredient = (idx: number): void => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({
        variant: 'destructive',
        title: 'Titre manquant',
        description: 'Donne un nom à cette recette avant de l\'enregistrer.',
      });
      return;
    }
    const instructions = instructionsText
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (instructions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Instructions manquantes',
        description: 'Décris au moins une étape.',
      });
      return;
    }

    const cleanedIngredients = ingredients
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity ? Number.parseFloat(i.quantity) : undefined,
        unit: i.unit?.trim() || undefined,
        notes: i.notes?.trim() || undefined,
      }))
      .filter((i) => i.name.length > 0)
      .map((i) => ({
        ...i,
        // Drop NaN quantities silently.
        quantity: i.quantity !== undefined && Number.isFinite(i.quantity) ? i.quantity : undefined,
      }));

    setSaving(true);
    try {
      const res = await apiPost<SaveResponse>('/api/assistant/save-chef-idea', {
        title: trimmedTitle,
        instructions,
        ingredients: cleanedIngredients.length > 0 ? cleanedIngredients : undefined,
        conversation_id: conversationId,
      });
      const policyHits = res.sanitization?.changes?.length ?? 0;
      toast({
        title: 'Recette ajoutée',
        description: policyHits > 0
          ? `Politique appliquée à ${policyHits} ingrédient(s). Voir dans Mes recettes.`
          : 'Voir dans Mes recettes.',
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Échec de l\'enregistrement',
        description: err instanceof Error ? err.message : 'Erreur inconnue.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter cette idée à mes recettes</DialogTitle>
          <DialogDescription>
            Vérifie le titre, les ingrédients et les étapes. La politique
            zéro porc / zéro alcool est appliquée automatiquement lors
            de l'enregistrement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="chef-idea-title">Titre</Label>
            <Input
              id="chef-idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Bibimbap maison"
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Ingrédients</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </div>
            {ingredients.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Aucun ingrédient. Tu peux en ajouter ou laisser vide pour V1.
              </p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Nom"
                      value={ing.name}
                      onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Qté"
                      value={ing.quantity ?? ''}
                      onChange={(e) => updateIngredient(idx, { quantity: e.target.value })}
                      className="w-16"
                    />
                    <Input
                      placeholder="Unité"
                      value={ing.unit ?? ''}
                      onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                      className="w-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(idx)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="chef-idea-instructions">Étapes (une par ligne)</Label>
            <Textarea
              id="chef-idea-instructions"
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              rows={8}
              placeholder="1. Couper les légumes&#10;2. Faire revenir à feu vif&#10;…"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddChefIdeaDialog;
