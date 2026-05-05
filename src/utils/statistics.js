/**
 * Calculate the variance of an array of numbers (Sample Variance / VAR.S).
 * @param {number[]} arr - Array of numbers
 * @returns {number} Variance
 */
const calculateVariance = (arr) => {
  if (arr.length <= 1) return 0;
  const arrNum = arr.map(val => Number(val) || 0);
  const mean = arrNum.reduce((a, b) => a + b, 0) / arrNum.length;
  const squareDiffs = arrNum.map((val) => Math.pow(val - mean, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / (arrNum.length - 1); // Using n-1 for VAR.S
};

/**
 * Calculate Cronbach's Alpha for a given set of responses.
 * Formula: α = (k / (k - 1)) * (1 - (Σσᵢ² / σₜ²))
 * 
 * @param {Array<Object>} responses - Array of response objects
 * @param {Array<string>} itemKeys - Array of keys representing the test items (e.g., ['q1', 'q2'])
 * @returns {number|null} Cronbach's Alpha score or null if not enough data
 */
export const calculateCronbachAlpha = (responses, itemKeys) => {
  if (!responses || responses.length < 2 || !itemKeys || itemKeys.length < 2) {
    return null; // Not enough data to calculate
  }

  // Listwise Deletion: Abaikan responden yang tidak memiliki jawaban lengkap untuk semua item
  const validResponses = responses.filter(res =>
    itemKeys.every(key => res[key] !== undefined && res[key] !== null && res[key] !== "")
  );

  if (validResponses.length < 2) return null;

  const k = itemKeys.length; // Jumlah item/pertanyaan
  let sigma_i_squared_sum = 0; // Σσᵢ² (Total varians semua item)

  // Hitung varians untuk masing-masing item (σᵢ²)
  itemKeys.forEach((key) => {
    const itemScores = validResponses.map((res) => Number(res[key]));
    sigma_i_squared_sum += calculateVariance(itemScores);
  });

  // Hitung varians dari total skor tiap responden (σₜ²)
  const totalScoresPerRespondent = validResponses.map((res) => {
    return itemKeys.reduce((sum, key) => sum + Number(res[key]), 0);
  });
  const sigma_t_squared = calculateVariance(totalScoresPerRespondent);

  if (sigma_t_squared === 0) return 0; // Mencegah pembagian dengan nol

  // Rumus Cronbach's Alpha: α = (k / (k - 1)) * (1 - (Σσᵢ² / σₜ²))
  const alpha = (k / (k - 1)) * (1 - (sigma_i_squared_sum / sigma_t_squared));

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

  // Listwise Deletion: Abaikan responden yang tidak memiliki jawaban lengkap untuk korelasi
  const validResponses = responses.filter(res =>
    itemKeys.every(key => res[key] !== undefined && res[key] !== null && res[key] !== "")
  );

  if (validResponses.length === 0) return [];

  // Pre-calculate total scores for each respondent for correlation
  const totalScores = validResponses.map(res =>
    itemKeys.reduce((sum, key) => sum + Number(res[key]), 0)
  );

  const totalMean = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
  const totalVariance = calculateVariance(totalScores);
  const totalStdDev = Math.sqrt(totalVariance);

  return itemKeys.map(key => {
    const scores = validResponses.map(res => Number(res[key]));
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = scores.length > 0 ? sum / scores.length : 0;
    const variance = calculateVariance(scores);
    const stdDev = Math.sqrt(variance);

    // Calculate Pearson Correlation (Item-Total Correlation)
    let correlation = 0;
    if (stdDev > 0 && totalStdDev > 0 && validResponses.length > 1) {
      // Covariance
      let covariance = 0;
      for (let i = 0; i < validResponses.length; i++) {
        covariance += (scores[i] - mean) * (totalScores[i] - totalMean);
      }
      covariance = covariance / (validResponses.length - 1); // Sample covariance

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
