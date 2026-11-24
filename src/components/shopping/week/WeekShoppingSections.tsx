import type { MenuLineState, MenuShoppingLine } from '@smart/shared';
import { reviewSections, type LineChoice, type ReviewChoices } from '@/lib/menuShoppingReview';
import WeekShoppingLine from './WeekShoppingLine';

const TITLES: Record<MenuLineState, string> = {
  to_add: 'À ajouter', excess: 'En trop', manual: 'À ajouter à la main', verify: 'À vérifier',
  listed: 'Déjà sur ta liste', purchased_pending: 'Achetés, à ranger',
};
const HINTS: Partial<Record<MenuLineState, string>> = {
  to_add: 'Cochées par défaut. Tu peux baisser une quantité ou décocher ce que tu as déjà.',
  excess: 'Rien n’est retiré sans ton accord.',
  manual: 'Ces quantités ne s’écrivent pas sur la liste : ajoute-les toi-même si besoin.',
  verify: 'Vérifie ces produits dans ton stock avant tes courses.',
};
/** Already planned: shown folded, nothing to decide. */
const PLANNED: MenuLineState[] = ['listed', 'purchased_pending'];

interface WeekShoppingSectionsProps {
  lines: MenuShoppingLine[];
  choices: ReviewChoices;
  errors: Record<string, string>;
  locked: boolean;
  onChange: (key: string, patch: Partial<LineChoice>) => void;
  onLink: (line: MenuShoppingLine) => void;
}

export default function WeekShoppingSections({ lines, choices, errors, locked, onChange, onLink }: WeekShoppingSectionsProps) {
  const sections = reviewSections(lines);
  const open = sections.filter(section => !PLANNED.includes(section.state));
  const planned = sections.filter(section => PLANNED.includes(section.state));
  const plannedCount = planned.reduce((total, section) => total + section.lines.length, 0);
  const list = (items: MenuShoppingLine[]) => <ul>{items.map(line => <WeekShoppingLine key={line.key} line={line} choice={choices[line.key]}
    error={errors[line.key]} locked={locked} onChange={patch => onChange(line.key, patch)} onLink={() => onLink(line)} />)}</ul>;
  return <>
    {open.map(section => <section key={section.state} className="kitchen-shopping-group kitchen-week-group" data-state={section.state} aria-labelledby={`week-${section.state}`}>
      <h2 id={`week-${section.state}`}>{TITLES[section.state]} ({section.lines.length})</h2>
      {HINTS[section.state] && <p className="kitchen-week-group-hint">{HINTS[section.state]}</p>}
      {list(section.lines)}
    </section>)}
    {plannedCount > 0 && <details className="kitchen-shopping-group kitchen-week-group" data-state="planned">
      <summary className="kitchen-week-planned-summary">Déjà prévu ({plannedCount})</summary>
      {planned.map(section => <section key={section.state} aria-labelledby={`week-${section.state}`}>
        <h3 id={`week-${section.state}`} className="kitchen-week-subtitle">{TITLES[section.state]} ({section.lines.length})</h3>
        {list(section.lines)}
      </section>)}
    </details>}
  </>;
}
