import { useEffect, useState } from 'react';
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

export default function LotDetail() {
  const { lotId } = useParams();
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    setLoading(true);
    getHandoversByLot(lotId)
      .then(r => setHandovers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Could not load lot details. Backend may be offline.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [lotId]);

  async function handleConfirm(reference) {
    setConfirming(reference);
    setError('');
    setSuccess('');
    try {
      await confirmHandover(reference, DEMO_RECYCLER_ID);
      setSuccess(`Handover ${reference} confirmed successfully!`);
      load(); // refresh
    } catch (err) {
      setError(err.message || 'Failed to confirm handover.');
    } finally {
      setConfirming(null);
    }
  }

  const firstHandover = handovers[0];

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/recycler/lots" className="back-link">← Back to Lots</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>
          Lot Detail
        </h1>
        <p className="section-subtitle">{lotId}</p>
      </div>

      {error && (
        <div className="alert-banner alert-banner--error animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}
      {success && (
        <div className="alert-banner alert-banner--success animate-fade-in">
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
          <p>This lot hasn't been handed over to a recycler yet.</p>
        </div>
      ) : (
        <div className="lot-detail-layout">
          {/* Lot Summary */}
          <section className="card animate-scale-in" aria-labelledby="lot-sum-heading">
            <h2 id="lot-sum-heading" className="detail-section-title">Lot Summary</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <p className="detail-item__label">Lot ID</p>
                <p className="detail-item__value font-mono">{lotId}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Category</p>
                <p className="detail-item__value">{firstHandover?.category || '—'}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Weight</p>
                <p className="detail-item__value">{firstHandover?.weight_kg ?? '—'} kg</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Location</p>
                <p className="detail-item__value">{firstHandover?.handover_location || '—'}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">GPS</p>
                <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                  {firstHandover?.gps_lat && firstHandover?.gps_lng
                    ? `${Number(firstHandover.gps_lat).toFixed(4)}, ${Number(firstHandover.gps_lng).toFixed(4)}`
                    : '—'}
                </p>
              </div>
            </div>
          </section>

          {/* Handover Records */}
          <section className="animate-fade-in" aria-labelledby="handovers-heading">
            <h2 id="handovers-heading" className="section-title" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xl)' }}>
              Handover Records
            </h2>
            {handovers.map((h, i) => (
              <div key={h.handover_id || i} className="handover-card card stagger-item" style={{ animationDelay: `${i * 70}ms`, marginBottom: 'var(--space-4)' }}>
                {/* Reference + Status */}
                <div className="handover-card__header">
                  <div>
                    <p className="handover-card__ref-label">Reference</p>
                    <p className="handover-card__ref font-mono">{h.handover_reference}</p>
                  </div>
                  <StatusBadge status={h.status || 'pending'} size="md" />
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <p className="detail-item__label">Recycler</p>
                    <p className="detail-item__value">{h.recycler_name || `Recycler #${h.recycler_id}`}</p>
                  </div>
                  <div className="detail-item">
                    <p className="detail-item__label">Created</p>
                    <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>{fmtDate(h.created_at)}</p>
                  </div>
                  {h.confirmed_at && (
                    <div className="detail-item">
                      <p className="detail-item__label">Confirmed</p>
                      <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>{fmtDate(h.confirmed_at)}</p>
                    </div>
                  )}
                </div>

                {/* Status Timeline */}
                <div className="timeline" aria-label="Handover status timeline">
                  <div className={`timeline-step ${h.created_at ? 'timeline-step--done' : ''}`}>
                    <div className="timeline-step__dot" />
                    <span>Lot Created</span>
                  </div>
                  <div className={`timeline-step ${h.handover_reference ? 'timeline-step--done' : ''}`}>
                    <div className="timeline-step__dot" />
                    <span>Handover Initiated</span>
                  </div>
                  <div className={`timeline-step ${h.status === 'confirmed' ? 'timeline-step--done' : ''} ${h.status !== 'confirmed' ? 'timeline-step--pending' : ''}`}>
                    <div className="timeline-step__dot" />
                    <span>Recycler Confirmed</span>
                  </div>
                </div>

                {/* Confirm Button */}
                {h.status !== 'confirmed' && (
                  <button
                    className="btn btn-accent btn-full"
                    onClick={() => handleConfirm(h.handover_reference)}
                    disabled={!!confirming}
                    aria-busy={confirming === h.handover_reference}
                  >
                    {confirming === h.handover_reference
                      ? <><LoadingSpinner size="sm" /> Confirming…</>
                      : <><span aria-hidden="true">✓</span> Confirm Receipt</>
                    }
                  </button>
                )}

                {h.status === 'confirmed' && (
                  <div className="confirmed-banner">
                    <span aria-hidden="true">✓</span>
                    Receipt confirmed
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
