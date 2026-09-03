import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getHandoversByLot, confirmHandover, DEMO_RECYCLER_ID } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './LotDetail.css';

function fmtDate(d, lang) {
  if (!d) return '—';
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
  return new Date(d).toLocaleString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Map backend traceability status to timeline step index
function statusToStep(status) {
  if (status === 'confirmed') return 2;
  if (status === 'pending_confirmation') return 1;
  return 0;
}

export default function LotDetail() {
  const { lotId } = useParams();
  const { t, lang } = useTranslation();
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null); // reference being confirmed
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    // Backend: GET /v1/handover/lot/:lotId
    // Returns array of traceability records joined with recycler name
    getHandoversByLot(lotId)
      .then(r => setHandovers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError(t('lotDetail.loadError')))
      .finally(() => setLoading(false));
  }, [lotId]);

  useEffect(() => { load(); }, [load]);

  async function handleConfirm(reference) {
    setConfirming(reference);
    setError('');
    setSuccess('');
    try {
      // Backend: POST /v1/handover/confirm/:reference { recycler_id }
      await confirmHandover(reference, DEMO_RECYCLER_ID);
      setSuccess(t('traceability.events.txComplete').replace('Receipt confirmed', `Handover ${reference} confirmed`));
      load(); // refresh to show confirmed state
    } catch (err) {
      setError(err.message || t('recyclerDash.profileUpdateFail').replace('save profile', 'confirm handover'));
    } finally {
      setConfirming(null);
    }
  }

  // Use first handover record to populate lot summary (category, weight from traceability)
  const firstHandover = handovers[0];

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/recycler/lots" className="back-link">{t('common.back')}</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>
          {t('lotDetail.title')}
        </h1>
        <p className="section-subtitle font-mono">{lotId}</p>
      </div>

      {error && (
        <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
           {error}
        </div>
      )}
      {success && (
        <div className="alert-banner alert-banner--success animate-fade-in" role="alert">
           {success}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : handovers.length === 0 ? (
        <div className="empty-state card">
          
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            {t('common.noData')}
          </p>
          <p>{t('traceability.events.awaitingMatch')}</p>
        </div>
      ) : (
        <div className="lot-detail-layout">
          {/* Lot Summary Card */}
          <section className="card animate-scale-in" aria-labelledby="lot-sum-heading">
            <h2 id="lot-sum-heading" className="detail-section-title">{t('common.summary')}</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <p className="detail-item__label">{t('common.lotId')}</p>
                <p className="detail-item__value font-mono">{lotId}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.weight')}</p>
                <p className="detail-item__value">
                  {firstHandover?.weight_kg != null ? `${firstHandover.weight_kg} ${t('common.kg')}` : '—'}
                </p>
              </div>
              {firstHandover?.recycler_name && (
                <div className="detail-item">
                  <p className="detail-item__label">{t('recyclerDash.facilityName')}</p>
                  <p className="detail-item__value">{firstHandover.recycler_name}</p>
                </div>
              )}
              {firstHandover?.gps_lat && firstHandover?.gps_lng && (
                <div className="detail-item">
                  <p className="detail-item__label">GPS Coordinates</p>
                  <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                    {Number(firstHandover.gps_lat).toFixed(4)}, {Number(firstHandover.gps_lng).toFixed(4)}
                  </p>
                </div>
              )}
              <div className="detail-item">
                <p className="detail-item__label">{t('status.handed_over')}</p>
                <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                  {fmtDate(firstHandover?.event_timestamp, lang)}
                </p>
              </div>
            </div>
          </section>

          {/* Handover Records */}
          <section className="animate-fade-in" aria-labelledby="handovers-heading">
            <h2
              id="handovers-heading"
              className="section-title"
              style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xl)' }}
            >
              {t('traceability.lifecycle')}
            </h2>

            {handovers.map((h, i) => {
              // IMPORTANT: backend field is handover_reference_number, NOT handover_reference
              const ref = h.handover_reference_number;
              const step = statusToStep(h.status);
              const isConfirmed = h.status === 'confirmed';
              const isConfirming = confirming === ref;

              return (
                <div
                  key={h.id || i}
                  className="handover-card card stagger-item"
                  style={{ animationDelay: `${i * 70}ms`, marginBottom: 'var(--space-4)' }}
                >
                  {/* Reference + Status */}
                  <div className="handover-card__header">
                    <div>
                      <p className="handover-card__ref-label">{t('traceability.details.ref')}</p>
                      <p className="handover-card__ref font-mono">{ref || '—'}</p>
                    </div>
                    <StatusBadge status={h.status || 'pending_confirmation'} size="md" />
                  </div>

                  {/* Meta grid */}
                  <div className="detail-grid" style={{ marginTop: 'var(--space-4)' }}>
                    <div className="detail-item">
                      <p className="detail-item__label">{t('traceability.events.handoverInit')}</p>
                      {/* event_timestamp is the correct field on traceability table */}
                      <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                        {fmtDate(h.event_timestamp, lang)}
                      </p>
                    </div>
                    {isConfirmed && (
                      <div className="detail-item">
                        <p className="detail-item__label">{t('traceability.events.confirmed')}</p>
                        {/* confirmation_timestamp is the correct field */}
                        <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                          {fmtDate(h.confirmation_timestamp, lang)}
                        </p>
                      </div>
                    )}
                    {h.weight_kg != null && (
                      <div className="detail-item">
                        <p className="detail-item__label">{t('lotDetail.weight')}</p>
                        <p className="detail-item__value">{h.weight_kg} {t('common.kg')}</p>
                      </div>
                    )}
                  </div>

                  {/* Traceability Timeline */}
                  <div className="timeline" aria-label="Handover traceability timeline">
                    <div className={`timeline-step ${step >= 0 ? 'timeline-step--done' : ''}`}>
                      <div className="timeline-step__dot" />
                      <div>
                        <span className="timeline-step__label">{t('traceability.events.created')}</span>
                        <span className="timeline-step__sub">{t('status.quoted')}</span>
                      </div>
                    </div>
                    <div className={`timeline-step ${step >= 1 ? 'timeline-step--done' : 'timeline-step--pending'}`}>
                      <div className="timeline-step__dot" />
                      <div>
                        <span className="timeline-step__label">{t('traceability.events.handoverInit')}</span>
                        <span className="timeline-step__sub">
                          {t('traceability.details.ref')}: <span className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>{ref}</span>
                        </span>
                      </div>
                    </div>
                    <div className={`timeline-step ${step >= 2 ? 'timeline-step--done' : 'timeline-step--pending'}`}>
                      <div className="timeline-step__dot" />
                      <div>
                        <span className="timeline-step__label">{t('traceability.events.confirmed')}</span>
                        <span className="timeline-step__sub">
                          {isConfirmed
                            ? `${t('status.confirmed')} ${fmtDate(h.confirmation_timestamp, lang)}`
                            : t('traceability.events.awaitingConfirm')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Button — only show when not yet confirmed */}
                  {!isConfirmed && ref && (
                    <button
                      className="btn btn-accent btn-full"
                      onClick={() => handleConfirm(ref)}
                      disabled={!!confirming}
                      aria-busy={isConfirming}
                      id={`confirm-btn-${ref}`}
                    >
                      {isConfirming
                        ? <><LoadingSpinner size="sm" /> {t('common.loading')}…</>
                        : <> {t('sync.confirmReceipt')}</>
                      }
                    </button>
                  )}

                  {isConfirmed && (
                    <div className="confirmed-banner" role="status">
                      
                      {t('traceability.events.txComplete')}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
