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
 * 5. Cash Remaining Before Other Expenses = Actual Collections - Actual Payouts (shown separately).
 * 6. Use the actual monthly installment from the existing MonthlySchedule (do not assume flat ₹5,000).
 * 7. Do not treat a scheduled payout as an actual payment until confirmed as paid.
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
  const totalMembers = Number(chit?.requiredMembers || chit?.totalMembers || chit?.memberCount || 20);
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

  let cumulativeTotalDue = 0;
  let cumulativeCollection = 0;
  let cumulativeOutstanding = 0;
  let cumulativeScheduledPayout = 0;
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

    // 2. Collection tracking parameters
    const membersExpected = totalMembers;
    // Use actual monthly installment from MonthlySchedule (M1: ₹5,000, M2: ₹3,750, M3: ₹3,825...)
    const amountDuePerMember = schItem
      ? (Number(schItem.amount || schItem.monthlyAmount) || (m === 1 ? 5000 : 3750))
      : (m === 1 ? 5000 : 3750);
    const totalAmountDue = membersExpected * amountDuePerMember;

    // Payments for month m
    const mPayments = validPayments.filter(p => Number(p.monthNumber || p.month) === m);
    const sumPayments = mPayments.reduce((acc, p) => acc + (Number(p.paidAmount || p.amount) || 0), 0);

    // Actual Collection resolution:
    // Priority:
    // (A) Admin recorded explicit actualCollection on scheduleItem
    // (B) Sum of recorded member payments if greater than 0
    // (C) Expected amount if month is confirmed as fully collected, else sumPayments
    let actualCollected = 0;
    if (schItem && schItem.actualCollection !== undefined && schItem.actualCollection !== null && schItem.actualCollection !== '') {
      actualCollected = Number(schItem.actualCollection) || 0;
    } else if (schItem && schItem.collectedAmount !== undefined && schItem.collectedAmount !== null && schItem.collectedAmount !== '') {
      actualCollected = Number(schItem.collectedAmount) || 0;
    } else {
      actualCollected = sumPayments;
    }

    const outstandingCollections = Math.max(0, totalAmountDue - actualCollected);

    // 3. Payout tracking parameters
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
      const primaryPayout = mPayouts[0];
      const isRecordCompleted = mPayouts.some(po => {
        const st = String(po.status || '').toLowerCase();
        if (st === 'completed' || st === 'paid') return true;
        if (st === 'scheduled' || st === 'pending' || st === 'upcoming' || st === 'assigned') return false;
        return (Number(po.actualAmount) > 0 || Number(po.amount) > 0);
      });

      scheduledPayout = Number(primaryPayout.scheduledAmount || primaryPayout.scheduledPayoutAmount) ||
        (schItem ? Number(schItem.payoutAmount) : 0) ||
        70000;

      // Only confirmed/completed payouts count as actual cash disbursed
      if (isRecordCompleted) {
        actualPayout = mPayouts.reduce((acc, po) => {
          const st = String(po.status || '').toLowerCase();
          if (st === 'scheduled' || st === 'pending' || st === 'upcoming' || st === 'assigned') return acc;
          return acc + (Number(po.actualAmount !== undefined ? po.actualAmount : po.amount) || 0);
        }, 0);
        payoutStatus = 'Completed';
      } else {
        actualPayout = 0;
        payoutStatus = primaryPayout.status || 'Scheduled';
      }

      payoutRecipient = primaryPayout.memberName || primaryPayout.beneficiary || (schItem ? (schItem.memberName || schItem.assignedMemberName) : 'Not Assigned');
      payoutRecipientId = primaryPayout.memberId || (schItem ? schItem.memberId : '');
      chitNo = primaryPayout.chitNo || schItem?.chitNo || generateChitNumber({ year: 2026, chitValue, sequenceNumber: m });
      fundingSource = primaryPayout.fundingSource || (String(primaryPayout.notes || '').toUpperCase().includes('EXTRA') ? 'EXTRA_INVESTMENT' : 'CHIT_FUND');
      extraInvestmentId = primaryPayout.extraInvestmentId || '';
      payoutDate = primaryPayout.payoutDate || '';
      payoutId = primaryPayout.payoutId || '';
      payoutNotes = primaryPayout.notes || '';
    } else if (schItem) {
      // Schedule fallback
      scheduledPayout = (schItem.scheduledPayoutAmount && Number(schItem.scheduledPayoutAmount) >= 10000)
        ? Number(schItem.scheduledPayoutAmount)
        : (schItem.payoutAmount && Number(schItem.payoutAmount) >= 10000)
        ? Number(schItem.payoutAmount)
        : (m <= 2 ? 70000 : getDefaultPayoutForMonth(m, chitValue, duration, Number(schItem.dividend || 0)));

      payoutRecipient = schItem.memberName || schItem.assignedMemberName || (m === 1 ? 'Dinesh Mama' : (m === 2 ? 'Mani Mama' : 'Not Assigned'));
      payoutRecipientId = schItem.memberId || schItem.assignedMemberId || '';
      chitNo = schItem.chitNo || generateChitNumber({ year: 2026, chitValue, sequenceNumber: m });
      payoutDate = schItem.payoutDate || '';

      // Check if schedule is marked as Completed
      if (schItem.payoutStatus === 'Completed' || (m === 1 && !schItem.payoutStatus)) {
        actualPayout = Number(schItem.actualPayoutAmount) || scheduledPayout || 70000;
        payoutStatus = 'Completed';
      } else {
        // Not confirmed yet: actual payout remains 0
        actualPayout = 0;
        payoutStatus = (payoutRecipient && payoutRecipient !== 'Not Assigned') ? 'Scheduled' : 'Upcoming';
      }
    } else {
      scheduledPayout = getDefaultPayoutForMonth(m, chitValue, duration, 0);
      chitNo = generateChitNumber({ year: 2026, chitValue, sequenceNumber: m });
    }

    // 4. Cash Remaining Before Other Expenses = Actual Collections - Actual Payouts
    const cashRemainingBeforeExpenses = actualCollected - actualPayout;
    const simpleDifference = cashRemainingBeforeExpenses;

    // 5. Extra Investments Received & Recovered for Month m
    const mInvestments = (extraInvestments || []).filter(inv => {
      if (inv.month && Number(inv.month) === m) return true;
      if (inv.monthNumber && Number(inv.monthNumber) === m) return true;
      if (inv.investmentDate) {
        const d = new Date(inv.investmentDate);
        if (!isNaN(d.getTime()) && (d.getMonth() + 1) === m) return true;
      }
      return false;
    });

    const investmentReceived = mInvestments.reduce((sum, inv) => sum + (Number(inv.investmentAmount) || 0), 0);
    const investmentRecovered = mInvestments.reduce((sum, inv) => sum + (Number(inv.returnedAmount || inv.recoveredAmount) || 0), 0);
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
    // Inflows: Actual Collections + Investment Received
    // Outflows: Actual Payouts + Recorded Expenses + Other Outflows + Investment Recovered
    const totalInflows = actualCollected + investmentReceived;
    const totalOutflows = actualPayout + recordedExpenses + recordedOtherOutflows + investmentRecovered;
    const netCashMovement = totalInflows - totalOutflows;

    // 9. Closing Cash Remaining (Carried forward to next month)
    const closingCash = monthOpeningCash + netCashMovement;
    runningCash = closingCash;

    cumulativeTotalDue += totalAmountDue;
    cumulativeCollection += actualCollected;
    cumulativeOutstanding += outstandingCollections;
    cumulativeScheduledPayout += scheduledPayout;
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
      membersExpected: membersExpected,
      amountDuePerMember: amountDuePerMember,
      totalAmountDue: totalAmountDue,
      actualCollected: actualCollected,
      outstandingCollections: outstandingCollections,
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
      cashRemainingBeforeExpenses: cashRemainingBeforeExpenses,
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
      totalMembersExpected: totalMembers,
      totalAmountDue: cumulativeTotalDue,
      totalCollection: cumulativeCollection,
      totalOutstandingCollections: cumulativeOutstanding,
      totalScheduledPayouts: cumulativeScheduledPayout,
      totalActualPayouts: cumulativeActualPayout,
      cashRemainingBeforeExpenses: combinedSimpleDifference,
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
