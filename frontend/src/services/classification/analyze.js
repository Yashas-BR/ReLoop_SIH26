/**
 * On-device heuristic material classifier for ReLoop / SIH26229.
 *
 * Architecture: pure pixel-signal feature extractor → weighted rule scoring →
 * softmax normalisation. No external model required; runs fully in-browser.
 *
 * Key fixes (v2):
 *  - Corrected hue bucketing: yellow-green (20–60°) → copper/gold bin (was
 *    incorrectly merged into `green`, causing Cable→PCB and Motor confusions).
 *  - Lowered MAGNIFY exponent (6 → 4) so near-tied scores don't produce
 *    spuriously high confidence for the "winner".
 *  - Image quality guard: dark, overexposed, and near-uniform images are
 *    detected before classification and return verdict='unreadable'.
 *  - Tighter confidence thresholds for medium/high verdicts.
 *  - Added `reason` field: human-readable explanation of the top signal.
 *  - Console debug logging for tracing mis-classifications.
 */

export const CATEGORY_IDS = ['CRT', 'LCD', 'PCB', 'Cable', 'Battery', 'Motor', 'Plastic'];

const SAMPLE_SIZE = 160;

// ── Image quality thresholds ─────────────────────────────────────────────────
const QUALITY = {
  MIN_LUM: 0.05,       // below this → too dark (relaxed)
  MAX_LUM: 0.98,       // above this → overexposed (relaxed)
  MIN_SAT_VAR: 0.002,  // extremely low color variance (relaxed for metal/plastic)
  MIN_EDGE: 0.01,      // almost no edges (relaxed to prevent false blurry flags)
  MIN_PIXELS: 1000,    // minimum meaningful pixel count
};

// ── Pixel decoder ────────────────────────────────────────────────────────────
function decodeImage(image, maxSize = 512) {
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const step = Math.max(1, Math.round(w / SAMPLE_SIZE));
  const sw = Math.floor(w / step);
  const sh = Math.floor(h / step);
  const data = ctx.getImageData(0, 0, sw * step, sh * step).data;
  const pixels = [];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = (y * step * w + x * step) * 4;
      pixels.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      });
    }
  }
  return pixels;
}

// ── Color space conversion ───────────────────────────────────────────────────
function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  let h = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s, l };
}

function luminance({ r, g, b }) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ── Feature extraction ───────────────────────────────────────────────────────
function collectFeatures(pixels) {
  const n = pixels.length;
  let lumSum = 0;
  let satSum = 0;
  let darkCount = 0;
  let brightCount = 0;

  /*
   * Hue bins (v2 fix):
   *   green:   pure plant/circuit-board green   170–60° crossing via 60–170
   *   blue:    cool blues and cyans             170–250°
   *   copper:  warm yellows, orange, gold       20–60°  ← FIXED (was merged into green)
   *   red:     reds and magentas               0–20° and 330–360°
   *   purple:  purples                          250–330°
   *   neutral: low-saturation (grey/white/black)
   */
  const hueBins = { green: 0, blue: 0, copper: 0, red: 0, neutral: 0, purple: 0 };
  const satValues = [];

  for (let i = 0; i < n; i++) {
    const { h, s, l } = rgbToHsl(pixels[i]);
    lumSum += l;
    satSum += s;
    satValues.push(s);
    if (l < 0.22) darkCount++;
    if (l > 0.80) brightCount++;

    if (s < 0.12) {
      hueBins.neutral++;
    } else if (h >= 60 && h < 170) {
      // Pure greens — circuit board substrate, green cable insulation
      hueBins.green++;
    } else if (h >= 170 && h < 250) {
      // Blues — capacitor bodies, LCD frames
      hueBins.blue++;
    } else if (h >= 20 && h < 60) {
      // Yellow-orange-gold — copper traces, gold connector pins, yellow cables
      // FIX: was incorrectly merged into `green`, destroying Motor/Cable signals
      hueBins.copper++;
    } else if ((h >= 0 && h < 20) || h >= 330) {
      // Reds and magentas
      hueBins.red++;
    } else if (h >= 250 && h < 330) {
      // Purples — CRT phosphor artifacts, some battery wraps
      hueBins.purple++;
    }
    // Note: no separate `else` needed — all ranges are exhaustive
  }

  satValues.sort((a, b) => a - b);
  const q75 = satValues[Math.floor(n * 0.75)] || 0;

  // Edge detection via luminance gradient (simplified Sobel)
  let edgeSum = 0;
  for (let y = 1; y < SAMPLE_SIZE; y++) {
    for (let x = 1; x < SAMPLE_SIZE; x++) {
      if ((y * SAMPLE_SIZE + x) >= n) continue;
      const cur  = pixels[y * SAMPLE_SIZE + x];
      const up   = pixels[(y - 1) * SAMPLE_SIZE + x];
      const left = pixels[y * SAMPLE_SIZE + (x - 1)];
      const dl = Math.abs(luminance(cur) - luminance(up));
      const dr = Math.abs(luminance(cur) - luminance(left));
      edgeSum += Math.max(dl, dr);
    }
  }
  edgeSum /= Math.max(1, n);

  const meanSat = satSum / n;
  const variance = satValues.length
    ? satValues.reduce((acc, v) => acc + (v - meanSat) ** 2, 0) / satValues.length
    : 0;

  const nonNeutral = n - hueBins.neutral || 1;
  const hueRatios = {
    green:   hueBins.green   / nonNeutral,
    blue:    hueBins.blue    / nonNeutral,
    copper:  hueBins.copper  / nonNeutral,
    red:     hueBins.red     / nonNeutral,
    purple:  hueBins.purple  / nonNeutral,
    neutral: hueBins.neutral / n,
  };

  const meanLum = lumSum / n;

  return {
    meanLum,
    meanSat,
    satVar: Math.sqrt(variance),
    edge: edgeSum,
    darkFrac:   darkCount  / n,
    brightFrac: brightCount / n,
    q75,
    ...hueRatios,
    _pixelCount: n,
  };
}

