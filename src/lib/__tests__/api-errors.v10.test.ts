import { apiFailureMessage, networkFailure } from '../apiErrors';

// Audit 2026-11-07 (UX P2 5): « HTTP 500 », « API error » or « Load failed » reached the screen.
describe('API errors read in French', () => {
  test.each([[500, 'Le service ne répond pas correctement. Réessaie dans un instant.'], [502, 'Le service ne répond pas correctement. Réessaie dans un instant.'],
    [429, 'Trop de demandes d’un coup. Réessaie dans une minute.'], [401, 'Reconnecte-toi pour continuer.'], [404, 'Élément introuvable.'],
    [413, 'Fichier trop volumineux.'], [400, 'La demande n’a pas abouti. Réessaie.']])(
    'a %s without a message', (status, message) => expect(apiFailureMessage(status)).toBe(message));
  test('the server’s own message is kept', () => expect(apiFailureMessage(400, 'Indique une quantité positive.')).toBe('Indique une quantité positive.'));
  test.each(['HTTP 500', 'API error', 'Internal Server Error', 'Load failed', ''])('a technical message (%s) is replaced', message =>
    expect(apiFailureMessage(500, message)).toBe('Le service ne répond pas correctement. Réessaie dans un instant.'));
  test('no network', () => {
    expect(networkFailure(new TypeError('Load failed'))).toMatchObject({ status: 0, code: 'NETWORK_ERROR', message: 'Connexion impossible. Vérifie ton réseau puis réessaie.' });
  });
  test('a cancelled request stays a cancellation', () => {
    const aborted = new DOMException('aborted', 'AbortError');
    expect(networkFailure(aborted)).toBe(aborted);
  });
});
