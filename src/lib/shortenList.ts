// Shown before « et N autres »; one name more is shown rather than « et 1 autre ».
const KEPT_NAMES = 3;

/**
 * « Pas dans ton stock : a, b, c, d, e. » → « Pas dans ton stock : a, b, c et 2 autres. »
 * (iPhone 2026-11-09: 22 names in one line). Null when the line has no long list.
 * Names are split on « , » followed by a space, so « 1,5 kg » stays whole.
 */
export function shortenList(line: string): string | null {
  const match = /^(.+? : )(.+?)(\.?)$/.exec(line);
  if (!match) return null;
  const items = match[2].split(', ');
  if (items.length <= KEPT_NAMES + 1) return null;
  return `${match[1]}${items.slice(0, KEPT_NAMES).join(', ')} et ${items.length - KEPT_NAMES} autres${match[3]}`;
}
