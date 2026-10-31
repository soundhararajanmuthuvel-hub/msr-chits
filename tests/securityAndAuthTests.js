import assert from 'assert';

console.log('====================================================');
console.log('RUNNING MSR CHITS SECURITY & AUTHENTICATION TEST SUITE');
console.log('====================================================');

// Mock Session Database
const mockDb = {
  users: [
    {
      userId: 'USR-001',
      username: 'admin',
      password: 'secretPassword123',
      name: 'MSR Administrator',
      role: 'Admin',
      status: 'Active',
      token: '',
      tokenExpiry: ''
    },
    {
      userId: 'USR-002',
      username: 'viewer',
      password: 'viewerPassword',
      name: 'Viewer User',
      role: 'Viewer',
      status: 'Active',
      token: '',
      tokenExpiry: ''
    },
    {
      userId: 'USR-003',
      username: 'inactive_admin',
      password: 'inactivePassword',
      name: 'Inactive Admin',
      role: 'Admin',
      status: 'Inactive',
      token: '',
      tokenExpiry: ''
    }
  ],
  payments: [],
  payouts: [],
  cache: new Map()
};

// SIMULATE CODE.GS AUTH FUNCTIONS
function mockVerifySession(token, requiredRole = null) {
  if (!token || typeof token !== 'string') {
    return { valid: false, code: 'AUTH_REQUIRED', message: 'Authentication required. Missing session token.' };
  }
  const trimmed = token.trim();
  if (trimmed.length < 16) {
    return { valid: false, code: 'INVALID_TOKEN', message: 'Invalid session token format.' };
  }

  // 1. Check cache
  if (mockDb.cache.has(trimmed)) {
    const session = JSON.parse(mockDb.cache.get(trimmed));
    if (new Date(session.expiresAt) <= new Date()) {
      mockDb.cache.delete(trimmed);
      return { valid: false, code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' };
    }
    if (requiredRole && session.role !== requiredRole && session.role !== 'Admin') {
      return { valid: false, code: 'FORBIDDEN', message: 'Access denied: insufficient permissions.' };
    }
    return { valid: true, user: session };
  }

  // 2. Check Users sheet
  const user = mockDb.users.find(u => u.token === trimmed);
  if (!user) {
    return { valid: false, code: 'INVALID_TOKEN', message: 'Invalid or revoked session token. Please log in again.' };
  }
  if (user.status !== 'Active') {
    return { valid: false, code: 'USER_INACTIVE', message: 'User account is inactive.' };
  }
  if (user.tokenExpiry && new Date(user.tokenExpiry) <= new Date()) {
    return { valid: false, code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' };
  }

  const sessionObj = {
    userId: user.userId,
    username: user.username,
    name: user.name,
    role: user.role,
    expiresAt: user.tokenExpiry
  };
  mockDb.cache.set(trimmed, JSON.stringify(sessionObj));

  if (requiredRole && sessionObj.role !== requiredRole && sessionObj.role !== 'Admin') {
    return { valid: false, code: 'FORBIDDEN', message: 'Access denied: insufficient permissions.' };
  }
  return { valid: true, user: sessionObj };
}

function mockHandleLogin(username, password) {
  const user = mockDb.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return { success: false, message: 'Invalid Username/Mobile or Password.' };
  }
  if (user.status !== 'Active') {
    return { success: false, message: 'User account is inactive. Please contact administrator.' };
  }
  const token = 'msr_sec_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  user.token = token;
  user.tokenExpiry = expiresAt;

  const sessionObj = {
    userId: user.userId,
    username: user.username,
    name: user.name,
    role: user.role,
    expiresAt: expiresAt
  };
  mockDb.cache.set(token, JSON.stringify(sessionObj));

  return {
    success: true,
    token: token,
    expiresAt: expiresAt,
    user: {
      id: user.userId,
      username: user.username,
      name: user.name,
      role: user.role
    }
  };
}

function mockHandleLogout(token) {
  if (!token) return { success: true };
  mockDb.cache.delete(token);
  const user = mockDb.users.find(u => u.token === token);
  if (user) {
    user.token = '';
    user.tokenExpiry = '';
  }
  return { success: true, message: 'Logged out successfully.' };
}

function mockHandleRequest(action, payload = {}) {
  const PUBLIC_ACTIONS = ['health', 'login', 'testSpreadsheetConnection'];
  const ADMIN_ONLY_ACTIONS = ['deleteMember', 'cancelMembership', 'deleteMembership', 'changePassword', 'updateSettings'];

  const token = payload.token || '';
  const isPublic = PUBLIC_ACTIONS.includes(action);
  let sessionUser = null;

  if (!isPublic) {
    const auth = mockVerifySession(token);
    if (!auth.valid) {
      return { success: false, code: auth.code, message: auth.message };
    }
    sessionUser = auth.user;
  }

  if (ADMIN_ONLY_ACTIONS.includes(action)) {
    if (!sessionUser || sessionUser.role !== 'Admin') {
      return { success: false, code: 'FORBIDDEN', message: 'Access denied: Administrator privileges required.' };
    }
  }

  switch (action) {
    case 'health':
      return { success: true, status: 'ONLINE' };
    case 'dashboard':
      return { success: true, data: { month: 2, totalDue: 75000 } };
    case 'getMembers':
      return { success: true, data: [{ id: 'MEM-001', name: 'Soundhararajan M' }] };
    case 'recordPayment':
      mockDb.payments.push({ id: 'PAY-NEW', amount: payload.amount });
      return { success: true, message: 'Payment recorded successfully' };
    case 'recordPayout':
      mockDb.payouts.push({ id: 'PO-NEW', amount: payload.amount });
      return { success: true, message: 'Payout recorded successfully' };
    case 'deleteMember':
      return { success: true, message: 'Member deleted successfully' };
    case 'logout':
      return mockHandleLogout(token);
    default:
      return { success: false, message: 'Unknown action' };
  }
}

// --------------------------------------------------------------------------
// TEST EXECUTION
// --------------------------------------------------------------------------

// 1. Unauthorized dashboard request
const test1 = mockHandleRequest('dashboard', {});
assert.strictEqual(test1.success, false);
assert.strictEqual(test1.code, 'AUTH_REQUIRED');
console.log('✅ [PASS] TEST 1: Unauthorized dashboard request rejected with AUTH_REQUIRED');

// 2. Unauthorized member data request
const test2 = mockHandleRequest('getMembers', {});
assert.strictEqual(test2.success, false);
assert.strictEqual(test2.code, 'AUTH_REQUIRED');
console.log('✅ [PASS] TEST 2: Unauthorized member data request rejected with AUTH_REQUIRED');

// 3. Unauthorized payment creation
const test3 = mockHandleRequest('recordPayment', { amount: 3750 });
assert.strictEqual(test3.success, false);
assert.strictEqual(test3.code, 'AUTH_REQUIRED');
console.log('✅ [PASS] TEST 3: Unauthorized payment creation rejected with AUTH_REQUIRED');

// 4. Unauthorized payout creation
const test4 = mockHandleRequest('recordPayout', { amount: 70000 });
assert.strictEqual(test4.success, false);
assert.strictEqual(test4.code, 'AUTH_REQUIRED');
console.log('✅ [PASS] TEST 4: Unauthorized payout creation rejected with AUTH_REQUIRED');

// 5. Valid admin login
const loginRes = mockHandleLogin('admin', 'secretPassword123');
assert.strictEqual(loginRes.success, true);
assert.ok(loginRes.token && loginRes.token.startsWith('msr_sec_'));
assert.strictEqual(loginRes.user.role, 'Admin');
console.log('✅ [PASS] TEST 5: Valid admin login succeeds and returns secure session token');

const adminToken = loginRes.token;

// 6. Valid admin read access
const test6 = mockHandleRequest('dashboard', { token: adminToken });
assert.strictEqual(test6.success, true);
assert.strictEqual(test6.data.totalDue, 75000);
console.log('✅ [PASS] TEST 6: Authorized admin read access succeeds with token');

// 7. Valid admin payment creation in test database
const test7 = mockHandleRequest('recordPayment', { token: adminToken, amount: 3750 });
assert.strictEqual(test7.success, true);
assert.strictEqual(mockDb.payments.length, 1);
console.log('✅ [PASS] TEST 7: Authorized payment creation succeeds in test database');

// 8. Valid admin payout creation in test database
const test8 = mockHandleRequest('recordPayout', { token: adminToken, amount: 70000 });
assert.strictEqual(test8.success, true);
assert.strictEqual(mockDb.payouts.length, 1);
console.log('✅ [PASS] TEST 8: Authorized payout creation succeeds in test database');

// 9. Session expiry
const expiredToken = 'msr_sec_expired_token_00000000000';
mockDb.cache.set(expiredToken, JSON.stringify({
  userId: 'USR-001',
  username: 'admin',
  role: 'Admin',
  expiresAt: new Date(Date.now() - 3600000).toISOString() // expired 1 hour ago
}));
const test9 = mockHandleRequest('dashboard', { token: expiredToken });
assert.strictEqual(test9.success, false);
assert.strictEqual(test9.code, 'SESSION_EXPIRED');
console.log('✅ [PASS] TEST 9: Expired session token rejected with SESSION_EXPIRED');

// 10. Logout & Token Invalidation
const test10Logout = mockHandleRequest('logout', { token: adminToken });
assert.strictEqual(test10Logout.success, true);

const test10PostLogout = mockHandleRequest('dashboard', { token: adminToken });
assert.strictEqual(test10PostLogout.success, false);
assert.strictEqual(test10PostLogout.code, 'INVALID_TOKEN');
console.log('✅ [PASS] TEST 10: Logout invalidates token; subsequent requests rejected with INVALID_TOKEN');

// 11. Role Authorization (Viewer blocked from admin actions)
const viewerLogin = mockHandleLogin('viewer', 'viewerPassword');
assert.strictEqual(viewerLogin.success, true);
const viewerToken = viewerLogin.token;

const test11ViewerRead = mockHandleRequest('getMembers', { token: viewerToken });
assert.strictEqual(test11ViewerRead.success, true, 'Viewer can read data');

const test11ViewerAdmin = mockHandleRequest('deleteMember', { token: viewerToken, memberId: 'MEM-001' });
assert.strictEqual(test11ViewerAdmin.success, false);
assert.strictEqual(test11ViewerAdmin.code, 'FORBIDDEN');
console.log('✅ [PASS] TEST 11: Non-admin role blocked from privileged administrative actions');

// 12. Inactive account blocked at login
const inactiveLogin = mockHandleLogin('inactive_admin', 'inactivePassword');
assert.strictEqual(inactiveLogin.success, false);
console.log('✅ [PASS] TEST 12: Inactive user account rejected at login');

console.log('====================================================');
console.log('ALL 12 SECURITY & AUTHENTICATION TESTS PASSED (100%)');
console.log('====================================================');
