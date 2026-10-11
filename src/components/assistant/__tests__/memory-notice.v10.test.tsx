import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssistantMemoryNotice from '../AssistantMemoryNotice';
import type { AssistantPlanResponse } from '@/services/assistantApi';

type Result = Pick<AssistantPlanResponse, 'memory_results' | 'summary_status'>;
function display(result: Result) {
  return render(<MemoryRouter><AssistantMemoryNotice result={result}/></MemoryRouter>);
}
const base = { command_id: '10000000-0000-4000-8000-000000000001', operation: 'save' as const,
  memory_id: null, version: null, destination: 'memory' as const, policy_revision: 2, profile_version: null, reason: null };

test.each([
  ['saved', 'Souvenir enregistré.'],
  ['awaiting_confirmation', 'Proposition enregistrée : elle attend votre confirmation.'],
  ['disabled', 'Mémoire désactivée : aucun souvenir enregistré.'],
  ['not_saved', 'Ce souvenir n’a pas été enregistré.'],
  ['verification_required', 'L’enregistrement reste à vérifier. Une nouvelle tentative doit garder la même demande.'],
] as const)('the notice exposes %s without promising another status', (status, message) => {
  display({ memory_results: [{ ...base, status }] });
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Consulter et gérer la mémoire' })).toHaveAttribute('href', '/settings?section=assistant-memory');
});
test.each(['not_saved', 'revision_changed'] as const)('a %s summary is distinct from a saved memory', summary_status => {
  display({ summary_status, memory_results: [{ ...base, status: 'saved' }] });
  expect(screen.getByText('Souvenir enregistré.')).toBeInTheDocument();
  expect(screen.getByText(/Le résumé n’a pas été enregistré/)).toBeInTheDocument();
});
test('an ordinary exchange does not display an invented memory write', () => {
  const { container } = display({ memory_results: [], summary_status: 'not_needed' });
  expect(container).toBeEmptyDOMElement();
});
