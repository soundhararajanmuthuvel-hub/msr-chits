/**
 * MSR CHITS — Unique Chit Number Utility
 * 
 * Format: MSR + YY + AMOUNT_CODE + UNIQUE_NUMBER
 * Example: For ₹1,00,000 in 2026 -> MSR261L01 to MSR261L20
 * 
 * Rules:
 * - Permanent once assigned.
 * - Never duplicate across the database.
 * - Amount code helper: ₹1,00,000 -> 1L, ₹2,00,000 -> 2L, ₹50,000 -> 50K, ₹75,000 -> 75K.
 * - Unique number is 2 digits padded (01, 02, ... 20).
 * - Fixed payout month directly maps to the chit sequence number (01 -> Month 1, 02 -> Month 2).
 */

/**
 * Converts a chit total amount into a compact amount code.
 * ₹1,00,000 -> 1L
 * ₹2,00,000 -> 2L
 * ₹3,00,000 -> 3L
 * ₹50,000   -> 50K
 * ₹75,000   -> 75K
 */
export function getAmountCode(amount) {
  const num = Number(amount) || 0;
  if (num >= 100000) {
    const lakhs = num / 100000;
    return (Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)) + 'L';
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return (Number.isInteger(thousands) ? thousands : thousands.toFixed(0)) + 'K';
  }
  return String(num);
}

/**
 * Extracts the 2-digit year code.
 * e.g. "2026-01-01" -> "26", 2026 -> "26"
 */
export function getYearCode(startDateOrYear) {
  if (!startDateOrYear) {
    return '26';
  }
  const str = String(startDateOrYear).trim();
  if (str.length >= 4 && str.includes('-')) {
    return str.slice(2, 4);
  }
  if (str.length === 4) {
    return str.slice(2, 4);
  }
  if (str.length === 2) {
    return str;
  }
  return '26';
}

/**
 * Formats a sequence number to 2 digits.
 * 1 -> "01", 20 -> "20"
 */
export function formatSequenceNumber(num) {
  const n = parseInt(num, 10) || 1;
  return String(n).padStart(2, '0');
}

/**
 * Builds a permanent unique Chit Number.
 * Supports both named object: generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: 2 })
 * and positional args: generateChitNumber(100000, 2026, 2)
 */
export function generateChitNumber(arg1 = {}, arg2, arg3) {
  let year = 2026;
  let chitValue = 100000;
  let sequenceNumber = 1;

  if (typeof arg1 === 'object' && arg1 !== null) {
    year = arg1.year ?? 2026;
    chitValue = arg1.chitValue ?? 100000;
    sequenceNumber = arg1.sequenceNumber ?? 1;
  } else {
    // Positional arguments
    if (Number(arg1) >= 1000) {
      chitValue = arg1;
      year = arg2 ?? 2026;
      sequenceNumber = arg3 ?? 1;
    } else {
      year = arg1 ?? 2026;
      chitValue = arg2 ?? 100000;
      sequenceNumber = arg3 ?? 1;
    }
  }

  const yr = getYearCode(year);
  const amt = getAmountCode(chitValue);
  const seq = formatSequenceNumber(sequenceNumber);
  return `MSR${yr}${amt}${seq}`;
}

/**
 * Parses a Chit Number into components.
 * e.g. "MSR261L02" -> { prefix: 'MSR', year: '26', amountCode: '1L', sequenceNumber: 2 }
 */
export function parseChitNumber(chitNo) {
  if (!chitNo || typeof chitNo !== 'string') return null;
  const match = chitNo.match(/^MSR(\d{2})([0-9.]+[LK])(\d{2})$/i);
  if (!match) return null;
  return {
    prefix: 'MSR',
    year: match[1],
    amountCode: match[2].toUpperCase(),
    sequenceNumber: parseInt(match[3], 10),
    payoutMonth: parseInt(match[3], 10)
  };
}

/**
 * Helper to build result object that also coerces to string when compared.
 */
function createChitNumberResult(chitNo, slot) {
  return {
    chitNo,
    sequenceNumber: slot,
    payoutMonth: slot,
    toString() {
      return chitNo;
    },
    valueOf() {
      return chitNo;
    }
  };
}

/**
 * Generates the next available unique Chit Number for a chit group.
 * Guarantees no collision with existing Chit Numbers.
 * Supports both options object or positional (existingChits, chitValue, year, preferredSlot).
 */
export function getNextAvailableChitNumber(arg1 = {}, arg2, arg3, arg4) {
  let existingChitNumbers = [];
  let year = 2026;
  let chitValue = 100000;
  let durationMonths = 20;
  let preferredSlot = null;

  if (Array.isArray(arg1)) {
    existingChitNumbers = arg1;
    chitValue = arg2 ?? 100000;
    year = arg3 ?? 2026;
    preferredSlot = arg4 ?? null;
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    existingChitNumbers = arg1.existingChitNumbers || [];
    year = arg1.year ?? 2026;
    chitValue = arg1.chitValue ?? 100000;
    durationMonths = arg1.durationMonths ?? 20;
    preferredSlot = arg1.preferredSlot ?? null;
  }

  const existingSet = new Set(
    (existingChitNumbers || []).map(no => String(no || '').trim().toUpperCase())
  );

  // If a preferred slot (e.g. payout month) is requested, check if it's available first
  if (preferredSlot && preferredSlot >= 1) {
    const candidate = generateChitNumber({ year, chitValue, sequenceNumber: preferredSlot });
    if (!existingSet.has(candidate.toUpperCase())) {
      return createChitNumberResult(candidate, preferredSlot);
    }
  }

  // Find lowest available slot from 1 to durationMonths
  for (let slot = 1; slot <= durationMonths; slot++) {
    const candidate = generateChitNumber({ year, chitValue, sequenceNumber: slot });
    if (!existingSet.has(candidate.toUpperCase())) {
      return createChitNumberResult(candidate, slot);
    }
  }

  // If all 1..durationMonths slots are filled, overflow sequence
  let overflowSlot = durationMonths + 1;
  while (true) {
    const candidate = generateChitNumber({ year, chitValue, sequenceNumber: overflowSlot });
    if (!existingSet.has(candidate.toUpperCase())) {
      return createChitNumberResult(candidate, overflowSlot);
    }
    overflowSlot++;
  }
}
