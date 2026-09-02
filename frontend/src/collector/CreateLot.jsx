import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createLot, getInstantValuation,
  DEMO_COLLECTOR_ID, DEFAULT_LOCATION, MATERIAL_CATEGORIES,
} from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './CreateLot.css';
import './CreateLotP2.css';

const STEPS = ['Photo & Category', 'Weight & Value', 'Review & Submit'];
const LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'];
const MAX_PHOTOS = 3;

// Debounce helper
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function CreateLot() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  // ── Form state ─────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]); // [{file, preview}]
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [description, setDescription] = useState('');

  // ── Valuation state ────────────────────────────────────────
  const [valuation, setValuation] = useState(null);
  const [loadingVal, setLoadingVal] = useState(false);
  const [valError, setValError] = useState('');

  // ── Submission state ───────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const catObj = MATERIAL_CATEGORIES.find(c => c.id === category);

  // ── Photo handling ─────────────────────────────────────────
  function addPhotos(files) {
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = Array.from(files).slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...toAdd]);
  }

  function removePhoto(idx) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx]?.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    if (photos.length >= MAX_PHOTOS) return;
    addPhotos(e.dataTransfer.files);
  }

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => photos.forEach(p => URL.revokeObjectURL(p.preview));
  }, []); // eslint-disable-line

  // ── Valuation ──────────────────────────────────────────────
  const fetchValuation = useCallback(async (w, cat, loc) => {
    if (!cat || !w || Number(w) <= 0) return;
    setLoadingVal(true);
    setValError('');
    try {
      const r = await getInstantValuation({ category: cat, location: loc, weight: Number(w) });
      setValuation(r.data);
    } catch (e) {
      setValuation(null);
      setValError(e.message?.includes('No pricing data')
        ? `No price data for ${cat} in ${loc}. Try a different location.`
        : 'Could not calculate value — backend may be offline.');
    } finally {
      setLoadingVal(false);
    }
  }, []);

  const debouncedFetchVal = useDebounce(
    (w) => fetchValuation(w, category, location),
    600
  );

  function handleWeightChange(val) {
    setWeight(val);
    if (val && Number(val) > 0 && category) debouncedFetchVal(val);
    else if (!val || Number(val) <= 0) setValuation(null);
  }

  function incrementWeight(delta) {
    const next = Math.max(0.1, (Number(weight) || 0) + delta);
    const rounded = Math.round(next * 10) / 10;
    setWeight(String(rounded));
    if (category) fetchValuation(rounded, category, location);
  }

  // Refresh valuation when location changes (if we have weight + category)
  useEffect(() => {
    if (category && weight && Number(weight) > 0) {
      fetchValuation(weight, category, location);
    }
  }, [location, category]); // eslint-disable-line

  // ── Step navigation ────────────────────────────────────────
  function goToStep2() {
    if (!category) { setError('Please select a material category.'); return; }
    setError('');
    setStep(1);
    if (weight && Number(weight) > 0) fetchValuation(weight, category, location);
  }

  function goToStep3() {
    if (!weight || Number(weight) <= 0) { setError('Enter a valid weight greater than 0.'); return; }
    setError('');
    setStep(2);
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit() {
    setCreating(true);
    setError('');
    try {
      const descParts = [];
      if (subCategory) descParts.push(`Sub-category: ${subCategory}`);
      if (description) descParts.push(description);

      const r = await createLot({
        collector_id: DEMO_COLLECTOR_ID,
        category,
        approx_weight_kg: Number(weight),
        location,
        description: descParts.join(' | ') || undefined,
      });

      navigate('/collector/matched-recyclers', {
        state: {
          lotId: r.data?.lot?.lot_id,
          category,
          location,
          valuation: r.data,
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to create lot. Please try again.');
      setCreating(false);
    }
  }

  // ── Valuation summary helpers ──────────────────────────────
  function fmtRupees(n) {
    if (n == null) return '—';
    return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  const rangePercent = valuation
    ? Math.round(((valuation.unit_price - valuation.market_range_low)
        / (valuation.market_range_high - valuation.market_range_low || 1)) * 100)
    : 0;

  return (
    <div className="container">
      {/* Page Header */}
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">Create New Lot</h1>
        <p className="section-subtitle">Document your scrap and get an instant value estimate</p>
      </div>

      {/* Stepper */}
      <div className="stepper animate-fade-in" role="list" aria-label="Progress steps">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`stepper__step ${i === step ? 'stepper__step--active' : ''} ${i < step ? 'stepper__step--done' : ''}`}
            role="listitem"
            aria-current={i === step ? 'step' : undefined}
          >
            <div className="stepper__dot">
              {i < step ? <span aria-hidden="true">✓</span> : <span>{i + 1}</span>}
            </div>
            <span className="stepper__label hide-mobile">{s}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 0 — Photo + Category
      ══════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="step-panel animate-scale-in">

          {/* ── Photo Section ── */}
          <section className="card p2-photo-section" aria-labelledby="photo-heading">
            <div className="p2-section-header">
              <h2 id="photo-heading" className="p2-section-title">
                <span className="p2-section-icon" aria-hidden="true">📷</span>
                Add Photos
              </h2>
              <span className="p2-photo-count">{photos.length}/{MAX_PHOTOS} photos</span>
            </div>

            {/* Upload Buttons */}
            <div className="p2-upload-btns">
              <button
                className="btn btn-outline p2-upload-btn"
                onClick={() => cameraInputRef.current?.click()}
                disabled={photos.length >= MAX_PHOTOS}
                aria-label="Take a photo with camera"
              >
                <span aria-hidden="true">📷</span> Camera
              </button>
              <button
                className="btn btn-outline p2-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= MAX_PHOTOS}
                aria-label="Upload photo from device"
              >
                <span aria-hidden="true">📁</span> Upload
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                onChange={e => addPhotos(e.target.files)} style={{ display: 'none' }} />
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                onChange={e => addPhotos(e.target.files)} style={{ display: 'none' }} />
            </div>

            {/* Drop zone / Preview grid */}
            {photos.length === 0 ? (
              <div
                className="photo-drop"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                role="button" tabIndex={0}
                aria-label="Drop photos here or click to upload"
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <div className="photo-placeholder">
                  <span aria-hidden="true" style={{ fontSize: 52 }}>📸</span>
                  <p style={{ fontWeight: 'var(--weight-semibold)' }}>
                    Drag &amp; drop or tap to add photos
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    JPG, PNG — up to {MAX_PHOTOS} photos, 10MB each
                  </p>
                </div>
              </div>
            ) : (
              <div className="p2-photo-grid">
                {photos.map((p, idx) => (
                  <div key={idx} className="p2-photo-thumb">
                    <img src={p.preview} alt={`Scrap photo ${idx + 1}`} />
                    <button
                      className="p2-photo-remove"
                      onClick={() => removePhoto(idx)}
                      aria-label={`Remove photo ${idx + 1}`}
                    >
                      ✕
                    </button>
                    {idx === 0 && <span className="p2-photo-primary-badge">Primary</span>}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <div
                    className="p2-photo-add"
                    onClick={() => fileInputRef.current?.click()}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                    aria-label="Add another photo"
                  >
                    <span aria-hidden="true" style={{ fontSize: 28 }}>+</span>
                    <span style={{ fontSize: 'var(--text-xs)' }}>Add photo</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Category Grid ── */}
          <section className="card" aria-labelledby="cat-heading">
            <div className="p2-section-header">
              <h2 id="cat-heading" className="p2-section-title">
                <span className="p2-section-icon" aria-hidden="true">♻</span>
                Select Material Type
              </h2>
              {category && (
                <span className="p2-selected-badge">
                  {catObj?.icon} {catObj?.label}
                </span>
              )}
            </div>

            <div className="category-grid" role="group" aria-label="Material categories">
              {MATERIAL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`category-btn ${category === cat.id ? 'category-btn--selected' : ''}`}
                  onClick={() => { setCategory(cat.id); setSubCategory(''); setError(''); }}
                  aria-pressed={category === cat.id}
                >
                  <span className="category-btn__icon" aria-hidden="true">{cat.icon}</span>
                  <span className="category-btn__label">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-category as pills (low-literacy friendly) */}
            {catObj && (
              <div className="p2-subcat-wrap" aria-labelledby="subcat-label">
                <p id="subcat-label" className="form-label">
                  Sub-category <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(optional)</span>
                </p>
                <div className="p2-subcat-pills" role="group" aria-label="Sub-categories">
                  {catObj.sub.map(s => (
                    <button
                      key={s}
                      className={`p2-subcat-pill ${subCategory === s ? 'p2-subcat-pill--active' : ''}`}
                      onClick={() => setSubCategory(prev => prev === s ? '' : s)}
                      aria-pressed={subCategory === s}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={goToStep2}
            disabled={!category}
          >
            Next: Enter Weight →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 1 — Weight + Live Valuation
      ══════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="step-panel animate-scale-in">
          <section className="card" aria-labelledby="weight-heading">
            <h2 id="weight-heading" className="p2-section-title" style={{ marginBottom: 'var(--space-6)' }}>
              <span className="p2-section-icon" aria-hidden="true">⚖</span>
              Weight &amp; Location
            </h2>

            {/* Large weight stepper */}
            <div className="p2-weight-section">
              <label className="form-label" htmlFor="weight-input">
                Approximate Weight (kg)
              </label>
              <div className="p2-weight-stepper" aria-label="Weight stepper">
                <button
                  className="p2-weight-btn"
                  onClick={() => incrementWeight(-1)}
                  aria-label="Decrease weight by 1 kg"
                  disabled={Number(weight) <= 0.1}
                >−</button>
                <div className="p2-weight-input-wrap">
                  <input
                    id="weight-input"
                    type="number"
                    className="form-input p2-weight-input"
                    placeholder="0.0"
                    min="0.1"
                    step="0.1"
                    value={weight}
                    onChange={e => handleWeightChange(e.target.value)}
                    aria-describedby="weight-hint"
                  />
                  <span className="weight-unit" aria-hidden="true">kg</span>
                </div>
                <button
                  className="p2-weight-btn"
                  onClick={() => incrementWeight(1)}
                  aria-label="Increase weight by 1 kg"
                >+</button>
              </div>
              <p id="weight-hint" className="form-hint">
                Enter the approximate weight. Use + / − buttons for easy adjustment.
              </p>

              {/* Quick weight presets */}
              <div className="p2-weight-presets" role="group" aria-label="Quick weight presets">
                {[1, 2, 5, 10, 20, 50].map(w => (
                  <button
                    key={w}
                    className={`p2-preset-btn ${Number(weight) === w ? 'p2-preset-btn--active' : ''}`}
                    onClick={() => handleWeightChange(String(w))}
                    aria-pressed={Number(weight) === w}
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="form-group" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-label" htmlFor="location-sel">Your Location</label>
              <select
                id="location-sel"
                className="form-input form-select"
                value={location}
                onChange={e => setLocation(e.target.value)}
              >
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <p className="form-hint">Used to calculate your local market price.</p>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="desc-input">
                Notes <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(optional)</span>
              </label>
              <textarea
                id="desc-input"
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Condition, mix type, any special details…"
                rows={2}
              />
            </div>

            {/* ── Live Valuation Panel ── */}
            <div className="p2-valuation-panel" aria-live="polite" aria-label="Instant valuation estimate">
              {loadingVal ? (
                <div className="p2-val-loading">
                  <LoadingSpinner size="sm" />
                  <span>Calculating real-time value from market prices…</span>
                </div>
              ) : valError ? (
                <div className="p2-val-error">
                  <span aria-hidden="true">⚠</span>
                  <span>{valError}</span>
                </div>
              ) : valuation ? (
                <div className="p2-val-result animate-scale-in">
                  {/* Main amount */}
                  <div className="p2-val-header">
                    <div className="p2-val-label">Instant Estimate</div>
                    <div className="p2-val-amount">
                      {fmtRupees(valuation.estimated_value)}
                    </div>
                    <div className="p2-val-breakdown">
                      {fmtRupees(valuation.unit_price)}/kg × {valuation.weight_kg} kg = {fmtRupees(valuation.estimated_value)}
                    </div>
                  </div>

                  {/* Market range bar */}
                  <div className="p2-range-section">
                    <div className="p2-range-labels">
                      <span>Low {fmtRupees(valuation.market_range_low)}/kg</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-primary)' }}>
                        Your price: {fmtRupees(valuation.unit_price)}/kg
                      </span>
                      <span>High {fmtRupees(valuation.market_range_high)}/kg</span>
                    </div>
                    <div className="p2-range-bar" role="img" aria-label={`Your price is at ${rangePercent}% of market range`}>
                      <div className="p2-range-fill" style={{ width: `${Math.max(4, Math.min(rangePercent, 100))}%` }} />
                      <div className="p2-range-marker" style={{ left: `${Math.max(4, Math.min(rangePercent, 96))}%` }} />
                    </div>
                    <p className="p2-range-note">
                      Market range for {valuation.category} in {valuation.location}
                    </p>
                  </div>

                  {/* 3 stat chips */}
                  <div className="p2-val-chips">
                    <div className="p2-val-chip">
                      <span className="p2-val-chip__label">Unit Price</span>
                      <span className="p2-val-chip__value">{fmtRupees(valuation.unit_price)}/kg</span>
                    </div>
                    <div className="p2-val-chip p2-val-chip--accent">
                      <span className="p2-val-chip__label">Total Value</span>
                      <span className="p2-val-chip__value">{fmtRupees(valuation.estimated_value)}</span>
                    </div>
                    <div className="p2-val-chip">
                      <span className="p2-val-chip__label">Weight</span>
                      <span className="p2-val-chip__value">{valuation.weight_kg} kg</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p2-val-empty">
                  <span aria-hidden="true" style={{ fontSize: 40 }}>⚖</span>
                  <p>Enter weight above to see your live market value estimate</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Calculated from real market prices in {location}
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="step-nav">
            <button className="btn btn-outline" onClick={() => { setStep(0); setError(''); }}>← Back</button>
            <button
              className="btn btn-primary btn-lg"
              onClick={goToStep3}
              disabled={!weight || Number(weight) <= 0}
            >
              Review & Submit →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 2 — Review & Submit
      ══════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="step-panel animate-scale-in">
          <section className="card" aria-labelledby="confirm-heading">
            <h2 id="confirm-heading" className="p2-section-title" style={{ marginBottom: 'var(--space-6)' }}>
              <span className="p2-section-icon" aria-hidden="true">✅</span>
              Review &amp; Submit
            </h2>

            {/* Photo thumbnails row */}
            {photos.length > 0 && (
              <div className="p2-confirm-photos">
                {photos.map((p, i) => (
                  <img key={i} src={p.preview} alt={`Photo ${i + 1}`} className="p2-confirm-thumb" />
                ))}
              </div>
            )}

            {/* Summary rows */}
            <div className="confirm-grid">
              <div className="confirm-row">
                <span className="confirm-row__label">Category</span>
                <span className="confirm-row__value">
                  {catObj?.icon} {catObj?.label}
                  {subCategory && <em style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}> — {subCategory}</em>}
                </span>
              </div>
              <div className="confirm-row">
                <span className="confirm-row__label">Weight</span>
                <span className="confirm-row__value">{weight} kg</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-row__label">Location</span>
                <span className="confirm-row__value">{location}</span>
              </div>
              {description && (
                <div className="confirm-row">
                  <span className="confirm-row__label">Notes</span>
                  <span className="confirm-row__value" style={{ fontSize: 'var(--text-sm)' }}>{description}</span>
                </div>
              )}
              {valuation && (
                <div className="confirm-row confirm-row--highlight">
                  <span className="confirm-row__label">Estimated Value</span>
                  <span className="confirm-row__value confirm-row__value--big">
                    {fmtRupees(valuation.estimated_value)}
                  </span>
                </div>
              )}
            </div>

            {/* Full valuation breakdown on confirm */}
            {valuation && (
              <div className="p2-confirm-val-detail">
                <div className="p2-confirm-val-row">
                  <span>Market price ({location})</span>
                  <strong>{fmtRupees(valuation.unit_price)}/kg</strong>
                </div>
                <div className="p2-confirm-val-row">
                  <span>Market range</span>
                  <strong>{fmtRupees(valuation.market_range_low)} – {fmtRupees(valuation.market_range_high)}/kg</strong>
                </div>
                <div className="p2-confirm-val-row">
                  <span>Photos attached</span>
                  <strong>{photos.length} photo{photos.length !== 1 ? 's' : ''}</strong>
                </div>
              </div>
            )}
          </section>

          <div className="step-nav">
            <button className="btn btn-outline" onClick={() => { setStep(1); setError(''); }}>← Back</button>
            <button
              className="btn btn-accent btn-lg"
              onClick={handleSubmit}
              disabled={creating}
              aria-busy={creating}
            >
              {creating ? <><LoadingSpinner size="sm" /> Submitting…</> : <><span aria-hidden="true">🚀</span> Submit Lot</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
