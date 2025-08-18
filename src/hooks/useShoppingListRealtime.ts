import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingListItem, 
  LiveIndicator, 
  ShoppingListRealtimeEvent 
} from '@/types/shopping-list';

interface UseShoppingListRealtimeProps {
  shoppingListId: string;
  userId?: string;
  onItemUpdate?: (item: ShoppingListItem) => void;
  onItemAdded?: (item: ShoppingListItem) => void;
  onItemRemoved?: (itemId: string) => void;
  onUserJoined?: (user: LiveIndicator) => void;
  onUserLeft?: (userId: string) => void;
  onUserMovedToSection?: (userId: string, sectionId: string) => void;
}

interface UseShoppingListRealtimeReturn {
  liveUsers: LiveIndicator[];
  isConnected: boolean;
  joinSession: (currentSection?: string) => void;
  leaveSession: () => void;
  updateCurrentSection: (sectionId: string) => void;
  broadcastItemUpdate: (item: ShoppingListItem, action: 'added' | 'updated' | 'purchased' | 'removed') => void;
}

export const useShoppingListRealtime = ({
  shoppingListId,
  userId,
  onItemUpdate,
  onItemAdded,
  onItemRemoved,
  onUserJoined,
  onUserLeft,
  onUserMovedToSection
}: UseShoppingListRealtimeProps): UseShoppingListRealtimeReturn => {
  const [liveUsers, setLiveUsers] = useState<LiveIndicator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Join live shopping session
  const joinSession = useCallback(async (currentSection?: string) => {
    if (!userId || currentSession) return;

    try {
      const { data, error } = await supabase
        .from('live_shopping_sessions')
        .upsert({
          shopping_list_id: shoppingListId,
          user_id: userId,
          current_section: currentSection,
          is_active: true,
          last_seen: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data.id);
      setIsConnected(true);
      
      // Get current user info for live indicator
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const liveIndicator: LiveIndicator = {
          user_id: userId,
          user_name: userData.user.email || 'Utilisateur',
          current_section: currentSection,
          is_active: true,
          last_seen: new Date().toISOString()
        };
        
        onUserJoined?.(liveIndicator);
      }
    } catch (error) {
      console.error('Error joining live session:', error);
      toast({
        variant: "destructive",
        title: "Erreur de synchronisation",
        description: "Impossible de rejoindre la session en temps réel."
      });
    }
  }, [shoppingListId, userId, currentSession, onUserJoined, toast]);

  // Leave live shopping session
  const leaveSession = useCallback(async () => {
    if (!userId || !currentSession) return;

    try {
      await supabase
        .from('live_shopping_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSession);

      setCurrentSession(null);
      setIsConnected(false);
      onUserLeft?.(userId);
    } catch (error) {
      console.error('Error leaving live session:', error);
    }
  }, [userId, currentSession, onUserLeft]);

  // Update current section
  const updateCurrentSection = useCallback(async (sectionId: string) => {
    if (!userId || !currentSession) return;

    try {
      await supabase
        .from('live_shopping_sessions')
        .update({
          current_section: sectionId,
          last_seen: new Date().toISOString()
        })
        .eq('id', currentSession);

      onUserMovedToSection?.(userId, sectionId);
    } catch (error) {
      console.error('Error updating current section:', error);
    }
  }, [userId, currentSession, onUserMovedToSection]);

  // Broadcast item update
  const broadcastItemUpdate = useCallback(async (
    item: ShoppingListItem, 
    action: 'added' | 'updated' | 'purchased' | 'removed'
  ) => {
    if (!userId) return;

    try {
      const event: ShoppingListRealtimeEvent = {
        type: action === 'added' ? 'item_added' :
              action === 'updated' ? 'item_updated' :
              action === 'purchased' ? 'item_purchased' : 'item_removed',
        payload: { item },
        timestamp: new Date().toISOString(),
        user_id: userId
      };

      // Broadcast using Supabase realtime
      await supabase
        .channel(`shopping_list:${shoppingListId}`)
        .send({
          type: 'broadcast',
          event: 'shopping_update',
          payload: event
        });

    } catch (error) {
      console.error('Error broadcasting item update:', error);
    }
  }, [userId, shoppingListId]);

  // Fetch current live users
  const fetchLiveUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_shopping_sessions')
        .select(`
          *,
          user:auth.users(id, email)
        `)
        .eq('shopping_list_id', shoppingListId)
        .eq('is_active', true)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

      if (error) throw error;

      const users: LiveIndicator[] = (data || []).map(session => ({
        user_id: session.user_id,
        user_name: session.user?.email || 'Utilisateur',
        current_section: session.current_section,
        is_active: true,
        last_seen: session.last_seen
      }));

      setLiveUsers(users);
    } catch (error) {
      console.error('Error fetching live users:', error);
    }
  }, [shoppingListId]);

  // Keep session alive
  const keepSessionAlive = useCallback(async () => {
    if (!currentSession) return;

    try {
      await supabase
        .from('live_shopping_sessions')
        .update({
          last_seen: new Date().toISOString()
        })
        .eq('id', currentSession);
    } catch (error) {
      console.error('Error keeping session alive:', error);
    }
  }, [currentSession]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!shoppingListId) return;

    let channel: any;
    let sessionKeepAliveInterval: NodeJS.Timeout;

    const setupRealtimeSubscriptions = async () => {
      // Subscribe to shopping list changes
      channel = supabase
        .channel(`shopping_list:${shoppingListId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shopping_list',
            filter: `shared_list_id=eq.${shoppingListId}`
          },
          (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            switch (eventType) {
              case 'INSERT':
                if (newRecord && newRecord.user_id !== userId) {
                  onItemAdded?.(newRecord as ShoppingListItem);
                }
                break;
              case 'UPDATE':
                if (newRecord && newRecord.user_id !== userId) {
                  onItemUpdate?.(newRecord as ShoppingListItem);
                }
                break;
              case 'DELETE':
                if (oldRecord && oldRecord.user_id !== userId) {
                  onItemRemoved?.(oldRecord.id);
                }
                break;
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_shopping_sessions',
            filter: `shopping_list_id=eq.${shoppingListId}`
          },
          (payload) => {
            // Refresh live users when sessions change
            fetchLiveUsers();
          }
        )
        .on('broadcast', { event: 'shopping_update' }, (payload) => {
          const event = payload.payload as ShoppingListRealtimeEvent;
          
          // Handle broadcast events from other users
          if (event.user_id !== userId) {
            switch (event.type) {
              case 'item_added':
                if (event.payload.item) {
                  onItemAdded?.(event.payload.item);
                }
                break;
              case 'item_updated':
              case 'item_purchased':
                if (event.payload.item) {
                  onItemUpdate?.(event.payload.item);
                }
                break;
              case 'item_removed':
                if (event.payload.item) {
                  onItemRemoved?.(event.payload.item.id);
                }
                break;
              case 'user_joined':
                if (event.payload.user) {
                  onUserJoined?.(event.payload.user);
                }
                break;
              case 'user_left':
                if (event.payload.user) {
                  onUserLeft?.(event.payload.user.user_id);
                }
                break;
            }
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Connected to real-time shopping list updates');
            fetchLiveUsers();
          }
        });

      // Keep session alive every 30 seconds
      if (currentSession) {
        sessionKeepAliveInterval = setInterval(keepSessionAlive, 30000);
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (sessionKeepAliveInterval) {
        clearInterval(sessionKeepAliveInterval);
      }
    };
  }, [
    shoppingListId, 
    userId, 
    currentSession,
    onItemUpdate, 
    onItemAdded, 
    onItemRemoved, 
    onUserJoined, 
    onUserLeft, 
    fetchLiveUsers,
    keepSessionAlive
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSession();
    };
  }, [leaveSession]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        leaveSession();
      } else if (currentSession) {
        keepSessionAlive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSession, leaveSession, keepSessionAlive]);

  return {
    liveUsers,
    isConnected,
    joinSession,
    leaveSession,
    updateCurrentSection,
    broadcastItemUpdate
  };
};