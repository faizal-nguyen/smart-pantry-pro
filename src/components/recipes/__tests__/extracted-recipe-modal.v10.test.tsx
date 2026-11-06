import { fireEvent, render, screen } from '@testing-library/react';

import { ExtractedRecipeModal } from '../ExtractedRecipeModal';

const IMAGE = 'https://project.supabase.co/storage/v1/object/public/recipe-images/users/u/imports/i-0123456789abcdef.jpg';
const recipe = (thumbnail: string | { url: string }) => ({
  title: 'Bœuf fondant', description: '', ingredients: [{ name: 'Bœuf', amount: '1', unit: 'kg' }],
  instructions: [{ step: 1, description: 'Mijoter.' }],
  metadata: { confidence: 0.8, platform: 'instagram', extractionMethod: 'metadata', thumbnail },
});

test.each([
  ['a plain URL, as imports give it', IMAGE],
  ['an object with url, as older extractors give it', { url: IMAGE }],
])('saves the thumbnail given as %s', (_label, thumbnail) => {
  const onConfirm = jest.fn();
  render(<ExtractedRecipeModal open onOpenChange={jest.fn()} recipe={recipe(thumbnail)} onConfirm={onConfirm} onCancel={jest.fn()} />);
  expect(screen.getByAltText('Bœuf fondant')).toHaveAttribute('src', IMAGE);
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la recette' }));
  expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ image_url: IMAGE }));
});
