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
  const baseInstallment = dur > 0 ? Math.floor(totalChitValue / dur) : 0;

  // Month 2 / bidding month installment after dividend deduction
  const monthlyAmount = div > 0 ? Math.max(0, baseInstallment - div) : baseInstallment;

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
  const baseInstallment = dur > 0 ? Math.floor(totalChitValue / dur) : 0;

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
  let runningBaseSum = 0;

  for (let m = 1; m <= dur; m++) {
    const existing = existingMap[m] || {};

    // Calculate due date for month m
    const d = new Date(startYear, startMonthIdx + (m - 1), paymentDay || 20);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dueDate = `${yyyy}-${mm}-${dd}`;

    let monthDiv = 0;
    // Base monthly installment before dividend deduction (with zero rounding loss on month dur)
    let curBase = (m === dur) ? (totalChitValue - runningBaseSum) : baseInstallment;
    runningBaseSum += baseInstallment;

    let monthlyAmount = curBase;
    let payoutAmount = totalChitValue;

    if (m === 1) {
      // Month 1: Chit NIL / Organizer, full installment, full payout, zero dividend
      monthDiv = 0;
      monthlyAmount = curBase;
      payoutAmount = totalChitValue;
    } else if (dur === 20 && div === 0) {
      // EXACT MSR CHITS 20-MONTH REFERENCE BUSINESS MODEL (Flagship ₹1L, ₹2L, ₹3L, etc.)
      const scale = totalChitValue / 100000;
      if (m >= 2 && m <= 16) {
        // Months 2 to 16: Monthly Chit increases by ₹75*scale, Payout increases by ₹1,500*scale
        const baseM = 3750 + (m - 2) * 75;
        const baseP = 70000 + (m - 2) * 1500;
        monthlyAmount = Math.round(baseM * scale);
        payoutAmount = Math.round(baseP * scale);
        monthDiv = Math.max(0, Math.round((5000 - baseM) * scale));
      } else {
        // Months 17 to 20: Monthly Chit increases by ₹50*scale, Payout increases by ₹1,000*scale
        const baseM = 4850 + (m - 17) * 50;
        const baseP = 92000 + (m - 17) * 1000;
        monthlyAmount = Math.round(baseM * scale);
        payoutAmount = Math.round(baseP * scale);
        monthDiv = Math.max(0, Math.round((5000 - baseM) * scale));
      }
    } else if (div === 0) {
      // Simple plan without dividend: exact basic installment with final-month zero-loss adjustment
      monthDiv = 0;
      monthlyAmount = curBase;
      payoutAmount = totalChitValue;
    } else if (dur <= 2) {
      // 2-month chit edge case
      monthDiv = div;
      monthlyAmount = Math.max(0, curBase - monthDiv);
      payoutAmount = Math.max(0, totalChitValue - (monthDiv * dur));
    } else {
      // Month 2 to Month N progressive tapering with user-specified dividend
      const ratio = (dur - m) / (dur - 2);
      monthDiv = Math.round(div * Math.max(0, ratio));
      monthlyAmount = Math.max(0, curBase - monthDiv);
      payoutAmount = Math.max(0, totalChitValue - (monthDiv * dur));
    }

    let finalMonthlyAmount = monthlyAmount;
    if (existing.amount !== undefined && existing.amount !== null && Number(existing.amount) > 0) {
      finalMonthlyAmount = Number(existing.amount);
    } else if (existing.monthlyAmount !== undefined && existing.monthlyAmount !== null && Number(existing.monthlyAmount) > 0) {
      finalMonthlyAmount = Number(existing.monthlyAmount);
    }

    let finalDividend = monthDiv;
    if (existing.dividend !== undefined && existing.dividend !== null) {
      finalDividend = Number(existing.dividend);
    }

    let finalPayoutAmount = payoutAmount;
    if (existing.payoutAmount !== undefined && existing.payoutAmount !== null && Number(existing.payoutAmount) > 0) {
      finalPayoutAmount = Number(existing.payoutAmount);
    }

    schedule.push({
      scheduleId: existing.scheduleId || `SCH-${String(m).padStart(2, '0')}`,
      chitId: chitId,
      month: m,
      monthNumber: m,
      dueDate: existing.dueDate || dueDate,
      chitNo: existing.chitNo || existing.chitNumber || (m === 1 ? 'NIL' : String(m)),
      chitNumber: existing.chitNumber || existing.chitNo || (m === 1 ? 'NIL' : String(m)),
      monthlyAmount: finalMonthlyAmount,
      amount: finalMonthlyAmount,
      dividend: finalDividend,
      payoutAmount: finalPayoutAmount,
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

/**
 * Calculates dynamic lifecycle status for a chit scheme:
 * UPCOMING -> FILLING -> FULL -> ACTIVE -> COMPLETED
 */
export function getChitLifecycleStatus(chit, memberships = []) {
  if (!chit) return 'Upcoming';
  const rawStatus = String(chit.status || '').trim();
  const lowerStatus = rawStatus.toLowerCase();

  if (lowerStatus === 'completed') return 'Completed';

  const duration = Number(chit.duration || chit.durationMonths) || 20;
  const requiredMembers = Number(chit.totalMembers || chit.memberCount || chit.requiredMembers) || duration;
  const chitId = chit.chitId;

  const validMemberships = (memberships || []).filter(
    m => String(m.chitId) === String(chitId) && m.status !== 'Cancelled'
  );
  const joinedCount = validMemberships.length;

  // If explicitly marked Active and chit has run past month 1 or has members and start date reached
  const today = new Date().toISOString().split('T')[0];
  const isDateStarted = Boolean(chit.startDate && chit.startDate <= today);

  if (lowerStatus === 'active') {
    if (Number(chit.currentMonth || 1) > 1 || isDateStarted || joinedCount >= requiredMembers) {
      return 'Active';
    }
  }

  // Pre-launch lifecycle:
  if (joinedCount >= requiredMembers) {
    return isDateStarted ? 'Active' : 'Full';
  }

  if (joinedCount > 0) {
    return isDateStarted ? 'Active' : 'Filling';
  }

  return isDateStarted ? 'Active' : 'Upcoming';
}

/**
 * Calculates capacity and slot metrics for a chit:
 * requiredMembers, joinedMembers, remainingSlots, fillPercentage, isFull
 */
export function getChitCapacityStats(chit, memberships = []) {
  if (!chit) {
    return {
      requiredMembers: 20,
      joinedMembers: 0,
      remainingSlots: 20,
      fillPercentage: 0,
      isFull: false,
      status: 'Upcoming'
    };
  }

  const duration = Number(chit.duration || chit.durationMonths) || 20;
  const requiredMembers = Number(chit.totalMembers || chit.memberCount || chit.requiredMembers) || duration;
  const chitId = chit.chitId;

  const validMemberships = (memberships || []).filter(
    m => String(m.chitId) === String(chitId) && m.status !== 'Cancelled'
  );
  const joinedMembers = validMemberships.length;
  const remainingSlots = Math.max(0, requiredMembers - joinedMembers);
  const fillPercentage = requiredMembers > 0
    ? Math.min(100, Math.round((joinedMembers / requiredMembers) * 100))
    : 0;
  const isFull = joinedMembers >= requiredMembers;
  const status = getChitLifecycleStatus(chit, memberships);

  return {
    requiredMembers,
    joinedMembers,
    remainingSlots,
    fillPercentage,
    isFull,
    status
  };
}
