/**
 * MSR CHITS — Cash Flow & Liquidity Calculation Engine
 * 
 * Tracks actual monthly collections vs actual prize payouts, investment inflows/recoveries,
 * operational expenses, and monthly carried-forward cash remaining.
 * 
 * IMPORTANT BUSINESS PRINCIPLES:
 * 1. Cash Remaining represents liquidity / cash balance, NEVER profit.
 * 2. Carry forward the previous month's closing cash as the next month's opening cash.
 * 3. Never count an investment transfer twice: track investment funding and allocation separately.
 * 4. Payouts funded by EXTRA_INVESTMENT are cash outflows to members; do not double-deduct as investment outflow.
 * 5. Simple difference = Actual Collections - Actual Payouts (shown separately).
 */

import { generateChitNumber } from './chitNumber.js';
import { getDefaultPayoutForMonth } from './chitCalculations.js';

/**
 * Calculates month-by-month cash flow and cumulative liquidity balances
 * 
 * @param {Object} params
 * @param {Array} params.payments - All member payment records
 * @param {Array} params.payouts - All payout records
 * @param {Array} params.schedule - Monthly schedule records
 * @param {Array} [params.extraInvestments] - Extra investment records
 * @param {Array} [params.expenses] - Recorded operational expenses
 * @param {Array} [params.otherOutflows] - Other recorded cash outflows
 * @param {Object} [params.settings] - System settings (e.g., initialOpeningCash)
 * @param {Object} [params.chit] - Active chit details
 * @param {number} [params.maxMonths=20] - Maximum months to calculate (default 20)
 * @returns {Object} { months: Array, totals: Object }
 */
