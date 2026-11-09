import { render, screen } from '@testing-library/react';
import AssistantMessageThread from '../AssistantMessageThread';

jest.mock('../AssistantRecipeProposals', () => ({ __esModule: true, default: () => null }));
jest.mock('../AddChefIdeaDialog', () => ({ __esModule: true, default: () => null }));

test('the footer comes before the bottom marker the thread scrolls to', () => {
  const scrolled: Element[] = [];
  Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this); };
  const message = { id: 'm1', conversation_id: 'c', user_id: 'u', role: 'assistant' as const, content: '1 action à confirmer.',
    action_log_ids: [], metadata: {}, created_at: new Date().toISOString() };
  render(<AssistantMessageThread messages={[message] as never} footer={<p>Bloc à confirmer</p>} />);
  const footer = screen.getByText('Bloc à confirmer');
  const marker = scrolled.at(-1)!;
  expect(footer.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('chef ideas get their own section, whatever the title punctuation', () => {
  for (const title of ['**Idées chef hors bibliothèque :**', 'Idées chef hors bibliothèque', '### Idées chef hors bibliothèque :']) {
    const message = { id: 'm-' + title, conversation_id: 'c', user_id: 'u', role: 'assistant' as const, action_log_ids: [], metadata: {},
      content: `Aucune recette de ta bibliothèque n’utilise ces produits.\n\n${title}\n1. **Yakisoba maison** : nouilles sautées.`, created_at: new Date().toISOString() };
    const { unmount } = render(<AssistantMessageThread messages={[message] as never} />);
    expect(screen.getByText(/^1\. \*\*Yakisoba maison\*\*/)).toBeInTheDocument();
    expect(screen.queryByText(/^:\*\*/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter à mes recettes' })).toBeInTheDocument();
    unmount();
  }
});
