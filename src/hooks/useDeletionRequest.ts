import { useCallback, useEffect, useRef, useState } from 'react';

import { getPrivacyDeleteRequest, type DeletionRequestView } from '@/services/privacyApi';

interface DeletionRequestState {
  /** Dernière demande du compte, `null` s'il n'y en a pas, `undefined` si elle n'a pas pu être lue. */
  request: DeletionRequestView | null | undefined;
  refresh: () => Promise<void>;
}

/**
 * État de la dernière demande de suppression du compte connecté. Une réponse
 * arrivée après un changement de compte est ignorée.
 */
export function useDeletionRequest(owner?: string): DeletionRequestState {
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const [loaded, setLoaded] = useState<{ owner?: string; request: DeletionRequestView | null | undefined }>({ request: undefined });

  const refresh = useCallback(async () => {
    if (!owner) return;
    try {
      const { request } = await getPrivacyDeleteRequest(owner);
      if (ownerRef.current === owner) setLoaded({ owner, request });
    } catch {
      if (ownerRef.current === owner) setLoaded({ owner, request: undefined });
    }
  }, [owner]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { request: loaded.owner === owner ? loaded.request : undefined, refresh };
}
