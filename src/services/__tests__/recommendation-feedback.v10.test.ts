import { postRecipeFeedback,pendingRecipeFeedback } from '../recommendationsApi';
import { apiPost } from '@/lib/api';
jest.mock('@/lib/api',()=>({ apiPost:jest.fn(),ApiError:class extends Error { code?:string;constructor(text:string,opts:{ code?:string }){ super(text);this.code=opts.code; } } }));
const owner='00000000-0000-4000-8000-000000000001',recipe={ id:'30000000-0000-4000-8000-000000000001',source:'user_recipes' as const };
beforeEach(()=>{ localStorage.clear();jest.clearAllMocks();Object.defineProperty(crypto,'randomUUID',{ configurable:true,value:()=> '40000000-0000-4000-8000-000000000001' }); });
test('feedback keeps exact identity on lost reply, cannot change pending kind and remains owner bound',async()=>{
  jest.mocked(apiPost).mockRejectedValueOnce(new Error('réponse perdue')).mockResolvedValueOnce({ id:'saved' });
  await expect(postRecipeFeedback(owner,{ recipe,feedback:'not_today',event_id:null })).rejects.toThrow('perdue');
  const command=pendingRecipeFeedback(owner);
  await expect(postRecipeFeedback(owner,{ recipe,feedback:'dislike',event_id:null })).rejects.toMatchObject({ code:'FEEDBACK_PENDING' });
  expect(apiPost).toHaveBeenCalledTimes(1);
  await postRecipeFeedback(owner,{ recipe,feedback:'not_today',event_id:null });
  expect(apiPost).toHaveBeenLastCalledWith('/v1/recommendations/feedback',command,{ expectedUserId:owner });
  expect(pendingRecipeFeedback(owner)).toBeNull();expect(pendingRecipeFeedback('B')).toBeNull();
});
