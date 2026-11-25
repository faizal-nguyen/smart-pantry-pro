import { readImageDimensions } from '../imageDimensions.js';

// V11-01 E5a: a receipt photo's size is read from its own header before any provider call.
function jpeg(width: number, height: number): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const sof = Buffer.alloc(19);
  sof.set([0xff, 0xc2, 0x00, 0x11, 0x08]);
  sof.writeUInt16BE(height, 5); sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, Buffer.from([0xff, 0xff]), sof.subarray(1)]);
}
function png(width: number, height: number): Buffer {
  const head = Buffer.alloc(24);
  head.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  head.write('IHDR', 12, 'ascii');
  head.writeUInt32BE(width, 16); head.writeUInt32BE(height, 20);
  return head;
}
function webp(chunk: 'VP8 ' | 'VP8L' | 'VP8X', width: number, height: number): Buffer {
  const head = Buffer.alloc(30);
  head.write('RIFF', 0, 'ascii'); head.write('WEBP', 8, 'ascii'); head.write(chunk, 12, 'ascii');
  if (chunk === 'VP8 ') { head.set([0x9d, 0x01, 0x2a], 23); head.writeUInt16LE(width, 26); head.writeUInt16LE(height, 28); }
  if (chunk === 'VP8L') { head[20] = 0x2f; head.writeUInt32LE(((height - 1) << 14) | (width - 1), 21); }
  if (chunk === 'VP8X') { head.writeUIntLE(width - 1, 24, 3); head.writeUIntLE(height - 1, 27, 3); }
  return head;
}

test('reads the size of JPEG (after padding and other segments), PNG and the three WebP kinds', () => {
  expect(readImageDimensions(jpeg(1024, 2048))).toEqual({ width: 1024, height: 2048 });
  expect(readImageDimensions(png(640, 1800))).toEqual({ width: 640, height: 1800 });
  expect(readImageDimensions(webp('VP8 ', 500, 2000))).toEqual({ width: 500, height: 2000 });
  expect(readImageDimensions(webp('VP8L', 501, 2001))).toEqual({ width: 501, height: 2001 });
  expect(readImageDimensions(webp('VP8X', 3000, 4000))).toEqual({ width: 3000, height: 4000 });
});

test('a broken, truncated or unknown header gives no size, never a throw', () => {
  for (const broken of [
    Buffer.alloc(0), Buffer.from('<html>'), jpeg(10, 10).subarray(0, 24), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff]),
    png(1, 1).subarray(0, 20), webp('VP8 ', 1, 1).subarray(0, 26), (() => { const b = webp('VP8 ', 9, 9); b[23] = 0; return b; })(),
    png(0, 10),
  ]) expect(readImageDimensions(broken)).toBeNull();
});
