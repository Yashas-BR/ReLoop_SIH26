import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { getLocalizedMaterial } from '../i18n';

export default function MarketRatesView({ onSelectMaterialForLot }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const res = await axios.get('/api/materials');
        if (res.data.status === 'ok') {
          setMaterials(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load rates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const categories = ['All', ...new Set(materials.map(m => m.category))];

  const filtered = materials.filter(m => {
    const matchCat = selectedCat === 'All' || m.category === selectedCat;
    const matchSearch =
      m.sub_category.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
          <span>📊</span>
          <span>{t('catalog.title')}</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {t('catalog.subtitle')}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCat === cat
                  ? 'bg-brand-500 text-surface-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {getLocalizedMaterial(cat, lang)}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-mono">{t('catalog.loadingText')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(mat => (
            <div
              key={mat.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    {getLocalizedMaterial(mat.category, lang)}
                  </span>
                  {mat.hazardous && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {t('catalog.eWasteRegulated')}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-1">
                  {getLocalizedMaterial(mat.sub_category, lang)}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{mat.description}</p>

                {mat.recoverable_materials?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {mat.recoverable_materials.map(rm => (
                      <span
                        key={rm}
                        className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-amber-300"
                      >
                        ✦ {getLocalizedMaterial(rm, lang)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">{t('catalog.authorizedRate')}</p>
                  <p className="text-lg font-black text-brand-400 font-mono">
                    ₹{mat.latest_buying_price || '—'}
                    <span className="text-xs font-normal text-slate-400">/{mat.unit || 'kg'}</span>
                  </p>
                </div>
                <button
                  onClick={() => onSelectMaterialForLot(mat)}
                  className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('catalog.logLot')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
