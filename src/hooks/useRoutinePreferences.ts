import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthenticatedUser } from './useAuthenticatedUser';
export interface RoutinePreferences {
  user_id: string; introduction: 'new'|'stock'|'recipe'|'done'|'skipped'; stock_view: 'list'|'grid'; updated_at: string;
}
export function useRoutinePreferences() {
  const user = useAuthenticatedUser(), client = useQueryClient();
  const key = ['mobile-routine',user.id];
  const query = useQuery({ queryKey: key, queryFn: async (): Promise<RoutinePreferences> => {
    const { data,error } = await supabase.from('mobile_routine_preferences').select('*').eq('user_id',user.id).maybeSingle();
    if (error) throw new Error('Les préférences de routine ne peuvent pas être lues. Réessayez.');
    return data ?? { user_id:user.id,introduction:'new',stock_view:'list',updated_at:new Date().toISOString() };
  } });
  const update = async (patch: Partial<Pick<RoutinePreferences,'introduction'|'stock_view'>>) => {
    const session = await supabase.auth.getSession();
    if (session.data.session?.user.id !== user.id) throw new Error('Reconnectez-vous à ce compte pour enregistrer ce choix.');
    if (!query.data || query.isError) throw new Error('Relisez les préférences avant de les modifier.');
    // Only change the chosen fields: a second device may have completed the introduction.
    const { data,error } = await supabase.from('mobile_routine_preferences').upsert({ user_id:user.id,...patch,updated_at:new Date().toISOString() },{ onConflict:'user_id' }).select().single();
    const current = await supabase.auth.getSession();
    if (current.data.session?.user.id !== user.id) throw new Error('Le compte a changé. Reprenez avec le compte précédent.');
    if (error || !data) throw new Error('Choix non enregistré. Réessayez.');
    client.setQueryData(key,data);
  };
  return { ...query,update };
}
