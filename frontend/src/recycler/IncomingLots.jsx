import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLotsByCollector, DEMO_COLLECTOR_ID } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import './IncomingLots.css';

const STATUS_FILTERS = ['all', 'pending', 'paid', 'partially_paid'];

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function IncomingLots() {
  const [lots, setLots] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLotsByCollector(DEMO_COLLECTOR_ID)
      .then(r => setLots(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Could not load lots. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? lots
    : lots.filter(l => (l.payment_status || 'pending') === filter);

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/recycler" className="back-link">← Back to Dashboard</Link>
        <h1 className="section-title" style={{ marginTop: 'var(--space-3)' }}>Incoming Lots</h1>
        <p className="section-subtitle">All matched lots assigned to your facility</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs animate-fade-in" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'partially_paid' ? 'Partial' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="filter-tab__count">
              {f === 'all' ? lots.length : lots.filter(l => (l.payment_status || 'pending') === f).length}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <span style={{ fontSize: 48 }} aria-hidden="true">📭</span>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
            No lots found
          </p>
          <p>No lots match the current filter.</p>
        </div>
      ) : (
        <div className="lots-grid">
          {filtered.map((lot, i) => (
            <Link
              key={lot.lot_id}
              to={`/recycler/lots/${lot.lot_id}`}
              className="lot-card card card-clickable stagger-item"
              style={{ animationDelay: `${i * 50}ms`, textDecoration: 'none', color: 'inherit' }}
            >
              <div className="lot-card__header">
                <div className="lot-card__icon" aria-hidden="true">📦</div>
                <div className="lot-card__meta">
                  <StatusBadge status={lot.payment_status || 'pending'} />
                </div>
              </div>
              <p className="lot-card__id">{lot.lot_id}</p>
              <p className="lot-card__category">{lot.category}</p>
              <div className="lot-card__details">
                <div className="lot-card__detail">
                  <span aria-hidden="true">⚖</span>
                  <span>{lot.approx_weight_kg ?? '?'} kg</span>
                </div>
                <div className="lot-card__detail">
                  <span aria-hidden="true">📍</span>
                  <span>{lot.location || '—'}</span>
                </div>
                <div className="lot-card__detail">
                  <span aria-hidden="true">📅</span>
                  <span>{fmtDate(lot.created_at)}</span>
                </div>
              </div>
              {lot.estimated_value && (
                <div className="lot-card__value">
                  ₹{Number(lot.estimated_value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
