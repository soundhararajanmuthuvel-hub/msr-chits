import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Users,
  CreditCard,
  Send,
  AlertCircle,
  PlusCircle,
  UserPlus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Activity,
  ChevronRight
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { formatINR, formatLakh } from '../utils/currency';
import { api } from '../services/api';
import { useChit } from '../context/ChitContext';
import LoadingState from '../components/common/LoadingState';

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    activeChit,
    setIsRecordPaymentOpen,
    setIsAddMemberOpen,
    setIsRecordPayoutOpen
  } = useChit();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Unable to connect to MSR CHITS server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeChit]);

  if (loading) {
    return <LoadingState message="Loading MSR Chits Dashboard..." />;
  }

  if (error && !dashboardData) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-sm text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#003524]">API Connection Notice</h3>
        <p className="text-xs text-[#5B7065] leading-relaxed">
          {error}
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={loadData}
            className="px-5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return <LoadingState message="Loading MSR Chits Dashboard..." />;
  }

  const { stats, currentChit, recentActivity } = dashboardData;
  const chit = currentChit || activeChit || {
    chitId: 'CHIT-100K-01',
    chitName: 'MSR Chit — ₹1,00,000',
    chitValue: 100000,
    duration: 20,
    currentMonth: 1,
    monthlyContribution: 3750,
    memberCount: stats?.activeMembers || 0,
    paymentDay: 20,
    progressPercent: 5,
    expectedCollection: 0,
    collected: stats?.thisMonthCollection || 0,
    pending: stats?.pendingPayments || 0,
    currentPayout: 0,
    payoutAllocation: 'Not Assigned',
    expected20M: 0,
    expectedTotal: 0
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Active tracking for <span className="font-bold text-[#003524]">{chit.chitName}</span>
          </p>
        </div>

        {/* Quick Action Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-[#C9A227]" />
            <span>Record Payment</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddMemberOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4 text-[#174D38]" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* TOP 4 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Chits"
          value={stats?.totalChits || 0}
          subtitle="Registered Chit Groups"
          icon={Layers}
          accentColor="primary"
        />

        <StatCard
          title="Active Members"
          value={stats?.activeMembers || 0}
          subtitle="Enrolled Active Members"
          icon={Users}
          accentColor="emerald"
        />

        <StatCard
          title="This Month Collection"
          value={formatINR(stats?.thisMonthCollection || 0)}
          subtitle={`Month ${chit.currentMonth} Collected`}
          icon={CreditCard}
          accentColor="gold"
        />

        <StatCard
          title="Pending Payments"
          value={formatINR(stats?.pendingPayments || 0)}
          subtitle="Current month due"
          icon={AlertCircle}
          accentColor="blue"
        />
      </div>

      {/* TWO COLUMN SECTION: CURRENT CHIT CARD & CURRENT MONTH STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CURRENT CHIT CARD (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-4 border-b border-[#EAF2EC]">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#C9A227]/20 text-[#85660D]">
                  Active Chit Scheme
                </span>
                <h3 className="text-xl font-bold text-[#003524] mt-1.5">
                  {chit.chitName}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#5B7065]">Chit Value</span>
                <p className="text-lg font-extrabold text-[#003524]">
                  {formatINR(chit.chitValue)}
                </p>
              </div>
            </div>

            {/* Grid of Key Chit Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-5">
              <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                <p className="text-[11px] font-semibold text-[#5B7065]">Duration</p>
                <p className="text-base font-bold text-[#131E19] mt-0.5">
                  {chit.duration} Months
                </p>
              </div>

              <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                <p className="text-[11px] font-semibold text-[#5B7065]">Current Month</p>
                <p className="text-base font-bold text-[#003524] mt-0.5">
                  Month {chit.currentMonth} / {chit.duration}
                </p>
              </div>

              <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                <p className="text-[11px] font-semibold text-[#5B7065]">Monthly Contribution</p>
                <p className="text-base font-bold text-[#003524] mt-0.5">
                  {formatINR(chit.monthlyContribution)}
                </p>
              </div>

              <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                <p className="text-[11px] font-semibold text-[#5B7065]">Total Expected ({chit.duration || 20}M)</p>
                <p className="text-base font-bold text-[#003524] mt-0.5">
                  {formatINR(chit.expectedTotal || chit.expected20M || 0)}
                </p>
              </div>

              <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                <p className="text-[11px] font-semibold text-[#5B7065]">Enrolled Members</p>
                <p className="text-base font-bold text-[#131E19] mt-0.5">
                  {chit.memberCount} Members
                </p>
              </div>

              <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                <p className="text-[11px] font-semibold text-[#5B7065]">Payment Day</p>
                <p className="text-base font-bold text-[#131E19] mt-0.5">
                  {chit.paymentDay || 20}th of month
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold text-[#131E19]">
                <span>Chit Timeline Progress</span>
                <span className="text-[#003524] font-bold">
                  {chit.progressPercent || 5}% (Month {chit.currentMonth}/{chit.duration})
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-[#DCE8E0]">
                <div
                  className="h-full bg-gradient-to-r from-[#003524] to-[#174D38] rounded-full transition-all duration-500"
                  style={{ width: `${chit.progressPercent || 5}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-[#EAF2EC] flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(`/chits/${chit.chitId}`)}
              className="text-xs font-bold text-[#003524] hover:text-[#174D38] flex items-center gap-1 group"
            >
              <span>View 20-Month Master Schedule</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* CURRENT MONTH STATUS (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF2EC]">
              <h3 className="text-base font-bold text-[#003524]">
                Month {chit.currentMonth} Collection & Payout
              </h3>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Active Month
              </span>
            </div>

            <div className="space-y-3.5 py-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0]">
                <span className="text-xs font-semibold text-[#4B6358]">Expected Collection:</span>
                <span className="text-sm font-extrabold text-[#131E19]">
                  {formatINR(chit.expectedCollection || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800">Collected so far:</span>
                <span className="text-sm font-extrabold text-emerald-900">
                  {formatINR(chit.collected || stats?.thisMonthCollection || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-semibold text-amber-800">Pending Collection:</span>
                <span className="text-sm font-extrabold text-amber-900">
                  {formatINR(chit.pending || stats?.pendingPayments || 0)}
                </span>
              </div>

              {/* Current Payout */}
              <div className="p-4 rounded-xl bg-[#003524] text-white space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#C4D9CC]">Current Month Payout:</span>
                  <span className="text-base font-extrabold text-[#C9A227]">
                    {formatINR(chit.currentPayout || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#174D38]">
                  <span className="text-[#C4D9CC]">Payout Beneficiary:</span>
                  <span className="font-bold text-white">
                    {chit.payoutAllocation || 'Not Assigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRecordPayoutOpen(true)}
            className="w-full py-2.5 px-4 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-[#174D38]" />
            <span>Process Month {chit.currentMonth || 1} Payout</span>
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QUICK ACTIONS TILES (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#003524]">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="p-4 rounded-xl bg-[#F0FCF4] hover:bg-[#e2f7eb] border border-[#DCE8E0] text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#003524] text-[#C9A227] flex items-center justify-center mb-2 shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-[#003524]">Record Payment</p>
              <p className="text-[10px] text-[#5B7065] mt-0.5">Collect member due</p>
            </button>

            <button
              type="button"
              onClick={() => setIsAddMemberOpen(true)}
              className="p-4 rounded-xl bg-[#F0FCF4] hover:bg-[#e2f7eb] border border-[#DCE8E0] text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#174D38] text-white flex items-center justify-center mb-2 shadow-xs">
                <UserPlus className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-[#003524]">Add Member</p>
              <p className="text-[10px] text-[#5B7065] mt-0.5">Enroll new member</p>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/chits/${currentChit.chitId}`)}
              className="p-4 rounded-xl bg-[#F0FCF4] hover:bg-[#e2f7eb] border border-[#DCE8E0] text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#174D38] text-white flex items-center justify-center mb-2 shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-[#003524]">View Schedule</p>
              <p className="text-[10px] text-[#5B7065] mt-0.5">20M Master table</p>
            </button>

            <button
              type="button"
              onClick={() => setIsRecordPayoutOpen(true)}
              className="p-4 rounded-xl bg-[#F0FCF4] hover:bg-[#e2f7eb] border border-[#DCE8E0] text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#003524] text-[#C9A227] flex items-center justify-center mb-2 shadow-xs">
                <Send className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-[#003524]">Record Payout</p>
              <p className="text-[10px] text-[#5B7065] mt-0.5">Disburse dividend</p>
            </button>
          </div>
        </div>

        {/* RECENT ACTIVITY LOG (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#EAF2EC]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#174D38]" />
              <h3 className="text-base font-bold text-[#003524]">
                Recent Activities & Transactions
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#5B7065]">
              Real-time feed
            </span>
          </div>

          <div className="divide-y divide-[#EAF2EC] mt-1">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((log) => (
                <div key={log.logId} className="py-3.5 flex items-start gap-3 hover:bg-[#F0FCF4]/40 px-2 rounded-lg transition-colors">
                  <div className="p-2 rounded-lg bg-[#F0FCF4] text-[#174D38] shrink-0 mt-0.5">
                    {log.action.includes('Payment') && <CreditCard className="w-3.5 h-3.5" />}
                    {log.action.includes('Payout') && <Send className="w-3.5 h-3.5 text-[#C9A227]" />}
                    {log.action.includes('Member') && <Users className="w-3.5 h-3.5" />}
                    {log.action.includes('Schedule') && <Calendar className="w-3.5 h-3.5" />}
                    {log.action.includes('Chit') && <Layers className="w-3.5 h-3.5" />}
                    {log.action.includes('Login') && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs font-bold text-[#131E19]">{log.action}</p>
                      <span className="text-[11px] text-[#5B7065]">{log.date}</span>
                    </div>
                    <p className="text-xs text-[#4B6358] mt-0.5">{log.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#5B7065] py-4 text-center">No recent activity logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
