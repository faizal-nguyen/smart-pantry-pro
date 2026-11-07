import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProductPhotos } from '../useProductPhotos';

const rows = [
  { product_id: 'p-kewpie', photo_path: 'users/u/groceries/r-1.jpg' },
  { product_id: 'p-riz', photo_path: 'users/u/groceries/r-1.jpg' },
  { product_id: 'p-lait', photo_path: 'users/u/groceries/gone.jpg' },
];
const inFilter = jest.fn(async () => ({ data: rows, error: null }));
const createSignedUrls = jest.fn(async (paths: string[]) => ({
  data: paths.map(path => ({ path, signedUrl: path.endsWith('gone.jpg') ? '' : `https://signed/${path}`, error: null })), error: null,
}));
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ in: inFilter }) }),
    storage: { from: () => ({ createSignedUrls }) },
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

test('each product with a kept photo gets a signed URL; one photo shared by two products is signed once', async () => {
  const { result } = renderHook(() => useProductPhotos(['p-riz', 'p-kewpie', 'p-lait', 'p-riz']), { wrapper });
  await waitFor(() => expect(result.current.size).toBe(2));
  expect(result.current.get('p-kewpie')).toBe('https://signed/users/u/groceries/r-1.jpg');
  expect(result.current.get('p-lait')).toBeUndefined();
  expect(inFilter).toHaveBeenCalledWith('product_id', ['p-kewpie', 'p-lait', 'p-riz']);
  expect(createSignedUrls).toHaveBeenCalledWith(['users/u/groceries/r-1.jpg', 'users/u/groceries/gone.jpg'], 3600);
});

test('no product, no query', () => {
  inFilter.mockClear();
  const { result } = renderHook(() => useProductPhotos([]), { wrapper });
  expect(result.current.size).toBe(0);
  expect(inFilter).not.toHaveBeenCalled();
});
