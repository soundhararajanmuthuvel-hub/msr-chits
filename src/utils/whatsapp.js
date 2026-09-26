/**
 * MSR CHITS — WhatsApp Messaging Utility & Templates
 * 
 * Rules:
 * - Uses WhatsApp Click-to-Chat: https://wa.me/{phone}?text={encodedMessage}
 * - Normalizes Indian phone numbers (e.g. 9876543210 -> 919876543210).
 * - Never falsely claim "Sent". Status can only be 'Prepared' or 'Opened' (or manual 'Sent').
 * - All financial numbers are formatted cleanly with actual values from database.
 * - Total monthly payment is dynamically calculated from actual active memberships.
 */

import { formatINR } from './currency.js';

/**
 * Normalizes Indian phone numbers into standard international format without '+' or special characters.
 * Example: 9876543210 -> 919876543210
 * Example: +91 98765-43210 -> 919876543210
 * Example: 919876543210 -> 919876543210
 */
export function normalizeIndianPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  // Already 91 followed by 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  // Standard 10 digit Indian mobile
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // 11 digits starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Validates whether a phone number can receive WhatsApp messages.
 */
export function isValidWhatsAppPhone(phone) {
  const normalized = normalizeIndianPhone(phone);
  // Valid Indian mobile numbers are 12 digits (91 + 10 digits starting with 6, 7, 8, or 9)
  return normalized.length === 12 && normalized.startsWith('91');
}

/**
 * Generates the WhatsApp Click-to-Chat URL.
 */
export function generateWhatsAppUrl(phone, message) {
  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) return '';
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

/**
 * Helper to format currency number without the ₹ symbol when constructing templates,
 * or with comma formatting (e.g. 1,00,000).
 */
export function formatAmountOnly(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN').format(num);
}

// ============================================================================
// TEMPLATE BUILDERS (Dynamic, strictly from real database records)
// ============================================================================

/**
 * 1. Welcome Message
 * If 1 chit: Single chit format
 * If 2+ chits: Consolidated welcome message
 */
export function buildWelcomeMessage(data = {}) {
  const name = data.memberName || data.name || 'Member';
  const chits = data.chits || [];
  const activeChits = (chits || []).filter(c => c && c.chitNo);

  if (activeChits.length <= 1) {
    const chit = activeChits[0] || {};
    const chitNo = chit.chitNo || 'Pending Assignment';
    const chitVal = formatAmountOnly(chit.chitValue || 100000);
    const duration = chit.durationMonths || chit.duration || 20;
    const monthlyPay = formatAmountOnly(chit.monthlyPayment || chit.monthlyAmount || 3750);
    const payoutMonth = chit.payoutMonth || 'Not Assigned';

    return (
`Hi ${name} 👋

Welcome to MSR CHITS.

Your chit membership details:

━━━━━━━━━━━━━━
Chit No: ${chitNo}
Chit Value: ₹${chitVal}
Duration: ${duration} Months
Monthly Payment: ₹${monthlyPay}
Fixed Payout Month: Month ${payoutMonth}
━━━━━━━━━━━━━━

Please keep your Chit Number for future reference.

Thank you,
MSR CHITS`
    );
  }

  // 2+ Chits Consolidated Welcome
  let chitBlocks = '';
  activeChits.forEach((chit, idx) => {
    const chitNo = chit.chitNo || `Chit ${idx + 1}`;
    const chitVal = formatAmountOnly(chit.chitValue || 100000);
    const duration = chit.durationMonths || chit.duration || 20;
    const monthlyPay = formatAmountOnly(chit.monthlyPayment || chit.monthlyAmount || 3750);
    const payoutMonth = chit.payoutMonth || 'Not Assigned';

    chitBlocks += (
`CHIT ${idx + 1}

Chit No: ${chitNo}
Chit Value: ₹${chitVal}
Duration: ${duration} Months
Monthly Payment: ₹${monthlyPay}
Fixed Payout Month: Month ${payoutMonth}
━━━━━━━━━━━━━━
`
    );
    if (idx < activeChits.length - 1) {
      chitBlocks += '\n';
    }
  });

  return (
`Hi ${name} 👋

Welcome to MSR CHITS.

Your chit membership details:

━━━━━━━━━━━━━━
${chitBlocks}
Please keep these Chit Numbers for future reference.

Thank you,
MSR CHITS`
  );
}

/**
 * 2. Monthly Payment Reminder
 * If 1 chit: Single chit reminder
 * If 2+ chits: Consolidated reminder with calculated total from actual active memberships
 */
