/**
 * MSR CHITS — Final Default Calculation Engine
 * 
 * Reference Business Calculation:
 * 1. Chit Value: ₹1,00,000 (configurable)
 * 2. Duration: 20 Months (configurable)
 * 3. Members: 20 (configurable)
 * 4. Commission: 5% of Chit Value = ₹5,000 (configurable)
 * 
 * CORE FORMULA for normal payout months (Month 2 to N):
 * Monthly Chit Per Member = (Payout Amount + Commission Amount) / Number of Members
 * 
 * Dependency Rules:
 * - If Payout changes: Monthly Chit = (Payout + Commission) / Members
 * - If Commission changes: Commission = Chit Value × Commission%
 * - If Members changes: Monthly Chit = (Payout + Commission) / Members
 * - If Chit Value changes: Commission scales and dependent schedule recalculates
 */

/**
 * Calculates commission amount from chit value and percentage
 */
export function calculateCommission(chitValue = 100000, commissionPercent = 5) {
  const val = Math.max(0, Number(chitValue) || 0);
  const pct = Number(commissionPercent) || 5;
  return Math.round(val * (pct / 100));
}

/**
 * Calculates Monthly Chit per member from Payout, Commission, and Member count
 */
export function calculateMonthlyChitFromPayout({
  payoutAmount = 70000,
  commissionAmount = 5000,
  totalMembers = 20
}) {
  const payout = Math.max(0, Number(payoutAmount) || 0);
  const comm = Math.max(0, Number(commissionAmount) || 0);
  const members = Math.max(1, Number(totalMembers) || 20);
  return Math.round((payout + comm) / members);
}

/**
 * Calculates Payout amount from Monthly Chit, Commission, and Member count
 */
export function calculatePayoutFromMonthlyChit({
  monthlyAmount = 3750,
  commissionAmount = 5000,
  totalMembers = 20
}) {
  const monthly = Math.max(0, Number(monthlyAmount) || 0);
  const comm = Math.max(0, Number(commissionAmount) || 0);
  const members = Math.max(1, Number(totalMembers) || 20);
  return Math.max(0, Math.round(monthly * members - comm));
}

/**
 * Calculates core financial parameters for a chit plan
 */
export function calculateChitParameters({
  chitValue = 100000,
  multiple = 1,
  duration = 20,
  totalMembers = null,
  commissionPercent = 5,
  commissionAmount = null,
  dividend = 0,
  startMonth = 1
}) {
  const baseValue = Math.max(0, Number(chitValue) || 0);
  const mult = Math.max(0.1, Number(multiple) || 1);
  const totalChitValue = Math.round(baseValue * mult);
  const dur = Math.max(1, parseInt(duration, 10) || 20);
  const members = Math.max(1, parseInt(totalMembers, 10) || dur);
  const commPct = Number(commissionPercent) !== undefined && !isNaN(Number(commissionPercent)) ? Number(commissionPercent) : 5;
  const commAmt = commissionAmount !== null && commissionAmount !== undefined && !isNaN(Number(commissionAmount))
    ? Number(commissionAmount)
    : calculateCommission(totalChitValue, commPct);
  const div = Math.max(0, Number(dividend) || 0);

  // Base installment before auction discount
  const baseInstallment = members > 0 ? Math.floor(totalChitValue / members) : 0;

  let monthlyAmount = baseInstallment;
  let month2DefaultPayout = totalChitValue;

  if (dur === 20 && div === 0) {
    // Exact MSR 20-Month Plan Reference:
    month2DefaultPayout = Math.round(70000 * (totalChitValue / 100000));
    monthlyAmount = calculateMonthlyChitFromPayout({
      payoutAmount: month2DefaultPayout,
      commissionAmount: commAmt,
      totalMembers: members
    });
  } else if (div > 0) {
    monthlyAmount = Math.max(0, baseInstallment - div);
    month2DefaultPayout = Math.max(0, totalChitValue - (div * dur));
  } else {
    monthlyAmount = baseInstallment;
    month2DefaultPayout = totalChitValue;
  }

  // Generate complete schedule
  const schedule = generateChitSchedule({
    chitValue: baseValue,
    multiple: mult,
    duration: dur,
    totalMembers: members,
    commissionPercent: commPct,
    commissionAmount: commAmt,
    dividend: div
  });

  const totalPayable = schedule.reduce((sum, item) => sum + (Number(item.monthlyAmount) || 0), 0);
  const totalDividendBenefit = Math.max(0, totalChitValue - totalPayable);
  const month2Item = schedule.find(s => s.month === 2) || schedule[1] || {};
  const month2PayoutVal = month2Item.payoutAmount !== undefined ? month2Item.payoutAmount : month2DefaultPayout;
  const month2MonthlyChitVal = month2Item.monthlyAmount !== undefined ? month2Item.monthlyAmount : monthlyAmount;
  const month2DividendVal = month2Item.dividend !== undefined ? month2Item.dividend : Math.max(0, baseInstallment - month2MonthlyChitVal);

  return {
    chitValue: baseValue,
    multiple: mult,
    totalChitValue,
    duration: dur,
    totalMembers: members,
    commissionPercent: commPct,
    commissionAmount: commAmt,
    dividend: div,
    baseInstallment,
    normalMonthlyChit: baseInstallment,
    calculatedAmount: monthlyAmount,
    monthlyAmount,
    totalPayable,
    totalDividendBenefit,
    month2Payout: month2PayoutVal,
    month2MonthlyChit: month2MonthlyChitVal,
    month2Dividend: month2DividendVal,
    schedule
  };
}

