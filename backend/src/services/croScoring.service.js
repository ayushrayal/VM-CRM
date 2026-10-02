/**
 * Simplified CRO Scoring Engine
 *
 * Rules:
 * Product Sales:
 * - If After is greater than Before, award +1 point.
 * - Otherwise, award 0 points.
 *
 * Prepaid Orders %:
 * - If After is greater than Before, award +1 point.
 * - Otherwise, award 0 points.
 *
 * Maximum score: 2 points per experiment (1 point for each improved metric).
 * Cancellation rate is completely removed from CRO scoring.
 */
export const SCORING_CONFIG = Object.freeze({
  MAX_POINTS_PER_EXPERIMENT: 2,
  SALES_IMPROVEMENT_POINTS: 1,
  PREPAID_IMPROVEMENT_POINTS: 1
});

/**
 * Calculates CRO score for an experiment.
 *
 * @param {Object} resultsOrObj - Results object or wrapper
 * @param {string} statusArg - Experiment status
 * @returns {Object} Calculated points and percentage improvements
 */
export const calculateCroScore = (resultsOrObj = {}, statusArg = '') => {
  let effectiveResults = resultsOrObj || {};

  if (resultsOrObj && typeof resultsOrObj === 'object') {
    if (resultsOrObj.results) {
      effectiveResults = resultsOrObj.results;
    }
  }

  const {
    salesBefore = null,
    salesAfter = null,
    prepaidBefore = null,
    prepaidAfter = null
  } = effectiveResults || {};

  let salesPoints = 0;
  let prepaidPoints = 0;
  let salesPercent = 0;
  let prepaidPercentagePoints = 0;

  // 1. Product Sales: If After > Before -> +1 point
  const hasValidSales =
    salesBefore !== null &&
    salesBefore !== undefined &&
    salesAfter !== null &&
    salesAfter !== undefined &&
    !isNaN(Number(salesBefore)) &&
    !isNaN(Number(salesAfter));

  if (hasValidSales) {
    const numBefore = Number(salesBefore);
    const numAfter = Number(salesAfter);
    if (numAfter > numBefore) {
      salesPoints = 1;
    }
    if (numBefore > 0) {
      salesPercent = Number((((numAfter - numBefore) / numBefore) * 100).toFixed(1));
    }
  }

  // 2. Prepaid Orders %: If After > Before -> +1 point
  const hasValidPrepaid =
    prepaidBefore !== null &&
    prepaidBefore !== undefined &&
    prepaidAfter !== null &&
    prepaidAfter !== undefined &&
    !isNaN(Number(prepaidBefore)) &&
    !isNaN(Number(prepaidAfter));

  if (hasValidPrepaid) {
    const numBefore = Number(prepaidBefore);
    const numAfter = Number(prepaidAfter);
    if (numAfter > numBefore) {
      prepaidPoints = 1;
    }
    prepaidPercentagePoints = Number((numAfter - numBefore).toFixed(1));
  }

  const totalPoints = salesPoints + prepaidPoints;

  return {
    salesPoints,
    prepaidPoints,
    cancellationPoints: 0,
    totalPoints,
    isSuccessful: totalPoints > 0,
    improvements: {
      salesPercent,
      prepaidPercentagePoints,
      cancellationPercentagePoints: 0
    }
  };
};

