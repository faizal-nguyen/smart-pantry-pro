import { Link } from 'react-router-dom';
import type { MenuShoppingLine } from '@smart/shared';
import { Input } from '@/components/ui/input';
import { formatShoppingQuantity } from '@/lib/shoppingChanges';
import { mealsLabel, type LineChoice } from '@/lib/menuShoppingReview';

interface WeekShoppingLineProps {
  line: MenuShoppingLine;
  /** to_add and excess only: what the user keeps. */
  choice?: LineChoice;
  error?: string;
  locked: boolean;
  onChange: (patch: Partial<LineChoice>) => void;
}

const amount = (quantity: number | null | undefined, unit: string | null) =>
  quantity == null ? 'quantité à préciser' : `${formatShoppingQuantity(quantity)} ${unit ?? ''}`.trim();

/** What a line of the week's review says, and what the user can change on it. */
function LineDetail({ line }: { line: MenuShoppingLine }) {
  switch (line.state) {
    case 'excess':
      return <p className="kitchen-week-line-note">La semaine en demande moins que ta liste n’en porte : retire la part ajoutée par le menu si tu le souhaites.</p>;
    case 'manual':
      return <p className="kitchen-week-line-amount">{amount(line.quantity, line.unit)}</p>;
    case 'verify':
      return <>
        {/* A close product may be the same one under another name: never counted, never bought blindly. */}
        {!!line.similar_lots?.length && <p className="kitchen-week-line-note">
          Produit proche dans ton stock : {line.similar_lots.join(', ')}. Vérifie que c’est le même avant d’en acheter.</p>}
        {(!!line.verify_lots?.length || !line.similar_lots?.length) && <p className="kitchen-week-line-note">{line.verify_lots?.length
          ? `En stock : ${line.verify_lots.join(', ')}. Date, quantité ou unité à vérifier : rien n’est compté ni ajouté.`
          : 'Quantité, unité ou date à vérifier dans ton stock : rien n’est compté ni ajouté.'}</p>}
      </>;
    case 'listed':
      return <p className="kitchen-week-line-note">{amount(line.listed_quantity ?? line.quantity, line.unit)} déjà sur ta liste (la semaine en demande {amount(line.quantity, line.unit)}).</p>;
    case 'purchased_pending':
      return <p className="kitchen-week-line-note">Acheté, à ranger. <Link className="kitchen-shopping-stock-link" to="/shopping/list">Ranger mes achats</Link></p>;
    default:
      return null;
  }
}

export default function WeekShoppingLine({ line, choice, error, locked, onChange }: WeekShoppingLineProps) {
  const errorId = `week-line-error-${line.key}`;
  return <li className="kitchen-shopping-item kitchen-week-line" data-state={line.state}>
    <div className="kitchen-week-line-main">
      {choice ? <label className="kitchen-week-line-check">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={choice.selected} disabled={locked}
          aria-label={line.state === 'excess' ? `Retirer ${amount(line.reduction?.quantity, line.reduction?.unit ?? null)} de ${line.name}` : `Ajouter ${line.name}`}
          onChange={event => onChange({ selected: event.target.checked })} />
        <span className="kitchen-week-line-name">{line.name}</span>
      </label> : <p className="kitchen-week-line-name">{line.name}</p>}
      {choice && line.state === 'to_add' && <span className="kitchen-week-quantity">
        <Input className="h-11 w-24" inputMode="decimal" value={choice.quantity} disabled={locked || !choice.selected}
          aria-label={`Quantité de ${line.name}, en ${line.unit}`} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
          onChange={event => onChange({ quantity: event.target.value })} />
        <span>{line.unit}</span>
      </span>}
      {choice && line.state === 'excess' && <span className="kitchen-week-line-amount">− {amount(line.reduction?.quantity, line.reduction?.unit ?? null)}</span>}
    </div>
    <LineDetail line={line} />
    {line.meals.length > 0 && <p className="kitchen-week-meals">{mealsLabel(line.meals)}</p>}
    {error && <p id={errorId} className="text-sm text-destructive">{error}</p>}
  </li>;
}
