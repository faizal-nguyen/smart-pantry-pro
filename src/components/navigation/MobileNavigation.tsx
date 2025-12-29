/**
 * MobileNavigation - Navigation Mobile avec Mode Famille
 * Bottom navigation + interface adaptée enfants
 */

import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  LogOut, 
  Settings, 
  Menu,
  X,
  Shield,
  Users,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Hooks et utilitaires
import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import { useResponsiveZones } from '@/hooks/useResponsiveZones';
import { supabase } from '@/integrations/supabase/client';

// Types et configuration
import { FamilyProfile, NavigationSection } from '@/types/family-mode';
import { NavigationItem } from './NavigationHub';

// Composants UI
import { MaterialButton } from '@/components/ui/material/Button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileNavigationProps {
  navigationConfig: {
    mainNavigation: NavigationItem[];
    specialNavigation: NavigationItem[];
    allNavigation: NavigationItem[];
    adaptiveInterface?: any;
  };
  currentProfile: FamilyProfile | null;
  onNavigate: (section: NavigationSection, path?: string, options?: any) => void;
}

interface MobileNavItemProps {
  item: NavigationItem;
  isActive: boolean;
  isChildMode: boolean;
  iconSize: string;
  onClick: () => void;
  showBadge?: boolean;
}

/**
 * Élément de navigation mobile
 */
const MobileNavItem: React.FC<MobileNavItemProps> = ({
  item,
  isActive,
  isChildMode,
  iconSize,
  onClick,
  showBadge = true
}) => {
  const IconComponent = item.icon;
  
  return (
    <MaterialButton
      variant={isActive ? 'tonal' : 'text'}
      size="sm"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 h-full min-h-[56px] rounded-lg transition-all touch-zone-minimum relative",
        isChildMode && "min-h-[64px] gap-2",
        isActive && "shadow-sm"
      )}
    >
      <div className="relative">
        <IconComponent 
          className={cn(
            "transition-colors",
            isActive ? "text-primary" : "text-muted-foreground"
          )} 
          style={{ width: iconSize, height: iconSize }}
        />
        
        {/* Badge pour notifications */}
        {showBadge && item.badge && (
          <div className={cn(
            "absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs font-bold min-w-[16px] h-4 flex items-center justify-center px-1",
            isChildMode && "min-w-[18px] h-5 text-sm"
          )}>
            {typeof item.badge === 'string' && item.badge.length > 2 ? '!' : item.badge}
          </div>
        )}
        
        {/* Indicateur "Nouveau" pour enfants */}
        {isChildMode && item.isNew && (
          <div className="absolute -top-2 -right-2 bg-green-500 w-3 h-3 rounded-full animate-pulse" />
        )}
      </div>
      
      <span className={cn(
        "text-xs font-medium text-center leading-tight max-w-[60px] truncate",
        isChildMode && "text-sm max-w-[80px]",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        {item.label}
      </span>
    </MaterialButton>
  );
};

/**
 * Menu drawer pour navigation étendue
 */
interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
  currentProfile: FamilyProfile | null;
  onNavigate: (section: NavigationSection, path?: string) => void;
  navigate: (path: string) => void;
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  navigationItems,
  currentProfile,
  onNavigate,
  navigate
}) => {
  const location = useLocation();
  const { adaptiveInterface, isChildMode } = useAgeAdaptiveUI();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erreur de déconnexion:", error.message);
      }
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigation = (item: NavigationItem) => {
    navigate(item.path);
    onClose();
  };

  const handleSubNavigation = (item: NavigationItem, subItem: any) => {
    navigate(subItem.path);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className={cn(
          "w-[280px] sm:w-[320px] p-0",
          isChildMode && "w-[320px] sm:w-[360px]"
        )}
      >
        <SheetHeader className={cn(
          "p-6 pb-4 border-b",
          isChildMode && "p-8 pb-6"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center",
              isChildMode && "w-10 h-10"
            )}>
              <Home className={cn(
                "w-4 h-4 text-primary",
                isChildMode && "w-5 h-5"
              )} />
            </div>
            <div>
              <SheetTitle className={cn(
                "text-left",
                isChildMode && "text-lg"
              )}>
                Smart Pantry Pro
              </SheetTitle>
              {currentProfile && (
                <p className={cn(
                  "text-sm text-muted-foreground",
                  isChildMode && "text-base"
                )}>
                  {isChildMode ? `Salut ${currentProfile.name}! 👋` : `Connecté en tant que ${currentProfile.name}`}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const IconComponent = item.icon;
              
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => handleNavigation(item)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                      "hover:bg-primary/5 hover:text-primary",
                      isActive && "bg-primary/10 text-primary",
                      isChildMode && "p-4 gap-4"
                    )}
                  >
                    <div className="relative">
                      <IconComponent className={cn(
                        "w-5 h-5",
                        isChildMode && "w-6 h-6"
                      )} />
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-2 h-2" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium",
                        isChildMode && "text-lg"
                      )}>
                        {item.label}
                      </p>
                      {!adaptiveInterface.simplifiedNavigation && (
                        <p className={cn(
                          "text-xs text-muted-foreground",
                          isChildMode && "text-sm"
                        )}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    
                    {item.subItems && item.subItems.length > 0 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Sous-éléments pour la section active */}
                  {isActive && item.subItems && (
                    <div className={cn(
                      "ml-6 space-y-1",
                      isChildMode && "ml-8"
                    )}>
                      {item.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => handleSubNavigation(item, subItem)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-all",
                            "hover:bg-primary/5 hover:text-primary",
                            location.pathname === subItem.path && "bg-primary/10 text-primary",
                            isChildMode && "p-3 text-base"
                          )}
                        >
                          {subItem.icon && <subItem.icon className="w-4 h-4" />}
                          <span>{subItem.label}</span>
                          {subItem.isNew && (
                            <span className={cn(
                              "text-xs bg-green-500 text-white px-2 py-0.5 rounded-full",
                              isChildMode && "text-sm px-3 py-1"
                            )}>
                              Nouveau
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section Paramètres et Déconnexion */}
          <div className={cn(
            "mt-8 pt-6 border-t space-y-2",
            isChildMode && "mt-12 pt-8"
          )}>
            {/* Paramètres (seulement pour parents) */}
            {currentProfile?.type === 'parent' && (
              <button
                onClick={() => {
                  navigate('/settings');
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                  "hover:bg-primary/5 hover:text-primary",
                  isChildMode && "p-4 gap-4"
                )}
              >
                <Settings className={cn(
                  "w-5 h-5",
                  isChildMode && "w-6 h-6"
                )} />
                <span className={cn(
                  "font-medium",
                  isChildMode && "text-lg"
                )}>
                  Paramètres
                </span>
              </button>
            )}

            {/* Mode supervision pour enfants */}
            {currentProfile?.type === 'child' && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200",
                isChildMode && "p-4 gap-4"
              )}>
                <Shield className={cn(
                  "w-5 h-5 text-amber-600",
                  isChildMode && "w-6 h-6"
                )} />
                <span className={cn(
                  "text-sm text-amber-700 font-medium",
                  isChildMode && "text-base"
                )}>
                  Mode supervision activé
                </span>
              </div>
            )}

            {/* Déconnexion */}
            <button
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                "hover:bg-red-50 hover:text-red-600 text-muted-foreground",
                isChildMode && "p-4 gap-4"
              )}
            >
              <LogOut className={cn(
                "w-5 h-5",
                isChildMode && "w-6 h-6"
              )} />
              <span className={cn(
                "font-medium",
                isChildMode && "text-lg"
              )}>
                {isChildMode ? "Au revoir!" : "Déconnexion"}
              </span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/**
 * Composant Principal MobileNavigation
 */
const MobileNavigation: React.FC<MobileNavigationProps> = ({
  navigationConfig,
  currentProfile,
  onNavigate
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { zones } = useResponsiveZones();
  const { adaptiveInterface, getIconSize, isChildMode } = useAgeAdaptiveUI();

  // Sélectionner les éléments principaux pour la bottom nav
  const bottomNavItems = useMemo(() => {
    const mainItems = navigationConfig.mainNavigation.slice(0, 4);
    
    // Ajouter un élément "Plus" si il y a plus de 4 éléments
    if (navigationConfig.mainNavigation.length > 4) {
      return [
        ...mainItems,
        {
          id: 'more',
          label: 'Plus',
          icon: Menu,
          path: '/more',
          section: 'pantry' as NavigationSection,
          description: 'Plus d\'options',
          isMainSection: false,
          minAge: 3,
          requiresSupervision: false,
          availableInChildMode: true
        }
      ];
    }
    
    return mainItems;
  }, [navigationConfig.mainNavigation]);

  const handleNavItemClick = (item: NavigationItem) => {
    if (item.id === 'more') {
      setIsDrawerOpen(true);
    } else {
      navigate(item.path);
    }
  };

  const iconSize = getIconSize();

  return (
    <>
      {/* Header Mobile (optionnel pour mode enfant) */}
      {isChildMode && (
        <header className="bg-card/90 backdrop-blur-sm border-b safe-area-inset-top">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary">
                  Smart Pantry Pro
                </h1>
                {currentProfile && (
                  <p className="text-sm text-muted-foreground">
                    Salut {currentProfile.name}! 👋
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Bottom Navigation */}
      <nav
        aria-label="Navigation principale"
        role="navigation"
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t shadow-lg safe-area-inset-bottom z-40",
          isChildMode && "bg-card/95 border-t-2 border-primary/20"
        )}
        style={{ height: zones.navigation.height }}
      >        
        <div className={cn(
          "h-full grid gap-1 px-2 py-1",
          `grid-cols-${bottomNavItems.length}`,
          isChildMode && "gap-2 px-3 py-2"
        )}>
          {bottomNavItems.map((item) => {
            const isActive = item.id === 'more' ? false : location.pathname.startsWith(item.path);
            
            return (
              <MobileNavItem
                key={item.id}
                item={item}
                isActive={isActive}
                isChildMode={isChildMode}
                iconSize={iconSize}
                onClick={() => handleNavItemClick(item)}
                showBadge={item.id !== 'more'}
              />
            );
          })}
        </div>
      </nav>

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        navigationItems={[...navigationConfig.mainNavigation, ...navigationConfig.specialNavigation]}
        currentProfile={currentProfile}
        onNavigate={onNavigate}
        navigate={navigate}
      />
    </>
  );
};

export default MobileNavigation;