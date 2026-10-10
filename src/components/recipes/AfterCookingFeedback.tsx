import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RecommendationFeedback } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { pendingRecipeFeedback, postRecipeFeedback } from '@/services/recommendationsApi';
import type { CookingSession } from '@/services/cookingSessions';

export default function AfterCookingFeedback({ owner, recipe }: { owner: string; recipe: CookingSession['recipe'] }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState('');
  let pending: ReturnType<typeof pendingRecipeFeedback> = null;
  try { pending = pendingRecipeFeedback(owner); } catch { /* Replay retains and reports a malformed intent. */ }
  const record = async (feedback: RecommendationFeedback['feedback']) => {
    if (busy || recipe.source === 'auto') return;
    setBusy(true); setError(null);
    try {
      await postRecipeFeedback(owner, { recipe: { id: recipe.id, source: recipe.source }, feedback, event_id: null });
      setMessage('Ton retour est enregistré pour les prochaines idées.');
      dispatchAgentDbChanged(['recipe_interactions']);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Retour non confirmé. Réessaie.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 border-t pt-4" aria-label="Retour après la cuisine">
    <h2 className="text-lg font-semibold">À garder pour une prochaine fois ?</h2>
    <p className="text-sm text-muted-foreground">Ton retour aide à choisir les prochaines recettes. Il ne change pas ton profil alimentaire.</p>
    <div className="flex flex-wrap gap-2">{([['repeat', 'À refaire'], ['too_long', 'Trop long'], ['dislike', 'Je n’aime pas']] as const).map(([value, label]) => <Button key={value} className="min-h-11" variant="outline"
      disabled={busy || recipe.source === 'auto' || (!!pending && (pending.recipe.id !== recipe.id || pending.recipe.source !== recipe.source || pending.feedback !== value))}
      onClick={() => void record(value)}>{label}</Button>)}</div>
    {pending && <p role="status" className="text-sm">Un retour reste à confirmer. {pending.recipe.id===recipe.id && pending.recipe.source===recipe.source ? <Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>void record(pending!.feedback)}>Vérifier le retour conservé</Button> : <Link className="inline-flex min-h-11 items-center underline" to="/kitchen">Reprendre depuis Aujourd’hui</Link>}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
