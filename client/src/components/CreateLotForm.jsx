import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

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
          
          // Extract unique categories
          const cats = [...new Set(res.data.data.map(m => m.category))];
          setCategories(cats);

          // Default selection to first item in E-Waste or first category
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

  // When category changes, auto-select first material in that category
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

  // 2. Fetch real live valuation calculation whenever material, weight, or condition changes
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
        if (active) {
          console.error('Estimate error:', err);
        }
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

  // Handle photo select
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

  // 3. Handle Form Submit (Multipart POST)
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
              <span>Log Material Lot</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Record collected e-waste or scrap to discover fair authorized market value and match with verified recyclers.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
            <span>Live Price Discovery: <strong className="text-brand-400 font-mono">ON</strong></span>
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
            
            {/* Step 1: Category Picker */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                1. Select Material Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                      selectedCategory === cat
                        ? 'bg-brand-500/15 border-brand-500/60 text-brand-300 shadow-sm shadow-brand-500/20'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{CATEGORY_ICONS[cat] || '♻️'}</span>
                    <span className="truncate">{cat}</span>
                  </button>
                ))}
              </div>

              {/* Sub-Category Dropdown */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Specific Material / Item Type:
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400 transition-colors"
                >
                  {filteredMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.sub_category} ({m.unit ? `INR/${m.unit}` : 'kg'})
                    </option>
                  ))}
                </select>

                {selectedMaterial && (
                  <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-1.5">
                    <p className="text-slate-400">{selectedMaterial.description}</p>
                    {selectedMaterial.recoverable_materials?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wide">
                          Recoverable Critical Minerals:
                        </span>
                        {selectedMaterial.recoverable_materials.map((rm) => (
                          <span
                            key={rm}
                            className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]"
                          >
                            ✦ {rm}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Weight & Source */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Weight & Quantity
              </label>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span className="font-semibold">Approximate Weight (kg)</span>
                  <span className="text-slate-500">Preset buttons:</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="e.g. 15.0"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-bold text-white focus:outline-none focus:border-brand-400 transition-colors font-mono"
                      required
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-500 font-mono text-sm">kg</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[2, 5, 10, 25, 50].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeightKg(String(w))}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-mono font-medium transition-all ${
                          Number(weightKg) === w
                            ? 'bg-brand-500 text-surface-950 border-brand-400 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {w}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Condition Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Material Condition (Affects Payout Rate):
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'good', label: 'Good / Intact', bonus: '+5% Fair Bonus', desc: 'Clean, sorted, undamaged', border: 'border-emerald-500/40', text: 'text-emerald-400' },
                    { id: 'fair', label: 'Fair / Standard', bonus: 'Standard 100%', desc: 'Normal wear, complete unit', border: 'border-blue-500/40', text: 'text-blue-400' },
                    { id: 'poor', label: 'Poor / Damaged', bonus: '-15% Discount', desc: 'Stripped, burnt, mixed', border: 'border-rose-500/40', text: 'text-rose-400' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCondition(c.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        condition === c.id
                          ? `bg-slate-800/90 ${c.border} ring-1 ring-brand-400`
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">{c.label}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${c.text}`}>{c.bonus}</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{c.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Type */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Collection Source:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'household', label: '🏠 Household', desc: 'Residential pickups' },
                    { id: 'industrial', label: '🏭 Industrial', desc: 'Factory/Workshop scrap' },
                    { id: 'institutional', label: '🏢 Institutional', desc: 'Offices, IT parks, schools' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSourceType(s.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                        sourceType === s.id
                          ? 'bg-slate-800 border-brand-500/60 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <p className="font-semibold text-xs">{s.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Photo Upload & Location */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Photo Verification & Pickup Location
              </label>

              {/* File upload with drag & preview */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {!photoPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-xl p-5 text-center cursor-pointer transition-all bg-slate-950/30 hover:bg-slate-950/60 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-brand-500/20 text-slate-400 group-hover:text-brand-400 flex items-center justify-center mx-auto mb-2 transition-colors text-2xl">
                      📷
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      Click to upload photo of material lot
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Required for digital traceability certificate & recycler verification (PNG, JPG, max 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <img
                      src={photoPreview}
                      alt="Lot preview"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end justify-between p-3">
                      <span className="text-xs text-slate-200 font-mono bg-slate-900/80 px-2 py-1 rounded-md border border-slate-700">
                        {photoFile?.name} ({(photoFile?.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="px-2.5 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded-md text-xs font-semibold transition-colors"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pickup Address & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pickup Location / Area:
                  </label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="e.g. Peenya 2nd Stage, Bengaluru"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Additional Notes:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 5 laptops without charger, sorted"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Valuation Breakdown & Submit Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-20 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <h2 className="text-base font-bold text-white font-['Outfit']">
                    Real-Time Fair Market Valuation
                  </h2>
                </div>
                {isValuing && (
                  <div className="flex items-center gap-1 text-[11px] text-brand-400">
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span>
                    <span>Updating…</span>
                  </div>
                )}
              </div>

              {/* Primary Value Display */}
              <div className="bg-slate-950/80 border border-brand-500/30 rounded-2xl p-5 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-brand-500 via-emerald-400 to-brand-500"></div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Estimated Authorized Recycler Payout
                </p>
                <div className="text-4xl sm:text-5xl font-black text-brand-300 font-mono tracking-tight my-2">
                  ₹{valuation?.total_estimated_value ? valuation.total_estimated_value.toLocaleString('en-IN') : '0'}
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Confidence Range: <span className="text-white font-semibold">₹{valuation?.estimated_range?.min?.toLocaleString('en-IN') || 0}</span> – <span className="text-white font-semibold">₹{valuation?.estimated_range?.max?.toLocaleString('en-IN') || 0}</span>
                </p>
              </div>

              {/* Breakdown Table */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Selected Material:</span>
                  <span className="font-semibold text-white">{selectedMaterial?.sub_category || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Logged Net Weight:</span>
                  <span className="font-mono font-semibold text-white">{weightKg || 0} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">7-Day Market Average:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    ₹{valuation?.avg_buying_price_7d || 0}/kg
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Condition Adjustment:</span>
                  <span className={`font-mono font-semibold ${
                    condition === 'good' ? 'text-emerald-400' : condition === 'poor' ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {valuation?.condition_multiplier ? `${(valuation.condition_multiplier * 100).toFixed(0)}%` : '100%'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Effective Rate Applied:</span>
                  <span className="font-mono font-bold text-brand-400">
                    ₹{valuation?.effective_rate_per_kg || 0}/kg
                  </span>
                </div>
                <div className="flex justify-between py-1.5 text-slate-300">
                  <span className="text-slate-400">Price Trend:</span>
                  <span className={`font-semibold flex items-center gap-1 ${
                    valuation?.price_trend === 'rising' ? 'text-emerald-400' : valuation?.price_trend === 'falling' ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {valuation?.price_trend === 'rising' ? '📈 Rising (+3%)' : valuation?.price_trend === 'falling' ? '📉 Falling (-3%)' : '➡️ Stable'}
                  </span>
                </div>
              </div>

              {/* Informative Comparison Box: Informal Middleman vs Authorized */}
              <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-200/90 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>💡</span>
                  <span>Why Authorized Recyclers?</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Informal local scrap yards typically offer ~30–40% below fair market value for e-waste (₹{Math.round((valuation?.total_estimated_value || 0) * 0.65).toLocaleString('en-IN')}). By logging here, you connect directly with CPCB/KSPCB authorized recyclers.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedMaterialId || !weightKg || Number(weightKg) <= 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-surface-950 font-extrabold text-base transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-surface-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving to Database…</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Save Lot & Generate Handover Record</span>
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
