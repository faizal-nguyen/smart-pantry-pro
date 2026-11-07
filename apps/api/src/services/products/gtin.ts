/**
 * A barcode read on a pack (EAN-8, UPC-A, EAN-13) is kept only when its
 * check digit is right: a misread digit would merge two products.
 */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop() as number;
  // From the right, the digits next to the check digit weigh 3, the others 1.
  const sum = digits.reverse().reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
