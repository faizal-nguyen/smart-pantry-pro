/**
 * PRP-235 PR1 — SettingsShell.
 *
 * Layout responsive de la page Settings :
 *   - mobile : tabs horizontaux scrollables, sticky top
 *   - desktop ≥ md : sidebar verticale gauche, contenu droite
 *
 * Orchestrateur pur — délègue chaque section à son composant dédié.
 * URL state via `useSettingsSection` (`?section=...`).
 */
import React from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Bell,
  Brain,
  ChefHat,
  Heart,
  Palette,
  Shield,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  SETTINGS_SECTIONS,
  useSettingsSection,
  type SettingsSection,
} from '@/hooks/useSettingsSection';

import AccountSection from './AccountSection';
import AppearanceSection from './AppearanceSection';
import AssistantMemorySection from './AssistantMemorySection';
import CookingPreferencesStub from './CookingPreferencesStub';
import DataPrivacySection from './DataPrivacySection';
import NotificationsSection from './NotificationsSection';
import NutritionWellbeingStub from './NutritionWellbeingStub';

interface SectionMeta {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
}

const SECTIONS_META: SectionMeta[] = [
  { id: 'account', label: 'Compte', icon: UserIcon },
  { id: 'assistant-memory', label: 'Assistant & mémoire', icon: Brain },
  { id: 'cooking', label: 'Préférences cuisine', icon: ChefHat },
  { id: 'nutrition', label: 'Nutrition bien-être', icon: Heart },
  { id: 'data-privacy', label: 'Mes données', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Apparence', icon: Palette },
];

interface SettingsShellProps {
  user: User;
}

export default function SettingsShell({ user }: SettingsShellProps) {
  const { section, setSection } = useSettingsSection();

  // Sanity check : si jamais on ajoute une section dans
  // SETTINGS_SECTIONS sans étendre SECTIONS_META, l'order match plante.
  if (SECTIONS_META.length !== SETTINGS_SECTIONS.length) {
    console.warn('[SettingsShell] SECTIONS_META et SETTINGS_SECTIONS désynchronisés');
  }

  return (
    <Tabs
      value={section}
      onValueChange={(v) => setSection(v as SettingsSection)}
      className="md:flex md:gap-6"
      orientation="vertical"
    >
      <TabsList
        className={cn(
          // Mobile : horizontal scrollable sticky bar
          'mb-4 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-md bg-muted p-1',
          'sticky top-0 z-10',
          // Desktop : vertical sidebar
          'md:sticky md:top-6 md:mb-0 md:h-fit md:w-60 md:flex-col md:items-stretch md:overflow-visible md:bg-transparent md:p-0',
        )}
      >
        {SECTIONS_META.map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className={cn(
              'flex-shrink-0 gap-2 whitespace-nowrap',
              'md:justify-start md:py-2.5',
            )}
            aria-label={label}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="min-w-0 flex-1 space-y-4">
        <TabsContent value="account" className="m-0">
          <AccountSection user={user} />
        </TabsContent>
        <TabsContent value="assistant-memory" className="m-0">
          <AssistantMemorySection />
        </TabsContent>
        <TabsContent value="cooking" className="m-0">
          <CookingPreferencesStub />
        </TabsContent>
        <TabsContent value="nutrition" className="m-0">
          <NutritionWellbeingStub />
        </TabsContent>
        <TabsContent value="data-privacy" className="m-0">
          <DataPrivacySection />
        </TabsContent>
        <TabsContent value="notifications" className="m-0">
          <NotificationsSection />
        </TabsContent>
        <TabsContent value="appearance" className="m-0">
          <AppearanceSection />
        </TabsContent>
      </div>
    </Tabs>
  );
}
