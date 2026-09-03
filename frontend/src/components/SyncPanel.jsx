/**
 * SyncPanel — slide-up panel listing pending/failed sync queue items.
 *
 * Accessible via the OfflineIndicator chip when there are pending operations.
 * Shows user-friendly labels only — does NOT expose raw payloads.
 *
 * Manual retry is available for 'failed' items.
 */

import { useEffect, useState, useCallback } from 'react';
import { getQueue, resetForRetry } from '../services/offline/syncQueue.js';
import { processSyncQueue } from '../services/offline/syncManager.js';
import { isOnline } from '../services/offline/offlineUtils.js';
import './SyncPanel.css';

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// Human-readable labels for operations
const OPERATION_LABELS = {
  initiateHandover: 'Initiate Handover',
};

const STATUS_LABELS = {
  pending:  { label: 'Pending sync', cls: 'sync-item--pending' },
  syncing:  { label: 'Syncing…',     cls: 'sync-item--syncing' },
  failed:   { label: 'Failed',       cls: 'sync-item--failed' },
};

export function SyncPanel({ id, onClose }) {
  const [items, setItems] = useState([]);
  const [retrying, setRetrying] = useState(null);

  const load = useCallback(async () => {
    const q = await getQueue();
    setItems(q);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleRetry(item) {
    if (!isOnline()) return;
    setRetrying(item.id);
    try {
      await resetForRetry(item.id);
      await processSyncQueue();
      await load();
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div
      id={id}
      className="sync-panel animate-scale-in"
      role="dialog"
      aria-label="Pending sync operations"
      aria-modal="false"
    >
      <div className="sync-panel__header">
        <h2 className="sync-panel__title">
          <span aria-hidden="true">🔄</span> Pending Sync
        </h2>
        <button
          className="sync-panel__close btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close sync panel"
        >
          ✕
        </button>
      </div>

      <p className="sync-panel__subtitle">
        These operations were saved while offline and will sync automatically when connected.
      </p>

      {items.length === 0 ? (
        <div className="sync-panel__empty">
          <span aria-hidden="true">✓</span>
          <p>All operations synced</p>
        </div>
      ) : (
        <ul className="sync-panel__list" aria-label="Sync queue items">
          {items.map((item) => {
            const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
            const opLabel = OPERATION_LABELS[item.operation] ?? item.operation;
            return (
              <li
                key={item.id}
                className={`sync-item ${st.cls}`}
              >
                <div className="sync-item__info">
                  <p className="sync-item__op">{opLabel}</p>
                  {item.entityId && (
                    <p className="sync-item__entity">
                      Lot: <span className="font-mono">{item.entityId}</span>
                    </p>
                  )}
                  <p className="sync-item__time">{fmtDate(item.createdAt)}</p>
                  {item.retryCount > 0 && (
                    <p className="sync-item__retries">
                      Retry attempt {item.retryCount}
                    </p>
                  )}
                  {item.lastError && item.status === 'failed' && (
                    <p className="sync-item__error" role="alert">
                      {item.lastError}
                    </p>
                  )}
                </div>

                <div className="sync-item__right">
                  <span
                    className="sync-item__status-pill"
                    aria-label={`Status: ${st.label}`}
                  >
                    {st.label}
                  </span>
                  {item.status === 'failed' && isOnline() && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleRetry(item)}
                      disabled={retrying === item.id}
                      aria-label={`Retry ${opLabel}`}
                    >
                      {retrying === item.id ? '…' : 'Retry'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!isOnline() && (
        <p className="sync-panel__offline-note" role="note">
          <span aria-hidden="true">📶</span>
          You're offline. Items will sync automatically when you reconnect.
        </p>
      )}
    </div>
  );
}
