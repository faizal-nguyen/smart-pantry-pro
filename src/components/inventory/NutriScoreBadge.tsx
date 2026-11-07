/**
 * Nutri-Score letter of a packaged product, as read from Open Food Facts.
 * Colours follow the official scale; the text keeps a 4.5:1 contrast.
 */
const GRADES = {
  a: 'bg-[#038141] text-white',
  b: 'bg-[#85BB2F] text-neutral-950',
  c: 'bg-[#FECB02] text-neutral-950',
  d: 'bg-[#EE8100] text-neutral-950',
  e: 'bg-[#E63E11] text-neutral-950',
} as const;

export default function NutriScoreBadge({ grade }: { grade?: string | null }) {
  if (!grade || !(grade in GRADES)) return null;
  const letter = grade.toUpperCase();
  return (
    <span
      title={`Nutri-Score ${letter}`}
      className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded px-1 align-middle text-xs font-bold ${GRADES[grade as keyof typeof GRADES]}`}
    >
      <span className="sr-only">Nutri-Score </span>{letter}
    </span>
  );
}