export function calculateMonthlyCashFlow({
  payments = [],
  payouts = [],
  schedule = [],
  extraInvestments = [],
  expenses = [],
  otherOutflows = [],
  settings = {},
  chit = null,
  maxMonths = 20
}) {
  const chitId = chit?.chitId || 'CHIT-100K-01';
  const chitValue = Number(chit?.chitValue || chit?.totalAmount || 100000);
  const duration = Number(chit?.durationMonths || chit?.duration || maxMonths || 20);
  const initialOpeningBalance = Number(settings?.initialOpeningCash || settings?.openingCashBalance || 0);

  const monthsData = [];
  let runningCash = initialOpeningBalance;

  // Pre-filter valid payments (exclude cancelled, failed, rejected)
  const validPayments = (payments || []).filter(p => {
    if (p.chitId && String(p.chitId) !== String(chitId)) return false;
    const st = String(p.status || '').toLowerCase();
    if (st === 'failed' || st === 'cancelled' || st === 'deleted' || st === 'rejected') return false;
    return true;
  });

  // Pre-filter payouts for active chit
  const chitPayouts = (payouts || []).filter(po => {
    if (!po.chitId) return true;
    return String(po.chitId) === String(chitId);
  });

  let cumulativeCollection = 0;
  let cumulativeActualPayout = 0;
  let cumulativeInvestmentsReceived = 0;
  let cumulativeInvestmentsRecovered = 0;
  let cumulativeExtraUsed = 0;
  let cumulativeExpenses = 0;
  let cumulativeOtherOutflows = 0;

  for (let m = 1; m <= duration; m++) {
    const monthOpeningCash = runningCash;

    // 1. Locate schedule record for month m
    const schItem = (schedule || []).find(s => {
      const matchChit = !s.chitId || String(s.chitId) === String(chitId);
      const matchMonth = Number(s.monthNumber || s.month) === m;
      return matchChit && matchMonth;
    });

    // 2. Payments for month m
    const mPayments = validPayments.filter(p => Number(p.monthNumber || p.month) === m);
    const sumPayments = mPayments.reduce((acc, p) => acc + (Number(p.paidAmount || p.amount) || 0), 0);

    // Actual Collection resolution:
    // Priority:
    // (A) Admin recorded explicit actualCollection on scheduleItem
    // (B) Sum of recorded member payments if greater than 0
    // (C) 0 if no payments or collection recorded
    let actualCollected = 0;
    if (schItem && schItem.actualCollection !== undefined && schItem.actualCollection !== null && schItem.actualCollection !== '') {
      actualCollected = Number(schItem.actualCollection) || 0;
    } else if (schItem && schItem.collectedAmount !== undefined && schItem.collectedAmount !== null && schItem.collectedAmount !== '') {
      actualCollected = Number(schItem.collectedAmount) || 0;
    } else {
      actualCollected = sumPayments;
    }

    // 3. Payouts for month m
    const mPayouts = chitPayouts.filter(po => Number(po.monthNumber || po.month) === m);
    const hasRecordedPayout = mPayouts.length > 0;

    let actualPayout = 0;
    let scheduledPayout = 0;
    let payoutRecipient = '';
    let payoutRecipientId = '';
    let chitNo = '';
    let fundingSource = 'CHIT_FUND';
    let extraInvestmentId = '';
    let payoutStatus = 'Upcoming';
    let payoutDate = '';
    let payoutId = '';
    let payoutNotes = '';

    if (hasRecordedPayout) {
      // Primary payout record for recipient/chitNo display
      const primaryPayout = mPayouts[0];
      actualPayout = mPayouts.reduce((acc, po) => acc + (Number(po.actualAmount !== undefined ? po.actualAmount : po.amount) || 0), 0);
      scheduledPayout = Number(primaryPayout.scheduledAmount || primaryPayout.scheduledPayoutAmount) || (schItem ? Number(schItem.payoutAmount) : 0) || actualPayout;
      payoutRecipient = primaryPayout.memberName || primaryPayout.beneficiary || (schItem ? (schItem.memberName || schItem.assignedMemberName) : 'Not Assigned');
      payoutRecipientId = primaryPayout.memberId || (schItem ? schItem.memberId : '');
      chitNo = primaryPayout.chitNo || schItem?.chitNo || generateChitNumber({ year: 2026, chitValue, sequenceNumber: m });
      fundingSource = primaryPayout.fundingSource || (String(primaryPayout.notes || '').toUpperCase().includes('EXTRA') ? 'EXTRA_INVESTMENT' : 'CHIT_FUND');
      extraInvestmentId = primaryPayout.extraInvestmentId || '';
      payoutStatus = primaryPayout.status || 'Completed';
      payoutDate = primaryPayout.payoutDate || '';
      payoutId = primaryPayout.payoutId || '';
      payoutNotes = primaryPayout.notes || '';
    } else if (schItem) {
      // Schedule fallback
      scheduledPayout = Number(schItem.payoutAmount) || getDefaultPayoutForMonth(m, chitValue, duration, Number(schItem.dividend || 0));
      payoutRecipient = schItem.memberName || schItem.assignedMemberName || 'Not Assigned';
      payoutRecipientId = schItem.memberId || schItem.assignedMemberId || '';
      chitNo = schItem.chitNo || generateChitNumber({ year: 2026, chitValue, sequenceNumber: m });
      payoutStatus = schItem.payoutStatus || schItem.status || 'Upcoming';
      payoutDate = schItem.payoutDate || '';

      if (payoutStatus === 'Completed' || schItem.status === 'Completed') {
        actualPayout = Number(schItem.actualPayoutAmount || schItem.payoutAmount) || scheduledPayout;
      }
    } else {
      scheduledPayout = getDefaultPayoutForMonth(m, chitValue, duration, 0);
      chitNo = generateChitNumber({ year: 2026, chitValue, sequenceNumber: m });
    }

    // 4. Simple Difference (Collections - Payouts)
    const simpleDifference = actualCollected - actualPayout;

    // 5. Extra Investments Received & Recovered for Month m
    // Filter investments made or recovered in month m
    const mInvestments = (extraInvestments || []).filter(inv => {
      if (inv.month && Number(inv.month) === m) return true;
      if (inv.monthNumber && Number(inv.monthNumber) === m) return true;
      if (inv.investmentDate) {
        const d = new Date(inv.investmentDate);
        if (!isNaN(d.getTime()) && (d.getMonth() + 1) === m) return true;
      }
      return false;
    });

    // Inflow from extra investors
    const investmentReceived = mInvestments.reduce((sum, inv) => sum + (Number(inv.investmentAmount) || 0), 0);
    // Outflow returned to extra investors
    const investmentRecovered = mInvestments.reduce((sum, inv) => sum + (Number(inv.returnedAmount || inv.recoveredAmount) || 0), 0);
    // Track extra investment used for payouts this month
    const extraInvestmentUsed = (fundingSource === 'EXTRA_INVESTMENT' || String(fundingSource).toUpperCase().includes('EXTRA'))
      ? actualPayout
      : mPayouts.filter(po => String(po.fundingSource || '').toUpperCase().includes('EXTRA'))
          .reduce((sum, po) => sum + (Number(po.actualAmount || po.amount) || 0), 0);

    // 6. Operational Expenses for Month m
    const mExpenses = (expenses || []).filter(exp => {
      if (exp.month && Number(exp.month) === m) return true;
      if (exp.monthNumber && Number(exp.monthNumber) === m) return true;
      if (exp.date) {
        const d = new Date(exp.date);
        if (!isNaN(d.getTime()) && (d.getMonth() + 1) === m) return true;
      }
      return false;
    });
    const recordedExpenses = mExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    // 7. Other Outflows for Month m
    const mOtherOutflows = (otherOutflows || []).filter(out => {
      if (out.month && Number(out.month) === m) return true;
      if (out.date) {
        const d = new Date(out.date);
        if (!isNaN(d.getTime()) && (d.getMonth() + 1) === m) return true;
      }
      return false;
    });
    const recordedOtherOutflows = mOtherOutflows.reduce((sum, out) => sum + (Number(out.amount) || 0), 0);

    // 8. Net Cash Movement for Month m
    // Cash Inflows: Actual Collections + Investment Funds Received
    // Cash Outflows: Actual Payouts + Recorded Expenses + Other Recorded Outflows + Extra Investment Recovered
    // NOTE: Investment funds received increases cash.
    // NOTE: If payout is funded by EXTRA_INVESTMENT, it is already an outflow in actualPayout.
    // NOTE: Do not count investment transfer twice.
    const totalInflows = actualCollected + investmentReceived;
    const totalOutflows = actualPayout + recordedExpenses + recordedOtherOutflows + investmentRecovered;
    const netCashMovement = totalInflows - totalOutflows;

    // 9. Closing Cash Remaining
    const closingCash = monthOpeningCash + netCashMovement;
    runningCash = closingCash; // Carry forward to next month

    cumulativeCollection += actualCollected;
    cumulativeActualPayout += actualPayout;
    cumulativeInvestmentsReceived += investmentReceived;
    cumulativeInvestmentsRecovered += investmentRecovered;
    cumulativeExtraUsed += extraInvestmentUsed;
    cumulativeExpenses += recordedExpenses;
    cumulativeOtherOutflows += recordedOtherOutflows;

    const hasData = actualCollected > 0 || actualPayout > 0 || hasRecordedPayout || (schItem && schItem.payoutStatus === 'Completed');

    monthsData.push({
      monthNumber: m,
      monthLabel: `Month ${m}`,
      chitId: chitId,
      chitNo: chitNo,
      openingCash: monthOpeningCash,
      actualCollected: actualCollected,
      paymentsCount: mPayments.length,
      payoutRecipient: payoutRecipient,
      payoutRecipientId: payoutRecipientId,
      payoutId: payoutId,
      actualPayout: actualPayout,
      scheduledPayout: scheduledPayout,
      payoutStatus: payoutStatus,
      payoutDate: payoutDate,
      fundingSource: fundingSource,
      extraInvestmentId: extraInvestmentId,
      payoutNotes: payoutNotes,
      simpleDifference: simpleDifference,
      investmentReceived: investmentReceived,
      investmentRecovered: investmentRecovered,
      extraInvestmentUsed: extraInvestmentUsed,
      recordedExpenses: recordedExpenses,
      otherOutflows: recordedOtherOutflows,
      netCashMovement: netCashMovement,
      closingCash: closingCash,
      hasData: hasData
    });
  }

  // Active months summary
  const activeMonths = monthsData.filter(m => m.hasData);
  const finalActiveMonth = activeMonths.length > 0 ? activeMonths[activeMonths.length - 1] : monthsData[0];
  const finalCashRemaining = finalActiveMonth ? finalActiveMonth.closingCash : initialOpeningBalance;
  const combinedSimpleDifference = cumulativeCollection - cumulativeActualPayout;

  return {
    months: monthsData,
    totals: {
      initialOpeningBalance: initialOpeningBalance,
      totalCollection: cumulativeCollection,
      totalActualPayouts: cumulativeActualPayout,
      simpleDifference: combinedSimpleDifference,
      totalInvestmentsReceived: cumulativeInvestmentsReceived,
      totalInvestmentsRecovered: cumulativeInvestmentsRecovered,
      totalExtraUsed: cumulativeExtraUsed,
      totalExpenses: cumulativeExpenses,
      totalOtherOutflows: cumulativeOtherOutflows,
      finalCashRemaining: finalCashRemaining,
      activeMonthsCount: activeMonths.length
    }
  };
}
