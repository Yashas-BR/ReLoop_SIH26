import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEarningsSummary, getLotsByCollector, DEMO_COLLECTOR_ID } from '../api/client';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, SkeletonCard } from '../components/LoadingSpinner';
import './Dashboard.css';

function fmt(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CollectorDashboard() {
  const [earnings, setEarnings] = useState(null);
  const [lots, setLots] = useState([]);
  const [loadingE, setLoadingE] = useState(true);
  const [loadingL, setLoadingL] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getEarningsSummary(DEMO_COLLECTOR_ID)
      .then(r => setEarnings(r.data))
      .catch(() => setError('Could not load earnings. Is the backend running?'))
      .finally(() => setLoadingE(false));

    getLotsByCollector(DEMO_COLLECTOR_ID)
      .then(r => setLots(Array.isArray(r.data) ? r.data.slice(0, 6) : []))
      .catch(() => {})
      .finally(() => setLoadingL(false));
  }, []);

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dash-header animate-fade-in">
        <div>
          <h1 className="section-title">My Dashboard</h1>
          <p className="section-subtitle">Track your earnings and recent lots</p>
        </div>
        <Link to="/collector/create-lot" className="btn btn-accent btn-lg">
          <span aria-hidden="true">+</span>
          Create New Lot
        </Link>
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {/* Earnings Cards */}
      <section aria-labelledby="earnings-heading">
        <h2 id="earnings-heading" className="sr-only">Earnings Summary</h2>
        <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
          {loadingE ? (
            [0,1,2,3].map(i => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon="₹"
                label="Total Earned"
                value={fmt(earnings?.total_earned)}
                sub="All time"
                delay={0}
              />
              <StatCard
                icon="✓"
                label="Paid Out"
                value={fmt(earnings?.total_paid)}
                sub="Completed"
                delay={60}
              />
              <StatCard
                icon="⏳"
                label="Pending"
                value={fmt(earnings?.total_pending)}
                sub="Awaiting payment"
                delay={120}
              />
              <StatCard
                icon="📦"
                label="Total Lots"
                value={earnings?.total_transactions ?? '—'}
                sub="Created so far"
                accent
                delay={180}
              />
            </>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions animate-fade-in" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
          Quick Actions
        </h2>
        <div className="quick-actions__grid">
          <Link to="/collector/create-lot" className="quick-action-card">
            <span className="quick-action-card__icon" aria-hidden="true">📦</span>
            <span className="quick-action-card__label">Create Lot</span>
            <span className="quick-action-card__desc">Photo, weigh & value your scrap</span>
          </Link>
          <Link to="/collector/prices" className="quick-action-card">
            <span className="quick-action-card__icon" aria-hidden="true">📈</span>
            <span className="quick-action-card__label">Price Board</span>
            <span className="quick-action-card__desc">Today's rates & trends</span>
          </Link>
          <Link to="/collector/matched-recyclers" className="quick-action-card">
            <span className="quick-action-card__icon" aria-hidden="true">🏭</span>
            <span className="quick-action-card__label">Find Recyclers</span>
            <span className="quick-action-card__desc">Nearby authorized buyers</span>
          </Link>
        </div>
      </section>

      {/* Recent Lots */}
      <section className="animate-fade-in" aria-labelledby="recent-lots-heading">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 id="recent-lots-heading" className="section-title">Recent Lots</h2>
        </div>

        {loadingL ? (
          <PageLoader />
        ) : lots.length === 0 ? (
          <div className="empty-state card">
            <span style={{ fontSize: 48 }} aria-hidden="true">📭</span>
            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>No lots yet</p>
            <p>Create your first lot to start earning.</p>
            <Link to="/collector/create-lot" className="btn btn-primary">
              Create Your First Lot
            </Link>
          </div>
        ) : (
          <div className="lots-list">
            {lots.map((lot, i) => (
              <div key={lot.lot_id} className="lot-row card stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="lot-row__cat">
                  <span className="lot-row__cat-badge" aria-hidden="true">📦</span>
                  <div>
                    <p className="lot-row__id">{lot.lot_id}</p>
                    <p className="lot-row__category">{lot.category}</p>
                  </div>
                </div>
                <div className="lot-row__meta hide-mobile">
                  <span>{lot.approx_weight_kg ?? lot.weight_kg ?? '?'} kg</span>
                  <span>{fmtDate(lot.created_at)}</span>
                </div>
                <div className="lot-row__value">
                  {fmt(lot.estimated_value)}
                </div>
                <StatusBadge status={lot.payment_status || 'pending'} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
