import { beginShareCapture,bindShareCapture,captureSharedRecipe,readShareCapture } from '../shareCaptures';
import { importsApi } from '../recipe-import/api';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
let mockOwner:string|null=null;
jest.mock('../recipe-import/api',()=>({ importsApi:{ capture:jest.fn() } }));
jest.mock('@/integrations/supabase/client',()=>({ supabase:{ auth:{ getSession:async()=>({ data:{ session:mockOwner ? { user:{ id:mockOwner } } : null } }) } } }));
beforeEach(()=>{ localStorage.clear();jest.clearAllMocks();mockOwner=null;Object.defineProperty(crypto,'randomUUID',{ configurable:true,value:()=> '40000000-0000-4000-8000-000000000001' }); });
test('shared source and destination survive auth and a refused import, scoped to the chosen account',async()=>{
  const first=beginShareCapture('https://example.com/recette');expect(readShareCapture('anonymous')).toEqual(first);
  mockOwner=A;const bound=bindShareCapture(A)!;expect(bound.owner).toBe(A);expect(readShareCapture('anonymous')).toBeNull();
  jest.mocked(importsApi.capture).mockRejectedValueOnce(new Error('Import refusé'));
  await expect(captureSharedRecipe(A)).rejects.toThrow('Import refusé');
  expect(readShareCapture(A)).toMatchObject({ source:first.source,status:'failed',destination:'/kitchen/recipes?tab=import' });
  expect(bindShareCapture(B)).toBeNull();expect(readShareCapture(B)).toBeNull();
});
test('a duplicate opens the existing saved recipe and never erases the source on close',async()=>{
  mockOwner=A;beginShareCapture('https://example.com/recette',A);
  jest.mocked(importsApi.capture).mockResolvedValueOnce({ import:{ id:'import',recipe_id:'recipe' } as never,duplicate:true });
  const result=await captureSharedRecipe(A);
  expect(result).toMatchObject({ status:'saved',duplicate:true,destination:'/kitchen/recipes/recipe',source:'https://example.com/recette' });
  await captureSharedRecipe(A);expect(importsApi.capture).toHaveBeenCalledTimes(1);
});
test('an unresolved capture cannot be silently replaced or captured by a different account',async()=>{
  mockOwner=A;beginShareCapture('https://example.com/one',A);
  expect(()=>beginShareCapture('https://example.com/two',A)).toThrow('précédent');
  mockOwner=B;await expect(captureSharedRecipe(A)).rejects.toThrow('Reconnectez');
  expect(importsApi.capture).not.toHaveBeenCalled();
});
