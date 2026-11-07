import { PersonalImageKeeper } from '../ThumbnailSnapshotService.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const INPUT = { userId: 'user-1', importId: 'import-1', remoteUrl: 'https://scontent.cdninstagram.com/v/og.jpg', sourceUrl: 'https://www.instagram.com/reel/abc/' };

function clients(insertError: { message: string } | null = null) {
  const inserted: Array<Record<string, unknown>> = [];
  const uploads: Array<{ bucket: string; key: string }> = [];
  const user = { from: () => ({ insert: (payload: Record<string, unknown>) => { inserted.push(payload); return {
    select: () => ({ single: async () => insertError ? { data: null, error: insertError } : { data: { id: 'asset-1', ...payload }, error: null } }) }; } }) };
  const admin = { storage: { from: (bucket: string) => ({
    upload: async (key: string) => { uploads.push({ bucket, key }); return { error: null }; },
    remove: async () => ({ error: null }),
    getPublicUrl: (key: string) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${key}` } }),
  }) } };
  return { user, admin, inserted, uploads };
}
const fetchOk = () => jest.fn(async () => new Response(new Uint8Array(JPEG), { status: 200 }));

test('copies under the owner permission into the public recipe-images bucket and records that right', async () => {
  const c = clients();
  const url = await new PersonalImageKeeper(c.user as never, c.admin as never, { fetchImpl: fetchOk() as never }).keep(INPUT);
  expect(c.uploads).toHaveLength(1);
  expect(c.uploads[0].bucket).toBe('recipe-images');
  expect(c.uploads[0].key).toMatch(/^users\/user-1\/thumbnail\/\d{4}\/\d{2}\/og-[a-f0-9-]+\.jpg$/);
  expect(c.inserted[0]).toMatchObject({ rights_status: 'user_provided', rights_basis: 'user_has_permission', storage_bucket: 'recipe-images', import_id: 'import-1' });
  expect(url).toBe(`https://project.supabase.co/storage/v1/object/public/recipe-images/${c.uploads[0].key}`);
});

test('returns null when the right cannot be recorded, so nothing unaccounted stays public', async () => {
  const c = clients({ message: 'rls denied' });
  await expect(new PersonalImageKeeper(c.user as never, c.admin as never, { fetchImpl: fetchOk() as never }).keep(INPUT)).resolves.toBeNull();
});
