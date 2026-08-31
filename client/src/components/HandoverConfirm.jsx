import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function HandoverConfirm({ lot, recycler, onCancel, onSuccess }) {
  const { t } = useTranslation();
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // GPS state
  const [gps, setGps]             = useState(null);   // { lat, lon, accuracy }
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle'|'fetching'|'ok'|'manual'|'denied'
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Weight override
  const [weightOverride, setWeightOverride] = useState('');

  // Try to get real GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('manual');
      setShowManual(true);
      return;
    }
    setGpsStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsStatus('ok');
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err.message);
        setGpsStatus('denied');
        setShowManual(true);
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }, []);

  const activeGps = gps || (manualLat && manualLon
    ? { lat: parseFloat(manualLat), lon: parseFloat(manualLon), accuracy: null }
    : null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        lot_id: lot.id,
        recycler_id: recycler.id,
        final_agreed_value: recycler.offered_price,
        notes: notes || undefined,
        weight_at_handover: weightOverride ? parseFloat(weightOverride) : undefined,
      };

      if (activeGps) {
        payload.collector_lat      = activeGps.lat;
        payload.collector_lon      = activeGps.lon;
        payload.collector_gps_accuracy = activeGps.accuracy;
      }

      const response = await axios.post('/api/transactions/handover', payload);
      setLoading(false);
      onSuccess(response.data.transaction);
    } catch (err) {
      console.error('Handover failed:', err);
      setError(err.response?.data?.message || 'Transaction failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden max-w-2xl mx-auto my-8">
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🛡️</span>
          <h2 className="text-2xl font-bold">{t('handover.title')}</h2>
        </div>
        <p className="text-slate-300 text-sm">
          {t('handover.subtitle')}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <span className="text-red-600 text-lg">⚠️</span>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Recycler + Lot grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{t('handover.facility')}</h3>
            <p className="font-bold text-lg text-slate-900 mb-1">{recycler.name}</p>
            {recycler.authorization_status === 'authorized' && (
              <p className="text-xs font-bold text-emerald-600 flex items-center mb-2">
                ✓ {recycler.authorization_number || 'KSPCB Certified'}
              </p>
            )}
            <p className="text-xs text-slate-600">📍 {recycler.address}, {recycler.city}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">📏 {recycler.distance_km} km away</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{t('handover.lotSummary')}</h3>
            <p className="text-sm font-medium text-slate-800 mb-1">
              Ref: <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-xs font-bold">{lot.lot_ref}</span>
            </p>
            <p className="text-xs text-slate-600 mb-3">
              Weight: <span className="font-bold text-slate-900">{lot.total_weight_kg} kg</span>
            </p>
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t('handover.finalAgreedValue')}</p>
              <p className="text-3xl font-black text-emerald-600 font-mono">
                ₹{Number(recycler.offered_price).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* ── GPS Location Section ── */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <span className="text-sm font-bold text-slate-800">{t('handover.collectionGps')}</span>
            </div>
            <div className="flex items-center gap-2">
              {gpsStatus === 'fetching' && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                  <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                  Getting GPS…
                </span>
              )}
              {gpsStatus === 'ok' && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                  ✓ {t('handover.liveGps')} (±{Math.round(gps.accuracy)}m)
                </span>
              )}
              {(gpsStatus === 'denied' || gpsStatus === 'manual') && (
                <span className="text-xs text-slate-500 font-medium">Manual entry</span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {gpsStatus === 'ok' && gps && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 font-mono text-sm text-emerald-800 flex gap-4">
                <span>Lat: <strong>{gps.lat.toFixed(6)}</strong></span>
                <span>Lon: <strong>{gps.lon.toFixed(6)}</strong></span>
                <span className="text-emerald-500 text-xs">Accuracy ±{Math.round(gps.accuracy)}m</span>
              </div>
            )}

            {(showManual || gpsStatus === 'denied') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 12.9716"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 77.5946"
                    value={manualLon}
                    onChange={(e) => setManualLon(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              </div>
            )}

            {gpsStatus === 'ok' && (
              <button
                onClick={() => setShowManual(!showManual)}
                className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                {showManual ? 'Hide manual override' : t('handover.manualGps')}
              </button>
            )}
          </div>
        </div>

        {/* Weight at handover */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            {t('handover.actualWeight')}
            <span className="ml-2 text-slate-400 normal-case font-normal">
              — default: {lot.total_weight_kg} kg
            </span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder={`Default: ${lot.total_weight_kg} kg`}
            value={weightOverride}
            onChange={(e) => setWeightOverride(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-sm font-mono"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            {t('handover.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Weighbridge slip attached, verified PCBs…"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all resize-none h-20 text-sm"
          />
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <span className="text-blue-500 text-lg flex-shrink-0">ℹ️</span>
          <p className="text-xs text-blue-800 font-medium">
            {t('handover.infoBanner')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 border-t border-slate-100 pt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm cursor-pointer"
          >
            ← {t('handover.backBtn')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              `✓ ${t('handover.confirmBtn')}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
