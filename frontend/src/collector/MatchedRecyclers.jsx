import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  getMatchedRecyclers, initiateHandover,
  DEFAULT_LAT, DEFAULT_LNG, DEMO_COLLECTOR_ID,
} from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './MatchedRecyclers.css';

export default function MatchedRecyclers() {
  const { state } = useLocation();
  const { t } = useTranslation();

  const category    = state?.category || 'PCB';
  const lotId       = state?.lotId;
  const valuation   = state?.valuation;

  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [handingOver, setHandingOver] = useState(null); // recycler_id being processed
  const [handoverResult, setHandoverResult] = useState(null); // { reference, recyclerName, queued? }

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
      .catch(() => setError(t('recyclers.loadError')))
      .finally(() => setLoading(false));
  }, [category, lat, lng]);

  async function handleSelectRecycler(recycler) {
    if (!lotId) {
      setError(t('recyclers.loadError'));
      return;
    }
    // The recycler_id from the matching endpoint is returned as `id`
    const recyclerId = recycler.id ?? recycler.recycler_id;
    setHandingOver(recyclerId);
    setError('');
    try {
      // POST /v1/handover/initiate
      // ONLINE:  Returns { traceability, handover_reference_number, recycler: { id, name } }
      // OFFLINE: Returns { queued: true, queueItem } — operation saved to IndexedDB for sync later
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

      if (result?.queued) {
        // OFFLINE path — operation is queued, NOT confirmed by backend
        // Must show "Saved offline" state, not "completed"
        setHandoverResult({
          queued: true,
          recyclerName: recycler.name,
          reference: null, // no reference until backend processes it
        });
      } else {
        // ONLINE path — backend confirmed, reference is real
        const ref = result?.data?.handover_reference_number;
        setHandoverResult({
          queued: false,
          reference: ref,
          recyclerName: recycler.name,
        });
      }
    } catch (err) {
      setError(err.message || t('recyclerLotDetail.confirmError'));
    } finally {
      setHandingOver(null);
    }
  }

  // Lower score = better match. Invert for % display.
  function scoreToPercent(score) {
    return Math.max(0, Math.round((1 - Math.min(score ?? 0.5, 1)) * 100));
  }

  // Result panel — shown after initiateHandover returns (online OR offline queued)
  if (handoverResult) {
    // ── OFFLINE / QUEUED path ────────────────────────────────────────────────
    // The handover was saved locally and will sync when connectivity returns.
    // We must NOT claim it is completed — backend has not confirmed it yet.
    if (handoverResult.queued) {
      return (
        <div className="container">
          <div className="handover-success animate-scale-in" style={{ borderColor: 'var(--color-warning)', borderWidth: 2, borderStyle: 'solid' }}>
            <div className="handover-success__icon" aria-hidden="true">📶</div>
            <h1 className="section-title" style={{ textAlign: 'center' }}>{t('recyclers.savedOffline')}</h1>
            <p className="section-subtitle" style={{ textAlign: 'center' }}>
              {t('recyclers.savedOfflineDesc')}
            </p>

            <div className="handover-success__status-row" style={{ background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <span aria-hidden="true">⏳</span>
              <span className="text-sm" style={{ color: 'var(--color-warning)', fontWeight: 'var(--weight-semibold)' }}>
                {t('offline.savedOffline')}
              </span>
            </div>

            <div className="handover-success__actions">
              <Link to="/collector" className="btn btn-primary" id="go-dashboard-offline-btn">
                {t('common.back')}
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // ── ONLINE / CONFIRMED path ──────────────────────────────────────────────
    // Backend confirmed the handover. Reference number is real.
    return (
      <div className="container">
        <div className="handover-success animate-scale-in">
          <div className="handover-success__icon" aria-hidden="true">🎉</div>
          <h1 className="section-title" style={{ textAlign: 'center' }}>{t('recyclers.handoverInitiated')}</h1>
          <p className="section-subtitle" style={{ textAlign: 'center' }}>
            {t('recyclers.handoverRef')}: <strong>{lotId}</strong> → <strong>{handoverResult.recyclerName}</strong>
          </p>

          {handoverResult.reference && (
            <div className="handover-success__ref-card">
              <p className="handover-success__ref-label">{t('lotDetail.handoverRef')}</p>
              <p className="handover-success__ref font-mono" aria-label={`${t('lotDetail.handoverRef')}: ${handoverResult.reference}`}>
                {handoverResult.reference}
              </p>
            </div>
          )}

          <div className="handover-success__status-row">
            <StatusBadge status="pending_confirmation" size="md" />
          </div>

          <div className="handover-success__actions">
            <Link
              to={`/collector/lots/${lotId}`}
              className="btn btn-primary"
              id="view-lot-detail-btn"
            >
              <span aria-hidden="true">📋</span> {t('lotDetail.viewTraceability')}
            </Link>
            <Link to="/collector" className="btn btn-outline" id="go-dashboard-btn">
              {t('common.back')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/collector/create-lot" className="back-link">{t('common.back')}</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>{t('recyclers.title')}</h1>
        <p className="section-subtitle">{t('recyclers.subtitle')}</p>
      </div>

      {/* Lot Summary Banner */}
      {valuation && (
        <div className="lot-summary-banner animate-fade-in">
          <div>
            <span className="lot-summary-banner__id">{lotId}</span>
            <span className="lot-summary-banner__cat">{category}</span>
          </div>
          <div className="lot-summary-banner__value">
            {t('createLot.valuation.instantEstimate')}: ₹{Number(valuation?.lot?.estimated_value || valuation?.estimated_value || 0)
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
            {t('recyclers.noMatch')}
          </p>
          <p>{t('recyclers.noMatchDesc')}</p>
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
                    <span>{t('recyclers.matchScore')}</span>
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
                      <p className="recycler-stat__label">{t('recyclers.distance')}</p>
                      <p className="recycler-stat__value">
                        {r.distance_km != null ? `${Number(r.distance_km).toFixed(1)} ${t('recyclers.km')}` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="recycler-stat">
                    <span className="recycler-stat__icon" aria-hidden="true">₹</span>
                    <div>
                      <p className="recycler-stat__label">{t('recyclers.rate')}</p>
                      <p className="recycler-stat__value">
                        {r.offered_rate ? `₹${r.offered_rate}${t('prices.perKg')}` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="recycler-stat">
                    <span className="recycler-stat__icon" aria-hidden="true">♻</span>
                    <div>
                      <p className="recycler-stat__label">{t('recyclers.pickup')}</p>
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
                      ? <><LoadingSpinner size="sm" /> {t('recyclers.handingOver')}…</>
                      : <><span aria-hidden="true">🤝</span> {t('recyclers.selectRecycler')}</>
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
