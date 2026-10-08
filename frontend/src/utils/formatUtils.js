export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export const getMonthName = (monthNumber) => {
  const m = MONTHS.find((item) => item.value === Number(monthNumber));
  return m ? m.label : `Month ${monthNumber}`;
};

/**
 * Formats a number as Indian Currency (INR)
 * @param {number} amount
 * @param {boolean} compact - if true, shows ₹8L, ₹25K, ₹1.5Cr
 */
export const formatCurrency = (amount, compact = false) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const num = Number(amount);

  if (compact) {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    }
    if (abs >= 1000) {
      return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `${sign}₹${abs.toLocaleString('en-IN')}`;
  }

  // Full Indian number formatting (e.g. ₹8,00,000)
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const formatROAS = (roas) => {
  if (roas === undefined || roas === null || isNaN(roas)) return '0.00x';
  return `${Number(roas).toFixed(2)}x`;
};

export const formatPercent = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  return `${Number(val).toFixed(1)}%`;
};
