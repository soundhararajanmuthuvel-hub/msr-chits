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
    checking: false,
    lastSyncTime: null,
    relativeSync: 'Checking...'
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
    setSyncStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await api.healthCheck();
      setSyncStatus({
        connected: res.connected,
        checking: false,
        lastSyncTime: res.lastSync || new Date().toISOString(),
        relativeSync: getRelativeTime(res.lastSync || new Date().toISOString())
      });
    } catch {
      setSyncStatus((prev) => ({
        ...prev,
        connected: false,
        checking: false,
        relativeSync: 'Offline'
      }));
    }
  }, []);

  // Fetch initial chits list
  const refreshChits = useCallback(async () => {
    try {
      const list = await api.getChits();
      if (list && list.length > 0) {
        setChitsList(list);
        // Sync active chit if needed
        const found = list.find(c => c.chitId === activeChit.chitId) || list[0];
        setActiveChit(found);
      }
    } catch (e) {
      console.warn('Could not refresh chits', e);
    }
  }, [activeChit.chitId]);

  useEffect(() => {
    checkHealth();
    refreshChits();

    // Timer to update relative sync time text every 10 seconds
    const interval = setInterval(() => {
      if (syncStatus.lastSyncTime) {
        setSyncStatus((prev) => ({
          ...prev,
          relativeSync: getRelativeTime(prev.lastSyncTime)
        }));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [checkHealth, refreshChits, syncStatus.lastSyncTime]);

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
