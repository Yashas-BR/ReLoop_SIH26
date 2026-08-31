import Dexie from 'dexie';

// Initialize IndexedDB with Dexie.js
export const db = new Dexie('ReLoopCollectorDB');

db.version(1).stores({
  offline_lots: '++id, temp_ref, collector_id, material_id, sync_status, created_at, server_lot_id',
  cached_materials: 'id, category, sub_category',
  cached_prices: 'id, material_id, buying_price, quoted_price, location',
  sync_logs: '++id, timestamp, action, status, details',
});

/**
 * Save a newly created lot to local IndexedDB
 */
export async function saveOfflineLot(lotData) {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const tempRef = `OFFLINE-${dateStr}-${randomSuffix}`;

  const record = {
    temp_ref: tempRef,
    collector_id: lotData.collector_id || 1,
    material_id: Number(lotData.material_id),
    material_name: lotData.material_name || '',
    material_category: lotData.material_category || '',
    weight_kg: Number(lotData.weight_kg),
    condition: lotData.condition || 'good',
    source_type: lotData.source_type || 'household',
    pickup_address: lotData.pickup_address || '',
    latitude: lotData.latitude || null,
    longitude: lotData.longitude || null,
    notes: lotData.notes || '',
    estimated_value: Number(lotData.estimated_value) || 0,
    photo_data_url: lotData.photo_preview || null, // store base64 preview offline
    sync_status: 'pending_sync',
    server_lot_id: null,
    server_lot_ref: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const id = await db.offline_lots.add(record);
  return { id, ...record };
}

/**
 * Get all lots waiting to be synced to backend SQLite
 */
export async function getPendingLots() {
  return await db.offline_lots
    .where('sync_status')
    .equals('pending_sync')
    .toArray();
}

/**
 * Get all offline lots (both pending and synced)
 */
export async function getAllOfflineLots() {
  return await db.offline_lots.orderBy('created_at').reverse().toArray();
}

/**
 * Mark an offline lot as successfully synced with server ID
 */
export async function markLotSynced(id, serverLotId, serverLotRef) {
  return await db.offline_lots.update(id, {
    sync_status: 'synced',
    server_lot_id: serverLotId,
    server_lot_ref: serverLotRef,
    synced_at: new Date().toISOString(),
  });
}

/**
 * Cache materials catalog in IndexedDB for offline access
 */
export async function cacheCatalog(materials = [], prices = []) {
  try {
    if (materials.length > 0) {
      await db.cached_materials.clear();
      await db.cached_materials.bulkPut(materials);
    }
    if (prices.length > 0) {
      await db.cached_prices.clear();
      await db.cached_prices.bulkPut(prices);
    }
  } catch (err) {
    console.warn('Failed to cache catalog in IndexedDB:', err);
  }
}

/**
 * Retrieve cached materials from IndexedDB
 */
export async function getCachedMaterials() {
  try {
    return await db.cached_materials.toArray();
  } catch (err) {
    return [];
  }
}
