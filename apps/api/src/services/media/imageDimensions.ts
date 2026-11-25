/**
 * V11-01 E5a — the width and height an image declares in its own header (JPEG, PNG, WebP), read
 * before any provider call; no decoding, no dependency. A header that cannot be read gives null.
 */
export interface ImageDimensions { width: number; height: number }

const valid = (width: number, height: number): ImageDimensions | null =>
  Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 ? { width, height } : null;

/** The SOF markers that carry a frame size (C4, C8 and CC are tables, not frames). */
const isFrame = (marker: number) => marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

function jpeg(buffer: Buffer): ImageDimensions | null {
  let offset = 2;
  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xff) { offset += 1; continue; } // fill byte
    // Markers without a length: restarts, start and end of image, TEM.
    if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (isFrame(marker)) return offset + 9 <= buffer.length ? valid(buffer.readUInt16BE(offset + 7), buffer.readUInt16BE(offset + 5)) : null;
    offset += 2 + length;
  }
  return null;
}

function png(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24 || buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return valid(buffer.readUInt32BE(16), buffer.readUInt32BE(20));
}

function webp(buffer: Buffer): ImageDimensions | null {
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    if (buffer.length < 30 || buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return valid(buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff);
  }
  if (chunk === 'VP8L') {
    if (buffer.length < 25 || buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return valid((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === 'VP8X') return buffer.length < 30 ? null : valid(buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1);
  return null;
}

export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  try {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return jpeg(buffer);
    if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47) return png(buffer);
    if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return webp(buffer);
  } catch {
    // A read past the end of a truncated header.
  }
  return null;
}
