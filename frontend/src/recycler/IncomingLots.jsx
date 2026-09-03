import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLotsByCollector, DEMO_COLLECTOR_ID } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './IncomingLots.css';

// BACKEND BLOCKER (documented):
// There is no GET /v1/handover/lots/recycler/:recyclerId endpoint yet.
// As a workaround, we fetch all lots via the collector endpoint and filter
// to only show lots that have a recycler assigned (matched/handed_over status).
// Once Vedanth adds /v1/handover/lots/recycler/:id, replace the fetch call below.

// Filter tabs use the actual transaction_status enum from the backend DB schema.
// transaction_status values: quoted | matched | handed_over | confirmed
const ALL_FILTER = 'all';
const STATUS_FILTERS = [
  { key: ALL_FILTER,     label: 'All Matched' },
  { key: 'matched',      label: 'Matched' },
  { key: 'handed_over',  label: 'Handed Over' },
  { key: 'confirmed',    label: 'Confirmed' },
];

function fmtDate(d, lang) {
  if (!d) return '';
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
  return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmt(n) {
  if (n == null) return null;
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function IncomingLots() {
  const { t, lang } = useTranslation();
  const STATUS_FILTERS = [
    { key: ALL_FILTER,    label: t('incomingLots.filterAll') },
    { key: 'matched',     label: t('status.matched') },
    { key: 'handed_over', label: t('status.handed_over') },
    { key: 'confirmed',   label: t('status.confirmed') },
  ];
  const [lots, setLots] = useState([]);
  const [filter, setFilter] = useState(ALL_FILTER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    // Workaround: fetch all collector's lots, filter to only those with a recycler assigned.
    // These are lots in matched/handed_over/confirmed states — the recycler's incoming view.
    getLotsByCollector(DEMO_COLLECTOR_ID)
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        // Only show lots that have been matched to a recycler
        const matched = all.filter(l =>
          l.transaction_status === 'matched' ||
          l.transaction_status === 'handed_over' ||
          l.transaction_status === 'confirmed'
        );
        setLots(matched);
      })
      .catch(() => setError(t('incomingLots.loadError')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter by transaction_status (the real backend enum field)
  const filtered = filter === ALL_FILTER
    ? lots
    : lots.filter(l => l.transaction_status === filter);

  function countFor(key) {
    if (key === ALL_FILTER) return lots.length;
    return lots.filter(l => l.transaction_status === key).length;
  }

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/recycler" className="back-link">{t('common.back')}</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>{t('incomingLots.title')}</h1>
        <p className="section-subtitle">{t('incomingLots.subtitle')}</p>
      </div>

      {/* Filter Tabs — keyed on actual transaction_status values */}
      <div className="filter-tabs animate-fade-in" role="tablist" aria-label="Filter by transaction status">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            className={`filter-tab ${filter === f.key ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="filter-tab__count">{countFor(f.key)}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in" role="alert">
          <span aria-hidden="true">⚠</span> {error}
          <button
            className="btn btn-ghost btn-sm"
            onClick={load}
            style={{ marginLeft: 'auto' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <span style={{ fontSize: 48 }} aria-hidden="true">📭</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            {lots.length === 0 ? 'No matched lots yet' : 'No lots match this filter'}
          </p>
          <p>
            {lots.length === 0
              ? 'Collectors will be matched to your facility once they create lots in your area.'
              : 'Try selecting a different status filter above.'}
          </p>
        </div>
      ) : (
        <div className="lots-grid">
          {filtered.map((lot, i) => (
            <Link
              key={lot.lot_id}
              to={`/recycler/lots/${lot.lot_id}`}
              className="lot-card card card-clickable stagger-item"
              style={{ animationDelay: `${i * 50}ms`, textDecoration: 'none', color: 'inherit' }}
              aria-label={`Lot ${lot.lot_id} — ${lot.category}`}
            >
              <div className="lot-card__header">
                <div className="lot-card__icon" aria-hidden="true">📦</div>
                <div className="lot-card__meta">
                  {/* Use transaction_status — the meaningful recycler-facing status */}
                  <StatusBadge status={lot.transaction_status || 'matched'} />
                </div>
              </div>
              <p className="lot-card__id">{lot.lot_id}</p>
              <p className="lot-card__category">{lot.category}</p>
              <div className="lot-card__details">
                <div className="lot-card__detail">
                  <span aria-hidden="true">⚖</span>
                  <span>{lot.approx_weight_kg ?? '?'} kg</span>
                </div>
                {lot.recycler_name && (
                  <div className="lot-card__detail">
                    <span aria-hidden="true">🏭</span>
                    <span>{lot.recycler_name}</span>
                  </div>
                )}
                <div className="lot-card__detail">
                  <span aria-hidden="true">📅</span>
                  <span>{fmtDate(lot.created_at)}</span>
                </div>
              </div>
              {fmt(lot.estimated_value) && (
                <div className="lot-card__value">
                  {fmt(lot.estimated_value)}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                    {' '}est.
                  </span>
                </div>
              )}
              <div className="lot-card__arrow" aria-hidden="true">›</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
