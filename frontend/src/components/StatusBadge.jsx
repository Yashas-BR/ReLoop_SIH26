const STATUS_MAP = {
  pending:     { label: 'Pending',     bg: 'var(--status-pending-bg)',     fg: 'var(--status-pending)',     icon: '⏳' },
  confirmed:   { label: 'Confirmed',   bg: 'var(--status-confirmed-bg)',   fg: 'var(--status-confirmed)',   icon: '✓' },
  in_progress: { label: 'In Progress', bg: 'var(--status-in-progress-bg)', fg: 'var(--status-in-progress)', icon: '↻' },
  paid:        { label: 'Paid',        bg: 'var(--status-confirmed-bg)',   fg: 'var(--status-confirmed)',   icon: '₹' },
  partially_paid: { label: 'Partial',  bg: 'var(--color-warning-light)',   fg: 'var(--color-warning)',      icon: '◑' },
  authorized:  { label: 'Authorized',  bg: 'var(--status-confirmed-bg)',   fg: 'var(--status-confirmed)',   icon: '✓' },
  unauthorized:{ label: 'Unauthorized',bg: 'var(--color-destructive-light)', fg: 'var(--color-destructive)', icon: '✗' },
  default:     { label: 'Unknown',     bg: 'var(--color-muted)',           fg: 'var(--color-text-muted)',   icon: '?' },
};

export function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_MAP[status?.toLowerCase()] || STATUS_MAP.default;
  const fontSize = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';
  return (
    <span
      className="pill"
      style={{
        background: cfg.bg,
        color: cfg.fg,
        fontSize,
        fontWeight: 'var(--weight-semibold)',
      }}
      aria-label={`Status: ${cfg.label}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
