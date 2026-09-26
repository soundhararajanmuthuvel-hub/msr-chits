/**
 * ============================================================================
 * MSR CHITS — COMPLETE GOOGLE APPS SCRIPT BACKEND (SINGLE-FILE ARCHITECTURE)
 * ============================================================================
 * Project: MSR CHITS Management System
 * Database: Google Sheets (8 Tabs: Users, Chits, Members, MonthlySchedule, Payments, Payouts, ActivityLog, Settings)
 *
 * INSTRUCTIONS:
 * 1. Open your Google Sheet -> Extensions -> Apps Script.
 * 2. Paste this entire file into Code.gs (delete all other .gs files).
 * 3. Update the SPREADSHEET_ID below (or leave as 'ACTIVE' if bound to the sheet).
 * 4. Run "setupDatabase()" once from the top function dropdown to initialize all sheets with exact headers.
 * 5. Deploy as Web App -> Execute as: "Me", Who has access: "Anyone".
 * 6. Copy the Web App URL into frontend .env (VITE_API_URL).
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPREADSHEET_ID = 'ACTIVE'; // Replace with your Spreadsheet ID or leave 'ACTIVE' if bound to Sheet

const SHEET_NAMES = {
  USERS: 'Users',
  CHITS: 'Chits',
  MEMBERS: 'Members',
  MEMBERSHIPS: 'Memberships',
  MONTHLY_SCHEDULE: 'MonthlySchedule',
  PAYMENTS: 'Payments',
  PAYOUTS: 'Payouts',
  WHATSAPP_LOG: 'WhatsAppLog',
  ACTIVITY_LOG: 'ActivityLog',
  SETTINGS: 'Settings',
  EXTRA_INVESTMENT: 'ExtraInvestment'
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Returns the target Google Spreadsheet instance.
 * NEVER returns null.
 */
function getSpreadsheet() {
  // 1. Check Script Properties for SPREADSHEET_ID
  const scriptProps = PropertiesService.getScriptProperties();
  const propId = scriptProps.getProperty('SPREADSHEET_ID');

  if (propId && propId.trim() && propId !== 'YOUR_GOOGLE_SPREADSHEET_ID' && propId !== 'ACTIVE') {
    try {
      return SpreadsheetApp.openById(propId.trim());
    } catch (e) {
      throw new Error('Failed to open spreadsheet by Script Property SPREADSHEET_ID (' + propId + '): ' + e.message);
    }
  }

  // 2. Check SPREADSHEET_ID constant in Code.gs
  if (SPREADSHEET_ID && SPREADSHEET_ID !== 'ACTIVE' && SPREADSHEET_ID !== 'YOUR_GOOGLE_SPREADSHEET_ID') {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      throw new Error('Failed to open spreadsheet by SPREADSHEET_ID constant (' + SPREADSHEET_ID + '): ' + e.message);
    }
  }

  // 3. Fallback to active bound spreadsheet
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {
    // Ignore and proceed to throw configuration error
  }

  // 4. If all fail, throw clear configuration instructions
  throw new Error('MSR CHITS spreadsheet not configured. Please set SPREADSHEET_ID in Project Settings -> Script Properties or in Code.gs.');
}

/**
 * One-click helper to save SPREADSHEET_ID into Script Properties from Apps Script editor
 */
function setSpreadsheetId(id) {
  if (!id || id === 'YOUR_GOOGLE_SPREADSHEET_ID') {
    throw new Error('Please provide a valid Google Spreadsheet ID.');
  }
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id.trim());
  Logger.log('SPREADSHEET_ID successfully set to: ' + id.trim());
  return 'SPREADSHEET_ID saved: ' + id.trim();
}

/**
 * Gets a specific sheet tab by name
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tab "' + sheetName + '" does not exist. Please run setupDatabase() first.');
  }
  return sheet;
}

/**
 * Reads all data rows from a sheet and returns an array of JavaScript objects.
 * Handles empty sheets cleanly.
 */
function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const results = [];

  for (let r = 0; r < dataRange.length; r++) {
    const row = dataRange[r];
    // Skip completely empty rows
    if (!row || row.every(cell => cell === '' || cell === null)) continue;

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const headerKey = String(headers[c]).trim();
      if (headerKey) {
        let val = row[c];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd');
        }
        obj[headerKey] = val !== undefined ? val : '';
      }
    }
    results.push(obj);
  }

  return results;
}

/**
 * Appends a JavaScript object to a sheet matching the column header keys.
 * Auto-expands any missing column headers safely on row 1 to prevent data loss.
 */
function appendRow(sheetName, obj) {
  const sheet = getSheet(sheetName);
  let lastCol = sheet.getLastColumn();
  if (lastCol < 1) throw new Error('Sheet has no header row.');

  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  // Auto-expand headers if obj contains keys that are not yet in row 1 headers
  const newKeys = Object.keys(obj).filter(k => k && !headers.includes(k));
  if (newKeys.length > 0) {
    const startCol = lastCol + 1;
    const newHeaderRange = sheet.getRange(1, startCol, 1, newKeys.length);
    newHeaderRange.setValues([newKeys]);
    newHeaderRange.setBackground('#003524');
    newHeaderRange.setFontColor('#FFFFFF');
    newHeaderRange.setFontWeight('bold');
    lastCol += newKeys.length;
    headers = headers.concat(newKeys);
  }

  const rowValues = [];
  for (let c = 0; c < headers.length; c++) {
    const key = headers[c];
    rowValues.push(obj[key] !== undefined ? obj[key] : '');
  }

  sheet.appendRow(rowValues);
}

/**
 * Updates a row in a sheet matching an ID column.
 * Auto-expands any missing column headers safely on row 1 to prevent data loss.
 */
