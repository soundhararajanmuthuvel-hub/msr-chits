/**
 * Utility functions for Indian Rupee currency formatting and calculation
 */

export const formatINR = (amount, showSymbol = true) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? '₹0' : '0';
  }
  
  const num = Number(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(num);

  return showSymbol ? `₹${formatted}` : formatted;
};

export const formatLakh = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  const num = Number(amount);
  if (num >= 100000) {
    const lakhs = num / 100000;
    return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(2)} Lakh`;
  }
  return formatINR(amount);
};

export const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
