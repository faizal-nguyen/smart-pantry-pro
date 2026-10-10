import type { User } from '@supabase/supabase-js';
import SettingsNavigation from './SettingsNavigation';
import AccountSection from './AccountSection';
import AppearanceSection from './AppearanceSection';
import AssistantMemorySection from './AssistantMemorySection';
import CookingPreferencesSection from './CookingPreferencesSection';
import DataPrivacySection from './DataPrivacySection';
import NotificationsSection from './NotificationsSection';
import NutritionWellbeingStub from './NutritionWellbeingStub';

/** Navigation mounts only the requested section; its data contracts stay unchanged. */
export default function SettingsShell({ user }: { user: User }) {
  return <SettingsNavigation renderSection={section => {
    switch (section) {
      case 'account': return <AccountSection user={user} />;
      case 'assistant-memory': return <AssistantMemorySection />;
      case 'cooking': return <CookingPreferencesSection />;
      case 'nutrition': return <NutritionWellbeingStub />;
      case 'data-privacy': return <DataPrivacySection />;
      case 'notifications': return <NotificationsSection />;
      case 'appearance': return <AppearanceSection />;
    }
  }} />;
}
