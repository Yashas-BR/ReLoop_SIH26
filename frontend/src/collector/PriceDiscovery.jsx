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
import { useTranslation } from '../i18n/config.js';
import './PriceDiscovery.css';
import './PriceDiscoveryP2.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'];
const SAMPLE_WEIGHT = 1;

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
  const { t } = useTranslation();
  const [category, setCategory] = useState(MATERIAL_CATEGORIES[2].id);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [days, setDays] = useState(90);

  const [trends, setTrends] = useState([]);
  const [recyclers, setRecyclers] = useState([]);
  const [priceCards, setPriceCards] = useState({});

  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingRec, setLoadingRec] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);
  const [error, setError] = useState('');

  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  const stats = trendStats(trends);
  const catLabel = MATERIAL_CATEGORIES.find(c => c.id === category)?.label;

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

  const fetchTrends = useCallback(() => {
    setLoadingTrend(true);
    setError('');
    getPriceTrends({ category, location, days })
      .then(r => setTrends(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setTrends([]); setError(t('prices.loadError')); })
      .finally(() => setLoadingTrend(false));
  }, [category, location, days, t]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  useEffect(() => {
    getAllRecyclers()
      .then(r => setRecyclers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  }, []);

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

  const chartLabels = trends.map(t =>
    new Date(t.price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  const hasRange = trends.some(t => t.market_range_low != null && t.market_range_high != null);

  const chartDatasets = [
    ...(hasRange ? [{
      label: t('priceDiscovery.marketHigh'),
      data: trends.map(t => Number(t.market_range_high)),
      borderColor: 'rgba(167,139,250,0.4)',
      backgroundColor: 'rgba(167,139,250,0.12)',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.4,
      fill: '+1',
    }] : []),
    ...(hasRange ? [{
      label: t('priceDiscovery.marketLow'),
      data: trends.map(t => Number(t.market_range_low)),
      borderColor: 'rgba(167,139,250,0.4)',
      backgroundColor: 'rgba(167,139,250,0.12)',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.4,
      fill: false,
    }] : []),
    {
      label: `${catLabel} ${t('priceDiscovery.buyingPrice')} (₹/kg)`,
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
        filter: item => item.text !== t('priceDiscovery.marketLow'),
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label === t('priceDiscovery.marketLow')) return null;
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

  const filteredRecyclers = recyclers.filter(r =>
    r.authorization_status === 'authorized' &&
    (r.materials_accepted || []).includes(category)
  );

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">{t('dashboard.priceBoard')}</h1>
        <p className="section-subtitle">{t('priceDiscovery.subtitle')}</p>
      </div>

      {/* Controls */}
      <div className="p2-pd-controls animate-fade-in">
        <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
          <label className="form-label" htmlFor="pd-location">{t('prices.location')}</label>
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
          <label className="form-label" htmlFor="pd-days">{t('prices.days')}</label>
          <select
            id="pd-days"
            className="form-input form-select"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={30}>{t('prices.day30')}</option>
            <option value={60}>{t('prices.day60')}</option>
            <option value={90}>{t('prices.day90')}</option>
          </select>
        </div>
      </div>

      {/* Section 1 — Price Cards */}
      <section className="animate-fade-in" aria-labelledby="regional-prices-heading">
        <div className="p2-section-row">
          <h2 id="regional-prices-heading" className="section-title" style={{ fontSize: 'var(--text-xl)' }}>
            {t('priceDiscovery.regionalPrices')}
          </h2>
          <span className="text-sm text-muted">
            {t('prices.priceCard', { category: '', location }).replace(' — ', '')} · {t('prices.buyingPrice').toLowerCase()}
          </span>
        </div>

        <div className="p2-price-cards-grid">
          {loadingCards
            ? MATERIAL_CATEGORIES.map(c => <SkeletonCard key={c.id} />)
            : MATERIAL_CATEGORIES.map((cat, i) => {
                const card = priceCards[cat.id];
                const isSelected = category === cat.id;
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
                    <div className="region-card__row">
                      <span>{t('priceDiscovery.unitPrice')}</span>
                      <span className="region-card__val font-mono">{card ? fmt(card.unit_price) : t('common.noData')} <span className="text-muted">/ {t('common.kg')}</span></span>
                    </div>
                    {card && (
                      <div className="region-card__row">
                        <span>{t('priceDiscovery.marketRange')}</span>
                        <span className="region-card__val font-mono">{fmt(card.market_range_low)}–{fmt(card.market_range_high)}</span>
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

      {/* Section 2 — Hero + Speak */}
      <div className="p2-hero-row animate-fade-in">
        <div className="cat-tabs" role="tablist" aria-label={t('prices.selectCategory')}>
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

        <div className="price-hero card">
          <div className="price-hero__info">
            <p className="price-hero__label">
              {t('prices.priceCard', { category: catLabel, location })}
            </p>
            <div className="price-main-stat__content">
              <span className="price-main-stat__value">{stats?.latest ? fmt(stats.latest) : loadingTrend ? '…' : t('common.noData')}</span>
              {stats?.latest && <span className="price-main-stat__unit">/ {t('common.kg')}</span>}
            </div>
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
            aria-label={speaking ? t('priceDiscovery.stopAudio') : t('priceDiscovery.speakPrice')}
          >
            <span aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
            <span>{speaking ? t('priceDiscovery.stopAudio') : t('priceDiscovery.speakPrice')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {/* Section 3 — Trend Chart */}
      <section className="card animate-fade-in" aria-labelledby="chart-heading">
        <div className="chart-header">
          <h2 id="chart-heading" className="section-title" style={{ fontSize: 'var(--text-xl)' }}>
            {t('prices.trendChart')} — {catLabel}
          </h2>
          <span className="text-sm text-muted">{days} {t('prices.days')} · {location}</span>
        </div>

        {stats && !loadingTrend && (
          <div className="p2-stat-chips">
            <div className="p2-stat-chip">
              <span className="p2-stat-chip__label">{t('prices.min')}</span>
              <span className="p2-stat-chip__value">{fmt(stats.min)}</span>
            </div>
            <div className="p2-stat-chip p2-stat-chip--accent">
              <span className="p2-stat-chip__label">{t('prices.latest')}</span>
              <span className="p2-stat-chip__value">{fmt(stats.latest)}</span>
            </div>
            <div className="p2-stat-chip">
              <span className="p2-stat-chip__label">{t('prices.avg')}</span>
              <span className="p2-stat-chip__value">{fmt(Math.round(stats.avg))}</span>
            </div>
            <div className="p2-stat-chip">
              <span className="p2-stat-chip__label">{t('prices.max')}</span>
              <span className="p2-stat-chip__value">{fmt(stats.max)}</span>
            </div>
            <div className={`p2-stat-chip ${stats.change != null ? (stats.change >= 0 ? 'p2-stat-chip--up' : 'p2-stat-chip--down') : ''}`}>
              <span className="p2-stat-chip__label">{t('prices.change')}</span>
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
            <p style={{ fontWeight: 'var(--weight-semibold)' }}>
              {t('prices.noTrendData')}
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

        {trends.length > 0 && (
          <details className="chart-table-details">
            <summary className="chart-table-summary">
              {t('prices.trendChartDesc')} ({trends.length} {t('prices.dataPoints')})
            </summary>
            <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
              <table className="price-table" aria-label="Price history data">
                <thead>
                  <tr>
                    <th>{t('dashboard.date')}</th>
                    <th>{t('prices.location')}</th>
                    <th>{t('prices.buyingPrice')}</th>
                    <th>{t('prices.min')}</th>
                    <th>{t('prices.max')}</th>
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

      {/* Section 4 — Recycler Rates */}
      <section className="card animate-fade-in" aria-labelledby="rates-heading">
        <h2 id="rates-heading" className="section-title" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
          {t('prices.recyclerRates')} — {catLabel}
        </h2>
        <p className="section-subtitle" style={{ marginBottom: 'var(--space-5)' }}>
          {t('prices.currentRatesDesc')}
        </p>

        {loadingRec ? (
          <PageLoader />
        ) : filteredRecyclers.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 100 }}>
            <span aria-hidden="true" style={{ fontSize: 32 }}>🏭</span>
            <p>{t('prices.noRecyclers')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="price-table" aria-label="Authorized recycler rates">
              <thead>
                <tr>
                  <th>{t('prices.recyclerName')}</th>
                  <th>{t('prices.location')}</th>
                  <th>{t('prices.offered')}</th>
                  <th>{t('prices.pickup')}</th>
                  <th>vs {t('prices.buyingPrice')}</th>
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
                            {r.pickup_available ? `✓ ${t('prices.yes')}` : `✗ ${t('prices.no')}`}
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
