import { resizePhoto } from '@/lib/photoResize';
import { uploadRecipePhoto, RecipePhotoError } from '@/lib/recipePhotoUpload';

const reencoded = new Blob(['jpeg without metadata'], { type: 'image/jpeg' });
const mockUpload = jest.fn();
const mockPublicUrl = jest.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/recipe-images/${path}` } }));
jest.mock('@/lib/photoResize', () => ({ PHOTO_MAX_SIDE: 1600, resizePhoto: jest.fn() }));
jest.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: (bucket: string) => ({ upload: (...args: unknown[]) => mockUpload(bucket, ...args), getPublicUrl: mockPublicUrl }) } },
}));

const original = new File(['raw camera bytes with EXIF'], 'IMG_2041.HEIC', { type: 'image/heic' });

let mockSerial = 0;
beforeEach(() => {
  jest.clearAllMocks();
  // jsdom has no crypto.randomUUID: each call yields a distinct version-4 identifier, as browsers do.
  Object.defineProperty(crypto, 'randomUUID', { configurable: true,
    value: () => `3f2a9c1e-7b4d-4e8a-9c6f-${String(++mockSerial).padStart(12, '0')}` });
  (resizePhoto as jest.Mock).mockResolvedValue(reencoded);
  mockUpload.mockResolvedValue({ data: { path: 'recipe-1700000000000.jpg' }, error: null });
});

test('the photo leaves re-encoded as a JPEG, never as the original file with its metadata', async () => {
  const url = await uploadRecipePhoto(original);
  expect(resizePhoto).toHaveBeenCalledWith(original, 1600);
  const [bucket, path, body, options] = mockUpload.mock.calls[0];
  expect([bucket, body, options]).toEqual(['recipe-images', reencoded, { contentType: 'image/jpeg' }]);
  expect(mockUpload.mock.calls[0]).not.toContain(original);
  expect(url).toBe(`https://cdn.test/recipe-images/${path}`);
});

test('each photo gets an unguessable name: no collision, no name taken in advance, no URL to guess', async () => {
  await uploadRecipePhoto(original);
  await uploadRecipePhoto(original);
  const [first, second] = mockUpload.mock.calls.map(call => call[1] as string);
  expect(first).toMatch(/^recipe-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/);
  expect(second).not.toBe(first);
});

test('a photo the device cannot read is not sent, and says why', async () => {
  (resizePhoto as jest.Mock).mockRejectedValue(new Error('Cette photo ne peut pas être lue sur cet appareil.'));
  await expect(uploadRecipePhoto(original)).rejects.toEqual(new RecipePhotoError('Cette photo ne peut pas être lue sur cet appareil.'));
  expect(mockUpload).not.toHaveBeenCalled();
});

test('a refused upload is reported in words, without the storage detail', async () => {
  mockUpload.mockResolvedValue({ data: null, error: { message: 'new row violates row-level security policy' } });
  await expect(uploadRecipePhoto(original)).rejects.toEqual(new RecipePhotoError('Impossible de télécharger l’image.'));
  expect(mockPublicUrl).not.toHaveBeenCalled();
});
