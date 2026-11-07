import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { assessImportedRecipeQuality } from '@smart/shared';
import { importsApi } from '@/services/recipe-import/api';
import { ApiError } from '@/lib/api';
import DiscoveryDraftEditor from '../DiscoveryDraftEditor';
import { draft, draftRow, IMPORT, item, OTHER, OWNER, prepared, RECIPE, socialImport } from './fixtures';

jest.mock('@/services/recipe-import/api', () => ({ importsApi: { review: jest.fn(), save: jest.fn(), get: jest.fn(), getCurrentDraft: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  apiGet: jest.fn(), apiPost: jest.fn(), apiPatch: jest.fn(),
  ApiError: class extends Error {
    status: number; code?: string;
    constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
  },
}));
const mockReview = importsApi.review as jest.Mock, mockSave = importsApi.save as jest.Mock;
const mockGet = importsApi.get as jest.Mock, mockCurrent = importsApi.getCurrentDraft as jest.Mock;
function show(override = prepared) {
  const onAdded = jest.fn();
  const view = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><DiscoveryDraftEditor owner={OWNER} item={item} prepared={override} onClose={jest.fn()} onAdded={onAdded} /></MemoryRouter></QueryClientProvider>);
  return { ...view, onAdded };
}
beforeEach(() => {
  localStorage.clear(); jest.clearAllMocks();
  mockReview.mockImplementation(async (_id, body) => ({ draft: body.draft, revision: body.expected_revision, quality: assessImportedRecipeQuality(body.draft, { sourceReviewed: body.source_reviewed }), adaptations: [] }));
  mockSave.mockResolvedValue({ import: { ...socialImport, status: 'saved', recipe_id: RECIPE }, recipe_id: RECIPE });
});

