import {act,render} from '@testing-library/react';
import {useRecipeExposure} from '../useRecipeLifecycle';
import {recordRecipeLifecycle} from '@/services/recipeLifecycle';
jest.mock('@/services/recipeLifecycle',()=>({recordRecipeLifecycle:jest.fn(async()=>undefined)}));
jest.mock('@/integrations/supabase/client',()=>({supabase:{}}));
const recipe={id:'00000000-0000-4000-8000-000000000001',source:'user_recipes' as const};
let notify:(entries:Partial<IntersectionObserverEntry>[])=>void;
const disconnect=jest.fn();
beforeEach(()=>{jest.useFakeTimers();sessionStorage.clear();jest.clearAllMocks();Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>recipe.id});
 global.IntersectionObserver=jest.fn().mockImplementation(cb=>{notify=cb;return {observe:jest.fn(),disconnect};}) as unknown as typeof IntersectionObserver;
});
afterEach(()=>jest.useRealTimers());
function Card(){const ref=useRecipeExposure('owner',recipe);return <li ref={ref}>Recette</li>;}
test('a hidden or briefly visible card is not recorded; sustained exposure is not cooking and is deduplicated',async()=>{
 const view=render(<Card/>);
 act(()=>{notify([{isIntersecting:false,intersectionRatio:0}]);jest.advanceTimersByTime(2000);});expect(recordRecipeLifecycle).not.toHaveBeenCalled();
 act(()=>{notify([{isIntersecting:true,intersectionRatio:.8}]);jest.advanceTimersByTime(500);notify([{isIntersecting:false,intersectionRatio:0}]);jest.advanceTimersByTime(1000);});expect(recordRecipeLifecycle).not.toHaveBeenCalled();
 await act(async()=>{notify([{isIntersecting:true,intersectionRatio:.8}]);jest.advanceTimersByTime(1000);});
 expect(recordRecipeLifecycle).toHaveBeenCalledWith('owner',expect.objectContaining({recipe,action:'shown'}));
 view.unmount();render(<Card/>);await act(async()=>{notify([{isIntersecting:true,intersectionRatio:1}]);jest.advanceTimersByTime(1000);});expect(recordRecipeLifecycle).toHaveBeenCalledTimes(1);expect(disconnect).toHaveBeenCalled();
});
