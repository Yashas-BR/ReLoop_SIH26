import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getPriceTrends, getAllRecyclers, MATERIAL_CATEGORIES, DEFAULT_LOCATION } from '../api/client';
import { PageLoader } from '../components/LoadingSpinner';
import './PriceDiscovery.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'];

function fmt(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function PriceDiscovery() {
  const [category, setCategory] = useState(MATERIAL_CATEGORIES[2].id); // PCB default
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [days, setDays] = useState(90);
  const [trends, setTrends] = useState([]);
  const [recyclers, setRecyclers] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingRec, setLoadingRec] = useState(true);
  const [error, setError] = useState('');

  // Web Speech API
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  const latestPrice = trends.length > 0
    ? trends[trends.length - 1].buying_price
    : null;

  function speakPrice() {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const cat = MATERIAL_CATEGORIES.find(c => c.id === category);
    const txt = latestPrice
      ? `Current ${cat?.label || category} price in ${location} is Rupees ${Math.round(latestPrice)} per kilogram.`
      : `No price data available for ${cat?.label || category} in ${location}.`;
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

  const fetchTrends = useCallback(() => {
    setLoadingTrend(true);
    setError('');
    getPriceTrends({ category, location, days })
      .then(r => setTrends(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setTrends([]); setError('Could not load price data. Backend may be offline.'); })
      .finally(() => setLoadingTrend(false));
  }, [category, location, days]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  useEffect(() => {
    getAllRecyclers()
      .then(r => setRecyclers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoadingRec(false));
  }, []);

  // Chart data
  const chartData = {
    labels: trends.map(t => {
      const d = new Date(t.price_date);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }),
    datasets: [{
      label: `${category} Buying Price (₹/kg)`,
      data: trends.map(t => Number(t.buying_price)),
      borderColor: '#7C3AED',
      backgroundColor: 'rgba(124,58,237,0.1)',
      borderWidth: 2.5,
      pointRadius: trends.length > 30 ? 0 : 4,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: true,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `₹${ctx.parsed.y.toLocaleString('en-IN')}/kg`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 8, color: '#6B7280', font: { size: 12 } },
      },
      y: {
        grid: { color: 'rgba(124,58,237,0.06)' },
        ticks: {
          color: '#6B7280',
          font: { size: 12 },
          callback: v => `₹${v}`,
        },
      },
    },
  };

  // Recycler rate table (filter by selected category)
  const filteredRecyclers = recyclers.filter(r =>
    r.authorization_status === 'authorized' &&
    (r.materials_accepted || []).includes(category)
  );

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="section-title">Price Discovery</h1>
        <p className="section-subtitle">Live rates and historical trends for e-waste materials</p>
      </div>

      {/* Controls */}
      <div className="price-controls animate-fade-in">
        {/* Category Tabs */}
        <div className="cat-tabs" role="tablist" aria-label="Material categories">
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

        <div className="price-filters">
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label" htmlFor="location-sel">Location</label>
            <select
              id="location-sel"
              className="form-input form-select"
              value={location}
              onChange={e => setLocation(e.target.value)}
            >
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 140 }}>
            <label className="form-label" htmlFor="days-sel">History</label>
            <select
              id="days-sel"
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
      </div>

      {error && (
        <div className="alert-banner alert-banner--warn animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {/* Current Price Card */}
      <div className="price-hero card animate-fade-in">
        <div className="price-hero__info">
          <p className="price-hero__label">Current Price</p>
          <p className="price-hero__value">
            {latestPrice ? `₹${Number(latestPrice).toLocaleString('en-IN')}/kg` : 'No data'}
          </p>
          <p className="price-hero__meta">
            {MATERIAL_CATEGORIES.find(c => c.id === category)?.label} · {location}
          </p>
        </div>
        <button
          className={`speak-btn ${speaking ? 'speak-btn--active' : ''}`}
          onClick={speaking ? stopSpeaking : speakPrice}
          aria-label={speaking ? 'Stop reading price aloud' : 'Read price aloud'}
          title="Read price aloud (Web Speech API)"
        >
          <span aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
          <span>{speaking ? 'Stop' : 'Read Aloud'}</span>
        </button>
      </div>

      {/* Chart */}
      <section className="card animate-fade-in" aria-labelledby="chart-heading">
        <div className="chart-header">
          <h2 id="chart-heading" className="section-title" style={{ fontSize: 'var(--text-xl)' }}>
            Price Trend — {MATERIAL_CATEGORIES.find(c => c.id === category)?.label}
          </h2>
          <span className="text-sm text-muted">{days} days · {location}</span>
        </div>

        {loadingTrend ? (
          <PageLoader />
        ) : trends.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 200 }}>
            <span aria-hidden="true" style={{ fontSize: 36 }}>📊</span>
            <p>No trend data available for this category/location.</p>
          </div>
        ) : (
          <div className="chart-wrap" role="img" aria-label={`Price trend for ${category} in ${location}`}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Accessible data table */}
        {trends.length > 0 && (
          <details className="chart-table-details">
            <summary className="chart-table-summary">View data table</summary>
            <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
              <table className="price-table" aria-label="Price history data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Buying Price</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trends].reverse().slice(0, 20).map((t, i) => (
                    <tr key={i}>
                      <td>{new Date(t.price_date).toLocaleDateString('en-IN')}</td>
                      <td>{t.location}</td>
                      <td>{fmt(t.buying_price)}/kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* Recycler Rate Table */}
      <section className="card animate-fade-in" aria-labelledby="rates-heading">
        <h2 id="rates-heading" className="section-title" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
          Recycler Rates — {category}
        </h2>

        {loadingRec ? (
          <PageLoader />
        ) : filteredRecyclers.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 100 }}>
            <p>No authorized recyclers found for {category}.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="price-table" aria-label="Recycler rates">
              <thead>
                <tr>
                  <th>Recycler</th>
                  <th>Location</th>
                  <th>Offered Rate</th>
                  <th>Pickup</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecyclers.map(r => (
                  <tr key={r.recycler_id}>
                    <td className="font-semibold">{r.name}</td>
                    <td>{r.facility_location || r.service_area}</td>
                    <td className="text-accent font-bold">
                      {r.offered_rate ? `₹${r.offered_rate}/kg` : '—'}
                    </td>
                    <td>{r.pickup_available ? '✓ Yes' : '✗ No'}</td>
                    <td>
                      <span className="pill" style={{
                        background: 'var(--status-confirmed-bg)',
                        color: 'var(--status-confirmed)',
                      }}>Authorized</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
