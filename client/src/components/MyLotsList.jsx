import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getAllOfflineLots } from '../db/offlineDb';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { getLocalizedMaterial } from '../i18n';

export default function MyLotsList({ onSelectLot, onLogNew }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const { isOnline, isSyncing, pendingCount, triggerSync } = useNetworkSync();

  const [serverLots, setServerLots] = useState([]);
  const [offlineLots, setOfflineLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLots = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Fetch offline stored lots from IndexedDB
    try {
      const local = await getAllOfflineLots();
      setOfflineLots(local || []);
    } catch (e) {
      console.warn('Could not load offline lots:', e);
    }

    // 2. Fetch server lots if online
    if (isOnline) {
      try {
        const res = await axios.get('/api/lots');
        if (res.data.status === 'ok') {
          setServerLots(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load server lots:', err);
        setError('Could not reach backend server. Showing local IndexedDB records.');
      }
    } else {
      setError('Offline mode: Showing records stored locally in IndexedDB.');
    }

    setLoading(false);
  }, [isOnline]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  // Combine and deduplicate
  const pendingOfflineLots = offlineLots.filter(l => l.sync_status === 'pending_sync');
  const allDisplayCount = serverLots.length + pendingOfflineLots.length;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <span>📋</span>
            <span>{t('nav.myLots')}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {t('lots.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingOfflineLots.length > 0 && isOnline && (
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
            >
              <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
              <span>{t('lots.syncBtn', { count: pendingOfflineLots.length })}</span>
            </button>
          )}

          <button
            onClick={fetchLots}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>↻</span>
            <span>{t('sync.syncNow')}</span>
          </button>

          <button
            onClick={onLogNew}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-950 font-bold text-xs transition-all shadow-md shadow-brand-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕</span>
            <span>{t('nav.createLot')}</span>
          </button>
        </div>
      </div>

      {/* Offline Status Warning Banner if pending lots exist */}
      {pendingOfflineLots.length > 0 && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-xs font-bold text-amber-300">
                {pendingOfflineLots.length} Lot(s) Stored Locally in IndexedDB (Pending Sync)
              </p>
              <p className="text-[11px] text-amber-200/80">
                Created offline on this device. When online, these will automatically POST to SQLite.
              </p>
            </div>
          </div>
          {isOnline && (
            <button
              onClick={triggerSync}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-surface-950 font-black text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              {t('sync.syncNow')}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-mono">Loading lots from IndexedDB & SQLite…</p>
        </div>
      ) : allDisplayCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center max-w-lg mx-auto space-y-4">
          <span className="text-5xl">📦</span>
          <h2 className="text-lg font-bold text-white">{t('lots.noLots')}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Start by logging your first batch of collected scrap or e-waste. It works offline and online!
          </p>
          <button
            onClick={onLogNew}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-950 font-bold text-xs transition-all cursor-pointer"
          >
            {t('lots.logFirstBtn')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Render Pending Offline Lots First */}
          {pendingOfflineLots.map((offlineLot) => (
            <div
              key={`offline-${offlineLot.id}`}
              className="bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500 animate-pulse" />
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    {offlineLot.temp_ref}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                    ⏳ Pending Sync
                  </span>
                </div>

                <div className="mb-3">
                  <h3 className="text-base font-bold text-white">
                    {getLocalizedMaterial(offlineLot.material_name, currentLang) || 'Scrap Batch'}
                  </h3>
                  <p className="text-xs text-slate-400 capitalize">
                    {offlineLot.material_category} • {offlineLot.condition}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs font-mono mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Weight:</span>
                    <span className="font-bold text-white">{offlineLot.weight_kg} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Est. Value:</span>
                    <span className="font-bold text-amber-300">₹{offlineLot.estimated_value}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  📍 Stored in IndexedDB: {new Date(offlineLot.created_at).toLocaleTimeString()}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-amber-400 font-semibold">IndexedDB Local Record</span>
                {isOnline && (
                  <button
                    onClick={triggerSync}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-surface-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Sync Now ↻
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 2. Render Server SQLite Lots */}
          {serverLots.map((lot) => (
            <div
              key={`server-${lot.id}`}
              onClick={() => onSelectLot(lot.id)}
              className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-5 shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    {lot.lot_ref}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ✓ {lot.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl">
                    📦
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                      {lot.items?.[0]?.material_sub_category 
                        ? getLocalizedMaterial(lot.items[0].material_sub_category, currentLang) 
                        : 'Material Lot'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lot.items?.[0]?.material_category || 'Scrap'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs font-mono mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Weight:</span>
                    <span className="font-bold text-slate-200">{lot.total_weight_kg} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Est. Value:</span>
                    <span className="font-bold text-brand-400">₹{lot.estimated_value}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-mono">
                  Created: {new Date(lot.created_at).toLocaleString()}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-brand-400 group-hover:text-brand-300">
                <span>View Match & Handover</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
