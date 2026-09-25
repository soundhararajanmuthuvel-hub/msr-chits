/**
 * Authentication service
 */

import { api } from './api';

const SESSION_KEY = 'msr_auth_session';

export const authService = {
  async login(username, password) {
    const res = await api.login(username, password);
    if (res.token) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        user: res.user,
        token: res.token,
        loginTime: new Date().toISOString()
      }));
    }
    return res;
  },

  getCurrentUser() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session);
      return parsed.user || null;
    } catch {
      return null;
    }
  },

  getToken() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      return JSON.parse(session).token || null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};

export default authService;
