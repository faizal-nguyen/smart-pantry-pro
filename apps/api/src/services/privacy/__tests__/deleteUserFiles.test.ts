import { deleteUserFiles } from '../deleteUserFiles.js';

const USER = '00000000-0000-4000-8000-000000000001';
function admin(pages: Array<Array<{ bucket_id: string; name: string }>>) {
  const remove = jest.fn(async (_names: string[]) => ({ data: [], error: null }));
  return { rpc: jest.fn(async () => ({ data: pages.shift() ?? [], error: null })), storage: { from: jest.fn(() => ({ remove })) }, remove };
}
const files = (count: number, bucket = 'recipe-images') => Array.from({ length: count }, (_, i) => ({ bucket_id: bucket, name: `f${i}.jpg` }));

test('removes in batches of 100 and lists again while a full page came back', async () => {
  const a = admin([files(1000), files(5)]);
  await expect(deleteUserFiles(a as never, USER)).resolves.toBe(1005);
  expect(a.rpc).toHaveBeenCalledTimes(2);
  expect(a.remove.mock.calls.map(([names]) => names.length)).toEqual([...Array(10).fill(100), 5]);
});

test('nothing to remove makes no Storage call', async () => {
  const a = admin([[]]);
  await expect(deleteUserFiles(a as never, USER)).resolves.toBe(0);
  expect(a.storage.from).not.toHaveBeenCalled();
});

test('stops instead of looping when files keep coming back', async () => {
  const a = admin(Array.from({ length: 30 }, () => files(1000)));
  await expect(deleteUserFiles(a as never, USER)).rejects.toThrow('USER_FILES_REMAINING');
});
