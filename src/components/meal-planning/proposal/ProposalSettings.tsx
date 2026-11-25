/**
 * V11-01 E4b — what a proposal fills (dinners by default, lunches too if wanted) and respects:
 * servings (the profile's when empty), a time limit and foods left out, under « Plus d'options ».
 */
import { Button } from '@/components/ui/button';
import type { ProposalMeal, ProposalSettings as Settings } from '@/lib/weekProposal';

const TIMES = [20, 30, 45, 60];
const MEAL_CHOICES: Array<[ProposalMeal, string]> = [['lunch', 'Déjeuners'], ['dinner', 'Dîners']];

interface ProposalSettingsProps {
  settings: Settings;
  /** Empty slots of the chosen meals, from today. */
  count: number;
  hasProposal: boolean;
  busy: boolean;
  onChange: (next: Settings) => void;
  onPropose: () => void;
}

export default function ProposalSettings({ settings, count, hasProposal, busy, onChange, onPropose }: ProposalSettingsProps) {
  const toggle = (meal: ProposalMeal, on: boolean) =>
    onChange({ ...settings, meals: on ? [...new Set([...settings.meals, meal])] : settings.meals.filter(item => item !== meal) });
  return <section className="kitchen-proposal-settings" aria-labelledby="proposal-settings-title">
    <h2 id="proposal-settings-title" className="sr-only">Réglages de la proposition</h2>
    <fieldset className="kitchen-proposal-meals">
      <legend className="text-sm font-medium">Repas à proposer</legend>
      {MEAL_CHOICES.map(([meal, label]) => <label key={meal} className="kitchen-move-choice">
        <input type="checkbox" checked={settings.meals.includes(meal)} disabled={busy} onChange={event => toggle(meal, event.target.checked)} />{label}
      </label>)}
    </fieldset>
    <label className="kitchen-proposal-field">Portions
      <input type="number" inputMode="numeric" min={1} max={20} step={1} placeholder="Celles de ton profil" disabled={busy}
        value={settings.servings ?? ''} onChange={event => {
          const value = Number(event.target.value);
          onChange({ ...settings, servings: event.target.value && Number.isInteger(value) && value >= 1 && value <= 20 ? value : null });
        }} />
    </label>
    <details className="kitchen-proposal-more">
      <summary>Plus d’options</summary>
      <label className="kitchen-proposal-field">Temps maximal
        <select value={settings.timeLimitMinutes ?? ''} disabled={busy}
          onChange={event => onChange({ ...settings, timeLimitMinutes: event.target.value ? Number(event.target.value) : null })}>
          <option value="">Sans limite</option>
          {TIMES.map(minutes => <option key={minutes} value={minutes}>{minutes} min</option>)}
        </select>
      </label>
      <label className="kitchen-proposal-field">Sans ces aliments
        <input type="text" maxLength={400} placeholder="poisson, crème…" disabled={busy} value={settings.excluded}
          onChange={event => onChange({ ...settings, excluded: event.target.value })} />
        <span className="text-xs text-muted-foreground">Jusqu’à 10, séparés par des virgules.</span>
      </label>
    </details>
    {hasProposal && <p className="text-xs text-muted-foreground">Ces réglages valent pour « Autre recette » et pour « Tout reproposer » ; la proposition affichée ne change pas d’elle-même.</p>}
    <p className="text-sm text-muted-foreground">
      {count ? `${count} créneau${count > 1 ? 'x' : ''} vide${count > 1 ? 's' : ''} d’ici dimanche.` : 'Aucun créneau vide d’ici dimanche pour ces repas.'}
    </p>
    {count > 0 && <Button type="button" className="min-h-11" variant={hasProposal ? 'outline' : 'default'} aria-disabled={busy}
      onClick={() => { if (!busy) onPropose(); }}>
      {hasProposal ? `Tout reproposer (${count} repas)` : `Proposer ${count} repas`}
    </Button>}
  </section>;
}
