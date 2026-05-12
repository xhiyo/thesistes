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
  const alpha = ((k / (k - 1)) * (1 - itemVarSum / totalVar));
  return isNaN(alpha) ? 0 : Number(alpha.toFixed(3));
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
  const crValue = sumL * sumL / (sumL * sumL + sumErr);
  const aveValue = mean(loadings.map(l => l * l));
  
  return {
    cr: isNaN(crValue) ? 0 : Number(crValue.toFixed(3)),
    ave: isNaN(aveValue) ? 0 : Number(aveValue.toFixed(3))
  };
};

// --- DESCRIPTIVE ---
export const calculateDescriptiveSummary = (responses, itemKeys) => {
  if (!responses || responses.length === 0) return {};
  const valid = responses.filter(res => itemKeys.every(k => res[k] !== undefined && res[k] !== ""));

  // 1. Rata-rata Skor (Mean per responden)
  const meanScores = valid.map(r => itemKeys.reduce((s, k) => s + Number(r[k]), 0) / itemKeys.length);

  // 2. Standar Deviasi Akademis (berdasarkan Rata-rata Skor)
  const academicStdDev = sampleStandardDeviation(meanScores);

  // 3. Rata-rata dari Standar Deviasi per item (seperti yang sering dihitung ChatGPT)
  const itemStdDevs = itemKeys.map(key => {
    const scores = valid.map(res => Number(res[key]));
    return sampleStandardDeviation(scores);
  });
  const avgStdDev = mean(itemStdDevs);

  const safeNum = (val, decimals = 5) => isNaN(val) ? 0 : Number(Number(val).toFixed(decimals));

  return {
    n: valid.length,
    k: itemKeys.length,
    mean: safeNum(mean(meanScores), 5),
    stdDev: safeNum(academicStdDev, 5),
    stdDevChatGPT: safeNum(avgStdDev, 5),
    skewness: valid.length >= 3 ? safeNum(sampleSkewness(meanScores), 5) : null,
    kurtosis: valid.length >= 4 ? safeNum(sampleKurtosis(meanScores), 5) : null
  };
};

// --- ITEM STATS (LENGKAP) ---
export const calculateItemStats = (responses, itemKeys) => {
  if (!responses || responses.length === 0) return [];
  const valid = responses.filter(res => itemKeys.every(k => res[k] !== undefined && res[k] !== ""));
  const totalScores = valid.map(r => itemKeys.reduce((s, k) => s + Number(r[k]), 0));

  return itemKeys.map(key => {
    const scores = valid.map(res => Number(res[key]));

    // Korelasi r-hitung (Raw Pearson Correlation)
    const rawCorr = sampleCorrelation(scores, totalScores);
    
    const safeNum = (val, decimals = 3) => isNaN(val) ? 0 : Number(Number(val).toFixed(decimals));

    return {
      id: key,
      mean: safeNum(mean(scores), 2),
      variance: safeNum(sampleVariance(scores), 3),
      stdDev: safeNum(sampleStandardDeviation(scores), 3),
      skewness: scores.length >= 3 ? safeNum(sampleSkewness(scores), 3) : null,
      kurtosis: scores.length >= 4 ? safeNum(sampleKurtosis(scores), 3) : null,
      correlation: safeNum(rawCorr, 3),
      rSquared: safeNum(rawCorr * rawCorr, 3)
    };
  });
};
