import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNetworkSync } from '../hooks/useNetworkSync';

export default function SyncIndicator() {
  const { t } = useTranslation();
  const { isOnline, isSyncing, pendingCount, isSimulatedOffline, setSimulatedOffline, triggerSync } = useNetworkSync();

  const getStatusText = () => {
    if (isSyncing)       return t('sync.syncingText', { count: pendingCount });
    if (!isOnline)       return t('sync.offlineMode', { count: pendingCount });
    if (pendingCount > 0) return t('sync.onlineReady', { count: pendingCount });
    return t('sync.onlineOk');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Real-time Status Badge */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
          isSyncing
            ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 animate-pulse'
            : !isOnline
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20'
            : pendingCount > 0
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isSyncing
              ? 'bg-blue-400 animate-spin'
              : !isOnline
              ? 'bg-amber-400 animate-ping'
              : 'bg-emerald-400'
          }`}
        />
        <span className="font-mono text-[11px]">{getStatusText()}</span>

        {/* Sync Now Action Button if online & pending items exist */}
        {isOnline && pendingCount > 0 && !isSyncing && (
          <button
            onClick={triggerSync}
            className="ml-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] uppercase font-black transition-colors cursor-pointer"
          >
            {t('sync.syncNow')}
          </button>
        )}
      </div>

      {/* Dev Toggle: Simulate Offline for Testing */}
      <button
        onClick={() => setSimulatedOffline(!isSimulatedOffline)}
        title="Toggle simulated offline mode to test IndexedDB queue"
        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
          isSimulatedOffline
            ? 'bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-400'
            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        {isSimulatedOffline ? t('sync.testOfflineOn') : t('sync.testOffline')}
      </button>
    </div>
  );
}
