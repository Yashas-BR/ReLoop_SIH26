import React, { useState } from 'react';
import axios from 'axios';

export default function HandoverConfirm({ lot, recycler, onCancel, onSuccess }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/transactions/handover', {
        lot_id: lot.id,
        recycler_id: recycler.id,
        final_agreed_value: recycler.offered_price,
        notes: notes,
      });

      setLoading(false);
      onSuccess(response.data.transaction);
    } catch (err) {
      console.error('Handover failed:', err);
      setError(err.response?.data?.message || 'Transaction failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden max-w-2xl mx-auto my-8">
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🛡️</span>
          <h2 className="text-2xl font-bold">Confirm Handover</h2>
        </div>
        <p className="text-slate-300 text-sm">
          You are about to transfer this material lot to a verified authorized recycler.
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <span className="text-red-600 text-lg">⚠️</span>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Recycler Details */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Receiving Facility</h3>
            <p className="font-bold text-lg text-slate-900 mb-1">{recycler.name}</p>
            {recycler.authorization_status === 'authorized' && (
              <p className="text-xs font-bold text-emerald-600 flex items-center mb-2">
                ✓ Authorized: {recycler.authorization_number || 'KSPCB Certified'}
              </p>
            )}
            <p className="text-xs text-slate-600 mt-2">
              📍 {recycler.address}, {recycler.city}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              📏 {recycler.distance_km} km away
            </p>
          </div>

          {/* Lot Details */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lot Summary</h3>
            <p className="text-sm font-medium text-slate-800 mb-1">
              Ref: <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-xs font-bold">{lot.lot_ref}</span>
            </p>
            <p className="text-xs text-slate-600 mb-3">
              Weight: <span className="font-bold text-slate-900">{lot.total_weight_kg} kg</span>
            </p>
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Final Agreed Value</p>
              <p className="text-3xl font-black text-emerald-600 font-mono">
                ₹{recycler.offered_price.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Notes input */}
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Transaction Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Weighbridge slip attached, verified PCBs..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all resize-none h-24 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 border-t border-slate-100 pt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm"
          >
            ← Back to Matches
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              '✓ Confirm & Handover'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
