/**
 * useNetworkStatus — React hook for offline/sync state.
 *
 * State shape:
 * {
 *   online          boolean   — navigator.onLine
 *   syncing         boolean   — sync is currently running
 *   pendingCount    number    — items in queue (pending + failed)
 *   authExpired     boolean   — sync paused due to auth failure
 *   lastSyncError   string|null
 *   lastSyncedAt    Date|null
 *   syncMessage     string    — human-readable status for the indicator
 * }
 *
 * Usage:
 *   const { online, syncing, pendingCount, syncMessage } = useNetworkStatus();
 */

import { useEffect, useState, useCallback } from 'react';
import { syncEvents } from './syncManager.js';
import { getPendingCount } from './syncQueue.js';

function buildMessage({ online, syncing, pendingCount, authExpired, lastSyncError }) {
  if (authExpired) return 'Session expired — reconnect to sync changes';
  if (!online) {
    if (pendingCount > 0) return `Offline — ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending sync`;
    return 'Offline — changes will sync automatically';
  }
  if (syncing) return `Syncing ${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}…`;
  if (lastSyncError) return 'Some changes could not sync — tap to retry';
  if (pendingCount > 0) return `${pendingCount} change${pendingCount > 1 ? 's' : ''} pending sync`;
  return 'Online';
}

export function useNetworkStatus() {
  const [state, setState] = useState({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncing: false,
    pendingCount: 0,
    authExpired: false,
    lastSyncError: null,
    lastSyncedAt: null,
  });

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setState((s) => ({ ...s, pendingCount: count }));
    } catch {
      // IndexedDB unavailable — ignore
    }
  }, []);

  useEffect(() => {
    // Initial count
    refreshPendingCount();

    // Native browser events
    const handleOnline = () =>
      setState((s) => ({ ...s, online: true, lastSyncError: null }));
    const handleOffline = () =>
      setState((s) => ({ ...s, online: false, syncing: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // SyncManager events
    const handlers = {
      online: () => setState((s) => ({ ...s, online: true })),
      offline: () => setState((s) => ({ ...s, online: false })),
      'sync-start': (e) =>
        setState((s) => ({ ...s, syncing: true, pendingCount: e.detail.total })),
      'sync-progress': (e) =>
        setState((s) => ({
          ...s,
          pendingCount: e.detail.total - e.detail.current,
        })),
      'sync-complete': () =>
        setState((s) => ({
          ...s,
          syncing: false,
          pendingCount: 0,
          lastSyncError: null,
          lastSyncedAt: new Date(),
        })),
      'sync-paused': () =>
        setState((s) => ({ ...s, syncing: false })),
      'sync-error': () =>
        setState((s) => ({
          ...s,
          syncing: false,
          lastSyncError: 'Some changes could not sync',
        })),
      'item-success': () => refreshPendingCount(),
      'item-failed-permanent': () => refreshPendingCount(),
      'auth-expired': (e) =>
        setState((s) => ({
          ...s,
          syncing: false,
          authExpired: true,
          lastSyncError: e.detail.message,
        })),
      'auth-resumed': () =>
        setState((s) => ({ ...s, authExpired: false, lastSyncError: null })),
    };

    const listeners = Object.entries(handlers).map(([type, fn]) => {
      const wrapped = (e) => fn(e);
      syncEvents.addEventListener(type, wrapped);
      return [type, wrapped];
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listeners.forEach(([type, fn]) => syncEvents.removeEventListener(type, fn));
    };
  }, [refreshPendingCount]);

  const syncMessage = buildMessage(state);

  return { ...state, syncMessage };
}