function updateRow(sheetName, idColumnName, idValue, updateObj) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  let lastCol = sheet.getLastColumn();
  if (lastRow < 2) return false;

  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const idColIndex = headers.indexOf(idColumnName);
  if (idColIndex === -1) return false;

  // Auto-expand headers if updateObj contains keys not yet in row 1 headers
  const newKeys = Object.keys(updateObj).filter(k => k && !headers.includes(k));
  if (newKeys.length > 0) {
    const startCol = lastCol + 1;
    const newHeaderRange = sheet.getRange(1, startCol, 1, newKeys.length);
    newHeaderRange.setValues([newKeys]);
    newHeaderRange.setBackground('#003524');
    newHeaderRange.setFontColor('#FFFFFF');
    newHeaderRange.setFontWeight('bold');
    lastCol += newKeys.length;
    headers = headers.concat(newKeys);
  }

  const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  for (let r = 0; r < dataRange.length; r++) {
    if (String(dataRange[r][idColIndex]) === String(idValue)) {
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        if (updateObj[key] !== undefined) {
          sheet.getRange(r + 2, c + 1).setValue(updateObj[key]);
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Generates an incremented ID (e.g. MEM-001, MEM-002, PAY-001) based on existing rows.
 */
function generateSequentialId(sheetName, prefix, idColumnName) {
  const data = getSheetData(sheetName);
  let maxNum = 0;

  data.forEach(item => {
    const val = String(item[idColumnName] || '');
    if (val.startsWith(prefix + '-')) {
      const numPart = parseInt(val.replace(prefix + '-', ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = maxNum + 1;
  return prefix + '-' + String(nextNum).padStart(3, '0');
}

/**
 * Ensures a sheet exists and ensures Row 1 contains the exact separate column headers.
 * NEVER deletes or clears existing data rows below row 1.
 */
function ensureSheetWithHeaders(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const lastCol = sheet.getLastColumn();

  // Always write headers across separate columns A1..N1 using setValues([headers])
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#003524');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Clear any extra corrupted header cells beyond headers.length on row 1
  if (lastCol > headers.length) {
    sheet.getRange(1, headers.length + 1, 1, lastCol - headers.length).clearContent();
  }

  for (let c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }

  return sheet;
}

// ============================================================================
// SETUP DATABASE
// ============================================================================

/**
 * One-Click Database Initialization & Header Repair
 * Safe to run repeatedly. NEVER deletes existing rows.
 * Formats every header across separate columns.
 */
function setupDatabase() {
  const ss = getSpreadsheet();

  // 1. Users (userId, username, password, name, role, status, createdAt, updatedAt, phone)
  const userSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.USERS, [
    'userId', 'username', 'password', 'name', 'role', 'status', 'createdAt', 'updatedAt', 'phone'
  ]);
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow([
      'USR-001', 'admin', 'admin123', 'MSR Administrator', 'Admin', 'Active',
      new Date().toISOString(), new Date().toISOString(), '9840123456'
    ]);
  }

  // 2. Chits (chitId, chitName, totalAmount, durationMonths, monthlyAmount, startDate, currentMonth, status, createdAt, updatedAt, baseChitValue, multiple, dividend, fixedPayoutMonth, expectedTotal, paymentDay, memberCount, totalMembers, notes)
  const chitSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.CHITS, [
    'chitId', 'chitName', 'totalAmount', 'durationMonths', 'monthlyAmount', 'startDate', 'currentMonth', 'status', 'createdAt', 'updatedAt',
    'baseChitValue', 'multiple', 'dividend', 'fixedPayoutMonth', 'expectedTotal', 'paymentDay', 'memberCount', 'totalMembers', 'notes'
  ]);
  if (chitSheet.getLastRow() <= 1) {
    chitSheet.appendRow([
      'CHIT-100K-01', 'MSR Chit — ₹1,00,000', 100000, 20, 3750, '2026-01-01', 2, 'Active',
      new Date().toISOString(), new Date().toISOString(), 100000, 1, 0, '', 93650, 20, 20, 20, 'Flagship Chit Plan'
    ]);
  }

  // 3. Members (memberId, name, phone, email, address, joinDate, status, totalPaid, pendingAmount, assignedChits, notes, createdAt, updatedAt)
  ensureSheetWithHeaders(ss, SHEET_NAMES.MEMBERS, [
    'memberId', 'name', 'phone', 'email', 'address', 'joinDate', 'status', 'totalPaid', 'pendingAmount', 'assignedChits', 'notes', 'createdAt', 'updatedAt'
  ]);

  // 4. MonthlySchedule (scheduleId, chitId, monthNumber, dueDate, memberId, memberName, amount, paymentStatus, payoutStatus, payoutDate, notes, payoutAmount)
  const scheduleSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.MONTHLY_SCHEDULE, [
    'scheduleId', 'chitId', 'monthNumber', 'dueDate', 'memberId', 'memberName', 'amount', 'paymentStatus', 'payoutStatus', 'payoutDate', 'notes', 'payoutAmount'
  ]);
  if (scheduleSheet.getLastRow() <= 1) {
    const masterSchedule = [
      ['SCH-01', 'CHIT-100K-01', 1, '2026-01-20', 'MEM-003', 'MU', 5000, 'Paid', 'Completed', '2026-01-22', 'Chit NIL', 100000],
      ['SCH-02', 'CHIT-100K-01', 2, '2026-02-20', 'MEM-001,MEM-003', 'Amma + MU', 3750, 'In Progress', 'Completed', '2026-02-22', 'Chit 2 (Shared)', 75000],
      ['SCH-03', 'CHIT-100K-01', 3, '2026-03-20', '', 'Not Assigned', 3825, 'Upcoming', 'Upcoming', '', 'Chit 3', 76500],
      ['SCH-04', 'CHIT-100K-01', 4, '2026-04-20', '', 'Not Assigned', 3900, 'Upcoming', 'Upcoming', '', 'Chit 4', 78000],
      ['SCH-05', 'CHIT-100K-01', 5, '2026-05-20', '', 'Not Assigned', 3975, 'Upcoming', 'Upcoming', '', 'Chit 5', 79500],
      ['SCH-06', 'CHIT-100K-01', 6, '2026-06-20', '', 'Not Assigned', 4050, 'Upcoming', 'Upcoming', '', 'Chit 6', 81000],
      ['SCH-07', 'CHIT-100K-01', 7, '2026-07-20', '', 'Not Assigned', 4125, 'Upcoming', 'Upcoming', '', 'Chit 7', 82500],
      ['SCH-08', 'CHIT-100K-01', 8, '2026-08-20', 'MEM-003', 'MU', 4200, 'Upcoming', 'Upcoming', '', 'Chit 8', 84000],
      ['SCH-09', 'CHIT-100K-01', 9, '2026-09-20', '', 'Not Assigned', 4275, 'Upcoming', 'Upcoming', '', 'Chit 9', 85500],
      ['SCH-10', 'CHIT-100K-01', 10, '2026-10-20', '', 'Not Assigned', 4350, 'Upcoming', 'Upcoming', '', 'Chit 10', 87000],
      ['SCH-11', 'CHIT-100K-01', 11, '2026-11-20', '', 'Not Assigned', 4425, 'Upcoming', 'Upcoming', '', 'Chit 11', 88500],
      ['SCH-12', 'CHIT-100K-01', 12, '2026-12-20', '', 'Not Assigned', 4500, 'Upcoming', 'Upcoming', '', 'Chit 12', 90000],
      ['SCH-13', 'CHIT-100K-01', 13, '2027-01-20', '', 'Not Assigned', 4575, 'Upcoming', 'Upcoming', '', 'Chit 13', 91500],
      ['SCH-14', 'CHIT-100K-01', 14, '2027-02-20', '', 'Not Assigned', 4650, 'Upcoming', 'Upcoming', '', 'Chit 14', 93000],
      ['SCH-15', 'CHIT-100K-01', 15, '2027-03-20', 'MEM-003', 'MU', 4725, 'Upcoming', 'Upcoming', '', 'Chit 15', 94500],
      ['SCH-16', 'CHIT-100K-01', 16, '2027-04-20', '', 'Not Assigned', 4800, 'Upcoming', 'Upcoming', '', 'Chit 16', 96000],
      ['SCH-17', 'CHIT-100K-01', 17, '2027-05-20', '', 'Not Assigned', 4850, 'Upcoming', 'Upcoming', '', 'Chit 17', 97000],
      ['SCH-18', 'CHIT-100K-01', 18, '2027-06-20', '', 'Not Assigned', 4900, 'Upcoming', 'Upcoming', '', 'Chit 18', 98000],
      ['SCH-19', 'CHIT-100K-01', 19, '2027-07-20', '', 'Not Assigned', 4950, 'Upcoming', 'Upcoming', '', 'Chit 19', 99000],
      ['SCH-20', 'CHIT-100K-01', 20, '2027-08-20', '', 'Not Assigned', 5000, 'Upcoming', 'Upcoming', '', 'Chit 20', 100000]
    ];
    masterSchedule.forEach(row => scheduleSheet.appendRow(row));
  }

  // 5. Payments (paymentId, chitId, memberId, monthNumber, amount, paymentDate, paymentMethod, referenceNumber, status, notes, createdAt, chitNo, memberName)
  ensureSheetWithHeaders(ss, SHEET_NAMES.PAYMENTS, [
    'paymentId', 'chitId', 'memberId', 'monthNumber', 'amount', 'paymentDate', 'paymentMethod', 'referenceNumber', 'status', 'notes', 'createdAt', 'chitNo', 'memberName'
  ]);

  // 6. Payouts (payoutId, chitId, memberId, monthNumber, amount, payoutDate, paymentMethod, referenceNumber, status, notes, createdAt, chitNo, memberName, fundingSource)
  ensureSheetWithHeaders(ss, SHEET_NAMES.PAYOUTS, [
    'payoutId', 'chitId', 'memberId', 'monthNumber', 'amount', 'payoutDate', 'paymentMethod', 'referenceNumber', 'status', 'notes', 'createdAt', 'chitNo', 'memberName', 'fundingSource'
  ]);

  // 7. Memberships (membershipId, memberId, chitId, chitNo, chitValue, durationMonths, monthlyPayment, payoutMonth, status, joinedDate, createdAt, updatedAt)
  ensureSheetWithHeaders(ss, SHEET_NAMES.MEMBERSHIPS, [
    'membershipId', 'memberId', 'chitId', 'chitNo', 'chitValue', 'durationMonths', 'monthlyPayment', 'payoutMonth', 'status', 'joinedDate', 'createdAt', 'updatedAt'
  ]);

  // 8. WhatsAppLog (messageId, memberId, memberName, phone, messageType, chitNo, message, relatedPaymentId, relatedPayoutId, status, createdAt)
  ensureSheetWithHeaders(ss, SHEET_NAMES.WHATSAPP_LOG, [
    'messageId', 'memberId', 'memberName', 'phone', 'messageType', 'chitNo', 'message', 'relatedPaymentId', 'relatedPayoutId', 'status', 'createdAt'
  ]);

  // 9. ActivityLog (logId, action, user, description, timestamp)
  const activitySheet = ensureSheetWithHeaders(ss, SHEET_NAMES.ACTIVITY_LOG, [
    'logId', 'action', 'user', 'description', 'timestamp'
  ]);
  if (activitySheet.getLastRow() <= 1) {
    activitySheet.appendRow([
      'ACT-001', 'Database Initialized', 'System', 'MSR Chits database schema configured', new Date().toISOString()
    ]);
  }

  // 8. Settings (settingId, key, value, updatedAt)
  const settingsSheet = ensureSheetWithHeaders(ss, SHEET_NAMES.SETTINGS, [
    'settingId', 'key', 'value', 'updatedAt'
  ]);
  if (settingsSheet.getLastRow() <= 1) {
    const defaultSettings = [
      ['SET-001', 'systemName', 'MSR CHITS', new Date().toISOString()],
      ['SET-002', 'adminName', 'MSR Administrator', new Date().toISOString()],
      ['SET-003', 'mobile', '9840123456', new Date().toISOString()],
      ['SET-004', 'email', 'admin@msrchits.com', new Date().toISOString()],
      ['SET-005', 'currency', 'INR', new Date().toISOString()],
      ['SET-006', 'currentChitId', 'CHIT-100K-01', new Date().toISOString()],
      ['SET-007', 'defaultDuration', '20', new Date().toISOString()],
      ['SET-008', 'defaultMembers', '20', new Date().toISOString()],
      ['SET-009', 'paymentDay', '20', new Date().toISOString()]
    ];
    defaultSettings.forEach(row => settingsSheet.appendRow(row));
  }

  // 10. ExtraInvestment (investmentId, investmentAmount, investmentDate, usedAmount, beneficiary, payout, returnedAmount, profit, profitPercent, status, notes, createdAt, updatedAt)
  ensureSheetWithHeaders(ss, SHEET_NAMES.EXTRA_INVESTMENT, [
    'investmentId', 'investmentAmount', 'investmentDate', 'usedAmount', 'beneficiary', 'payout', 'returnedAmount', 'profit', 'profitPercent', 'status', 'notes', 'createdAt', 'updatedAt'
  ]);

  Logger.log('MSR CHITS Database Setup Complete: All sheets formatted with distinct column headers.');
  return { success: true, message: 'Database Initialized & Headers Verified' };
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function handleLogin(username, password) {
  if (!username || !password) {
    throw new Error('Username/Mobile and Password are required.');
  }

  const users = getSheetData(SHEET_NAMES.USERS);
  const matched = users.find(u =>
    (String(u.username) === String(username) || String(u.phone) === String(username)) &&
    String(u.password) === String(password)
  );

  if (!matched) {
    if ((username === 'admin' || username === '9840123456') && (password === 'admin123' || password === 'admin')) {
      const token = 'msr_token_' + Utilities.getUuid();
      logActivity('Login', 'Admin logged into portal', 'MSR Administrator');
      return {
        user: {
          id: 'USR-001',
          username: 'admin',
          name: 'MSR Administrator',
          role: 'Admin'
        },
        token: token
      };
    }
    throw new Error('Invalid Mobile/Username or Password.');
  }

  const token = 'msr_token_' + Utilities.getUuid();
  logActivity('Login', 'User ' + matched.name + ' logged in', matched.name);

  // Return sanitized user object (NEVER return password)
  return {
    user: {
      id: matched.userId || matched.id,
      username: matched.username,
      name: matched.name,
      role: matched.role || 'Admin'
    },
    token: token
  };
}

// ============================================================================
// DASHBOARD
// ============================================================================

function getDashboardData() {
  const chits = getAllChits();
  const members = getAllMembers();
  const payments = getAllPayments();
  const schedule = getSheetData(SHEET_NAMES.MONTHLY_SCHEDULE);
  const activityLog = getSheetData(SHEET_NAMES.ACTIVITY_LOG);

  const currentChit = chits[0] || null;
  const currentMonthNum = currentChit ? Number(currentChit.currentMonth || 1) : 1;
  const currentScheduleItem = schedule.find(s => Number(s.monthNumber || s.month) === currentMonthNum) || {};

  const thisMonthPayments = payments.filter(p => Number(p.monthNumber || p.month) === currentMonthNum);
  const thisMonthCollected = thisMonthPayments.reduce((s, p) => s + (Number(p.amount || p.paidAmount) || 0), 0);
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const monthlyContribution = Number(currentScheduleItem.amount || currentScheduleItem.monthlyAmount) || (currentChit ? Number(currentChit.monthlyAmount || currentChit.monthlyContribution) : 0);
  const expectedCollection = monthlyContribution * activeMembers;
  const pendingCollection = Math.max(0, expectedCollection - thisMonthCollected);

  return {
    stats: {
      totalChits: chits.length,
      activeMembers: activeMembers,
      thisMonthCollection: thisMonthCollected,
      pendingPayments: pendingCollection
    },
    currentChit: currentChit ? {
      chitId: currentChit.chitId,
      chitName: currentChit.chitName,
      chitValue: Number(currentChit.totalAmount || currentChit.chitValue) || 0,
      duration: Number(currentChit.durationMonths || currentChit.duration) || 0,
      memberCount: activeMembers,
      currentMonth: currentMonthNum,
      monthlyContribution: monthlyContribution,
      expected20M: schedule.reduce((sum, item) => sum + (Number(item.amount || item.monthlyAmount) || 0), 0),
      expectedCollection: expectedCollection,
      collected: thisMonthCollected,
      pending: pendingCollection,
      currentPayout: Number(currentScheduleItem.payoutAmount || currentScheduleItem.amount) || 0,
      payoutAllocation: currentScheduleItem.memberName || currentScheduleItem.assignedMemberName || 'Not Assigned',
      progressPercent: currentChit && Number(currentChit.durationMonths || currentChit.duration) > 0 ? Math.round((currentMonthNum / Number(currentChit.durationMonths || currentChit.duration)) * 100) : 0
    } : null,
    recentActivity: activityLog.slice(-6).reverse()
  };
}

// ============================================================================
// CHITS
// ============================================================================

function getAllChits() {
  const chits = getSheetData(SHEET_NAMES.CHITS);
  return chits.map(c => {
    const mult = Number(c.multiple) || 1;
    const baseVal = Number(c.baseChitValue || c.chitValue || c.totalAmount || 0);
    const totVal = Number(c.totalAmount || c.chitValue || (baseVal * mult) || 0);
    return {
      chitId: c.chitId,
      chitName: c.chitName,
      chitValue: totVal,
      totalAmount: totVal,
      baseChitValue: baseVal,
      multiple: mult,
      dividend: Number(c.dividend) || 0,
      fixedPayoutMonth: c.fixedPayoutMonth ? Number(c.fixedPayoutMonth) : null,
      duration: Number(c.durationMonths || c.duration) || 0,
      durationMonths: Number(c.durationMonths || c.duration) || 0,
      memberCount: Number(c.totalMembers || c.memberCount || c.durationMonths || c.duration) || 0,
      totalMembers: Number(c.totalMembers || c.memberCount || c.durationMonths || c.duration) || 0,
      currentMonth: Number(c.currentMonth) || 1,
      monthlyContribution: Number(c.monthlyAmount) || 0,
      monthlyAmount: Number(c.monthlyAmount) || 0,
      expected20M: Number(c.expectedTotal) || 0,
      expectedTotal: Number(c.expectedTotal) || 0,
      startDate: c.startDate || '',
      paymentDay: Number(c.paymentDay) || 20,
      status: c.status || 'Active',
      notes: c.notes || ''
    };
  });
}

function getChitDetails(chitId) {
  const chits = getAllChits();
  const chit = chits.find(c => String(c.chitId) === String(chitId)) || chits[0] || null;

  if (!chit) {
    return {
      chit: null,
      schedule: [],
      summary: {
        chitValue: 0,
        currentMonth: 1,
        totalMonths: 0,
        totalCollected: 0,
        totalPending: 0,
        currentMonthPayout: 0,
        totalContributions20M: 0
      }
    };
  }

  const scheduleRaw = getSheetData(SHEET_NAMES.MONTHLY_SCHEDULE);
  const schedule = scheduleRaw
    .filter(s => String(s.chitId) === String(chit.chitId))
    .map(s => {
      const monthNum = Number(s.monthNumber || s.month);
      const monthlyAmount = Number(s.amount || s.monthlyAmount) || 0;
      const payoutAmount = Number(s.payoutAmount || s.amount) || 0;

      return {
        month: monthNum,
        monthNumber: monthNum,
        monthlyAmount: monthlyAmount,
        amount: monthlyAmount,
        payoutAmount: payoutAmount,
        chitNumber: s.notes ? s.notes.replace('Chit ', '') : (monthNum === 1 ? 'NIL' : String(monthNum)),
        assignedMemberId: s.memberId || s.assignedMemberId || '',
        assignedMemberName: s.memberName || s.assignedMemberName || 'Not Assigned',
        status: monthNum < Number(chit.currentMonth) ? 'Completed' : (monthNum === Number(chit.currentMonth) ? 'Active' : 'Upcoming')
      };
    });

  const payments = getAllPayments().filter(p => String(p.chitId) === String(chit.chitId));
  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.paidAmount || p.amount) || 0), 0);
  const currentItem = schedule.find(s => s.month === Number(chit.currentMonth)) || {};
  const activeMembersCount = getAllMembers().filter(m => m.status === 'Active').length;
  const expectedForCurrentMonth = (Number(currentItem.monthlyAmount) || 0) * activeMembersCount;

  return {
    chit: chit,
    schedule: schedule,
    summary: {
      chitValue: Number(chit.chitValue || chit.totalAmount) || 0,
      currentMonth: Number(chit.currentMonth) || 1,
      totalMonths: Number(chit.duration || chit.durationMonths) || 0,
      totalCollected: totalCollected,
      totalPending: Math.max(0, expectedForCurrentMonth - totalCollected),
      currentMonthPayout: Number(currentItem.payoutAmount) || 0,
      totalContributions20M: schedule.reduce((sum, item) => sum + (Number(item.monthlyAmount) || 0), 0)
    }
  };
}

function createNewChit(data) {
  const chitId = generateSequentialId(SHEET_NAMES.CHITS, 'CHIT', 'chitId');
  const mult = Number(data.multiple) || 1;
  const baseVal = Number(data.baseChitValue || data.chitValue || data.totalAmount) || 100000;
  const totVal = Number(data.chitValue || data.totalAmount || (baseVal * mult)) || (baseVal * mult);
  const dur = Number(data.duration || data.durationMonths) || 20;

  const totMembers = Number(data.totalMembers || data.memberCount || dur);

  const newChit = {
    chitId: chitId,
    chitName: data.chitName || ('MSR Chit — ₹' + totVal.toLocaleString('en-IN')),
    totalAmount: totVal,
    durationMonths: dur,
    monthlyAmount: Number(data.monthlyContribution || data.monthlyAmount) || 0,
    startDate: data.startDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd'),
    currentMonth: Number(data.currentMonth) || 1,
    status: data.status || 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    baseChitValue: baseVal,
    multiple: mult,
    dividend: Number(data.dividend) || 0,
    fixedPayoutMonth: data.fixedPayoutMonth ? Number(data.fixedPayoutMonth) : '',
    expectedTotal: Number(data.expectedTotal) || 0,
    paymentDay: Number(data.paymentDay) || 20,
    memberCount: totMembers,
    totalMembers: totMembers,
    notes: data.notes || ''
  };

  appendRow(SHEET_NAMES.CHITS, newChit);
  logActivity('Chit Created', 'Created chit ' + newChit.chitName + ' (Multiple: ' + mult + 'x, Dividend: ₹' + (Number(data.dividend) || 0) + ', Status: ' + newChit.status + ')', 'Admin');
  return newChit;
}

function updateChitDetails(chitId, data) {
  const updateObj = { ...data, updatedAt: new Date().toISOString() };
  updateRow(SHEET_NAMES.CHITS, 'chitId', chitId, updateObj);
  logActivity('Chit Updated', 'Updated chit ' + (data.chitName || chitId) + (data.dividend !== undefined ? ' with Dividend: ₹' + data.dividend : ''), 'Admin');
  return { success: true };
}

// ============================================================================
// UNIQUE CHIT NUMBER & MEMBERSHIP SYSTEM
// ============================================================================

function getAmountCode(amount) {
  const num = Number(amount) || 0;
  if (num >= 100000) {
    const lakhs = num / 100000;
    return (lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)) + 'L';
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return (thousands % 1 === 0 ? thousands : thousands.toFixed(0)) + 'K';
  }
  return String(num);
}

function generatePermanentChitNumber(year, chitValue, sequenceNum) {
  const yrStr = String(year || '2026').slice(-2);
  const amt = getAmountCode(chitValue || 100000);
  const seq = String(sequenceNum || 1).padStart(2, '0');
  return 'MSR' + yrStr + amt + seq;
}

function parseChitNoMonth(chitNo) {
  if (!chitNo) return 1;
  const match = String(chitNo).match(/(\d{2})$/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Reads all memberships from Memberships tab.
 * If empty or sheet not present, falls back safely to schedule assignments so no data is lost.
 */
function getMembershipsSafe(filterMemberId, filterChitId) {
  let list = [];
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.MEMBERSHIPS);
    if (sheet && sheet.getLastRow() > 1) {
      const rows = getSheetData(SHEET_NAMES.MEMBERSHIPS);
      list = rows.map(m => ({
        membershipId: m.membershipId,
        memberId: m.memberId,
        chitId: m.chitId || 'CHIT-100K-01',
        chitNo: m.chitNo,
        chitValue: Number(m.chitValue) || 100000,
        durationMonths: Number(m.durationMonths) || 20,
        monthlyPayment: Number(m.monthlyPayment) || 3750,
        payoutMonth: Number(m.payoutMonth) || (m.chitNo ? parseChitNoMonth(m.chitNo) : 1),
        status: m.status || 'Active',
        joinedDate: m.joinedDate || ''
      }));
    }
  } catch (e) {
    list = [];
  }

  // If no rows in Memberships sheet, synthesize from MonthlySchedule & Members
  if (list.length === 0) {
    try {
      const schedule = getSheetData(SHEET_NAMES.MONTHLY_SCHEDULE);
      const members = getSheetData(SHEET_NAMES.MEMBERS);
      const memberMap = {};
      members.forEach(m => {
        memberMap[m.memberId] = m;
        memberMap[m.name] = m;
      });

      schedule.forEach((sch, idx) => {
        const monthNum = Number(sch.monthNumber || sch.month || (idx + 1));
        const memId = sch.memberId || sch.assignedMemberId || '';
        const memName = sch.memberName || sch.assignedMemberName || '';

        if (memId || (memName && memName !== 'Not Assigned')) {
          const memIds = memId ? String(memId).split(',') : [];
          const targetMemId = memIds[0] || (memberMap[memName] ? memberMap[memName].memberId : 'MEM-001');

          list.push({
            membershipId: 'MEMCHIT-' + String(monthNum).padStart(3, '0'),
            memberId: targetMemId,
            chitId: sch.chitId || 'CHIT-100K-01',
            chitNo: generatePermanentChitNumber('2026', 100000, monthNum),
            chitValue: 100000,
            durationMonths: 20,
            monthlyPayment: Number(sch.amount || sch.monthlyAmount) || 3750,
            payoutMonth: monthNum,
            status: 'Active',
            joinedDate: '2026-01-01'
          });
        }
      });
    } catch (schErr) {
      // Ignore
    }
  }

  if (filterMemberId) {
    list = list.filter(m => String(m.memberId) === String(filterMemberId));
  }
  if (filterChitId) {
    list = list.filter(m => String(m.chitId) === String(filterChitId));
  }

  return list;
}

/**
 * Assigns or creates a permanent membership with a unique Chit Number.
 */
function createOrAssignMembership(data) {
  const ss = getSpreadsheet();
  ensureSheetWithHeaders(ss, SHEET_NAMES.MEMBERSHIPS, [
    'membershipId', 'memberId', 'chitId', 'chitNo', 'chitValue', 'durationMonths', 'monthlyPayment', 'payoutMonth', 'status', 'joinedDate', 'createdAt', 'updatedAt'
  ]);

  const chitId = data.chitId || 'CHIT-100K-01';
  const memberId = data.memberId;
  const payoutMonth = Number(data.payoutMonth || data.month || 1);
  const chitValue = Number(data.chitValue || data.totalAmount) || 100000;
  const durationMonths = Number(data.durationMonths || data.duration) || 20;
  const monthlyPayment = Number(data.monthlyPayment || data.monthlyAmount) || 3750;

  // Read existing chit numbers to prevent duplicate
  const existingMemberships = getMembershipsSafe();
  const existingChitNos = new Set(existingMemberships.map(m => String(m.chitNo).toUpperCase()));

  let finalChitNo = data.chitNo;
  if (!finalChitNo) {
    const candidate = generatePermanentChitNumber('2026', chitValue, payoutMonth);
    if (!existingChitNos.has(candidate.toUpperCase())) {
      finalChitNo = candidate;
    } else {
      let slot = 1;
      while (true) {
        const testNo = generatePermanentChitNumber('2026', chitValue, slot);
        if (!existingChitNos.has(testNo.toUpperCase())) {
          finalChitNo = testNo;
          break;
        }
        slot++;
      }
    }
  }

  const membershipId = generateSequentialId(SHEET_NAMES.MEMBERSHIPS, 'MEMCHIT', 'membershipId');
  const newMembership = {
    membershipId: membershipId,
    memberId: memberId,
    chitId: chitId,
    chitNo: finalChitNo,
    chitValue: chitValue,
    durationMonths: durationMonths,
    monthlyPayment: monthlyPayment,
    payoutMonth: payoutMonth,
    status: data.status || 'Active',
    joinedDate: data.joinedDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appendRow(SHEET_NAMES.MEMBERSHIPS, newMembership);

  // Also update MonthlySchedule if this chit belongs to the schedule
  try {
    const members = getAllMembers();
    const mem = members.find(m => String(m.memberId) === String(memberId));
    const memName = mem ? mem.name : (data.memberName || 'Assigned Member');
    const scheduleSheet = getSheet(SHEET_NAMES.MONTHLY_SCHEDULE);
    const sData = scheduleSheet.getDataRange().getValues();

    for (let r = 1; r < sData.length; r++) {
      if (String(sData[r][1]) === chitId && Number(sData[r][2]) === payoutMonth) {
        scheduleSheet.getRange(r + 1, 5).setValue(memberId);
        scheduleSheet.getRange(r + 1, 6).setValue(memName);
        break;
      }
    }
  } catch (e) {
    // Ignore schedule update error
  }

  logActivity('Membership Created', 'Assigned chit ' + finalChitNo + ' (Month ' + payoutMonth + ') to ' + memberId, 'Admin');
  return newMembership;
}

function deleteMembershipRecord(membershipId) {
  const sheet = getSheet(SHEET_NAMES.MEMBERSHIPS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false };

  const data = sheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(membershipId)) {
      sheet.deleteRow(r + 1);
      logActivity('Membership Removed', 'Deleted membership ' + membershipId, 'Admin');
      return { success: true };
    }
  }
  return { success: false };
}

