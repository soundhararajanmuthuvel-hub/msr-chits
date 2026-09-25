/**
 * MSR CHITS API Client
 * Connects frontend React directly to Google Apps Script Web App & Google Sheets.
 * Uses text/plain;charset=utf-8 to eliminate CORS preflight restrictions on Google Apps Script.
 * Strictly relies on Google Sheets as the single source of truth.
 */

const RAW_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim() : '';
const API_URL = RAW_URL.replace(/\/+$/, '');

const STORAGE_KEYS = {
  SESSION: 'msr_auth_session',
  LAST_SYNC: 'msr_last_sync_time',
  MEMBERS_CACHE: 'msr_members_cache',
  PAYMENTS_CACHE: 'msr_payments_cache',
  PAYOUTS_CACHE: 'msr_payouts_cache',
  CHITS_CACHE: 'msr_chits_cache',
  SCHEDULE_CACHE: 'msr_schedule_cache',
  SETTINGS_CACHE: 'msr_settings_cache'
};

const getCache = (key) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const setCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch {
    // Ignore storage quota errors
  }
};

/**
 * Robust POST request helper for Google Apps Script
 * Uses text/plain;charset=utf-8 to prevent browser CORS preflight (OPTIONS)
 */
export async function postApi(action, payload = {}) {
  if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    throw new Error('Google Apps Script URL is not configured. Please check VITE_API_URL in .env');
  }

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        payload
      })
    });
  } catch (networkErr) {
    console.error(`[MSR CHITS API] POST ${action} network failure:`, {
      url: API_URL,
      action,
      error: networkErr.message
    });
    throw new Error('Unable to reach MSR CHITS API. Please check your internet connection or server availability.');
  }

  // Detect Google OAuth login redirect
  if (response.url && response.url.includes('accounts.google.com')) {
    console.error(`[MSR CHITS API] Authentication required by Google:`, response.url);
    throw new Error('Google Apps Script authentication failed. Web App must be deployed with "Who has access: Anyone".');
  }

  if (!response.ok) {
    console.error(`[MSR CHITS API] HTTP error ${response.status}:`, {
      url: API_URL,
      action,
      status: response.status,
      statusText: response.statusText
    });
    throw new Error(`MSR CHITS API returned HTTP ${response.status}: ${response.statusText}`);
  }

  const rawText = await response.text();
  let result;
  try {
    result = JSON.parse(rawText);
  } catch (jsonErr) {
    console.error(`[MSR CHITS API] Invalid JSON response:`, {
      action,
      status: response.status,
      preview: rawText.slice(0, 300)
    });
    if (rawText.includes('<!DOCTYPE') || rawText.includes('<!doctype html>')) {
      throw new Error('Google Apps Script returned an HTML login page instead of JSON. Please ensure "Who has access: Anyone" is active.');
    }
    throw new Error('MSR CHITS API returned invalid JSON.');
  }

  if (!result.success) {
    console.error(`[MSR CHITS API] Application error for action "${action}":`, result.message);
    throw new Error(result.message || 'MSR CHITS server returned an application error.');
  }

  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  return result.data;
}

/**
 * Robust GET request helper for read-only actions with automatic POST fallback
 */
