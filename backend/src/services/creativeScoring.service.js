/**
 * Centralized Creative Scoring Engine
 * 
 * Formula:
 * ROAS Points = ROAS * 10
 * Purchase Points = Purchases * 10
 * Total Creative Score = ROAS Points + Purchase Points
 */

export const CREATIVE_SCORING_CONFIG = Object.freeze({
  ROAS_WEIGHT: 10,
  PURCHASE_WEIGHT: 10
});

/**
 * Calculates score for a creative entry.
 *
 * @param {Object} params
 * @param {number} params.roas
 * @param {number} params.purchases
 * @returns {{ roasPoints: number, purchasePoints: number, totalPoints: number }}
 */
export const calculateCreativeScore = ({ roas = 0, purchases = 0 } = {}) => {
  const numericRoas = Number(roas);
  const numericPurchases = Number(purchases);

  const safeRoas = isNaN(numericRoas) || numericRoas < 0 ? 0 : numericRoas;
  const safePurchases = isNaN(numericPurchases) || numericPurchases < 0 ? 0 : numericPurchases;

  // Use precision rounding to avoid floating point issues (e.g. 5.1 * 10 = 51.00000000000001)
  const roasPoints = Math.round(safeRoas * CREATIVE_SCORING_CONFIG.ROAS_WEIGHT * 100) / 100;
  const purchasePoints = Math.round(safePurchases * CREATIVE_SCORING_CONFIG.PURCHASE_WEIGHT);
  const totalPoints = Math.round((roasPoints + purchasePoints) * 100) / 100;

  return {
    roasPoints,
    purchasePoints,
    totalPoints
  };
};
