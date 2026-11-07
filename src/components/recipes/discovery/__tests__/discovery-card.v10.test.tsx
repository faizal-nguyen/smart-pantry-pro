import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DiscoveryCard from '../DiscoveryCard';
import { creator, item, RECIPE } from './fixtures';
jest.mock('@/lib/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPatch: jest.fn(), ApiError: class extends Error {} }));

function show(overrides = {}) {
  const onDecision = jest.fn(), onReview = jest.fn(), onFeedback = jest.fn();
  const view = render(<MemoryRouter><ul><DiscoveryCard item={{ ...item, ...overrides }} creator={creator} disabled={false} onDecision={onDecision} onReview={onReview} onFeedback={onFeedback} /></ul></MemoryRouter>);
  return { ...view, onDecision, onReview, onFeedback };
}
test('an expired preview keeps the source and all discovery decisions usable', () => {
  const view = show();
  fireEvent.error(view.container.querySelector('img')!);
  expect(screen.getByText('Photo indisponible')).toBeVisible();
  expect(screen.getByRole('link', { name: /Voir la source/ })).toHaveAttribute('href', item.sourceUrl);
  fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pas aujourd’hui' }));
  expect(view.onDecision.mock.calls.map(call => call[1])).toEqual(['keep', 'not_today']);
  expect(view.onFeedback).not.toHaveBeenCalled();
});
test('a saved proposal opens the exact recipe and only permits an explicit after-cooking opinion', () => {
  const view = show({ status: 'added', recipeReference: { id: RECIPE, source: 'recipes' } });
  expect(screen.getByRole('link', { name: 'Voir ma recette' })).toHaveAttribute('href', `/kitchen/recipes/${RECIPE}?source=recipes`);
  fireEvent.click(screen.getByText('Mon avis après cuisine'));
  expect(screen.getByRole('button', { name: 'À refaire' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai cuisiné cette recette' }));
  fireEvent.click(screen.getByRole('button', { name: 'À refaire' }));
  expect(view.onFeedback).toHaveBeenCalledWith(expect.objectContaining({ id: item.id }), 'repeat');
  expect(view.onDecision).not.toHaveBeenCalled();
});
test('unknown durations and portions are displayed without defaults', () => {
  show({ draft: { ...item.draft!, prepTimeMinutes: undefined, cookTimeMinutes: undefined, servings: undefined } });
  expect(screen.getByText(/Durée à vérifier · Portions à vérifier/)).toBeVisible();
});
