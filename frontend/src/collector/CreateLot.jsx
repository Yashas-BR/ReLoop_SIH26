import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  createLot, getInstantValuation,
  DEMO_COLLECTOR_ID, DEFAULT_LOCATION, MATERIAL_CATEGORIES,
  submitAiFeedback, updateAiFeedback,
} from '../api/client';
import { currentCollectorId } from '../services/auth';
import { classifyFile } from '../services/classification/analyze';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useTranslation } from '../i18n/config.js';
import './CreateLot.css';
import './CreateLotP2.css';

const LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'];
const MAX_PHOTOS = 3;

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function CreateLot() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  // Creating a lot requires a logged-in Kabadiwala account.
  const collectorId = currentCollectorId();

  const STEPS = [
    t('createLot.steps.photoCategory'),
    t('createLot.steps.weightValue'),
    t('createLot.steps.reviewSubmit'),
  ];

  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [description, setDescription] = useState('');

  const [classify, setClassify] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyDismissed, setClassifyDismissed] = useState(false);
  const [aiFeedbackId, setAiFeedbackId] = useState(null);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  // Pipeline reticle staged through while the classifier runs. Pure framing —
  // the actual classification is the offline canvas heuristic in
  // services/classification/analyze.js.
  const PIPELINE = [
    'createLot.classification.pipeline.capture',
    'createLot.classification.pipeline.segment',
    'createLot.classification.pipeline.featExtract',
    'createLot.classification.pipeline.hueMap',
    'createLot.classification.pipeline.classify',
  ];

  const [valuation, setValuation] = useState(null);
  const [loadingVal, setLoadingVal] = useState(false);
  const [valError, setValError] = useState('');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [offlineSaved, setOfflineSaved] = useState(false);

  const catObj = MATERIAL_CATEGORIES.find(c => c.id === category);

  const catMeta = (id) => MATERIAL_CATEGORIES.find(c => c.id === id);

  function applySuggestion(id) {
    setCategory(id);
    setSubCategory('');
    setError('');
    setClassifyDismissed(true);
    // Record human outcome: accepted if same as AI prediction, corrected otherwise
    if (aiFeedbackId && classify) {
      const outcome = id === classify.category ? 'accepted' : 'corrected';
      updateAiFeedback(aiFeedbackId, { human_category: id, outcome }).catch(() => {});
    }
  }

  function addPhotos(files) {
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = Array.from(files).slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...toAdd]);
    if (toAdd.length) setClassifyDismissed(false);
  }

  function removePhoto(idx) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx]?.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  // Compress the primary photo before sending it to the backend. The backend
  // uploads it to Cloudinary and stores only the returned HTTPS URL.
  function fileToDataUrl(file, maxDim = 640, quality = 0.7) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(reader.result);
        img.onload = () => {
          try {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch {
            resolve(reader.result);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    if (photos.length >= MAX_PHOTOS) return;
    addPhotos(e.dataTransfer.files);
  }

  useEffect(() => {
    return () => photos.forEach(p => URL.revokeObjectURL(p.preview));
  }, []); // eslint-disable-line

  useEffect(() => {
    const file = photos[0]?.file;
    if (!file || category || classifyDismissed) return;
    let cancelled = false;
    setClassifying(true);
    setClassify(null);
    setScanStep(0);
    setScanProgress(0);

    // Drive the reticle animation while the real heuristic analysis runs.
    const tick = setInterval(() => {
      if (cancelled) return;
      setScanProgress((p) => Math.min(96, (p ?? 0) + (7 + Math.random() * 14)));
      setScanStep((s) => Math.min(PIPELINE.length - 1, s + 1));
    }, 280);

    classifyFile(file)
      .then(res => {
        if (!cancelled) {
          setScanProgress(100);
          setClassify(res);
          // Fire-and-forget: record the AI prediction to the feedback dataset
          submitAiFeedback({
            collector_id: collectorId ?? null,
            ai_predicted_category: res.category,
            ai_confidence: res.confidence,
            ai_verdict: res.verdict,
            ai_candidates: res.candidates,
            ai_features: res.features,
            outcome: 'pending',
          }).then(r => {
            if (r?.data?.id) setAiFeedbackId(r.data.id);
          }).catch(() => {});
        }
      })
      .catch(() => { if (!cancelled) setClassify(null); })
      .finally(() => {
        if (!cancelled) { clearInterval(tick); setClassifying(false); }
      });
    return () => { cancelled = true; clearInterval(tick); };
  }, [photos[0]?.file]); // eslint-disable-line

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
        ? t('createLot.valuation.noPriceData', { category: cat, location: loc })
        : t('offline.backendOffline'));
    } finally {
      setLoadingVal(false);
    }
  }, [t]);

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

  useEffect(() => {
    if (category && weight && Number(weight) > 0) {
      fetchValuation(weight, category, location);
    }
  }, [location, category]); // eslint-disable-line

  function goToStep2() {
    if (!category) { setError(t('createLot.errors.selectCategory')); return; }
    setError('');
    // If collector manually picked a category without using the AI suggestion, record dismissal
    if (aiFeedbackId && classify && !classifyDismissed) {
      const outcome = category === classify.category ? 'accepted' : 'corrected';
      updateAiFeedback(aiFeedbackId, { human_category: category, outcome }).catch(() => {});
      setClassifyDismissed(true);
    }
    setStep(1);
    if (weight && Number(weight) > 0) fetchValuation(weight, category, location);
  }

  function goToStep3() {
    if (!weight || Number(weight) <= 0) { setError(t('createLot.errors.validWeight')); return; }
    setError('');
    setStep(2);
  }

  async function handleSubmit() {
    setCreating(true);
    setError('');
    try {
      const descParts = [];
      if (subCategory) descParts.push(`Sub-category: ${subCategory}`);
      if (description) descParts.push(description);

      // Every selected collection photo becomes its own immutable Cloudinary
      // evidence record. The first URL remains the lot cover image.
      const image_refs = await Promise.all(photos.map((photo) => fileToDataUrl(photo.file)));

      const r = await createLot({
        collector_id: collectorId ?? DEMO_COLLECTOR_ID,
        category,
        approx_weight_kg: Number(weight),
        location,
        description: descParts.join(' | ') || undefined,
        image_refs: image_refs.filter(Boolean),
      });

      if (r.queued) {
        setOfflineSaved(true);
        setCreating(false);
        return;
      }

      navigate('/collector/matched-recyclers', {
        state: {
          lotId: r.data?.lot?.lot_id,
          category,
          location,
          valuation: r.data,
        },
      });
    } catch (err) {
      setError(err.message || t('createLot.errors.submitFailed'));
      setCreating(false);
    }
  }

  function fmtRupees(n) {
    if (n == null) return '—';
    return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  const rangePercent = valuation
    ? Math.round(((valuation.unit_price - valuation.market_range_low)
        / (valuation.market_range_high - valuation.market_range_low || 1)) * 100)
    : 0;

  if (!collectorId) {
    return <Navigate to="/login" replace state={{ from: '/collector/create-lot' }} />;
  }

  return (
    <div className="container">
      <div className="animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">{t('createLot.title')}</h1>
        <p className="section-subtitle">{t('createLot.subtitle')}</p>
      </div>

      {/* Offline-first: lot captured and queued locally */}
      {offlineSaved && (
        <div className="step-panel animate-scale-in" role="status">
          <section className="card p2-offline-saved">
            <div className="p2-offline-saved__icon" aria-hidden="true"></div>
            <h2 className="p2-section-title" style={{ textAlign: 'center' }}>
              {t('createLot.offlineSaved.title')}
            </h2>
            <p className="p2-offline-saved__desc">
              {t('createLot.offlineSaved.desc')}
            </p>
            <p className="p2-offline-saved__queue">
              {t('createLot.offlineSaved.queueNote')}
            </p>
            <Link to="/collector" className="btn btn-primary btn-lg btn-full">
              {t('createLot.offlineSaved.action')}
            </Link>
          </section>
        </div>
      )}

      {!offlineSaved && (<>
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
              {i < step ? <span>✓</span> : <span>{i + 1}</span>}
            </div>
            <span className="stepper__label hide-mobile">{s}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert-banner alert-banner--error animate-fade-in" role="alert">
           {error}
        </div>
      )}

      {/* STEP 0 — Photo + Category */}
      {step === 0 && (
        <div className="step-panel animate-scale-in">
          <section className="card p2-photo-section" aria-labelledby="photo-heading">
            <div className="p2-section-header">
              <h2 id="photo-heading" className="p2-section-title">
                
                {t('createLot.photos.heading')}
              </h2>
              <span className="p2-photo-count">
                {t('createLot.photos.count', { current: photos.length, max: MAX_PHOTOS })}
              </span>
            </div>

            <div className="p2-upload-btns">
              <button
                className="btn btn-outline p2-upload-btn"
                onClick={() => cameraInputRef.current?.click()}
                disabled={photos.length >= MAX_PHOTOS}
                aria-label={t('createLot.photos.cameraLabel')}
              >
                 {t('createLot.photos.camera')}
              </button>
              <button
                className="btn btn-outline p2-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= MAX_PHOTOS}
                aria-label={t('createLot.photos.uploadLabel')}
              >
                 {t('createLot.photos.upload')}
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                onChange={e => addPhotos(e.target.files)} style={{ display: 'none' }} />
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                onChange={e => addPhotos(e.target.files)} style={{ display: 'none' }} />
            </div>

            {photos.length === 0 ? (
              <div
                className="photo-drop"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                role="button" tabIndex={0}
                aria-label={t('createLot.photos.dropLabel')}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <div className="photo-placeholder">
                  
                  <p style={{ fontWeight: 'var(--weight-semibold)' }}>
                    {t('createLot.photos.dragDrop')}
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    {t('createLot.photos.dropHint', { max: MAX_PHOTOS })}
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
                      aria-label={t('createLot.photos.removePhoto', { n: idx + 1 })}
                    >
                      
                    </button>
                    {idx === 0 && <span className="p2-photo-primary-badge">{t('createLot.photos.primary')}</span>}

                    {/* AI scanning reticle overlay on the primary photo */}
                    {idx === 0 && (classifying) && (
                      <div className="p2-scan p2-scan--active" aria-hidden="true">
                        <div className="p2-scan__scanline" />
                        <div className="p2-scan__corner p2-scan__corner--tl" />
                        <div className="p2-scan__corner p2-scan__corner--tr" />
                        <div className="p2-scan__corner p2-scan__corner--bl" />
                        <div className="p2-scan__corner p2-scan__corner--br" />
                        <div className="p2-scan__progress" style={{ width: `${scanProgress}%` }} />
                        <div className="p2-scan__status">
                          <span className="p2-scan__dot" />
                          {t(PIPELINE[scanStep])}
                        </div>
                      </div>
                    )}

                    {/* Detection result chip once analysed */}
                    {idx === 0 && classify && !classifyDismissed && category !== classify.category && !classifying && (
                      <div className="p2-scan p2-scan--done" aria-hidden="true">
                        <div className="p2-scan__done-ring" style={{ ['--conf' ]: classify.confidence }}>
                          <span className="p2-scan__done-pct">
                            {Math.round(classify.confidence * 100)}%
                          </span>
                        </div>
                        <div className="p2-scan__done-label">
                          {catObj && t('createLot.classification.detected', { label: catObj.label })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <div
                    className="p2-photo-add"
                    onClick={() => fileInputRef.current?.click()}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                    aria-label={t('createLot.photos.addPhoto')}
                  >
                    <span aria-hidden="true" style={{ fontSize: 28 }}>+</span>
                    <span style={{ fontSize: 'var(--text-xs)' }}>{t('createLot.photos.addPhoto')}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {(classifying || (classify && !classifyDismissed && category !== classify.category)) && (
            <section className="card p2-classify" aria-live="polite" aria-label={t('createLot.classification.suggested')}>
              {classifying ? (
                <div className="p2-classify-row p2-classify-row--busy">
                  <div className="p2-classify-busy">
                    <LoadingSpinner size="sm" />
                    <span className="p2-classify-busy__step">{t(PIPELINE[scanStep])}</span>
                    <span className="p2-classify-busy__progress">{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="p2-classify-busy__bar">
                    <div className="p2-classify-busy__bar-fill" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="p2-classify-head">
                    <span className="p2-classify-badge">{t('createLot.classification.autoSuggest')}</span>
                    <span className={`p2-classify-conf p2-classify-conf--${classify.verdict}`}>
                      {classify.verdict === 'high' && t('createLot.classification.confidenceHigh')}
                      {classify.verdict === 'medium' && t('createLot.classification.confidenceMedium')}
                      {classify.verdict === 'low' && t('createLot.classification.confidenceLow')}
                    </span>
                  </div>
                  <div className="p2-classify-pick">
                    {(() => { const m = catMeta(classify.category); return (
                      <button className="p2-classify-main" onClick={() => applySuggestion(classify.category)}>
                        <span className="category-btn__icon" aria-hidden="true">{m?.icon}</span>
                        <span className="p2-classify-main__label">{m?.label}</span>
                      </button>
                    ); })()}
                    <button className="btn btn-primary btn-sm" onClick={() => applySuggestion(classify.category)}>
                      {t('createLot.classification.use')}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setClassifyDismissed(true)}>
                      {t('createLot.classification.dismiss')}
                    </button>
                  </div>
                  <div className="p2-classify-alts">
                    <span className="p2-classify-alts__label">{t('createLot.classification.alternatives')}:</span>
                    {classify.candidates.slice(1).map(c => { const m = catMeta(c.category); return (
                      <button key={c.category} className="p2-classify-alt" onClick={() => applySuggestion(c.category)}>
                        <span className="p2-classify-alt__bar" style={{ width: `${Math.round(c.confidence * 100)}%` }} />
                        <span className="p2-classify-alt__label">{m?.icon} {m?.label}</span>
                        <span className="p2-classify-alt__pct">{Math.round(c.confidence * 100)}%</span>
                      </button>
                    ); })}
                  </div>
                </>
              )}
            </section>
          )}

          <section className="card" aria-labelledby="cat-heading">
            <div className="p2-section-header">
              <h2 id="cat-heading" className="p2-section-title">
                
                {t('createLot.category.heading')}
              </h2>
              {category && (
                <span className="p2-selected-badge">
                  {catObj?.icon} {catObj?.label}
                </span>
              )}
            </div>

            <div className="category-grid" role="group" aria-label={t('createLot.category.label')}>
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

            {catObj && (
              <div className="p2-subcat-wrap" aria-labelledby="subcat-label">
                <p id="subcat-label" className="form-label">
                  {t('createLot.category.subCategory')}{' '}
                  <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                    {t('common.optional')}
                  </span>
                </p>
                <div className="p2-subcat-pills" role="group" aria-label={t('createLot.category.subCategoryLabel')}>
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
            {t('createLot.buttons.nextWeight')}
          </button>
        </div>
      )}

      {/* STEP 1 — Weight + Live Valuation */}
      {step === 1 && (
        <div className="step-panel animate-scale-in">
          <section className="card" aria-labelledby="weight-heading">
            <h2 id="weight-heading" className="p2-section-title" style={{ marginBottom: 'var(--space-6)' }}>
              
              {t('createLot.weight.heading')}
            </h2>

            <div className="p2-weight-section">
              <label className="form-label" htmlFor="weight-input">
                {t('createLot.weight.label')}
              </label>
              <div className="p2-weight-stepper" aria-label={t('createLot.weight.stepperLabel')}>
                <button
                  className="p2-weight-btn"
                  onClick={() => incrementWeight(-1)}
                  aria-label={t('createLot.weight.decrease')}
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
                  aria-label={t('createLot.weight.increase')}
                >+</button>
              </div>
              <p id="weight-hint" className="form-hint">
                {t('createLot.weight.hint')}
              </p>

              <div className="p2-weight-presets" role="group" aria-label={t('createLot.weight.presets')}>
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

            <div className="form-group" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-label" htmlFor="location-sel">{t('createLot.location.label')}</label>
              <select
                id="location-sel"
                className="form-input form-select"
                value={location}
                onChange={e => setLocation(e.target.value)}
              >
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <p className="form-hint">{t('createLot.location.hint')}</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="desc-input">
                {t('createLot.notes.label')}{' '}
                <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                  {t('common.optional')}
                </span>
              </label>
              <textarea
                id="desc-input"
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('createLot.notes.placeholder')}
                rows={2}
              />
            </div>

            {/* Live Valuation Panel */}
            <div className="p2-valuation-panel" aria-live="polite" aria-label={t('createLot.valuation.label')}>
              {loadingVal ? (
                <div className="p2-val-loading">
                  <LoadingSpinner size="sm" />
                  <span>{t('createLot.valuation.calculating')}</span>
                </div>
              ) : valError ? (
                <div className="p2-val-error">
                  
                  <span>{valError}</span>
                </div>
              ) : valuation ? (
                <div className="p2-val-result animate-scale-in">
                  <div className="p2-val-header">
                    <div className="p2-val-label">{t('createLot.valuation.instantEstimate')}</div>
                    <div className="p2-val-amount">{fmtRupees(valuation.estimated_value)}</div>
                    <div className="p2-val-breakdown">
                      {t('createLot.valuation.breakdown', {
                        unitPrice: fmtRupees(valuation.unit_price),
                        weight: valuation.weight_kg,
                        total: fmtRupees(valuation.estimated_value),
                      })}
                    </div>
                  </div>

                  <div className="p2-range-section">
                    <div className="p2-range-labels">
                      <span>{t('createLot.valuation.low', { price: fmtRupees(valuation.market_range_low) })}</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-primary)' }}>
                        {t('createLot.valuation.yourPrice', { price: fmtRupees(valuation.unit_price) })}
                      </span>
                      <span>{t('createLot.valuation.high', { price: fmtRupees(valuation.market_range_high) })}</span>
                    </div>
                    <div
                      className="p2-range-bar"
                      role="img"
                      aria-label={t('createLot.valuation.priceAt', { pct: rangePercent })}
                    >
                      <div className="p2-range-fill" style={{ width: `${Math.max(4, Math.min(rangePercent, 100))}%` }} />
                      <div className="p2-range-marker" style={{ left: `${Math.max(4, Math.min(rangePercent, 96))}%` }} />
                    </div>
                    <p className="p2-range-note">
                      {t('createLot.valuation.marketRange', { category: valuation.category, location: valuation.location })}
                    </p>
                  </div>

                  <div className="p2-val-chips">
                    <div className="p2-val-chip">
                      <span className="p2-val-chip__label">{t('createLot.valuation.unitPrice')}</span>
                      <span className="p2-val-chip__value">{fmtRupees(valuation.unit_price)}/kg</span>
                    </div>
                    <div className="p2-val-chip p2-val-chip--accent">
                      <span className="p2-val-chip__label">{t('createLot.valuation.totalValue')}</span>
                      <span className="p2-val-chip__value">{fmtRupees(valuation.estimated_value)}</span>
                    </div>
                    <div className="p2-val-chip">
                      <span className="p2-val-chip__label">{t('createLot.valuation.weight')}</span>
                      <span className="p2-val-chip__value">{valuation.weight_kg} kg</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p2-val-empty">
                  
                  <p>{t('createLot.valuation.empty')}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {t('createLot.valuation.emptyNote', { location })}
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="step-nav">
            <button className="btn btn-outline" onClick={() => { setStep(0); setError(''); }}>
              {t('common.back')}
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={goToStep3}
              disabled={!weight || Number(weight) <= 0}
            >
              {t('createLot.buttons.reviewSubmit')}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Review & Submit */}
      {step === 2 && (
        <div className="step-panel animate-scale-in">
          <section className="card" aria-labelledby="confirm-heading">
            <h2 id="confirm-heading" className="p2-section-title" style={{ marginBottom: 'var(--space-6)' }}>
              
              {t('createLot.review.heading')}
            </h2>

            {photos.length > 0 && (
              <div className="p2-confirm-photos">
                {photos.map((p, i) => (
                  <img key={i} src={p.preview} alt={`Photo ${i + 1}`} className="p2-confirm-thumb" />
                ))}
              </div>
            )}

            <div className="confirm-grid">
              <div className="confirm-row">
                <span className="confirm-row__label">{t('createLot.review.category')}</span>
                <span className="confirm-row__value">
                  {catObj?.icon} {catObj?.label}
                  {subCategory && <em style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}> — {subCategory}</em>}
                </span>
              </div>
              <div className="confirm-row">
                <span className="confirm-row__label">{t('createLot.review.weight')}</span>
                <span className="confirm-row__value">{weight} kg</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-row__label">{t('createLot.review.location')}</span>
                <span className="confirm-row__value">{location}</span>
              </div>
              {description && (
                <div className="confirm-row">
                  <span className="confirm-row__label">{t('createLot.review.notes')}</span>
                  <span className="confirm-row__value" style={{ fontSize: 'var(--text-sm)' }}>{description}</span>
                </div>
              )}
              {valuation && (
                <div className="confirm-row confirm-row--highlight">
                  <span className="confirm-row__label">{t('createLot.review.estimatedValue')}</span>
                  <span className="confirm-row__value confirm-row__value--big">
                    {fmtRupees(valuation.estimated_value)}
                  </span>
                </div>
              )}
            </div>

            {valuation && (
              <div className="p2-confirm-val-detail">
                <div className="p2-confirm-val-row">
                  <span>{t('createLot.review.marketPrice', { location })}</span>
                  <strong>{fmtRupees(valuation.unit_price)}/kg</strong>
                </div>
                <div className="p2-confirm-val-row">
                  <span>{t('createLot.review.marketRange')}</span>
                  <strong>{fmtRupees(valuation.market_range_low)} – {fmtRupees(valuation.market_range_high)}/kg</strong>
                </div>
                <div className="p2-confirm-val-row">
                  <span>{t('createLot.review.photosAttached')}</span>
                  <strong>
                    {photos.length} {photos.length !== 1 ? t('common.photos') : t('common.photo')}
                  </strong>
                </div>
              </div>
            )}

            {/* AI Explainability card — shows what data drove the estimate */}
            {(classify || valuation) && (
              <div className="p2-ai-explain" role="region" aria-label="AI analysis summary">
                <div className="p2-ai-explain__header">
                  <span className="p2-ai-explain__icon" aria-hidden="true">🤖</span>
                  <span className="p2-ai-explain__title">AI Analysis Summary</span>
                </div>
                <ul className="p2-ai-explain__list">
                  {classify && (
                    <li>
                      <span className="p2-ai-explain__check">✓</span>
                      <span>
                        Material detected: <strong>{catObj?.label ?? classify.category}</strong>
                        {' '}({Math.round(classify.confidence * 100)}% confidence
                        {' — '}
                        {classify.verdict === 'high' && 'high'}
                        {classify.verdict === 'medium' && 'medium'}
                        {classify.verdict === 'low' && 'low — please verify'})
                      </span>
                    </li>
                  )}
                  {valuation && (
                    <>
                      <li>
                        <span className="p2-ai-explain__check">✓</span>
                        <span>Weight: <strong>{weight} kg</strong></span>
                      </li>
                      <li>
                        <span className="p2-ai-explain__check">✓</span>
                        <span>
                          Market data: <strong>{valuation.price_samples ?? 1} price record{valuation.price_samples !== 1 ? 's' : ''}</strong>
                          {' '}in {valuation.location}
                        </span>
                      </li>
                      <li>
                        <span className="p2-ai-explain__check">✓</span>
                        <span>
                          Weighted avg price: <strong>{fmtRupees(valuation.unit_price)}/kg</strong>
                          {' '}(range {fmtRupees(valuation.market_range_low)}–{fmtRupees(valuation.market_range_high)})
                        </span>
                      </li>
                    </>
                  )}
                  <li>
                    <span className="p2-ai-explain__note" aria-hidden="true">ℹ️</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                      This is an estimate. The recycler’s quote determines the final price.
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </section>

          <div className="step-nav">
            <button className="btn btn-outline" onClick={() => { setStep(1); setError(''); }}>
              {t('common.back')}
            </button>
            <button
              className="btn btn-accent btn-lg"
              onClick={handleSubmit}
              disabled={creating}
              aria-busy={creating}
            >
              {creating
                ? <><LoadingSpinner size="sm" /> {t('createLot.buttons.submitting')}</>
                : <> {t('createLot.buttons.submitLot')}</>
              }
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
