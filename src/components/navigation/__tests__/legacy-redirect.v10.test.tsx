import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType, useRoutes } from 'react-router-dom';
import { legacyRedirectRoutes } from '../legacyRedirectRoutes';

const addressOf = ({ pathname, search, hash }: { pathname: string; search: string; hash: string }) => `${pathname}${search}${hash}`;

/** Stands for the canonical screens: where we are, and how we got here. */
function Here() {
  const location = useLocation(), type = useNavigationType();
  return <output data-testid="here" data-type={type}>{addressOf(location)}</output>;
}

/** Records every address the router goes through, intermediate redirects included. */
function Trail({ into }: { into: string[] }) {
  const location = useLocation();
  useEffect(() => { into.push(addressOf(location)); }, [location, into]);
  return null;
}

/** The alias routes as App mounts them, then a catch-all for the canonical screens. */
function Routes() {
  return useRoutes([...legacyRedirectRoutes(), { path: '*', element: <Here /> }]);
}

function visit(address: string) {
  const trail: string[] = [];
  render(<MemoryRouter initialEntries={['/avant', address]} initialIndex={1}><Trail into={trail} /><Routes /></MemoryRouter>);
  return trail;
}

test('an alias reaches its canonical screen in one replace, keeping query and anchor', async () => {
  const trail = visit('/ai-assistant?x=1#h');
  const here = await screen.findByTestId('here');
  expect(here).toHaveTextContent('/assistant?x=1#h');
  expect(here).toHaveAttribute('data-type', 'REPLACE');
  // One hop: no stop at the former /assistant/chat.
  expect(trail).toEqual(['/ai-assistant?x=1#h', '/assistant?x=1#h']);
});

test.each([
  ['/insights/waste', '/insights#pertes'],
  ['/kitchen-favorites?sort=a', '/kitchen/recipes?sort=a&tab=library&filter=favorites'],
  ['/settings/appearance', '/settings?section=appearance'],
  ['/games/quiz?niveau=2', '/kitchen/recipes?niveau=2'],
  ['/games', '/kitchen/recipes'],
])('%s lands on %s', async (address, expected) => {
  const trail = visit(address);
  expect(await screen.findByTestId('here')).toHaveTextContent(expected);
  expect(trail).toEqual([address, expected]);
});
