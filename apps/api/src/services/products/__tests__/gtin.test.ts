import { isValidGtin } from '../gtin.js';

test('a barcode is kept only with its right check digit (EAN-13, UPC-A, EAN-8)', () => {
  expect(isValidGtin('3017620422003')).toBe(true);
  expect(isValidGtin('036000291452')).toBe(true);
  expect(isValidGtin('96385074')).toBe(true);
  expect(isValidGtin('3017620422004')).toBe(false);
  expect(isValidGtin('301762042200')).toBe(false);
});

test('anything but 8, 12 or 13 digits is not a barcode', () => {
  for (const code of ['', '12345', '30176204220031', '3017 620422003', 'abcdefghijklm']) expect(isValidGtin(code)).toBe(false);
});
