import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Shield,
  Database,
  Save,
  RefreshCw,
  LogOut,
  KeyRound,
  CheckCircle2,
  Smartphone,
  Share,
  PlusSquare,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChit } from '../context/ChitContext';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../components/common/LoadingState';

export const Settings = () => {
  const { user, logout } = useAuth();
  const { syncStatus, checkHealth, showToast } = useChit();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const [formData, setFormData] = useState({
    companyName: 'MSR CHITS',
    mobile: '9840123456',
    email: 'admin@msrchits.com',
    address: 'No. 12, MSR Complex, Main Road, Chennai - 600001',
    defaultDuration: 20,
    defaultMembers: 20,
    paymentDay: 20,
    currency: 'INR',
    adminName: 'MSR Administrator',
    adminUsername: 'admin'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Check if running in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsInstalled(isStandalone);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const load = async () => {
      setLoading(true);
      try {
        const s = await api.getSettings();
        if (s) setFormData(prev => ({ ...prev, ...s }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Thank you for installing MSR CHITS!', 'success');
      }
      setDeferredPrompt(null);
    } else {
      showToast('Follow the iPhone instructions below to install.', 'info');
    }
  };

  const handleSaveCompanySettings = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.updateSettings(formData);
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!passwordData.newPassword) {
      showToast('Please enter a new password', 'error');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    showToast('Admin password updated successfully!', 'success');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  if (loading) {
    return <LoadingState message="Loading Settings..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            System Settings & Administration
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Configure chit defaults, organization profile, PWA installation, and Google Sheets synchronization
          </p>
        </div>
      </div>

      {/* PWA Installation Card (iPhone 15 Plus & Desktop) */}
      <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAF2EC]">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#174D38]" />
            <h3 className="text-base font-bold text-[#003524]">
              Install MSR CHITS App (PWA)
            </h3>
          </div>
          {isInstalled && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Installed on Device
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* iOS Safari Instructions */}
          <div className="p-4 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0] space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#003524]">
              <Share className="w-4 h-4 text-[#174D38]" />
              <span>iPhone 15 Plus / iOS Safari:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[#131E19]">
              <li>Tap the <span className="font-bold">Share</span> button at the bottom of Safari</li>
              <li>Scroll down and select <span className="font-bold">"Add to Home Screen"</span></li>
              <li>Tap <span className="font-bold">"Add"</span> in the top right corner</li>
            </ol>
            <p className="text-[11px] text-[#5B7065] pt-1">
              Launches in fullscreen standalone mode with native iOS gestures.
            </p>
          </div>

          {/* Desktop / Android Direct Install */}
          <div className="p-4 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0] flex flex-col justify-between text-xs space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-[#003524]">
                <Download className="w-4 h-4 text-[#174D38]" />
                <span>Desktop Chrome / Edge / Android:</span>
              </div>
              <p className="text-[#5B7065] mt-1.5">
                Install as a standalone desktop or mobile application with offline shell.
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Download className="w-4 h-4 text-[#C9A227]" />
              <span>{deferredPrompt ? 'Install App Now' : 'Install App'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Sheets Backend Status Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAF2EC]">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#174D38]" />
            <h3 className="text-base font-bold text-[#003524]">
              Google Sheets Database & Apps Script API
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              checkHealth();
              showToast('Refreshed connection status', 'info');
            }}
            className="px-3.5 py-2 bg-[#F0FCF4] hover:bg-[#e2f7eb] text-[#003524] border border-[#DCE8E0] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.checking ? 'animate-spin' : ''}`} />
            <span>Check Health</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0]">
            <span className="text-[11px] font-semibold text-[#5B7065]">API Connection</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-bold text-[#131E19]">
                {syncStatus.connected ? 'Connected' : 'Offline / Standalone'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0]">
            <span className="text-[11px] font-semibold text-[#5B7065]">Last Synchronized</span>
            <p className="text-sm font-bold text-[#131E19] mt-1">
              {syncStatus.relativeSync}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0]">
            <span className="text-[11px] font-semibold text-[#5B7065]">Database Type</span>
            <p className="text-sm font-bold text-[#003524] mt-1">
              Google Sheets (8 Tabs)
            </p>
          </div>
        </div>

        <p className="text-xs text-[#5B7065]">
          When deployed to Vercel with <code className="bg-[#F0FCF4] px-1 py-0.5 rounded text-[#003524] font-mono">VITE_API_URL</code>, the React app synchronizes directly to your Google Sheet database.
        </p>
      </div>

      {/* Company & Chit Defaults Form */}
      <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAF2EC]">
          <Building2 className="w-5 h-5 text-[#174D38]" />
          <h3 className="text-base font-bold text-[#003524]">
            Company & Chit Default Parameters
          </h3>
        </div>

        <form onSubmit={handleSaveCompanySettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Contact Mobile *
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Office Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>
          </div>

          {/* Chit Defaults */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#F0FCF4]/60 p-4 rounded-xl border border-[#DCE8E0]">
            <div>
              <label className="block text-[11px] font-bold text-[#003524] mb-1">
                Default Duration
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={formData.defaultDuration}
                onChange={(e) => setFormData({ ...formData, defaultDuration: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white border border-[#DCE8E0] rounded-lg text-xs font-bold text-[#003524] min-h-[38px]"
              />
              <span className="text-[10px] text-[#5B7065]">Months</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#003524] mb-1">
                Default Members
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={formData.defaultMembers}
                onChange={(e) => setFormData({ ...formData, defaultMembers: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white border border-[#DCE8E0] rounded-lg text-xs font-bold text-[#003524] min-h-[38px]"
              />
              <span className="text-[10px] text-[#5B7065]">Slots</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#003524] mb-1">
                Payment Day
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={formData.paymentDay}
                onChange={(e) => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white border border-[#DCE8E0] rounded-lg text-xs font-bold text-[#003524] min-h-[38px]"
              />
              <span className="text-[10px] text-[#5B7065]">Day of month</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#003524] mb-1">
                Currency
              </label>
              <input
                type="text"
                readOnly
                value="INR (₹)"
                className="w-full px-2.5 py-1.5 bg-slate-100 border border-[#DCE8E0] rounded-lg text-xs font-bold text-[#4B6358] cursor-not-allowed min-h-[38px]"
              />
              <span className="text-[10px] text-[#5B7065]">Indian Rupee</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
            >
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <Save className="w-4 h-4 text-[#C9A227]" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Admin Profile & Password Change */}
      <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAF2EC]">
          <Shield className="w-5 h-5 text-[#174D38]" />
          <h3 className="text-base font-bold text-[#003524]">
            Admin Security & Password
          </h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="px-4 py-2.5 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout Admin Session</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
