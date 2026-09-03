import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getHandoversByLot, confirmHandover, DEMO_RECYCLER_ID } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner';
import './LotDetail.css';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
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
      .catch(() => setError('Could not load lot details. Is the backend running?'))
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
      setSuccess(`Handover ${reference} confirmed. Status updated.`);
      load(); // refresh to show confirmed state
    } catch (err) {
      setError(err.message || 'Failed to confirm handover.');
    } finally {
      setConfirming(null);
    }
  }

  // Use first handover record to populate lot summary (category, weight from traceability)
  const firstHandover = handovers[0];

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/recycler/lots" className="back-link">← Back to Lots</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>
          Lot Detail
        </h1>
        <p className="section-subtitle font-mono">{lotId}</p>
      </div>

      {error && (
        <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}
      {success && (
        <div className="alert-banner alert-banner--success animate-fade-in" role="alert">
          <span aria-hidden="true">✓</span> {success}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : handovers.length === 0 ? (
        <div className="empty-state card">
          <span style={{ fontSize: 48 }} aria-hidden="true">📭</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            No handover records yet
          </p>
          <p>This lot hasn't been handed over to your facility yet.</p>
        </div>
      ) : (
        <div className="lot-detail-layout">
          {/* Lot Summary Card */}
          <section className="card animate-scale-in" aria-labelledby="lot-sum-heading">
            <h2 id="lot-sum-heading" className="detail-section-title">Lot Summary</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <p className="detail-item__label">Lot ID</p>
                <p className="detail-item__value font-mono">{lotId}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Weight (at handover)</p>
                <p className="detail-item__value">
                  {firstHandover?.weight_kg != null ? `${firstHandover.weight_kg} kg` : '—'}
                </p>
              </div>
              {firstHandover?.recycler_name && (
                <div className="detail-item">
                  <p className="detail-item__label">Your Facility</p>
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
                <p className="detail-item__label">Received</p>
                <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                  {fmtDate(firstHandover?.event_timestamp)}
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
              Handover Records
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
                      <p className="handover-card__ref-label">Reference Number</p>
                      <p className="handover-card__ref font-mono">{ref || '—'}</p>
                    </div>
                    <StatusBadge status={h.status || 'pending_confirmation'} size="md" />
                  </div>

                  {/* Meta grid */}
                  <div className="detail-grid" style={{ marginTop: 'var(--space-4)' }}>
                    <div className="detail-item">
                      <p className="detail-item__label">Initiated</p>
                      {/* event_timestamp is the correct field on traceability table */}
                      <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                        {fmtDate(h.event_timestamp)}
                      </p>
                    </div>
                    {isConfirmed && (
                      <div className="detail-item">
                        <p className="detail-item__label">Confirmed At</p>
                        {/* confirmation_timestamp is the correct field */}
                        <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                          {fmtDate(h.confirmation_timestamp)}
                        </p>
                      </div>
                    )}
                    {h.weight_kg != null && (
                      <div className="detail-item">
                        <p className="detail-item__label">Weight</p>
                        <p className="detail-item__value">{h.weight_kg} kg</p>
                      </div>
                    )}
                  </div>

                  {/* Traceability Timeline */}
                  <div className="timeline" aria-label="Handover traceability timeline">
                    <div className={`timeline-step ${step >= 0 ? 'timeline-step--done' : ''}`}>
                      <div className="timeline-step__dot" />
                      <div>
                        <span className="timeline-step__label">Lot Created & Valued</span>
                        <span className="timeline-step__sub">Collector submitted lot</span>
                      </div>
                    </div>
                    <div className={`timeline-step ${step >= 1 ? 'timeline-step--done' : 'timeline-step--pending'}`}>
                      <div className="timeline-step__dot" />
                      <div>
                        <span className="timeline-step__label">Handover Initiated</span>
                        <span className="timeline-step__sub">
                          Ref: <span className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>{ref}</span>
                        </span>
                      </div>
                    </div>
                    <div className={`timeline-step ${step >= 2 ? 'timeline-step--done' : 'timeline-step--pending'}`}>
                      <div className="timeline-step__dot" />
                      <div>
                        <span className="timeline-step__label">Recycler Confirmed</span>
                        <span className="timeline-step__sub">
                          {isConfirmed
                            ? `Confirmed ${fmtDate(h.confirmation_timestamp)}`
                            : 'Awaiting your confirmation'}
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
                        ? <><LoadingSpinner size="sm" /> Confirming Receipt…</>
                        : <><span aria-hidden="true">✓</span> Confirm Receipt of Lot</>
                      }
                    </button>
                  )}

                  {isConfirmed && (
                    <div className="confirmed-banner" role="status">
                      <span aria-hidden="true">✓</span>
                      Receipt confirmed — transaction complete
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
