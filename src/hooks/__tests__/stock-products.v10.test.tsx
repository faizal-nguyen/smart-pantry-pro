import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { stockProducts, useStockProducts } from '../useStockProducts';

const OWNER = '00000000-0000-4000-8000-000000000001';
const PAGE = 1000;
let mockRows: unknown[] = [];
const mockRanges: Array<[number, number]> = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let range: [number, number] = [0, Number.MAX_SAFE_INTEGER];
  const query: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'order']) query[name] = () => query;
  query.range = (from: number, to: number) => { range = [from, to]; mockRanges.push(range); return query; };
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: mockRows.slice(range[0], Math.min(range[1] + 1, range[0] + PAGE)), error: null, count: mockRows.length }).then(resolve);
  return query;
} } }));
const lot = (index: number, name = `Produit ${String(index).padStart(4, '0')}`) => ({ product_id: `p-${index}`, quantity: 1, unit: 'kg', product: { name } });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
beforeEach(() => { mockRanges.length = 0; mockRows = []; });

test('lots of one product are grouped, products without a name left out, the rest sorted by name', () => {
  expect(stockProducts([lot(1, 'Riz'), { ...lot(1, 'Riz'), quantity: 2 }, lot(2, 'Huile'), { ...lot(3), product: null }]))
    .toEqual([{ id: 'p-2', name: 'Huile', amounts: ['1 kg'] }, { id: 'p-1', name: 'Riz', amounts: ['1 kg', '2 kg'] }]);
});

// Review 2026-11-24: one response holds at most a thousand rows; a larger stock is read page by page.
test('a stock longer than one response is read entirely', async () => {
  mockRows = Array.from({ length: 1500 }, (_, index) => lot(index));
  const { result } = renderHook(() => useStockProducts(OWNER, true), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(1500));
  expect(mockRanges).toEqual([[0, 999], [1000, 1999]]);
});
