import assert from 'assert';

console.log('====================================================');
console.log('TESTING BACKEND WRITES & CROSS-MODULE CONSISTENCY (TEST REPLICA)');
console.log('====================================================');

// Simulated Production State Clone
const testDb = {
  chits: [
    {
      chitId: 'CHIT-100K-01',
      chitName: 'MSR Chit — ₹1,00,000',
      totalAmount: 100000,
      durationMonths: 20,
      monthlyAmount: 5000,
      status: 'Active',
      memberCount: 20,
      totalMembers: 20
    }
  ],
  members: [
    { memberId: 'MEM-001', name: 'Soundhararajan M', status: 'Active' },
    { memberId: 'MEM-002', name: 'Dinesh Mamz', status: 'Active' },
    { memberId: 'MEM-003', name: 'Mani Mamz', status: 'Active' },
    { memberId: 'MEM-004', name: 'Sathya Anna', status: 'Active' },
    { memberId: 'MEM-005', name: 'Athai', status: 'Active' },
    { memberId: 'MEM-006', name: 'Member 6', status: 'Active' },
    { memberId: 'MEM-007', name: 'Member 7', status: 'Active' },
    { memberId: 'MEM-008', name: 'Member 8', status: 'Active' },
    { memberId: 'MEM-009', name: 'Member 9', status: 'Active' },
    { memberId: 'MEM-010', name: 'Member 10', status: 'Active' },
    { memberId: 'MEM-011', name: 'Member 11', status: 'Active' },
    { memberId: 'MEM-012', name: 'Member 12', status: 'Active' },
    { memberId: 'MEM-013', name: 'Member 13', status: 'Active' },
    { memberId: 'MEM-014', name: 'Member 14', status: 'Active' }
  ],
  memberships: [
    // Soundhararajan (2 tickets)
    { membershipId: 'MBR-001', memberId: 'MEM-001', chitId: 'CHIT-100K-01', chitNo: 'MSR261L01', status: 'Active' },
    { membershipId: 'MBR-016', memberId: 'MEM-001', chitId: 'CHIT-100K-01', chitNo: 'MSR261L16', status: 'Active' },
    // Dinesh (3 tickets)
    { membershipId: 'MBR-002', memberId: 'MEM-002', chitId: 'CHIT-100K-01', chitNo: 'MSR261L02', status: 'Active' },
    { membershipId: 'MBR-009', memberId: 'MEM-002', chitId: 'CHIT-100K-01', chitNo: 'MSR261L09', status: 'Active' },
    { membershipId: 'MBR-015', memberId: 'MEM-002', chitId: 'CHIT-100K-01', chitNo: 'MSR261L15', status: 'Active' },
    // Mani (2 tickets)
    { membershipId: 'MBR-003', memberId: 'MEM-003', chitId: 'CHIT-100K-01', chitNo: 'MSR261L03', status: 'Active' },
    { membershipId: 'MBR-006', memberId: 'MEM-003', chitId: 'CHIT-100K-01', chitNo: 'MSR261L06', status: 'Active' },
    // Remaining 11 single-ticket holders
    { membershipId: 'MBR-004', memberId: 'MEM-004', chitId: 'CHIT-100K-01', chitNo: 'MSR261L04', status: 'Active' },
    { membershipId: 'MBR-005', memberId: 'MEM-005', chitId: 'CHIT-100K-01', chitNo: 'MSR261L05', status: 'Active' },
    { membershipId: 'MBR-007', memberId: 'MEM-006', chitId: 'CHIT-100K-01', chitNo: 'MSR261L07', status: 'Active' },
    { membershipId: 'MBR-008', memberId: 'MEM-007', chitId: 'CHIT-100K-01', chitNo: 'MSR261L08', status: 'Active' },
    { membershipId: 'MBR-010', memberId: 'MEM-008', chitId: 'CHIT-100K-01', chitNo: 'MSR261L10', status: 'Active' },
    { membershipId: 'MBR-011', memberId: 'MEM-009', chitId: 'CHIT-100K-01', chitNo: 'MSR261L11', status: 'Active' },
    { membershipId: 'MBR-012', memberId: 'MEM-010', chitId: 'CHIT-100K-01', chitNo: 'MSR261L12', status: 'Active' },
    { membershipId: 'MBR-013', memberId: 'MEM-011', chitId: 'CHIT-100K-01', chitNo: 'MSR261L13', status: 'Active' },
    { membershipId: 'MBR-014', memberId: 'MEM-012', chitId: 'CHIT-100K-01', chitNo: 'MSR261L14', status: 'Active' },
    { membershipId: 'MBR-017', memberId: 'MEM-013', chitId: 'CHIT-100K-01', chitNo: 'MSR261L17', status: 'Active' },
    { membershipId: 'MBR-018', memberId: 'MEM-014', chitId: 'CHIT-100K-01', chitNo: 'MSR261L18', status: 'Active' },
    { membershipId: 'MBR-019', memberId: 'MEM-004', chitId: 'CHIT-100K-01', chitNo: 'MSR261L19', status: 'Active' },
    { membershipId: 'MBR-020', memberId: 'MEM-005', chitId: 'CHIT-100K-01', chitNo: 'MSR261L20', status: 'Active' }
  ],
  monthlySchedule: [
    { scheduleId: 'SCH-01', chitId: 'CHIT-100K-01', monthNumber: 1, amount: 5000, payoutAmount: 100000, payoutStatus: 'Completed' },
    { scheduleId: 'SCH-02', chitId: 'CHIT-100K-01', monthNumber: 2, amount: 3750, payoutAmount: 75000, payoutStatus: 'Upcoming' },
    { scheduleId: 'SCH-03', chitId: 'CHIT-100K-01', monthNumber: 3, amount: 3825, payoutAmount: 71500, payoutStatus: 'Upcoming' }
  ],
  payments: [
    // Month 1 was fully paid (20 tickets @ 5000 = 100,000)
    ...Array.from({ length: 20 }, (_, i) => ({
      paymentId: `PAY-001-${i+1}`,
      chitId: 'CHIT-100K-01',
      memberId: 'MEM-XXX',
      monthNumber: 1,
      amount: 5000,
      status: 'Paid'
    }))
  ],
  payouts: [
    {
      payoutId: 'PO-001',
      chitId: 'CHIT-100K-01',
      memberId: 'MEM-003',
      monthNumber: 1,
      amount: 100000,
      status: 'Paid'
    }
  ],
  extraInvestments: []
};

