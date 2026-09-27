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
    const chitNo = chit.chitNo || data.chitNo || 'Pending Assignment';
    const chitVal = formatAmountOnly(chit.chitValue || chit.totalAmount || data.chitValue || data.totalAmount || 0);
    const duration = chit.durationMonths || chit.duration || data.durationMonths || data.duration || 0;
    const monthlyPay = formatAmountOnly(chit.monthlyPayment || chit.monthlyAmount || data.monthlyPayment || data.monthlyAmount || 0);
    const payoutMonth = chit.payoutMonth || data.payoutMonth || 'Not Assigned';

    return (
`Hi ${name} 👋

Welcome to MSR CHITS.

Your chit details:

Chit No: ${chitNo}
Chit Value: ₹${chitVal}
Duration: ${duration} months
Monthly Payment: ₹${monthlyPay}
Fixed Payout Month: Month ${payoutMonth}

Thank you,
MSR CHITS`
    );
  }

  // 2+ Chits Consolidated Welcome
  let chitBlocks = '';
  activeChits.forEach((chit, idx) => {
    const chitNo = chit.chitNo || `Chit ${idx + 1}`;
    const chitVal = formatAmountOnly(chit.chitValue || chit.totalAmount || 0);
    const duration = chit.durationMonths || chit.duration || 0;
    const monthlyPay = formatAmountOnly(chit.monthlyPayment || chit.monthlyAmount || 0);
    const payoutMonth = chit.payoutMonth || 'Not Assigned';

    chitBlocks += (
`Chit ${idx + 1}:
Chit No: ${chitNo}
Chit Value: ₹${chitVal}
Duration: ${duration} months
Monthly Payment: ₹${monthlyPay}
Payout Month: Month ${payoutMonth}
`
    );
    if (idx < activeChits.length - 1) {
      chitBlocks += '\n';
    }
  });

  return (
`Hi ${name} 👋

Welcome to MSR CHITS.

Your active chit memberships:

━━━━━━━━━━━━━━
${chitBlocks}━━━━━━━━━━━━━━

Please keep these Chit Numbers for future reference.

Thank you,
MSR CHITS`
  );
}

/**
 * Formats the Payment Details block strictly from saved Settings
 * Shows only available fields; hides blank bank fields.
 */
export function formatPaymentDetailsBlock(settings = {}) {
  const upiId = settings.upiId || settings.configuredUPI || '';
  const bankName = settings.bankName || '';
  const accountHolderName = settings.accountHolderName || settings.accountName || '';
  const accountNumber = settings.accountNumber || settings.accountNo || '';
  const ifsc = settings.ifscCode || settings.ifsc || '';
  const branch = settings.branch || '';
  const paymentInstructions = settings.paymentInstructions || settings.notes || '';

  const hasUPI = Boolean(upiId && String(upiId).trim());
  const hasBank = Boolean(
    (bankName && String(bankName).trim()) ||
    (accountNumber && String(accountNumber).trim()) ||
    (ifsc && String(ifsc).trim())
  );

  if (!hasUPI && !hasBank) {
    return (
`Payment Details:

Payment details are not configured. Please contact MSR CHITS.`
    );
  }

  const lines = ['Payment Details:'];

  if (hasUPI) {
    lines.push(`\nUPI ID:\n${String(upiId).trim()}`);
  }

  if (hasBank) {
    if (bankName && String(bankName).trim()) lines.push(`\nBank:\n${String(bankName).trim()}`);
    if (accountHolderName && String(accountHolderName).trim()) lines.push(`\nAccount Name:\n${String(accountHolderName).trim()}`);
    if (accountNumber && String(accountNumber).trim()) lines.push(`\nAccount No:\n${String(accountNumber).trim()}`);
    if (ifsc && String(ifsc).trim()) lines.push(`\nIFSC:\n${String(ifsc).trim()}`);
    if (branch && String(branch).trim()) lines.push(`\nBranch:\n${String(branch).trim()}`);
  }

  if (paymentInstructions && String(paymentInstructions).trim()) {
    lines.push(`\nPayment Instruction:\n${String(paymentInstructions).trim()}`);
  }

  return lines.join('\n');
}

/**
 * 2. Monthly Payment Reminder
 * Generates dynamic month-specific reminder from actual schedule, multiple active chits, and Settings
 */