test('an edited import saves through its canonical id and revision with the original source intact', async () => {
  const view = show();
  fireEvent.change(screen.getByLabelText('Titre du plat'), { target: { value: 'Mon titre corrigé' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes recettes' }));
  await waitFor(() => expect(view.onAdded).toHaveBeenCalledWith({ id: RECIPE, source: 'recipes' }));
  expect(mockSave).toHaveBeenCalledWith(IMPORT, expect.objectContaining({ expected_revision: 3, draft: expect.objectContaining({ title: 'Mon titre corrigé', source: draft.source }) }), OWNER, expect.any(AbortSignal));
  expect(screen.getByRole('link', { name: 'Voir ma recette et cuisiner' })).toHaveAttribute('href', `/kitchen/recipes/${RECIPE}?source=recipes`);
  expect(localStorage.getItem(`v10-routine:${OWNER}:discovery-review:${item.id}`)).toBeNull();
});

test('an incomplete recipe keeps blank facts and requires source and unknown-field acknowledgement', async () => {
  const incomplete = { ...draft, prepTimeMinutes: undefined, cookTimeMinutes: undefined, servings: undefined,
    ingredients: [{ name: 'Carotte' }], source: { ...draft.source, extractionMethod: 'metadata' as const } };
  show({ ...prepared, draft: { ...draftRow, draft_json: incomplete }, quality: assessImportedRecipeQuality(incomplete) });
  expect(screen.getByLabelText('Portions')).toHaveValue('');
  expect(screen.getByLabelText('Quantité de l’ingrédient 1')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Ajouter à mes recettes' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  expect(screen.getByRole('button', { name: 'Ajouter à mes recettes' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Je garde les informations manquantes à vérifier avant de cuisiner.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes recettes' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  const body = mockSave.mock.calls[0][1];
  expect(body.source_reviewed).toBe(true); expect(body.acknowledge_unknowns).toBe(true);
  expect(body.draft.ingredients[0].quantity).toBeUndefined(); expect(body.draft.servings).toBeUndefined(); expect(body.draft.prepTimeMinutes).toBeUndefined();
});

test('a lost save response survives remount and reads the existing recipe without a second save', async () => {
  mockSave.mockRejectedValueOnce(new Error('Réponse perdue'));
  const first = show();
  fireEvent.change(screen.getByLabelText('Titre du plat'), { target: { value: 'Correction conservée' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes recettes' }));
  await screen.findByRole('button', { name: 'Vérifier l’ajout' });
  first.unmount();
  mockGet.mockResolvedValueOnce({ ...socialImport, status: 'saved', recipe_id: RECIPE });
  const resumed = show();
  expect(screen.getByLabelText('Titre du plat')).toHaveValue('Correction conservée');
  expect(screen.getByLabelText('Titre du plat')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Vérifier l’ajout' }));
  await waitFor(() => expect(resumed.onAdded).toHaveBeenCalledWith({ id: RECIPE, source: 'recipes' }));
  expect(mockGet).toHaveBeenCalledWith(IMPORT, OWNER);
  expect(mockSave).toHaveBeenCalledTimes(1);
});

test('a revision conflict keeps human corrections and uses the reread revision on retry', async () => {
  mockSave.mockRejectedValueOnce(new ApiError('Brouillon changé', { status: 409, code: 'REVISION_CONFLICT' }));
  mockCurrent.mockResolvedValueOnce({ import: socialImport, draft: { ...draftRow, version: 4 } });
  const view = show();
  fireEvent.change(screen.getByLabelText('Titre du plat'), { target: { value: 'Titre de ma correction' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes recettes' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Relire la révision et garder mes corrections' }));
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' })).not.toBeChecked());
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ajouter à mes recettes' })).toBeEnabled());
  expect(screen.getByLabelText('Titre du plat')).toHaveValue('Titre de ma correction');
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes recettes' }));
  await waitFor(() => expect(view.onAdded).toHaveBeenCalled());
  expect(mockSave.mock.calls[1][1]).toEqual(expect.objectContaining({ expected_revision: 4, draft: expect.objectContaining({ title: 'Titre de ma correction' }) }));
});

test('food-policy adaptations are shown and require an explicit acceptance before saving', async () => {
  mockReview.mockImplementationOnce(async (_id, body) => ({
    draft: { ...body.draft, ingredients: [{ ...body.draft.ingredients[0], name: 'Poulet' }] }, revision: 3,
    quality: assessImportedRecipeQuality(body.draft), adaptations: [{ path: 'ingredients.0.name', from: 'Porc', to: 'Poulet' }],
  }));
  show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes recettes' }));
  await screen.findByText('Porc → Poulet');
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Ajouter la version adaptée à mes recettes' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’accepte ces adaptations. La source originale reste conservée.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter la version adaptée à mes recettes' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  expect(mockSave.mock.calls[0][1]).toEqual(expect.objectContaining({ acknowledge_adaptations: true, draft: expect.objectContaining({ source: draft.source, ingredients: [expect.objectContaining({ name: 'Poulet' })] }) }));
});

test('an unfinished inspiration never becomes a cookable recipe from a confirmation alone', () => {
  const inspiration = { ...draft, ingredients: [], instructions: [] };
  show({ ...prepared, draft: { ...draftRow, draft_json: inspiration }, quality: assessImportedRecipeQuality(inspiration) });
  expect(screen.getByRole('button', { name: 'Ajouter à mes recettes' })).toBeDisabled();
  expect(screen.getByText(/Cette inspiration est gardée/)).toBeVisible();
  expect(mockSave).not.toHaveBeenCalled();
});

test('an unreadable retained draft is not overwritten by confirmation controls', () => {
  const key = `v10-routine:${OWNER}:discovery-review:${item.id}`;
  const retained = '{invalid draft: human data';
  localStorage.setItem(key, retained);
  show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  expect(localStorage.getItem(key)).toBe(retained);
  expect(screen.getByRole('button', { name: 'Ajouter à mes recettes' })).toBeDisabled();
  expect(mockSave).not.toHaveBeenCalled();
});

test('a saved result from another owner cannot reconcile a revision conflict', async () => {
  mockSave.mockRejectedValueOnce(new ApiError('Brouillon changé', { status: 409, code: 'REVISION_CONFLICT' }));
  mockCurrent.mockResolvedValueOnce({ import: { ...socialImport, user_id: OTHER, status: 'saved', recipe_id: RECIPE }, draft: null });
  const view = show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'J’ai vérifié les ingrédients et les étapes dans la source.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes recettes' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Relire la révision et garder mes corrections' }));
  await screen.findByText('Le brouillon ne peut pas être relu pour ce compte.');
  expect(view.onAdded).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'Voir ma recette et cuisiner' })).not.toBeInTheDocument();
});
