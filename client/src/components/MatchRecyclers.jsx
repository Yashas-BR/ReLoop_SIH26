import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function MatchRecyclers({ lot, onHandover }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lot?.id) return;
    setLoading(true);
    axios
      .get(`/api/match?lot_id=${lot.id}&authorized_only=true&top_n=5`)
      .then((res) => {
        setResult(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load matching recyclers');
        setLoading(false);
      });
  }, [lot?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Finding best authorized recyclers…</p>
        <p className="text-xs text-slate-400 mt-1 font-mono">GET /api/match?lot_id={lot?.id}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
        <p className="font-medium text-center">⚠️ {error}</p>
      </div>
    );
  }

  if (!result || result.matches.length === 0) {
    return (
      <div className="p-12 bg-slate-50 text-center rounded-2xl border border-slate-200">
        <div className="text-4xl mb-4">🏭</div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{t('match.noMatches')}</h3>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>🏆</span>
            <span>{t('match.title')}</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {t('match.subtitle')}
          </p>
        </div>
        <div className="text-right text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2 rounded-lg">
          <div>Material: <span className="font-bold text-slate-700">{result.lot.material_category}</span></div>
          <div>Weight: <span className="font-bold text-slate-700">{result.lot.total_weight_kg}kg</span></div>
          <div>Est. Value: <span className="font-bold text-emerald-700">₹{result.lot.estimated_value}</span></div>
        </div>
      </div>

      {/* Recyclers List */}
      <div className="space-y-4">
        {result.matches.map((recycler, index) => (
          <div
            key={recycler.id}
            className={`relative bg-white border-2 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg ${
              index === 0 ? 'border-emerald-500 shadow-md shadow-emerald-100' : 'border-slate-200'
            }`}
          >
            {index === 0 && (
              <div className="absolute -top-3 left-5 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full shadow">
                ⭐ {t('match.bestMatch', { score: recycler.match_score })}
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-lg font-black text-slate-400">#{index + 1}</span>
                  <h3 className="text-base font-bold text-slate-900">{recycler.name}</h3>
                  {recycler.authorization_status === 'authorized' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      ✓ {recycler.authorization_number || 'Authorized'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-2">
                  📍 {recycler.address}, {recycler.city}
                </p>

                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1 font-mono text-slate-700">
                    📏 <strong>{t('match.distanceAway', { distance: recycler.distance_km })}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    🏷️ {t('match.offeredRate')}: <strong className="text-slate-800 font-mono">{recycler.offered_rate_modifier}x</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    ⭐ <strong className="text-slate-800">{recycler.rating} / 5.0</strong>
                  </span>
                </div>
              </div>

              {/* Right: Payout + Action */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-400 font-medium">{t('match.offeredTotal')}</p>
                  <p className="text-2xl font-black text-emerald-600 font-mono">
                    ₹{Number(recycler.offered_price).toLocaleString('en-IN')}
                  </p>
                </div>

                <button
                  onClick={() => onHandover(recycler)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🤝</span>
                  <span>{t('match.handoverBtn')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
