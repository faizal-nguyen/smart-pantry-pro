/**
 * LegacyRedirect - Gestionnaire de redirections pour compatibilité backward
 * Assure la continuité avec les anciennes URLs
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLegacyRedirections } from './NavigationHub';

/**
 * Composant de redirection automatique pour les anciennes URLs
 */
export const LegacyRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  useEffect(() => {
    const legacyRoutes = getLegacyRedirections();
    const currentPath = location.pathname;
    
    // Vérifier si l'URL actuelle est une ancienne route
    if (legacyRoutes[currentPath]) {
      const newPath = legacyRoutes[currentPath];
      setIsRedirecting(true);
      
      // Petit délai pour éviter les clignotements
      setTimeout(() => {
        // Redirection avec remplacement pour éviter l'historique
        navigate(newPath, { replace: true });
      }, 100);
    }
    
    // Rediriger les routes racines vers leurs nouvelles sections
    else if (currentPath === '/' || currentPath === '') {
      // Redirection vers insights par défaut (comme avant)
      navigate('/insights', { replace: true });
    }
    
    // Gestion des routes partielles 
    else {
      const pathSegments = currentPath.split('/');
      const baseRoute = '/' + pathSegments[1]; // ex: '/kitchen' depuis '/kitchen/something'
      
      if (legacyRoutes[baseRoute] && pathSegments.length === 2) {
        const newPath = legacyRoutes[baseRoute];
        setIsRedirecting(true);
        setTimeout(() => {
          navigate(newPath, { replace: true });
        }, 100);
      }
    }
  }, [location.pathname, navigate]);

  // Afficher un indicateur de redirection si nécessaire
  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Hook pour obtenir l'URL moderne équivalente
 */
export const useModernRoute = (legacyPath?: string): string => {
  const location = useLocation();
  const path = legacyPath || location.pathname;
  const legacyRoutes = getLegacyRedirections();
  
  return legacyRoutes[path] || path;
};

export default LegacyRedirect;