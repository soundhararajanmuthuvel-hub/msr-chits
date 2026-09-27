import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Calendar,
  Users,
  ArrowRight,
  ShieldCheck,
  Inbox,
  Edit3,
  UserPlus,
  PlayCircle,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR, formatLakh } from '../utils/currency';
import { formatDate } from '../utils/date';
import StatusBadge from '../components/common/StatusBadge';
import ChitForm from '../components/chits/ChitForm';
import AddMemberToChitModal from '../components/chits/AddMemberToChitModal';
import LoadingState from '../components/common/LoadingState';
import { getChitCapacityStats, getChitInstallmentInfo } from '../utils/chitCalculations';

export const Chits = () => {
  const navigate = useNavigate();
  const [chits, setChits] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedChitToEdit, setSelectedChitToEdit] = useState(null);

  // Quick enroll modal
  const [selectedChitForEnroll, setSelectedChitForEnroll] = useState(null);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);

  // Filter tab: 'all' | 'active' | 'upcoming' | 'completed'
  const [filterTab, setFilterTab] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [chitsData, memsData] = await Promise.all([
        api.getChits(),
        api.getMemberships()
      ]);
      let normalized = chitsData;
      if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
        if (Array.isArray(normalized.data)) normalized = normalized.data;
        else if (Array.isArray(normalized.chits)) normalized = normalized.chits;
      }
      setChits(Array.isArray(normalized) ? normalized : []);
      setMemberships(Array.isArray(memsData) ? memsData : []);
    } catch (e) {
      console.error('Failed to load chits:', e);
      setChits([]);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute capacity stats and lifecycle status for each chit
  const chitsWithStats = useMemo(() => {
    return chits.map(chit => {
      const stats = getChitCapacityStats(chit, memberships);
      return {
        ...chit,
        capacityStats: stats,
        lifecycleStatus: stats.status
      };
    });
  }, [chits, memberships]);

  // Counts for tabs
  const totalCount = chitsWithStats.length;
  const activeCount = chitsWithStats.filter(c => c.lifecycleStatus === 'Active').length;
  const upcomingCount = chitsWithStats.filter(c => c.lifecycleStatus === 'Upcoming' || c.lifecycleStatus === 'Filling' || c.lifecycleStatus === 'Full').length;
  const completedCount = chitsWithStats.filter(c => c.lifecycleStatus === 'Completed').length;

  // Filtered chits based on selected tab
  const filteredChits = useMemo(() => {
    if (filterTab === 'active') return chitsWithStats.filter(c => c.lifecycleStatus === 'Active');
    if (filterTab === 'upcoming') return chitsWithStats.filter(c => c.lifecycleStatus === 'Upcoming' || c.lifecycleStatus === 'Filling' || c.lifecycleStatus === 'Full');
    if (filterTab === 'completed') return chitsWithStats.filter(c => c.lifecycleStatus === 'Completed');
    return chitsWithStats;
  }, [chitsWithStats, filterTab]);

  return (
    <div className="space-y-6">
      {/* Header with Title & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Chit Schemes & Groups
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Pre-Launch Planning, Dynamic Capacities, Member Enrollment & Master Schedules
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedChitToEdit(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          <span>Create New Chit</span>
        </button>
      </div>

      {/* 4 Summary Stat Badges with Click-to-Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterTab === 'all'
              ? 'bg-white border-[#003524] shadow-sm ring-2 ring-[#003524]/10'
              : 'bg-white border-[#DCE8E0] hover:bg-[#F0FCF4]/40'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Total Schemes</p>
          <p className="text-2xl font-extrabold text-[#003524] mt-1">{totalCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('active')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterTab === 'active'
              ? 'bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-[#DCE8E0] hover:bg-[#F0FCF4]/40'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Active Schemes</p>
          <p className="text-2xl font-extrabold text-emerald-800 mt-1">{activeCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('upcoming')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterTab === 'upcoming'
              ? 'bg-white border-sky-600 shadow-sm ring-2 ring-sky-500/20'
              : 'bg-white border-[#DCE8E0] hover:bg-[#F0FCF4]/40'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Upcoming / Pre-Launch</p>
          <p className="text-2xl font-extrabold text-sky-800 mt-1">{upcomingCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('completed')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterTab === 'completed'
              ? 'bg-white border-slate-600 shadow-sm ring-2 ring-slate-500/20'
              : 'bg-white border-[#DCE8E0] hover:bg-[#F0FCF4]/40'
          }`}
        >
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Completed</p>
          <p className="text-2xl font-extrabold text-slate-700 mt-1">{completedCount}</p>
        </button>
      </div>

      {/* Chit Groups Grid or Genuine Empty State */}
      {loading ? (
        <LoadingState message="Loading chit schemes & capacity data..." />
      ) : filteredChits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#DCE8E0] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F0FCF4] border border-[#DCE8E0] flex items-center justify-center mx-auto text-[#003524] mb-4">
            <Inbox className="w-8 h-8 stroke-[1.8] text-[#174D38]" />
          </div>
          <h3 className="text-lg font-bold text-[#003524]">
            {filterTab === 'all' ? 'No Chit Schemes Found' : `No ${filterTab} Schemes Found`}
          </h3>
          <p className="text-xs sm:text-sm text-[#5B7065] max-w-md mx-auto mt-1 mb-6">
            {filterTab === 'all'
              ? 'There are currently no chit groups in your database. Click below to create your first chit group.'
              : `There are no schemes matching the "${filterTab}" filter. Switch filters or create a new scheme.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedChitToEdit(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>Create New Chit Scheme</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredChits.map((chit) => {
            const { capacityStats, lifecycleStatus } = chit;
            const duration = Number(chit.duration || chit.durationMonths) || 20;
            const installmentInfo = getChitInstallmentInfo(chit);

            return (
              <div
                key={chit.chitId}
                className="bg-white rounded-2xl border border-[#DCE8E0] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between pb-4 border-b border-[#EAF2EC]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-[#003524] text-white">
                          <Layers className="w-4 h-4" />
                        </span>
                        <h3 className="text-lg font-bold text-[#003524]">
                          {chit.chitName || chit.chitId}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-[#003524] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Multiple: {chit.multiple || 1}×
                        </span>
                        <p className="text-xs text-[#5B7065]">
                          {chit.description || 'Standard Mutual Chit Scheme'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                      lifecycleStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      lifecycleStatus === 'Full' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      lifecycleStatus === 'Filling' ? 'bg-sky-100 text-sky-800' :
                      lifecycleStatus === 'Completed' ? 'bg-slate-100 text-slate-700' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {lifecycleStatus}
                    </span>
                  </div>

                  {/* Enrollment Capacity Progress (Section 49) */}
                  <div className="p-3 my-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0] space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#003524]">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#174D38]" />
                        Members: {capacityStats.joinedMembers} / {capacityStats.requiredMembers} Joined
                      </span>
                      <span>
                        {capacityStats.remainingSlots > 0 ? `${capacityStats.remainingSlots} Slots Left` : 'Full'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          capacityStats.isFull ? 'bg-amber-500' : 'bg-[#003524]'
                        }`}
                        style={{ width: `${capacityStats.fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Chit Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
                      <span className="text-[#5B7065] font-semibold text-[10px] block">Total Value:</span>
                      <p className="text-sm font-extrabold text-[#003524] mt-0.5">
                        {formatINR(chit.chitValue || chit.totalAmount || 0)}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
                      <span className="text-[#5B7065] font-semibold text-[10px] block">Duration:</span>
                      <p className="text-xs font-bold text-[#131E19] mt-0.5">
                        {duration} Months
                      </p>
                    </div>

                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-amber-800 font-semibold text-[10px] block">Dividend:</span>
                      <p className="text-xs font-extrabold text-amber-900 mt-0.5">
                        {formatINR(chit.dividend || 0)}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
                      <span className="text-[#5B7065] font-semibold text-[10px] block">Start Date:</span>
                      <p className="text-xs font-bold text-[#131E19] mt-0.5">
                        {chit.startDate ? formatDate(chit.startDate) : 'Not Specified'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#5B7065] font-semibold text-[10px] block">Installment:</span>
                        <span className="text-[9px] font-bold text-amber-800 uppercase">Variable</span>
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        <div className="flex items-center justify-between text-xs font-extrabold text-[#003524]">
                          <span className="text-[10px] text-[#5B7065] font-normal">Current (M{installmentInfo.currentMonth}):</span>
                          <span>{formatINR(installmentInfo.currentInstallment)}</span>
                        </div>
                        {installmentInfo.nextMonth && (
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#174D38]">
                            <span className="text-[9px] text-[#5B7065] font-normal">Next (M{installmentInfo.nextMonth}):</span>
                            <span>{formatINR(installmentInfo.nextInstallment)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
                      <span className="text-[#5B7065] font-semibold text-[10px] block">Payment Day:</span>
                      <p className="text-xs font-bold text-[#131E19] mt-0.5">
                        {chit.paymentDay ? `${chit.paymentDay}th` : '20th'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Add Member, Edit Plan & View Details */}
                <div className="pt-4 mt-3 border-t border-[#EAF2EC] flex items-center gap-2 flex-wrap">
                  {lifecycleStatus !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChitForEnroll(chit);
                        setIsEnrollOpen(true);
                      }}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#003524] border border-emerald-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      title="Enroll a member to this chit scheme"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Add Member</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChitToEdit(chit);
                      setIsCreateOpen(true);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#003524] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                    title="Edit Chit Plan & Recalculate"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#174D38]" />
                    <span>Edit Plan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/chits/${chit.chitId}`)}
                    className="flex-1 py-2 px-3 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 min-w-[130px]"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Chit Modal */}
      <ChitForm
        isOpen={isCreateOpen}
        chitToEdit={selectedChitToEdit}
        onClose={() => {
          setIsCreateOpen(false);
          setSelectedChitToEdit(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Add Member to Upcoming Chit Modal */}
      {selectedChitForEnroll && (
        <AddMemberToChitModal
          isOpen={isEnrollOpen}
          onClose={() => {
            setIsEnrollOpen(false);
            setSelectedChitForEnroll(null);
          }}
          targetChit={selectedChitForEnroll}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default Chits;