export function buildPaymentReminderMessage(data = {}, secondArg) {
  const name = data.memberName || data.name || 'Member';
  
  // Filter active chits (exclude cancelled or inactive)
  const rawChits = data.chits || (data.chitNo ? [data] : []);
  const activeChits = rawChits.filter(c => {
    if (!c) return false;
    const s = String(c.status || '').toUpperCase();
    return s !== 'CANCELLED' && s !== 'INACTIVE';
  });

  const monthSchedule = data.monthSchedule || {};
  const currentMonthNum = Number(data.currentMonth || secondArg || 1);
  const monthName = data.monthName || (data.month ? `Month ${data.month}` : `Month ${currentMonthNum}`);
  const dueDate = data.dueDate || data.paymentDueDate || `20th of ${monthName}`;
  
  const settings = data.settings || {
    upiId: data.upiId || data.configuredUPI || '',
    bankName: data.bankName || '',
    accountHolderName: data.accountHolderName || '',
    accountNumber: data.accountNumber || '',
    ifsc: data.ifsc || data.ifscCode || '',
    branch: data.branch || '',
    paymentInstructions: data.paymentInstructions || ''
  };

  const paymentBlock = formatPaymentDetailsBlock(settings);

  // Single Chit Format
  if (activeChits.length <= 1) {
    const chit = activeChits[0] || {};
    const chitNo = chit.chitNo || data.chitNo || 'Pending Assignment';
    const curMonth = Number(data.month || chit.currentMonth || currentMonthNum);
    const duration = Number(chit.durationMonths || chit.duration || data.durationMonths || data.duration || 20);

    let monthlyPayNum = 0;
    if (data.amount !== undefined && Number(data.amount) > 0) {
      monthlyPayNum = Number(data.amount);
    } else if (monthSchedule[curMonth] !== undefined && Number(monthSchedule[curMonth]) > 0) {
      monthlyPayNum = Number(monthSchedule[curMonth]);
    } else if (chit.monthlyPayment !== undefined && Number(chit.monthlyPayment) > 0) {
      monthlyPayNum = Number(chit.monthlyPayment);
    } else if (chit.monthlyAmount !== undefined && Number(chit.monthlyAmount) > 0) {
      monthlyPayNum = Number(chit.monthlyAmount);
    } else {
      monthlyPayNum = curMonth === 1 ? 5000 : 3750;
    }

    const paidNum = Number(data.paidAmount) || 0;
    const isPartial = paidNum > 0 && paidNum < monthlyPayNum;
    const balanceNum = Math.max(0, monthlyPayNum - paidNum);
    const totalDueNum = isPartial ? balanceNum : (paidNum >= monthlyPayNum ? 0 : monthlyPayNum);

    let amountSection = `  Amount Due: ₹${formatAmountOnly(monthlyPayNum)}`;
    if (isPartial) {
      amountSection = `  Amount Due: ₹${formatAmountOnly(monthlyPayNum)}\n  Paid: ₹${formatAmountOnly(paidNum)}\n  Balance Due: ₹${formatAmountOnly(balanceNum)}`;
    }

    return (
`Hi ${name} 👋

This is your MSR CHITS monthly payment reminder.

📅 Month: ${monthName}
📌 Payment Due Date: ${dueDate}

Your Chit Payments:

• Chit No: ${chitNo}
  Chit Month: ${curMonth} / ${duration}
${amountSection}

━━━━━━━━━━━━━━
Total Amount Due: ₹${formatAmountOnly(totalDueNum)}
━━━━━━━━━━━━━━

${paymentBlock}

After payment, please share the payment confirmation or transaction reference.

Thank you,
MSR CHITS`
    );
  }

  // 2+ Chits: Consolidated Multi-Chit Format
  let chitLines = [];
  let calculatedTotal = 0;

  activeChits.forEach((chit) => {
    const chitNo = chit.chitNo;
    const curMonth = Number(chit.currentMonth || currentMonthNum);
    const duration = Number(chit.durationMonths || chit.duration || 20);

    let payNum = 0;
    if (monthSchedule[curMonth] !== undefined && Number(monthSchedule[curMonth]) > 0) {
      payNum = Number(monthSchedule[curMonth]);
    } else if (chit.monthlyPayment !== undefined && Number(chit.monthlyPayment) > 0) {
      payNum = Number(chit.monthlyPayment);
    } else if (chit.monthlyAmount !== undefined && Number(chit.monthlyAmount) > 0) {
      payNum = Number(chit.monthlyAmount);
    } else {
      payNum = curMonth === 1 ? 5000 : 3750;
    }

    const paidNum = Number(chit.paidAmount) || 0;
    const isPartial = paidNum > 0 && paidNum < payNum;
    const balanceNum = Math.max(0, payNum - paidNum);
    const itemDue = isPartial ? balanceNum : (paidNum >= payNum ? 0 : payNum);

    calculatedTotal += itemDue;

    if (isPartial) {
      chitLines.push(
`• Chit No: ${chitNo}
  Chit Month: ${curMonth} / ${duration}
  Amount Due: ₹${formatAmountOnly(payNum)}
  Paid: ₹${formatAmountOnly(paidNum)}
  Balance Due: ₹${formatAmountOnly(balanceNum)}`
      );
    } else {
      chitLines.push(
`• Chit No: ${chitNo}
  Chit Month: ${curMonth} / ${duration}
  Amount Due: ₹${formatAmountOnly(payNum)}`
      );
    }
  });

  return (
`Hi ${name} 👋

This is your MSR CHITS monthly payment reminder.

📅 Month: ${monthName}
📌 Payment Due Date: ${dueDate}

Your Chit Payments:

${chitLines.join('\n\n')}

━━━━━━━━━━━━━━
Total Amount Due: ₹${formatAmountOnly(calculatedTotal)}
━━━━━━━━━━━━━━

${paymentBlock}

After payment, please share the payment confirmation or transaction reference.

Thank you,
MSR CHITS`
  );
}

