import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { announcer } from '../utils/speech';
import PriceChartModal from './PriceChartModal';

const CATEGORY_ICONS = {
  'All': '🌐',
  'PCBs': '🖲️',
  'Cables': '🔌',
  'Batteries': '🔋',
  'Motors & Magnets': '⚙️',
  'LCD Panels': '🖥️',
  'E-Waste': '💻',
  'Metals': '🔩',
  'Plastics': '🧴',
  'Paper': '📦',
  'Mixed E-Scrap': '🗑️',
};

// Lightweight inline SVG Sparkline Component (Real SQLite data points)
function Sparkline({ points = [], color = '#22c55e' }) {
  if (!points || points.length < 2) return <span className="text-slate-600 text-xs">—</span>;

  const values = points.map(p => p.buying_price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 80;
  const height = 28;
  const padding = 2;

  const coords = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / range) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coords.join(' L ')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.length > 0 && (
        <circle
          cx={coords[coords.length - 1].split(',')[0]}
          cy={coords[coords.length - 1].split(',')[1]}
          r="2.5"
          fill={color}
        />
      )}
    </svg>
  );
}

export default function PriceDiscoveryBoard({ onSelectMaterialForLot }) {
  const { t, i18n } = useTranslation();
  const [prices, setPrices] = useState([]);
  const [locations, setLocations] = useState(['Bengaluru', 'Mumbai', 'Chennai']);
  const [selectedLocation, setSelectedLocation] = useState('Bengaluru');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audio Speech state
  const [speakingId, setSpeakingId] = useState(null);
  const speechLanguage = i18n.language === 'mr' ? 'mr-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-IN';

  // Modal Detailed Trend Chart state
  const [selectedMaterialForChart, setSelectedMaterialForChart] = useState(null);

  // 1. Fetch distinct locations & categories on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [locRes, catRes] = await Promise.all([
          axios.get('/api/prices/locations'),
          axios.get('/api/materials/categories'),
        ]);
        if (locRes.data.status === 'ok' && locRes.data.data.length > 0) {
          setLocations(locRes.data.data);
        }
        if (catRes.data.status === 'ok') {
          setCategories(['All', ...catRes.data.data.map(c => c.category)]);
        }
      } catch (err) {
        console.error('Failed to load price metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // 2. Fetch live prices from DB
  const fetchLivePrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/prices', {
        params: {
          location: selectedLocation,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: search || undefined,
        },
      });
      if (res.data.status === 'ok') {
        setPrices(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      setError('Failed to query prices table from SQLite database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePrices();
  }, [selectedLocation, selectedCategory, search]);

  // 3. Web Speech API read aloud handler
  const handleReadAloud = (item) => {
    const matId = item.material_id || item.id;
    if (speakingId === matId) {
      announcer.stop();
      setSpeakingId(null);
      return;
    }

    setSpeakingId(matId);
    announcer.speakPrice(item, {
      lang: speechLanguage,
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const highValueItem = [...prices].sort((a, b) => b.current_buying_price - a.current_buying_price)[0];
  const topGainer = [...prices].sort((a, b) => b.pct_change - a.pct_change)[0];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
              <span>📊</span>
              <span>{t('rates.title')}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-bold">
              Live SQLite Feed
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {t('rates.subtitle')}
          </p>
        </div>

        {/* Global Controls: Location Selector + Refresh Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Location Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 shadow-inner">
            <span className="text-xs text-slate-400 px-2 font-semibold flex items-center gap-1">
              <span>📍</span>
              <span>City:</span>
            </span>
            {locations.map(loc => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedLocation === loc
                    ? 'bg-brand-500 text-surface-950 shadow-md shadow-brand-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchLivePrices}
            title="Reload from SQLite"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-sm transition-colors cursor-pointer"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Tracked Scrap Materials</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">{prices.length} Types</p>
            <p className="text-[11px] text-brand-400 mt-0.5">Updated live from SQLite</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center text-xl">
            📦
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Highest Value Item ({selectedLocation})</p>
            <p className="text-lg font-black text-amber-300 font-mono mt-0.5 truncate max-w-[180px]">
              {highValueItem ? highValueItem.sub_category : '—'}
            </p>
            <p className="text-xs font-mono font-bold text-brand-400">
              ₹{highValueItem?.current_buying_price || 0} / {highValueItem?.unit || 'kg'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
            💎
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Top 14-Day Momentum</p>
            <p className="text-lg font-black text-emerald-300 font-mono mt-0.5 truncate max-w-[180px]">
              {topGainer ? topGainer.sub_category : '—'}
            </p>
            <p className="text-xs font-mono font-bold text-emerald-400">
              {topGainer?.pct_change >= 0 ? `+${topGainer?.pct_change}%` : `${topGainer?.pct_change}%`} 📈
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
            🚀
          </div>
        </div>
      </div>

      {/* Category Pills & Search Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto max-w-full">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-surface-950 font-bold shadow-md shadow-brand-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '♻️'}</span>
              <span>{cat === 'All' ? t('categories.all') : cat}</span>
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('rates.searchPlaceholder')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-400"
          />
        </div>
      </div>

      {/* Price Table / Cards */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-mono">Executing SQLite Price Queries…</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-center text-red-300">
          <p>{error}</p>
        </div>
      ) : prices.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No price records found for "{search}" in {selectedLocation}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prices.map((item) => {
            const isItemSpeaking = speakingId === item.material_id;
            const sparklineColor =
              item.price_trend === 'rising'
                ? '#22c55e'
                : item.price_trend === 'falling'
                ? '#f43f5e'
                : '#38bdf8';

            return (
              <div
                key={item.material_id}
                className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Active Speaking Indicator Glow */}
                {isItemSpeaking && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400 animate-pulse" />
                )}

                <div>
                  {/* Top Row: Category + Regulated Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                      {item.category}
                    </span>
                    {item.hazardous && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        ⚠️ Regulated E-Waste
                      </span>
                    )}
                  </div>

                  {/* Material Name */}
                  <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                    {item.sub_category}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>

                  {/* Recoverable Minerals */}
                  {item.recoverable_materials?.length > 0 && (
                    <div className="flex flex-wrap gap-1 my-3">
                      {item.recoverable_materials.map((rm) => (
                        <span
                          key={rm}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-amber-300"
                        >
                          ✦ {rm}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Prices & Sparkline Row */}
                  <div className="grid grid-cols-12 gap-2 items-center bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 my-3">
                    <div className="col-span-7">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('rates.buyingPrice')}</p>
                      <div className="text-2xl font-black text-brand-400 font-mono tracking-tight">
                        ₹{item.current_buying_price}
                        <span className="text-xs font-normal text-slate-400">/{item.unit || 'kg'}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {t('rates.quotedPrice')}: ₹{item.current_quoted_price}
                      </p>
                    </div>

                    <div className="col-span-5 text-right flex flex-col items-end">
                      <p className="text-[9px] text-slate-500 uppercase font-semibold mb-1">{t('rates.trend')}</p>
                      <Sparkline points={item.sparkline} color={sparklineColor} />
                      <span
                        className={`text-[10px] font-mono font-bold mt-1 ${
                          item.pct_change > 0
                            ? 'text-emerald-400'
                            : item.pct_change < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.pct_change > 0 ? `+${item.pct_change}%` : `${item.pct_change}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between gap-2">
                  {/* Read Aloud Button (Web Speech API) */}
                  <button
                    onClick={() => handleReadAloud(item)}
                    title={t('rates.readAloud')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isItemSpeaking
                        ? 'bg-amber-500 text-surface-950 shadow-md shadow-amber-500/30 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <span>{isItemSpeaking ? '🔊' : '🔈'}</span>
                    <span>{isItemSpeaking ? t('rates.speaking') : t('rates.readAloud')}</span>
                  </button>

                  {/* Trend Details Modal Trigger */}
                  <button
                    onClick={() => setSelectedMaterialForChart(item)}
                    className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>📈 {t('rates.viewTrend')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive 60-Day Recharts Historical Modal */}
      {selectedMaterialForChart && (
        <PriceChartModal
          material={selectedMaterialForChart}
          location={selectedLocation}
          onClose={() => setSelectedMaterialForChart(null)}
          onReadAloud={handleReadAloud}
          isSpeaking={speakingId === (selectedMaterialForChart.material_id || selectedMaterialForChart.id)}
        />
      )}
    </div>
  );
}
