import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLotsByCollector, getRecycler, DEMO_COLLECTOR_ID, DEMO_RECYCLER_ID } from '../api/client';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader, SkeletonCard } from '../components/LoadingSpinner';
import '../collector/Dashboard.css';
import './Dashboard.css';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function RecyclerDashboard() {
  const [lots, setLots] = useState([]);
  const [recycler, setRecycler] = useState(null);
  const [loadingLots, setLoadingLots] = useState(true);
  const [loadingR, setLoadingR] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // For Phase 1 demo: load all lots (Phase 1 has no auth, so we show everything)
    getLotsByCollector(DEMO_COLLECTOR_ID)
      .then(r => setLots(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Could not load lots. Is the backend running?'))
      .finally(() => setLoadingLots(false));

    getRecycler(DEMO_RECYCLER_ID)
      .then(r => setRecycler(r.data))
      .catch(() => {})
      .finally(() => setLoadingR(false));
  }, []);

  // Use transaction_status (the real backend enum: quoted | matched | handed_over | confirmed)
  const pending   = lots.filter(l => l.transaction_status === 'matched').length;
  const confirmed = lots.filter(l => l.transaction_status === 'confirmed' || l.transaction_status === 'handed_over').length;

  return (
    <div className="container">
      {/* Header */}
      <div className="rdash-header animate-fade-in">
        <div>
          <h1 className="section-title">
            {recycler ? recycler.name : 'Recycler Dashboard'}
          </h1>
          <p className="section-subtitle">
            {recycler ? `${recycler.facility_location} · ${recycler.authorization_status}` : 'Manage incoming lots and your profile'}
          </p>
        </div>
        <Link to="/recycler/profile" className="btn btn-outline">
          <span aria-hidden="true">👤</span>
          Edit Profile
        </Link>
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {loadingLots ? (
          [0,1,2,3].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon="📦" label="Total Lots" value={lots.length} sub="All incoming" delay={0} />
            <StatCard icon="⏳" label="Pending" value={pending} sub="Awaiting confirmation" delay={60} />
            <StatCard icon="✓" label="Confirmed" value={confirmed} sub="Completed" delay={120} accent />
            <StatCard icon="♻" label="Materials"
              value={loadingR ? '…' : (recycler?.materials_accepted?.length ?? '—')}
              sub="Types accepted" delay={180} />
          </>
        )}
      </div>

      {/* Quick Nav */}
      <section className="quick-actions animate-fade-in" aria-labelledby="raction-heading">
        <h2 id="raction-heading" className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
          Quick Actions
        </h2>
        <div className="quick-actions__grid">
          <Link to="/recycler/lots" className="quick-action-card">
            <span className="quick-action-card__icon" aria-hidden="true">📦</span>
            <span className="quick-action-card__label">Incoming Lots</span>
            <span className="quick-action-card__desc">Review and confirm lots</span>
          </Link>
          <Link to="/recycler/profile" className="quick-action-card">
            <span className="quick-action-card__icon" aria-hidden="true">👤</span>
            <span className="quick-action-card__label">My Profile</span>
            <span className="quick-action-card__desc">Update rates and materials</span>
          </Link>
          <Link to="/collector/prices" className="quick-action-card">
            <span className="quick-action-card__icon" aria-hidden="true">📈</span>
            <span className="quick-action-card__label">Market Prices</span>
            <span className="quick-action-card__desc">View price trends</span>
          </Link>
        </div>
      </section>

      {/* Recent Lots */}
      <section className="animate-fade-in" aria-labelledby="rlots-heading">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 id="rlots-heading" className="section-title">Recent Incoming Lots</h2>
          <Link to="/recycler/lots" className="btn btn-ghost btn-sm">View All →</Link>
        </div>

        {loadingLots ? (
          <PageLoader />
        ) : lots.length === 0 ? (
          <div className="empty-state card">
            <span style={{ fontSize: 48 }} aria-hidden="true">📭</span>
            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>No lots yet</p>
            <p>Matched lots will appear here when collectors submit them.</p>
          </div>
        ) : (
          <div className="lots-list">
            {lots.slice(0, 5).map((lot, i) => (
                  <Link
                    key={lot.lot_id}
                    to={`/recycler/lots/${lot.lot_id}`}
                    className="lot-row card card-clickable stagger-item"
                    style={{ animationDelay: `${i * 60}ms`, textDecoration: 'none', color: 'inherit' }}
                    aria-label={`Lot ${lot.lot_id} — ${lot.category}`}
                  >
                <div className="lot-row__cat">
                  <span className="lot-row__cat-badge" aria-hidden="true">📦</span>
                  <div>
                    <p className="lot-row__id">{lot.lot_id}</p>
                    <p className="lot-row__category">{lot.category}</p>
                  </div>
                </div>
                <div className="lot-row__meta hide-mobile">
                  <span>{lot.approx_weight_kg ?? '?'} kg</span>
                  <span>{fmtDate(lot.created_at)}</span>
                </div>
                <div className="lot-row__value">
                  {lot.estimated_value
                    ? `₹${Number(lot.estimated_value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                    : '—'}
                </div>
                  <StatusBadge status={lot.transaction_status || 'quoted'} />
                  <span className="hide-mobile" style={{ color: 'var(--color-text-muted)' }}>›</span>
                </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
