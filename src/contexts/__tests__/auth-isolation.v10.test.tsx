import { useContext } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthSessionContext, AuthSessionProvider } from '../AuthSessionContext';

type Session = { user: { id: string } } | null;
let mockListener: (event: string,session: Session) => void;
let mockGetSession: () => Promise<{ data: { session: Session } }>;
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getSession: () => mockGetSession(),
  onAuthStateChange: (callback: typeof mockListener) => { mockListener = callback; return { data: { subscription: { unsubscribe: jest.fn() } } }; },
} } }));
jest.mock('@/lib/recipeSource', () => ({ invalidateUnifiedRecipeCache: jest.fn() }));
jest.mock('@/lib/agentEvents', () => ({ useAgentDbInvalidation: jest.fn() }));
jest.mock('@/hooks/use-toast', () => { const dismiss = jest.fn(); return { useToast: () => ({ dismiss }) }; });
jest.mock('sonner', () => ({ toast: { dismiss: jest.fn() } }));
function Probe() { return <p>{useContext(AuthSessionContext)?.user?.id ?? 'signed-out'}</p>; }
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); mockGetSession = async () => ({ data: { session: { user: { id: 'A' } } } }); });
test('account change purges query results and the former account work files', async () => {
  const queryClient = new QueryClient();
  render(<QueryClientProvider client={queryClient}><AuthSessionProvider><Probe /></AuthSessionProvider></QueryClientProvider>);
  await screen.findByText('A');
  queryClient.setQueryData(['private','A'],{ recipe: 'private A' });
  localStorage.setItem('v10-draft:A:manual-recipe','private A'); sessionStorage.setItem('v10-command:A:transfer','private A');
  sessionStorage.setItem('assistant.lastConversationId:A:active','private conversation A');
  sessionStorage.setItem('assistant.lastConversationId','legacy private conversation');
  act(() => mockListener('SIGNED_IN',{ user: { id: 'B' } }));
  await screen.findByText('B');
  expect(queryClient.getQueryData(['private','A'])).toBeUndefined();
  expect(localStorage.getItem('v10-draft:A:manual-recipe')).toBeNull();
  expect(sessionStorage.getItem('v10-command:A:transfer')).toBeNull();
  expect(sessionStorage.getItem('assistant.lastConversationId:A:active')).toBeNull();
  expect(sessionStorage.getItem('assistant.lastConversationId')).toBeNull();
});
test('late initial A session cannot override a newer B auth event', async () => {
  let finish!: (value: { data: { session: Session } }) => void;
  mockGetSession = () => new Promise(resolve => { finish = resolve; });
  render(<QueryClientProvider client={new QueryClient()}><AuthSessionProvider><Probe /></AuthSessionProvider></QueryClientProvider>);
  act(() => mockListener('SIGNED_IN',{ user: { id: 'B' } }));
  await act(async () => finish({ data: { session: { user: { id: 'A' } } } }));
  await waitFor(() => expect(screen.getByText('B')).toBeInTheDocument());
  expect(screen.queryByText('A')).toBeNull();
});
test('expiry preserves the same account draft; reconnecting with B after reload purges A', async () => {
  const view = render(<QueryClientProvider client={new QueryClient()}><AuthSessionProvider><Probe /></AuthSessionProvider></QueryClientProvider>);
  await screen.findByText('A');
  localStorage.setItem('v10-draft:A:manual-recipe','draft');
  act(() => mockListener('SIGNED_OUT',null));
  await screen.findByText('signed-out');
  expect(localStorage.getItem('v10-draft:A:manual-recipe')).toBe('draft');
  view.unmount(); mockGetSession = async () => ({ data: { session: { user: { id: 'B' } } } });
  render(<QueryClientProvider client={new QueryClient()}><AuthSessionProvider><Probe /></AuthSessionProvider></QueryClientProvider>);
  await screen.findByText('B');
  expect(localStorage.getItem('v10-draft:A:manual-recipe')).toBeNull();
});
