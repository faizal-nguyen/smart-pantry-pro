import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { menuCalendar, menuCalendarFileName } from '../menuCalendar';

const meal = (id: string, day: number, meal_type: MenuEntryView['meal_type'], extra: Partial<MenuEntryView> = {}): MenuEntryView => ({
  id, day_of_week: day, meal_type, recipe_id: null, recipe_reference: null, recipe_name: id, servings: 4,
  prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null, ...extra,
});
const NOW = new Date('2026-11-25T08:09:10Z');
const lines = (text: string) => text.split('\r\n');
const unfold = (text: string) => text.replace(/\r\n /g, '');
const events = (text: string) => unfold(text).split('BEGIN:VEVENT\r\n').slice(1).map(block => block.split('\r\nEND:VEVENT')[0].split('\r\n'));

test('a calendar of the week: CRLF lines, one all-day event per meal in the order of the week', () => {
  const text = menuCalendar('2026-11-30', [meal('b-dinner', 1, 'dinner', { recipe_name: 'Soupe', servings: 2 }), meal('a-lunch', 0, 'lunch', { recipe_name: 'Curry' })], NOW);
  expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
  expect(text).not.toMatch(/[^\r]\n/);
  expect(lines(text).slice(0, 4)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kitchen OS//Menus//FR', 'CALSCALE:GREGORIAN']);
  const [first, second] = events(text);
  expect(first).toEqual([
    'UID:a-lunch@menus.kitchen-os', 'DTSTAMP:20261125T080910Z', 'DTSTART;VALUE=DATE:20261130', 'DTEND;VALUE=DATE:20261201',
    'SEQUENCE:1', 'SUMMARY:Déjeuner : Curry', 'DESCRIPTION:4 portions', 'TRANSP:TRANSPARENT',
  ]);
  expect(second).toContain('SUMMARY:Dîner : Soupe');
  expect(second).toContain('DESCRIPTION:2 portions');
  expect(second).toContain('DTSTART;VALUE=DATE:20261201');
});

test('the identity of an event is the meal’s: a moved meal keeps it, and the dates follow the week across a year', () => {
  const before = events(menuCalendar('2026-12-28', [meal('same-id', 0, 'dinner')], NOW))[0];
  const after = events(menuCalendar('2026-12-28', [meal('same-id', 6, 'snack', { servings: 1 })], NOW))[0];
  expect(before[0]).toBe(after[0]);
  // Each edit of a meal raises its version: a calendar that follows SEQUENCE takes the new date.
  const moved = events(menuCalendar('2026-12-28', [meal('same-id', 6, 'snack', { version: 4 })], NOW))[0];
  expect(moved).toContain('SEQUENCE:4');
  expect(after).toContain('DTSTART;VALUE=DATE:20270103');
  expect(after).toContain('DTEND;VALUE=DATE:20270104');
  expect(after).toContain('SUMMARY:Collation : same-id');
  expect(after).toContain('DESCRIPTION:1 portion');
});

test('free recipe names are escaped as iCalendar text', () => {
  const text = menuCalendar('2026-11-30', [meal('x', 0, 'dinner', { recipe_name: 'Pâtes, sauce; tomate \\ basilic\nmaison' })], NOW);
  expect(events(text)[0]).toContain('SUMMARY:Dîner : Pâtes\\, sauce\\; tomate \\\\ basilic\\nmaison');
});

test('long lines fold at 75 octets without splitting an accent or an emoji', () => {
  const name = `${'é'.repeat(40)} 🍲🍲 ${'à'.repeat(30)}`;
  const text = menuCalendar('2026-11-30', [meal('x', 0, 'dinner', { recipe_name: name })], NOW);
  // UTF-8 octets, without TextEncoder (absent from this jsdom): each %XX of the URI encoding is one octet.
  const bytes = (line: string) => encodeURIComponent(line).replace(/%[0-9A-F]{2}/g, '_').length;
  for (const line of lines(text)) expect(bytes(line)).toBeLessThanOrEqual(75);
  expect(events(text)[0]).toContain(`SUMMARY:Dîner : ${name}`);
  expect(text).not.toContain('�');
});

test('the calendar is named after the week, and so is the file', () => {
  expect(lines(menuCalendar('2026-11-30', [], NOW))).toContain('X-WR-CALNAME:Menus — Semaine du 30 nov. → 6 déc.');
  expect(menuCalendarFileName('2026-11-30')).toBe('menus-semaine-2026-11-30.ics');
});