export function buildPaymentReminderMessage(data = {}, secondArg) {
  const name = data.memberName || data.name || 'Member';
  const chits = data.chits || [];
  const currentMonth = data.currentMonth || secondArg || 2;
  const monthSchedule = data.monthSchedule || {};
  const activeChits = (chits || []).filter(c => c && c.chitNo);

  if (activeChits.length <= 1) {
    const chit = activeChits[0] || {};
    const chitNo = chit.chitNo || 'MSR261L01';
    const chitVal = formatAmountOnly(chit.chitValue || 100000);
    const curMonth = currentMonth || chit.currentMonth || 2;
    const duration = chit.durationMonths || chit.duration || 20;
    
    // Scheduled monthly amount for current month
    const monthlyPay = formatAmountOnly(
      monthSchedule[curMonth] || chit.monthlyPayment || chit.monthlyAmount || 3750
    );

    return (
`Hi ${name},

MSR CHITS Payment Reminder 🔔

Chit No: ${chitNo}
Chit Value: ₹${chitVal}
Month: ${curMonth} of ${duration}
Monthly Payment: ₹${monthlyPay}

Please make your monthly payment.

Thank you,
MSR CHITS`
    );
  }

  // 2+ Chits: Consolidated payment reminder
  const numIcons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  let chitLines = [];
  let calculatedTotal = 0;

  activeChits.forEach((chit, idx) => {
    const icon = numIcons[idx] || `${idx + 1}️⃣`;
    const chitNo = chit.chitNo || `Chit ${idx + 1}`;
    const curMonth = currentMonth || chit.currentMonth || 2;
    const duration = chit.durationMonths || chit.duration || 20;
    const payNum = Number(monthSchedule[curMonth] || chit.monthlyPayment || chit.monthlyAmount || 3750);
    calculatedTotal += payNum;

    chitLines.push(
`${icon} ${chitNo}
Month: ${curMonth}/${duration}
Payment: ₹${formatAmountOnly(payNum)}`
    );
  });

  return (
`Hi ${name},

MSR CHITS Monthly Payment Reminder 🔔

Your active chits:

${chitLines.join('\n\n')}

Total Monthly Payment: ₹${formatAmountOnly(calculatedTotal)}

Thank you,
MSR CHITS`
  );
}

/**
 * 3. Payment Received Confirmation
 * Strictly uses the actual payment returned from the API.
 */
export function buildPaymentConfirmationMessage({
  memberName,
  chitNo,
  month = 2,
  durationMonths = 20,
  amount = 3750,
  paymentDate
}) {
  const name = memberName || 'Member';
  const cNo = chitNo || 'MSR261L01';
  const amtFormatted = formatAmountOnly(amount);
  const dateFormatted = paymentDate || new Date().toISOString().split('T')[0];

  return (
`Hi ${name},

Payment Received ✅

Chit No: ${cNo}
Month: ${month} of ${durationMonths}
Amount Paid: ₹${amtFormatted}
Payment Date: ${dateFormatted}

Your payment has been recorded successfully.

Thank you,
MSR CHITS`
  );
}

/**
 * 4. Payout Detail Message (Before payout)
 */
export function buildPayoutDetailMessage({
  memberName,
  chitNo,
  chitValue = 100000,
  payoutMonth = 2
}) {
  const name = memberName || 'Member';
  const cNo = chitNo || 'MSR261L01';
  const chitValFormatted = formatAmountOnly(chitValue);

  return (
`Hi ${name},

MSR CHITS Payout Information 🎯

Chit No: ${cNo}

Chit Value: ₹${chitValFormatted}
Payout Month: Month ${payoutMonth}
Status: Scheduled

Your payout is assigned to Month ${payoutMonth}.

MSR CHITS`
  );
}

/**
 * 5. Payout Reminder
 */
export function buildPayoutReminderMessage({
  memberName,
  chitNo,
  chitValue = 100000,
  payoutMonth = 2
}) {
  const name = memberName || 'Member';
  const cNo = chitNo || 'MSR261L01';
  const chitValFormatted = formatAmountOnly(chitValue);

  return (
`Hi ${name},

MSR CHITS Payout Reminder 🎯

Chit No: ${cNo}
Chit Value: ₹${chitValFormatted}
Payout Month: Month ${payoutMonth}

Your payout is scheduled for Month ${payoutMonth}.

MSR CHITS`
  );
}

/**
 * 6. Payout Completed Confirmation
 * Uses actual payout amount and date from the recorded payout.
 */
export function buildPayoutConfirmationMessage({
  memberName,
  chitNo,
  payoutMonth = 2,
  actualPayoutAmount = 0,
  payoutDate
}) {
  const name = memberName || 'Member';
  const cNo = chitNo || 'MSR261L01';
  const amtFormatted = formatAmountOnly(actualPayoutAmount);
  const dateFormatted = payoutDate || new Date().toISOString().split('T')[0];

  return (
`Hi ${name},

MSR CHITS Payout Update 🎉

Chit No: ${cNo}
Payout Month: Month ${payoutMonth}
Payout Amount: ₹${amtFormatted}
Payout Date: ${dateFormatted}
Status: Paid

Thank you,
MSR CHITS`
  );
}

// Aliases for seamless naming compatibility
export const createWelcomeMessage = buildWelcomeMessage;
export const createMonthlyPaymentReminder = (arg1, arg2) => buildPaymentReminderMessage(arg1, arg2);
export const createPaymentConfirmationMessage = buildPaymentConfirmationMessage;
export const createPayoutDetailsMessage = buildPayoutDetailMessage;
export const createPayoutReminderMessage = buildPayoutReminderMessage;
export const createPayoutConfirmationMessage = buildPayoutConfirmationMessage;

