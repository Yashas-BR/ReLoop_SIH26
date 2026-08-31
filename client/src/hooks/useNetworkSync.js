import { useState, useEffect } from 'react';
import { syncManager } from '../utils/syncManager';

export function useNetworkSync() {
  const [syncState, setSyncState] = useState(syncManager.getState());

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((newState) => {
      setSyncState(newState);
    });
    return unsubscribe;
  }, []);

  const triggerSync = () => syncManager.syncPending();
  const setSimulatedOffline = (val) => syncManager.setSimulatedOffline(val);

  return {
    ...syncState,
    triggerSync,
    setSimulatedOffline,
  };
}
