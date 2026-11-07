import { fitWithin } from '../photoResize';

test('a phone photo is scaled down to 1600 px on its long side, keeping its proportions', () => {
  expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
});

test('a photo already small enough is never enlarged', () => {
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
});
