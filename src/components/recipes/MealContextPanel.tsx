import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { defaultMealContext, type MealContext } from '@/lib/mealContext';

export default function MealContextPanel({ value, onChange, defaults }: { value: MealContext; onChange: (value: MealContext) => void; defaults?: { minutes?: number | null; servings?: number | null } }) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<MealContext>) => onChange({ ...value, ...patch });
  const minutes=value.minutes || defaults?.minutes,servings=value.servings || defaults?.servings;
  const summary = [value.occasion === 'lunch' ? 'Ce midi' : value.occasion === 'snack' ? 'Collation' : 'Ce soir', minutes ? `${minutes} min` : null, servings ? `${servings} ${Number(servings)===1 ? 'personne' : 'personnes'}` : null, value.query || null, value.craving === 'warm' ? 'Chaud' : value.craving === 'fresh' ? 'Frais' : value.craving === 'comfort' ? 'Réconfortant' : null].filter(Boolean).join(' · ');
  return <Dialog open={open} onOpenChange={setOpen}>
    <div className="flex min-h-11 items-center justify-between gap-3 border-b pb-2">
      <p className="text-sm font-medium break-words" aria-label="Contexte du repas">{summary}</p>
      <DialogTrigger asChild><Button variant="ghost" className="min-h-11 shrink-0">Modifier le repas</Button></DialogTrigger>
    </div>
    <DialogContent className="routine-dialog">
      <DialogHeader><DialogTitle>Le repas qui te ferait envie</DialogTitle><DialogDescription>Ces choix concernent ce repas. Les champs laissés libres reprennent ton profil ou la recette.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Temps disponible<select className="culinary-select" value={value.minutes} onChange={e => update({ minutes: e.target.value })}><option value="">Temps du profil</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="60">1 heure</option></select></label>
        <label className="text-sm">Repas<select className="culinary-select" value={value.occasion} onChange={e => update({ occasion: e.target.value })}><option value="lunch">Déjeuner</option><option value="dinner">Dîner</option><option value="snack">Collation</option></select></label>
        <label className="text-sm">Envie<select className="culinary-select" value={value.query} onChange={e => update({ query: e.target.value })}><option value="">Toutes les envies</option><option value="soupe">Soupe</option><option value="salade">Salade</option><option value="pâtes">Pâtes</option><option value="riz">Riz</option></select></label>
        <label className="text-sm">Portions pour ce repas<select className="culinary-select" value={value.servings} onChange={e => update({ servings: e.target.value })}><option value="">Profil ou recette</option>{[1, 2, 3, 4, 6, 8].map(count => <option key={count} value={count}>{count} {count===1 ? 'personne' : 'personnes'}</option>)}</select></label>
        <label className="text-sm">Style de repas<select className="culinary-select" value={value.craving} onChange={e => update({ craving: e.target.value })}><option value="any">Indifférent</option><option value="warm">Chaud</option><option value="fresh">Frais</option><option value="comfort">Réconfortant</option></select></label>
      </div>
      <div className="routine-dialog-footer space-y-2"><Button className="min-h-11 w-full" onClick={() => setOpen(false)}>Voir les idées</Button><Button variant="ghost" className="min-h-11 w-full" onClick={() => onChange({ ...defaultMealContext })}>Réinitialiser ce repas</Button></div>
    </DialogContent>
  </Dialog>;
}
