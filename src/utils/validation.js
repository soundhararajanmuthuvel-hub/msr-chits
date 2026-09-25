/**
 * Form validation utilities
 */

export const validateMobile = (mobile) => {
  if (!mobile) return false;
  const clean = mobile.replace(/[^0-9]/g, '');
  return clean.length === 10;
};

export const validateRequired = (val) => {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  return true;
};

export const validatePositiveNumber = (val) => {
  const num = Number(val);
  return !isNaN(num) && num > 0;
};
