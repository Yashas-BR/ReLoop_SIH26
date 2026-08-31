import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MyLotsList({ onSelectLot, onLogNew }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/lots');
      if (res.data.status === 'ok') {
        setLots(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load lots:', err);
      setError('Could not fetch lots from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
            <span>📋</span>
            <span>Logged Scrap & E-Waste Lots</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real SQLite records of all logged batches with timestamps, weights, and valuations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLots}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={onLogNew}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-950 font-bold text-xs transition-all shadow-md shadow-brand-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕</span>
            <span>Log New Lot</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-mono">Querying lots table from SQLite…</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-center text-red-300">
          <p>{error}</p>
        </div>
      ) : lots.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center max-w-lg mx-auto space-y-4">
          <span className="text-5xl">📦</span>
          <h2 className="text-lg font-bold text-white">No Lots Logged Yet</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Start by logging your first batch of collected scrap or e-waste. It will be stored in SQLite with fair market valuation.
          </p>
          <button
            onClick={onLogNew}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-950 font-bold text-xs transition-all"
          >
            Log First Material Lot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lots.map((lot) => (
            <div
              key={lot.id}
              onClick={() => onSelectLot(lot.id)}
              className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-5 shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    {lot.lot_ref}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {lot.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  {lot.thumbnail_photo ? (
                    <img
                      src={lot.thumbnail_photo}
                      alt="Thumbnail"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                      📦
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                      {lot.primary_material || 'Mixed Material'}
                    </h3>
                    <p className="text-xs text-slate-400">{lot.primary_category || 'E-Waste'}</p>
                    <p className="text-xs font-mono text-slate-300 font-bold mt-0.5">
                      {lot.total_weight_kg} kg
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Valuation</p>
                  <p className="text-base font-black text-brand-400 font-mono">
                    ₹{Number(lot.estimated_value).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <p>{new Date(lot.created_at).toLocaleDateString('en-IN')}</p>
                  <span className="text-brand-400 font-semibold group-hover:underline">View Verified Details →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
