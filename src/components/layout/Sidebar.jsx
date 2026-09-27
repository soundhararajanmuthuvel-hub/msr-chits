import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Users,
  CreditCard,
  Send,
  FileText,
  TrendingUp,
  Settings,
  LogOut,
  RefreshCw,
  Database,
  Building2,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChit } from '../../context/ChitContext';

export const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const { logout, user } = useAuth();
  const { syncStatus, checkHealth } = useChit();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chits', label: 'Chits', icon: Layers },
    { to: '/members', label: 'Members', icon: Users },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/payouts', label: 'Payouts', icon: Send },
    { to: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/reports/profit-loss', label: 'Profit & Loss', icon: TrendingUp },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#003524]/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#003524] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#174D38]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A227] flex items-center justify-center text-[#003524] shadow-md">
              <Building2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                MSR CHITS
                <span className="w-2 h-2 rounded-full bg-[#C9A227]"></span>
              </h1>
              <p className="text-[11px] font-medium text-[#C4D9CC] tracking-wide">
                Simple Chit Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#7E9F8E]">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#174D38] text-white shadow-inner border border-[#C9A227]/30'
                      : 'text-[#C4D9CC] hover:bg-[#174D38]/50 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Section: Sync Status & Logout */}
        <div className="p-4 border-t border-[#174D38] space-y-3 bg-[#002B1D]/70">
          {/* Sheets Connection Indicator */}
          <div className="p-2.5 rounded-xl bg-[#174D38]/60 border border-[#174D38] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  syncStatus.checking
                    ? 'bg-amber-400 animate-pulse'
                    : syncStatus.connected
                    ? 'bg-emerald-400'
                    : 'bg-rose-400'
                }`}
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-white leading-none">
                  {syncStatus.checking
                    ? 'Checking...'
                    : syncStatus.connected
                    ? 'Sheets Connected'
                    : 'Connection Error'}
                </p>
                <p className="text-[10px] text-[#A2C2B1] mt-0.5">
                  {syncStatus.checking
                    ? 'Connecting to Sheets...'
                    : syncStatus.connected
                    ? (syncStatus.relativeSync ? `Synced ${syncStatus.relativeSync}` : 'Online')
                    : (syncStatus.error || 'Connection Error')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => checkHealth()}
              title="Refresh Google Sheets Connection"
              className="p-1 text-[#C4D9CC] hover:text-white hover:bg-[#174D38] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.checking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Admin User info & Quick Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#174D38] border border-[#C9A227]/40 flex items-center justify-center font-bold text-xs text-[#C9A227] shrink-0">
                {user?.name ? user.name.charAt(0) : 'A'}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'MSR Admin'}</p>
                <p className="text-[10px] text-[#A2C2B1] capitalize">{user?.role || 'Admin Portal'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-[#C4D9CC] hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
