import { Link } from 'react-router-dom';
import type { AssistantPlanResponse } from '@/services/assistantApi';
export default function AssistantMemoryNotice({ result }: { result: Pick<AssistantPlanResponse,'memory_results'|'summary_status'> | null }) {
  const receipts = result?.memory_results ?? [];
  if (!receipts.length && !['not_saved','revision_changed'].includes(result?.summary_status ?? '')) return null;
  return <div className="space-y-2 rounded-lg border p-3 text-sm" aria-live="polite">
    {receipts.map(receipt => <p key={receipt.command_id}>{receipt.status === 'saved'
      ? receipt.operation === 'forget' ? 'Souvenir oublié.' : receipt.operation === 'reject' ? 'Proposition rejetée.' : receipt.destination === 'profile' ? 'Profil alimentaire confirmé.' : 'Souvenir enregistré.'
      : receipt.status === 'awaiting_confirmation' ? 'Proposition enregistrée : elle attend votre confirmation.'
      : receipt.status === 'disabled' ? 'Mémoire désactivée : aucun souvenir enregistré.'
      : receipt.status === 'verification_required' ? 'L’enregistrement reste à vérifier. Une nouvelle tentative doit garder la même demande.'
      : 'Ce souvenir n’a pas été enregistré.'}</p>)}
    {['not_saved','revision_changed'].includes(result?.summary_status ?? '') && <p>Le résumé n’a pas été enregistré. L’assistant conserve le contexte des messages récents autorisés.</p>}
    {receipts.length > 0 && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" to="/settings?section=assistant-memory">Consulter et gérer la mémoire</Link>}
  </div>;
}
