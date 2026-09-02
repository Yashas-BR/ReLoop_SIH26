import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  getPriceTrends, getAllRecyclers, getInstantValuation,
  MATERIAL_CATEGORIES, DEFAULT_LOCATION,
} from '../api/client';
import { PageLoader, SkeletonCard } from '../components/LoadingSpinner';
import './PriceDiscovery.css';
import './PriceDiscoveryP2.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'];
const SAMPLE_WEIGHT = 1; // baseline kg for price card display

function fmt(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function pctChange(arr) {
  if (!arr || arr.length < 2) return null;
  const first = Number(arr[0].buying_price);
  const last = Number(arr[arr.length - 1].buying_price);
  if (!first) return null;
  return ((last - first) / first) * 100;
}

function trendStats(arr) {
  if (!arr || arr.length === 0) return null;
  const prices = arr.map(t => Number(t.buying_price));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    latest: prices[prices.length - 1],
    change: pctChange(arr),
    count: prices.length,
  };
}

export default function PriceDiscovery() {
  const [category, setCategory] = useState(MATERIAL_CATEGORIES[2].id); // PCB default
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [days, setDays] = useState(90);

  const [trends, setTrends] = useState([]);
  const [recyclers, setRecyclers] = useState([]);
  const [priceCards, setPriceCards] = useState({}); // { catId: { unit_price, market_range_low, market_range_high } }

  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingRec, setLoadingRec] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);
  const [error, setError] = useState('');

  // Web Speech
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  // ── Computed ──────────────────────────────────────────────
  const stats = trendStats(trends);
  const catLabel = MATERIAL_CATEGORIES.find(c => c.id === category)?.label;

  // ── Fetch price cards (all categories, current price) ─────
  useEffect(() => {
    setLoadingCards(true);
    Promise.allSettled(
      MATERIAL_CATEGORIES.map(cat =>
        getInstantValuation({ category: cat.id, location, weight: SAMPLE_WEIGHT })
          .then(r => ({ id: cat.id, data: r.data }))
          .catch(() => ({ id: cat.id, data: null }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') map[r.value.id] = r.value.data;
      });
      setPriceCards(map);
    }).finally(() => setLoadingCards(false));
  }, [location]);

  // ── Fetch trend for selected category ─────────────────────
  const fetchTrends = useCallback(() => {
    setLoadingTrend(true);
    setError('');
    getPriceTrends({ category, location, days })
      .then(r => setTrends(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setTrends([]); setError('Could not load price trend data. Is the backend running?'); })
      .finally(() => setLoadingTrend(false));
  }, [category, location, days]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  // ── Fetch recyclers ───────────────────────────────────────
  useEffect(() => {
    getAllRecyclers()
      .then(r => setRecyclers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  }, []);

  // ── Web Speech ────────────────────────────────────────────
  function speakPrice() {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const price = stats?.latest;
    const txt = price
      ? `Current ${catLabel} price in ${location} is Rupees ${Math.round(price)} per kilogram. ${
          stats.change != null ? `Price has ${stats.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(stats.change).toFixed(1)} percent over the last ${days} days.` : ''
        }`
      : `No price data available for ${catLabel} in ${location}.`;
    const utt = new SpeechSynthesisUtterance(txt);
    utt.lang = 'en-IN';
    utt.rate = 0.9;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    synthRef.current.speak(utt);
  }

  function stopSpeaking() {
    synthRef.current?.cancel();
    setSpeaking(false);
  }

  // ── Chart data ────────────────────────────────────────────
  // Build datasets with buying_price + market range band
  const chartLabels = trends.map(t =>
    new Date(t.price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  const hasRange = trends.some(t => t.market_range_low != null && t.market_range_high != null);

  const chartDatasets = [
    // Shaded range band — top boundary
    ...(hasRange ? [{
      label: 'Market High',
      data: trends.map(t => Number(t.market_range_high)),
      borderColor: 'rgba(167,139,250,0.4)',
      backgroundColor: 'rgba(167,139,250,0.12)',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.4,
      fill: '+1',  // fill down to market low dataset
    }] : []),
    // Shaded range band — bottom boundary
    ...(hasRange ? [{
      label: 'Market Low',
      data: trends.map(t => Number(t.market_range_low)),
      borderColor: 'rgba(167,139,250,0.4)',
      backgroundColor: 'rgba(167,139,250,0.12)',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.4,
      fill: false,
    }] : []),
    // Main buying price line
    {
      label: `${catLabel} Buying Price (₹/kg)`,
      data: trends.map(t => Number(t.buying_price)),
      borderColor: '#7C3AED',
      backgroundColor: 'rgba(124,58,237,0.08)',
      borderWidth: 2.5,
      pointRadius: trends.length > 30 ? 0 : 4,
      pointHoverRadius: 7,
      pointBackgroundColor: '#7C3AED',
      tension: 0.4,
      fill: false,
    },
  ];

  const chartData = { labels: chartLabels, datasets: chartDatasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: hasRange,
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 12 }, color: '#6B7280' },
        filter: item => item.text !== 'Market Low',
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label === 'Market Low') return null;
            return `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}/kg`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 8, color: '#6B7280', font: { size: 12 } },
      },
      y: {
        grid: { color: 'rgba(124,58,237,0.05)' },
        ticks: {
          color: '#6B7280',
          font: { size: 12 },
          callback: v => `₹${v}`,
        },
      },
    },
  };

  // ── Filtered recycler rates ───────────────────────────────
  const filteredRecyclers = recyclers.filter(r =>
    r.authorization_status === 'authorized' &&
    (r.materials_accepted || []).includes(category)
  );

  return (
    <div className="container">
      {/* Page Header */}
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">Price Discovery Board</h1>
        <p className="section-subtitle">Live e-waste scrap prices, trends, and authorized recycler rates</p>
      </div>

      {/* ── Location + History Controls ── */}
      <div className="p2-pd-controls animate-fade-in">
        <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
          <label className="form-label" htmlFor="pd-location">Location</label>
          <select
            id="pd-location"
            className="form-input form-select"
            value={location}
            onChange={e => setLocation(e.target.value)}
          >
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 130 }}>
          <label className="form-label" htmlFor="pd-days">History</label>
          <select
            id="pd-days"
            className="form-input form-select"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — Material Price Cards Grid
      ══════════════════════════════════════════════════════ */}
      <section className="animate-fade-in" aria-labelledby="price-cards-heading">
        <div className="p2-section-row">
          <h2 id="price-cards-heading" className="section-title" style={{ fontSize: 'var(--text-xl)' }}>
            Current Market Prices
          </h2>
          <span className="text-sm text-muted">in {location} · per kg</span>
        </div>

        <div className="p2-price-cards-grid">
          {loadingCards
            ? MATERIAL_CATEGORIES.map(c => <SkeletonCard key={c.id} />)
            : MATERIAL_CATEGORIES.map((cat, i) => {
                const card = priceCards[cat.id];
                const isSelected = category === cat.id;
                const chg = null; // per-card trend change requires separate calls; show — for now
                return (
                  <button
                    key={cat.id}
                    className={`p2-price-card stagger-item ${isSelected ? 'p2-price-card--active' : ''} ${!card ? 'p2-price-card--nodata' : ''}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={isSelected}
                  >
                    <div className="p2-price-card__icon" aria-hidden="true">{cat.icon}</div>
                    <div className="p2-price-card__label">{cat.label}</div>
                    <div className="p2-price-card__price">
                      {card ? fmt(card.unit_price) : 'No data'}
                    </div>
                    {card && (
                      <div className="p2-price-card__range">
                        {fmt(card.market_range_low)}–{fmt(card.market_range_high)}
                      </div>
                    )}
                    {isSelected && (
                      <div className="p2-price-card__active-bar" aria-hidden="true" />
                    )}
                  </button>
                );
              })
          }
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — Selected Category Hero + Speak
      ══════════════════════════════════════════════════════ */}
      <div className="p2-hero-row animate-fade-in">
        {/* Category Tabs (horizontal scroll) */}
        <div className="cat-tabs" role="tablist" aria-label="Select material for trend chart">
          {MATERIAL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={category === cat.id}
              className={`cat-tab ${category === cat.id ? 'cat-tab--active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              <span aria-hidden="true">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Price Hero */}
        <div className="price-hero card">
          <div className="price-hero__info">
            <p className="price-hero__label">Current Price — {catLabel} in {location}</p>
            <p className="price-hero__value">
              {stats?.latest ? `${fmt(stats.latest)}/kg` : loadingTrend ? '…' : 'No data'}
            </p>
            {stats?.change != null && (
              <p className={`p2-price-change ${stats.change >= 0 ? 'p2-price-change--up' : 'p2-price-change--down'}`}>
                <span aria-hidden="true">{stats.change >= 0 ? '▲' : '▼'}</span>
                {Math.abs(stats.change).toFixed(1)}% vs {days}d ago
              </p>
            )}
          </div>
          <button
            className={`speak-btn ${speaking ? 'speak-btn--active' : ''}`}
            onClick={speaking ? stopSpeaking : speakPrice}
            aria-label={speaking ? 'Stop reading price aloud' : 'Read current price aloud'}
            title="Web Speech API"
          >
            <span aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
            <span>{speaking ? 'Stop' : 'Read Aloud'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — Trend Stats + Chart
      ══════════════════════════════════════════════════════ */}
      <section className="card animate-fade-in" aria-labelledby="chart-heading">
        <div className="chart-header">
          <h2 id="chart-heading" className="section-title" style={{ fontSize: 'var(--text-xl)' }}>
            Price Trend — {catLabel}
          </h2>
          <span className="text-sm text-muted">{days} days · {location}</span>
        </div>

        {/* Stat chips */}
        {stats && !loadingTrend && (
          <div className="p2-stat-chips">
            <div className="p2-stat-chip">
              <span className="p2-stat-chip__label">Min</span>
              <span className="p2-stat-chip__value">{fmt(stats.min)}</span>
            </div>
            <div className="p2-stat-chip p2-stat-chip--accent">
              <span className="p2-stat-chip__label">Current</span>
              <span className="p2-stat-chip__value">{fmt(stats.latest)}</span>
            </div>
            <div className="p2-stat-chip">
              <span className="p2-stat-chip__label">Avg</span>
              <span className="p2-stat-chip__value">{fmt(Math.round(stats.avg))}</span>
            </div>
            <div className="p2-stat-chip">
              <span className="p2-stat-chip__label">Max</span>
              <span className="p2-stat-chip__value">{fmt(stats.max)}</span>
            </div>
            <div className={`p2-stat-chip ${stats.change != null ? (stats.change >= 0 ? 'p2-stat-chip--up' : 'p2-stat-chip--down') : ''}`}>
              <span className="p2-stat-chip__label">Change</span>
              <span className="p2-stat-chip__value">
                {stats.change != null
                  ? `${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>
        )}

        {loadingTrend ? (
          <PageLoader />
        ) : trends.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 200 }}>
            <span aria-hidden="true" style={{ fontSize: 40 }}>📊</span>
            <p style={{ fontWeight: 'var(--weight-semibold)' }}>No trend data for {catLabel} in {location}</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Try a different location or material category.
            </p>
          </div>
        ) : (
          <div
            className="chart-wrap"
            role="img"
            aria-label={`Price trend for ${catLabel} in ${location} over ${days} days. Current price: ${fmt(stats?.latest)}/kg`}
          >
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Accessible data table (collapsible) */}
        {trends.length > 0 && (
          <details className="chart-table-details">
            <summary className="chart-table-summary">View data table ({trends.length} records)</summary>
            <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
              <table className="price-table" aria-label="Price history data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Buying Price</th>
                    <th>Market Low</th>
                    <th>Market High</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trends].reverse().slice(0, 30).map((t, i) => (
                    <tr key={i}>
                      <td>{new Date(t.price_date).toLocaleDateString('en-IN')}</td>
                      <td>{location}</td>
                      <td style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-primary)' }}>
                        {fmt(t.buying_price)}/kg
                      </td>
                      <td>{fmt(t.market_range_low)}</td>
                      <td>{fmt(t.market_range_high)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — Recycler Rate Table
      ══════════════════════════════════════════════════════ */}
      <section className="card animate-fade-in" aria-labelledby="rates-heading">
        <h2 id="rates-heading" className="section-title" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
          Authorized Recycler Rates — {catLabel}
        </h2>
        <p className="section-subtitle" style={{ marginBottom: 'var(--space-5)' }}>
          Compare rates offered by authorized recyclers in your area
        </p>

        {loadingRec ? (
          <PageLoader />
        ) : filteredRecyclers.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 100 }}>
            <span aria-hidden="true" style={{ fontSize: 32 }}>🏭</span>
            <p>No authorized recyclers currently listed for {catLabel}.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="price-table" aria-label="Authorized recycler rates">
              <thead>
                <tr>
                  <th>Recycler</th>
                  <th>Location</th>
                  <th>Offered Rate</th>
                  <th>Pickup</th>
                  <th>vs Market</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecyclers
                  .sort((a, b) => (b.offered_rate || 0) - (a.offered_rate || 0))
                  .map((r, i) => {
                    const marketPrice = priceCards[category]?.unit_price;
                    const vsMkt = marketPrice && r.offered_rate
                      ? ((r.offered_rate - marketPrice) / marketPrice * 100).toFixed(1)
                      : null;
                    return (
                      <tr key={r.recycler_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {i === 0 && (
                              <span className="p2-best-badge" title="Best rate">★</span>
                            )}
                            <span style={{ fontWeight: 'var(--weight-semibold)' }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>
                          {r.facility_location || r.service_area}
                        </td>
                        <td style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                          {r.offered_rate ? `${fmt(r.offered_rate)}/kg` : '—'}
                        </td>
                        <td>
                          <span style={{ color: r.pickup_available ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                            {r.pickup_available ? '✓ Yes' : '✗ No'}
                          </span>
                        </td>
                        <td>
                          {vsMkt != null ? (
                            <span className={`p2-vs-market ${Number(vsMkt) >= 0 ? 'p2-vs-market--up' : 'p2-vs-market--down'}`}>
                              {Number(vsMkt) >= 0 ? '+' : ''}{vsMkt}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
