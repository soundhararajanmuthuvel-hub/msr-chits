/**
 * Authentication service
 */

import { api } from './api.js';

const SESSION_KEY = 'msr_auth_session';

export const authService = {
  async login(username, password) {
    const res = await api.login(username, password);
    if (res.token) {
      const sessionData = {
        user: res.user,
        token: res.token,
        expiresAt: res.expiresAt,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
    return res;
  },

  getCurrentUser() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session);
      // A valid session MUST have both a user object AND a non-empty token string
      if (!parsed || !parsed.user || !parsed.token || typeof parsed.token !== 'string') {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      // Check session expiry if provided by backend
      if (parsed.expiresAt && new Date(parsed.expiresAt) <= new Date()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed.user;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  getToken() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session);
      if (!parsed || !parsed.token || typeof parsed.token !== 'string') {
        return null;
      }
      if (parsed.expiresAt && new Date(parsed.expiresAt) <= new Date()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed.token;
    } catch {
      return null;
    }
  },

  logout() {
    try {
      api.logout().catch(() => {});
    } catch {}
    localStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser();
  }
};

export default authService;
