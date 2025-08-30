/**
 * DesktopNavigation - Navigation Desktop avec Mode Famille
 * Sidebar persistante avec hiérarchie complète
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings, LogOut, ChevronDown, ChevronRight, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import { supabase } from '@/integrations/supabase/client';
import { FamilyProfile, NavigationSection } from '@/types/family-mode';
import { NavigationItem } from './NavigationHub';

interface DesktopNavigationProps {
  navigationConfig: {
    mainNavigation: NavigationItem[];
    specialNavigation: NavigationItem[];
  };
  currentProfile: FamilyProfile | null;
  onNavigate: (section: NavigationSection, path?: string, options?: any) => void;
}

const DesktopNavigation: React.FC<DesktopNavigationProps> = ({
  navigationConfig,
  currentProfile,
  onNavigate
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { adaptiveInterface, getIconSize, isChildMode } = useAgeAdaptiveUI();

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleNavigation = (item: NavigationItem) => {
    navigate(item.path);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erreur de déconnexion:", error.message);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const iconSize = getIconSize();
  const sidebarWidth = isCollapsed ? (isChildMode ? '80px' : '64px') : (isChildMode ? '320px' : '256px');

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 bottom-0 bg-card border-r transition-all duration-300 z-30 flex flex-col",
        isCollapsed ? "w-16" : "w-64",
        isChildMode && !isCollapsed && "w-80",
        isChildMode && isCollapsed && "w-20"
      )}
      style={{ width: sidebarWidth }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b",
        isChildMode && "p-6",
        isCollapsed && "justify-center"
      )}>
        {!isCollapsed && (
          <>
            <div className={cn(
              "w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0",
              isChildMode && "w-10 h-10"
            )}>
              <Home className={cn(
                "w-4 h-4 text-primary",
                isChildMode && "w-5 h-5"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className={cn(
                "font-bold text-primary truncate",
                isChildMode ? "text-xl" : "text-lg"
              )}>
                Smart Pantry Pro
              </h1>
              {currentProfile && (
                <p className={cn(
                  "text-sm text-muted-foreground truncate",
                  isChildMode && "text-base"
                )}>
                  {isChildMode ? `Salut ${currentProfile.name}! 👋` : currentProfile.name}
                </p>
              )}
            </div>
          </>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-2 hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0",
            isCollapsed && "w-12 h-12 flex items-center justify-center"
          )}
        >
          <ChevronRight 
            className={cn(
              "w-4 h-4 transition-transform",
              !isCollapsed && "rotate-180"
            )} 
          />
        </button>
      </div>

      {/* Navigation principale */}
      <div className="flex-1 overflow-auto p-2">
        {/* Section principale */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <h3 className={cn(
                "text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                isChildMode && "text-sm"
              )}>
                {isChildMode ? "Mes Sections" : "Navigation"}
              </h3>
            </div>
          )}
          
          {navigationConfig.mainNavigation.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const IconComponent = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedSections.includes(item.id);
            
            return (
              <div key={item.id}>
                {/* Élément principal */}
                <div className="flex items-center">
                  <button
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all flex-1 text-left group relative",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-primary/5 hover:text-primary text-muted-foreground",
                      isCollapsed && "justify-center p-4",
                      isChildMode && !isCollapsed && "p-4 gap-4"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <IconComponent 
                        style={{ width: iconSize, height: iconSize }}
                        className="transition-colors"
                      />
                      
                      {item.badge && (
                        <div className={cn(
                          "absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs font-bold min-w-[16px] h-4 flex items-center justify-center px-1",
                          isChildMode && "min-w-[18px] h-5"
                        )}>
                          {typeof item.badge === 'string' && item.badge.length > 2 ? '!' : item.badge}
                        </div>
                      )}
                    </div>
                    
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium truncate",
                          isChildMode && "text-lg"
                        )}>
                          {item.label}
                        </p>
                        {!adaptiveInterface.simplifiedNavigation && (
                          <p className={cn(
                            "text-xs text-muted-foreground/70 truncate",
                            isChildMode && "text-sm"
                          )}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Tooltip pour mode collapsed */}
                    {isCollapsed && (
                      <div className={cn(
                        "absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-sm font-medium",
                        "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50",
                        isChildMode && "text-base px-4 py-3"
                      )}>
                        {item.label}
                      </div>
                    )}
                  </button>
                  
                  {/* Bouton d'expansion */}
                  {!isCollapsed && hasSubItems && (
                    <button
                      onClick={() => toggleSection(item.id)}
                      className={cn(
                        "p-2 hover:bg-primary/10 rounded-lg transition-colors ml-1",
                        isActive && "text-primary-foreground"
                      )}
                    >
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 transition-transform",
                          !isExpanded && "-rotate-90"
                        )} 
                      />
                    </button>
                  )}
                </div>
                
                {/* Sous-éléments */}
                {!isCollapsed && hasSubItems && isExpanded && (
                  <div className={cn(
                    "ml-6 mt-1 space-y-1 border-l border-border/30 pl-4",
                    isChildMode && "ml-8 pl-6"
                  )}>
                    {item.subItems?.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => navigate(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-all group",
                          location.pathname === subItem.path 
                            ? "bg-primary/20 text-primary font-medium" 
                            : "hover:bg-primary/5 hover:text-primary text-muted-foreground",
                          isChildMode && "p-3 text-base gap-4"
                        )}
                      >
                        {subItem.icon && (
                          <subItem.icon className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isChildMode && "w-5 h-5"
                          )} />
                        )}
                        
                        <span className="flex-1 truncate">{subItem.label}</span>
                        
                        {subItem.isNew && (
                          <span className={cn(
                            "text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex-shrink-0",
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

        {/* Séparateur */}
        {!isCollapsed && navigationConfig.specialNavigation.length > 0 && (
          <div className="border-t border-border/30 my-4" />
        )}

        {/* Navigation spéciale */}
        {navigationConfig.specialNavigation.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <h3 className={cn(
                  "text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                  isChildMode && "text-sm"
                )}>
                  {isChildMode ? "Autres" : "Outils"}
                </h3>
              </div>
            )}
            
            {navigationConfig.specialNavigation.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const IconComponent = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group relative",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-primary/5 hover:text-primary text-muted-foreground",
                    isCollapsed && "justify-center p-4",
                    isChildMode && !isCollapsed && "p-4 gap-4"
                  )}
                >
                  <IconComponent 
                    style={{ width: iconSize, height: iconSize }}
                    className="flex-shrink-0"
                  />
                  
                  {!isCollapsed && (
                    <span className={cn(
                      "font-medium truncate",
                      isChildMode && "text-lg"
                    )}>
                      {item.label}
                    </span>
                  )}

                  {isCollapsed && (
                    <div className={cn(
                      "absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-sm font-medium",
                      "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
                    )}>
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        "border-t p-2 space-y-1",
        isChildMode && "p-4 space-y-2"
      )}>
        {/* Mode supervision pour enfants */}
        {currentProfile?.type === 'child' && !isCollapsed && (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 mb-2",
            isChildMode && "p-3 gap-3"
          )}>
            <Shield className={cn(
              "w-4 h-4 text-amber-600 flex-shrink-0",
              isChildMode && "w-5 h-5"
            )} />
            <span className={cn(
              "text-sm text-amber-700 font-medium truncate",
              isChildMode && "text-base"
            )}>
              Mode supervision
            </span>
          </div>
        )}

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group relative",
            "hover:bg-red-50 hover:text-red-600 text-muted-foreground",
            isCollapsed && "justify-center p-4",
            isChildMode && !isCollapsed && "p-4 gap-4"
          )}
        >
          <LogOut 
            style={{ width: iconSize, height: iconSize }}
            className="flex-shrink-0"
          />
          
          {!isCollapsed && (
            <span className={cn(
              "font-medium",
              isChildMode && "text-lg"
            )}>
              {isChildMode ? "Au revoir!" : "Déconnexion"}
            </span>
          )}

          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {isChildMode ? "Au revoir!" : "Déconnexion"}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default DesktopNavigation;