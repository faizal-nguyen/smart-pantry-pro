import { createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { LEGACY_ROUTES } from '@/lib/legacyRoutes';
import LegacyRedirect from './LegacyRedirect';

/** V11-06 E4b (R8): the router's alias routes, from the same table as the post-sign-in return. */
export function legacyRedirectRoutes(): RouteObject[] {
  return Object.entries(LEGACY_ROUTES).map(([path, to]) => ({ path, element: createElement(LegacyRedirect, { to }) }));
}
