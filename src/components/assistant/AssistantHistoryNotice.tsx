import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAssistantMemoryPolicy } from '@/services/assistantApi';

/** History off: the conversation lives in this page only (audit 2026-11-07, UX P1 2: forgotten silently). */
export function AssistantHistoryNoticeView({ saveHistory }: { saveHistory: boolean | undefined }) {
  if (saveHistory !== false) return null;
  return (
    <p role="status" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      Historique désactivé : cette conversation sera oubliée quand tu quitteras la page.{' '}
      <Link to="/settings?section=assistant-memory" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Activer l’historique</Link>
    </p>
  );
}

/** Reads the same policy query as the memory settings, so a change there shows here. */
export default function AssistantHistoryNotice({ owner }: { owner: string | undefined }) {
  const policy = useQuery({ queryKey: ['assistant-memory-policy', owner], enabled: !!owner, queryFn: () => getAssistantMemoryPolicy(owner!), staleTime: 0 });
  return <AssistantHistoryNoticeView saveHistory={policy.data?.saveHistory} />;
}
