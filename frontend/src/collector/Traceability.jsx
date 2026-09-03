import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLotsByCollector,
  getHandoversByLot,
  DEMO_COLLECTOR_ID,
} from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import './Traceability.css';

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmt(n) {
  if (n == null) return null;
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Build the traceability event timeline from backend data.
 * Uses ONLY actual backend fields — no invented data.
 * 
 * Backend sources:
 *  - materials / lots: created_at, category, estimated_value, transaction_status
 *  - traceability: event_timestamp, handover_reference_number, status, confirmation_timestamp, weight_kg
 */
function buildTimeline(lot, handovers) {
  const events = [];
  const latestHandover = handovers[0] ?? null;

  // Step 1: Lot Created (always present if lot exists)
  events.push({
    id: 'created',
    label: 'Lot Created',
    detail: `Category: ${lot.category}${lot.approx_weight_kg ? ` · ${lot.approx_weight_kg} kg` : ''}`,
    timestamp: fmtDate(lot.created_at),
    status: 'done',
    icon: '📦',
  });

  // Step 2: Valued (present if estimated_value exists)
  if (lot.estimated_value != null) {
    events.push({
      id: 'valued',
      label: 'Instant Valuation',
      detail: `Estimated value: ${fmt(lot.estimated_value)}`,
      timestamp: fmtDate(lot.created_at), // valuation happens at lot creation
      status: 'done',
      icon: '₹',
    });
  } else {
    events.push({
      id: 'valued',
      label: 'Instant Valuation',
      detail: 'No price data available for this category/location',
      timestamp: null,
      status: 'skipped',
      icon: '₹',
    });
  }

  // Step 3: Recycler Matched
  const txStatus = lot.transaction_status;
  const isMatched = txStatus === 'matched' || txStatus === 'handed_over' || txStatus === 'confirmed';
  events.push({
    id: 'matched',
    label: 'Matched to Recycler',
    detail: isMatched
      ? (latestHandover?.recycler_name || lot.recycler_name || 'Recycler matched')
      : 'Awaiting recycler match',
    timestamp: isMatched ? fmtDate(latestHandover?.event_timestamp) : null,
    status: isMatched ? 'done' : 'pending',
    icon: '🤝',
  });

  // Step 4: Handover Initiated
  const hasHandover = !!latestHandover?.handover_reference_number;
  events.push({
    id: 'handover_initiated',
    label: 'Handover Initiated',
    detail: hasHandover
      ? `Ref: ${latestHandover.handover_reference_number}${latestHandover.weight_kg ? ` · ${latestHandover.weight_kg} kg` : ''}`
      : 'Not yet initiated',
    timestamp: hasHandover ? fmtDate(latestHandover.event_timestamp) : null,
    status: hasHandover ? 'done' : 'pending',
    icon: '🔄',
  });

  // Step 5: Recycler Confirmed
  const isConfirmed = latestHandover?.status === 'confirmed';
  events.push({
    id: 'confirmed',
    label: 'Recycler Confirmed',
    detail: isConfirmed
      ? 'Receipt confirmed — transaction complete'
      : 'Awaiting recycler confirmation',
    timestamp: isConfirmed ? fmtDate(latestHandover.confirmation_timestamp) : null,
    status: isConfirmed ? 'done' : 'pending',
    icon: '✓',
  });

  return events;
}

export default function CollectorTraceability() {
  const { lotId } = useParams();

  const [lot, setLot] = useState(null);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch in parallel: lot metadata + traceability records
      const [lotsRes, handoversRes] = await Promise.all([
        getLotsByCollector(DEMO_COLLECTOR_ID),
        getHandoversByLot(lotId),
      ]);
      const allLots = Array.isArray(lotsRes.data) ? lotsRes.data : [];
      setLot(allLots.find(l => l.lot_id === lotId) ?? null);
      setHandovers(Array.isArray(handoversRes.data) ? handoversRes.data : []);
    } catch {
      setError('Could not load traceability data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => { load(); }, [load]);

  const timeline = lot ? buildTimeline(lot, handovers) : [];
  const latestHandover = handovers[0] ?? null;

  if (loading) return <div className="container"><PageLoader /></div>;

  return (
    <div className="container">
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to={`/collector/lots/${lotId}`} className="back-link">
          ← Back to Lot Detail
        </Link>
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 className="section-title">Traceability</h1>
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
          <p>This lot ID doesn't exist in your account.</p>
          <Link to="/collector" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      ) : lot ? (
        <div className="trace-layout">

          {/* Full Lifecycle Timeline */}
          <section className="card animate-scale-in" aria-labelledby="trace-heading">
            <h2 id="trace-heading" className="detail-section-title">Lot Lifecycle</h2>

            <ol className="trace-timeline" aria-label="Lot lifecycle traceability">
              {timeline.map((event, idx) => (
                <li
                  key={event.id}
                  className={[
                    'trace-event',
                    event.status === 'done' ? 'trace-event--done' : '',
                    event.status === 'pending' ? 'trace-event--pending' : '',
                    event.status === 'skipped' ? 'trace-event--skipped' : '',
                    idx === timeline.length - 1 ? 'trace-event--last' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {/* Vertical line connector */}
                  <div className="trace-event__line" aria-hidden="true" />

                  {/* Icon dot */}
                  <div className="trace-event__dot" aria-hidden="true">
                    {event.status === 'done' ? '✓' : event.icon}
                  </div>

                  {/* Content */}
                  <div className="trace-event__body">
                    <p className="trace-event__label">{event.label}</p>
                    <p className="trace-event__detail">{event.detail}</p>
                    {event.timestamp && (
                      <p className="trace-event__timestamp">{event.timestamp}</p>
                    )}
                    {event.status === 'pending' && (
                      <span className="trace-event__pending-badge">In Progress</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Summary Card */}
          <section className="card animate-fade-in" aria-labelledby="trace-summary-heading">
            <h2 id="trace-summary-heading" className="detail-section-title">Summary</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <p className="detail-item__label">Lot ID</p>
                <p className="detail-item__value font-mono">{lotId}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Category</p>
                <p className="detail-item__value">{lot.category}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Weight</p>
                <p className="detail-item__value">{lot.approx_weight_kg ?? '—'} kg</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Estimated Value</p>
                <p className="detail-item__value" style={{ color: 'var(--color-accent)' }}>
                  {fmt(lot.estimated_value) ?? '—'}
                </p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">Transaction Status</p>
                <StatusBadge status={lot.transaction_status || 'quoted'} />
              </div>
              {lot.recycler_name && (
                <div className="detail-item">
                  <p className="detail-item__label">Recycler</p>
                  <p className="detail-item__value">{lot.recycler_name}</p>
                </div>
              )}
            </div>

            {/* Reference Number */}
            {latestHandover?.handover_reference_number && (
              <>
                <div className="divider" />
                <div className="ref-display">
                  <p className="ref-display__label">Handover Reference Number</p>
                  <p className="ref-display__value font-mono">
                    {latestHandover.handover_reference_number}
                  </p>
                  <p className="ref-display__hint">
                    Status: <StatusBadge status={latestHandover.status || 'pending_confirmation'} />
                  </p>
                </div>
              </>
            )}
          </section>

        </div>
      ) : null}
    </div>
  );
}