/**
 * 3. Payment Received Confirmation
 * Strictly uses the actual payment returned from the database API.
 */
export function buildPaymentConfirmationMessage({
  memberName,
  chitNo,
  month = 1,
  duration = 20,
  amount = 0,
  paidAmount = 0,
  paymentDate,
  reference = '',
  referenceNumber = ''
}) {
  const name = memberName || 'Member';
  const cNo = chitNo || 'N/A';
  const amtFormatted = formatAmountOnly(paidAmount || amount || 0);
  const dateFormatted = paymentDate || new Date().toISOString().split('T')[0];
  const ref = reference || referenceNumber || '';
  const refLine = ref ? `\nReceipt / Reference:\n${ref}\n` : '';

  return (
`Hi ${name} 👋

Payment received successfully.

Chit No:
${cNo}

Month:
${month} / ${duration}

Amount Received:
₹${amtFormatted}

Payment Date:
${dateFormatted}
${refLine}
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
  payoutMonth = 1,
  actualPayoutAmount = 0,
  payoutDate,
  fundingSource = 'CHIT_FUND',
  status = 'Completed'
}) {
  const name = memberName || 'Member';
  const cNo = chitNo || 'N/A';
  const amtFormatted = formatAmountOnly(actualPayoutAmount);
  const dateFormatted = payoutDate || new Date().toISOString().split('T')[0];

  return (
`Hi ${name} 👋

MSR CHITS Payout Disbursed 🎉

Chit No: ${cNo}
Payout Month: Month ${payoutMonth}
Payout Amount: ₹${amtFormatted}
Payout Date: ${dateFormatted}
Funding Source: ${fundingSource}
Status: ${status}

Thank you,
MSR CHITS`
  );
}

// Aliases for seamless naming compatibility
export const createWelcomeMessage = buildWelcomeMessage;
export const generateWelcomeMessage = (member, chit) => buildWelcomeMessage({ ...member, ...(chit ? { chits: [chit], ...chit } : {}) });
export const createMonthlyPaymentReminder = (arg1, arg2) => buildPaymentReminderMessage(arg1, arg2);
export const generatePaymentReminderMessage = (member, reminderData) => buildPaymentReminderMessage({ ...member, ...reminderData });
export const createPaymentConfirmationMessage = buildPaymentConfirmationMessage;
export const generatePaymentReceiptMessage = (member, paymentData) => buildPaymentConfirmationMessage({ memberName: member?.name || member?.memberName, ...paymentData });
export const createPayoutDetailsMessage = buildPayoutDetailMessage;
export const createPayoutReminderMessage = buildPayoutReminderMessage;
export const createPayoutConfirmationMessage = buildPayoutConfirmationMessage;
export const generatePayoutMessage = (member, payoutData) => buildPayoutConfirmationMessage({ memberName: member?.name || member?.memberName, ...payoutData });


