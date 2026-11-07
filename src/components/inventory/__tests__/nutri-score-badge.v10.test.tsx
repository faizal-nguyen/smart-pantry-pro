import { render, screen } from '@testing-library/react';
import NutriScoreBadge from '../NutriScoreBadge';

test('shows the Nutri-Score letter of a product, named for screen readers', () => {
  render(<NutriScoreBadge grade="e" />);
  expect(screen.getByText('Nutri-Score', { exact: false }).closest('span[title]')).toHaveAttribute('title', 'Nutri-Score E');
  expect(screen.getByTitle('Nutri-Score E')).toHaveTextContent('Nutri-Score E');
});

test('shows nothing when Open Food Facts gave no grade', () => {
  const { container } = render(<><NutriScoreBadge grade={undefined} /><NutriScoreBadge grade="unknown" /></>);
  expect(container).toBeEmptyDOMElement();
});
