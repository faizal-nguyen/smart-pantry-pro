/** A stock note can require review without sending its free text to a model. */
export function conservationReviewRequired(notes: string | null | undefined): boolean {
  const text = (notes ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return /conservation\s+a\s+verifier|consommabilite\s+(?:non\s+confirmee|a\s+verifier)|fraicheur\s+a\s+verifier/.test(text);
}
