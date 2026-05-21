/**
 * PRP-238 PR2 — Layout protege monte au niveau router.
 *
 * Avant : chaque page wrappait son contenu dans <AppNavigation
 * user={user}> apres avoir appele `supabase.auth.getSession()`
 * localement. Resultat : remount AppNavigation a chaque navigation,
 * getSession() N fois (1 par page), shells dupliques.
 *
 * Maintenant : ce layout est rendu UNE FOIS par React Router pour
 * toutes les routes authentifiees. Il :
 *   - lit user depuis AuthSessionContext (1 appel auth total),
 *   - redirige vers /auth si pas connecte,
 *   - rend <AppNavigation user={user}> qui wrappe <Outlet>.
 *
 * Les pages enfants se contentent de leur contenu, plus de wrapping
 * ni de getSession local.
 *
 * Note : on PASSE `user` en prop a AppNavigation (decision V3.3
 * section 3.2) plutot que de faire AppNavigation consommer le
 * context. Garde la signature actuelle de AppNavigation et evite
 * un re-render plus large.
 */
import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import { AuthSessionContext } from '@/contexts/AuthSessionContext';

export function AuthenticatedLayout() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error(
      'AuthenticatedLayout requires <AuthSessionProvider> upstream (cf. App.tsx).',
    );
  }

  if (ctx.isLoading) {
    return <PageLoader />;
  }

  if (!ctx.user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppNavigation user={ctx.user}>
      <Outlet />
    </AppNavigation>
  );
}

export default AuthenticatedLayout;
