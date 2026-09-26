/**
 * Form validation utilities
 */

export const validateMobile = (mobile) => {
  if (!mobile) return false;
  const clean = String(mobile).replace(/[^0-9]/g, '');
  if (clean.length === 10) return /^[6-9]\d{9}$/.test(clean);
  if (clean.length === 12 && clean.startsWith('91')) return /^[6-9]\d{9}$/.test(clean.slice(2));
  return false;
};

export const validateEmail = (email) => {
  if (!email || !email.trim()) return true; // Optional
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
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

export const validateStatus = (status) => {
  return status === 'Active' || status === 'Inactive';
};
