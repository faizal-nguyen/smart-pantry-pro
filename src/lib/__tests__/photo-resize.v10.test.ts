import { heicTo } from 'heic-to';
import { fitWithin, isHeifHeader, resizePhoto } from '../photoResize';

jest.mock('heic-to', () => ({ heicTo: jest.fn() }));

const bytes = (...parts: Array<number[] | string>) =>
  new Uint8Array(parts.flatMap(part => (typeof part === 'string' ? Array.from(part, c => c.charCodeAt(0)) : part)));
const HEIC = bytes([0, 0, 0, 24], 'ftypheic', [0, 0, 0, 0]);
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 16], 'JFIF', [0, 1]);

// jsdom has no image decoding, no canvas and no Blob.arrayBuffer: stand them in.
const bitmap = (width: number, height: number) => ({ width, height, close: jest.fn() }) as unknown as ImageBitmap;
const createImageBitmap = jest.fn();
const drawImage = jest.fn();
beforeAll(() => {
  Object.assign(globalThis, { createImageBitmap });
  Blob.prototype.arrayBuffer ??= function (this: Blob) {
    return new Promise<ArrayBuffer>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  };
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done, type) => done(new Blob(['jpeg'], { type })));
});
beforeEach(() => jest.clearAllMocks());

test('a phone photo is scaled down to 1600 px on its long side, keeping its proportions', () => {
  expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
});

test('a photo already small enough is never enlarged', () => {
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
});

test('an iPhone HEIC photo is recognised from its bytes, a JPEG is not', () => {
  expect(isHeifHeader(HEIC)).toBe(true);
  expect(isHeifHeader(bytes([0, 0, 0, 24], 'ftypmif1', [0, 0, 0, 0]))).toBe(true);
  expect(isHeifHeader(bytes([0, 0, 0, 24], 'ftypavif', [0, 0, 0, 0]))).toBe(false);
  expect(isHeifHeader(JPEG)).toBe(false);
  expect(isHeifHeader(bytes('ftyp'))).toBe(false);
});

test('a photo the browser decodes leaves as a 1600 px JPEG without loading the HEIC converter', async () => {
  createImageBitmap.mockResolvedValue(bitmap(4032, 3024));
  const jpeg = await resizePhoto(new Blob([JPEG], { type: 'image/jpeg' }));
  expect(jpeg.type).toBe('image/jpeg');
  expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
  expect(heicTo).not.toHaveBeenCalled();
});

test('a HEIC photo the browser cannot decode (Chrome, Firefox) is converted, then leaves as a JPEG', async () => {
  createImageBitmap.mockRejectedValue(new DOMException('The source image could not be decoded.', 'InvalidStateError'));
  jest.mocked(heicTo).mockResolvedValue(bitmap(3024, 4032) as never);
  const file = new File([HEIC], 'IMG_0042.HEIC', { type: '' });
  const jpeg = await resizePhoto(file);
  expect(heicTo).toHaveBeenCalledWith({ blob: file, type: 'bitmap' });
  expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 1600);
  expect(jpeg.type).toBe('image/jpeg');
});

test('a file that is neither decodable nor HEIC is refused with a readable message', async () => {
  createImageBitmap.mockRejectedValue(new DOMException('bad', 'InvalidStateError'));
  await expect(resizePhoto(new Blob([bytes('not an image at all')]))).rejects.toThrow('Cette photo ne peut pas être lue sur cet appareil.');
  expect(heicTo).not.toHaveBeenCalled();
});

test('a HEIC photo the converter cannot read is refused with the same message', async () => {
  createImageBitmap.mockRejectedValue(new DOMException('bad', 'InvalidStateError'));
  jest.mocked(heicTo).mockRejectedValue(new Error('libheif: unsupported codec'));
  await expect(resizePhoto(new Blob([HEIC]))).rejects.toThrow('Cette photo ne peut pas être lue sur cet appareil.');
});
