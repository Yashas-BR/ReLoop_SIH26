import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function EarningsLedger({ activeCollector }) {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_earned: 0,
    pending_dues: 0,
    total_gross_value: 0,
    total_weight_kg: 0,
    total_transactions: 0,
    paid_count: 0,
    pending_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'paid' | 'pending'
  const [updatingId, setUpdatingId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const collectorId = activeCollector?.id || 1;

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/transactions?collector_id=${collectorId}`);
      if (res.data.status === 'ok') {
        setTransactions(res.data.data || []);
        setSummary(res.data.summary || {});
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error loading earnings ledger:', err);
      setError('Failed to fetch transactions and earnings ledger from database.');
    } finally {
      setLoading(false);
    }
  }, [collectorId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleTogglePaymentStatus = async (txId, currentStatus) => {
    const newStatus = (currentStatus === 'paid' || currentStatus === 'completed') ? 'pending' : 'paid';
    setUpdatingId(txId);
    try {
      const res = await axios.put(`/api/transactions/${txId}/payment`, {
        payment_status: newStatus,
        payment_method: newStatus === 'paid' ? 'upi' : 'cash',
      });
      if (res.data.status === 'ok') {
        await fetchLedger();
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      alert('Error updating payment status: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'paid') return tx.payment_status === 'paid' || tx.payment_status === 'completed';
    if (filterStatus === 'pending') return tx.payment_status === 'pending';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-surface-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl sm:text-3xl">💰</span>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                {t('ledger.title')}
              </h1>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              {t('ledger.subtitle')} — <strong className="text-brand-400">{activeCollector?.name || 'Collector #1'}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs font-mono text-slate-400 hidden sm:inline-block">
                {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <span className={loading ? 'animate-spin' : ''}>↻</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Settled / Earned */}
        <div className="bg-surface-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('ledger.totalEarned')}</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">💵</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            ₹{summary.total_earned.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{summary.paid_count} {t('ledger.paid')}</span>
          </p>
        </div>

        {/* Pending Dues */}
        <div className="bg-surface-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('ledger.pendingDues')}</span>
            <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-sm">⏳</span>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            ₹{summary.pending_dues.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{summary.pending_count} {t('ledger.pending')}</span>
          </p>
        </div>

        {/* Total Gross Value */}
        <div className="bg-surface-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('ledger.totalGross')}</span>
            <span className="p-1.5 bg-brand-500/10 text-brand-400 rounded-lg text-sm">📈</span>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            ₹{summary.total_gross_value.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Total Recycled Volume */}
        <div className="bg-surface-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('ledger.totalVolume')}</span>
            <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm">⚖️</span>
          </div>
          <div className="text-3xl font-black text-cyan-400 font-mono">
            {summary.total_weight_kg.toLocaleString('en-IN')} <span className="text-base text-slate-400">kg</span>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="bg-surface-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Filter / Controls */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">📑</span>
            <h2 className="text-lg font-bold text-white">{t('ledger.allRecords')}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-semibold">
              {filteredTransactions.length}
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: t('ledger.allRecords') },
              { id: 'paid', label: `${t('ledger.paid')} (${summary.paid_count})` },
              { id: 'pending', label: `${t('ledger.pending')} (${summary.pending_count})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-brand-500 text-surface-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-medium">Executing SQLite transaction ledger query…</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-red-400 space-y-3">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Transactions Table */}
        {!loading && !error && filteredTransactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">{t('ledger.txnRef')}</th>
                  <th className="py-3.5 px-4">{t('ledger.material')}</th>
                  <th className="py-3.5 px-4">{t('ledger.weight')}</th>
                  <th className="py-3.5 px-4">{t('ledger.price')}</th>
                  <th className="py-3.5 px-4">{t('ledger.recycler')}</th>
                  <th className="py-3.5 px-4">{t('ledger.statusCol')}</th>
                  <th className="py-3.5 px-4">{t('ledger.dateCol')}</th>
                  <th className="py-3.5 px-4 text-right">{t('ledger.actionCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {filteredTransactions.map((tx) => {
                  const isPaid = tx.payment_status === 'paid' || tx.payment_status === 'completed';
                  const isUpdating = updatingId === tx.id;
                  const finalAmt = tx.final_price != null ? tx.final_price : tx.quoted_price;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs">
                        <div className="font-bold text-white">TXN-{String(tx.id).padStart(4, '0')}</div>
                        <div className="text-brand-400 text-[11px] mt-0.5">{tx.lot_ref || `Lot #${tx.lot_id}`}</div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div className="font-semibold text-slate-200">{tx.material_summary}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{tx.payment_method || 'cash'}</div>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs text-slate-200">
                        {tx.total_weight_kg} kg
                      </td>

                      <td className="py-4 px-4 font-mono text-xs">
                        <div className="text-base font-bold text-emerald-400">
                          ₹{Number(finalAmt).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div className="font-semibold text-slate-200">{tx.recycler_name || 'Recycler Facility'}</div>
                        {tx.recycler_auth && (
                          <div className="text-[10px] text-emerald-500 font-mono">{tx.recycler_auth}</div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                          <span className="capitalize">{isPaid ? t('ledger.paid') : t('ledger.pending')}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleTogglePaymentStatus(tx.id, tx.payment_status)}
                          disabled={isUpdating}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer ${
                            isPaid
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                          } disabled:opacity-50`}
                        >
                          {isUpdating ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          ) : isPaid ? (
                            <span>↺ {t('ledger.revertPending')}</span>
                          ) : (
                            <span>✓ {t('ledger.markPaid')}</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