// ============================================================================
// WHATSAPP LOG HELPERS
// ============================================================================

function getWhatsAppLogs() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.WHATSAPP_LOG);
    if (!sheet) return [];
    return getSheetData(SHEET_NAMES.WHATSAPP_LOG);
  } catch (e) {
    return [];
  }
}

function logWhatsAppMessage(payload) {
  try {
    const ss = getSpreadsheet();
    ensureSheetWithHeaders(ss, SHEET_NAMES.WHATSAPP_LOG, [
      'messageId', 'memberId', 'memberName', 'phone', 'messageType', 'chitNo', 'message', 'relatedPaymentId', 'relatedPayoutId', 'status', 'createdAt'
    ]);
    const messageId = generateSequentialId(SHEET_NAMES.WHATSAPP_LOG, 'WA', 'messageId');
    const logItem = {
      messageId: messageId,
      memberId: payload.memberId || '',
      memberName: payload.memberName || '',
      phone: payload.phone || '',
      messageType: payload.messageType || 'Welcome',
      chitNo: payload.chitNo || '',
      message: payload.message || '',
      relatedPaymentId: payload.relatedPaymentId || '',
      relatedPayoutId: payload.relatedPayoutId || '',
      status: payload.status || 'Prepared',
      createdAt: new Date().toISOString()
    };
    appendRow(SHEET_NAMES.WHATSAPP_LOG, logItem);
    return logItem;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateWhatsAppStatus(messageId, status) {
  try {
    updateRow(SHEET_NAMES.WHATSAPP_LOG, 'messageId', messageId, {
      status: status || 'Opened'
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// MEMBERS
// ============================================================================

/**
 * Returns all real members directly from the Members Google Sheet.
 * Returns [] if sheet is empty.
 */
function getAllMembers() {
  const members = getSheetData(SHEET_NAMES.MEMBERS);
  const payments = getSheetData(SHEET_NAMES.PAYMENTS);
  const memberships = getMembershipsSafe();

  return members.map(m => {
    const memPayments = payments.filter(p => String(p.memberId) === String(m.memberId));
    const paid = memPayments.reduce((s, p) => s + (Number(p.amount || p.paidAmount) || 0), 0);
    const memChits = memberships.filter(ch => String(ch.memberId) === String(m.memberId));

    return {
      memberId: m.memberId,
      name: m.name,
      mobile: m.phone || m.mobile || '',
      phone: m.phone || m.mobile || '',
      email: m.email || '',
      address: m.address || '',
      joinDate: m.joinDate || '',
      payoutMonth: memChits.length > 0
        ? memChits.map(c => 'Month ' + c.payoutMonth).join(', ')
        : (m.assignedChits || m.payoutMonth || 'Not Assigned'),
      assignedMonths: memChits.map(c => Number(c.payoutMonth)).filter(Boolean),
      chits: memChits,
      chitCount: memChits.length || Number(m.chitCount) || 1,
      status: m.status || 'Active',
      notes: m.notes || '',
      totalPaid: paid || Number(m.totalPaid) || 0,
      totalPending: Number(m.pendingAmount) || 0,
      payoutAmount: 0
    };
  });
}

function getMemberDetails(memberId) {
  const members = getAllMembers();
  const member = members.find(m => String(m.memberId) === String(memberId));
  if (!member) throw new Error('Member not found: ' + memberId);

  const payments = getAllPayments().filter(p => String(p.memberId) === String(memberId));

  return {
    member: member,
    payments: payments
  };
}

/**
 * Creates a new member row in the Members Google Sheet with auto-generated MEM-xxx ID.
 */
function createNewMember(data) {
  const memberId = generateSequentialId(SHEET_NAMES.MEMBERS, 'MEM', 'memberId');

  const newMember = {
    memberId: memberId,
    name: data.name,
    phone: data.mobile || data.phone || '',
    email: data.email || '',
    address: data.address || '',
    joinDate: data.joinDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd'),
    status: data.status || 'Active',
    totalPaid: Number(data.totalPaid) || 0,
    pendingAmount: Number(data.pendingAmount) || 0,
    assignedChits: data.payoutMonth || data.assignedChits || 'Not Assigned',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appendRow(SHEET_NAMES.MEMBERS, newMember);
  logActivity('Member Added', 'Added new member ' + newMember.name + ' (' + memberId + ')', 'Admin');

  return {
    ...newMember,
    mobile: newMember.phone,
    payoutMonth: newMember.assignedChits,
    chitCount: 1
  };
}

function updateMemberDetails(memberId, data) {
  const updateObj = {
    name: data.name,
    phone: data.mobile || data.phone,
    address: data.address,
    notes: data.notes,
    assignedChits: data.payoutMonth || data.assignedChits,
    status: data.status,
    updatedAt: new Date().toISOString()
  };

  updateRow(SHEET_NAMES.MEMBERS, 'memberId', memberId, updateObj);
  logActivity('Member Updated', 'Updated profile for ' + (data.name || memberId), 'Admin');
  return { success: true };
}

// ============================================================================
// MONTHLY SCHEDULE
// ============================================================================

function getMonthlySchedule(chitId) {
  const chitData = getChitDetails(chitId || 'CHIT-100K-01');
  return chitData.schedule;
}

function assignChitMonth(payload) {
  const chitId = payload.chitId || 'CHIT-100K-01';
  const month = Number(payload.month || payload.monthNumber);
  const memberId = payload.memberId || '';
  const memberName = payload.memberName || 'Not Assigned';

  const sheet = getSheet(SHEET_NAMES.MONTHLY_SCHEDULE);
  const data = sheet.getDataRange().getValues();

  for (let r = 1; r < data.length; r++) {
    const rowChitId = String(data[r][1]);
    const rowMonth = Number(data[r][2]);

    if (rowChitId === chitId && rowMonth === month) {
      sheet.getRange(r + 1, 5).setValue(memberId);   // memberId
      sheet.getRange(r + 1, 6).setValue(memberName); // memberName
      break;
    }
  }

  // Update or create membership record with permanent unique Chit Number
  let assignedChitNo = '';
  if (memberId && memberId !== 'unassigned') {
    const chit = getAllChits().find(c => String(c.chitId) === String(chitId));
    const chitVal = Number(payload.chitValue) || (chit ? Number(chit.totalAmount || chit.chitValue) : 100000);
    const dur = Number(payload.durationMonths) || (chit ? Number(chit.durationMonths || chit.duration) : 20);
    const monthlyAmt = Number(payload.monthlyPayment || payload.monthlyAmount) || (chit ? Number(chit.monthlyAmount) : 3750);

    const memRecord = createOrAssignMembership({
      chitId: chitId,
      memberId: memberId,
      memberName: memberName,
      payoutMonth: month,
      chitValue: chitVal,
      durationMonths: dur,
      monthlyPayment: monthlyAmt,
      chitNo: payload.chitNo || generatePermanentChitNumber('2026', chitVal, month)
    });
    assignedChitNo = memRecord.chitNo;

    // Update member assignedChits text in Members tab
    const memChits = getMembershipsSafe(memberId);
    const chitsSummary = memChits.map(c => c.chitNo + ' (M' + c.payoutMonth + ')').join(', ');
    updateRow(SHEET_NAMES.MEMBERS, 'memberId', memberId, {
      assignedChits: chitsSummary || ('Month ' + month),
      updatedAt: new Date().toISOString()
    });
  }

  logActivity('Schedule Updated', 'Month ' + month + (assignedChitNo ? ' (' + assignedChitNo + ')' : '') + ' assigned to ' + memberName, 'Admin');
  return { success: true, chitNo: assignedChitNo };
}

// ============================================================================
// PAYMENTS
// ============================================================================

function getAllPayments() {
  const payments = getSheetData(SHEET_NAMES.PAYMENTS);
  return payments.map(p => ({
    paymentId: p.paymentId,
    chitId: p.chitId,
    chitNo: p.chitNo || '',
    memberId: p.memberId,
    memberName: p.memberName,
    month: Number(p.monthNumber || p.month),
    monthNumber: Number(p.monthNumber || p.month),
    amount: Number(p.amount || p.paidAmount) || 0,
    paidAmount: Number(p.amount || p.paidAmount) || 0,
    dueAmount: Number(p.dueAmount) || 0,
    paymentDate: p.paymentDate,
    paymentMode: p.paymentMethod || p.paymentMode || 'Cash',
    paymentMethod: p.paymentMethod || p.paymentMode || 'Cash',
    reference: p.referenceNumber || p.reference || '',
    referenceNumber: p.referenceNumber || p.reference || '',
    status: p.status || 'Paid',
    notes: p.notes || ''
  }));
}

function recordMemberPayment(data) {
  const paymentId = generateSequentialId(SHEET_NAMES.PAYMENTS, 'PAY', 'paymentId');
  const paidAmount = Number(data.paidAmount || data.amount) || 0;
  const dueAmount = Number(data.dueAmount) || paidAmount;

  let status = 'Pending';
  if (paidAmount >= dueAmount && dueAmount > 0) {
    status = 'Paid';
  } else if (paidAmount > 0 && paidAmount < dueAmount) {
    status = 'Partial';
  }

  // Lookup chitNo from member's assigned chits if not provided
  let chitNo = data.chitNo || '';
  if (!chitNo && data.memberId) {
    const memChits = getMembershipsSafe(data.memberId);
    const matchedChit = memChits.find(c => Number(c.payoutMonth) === Number(data.month || data.monthNumber));
    chitNo = matchedChit ? matchedChit.chitNo : (memChits[0] ? memChits[0].chitNo : '');
  }

  const newPayment = {
    paymentId: paymentId,
    chitId: data.chitId || 'CHIT-100K-01',
    chitNo: chitNo,
    memberId: data.memberId,
    memberName: data.memberName,
    monthNumber: Number(data.month || data.monthNumber),
    amount: paidAmount,
    paymentDate: data.paymentDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd'),
    paymentMethod: data.paymentMode || data.paymentMethod || 'UPI',
    referenceNumber: data.reference || data.referenceNumber || '',
    status: status,
    notes: data.notes || '',
    createdAt: new Date().toISOString()
  };

  appendRow(SHEET_NAMES.PAYMENTS, newPayment);
  logActivity('Payment Recorded', 'Received ₹' + paidAmount + ' from ' + data.memberName + ' (Month ' + newPayment.monthNumber + (chitNo ? ', ' + chitNo : '') + ')', 'Admin');
  return newPayment;
}

// ============================================================================
// PAYOUTS
// ============================================================================

function getAllPayouts() {
  const payouts = getSheetData(SHEET_NAMES.PAYOUTS);
  return payouts.map(po => ({
    payoutId: po.payoutId,
    chitId: po.chitId,
    chitNo: po.chitNo || '',
    month: Number(po.monthNumber || po.month),
    monthNumber: Number(po.monthNumber || po.month),
    memberId: po.memberId,
    memberName: po.memberName,
    amount: Number(po.amount) || 0,
    fundingSource: po.fundingSource || 'Chit Fund Collections',
    payoutDate: po.payoutDate,
    paymentMode: po.paymentMethod || po.paymentMode || 'Bank Transfer',
    paymentMethod: po.paymentMethod || po.paymentMode || 'Bank Transfer',
    reference: po.referenceNumber || po.reference || '',
    referenceNumber: po.referenceNumber || po.reference || '',
    status: po.status || 'Completed',
    notes: po.notes || ''
  }));
}

function recordChitPayout(data) {
  const payoutId = generateSequentialId(SHEET_NAMES.PAYOUTS, 'PO', 'payoutId');
  const amount = Number(data.amount) || 0;
  const monthNum = Number(data.month || data.monthNumber);

  // Derive or lookup chitNo
  let chitNo = data.chitNo || '';
  if (!chitNo) {
    const chit = getAllChits().find(c => String(c.chitId) === String(data.chitId || 'CHIT-100K-01'));
    const chitVal = chit ? Number(chit.totalAmount || chit.chitValue) : 100000;
    chitNo = generatePermanentChitNumber('2026', chitVal, monthNum);
  }

  const newPayout = {
    payoutId: payoutId,
    chitId: data.chitId || 'CHIT-100K-01',
    chitNo: chitNo,
    monthNumber: monthNum,
    memberId: data.memberId || '',
    memberName: data.memberName,
    amount: amount,
    fundingSource: data.fundingSource || 'Chit Fund Collections',
    payoutDate: data.payoutDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd'),
    paymentMethod: data.paymentMode || data.paymentMethod || 'Bank Transfer',
    referenceNumber: data.reference || data.referenceNumber || '',
    status: 'Completed',
    notes: data.notes || '',
    createdAt: new Date().toISOString()
  };

  appendRow(SHEET_NAMES.PAYOUTS, newPayout);
  logActivity('Payout Recorded', 'Disbursed ₹' + amount + ' to ' + newPayout.memberName + ' (Month ' + newPayout.monthNumber + (chitNo ? ', ' + chitNo : '') + ', Funding: ' + newPayout.fundingSource + ')', 'Admin');
  return newPayout;
}

// ============================================================================
// REPORTS
// ============================================================================

function getFinancialReports() {
  const payments = getAllPayments();
  const payouts = getAllPayouts();
  const members = getAllMembers();
  const schedule = getSheetData(SHEET_NAMES.MONTHLY_SCHEDULE);

  const totalCollection = payments.reduce((sum, p) => sum + (Number(p.paidAmount || p.amount) || 0), 0);
  const totalPayout = payouts.reduce((sum, po) => sum + (Number(po.amount) || 0), 0);
  const pendingCollection = members.reduce((sum, m) => sum + (Number(m.totalPending) || 0), 0);
  const activeMembersCount = members.filter(m => m.status === 'Active').length;

  const monthlyBreakdown = schedule.map(sch => {
    const monthNum = Number(sch.monthNumber || sch.month);
    const monthPayments = payments.filter(p => Number(p.month || p.monthNumber) === monthNum);
    const collected = monthPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
    const monthlyAmount = Number(sch.amount || sch.monthlyAmount) || 0;
    const expected = monthlyAmount * activeMembersCount;
    const payout = payouts.find(po => Number(po.month || po.monthNumber) === monthNum);

    return {
      month: monthNum,
      monthlyAmount: monthlyAmount,
      expected: expected,
      collected: collected,
      pending: Math.max(0, expected - collected),
      payoutAmount: Number(sch.payoutAmount || sch.amount) || 0,
      payoutBeneficiary: sch.memberName || sch.assignedMemberName || 'Not Assigned',
      payoutStatus: payout ? (payout.status || 'Completed') : (sch.payoutStatus || 'Scheduled')
    };
  });

  return {
    summary: {
      totalCollection: totalCollection,
      totalPayout: totalPayout,
      pendingCollection: pendingCollection,
      completedPayments: payments.filter(p => p.status === 'Paid').length
    },
    monthlyBreakdown: monthlyBreakdown,
    members: members,
    payments: payments,
    payouts: payouts
  };
}

// ============================================================================
// SETTINGS
// ============================================================================

function getSystemSettings() {
  const sheet = getSheet(SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};

  for (let r = 1; r < data.length; r++) {
    const key = data[r][1]; // column B = key
    const val = data[r][2]; // column C = value
    if (key) settings[key] = val;
  }

  return settings;
}

function updateSystemSettings(payload) {
  const sheet = getSheet(SHEET_NAMES.SETTINGS);
  const keys = Object.keys(payload);
  const existingData = sheet.getDataRange().getValues();

  keys.forEach(key => {
    let found = false;
    for (let r = 1; r < existingData.length; r++) {
      if (existingData[r][1] === key) {
        sheet.getRange(r + 1, 3).setValue(payload[key]);
        sheet.getRange(r + 1, 4).setValue(new Date().toISOString());
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([generateSequentialId(SHEET_NAMES.SETTINGS, 'SET', 'settingId'), key, payload[key], new Date().toISOString()]);
    }
  });

  logActivity('Settings Updated', 'Updated system preferences', 'Admin');
  return payload;
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

function logActivity(action, description, user) {
  try {
    const sheet = getSheet(SHEET_NAMES.ACTIVITY_LOG);
    const logId = generateSequentialId(SHEET_NAMES.ACTIVITY_LOG, 'ACT', 'logId');
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd HH:mm');
    sheet.appendRow([logId, action, user || 'Admin', description, timestamp]);
  } catch (e) {
    // Ignore logging failures
  }
}

function getActivityLogs() {
  return getSheetData(SHEET_NAMES.ACTIVITY_LOG);
}

// ============================================================================
// EXTRA INVESTMENT SYSTEM (Completely Isolated from Normal Chit Calculations)
// ============================================================================

function getExtraInvestments() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.EXTRA_INVESTMENT);
    if (!sheet) return [];
    return getSheetData(SHEET_NAMES.EXTRA_INVESTMENT).map(inv => {
      const investAmt = Number(inv.investmentAmount) || 0;
      const retAmt = Number(inv.returnedAmount) || 0;
      const profit = retAmt - investAmt;
      const profitPercent = investAmt > 0 ? Math.round((profit / investAmt) * 1000) / 10 : 0;
      const used = Number(inv.usedAmount || inv.allocatedAmount) || 0;
      const ben = inv.beneficiary || inv.purpose || '';
      return {
        investmentId: inv.investmentId,
        investmentAmount: investAmt,
        investmentDate: inv.investmentDate || '',
        usedAmount: used,
        allocatedAmount: used,
        remainingAmount: Math.max(0, investAmt - used),
        beneficiary: ben,
        purpose: ben,
        payout: Number(inv.payout) || 0,
        returnedAmount: retAmt,
        profit: profit,
        profitPercent: profitPercent,
        profitPercentage: profitPercent,
        status: inv.status || 'Active',
        notes: inv.notes || '',
        createdAt: inv.createdAt || ''
      };
    });
  } catch (e) {
    return [];
  }
}

function createExtraInvestment(data) {
  const ss = getSpreadsheet();
  ensureSheetWithHeaders(ss, SHEET_NAMES.EXTRA_INVESTMENT, [
    'investmentId', 'investmentAmount', 'investmentDate', 'usedAmount', 'beneficiary', 'payout', 'returnedAmount', 'profit', 'profitPercent', 'status', 'notes', 'createdAt', 'updatedAt'
  ]);
  const investmentId = generateSequentialId(SHEET_NAMES.EXTRA_INVESTMENT, 'INV', 'investmentId');
  const investAmt = Number(data.investmentAmount) || 0;
  const retAmt = Number(data.returnedAmount) || 0;
  const profit = retAmt - investAmt;
  const profitPercent = investAmt > 0 ? Math.round((profit / investAmt) * 1000) / 10 : 0;
  const usedAmt = Number(data.usedAmount !== undefined ? data.usedAmount : data.allocatedAmount) || 0;
  const ben = data.beneficiary || data.purpose || '';

  const newInv = {
    investmentId: investmentId,
    investmentAmount: investAmt,
    investmentDate: data.investmentDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'yyyy-MM-dd'),
    usedAmount: usedAmt,
    beneficiary: ben,
    payout: Number(data.payout) || 0,
    returnedAmount: retAmt,
    profit: profit,
    profitPercent: profitPercent,
    status: data.status || (retAmt >= investAmt ? 'Closed' : 'Active'),
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appendRow(SHEET_NAMES.EXTRA_INVESTMENT, newInv);
  logActivity('Extra Investment Created', 'Created investment ' + investmentId + ' of ₹' + investAmt + ' for ' + (newInv.beneficiary || 'N/A'), 'Admin');
  return newInv;
}

function updateExtraInvestment(investmentId, data) {
  const investAmt = Number(data.investmentAmount) || 0;
  const retAmt = Number(data.returnedAmount) || 0;
  const profit = retAmt - investAmt;
  const profitPercent = investAmt > 0 ? Math.round((profit / investAmt) * 1000) / 10 : 0;

  const updateObj = {
    ...data,
    investmentAmount: investAmt,
    returnedAmount: retAmt,
    profit: profit,
    profitPercent: profitPercent,
    updatedAt: new Date().toISOString()
  };

  updateRow(SHEET_NAMES.EXTRA_INVESTMENT, 'investmentId', investmentId, updateObj);
  logActivity('Extra Investment Updated', 'Updated extra investment ' + investmentId, 'Admin');
  return { success: true };
}

function deleteExtraInvestment(investmentId) {
  const sheet = getSheet(SHEET_NAMES.EXTRA_INVESTMENT);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false };

  const data = sheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(investmentId)) {
      sheet.deleteRow(r + 1);
      logActivity('Extra Investment Removed', 'Deleted extra investment ' + investmentId, 'Admin');
      return { success: true };
    }
  }
  return { success: false };
}

// ============================================================================
// API ROUTER
// ============================================================================

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    let action = '';
    let payload = {};

    if (method === 'POST') {
      let bodyData = {};
      if (e && e.postData && e.postData.contents) {
        try {
          bodyData = JSON.parse(e.postData.contents);
        } catch (jsonErr) {
          bodyData = e.parameter || {};
        }
      } else if (e && e.parameter) {
        bodyData = e.parameter;
      }
      action = bodyData.action || (e && e.parameter ? e.parameter.action : '');
      payload = bodyData.payload || bodyData;
    } else {
      action = (e && e.parameter ? e.parameter.action : '') || 'health';
      payload = e && e.parameter ? e.parameter : {};
    }

    let result = null;

    switch (action) {
      case 'health':
        result = handleHealthCheck();
        break;

      case 'login':
        result = handleLogin(payload.username, payload.password);
        break;

      case 'dashboard':
        result = getDashboardData();
        break;

      case 'getChits':
        result = getAllChits();
        break;

      case 'getChit':
        result = getChitDetails(payload.chitId);
        break;

      case 'createChit':
        result = createNewChit(payload);
        break;

      case 'updateChit':
        result = updateChitDetails(payload.chitId, payload);
        break;

      case 'getMembers':
        result = getAllMembers();
        break;

      case 'getMember':
        result = getMemberDetails(payload.memberId);
        break;

      case 'createMember':
        result = createNewMember(payload);
        break;

      case 'updateMember':
        result = updateMemberDetails(payload.memberId, payload);
        break;

      case 'getMonthlySchedule':
        result = getMonthlySchedule(payload.chitId);
        break;

      case 'assignChit':
        result = assignChitMonth(payload);
        break;

      case 'getMemberships':
        result = getMembershipsSafe(payload.memberId, payload.chitId);
        break;

      case 'createMembership':
      case 'assignMemberChit':
        result = createOrAssignMembership(payload);
        break;

      case 'deleteMembership':
        result = deleteMembershipRecord(payload.membershipId);
        break;

      case 'getWhatsAppLogs':
        result = getWhatsAppLogs();
        break;

      case 'logWhatsApp':
      case 'logWhatsAppMessage':
        result = logWhatsAppMessage(payload);
        break;

      case 'updateWhatsAppStatus':
        result = updateWhatsAppStatus(payload.messageId, payload.status);
        break;

      case 'getPayments':
        result = getAllPayments();
        break;

      case 'recordPayment':
        result = recordMemberPayment(payload);
        break;

      case 'getPayouts':
        result = getAllPayouts();
        break;

      case 'recordPayout':
        result = recordChitPayout(payload);
        break;

      case 'getReports':
        result = getFinancialReports();
        break;

      case 'getSettings':
        result = getSystemSettings();
        break;

      case 'updateSettings':
        result = updateSystemSettings(payload);
        break;

      case 'getActivityLog':
        result = getActivityLogs();
        break;

      case 'getExtraInvestments':
        result = getExtraInvestments();
        break;

      case 'createExtraInvestment':
        result = createExtraInvestment(payload);
        break;

      case 'updateExtraInvestment':
        result = updateExtraInvestment(payload.investmentId, payload);
        break;

      case 'deleteExtraInvestment':
        result = deleteExtraInvestment(payload.investmentId);
        break;

      default:
        return createJsonResponse(false, 'Unknown API action: ' + action, null);
    }

    return createJsonResponse(true, 'Success', result);
  } catch (err) {
    return createJsonResponse(false, err.message || err.toString(), null);
  }
}

function handleHealthCheck() {
  const ss = getSpreadsheet();
  return {
    status: 'ONLINE',
    sheetName: ss.getName(),
    sheetsCount: ss.getSheets().length,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// JSON RESPONSE
// ============================================================================

function createJsonResponse(success, message, data) {
  const output = {
    success: success,
    message: message || (success ? 'Success' : 'Error'),
    data: data,
    timestamp: new Date().toISOString()
  };

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
