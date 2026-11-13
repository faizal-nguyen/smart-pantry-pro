import {saveRecipeChoice,pendingRecipeChoice,readRecipeLifecycle} from '../recipeLifecycle';
import {apiPost,apiGet} from '@/lib/api';
const OWNER='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
let mockOwner=OWNER;
jest.mock('@/lib/api',()=>({apiPost:jest.fn(),apiGet:jest.fn()}));
jest.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:mockOwner}}}})}}}));
beforeEach(()=>{localStorage.clear();jest.clearAllMocks();mockOwner=OWNER;Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>id});});
test('a lost reply preserves its identity and blocks an unrelated action until the same choice is confirmed',async()=>{
 const input={recipe:{id,source:'recipes' as const},action:'cooked' as const};
 (apiPost as jest.Mock).mockRejectedValueOnce(new Error('Lost reply'));
 await expect(saveRecipeChoice(OWNER,input)).rejects.toThrow('Lost reply');expect(pendingRecipeChoice(OWNER)?.id).toBe(id);
 await expect(saveRecipeChoice(OWNER,{...input,action:'queue'})).rejects.toThrow('précédent');
 (apiPost as jest.Mock).mockResolvedValueOnce({ids:[id]});await saveRecipeChoice(OWNER,input);
 expect((apiPost as jest.Mock).mock.calls[1][1]).toEqual((apiPost as jest.Mock).mock.calls[0][1]);expect(pendingRecipeChoice(OWNER)).toBeNull();
});
test('a changed account or mismatched receipt cannot clear the pending choice or return another account’s state',async()=>{
 (apiPost as jest.Mock).mockImplementation(async()=>{mockOwner='other';return {ids:[id]};});
 await expect(saveRecipeChoice(OWNER,{recipe:{id,source:'user_recipes'},action:'queue'})).rejects.toThrow('compte');expect(pendingRecipeChoice(OWNER)).not.toBeNull();
 (apiGet as jest.Mock).mockResolvedValue({recipes:[],eligibility:[]});await expect(readRecipeLifecycle(OWNER)).rejects.toThrow('compte');
});
