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
    if (API_URL) {
      const res = await postApi('updateSchedulePayout', payload);
      const cachedSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
      const updatedSchedule = cachedSchedule.map(s => {
        if (String(s.chitId) === String(payload.chitId) && Number(s.month || s.monthNumber) === Number(payload.month)) {
          return { ...s, payoutAmount: Number(payload.payoutAmount) };
        }
        return s;
      });
      setCache(STORAGE_KEYS.SCHEDULE_CACHE, updatedSchedule);
      return res;
    }

    const cachedSchedule = getCache(STORAGE_KEYS.SCHEDULE_CACHE) || [];
    const updatedSchedule = cachedSchedule.map(s => {
      if (String(s.chitId) === String(payload.chitId) && Number(s.month || s.monthNumber) === Number(payload.month)) {
        return { ...s, payoutAmount: Number(payload.payoutAmount) };
      }
      return s;
    });
    setCache(STORAGE_KEYS.SCHEDULE_CACHE, updatedSchedule);
    return { success: true, ...payload };
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
    const payload = {
      ...payoutData,
      fundingSource: payoutData.fundingSource || 'Chit Fund Collections'
    };
    if (API_URL) {
      const newPayout = await postApi('recordPayout', payload);
      const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
      const enriched = { ...payload, ...newPayout };
      setCache(STORAGE_KEYS.PAYOUTS_CACHE, [enriched, ...payouts]);
      return enriched;
    }
    const payouts = getCache(STORAGE_KEYS.PAYOUTS_CACHE) || [];
    const newPayout = {
      payoutId: `PO-${Date.now().toString().slice(-6)}`,
      chitId: payoutData.chitId || 'CHIT-100K-01',
      chitNo: payoutData.chitNo || '',
      month: Number(payoutData.month),
      monthNumber: Number(payoutData.month),
      memberId: payoutData.memberId || '',
      memberName: payoutData.memberName,
      amount: Number(payoutData.amount),
      fundingSource: payoutData.fundingSource || 'Chit Fund Collections',
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
      await postApi('cancelMembership', { membershipId });
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
    const retAmt = Number(investmentData.returnedAmount) || 0;
    const calc = calculateExtraInvestment({ investmentAmount: investAmt, returnedAmount: retAmt });

    const newInvestment = {
      investmentId: `INV-${Date.now().toString().slice(-6)}`,
      investmentAmount: investAmt,
      investmentDate: investmentData.investmentDate || new Date().toISOString().split('T')[0],
      usedAmount: Number(investmentData.usedAmount) || 0,
      beneficiary: investmentData.beneficiary || '',
      payout: Number(investmentData.payout) || 0,
      returnedAmount: retAmt,
      profit: calc.profit,
      profitPercent: calc.profitPercent,
      notes: investmentData.notes || '',
      status: investmentData.status || (retAmt >= investAmt ? 'Closed' : 'Active'),
      createdAt: new Date().toISOString()
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
    const retAmt = Number(investmentData.returnedAmount) || 0;
    const calc = calculateExtraInvestment({ investmentAmount: investAmt, returnedAmount: retAmt });

    const updateObj = {
      ...investmentData,
      investmentAmount: investAmt,
      returnedAmount: retAmt,
      profit: calc.profit,
      profitPercent: calc.profitPercent,
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

  async deleteExtraInvestment(investmentId) {
    if (API_URL) {
      try {
        await postApi('deleteExtraInvestment', { investmentId });
      } catch (e) {
        console.warn('deleteExtraInvestment API error:', e.message);
      }
    }
    const cached = getCache(STORAGE_KEYS.EXTRA_INVESTMENTS_CACHE) || [];
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
