/**
 * The settings section named by `?section=`, validated here only.
 *
 * Absent or unknown: no section is open (`hasSection` false) and the navigation shows its list;
 * `section` then falls back to `account`. A retired section id stays valid for bookmarks: it opens
 * its canonical section at once, and the address is rewritten in place (`replace`), other
 * parameters kept, so history never holds the old id.
 *
 * Because it rewrites the address, the hook has one caller: `SettingsNavigation`. Other components
 * receive the section from it rather than calling the hook again.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const SETTINGS_SECTIONS = [
  'account',
  'assistant-memory',
  'assistant-models',
  'cooking',
  'data-privacy',
  'notifications',
  'appearance',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** V11-06 E6c: « Nutrition et bien-être » rendered the dietary profile; it is merged into it. */
const SECTION_ALIASES: Readonly<Record<string, SettingsSection>> = Object.freeze({ nutrition: 'cooking' });

const DEFAULT_SECTION: SettingsSection = 'account';

function isSettingsSection(value: string | null): value is SettingsSection {
  return value !== null && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

function aliasTarget(value: string | null): SettingsSection | null {
  return value !== null && Object.prototype.hasOwnProperty.call(SECTION_ALIASES, value) ? SECTION_ALIASES[value] : null;
}

export interface UseSettingsSectionReturn {
  section: SettingsSection;
  hasSection: boolean;
}

export function useSettingsSection(): UseSettingsSectionReturn {
  const [params, setParams] = useSearchParams();
  const raw = params.get('section');
  const alias = aliasTarget(raw);

  useEffect(() => {
    if (!alias) return;
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('section', alias);
      return next;
    }, { replace: true });
  }, [alias, setParams]);

  const resolved = alias ?? raw;
  return isSettingsSection(resolved)
    ? { section: resolved, hasSection: true }
    : { section: DEFAULT_SECTION, hasSection: false };
}
