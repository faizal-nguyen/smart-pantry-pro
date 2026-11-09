import { ApiError } from './apiError';

const TECHNICAL = /^(HTTP \d{3}|API error|Internal Server Error|Load failed|Failed to fetch|NetworkError.*|Bad Gateway|Service Unavailable)$/i;

/**
 * What the screen says when a call fails: the server's own message when it wrote one for
 * people, else a French sentence for the status. « HTTP 500 », « API error » or « Load
 * failed » reached the screen before (audit 2026-11-07, UX P2 5).
 */
export function apiFailureMessage(status: number, serverMessage?: string): string {
  if (serverMessage?.trim() && !TECHNICAL.test(serverMessage.trim())) return serverMessage;
  if (status === 401) return 'Reconnecte-toi pour continuer.';
  if (status === 403) return 'Cette action n’est pas autorisée pour ce compte.';
  if (status === 404) return 'Élément introuvable.';
  if (status === 413) return 'Fichier trop volumineux.';
  if (status === 429) return 'Trop de demandes d’un coup. Réessaie dans une minute.';
  if (status >= 500) return 'Le service ne répond pas correctement. Réessaie dans un instant.';
  return 'La demande n’a pas abouti. Réessaie.';
}

/** fetch rejects without a response when the network is down; a cancellation stays one. */
export function networkFailure(error: unknown): unknown {
  if (error instanceof DOMException && error.name === 'AbortError') return error;
  return new ApiError('Connexion impossible. Vérifie ton réseau puis réessaie.', { status: 0, code: 'NETWORK_ERROR' });
}
