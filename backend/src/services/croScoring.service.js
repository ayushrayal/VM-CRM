/**
 * Centralized Scoring Engine Configuration
 * Easily tunable weights for CRO experiment scoring
 */
export const SCORING_CONFIG = Object.freeze({
  // Points awarded per 1.0 (100%) sales increase: e.g. +30% increase (0.30) = 300 points
  SALES_WEIGHT: 1000,

  // Points awarded per 1 percentage point increase in prepaid orders: e.g. +13 pp = 130 points
  PREPAID_WEIGHT: 10,

  // Points awarded per 1 percentage point reduction in cancellation rate: e.g. -4 pp = 80 points
  CANCELLATION_WEIGHT: 20
});

/**
 * Pure calculation function for CRO experiment results.
 * Guarantees that only positive improvements generate points.
 * Zero or negative improvements yield 0 points.
 *
 * @param {Object} results
 * @param {number|null} [results.salesBefore]
 * @param {number|null} [results.salesAfter]
 * @param {number|null} [results.prepaidBefore]
 * @param {number|null} [results.prepaidAfter]
 * @param {number|null} [results.cancellationBefore]
 * @param {number|null} [results.cancellationAfter]
 * @returns {Object} Calculated points and percentage improvements
 */
export const calculateCroScore = (results = {}) => {
  const {
    salesBefore = null,
    salesAfter = null,
    prepaidBefore = null,
    prepaidAfter = null,
    cancellationBefore = null,
    cancellationAfter = null
  } = results;

  let salesPoints = 0;
  let salesPercent = 0;

  // 1. PRODUCT SALES INCREASE
  if (
    typeof salesBefore === 'number' &&
    typeof salesAfter === 'number' &&
    !isNaN(salesBefore) &&
    !isNaN(salesAfter) &&
    salesBefore >= 0 &&
    salesAfter >= 0
  ) {
    if (salesBefore > 0) {
      const diff = salesAfter - salesBefore;
      if (diff > 0) {
        salesPercent = Number(((diff / salesBefore) * 100).toFixed(1));
        salesPoints = Math.round((diff / salesBefore) * SCORING_CONFIG.SALES_WEIGHT);
      } else {
        salesPercent = Number(((diff / salesBefore) * 100).toFixed(1));
        salesPoints = 0;
      }
    } else if (salesBefore === 0 && salesAfter > 0) {
      salesPercent = 100;
      salesPoints = Math.min(Math.round(salesAfter * 0.01), SCORING_CONFIG.SALES_WEIGHT);
    }
  }

  // 2. PREPAID PERCENTAGE INCREASE
  let prepaidPoints = 0;
  let prepaidPercentagePoints = 0;

  if (
    typeof prepaidBefore === 'number' &&
    typeof prepaidAfter === 'number' &&
    !isNaN(prepaidBefore) &&
    !isNaN(prepaidAfter)
  ) {
    const diff = prepaidAfter - prepaidBefore;
    prepaidPercentagePoints = Number(diff.toFixed(1));
    if (diff > 0) {
      prepaidPoints = Math.round(diff * SCORING_CONFIG.PREPAID_WEIGHT);
    } else {
      prepaidPoints = 0;
    }
  }

  // 3. CANCELLATION PERCENTAGE DECREASE
  let cancellationPoints = 0;
  let cancellationPercentagePoints = 0;

  if (
    typeof cancellationBefore === 'number' &&
    typeof cancellationAfter === 'number' &&
    !isNaN(cancellationBefore) &&
    !isNaN(cancellationAfter)
  ) {
    // A drop in cancellation is positive improvement
    const diff = cancellationBefore - cancellationAfter;
    // We record improvement as negative percentage points (e.g. -4 pp cancellation)
    cancellationPercentagePoints = Number((cancellationAfter - cancellationBefore).toFixed(1));
    if (diff > 0) {
      cancellationPoints = Math.round(diff * SCORING_CONFIG.CANCELLATION_WEIGHT);
    } else {
      cancellationPoints = 0;
    }
  }

  const totalPoints = salesPoints + prepaidPoints + cancellationPoints;

  return {
    salesPoints,
    prepaidPoints,
    cancellationPoints,
    totalPoints,
    improvements: {
      salesPercent,
      prepaidPercentagePoints,
      cancellationPercentagePoints
    }
  };
};
