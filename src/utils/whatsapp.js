/**
 * MSR CHITS — Simplified WhatsApp Messaging Utility & Templates
 * English + தமிழ் Support
 * 
 * Rules:
 * - Simple, short, friendly, human sounding
 * - Real data only from Google Sheets
 * - Uses WhatsApp Click-to-Chat: https://wa.me/{phone}?text={encodedMessage}
 * - Preserves Tamil Unicode characters via encodeURIComponent
 * - Never falsely claim "Sent". Status is 'Prepared' or 'Opened' (or manual 'Sent')
 */

/**
 * Normalizes Indian phone numbers into standard international format without '+' or special characters.
 * Example: 9876543210 -> 919876543210
 * Example: +91 98765-43210 -> 919876543210
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
 * Preserves Tamil Unicode characters cleanly with encodeURIComponent.
 */
export function generateWhatsAppUrl(phone, message) {
  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) return '';
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

/**
 * Formats numbers into Indian numbering style (e.g. 1,00,000 or 3,750).
 */
export function formatAmountOnly(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Normalizes language string to 'en' or 'ta'.
 */
export function normalizeLanguage(lang) {
  if (!lang) return 'en';
  const l = String(lang).trim().toLowerCase();
  if (l === 'ta' || l === 'tamil' || l === 'தமிழ்' || l === 'tam') {
    return 'ta';
  }
  return 'en';
}

// ============================================================================
// TEMPLATE BUILDERS (English & தமிழ்)
// ============================================================================

/**
 * 1. Welcome Message
 * Single Chit vs Multiple Chits
 */
export function buildWelcomeMessage(data = {}, langArg) {
  const lang = normalizeLanguage(data.language || langArg);
  const name = data.memberName || data.name || (lang === 'ta' ? 'அன்பர்' : 'Member');
  const chits = (data.chits || []).filter(c => c && c.chitNo && String(c.status || '').toUpperCase() !== 'CANCELLED');

  // Single Chit Welcome
  if (chits.length <= 1) {
    const chit = chits[0] || {};
    const chitNo = chit.chitNo || data.chitNo || 'Pending';
    const chitVal = formatAmountOnly(chit.chitValue || chit.totalAmount || data.chitValue || data.totalAmount || 0);
    const monthlyPay = formatAmountOnly(chit.monthlyPayment || chit.monthlyAmount || data.monthlyPayment || data.monthlyAmount || 0);
    const payoutMonth = chit.payoutMonth || data.payoutMonth || 'Pending';

    if (lang === 'ta') {
      return (
`வணக்கம் ${name} 👋

MSR CHITS-க்கு வரவேற்கிறோம்.

உங்கள் சீட்டு விவரம்:

சீட்டு எண்: ${chitNo}
சீட்டு தொகை: ₹${chitVal}
மாத தவணை: ₹${monthlyPay}
பணம் பெறும் மாதம்: ${payoutMonth}வது மாதம்

நன்றி.
MSR CHITS`
      );
    }

    return (
`Hi ${name} 👋

Welcome to MSR CHITS.

Your chit details:

Chit No: ${chitNo}
Chit Value: ₹${chitVal}
Monthly Payment: ₹${monthlyPay}
Payout Month: Month ${payoutMonth}

Thank you for joining MSR CHITS.`
    );
  }

  // Multiple Chits Combined Welcome
  const totalMonthlyNum = chits.reduce((sum, c) => sum + (Number(c.monthlyPayment || c.monthlyAmount) || 0), 0);
  const totalMonthly = formatAmountOnly(totalMonthlyNum);

  if (lang === 'ta') {
    const chitItems = chits.map((c, idx) => {
      const val = formatAmountOnly(c.chitValue || c.totalAmount || 0);
      return `${idx + 1}. ${c.chitNo} — ₹${val}\n   பணம் பெறும் மாதம்: ${c.payoutMonth || '-'}`;
    }).join('\n\n');

    return (
`வணக்கம் ${name} 👋

உங்கள் MSR CHITS:

${chitItems}

மொத்த மாத தவணை: ₹${totalMonthly}

நன்றி.
MSR CHITS`
    );
  }

  const chitItems = chits.map((c, idx) => {
    const val = formatAmountOnly(c.chitValue || c.totalAmount || 0);
    return `${idx + 1}. ${c.chitNo} — ₹${val}\n   Payout: Month ${c.payoutMonth || '-'}`;
  }).join('\n\n');

  return (
`Hi ${name} 👋

Your MSR CHITS:

${chitItems}

Monthly Total: ₹${totalMonthly}

Thank you.
MSR CHITS`
  );
}

/**
 * 2. Monthly Payment Reminder
 * Single Chit vs Multiple Active Chits
 * Reads actual monthly schedule data and configured UPI ID.
 */
export function buildPaymentReminderMessage(data = {}, secondArg, thirdArg) {
  let lang = 'en';
  if (typeof thirdArg === 'string') {
    lang = normalizeLanguage(thirdArg);
  } else if (typeof secondArg === 'string' && (secondArg === 'ta' || secondArg === 'en' || secondArg === 'tamil' || secondArg === 'தமிழ்')) {
    lang = normalizeLanguage(secondArg);
  } else {
    lang = normalizeLanguage(data.language);
  }

  const name = data.memberName || data.name || (lang === 'ta' ? 'அன்பர்' : 'Member');
  const monthSchedule = data.monthSchedule || {};
  const currentMonthNum = Number(data.currentMonth || (typeof secondArg === 'number' ? secondArg : data.month) || 1);

  // Filter active chits
  const rawChits = data.chits || (data.chitNo ? [data] : []);
  const activeChits = rawChits.filter(c => {
    if (!c) return false;
    const s = String(c.status || '').toUpperCase();
    return s !== 'CANCELLED' && s !== 'INACTIVE';
  });

  const upiId = data.upiId || data.settings?.upiId || data.configuredUPI || '';

  // Single Chit Reminder
  if (activeChits.length <= 1) {
    const chit = activeChits[0] || {};
    const chitNo = chit.chitNo || data.chitNo || 'Pending';
    const month = Number(data.month || chit.currentMonth || currentMonthNum);

    let amountNum = 0;
    if (data.amount !== undefined && Number(data.amount) > 0) {
      amountNum = Number(data.amount);
    } else if (monthSchedule[month] !== undefined && Number(monthSchedule[month]) > 0) {
      amountNum = Number(monthSchedule[month]);
    } else if (chit.monthlyPayment !== undefined && Number(chit.monthlyPayment) > 0) {
      amountNum = Number(chit.monthlyPayment);
    } else if (chit.monthlyAmount !== undefined && Number(chit.monthlyAmount) > 0) {
      amountNum = Number(chit.monthlyAmount);
    } else {
      amountNum = month === 1 ? 5000 : 3750;
    }

    const paidNum = Number(data.paidAmount) || 0;
    const isPartial = paidNum > 0 && paidNum < amountNum;
    const dueNum = isPartial ? Math.max(0, amountNum - paidNum) : amountNum;
    const amountStr = formatAmountOnly(dueNum);

    let upiBlock = '';
    if (upiId && String(upiId).trim()) {
      upiBlock = lang === 'ta' 
        ? `\n\nபணம் செலுத்த UPI:\n${String(upiId).trim()}`
        : `\n\nPayment UPI:\n${String(upiId).trim()}`;
    }

    if (lang === 'ta') {
      return (
`வணக்கம் ${name} 👋

MSR CHITS மாத தவணை நினைவூட்டல்.

மாதம்: ${month}
தொகை: ₹${amountStr}
சீட்டு எண்: ${chitNo}

தயவுசெய்து இந்த மாத தவணையை செலுத்தவும்.${upiBlock}

நன்றி.
MSR CHITS`
      );
    }

    return (
`Hi ${name} 👋

MSR CHITS payment reminder.

Month: ${month}
Amount: ₹${amountStr}
Chit No: ${chitNo}

Please make your monthly payment.${upiBlock}

Thank you.
MSR CHITS`
    );
  }

  // Multiple Chits Combined Reminder
  let calculatedTotal = 0;
  const chitLines = activeChits.map(chit => {
    const chitNo = chit.chitNo;
    const cMonth = Number(chit.currentMonth || currentMonthNum);

    let cPay = 0;
    if (monthSchedule[cMonth] !== undefined && Number(monthSchedule[cMonth]) > 0) {
      cPay = Number(monthSchedule[cMonth]);
    } else if (chit.monthlyPayment !== undefined && Number(chit.monthlyPayment) > 0) {
      cPay = Number(chit.monthlyPayment);
    } else if (chit.monthlyAmount !== undefined && Number(chit.monthlyAmount) > 0) {
      cPay = Number(chit.monthlyAmount);
    } else {
      cPay = cMonth === 1 ? 5000 : 3750;
    }

    const paidNum = Number(chit.paidAmount) || 0;
    const itemDue = (paidNum > 0 && paidNum < cPay) ? Math.max(0, cPay - paidNum) : cPay;
    calculatedTotal += itemDue;

    return `${chitNo} — ₹${formatAmountOnly(itemDue)}`;
  });

  const totalStr = formatAmountOnly(calculatedTotal);

  let upiBlock = '';
  if (upiId && String(upiId).trim()) {
    upiBlock = lang === 'ta'
      ? `\n\nபணம் செலுத்த UPI:\n${String(upiId).trim()}`
      : `\n\nPayment UPI:\n${String(upiId).trim()}`;
  }

  if (lang === 'ta') {
    return (
`வணக்கம் ${name} 👋

MSR CHITS மாத தவணை நினைவூட்டல்.

இந்த மாத மொத்த தவணை: ₹${totalStr}

${chitLines.join('\n')}

தயவுசெய்து தவணையை செலுத்தவும்.${upiBlock}

நன்றி.
MSR CHITS`
    );
  }

  return (
`Hi ${name} 👋

MSR CHITS payment reminder.

This month's total: ₹${totalStr}

${chitLines.join('\n')}

Please make the payment.${upiBlock}

Thank you.
MSR CHITS`
  );
}

/**
 * 3. Payment Received Confirmation
 */
export function buildPaymentConfirmationMessage(data = {}, langArg) {
  const lang = normalizeLanguage(data.language || langArg);
  const name = data.memberName || data.name || (lang === 'ta' ? 'அன்பர்' : 'Member');
  const chitNo = data.chitNo || 'Pending';
  const month = data.month || data.monthNumber || 1;
  const amount = formatAmountOnly(data.paidAmount || data.amount || 0);

  if (lang === 'ta') {
    return (
`வணக்கம் ${name} 👋

உங்கள் பணம் பெறப்பட்டது.

சீட்டு எண்: ${chitNo}
மாதம்: ${month}
தொகை: ₹${amount}

நன்றி.
MSR CHITS`
    );
  }

  return (
`Hi ${name} 👋

Payment received successfully.

Chit No: ${chitNo}
Month: ${month}
Amount: ₹${amount}

Thank you.
MSR CHITS`
  );
}

/**
 * 4. Payout Information / Scheduled
 */
export function buildPayoutDetailMessage(data = {}, langArg) {
  const lang = normalizeLanguage(data.language || langArg);
  const name = data.memberName || data.name || (lang === 'ta' ? 'அன்பர்' : 'Member');
  const chitNo = data.chitNo || 'Pending';
  const month = data.month || data.payoutMonth || 1;
  const scheduledAmount = formatAmountOnly(data.scheduledAmount || data.amount || data.chitValue || 0);

  if (lang === 'ta') {
    return (
`வணக்கம் ${name} 👋

உங்கள் MSR CHITS பணம் பெறும் விவரம்:

சீட்டு எண்: ${chitNo}
பணம் பெறும் மாதம்: ${month}

திட்டமிட்ட தொகை: ₹${scheduledAmount}

MSR CHITS`
    );
  }

  return (
`Hi ${name} 👋

Your MSR CHITS payout is scheduled.

Chit No: ${chitNo}
Payout Month: ${month}

Scheduled Amount: ₹${scheduledAmount}

MSR CHITS`
  );
}

export function buildPayoutReminderMessage(data = {}, langArg) {
  return buildPayoutDetailMessage(data, langArg);
}

/**
 * 5. Actual Payout Completed
 */
export function buildPayoutConfirmationMessage(data = {}, langArg) {
  const lang = normalizeLanguage(data.language || langArg);
  const name = data.memberName || data.name || (lang === 'ta' ? 'அன்பர்' : 'Member');
  const chitNo = data.chitNo || 'Pending';
  const month = data.month || data.monthNumber || data.payoutMonth || 1;
  const actualAmount = formatAmountOnly(data.actualAmount || data.actualPayoutAmount || data.amount || data.payoutAmount || 0);
  
  const rawFunding = String(data.fundingSource || '').toUpperCase();
  const isExtra = rawFunding.includes('EXTRA');
  const fundingSource = isExtra ? 'Extra Investment' : 'Chit Fund';

  if (lang === 'ta') {
    return (
`வணக்கம் ${name} 👋

உங்கள் சீட்டு பணம் வழங்கப்பட்டது.

சீட்டு எண்: ${chitNo}
மாதம்: ${month}
வழங்கிய தொகை: ₹${actualAmount}
மூலம்: ${fundingSource}

நன்றி.
MSR CHITS`
    );
  }

  return (
`Hi ${name} 👋

Payout completed.

Chit No: ${chitNo}
Month: ${month}
Amount Paid: ₹${actualAmount}
Funding: ${fundingSource}

Thank you.
MSR CHITS`
  );
}

// Aliases for compatibility
export const createWelcomeMessage = buildWelcomeMessage;
export const generateWelcomeMessage = (member, chit, lang) => {
  if (chit && typeof chit === 'string') {
    return buildWelcomeMessage(member, chit);
  }
  return buildWelcomeMessage({ ...member, ...(chit ? { chits: [chit], ...chit } : {}), language: lang || member?.language });
};

export const createMonthlyPaymentReminder = (arg1, arg2, arg3) => buildPaymentReminderMessage(arg1, arg2, arg3);
export const generatePaymentReminderMessage = (member, reminderData, lang) => {
  if (reminderData && typeof reminderData === 'string') {
    return buildPaymentReminderMessage(member, reminderData);
  }
  return buildPaymentReminderMessage({ ...member, ...reminderData, language: lang || reminderData?.language || member?.language });
};

export const createPaymentConfirmationMessage = buildPaymentConfirmationMessage;
export const generatePaymentReceiptMessage = (memberOrData, paymentDataOrLang, lang) => {
  if (!paymentDataOrLang || typeof paymentDataOrLang === 'string') {
    return buildPaymentConfirmationMessage(memberOrData, paymentDataOrLang);
  }
  return buildPaymentConfirmationMessage({ 
    memberName: memberOrData?.name || memberOrData?.memberName, 
    ...paymentDataOrLang, 
    language: lang || paymentDataOrLang?.language || memberOrData?.language 
  });
};

export const createPayoutDetailsMessage = buildPayoutDetailMessage;
export const createPayoutReminderMessage = buildPayoutReminderMessage;
export const createPayoutConfirmationMessage = buildPayoutConfirmationMessage;
export const generatePayoutMessage = (memberOrData, payoutDataOrLang, lang) => {
  if (!payoutDataOrLang || typeof payoutDataOrLang === 'string') {
    return buildPayoutConfirmationMessage(memberOrData, payoutDataOrLang);
  }
  return buildPayoutConfirmationMessage({ 
    memberName: memberOrData?.name || memberOrData?.memberName, 
    ...payoutDataOrLang, 
    language: lang || payoutDataOrLang?.language || memberOrData?.language 
  });
};
