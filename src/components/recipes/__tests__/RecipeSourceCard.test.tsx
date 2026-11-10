import { render, screen } from '@testing-library/react';

import { RecipeSourceCard } from '../RecipeSourceCard';

describe('RecipeSourceCard (PRP-220.17)', () => {
  it('renders nothing for a manually-typed recipe', () => {
    const { container } = render(
      <RecipeSourceCard
        recipe={{ source_platform: 'manual', source_url: null, source_metadata: {} }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('keeps the explicit source of a manually reviewed legacy recipe without trusting lookalike domains', () => {
    render(<RecipeSourceCard recipe={{ source_platform: 'manual', source_url: 'https://instagram.com.evil.example/recipe' }} />);
    expect(screen.getByText('Importé depuis le web')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voir la source originale/ })).toHaveAttribute('href', 'https://instagram.com.evil.example/recipe');
  });

  it('does not render unsafe source or author links', () => {
    render(<RecipeSourceCard recipe={{ source_platform: 'web', source_url: 'javascript:alert(1)',
      source_metadata: { authorName: 'Auteur', authorUrl: 'https://user:password@example.org/' } }} />);
    expect(screen.getByText('Auteur')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
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

test('house recipes show multiple deduplicated references and photo attribution without claiming an exact import',()=>{
 render(<RecipeSourceCard recipe={{source_platform:'manual',source_metadata:{sources:[
  {url:'https://example.com/recipe',title:'Le plat de référence',kind:'recipe',publisher:'Cuisine'},
  {url:'https://www.youtube.com/watch?v=example',title:'La technique en vidéo',kind:'video'},
  {url:'https://example.com/recipe',title:'Doublon',kind:'recipe'},
  {url:'javascript:alert(1)',title:'Lien dangereux',kind:'recipe'},
 ],photo:{image_url:'https://example.com/photo.jpg',source_url:'https://example.com/recipe',publisher:'Cuisine',author:'Chef Exemple',note:'Variante de présentation.'}}}}/>);
 expect(screen.getByText('Sources et inspirations')).toBeVisible();
 expect(screen.getByRole('link',{name:'Le plat de référence'})).toHaveAttribute('href','https://example.com/recipe');
 expect(screen.getByRole('link',{name:'La technique en vidéo'})).toHaveAttribute('rel','noopener noreferrer nofollow');
 expect(screen.queryByText('Doublon')).not.toBeInTheDocument();
 expect(screen.queryByText('Lien dangereux')).not.toBeInTheDocument();
 expect(screen.getByText(/Chef Exemple/)).toBeVisible();
 expect(screen.getByText('Variante de présentation.')).toBeVisible();
});
