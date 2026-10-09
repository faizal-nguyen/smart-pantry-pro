import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthenticatedUser } from './useAuthenticatedUser';
export function useRoutineCatalog(search:string) {
  const user=useAuthenticatedUser();
  return useInfiniteQuery({ queryKey:['routine-catalog',user.id,search],initialPageParam:0,queryFn:async({ pageParam,signal }) => {
    let query=supabase.from('recipes_catalog').select('*',{ count:'exact' }).order('title').range(pageParam*20,pageParam*20+19).abortSignal(signal);
    if (search.trim()) query=query.ilike('title',`%${search.trim().replace(/[\\%_]/g,'\\$&')}%`);
    const { data,error,count }=await query;
    if (error) throw new Error('Le catalogue ne peut pas être lu. Réessayez.');
    return { rows:data ?? [],next:(pageParam+1)*20<(count ?? 0) ? pageParam+1 : undefined };
  },getNextPageParam:page=>page.next });
}
