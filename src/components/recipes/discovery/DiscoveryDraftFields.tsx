import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { DiscoveryDraftForm } from './draftForm';

export default function DiscoveryDraftFields({ form, disabled, onChange }: {
  form: DiscoveryDraftForm; disabled: boolean; onChange: (form: DiscoveryDraftForm) => void;
}) {
  const prefix = useId();
  const text = (field: keyof DiscoveryDraftForm, value: string) => onChange({ ...form, [field]: value });
  const updateIngredient = (index: number, patch: Partial<DiscoveryDraftForm['ingredients'][number]>) =>
    onChange({ ...form, ingredients: form.ingredients.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const updateInstruction = (index: number, patch: Partial<DiscoveryDraftForm['instructions'][number]>) =>
    onChange({ ...form, instructions: form.instructions.map((item, i) => i === index ? { ...item, ...patch } : item) });
  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <label className="block space-y-1 text-sm">Titre du plat<Input className="min-h-11 text-base" maxLength={300} value={form.title} onChange={event => text('title', event.target.value)} /></label>
    <label className="block space-y-1 text-sm">Description<Textarea className="text-base" maxLength={3000} value={form.description} onChange={event => text('description', event.target.value)} /></label>
    <div className="grid min-w-0 grid-cols-2 gap-3">
      {([['prepTimeMinutes', 'Préparation (min)'], ['cookTimeMinutes', 'Cuisson (min)'], ['restTimeMinutes', 'Repos (min)'], ['servings', 'Portions']] as const).map(([field, label]) =>
        <label key={field} className="min-w-0 space-y-1 text-sm">{label}<Input className="min-h-11 text-base" inputMode="numeric" placeholder="À vérifier" maxLength={20} value={form[field]} onChange={event => text(field, event.target.value)} /></label>,
      )}
    </div>
    <p className="text-sm text-muted-foreground">Un champ vide signifie que l’information reste à vérifier. Les temps et portions ne sont pas estimés à ta place.</p>
    <section className="space-y-3" aria-label="Ingrédients de la recette">
      <h3 className="font-semibold">Ingrédients</h3>
      {form.ingredients.length === 0 && <p className="text-sm">Aucun ingrédient renseigné. Consulte la source puis complète la liste.</p>}
      {form.ingredients.map((item, index) => <fieldset key={item.key} className="min-w-0 rounded-lg border p-3 space-y-3">
        <legend className="px-1 text-sm font-medium">Ingrédient {index + 1}</legend>
        <label className="block space-y-1 text-sm">Nom<Input className="min-h-11 text-base" maxLength={200} value={item.name} onChange={event => updateIngredient(index, { name: event.target.value })} /></label>
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <label className="min-w-0 space-y-1 text-sm">Quantité<Input aria-label={`Quantité de l’ingrédient ${index + 1}`} className="min-h-11 text-base" inputMode="decimal" placeholder="À vérifier" maxLength={40} value={item.quantity} onChange={event => updateIngredient(index, { quantity: event.target.value })} /></label>
          <label className="min-w-0 space-y-1 text-sm">Unité<Input aria-label={`Unité de l’ingrédient ${index + 1}`} className="min-h-11 text-base" placeholder="À vérifier" maxLength={50} value={item.unit} onChange={event => updateIngredient(index, { unit: event.target.value })} /></label>
        </div>
        <label className="block space-y-1 text-sm">Précision<Input className="min-h-11 text-base" maxLength={500} value={item.notes} onChange={event => updateIngredient(index, { notes: event.target.value })} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm" htmlFor={`${prefix}-ingredient-${index}`}><input id={`${prefix}-ingredient-${index}`} type="checkbox" className="h-5 w-5 shrink-0" checked={item.isEssential} onChange={event => updateIngredient(index, { isEssential: event.target.checked })} />Nécessaire à la recette</label>
        {item.rawText && <details className="text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer">Texte d’origine</summary><p className="break-words">{item.rawText}</p></details>}
        <Button className="min-h-11" variant="ghost" aria-label={`Retirer l’ingrédient ${index + 1}`} onClick={() => onChange({ ...form, ingredients: form.ingredients.filter((_, i) => i !== index) })}>Retirer</Button>
      </fieldset>)}
      <Button className="min-h-11" variant="outline" disabled={form.ingredients.length >= 100} onClick={() => onChange({ ...form, ingredients: [...form.ingredients, { key: crypto.randomUUID(), name: '', quantity: '', unit: '', notes: '', isEssential: true }] })}>Ajouter un ingrédient</Button>
    </section>
    <section className="space-y-3" aria-label="Étapes de la recette">
      <h3 className="font-semibold">Étapes</h3>
      {form.instructions.length === 0 && <p className="text-sm">Aucune étape renseignée. La publication reste une inspiration.</p>}
      {form.instructions.map((item, index) => <fieldset key={item.key} className="min-w-0 rounded-lg border p-3 space-y-2">
        <legend className="px-1 text-sm font-medium">Étape {index + 1}</legend>
        <label className="block space-y-1 text-sm">Instruction<Textarea className="text-base" maxLength={2000} value={item.description} onChange={event => updateInstruction(index, { description: event.target.value })} /></label>
        <label className="block space-y-1 text-sm">Durée connue de cette étape (secondes)<Input className="min-h-11 text-base" inputMode="numeric" placeholder="À vérifier" maxLength={20} value={item.durationSeconds} onChange={event => updateInstruction(index, { durationSeconds: event.target.value })} /></label>
        <Button className="min-h-11" variant="ghost" aria-label={`Retirer l’étape ${index + 1}`} onClick={() => onChange({ ...form, instructions: form.instructions.filter((_, i) => i !== index) })}>Retirer</Button>
      </fieldset>)}
      <Button className="min-h-11" variant="outline" disabled={form.instructions.length >= 100} onClick={() => onChange({ ...form, instructions: [...form.instructions, { key: crypto.randomUUID(), description: '', durationSeconds: '' }] })}>Ajouter une étape</Button>
    </section>
  </fieldset>;
}
