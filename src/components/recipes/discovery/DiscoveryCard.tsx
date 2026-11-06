import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import type { DiscoveryCreator, DiscoveryItem } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { safeDiscoverySourceUrl, type DiscoveryDecision, type DiscoveryFeedback } from '@/services/discoveryApi';
import RecipePreview from '../RecipePreview';

function knownDuration(item: DiscoveryItem): string {
  const draft = item.draft;
  if (!draft || (draft.prepTimeMinutes == null && draft.cookTimeMinutes == null)) return 'Durée à vérifier';
  const parts = [draft.prepTimeMinutes == null ? 'Préparation à vérifier' : `Préparation ${draft.prepTimeMinutes} min`,
    draft.cookTimeMinutes == null ? 'Cuisson à vérifier' : `Cuisson ${draft.cookTimeMinutes} min`];
  if (draft.restTimeMinutes != null) parts.push(`Repos ${draft.restTimeMinutes} min`);
  return parts.join(' · ');
}
const qualityLabels = { inspiration: 'Inspiration à compléter', needs_completion: 'Informations à compléter', reviewable: 'Recette à vérifier' };
const feedbackLabels = { repeat: 'À refaire', dislike: 'Je n’aime pas', too_long: 'Trop long' };

export default function DiscoveryCard({ item, creator, disabled, priority = false, onDecision, onReview, onFeedback }: {
  item: DiscoveryItem; creator?: DiscoveryCreator; disabled: boolean; priority?: boolean;
  onDecision: (item: DiscoveryItem, decision: DiscoveryDecision) => void;
  onReview: (item: DiscoveryItem) => void;
  onFeedback: (item: DiscoveryItem, feedback: DiscoveryFeedback) => void;
}) {
  const [cooked, setCooked] = useState(false);
  const checkboxId = useId();
  const source = safeDiscoverySourceUrl(item.sourceUrl);
  const ingredients = item.draft?.ingredients.map(ingredient => ingredient.name).slice(0, 4) ?? [];
  return <li className="culinary-recipe-card kitchen-library-card min-w-0" aria-label={item.title}>
    <RecipePreview imageUrl={item.imageUrl} title={item.title} priority={priority} decorative className="culinary-recipe-photo" />
    <div className="culinary-recipe-copy space-y-2 min-w-0">
      <p className="text-xs text-muted-foreground break-words">{creator?.name ?? 'Créateur'} · {item.status === 'added' ? 'Ajoutée à mes recettes' : item.status === 'kept' ? 'Gardée' : qualityLabels[item.quality.state]}</p>
      <p className="text-xs text-muted-foreground"><time dateTime={item.createdAt}>Lien ajouté le {new Date(item.createdAt).toLocaleDateString('fr-FR')}</time>{item.publishedAt && <> · <time dateTime={item.publishedAt}>Publication du {new Date(item.publishedAt).toLocaleDateString('fr-FR')}</time></>}</p>
      <h3 className="kitchen-card-title">{item.title}</h3>
      {item.description && <p className="text-sm break-words">{item.description}</p>}
      {ingredients.length > 0 && <p className="text-sm text-muted-foreground break-words">{ingredients.join(', ')}</p>}
      <p className="text-sm text-muted-foreground">{knownDuration(item)}{item.draft?.servings != null ? ` · ${item.draft.servings} portions` : ' · Portions à vérifier'}</p>
      {item.reasons[0] && <p className="text-sm break-words">{item.reasons[0]}</p>}
      {item.constraints === 'incompatible' && <p className="text-sm text-destructive">Cette proposition ne correspond pas aux contraintes vérifiées.</p>}
      {['unknown', 'verify'].includes(item.constraints) && <p className="text-xs text-muted-foreground">Composition et contraintes à vérifier avant de cuisiner.</p>}
      {source && <Button asChild className="min-h-11 w-full" variant="outline"><a href={source} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer">Voir la source<span className="sr-only"> de {item.title}, nouvel onglet</span></a></Button>}
      {item.status === 'added' && item.recipeReference ? <Button asChild className="min-h-11 w-full"><Link to={recipeDetailPath(item.recipeReference)}>Voir ma recette</Link></Button> : <>
        <Button className="min-h-11 w-full" disabled={disabled || item.constraints === 'incompatible'} onClick={() => item.status === 'kept' ? onReview(item) : onDecision(item, 'keep')}>{item.status === 'kept' ? 'Vérifier et ajouter' : 'Garder'}</Button>
        <div className="flex flex-wrap gap-1">
          <Button className="min-h-11 flex-1" disabled={disabled} variant="ghost" onClick={() => onDecision(item, 'pass')}>Passer</Button>
          <Button className="min-h-11 flex-1" disabled={disabled} variant="ghost" onClick={() => onDecision(item, 'not_today')}>Pas aujourd’hui</Button>
        </div>
      </>}
      {item.quality.unknowns.length > 0 && <details className="text-sm"><summary className="min-h-11 cursor-pointer">Ce qui reste à vérifier</summary><ul className="list-disc pl-5 space-y-1 pb-2">{item.quality.unknowns.map((unknown, index) => <li key={`${unknown.path}:${index}`}>{unknown.label}</li>)}</ul></details>}
      {item.status === 'added' && <details className="text-sm">
        <summary className="min-h-11 cursor-pointer">Mon avis après cuisine</summary>
        <p className="text-sm text-muted-foreground">Garder exprimait une envie. Cet avis concerne le plat après l’avoir cuisiné.</p>
        <label htmlFor={checkboxId} className="flex items-center gap-3 min-h-11"><input id={checkboxId} type="checkbox" className="h-5 w-5 shrink-0" checked={cooked} onChange={event => setCooked(event.target.checked)} />J’ai cuisiné cette recette</label>
        <div className="flex flex-wrap gap-2 pb-2">{(Object.entries(feedbackLabels) as [DiscoveryFeedback, string][]).map(([value, label]) => <Button key={value} className="min-h-11 whitespace-normal" variant="outline" aria-pressed={item.lastFeedback === value} disabled={disabled || !cooked} onClick={() => onFeedback(item, value)}>{label}</Button>)}</div>
      </details>}
    </div>
  </li>;
}
