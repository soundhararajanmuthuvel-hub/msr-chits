import React, { useState } from 'react';
import { Menu, PlusCircle, Bell, ChevronDown, Calendar, Layers, ShieldCheck, User, LogOut, Building2 } from 'lucide-react';
import { formatFullDate } from '../../utils/date';
import { useChit } from '../../context/ChitContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NetworkStatus from '../common/NetworkStatus';

export const Header = ({ onOpenMobileMenu }) => {
  const { activeChit, chitsList, setActiveChit, setIsRecordPaymentOpen } = useChit();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isChitDropdownOpen, setIsChitDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const currentDate = formatFullDate(new Date());

  const handleSelectChit = (chit) => {
    setActiveChit(chit);
    setIsChitDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#DCE8E0] px-3.5 sm:px-6 py-2.5 sm:py-3 transition-all">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Mobile Brand & Active Chit Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Brand Icon */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#003524] text-[#C9A227] flex items-center justify-center shadow-xs">
              <Building2 className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
          </div>

          {/* Active Chit Pill Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsChitDropdownOpen(!isChitDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-[#F0FCF4] hover:bg-[#e4f6eb] border border-[#DCE8E0] rounded-xl transition-colors group text-left min-h-[40px]"
            >
              <div className="hidden sm:flex p-1 rounded-md bg-[#174D38] text-white">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#003524] truncate max-w-[130px] sm:max-w-[200px]">
                    {activeChit?.chitName || 'MSR Chit — ₹1 Lakh'}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-[#C9A227]/20 text-[#85660D] rounded shrink-0">
                    M{activeChit?.currentMonth || 2}/{activeChit?.duration || 20}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#5B7065] transition-transform duration-200 shrink-0 ${isChitDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Chit selector dropdown */}
            {isChitDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsChitDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#DCE8E0] py-2 z-30 animate-scale-up">
                  <div className="px-3 py-1.5 border-b border-[#EAF2EC] text-[10px] font-bold uppercase tracking-wider text-[#5B7065]">
                    Select Active Chit Group
                  </div>
                  {(chitsList.length > 0 ? chitsList : [activeChit]).map((chit) => (
                    <button
                      key={chit.chitId}
                      type="button"
                      onClick={() => handleSelectChit(chit)}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-[#F0FCF4] flex items-center justify-between text-xs font-semibold ${
                        activeChit?.chitId === chit.chitId ? 'text-[#003524] bg-[#F0FCF4]/60' : 'text-[#4B6358]'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-[#131E19]">{chit.chitName}</p>
                        <p className="text-[10px] text-[#5B7065]">Month {chit.currentMonth || 2} of {chit.duration || 20}</p>
                      </div>
                      {activeChit?.chitId === chit.chitId && (
                        <span className="w-2 h-2 rounded-full bg-[#174D38]"></span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions, Date, Notifications, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick Record Payment Button */}
          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 transform active:scale-95 min-h-[38px]"
          >
            <PlusCircle className="w-4 h-4 text-[#C9A227]" />
            <span className="hidden xs:inline sm:inline">Record Payment</span>
            <span className="inline xs:hidden">Pay</span>
          </button>

          {/* Date Display (Hidden on Mobile) */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-[#4B6358] bg-[#F0FCF4] px-3 py-1.5 rounded-lg border border-[#DCE8E0]">
            <Calendar className="w-3.5 h-3.5 text-[#174D38]" />
            <span>{currentDate}</span>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 text-[#4B6358] hover:text-[#003524] hover:bg-[#F0FCF4] rounded-xl transition-colors relative min-h-[38px] min-w-[38px] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9A227] ring-2 ring-white"></span>
            </button>

            {isNotificationOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsNotificationOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#DCE8E0] py-2 z-30 animate-scale-up">
                  <div className="px-4 py-2 border-b border-[#EAF2EC] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#003524]">Notifications</span>
                    <span className="text-[10px] bg-[#C9A227]/20 text-[#85660D] font-bold px-1.5 py-0.5 rounded">2 New</span>
                  </div>
                  <div className="divide-y divide-[#EAF2EC] text-xs">
                    <div className="p-3 hover:bg-[#F0FCF4]/60">
                      <p className="font-semibold text-[#131E19]">Payment Day approaching</p>
                      <p className="text-[11px] text-[#5B7065] mt-0.5">20th of the month due in 5 days.</p>
                    </div>
                    <div className="p-3 hover:bg-[#F0FCF4]/60">
                      <p className="font-semibold text-[#131E19]">Month 2 Payout Processed</p>
                      <p className="text-[11px] text-[#5B7065] mt-0.5">₹70,000 allocated to Amma + MU.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Admin Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-1.5 p-1 text-[#003524] hover:bg-[#F0FCF4] rounded-xl transition-colors min-h-[38px]"
            >
              <div className="w-7.5 h-7.5 rounded-full bg-[#003524] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-[#C9A227]/50">
                {user?.name ? user.name.charAt(0) : 'A'}
              </div>
            </button>

            {isProfileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsProfileDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#DCE8E0] py-2 z-30 animate-scale-up">
                  <div className="px-4 py-2.5 border-b border-[#EAF2EC]">
                    <p className="text-xs font-bold text-[#131E19]">{user?.name || 'MSR Admin'}</p>
                    <p className="text-[10px] text-[#5B7065]">Admin Portal</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#4B6358] hover:bg-[#F0FCF4] hover:text-[#003524] flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5" />
                      Settings & Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
