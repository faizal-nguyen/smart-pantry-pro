/**
 * PRP-235 PR1 — useSettingsSection.
 *
 * URL-driven state pour la nav secondaire de `/settings` :
 *   - `?section=account` (default si absent ou invalide)
 *   - `?section=assistant-memory|cooking|nutrition|data-privacy|notifications|appearance`
 *
 * Pattern miroir de `src/pages/Recipes.tsx` (PRP-232) qui utilise
 * `useSearchParams` + URLSearchParams + `replace: true` pour ne pas
 * polluer l'historique du navigateur.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const SETTINGS_SECTIONS = [
  'account',
  'assistant-memory',
  'cooking',
  'nutrition',
  'data-privacy',
  'notifications',
  'appearance',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const DEFAULT_SECTION: SettingsSection = 'account';

function isSettingsSection(value: string | null): value is SettingsSection {
  if (!value) return false;
  return (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

export interface UseSettingsSectionReturn {
  section: SettingsSection;
  setSection: (next: SettingsSection) => void;
}

export function useSettingsSection(): UseSettingsSectionReturn {
  const [params, setParams] = useSearchParams();

  const section = useMemo<SettingsSection>(() => {
    const raw = params.get('section');
    return isSettingsSection(raw) ? raw : DEFAULT_SECTION;
  }, [params]);

  const setSection = useCallback(
    (next: SettingsSection) => {
      setParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          nextParams.set('section', next);
          return nextParams;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { section, setSection };
}
