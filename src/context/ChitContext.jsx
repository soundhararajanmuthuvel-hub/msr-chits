import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { getRelativeTime } from '../utils/date';

const ChitContext = createContext(null);

export const ChitProvider = ({ children }) => {
  const [activeChit, setActiveChit] = useState({
    chitId: 'CHIT-100K-01',
    chitName: 'MSR Chit — ₹1,00,000',
    chitValue: 100000,
    currentMonth: 2,
    duration: 20,
    memberCount: 20,
    monthlyContribution: 3750,
  });

  const [chitsList, setChitsList] = useState([]);
  const [syncStatus, setSyncStatus] = useState({
    connected: false,
    checking: true,
    error: null,
    sheetName: '',
    lastSyncTime: null,
    relativeSync: ''
  });

  const [toasts, setToasts] = useState([]);

  // Modals state accessible across pages
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isRecordPayoutOpen, setIsRecordPayoutOpen] = useState(false);
  const [isAssignChitOpen, setIsAssignChitOpen] = useState(false);
  const [selectedMonthForAssign, setSelectedMonthForAssign] = useState(null);

  // Trigger toast
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check health and sync with backend
  const checkHealth = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const res = await api.healthCheck();
      if (res && res.connected && res.status === 'ONLINE') {
        const now = res.lastSync || new Date().toISOString();
        setSyncStatus({
          connected: true,
          checking: false,
          error: null,
          sheetName: res.sheetName || 'MSR CHITS',
          lastSyncTime: now,
          relativeSync: 'Just now'
        });
      } else {
        setSyncStatus({
          connected: false,
          checking: false,
          error: res?.error || 'Connection Error',
          sheetName: '',
          lastSyncTime: null,
          relativeSync: 'Offline'
        });
      }
    } catch (err) {
      setSyncStatus({
        connected: false,
        checking: false,
        error: err.message || 'Connection Error',
        sheetName: '',
        lastSyncTime: null,
        relativeSync: 'Offline'
      });
    }
  }, []);

  // Fetch initial chits list
  const refreshChits = useCallback(async () => {
    try {
      const list = await api.getChits();
      if (Array.isArray(list) && list.length > 0) {
        setChitsList(list);
        setActiveChit((prev) => {
          const found = list.find((c) => c.chitId === prev?.chitId);
          return found || list[0];
        });
      }
    } catch (e) {
      console.warn('Could not refresh chits', e);
    }
  }, []);

  // Initial load - run ONCE on mount
  useEffect(() => {
    checkHealth();
    refreshChits();
  }, [checkHealth, refreshChits]);

  // Periodic relative time updater (does NOT trigger health checks or API calls)
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus((prev) => {
        if (!prev.lastSyncTime) return prev;
        return {
          ...prev,
          relativeSync: getRelativeTime(prev.lastSyncTime)
        };
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ChitContext.Provider
      value={{
        activeChit,
        setActiveChit,
        chitsList,
        refreshChits,
        syncStatus,
        checkHealth,
        toasts,
        showToast,
        removeToast,
        // Global Modals
        isRecordPaymentOpen,
        setIsRecordPaymentOpen,
        isAddMemberOpen,
        setIsAddMemberOpen,
        isRecordPayoutOpen,
        setIsRecordPayoutOpen,
        isAssignChitOpen,
        setIsAssignChitOpen,
        selectedMonthForAssign,
        setSelectedMonthForAssign
      }}
    >
      {children}
    </ChitContext.Provider>
  );
};

export const useChit = () => {
  const context = useContext(ChitContext);
  if (!context) {
    throw new Error('useChit must be used within a ChitProvider');
  }
  return context;
};

export default ChitContext;
