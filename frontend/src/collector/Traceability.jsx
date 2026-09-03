import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getLotsByCollector,
  getHandoversByLot,
  DEMO_COLLECTOR_ID,
} from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './Traceability.css';

function fmtDate(d, lang) {
  if (!d) return null;
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
  return new Date(d).toLocaleString(locale, {
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
function buildTimeline(lot, handovers, t, lang) {
  const events = [];
  const latestHandover = handovers[0] ?? null;

  events.push({
    id: 'created',
    label: t('traceability.events.created'),
    detail: `${t('lotDetail.category')}: ${lot.category}${lot.approx_weight_kg ? ` · ${lot.approx_weight_kg} ${t('common.kg')}` : ''}`,
    timestamp: fmtDate(lot.created_at, lang),
    status: 'done',
    icon: '📦',
  });

  if (lot.estimated_value != null) {
    events.push({
      id: 'valued',
      label: t('traceability.events.valued'),
      detail: `${t('lotDetail.estimatedValue')}: ${fmt(lot.estimated_value)}`,
      timestamp: fmtDate(lot.created_at, lang),
      status: 'done',
      icon: '₹',
    });
  } else {
    events.push({
      id: 'valued',
      label: t('traceability.events.valued'),
      detail: t('createLot.valuation.noPriceData', { category: lot.category, location: lot.location || '—' }),
      timestamp: null,
      status: 'skipped',
      icon: '₹',
    });
  }

  const txStatus = lot.transaction_status;
  const isMatched = txStatus === 'matched' || txStatus === 'handed_over' || txStatus === 'confirmed';
  events.push({
    id: 'matched',
    label: t('traceability.events.matched'),
    detail: isMatched
      ? (latestHandover?.recycler_name || lot.recycler_name || t('status.matched'))
      : t('traceability.events.awaitingMatch'),
    timestamp: isMatched ? fmtDate(latestHandover?.event_timestamp, lang) : null,
    status: isMatched ? 'done' : 'pending',
    icon: '🤝',
  });

  const hasHandover = !!latestHandover?.handover_reference_number;
  events.push({
    id: 'handover_initiated',
    label: t('traceability.events.handoverInit'),
    detail: hasHandover
      ? `${t('traceability.details.ref')}: ${latestHandover.handover_reference_number}${latestHandover.weight_kg ? ` · ${latestHandover.weight_kg} ${t('common.kg')}` : ''}`
      : t('traceability.events.notInitiated'),
    timestamp: hasHandover ? fmtDate(latestHandover.event_timestamp, lang) : null,
    status: hasHandover ? 'done' : 'pending',
    icon: '🔄',
  });

  const isConfirmed = latestHandover?.status === 'confirmed';
  events.push({
    id: 'confirmed',
    label: t('traceability.events.confirmed'),
    detail: isConfirmed
      ? t('traceability.events.txComplete')
      : t('traceability.events.awaitingConfirm'),
    timestamp: isConfirmed ? fmtDate(latestHandover.confirmation_timestamp, lang) : null,
    status: isConfirmed ? 'done' : 'pending',
    icon: '✓',
  });

  return events;
}

export default function CollectorTraceability() {
  const { lotId } = useParams();
  const { t, lang } = useTranslation();

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
      setError(t('lotDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => { load(); }, [load]);

  const timeline = lot ? buildTimeline(lot, handovers, t, lang) : [];
  const latestHandover = handovers[0] ?? null;

  if (loading) return <div className="container"><PageLoader /></div>;

  return (
    <div className="container">
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to={`/collector/lots/${lotId}`} className="back-link">
          {t('common.back')}
        </Link>
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 className="section-title">{t('traceability.title')}</h1>
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
            {t('common.retry')}
          </button>
        </div>
      )}

      {!lot && !loading ? (
        <div className="empty-state card">
          <span style={{ fontSize: 48 }} aria-hidden="true">🔍</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            {t('lotDetail.loadError')}
          </p>
          <p>{t('common.noData')}</p>
          <Link to="/collector" className="btn btn-primary">{t('common.back')}</Link>
        </div>
      ) : lot ? (
        <div className="trace-layout">

          {/* Full Lifecycle Timeline */}
          <section className="card animate-scale-in" aria-labelledby="trace-heading">
            <h2 id="trace-heading" className="detail-section-title">{t('traceability.lifecycle')}</h2>

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
                      <span className="trace-event__pending-badge">{t('status.inProgress')}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Summary Card */}
          <section className="card animate-fade-in" aria-labelledby="trace-summary-heading">
            <h2 id="trace-summary-heading" className="detail-section-title">{t('common.summary')}</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <p className="detail-item__label">{t('common.lotId')}</p>
                <p className="detail-item__value font-mono">{lotId}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.category')}</p>
                <p className="detail-item__value">{lot.category}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.weight')}</p>
                <p className="detail-item__value">{lot.approx_weight_kg ?? '—'} {t('common.kg')}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.estimatedValue')}</p>
                <p className="detail-item__value" style={{ color: 'var(--color-accent)' }}>
                  {fmt(lot.estimated_value) ?? '—'}
                </p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.status')}</p>
                <StatusBadge status={lot.transaction_status || 'quoted'} />
              </div>
              {lot.recycler_name && (
                <div className="detail-item">
                  <p className="detail-item__label">{t('recyclerDash.incomingLots').replace(' Lots', '')}</p>
                  <p className="detail-item__value">{lot.recycler_name}</p>
                </div>
              )}
            </div>

            {/* Reference Number */}
            {latestHandover?.handover_reference_number && (
              <>
                <div className="divider" />
                <div className="ref-display">
                  <p className="ref-display__label">{t('traceability.details.ref')}</p>
                  <p className="ref-display__value font-mono">
                    {latestHandover.handover_reference_number}
                  </p>
                  <p className="ref-display__hint">
                    {t('lotDetail.status')}: <StatusBadge status={latestHandover.status || 'pending_confirmation'} />
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
