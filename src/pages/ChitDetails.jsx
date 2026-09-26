import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Edit3
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import StatCard from '../components/common/StatCard';
import ChitTimeline from '../components/chits/ChitTimeline';
import ChitSchedule from '../components/chits/ChitSchedule';
import AssignChitModal from '../components/chits/AssignChitModal';
import PayoutForm from '../components/payouts/PayoutForm';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';

export const ChitDetails = () => {
  const { chitId } = useParams();
  const navigate = useNavigate();
  const { setIsRecordPaymentOpen } = useChit();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals for this page
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [selectedPayoutMonth, setSelectedPayoutMonth] = useState(2);

  const loadChitDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getChit(chitId || 'CHIT-100K-01');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChitDetails();
  }, [chitId]);

  if (loading || !data) {
    return <LoadingState message="Loading Chit Details & Master Schedule..." />;
  }

  const { chit, schedule, summary } = data;

  if (!chit) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#DCE8E0] shadow-sm text-center max-w-xl mx-auto my-12 space-y-4">
        <h3 className="text-lg font-bold text-[#003524]">Chit Scheme Not Found</h3>
        <p className="text-xs text-[#5B7065]">
          The requested chit scheme was not found in your Google Sheets database.
        </p>
        <button
          type="button"
          onClick={() => navigate('/chits')}
          className="px-5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl"
        >
          Back to Chits List
        </button>
      </div>
    );
  }

  const handleOpenAssign = (schItem) => {
    setSelectedScheduleItem(schItem);
    setIsAssignOpen(true);
  };

  const handleOpenPayout = (schItem) => {
    setSelectedPayoutMonth(schItem.month);
    setIsPayoutOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/chits')}
            className="p-2 text-[#003524] hover:bg-[#F0FCF4] rounded-xl border border-[#DCE8E0] transition-colors"
            title="Back to Chits List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
                {chit.chitName}
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Active Scheme
              </span>
            </div>
            <p className="text-xs text-[#5B7065] mt-0.5">
              20-Month Schedule • Total Fund Value: {formatINR(chit.chitValue)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4 text-[#C9A227]" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 5 TOP SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Chit Value"
          value={formatINR(summary.chitValue)}
          subtitle="20 Members Fund"
          icon={Layers}
          accentColor="primary"
        />

        <StatCard
          title="Current Month"
          value={`Month ${summary.currentMonth} / ${summary.totalMonths}`}
          subtitle="In Progress"
          icon={Calendar}
          accentColor="gold"
        />

        <StatCard
          title="Total Collected"
          value={formatINR(summary.totalCollected)}
          subtitle="From all members"
          icon={CreditCard}
          accentColor="emerald"
        />

        <StatCard
          title="Current Pending"
          value={formatINR(summary.totalPending)}
          subtitle="Month 2 installments"
          icon={AlertCircle}
          accentColor="blue"
        />

        <StatCard
          title="Month 2 Payout"
          value={formatINR(summary.currentMonthPayout)}
          subtitle="Amma + MU"
          icon={Send}
          accentColor="gold"
        />
      </div>

      {/* 20-MONTH PROGRESS TIMELINE */}
      <ChitTimeline
        schedule={schedule}
        currentMonth={chit.currentMonth || 2}
        onSelectMonth={(m) => {
          const item = schedule.find(s => s.month === m);
          if (item) handleOpenAssign(item);
        }}
      />

      {/* UNASSIGNED & SPECIAL ALLOCATION CALLOUT */}
      <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAF2EC]">
          <h4 className="text-sm font-bold text-[#003524] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#174D38]" />
            Member Allocations & Unassigned Chits Status
          </h4>
          <span className="text-[11px] text-[#5B7065]">
            Source: Master Chit Register
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
          {/* Confirmed Fixed Allocations */}
          <div className="p-3.5 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0] space-y-2">
            <p className="font-bold text-[#003524] text-xs uppercase tracking-wide">
              Confirmed Scheduled Allocations:
            </p>
            <div className="space-y-1.5 text-xs text-[#131E19]">
              <div className="flex justify-between">
                <span>• Month 1 (₹1,00,000 — Chit NIL):</span>
                <span className="font-bold text-emerald-800">MU (Completed)</span>
              </div>
              <div className="flex justify-between">
                <span>• Month 2 (₹70,000 — Chit 2):</span>
                <span className="font-bold text-[#003524]">Amma + MU (Active)</span>
              </div>
              <div className="flex justify-between">
                <span>• Month 8 (₹79,000 — Chit 8):</span>
                <span className="font-bold text-[#003524]">MU</span>
              </div>
              <div className="flex justify-between">
                <span>• Month 15 (₹89,500 — Chit 15):</span>
                <span className="font-bold text-[#003524]">MU</span>
              </div>
            </div>
          </div>

          {/* Unassigned Chits */}
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
            <p className="font-bold text-amber-900 text-xs uppercase tracking-wide">
              Pending / Unassigned Chits (Months Not Fixed):
            </p>
            <div className="space-y-1.5 text-xs text-[#131E19]">
              <div className="flex justify-between">
                <span>• Amma:</span>
                <span className="font-semibold text-amber-800 italic">1 extra chit — month NOT FIXED</span>
              </div>
              <div className="flex justify-between">
                <span>• Mani Mama:</span>
                <span className="font-semibold text-amber-800 italic">1 chit — month NOT FIXED</span>
              </div>
              <div className="flex justify-between">
                <span>• MD:</span>
                <span className="font-semibold text-amber-800 italic">1 chit — month NOT FIXED</span>
              </div>
              <div className="flex justify-between">
                <span>• Periya Periyappa:</span>
                <span className="font-semibold text-amber-800 italic">2 chits — months NOT FIXED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MASTER 20-MONTH SCHEDULE TABLE */}
      <ChitSchedule
        schedule={schedule}
        currentMonth={chit.currentMonth || 2}
        onAssign={handleOpenAssign}
        onPayout={handleOpenPayout}
      />

      {/* Assign Chit Modal */}
      {selectedScheduleItem && (
        <AssignChitModal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          initialMonth={selectedScheduleItem.month}
          initialMemberName={selectedScheduleItem.assignedMemberName}
          onSuccess={loadChitDetails}
        />
      )}

      {/* Record Payout Modal */}
      <PayoutForm
        isOpen={isPayoutOpen}
        onClose={() => setIsPayoutOpen(false)}
        prefilledMonth={selectedPayoutMonth}
        onSuccess={loadChitDetails}
      />
    </div>
  );
};

export default ChitDetails;
