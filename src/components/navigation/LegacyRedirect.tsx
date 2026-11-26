import { Navigate, useLocation } from 'react-router-dom';
import { withLegacyTarget } from '@/lib/legacyRoutes';

/** One replace to the canonical screen, keeping the visitor's query and anchor (V11-06 E4b, R8). */
export default function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={withLegacyTarget(to, search, hash)} replace />;
}
