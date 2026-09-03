/**
 * OfflineIndicator — global floating status chip.
 *
 * Shows: Online (hidden) | Offline | Syncing N changes | All synced | Error
 *
 * UX rules:
 * - Hidden when online and no pending operations and no recent sync
 * - Never uses color alone — always icon + text
 * - "All synced" auto-dismisses after 4 seconds
 * - Accessible: role="status", aria-live="polite"
 * - Clicking the chip opens/closes SyncPanel when there are pending items
 */

import { useState, useEffect, useRef } from 'react';
import { useNetworkStatus } from '../services/offline/networkStatus.js';
import { SyncPanel } from './SyncPanel.jsx';
import './OfflineIndicator.css';

export function OfflineIndicator() {
  const {
    online,
    syncing,
    pendingCount,
    authExpired,
    lastSyncError,
    lastSyncedAt,
    syncMessage,
  } = useNetworkStatus();

  const [panelOpen, setPanelOpen] = useState(false);
  const [showSynced, setShowSynced] = useState(false);
  const dismissTimer = useRef(null);

  // Track when sync completes to show brief "All synced" message
  const prevSyncedAt = useRef(null);
  useEffect(() => {
    if (lastSyncedAt && lastSyncedAt !== prevSyncedAt.current) {
      prevSyncedAt.current = lastSyncedAt;
      setShowSynced(true);
      clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setShowSynced(false), 4000);
    }
  }, [lastSyncedAt]);

  useEffect(() => () => clearTimeout(dismissTimer.current), []);

  // Determine chip variant
  const getVariant = () => {
    if (authExpired) return 'auth';
    if (!online) return 'offline';
    if (syncing) return 'syncing';
    if (lastSyncError) return 'error';
    if (showSynced) return 'synced';
    if (pendingCount > 0) return 'pending';
    return 'online'; // hidden
  };

  const variant = getVariant();

  // Hide the chip when fully online with nothing pending
  if (variant === 'online') return null;

  const VARIANTS = {
    offline: { icon: '📶', label: syncMessage, cls: 'offline-indicator--offline' },
    syncing: { icon: '↻', label: syncMessage, cls: 'offline-indicator--syncing', spin: true },
    pending: { icon: '⏳', label: syncMessage, cls: 'offline-indicator--pending' },
    synced:  { icon: '✓', label: 'All changes synced', cls: 'offline-indicator--synced' },
    error:   { icon: '⚠', label: syncMessage, cls: 'offline-indicator--error' },
    auth:    { icon: '🔒', label: syncMessage, cls: 'offline-indicator--auth' },
  };

  const v = VARIANTS[variant];
  const canOpenPanel = pendingCount > 0 || lastSyncError;

  return (
    <>
      <div
        className={`offline-indicator ${v.cls}`}
        role="status"
        aria-live="polite"
        aria-label={v.label}
      >
        <button
          className="offline-indicator__btn"
          onClick={() => canOpenPanel && setPanelOpen((o) => !o)}
          aria-expanded={canOpenPanel ? panelOpen : undefined}
          aria-controls={canOpenPanel ? 'sync-panel' : undefined}
          style={{ cursor: canOpenPanel ? 'pointer' : 'default' }}
        >
          <span
            className={`offline-indicator__icon ${v.spin ? 'offline-indicator__icon--spin' : ''}`}
            aria-hidden="true"
          >
            {v.icon}
          </span>
          <span className="offline-indicator__text">{v.label}</span>
          {canOpenPanel && (
            <span className="offline-indicator__chevron" aria-hidden="true">
              {panelOpen ? '▲' : '▼'}
            </span>
          )}
        </button>
      </div>

      {panelOpen && (
        <SyncPanel
          id="sync-panel"
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
