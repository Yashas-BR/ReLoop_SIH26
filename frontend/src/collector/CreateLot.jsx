import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createLot, getInstantValuation,
  DEMO_COLLECTOR_ID, DEFAULT_LOCATION, MATERIAL_CATEGORIES,
} from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './CreateLot.css';

const STEPS = ['Photo & Category', 'Weight & Value', 'Confirm'];

export default function CreateLot() {
  const navigate = useNavigate();
  const fileRef = useRef();

  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [description, setDescription] = useState('');
  const [valuation, setValuation] = useState(null);
  const [loadingVal, setLoadingVal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdLot, setCreatedLot] = useState(null);

  const catObj = MATERIAL_CATEGORIES.find(c => c.id === category);

  // Step 1: Photo
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // Step 1 → Step 2
  async function goToStep2() {
    if (!category) { setError('Please select a material category.'); return; }
    setError('');
    setStep(1);
    if (weight) await fetchValuation(weight);
  }

  // Live valuation
  async function fetchValuation(w) {
    if (!category || !w || Number(w) <= 0) return;
    setLoadingVal(true);
    try {
      const r = await getInstantValuation({ category, location, weight: Number(w) });
      setValuation(r.data);
    } catch {
      setValuation(null);
    } finally {
      setLoadingVal(false);
    }
  }

  async function handleWeightChange(e) {
    setWeight(e.target.value);
    if (e.target.value && Number(e.target.value) > 0) {
      await fetchValuation(e.target.value);
    }
  }

  // Step 2 → Step 3
  function goToStep3() {
    if (!weight || Number(weight) <= 0) { setError('Enter a valid weight.'); return; }
    setError('');
    setStep(2);
  }

  // Final Submit
  async function handleSubmit() {
    setCreating(true);
    setError('');
    try {
      const r = await createLot({
        collector_id: DEMO_COLLECTOR_ID,
        category,
        approx_weight_kg: Number(weight),
        location,
        description: description || (subCategory ? `Sub-category: ${subCategory}` : ''),
      });
      setCreatedLot(r.data);
      // Navigate to matched recyclers with lot context
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
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container">
      {/* Page Header */}
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-8)' }}>
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
        <div className="alert-banner alert-banner--error animate-fade-in">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}

      {/* ── STEP 0: Photo + Category ── */}
      {step === 0 && (
        <div className="step-panel animate-scale-in">
          {/* Photo Upload */}
          <section className="card" aria-labelledby="photo-heading">
            <h2 id="photo-heading" className="section-title" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
              📷 Add a Photo
            </h2>
            <div
              className="photo-drop"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload photo of scrap"
              onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Scrap preview" className="photo-preview" />
              ) : (
                <div className="photo-placeholder">
                  <span aria-hidden="true" style={{ fontSize: 48 }}>📸</span>
                  <p>Tap to take a photo or upload</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>JPG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              aria-label="Upload photo"
            />
            {photoPreview && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setPhoto(null); setPhotoPreview(''); }}
                style={{ marginTop: 'var(--space-3)' }}
              >
                Remove photo
              </button>
            )}
          </section>

          {/* Category Grid */}
          <section className="card" aria-labelledby="cat-heading">
            <h2 id="cat-heading" className="section-title" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
              ♻ Select Material Type
            </h2>
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

            {/* Sub-category */}
            {catObj && (
              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-label" htmlFor="sub-cat">Sub-category (optional)</label>
                <select
                  id="sub-cat"
                  className="form-input form-select"
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                >
                  <option value="">Choose sub-category…</option>
                  {catObj.sub.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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

      {/* ── STEP 1: Weight + Valuation ── */}
      {step === 1 && (
        <div className="step-panel animate-scale-in">
          <section className="card" aria-labelledby="weight-heading">
            <h2 id="weight-heading" className="section-title" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-6)' }}>
              ⚖ Enter Weight
            </h2>

            <div className="form-group">
              <label className="form-label" htmlFor="weight-input">Weight in Kilograms</label>
              <div className="weight-input-wrap">
                <input
                  id="weight-input"
                  type="number"
                  className="form-input weight-input"
                  placeholder="e.g. 5.0"
                  min="0.1"
                  step="0.1"
                  value={weight}
                  onChange={handleWeightChange}
                  aria-describedby="weight-hint"
                />
                <span className="weight-unit">kg</span>
              </div>
              <p id="weight-hint" className="form-hint">Enter the approximate weight of your scrap material.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="location-input">Your Location</label>
              <input
                id="location-input"
                type="text"
                className="form-input"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="desc-input">Notes (optional)</label>
              <textarea
                id="desc-input"
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Any extra details about condition, quantity, etc."
                rows={3}
              />
            </div>

            {/* Valuation Display */}
            <div className="valuation-box" aria-live="polite" aria-label="Instant valuation">
              {loadingVal ? (
                <div className="valuation-loading">
                  <LoadingSpinner size="sm" />
                  <span>Calculating value…</span>
                </div>
              ) : valuation ? (
                <div className="valuation-result animate-scale-in">
                  <div className="valuation-result__header">
                    <span aria-hidden="true">💰</span>
                    <span>Instant Estimate</span>
                  </div>
                  <div className="valuation-result__amount">
                    ₹{Number(valuation.estimated_value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="valuation-result__detail">
                    ₹{valuation.unit_price}/kg · {valuation.weight_kg} kg · {valuation.category}
                  </div>
                  <div className="valuation-result__range">
                    Market range: ₹{valuation.market_range_low}–₹{valuation.market_range_high}/kg
                  </div>
                </div>
              ) : (
                <div className="valuation-empty">
                  <span aria-hidden="true">⚖</span>
                  <span>Enter weight above to see your estimated value</span>
                </div>
              )}
            </div>
          </section>

          <div className="step-nav">
            <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
            <button
              className="btn btn-primary btn-lg"
              onClick={goToStep3}
              disabled={!weight || Number(weight) <= 0}
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Confirm ── */}
      {step === 2 && (
        <div className="step-panel animate-scale-in">
          <section className="card" aria-labelledby="confirm-heading">
            <h2 id="confirm-heading" className="section-title" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-6)' }}>
              ✅ Review & Submit
            </h2>

            <div className="confirm-grid">
              {photoPreview && (
                <div className="confirm-row">
                  <span className="confirm-row__label">Photo</span>
                  <img src={photoPreview} alt="Scrap preview" className="confirm-photo" />
                </div>
              )}
              <div className="confirm-row">
                <span className="confirm-row__label">Category</span>
                <span className="confirm-row__value">
                  {catObj?.icon} {catObj?.label}{subCategory ? ` — ${subCategory}` : ''}
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
              {valuation && (
                <div className="confirm-row confirm-row--highlight">
                  <span className="confirm-row__label">Estimated Value</span>
                  <span className="confirm-row__value confirm-row__value--big">
                    ₹{Number(valuation.estimated_value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {description && (
                <div className="confirm-row">
                  <span className="confirm-row__label">Notes</span>
                  <span className="confirm-row__value">{description}</span>
                </div>
              )}
            </div>
          </section>

          <div className="step-nav">
            <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
            <button
              className="btn btn-accent btn-lg"
              onClick={handleSubmit}
              disabled={creating}
            >
              {creating ? <LoadingSpinner size="sm" /> : null}
              {creating ? 'Submitting…' : '🚀 Submit Lot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
