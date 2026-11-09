import { toApiError } from '../errors.js';

// Audit 2026-11-07 (security P2 8): an unexpected error sent its own message (SQL, keys, paths) to the browser.
describe('an unexpected error tells the browser nothing internal', () => {
  test('a database error becomes a generic 500', () => {
    const error = toApiError(new Error('column "secret_token" of relation "user_profiles" does not exist'));
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Une erreur est survenue. Réessaie dans un instant.');
  });
  test('a duplicate key keeps its 409, not the constraint name', () => {
    const error = toApiError(new Error('duplicate key value violates unique constraint "idx_products_normalized_name_unique"'));
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Cet élément existe déjà.');
  });
  test('a not found keeps its 404 with a plain message', () => {
    const error = toApiError(new Error('row not found in private.stock_commands'));
    expect([error.statusCode, error.message]).toEqual([404, 'Élément introuvable.']);
  });
});
