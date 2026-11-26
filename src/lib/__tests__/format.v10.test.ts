import { APP_LOCALE, PANTRY_TIME_ZONE, formatDate, formatDateTime, formatMoney, formatNumber, formatTime } from '@smart/shared';

/** Intl separates thousands and currency with narrow no-break spaces. */
const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ');

describe('format — one locale, one time zone (V11-06 E6b, D6)', () => {
  // Every date format names its zone, so nothing depends on the device's zone (jest cannot switch
  // the process zone mid-run: the guarantee is checked on the formats the module builds).
  const created: Intl.DateTimeFormatOptions[] = [];
  beforeAll(() => {
    const Original = Intl.DateTimeFormat;
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((locale, options) => {
      created.push(options ?? {});
      return new Original(locale, options);
    });
  });
  afterAll(() => { jest.restoreAllMocks(); });

  it.each([
    ['weekdayDayMonth', 'jeudi 26 novembre'],
    ['weekdayDayMonthYear', 'jeudi 26 novembre 2026'],
    ['weekday', 'jeudi'],
    ['weekdayShort', 'jeu.'],
    ['weekdayShortDayMonthShort', 'jeu. 26 nov.'],
    ['dayMonthShort', '26 nov.'],
    ['day', '26'],
    ['dayMonth', '26 novembre'],
    ['dayMonthYear', '26 novembre 2026'],
    ['dayMonthShortYear', '26 nov. 2026'],
    ['day2MonthShort', '26 nov.'],
    ['numeric', '26/11/2026'],
  ] as const)('formats a calendar day with the preset %s', (preset, expected) => {
    expect(formatDate('2026-11-26', preset)).toBe(expected);
  });

  it('keeps single digits as the previous formats did', () => {
    expect(formatDate('2026-12-01', 'weekdayShortDayMonthShort')).toBe('mar. 1 déc.');
    expect(formatDate('2026-11-05', 'day2MonthShort')).toBe('05 nov.');
    expect(formatDate('2026-10-09', 'numeric')).toBe('09/10/2026');
  });

  it('puts an instant on its day in Paris, whatever the device and UTC say', () => {
    expect(formatDate('2026-11-26T12:00:00Z', 'dayMonth')).toBe('26 novembre');
    expect(formatDate('2026-11-26T23:30:00Z', 'dayMonth')).toBe('27 novembre');
    expect(formatDate(new Date('2026-11-26T23:30:00Z'), 'weekdayDayMonth')).toBe('vendredi 27 novembre');
  });

  it('says nothing for a value that is not a date', () => {
    expect(formatDate('demain', 'dayMonth')).toBe('');
    expect(formatDate('2026-02-30', 'dayMonth')).toBe('');
    expect(formatTime('plus tard')).toBe('');
    expect(formatDateTime('jamais')).toBe('');
  });

  it('gives the time in Paris, across both clock changes', () => {
    expect(formatTime('2026-11-26T12:00:00Z')).toBe('13:00');
    expect(formatTime('2026-03-29T00:30:00Z')).toBe('01:30');
    expect(formatTime('2026-03-29T01:30:00Z')).toBe('03:30');
    expect(formatTime('2026-10-25T00:30:00Z')).toBe('02:30');
    expect(formatTime('2026-10-25T01:30:00Z')).toBe('02:30');
  });

  it('gives the date and time in Paris, in full or short', () => {
    expect(formatDateTime('2026-11-26T13:32:05Z')).toBe('26/11/2026 14:32:05');
    expect(formatDateTime('2026-11-26T13:32:05Z', 'short')).toBe('26 nov., 14:32');
    expect(formatDateTime('2026-11-26T23:30:00Z', 'short')).toBe('27 nov., 00:30');
  });

  it('formats numbers with the French separators', () => {
    expect(formatNumber(2 / 3)).toBe('0,667');
    expect(plain(formatNumber(1234.5))).toBe('1 234,5');
    expect(formatNumber(1234.5, { useGrouping: false })).toBe('1234,5');
    expect(formatNumber(0.123456, { maximumFractionDigits: 2 })).toBe('0,12');
    expect(formatNumber(3.1, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('3,10');
  });

  it('formats amounts with their currency, and without it when the currency is not one', () => {
    expect(plain(formatMoney(1.2))).toBe('1,20 €');
    expect(plain(formatMoney(12.4, 'USD'))).toBe('12,40 $US');
    expect(formatMoney(3.15, 'pas une devise')).toBe('3,15');
  });

  it('has one locale for the whole app', () => {
    expect(APP_LOCALE).toBe('fr-FR');
  });

  // Last: by now every format the module builds has been built.
  it('names the zone of every date format it builds, so nothing depends on the device', () => {
    expect(created.length).toBeGreaterThan(5);
    expect(created.filter(options => options.timeZone !== PANTRY_TIME_ZONE && options.timeZone !== 'UTC')).toEqual([]);
  });
});
