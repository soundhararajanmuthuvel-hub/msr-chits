import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNavigation from './MobileNavigation';
import ToastContainer from '../common/Toast';
import PwaUpdatePrompt from '../common/PwaUpdatePrompt';
import PaymentForm from '../payments/PaymentForm';
import MemberForm from '../members/MemberForm';
import PayoutForm from '../payouts/PayoutForm';
import AssignChitModal from '../chits/AssignChitModal';
import { useChit } from '../../context/ChitContext';

export const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    isRecordPaymentOpen,
    setIsRecordPaymentOpen,
    isAddMemberOpen,
    setIsAddMemberOpen,
    isRecordPayoutOpen,
    setIsRecordPayoutOpen,
    isAssignChitOpen,
    setIsAssignChitOpen,
    selectedMonthForAssign,
    invalidateData
  } = useChit();

  return (
    <div className="min-h-screen bg-[#F0FCF4] flex flex-col antialiased">
      {/* PWA Update Notification Prompt */}
      <PwaUpdatePrompt />

      {/* Sidebar for Desktop & Mobile Overlay Drawer */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main App Canvas */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen pb-20 lg:pb-0">
        {/* Sticky Top Header */}
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Page Content Viewport with iPhone 15 Plus Spacing */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavigation onOpenMore={() => setIsMobileMenuOpen(true)} />

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Global Modals connected with automated cross-module data invalidation */}
      <PaymentForm
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={() => invalidateData(['payments', 'dashboard', 'unpaid', 'cashflow', 'reports', 'profitloss'])}
      />

      <MemberForm
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={() => invalidateData(['members', 'dashboard', 'memberships'])}
      />

      <PayoutForm
        isOpen={isRecordPayoutOpen}
        onClose={() => setIsRecordPayoutOpen(false)}
        onSuccess={() => invalidateData(['payouts', 'dashboard', 'cashflow', 'reports', 'profitloss', 'investments'])}
      />

      <AssignChitModal
        isOpen={isAssignChitOpen}
        initialMonth={selectedMonthForAssign}
        onClose={() => setIsAssignChitOpen(false)}
        onSuccess={() => invalidateData(['memberships', 'schedule', 'chits', 'dashboard', 'members', 'unpaid'])}
      />
    </div>
  );
};

export default Layout;