// ── Image quality check ──────────────────────────────────────────────────────
/**
 * Returns a human-readable quality failure reason, or null if image is usable.
 */
function checkQuality(f) {
  if (f._pixelCount < QUALITY.MIN_PIXELS) {
    return 'Image resolution is too low for reliable identification.';
  }
  if (f.meanLum < QUALITY.MIN_LUM) {
    return 'Image is too dark. Please take the photo in better lighting.';
  }
  if (f.meanLum > QUALITY.MAX_LUM) {
    return 'Image is overexposed or shows a plain background. Please photograph the item directly.';
  }
  if (f.satVar < QUALITY.MIN_SAT_VAR && f.edge < QUALITY.MIN_EDGE) {
    return 'Image appears completely blank or lacks recognizable object features. Please ensure the product is clearly visible against the background.';
  }
  return null; // image is acceptable
}

// ── Scoring rules ─────────────────────────────────────────────────────────────
// Each entry: [feature, min, max, weight].
// Higher weight = this signal dominates the scoring.
const RULES = {
  CRT: [
    ['darkFrac',  0.35, null, 3.0],   // CRT glass is very dark
    ['meanLum',   null, 0.40, 1.5],
    ['meanSat',   null, 0.20, 1.5],
    ['purple',    0.03, null, 1.0],   // phosphor glow artifacts
  ],
  LCD: [
    ['edge',      null, 0.12, 2.5],   // flat smooth panel
    ['meanLum',   0.10, 0.50, 1.0],
    ['meanSat',   null, 0.28, 1.0],
    ['green',     null, 0.30, 1.0],
  ],
  PCB: [
    ['green',     0.18, null, 3.0],   // FR4 PCB substrate colour
    ['edge',      0.18, null, 2.5],   // high-frequency trace patterns
    ['copper',    0.03, null, 2.0],   // gold/copper pads (v2: fixed bin)
    ['blue',      null, 0.40, 1.0],
  ],
  Cable: [
    ['satVar',    0.14, null, 5.0],   // mixed insulation colours → high variance
    ['meanSat',   0.20, null, 2.0],
    ['edge',      0.16, null, 1.5],
    ['red',       0.03, null, 1.5],   // red insulation is common
    ['copper',    0.04, null, 1.5],   // yellow insulation (v2: fixed bin)
    ['green',     0.02, 0.40, 0.5],
    ['blue',      0.02, 0.40, 0.5],
  ],
  Battery: [
    ['neutral',   0.55, null, 3.0],   // grey/silver battery casing
    ['meanSat',   null, 0.30, 1.5],
    ['meanLum',   0.28, 0.72, 1.0],
    ['edge',      0.05, 0.35, 1.0],
    ['copper',    null, 0.08, 1.5],   // should NOT have copper
  ],
  Motor: [
    ['copper',    0.08, null, 4.0],   // copper wire windings (v2: fixed bin!)
    ['edge',      0.18, null, 2.0],   // complex mechanical structure
    ['neutral',   0.20, null, 1.0],   // grey iron core
    ['meanLum',   0.30, 0.75, 1.0],
  ],
  Plastic: [
    ['edge',      null, 0.16, 3.0],   // smooth uniform plastic surface
    ['meanSat',   0.06, 0.60, 1.5],
    ['copper',    null, 0.10, 1.0],   // should NOT have copper
    ['green',     null, 0.30, 1.0],   // should NOT be circuit-board green
  ],
};

