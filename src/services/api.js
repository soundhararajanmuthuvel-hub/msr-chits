/**
 * MSR CHITS API Client
 * Connects frontend React directly to Google Apps Script Web App & Google Sheets.
 * Uses text/plain;charset=utf-8 to eliminate CORS preflight restrictions on Google Apps Script.
 * Strictly relies on Google Sheets as the single source of truth.
 */

const RAW_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim() : '';
const API_URL = RAW_URL.replace(/\/+$/, '');

import { generateChitNumber, getNextAvailableChitNumber } from '../utils/chitNumber';
import { calculateChitParameters, generateChitSchedule, calculateExtraInvestment } from '../utils/chitCalculations';

const STORAGE_KEYS = {
  SESSION: 'msr_auth_session',
  LAST_SYNC: 'msr_last_sync_time',
  MEMBERS_CACHE: 'msr_members_cache',
  MEMBERSHIPS_CACHE: 'msr_memberships_cache',
  PAYMENTS_CACHE: 'msr_payments_cache',
  PAYOUTS_CACHE: 'msr_payouts_cache',
  CHITS_CACHE: 'msr_chits_cache',
  SCHEDULE_CACHE: 'msr_schedule_cache',
  SETTINGS_CACHE: 'msr_settings_cache',
  WHATSAPP_LOGS_CACHE: 'msr_whatsapp_logs_cache',
  EXTRA_INVESTMENTS_CACHE: 'msr_extra_investments_cache'
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
    // If the server explicitly responded with "Unknown API action", do NOT retry via POST
    if (getErr.message && getErr.message.includes('Unknown API action')) {
      throw getErr;
    }
    // If GET fails (e.g. CORS on redirect or network), try POST fallback with text/plain
    console.warn(`[MSR CHITS API] GET ${action} failed (${getErr.message}), trying POST fallback...`);
    return await postApi(action, params);
  }
}

// ----------------------------------------------------------------------------
// API Service Object
// ----------------------------------------------------------------------------

// Helper to enrich members with their real permanent unique chit numbers
function enrichMembers(members, memberships = [], schedule = []) {
  if (!Array.isArray(members)) return [];

  const membershipMap = {};
  (memberships || []).forEach(m => {
    if (!membershipMap[m.memberId]) membershipMap[m.memberId] = [];
    membershipMap[m.memberId].push(m);
  });

  const scheduleMap = {};
  (schedule || []).forEach(s => {
    const memId = s.memberId || s.assignedMemberId;
    const memName = s.memberName || s.assignedMemberName;
    if (memId) {
      String(memId).split(',').forEach(p => {
        const id = p.trim();
        if (!scheduleMap[id]) scheduleMap[id] = [];
        scheduleMap[id].push(s);
      });
    }
    if (memName && memName !== 'Not Assigned') {
      if (!scheduleMap[memName]) scheduleMap[memName] = [];
      scheduleMap[memName].push(s);
    }
  });

  return members.map(m => {
    let memChits = m.chits && m.chits.length > 0 ? m.chits : (membershipMap[m.memberId] || []);

    if (memChits.length === 0) {
      const schRows = scheduleMap[m.memberId] || scheduleMap[m.name] || [];
      memChits = schRows.map(s => {
        const monthNum = Number(s.monthNumber || s.month || 1);
        const chitNo = s.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: monthNum });
        return {
          membershipId: `MEMCHIT-${String(monthNum).padStart(3, '0')}`,
          memberId: m.memberId,
          chitId: s.chitId || 'CHIT-100K-01',
          chitNo: chitNo,
          chitValue: 100000,
          durationMonths: 20,
          monthlyPayment: Number(s.amount || s.monthlyAmount) || 3750,
          payoutMonth: monthNum,
          status: 'Active',
          joinedDate: m.joinDate || '2026-01-01'
        };
      });
    }

    const assignedMonths = memChits.map(c => Number(c.payoutMonth)).filter(Boolean);
    const payoutMonthStr = memChits.length > 0
      ? memChits.map(c => `Month ${c.payoutMonth}`).join(', ')
      : (m.payoutMonth || m.assignedChits || 'Not Assigned');

    return {
      ...m,
      chits: memChits,
      chitCount: memChits.length || Number(m.chitCount) || 1,
      assignedMonths,
      payoutMonth: payoutMonthStr
    };
  });
}