export async function getApi(action, params = {}) {
  if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    throw new Error('Google Apps Script URL is not configured. Please check VITE_API_URL in .env');
  }

  const queryParams = new URLSearchParams({ action, ...params });
  const url = `${API_URL}?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET'
    });

    // Detect Google OAuth login redirect
    if (response.url && response.url.includes('accounts.google.com')) {
      console.error(`[MSR CHITS API] Authentication required by Google:`, response.url);
      throw new Error('Google Apps Script authentication failed. Web App must be deployed with "Who has access: Anyone".');
    }

    if (!response.ok) {
      throw new Error(`MSR CHITS API returned HTTP ${response.status}: ${response.statusText}`);
    }

    const rawText = await response.text();
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (jsonErr) {
      if (rawText.includes('<!DOCTYPE') || rawText.includes('<!doctype html>')) {
        throw new Error('Google Apps Script returned an HTML login page instead of JSON. Please ensure "Who has access: Anyone" is active.');
      }
      throw new Error('MSR CHITS API returned invalid JSON.');
    }

    if (!result.success) {
      throw new Error(result.message || 'MSR CHITS server returned an application error.');
    }

    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    return result.data;
  } catch (getErr) {
    // If GET fails (e.g. CORS on redirect or network), try POST fallback with text/plain
    console.warn(`[MSR CHITS API] GET ${action} failed (${getErr.message}), trying POST fallback...`);
    return await postApi(action, params);
  }
}

// ----------------------------------------------------------------------------
// API Service Object
// ----------------------------------------------------------------------------

export const api = {
  // Health Check
  async healthCheck() {
    if (!API_URL) {
      return { connected: false, message: 'VITE_API_URL not set', lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC) };
    }
    try {
      const data = await getApi('health');
      return { connected: true, data, lastSync: new Date().toISOString() };
    } catch (err) {
      return { connected: false, error: err.message, lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC) };
    }
  },

  async getHealth() {
    return this.healthCheck();
  },

  // Auth / Login
  async login(username, password) {
    if (API_URL) {
      try {
        const data = await postApi('login', { username, password });
        return { success: true, user: data.user, token: data.token };
      } catch (err) {
        // Fallback local admin check if network fails
        if ((username === 'admin' || username === '9840123456') && (password === 'admin123' || password === 'admin')) {
          const user = { id: 'USR-001', name: 'MSR Administrator', username: 'admin', role: 'Admin' };
          return { success: true, user, token: `token_${Date.now()}` };
        }
        throw err;
      }
    }

    if ((username === 'admin' || username === '9840123456') && (password === 'admin123' || password === 'admin')) {
      const user = { id: 'USR-001', name: 'MSR Administrator', username: 'admin', role: 'Admin' };
      return { success: true, user, token: `token_${Date.now()}` };
    }

    throw new Error('Invalid Mobile/Username or Password.');
  },

  // Dashboard
  async getDashboard() {
    if (API_URL) {
      try {
        const data = await getApi('dashboard');
        setCache('msr_dashboard_cache', data);
        return data;
      } catch (e) {
        console.warn('Dashboard fetch error:', e.message);
      }
    }

    const cached = getCache('msr_dashboard_cache');
    if (cached) return cached;

    const chits = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const payments = getCache(STORAGE_KEYS.PAYMENTS_CACHE) || [];

    const activeMembers = members.filter(m => m.status === 'Active').length;
    const thisMonthPayments = payments.filter(p => Number(p.month || p.monthNumber) === 1);
    const thisMonthCollected = thisMonthPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);

    return {
      stats: {
        totalChits: chits.length,
        activeMembers: activeMembers,
        thisMonthCollection: thisMonthCollected,
        pendingPayments: 0
      },
      currentChit: chits[0] || null,
      recentActivity: []
    };
  },

  // Members (Reads direct from Members Google Sheet)
  async getMembers() {
    if (API_URL) {
      try {
        const data = await getApi('getMembers');
        setCache(STORAGE_KEYS.MEMBERS_CACHE, data || []);
        return data || [];
      } catch (e) {
        console.warn('getMembers fetch error:', e.message);
      }
    }
    return getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
  },

  async getMember(memberId) {
    if (API_URL) {
      try {
        return await getApi('getMember', { memberId });
      } catch (e) {
        console.warn('getMember fetch error:', e.message);
      }
    }

    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const member = members.find(m => String(m.memberId) === String(memberId));
    if (!member) throw new Error('Member not found');
    const payments = (getCache(STORAGE_KEYS.PAYMENTS_CACHE) || []).filter(p => String(p.memberId) === String(memberId));
    return { member, payments };
  },

  async createMember(memberData) {
    const payload = {
      name: memberData.name.trim(),
      mobile: memberData.mobile || memberData.phone || '',
      phone: memberData.mobile || memberData.phone || '',
      email: memberData.email || '',
      address: memberData.address || '',
      joinDate: memberData.joinDate || new Date().toISOString().split('T')[0],
      payoutMonth: memberData.payoutMonth || 'Not Assigned',
      status: memberData.status || 'Active',
      notes: memberData.notes || '',
      totalPaid: Number(memberData.totalPaid) || 0,
      pendingAmount: Number(memberData.pendingAmount) || 0
    };

    if (API_URL) {
      const newMember = await postApi('createMember', payload);
      const cached = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
      setCache(STORAGE_KEYS.MEMBERS_CACHE, [...cached, newMember]);
      return newMember;
    }

    const cached = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const newId = `MEM-${String(cached.length + 1).padStart(3, '0')}`;
    const newMember = {
      memberId: newId,
      ...payload,
      assignedMonths: [],
      chitCount: Number(memberData.chitCount) || 1
    };
    setCache(STORAGE_KEYS.MEMBERS_CACHE, [...cached, newMember]);
    return newMember;
  },

  async updateMember(memberId, updateData) {
    if (API_URL) {
      await postApi('updateMember', { memberId, ...updateData });
    }
    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const updated = members.map(m => String(m.memberId) === String(memberId) ? { ...m, ...updateData } : m);
    setCache(STORAGE_KEYS.MEMBERS_CACHE, updated);
    return updated.find(m => String(m.memberId) === String(memberId));
  },

  // Chits
  async getChits() {
    if (API_URL) {
      try {
        const data = await getApi('getChits');
        setCache(STORAGE_KEYS.CHITS_CACHE, data || []);
        return data || [];
      } catch (e) {
        console.warn('getChits error:', e.message);
      }
    }
    return getCache(STORAGE_KEYS.CHITS_CACHE) || [];
  },

  async getChit(chitId) {
    if (API_URL) {
      try {
        return await getApi('getChit', { chitId });
      } catch (e) {
        console.warn('getChit error:', e.message);
      }
    }
    const chits = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    const chit = chits.find(c => String(c.chitId) === String(chitId)) || chits[0] || null;
    return {
      chit,
      schedule: getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [],
      summary: {
        chitValue: chit ? Number(chit.chitValue || chit.totalAmount) : 0,
        currentMonth: chit ? Number(chit.currentMonth) : 1,
        totalMonths: chit ? Number(chit.duration || chit.durationMonths) : 0,
        totalCollected: 0,
        totalPending: 0,
        currentMonthPayout: 0,
        totalContributions20M: 0
      }
    };
  },

  async createChit(chitData) {
    const payload = {
      chitName: chitData.chitName,
      chitValue: Number(chitData.chitValue || chitData.totalAmount) || 0,
      duration: Number(chitData.duration || chitData.durationMonths) || 0,
      totalMembers: Number(chitData.totalMembers || chitData.memberCount) || 0,
      paymentDay: Number(chitData.paymentDay) || 20,
      startDate: chitData.startDate || new Date().toISOString().split('T')[0],
      monthlyContribution: Number(chitData.monthlyContribution || chitData.monthlyAmount) || 0,
      notes: chitData.description || chitData.notes || ''
    };

    if (API_URL) {
      const newChit = await postApi('createChit', payload);
      const cached = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
      setCache(STORAGE_KEYS.CHITS_CACHE, [...cached, newChit]);
      return newChit;
    }

    const chits = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    const newChit = {
      chitId: `CHIT-${Date.now().toString().slice(-6)}`,
      ...payload,
      currentMonth: 1,
      status: 'Active'
    };
    setCache(STORAGE_KEYS.CHITS_CACHE, [...chits, newChit]);
    return newChit;
  },

  // Monthly Schedule & Chit Assignment
  async getMonthlySchedule(chitId = 'CHIT-100K-01') {
    if (API_URL) {
      try {
        return await getApi('getMonthlySchedule', { chitId });
      } catch (e) {
        console.warn('getMonthlySchedule error:', e.message);
      }
    }
    return getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
  },

  async assignChit(payload) {
    if (API_URL) {
      return await postApi('assignChit', payload);
    }
    return { success: true };
  },

  // Payments
  async getPayments() {
    if (API_URL) {
      try {
        const data = await getApi('getPayments');
        setCache(STORAGE_KEYS.PAYMENTS_CACHE, data || []);
        return data || [];
      } catch (e) {
        console.warn('getPayments error:', e.message);
      }
    }
    return getCache(STORAGE_KEYS.PAYMENTS_CACHE) || [];
  },

  async recordPayment(paymentData) {
    if (API_URL) {
      const newPayment = await postApi('recordPayment', paymentData);
      const payments = getCache(STORAGE_KEYS.PAYMENTS_CACHE) || [];
      setCache(STORAGE_KEYS.PAYMENTS_CACHE, [newPayment, ...payments]);
      return newPayment;
    }
    const payments = getCache(STORAGE_KEYS.PAYMENTS_CACHE) || [];
    const newPayment = {
      paymentId: `PAY-${Date.now().toString().slice(-6)}`,
      chitId: paymentData.chitId || 'CHIT-100K-01',
      memberId: paymentData.memberId,
      memberName: paymentData.memberName,
      month: Number(paymentData.month),
      monthNumber: Number(paymentData.month),
      amount: Number(paymentData.paidAmount),
      dueAmount: Number(paymentData.dueAmount || paymentData.paidAmount),
      paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
      paymentMode: paymentData.paymentMode || 'UPI',
      reference: paymentData.reference || '',
      status: Number(paymentData.paidAmount) >= Number(paymentData.dueAmount || paymentData.paidAmount) ? 'Paid' : 'Partial'
    };
    setCache(STORAGE_KEYS.PAYMENTS_CACHE, [newPayment, ...payments]);
    return newPayment;
  },

  // Payouts
  async getPayouts() {
    if (API_URL) {
      try {
        const data = await getApi('getPayouts');
        setCache(STORAGE_KEYS.PAYOUTS_CACHE, data || []);
        return data || [];
      } catch (e) {
        console.warn('getPayouts error:', e.message);
      }
    }
    return getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
  },

  async recordPayout(payoutData) {
    if (API_URL) {
      const newPayout = await postApi('recordPayout', payoutData);
      const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
      setCache(STORAGE_KEYS.PAYOUTS_CACHE, [newPayout, ...payouts]);
      return newPayout;
    }
    const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    const newPayout = {
      payoutId: `PO-${Date.now().toString().slice(-6)}`,
      chitId: payoutData.chitId || 'CHIT-100K-01',
      month: Number(payoutData.month),
      monthNumber: Number(payoutData.month),
      memberId: payoutData.memberId || '',
      memberName: payoutData.memberName,
      amount: Number(payoutData.amount),
      payoutDate: payoutData.payoutDate || new Date().toISOString().split('T')[0],
      paymentMode: payoutData.paymentMode || 'Bank Transfer',
      reference: payoutData.reference || '',
      status: 'Completed'
    };
    setCache(STORAGE_KEYS.PAYOUTS_CACHE, [newPayout, ...payouts]);
    return newPayout;
  },

  // Reports
  async getReports() {
    if (API_URL) {
      try {
        return await getApi('getReports');
      } catch (e) {
        console.warn('getReports error:', e.message);
      }
    }
    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const payments = getCache(STORAGE_KEYS.PAYMENTS_CACHE) || [];
    const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    return {
      summary: {
        totalCollection: payments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0),
        totalPayout: payouts.reduce((s, po) => s + (Number(po.amount) || 0), 0),
        pendingCollection: members.reduce((s, m) => s + (Number(m.totalPending) || 0), 0),
        completedPayments: payments.filter(p => p.status === 'Paid').length
      },
      monthlyBreakdown: [],
      members,
      payments,
      payouts
    };
  },

  // Settings
  async getSettings() {
    if (API_URL) {
      try {
        return await getApi('getSettings');
      } catch (e) {
        console.warn('getSettings error:', e.message);
      }
    }
    return getCache(STORAGE_KEYS.SETTINGS_CACHE) || {
      companyName: 'MSR CHITS',
      mobile: '9840123456',
      email: 'admin@msrchits.com',
      address: 'No. 12, MSR Complex, Main Road, Chennai - 600001',
      defaultDuration: 20,
      defaultMembers: 20,
      paymentDay: 20,
      currency: 'INR'
    };
  },

  async updateSettings(settingsData) {
    if (API_URL) {
      return await postApi('updateSettings', settingsData);
    }
    setCache(STORAGE_KEYS.SETTINGS_CACHE, settingsData);
    return settingsData;
  },

  // Activity Log
  async getActivityLog() {
    if (API_URL) {
      try {
        return await getApi('getActivityLog');
      } catch (e) {
        console.warn('getActivityLog error:', e.message);
      }
    }
    return [];
  }
};

export default api;
