/**
 * Calculates all projection metrics, forecasts, ROAS, achievements, gaps, and statuses.
 * Accepts an optional referenceDate for deterministic testing and past/future calculation.
 */
export const calculateProjectionMetrics = (projection, referenceDate = new Date()) => {
  const {
    month,
    year,
    targetSpend = 0,
    targetRevenue = 0,
    targetROAS = 0,
    currentDailyBudget = 0,
    dailyTracking = []
  } = projection;

  const numTargetSpend = Number(targetSpend) || 0;
  const numTargetRevenue = Number(targetRevenue) || 0;
  const numTargetROAS = Number(targetROAS) || 0;
  const numDailyBudget = Number(currentDailyBudget) || 0;

  // Number of days in the projection month
  const daysInMonth = new Date(year, month, 0).getDate();

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let daysGone = 0;
  let remainingDays = 0;

  if (year < refYear || (year === refYear && month < refMonth)) {
    // Past month: complete
    daysGone = daysInMonth;
    remainingDays = 0;
  } else if (year > refYear || (year === refYear && month > refMonth)) {
    // Future month: not yet started
    daysGone = 0;
    remainingDays = daysInMonth;
  } else {
    // Current month:
    let maxEntryDay = 0;
    if (Array.isArray(dailyTracking) && dailyTracking.length > 0) {
      for (const entry of dailyTracking) {
        if (entry.date) {
          const parts = entry.date.split('-');
          if (parts.length === 3) {
            const dayNum = parseInt(parts[2], 10);
            if (!isNaN(dayNum) && dayNum > maxEntryDay) {
              maxEntryDay = dayNum;
            }
          }
        }
      }
    }

    daysGone = Math.min(daysInMonth, Math.max(refDay, maxEntryDay));
    remainingDays = Math.max(0, daysInMonth - daysGone);
  }

  // Sum actuals to date from daily tracking entries
  let totalActualSpend = 0;
  let totalActualRevenue = 0;

  if (Array.isArray(dailyTracking)) {
    for (const entry of dailyTracking) {
      totalActualSpend += Number(entry.actualSpend) || 0;
      totalActualRevenue += Number(entry.actualRevenue) || 0;
    }
  }

  // Forecast spend: Actual Spend To Date + (Current Daily Budget * Remaining Days)
  const forecastedFutureSpend = numDailyBudget * remainingDays;
  const forecastedMonthlySpend = totalActualSpend + forecastedFutureSpend;

  // Revenue Forecast:
  // Average Daily Revenue = Total Actual Revenue / daysGone
  // Forecasted Future Revenue = Average Daily Revenue * Remaining Days
  // Forecasted Monthly Revenue = Total Actual Revenue + Forecasted Future Revenue
  const averageDailyRevenue = daysGone > 0 ? totalActualRevenue / daysGone : 0;
  const forecastedFutureRevenue = averageDailyRevenue * remainingDays;
  const forecastedMonthlyRevenue = totalActualRevenue + forecastedFutureRevenue;

  // ROAS calculations (safe division by zero)
  const actualROAS = totalActualSpend > 0 ? totalActualRevenue / totalActualSpend : 0;
  const forecastedROAS = forecastedMonthlySpend > 0 ? forecastedMonthlyRevenue / forecastedMonthlySpend : 0;

  // Gaps (Target - Forecast)
  const spendGap = numTargetSpend - forecastedMonthlySpend;
  const revenueGap = numTargetRevenue - forecastedMonthlyRevenue;
  const roasGap = numTargetROAS - forecastedROAS;

  // Target Achievement (%)
  const spendAchievement = numTargetSpend > 0 ? (totalActualSpend / numTargetSpend) * 100 : 0;
  const revenueAchievement = numTargetRevenue > 0 ? (totalActualRevenue / numTargetRevenue) * 100 : 0;
  const forecastSpendAchievement = numTargetSpend > 0 ? (forecastedMonthlySpend / numTargetSpend) * 100 : 0;
  const forecastRevenueAchievement = numTargetRevenue > 0 ? (forecastedMonthlyRevenue / numTargetRevenue) * 100 : 0;

  // Status computation
  let revenueStatus = 'ON TRACK';
  if (numTargetRevenue > 0) {
    if (forecastRevenueAchievement >= 95) {
      revenueStatus = 'ON TRACK';
    } else if (forecastRevenueAchievement >= 80) {
      revenueStatus = 'AT RISK';
    } else {
      revenueStatus = 'BELOW TARGET';
    }
  }

  let spendStatus = 'ON TRACK';
  if (numTargetSpend > 0) {
    if (forecastSpendAchievement >= 95 && forecastSpendAchievement <= 105) {
      spendStatus = 'ON TRACK';
    } else if (forecastSpendAchievement >= 80 && forecastSpendAchievement <= 120) {
      spendStatus = 'AT RISK';
    } else if (forecastSpendAchievement > 120) {
      spendStatus = 'OVER BUDGET';
    } else {
      spendStatus = 'BELOW TARGET';
    }
  }

  let overallStatus = 'ON TRACK';
  if (revenueStatus === 'BELOW TARGET' || spendStatus === 'OVER BUDGET' || spendStatus === 'BELOW TARGET') {
    overallStatus = 'BELOW TARGET';
  } else if (revenueStatus === 'AT RISK' || spendStatus === 'AT RISK') {
    overallStatus = 'AT RISK';
  } else {
    overallStatus = 'ON TRACK';
  }

  const roundTo = (num, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(num) + Number.EPSILON) * factor) / factor;
  };

  return {
    daysInMonth,
    daysGone,
    remainingDays,
    totalActualSpend: roundTo(totalActualSpend, 2),
    totalActualRevenue: roundTo(totalActualRevenue, 2),
    averageDailyRevenue: roundTo(averageDailyRevenue, 2),
    forecastedFutureSpend: roundTo(forecastedFutureSpend, 2),
    forecastedMonthlySpend: roundTo(forecastedMonthlySpend, 2),
    forecastedFutureRevenue: roundTo(forecastedFutureRevenue, 2),
    forecastedMonthlyRevenue: roundTo(forecastedMonthlyRevenue, 2),
    actualROAS: roundTo(actualROAS, 2),
    forecastedROAS: roundTo(forecastedROAS, 2),
    targetROAS: roundTo(numTargetROAS, 2),
    spendGap: roundTo(spendGap, 2),
    revenueGap: roundTo(revenueGap, 2),
    roasGap: roundTo(roasGap, 2),
    spendAchievement: roundTo(spendAchievement, 1),
    revenueAchievement: roundTo(revenueAchievement, 1),
    forecastSpendAchievement: roundTo(forecastSpendAchievement, 1),
    forecastRevenueAchievement: roundTo(forecastRevenueAchievement, 1),
    spendStatus,
    revenueStatus,
    overallStatus,
    hasDailyData: Array.isArray(dailyTracking) && dailyTracking.length > 0
  };
};
