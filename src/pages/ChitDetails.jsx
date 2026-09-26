import React, { useState, useEffect, useMemo } from 'react';
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
  Edit3,
  UserPlus,
  PlayCircle,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import StatCard from '../components/common/StatCard';
import ChitTimeline from '../components/chits/ChitTimeline';
import ChitSchedule from '../components/chits/ChitSchedule';
import AssignChitModal from '../components/chits/AssignChitModal';
import EditPayoutModal from '../components/chits/EditPayoutModal';
import PayoutForm from '../components/payouts/PayoutForm';
import ChitForm from '../components/chits/ChitForm';
import AddMemberToChitModal from '../components/chits/AddMemberToChitModal';
import PreLaunchValidationModal from '../components/chits/PreLaunchValidationModal';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';
import { getChitCapacityStats, getChitLifecycleStatus } from '../utils/chitCalculations';
import { buildWelcomeMessage, generateWhatsAppUrl } from '../utils/whatsapp';

export const ChitDetails = () => {
  const { chitId } = useParams();
  const navigate = useNavigate();
  const { setIsRecordPaymentOpen, showToast } = useChit();

  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals for this page
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
  const [isEditPayoutOpen, setIsEditPayoutOpen] = useState(false);
  const [payoutToEdit, setPayoutToEdit] = useState(null);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [selectedPayoutMonth, setSelectedPayoutMonth] = useState(2);
  const [isAddMemberToChitOpen, setIsAddMemberToChitOpen] = useState(false);
  const [selectedSlotForEnroll, setSelectedSlotForEnroll] = useState(null);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  const loadChitDetails = async () => {
    setLoading(true);
    try {
      const [res, mems, mShips] = await Promise.all([
        api.getChit(chitId || 'CHIT-100K-01'),
        api.getMembers(),
        api.getMemberships({ chitId: chitId || 'CHIT-100K-01' })
      ]);
      setData(res);
      setMembers(mems || []);
      setMemberships((mShips || []).filter(m => String(m.chitId) === String(chitId || 'CHIT-100K-01')));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChitDetails();
  }, [chitId]);

  const chit = data?.chit;
  const schedule = data?.schedule || [];
  const summary = data?.summary || {};

  const duration = Number(chit?.duration || chit?.durationMonths || summary?.totalMonths || 20);
  const multiple = Number(chit?.multiple) || 1;
  const dividend = Number(chit?.dividend) || 0;

  // Capacity stats - unconditional hook at top level
  const capacityStats = useMemo(() => {
    if (!chit) {
      return {
        requiredMembers: 20,
        joinedMembers: 0,
        remainingSlots: 20,
        fillPercentage: 0,
        status: 'Upcoming',
        isFull: false
      };
    }
    return getChitCapacityStats(chit, memberships);
  }, [chit, memberships]);

  // Payout Month Map - unconditional hook at top level
  const payoutMonthMap = useMemo(() => {
    const map = {};
    (memberships || []).forEach(m => {
      const pMonth = Number(m.payoutMonth);
      if (pMonth) {
        if (!map[pMonth]) map[pMonth] = [];
        const memObj = (members || []).find(mem => String(mem.memberId) === String(m.memberId));
        map[pMonth].push({
          ...m,
          memberName: memObj ? memObj.name : (m.memberName || 'Member')
        });
      }
    });
    return map;
  }, [memberships, members]);

  const handleOpenAssign = (schItem) => {
    setSelectedScheduleItem(schItem);
    setIsAssignOpen(true);
  };

  const handleOpenEditPayout = (schItem) => {
    setPayoutToEdit(schItem);
    setIsEditPayoutOpen(true);
  };

  const handleOpenPayout = (schItem) => {
    setSelectedPayoutMonth(schItem.month);
    setIsPayoutOpen(true);
  };

  if (loading || !data) {
    return <LoadingState message="Loading Chit Details & Master Schedule..." />;
  }

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

  const handleSendWhatsAppWelcome = (membership) => {
    const memObj = members.find(mem => String(mem.memberId) === String(membership.memberId));
    const phone = memObj ? memObj.mobile : membership.phone;
    const name = memObj ? memObj.name : membership.memberName;

    const msg = buildWelcomeMessage({
      memberName: name,
      chits: [
        {
          chitNo: membership.chitNo,
          chitValue: chit.chitValue || chit.totalAmount,
          durationMonths: duration,
          monthlyPayment: membership.monthlyPayment || chit.monthlyContribution || chit.monthlyAmount,
          payoutMonth: membership.payoutMonth
        }
      ]
    });

    const url = generateWhatsAppUrl(phone, msg);
    if (url) {
      window.open(url, '_blank');
      api.logWhatsAppMessage({
        memberId: membership.memberId,
        memberName: name,
        phone,
        messageType: 'Welcome',
        chitNo: membership.chitNo,
        message: msg,
        status: 'Opened'
      });
      showToast('Opened WhatsApp welcome chat!', 'success');
    } else {
      showToast('Valid phone number not found for member', 'error');
    }
  };

  const handleDeleteMembership = async (membershipId, chitNo) => {
    if (!window.confirm(`Are you sure you want to remove assignment for Chit ${chitNo}?`)) {
      return;
    }
    try {
      await api.deleteMembership(membershipId);
      showToast(`Membership ${chitNo} removed successfully`, 'success');
      loadChitDetails();
    } catch (err) {
      showToast(err.message || 'Failed to remove membership', 'error');
    }
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
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                capacityStats.status === 'Active' ? 'text-emerald-800 bg-emerald-100' :
                capacityStats.status === 'Full' ? 'text-amber-900 bg-amber-100 border border-amber-300' :
                capacityStats.status === 'Filling' ? 'text-sky-800 bg-sky-100' :
                'text-purple-800 bg-purple-100'
              }`}>
                {capacityStats.status} Scheme
              </span>
            </div>
            <p className="text-xs text-[#5B7065] mt-0.5">
              {duration}-Month Schedule • Multiple: {multiple}× • Dividend: {formatINR(dividend)} • Total Chit Value: {formatINR(chit.chitValue || chit.totalAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#003524] text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5"
            title="Edit Chit Parameters & Recalculate"
          >
            <Edit3 className="w-4 h-4 text-[#174D38]" />
            <span>Edit Plan</span>
          </button>
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
          value={formatINR(chit.chitValue || chit.totalAmount || summary.chitValue)}
          subtitle={`${duration} Months Scheme`}
          icon={Layers}
          accentColor="primary"
        />

        <StatCard
          title="Current Month"
          value={`Month ${summary.currentMonth} / ${duration}`}
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

      {/* UPCOMING & ENROLLMENT CAPACITY BANNER (Sections 49, 53, 55, 57) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAF2EC]">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                capacityStats.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                capacityStats.status === 'Full' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                capacityStats.status === 'Filling' ? 'bg-sky-100 text-sky-800' :
                capacityStats.status === 'Completed' ? 'bg-slate-100 text-slate-700' :
                'bg-purple-100 text-purple-800'
              }`}>
                {capacityStats.status}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#003524]">
                Scheme Capacity & Pre-Launch Status
              </h3>
            </div>
            <p className="text-xs text-[#5B7065] mt-0.5">
              Required Members: <span className="font-bold text-[#003524]">{capacityStats.requiredMembers}</span> • Joined: <span className="font-bold text-[#003524]">{capacityStats.joinedMembers}</span> • Available Slots: <span className="font-bold text-amber-800">{capacityStats.remainingSlots}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {capacityStats.status !== 'Active' && capacityStats.status !== 'Completed' && (
              <button
                type="button"
                onClick={() => setIsValidationOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title="Review validation checklist and activate scheme"
              >
                <PlayCircle className="w-4 h-4 text-[#FED255]" />
                <span>Activate Scheme</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedSlotForEnroll(null);
                setIsAddMemberToChitOpen(true);
              }}
              className="px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-[#C9A227]" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-[#131E19]">
            <span>Member Enrollment Progress</span>
            <span className="text-[#003524]">
              {capacityStats.joinedMembers} / {capacityStats.requiredMembers} Members ({capacityStats.fillPercentage}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-[#DCE8E0]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                capacityStats.isFull ? 'bg-amber-500' : 'bg-gradient-to-r from-[#003524] to-[#174D38]'
              }`}
              style={{ width: `${capacityStats.fillPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* PAYOUT MONTH MAP (Sections 51 & 53) */}
      <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAF2EC]">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-[#003524] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#174D38]" />
              Payout Month Map ({duration} Months)
            </h4>
            <p className="text-xs text-[#5B7065] mt-0.5">
              Click an available slot to enroll a member, or view confirmed payout assignments.
            </p>
          </div>
          <span className="text-xs font-bold text-[#003524] bg-[#F0FCF4] px-2.5 py-1 rounded-lg border border-[#DCE8E0]">
            {Object.keys(payoutMonthMap).length} / {duration} Months Assigned
          </span>
        </div>

        {/* Responsive Grid of Months */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: duration }, (_, i) => i + 1).map((m) => {
            const assignedList = payoutMonthMap[m] || [];
            const isAssigned = assignedList.length > 0;
            const schItem = (schedule || []).find(s => Number(s.month || s.monthNumber) === m);
            const payoutAmt = schItem?.payoutAmount || (chit.chitValue || chit.totalAmount);

            return (
              <div
                key={m}
                className={`p-3.5 rounded-xl border transition-all ${
                  isAssigned
                    ? 'bg-[#F0FCF4] border-emerald-300 shadow-xs'
                    : 'bg-white border-dashed border-[#DCE8E0] hover:border-[#003524] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-[#003524]">
                    Month {m} {m === 1 ? '(Chit NIL)' : ''}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                    isAssigned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-[#5B7065]'
                  }`}>
                    {isAssigned ? 'Assigned' : 'Available'}
                  </span>
                </div>

                <div className="text-xs text-[#131E19] mb-2">
                  <span className="text-[10px] text-[#5B7065] block">Payout Amount:</span>
                  <span className="font-extrabold text-[#003524]">{formatINR(payoutAmt)}</span>
                </div>

                {isAssigned ? (
                  <div className="space-y-1.5 pt-1.5 border-t border-[#DCE8E0]">
                    {assignedList.map((a, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="truncate pr-1">
                          <span className="font-bold text-[#131E19] block truncate">{a.memberName}</span>
                          <span className="text-[10px] font-mono text-[#5B7065]">{a.chitNo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppWelcome(a)}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
                          title="Send WhatsApp Welcome Click-to-Chat"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlotForEnroll(m);
                      setIsAddMemberToChitOpen(true);
                    }}
                    className="w-full py-1.5 px-2 bg-white hover:bg-[#003524] text-[#003524] hover:text-white border border-[#DCE8E0] text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Assign Member</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MEMBER / CHIT ASSIGNMENTS TABLE (Sections 50 & 53) */}
      <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAF2EC]">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-[#003524] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#174D38]" />
              Member & Chit Assignments ({memberships.length} Enrolled)
            </h4>
            <p className="text-xs text-[#5B7065] mt-0.5">
              Permanent Chit Numbers and assigned payout months for this group
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSlotForEnroll(null);
              setIsAddMemberToChitOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Enroll Member</span>
          </button>
        </div>

        {memberships.length === 0 ? (
          <div className="p-8 text-center bg-[#F0FCF4] rounded-xl border border-[#DCE8E0] space-y-3">
            <Users className="w-8 h-8 text-[#174D38] mx-auto opacity-70" />
            <h5 className="text-sm font-bold text-[#003524]">No Members Enrolled Yet</h5>
            <p className="text-xs text-[#5B7065] max-w-sm mx-auto">
              Start enrolling members into this chit scheme before the launch date.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSlotForEnroll(null);
                setIsAddMemberToChitOpen(true);
              }}
              className="px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Add First Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#DCE8E0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#003524] text-white text-[11px] uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-3">Chit No</th>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Payout Month</th>
                  <th className="py-2.5 px-3">Monthly Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2EC] bg-white">
                {memberships.map((m) => {
                  const memObj = members.find(mem => String(mem.memberId) === String(m.memberId));
                  const memberName = memObj ? memObj.name : (m.memberName || 'Member');
                  const memberMobile = memObj ? memObj.mobile : '';

                  return (
                    <tr key={m.membershipId} className="hover:bg-[#F0FCF4]/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#003524]">
                        {m.chitNo}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#131E19]">
                        {memberName}
                      </td>
                      <td className="py-2.5 px-3 text-[#5B7065]">
                        {memberMobile || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#003524]">
                        Month {m.payoutMonth}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#003524]">
                        {formatINR(m.monthlyPayment || chit.monthlyContribution || chit.monthlyAmount || 0)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {m.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppWelcome({ ...m, memberName, phone: memberMobile })}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                            title="Send WhatsApp Welcome Click-to-Chat"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMembership(m.membershipId, m.chitNo)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                            title="Remove Membership"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MASTER SCHEDULE TABLE */}
      <ChitSchedule
        schedule={schedule}
        currentMonth={chit.currentMonth || 1}
        onAssign={handleOpenAssign}
        onEditPayout={handleOpenEditPayout}
        onPayout={handleOpenPayout}
      />

      {/* Edit Payout Modal */}
      <EditPayoutModal
        isOpen={isEditPayoutOpen}
        onClose={() => {
          setIsEditPayoutOpen(false);
          setPayoutToEdit(null);
        }}
        scheduleItem={payoutToEdit}
        chit={chit}
        onSuccess={loadChitDetails}
      />

      {/* Assign Chit Modal */}
      <AssignChitModal
        isOpen={isAssignOpen}
        onClose={() => {
          setIsAssignOpen(false);
          setSelectedScheduleItem(null);
        }}
        initialMonth={selectedScheduleItem?.month}
        initialMemberName={selectedScheduleItem?.assignedMemberName}
        prefilledMemberId={selectedScheduleItem?.assignedMemberId}
        onSuccess={loadChitDetails}
      />

      {/* Record Payout Form Modal */}
      <PayoutForm
        isOpen={isPayoutOpen}
        onClose={() => setIsPayoutOpen(false)}
        prefilledMonth={selectedPayoutMonth}
        onSuccess={loadChitDetails}
      />

      {/* Add Member to Upcoming Chit Modal */}
      <AddMemberToChitModal
        isOpen={isAddMemberToChitOpen}
        onClose={() => setIsAddMemberToChitOpen(false)}
        targetChit={chit}
        initialMonth={selectedSlotForEnroll}
        onSuccess={loadChitDetails}
      />

      {/* Pre-Launch Validation Checklist Modal */}
      <PreLaunchValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        chit={chit}
        memberships={memberships}
        onActivated={loadChitDetails}
      />

      {/* Edit Chit Plan Modal */}
      <ChitForm
        isOpen={isEditOpen}
        chitToEdit={chit}
        onClose={() => setIsEditOpen(false)}
        onSuccess={loadChitDetails}
      />
    </div>
  );
};

export default ChitDetails;
