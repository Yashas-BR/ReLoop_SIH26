import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  getMatchedRecyclers, initiateHandover,
  DEFAULT_LAT, DEFAULT_LNG, DEMO_COLLECTOR_ID,
} from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner';
import './MatchedRecyclers.css';

export default function MatchedRecyclers() {
  const { state } = useLocation();

  const category    = state?.category || 'PCB';
  const lotId       = state?.lotId;
  const valuation   = state?.valuation;

  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [handingOver, setHandingOver] = useState(null); // recycler_id being processed
  const [handoverResult, setHandoverResult] = useState(null); // { reference, recyclerName }

  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);

  // Try to get user location, fall back to Bengaluru
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
        () => {} // silent fallback
      );
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    // GET /v1/recyclers/match?category=&lat=&lng=
    // Returns: [{ id, name, distance_km, match_score, offered_rate, materials_accepted, service_area, pickup_availability }]
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
    // The recycler_id from the matching endpoint is returned as `id`
    const recyclerId = recycler.id ?? recycler.recycler_id;
    setHandingOver(recyclerId);
    setError('');
    try {
      // POST /v1/handover/initiate
      // Returns: { traceability, handover_reference_number, recycler: { id, name, facility_location } }
      const result = await initiateHandover({
        lot_id: lotId,
        collector_id: DEMO_COLLECTOR_ID,
        recycler_id: recyclerId,
        photo_refs: [],
        weight_kg: valuation?.lot?.approx_weight_kg || 1,
        gps_lat: lat,
        gps_lng: lng,
        handover_location: state?.location || 'Bengaluru',
      });
      // Show the backend-generated reference — never invented on the frontend
      const ref = result?.data?.handover_reference_number;
      setHandoverResult({
        reference: ref,
        recyclerName: recycler.name,
      });
    } catch (err) {
      setError(err.message || 'Failed to initiate handover.');
    } finally {
      setHandingOver(null);
    }
  }

  // Lower score = better match. Invert for % display.
  function scoreToPercent(score) {
    return Math.max(0, Math.round((1 - Math.min(score ?? 0.5, 1)) * 100));
  }

  // Handover success panel — shown after successful initiation
  if (handoverResult) {
    return (
      <div className="container">
        <div className="handover-success animate-scale-in">
          <div className="handover-success__icon" aria-hidden="true">🎉</div>
          <h1 className="section-title" style={{ textAlign: 'center' }}>Handover Initiated!</h1>
          <p className="section-subtitle" style={{ textAlign: 'center' }}>
            Lot <strong>{lotId}</strong> has been handed over to <strong>{handoverResult.recyclerName}</strong>.
          </p>

          {handoverResult.reference && (
            <div className="handover-success__ref-card">
              <p className="handover-success__ref-label">Unique Reference Number</p>
              <p className="handover-success__ref font-mono" aria-label={`Reference: ${handoverResult.reference}`}>
                {handoverResult.reference}
              </p>
              <p className="handover-success__ref-hint">
                Share this reference with the recycler to confirm receipt.
              </p>
            </div>
          )}

          <div className="handover-success__status-row">
            <StatusBadge status="pending_confirmation" size="md" />
            <span className="text-muted text-sm">Awaiting recycler confirmation</span>
          </div>

          <div className="handover-success__actions">
            <Link
              to={`/collector/lots/${lotId}`}
              className="btn btn-primary"
              id="view-lot-detail-btn"
            >
              <span aria-hidden="true">📋</span> View Lot Detail &amp; Timeline
            </Link>
            <Link to="/collector" className="btn btn-outline" id="go-dashboard-btn">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
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
        <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
          <span aria-hidden="true">⚠</span> {error}
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
          {recyclers.map((r, i) => {
            // Matching API returns `id` as the recycler primary key
            const recyclerId = r.id ?? r.recycler_id;
            const isHandingOver = handingOver === recyclerId;
            const pct = scoreToPercent(r.match_score);

            return (
              <div
                key={recyclerId}
                className="recycler-card card card-clickable stagger-item"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="recycler-card__header">
                  <div className="recycler-card__name-wrap">
                    <div className="recycler-card__avatar" aria-hidden="true">🏭</div>
                    <div>
                      <h2 className="recycler-card__name">{r.name}</h2>
                      <p className="recycler-card__area">{r.service_area || r.facility_location}</p>
                    </div>
                  </div>
                  <StatusBadge status="authorized" />
                </div>

                {/* Match Score Bar */}
                <div className="match-score" aria-label={`Match score: ${pct}%`}>
                  <div className="match-score__label">
                    <span>Match Score</span>
                    <span className="match-score__pct">{pct}%</span>
                  </div>
                  <div
                    className="match-score__bar"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="match-score__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="recycler-card__stats">
                  <div className="recycler-stat">
                    <span className="recycler-stat__icon" aria-hidden="true">📍</span>
                    <div>
                      <p className="recycler-stat__label">Distance</p>
                      <p className="recycler-stat__value">
                        {r.distance_km != null ? `${Number(r.distance_km).toFixed(1)} km` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="recycler-stat">
                    <span className="recycler-stat__icon" aria-hidden="true">₹</span>
                    <div>
                      <p className="recycler-stat__label">Offered Rate</p>
                      <p className="recycler-stat__value">
                        {r.offered_rate ? `₹${r.offered_rate}/kg` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="recycler-stat">
                    <span className="recycler-stat__icon" aria-hidden="true">♻</span>
                    <div>
                      <p className="recycler-stat__label">Pickup</p>
                      <p className="recycler-stat__value">
                        {r.pickup_availability || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Accepted materials */}
                {Array.isArray(r.materials_accepted) && r.materials_accepted.length > 0 && (
                  <div className="recycler-card__materials">
                    {r.materials_accepted.map(m => (
                      <span key={m} className="material-chip">{m}</span>
                    ))}
                  </div>
                )}

                {/* Initiate Handover — only shown if a lot exists */}
                {lotId && (
                  <button
                    className="btn btn-accent btn-full"
                    onClick={() => handleSelectRecycler(r)}
                    disabled={!!handingOver}
                    aria-busy={isHandingOver}
                    id={`select-recycler-${recyclerId}`}
                  >
                    {isHandingOver
                      ? <><LoadingSpinner size="sm" /> Initiating Handover…</>
                      : <><span aria-hidden="true">🤝</span> Select This Recycler</>
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
