import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import MatchRecyclers from './MatchRecyclers';
import HandoverConfirm from './HandoverConfirm';

// ── Live DB Status Poller ─────────────────────────────────────────────────────
function HandoverPendingReceipt({ transaction, lotId, onViewAllLots }) {
  const { t } = useTranslation();
  const [traceStatus, setTraceStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await axios.get(`/api/traceability/lot/${lotId}`);
      setTraceStatus(res.data.data);
      setLastChecked(new Date());
    } catch (err) {
      // not yet created or error — ignore
    } finally {
      setChecking(false);
    }
  }, [lotId]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const isConfirmed = traceStatus?.status === 'recycler_confirmed';

  return (
    <div className="max-w-2xl mx-auto my-8 space-y-4">
      {/* Main receipt card */}
      <div className={`border-2 rounded-2xl p-8 text-center ${
        isConfirmed
          ? 'bg-emerald-50 border-emerald-300'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 ${
          isConfirmed ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
        }`}>
          {isConfirmed ? '✅' : '⏳'}
        </div>
        <h3 className={`text-2xl font-bold mb-2 ${
          isConfirmed ? 'text-emerald-900' : 'text-amber-900'
        }`}>
          {isConfirmed ? t('receipt.completedTitle') : t('receipt.awaitingRecycler')}
        </h3>
        <p className={`text-sm mb-1 ${
          isConfirmed ? 'text-emerald-700' : 'text-amber-700'
        }`}>
          {isConfirmed
            ? 'The recycler has confirmed receipt. This lot is fully completed in the database.'
            : 'Your handover record has been saved. The recycler must confirm receipt to finalize.'}
        </p>
      </div>

      {/* Traceability record */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Traceability Record</h4>
          <button
            onClick={checkStatus}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {checking
              ? <><span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span> Checking DB…</>
              : `↻ ${t('receipt.refreshBtn')}`
            }
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Transaction Ref</p>
            <p className="font-mono font-bold text-slate-900 text-sm">{transaction.ref}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Handover Ref (UUID)</p>
            <p className="font-mono text-xs text-emerald-700 break-all">{transaction.handover_ref}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Amount</p>
            <p className="font-bold text-slate-900 font-mono">₹{Number(transaction.amount).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">GPS Captured</p>
            <p className={`text-sm font-semibold ${transaction.gps_captured ? 'text-emerald-600' : 'text-slate-400'}`}>
              {transaction.gps_captured ? '✓ Yes' : '✗ Not captured'}
            </p>
          </div>
        </div>

        {/* Live status from DB */}
        {traceStatus && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live DB Status</p>
              {lastChecked && (
                <p className="text-[10px] text-slate-400 font-mono">
                  Checked: {lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                isConfirmed
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {isConfirmed ? '✅ recycler_confirmed' : '⏳ pending_confirmation'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                traceability_id: {traceStatus.id}
              </span>
            </div>
            {isConfirmed && traceStatus.recycler_confirmed_at && (
              <p className="text-xs text-emerald-600 mt-2 font-mono">
                Confirmed at: {new Date(traceStatus.recycler_confirmed_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onViewAllLots}
          className="flex-1 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors cursor-pointer text-sm"
        >
          {t('receipt.viewAll')}
        </button>
      </div>
    </div>
  );
}

export default function LotConfirmation({ lotId, onLogAnother, onViewAllLots }) {
  const { t } = useTranslation();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Handover state
  const [selectedRecycler, setSelectedRecycler] = useState(null);
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    async function fetchSavedLot() {
      if (!lotId) return;
      setLoading(true);
      try {
        const res = await axios.get(`/api/lots/${lotId}`);
        if (res.data.status === 'ok') {
          setLot(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load saved lot:', err);
        setError('Failed to fetch newly created lot from database.');
      } finally {
        setLoading(false);
      }
    }
    fetchSavedLot();
  }, [lotId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-300 font-medium">Fetching verified record from SQLite database…</p>
        <p className="text-xs text-slate-500 mt-1 font-mono">GET /api/lots/{lotId}</p>
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-red-950/40 border border-red-800 rounded-2xl p-6 text-center space-y-4">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-red-300">Database Fetch Error</h2>
          <p className="text-sm text-slate-400">{error || 'Lot record could not be retrieved.'}</p>
          <button
            onClick={onLogAnother}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Return to Form
          </button>
        </div>
      </div>
    );
  }

  const primaryItem = lot.items?.[0] || {};

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-surface-950 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
          ✓
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
          Real Database Round-Trip Verified
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
          {t('receipt.successTitle')}
        </h1>
        <p className="text-slate-300 text-sm max-w-md mx-auto mt-2">
          {t('receipt.successSubtitle')}
        </p>

        {/* Lot Reference Tag */}
        <div className="mt-5 inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 shadow-inner">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t('receipt.lotRef')}:</span>
          <span className="text-base sm:text-lg font-mono font-black text-brand-400 tracking-wider">
            {lot.lot_ref}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 font-mono text-[10px] uppercase font-bold">
            {lot.status}
          </span>
        </div>
      </div>

      {/* Lot Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Col: Material & Valuation Summary (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>📋</span>
              <span>Verified Lot Details</span>
            </h2>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Material Item</p>
                <p className="text-base font-bold text-white mt-0.5">{primaryItem.material_sub_category || '—'}</p>
                <p className="text-xs text-brand-400 font-mono">{primaryItem.material_category}</p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Logged Net Weight</p>
                <p className="text-base font-bold text-white mt-0.5 font-mono">{lot.total_weight_kg} kg</p>
                <p className="text-xs text-slate-400 capitalize">{primaryItem.condition} condition</p>
              </div>
            </div>

            {/* Price Breakdown Banner */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-brand-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Fair Valuation (DB Recorded)</p>
                <p className="text-2xl font-black text-brand-300 font-mono">
                  ₹{Number(lot.estimated_value).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="text-slate-400 font-mono">Effective Unit Rate</p>
                <p className="text-sm font-bold text-white font-mono">
                  ₹{(Number(lot.estimated_value) / (Number(lot.total_weight_kg) || 1)).toFixed(0)}/kg
                </p>
              </div>
            </div>

            {/* Recoverable Minerals List */}
            {primaryItem.recoverable_materials?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  Critical Minerals Recovered:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {primaryItem.recoverable_materials.map((rm) => (
                    <span
                      key={rm}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono font-medium"
                    >
                      ✦ {rm}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Collector & Metadata */}
            <div className="border-t border-slate-800/80 pt-4 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Collector:</span>
                <span className="text-slate-200 font-medium">{lot.collector_name} ({lot.collector_phone})</span>
              </div>
              <div className="flex justify-between">
                <span>Pickup Address:</span>
                <span className="text-slate-200 font-medium truncate max-w-[220px]">{lot.pickup_address || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Recorded Timestamp:</span>
                <span className="text-slate-200 font-mono">{lot.created_at}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Photo Proof & Action Steps (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Uploaded Photo Proof
            </h3>
            {primaryItem.photo_ref ? (
              <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video relative group">
                <img
                  src={primaryItem.photo_ref}
                  alt="Saved material lot"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center bg-slate-950/40">
                <span className="text-2xl">📦</span>
                <p className="text-xs text-slate-500 mt-2">No photo was uploaded for this lot</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onLogAnother}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-950 font-bold text-sm transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>➕</span>
              <span>{t('receipt.logAnother')}</span>
            </button>

            <button
              onClick={onViewAllLots}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📋</span>
              <span>{t('receipt.viewAll')}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Handover & Matching Section */}
      <div className="mt-8 border-t border-slate-800 pt-8 bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6">
              {!selectedRecycler && !transaction && (
                  <MatchRecyclers 
                    lot={lot} 
                    onHandover={(recycler) => setSelectedRecycler(recycler)} 
                  />
              )}
              
              {selectedRecycler && !transaction && (
                  <HandoverConfirm 
                     lot={lot}
                     recycler={selectedRecycler}
                     onCancel={() => setSelectedRecycler(null)}
                     onSuccess={(txn) => setTransaction(txn)}
                  />
              )}

              {transaction && (
                  <HandoverPendingReceipt
                    transaction={transaction}
                    lotId={lot.id}
                    onViewAllLots={onViewAllLots}
                  />
              )}
          </div>
      </div>
    </div>
  );
}
