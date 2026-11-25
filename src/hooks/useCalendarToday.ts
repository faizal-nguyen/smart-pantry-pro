import { useEffect, useState } from 'react';
import { calendarDate } from '@smart/shared';

const TODAY_CHECK_MS = 60_000;
const readToday = () => calendarDate(new Date()) ?? '';

/**
 * The calendar day of the shared zone (YYYY-MM-DD), kept current when a page stays open past
 * midnight or comes back to the foreground.
 */
export function useCalendarToday(): string {
  const [today, setToday] = useState(readToday);
  useEffect(() => {
    const sync = () => setToday(readToday());
    const timer = window.setInterval(sync, TODAY_CHECK_MS);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return today;
}

/** Noon UTC of a calendar day falls on that same day in the shared zone. */
export const noonOf = (day: string) => new Date(`${day}T12:00:00Z`);
