/**
 * Simplified Frontend CRO scoring matching backend croScoring.service.js
 *
 * Rules:
 * - Product Sales: If After > Before -> +1 point, else 0.
 * - Prepaid Orders %: If After > Before -> +1 point, else 0.
 * - Max 2 points per experiment.
 * - Cancellation Rate completely removed.
 */
export const calculateLiveScore = (results = {}, status = '') => {
  const {
    salesBefore,
    salesAfter,
    prepaidBefore,
    prepaidAfter
  } = results;

  let salesPoints = 0;
  let salesPercent = null;
  const sB = salesBefore !== '' && salesBefore != null ? Number(salesBefore) : null;
  const sA = salesAfter !== '' && salesAfter != null ? Number(salesAfter) : null;
  if (sB !== null && sA !== null && !isNaN(sB) && !isNaN(sA) && sB >= 0 && sA >= 0) {
    if (sA > sB) {
      salesPoints = 1;
    }
    if (sB > 0) {
      const diff = sA - sB;
      salesPercent = Number(((diff / sB) * 100).toFixed(1));
    }
  }

  let prepaidPoints = 0;
  let prepaidDiff = null;
  const pB = prepaidBefore !== '' && prepaidBefore != null ? Number(prepaidBefore) : null;
  const pA = prepaidAfter !== '' && prepaidAfter != null ? Number(prepaidAfter) : null;
  if (pB !== null && pA !== null && !isNaN(pB) && !isNaN(pA)) {
    if (pA > pB) {
      prepaidPoints = 1;
    }
    prepaidDiff = Number((pA - pB).toFixed(1));
  }

  const totalPoints = salesPoints + prepaidPoints;

  return {
    salesPoints,
    salesPercent,
    prepaidPoints,
    prepaidDiff,
    cancellationPoints: 0,
    cancellationDiff: null,
    totalPoints,
    isSuccessful: totalPoints > 0
  };
};

