import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MatchRecyclers({ lot, onHandover }) {
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
        <h3 className="text-lg font-bold text-slate-800 mb-2">No Authorized Recyclers Found</h3>
        <p className="text-slate-600 text-sm">No authorized recyclers in your area accept this material right now.</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">🏆 Matched Authorized Recyclers</h2>
          <p className="text-slate-500 text-sm mt-1">
            Ranked by distance (55%) + offered rate (45%) — Haversine-based real calculation
          </p>
        </div>
        <div className="text-right text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2 rounded-lg">
          <div>Material: <span className="font-bold text-slate-700">{result.lot.material_category}</span></div>
          <div>Weight: <span className="font-bold text-slate-700">{result.lot.total_weight_kg}kg</span></div>
          <div>Est. Value: <span className="font-bold text-emerald-700">₹{result.lot.estimated_value}</span></div>
        </div>
      </div>

      {/* Scoring explanation */}
      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
        <span className="font-bold">Scoring formula:</span> score = (0.55 × distance_score) + (0.45 × rate_score) — closer and higher-paying recyclers rank first. Only KSPCB/CPCB authorized recyclers are shown.
      </div>

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
                ⭐ BEST MATCH (#1)
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

                <div className="text-sm text-slate-500 mb-3">
                  📍 {recycler.address}, {recycler.city}
                </div>

                {/* Score breakdown */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-mono font-bold">
                    📏 {recycler.distance_km} km away
                  </span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-mono font-bold">
                    ⭐ Rating: {recycler.rating}
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                    Match Score: {recycler.match_score}/100
                  </span>
                </div>

                {/* Score breakdown detail */}
                <div className="mt-2 text-xs text-slate-400 font-mono">
                  Normalized Dist Score: {recycler.score_breakdown.normalized_dist_score} | Rate Score: {recycler.score_breakdown.normalized_rate_score}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {recycler.materials_accepted.map((mat) => (
                    <span key={mat} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                      {mat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: price + action */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[170px]">
                <div className="text-left md:text-right mb-0 md:mb-4">
                  <p className="text-xs text-slate-500 font-medium">Offered for this lot</p>
                  <p className="text-2xl font-black text-slate-900">
                    ₹{recycler.offered_price.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    rate modifier: {recycler.offered_rate_modifier}×
                  </p>
                </div>

                <button
                  onClick={() => onHandover(recycler)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
                    index === 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200'
                      : 'bg-slate-900 hover:bg-emerald-700 text-white'
                  }`}
                >
                  Select &amp; Handover →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
