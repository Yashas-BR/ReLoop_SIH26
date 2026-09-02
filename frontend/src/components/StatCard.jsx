import './StatCard.css';

export function StatCard({ icon, label, value, sub, accent, delay = 0 }) {
  return (
    <div
      className={`stat-card card stagger-item${accent ? ' stat-card--accent' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {icon && (
        <div className="stat-card__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="stat-card__body">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
        {sub && <p className="stat-card__sub">{sub}</p>}
      </div>
    </div>
  );
}
