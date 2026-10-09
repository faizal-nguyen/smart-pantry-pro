import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddRecipeDialog from '../AddRecipeDialog';
import { saveRecipeWithIngredients } from '@/services/recipePersistence';
import { pendingIntent } from '@/services/stockCommands';

jest.mock('@/services/recipePersistence', () => ({ saveRecipeWithIngredients: jest.fn() }));
jest.mock('@/services/stockCommands', () => ({ pendingIntent: jest.fn(async () => null) }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'account-A' }, isLoading: false }) }));
jest.mock('@/hooks/useRecipeParser', () => ({ useRecipeParser: () => ({ loading: false, error: null, extractRecipeFromURL: jest.fn() }) }));
jest.mock('@/hooks/useSocialRecipeParser', () => ({ useSocialRecipeParser: () => ({ loading: false, error: null, parseRecipeFromSocial: jest.fn() }) }));
jest.mock('../RecipeBookScanner', () => ({ __esModule: true, default: () => null }));
jest.mock('../RecipeVoiceInput', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }));

const save = jest.mocked(saveRecipeWithIngredients);
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); jest.mocked(pendingIntent).mockResolvedValue(null); });
function fill() {
  fireEvent.change(screen.getByLabelText(/Nom de la recette/),{ target: { value: 'Mon pain' } });
  fireEvent.change(screen.getByPlaceholderText('Nom ingrédient'),{ target: { value: 'Farine' } });
  fireEvent.change(screen.getByPlaceholderText('Qté'),{ target: { value: '200' } });
  fireEvent.change(screen.getByLabelText(/Instructions/),{ target: { value: 'Cuire le pain.' } });
}
describe('manual recipe persistence', () => {
  test('write refusal leaves the form and draft available, including after remount', async () => {
    const close = jest.fn(); save.mockRejectedValueOnce(new Error('Écriture refusée'));
    const view = render(<AddRecipeDialog open onOpenChange={close} />); fill();
    fireEvent.click(screen.getByRole('button',{ name: 'Ajouter la recette' }));
    await screen.findByRole('alert');
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nom de la recette/)).toHaveValue('Mon pain');
    expect(JSON.parse(localStorage.getItem('v10-draft:account-A:manual-recipe')!)).toMatchObject({ name: 'Mon pain' });
    view.unmount(); render(<AddRecipeDialog open onOpenChange={close} />);
    await waitFor(() => expect(screen.getByLabelText(/Nom de la recette/)).toHaveValue('Mon pain'));
  });
  test('closes only after confirmed persistence and sends recipe plus ingredients together', async () => {
    const close = jest.fn(); let confirm!: (value: Awaited<ReturnType<typeof saveRecipeWithIngredients>>) => void;
    save.mockImplementationOnce(() => new Promise(resolve => { confirm = resolve; }));
    render(<AddRecipeDialog open onOpenChange={close} />); fill();
    fireEvent.click(screen.getByRole('button',{ name: 'Ajouter la recette' }));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nom de la recette/)).toBeDisabled();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      recipe: expect.objectContaining({ name: 'Mon pain', is_public: false }),
      ingredients: [expect.objectContaining({ ingredient_name: 'Farine', quantity: 200, unit: 'g' })],
    }));
    confirm({ id: 'saved' } as Awaited<ReturnType<typeof saveRecipeWithIngredients>>);
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(localStorage.getItem('v10-draft:account-A:manual-recipe')).toBeNull();
  });
  test('uncertain response locks the saved draft and exposes a retry of the same save', async () => {
    const close = jest.fn();
    save.mockImplementationOnce(async payload => {
      jest.mocked(pendingIntent).mockResolvedValue({ command_id: '40000000-0000-4000-8000-000000000001', command_type: 'save_recipe', payload_version: 1, payload });
      throw new Error('Réponse perdue');
    });
    render(<AddRecipeDialog open onOpenChange={close}/>); fill();
    fireEvent.click(screen.getByRole('button',{ name: 'Ajouter la recette' }));
    const retry = await screen.findByRole('button',{ name: 'Vérifier la sauvegarde' });
    expect(screen.getByLabelText(/Nom de la recette/)).toBeDisabled();
    expect(screen.getByLabelText(/Nom de la recette/)).toHaveValue('Mon pain');
    expect(close).not.toHaveBeenCalled();
    save.mockResolvedValueOnce({ id: 'saved', name: 'Mon pain' } as Awaited<ReturnType<typeof saveRecipeWithIngredients>>);
    fireEvent.click(retry);
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0]);
  });
});
