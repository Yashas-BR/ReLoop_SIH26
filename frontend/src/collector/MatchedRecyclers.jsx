import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  getMatchedRecyclers, initiateHandover,
  DEFAULT_LAT, DEFAULT_LNG, DEMO_COLLECTOR_ID,
} from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './MatchedRecyclers.css';

export default function MatchedRecyclers() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const category = state?.category || 'PCB';
  const lotId = state?.lotId;
  const valuation = state?.valuation;

  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [handingOver, setHandingOver] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Try to get user location, fall back to Bengaluru
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    getMatchedRecyclers({ category, lat, lng })
      .then(r => setRecyclers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Could not load recyclers. Backend may be offline.'))
      .finally(() => setLoading(false));
  }, [category, lat, lng]);

  async function handleSelectRecycler(recycler) {
    if (!lotId) {
      setError('No lot ID found. Please create a lot first.');
      return;
    }
    setHandingOver(recycler.recycler_id);
    setError('');
    try {
      await initiateHandover({
        lot_id: lotId,
        collector_id: DEMO_COLLECTOR_ID,
        recycler_id: recycler.recycler_id,
        photo_refs: [],
        weight_kg: valuation?.lot?.approx_weight_kg || 1,
        gps_lat: lat,
        gps_lng: lng,
        handover_location: state?.location || 'Bengaluru',
      });
      setSuccessMsg(`Handover initiated with ${recycler.name}!`);
      setTimeout(() => navigate('/collector'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to initiate handover.');
    } finally {
      setHandingOver(null);
    }
  }

  function scoreToPercent(score) {
    // Lower score = better match. Invert for display.
    return Math.max(0, Math.round((1 - Math.min(score, 1)) * 100));
  }

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/collector/create-lot" className="back-link">← Back to Create Lot</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>Matched Recyclers</h1>
        <p className="section-subtitle">
          Authorized recyclers for <strong>{category}</strong> near you, ranked by best match
        </p>
      </div>

      {/* Lot Summary Banner */}
      {valuation && (
        <div className="lot-summary-banner animate-fade-in">
          <div>
            <span className="lot-summary-banner__id">{lotId}</span>
            <span className="lot-summary-banner__cat">{category}</span>
          </div>
          <div className="lot-summary-banner__value">
            Estimated: ₹{Number(valuation?.lot?.estimated_value || valuation?.estimated_value || 0)
              .toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-banner--error animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {successMsg && (
        <div className="alert-banner alert-banner--success animate-fade-in">
          <span aria-hidden="true">✓</span> {successMsg} Redirecting…
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : recyclers.length === 0 ? (
        <div className="empty-state card">
          <span style={{ fontSize: 48 }} aria-hidden="true">🏭</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            No recyclers found
          </p>
          <p>No authorized recyclers for {category} in your area yet.</p>
        </div>
      ) : (
        <div className="recycler-list">
          {recyclers.map((r, i) => (
            <div key={r.recycler_id} className="recycler-card card card-clickable stagger-item" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="recycler-card__header">
                <div className="recycler-card__name-wrap">
                  <div className="recycler-card__avatar" aria-hidden="true">🏭</div>
                  <div>
                    <h2 className="recycler-card__name">{r.name}</h2>
                    <p className="recycler-card__area">{r.service_area}</p>
                  </div>
                </div>
                <StatusBadge status="authorized" />
              </div>

              {/* Match Score Bar */}
              <div className="match-score" aria-label={`Match score: ${scoreToPercent(r.match_score)}%`}>
                <div className="match-score__label">
                  <span>Match Score</span>
                  <span className="match-score__pct">{scoreToPercent(r.match_score)}%</span>
                </div>
                <div className="match-score__bar" role="progressbar"
                  aria-valuenow={scoreToPercent(r.match_score)} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="match-score__fill"
                    style={{ width: `${scoreToPercent(r.match_score)}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="recycler-card__stats">
                <div className="recycler-stat">
                  <span className="recycler-stat__icon" aria-hidden="true">📍</span>
                  <div>
                    <p className="recycler-stat__label">Distance</p>
                    <p className="recycler-stat__value">{r.distance_km?.toFixed(1)} km</p>
                  </div>
                </div>
                <div className="recycler-stat">
                  <span className="recycler-stat__icon" aria-hidden="true">₹</span>
                  <div>
                    <p className="recycler-stat__label">Offered Rate</p>
                    <p className="recycler-stat__value">₹{r.offered_rate}/kg</p>
                  </div>
                </div>
                <div className="recycler-stat">
                  <span className="recycler-stat__icon" aria-hidden="true">♻</span>
                  <div>
                    <p className="recycler-stat__label">Accepts</p>
                    <p className="recycler-stat__value truncate">
                      {(r.materials_accepted || [category]).join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {lotId && (
                <button
                  className="btn btn-accent btn-full"
                  onClick={() => handleSelectRecycler(r)}
                  disabled={handingOver === r.recycler_id}
                  aria-busy={handingOver === r.recycler_id}
                >
                  {handingOver === r.recycler_id
                    ? <><LoadingSpinner size="sm" /> Initiating Handover…</>
                    : <><span aria-hidden="true">🤝</span> Select This Recycler</>
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
