import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, Users, CreditCard, MoreHorizontal } from 'lucide-react';

export const MobileNavigation = ({ onOpenMore }) => {
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chits', label: 'Chits', icon: Layers },
    { to: '/members', label: 'Members', icon: Users },
    { to: '/payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#DCE8E0] px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] flex items-center justify-around lg:hidden shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all min-h-[44px] min-w-[54px] ${
                isActive
                  ? 'text-[#003524] bg-[#F0FCF4] scale-105 shadow-2xs'
                  : 'text-[#5B7065] hover:text-[#003524] active:scale-95'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold text-[#5B7065] hover:text-[#003524] active:scale-95 min-h-[44px] min-w-[54px]"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5 shrink-0" />
        <span>More</span>
      </button>
    </nav>
  );
};

export default MobileNavigation;
