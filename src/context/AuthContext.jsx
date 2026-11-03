import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // 1. Initial Session Check: Validate both user AND token
    const token = authService.getToken();
    const existingUser = authService.getCurrentUser();
    if (token && existingUser) {
      setUser(existingUser);
    } else {
      setUser(null);
      authService.logout();
    }
    setLoading(false);

    // 2. Global Event Listener for Session Expiry / Revocation
    const handleAuthExpired = (event) => {
      console.warn('[MSR CHITS AUTH] Session expired or invalid token:', event.detail);
      setUser(null);
      authService.logout();
      setAuthError(event.detail?.message || 'Your session has expired. Please log in again.');
    };

    window.addEventListener('msr:auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('msr:auth_expired', handleAuthExpired);
    };
  }, []);

  const login = async (username, password) => {
    setAuthError(null);
    const res = await authService.login(username, password);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user && !!authService.getToken(),
      loading,
      authError,
      clearAuthError: () => setAuthError(null),
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
