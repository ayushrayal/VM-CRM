/**
 * Frontend live score calculation matching backend croScoring.service.js
 */
export const calculateLiveScore = (results = {}) => {
  const {
    salesBefore,
    salesAfter,
    prepaidBefore,
    prepaidAfter,
    cancellationBefore,
    cancellationAfter
  } = results;

  let salesPoints = 0;
  let salesPercent = null;
  const sB = salesBefore !== '' && salesBefore != null ? Number(salesBefore) : null;
  const sA = salesAfter !== '' && salesAfter != null ? Number(salesAfter) : null;
  if (sB !== null && sA !== null && !isNaN(sB) && !isNaN(sA) && sB >= 0 && sA >= 0) {
    if (sB > 0) {
      const diff = sA - sB;
      salesPercent = Number(((diff / sB) * 100).toFixed(1));
      if (diff > 0) {
        salesPoints = Math.round((diff / sB) * 1000);
      }
    } else if (sB === 0 && sA > 0) {
      salesPercent = 100;
      salesPoints = Math.min(Math.round(sA * 0.01), 1000);
    }
  }

  let prepaidPoints = 0;
  let prepaidDiff = null;
  const pB = prepaidBefore !== '' && prepaidBefore != null ? Number(prepaidBefore) : null;
  const pA = prepaidAfter !== '' && prepaidAfter != null ? Number(prepaidAfter) : null;
  if (pB !== null && pA !== null && !isNaN(pB) && !isNaN(pA)) {
    prepaidDiff = Number((pA - pB).toFixed(1));
    if (pA > pB) {
      prepaidPoints = Math.round((pA - pB) * 10);
    }
  }

  let cancellationPoints = 0;
  let cancellationDiff = null;
  const cB = cancellationBefore !== '' && cancellationBefore != null ? Number(cancellationBefore) : null;
  const cA = cancellationAfter !== '' && cancellationAfter != null ? Number(cancellationAfter) : null;
  if (cB !== null && cA !== null && !isNaN(cB) && !isNaN(cA)) {
    cancellationDiff = Number((cA - cB).toFixed(1));
    if (cB > cA) {
      cancellationPoints = Math.round((cB - cA) * 20);
    }
  }

  return {
    salesPoints,
    salesPercent,
    prepaidPoints,
    prepaidDiff,
    cancellationPoints,
    cancellationDiff,
    totalPoints: salesPoints + prepaidPoints + cancellationPoints
  };
};
