import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantActionsPanel } from '../AssistantActionsPanel';
import AssistantConversationSurface from '../AssistantConversationSurface';
import type { AssistantPlanResponse } from '@/services/assistantApi';

const mockConfirm = jest.fn(), mockUndo = jest.fn(), mockDbChanged = jest.fn(), mockToast = jest.fn();
let mockOwner = 'owner-a';
let mockReply: AssistantPlanResponse | null = null;
jest.mock('@/services/assistantApi', () => ({
  postAssistantConfirm: (...args: unknown[]) => mockConfirm(...args),
  postAssistantUndo: (...args: unknown[]) => mockUndo(...args),
}));
jest.mock('@/lib/agentEvents', () => ({ tablesForTool: (tool: string) => [tool], dispatchAgentDbChanged: (...args: unknown[]) => mockDbChanged(...args) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: mockOwner } }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('@/hooks/useAssistantConversations', () => ({ useAssistantMessages: () => ({ messages: [], isLoading: false }) }));
jest.mock('../AssistantMessageThread', () => ({ __esModule: true,
  default: ({ footer }: { footer?: React.ReactNode }) => <div data-testid="thread"><p>Fil de la conversation</p>{footer}</div> }));
jest.mock('../AssistantModelDetails', () => ({ __esModule: true, default: () => null }));
jest.mock('../AssistantMemoryNotice', () => ({ __esModule: true, default: () => null }));
// The composer is replaced by a button that delivers the next reply.
jest.mock('../AssistantComposer', () => ({ __esModule: true,
  default: ({ onResponse, initialRequest, onInitialRequestTaken }: { onResponse: (r: AssistantPlanResponse) => void; initialRequest?: string; onInitialRequestTaken?: () => void }) => <>
    <button onClick={() => mockReply && onResponse(mockReply)}>Envoyer</button>
    {initialRequest && <button onClick={onInitialRequestTaken}>Question apportée : {initialRequest}</button>}
  </> }));

const pending = { action_id: 'p1', step_seq: 1, tool: 'consume_inventory_items', args: { items: [{ name: 'riz', quantity: 200, unit: 'g' }] },
  risk_tier: 'medium' as const, reason: 'Décompte du stock à confirmer.' };
const executed = { action_id: 'e1', step_seq: 0, tool: 'add_shopping_items', args: { items: [{ name: 'lait', quantity: 1, unit: 'L' }] },
  result: {}, reversible: true, undo_expires_at: new Date(Date.now() + 60_000).toISOString(), risk_tier: 'low' as const };
const reply = (changes: Partial<AssistantPlanResponse> = {}): AssistantPlanResponse => ({
  session_id: 's', transcript: 'J’ai utilisé 200 g de riz', message: 'Je décompte 200 g de riz ?', actions_executed: [], actions_pending: [pending],
  confirmation_token: 'token-1', cost: { whisper_usd: 0, llm_usd: 0, total_usd: 0 }, model_used: null, duration_ms: 10, ...changes,
});
beforeEach(() => { mockConfirm.mockReset(); mockUndo.mockReset(); mockDbChanged.mockReset(); mockToast.mockReset(); mockOwner = 'owner-a'; mockReply = null; });

describe('pending and executed actions of a reply', () => {
  test('Confirmer executes the pending actions with their token and refreshes the touched data', async () => {
    const patch = jest.fn();
    mockConfirm.mockResolvedValue({ actions_executed: [{ ...executed, action_id: 'p1', tool: 'consume_inventory_items', reversible: false }], actions_failed: [] });
    render(<AssistantActionsPanel result={reply()} onResultPatched={patch} />);
    expect(screen.getByText('• 200 g riz')).toBeInTheDocument();
    expect(screen.getByText('Décompte du stock à confirmer.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer (1)' }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.objectContaining({ actions_pending: [], confirmation_token: null })));
    expect(mockConfirm).toHaveBeenCalledWith('token-1');
    expect(patch.mock.calls[0][0].actions_executed.map((a: { action_id: string }) => a.action_id)).toEqual(['p1']);
    expect(mockDbChanged).toHaveBeenCalledWith(['consume_inventory_items']);
  });
  test('a failed confirmation stays visible and can be retried', async () => {
    const patch = jest.fn();
    mockConfirm.mockRejectedValue(new Error('Confirmation expirée. Relance ta demande.'));
    render(<AssistantActionsPanel result={reply()} onResultPatched={patch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer (1)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirmation expirée. Relance ta demande.');
    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmer (1)' })).toBeEnabled();
  });
  test('Annuler drops the pending actions without calling the server', () => {
    const patch = jest.fn();
    render(<AssistantActionsPanel result={reply()} onResultPatched={patch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ne pas faire' }));
    expect(patch).toHaveBeenCalledWith({ actions_pending: [], confirmation_token: null });
    expect(mockConfirm).not.toHaveBeenCalled();
  });
  test('an executed reversible action can be undone once', async () => {
    const patch = jest.fn();
    mockUndo.mockResolvedValue({ undone: true });
    render(<AssistantActionsPanel result={reply({ actions_pending: [], confirmation_token: null, actions_executed: [executed] })} onResultPatched={patch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler cette action' }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(mockUndo).toHaveBeenCalledWith('e1');
    expect(patch.mock.calls[0][0].actions_executed[0].reversible).toBe(false);
    expect(mockDbChanged).toHaveBeenCalledWith(['add_shopping_items']);
  });
  test('a row chosen by id shows the name the server read for it', () => {
    const LOT = '44444444-4444-4444-8444-444444444444';
    render(<AssistantActionsPanel onResultPatched={jest.fn()} result={reply({ actions_pending: [
      { ...pending, args: { items: [{ inventory_id: LOT, quantity: 200, unit: 'g' }] }, labels: { [LOT]: 'Riz basmati' } },
      { ...pending, action_id: 'p2', tool: 'remove_shopping_items', args: { shopping_item_ids: ['s1', 's2'] }, labels: { s1: 'Lait', s2: 'Pain' } },
    ] })} />);
    expect(screen.getByText('• 200 g Riz basmati')).toBeInTheDocument();
    expect(screen.getByText(/• Lait\s+• Pain/)).toBeInTheDocument();
  });
  test('reads are not listed as changes; tools have French names; quantities use a decimal comma', () => {
    const LOT = '44444444-4444-4444-8444-444444444444';
    const read = { ...executed, action_id: 'r1', tool: 'read_inventory', args: { search: 'riz' }, reversible: false, risk_tier: 'read' as const };
    render(<AssistantActionsPanel onResultPatched={jest.fn()} result={reply({ actions_executed: [read], actions_pending: [
      { ...pending, args: { items: [{ inventory_id: LOT, quantity: 0.2, unit: 'kg' }] }, labels: { [LOT]: 'Riz Ponni' } }] })} />);
    expect(screen.queryByText(/Exécutées/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Read Inventory|read_inventory/)).not.toBeInTheDocument();
    expect(screen.getByText('Décompter du stock')).toBeInTheDocument();
    expect(screen.getByText('• 0,2 kg Riz Ponni')).toBeInTheDocument();
  });
  test('a recipe action shows the recipe name, not its id', () => {
    const RECIPE = '55555555-5555-4555-8555-555555555551';
    render(<AssistantActionsPanel onResultPatched={jest.fn()} result={reply({ actions_pending: [
      { ...pending, tool: 'cook_recipe', args: { recipe_id: RECIPE, outside_inventory: [] }, labels: { [RECIPE]: 'Lamb (Mutton) Biryani' } },
      { ...pending, action_id: 'p2', tool: 'add_recipe_to_meal_plan', args: { recipe_id: RECIPE, date: '2026-11-08', meal_type: 'dinner' }, labels: { [RECIPE]: 'Lamb (Mutton) Biryani' } },
    ] })} />);
    expect(screen.getByText('Lamb (Mutton) Biryani')).toBeInTheDocument();
    expect(screen.getByText('Lamb (Mutton) Biryani — dîner, dimanche 8 novembre')).toBeInTheDocument();
    expect(screen.queryByText(/recipe_id/)).not.toBeInTheDocument();
  });
  test('a cook to confirm says what the stock gives, then the toast says what it took (iPhone 2026-11-08)', async () => {
    const RECIPE = '55555555-5555-4555-8555-555555555551';
    const cook = { ...pending, tool: 'cook_recipe', args: { recipe_id: RECIPE, outside_inventory: [] }, labels: { [RECIPE]: 'Lamb (Mutton) Biryani' },
      details: ['Je retire de ton stock : Oignon 2 pièce.', 'Pas dans ton stock, rien à retirer : Agneau.'] };
    mockConfirm.mockResolvedValue({ actions_executed: [{ ...executed, action_id: 'p1', tool: 'cook_recipe', reversible: true,
      result: { command_id: 'c', summary: ['Retiré de ton stock : Oignon 2 pièce.', 'Pas dans ton stock, rien à retirer : Agneau.'] } }], actions_failed: [] });
    render(<AssistantActionsPanel result={reply({ actions_pending: [cook] })} onResultPatched={jest.fn()} />);
    expect(screen.getByText('Je retire de ton stock : Oignon 2 pièce.')).toBeInTheDocument();
    expect(screen.getByText('Pas dans ton stock, rien à retirer : Agneau.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer (1)' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Actions confirmées',
      description: 'Retiré de ton stock : Oignon 2 pièce. Pas dans ton stock, rien à retirer : Agneau.' })));
  });
  test('a failed confirmation says why, in a clear title', async () => {
    mockConfirm.mockResolvedValue({ actions_executed: [], actions_failed: [{ action_id: 'p1', tool: 'cook_recipe', error_code: 'EXECUTION_FAILED', reason: 'Cette recette n’est plus accessible.' }] });
    render(<AssistantActionsPanel result={reply()} onResultPatched={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer (1)' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Action non réalisée', description: 'Cette recette n’est plus accessible.' })));
  });
  test('a reply whose only action was a read renders nothing', () => {
    const read = { ...executed, tool: 'read_inventory', reversible: false, risk_tier: 'read' as const };
    const { container } = render(<AssistantActionsPanel onResultPatched={jest.fn()} result={reply({ actions_pending: [], confirmation_token: null, actions_executed: [read] })} />);
    expect(container).toBeEmptyDOMElement();
  });
  test('a reply without actions renders nothing', () => {
    const { container } = render(<AssistantActionsPanel result={reply({ actions_pending: [], confirmation_token: null })} onResultPatched={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the /assistant page (mobile has no floating button)', () => {
  const page = (conversationId: string | null = null) =>
    <MemoryRouter><AssistantConversationSurface conversationId={conversationId} mode="general" onModeChange={jest.fn()} /></MemoryRouter>;
  test('shows the confirmation of the last reply and confirms it', async () => {
    mockConfirm.mockResolvedValue({ actions_executed: [{ ...executed, action_id: 'p1', tool: 'consume_inventory_items', reversible: false }], actions_failed: [] });
    mockReply = reply();
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    const actions = screen.getByRole('region', { name: 'Actions de l’assistant' });
    fireEvent.click(within(actions).getByRole('button', { name: 'Confirmer (1)' }));
    await waitFor(() => expect(within(actions).queryByRole('button', { name: 'Confirmer (1)' })).not.toBeInTheDocument());
    expect(mockConfirm).toHaveBeenCalledWith('token-1');
  });
  test('refreshes the data an executed action changed', () => {
    mockReply = reply({ actions_pending: [], confirmation_token: null, actions_executed: [executed] });
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(mockDbChanged).toHaveBeenCalledWith(['add_shopping_items']);
  });
  test('in a saved conversation the block sits at the end of the thread, where it scrolls to (iPhone 2026-11-06 14:32)', () => {
    mockReply = reply({ conversation_id: 'conversation-a' });
    render(page('conversation-a'));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(within(screen.getByTestId('thread')).getByRole('button', { name: 'Confirmer (1)' })).toBeInTheDocument();
  });
  test('a question brought by a button reaches the composer once, then is forgotten', () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/assistant', state: { assistantAsk: 'Que cuisiner ce soir ?' } }]}>
      <AssistantConversationSurface conversationId={null} mode="general" onModeChange={jest.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Question apportée : Que cuisiner ce soir ?' }));
    expect(screen.queryByText(/Question apportée/)).not.toBeInTheDocument();
  });
  test('« laquelle ? » offers each recipe as a button that sends the answer (iPhone 2026-11-07)', () => {
    mockReply = reply({ actions_pending: [], confirmation_token: null, message: 'Plusieurs recettes correspondent : … Laquelle as-tu cuisinée ?',
      choices: [{ label: 'Lamb (Mutton) Biryani', reply: 'J’ai cuisiné Lamb (Mutton) Biryani' }, { label: 'Buhari Chicken Biryani', reply: 'J’ai cuisiné Buhari Chicken Biryani' }] });
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lamb (Mutton) Biryani' }));
    expect(screen.getByRole('button', { name: 'Question apportée : J’ai cuisiné Lamb (Mutton) Biryani' })).toBeInTheDocument();
  });
  test('the actions of another conversation are not offered', () => {
    mockReply = reply({ conversation_id: 'conversation-a' });
    const view = render(page('conversation-a'));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(screen.getByRole('button', { name: 'Confirmer (1)' })).toBeInTheDocument();
    view.rerender(page('conversation-b'));
    expect(screen.queryByRole('button', { name: 'Confirmer (1)' })).not.toBeInTheDocument();
  });
});
