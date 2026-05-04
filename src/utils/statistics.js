/**
 * Calculate the variance of an array of numbers.
 * @param {number[]} arr - Array of numbers
 * @returns {number} Variance
 */
const calculateVariance = (arr) => {
  if (arr.length <= 1) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squareDiffs = arr.map((val) => Math.pow(val - mean, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1); // Sample variance
};

/**
 * Calculate Cronbach's Alpha for a given set of responses.
 * Responses should be an array of objects where each object is a respondent's answers.
 * e.g., [{ q1: 4, q2: 5 }, { q1: 3, q2: 4 }]
 * 
 * @param {Array<Object>} responses - Array of response objects
 * @param {Array<string>} itemKeys - Array of keys representing the test items (e.g., ['q1', 'q2'])
 * @returns {number|null} Cronbach's Alpha score or null if not enough data
 */
export const calculateCronbachAlpha = (responses, itemKeys) => {
  if (!responses || responses.length < 2 || !itemKeys || itemKeys.length < 2) {
    return null; // Not enough data to calculate
  }

  const k = itemKeys.length;
  let sumOfItemVariances = 0;

  // Calculate variance for each item (column)
  itemKeys.forEach((key) => {
    const itemScores = responses.map((res) => res[key] || 0);
    sumOfItemVariances += calculateVariance(itemScores);
  });

  // Calculate total score variance (row totals)
  const totalScores = responses.map((res) => {
    return itemKeys.reduce((sum, key) => sum + (res[key] || 0), 0);
  });
  const totalVariance = calculateVariance(totalScores);

  if (totalVariance === 0) return 0; // Prevent division by zero

  // Cronbach's Alpha formula: (k / (k - 1)) * (1 - (sum of item variances / total variance))
  const alpha = (k / (k - 1)) * (1 - sumOfItemVariances / totalVariance);

  return Number(alpha.toFixed(3));
};

/**
 * Helper to determine the reliability status based on alpha score.
 */
export const getReliabilityStatus = (alpha) => {
  if (alpha === null) return { label: 'Insufficient Data', color: 'bg-gray-500', text: 'text-gray-500' };
  if (alpha >= 0.9) return { label: 'Excellent', color: 'bg-green-600', text: 'text-green-600' };
  if (alpha >= 0.8) return { label: 'Good', color: 'bg-green-500', text: 'text-green-500' };
  if (alpha >= 0.7) return { label: 'Acceptable', color: 'bg-yellow-500', text: 'text-yellow-500' };
  if (alpha >= 0.6) return { label: 'Questionable', color: 'bg-orange-500', text: 'text-orange-500' };
  if (alpha >= 0.5) return { label: 'Poor', color: 'bg-red-500', text: 'text-red-500' };
  return { label: 'Unacceptable', color: 'bg-red-700', text: 'text-red-700' };
};

/**
 * Calculate basic statistics (mean, variance) for each item in the questionnaire.
 */
export const calculateItemStats = (responses, itemKeys) => {
  if (!responses || responses.length === 0 || !itemKeys) return [];

  // Pre-calculate total scores for each respondent for correlation
  const totalScores = responses.map(res =>
    itemKeys.reduce((sum, key) => sum + (res[key] || 0), 0)
  );

  const totalMean = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
  const totalVariance = calculateVariance(totalScores);
  const totalStdDev = Math.sqrt(totalVariance);

  return itemKeys.map(key => {
    const scores = responses.map(res => res[key] || 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = scores.length > 0 ? sum / scores.length : 0;
    const variance = calculateVariance(scores);
    const stdDev = Math.sqrt(variance);

    // Calculate Pearson Correlation (Item-Total Correlation)
    let correlation = 0;
    if (stdDev > 0 && totalStdDev > 0 && responses.length > 1) {
      // Covariance
      let covariance = 0;
      for (let i = 0; i < responses.length; i++) {
        covariance += (scores[i] - mean) * (totalScores[i] - totalMean);
      }
      covariance = covariance / (responses.length - 1); // Sample covariance

      // Pearson r
      correlation = covariance / (stdDev * totalStdDev);
    }

    return {
      id: key,
      mean: Number(mean.toFixed(2)),
      variance: Number(variance.toFixed(3)),
      correlation: Number(correlation.toFixed(3))
    };
  });
};
