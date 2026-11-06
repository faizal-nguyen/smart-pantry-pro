import { createHash } from 'node:crypto';

import { PublicThumbnailCopier } from '../ThumbnailSnapshotService.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const REMOTE = 'https://scontent.cdninstagram.com/v/t51/og.jpg?oh=abc&oe=def';
const INPUT = { userId: 'user-1', importId: 'import-1', remoteUrl: REMOTE };

function admin(uploadError: unknown = null) {
  const upload = jest.fn(async (_key: string, _body: Buffer, _opts: Record<string, unknown>) => ({ error: uploadError }));
  const getPublicUrl = jest.fn((key: string) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/recipe-images/${key}` } }));
  const from = jest.fn((_bucket: string) => ({ upload, getPublicUrl }));
  return { client: { storage: { from } }, upload, from };
}
const fetchOk = (body: Buffer) => jest.fn(async () => new Response(new Uint8Array(body), { status: 200 }));

test('copies the thumbnail into the public recipe-images bucket under the user folder', async () => {
  const a = admin();
  const url = await new PublicThumbnailCopier(a.client as never, { fetchImpl: fetchOk(JPEG) as never }).copy(INPUT);
  const key = `users/user-1/imports/import-1-${createHash('sha256').update(JPEG).digest('hex').slice(0, 16)}.jpg`;
  expect(a.from).toHaveBeenCalledWith('recipe-images');
  expect(a.upload).toHaveBeenCalledWith(key, JPEG, expect.objectContaining({ contentType: 'image/jpeg', upsert: true }));
  expect(url).toBe(`https://project.supabase.co/storage/v1/object/public/recipe-images/${key}`);
});

test('returns null without fetching a URL the SSRF guard refuses', async () => {
  const fetchImpl = fetchOk(JPEG);
  await expect(new PublicThumbnailCopier(admin().client as never, { fetchImpl: fetchImpl as never }).copy({ ...INPUT, remoteUrl: 'http://127.0.0.1/a.jpg' })).resolves.toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('returns null when the image cannot be fetched, is not an image, or cannot be stored', async () => {
  const failing = jest.fn(async () => new Response('', { status: 403 }));
  await expect(new PublicThumbnailCopier(admin().client as never, { fetchImpl: failing as never }).copy(INPUT)).resolves.toBeNull();
  await expect(new PublicThumbnailCopier(admin().client as never, { fetchImpl: fetchOk(Buffer.from('<html>')) as never }).copy(INPUT)).resolves.toBeNull();
  await expect(new PublicThumbnailCopier(admin({ message: 'bucket not found' }).client as never, { fetchImpl: fetchOk(JPEG) as never }).copy(INPUT)).resolves.toBeNull();
});
