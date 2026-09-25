import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Lock, Phone, ArrowRight, Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChit } from '../context/ChitContext';

export const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { syncStatus, checkHealth, showToast } = useChit();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      await login(username, password);
      showToast('Welcome back, Admin!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid Mobile Number / Username or Password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FCF4] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#174D38_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Card Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#003524] text-[#C9A227] shadow-xl border border-[#174D38]/50 transform -rotate-1 hover:rotate-0 transition-transform">
            <Building2 className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003524] tracking-tight">
            MSR CHITS
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#4B6358]">
            Simple Chit Management System
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#174D38]/10 text-[#003524] rounded-full text-xs font-bold mt-1">
            <Shield className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Admin Portal Login</span>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-[#DCE8E0]">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Username / Mobile */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Mobile Number / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5B7065]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="admin or 9840123456"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F0FCF4]/40 border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5B7065]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F0FCF4]/40 border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] transition-all font-medium"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#4B6358] font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#003524] focus:ring-[#003524] border-[#DCE8E0]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => showToast('Please contact administrator for password recovery.', 'info')}
                className="font-semibold text-[#003524] hover:text-[#174D38] transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#003524] hover:bg-[#174D38] shadow-md hover:shadow-lg transition-all transform active:scale-98 disabled:opacity-70 mt-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Login to Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-[#C9A227]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Help */}
          <div className="mt-5 pt-4 border-t border-[#EAF2EC] text-[11px] text-[#5B7065] text-center bg-[#F0FCF4]/60 p-2.5 rounded-xl">
            <p className="font-semibold text-[#003524]">Demo Credentials:</p>
            <p className="mt-0.5">Username: <span className="font-mono font-bold text-[#131E19]">admin</span> | Password: <span className="font-mono font-bold text-[#131E19]">admin123</span></p>
          </div>
        </div>

        {/* Backend & Google Sheets Real Health Status */}
        <div className="mt-6 flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-xs rounded-xl border border-[#DCE8E0] text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#174D38]" />
            <div className="text-left">
              <span className="font-semibold text-[#131E19]">
                Google Sheets & Apps Script:
              </span>
              <span
                className={`ml-1.5 font-bold ${
                  syncStatus.connected ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {syncStatus.connected ? '● Connected' : '● Offline (Local Mode)'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => checkHealth()}
            title="Check API Health"
            className="p-1 text-[#4B6358] hover:text-[#003524] rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.checking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