/**
 * Generates the complete N-month schedule for any chit value, multiple, duration, commission, and members
 */
export function generateChitSchedule({
  chitId = 'CHIT-NEW',
  chitValue = 100000,
  multiple = 1,
  duration = 20,
  totalMembers = null,
  commissionPercent = 5,
  commissionAmount = null,
  dividend = 0,
  startDate = null,
  paymentDay = 20,
  existingSchedule = []
}) {
  const baseValue = Math.max(0, Number(chitValue) || 0);
  const mult = Math.max(0.1, Number(multiple) || 1);
  const totalChitValue = Math.round(baseValue * mult);
  const dur = Math.max(1, parseInt(duration, 10) || 20);
  const members = Math.max(1, parseInt(totalMembers, 10) || dur);
  const commPct = Number(commissionPercent) !== undefined && !isNaN(Number(commissionPercent)) ? Number(commissionPercent) : 5;
  const commAmt = commissionAmount !== null && commissionAmount !== undefined && !isNaN(Number(commissionAmount))
    ? Number(commissionAmount)
    : calculateCommission(totalChitValue, commPct);
  const div = Math.max(0, Number(dividend) || 0);
  const baseInstallment = members > 0 ? Math.floor(totalChitValue / members) : 0;

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
  const scale = totalChitValue / 100000;

  for (let m = 1; m <= dur; m++) {
    const existing = existingMap[m] || {};

    // Calculate due date for month m
    const d = new Date(startYear, startMonthIdx + (m - 1), paymentDay || 20);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dueDate = `${yyyy}-${mm}-${dd}`;

    let defaultPayout = totalChitValue;
    let defaultMonthly = baseInstallment;
    let monthDiv = 0;

    if (m === 1) {
      // Month 1: Chit NIL / Organizer, full installment, full payout, zero dividend
      defaultPayout = totalChitValue;
      defaultMonthly = baseInstallment;
      monthDiv = 0;
    } else if (dur === 20 && div === 0) {
      // EXACT MSR CHITS 20-MONTH REFERENCE BUSINESS MODEL (Flagship ₹1L / 20M Reference)
      if (m >= 2 && m <= 16) {
        // Months 2 to 16: Payout = ₹70,000 + (m - 2)*₹1,500 (scaled by chit value)
        const baseP = 70000 + (m - 2) * 1500;
        defaultPayout = Math.round(baseP * scale);
      } else {
        // Months 17 to 20: Payout = ₹92,000 + (m - 17)*₹1,000 (scaled by chit value)
        const baseP = 92000 + (m - 17) * 1000;
        defaultPayout = Math.round(baseP * scale);
      }
      // Core formula: Monthly Chit = (Payout + Commission) / Members
      defaultMonthly = calculateMonthlyChitFromPayout({
        payoutAmount: defaultPayout,
        commissionAmount: commAmt,
        totalMembers: members
      });
      monthDiv = Math.max(0, baseInstallment - defaultMonthly);
    } else if (div > 0) {
      // User specified dividend plan
      const ratio = dur > 2 ? (dur - m) / (dur - 2) : 1;
      monthDiv = Math.round(div * Math.max(0, ratio));
      defaultMonthly = Math.max(0, baseInstallment - monthDiv);
      defaultPayout = Math.max(0, totalChitValue - (monthDiv * dur));
    } else {
      // Standard basic plan without dividend
      defaultPayout = totalChitValue;
      defaultMonthly = baseInstallment;
      monthDiv = 0;
    }

    // Use existing overrides if explicitly modified by user, otherwise use calculated defaults
    let finalPayoutAmount = defaultPayout;
    if (existing.payoutAmount !== undefined && existing.payoutAmount !== null && Number(existing.payoutAmount) > 0) {
      finalPayoutAmount = Number(existing.payoutAmount);
    }

    let finalMonthlyAmount = defaultMonthly;
    if (existing.monthlyAmount !== undefined && existing.monthlyAmount !== null && Number(existing.monthlyAmount) > 0) {
      finalMonthlyAmount = Number(existing.monthlyAmount);
    } else if (existing.amount !== undefined && existing.amount !== null && Number(existing.amount) > 0) {
      finalMonthlyAmount = Number(existing.amount);
    } else if (existing.payoutAmount !== undefined && Number(existing.payoutAmount) > 0 && m > 1) {
      // If payout was edited, automatically recalculate monthly amount using core formula
      finalMonthlyAmount = calculateMonthlyChitFromPayout({
        payoutAmount: finalPayoutAmount,
        commissionAmount: commAmt,
        totalMembers: members
      });
    }

    let finalDividend = monthDiv;
    if (existing.dividend !== undefined && existing.dividend !== null) {
      finalDividend = Number(existing.dividend);
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
      commission: commAmt,
      commissionAmount: commAmt,
      commissionPercent: commPct,
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
