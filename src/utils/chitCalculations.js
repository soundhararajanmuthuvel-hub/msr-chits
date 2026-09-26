/**
 * MSR CHITS — Master Calculation Engine
 * 
 * Dynamic, Dividend-aware, Multiple-aware, Duration-aware, and Payout-aware.
 * Strictly adheres to MSR CHITS calculation methods:
 * 1. Base Chit Value × Multiple = Total Chit Value
 * 2. Base Installment = Total Chit Value / Duration
 * 3. Monthly Amount (bidding month) = Base Installment - Dividend
 * 4. Payout Amount (bidding month) = Total Chit Value - (Dividend × Duration)
 * 5. Dynamic generation of complete N-month schedule
 * 6. Isolated Extra Investment profit tracking
 */

/**
 * Calculates core financial parameters for a chit plan
 */
export function calculateChitParameters({
  chitValue = 100000,
  multiple = 1,
  duration = 20,
  dividend = 0,
  startMonth = 1
}) {
  const baseValue = Math.max(0, Number(chitValue) || 0);
  const mult = Math.max(0.1, Number(multiple) || 1);
  const totalChitValue = Math.round(baseValue * mult);
  const dur = Math.max(1, parseInt(duration, 10) || 20);
  const div = Math.max(0, Number(dividend) || 0);

  // Base installment before auction discount
  const baseInstallment = dur > 0 ? Math.round(totalChitValue / dur) : 0;

  // Month 2 / bidding month installment after dividend deduction
  const monthlyAmount = Math.max(0, baseInstallment - div);

  // Initial auction discount and payout
  const totalAuctionDiscount = Math.round(div * dur);
  const month2Payout = Math.max(0, totalChitValue - totalAuctionDiscount);

  // Generate schedule to calculate exact total payable over full duration
  const schedule = generateChitSchedule({
    chitValue: baseValue,
    multiple: mult,
    duration: dur,
    dividend: div
  });

  const totalPayable = schedule.reduce((sum, item) => sum + (Number(item.monthlyAmount) || 0), 0);
  const totalDividendBenefit = Math.max(0, totalChitValue - totalPayable);

  return {
    chitValue: baseValue,
    multiple: mult,
    totalChitValue,
    duration: dur,
    dividend: div,
    baseInstallment,
    calculatedAmount: monthlyAmount,
    monthlyAmount,
    totalPayable,
    totalDividendBenefit,
    month2Payout,
    schedule
  };
}

/**
 * Generates the complete N-month schedule for any chit value, multiple, duration, and dividend
 */
export function generateChitSchedule({
  chitId = 'CHIT-NEW',
  chitValue = 100000,
  multiple = 1,
  duration = 20,
  dividend = 0,
  startDate = null,
  paymentDay = 20,
  existingSchedule = []
}) {
  const baseValue = Math.max(0, Number(chitValue) || 0);
  const mult = Math.max(0.1, Number(multiple) || 1);
  const totalChitValue = Math.round(baseValue * mult);
  const dur = Math.max(1, parseInt(duration, 10) || 20);
  const div = Math.max(0, Number(dividend) || 0);
  const baseInstallment = dur > 0 ? Math.round(totalChitValue / dur) : 0;

  // Parse start date for monthly date sequence
  let startYear = new Date().getFullYear();
  let startMonthIdx = new Date().getMonth();
  if (startDate) {
    const parts = String(startDate).split('-');
    if (parts.length >= 2) {
      startYear = parseInt(parts[0], 10) || startYear;
      startMonthIdx = (parseInt(parts[1], 10) || 1) - 1;
    }
  }

  const existingMap = {};
  if (Array.isArray(existingSchedule)) {
    existingSchedule.forEach(item => {
      const m = Number(item.month || item.monthNumber);
      if (m) existingMap[m] = item;
    });
  }

  const schedule = [];

  for (let m = 1; m <= dur; m++) {
    const existing = existingMap[m] || {};

    // Calculate due date for month m
    const d = new Date(startYear, startMonthIdx + (m - 1), paymentDay || 20);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dueDate = `${yyyy}-${mm}-${dd}`;

    let monthDiv = 0;
    let monthlyAmount = baseInstallment;
    let payoutAmount = totalChitValue;

    if (m === 1) {
      // Month 1: Chit NIL / Organizer, full installment, full payout, zero dividend
      monthDiv = 0;
      monthlyAmount = baseInstallment;
      payoutAmount = totalChitValue;
    } else if (dur <= 2) {
      // 2-month chit edge case
      monthDiv = div;
      monthlyAmount = Math.max(0, baseInstallment - monthDiv);
      payoutAmount = Math.max(0, totalChitValue - (monthDiv * dur));
    } else {
      // Month 2 to Month N progressive tapering:
      // At month 2, dividend is max (div)
      // At month N, dividend reaches 0 (full base installment)
      const ratio = (dur - m) / (dur - 2);
      monthDiv = Math.round(div * Math.max(0, ratio));
      monthlyAmount = Math.max(0, baseInstallment - monthDiv);
      payoutAmount = Math.max(0, totalChitValue - (monthDiv * dur));
    }

    schedule.push({
      scheduleId: existing.scheduleId || `SCH-${String(m).padStart(2, '0')}`,
      chitId: chitId,
      month: m,
      monthNumber: m,
      dueDate: existing.dueDate || dueDate,
      chitNumber: m === 1 ? 'NIL' : String(m),
      monthlyAmount: monthlyAmount,
      amount: monthlyAmount,
      dividend: monthDiv,
      payoutAmount: payoutAmount,
      assignedMemberId: existing.assignedMemberId || existing.memberId || '',
      assignedMemberName: existing.assignedMemberName || existing.memberName || (m === 1 ? 'Organizer / NIL' : 'Not Assigned'),
      paymentStatus: existing.paymentStatus || (m === 1 ? 'Paid' : 'Upcoming'),
      payoutStatus: existing.payoutStatus || (m === 1 ? 'Completed' : 'Upcoming'),
      payoutDate: existing.payoutDate || '',
      notes: existing.notes || (m === 1 ? 'Chit NIL' : `Chit ${m}`)
    });
  }

  return schedule;
}

/**
 * Calculates Extra Investment performance metrics
 */
export function calculateExtraInvestment({
  investmentAmount = 0,
  returnedAmount = 0
}) {
  const invested = Math.max(0, Number(investmentAmount) || 0);
  const returned = Math.max(0, Number(returnedAmount) || 0);
  const profit = Math.round(returned - invested);
  const profitPercent = invested > 0 ? Number(((profit / invested) * 100).toFixed(2)) : 0;

  return {
    investmentAmount: invested,
    returnedAmount: returned,
    profit,
    profitPercent,
    isProfitable: profit >= 0
  };
}
