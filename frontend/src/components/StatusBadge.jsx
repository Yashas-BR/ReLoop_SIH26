// Centralised status → UI mapping.
// Must cover ALL enum values from the backend DB schema.
// transaction_status: quoted | matched | handed_over | confirmed
// traceability.status: pending_confirmation | confirmed
// payment_status: pending | paid
// authorization_status: authorized | unauthorized | pending
const STATUS_MAP = {
  // Transaction statuses
  quoted:              { label: 'Quoted',             bg: 'var(--color-info-light)',      fg: 'var(--color-info)',          icon: '💬' },
  matched:             { label: 'Matched',            bg: 'var(--status-in-progress-bg)', fg: 'var(--status-in-progress)',   icon: '🤝' },
  handed_over:         { label: 'Handed Over',        bg: 'var(--color-warning-light)',   fg: 'var(--color-warning)',        icon: '📦' },

  // Traceability statuses
  pending_confirmation:{ label: 'Awaiting Confirm',   bg: 'var(--color-warning-light)',   fg: 'var(--color-warning)',        icon: '⏳' },

  // Shared confirmed
  confirmed:           { label: 'Confirmed',          bg: 'var(--status-confirmed-bg)',   fg: 'var(--status-confirmed)',     icon: '✓' },

  // Payment statuses
  pending:             { label: 'Pending',            bg: 'var(--status-pending-bg)',     fg: 'var(--status-pending)',       icon: '⏳' },
  paid:                { label: 'Paid',               bg: 'var(--status-confirmed-bg)',   fg: 'var(--status-confirmed)',     icon: '₹' },
  partially_paid:      { label: 'Partial',            bg: 'var(--color-warning-light)',   fg: 'var(--color-warning)',        icon: '◑' },

  // Authorization statuses
  authorized:          { label: 'Authorized',         bg: 'var(--status-confirmed-bg)',   fg: 'var(--status-confirmed)',     icon: '✓' },
  unauthorized:        { label: 'Unauthorized',       bg: 'var(--color-destructive-light)', fg: 'var(--color-destructive)', icon: '✗' },

  // Misc
  in_progress:         { label: 'In Progress',        bg: 'var(--status-in-progress-bg)', fg: 'var(--status-in-progress)',  icon: '↻' },

  // Fallback
  default:             { label: 'Unknown',            bg: 'var(--color-muted)',           fg: 'var(--color-text-muted)',    icon: '?' },
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
