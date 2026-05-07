/**
 * Parse a free-form duration into minutes.
 *
 * Accepts:
 *   - numbers ("30")
 *   - "30 min" / "30 minutes" / "30m"
 *   - "1h" / "1h30" / "1 h 30"
 *   - "00:30" / "1:45" (HH:MM)
 *   - "PT30M" / "PT1H30M" (ISO 8601 duration, common in schema.org Recipe)
 *
 * Returns `undefined` for shapes we cannot interpret rather than guessing,
 * so the caller can surface an extractionWarning instead of fabricating
 * a duration.
 */
export function parseDurationToMinutes(input: string | number | undefined | null): number | undefined {
  if (input == null) return undefined;
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? Math.round(input) : undefined;

  const s = String(input).toLowerCase().trim();
  if (!s) return undefined;

  // ISO 8601 duration: PT[xH][xM][xS]
  const iso = /^pt(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(s);
  if (iso) {
    const h = Number(iso[1] ?? 0);
    const m = Number(iso[2] ?? 0);
    const sec = Number(iso[3] ?? 0);
    const total = h * 60 + m + Math.round(sec / 60);
    return total > 0 ? total : undefined;
  }

  // HH:MM
  const colon = /^(\d{1,2}):([0-5]\d)$/.exec(s);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);

  // Hh + optional Mm  ("1h30", "1 h 30 min", "2h", "1h30m")
  const hAndM = /^(\d+)\s*h(?:eures?)?(?:\s*(\d+)\s*(?:min|m)?)?$/i.exec(s);
  if (hAndM) return Number(hAndM[1]) * 60 + Number(hAndM[2] ?? 0);

  // "30 min" / "30 minutes" / "30m" / "30"
  const min = /^(\d+)\s*(?:min(?:utes?)?|m)?$/i.exec(s);
  if (min) return Number(min[1]);

  return undefined;
}
