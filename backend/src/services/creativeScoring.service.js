/**
 * Centralized Creative Scoring Engine
 *
 * Scoring Rule:
 * Use the client's Baseline ROAS as the reference:
 * - If the creative's ROAS is greater than the client's Baseline ROAS, award exactly +1 point.
 * - If ROAS is equal to or below the baseline, award 0 points.
 * - Any improvement, however small, earns only 1 point.
 * - Do not award additional points based on the size of the improvement.
 * - Do not award points based on purchases or sales.
 */

export const calculateCreativeScore = ({ roas = 0, baselineROAS, previousROAS } = {}) => {
  const reference = Number(
    baselineROAS !== undefined && baselineROAS !== null
      ? baselineROAS
      : previousROAS !== undefined && previousROAS !== null
      ? previousROAS
      : 0
  ) || 0;

  const numericRoas = Number(roas) || 0;
  const isImproved = numericRoas > reference;
  const points = isImproved ? 1 : 0;

  const diff = numericRoas - reference;
  const roasImprovement = diff > 0 ? Math.round(diff * 100) / 100 : 0;

  return {
    roasPoints: points,
    purchasePoints: 0,
    totalPoints: points,
    roasImprovement,
    baselineROAS: reference,
    previousROAS: reference,
    isImproved
  };
};

export const CREATIVE_SCORING_CONFIG = {
  IMPROVEMENT_POINTS: 1,
  PURCHASE_POINTS: 0
};


