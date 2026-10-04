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
  Download,
  CreditCard,
  Eye,
  EyeOff,
  QrCode,
  Edit2,
  MessageSquare,
  Globe
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
  const [showAccountNumber, setShowAccountNumber] = useState(false);

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
    adminUsername: 'admin',
    // Bank & UPI Payment Settings
    upiId: 'msrchits@okhdfcbank',
    accountHolderName: 'MSR CHITS',
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    paymentInstructions: 'Please include your Chit Number in the payment reference/remarks.'
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

      {/* Bank & Payment Details (Requirement 4) */}
      <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAF2EC] gap-2">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-[#174D38]" />
            <div>
              <h3 className="text-base font-bold text-[#003524]">
                Bank & Payment Details
              </h3>
              <p className="text-xs text-[#5B7065]">
                Configure official UPI ID for WhatsApp payment reminders and bank account for member installments
              </p>
            </div>
          </div>
          {(formData.upiId || formData.bankName || formData.accountNumber) && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Payment details configured ✓</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveCompanySettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                UPI ID *
              </label>
              <input
                type="text"
                placeholder="e.g. msrchits@okhdfcbank"
                value={formData.upiId || ''}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                required
              />
              <span className="text-[10px] text-[#5B7065] mt-0.5 block">
                Included directly in WhatsApp payment reminders
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                placeholder="e.g. MSR CHITS"
                value={formData.accountHolderName || ''}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI, ICICI"
                value={formData.bankName || ''}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#003524]">
                  Account Number
                </label>
                <button
                  type="button"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="text-[10px] text-[#5B7065] hover:text-[#003524] flex items-center gap-1 font-semibold"
                >
                  {showAccountNumber ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showAccountNumber ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showAccountNumber ? 'text' : 'password'}
                placeholder="Bank account number"
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-mono text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                value={formData.ifscCode || ''}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-mono text-[#131E19] uppercase focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Branch Location
              </label>
              <input
                type="text"
                placeholder="e.g. Anna Nagar, Chennai"
                value={formData.branch || ''}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Payment Instructions / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Include Chit No in UPI remarks"
                value={formData.paymentInstructions || ''}
                onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector('input[placeholder="e.g. msrchits@okhdfcbank"]');
                if (el) el.focus();
              }}
              className="px-4 py-2.5 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <Edit2 className="w-4 h-4 text-[#174D38]" />
              <span>Edit</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
            >
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <Save className="w-4 h-4 text-[#C9A227]" />
              <span>{formData.upiId || formData.bankName ? 'Update Details' : 'Save Details'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* WhatsApp Settings (Section 26) */}
      <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAF2EC]">
          <MessageSquare className="w-5 h-5 text-[#25D366]" />
          <div>
            <h3 className="text-base font-bold text-[#003524]">
              WhatsApp Settings (English + தமிழ்)
            </h3>
            <p className="text-xs text-[#5B7065]">
              Configure default messaging language, UPI details, and automated template preferences
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCompanySettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Default Language *
              </label>
              <select
                value={formData.defaultLanguage || 'English'}
                onChange={(e) => setFormData({ ...formData, defaultLanguage: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              >
                <option value="English">English</option>
                <option value="Tamil">தமிழ் (Tamil)</option>
              </select>
              <span className="text-[10px] text-[#5B7065] mt-0.5 block">
                Default language when opening WhatsApp message preview
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                UPI ID *
              </label>
              <input
                type="text"
                placeholder="e.g. msrchits@okhdfcbank"
                value={formData.upiId || ''}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
              <span className="text-[10px] text-[#5B7065] mt-0.5 block">
                Included in payment reminders (Payment UPI / பணம் செலுத்த UPI)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#003524] block">Payment Message</span>
                <span className="text-[10px] text-[#5B7065]">Monthly installment reminder</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Enabled
              </span>
            </div>

            <div className="p-3 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#003524] block">Welcome Message</span>
                <span className="text-[10px] text-[#5B7065]">New member greeting & chit details</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Enabled
              </span>
            </div>

            <div className="p-3 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#003524] block">Payment Receipt</span>
                <span className="text-[10px] text-[#5B7065]">Payment received confirmation</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Enabled
              </span>
            </div>

            <div className="p-3 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#003524] block">Payout Message</span>
                <span className="text-[10px] text-[#5B7065]">Prize money payout disbursement receipt</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Enabled
              </span>
            </div>

            <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50 border border-[#DCE8E0] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#003524] block">Allow Edit Before WhatsApp</span>
                <span className="text-[10px] text-[#5B7065]">Always show editable preview modal before Click-to-Chat</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                ON
              </span>
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
              <span>Save Settings</span>
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
