import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function PriceChartModal({ material, location, onClose, onReadAloud, isSpeaking }) {
  const [history, setHistory] = useState([]);
  const [timeRange, setTimeRange] = useState(60); // 7, 14, 30, 60
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      if (!material) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/prices/history/${material.material_id || material.id}?location=${location}&days=${timeRange}`
        );
        if (res.data.status === 'ok') {
          setHistory(res.data.data);
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load price history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [material, location, timeRange]);

  if (!material) return null;

  const rawQuery = `SELECT id, date, buying_price, quoted_price, price_trend FROM prices WHERE material_id = ${
    material.material_id || material.id
  } AND location = '${location}' ORDER BY date ASC LIMIT ${timeRange};`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-2xl">
              📈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white font-['Outfit']">
                  {material.sub_category}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono">
                  {location}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {material.category} · Real-time SQLite Historical Price Series
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onReadAloud(material)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSpeaking
                  ? 'bg-amber-500 text-surface-950 shadow-lg shadow-amber-500/25 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <span>{isSpeaking ? '🔊 Speaking…' : '🔈 Read Aloud'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Current Buy Rate</p>
              <p className="text-xl font-black text-brand-400 font-mono mt-0.5">
                ₹{stats?.latest || material.current_buying_price || 0}
                <span className="text-xs font-normal text-slate-400">/{material.unit || 'kg'}</span>
              </p>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">{timeRange}-Day High</p>
              <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                ₹{stats?.max || 0}
              </p>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">{timeRange}-Day Low</p>
              <p className="text-xl font-black text-rose-400 font-mono mt-0.5">
                ₹{stats?.min || 0}
              </p>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Average Rate</p>
              <p className="text-xl font-black text-white font-mono mt-0.5">
                ₹{stats?.avg || 0}
              </p>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Time Horizon:</span>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { label: '7 Days', days: 7 },
                  { label: '14 Days', days: 14 },
                  { label: '30 Days', days: 30 },
                  { label: '60 Days', days: 60 },
                ].map(t => (
                  <button
                    key={t.days}
                    onClick={() => setTimeRange(t.days)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      timeRange === t.days
                        ? 'bg-brand-500 text-surface-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSql(!showSql)}
              className="text-xs text-brand-400 hover:underline font-mono cursor-pointer"
            >
              {showSql ? 'Hide SQL Query' : 'Inspect SQLite Query 🔍'}
            </button>
          </div>

          {/* SQL Query Inspector Box */}
          {showSql && (
            <div className="p-4 rounded-xl bg-slate-950 border border-brand-500/30 text-xs font-mono space-y-2">
              <p className="text-brand-300 font-bold">Executed SQLite Query:</p>
              <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-lg">
                {rawQuery}
              </pre>
              <p className="text-slate-500 text-[11px]">
                Directly reading from prices table with {history.length} returned data points.
              </p>
            </div>
          )}

          {/* Recharts Area Chart */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No historical records found for this timeframe.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorQuote" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => val.slice(5)} // MM-DD
                  />
                  <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => [
                      `₹${value} / ${material.unit || 'kg'}`,
                      name === 'buying_price' ? 'Authorized Buying Rate' : 'Quoted Retail Benchmark',
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    formatter={(value) =>
                      value === 'buying_price'
                        ? 'Authorized Buying Rate (INR)'
                        : 'Quoted Market Rate (INR)'
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="quoted_price"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorQuote)"
                  />
                  <Area
                    type="monotone"
                    dataKey="buying_price"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorBuy)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Close Chart
          </button>
        </div>
      </div>
    </div>
  );
}
