import { mean, sampleVariance, sampleStandardDeviation, sampleCorrelation, sampleSkewness, sampleKurtosis } from 'simple-statistics';

// --- RELIABILITY ---
export const calculateCronbachAlpha = (responses, itemKeys) => {
  if (!responses || responses.length < 2 || !itemKeys || itemKeys.length < 2) return null;
  const valid = responses.filter(res => itemKeys.every(k => res[k] !== undefined && res[k] !== ""));
  if (valid.length < 2) return null;

  const itemVarSum = itemKeys.reduce((s, k) => s + sampleVariance(valid.map(r => Number(r[k]))), 0);
  const totalVar = sampleVariance(valid.map(r => itemKeys.reduce((s, k) => s + Number(r[k]), 0)));

  const k = itemKeys.length;
  if (totalVar === 0) return 0;
  return Number(((k / (k - 1)) * (1 - itemVarSum / totalVar)).toFixed(3));
};

export const getReliabilityStatus = (alpha) => {
  if (alpha === null) return { label: 'Insufficient Data', color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200' };
  if (alpha >= 0.7) return { label: 'Reliable (Acceptable)', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  return { label: 'Not Reliable', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
};

// --- VALIDITY (CR & AVE) ---
export const calculateConstructMetrics = (itemStats) => {
  if (!itemStats || itemStats.length < 2) return { cr: null, ave: null };
  const loadings = itemStats.map(s => Math.abs(s.correlation || 0));
  const sumL = loadings.reduce((a, b) => a + b, 0);
  const sumL2 = loadings.reduce((a, b) => a + b * b, 0);
  const sumErr = loadings.reduce((a, b) => a + (1 - b * b), 0);
  return {
    cr: Number((sumL * sumL / (sumL * sumL + sumErr)).toFixed(3)),
    ave: Number(mean(loadings.map(l => l * l)).toFixed(3))
  };
};

// --- DESCRIPTIVE ---
export const calculateDescriptiveSummary = (responses, itemKeys) => {
  if (!responses || responses.length === 0) return {};
  const valid = responses.filter(res => itemKeys.every(k => res[k] !== undefined && res[k] !== ""));
  const totalScores = valid.map(r => itemKeys.reduce((s, k) => s + Number(r[k]), 0));

  return {
    n: valid.length,
    k: itemKeys.length,
    mean: Number(mean(totalScores).toFixed(5)),
    stdDev: Number(sampleStandardDeviation(totalScores).toFixed(5)),
    skewness: valid.length >= 3 ? Number(sampleSkewness(totalScores).toFixed(5)) : null,
    kurtosis: valid.length >= 4 ? Number(sampleKurtosis(totalScores).toFixed(5)) : null
  };
};

// --- ITEM STATS (LENGKAP) ---
export const calculateItemStats = (responses, itemKeys) => {
  if (!responses || responses.length === 0) return [];
  const valid = responses.filter(res => itemKeys.every(k => res[k] !== undefined && res[k] !== ""));
  const totalScores = valid.map(r => itemKeys.reduce((s, k) => s + Number(r[k]), 0));

  return itemKeys.map(key => {
    const scores = valid.map(res => Number(res[key]));

    // 1. Corrected Item-Total Correlation (Korelasi r-hitung)
    const otherItemsTotal = valid.map(r =>
      itemKeys.reduce((s, k) => k === key ? s : s + Number(r[k]), 0)
    );
    const correctedCorr = sampleCorrelation(scores, otherItemsTotal);
    const rawCorr = sampleCorrelation(scores, totalScores);

    // 2. Alpha if Item Deleted
    const otherKeys = itemKeys.filter(k => k !== key);
    const alphaIfDeleted = calculateCronbachAlpha(valid, otherKeys);

    return {
      id: key,
      mean: Number(mean(scores).toFixed(2)),
      variance: Number(sampleVariance(scores).toFixed(3)),
      stdDev: Number(sampleStandardDeviation(scores).toFixed(3)),
      correlation: Number(rawCorr.toFixed(3)),
      correctedCorrelation: Number(correctedCorr.toFixed(3)),
      rSquared: Number((rawCorr * rawCorr).toFixed(3)),
      alphaIfDeleted: alphaIfDeleted
    };
  });
};
