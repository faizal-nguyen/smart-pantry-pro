import { render, screen } from '@testing-library/react';
import AssistantMessageThread from '../AssistantMessageThread';

jest.mock('../AssistantModelDetails', () => ({ __esModule: true, default: () => null }));
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
