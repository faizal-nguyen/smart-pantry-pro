import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * V11-06 E6b (D6): dates, numbers and amounts are formatted only by `packages/shared/src/format.ts`,
 * in one locale and one time zone. A format written elsewhere would follow the device's zone or drift
 * from the others: these guards read the client, the API and the shared package.
 */
const ROOT = join(__dirname, '../../../..');
const SOURCES = ['src', 'apps/api/src', 'packages/shared/src'];
const MODULE = 'packages/shared/src/format.ts';
const CALENDAR = 'packages/shared/src/calendar.ts';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return ['__tests__', 'node_modules', 'dist'].includes(entry.name) ? [] : sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) && !/\.(?:test|spec)\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const FILES = SOURCES.flatMap(source => sourceFiles(join(ROOT, source))).map(path => relative(ROOT, path));

function offenders(pattern: RegExp, allowed: string[]): string[] {
  return FILES.filter(file => !allowed.includes(file)).flatMap(file =>
    readFileSync(join(ROOT, file), 'utf8').split('\n').flatMap((line, index) => pattern.test(line) ? [`${file}:${index + 1}`] : []));
}

describe('one locale, one time zone', () => {
  test('dates, numbers and amounts are formatted only through the shared module', () => {
    expect(FILES.length).toBeGreaterThan(200);
    expect(offenders(/\.toLocale(?:Date|Time)?String\(|new Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat|PluralRules|ListFormat)\(/, [MODULE, CALENDAR])).toEqual([]);
  });

  test('the locale is written once', () => {
    expect(offenders(/['"]fr-FR['"]/, [MODULE])).toEqual([]);
  });

  test('the time zone is written once', () => {
    expect(offenders(/Europe\/Paris/, [CALENDAR])).toEqual([]);
  });
});