// Reason templates — one per category (dominant signal)
const REASON_TEMPLATE = {
  CRT:     (f) => `High dark fraction (${(f.darkFrac * 100).toFixed(0)}%) and low saturation suggest CRT glass/chassis.`,
  LCD:     (f) => `Low edge density (${f.edge.toFixed(3)}) and moderate luminance indicate a flat panel display.`,
  PCB:     (f) => `Strong green signal (${(f.green * 100).toFixed(0)}%) with high edge complexity suggests PCB substrate.`,
  Cable:   (f) => `High saturation variance (${f.satVar.toFixed(3)}) indicates mixed-colour cable insulation.`,
  Battery: (f) => `High neutral (grey/silver) fraction (${(f.neutral * 100).toFixed(0)}%) is consistent with battery casing.`,
  Motor:   (f) => `Copper/gold hue signal (${(f.copper * 100).toFixed(0)}%) with complex edges suggests motor windings.`,
  Plastic: (f) => `Low edge density (${f.edge.toFixed(3)}) and moderate saturation indicate plastic casing.`,
};

// ── Scoring engine ────────────────────────────────────────────────────────────
// MAGNIFY reduced from 6 → 4 to dampen noise amplification for near-tied scores
const MAGNIFY = 4;

function fitRange(v, min, max) {
  if (v == null) return 0;
  if (min != null && v < min) return Math.max(0, 1 - (min - v) * 3);
  if (max != null && v > max) return Math.max(0, 1 - (v - max) * 3);
  return 1;
}

function categoryFit(f, rules) {
  let total = 0;
  let wSum = 0;
  for (const rule of rules) {
    const weight = rule[3] ?? 1;
    total += fitRange(f[rule[0]], rule[1], rule[2]) * weight;
    wSum += weight;
  }
  return wSum ? total / wSum : 0;
}

function softMax(scores) {
  const exp = Object.entries(scores).map(([k, v]) => [k, Math.exp(v)]);
  const sum = exp.reduce((acc, [, v]) => acc + v, 0) || 1;
  return Object.fromEntries(exp.map(([k, v]) => [k, v / sum]));
}

function classifyFeatures(f) {
  const raw = {};
  for (const id of CATEGORY_IDS) {
    raw[id] = Math.pow(categoryFit(f, RULES[id]), MAGNIFY);
  }
  const probs = softMax(raw);
  const ranked = Object.entries(probs)
    .sort((a, b) => b[1] - a[1])
    .map(([category, p]) => ({
      category,
      confidence: Math.round(p * 1000) / 1000,
    }));
  return ranked;
}

// ── Verdict thresholds (v2: tightened) ───────────────────────────────────────
function toVerdict(confidence, spread) {
  // high: very clear winner with a large margin over 2nd place
  if (confidence >= 0.55 && spread >= 0.18) return 'high';
  // medium: reasonable winner, some ambiguity remains
  if (confidence >= 0.35 && spread >= 0.10) return 'medium';
  return 'low';
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Classify an HTMLImageElement.
 * Returns the canonical prediction shape:
 * {
 *   category: string | null,
 *   confidence: number,
 *   verdict: 'high' | 'medium' | 'low' | 'unreadable',
 *   candidates: Array<{category, confidence}>,
 *   features: Object,
 *   reason: string,
 * }
 */
export function classifyPixels(image, maxSize = 512) {
  const pixels = decodeImage(image, maxSize);
  const f = collectFeatures(pixels);

  // ── Quality gate ────────────────────────────────────────────────────────
  const qualityFailure = checkQuality(f);
  if (qualityFailure) {
    console.warn('[classify] Image quality check failed:', qualityFailure, { features: f });
    return {
      category: null,
      confidence: 0,
      verdict: 'unreadable',
      candidates: [],
      features: f,
      reason: qualityFailure,
    };
  }

  // ── Scoring ─────────────────────────────────────────────────────────────
  const ranked = classifyFeatures(f);
  const top = ranked[0];
  const spread = top.confidence - (ranked[1]?.confidence ?? 0);
  const verdict = toVerdict(top.confidence, spread);
  const reason = REASON_TEMPLATE[top.category]?.(f) ?? '';

  // ── Debug logging ────────────────────────────────────────────────────────
  console.debug('[classify] Result:', {
    category: top.category,
    confidence: (top.confidence * 100).toFixed(1) + '%',
    spread: (spread * 100).toFixed(1) + '%',
    verdict,
    top3: ranked.slice(0, 3).map(r => `${r.category}:${(r.confidence * 100).toFixed(1)}%`).join(', '),
    features: {
      meanLum:  f.meanLum.toFixed(3),
      meanSat:  f.meanSat.toFixed(3),
      satVar:   f.satVar.toFixed(3),
      edge:     f.edge.toFixed(3),
      darkFrac: f.darkFrac.toFixed(3),
      green:    f.green.toFixed(3),
      copper:   f.copper.toFixed(3),  // was always 0 before the fix
      blue:     f.blue.toFixed(3),
      neutral:  f.neutral.toFixed(3),
    },
  });

  return {
    category: top.category,
    confidence: top.confidence,
    verdict,
    candidates: ranked.slice(0, 3),
    features: f,
    reason,
  };
}

/**
 * Load a File object as an image and classify it.
 */
export async function classifyFile(file, maxSize = 512) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    console.debug('[classify] Image loaded:', {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      file: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });
    return classifyPixels(image, maxSize);
  } finally {
    URL.revokeObjectURL(url);
  }
}
