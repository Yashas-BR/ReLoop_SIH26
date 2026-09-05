const CATEGORY_IDS = ['CRT', 'LCD', 'PCB', 'Cable', 'Battery', 'Motor', 'Plastic'];

const SAMPLE_SIZE = 64;

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

function collectFeatures(pixels) {
  const n = pixels.length;
  let lumSum = 0;
  let satSum = 0;
  let darkCount = 0;
  let brightCount = 0;
  const hueBins = { green: 0, blue: 0, copper: 0, red: 0, neutral: 0, purple: 0 };
  const satValues = [];

  for (let i = 0; i < n; i++) {
    const { h, s, l } = rgbToHsl(pixels[i]);
    lumSum += l;
    satSum += s;
    satValues.push(s);
    if (l < 0.22) darkCount++;
    if (l > 0.8) brightCount++;

    if (s < 0.12) {
      hueBins.neutral++;
    } else if (h >= 60 && h < 170) {
      hueBins.green++;
    } else if (h >= 170 && h < 250) {
      hueBins.blue++;
    } else if ((h >= 20 && h < 60)) {
      // yellow-green → could be copper/gold-ish; count toward green
      hueBins.green++;
    } else if ((h >= 0 && h < 20) || h >= 330) {
      hueBins.red++;
    } else if ((h >= 250 && h < 330)) {
      hueBins.purple++;
    } else {
      hueBins.copper++;
    }
  }

  satValues.sort((a, b) => a - b);
  const q75 = satValues[Math.floor(n * 0.75)] || 0;

  let edgeSum = 0;
  for (let y = 1; y < SAMPLE_SIZE; y++) {
    for (let x = 1; x < SAMPLE_SIZE; x++) {
      if ((y * SAMPLE_SIZE + x) >= n) continue;
      const cur = pixels[y * SAMPLE_SIZE + x];
      const up = pixels[(y - 1) * SAMPLE_SIZE + x];
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

  const total = n - hueBins.neutral || 1;
  const hueRatios = {
    green: hueBins.green / total,
    blue: hueBins.blue / total,
    copper: hueBins.copper / total,
    red: hueBins.red / total,
    purple: hueBins.purple / total,
    neutral: hueBins.neutral / n,
  };

  const meanLum = lumSum / n;

  return {
    meanLum,
    meanSat,
    satVar: Math.sqrt(variance),
    edge: edgeSum,
    darkFrac: darkCount / n,
    brightFrac: brightCount / n,
    q75,
    ...hueRatios,
  };
}

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

// Each entry: [feature, min, max, weight]. Weight emphasizes the strongest signal.
const RULES = {
  CRT: [
    ['darkFrac', 0.35, null, 3],
    ['meanLum', null, 0.4, 1.5],
    ['meanSat', null, 0.2, 1.5],
    ['purple', 0.03, null, 1],
  ],
  LCD: [
    ['edge', null, 0.12, 2.5],
    ['meanLum', 0.1, 0.5, 1],
    ['meanSat', null, 0.28, 1],
    ['green', null, 0.3, 1],
  ],
  PCB: [
    ['green', 0.18, null, 3],
    ['edge', 0.18, null, 2.5],
    ['copper', 0.03, null, 1.5],
    ['blue', null, 0.4, 1],
  ],
  Cable: [
    ['satVar', 0.14, null, 5],
    ['meanSat', 0.2, null, 2],
    ['edge', 0.16, null, 1.5],
    ['red', 0.03, null, 1.5],
    ['green', 0.02, 0.4, 0.5],
    ['blue', 0.02, 0.4, 0.5],
  ],
  Battery: [
    ['neutral', 0.55, null, 3],
    ['meanSat', null, 0.3, 1.5],
    ['meanLum', 0.28, 0.72, 1],
    ['edge', 0.05, 0.35, 1],
    ['copper', null, 0.1, 1.5],
  ],
  Motor: [
    ['copper', 0.08, null, 3],
    ['edge', 0.18, null, 2],
    ['neutral', 0.2, null, 1],
    ['meanLum', 0.3, 0.75, 1],
  ],
  Plastic: [
    ['edge', null, 0.16, 3],
    ['meanSat', 0.06, 0.6, 1.5],
    ['copper', null, 0.12, 1],
    ['green', null, 0.3, 1],
  ],
};

// Magnify fit so the best match clearly wins instead of staying flat.
const MAGNIFY = 6;

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

export function classifyPixels(image, maxSize = 512) {
  const pixels = decodeImage(image, maxSize);
  const f = collectFeatures(pixels);

  const ranked = classifyFeatures(f);

  const top = ranked[0];
  const confidence = top.confidence;

  const winnerSpread = confidence - (ranked[1]?.confidence ?? 0);
  let verdict = 'low';
  if (confidence >= 0.4 && winnerSpread >= 0.12) verdict = 'medium';
  if (confidence >= 0.55 && winnerSpread >= 0.2) verdict = 'high';

  return {
    category: top.category,
    confidence,
    verdict,
    candidates: ranked.slice(0, 3),
    features: f,
  };
}

export async function classifyFile(file, maxSize = 512) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    return classifyPixels(image, maxSize);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { CATEGORY_IDS };
