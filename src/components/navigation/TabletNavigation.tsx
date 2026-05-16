/**
 * TabletNavigation - Navigation Tablette hybride.
 *
 * Sidebar rétractable + bottom bar. Branches `isChildMode` toujours
 * fausses en V1 — dead code à retirer sous PRP-234.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import { FamilyProfile, NavigationSection } from '@/types/family-mode';
import { NavigationItem } from './NavigationHub';

interface TabletNavigationProps {
  navigationConfig: {
    mainNavigation: NavigationItem[];
    specialNavigation: NavigationItem[];
  };
  currentProfile: FamilyProfile | null;
  onNavigate: (section: NavigationSection, path?: string, options?: any) => void;
}

const TabletNavigation: React.FC<TabletNavigationProps> = ({
  navigationConfig,
  currentProfile,
  onNavigate
}) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { adaptiveInterface, getIconSize, isChildMode } = useAgeAdaptiveUI();

  const handleNavigation = (item: NavigationItem) => {
    navigate(item.path);
    setIsSidebarExpanded(false);
  };

  const iconSize = getIconSize();

  return (
    <>
      {/* Sidebar Compacte */}
      <div className={cn(
        "fixed left-0 top-0 bottom-0 w-16 bg-card border-r z-30 flex flex-col",
        isChildMode && "w-20"
      )}>
        <div className="flex flex-col items-center p-2 space-y-2">
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className={cn(
              "w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors",
              isChildMode && "w-14 h-14"
            )}
          >
            <Menu className="w-5 h-5 text-primary" />
          </button>

          {/* Navigation principale compacte */}
          {navigationConfig.mainNavigation.slice(0, 4).map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center transition-all relative group",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-primary/10 text-muted-foreground hover:text-primary",
                  isChildMode && "w-14 h-14"
                )}
              >
                <IconComponent style={{ width: iconSize, height: iconSize }} />
                
                {item.badge && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3" />
                )}
                
                {/* Tooltip */}
                <div className={cn(
                  "absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground rounded-lg text-sm font-medium",
                  "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50",
                  isChildMode && "text-base px-4 py-3"
                )}>
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Étendue */}
      {isSidebarExpanded && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsSidebarExpanded(false)}
          />
          
          <div className={cn(
            "fixed left-16 top-0 bottom-0 w-64 bg-card border-r shadow-lg z-50 overflow-auto",
            isChildMode && "left-20 w-80"
          )}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className={cn(
                  "font-semibold text-lg",
                  isChildMode && "text-xl"
                )}>
                  Navigation
                </h2>
                <button
                  onClick={() => setIsSidebarExpanded(false)}
                  className="p-2 hover:bg-primary/10 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-1">
                {[...navigationConfig.mainNavigation, ...navigationConfig.specialNavigation].map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  const IconComponent = item.icon;
                  
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => handleNavigation(item)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-primary/5 hover:text-primary",
                          isChildMode && "p-4 gap-4"
                        )}
                      >
                        <IconComponent className={cn(
                          "flex-shrink-0",
                          isChildMode && "w-6 h-6"
                        )} style={{ width: iconSize, height: iconSize }} />
                        
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
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      
                      {/* Sous-éléments */}
                      {isActive && item.subItems && (
                        <div className={cn(
                          "ml-6 mt-1 space-y-1",
                          isChildMode && "ml-8"
                        )}>
                          {item.subItems.map((subItem) => (
                            <button
                              key={subItem.id}
                              onClick={() => navigate(subItem.path)}
                              className={cn(
                                "w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-all",
                                location.pathname === subItem.path 
                                  ? "bg-primary/20 text-primary" 
                                  : "hover:bg-primary/5",
                                isChildMode && "p-3 text-base"
                              )}
                            >
                              {subItem.icon && <subItem.icon className="w-4 h-4" />}
                              <span>{subItem.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Bar pour éléments secondaires */}
      <div className={cn(
        "fixed bottom-0 left-16 right-0 h-16 bg-card/90 backdrop-blur-sm border-t z-30",
        isChildMode && "left-20 h-20"
      )}>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-4">
            {navigationConfig.specialNavigation.slice(0, 3).map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={cn(
                    "p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors",
                    isChildMode && "p-3"
                  )}
                >
                  <IconComponent style={{ width: iconSize, height: iconSize }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default TabletNavigation;