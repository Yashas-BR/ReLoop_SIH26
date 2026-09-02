import './LoadingSpinner.css';

export function LoadingSpinner({ size = 'md', label = 'Loading...' }) {
  const sz = { sm: 20, md: 32, lg: 48 }[size];
  return (
    <div className="spinner-wrap" role="status" aria-label={label}>
      <svg className="spinner" width={sz} height={sz} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="13" stroke="var(--color-border)" strokeWidth="3"/>
        <path d="M16 3a13 13 0 0 1 13 13" stroke="var(--color-primary)" strokeWidth="3"
          strokeLinecap="round"/>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <LoadingSpinner size="lg" />
      <p className="page-loader-text">Loading…</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 'var(--space-6)' }}>
      <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 'var(--space-3)' }} />
      <div className="skeleton" style={{ height: 32, width: '80%', marginBottom: 'var(--space-2)' }} />
      <div className="skeleton" style={{ height: 14, width: '40%' }} />
    </div>
  );
}