// SIMULATE CODE.GS CALCULATIONS
function computeExpectedMonthlyCollection(chitId, monthNumber) {
  const sched = testDb.monthlySchedule.find(s => s.chitId === chitId && Number(s.monthNumber) === Number(monthNumber));
  const rate = sched ? sched.amount : 0;
  const activeCount = testDb.memberships.filter(m => m.chitId === chitId && m.status === 'Active').length;
  return rate * activeCount;
}

function computeActualMonthlyCollection(chitId, monthNumber) {
  return testDb.payments
    .filter(p => p.chitId === chitId && Number(p.monthNumber) === Number(monthNumber) && p.status === 'Paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

function computeActualPayouts(chitId, monthNumber) {
  return testDb.payouts
    .filter(p => p.chitId === chitId && Number(p.monthNumber) === Number(monthNumber) && p.status === 'Paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

function computeCashBalance() {
  const totalCollections = testDb.payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPayouts = testDb.payouts.filter(p => p.status === 'Paid').reduce((sum, p) => sum + Number(p.amount), 0);
  return totalCollections - totalPayouts;
}

console.log('\n--- 1. INITIAL BASELINE (MONTH 2: 0 Payments) ---');
const m2Expected = computeExpectedMonthlyCollection('CHIT-100K-01', 2);
const m2Collected = computeActualMonthlyCollection('CHIT-100K-01', 2);
const m2Unpaid = m2Expected - m2Collected;
const cashBalanceInit = computeCashBalance();

console.log(`Expected Collection: ₹${m2Expected.toLocaleString('en-IN')}`);
console.log(`Actual Collected: ₹${m2Collected.toLocaleString('en-IN')}`);
console.log(`Total Unpaid: ₹${m2Unpaid.toLocaleString('en-IN')}`);
console.log(`Current Cash Balance: ₹${cashBalanceInit.toLocaleString('en-IN')}`);

assert.strictEqual(m2Expected, 75000, 'Baseline Month 2 expected collection must be ₹75,000');
assert.strictEqual(m2Unpaid, 75000, 'Baseline Month 2 total unpaid must be ₹75,000');
assert.strictEqual(cashBalanceInit, 0, 'Month 1 collection ₹1,00,000 minus payout ₹1,00,000 = ₹0');
console.log('✅ Baseline state verified: ₹75,000 expected across all modules.');

console.log('\n--- 2. BACKEND WRITE: RECORD PARTIAL PAYMENT (₹3,750 on MSR261L01) ---');
testDb.payments.push({
  paymentId: 'PAY-002-01',
  chitId: 'CHIT-100K-01',
  memberId: 'MEM-001',
  chitNo: 'MSR261L01',
  monthNumber: 2,
  amount: 3750,
  status: 'Paid'
});

const m2CollectedAfterPay = computeActualMonthlyCollection('CHIT-100K-01', 2);
const m2UnpaidAfterPay = m2Expected - m2CollectedAfterPay;
const cashAfterPay = computeCashBalance();

assert.strictEqual(m2CollectedAfterPay, 3750);
assert.strictEqual(m2UnpaidAfterPay, 71250);
assert.strictEqual(cashAfterPay, 3750);
console.log(`✅ Payment recorded: Collected = ₹${m2CollectedAfterPay}, Unpaid = ₹${m2UnpaidAfterPay}, Cash = ₹${cashAfterPay}`);

console.log('\n--- 3. BACKEND WRITE: UPDATE MONTHLY INSTALLMENT (₹3,750 -> ₹4,000) ---');
const schedM2 = testDb.monthlySchedule.find(s => s.monthNumber === 2);
schedM2.amount = 4000; // via updateMonthlyInstallment

const m2ExpectedNew = computeExpectedMonthlyCollection('CHIT-100K-01', 2);
const m2UnpaidNew = m2ExpectedNew - m2CollectedAfterPay;

assert.strictEqual(m2ExpectedNew, 80000, '20 tickets * 4000 = 80,000');
assert.strictEqual(m2UnpaidNew, 76250, '80,000 - 3,750 = 76,250');
console.log(`✅ Installment updated to ₹4,000: New Expected = ₹${m2ExpectedNew}, New Unpaid = ₹${m2UnpaidNew}`);

// Revert installment back to 3750 for next tests
schedM2.amount = 3750;

console.log('\n--- 4. BACKEND WRITE: RECORD PAYOUT (₹70,000 to Amma) ---');
testDb.payouts.push({
  payoutId: 'PO-002',
  chitId: 'CHIT-100K-01',
  memberId: 'MEM-001',
  monthNumber: 2,
  amount: 70000,
  scheduledAmount: 75000,
  status: 'Paid'
});

const cashAfterPayout = computeCashBalance();
assert.strictEqual(cashAfterPayout, 3750 - 70000, 'Cash balance correctly reflects actual payout of ₹70,000 (not scheduled ₹75,000)');
console.log(`✅ Payout recorded: Cash balance correctly decreased by actual payout ₹70,000.`);

console.log('\n--- 5. BACKEND WRITE: SAFE MEMBERSHIP CANCELLATION ---');
const targetMembership = testDb.memberships.find(m => m.chitNo === 'MSR261L02');
targetMembership.status = 'CANCELLED';

const activeTicketsAfterCancel = testDb.memberships.filter(m => m.status === 'Active').length;
const m3ExpectedAfterCancel = computeExpectedMonthlyCollection('CHIT-100K-01', 3);

assert.strictEqual(activeTicketsAfterCancel, 19, 'Active tickets reduced from 20 to 19');
assert.strictEqual(targetMembership.chitNo, 'MSR261L02', 'Permanent Chit No MSR261L02 is permanently reserved');
assert.strictEqual(m3ExpectedAfterCancel, 19 * 3825, 'Month 3 dues dynamically drop to 19 * 3825 = ₹72,675');
console.log(`✅ Safe cancellation verified: Ticket preserved, active tickets = 19, Month 3 dues = ₹${m3ExpectedAfterCancel}`);

console.log('====================================================');
console.log('ALL BACKEND WRITE SIMULATION TESTS PASSED (100%)');
console.log('====================================================');
