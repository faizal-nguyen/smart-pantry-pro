import React from 'react';
import { render, screen } from '@testing-library/react';

import { RecipeSourceCard } from '../RecipeSourceCard';

describe('RecipeSourceCard (PRP-220.17)', () => {
  it('renders nothing for a manually-typed recipe', () => {
    const { container } = render(
      <RecipeSourceCard
        recipe={{ source_platform: 'manual', source_url: 'https://x', source_metadata: {} }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no source platform is set', () => {
    const { container } = render(<RecipeSourceCard recipe={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the platform header + author + source link for an Instagram recipe', () => {
    render(
      <RecipeSourceCard
        recipe={{
          source_platform: 'instagram',
          source_url: 'https://www.instagram.com/p/abc/',
          source_metadata: {
            authorName: 'Chef Jean',
            authorHandle: 'chefjean',
            authorUrl: 'https://www.instagram.com/chefjean',
            importedAt: '2026-05-06T10:00:00Z',
            confidence: 0.82,
          },
        }}
      />
    );
    expect(screen.getByText(/Importé depuis Instagram/i)).toBeInTheDocument();
    expect(screen.getByText('Chef Jean')).toBeInTheDocument();
    expect(screen.getByText(/@chefjean/)).toBeInTheDocument();
    expect(screen.getByText(/Importée le/i)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Voir la source originale/i });
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/p/abc/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') ?? '').toMatch(/noopener/);
    expect(link.getAttribute('rel') ?? '').toMatch(/nofollow/);
  });

  it('shows the low-confidence warning when confidence < 0.6', () => {
    render(
      <RecipeSourceCard
        recipe={{
          source_platform: 'web',
          source_url: 'https://example.com/recipe',
          source_metadata: { confidence: 0.42 },
        }}
      />
    );
    expect(screen.getByText(/confiance modérée/i)).toBeInTheDocument();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it('omits the warning when confidence is high', () => {
    render(
      <RecipeSourceCard
        recipe={{
          source_platform: 'web',
          source_url: 'https://example.com/recipe',
          source_metadata: { confidence: 0.92 },
        }}
      />
    );
    expect(screen.queryByText(/confiance modérée/i)).not.toBeInTheDocument();
  });

  it('still renders without a source URL (e.g. partial migration)', () => {
    render(
      <RecipeSourceCard
        recipe={{
          source_platform: 'youtube',
          source_metadata: { authorName: 'Cuisine Studio' },
        }}
      />
    );
    expect(screen.getByText(/Importé depuis YouTube/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Voir la source/i })).not.toBeInTheDocument();
  });
});
