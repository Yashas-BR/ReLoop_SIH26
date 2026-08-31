import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CATEGORY_ICONS = {
  'E-Waste': '💻',
  'PCBs': '🖲️',
  'Cables': '🔌',
  'Batteries': '🔋',
  'Motors & Magnets': '⚙️',
  'LCD Panels': '🖥️',
  'Metals': '🔩',
  'Plastics': '🧴',
  'Paper': '📦',
  'Mixed E-Scrap': '🗑️',
};

export default function CreateLotForm({ onLotCreated, activeCollector }) {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('E-Waste');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [weightKg, setWeightKg] = useState('12.5');
  const [condition, setCondition] = useState('good');
  const [sourceType, setSourceType] = useState('household');
  const [notes, setNotes] = useState('');
  const [pickupAddress, setPickupAddress] = useState('Indiranagar 100ft Road, Bengaluru');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Live valuation state from real DB lookup
  const [valuation, setValuation] = useState(null);
  const [isValuing, setIsValuing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // 1. Fetch materials on mount
  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await axios.get('/api/materials');
        if (res.data.status === 'ok') {
          setMaterials(res.data.data);
          
          const cats = [...new Set(res.data.data.map(m => m.category))];
          setCategories(cats);

          const defaultMat = res.data.data.find(m => m.category === 'E-Waste') || res.data.data[0];
          if (defaultMat) {
            setSelectedCategory(defaultMat.category);
            setSelectedMaterialId(defaultMat.id);
          }
        }
      } catch (err) {
        console.error('Failed to load materials:', err);
        setError('Failed to load materials catalog from server.');
      }
    }
    loadMaterials();
  }, []);

  const filteredMaterials = materials.filter(m => m.category === selectedCategory);
  useEffect(() => {
    if (filteredMaterials.length > 0) {
      const match = filteredMaterials.find(m => m.id === Number(selectedMaterialId));
      if (!match) {
        setSelectedMaterialId(filteredMaterials[0].id);
      }
    }
  }, [selectedCategory, materials]);

  const selectedMaterial = materials.find(m => m.id === Number(selectedMaterialId));

  // 2. Fetch real live valuation calculation
  useEffect(() => {
    let active = true;
    async function fetchEstimate() {
      if (!selectedMaterialId || !weightKg || Number(weightKg) <= 0) {
        setValuation(null);
        return;
      }
      setIsValuing(true);
      try {
        const res = await axios.post('/api/lots/estimate', {
          material_id: Number(selectedMaterialId),
          weight_kg: Number(weightKg),
          condition,
          location: activeCollector?.operating_location || 'Bengaluru',
        });
        if (active && res.data.status === 'ok') {
          setValuation(res.data.valuation);
        }
      } catch (err) {
        if (active) console.error('Estimate error:', err);
      } finally {
        if (active) setIsValuing(false);
      }
    }

    const timer = setTimeout(fetchEstimate, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedMaterialId, weightKg, condition, activeCollector]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPresetWeight = (amount) => {
    const current = parseFloat(weightKg) || 0;
    setWeightKg((current + amount).toFixed(1));
  };

  // 3. Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMaterialId || !weightKg || Number(weightKg) <= 0) {
      setError('Please provide a valid material and weight.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('collector_id', activeCollector?.id || 1);
      formData.append('material_id', selectedMaterialId);
      formData.append('weight_kg', weightKg);
      formData.append('condition', condition);
      formData.append('source_type', sourceType);
      formData.append('notes', notes);
      formData.append('pickup_address', pickupAddress);
      formData.append('latitude', activeCollector?.latitude || 12.9716);
      formData.append('longitude', activeCollector?.longitude || 77.5946);

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await axios.post('/api/lots', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'ok') {
        onLotCreated(res.data.lot_id);
      }
    } catch (err) {
      console.error('Create lot error:', err);
      setError(err.response?.data?.message || 'Failed to submit lot. Check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] flex items-center gap-2.5">
              <span>📦</span>
              <span>{t('form.title')}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('form.subtitle')}
            </p>
          </div>
          {/* Low-literacy quick hint banner */}
          <div className="flex items-center gap-2 bg-slate-900 border border-brand-500/30 rounded-xl px-3.5 py-2 text-xs text-brand-300 shadow-sm">
            <span className="text-base">💡</span>
            <span>{t('form.lowLiteracyTip')}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Category Picker (High-visual icon grid for low-literacy accessibility) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span>1️⃣</span>
                <span>{t('form.selectCategory')}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-md shadow-brand-500/20 ring-1 ring-brand-400'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-2xl">{CATEGORY_ICONS[cat] || '♻️'}</span>
                    <span className="truncate leading-snug">{cat}</span>
                  </button>
                ))}
              </div>

              {/* Sub-Category Dropdown */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <span>🏷️</span>
                  <span>{t('form.selectItem')}:</span>
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400 transition-colors"
                >
                  {filteredMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.sub_category} ({m.unit ? `₹/${m.unit}` : 'kg'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Weight & Condition Input */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
                <span>2️⃣</span>
                <span>{t('form.weight')}</span>
              </label>

              {/* Weight Input + Quick Preset Buttons */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder={t('form.weightPlaceholder')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-brand-400 transition-colors pr-12"
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 font-mono font-bold text-sm">
                    kg
                  </span>
                </div>

                {/* Visual Quick Add Buttons for Ease of Use */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">Quick Add:</span>
                  {[
                    { label: '+5 kg', val: 5 },
                    { label: '+10 kg', val: 10 },
                    { label: '+25 kg', val: 25 },
                    { label: '+50 kg', val: 50 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => addPresetWeight(btn.val)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold border border-slate-700/80 transition-all cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Options */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                  <span>3️⃣</span>
                  <span>{t('form.condition')}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'good', label: t('conditions.good'), icon: '✨' },
                    { id: 'fair', label: t('conditions.fair'), icon: '⚖️' },
                    { id: 'poor', label: t('conditions.poor'), icon: '⚠️' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCondition(c.id)}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                        condition === c.id
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm ring-1 ring-brand-400'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xl">{c.icon}</span>
                      <span className="leading-tight text-[11px]">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Type */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('form.sourceType')}:
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-400"
                >
                  <option value="household">{t('sources.household')}</option>
                  <option value="industrial">{t('sources.industrial')}</option>
                  <option value="institutional">{t('sources.institutional')}</option>
                </select>
              </div>

              {/* Pickup Address */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{t('form.pickupLocation')}:</span>
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="e.g. Peenya Industrial Area, Bengaluru"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('form.notes')}:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dell Laptops x 4 with batteries removed"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-400"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Fair Valuation Card & Photo Proof (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Pricing / Valuation Card */}
            <div className="bg-gradient-to-br from-slate-900 via-surface-900 to-slate-900 border-2 border-brand-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                    {t('form.estimatedValue')}
                  </h3>
                </div>
                {isValuing && (
                  <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></span>
                )}
              </div>

              {/* Big Price Display */}
              <div className="my-3">
                <div className="text-4xl sm:text-5xl font-black text-brand-300 font-mono tracking-tight">
                  {valuation ? `₹${Number(valuation.total_estimated_value).toLocaleString('en-IN')}` : '₹—'}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Guaranteed transparent minimum benchmark
                </p>
              </div>

              {/* Breakdown Grid */}
              {valuation && (
                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">{t('form.marketPrice')}:</span>
                    <span className="font-mono font-bold">₹{valuation.avg_buying_price_7d}/kg</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Condition Multiplier:</span>
                    <span className="font-mono font-bold">{valuation.condition_multiplier}x</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">{t('form.effectiveRate')}:</span>
                    <span className="font-mono font-bold text-brand-400">₹{valuation.effective_rate_per_kg}/kg</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Net Weight:</span>
                    <span className="font-mono font-bold">{valuation.weight_kg} kg</span>
                  </div>
                </div>
              )}

              {/* Photo Proof Box */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
                  <span>📸 {t('form.photoProof')}</span>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="text-[11px] text-red-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </label>

                {photoPreview ? (
                  <div className="rounded-xl overflow-hidden border border-slate-700 aspect-video relative group">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-brand-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/40"
                  >
                    <span className="text-2xl">📷</span>
                    <p className="text-xs text-slate-400 mt-1">Tap to capture or upload photo</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !valuation}
                className="w-full mt-6 py-4 px-6 rounded-2xl bg-brand-500 hover:bg-brand-400 text-surface-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-surface-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>{t('form.submitting')}</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>{t('form.submit')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
