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
  const { t } = useTranslation();

  // Lot metadata comes from the collector lots endpoint
  const [lot, setLot] = useState(null);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lotsRes, handoversRes] = await Promise.all([
        getLotsByCollector(DEMO_COLLECTOR_ID),
        getHandoversByLot(lotId),
      ]);

      const allLots = Array.isArray(lotsRes.data) ? lotsRes.data : [];
      const foundLot = allLots.find(l => l.lot_id === lotId) ?? null;
      setLot(foundLot);
      setHandovers(Array.isArray(handoversRes.data) ? handoversRes.data : []);
    } catch {
      setError(t('lotDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => { load(); }, [load]);

  const latestHandover = handovers[0] ?? null;

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
      label: t('traceability.created'),
      sub: lot ? `${fmtDate(lot.created_at)}` : '',
      icon: '',
    },
    {
      label: t('createLot.valuation.instantEstimate'),
      sub: lot?.estimated_value ? `${t('lotDetail.estimatedValue')}: ${fmt(lot.estimated_value)}` : t('common.noData'),
      icon: '₹',
    },
    {
      label: t('traceability.matched'),
      sub: latestHandover?.recycler_name || lot?.recycler_name || t('status.pending'),
      icon: '',
    },
    {
      label: t('traceability.handoverInitiated'),
      sub: latestHandover?.handover_reference_number
        ? `${t('lotDetail.handoverRef')}: ${latestHandover.handover_reference_number}`
        : t('lotDetail.noHandover'),
      icon: '',
    },
    {
      label: t('traceability.handoverConfirmed'),
      sub: latestHandover?.confirmation_timestamp
        ? fmtDate(latestHandover.confirmation_timestamp)
        : t('status.pending'),
      icon: '',
    },
  ];

  if (loading) return <div className="container"><PageLoader /></div>;

  return (
    <div className="container">
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/collector" className="back-link">{t('common.back')}</Link>
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 className="section-title">{t('lotDetail.title')}</h1>
            <p className="section-subtitle font-mono">{lotId}</p>
          </div>
          {lot?.transaction_status && (
            <StatusBadge status={lot.transaction_status} size="md" />
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in" role="alert">
           {error}
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginLeft: 'auto' }}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {!lot && !loading ? (
        <div className="empty-state card">
          
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            {t('lotDetail.loadError')}
          </p>
          <p>{t('common.noData')}</p>
          <Link to="/collector/create-lot" className="btn btn-primary">{t('dashboard.createFirstLot')}</Link>
        </div>
      ) : lot ? (
        <div className="cdash-layout">

          {/* Lot Info Card */}
          <section className="card animate-scale-in" aria-labelledby="lot-info-heading">
            <h2 id="lot-info-heading" className="detail-section-title">{t('lotDetail.title')}</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.category')}</p>
                <p className="detail-item__value">{lot.category}</p>
              </div>
              {lot.sub_category && (
                <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.subCategory')}</p>
                  <p className="detail-item__value">{lot.sub_category}</p>
                </div>
              )}
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.weight')}</p>
                <p className="detail-item__value">{lot.approx_weight_kg ?? '—'} {t('common.kg')}</p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.estimatedValue')}</p>
                <p className="detail-item__value" style={{ color: 'var(--color-accent)' }}>
                  {fmt(lot.estimated_value)}
                </p>
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.status')}</p>
                <StatusBadge status={lot.transaction_status || 'quoted'} />
              </div>
              <div className="detail-item">
                <p className="detail-item__label">{t('earnings.filterPaid')}</p>
                <StatusBadge status={lot.payment_status || 'pending'} />
              </div>
              {lot.recycler_name && (
                <div className="detail-item">
                  <p className="detail-item__label">{t('recyclerDash.incomingLots')}</p>
                  <p className="detail-item__value">{lot.recycler_name}</p>
                </div>
              )}
              <div className="detail-item">
                <p className="detail-item__label">{t('lotDetail.createdAt')}</p>
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
                {t('traceability.title')}
              </h2>
              <Link
                to={`/collector/lots/${lotId}/trace`}
                className="btn btn-outline btn-sm"
                id={`trace-detail-${lotId}`}
              >
                {t('lotDetail.viewTraceability')} →
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
                      {isDone ? '' : step.icon}
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
              <h2 id="handover-ref-heading" className="detail-section-title">{t('lotDetail.handoverRef')}</h2>
              <div className="ref-display">
                <p className="ref-display__label">{t('lotDetail.handoverRef')}</p>
                <p className="ref-display__value font-mono">
                  {latestHandover.handover_reference_number}
                </p>
              </div>
              <div className="detail-grid" style={{ marginTop: 'var(--space-5)' }}>
                <div className="detail-item">
                  <p className="detail-item__label">{t('lotDetail.handoverStatus')}</p>
                  <StatusBadge status={latestHandover.status || 'pending_confirmation'} size="md" />
                </div>
                <div className="detail-item">
                  <p className="detail-item__label">{t('traceability.handoverInitiated')}</p>
                  <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                    {fmtDate(latestHandover.event_timestamp)}
                  </p>
                </div>
                {latestHandover.confirmation_timestamp && (
                  <div className="detail-item">
                    <p className="detail-item__label">{t('traceability.handoverConfirmed')}</p>
                    <p className="detail-item__value" style={{ fontSize: 'var(--text-sm)' }}>
                      {fmtDate(latestHandover.confirmation_timestamp)}
                    </p>
                  </div>
                )}
                {latestHandover.weight_kg != null && (
                  <div className="detail-item">
                    <p className="detail-item__label">{t('lotDetail.weight')}</p>
                    <p className="detail-item__value">{latestHandover.weight_kg} {t('common.kg')}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* No handover yet — prompt collector to initiate */}
          {handovers.length === 0 && lot?.transaction_status === 'quoted' && (
            <div className="empty-state card animate-fade-in">
              
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
                {t('lotDetail.noHandover')}
              </p>
              <p>{t('recyclers.noMatchDesc')}</p>
              <Link
                to="/collector/matched-recyclers"
                state={{ category: lot.category, lotId: lot.lot_id }}
                className="btn btn-primary"
              >
                {t('recyclers.title')}
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
