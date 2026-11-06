import { useNavigate } from 'react-router-dom';

/**
 * « Demander à l'assistant » buttons open /assistant with their question, which
 * the composer sends there. Posting it in the background lost the reply when
 * history is off, and any action to confirm (audit 2026-11-04).
 */
const KEY = 'assistantAsk';

export function useAskAssistant(): (question: string) => void {
  const navigate = useNavigate();
  return question => navigate('/assistant', { state: { [KEY]: question.slice(0, 2000) } });
}

/** The question a button brought, from the router location state. */
export function readAssistantAsk(state: unknown): string | null {
  const value = state && typeof state === 'object' ? (state as Record<string, unknown>)[KEY] : null;
  return typeof value === 'string' && value.trim() ? value : null;
}
