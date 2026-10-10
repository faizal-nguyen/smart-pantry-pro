import { fireEvent, render, screen } from '@testing-library/react';
import RecipePreview from '../RecipePreview';

test('a broken URL is replaced once; a new URL resets loading without reusing the failed state', () => {
  const { rerender } = render(<RecipePreview imageUrl=" /expired.jpg " title="Riz" priority />);
  const failed = screen.getByRole('img');
  expect(failed).toHaveAttribute('src', '/expired.jpg');
  fireEvent.error(failed);
  expect(screen.getByRole('img')).toHaveAccessibleName('Aperçu indisponible pour Riz');
  expect(failed).not.toBeInTheDocument();
  rerender(<RecipePreview imageUrl="/renewed.jpg" title="Riz" />);
  const renewed = screen.getByRole('img', { name: 'Riz' });
  fireEvent.load(renewed);
  expect(renewed).toHaveAttribute('src', '/renewed.jpg');
  expect(renewed).not.toHaveClass('opacity-0');
});
test('absent media stays honest and does not issue an image request', () => {
  const { container } = render(<RecipePreview imageUrl="  " title="Soupe" />);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByText('Photo indisponible')).toBeVisible();
});
