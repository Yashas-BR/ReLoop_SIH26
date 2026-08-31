import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNetworkSync } from '../hooks/useNetworkSync';

export default function SyncIndicator() {
  const { t, i18n } = useTranslation();
  const { isOnline, isSyncing, pendingCount, isSimulatedOffline, setSimulatedOffline, triggerSync } = useNetworkSync();
  const currentLang = i18n.language || 'en';

  const getStatusText = () => {
    if (isSyncing) {
      if (currentLang === 'hi') return `डेटाबेस में सिंक हो रहा है (${pendingCount} लॉट)...`;
      if (currentLang === 'mr') return `डेटाबेसमध्ये सिंक होत आहे (${pendingCount} लॉट्स)...`;
      return `Syncing ${pendingCount} lot(s) to SQLite...`;
    }
    if (!isOnline) {
      if (currentLang === 'hi') return `ऑफलाइन मोड (${pendingCount} लंबित सिंक)`;
      if (currentLang === 'mr') return `ऑफलाइन मोड (${pendingCount} प्रलंबित सिंक)`;
      return `Offline Mode (${pendingCount} pending)`;
    }
    if (pendingCount > 0) {
      if (currentLang === 'hi') return `ऑनलाइन (${pendingCount} सिंक के लिए तैयार)`;
      if (currentLang === 'mr') return `ऑनलाइन (${pendingCount} सिंकसाठी सज्ज)`;
      return `Online (${pendingCount} ready to sync)`;
    }
    if (currentLang === 'hi') return 'ऑनलाइन (डेटाबेस सुरक्षित)';
    if (currentLang === 'mr') return 'ऑनलाइन (डेटाबेस सुरक्षित)';
    return 'Online (IndexedDB Ready)';
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
            Sync Now ↻
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
        {isSimulatedOffline ? '🔴 Test Offline (ON)' : '🧪 Test Offline'}
      </button>
    </div>
  );
}
