import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const RECYCLER_PERSONAS = [
  { id: 1, name: 'GreenCycle India Pvt Ltd',    auth: 'KSPCB/EWM/2024/001' },
  { id: 2, name: 'EcoReclaim Systems',           auth: 'KSPCB/EWM/2024/002' },
  { id: 3, name: 'MetalMart Recyclers',          auth: 'KSPCB/MWM/2024/003' },
  { id: 4, name: 'SafeDispose e-Waste Hub',      auth: 'KSPCB/EWM/2024/004' },
  { id: 5, name: 'PaperPath Eco Solutions',      auth: 'KSPCB/BWM/2024/005' },
];

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const { t } = useTranslation();
  const map = {
    pending_confirmation: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300',   label: t('recycler.pendingBadge') },
    recycler_confirmed:   { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: t('recycler.confirmedBadge') },
    completed:            { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300',       label: t('recycler.completedBadge') },
  };
  const s = map[status] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

// ── Single handover card ──────────────────────────────────────────────────────
function HandoverCard({ handover, recyclerId, onConfirmed }) {
  const { t } = useTranslation();
  const [confirming, setConfirming]     = useState(false);
  const [error, setError]               = useState(null);
  const [recyclerLat, setRecyclerLat]   = useState('');
  const [recyclerLon, setRecyclerLon]   = useState('');
  const [notes, setNotes]               = useState('');
  const [gpsStatus, setGpsStatus]       = useState('idle');

  const captureGps = () => {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); return; }
    setGpsStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRecyclerLat(pos.coords.latitude.toFixed(6));
        setRecyclerLon(pos.coords.longitude.toFixed(6));
        setGpsStatus('ok');
      },
      () => setGpsStatus('failed'),
      { timeout: 6000 }
    );
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await axios.put(`/api/traceability/${handover.traceability_id}/confirm`, {
        recycler_id: recyclerId,
        recycler_lat: recyclerLat || undefined,
        recycler_lon: recyclerLon || undefined,
        notes: notes || undefined,
      });
      onConfirmed(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Confirmation failed. Please try again.');
      setConfirming(false);
    }
  };

  const gpsButtonLabel = () => {
    if (gpsStatus === 'fetching') return t('recycler.gpsCapturing');
    if (gpsStatus === 'ok')       return t('recycler.gpsOk');
    return t('recycler.captureGps');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      {/* Card header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-mono mb-1">{handover.handover_ref}</p>
          <p className="text-white font-bold">{handover.lot_ref}</p>
        </div>
        <StatusPill status={handover.status} />
      </div>

      <div className="p-5 space-y-4">
        {/* Collector & Material Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">{t('recycler.collectorLabel')}</p>
            <p className="text-sm font-semibold text-slate-800">{handover.collector_name}</p>
            <p className="text-xs text-slate-500">{handover.collector_phone}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">{t('recycler.materialLabel')}</p>
            <p className="text-sm font-semibold text-slate-800">{handover.material_name || '—'}</p>
            <p className="text-xs text-slate-500">{handover.material_category}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">{t('recycler.weightLabel')}</p>
            <p className="text-sm font-bold text-slate-800 font-mono">{handover.weight_at_handover} kg</p>
            {handover.weight_variance_pct !== 0 && (
              <p className={`text-xs font-mono ${Math.abs(handover.weight_variance_pct) > 5 ? 'text-red-500' : 'text-slate-400'}`}>
                {handover.weight_variance_pct > 0 ? '+' : ''}{handover.weight_variance_pct}% vs logged
              </p>
            )}
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">{t('recycler.agreedValueLabel')}</p>
            <p className="text-sm font-black text-emerald-700 font-mono">
              ₹{Number(handover.final_price).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Collector GPS */}
        {handover.gps_collection && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs">
            <p className="font-bold text-blue-700 mb-1">📍 Collector GPS (at collection point)</p>
            <p className="font-mono text-blue-600">
              {handover.gps_collection.lat?.toFixed(5)}, {handover.gps_collection.lon?.toFixed(5)}
              {handover.gps_collection.accuracy && ` ± ${Math.round(handover.gps_collection.accuracy)}m`}
              <span className="ml-2 text-blue-400">({handover.gps_collection.source})</span>
            </p>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Initiated: <span className="font-mono text-slate-600">{new Date(handover.created_at).toLocaleString()}</span>
        </p>

        {handover.notes && (
          <p className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3">{handover.notes}</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── Confirm Section ── */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">{t('recycler.confirmReceipt')}</p>

          {/* Recycler GPS capture */}
          <div className="flex items-center gap-2">
            <button
              onClick={captureGps}
              disabled={gpsStatus === 'fetching'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {gpsStatus === 'fetching' ? (
                <><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>{t('recycler.gpsCapturing')}</>
              ) : (
                gpsButtonLabel()
              )}
            </button>
            {gpsStatus === 'ok' && (
              <span className="text-xs font-mono text-emerald-600">{recyclerLat}, {recyclerLon}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('recycler.latLabel')}</label>
              <input type="number" step="any" placeholder="e.g. 13.028"
                value={recyclerLat} onChange={e => setRecyclerLat(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:border-emerald-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('recycler.lonLabel')}</label>
              <input type="number" step="any" placeholder="e.g. 77.518"
                value={recyclerLon} onChange={e => setRecyclerLon(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:border-emerald-400 transition-all"
              />
            </div>
          </div>

          <input
            type="text"
            placeholder={t('recycler.notesLabel')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-400 transition-all"
          />

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {confirming
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> {t('recycler.confirming')}</>
              : `✓ ${t('recycler.confirmReceipt')}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Recycler Portal ──────────────────────────────────────────────────────
export default function RecyclerPortal() {
  const { t } = useTranslation();
  const [activeRecycler, setActiveRecycler] = useState(RECYCLER_PERSONAS[0]);
  const [pending, setPending]               = useState([]);
  const [history, setHistory]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [activeTab, setActiveTab]           = useState('pending'); // 'pending' | 'history'

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        axios.get(`/api/traceability/pending?recycler_id=${activeRecycler.id}`),
        axios.get(`/api/traceability/all?recycler_id=${activeRecycler.id}`),
      ]);
      setPending(pendingRes.data.data || []);
      setHistory(historyRes.data.data || []);
    } catch (err) {
      console.error('Failed to load handovers:', err);
    } finally {
      setLoading(false);
    }
  }, [activeRecycler.id]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleConfirmed = (updatedRecord) => {
    setPending(prev => prev.filter(p => p.traceability_id !== updatedRecord.traceability_id));
    setHistory(prev => [
      {
        traceability_id: updatedRecord.traceability_id,
        handover_ref: updatedRecord.handover_ref,
        lot_ref: updatedRecord.lot_ref,
        status: updatedRecord.status,
        recycler_confirmed_at: updatedRecord.recycler_confirmed_at,
      },
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Portal header */}
      <div className="bg-slate-900 text-white py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-2xl shadow-lg">
              ♻️
            </div>
            <div>
              <h1 className="text-2xl font-black">{t('recycler.title')}</h1>
              <p className="text-slate-400 text-sm">{t('recycler.subtitle')}</p>
            </div>
          </div>

          {/* Recycler selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-400 font-medium">{t('recycler.selectPersona')}:</span>
            <select
              value={activeRecycler.id}
              onChange={e => {
                const r = RECYCLER_PERSONAS.find(p => p.id === parseInt(e.target.value, 10));
                setActiveRecycler(r);
              }}
              className="bg-slate-800 border border-slate-700 text-white text-sm font-semibold rounded-xl px-4 py-2 focus:border-emerald-500 focus:outline-none min-w-[280px]"
            >
              {RECYCLER_PERSONAS.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
              {activeRecycler.auth}
            </span>
            <button
              onClick={fetchPending}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                : '↻'
              }
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-black text-amber-600">{pending.length}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t('ledger.pending')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-emerald-600">
              {history.filter(h => h.status === 'recycler_confirmed').length}
            </p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t('recycler.confirmedBadge')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-800">{history.length}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t('ledger.allRecords')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {[
            { key: 'pending', label: `⏳ ${t('recycler.pendingHandovers')} (${pending.length})` },
            { key: 'history', label: `📋 ${t('ledger.allRecords')} (${history.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending handovers */}
        {activeTab === 'pending' && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <span className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></span>
                <p className="text-sm">{t('recycler.pendingHandovers')}…</p>
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-5xl mb-4">✅</p>
                <p className="text-lg font-semibold text-slate-600">{t('recycler.noHandovers')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {pending.map(h => (
                  <HandoverCard
                    key={h.traceability_id}
                    handover={h}
                    recyclerId={activeRecycler.id}
                    onConfirmed={handleConfirmed}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">{t('lots.noLots')}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Handover Ref', 'Lot Ref', t('recycler.collectorLabel'), t('recycler.weightLabel'), t('recycler.agreedValueLabel'), t('recycler.statusLabel'), t('ledger.dateCol')].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={h.traceability_id} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 truncate max-w-[180px]">{h.handover_ref}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 text-xs">{h.lot_ref}</td>
                      <td className="px-4 py-3 text-slate-700">{h.collector_name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{h.weight_at_handover} kg</td>
                      <td className="px-4 py-3 font-bold text-emerald-700 font-mono">₹{Number(h.final_price).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><StatusPill status={h.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {h.recycler_confirmed_at ? new Date(h.recycler_confirmed_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
