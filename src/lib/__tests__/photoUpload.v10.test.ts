import { resizePhoto } from '@/lib/photoResize';
import { deleteProductPhoto, PhotoUploadError, uploadProductPhoto, uploadRecipePhoto } from '@/lib/photoUpload';

const reencoded = new Blob(['jpeg without metadata'], { type: 'image/jpeg' });
const STORAGE = 'https://project.supabase.test/storage/v1/object/public';
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockPublicUrl = jest.fn((bucket: string, path: string) => ({ data: { publicUrl: `${STORAGE}/${bucket}/${path}` } }));
jest.mock('@/lib/photoResize', () => ({ PHOTO_MAX_SIDE: 1600, KEPT_PHOTO_SIDE: 1024, resizePhoto: jest.fn() }));
jest.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: (bucket: string) => ({
    upload: (...args: unknown[]) => mockUpload(bucket, ...args),
    getPublicUrl: (path: string) => mockPublicUrl(bucket, path),
    remove: (paths: string[]) => mockRemove(bucket, paths),
  }) } },
}));

const original = new File(['raw camera bytes with EXIF'], 'IMG_2041.HEIC', { type: 'image/heic' });
const UUID_NAME = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.jpg';

let mockSerial = 0;
beforeEach(() => {
  jest.clearAllMocks();
  // jsdom has no crypto.randomUUID: each call yields a distinct version-4 identifier, as browsers do.
  Object.defineProperty(crypto, 'randomUUID', { configurable: true,
    value: () => `3f2a9c1e-7b4d-4e8a-9c6f-${String(++mockSerial).padStart(12, '0')}` });
  (resizePhoto as jest.Mock).mockResolvedValue(reencoded);
  mockUpload.mockResolvedValue({ data: { path: 'stored.jpg' }, error: null });
  mockRemove.mockResolvedValue({ data: [{ name: 'stored.jpg' }], error: null });
});

describe.each([
  ['recipe', uploadRecipePhoto, 'recipe-images', [original, 1600]],
  ['product', uploadProductPhoto, 'product-images', [original, 1024, 0.8]],
] as const)('a %s photo', (prefix, upload, bucket, resized) => {
  test('leaves re-encoded as a JPEG, never as the original file with its metadata', async () => {
    const url = await upload(original);
    expect(resizePhoto).toHaveBeenCalledWith(...resized);
    const [usedBucket, path, body, options] = mockUpload.mock.calls[0];
    expect([usedBucket, body, options]).toEqual([bucket, reencoded, { contentType: 'image/jpeg' }]);
    expect(mockUpload.mock.calls[0]).not.toContain(original);
    expect(url).toBe(`${STORAGE}/${bucket}/${path}`);
  });

  test('gets an unguessable name: no collision, no name taken in advance, no URL to guess', async () => {
    await upload(original);
    await upload(original);
    const [first, second] = mockUpload.mock.calls.map(call => call[1] as string);
    expect(first).toMatch(new RegExp(`^${prefix}-${UUID_NAME}$`));
    expect(second).not.toBe(first);
  });

  test('is not sent when the device cannot read it, and says why', async () => {
    (resizePhoto as jest.Mock).mockRejectedValue(new Error('Cette photo ne peut pas être lue sur cet appareil.'));
    await expect(upload(original)).rejects.toEqual(new PhotoUploadError('Cette photo ne peut pas être lue sur cet appareil.'));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  test('is reported in words when the upload is refused, without the storage detail', async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: 'new row violates row-level security policy' } });
    await expect(upload(original)).rejects.toEqual(new PhotoUploadError('Impossible de télécharger l’image.'));
    expect(mockPublicUrl).not.toHaveBeenCalled();
  });
});

describe('removing a product photo', () => {
  test.each([
    ['a photo named by this version', `${STORAGE}/product-images/product-3f2a9c1e-7b4d-4e8a-9c6f-000000000001.jpg`,
      'product-3f2a9c1e-7b4d-4e8a-9c6f-000000000001.jpg'],
    ['a photo of the former random names, at the bucket root', `${STORAGE}/product-images/0.4213876.webp`, '0.4213876.webp'],
    ['an encoded name', `${STORAGE}/product-images/photo%20du%20lait.jpg`, 'photo du lait.jpg'],
  ])('removes %s from the product bucket', async (_label, url, path) => {
    await deleteProductPhoto(url);
    expect(mockRemove).toHaveBeenCalledWith('product-images', [path]);
  });

  test.each([
    ['another site', 'https://elsewhere.test/storage/v1/object/public/product-images/0.42.jpg'],
    ['another bucket', `${STORAGE}/recipe-images/recipe-1.jpg`],
    ['a path leaving the bucket', `${STORAGE}/product-images/%2E%2E/recipe-images/recipe-1.jpg`],
    ['the bucket itself', `${STORAGE}/product-images/`],
    ['text that is not a URL', 'product-1.jpg'],
  ])('refuses %s and removes nothing', async (_label, url) => {
    await expect(deleteProductPhoto(url)).rejects.toEqual(new PhotoUploadError('Cette photo n’est pas une photo de produit.'));
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test.each([
    ['refused', { data: null, error: { message: 'permission denied' } }],
    ['silently skipped (no file removed)', { data: [], error: null }],
  ])('says so when the removal is %s', async (_label, outcome) => {
    mockRemove.mockResolvedValue(outcome);
    await expect(deleteProductPhoto(`${STORAGE}/product-images/0.42.jpg`))
      .rejects.toEqual(new PhotoUploadError('La photo n’a pas pu être supprimée.'));
  });
});
