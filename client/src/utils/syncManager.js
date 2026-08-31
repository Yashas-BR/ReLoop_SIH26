import axios from 'axios';
import { getPendingLots, markLotSynced, getAllOfflineLots } from '../db/offlineDb';

class SyncManager {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSimulatedOffline = false;
    this.isSyncing = false;
    this.pendingCount = 0;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      // Initial count check
      this.refreshPendingCount();
    }
  }

  // Subscribe to sync & network state changes
  subscribe(callback) {
    this.listeners.add(callback);
    // Call immediately with current state
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error('Sync listener error:', e); }
    });
  }

  getState() {
    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;
    return {
      isOnline: effectiveOnline,
      rawNavigatorOnline: this.isOnline,
      isSimulatedOffline: this.isSimulatedOffline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
    };
  }

  // Toggle simulated offline mode for testing
  setSimulatedOffline(val) {
    this.isSimulatedOffline = !!val;
    this.notify();
    if (!this.isSimulatedOffline && this.isOnline) {
      this.syncPending();
    }
  }

  async handleNetworkChange(online) {
    this.isOnline = online;
    console.log(`[SyncManager] Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
    await this.refreshPendingCount();
    this.notify();

    if (online && !this.isSimulatedOffline) {
      console.log('[SyncManager] Connectivity restored. Triggering automatic background sync...');
      this.syncPending();
    }
  }

  async refreshPendingCount() {
    try {
      const pending = await getPendingLots();
      this.pendingCount = pending.length;
      this.notify();
      return this.pendingCount;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Sync all pending records from IndexedDB to backend SQLite API
   */
  async syncPending() {
    if (this.isSyncing) return { syncedCount: 0, failedCount: 0 };
    if (!this.isOnline || this.isSimulatedOffline) {
      console.log('[SyncManager] Cannot sync while offline.');
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pendingLots = await getPendingLots();
      console.log(`[SyncManager] Found ${pendingLots.length} pending lot(s) in IndexedDB.`);

      for (const lot of pendingLots) {
        try {
          const formData = new FormData();
          formData.append('collector_id', lot.collector_id || 1);
          formData.append('material_id', lot.material_id);
          formData.append('weight_kg', lot.weight_kg);
          formData.append('condition', lot.condition || 'good');
          formData.append('source_type', lot.source_type || 'household');
          formData.append('notes', lot.notes || `[Offline Created] TempRef: ${lot.temp_ref}`);
          formData.append('pickup_address', lot.pickup_address || '');
          if (lot.latitude) formData.append('latitude', lot.latitude);
          if (lot.longitude) formData.append('longitude', lot.longitude);

          // Convert stored base64 image data URL to Blob if present
          if (lot.photo_data_url && lot.photo_data_url.startsWith('data:image')) {
            try {
              const res = await fetch(lot.photo_data_url);
              const blob = await res.blob();
              formData.append('photo', blob, `offline_photo_${lot.id}.jpg`);
            } catch (e) {
              console.warn('[SyncManager] Could not convert photo blob:', e);
            }
          }

          console.log(`[SyncManager] POSTing queued lot ${lot.temp_ref} to /api/lots...`);
          const response = await axios.post('/api/lots', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (response.data.status === 'ok') {
            const serverLotId = response.data.lot_id;
            const serverLotRef = response.data.lot_ref;

            await markLotSynced(lot.id, serverLotId, serverLotRef);
            syncedCount++;
            console.log(`[SyncManager] ✅ Lot ${lot.temp_ref} SYNCED -> Server Lot #${serverLotId} (${serverLotRef})`);
          }
        } catch (postErr) {
          failedCount++;
          console.error(`[SyncManager] ❌ Failed to sync lot ${lot.temp_ref}:`, postErr.message);
        }
      }
    } catch (err) {
      console.error('[SyncManager] Global sync error:', err);
    } finally {
      this.isSyncing = false;
      await this.refreshPendingCount();
      this.notify();
    }

    return { syncedCount, failedCount };
  }
}

export const syncManager = new SyncManager();
