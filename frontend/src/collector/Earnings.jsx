/**
 * Earnings Ledger — /collector/earnings
 *
 * API used:
 *  GET /v1/payments/earnings/:collectorId  → summary cards
 *  GET /v1/payments/history/:collectorId   → ledger rows
 *
 * IMPORTANT: /payments/history only returns rows where final_price IS NOT NULL
 * (see payment.service.js). In-flight lots (quoted/matched/handed_over) without
 * a final price are NOT shown here — they appear on the Dashboard.
 * This is a backend limitation documented in PHASE4_FRONTEND.md.
 *
 * Offline: both calls are cache-backed. When serving from cache,
 * a "Showing cached data" notice is displayed.
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getEarningsSummary, getPaymentHistory, DEMO_COLLECTOR_ID } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { SkeletonCard, PageLoader } from '../components/LoadingSpinner';
import './Earnings.css';

// ── Formatters ─────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Filter helpers ──────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: 'all',     label: 'All' },
  { value: 'paid',    label: 'Paid' },
  { value: 'pending', label: 'Pending' },
];

function applyFilter(rows, filter) {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.payment_status === filter);
}

// ── Component ───────────────────────────────────────────────────────────────
export default function EarningsLedger() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [fromCache, setFromCache] = useState(false);
  const [loadingS, setLoadingS] = useState(true);
  const [loadingR, setLoadingR] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);

  const load = useCallback(async () => {
    setLoadingS(true);
    setLoadingR(true);
    setError('');

    try {
      const [sumRes, histRes] = await Promise.all([
        getEarningsSummary(DEMO_COLLECTOR_ID),
        getPaymentHistory(DEMO_COLLECTOR_ID),
      ]);
      setSummary(sumRes.data);
      setRows(Array.isArray(histRes.data) ? histRes.data : []);
      setFromCache(sumRes.fromCache || histRes.fromCache);
    } catch (err) {
      setError('Could not load earnings data. ' + (err.message || ''));
    } finally {
      setLoadingS(false);
      setLoadingR(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = applyFilter(rows, filter);

  return (
    <div className="container">
      {/* ── Header ── */}
      <div className="earnings-header animate-fade-in">
        <div>
          <h1 className="section-title">Earnings Ledger</h1>
          <p className="section-subtitle">
            Your complete payment history and earnings summary
          </p>
        </div>
        <Link to="/collector" className="btn btn-ghost btn-sm">
          ← Dashboard
        </Link>
      </div>

      {/* ── Offline / cache notice ── */}
      {fromCache && (
        <div className="earnings-cache-notice animate-fade-in" role="note">
          <span aria-hidden="true">📶</span>
          Showing cached data from your last session — connect to refresh
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in" role="alert">
          <span aria-hidden="true">⚠</span> {error}
          <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Summary cards ── */}
      <section aria-labelledby="summary-heading" className="earnings-summary-section">
        <h2 id="summary-heading" className="sr-only">Earnings Summary</h2>
        {loadingS ? (
          <div className="grid-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="earnings-cards-grid animate-fade-in">
            <div className="earnings-card">
              <div className="earnings-card__icon" aria-hidden="true">₹</div>
              <div className="earnings-card__body">
                <p className="earnings-card__label">Total Earned</p>
                <p className="earnings-card__value">{fmt(summary?.total_earned)}</p>
                <p className="earnings-card__sub">All time (paid lots only)</p>
              </div>
            </div>

            <div className="earnings-card earnings-card--green">
              <div className="earnings-card__icon" aria-hidden="true">✓</div>
              <div className="earnings-card__body">
                <p className="earnings-card__label">Paid Out</p>
                <p className="earnings-card__value">{fmt(summary?.total_paid)}</p>
                <p className="earnings-card__sub">{summary?.paid_transactions ?? 0} transaction{summary?.paid_transactions !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="earnings-card earnings-card--amber">
              <div className="earnings-card__icon" aria-hidden="true">⏳</div>
              <div className="earnings-card__body">
                <p className="earnings-card__label">Pending</p>
                <p className="earnings-card__value">{fmt(summary?.total_pending)}</p>
                <p className="earnings-card__sub">{summary?.pending_transactions ?? 0} awaiting payment</p>
              </div>
            </div>

            <div className="earnings-card earnings-card--purple">
              <div className="earnings-card__icon" aria-hidden="true">📦</div>
              <div className="earnings-card__body">
                <p className="earnings-card__label">Transactions</p>
                <p className="earnings-card__value">{summary?.total_transactions ?? '—'}</p>
                <p className="earnings-card__sub">With final price recorded</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Ledger ── */}
      <section aria-labelledby="ledger-heading" className="earnings-ledger-section">
        <div className="earnings-ledger-header">
          <h2 id="ledger-heading" className="section-title" style={{ fontSize: 'var(--text-xl)' }}>
            Transaction History
          </h2>

          {/* Filter tabs */}
          <div className="earnings-filter-tabs" role="group" aria-label="Filter by payment status">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`earnings-filter-btn ${filter === opt.value ? 'earnings-filter-btn--active' : ''}`}
                onClick={() => setFilter(opt.value)}
                aria-pressed={filter === opt.value}
                id={`filter-${opt.value}`}
              >
                {opt.label}
                {opt.value !== 'all' && rows.length > 0 && (
                  <span className="earnings-filter-count">
                    {rows.filter((r) => r.payment_status === opt.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Note: in-flight lots without final_price are excluded — backend limitation */}
        {!loadingR && rows.length === 0 && (
          <div className="empty-state card animate-fade-in">
            <span style={{ fontSize: 48 }} aria-hidden="true">📒</span>
            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>
              No payment records yet
            </p>
            <p className="text-muted text-sm">
              Payment records appear here once a lot has been valued and a final price is recorded.
              In-progress lots are visible on your Dashboard.
            </p>
            <Link to="/collector/create-lot" className="btn btn-primary">
              Create a Lot
            </Link>
          </div>
        )}

        {!loadingR && rows.length > 0 && filtered.length === 0 && (
          <div className="empty-state card animate-fade-in">
            <span style={{ fontSize: 48 }} aria-hidden="true">🔍</span>
            <p>No {filter} transactions</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter('all')}>
              Show all
            </button>
          </div>
        )}

        {loadingR ? (
          <PageLoader />
        ) : filtered.length > 0 ? (
          <>
            {/* Desktop: table layout */}
            <div className="ledger-table-wrap hide-mobile" aria-label="Earnings ledger table">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th scope="col">Lot / Reference</th>
                    <th scope="col">Material</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Recycler</th>
                    <th scope="col">Final Price</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Date</th>
                    <th scope="col" className="sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.lot_id}
                      className="ledger-row"
                      onClick={() => setExpandedRow(expandedRow === row.lot_id ? null : row.lot_id)}
                      aria-expanded={expandedRow === row.lot_id}
                    >
                      <td>
                        <span className="ledger-lot-id font-mono">{row.lot_id}</span>
                      </td>
                      <td>{row.material_category}</td>
                      <td>{row.quantity_weight_kg ?? '—'} kg</td>
                      <td>{row.recycler_name ?? '—'}</td>
                      <td className="ledger-price">{fmt(row.final_price)}</td>
                      <td><StatusBadge status={row.payment_status || 'pending'} /></td>
                      <td className="ledger-date">{fmtDate(row.txn_datetime)}</td>
                      <td>
                        <Link
                          to={`/collector/lots/${row.lot_id}`}
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`View lot ${row.lot_id}`}
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <div className="ledger-cards show-mobile-only">
              {filtered.map((row, i) => (
                <div
                  key={row.lot_id}
                  className="ledger-card card stagger-item"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="ledger-card__top">
                    <div>
                      <p className="ledger-lot-id font-mono">{row.lot_id}</p>
                      <p className="ledger-card__material">{row.material_category}</p>
                    </div>
                    <StatusBadge status={row.payment_status || 'pending'} />
                  </div>

                  <div className="ledger-card__row">
                    <span className="ledger-card__label">Weight</span>
                    <span>{row.quantity_weight_kg ?? '—'} kg</span>
                  </div>

                  <div className="ledger-card__row">
                    <span className="ledger-card__label">Recycler</span>
                    <span>{row.recycler_name ?? '—'}</span>
                  </div>

                  <div className="ledger-card__row">
                    <span className="ledger-card__label">Date</span>
                    <span>{fmtDate(row.txn_datetime)}</span>
                  </div>

                  <div className="ledger-card__row">
                    <span className="ledger-card__label">Final Price</span>
                    <span className="ledger-price">{fmt(row.final_price)}</span>
                  </div>

                  <Link
                    to={`/collector/lots/${row.lot_id}`}
                    className="btn btn-outline btn-sm btn-full"
                    style={{ marginTop: 'var(--space-3)' }}
                  >
                    View Lot Detail →
                  </Link>
                </div>
              ))}
            </div>

            {/* Totals footer */}
            <div className="ledger-footer animate-fade-in">
              <span className="text-muted text-sm">
                Showing {filtered.length} of {rows.length} transaction{rows.length !== 1 ? 's' : ''}
              </span>
              <span className="ledger-footer__total">
                Filtered total:{' '}
                <strong>
                  {fmt(filtered.reduce((acc, r) => acc + (Number(r.final_price) || 0), 0))}
                </strong>
              </span>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