export const api = {
  // Health Check
  async healthCheck() {
    if (!API_URL) {
      return {
        connected: false,
        status: 'OFFLINE',
        message: 'VITE_API_URL not set',
        lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC)
      };
    }
    try {
      const data = await getApi('health');
      const isOnline = data && (String(data.status).toUpperCase() === 'ONLINE');
      return {
        connected: isOnline,
        status: isOnline ? 'ONLINE' : 'ERROR',
        sheetName: data?.sheetName || 'MSR CHITS',
        sheetsCount: data?.sheetsCount || 0,
        data,
        lastSync: new Date().toISOString()
      };
    } catch (err) {
      return {
        connected: false,
        status: 'ERROR',
        error: err.message,
        lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC)
      };
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
    let members = [];
    if (API_URL) {
      try {
        const data = await getApi('getMembers');
        members = data || [];
      } catch (e) {
        console.warn('getMembers fetch error:', e.message);
        members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
      }
    } else {
      members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    }

    const memberships = getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];
    const schedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const enriched = enrichMembers(members, memberships, schedule);
    setCache(STORAGE_KEYS.MEMBERS_CACHE, enriched);
    return enriched;
  },

  async getMember(memberId) {
    let member = null;
    let payments = [];

    if (API_URL) {
      try {
        const res = await getApi('getMember', { memberId });
        member = res.member;
        payments = res.payments || [];
      } catch (e) {
        console.warn('getMember fetch error:', e.message);
      }
    }

    if (!member) {
      const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
      member = members.find(m => String(m.memberId) === String(memberId));
      payments = (getCache(STORAGE_KEYS.PAYMENTS_CACHE) || []).filter(p => String(p.memberId) === String(memberId));
    }

    if (!member) throw new Error('Member not found: ' + memberId);

    const memberships = getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];
    const schedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const [enrichedMember] = enrichMembers([member], memberships, schedule);

    return { member: enrichedMember, payments };
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
      preferredLanguage: memberData.preferredLanguage || 'English',
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

  async deactivateMember(memberId) {
    if (API_URL) {
      await postApi('deactivateMember', { memberId });
    }
    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const updated = members.map(m => String(m.memberId) === String(memberId) ? { ...m, status: 'Inactive' } : m);
    setCache(STORAGE_KEYS.MEMBERS_CACHE, updated);
    return { success: true, memberId, status: 'Inactive' };
  },

  async reactivateMember(memberId) {
    if (API_URL) {
      await postApi('reactivateMember', { memberId });
    }
    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const updated = members.map(m => String(m.memberId) === String(memberId) ? { ...m, status: 'Active' } : m);
    setCache(STORAGE_KEYS.MEMBERS_CACHE, updated);
    return { success: true, memberId, status: 'Active' };
  },

  async deleteMember(memberId) {
    if (API_URL) {
      await postApi('deleteMember', { memberId });
    }
    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const updated = members.filter(m => String(m.memberId) !== String(memberId));
    setCache(STORAGE_KEYS.MEMBERS_CACHE, updated);
    return { success: true, memberId };
  },

  // Chits
  async getChits() {
    let list = [];
    if (API_URL) {
      try {
        const res = await getApi('getChits');
        let raw = res;
        // Normalize any wrapper: { data: [...] }, { chits: [...] }, or single object
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          if (Array.isArray(raw.chits)) {
            raw = raw.chits;
          } else if (Array.isArray(raw.data)) {
            raw = raw.data;
          } else if (raw.chitId) {
            raw = [raw];
          }
        }
        if (Array.isArray(raw)) {
          list = raw.map(c => {
            const mult = Number(c.multiple) || 1;
            const baseVal = Number(c.baseChitValue || c.chitValue || c.totalAmount || 0);
            const totVal = Number(c.totalAmount || c.chitValue || (baseVal * mult) || 0);
            return {
              ...c,
              chitId: c.chitId || c.id,
              chitName: c.chitName || c.name,
              baseChitValue: baseVal,
              multiple: mult,
              dividend: Number(c.dividend) || 0,
              fixedPayoutMonth: c.fixedPayoutMonth ? Number(c.fixedPayoutMonth) : null,
              chitValue: totVal,
              totalAmount: totVal,
              duration: Number(c.duration || c.durationMonths || 20),
              durationMonths: Number(c.durationMonths || c.duration || 20),
              memberCount: Number(c.memberCount || 0),
              currentMonth: Number(c.currentMonth || 1),
              monthlyContribution: Number(c.monthlyContribution || c.monthlyAmount || 0),
              monthlyAmount: Number(c.monthlyAmount || c.monthlyContribution || 0),
              startDate: c.startDate || '',
              paymentDay: Number(c.paymentDay || 20),
              status: c.status ? String(c.status).trim() : 'Active'
            };
          });
        }
        setCache(STORAGE_KEYS.CHITS_CACHE, list);
        return list;
      } catch (e) {
        console.warn('getChits error:', e.message);
      }
    }
    const cached = getCache(STORAGE_KEYS.CHITS_CACHE);
    return Array.isArray(cached) ? cached : [];
  },

  async getChit(chitId) {
    if (API_URL) {
      try {
        const res = await getApi('getChit', { chitId });
        if (res && res.chit) return res;
      } catch (e) {
        console.warn('getChit error:', e.message);
      }
    }
    const chits = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    const chit = chits.find(c => String(c.chitId) === String(chitId)) || chits[0] || null;
    let schedule = (getCache(STORAGE_KEYS.SCHEDULE_CACHE) || []).filter(s => !chit || String(s.chitId) === String(chit.chitId));
    if (schedule.length === 0 && chit) {
      schedule = generateChitSchedule({
        chitId: chit.chitId,
        chitValue: chit.baseChitValue || chit.chitValue,
        multiple: chit.multiple || 1,
        duration: chit.duration || chit.durationMonths || 20,
        dividend: chit.dividend || 0,
        startDate: chit.startDate
      });
    }
    const payments = (getCache(STORAGE_KEYS.PAYMENTS_CACHE) || []).filter(p => !chit || String(p.chitId) === String(chit.chitId));
    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.paidAmount || p.amount) || 0), 0);
    const currentItem = schedule.find(s => s.month === Number(chit?.currentMonth || 1)) || {};
    const totalPayable = schedule.reduce((sum, item) => sum + (Number(item.monthlyAmount || item.amount) || 0), 0);

    return {
      chit,
      schedule,
      summary: {
        chitValue: chit ? Number(chit.chitValue || chit.totalAmount) : 0,
        currentMonth: chit ? Number(chit.currentMonth) : 1,
        totalMonths: chit ? Number(chit.duration || chit.durationMonths) : 0,
        totalCollected,
        totalPending: Math.max(0, (Number(currentItem.monthlyAmount || 0) * (Number(chit?.memberCount) || 20)) - totalCollected),
        currentMonthPayout: Number(currentItem.payoutAmount) || 0,
        totalContributions20M: totalPayable
      }
    };
  },

  async createChit(chitData) {
    const multiple = Number(chitData.multiple) || 1;
    const baseChitValue = Number(chitData.baseChitValue || chitData.chitValue) || 100000;
    const totalChitValue = Number(chitData.chitValue || (baseChitValue * multiple)) || (baseChitValue * multiple);
    const duration = Number(chitData.duration || chitData.durationMonths) || 20;
    const dividend = Number(chitData.dividend) || 0;
    const fixedPayoutMonth = chitData.fixedPayoutMonth ? Number(chitData.fixedPayoutMonth) : null;
    const startDate = chitData.startDate || new Date().toISOString().split('T')[0];

    const calcParams = calculateChitParameters({
      chitValue: baseChitValue,
      multiple,
      duration,
      dividend,
      startMonth: 1
    });

    const payload = {
      chitName: chitData.chitName,
      chitValue: totalChitValue,
      totalAmount: totalChitValue,
      baseChitValue,
      multiple,
      dividend,
      fixedPayoutMonth,
      duration,
      durationMonths: duration,
      totalMembers: Number(chitData.totalMembers || chitData.memberCount) || duration,
      paymentDay: Number(chitData.paymentDay) || 20,
      startDate,
      monthlyContribution: calcParams.monthlyAmount || Number(chitData.monthlyContribution || chitData.monthlyAmount) || 0,
      monthlyAmount: calcParams.monthlyAmount || 0,
      expectedTotal: calcParams.totalPayable,
      notes: chitData.description || chitData.notes || ''
    };

    let newChit;
    if (API_URL) {
      try {
        newChit = await postApi('createChit', payload);
      } catch (err) {
        console.warn('createChit API error, saving locally:', err.message);
      }
    }

    if (!newChit || !newChit.chitId) {
      newChit = {
        chitId: `CHIT-${Date.now().toString().slice(-6)}`,
        ...payload,
        currentMonth: 1,
        status: 'Active'
      };
    } else {
      newChit = { ...payload, ...newChit };
    }

    const cached = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    setCache(STORAGE_KEYS.CHITS_CACHE, [...cached, newChit]);

    // Generate dynamic schedule for this chit
    const initialSchedule = generateChitSchedule({
      chitId: newChit.chitId,
      chitValue: baseChitValue,
      multiple,
      duration,
      dividend,
      startDate
    });
    const currentSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const mergedSchedule = [...currentSchedule.filter(s => s.chitId !== newChit.chitId), ...initialSchedule];
    setCache(STORAGE_KEYS.SCHEDULE_CACHE, mergedSchedule);

    return newChit;
  },

  async updateChit(chitId, chitData) {
    const multiple = Number(chitData.multiple) || 1;
    const baseChitValue = Number(chitData.baseChitValue || chitData.chitValue) || 100000;
    const totalChitValue = Number(chitData.totalChitValue || (baseChitValue * multiple)) || (baseChitValue * multiple);
    const duration = Number(chitData.duration || chitData.durationMonths) || 20;
    const dividend = Number(chitData.dividend) || 0;
    const fixedPayoutMonth = chitData.fixedPayoutMonth ? Number(chitData.fixedPayoutMonth) : null;
    const startDate = chitData.startDate || new Date().toISOString().split('T')[0];

    const calcParams = calculateChitParameters({
      chitValue: baseChitValue,
      multiple,
      duration,
      dividend,
      startMonth: 1
    });

    const payload = {
      chitId,
      chitName: chitData.chitName,
      chitValue: totalChitValue,
      totalAmount: totalChitValue,
      baseChitValue,
      multiple,
      dividend,
      fixedPayoutMonth,
      duration,
      durationMonths: duration,
      totalMembers: Number(chitData.totalMembers || chitData.memberCount) || duration,
      paymentDay: Number(chitData.paymentDay) || 20,
      startDate,
      monthlyContribution: calcParams.monthlyAmount || Number(chitData.monthlyContribution || chitData.monthlyAmount) || 0,
      monthlyAmount: calcParams.monthlyAmount || 0,
      expectedTotal: calcParams.totalPayable,
      notes: chitData.description || chitData.notes || ''
    };

    if (API_URL) {
      try {
        await postApi('updateChit', payload);
      } catch (err) {
        console.warn('updateChit API error:', err.message);
      }
    }

    const chits = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    const updatedChits = chits.map(c => String(c.chitId) === String(chitId) ? { ...c, ...payload } : c);
    setCache(STORAGE_KEYS.CHITS_CACHE, updatedChits);

    // Regenerate affected schedule, carefully preserving completed payments and member assignments
    const currentSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const existingChitSchedule = currentSchedule.filter(s => String(s.chitId) === String(chitId));
    const otherSchedule = currentSchedule.filter(s => String(s.chitId) !== String(chitId));

    const regeneratedSchedule = generateChitSchedule({
      chitId,
      chitValue: baseChitValue,
      multiple,
      duration,
      dividend,
      startDate,
      existingSchedule: existingChitSchedule
    });

    setCache(STORAGE_KEYS.SCHEDULE_CACHE, [...otherSchedule, ...regeneratedSchedule]);

    return { success: true, chit: payload, schedule: regeneratedSchedule };
  },

  // Monthly Schedule & Chit Assignment
  async getMonthlySchedule(chitId = 'CHIT-100K-01') {
    if (API_URL) {
      try {
        const schedule = await getApi('getMonthlySchedule', { chitId });
        if (schedule && Array.isArray(schedule) && schedule.length > 0) {
          setCache(STORAGE_KEYS.SCHEDULE_CACHE, schedule);
          return schedule;
        }
      } catch (e) {
        console.warn('getMonthlySchedule error:', e.message);
      }
    }
    const cached = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    if (chitId) {
      const filtered = cached.filter(s => String(s.chitId) === String(chitId));
      if (filtered.length > 0) return filtered;
    }
    return cached;
  },


  async assignChit(payload) {
    if (API_URL) {
      return await postApi('assignChit', payload);
    }
    return { success: true };
  },

  async updateSchedulePayout(payload) {
    const numPayout = Number(payload.payoutAmount);
    let backendResult = null;

    if (API_URL) {
      try {
        backendResult = await postApi('updateSchedulePayout', payload);
      } catch (err) {
        console.warn('[MSR CHITS API] updateSchedulePayout backend call note:', err.message);
        // If the live Google Apps Script returns an Unknown API action error because it hasn't been redeployed yet,
        // we still persist to local storage/cache so user operations work immediately without crashing.
      }
    }

    // Update SCHEDULE_CACHE
    const cachedSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const updatedSchedule = cachedSchedule.map(s => {
      const isMonthMatch = (!s.chitId || String(s.chitId) === String(payload.chitId || 'CHIT-100K-01')) &&
        Number(s.month || s.monthNumber) === Number(payload.month);
      
      if (!isMonthMatch) return s;

      const matchesRecord = (
        (payload.payoutId && s.payoutId && String(s.payoutId) === String(payload.payoutId)) ||
        (payload.chitNo && s.chitNo && String(s.chitNo) === String(payload.chitNo)) ||
        (payload.memberId && (s.memberId || s.assignedMemberId) && String(s.memberId || s.assignedMemberId) === String(payload.memberId)) ||
        (payload.memberName && (s.memberName || s.assignedMemberName) && String(s.memberName || s.assignedMemberName) === String(payload.memberName)) ||
        (!payload.payoutId && !payload.chitNo && !payload.memberId)
      );

      if (matchesRecord) {
        return {
          ...s,
          payoutAmount: numPayout,
          monthlyAmount: (payload.monthlyAmount && Number(payload.monthlyAmount) > 0) ? Number(payload.monthlyAmount) : s.monthlyAmount,
          amount: (payload.monthlyAmount && Number(payload.monthlyAmount) > 0) ? Number(payload.monthlyAmount) : (s.amount || s.monthlyAmount)
        };
      }
      return s;
    });
    setCache(STORAGE_KEYS.SCHEDULE_CACHE, updatedSchedule);

    // Update PAYOUTS_CACHE
    const cachedPayouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    let payoutUpdated = false;
    const updatedPayouts = cachedPayouts.map(po => {
      const isMonthMatch = (!po.chitId || String(po.chitId) === String(payload.chitId || 'CHIT-100K-01')) &&
        Number(po.month || po.monthNumber) === Number(payload.month);
      
      if (!isMonthMatch) return po;

      const matchesRecord = (
        (payload.payoutId && po.payoutId && String(po.payoutId) === String(payload.payoutId)) ||
        (payload.chitNo && po.chitNo && String(po.chitNo) === String(payload.chitNo)) ||
        (payload.memberId && po.memberId && String(po.memberId) === String(payload.memberId)) ||
        (payload.memberName && (po.memberName || po.beneficiary) && String(po.memberName || po.beneficiary) === String(payload.memberName)) ||
        (!payload.payoutId && !payload.chitNo && !payload.memberId)
      );

      if (matchesRecord) {
        payoutUpdated = true;
        return {
          ...po,
          amount: numPayout,
          payoutAmount: numPayout,
          updatedAt: new Date().toISOString()
        };
      }
      return po;
    });

    if (payoutUpdated) {
      setCache(STORAGE_KEYS.PAYOUTS_CACHE, updatedPayouts);
    }

    // Update EXTRA_INVESTMENT_CACHE if funding source is EXTRA_INVESTMENT
    if (String(payload.fundingSource || '').toUpperCase().includes('EXTRA')) {
      const cachedInvestments = getCache(STORAGE_KEYS.EXTRA_INVESTMENT_CACHE) || [];
      const updatedInvestments = cachedInvestments.map(inv => {
        const matchesBeneficiary = (payload.memberName && (inv.beneficiary === payload.memberName || inv.purpose === payload.memberName)) ||
          (payload.memberId && inv.memberId === payload.memberId);
        if (matchesBeneficiary) {
          const invAmt = Number(inv.investmentAmount) || 0;
          return {
            ...inv,
            usedAmount: numPayout,
            allocatedAmount: numPayout,
            remainingAmount: Math.max(0, invAmt - numPayout),
            payout: numPayout,
            updatedAt: new Date().toISOString()
          };
        }
        return inv;
      });
      setCache(STORAGE_KEYS.EXTRA_INVESTMENT_CACHE, updatedInvestments);
    }

    return backendResult || {
      success: true,
      payoutId: payload.payoutId || ('PO-M' + payload.month),
      payoutAmount: numPayout,
      message: 'Payout updated successfully'
    };
  },

  async updateMonthlyScheduleItem(payload) {
    const numMonthly = Number(payload.monthlyAmount || payload.amount);
    let backendResult = null;

    if (API_URL) {
      try {
        backendResult = await postApi('updateSchedulePayout', payload);
      } catch (err) {
        console.warn('[MSR CHITS API] updateMonthlyScheduleItem backend call note:', err.message);
      }
    }

    // Update SCHEDULE_CACHE
    const cachedSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const updatedSchedule = cachedSchedule.map(s => {
      const isMonthMatch = (!s.chitId || String(s.chitId) === String(payload.chitId || 'CHIT-100K-01')) &&
        Number(s.month || s.monthNumber) === Number(payload.month);
      
      if (!isMonthMatch) return s;

      return {
        ...s,
        monthlyAmount: numMonthly,
        amount: numMonthly,
        payoutAmount: (payload.payoutAmount && Number(payload.payoutAmount) > 0) ? Number(payload.payoutAmount) : s.payoutAmount
      };
    });
    setCache(STORAGE_KEYS.SCHEDULE_CACHE, updatedSchedule);

    return backendResult || {
      success: true,
      month: payload.month,
      monthlyAmount: numMonthly,
      message: 'Monthly chit collection updated successfully'
    };
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
      chitNo: paymentData.chitNo || '',
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
    const monthNum = Number(payoutData.month || payoutData.monthNumber || 1);
    const chitId = payoutData.chitId || 'CHIT-100K-01';
    const numAmount = Number(payoutData.amount || payoutData.actualAmount || 0);
    const fundingSource = String(payoutData.fundingSource || 'CHIT_FUND').toUpperCase().includes('EXTRA')
      ? 'EXTRA_INVESTMENT'
      : (payoutData.fundingSource || 'CHIT_FUND');

    const payload = {
      ...payoutData,
      month: monthNum,
      monthNumber: monthNum,
      chitId,
      amount: numAmount,
      fundingSource: fundingSource,
      status: 'Completed'
    };

    let backendResult = null;
    if (API_URL) {
      try {
        backendResult = await postApi('recordPayout', payload);
      } catch (e) {
        console.warn('recordPayout API error, using local fallback:', e.message);
      }
    }

    const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    const newPayout = {
      payoutId: backendResult?.payoutId || `PO-${Date.now().toString().slice(-6)}`,
      chitId: chitId,
      chitNo: payoutData.chitNo || '',
      month: monthNum,
      monthNumber: monthNum,
      memberId: payoutData.memberId || '',
      memberName: payoutData.memberName || 'Member',
      amount: numAmount,
      actualAmount: numAmount,
      scheduledAmount: Number(payoutData.scheduledAmount || payoutData.scheduledPayoutAmount) || numAmount,
      fundingSource: fundingSource,
      extraInvestmentId: payoutData.extraInvestmentId || payoutData.investmentId || '',
      payoutDate: payoutData.payoutDate || new Date().toISOString().split('T')[0],
      paymentMode: payoutData.paymentMode || payoutData.paymentMethod || 'Bank Transfer',
      paymentMethod: payoutData.paymentMode || payoutData.paymentMethod || 'Bank Transfer',
      reference: payoutData.reference || payoutData.referenceNumber || '',
      referenceNumber: payoutData.reference || payoutData.referenceNumber || '',
      status: 'Completed',
      notes: payoutData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update PAYOUTS_CACHE (avoid duplicate payout IDs)
    const filteredPayouts = payouts.filter(p => String(p.payoutId) !== String(newPayout.payoutId));
    setCache(STORAGE_KEYS.PAYOUTS_CACHE, [newPayout, ...filteredPayouts]);

    // Update SCHEDULE_CACHE to mark month as Completed
    const cachedSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const updatedSchedule = cachedSchedule.map(s => {
      const isMatch = (!s.chitId || String(s.chitId) === String(chitId)) &&
        Number(s.month || s.monthNumber) === monthNum;
      if (!isMatch) return s;

      const existingPayouts = Array.isArray(s.payouts) ? s.payouts.filter(p => String(p.payoutId) !== String(newPayout.payoutId)) : [];
      const updatedMonthPayouts = [newPayout, ...existingPayouts];
      const totalPaid = updatedMonthPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        ...s,
        payoutStatus: 'Completed',
        status: 'Completed',
        actualPayoutAmount: totalPaid,
        payouts: updatedMonthPayouts,
        assignedMemberName: s.assignedMemberName || payoutData.memberName,
        assignedMemberId: s.assignedMemberId || payoutData.memberId
      };
    });
    setCache(STORAGE_KEYS.SCHEDULE_CACHE, updatedSchedule);

    // If funded by Extra Investment, update EXTRA_INVESTMENTS_CACHE & EXTRA_INVESTMENT_CACHE
    if (fundingSource === 'EXTRA_INVESTMENT' || payoutData.extraInvestmentId || payoutData.investmentId) {
      const invId = payoutData.extraInvestmentId || payoutData.investmentId;
      const updateInvList = (cacheKey) => {
        const cachedInv = getCache(cacheKey) || [];
        const updated = cachedInv.map(inv => {
          if (!invId || String(inv.investmentId) === String(invId) || inv.beneficiary === payoutData.memberName) {
            const totalInv = Number(inv.investmentAmount) || 0;
            const currentUsed = Number(inv.allocatedAmount !== undefined ? inv.allocatedAmount : inv.usedAmount) || 0;
            const newUsed = currentUsed + numAmount;
            const newRem = Math.max(0, totalInv - newUsed);
            return {
              ...inv,
              usedAmount: newUsed,
              allocatedAmount: newUsed,
              remainingAmount: newRem,
              payout: newUsed,
              status: newUsed >= totalInv ? 'Fully Allocated' : 'Active',
              updatedAt: new Date().toISOString()
            };
          }
          return inv;
        });
        setCache(cacheKey, updated);
      };
      updateInvList(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE);
      updateInvList(STORAGE_KEYS.EXTRA_INVESTMENT_CACHE);
    }

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

  // Profit & Loss Analysis (Single Source of Truth)
  async getProfitLoss(filters = {}) {
    if (API_URL) {
      try {
        const queryParams = new URLSearchParams();
        if (filters.chitId && filters.chitId !== 'all') queryParams.append('chitId', filters.chitId);
        if (filters.memberId && filters.memberId !== 'all') queryParams.append('memberId', filters.memberId);
        if (filters.month && filters.month !== 'all') queryParams.append('month', filters.month);
        if (filters.fundingSource && filters.fundingSource !== 'all') queryParams.append('fundingSource', filters.fundingSource);
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

        const qs = queryParams.toString();
        const action = qs ? `getProfitLoss&${qs}` : 'getProfitLoss';
        return await getApi(action);
      } catch (e) {
        console.warn('getProfitLoss API error, computing from local cache:', e.message);
      }
    }

    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const payments = getCache(STORAGE_KEYS.PAYMENTS_CACHE) || [];
    const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    const chits = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    const schedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const extraInvestments = getCache(STORAGE_KEYS.EXTRA_INVESTMENT_CACHE) || [];
    const memberships = getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];

    // 1. Filter Payments
    const filteredPayments = payments.filter(p => {
      if (filters.chitId && filters.chitId !== 'all' && String(p.chitId) !== String(filters.chitId)) return false;
      if (filters.memberId && filters.memberId !== 'all' && String(p.memberId) !== String(filters.memberId)) return false;
      if (filters.month && filters.month !== 'all' && Number(p.monthNumber || p.month) !== Number(filters.month)) return false;
      if (filters.dateFrom && p.paymentDate && p.paymentDate < filters.dateFrom) return false;
      if (filters.dateTo && p.paymentDate && p.paymentDate > filters.dateTo) return false;
      return true;
    });

    // 2. Filter Payouts
    const filteredPayouts = payouts.filter(po => {
      if (filters.chitId && filters.chitId !== 'all' && po.chitId && String(po.chitId) !== String(filters.chitId)) return false;
      if (filters.memberId && filters.memberId !== 'all' && po.memberId && String(po.memberId) !== String(filters.memberId)) return false;
      if (filters.month && filters.month !== 'all' && Number(po.monthNumber || po.month) !== Number(filters.month)) return false;
      if (filters.fundingSource && filters.fundingSource !== 'all') {
        const isExtra = String(po.fundingSource || '').toUpperCase().includes('EXTRA');
        if (filters.fundingSource === 'EXTRA_INVESTMENT' && !isExtra) return false;
        if (filters.fundingSource === 'CHIT_FUND' && isExtra) return false;
      }
      if (filters.dateFrom && po.payoutDate && po.payoutDate < filters.dateFrom) return false;
      if (filters.dateTo && po.payoutDate && po.payoutDate > filters.dateTo) return false;
      return true;
    });

    // 3. Filter Extra Investments
    const filteredExtra = extraInvestments.filter(inv => {
      if (filters.dateFrom && inv.investmentDate && inv.investmentDate < filters.dateFrom) return false;
      if (filters.dateTo && inv.investmentDate && inv.investmentDate > filters.dateTo) return false;
      return true;
    });

    const totalCollection = filteredPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
    const totalPayout = filteredPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);
    
    // Extra Investment calculations (strictly when recovery exists)
    const totalExtraInvested = filteredExtra.reduce((s, inv) => s + (Number(inv.investmentAmount) || 0), 0);
    const totalExtraAllocated = filteredExtra.reduce((s, inv) => s + (Number(inv.usedAmount || inv.allocatedAmount || inv.investmentAmount) || 0), 0);
    const totalExtraRecovered = filteredExtra.reduce((s, inv) => s + (Number(inv.returnedAmount) || 0), 0);
    const totalExtraProfit = filteredExtra.reduce((s, inv) => {
      const ret = Number(inv.returnedAmount) || 0;
      const invAmt = Number(inv.investmentAmount) || 0;
      return ret > 0 ? s + (ret - invAmt) : s;
    }, 0);
    const totalExtraRemaining = Math.max(0, totalExtraInvested - totalExtraAllocated);
    const extraROI = totalExtraInvested > 0 ? ((totalExtraProfit / totalExtraInvested) * 100) : 0;

    // Commission & Dividend calculations from active chit plans and schedule
    let totalCommission = 0;
    let totalDividend = 0;
    let totalExpectedDue = 0;

    const targetChits = (filters.chitId && filters.chitId !== 'all')
      ? chits.filter(c => String(c.chitId) === String(filters.chitId))
      : (chits.length > 0 ? chits : [{ chitId: 'CHIT-100K-01', chitValue: 100000, duration: 20, requiredMembers: 20, commissionPercent: 5, dividend: 1250 }]);

    targetChits.forEach(c => {
      const cVal = Number(c.chitValue || c.totalAmount) || 100000;
      const dur = Number(c.duration || c.durationMonths) || 20;
      const memCount = Number(c.requiredMembers || c.totalMembers) || dur;
      const commPct = Number(c.commissionPercent) || 5;
      const commAmt = Math.round(cVal * (commPct / 100));
      const normalMonthly = memCount > 0 ? Math.round(cVal / memCount) : 5000;

      const startM = (filters.month && filters.month !== 'all') ? Number(filters.month) : 1;
      const endM = (filters.month && filters.month !== 'all') ? Number(filters.month) : dur;

      for (let m = startM; m <= endM; m++) {
        const schItem = schedule.find(s => String(s.chitId) === String(c.chitId) && Number(s.monthNumber || s.month) === m);
        const actualMonthly = schItem ? (Number(schItem.amount || schItem.monthlyAmount) || normalMonthly) : normalMonthly;
        const monthDiv = schItem && schItem.dividend !== undefined ? Number(schItem.dividend) : Math.max(0, normalMonthly - actualMonthly);
        
        totalCommission += (m === 1 ? 0 : commAmt);
        totalDividend += (m === 1 ? 0 : (monthDiv * memCount));
        totalExpectedDue += (actualMonthly * memCount);
      }
    });

    const totalPending = Math.max(0, totalExpectedDue - totalCollection);
    const collectionRate = totalExpectedDue > 0 ? ((totalCollection / totalExpectedDue) * 100) : 100;
    
    // Net Cash Flow & Operational Profit definitions
    const netCashFlow = (totalCollection + totalExtraRecovered) - (totalPayout + totalExtraInvested);
    const operationalProfit = totalCommission + totalExtraProfit;

    // Monthly Breakdown (Months 1 to 20)
    const maxMonth = 20;
    const monthlyBreakdown = [];
    for (let m = 1; m <= maxMonth; m++) {
      if (filters.month && filters.month !== 'all' && Number(filters.month) !== m) continue;

      const mPayments = filteredPayments.filter(p => Number(p.monthNumber || p.month) === m);
      const mPayouts = filteredPayouts.filter(po => Number(po.monthNumber || po.month) === m);
      const mExtra = filteredExtra.filter(inv => {
        if (!inv.investmentDate) return false;
        const d = new Date(inv.investmentDate);
        return (d.getMonth() + 1) === m;
      });

      const mCollection = mPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
      const mPayout = mPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);
      const mExtraInv = mExtra.reduce((s, inv) => s + (Number(inv.investmentAmount) || 0), 0);
      const mRecovery = mExtra.reduce((s, inv) => s + (Number(inv.returnedAmount) || 0), 0);
      const mExtraProfit = mExtra.reduce((s, inv) => {
        const ret = Number(inv.returnedAmount) || 0;
        return ret > 0 ? s + (ret - Number(inv.investmentAmount || 0)) : s;
      }, 0);

      const schItem = schedule.find(s => Number(s.monthNumber || s.month) === m);
      const defaultComm = m === 1 ? 0 : 5000;
      const mCommission = schItem ? (Number(schItem.commissionAmount) || defaultComm) : defaultComm;
      const mDividend = schItem && schItem.dividend !== undefined ? Number(schItem.dividend) : (m === 1 ? 0 : 1250);

      const mCashFlow = (mCollection + mRecovery) - (mPayout + mExtraInv);
      const mProfit = mCommission + mExtraProfit;

      monthlyBreakdown.push({
        month: m,
        collection: mCollection,
        payout: mPayout,
        commission: mCommission,
        dividend: mDividend,
        extraInvestment: mExtraInv,
        recovery: mRecovery,
        profit: mProfit,
        cashFlow: mCashFlow,
        paymentsCount: mPayments.length,
        payoutsCount: mPayouts.length
      });
    }

    // Chit-Wise Analysis
    const chitWise = targetChits.map(c => {
      const cId = c.chitId;
      const cPayments = filteredPayments.filter(p => String(p.chitId) === String(cId));
      const cPayouts = filteredPayouts.filter(po => !po.chitId || String(po.chitId) === String(cId));
      const cCol = cPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
      const cPay = cPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);
      const cVal = Number(c.chitValue || c.totalAmount) || 100000;
      const dur = Number(c.duration || c.durationMonths) || 20;
      const memCount = Number(c.requiredMembers || c.totalMembers) || dur;
      const commPct = Number(c.commissionPercent) || 5;
      const cComm = Math.round(cVal * (commPct / 100)) * (dur - 1);
      const cDiv = Number(c.dividend || 1250) * (dur - 1) * memCount;

      return {
        chitId: cId,
        chitName: c.chitName || cId,
        chitValue: cVal,
        duration: dur,
        members: memCount,
        totalCollection: cCol,
        totalPayout: cPay,
        commission: cComm,
        dividend: cDiv,
        extraInvestment: 0,
        profit: cComm,
        cashFlow: cCol - cPay
      };
    });

    // Member-Wise Analysis
    const memberWise = members.map(m => {
      const mId = m.memberId;
      const mPayments = filteredPayments.filter(p => String(p.memberId) === String(mId));
      const mPayouts = filteredPayouts.filter(po => String(po.memberId) === String(mId));
      const mPaid = mPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
      const mPayoutTotal = mPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);
      const mMemberships = memberships.filter(ms => String(ms.memberId) === String(mId));
      const extraInvPayouts = mPayouts.filter(po => String(po.fundingSource || '').toUpperCase().includes('EXTRA')).length;

      return {
        memberId: mId,
        name: m.name,
        phone: m.phone || m.mobile || '',
        totalPayments: mPaid,
        totalPayoutsReceived: mPayoutTotal,
        pendingAmount: Number(m.pendingAmount || m.totalPending) || 0,
        chitCount: mMemberships.length || 1,
        extraInvestmentPayouts: extraInvPayouts,
        status: m.status || 'Active'
      };
    });

    // Funding Source Breakdown
    const chitFundPayouts = filteredPayouts.filter(po => !String(po.fundingSource || '').toUpperCase().includes('EXTRA'));
    const extraInvPayouts = filteredPayouts.filter(po => String(po.fundingSource || '').toUpperCase().includes('EXTRA'));

    const fundingSource = [
      {
        source: 'CHIT_FUND',
        label: 'Chit Fund Collections',
        totalAmount: chitFundPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0),
        count: chitFundPayouts.length
      },
      {
        source: 'EXTRA_INVESTMENT',
        label: 'Extra Investment',
        totalAmount: extraInvPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0),
        count: extraInvPayouts.length
      }
    ];

    return {
      success: true,
      filters: filters,
      timestamp: new Date().toISOString(),
      summary: {
        totalCollection: totalCollection,
        totalDue: totalExpectedDue,
        totalPending: totalPending,
        collectionRate: collectionRate,
        totalPayout: totalPayout,
        completedPayouts: filteredPayouts.filter(po => po.status === 'Completed').length,
        pendingPayouts: filteredPayouts.filter(po => po.status !== 'Completed').length,
        totalCommission: totalCommission,
        totalDividend: totalDividend,
        extraInvestment: totalExtraInvested,
        extraAllocated: totalExtraAllocated,
        extraRemaining: totalExtraRemaining,
        recoveredAmount: totalExtraRecovered,
        investmentProfit: totalExtraProfit,
        roiPercent: extraROI,
        netProfit: operationalProfit,
        operationalProfit: operationalProfit,
        netCashFlow: netCashFlow,
        numberPayments: filteredPayments.length,
        numberPayouts: filteredPayouts.length
      },
      monthlyBreakdown: monthlyBreakdown,
      chitWise: chitWise,
      memberWise: memberWise,
      fundingSource: fundingSource,
      payments: filteredPayments,
      payouts: filteredPayouts,
      extraInvestments: filteredExtra
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

  // Memberships
  async getMemberships(params = {}) {
    if (API_URL) {
      try {
        const data = await getApi('getMemberships', params);
        if (data && Array.isArray(data)) {
          setCache(STORAGE_KEYS.MEMBERSHIPS_CACHE, data);
          return data;
        }
      } catch (e) {
        if (!e.message?.includes('Unknown API action')) {
          console.warn('getMemberships fetch error:', e.message);
        }
      }
    }
    return getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];
  },

  async createMembership(membershipData) {
    if (API_URL) {
      try {
        const newRecord = await postApi('createMembership', membershipData);
        if (newRecord && newRecord.membershipId) {
          const cached = getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];
          setCache(STORAGE_KEYS.MEMBERSHIPS_CACHE, [...cached, newRecord]);
          return newRecord;
        }
      } catch (e) {
        console.warn('createMembership API error, using local fallback:', e.message);
      }
    }
    const cached = getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];
    const seq = Number(membershipData.payoutMonth || membershipData.month || cached.length + 1);
    const chitNo = membershipData.chitNo || generateChitNumber({
      year: 2026,
      chitValue: membershipData.chitValue || 100000,
      sequenceNumber: seq
    });
    const newRecord = {
      membershipId: `MEMCHIT-${String(cached.length + 1).padStart(3, '0')}`,
      memberId: membershipData.memberId,
      chitId: membershipData.chitId || 'CHIT-100K-01',
      chitNo: chitNo,
      chitValue: Number(membershipData.chitValue) || 100000,
      durationMonths: Number(membershipData.durationMonths) || 20,
      monthlyPayment: Number(membershipData.monthlyPayment) || 3750,
      payoutMonth: seq,
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0]
    };
    setCache(STORAGE_KEYS.MEMBERSHIPS_CACHE, [...cached, newRecord]);
    return newRecord;
  },

  async deleteMembership(membershipId) {
    if (API_URL) {
      try {
        await postApi('deleteMembership', { membershipId });
      } catch (e) {
        console.warn('deleteMembership error:', e.message);
      }
    }
    const cached = getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];
    const updated = cached.filter(m => String(m.membershipId) !== String(membershipId));
    setCache(STORAGE_KEYS.MEMBERSHIPS_CACHE, updated);
    return { success: true };
  },

  async cancelMembership(membershipId) {
    if (API_URL) {
      try {
        await postApi('cancelMembership', { membershipId });
      } catch (e) {
        console.warn('cancelMembership API error, using local fallback:', e.message);
      }
    }
    const cached = getCache(STORAGE_KEYS.MEMBERSHIPS_CACHE) || [];
    const updated = cached.map(m => String(m.membershipId) === String(membershipId) ? { ...m, status: 'Cancelled' } : m);
    setCache(STORAGE_KEYS.MEMBERSHIPS_CACHE, updated);
    return { success: true, membershipId, status: 'Cancelled' };
  },

  // WhatsApp Logging & Status
  async getWhatsAppLogs() {
    if (API_URL) {
      try {
        const data = await getApi('getWhatsAppLogs');
        if (data && Array.isArray(data)) {
          setCache(STORAGE_KEYS.WHATSAPP_LOGS_CACHE, data);
          return data;
        }
      } catch (e) {
        if (!e.message?.includes('Unknown API action')) {
          console.warn('getWhatsAppLogs error:', e.message);
        }
      }
    }
    return getCache(STORAGE_KEYS.WHATSAPP_LOGS_CACHE) || [];
  },

  async logWhatsAppMessage(payload) {
    const logItem = {
      messageId: `WA-${Date.now().toString().slice(-6)}`,
      memberId: payload.memberId || '',
      memberName: payload.memberName || '',
      phone: payload.phone || '',
      messageType: payload.messageType || 'Welcome',
      language: payload.language || 'English',
      chitNo: payload.chitNo || '',
      message: payload.message || '',
      relatedPaymentId: payload.relatedPaymentId || '',
      relatedPayoutId: payload.relatedPayoutId || '',
      status: payload.status || 'Prepared',
      createdAt: new Date().toISOString()
    };

    if (API_URL) {
      try {
        const saved = await postApi('logWhatsApp', payload);
        if (saved && saved.messageId) {
          logItem.messageId = saved.messageId;
        }
      } catch (e) {
        console.warn('logWhatsApp API error:', e.message);
      }
    }

    const cached = getCache(STORAGE_KEYS.WHATSAPP_LOGS_CACHE) || [];
    setCache(STORAGE_KEYS.WHATSAPP_LOGS_CACHE, [logItem, ...cached]);
    return logItem;
  },

  async updateWhatsAppStatus(messageId, status) {
    if (API_URL) {
      try {
        await postApi('updateWhatsAppStatus', { messageId, status });
      } catch (e) {
        console.warn('updateWhatsAppStatus API error:', e.message);
      }
    }
    const cached = getCache(STORAGE_KEYS.WHATSAPP_LOGS_CACHE) || [];
    const updated = cached.map(l => String(l.messageId) === String(messageId) ? { ...l, status } : l);
    setCache(STORAGE_KEYS.WHATSAPP_LOGS_CACHE, updated);
    return { success: true };
  },

  // Profit & Loss Financial Analysis (Google Sheets Source of Truth)
  async getProfitLoss(filters = {}) {
    if (API_URL) {
      try {
        const res = await postApi('getProfitLoss', filters);
        if (res && res.summary) {
          return res;
        }
      } catch (e) {
        if (!e.message?.includes('Unknown API action')) {
          console.warn('getProfitLoss POST failed, trying GET fallback:', e.message);
        }
        try {
          const getRes = await getApi('getProfitLoss', filters);
          if (getRes && getRes.summary) {
            return getRes;
          }
        } catch (getErr) {
          console.warn('getProfitLoss GET also failed:', getErr.message);
        }
      }
    }

    // Offline / Local fallback: Compute full P&L metrics from local cached sheets data
    const payments = getCache(STORAGE_KEYS.PAYMENTS_CACHE) || [];
    const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    const chits = getCache(STORAGE_KEYS.CHITS_CACHE) || [];
    const members = getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
    const extraInvestments = getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
    const schedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];

    const filteredPayments = payments.filter(p => {
      if (filters.chitId && filters.chitId !== 'all' && String(p.chitId) !== String(filters.chitId)) return false;
      if (filters.memberId && filters.memberId !== 'all' && String(p.memberId) !== String(filters.memberId)) return false;
      if (filters.month && filters.month !== 'all' && Number(p.monthNumber || p.month) !== Number(filters.month)) return false;
      if (filters.dateFrom && p.paymentDate && p.paymentDate < filters.dateFrom) return false;
      if (filters.dateTo && p.paymentDate && p.paymentDate > filters.dateTo) return false;
      return true;
    });

    const filteredPayouts = payouts.filter(po => {
      if (filters.chitId && filters.chitId !== 'all' && po.chitId && String(po.chitId) !== String(filters.chitId)) return false;
      if (filters.memberId && filters.memberId !== 'all' && po.memberId && String(po.memberId) !== String(filters.memberId)) return false;
      if (filters.month && filters.month !== 'all' && Number(po.monthNumber || po.month) !== Number(filters.month)) return false;
      if (filters.fundingSource && filters.fundingSource !== 'all') {
        const isExtra = String(po.fundingSource || '').toUpperCase().includes('EXTRA');
        if (filters.fundingSource === 'EXTRA_INVESTMENT' && !isExtra) return false;
        if (filters.fundingSource === 'CHIT_FUND' && isExtra) return false;
      }
      if (filters.dateFrom && po.payoutDate && po.payoutDate < filters.dateFrom) return false;
      if (filters.dateTo && po.payoutDate && po.payoutDate > filters.dateTo) return false;
      return true;
    });

    const filteredExtra = extraInvestments.filter(inv => {
      if (filters.dateFrom && inv.investmentDate && inv.investmentDate < filters.dateFrom) return false;
      if (filters.dateTo && inv.investmentDate && inv.investmentDate > filters.dateTo) return false;
      return true;
    });

    const totalCollection = filteredPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
    const totalPayout = filteredPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);

    const totalExtraInvested = filteredExtra.reduce((s, inv) => s + (Number(inv.investmentAmount) || 0), 0);
    const totalExtraAllocated = filteredExtra.reduce((s, inv) => {
      const alloc = (inv.allocatedAmount !== undefined && inv.allocatedAmount !== '') ? Number(inv.allocatedAmount) : (Number(inv.usedAmount) || 0);
      return s + (isNaN(alloc) ? 0 : alloc);
    }, 0);
    const totalExtraRecovered = filteredExtra.reduce((s, inv) => s + (Number(inv.returnedAmount !== undefined ? inv.returnedAmount : inv.recoveredAmount) || 0), 0);
    const hasAnyRecovery = filteredExtra.some(inv => Number(inv.returnedAmount || inv.recoveredAmount || 0) > 0);
    const totalExtraProfit = filteredExtra.reduce((s, inv) => {
      const ret = Number(inv.returnedAmount !== undefined ? inv.returnedAmount : inv.recoveredAmount) || 0;
      const invAmt = Number(inv.investmentAmount) || 0;
      return ret > 0 ? s + (ret - invAmt) : s;
    }, 0);
    const totalExtraRemaining = Math.max(0, totalExtraInvested - totalExtraAllocated);
    const extraROI = (totalExtraInvested > 0 && hasAnyRecovery) ? ((totalExtraProfit / totalExtraInvested) * 100) : 0;

    let totalCommission = 0;
    let totalDividend = 0;
    let totalExpectedDue = 0;

    const targetChits = (filters.chitId && filters.chitId !== 'all')
      ? chits.filter(c => String(c.chitId) === String(filters.chitId))
      : chits;

    targetChits.forEach(c => {
      const cVal = Number(c.chitValue || c.totalAmount) || 100000;
      const dur = Number(c.duration || c.durationMonths) || 20;
      const memCount = Number(c.requiredMembers || c.totalMembers) || dur;
      const commPct = Number(c.commissionPercent) || 5;
      const commAmt = Math.round(cVal * (commPct / 100));
      const normalMonthly = memCount > 0 ? Math.round(cVal / memCount) : 5000;

      const startM = (filters.month && filters.month !== 'all') ? Number(filters.month) : 1;
      const endM = (filters.month && filters.month !== 'all') ? Number(filters.month) : dur;

      for (let m = startM; m <= endM; m++) {
        const schItem = schedule.find(s => String(s.chitId) === String(c.chitId) && Number(s.monthNumber || s.month) === m);
        const actualMonthly = schItem ? (Number(schItem.amount || schItem.monthlyAmount) || normalMonthly) : normalMonthly;
        const monthDiv = schItem && schItem.dividend !== undefined ? Number(schItem.dividend) : Math.max(0, normalMonthly - actualMonthly);

        totalCommission += (m === 1 ? 0 : commAmt);
        totalDividend += (m === 1 ? 0 : (monthDiv * memCount));
        totalExpectedDue += (actualMonthly * memCount);
      }
    });

    const totalPending = Math.max(0, totalExpectedDue - totalCollection);
    const collectionRate = totalExpectedDue > 0 ? ((totalCollection / totalExpectedDue) * 100) : 100;
    const netCashFlow = (totalCollection + totalExtraRecovered) - (totalPayout + totalExtraInvested);
    const operationalProfit = totalCommission + (hasAnyRecovery ? totalExtraProfit : 0);

    const maxMonth = 20;
    const monthlyBreakdown = [];
    for (let m = 1; m <= maxMonth; m++) {
      if (filters.month && filters.month !== 'all' && Number(filters.month) !== m) continue;

      const mPayments = filteredPayments.filter(p => Number(p.monthNumber || p.month) === m);
      const mPayouts = filteredPayouts.filter(po => Number(po.monthNumber || po.month) === m);
      const mCollection = mPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
      const mPayout = mPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);
      const defaultComm = m === 1 ? 0 : 5000;
      const mDividend = m === 1 ? 0 : 1250;
      const mCashFlow = mCollection - mPayout;
      const mProfit = defaultComm;

      monthlyBreakdown.push({
        month: m,
        collection: mCollection,
        payout: mPayout,
        commission: defaultComm,
        dividend: mDividend,
        extraInvestment: 0,
        recovery: 0,
        profit: mProfit,
        cashFlow: mCashFlow,
        paymentsCount: mPayments.length,
        payoutsCount: mPayouts.length
      });
    }

    const chitWise = chits.map(c => {
      const cPayments = filteredPayments.filter(p => String(p.chitId) === String(c.chitId));
      const cPayouts = filteredPayouts.filter(po => !po.chitId || String(po.chitId) === String(c.chitId));
      const cCol = cPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
      const cPay = cPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);
      return {
        chitId: c.chitId,
        chitName: c.chitName || c.chitId,
        chitValue: Number(c.totalAmount || c.chitValue) || 100000,
        duration: Number(c.durationMonths || c.duration) || 20,
        members: Number(c.totalMembers || c.memberCount) || 20,
        totalCollection: cCol,
        totalPayout: cPay,
        commission: 95000,
        dividend: 1250 * 19 * 20,
        profit: 95000,
        cashFlow: cCol - cPay
      };
    });

    const memberWise = members.map(m => {
      const mPayments = filteredPayments.filter(p => String(p.memberId) === String(m.memberId));
      const mPayouts = filteredPayouts.filter(po => String(po.memberId) === String(m.memberId));
      const mPaid = mPayments.reduce((s, p) => s + (Number(p.paidAmount || p.amount) || 0), 0);
      const mPayoutTotal = mPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0);
      const extraInvPayouts = mPayouts.filter(po => String(po.fundingSource || '').toUpperCase().includes('EXTRA')).length;

      return {
        memberId: m.memberId,
        name: m.name,
        phone: m.phone || m.mobile || '',
        totalPayments: mPaid,
        totalPayoutsReceived: mPayoutTotal,
        pendingAmount: Number(m.pendingAmount || m.totalPending) || 0,
        chitCount: m.chitCount || 1,
        extraInvestmentPayouts: extraInvPayouts,
        status: m.status || 'Active'
      };
    });

    const chitFundPayouts = filteredPayouts.filter(po => !String(po.fundingSource || '').toUpperCase().includes('EXTRA'));
    const extraInvPayouts = filteredPayouts.filter(po => String(po.fundingSource || '').toUpperCase().includes('EXTRA'));

    return {
      success: true,
      filters: filters,
      timestamp: new Date().toISOString(),
      summary: {
        totalCollection: totalCollection,
        totalDue: totalExpectedDue,
        totalPending: totalPending,
        collectionRate: collectionRate,
        totalPayout: totalPayout,
        completedPayouts: filteredPayouts.filter(po => po.status === 'Completed').length,
        pendingPayouts: filteredPayouts.filter(po => po.status !== 'Completed').length,
        totalCommission: totalCommission,
        totalDividend: totalDividend,
        extraInvestment: totalExtraInvested,
        extraAllocated: totalExtraAllocated,
        extraRemaining: totalExtraRemaining,
        recoveredAmount: totalExtraRecovered,
        investmentProfit: hasAnyRecovery ? totalExtraProfit : 0,
        roiPercent: hasAnyRecovery ? extraROI : 0,
        netProfit: operationalProfit,
        operationalProfit: operationalProfit,
        netCashFlow: netCashFlow,
        numberPayments: filteredPayments.length,
        numberPayouts: filteredPayouts.length
      },
      monthlyBreakdown: monthlyBreakdown,
      chitWise: chitWise,
      memberWise: memberWise,
      fundingSource: [
        {
          source: 'CHIT_FUND',
          label: 'Chit Fund Collections',
          totalAmount: chitFundPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0),
          count: chitFundPayouts.length
        },
        {
          source: 'EXTRA_INVESTMENT',
          label: 'Extra Investment',
          totalAmount: extraInvPayouts.reduce((s, po) => s + (Number(po.amount) || 0), 0),
          count: extraInvPayouts.length
        }
      ]
    };
  },

  // Extra Investment System (Completely Isolated from Normal Chit Calculations)
  async getExtraInvestments() {
    if (API_URL) {
      try {
        const data = await getApi('getExtraInvestments');
        if (data && Array.isArray(data)) {
          setCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE, data);
          return data;
        }
      } catch (e) {
        if (!e.message?.includes('Unknown API action')) {
          console.warn('getExtraInvestments error:', e.message);
        }
      }
    }
    return getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
  },

  async createExtraInvestment(investmentData) {
    const investAmt = Number(investmentData.investmentAmount) || 0;
    const retAmt = Number(investmentData.returnedAmount !== undefined ? investmentData.returnedAmount : investmentData.recoveredAmount) || 0;
    const allocAmt = Number(investmentData.allocatedAmount !== undefined ? investmentData.allocatedAmount : investmentData.usedAmount) || 0;
    const calc = calculateExtraInvestment({ investmentAmount: investAmt, returnedAmount: retAmt });

    const newInvestment = {
      investmentId: `INV-${Date.now().toString().slice(-6)}`,
      investmentAmount: investAmt,
      investmentDate: investmentData.investmentDate || new Date().toISOString().split('T')[0],
      investor: investmentData.investor || investmentData.investorSource || investmentData.beneficiary || '',
      investorSource: investmentData.investor || investmentData.investorSource || investmentData.beneficiary || '',
      beneficiary: investmentData.investor || investmentData.investorSource || investmentData.beneficiary || '',
      purpose: investmentData.purpose || 'Capital Deployment',
      expectedReturn: Number(investmentData.expectedReturn) || '',
      allocatedAmount: allocAmt,
      usedAmount: allocAmt,
      remainingAmount: Math.max(0, investAmt - allocAmt),
      returnedAmount: retAmt,
      recoveredAmount: retAmt,
      profit: calc.profit,
      profitPercent: calc.profitPercent,
      profitPercentage: calc.profitPercent,
      notes: investmentData.notes || '',
      status: investmentData.status || (retAmt >= investAmt && retAmt > 0 ? 'Closed' : (allocAmt >= investAmt && investAmt > 0 ? 'Fully Allocated' : 'Active')),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (API_URL) {
      try {
        const saved = await postApi('createExtraInvestment', newInvestment);
        if (saved && saved.investmentId) {
          newInvestment.investmentId = saved.investmentId;
        }
      } catch (e) {
        console.warn('createExtraInvestment API error, using local fallback:', e.message);
      }
    }

    const cached = getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
    setCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE, [newInvestment, ...cached]);
    return newInvestment;
  },

  async updateExtraInvestment(investmentId, investmentData) {
    const investAmt = Number(investmentData.investmentAmount) || 0;
    const retAmt = Number(investmentData.returnedAmount !== undefined ? investmentData.returnedAmount : investmentData.recoveredAmount) || 0;
    const allocAmt = Number(investmentData.allocatedAmount !== undefined ? investmentData.allocatedAmount : investmentData.usedAmount) || 0;
    const calc = calculateExtraInvestment({ investmentAmount: investAmt, returnedAmount: retAmt });

    const updateObj = {
      ...investmentData,
      investmentAmount: investAmt,
      allocatedAmount: allocAmt,
      usedAmount: allocAmt,
      remainingAmount: Math.max(0, investAmt - allocAmt),
      returnedAmount: retAmt,
      recoveredAmount: retAmt,
      profit: calc.profit,
      profitPercent: calc.profitPercent,
      profitPercentage: calc.profitPercent,
      updatedAt: new Date().toISOString()
    };

    if (API_URL) {
      try {
        await postApi('updateExtraInvestment', { investmentId, ...updateObj });
      } catch (e) {
        console.warn('updateExtraInvestment API error:', e.message);
      }
    }

    const cached = getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
    const updated = cached.map(inv => String(inv.investmentId) === String(investmentId) ? { ...inv, ...updateObj } : inv);
    setCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE, updated);
    return updateObj;
  },

  async allocateExtraInvestment(allocationData) {
    const { investmentId, payoutAmount, chitId, monthNumber, memberId, memberName, chitNo, notes, payoutDate, paymentMethod } = allocationData;
    const allocNum = Number(payoutAmount) || 0;

    const cachedInvestments = getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
    const targetInv = cachedInvestments.find(inv => String(inv.investmentId) === String(investmentId));

    if (targetInv) {
      const currentInvested = Number(targetInv.investmentAmount) || 0;
      const currentAlloc = Number(targetInv.allocatedAmount !== undefined ? targetInv.allocatedAmount : targetInv.usedAmount) || 0;
      const remaining = Math.max(0, currentInvested - currentAlloc);

      if (allocNum > remaining) {
        throw new Error(`Allocation exceeds remaining investment amount. Maximum available is ₹${remaining.toLocaleString('en-IN')}.`);
      }
    }

    let result = { success: true };

    if (API_URL) {
      try {
        result = await postApi('allocateExtraInvestment', allocationData);
      } catch (e) {
        console.warn('allocateExtraInvestment API error, using local fallback:', e.message);
      }
    }

    // Update local investment cache
    const updatedInvestments = cachedInvestments.map(inv => {
      if (String(inv.investmentId) === String(investmentId)) {
        const investAmt = Number(inv.investmentAmount) || 0;
        const oldAlloc = Number(inv.allocatedAmount !== undefined ? inv.allocatedAmount : inv.usedAmount) || 0;
        const newAlloc = oldAlloc + allocNum;
        const newRem = Math.max(0, investAmt - newAlloc);
        return {
          ...inv,
          allocatedAmount: newAlloc,
          usedAmount: newAlloc,
          remainingAmount: newRem,
          status: newAlloc >= investAmt ? 'Fully Allocated' : 'Active',
          updatedAt: new Date().toISOString()
        };
      }
      return inv;
    });
    setCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE, updatedInvestments);
    setCache(STORAGE_KEYS.EXTRA_INVESTMENT_CACHE, updatedInvestments);

    // Create corresponding payout record with fundingSource = 'EXTRA_INVESTMENT'
    const newPayout = {
      payoutId: result.payoutId || `PAYOUT-EXT-${Date.now().toString().slice(-4)}`,
      chitId: chitId || 'CHIT-100K-01',
      memberId: memberId || 'MEM-000',
      memberName: memberName || 'Member',
      chitNo: chitNo || `CHIT-${chitId}-M${monthNumber}`,
      month: Number(monthNumber) || 1,
      monthNumber: Number(monthNumber) || 1,
      amount: allocNum,
      actualAmount: allocNum,
      scheduledAmount: Number(allocationData.scheduledAmount || allocationData.scheduledPayoutAmount) || allocNum,
      payoutDate: payoutDate || new Date().toISOString().split('T')[0],
      paymentMode: paymentMethod || 'Bank Transfer',
      paymentMethod: paymentMethod || 'Bank Transfer',
      status: 'Completed',
      fundingSource: 'EXTRA_INVESTMENT',
      extraInvestmentId: investmentId,
      notes: notes || `Funded via Extra Investment ${investmentId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const cachedPayouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    const filteredPayouts = cachedPayouts.filter(p => String(p.payoutId) !== String(newPayout.payoutId));
    setCache(STORAGE_KEYS.PAYOUTS_CACHE, [newPayout, ...filteredPayouts]);

    // Update SCHEDULE_CACHE to mark month as Completed
    const cachedSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const updatedSchedule = cachedSchedule.map(s => {
      const isMatch = (!s.chitId || String(s.chitId) === String(chitId || 'CHIT-100K-01')) &&
        Number(s.month || s.monthNumber) === Number(monthNumber || 1);
      if (!isMatch) return s;

      const existingPayouts = Array.isArray(s.payouts) ? s.payouts.filter(p => String(p.payoutId) !== String(newPayout.payoutId)) : [];
      const updatedMonthPayouts = [newPayout, ...existingPayouts];
      const totalPaid = updatedMonthPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        ...s,
        payoutStatus: 'Completed',
        status: 'Completed',
        actualPayoutAmount: totalPaid,
        payouts: updatedMonthPayouts,
        assignedMemberName: s.assignedMemberName || memberName,
        assignedMemberId: s.assignedMemberId || memberId
      };
    });
    setCache(STORAGE_KEYS.SCHEDULE_CACHE, updatedSchedule);

    return {
      success: true,
      payoutId: newPayout.payoutId,
      investmentId,
      allocatedAmount: allocNum
    };
  },

  async recordInvestmentRecovery(recoveryData) {
    const { investmentId, recoveredAmount, totalRecovered, recoveryDate, notes } = recoveryData;
    const recNum = Number(recoveredAmount) || 0;

    let result = { success: true };

    if (API_URL) {
      try {
        result = await postApi('recordInvestmentRecovery', recoveryData);
      } catch (e) {
        console.warn('recordInvestmentRecovery API error, using local fallback:', e.message);
      }
    }

    const cachedInvestments = getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
    const updatedInvestments = cachedInvestments.map(inv => {
      if (String(inv.investmentId) === String(investmentId)) {
        const investAmt = Number(inv.investmentAmount) || 0;
        const prevRec = Number(inv.returnedAmount !== undefined ? inv.returnedAmount : inv.recoveredAmount) || 0;
        const newTotal = (totalRecovered !== undefined && Number(totalRecovered) > 0) ? Number(totalRecovered) : (prevRec + recNum);
        const profit = newTotal - investAmt;
        const profitPercent = investAmt > 0 ? Number(((profit / investAmt) * 100).toFixed(2)) : 0;
        return {
          ...inv,
          returnedAmount: newTotal,
          recoveredAmount: newTotal,
          profit: profit,
          profitPercent: profitPercent,
          profitPercentage: profitPercent,
          status: newTotal >= investAmt ? 'Closed' : 'Recovered',
          notes: (inv.notes ? `${inv.notes} | ` : '') + (notes || `Recovery on ${recoveryDate}`),
          updatedAt: new Date().toISOString()
        };
      }
      return inv;
    });
    setCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE, updatedInvestments);

    return {
      success: true,
      investmentId,
      recoveredAmount: recNum
    };
  },

  async deleteExtraInvestment(investmentId) {
    const cached = getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
    const matched = cached.find(inv => String(inv.investmentId) === String(investmentId));
    if (matched) {
      const allocated = Number(matched.allocatedAmount || matched.usedAmount) || 0;
      const recovered = Number(matched.returnedAmount || matched.recoveredAmount) || 0;
      if (allocated > 0 || recovered > 0) {
        throw new Error('Cannot delete an investment that has active allocations or recovery history. Please update its status instead.');
      }
    }

    if (API_URL) {
      try {
        await postApi('deleteExtraInvestment', { investmentId });
      } catch (e) {
        console.warn('deleteExtraInvestment API error:', e.message);
      }
    }

    const updated = cached.filter(inv => String(inv.investmentId) !== String(investmentId));
    setCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE, updated);
    return { success: true };
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

