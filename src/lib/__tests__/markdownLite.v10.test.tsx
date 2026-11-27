import { render, screen, within } from '@testing-library/react';
import { MarkdownLite } from '@/lib/markdownLite';

function show(source: string) {
  return render(<MarkdownLite source={source} />).container;
}

test('headings keep their level and get an anchor from their text', () => {
  show('# Politique de confidentialité\n\n## 2. Données traitées\n\n### 2.1 Votre compte');
  expect(screen.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: '2. Données traitées' })).toHaveAttribute('id', '2-donnees-traitees');
  expect(screen.getByRole('heading', { level: 3, name: '2.1 Votre compte' })).toHaveAttribute('id', '2-1-votre-compte');
});

test('consecutive lines form one paragraph; a blank line starts another', () => {
  const container = show('Première ligne\nqui continue.\n\nSecond paragraphe.');
  const paragraphs = container.querySelectorAll('p');
  expect([...paragraphs].map(p => p.textContent)).toEqual(['Première ligne qui continue.', 'Second paragraphe.']);
});

test('a list keeps its items, an indented line continuing the item above', () => {
  show('- Stock\n- Recettes, avec\n  leurs ingrédients\n- Courses');
  const items = within(screen.getByRole('list')).getAllByRole('listitem');
  expect(items.map(item => item.textContent)).toEqual(['Stock', 'Recettes, avec leurs ingrédients', 'Courses']);
});

test('a table keeps its header and rows, in a scrolling region named by its heading and reachable by keyboard', () => {
  show('## 5. Durées\n\n| Donnée | Durée |\n| --- | --- |\n| Historique | 30 jours |\n| Stock | Jusqu’à la suppression |');
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Donnée', 'Durée']);
  expect(screen.getAllByRole('row').slice(1).map(row => row.textContent)).toEqual(['Historique30 jours', 'StockJusqu’à la suppression']);
  const region = screen.getByRole('region', { name: '5. Durées' });
  expect(region).toHaveAttribute('tabindex', '0');
  expect(region).toHaveClass('overflow-x-auto');
});

test('a heading or a table right after a list is not swallowed by its last item', () => {
  show('- un\n- deux\n## Suite\n- trois\n| A |\n| --- |\n| b |');
  expect(screen.getByRole('heading', { level: 2, name: 'Suite' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['un', 'deux', 'trois']);
  expect(screen.getByRole('table')).toBeInTheDocument();
});

test('bold, italic and code are rendered; https, mailto and internal links are links', () => {
  show('Un **mot fort**, un *mot penché*, du `code`, [la CNIL](https://www.cnil.fr), [écrire](mailto:contact@example.test) et [vos réglages](/settings?section=data-privacy).');
  expect(screen.getByText('mot fort').tagName).toBe('STRONG');
  expect(screen.getByText('mot penché').tagName).toBe('EM');
  expect(screen.getByText('code').tagName).toBe('CODE');
  const cnil = screen.getByRole('link', { name: 'la CNIL (nouvel onglet)' });
  expect(cnil).toHaveAttribute('href', 'https://www.cnil.fr');
  expect(cnil).toHaveAttribute('rel', 'noopener noreferrer');
  expect(cnil).toHaveAttribute('target', '_blank');
  expect(screen.getByRole('link', { name: 'écrire' })).toHaveAttribute('href', 'mailto:contact@example.test');
  expect(screen.getByRole('link', { name: 'vos réglages' })).toHaveAttribute('href', '/settings?section=data-privacy');
});

test('a link to anything else is shown as its text, never as a link', () => {
  show('[cliquer](javascript:alert(1)) [image](data:text/html,x) [ailleurs](http://example.test) [protocole](//example.test) [oblique](/\\example.test)');
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  expect(screen.getByText(/cliquer/)).toBeInTheDocument();
});

test('HTML in the source stays text: nothing is interpreted', () => {
  const container = show('Avant <img src=x onerror="alert(1)"> après\n\n<script>alert(1)</script>');
  expect(container.querySelector('img, script')).toBeNull();
  expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
});
