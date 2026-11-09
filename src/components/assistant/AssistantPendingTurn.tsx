/**
 * The message just sent, shown at once with « L’assistant prépare sa réponse… »
 * until the reply arrives (iPhone 2026-11-09: a tapped recipe showed nothing for
 * seconds and looked like a bug). Same bubble as a user message of the thread.
 */
import { useEffect, useRef } from 'react';
import { Loader2, User as UserIcon } from 'lucide-react';

export default function AssistantPendingTurn({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); }, []);
  return (
    <div ref={ref} data-pending-turn className="my-3 space-y-2">
      <div className="flex justify-end gap-2">
        <p className="min-w-0 max-w-[80%] whitespace-pre-wrap break-words rounded-lg rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
          {text}
        </p>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          <UserIcon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <p role="status" className="ml-10 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        L’assistant prépare sa réponse…
      </p>
    </div>
  );
}
