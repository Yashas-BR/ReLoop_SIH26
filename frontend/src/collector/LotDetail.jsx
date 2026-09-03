import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLotsByCollector,
  getHandoversByLot,
  DEMO_COLLECTOR_ID,
} from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import './LotDetail.css';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmt(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CollectorLotDetail() {
  const { lotId } = useParams();

  // Lot metadata comes from the collector lots endpoint
  const [lot, setLot] = useState(null);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch collector lots to get lot metadata (category, weight, estimated_value, transaction_status)
      // GET /v1/handover/lots/collector/:id
      const [lotsRes, handoversRes] = await Promise.all([
        getLotsByCollector(DEMO_COLLECTOR_ID),
        getHandoversByLot(lotId),
      ]);

      const allLots = Array.isArray(lotsRes.data) ? lotsRes.data : [];
      const foundLot = allLots.find(l => l.lot_id === lotId) ?? null;
      setLot(foundLot);

      // GET /v1/handover/lot/:lotId — returns traceability records with recycler_name
      setHandovers(Array.isArray(handoversRes.data) ? handoversRes.data : []);
    } catch {
      setError('Could not load lot details. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => { load(); }, [load]);

  // The most recent handover record is the primary one
  const latestHandover = handovers[0] ?? null;

  // Determine the lifecycle step from available data
  // Steps: 0=created, 1=valued, 2=matched, 3=handover_initiated, 4=confirmed
  function getCurrentStep() {
    if (latestHandover?.status === 'confirmed') return 4;
    if (latestHandover?.handover_reference_number) return 3;
    if (lot?.transaction_status === 'matched') return 2;
    if (lot?.estimated_value != null) return 1;
    return 0;
  }

  const currentStep = lot ? getCurrentStep() : -1;

  const TIMELINE_STEPS = [
    {
      label: 'Lot Created',
      sub: lot ? `${fmtDate(lot.created_at)}` : '',
      icon: '📦',
    },
    {
      label: 'Valued',
      sub: lot?.estimated_value ? `Est. ${fmt(lot.estimated_value)}` : 'No valuation data',
      icon: '₹',
    },
    {
      label: 'Matched to Recycler',
      sub: latestHandover?.recycler_name || lot?.recycler_name || 'Pending match',
      icon: '🤝',
    },
    {
      label: 'Handover Initiated',
      sub: latestHandover?.handover_reference_number
        ? `Ref: ${latestHandover.handover_reference_number}`
        : 'Not yet initiated',
      icon: '🔄',
    },
    {
      label: 'Recycler Confirmed',
      sub: latestHandover?.confirmation_timestamp
        ? fmtDate(latestHandover.confirmation_timestamp)
        : 'Awaiting confirmation',
      icon: '✓',
    },
  ];

  if (loading) return <div className="container"><PageLoader /></div>;

  return (
    <div className="container">
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/collector" className="back-link">← Back to Dashboard</Link>
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 className="section-title">Lot Detail</h1>
            <p className="section-subtitle font-mono">{lotId}</p>
          </div>
          {lot?.transaction_status && (
            <StatusBadge status={lot.transaction_status} size="md" />
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in" role="alert">
          <span aria-hidden="true">⚠</span> {error}
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {!lot && !loading ? (
        <div className="empty-state card">
          <span style={{ fontSize: 48 }} aria-hidden="true">🔍</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            Lot not found
          </p>
          <p>This lot doesn't exist or hasn't been created yet.</p>
          <Link to="/collector/create-lot" className="btn btn-primary">Create a New Lot</Link>
        </div>
      ) : lot ? (
        <div className="cdash-layout">

          {/* Lot Info Card */}
          <section className="card animate-scale-in" aria-labelledby="lot-info-heading">
            <h2 id="lot-info-heading" className="detail-section-title">Lot Information</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <p className="detail-item__label">Category</p>
                <p className="detail-item__value">{lot.category}</p>
              </div>
              {lot.sub_category && (
                <div className="detail-item">
                  <p className="detail-item__label">Sub-Category</p>
                  <p className="detail-item__value">{lot.sub_category}</p>
                </div>
              )}
              <div className="detail-item">
                <p className="detail-item__label">Weight</p>
                <p className="detail-item__value">{lot.approx_weight_kg ?? '—'} kg</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Estimated Value</p>
                <p className="detail-item__value" style={{ color: 'var(--color-accent)' }}>
                  {fmt(lot.estimated_value)}
                </p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Transaction Status</p>
                <StatusBadge status={lot.transaction_status || 'quoted'} />
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Payment Status</p>
                <StatusBadge status={lot.payment_status || 'pending'} />
              </div>
              {lot.recycler_name && (
                <div className="detail-item">
                  <p className="detail-item__label">Assigned Recycler</p>
                  <p className="detail-item__value">{lot.recycler_name}</p>
                </div>
              )}
              <div className="detail-item">
                <p className="detail-item__label">Created</p>
                <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                  {fmtDate(lot.created_at)}
                </p>
              </div>
            </div>
          </section>

          {/* Traceability Timeline */}
          <section className="card animate-scale-in" aria-labelledby="trace-heading">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <h2 id="trace-heading" className="detail-section-title" style={{ marginBottom: 0 }}>
                Traceability Timeline
              </h2>
              <Link
                to={`/collector/lots/${lotId}/trace`}
                className="btn btn-outline btn-sm"
                id={`trace-detail-${lotId}`}
              >
                Full Trace →
              </Link>
            </div>

            <div className="cdash-timeline" aria-label="Lot lifecycle timeline">
              {TIMELINE_STEPS.map((step, idx) => {
                const isDone = idx <= currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div
                    key={step.label}
                    className={`cdash-timeline-step ${isDone ? 'cdash-timeline-step--done' : ''} ${isCurrent ? 'cdash-timeline-step--current' : ''}`}
                  >
                    <div className="cdash-timeline-step__connector" />
                    <div className="cdash-timeline-step__dot" aria-hidden="true">
                      {isDone ? '✓' : step.icon}
                    </div>
                    <div className="cdash-timeline-step__content">
                      <p className="cdash-timeline-step__label">{step.label}</p>
                      <p className="cdash-timeline-step__sub">{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Handover Reference Card — shown when a handover exists */}
          {latestHandover?.handover_reference_number && (
            <section className="card animate-fade-in" aria-labelledby="handover-ref-heading">
              <h2 id="handover-ref-heading" className="detail-section-title">Handover Reference</h2>
              <div className="ref-display">
                <p className="ref-display__label">Unique Reference Number</p>
                <p className="ref-display__value font-mono">
                  {latestHandover.handover_reference_number}
                </p>
                <p className="ref-display__hint">
                  Share this with the recycler to confirm receipt.
                </p>
              </div>
              <div className="detail-grid" style={{ marginTop: 'var(--space-5)' }}>
                <div className="detail-item">
                  <p className="detail-item__label">Handover Status</p>
                  <StatusBadge status={latestHandover.status || 'pending_confirmation'} size="md" />
                </div>
                <div className="detail-item">
                  <p className="detail-item__label">Initiated</p>
                  <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                    {fmtDate(latestHandover.event_timestamp)}
                  </p>
                </div>
                {latestHandover.confirmation_timestamp && (
                  <div className="detail-item">
                    <p className="detail-item__label">Confirmed</p>
                    <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                      {fmtDate(latestHandover.confirmation_timestamp)}
                    </p>
                  </div>
                )}
                {latestHandover.weight_kg != null && (
                  <div className="detail-item">
                    <p className="detail-item__label">Weight (confirmed)</p>
                    <p className="detail-item__value">{latestHandover.weight_kg} kg</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* No handover yet — prompt collector to initiate */}
          {handovers.length === 0 && lot?.transaction_status === 'quoted' && (
            <div className="empty-state card animate-fade-in">
              <span style={{ fontSize: 48 }} aria-hidden="true">🤝</span>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
                Handover not initiated yet
              </p>
              <p>Select a matched recycler to initiate the handover for this lot.</p>
              <Link
                to="/collector/matched-recyclers"
                state={{ category: lot.category, lotId: lot.lot_id }}
                className="btn btn-primary"
              >
                Find Matched Recyclers
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
