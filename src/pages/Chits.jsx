import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Calendar, Users, ArrowRight, ShieldCheck, Inbox, Edit3, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { formatINR, formatLakh } from '../utils/currency';
import { formatDate } from '../utils/date';
import StatusBadge from '../components/common/StatusBadge';
import ChitForm from '../components/chits/ChitForm';
import LoadingState from '../components/common/LoadingState';

export const Chits = () => {
  const navigate = useNavigate();
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedChitToEdit, setSelectedChitToEdit] = useState(null);

  const loadChits = async () => {
    setLoading(true);
    try {
      const data = await api.getChits();
      let normalized = data;
      if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
        if (Array.isArray(normalized.data)) normalized = normalized.data;
        else if (Array.isArray(normalized.chits)) normalized = normalized.chits;
      }
      setChits(Array.isArray(normalized) ? normalized : []);
    } catch (e) {
      console.error('Failed to load chits:', e);
      setChits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChits();
  }, []);

  const getStatus = (c) => (c?.status ? String(c.status).trim().toLowerCase() : 'active');
  const totalCount = chits.length;
  const activeCount = chits.filter(c => getStatus(c) === 'active').length;
  const enrollingCount = chits.filter(c => getStatus(c) === 'enrolling').length;
  const completedCount = chits.filter(c => getStatus(c) === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header with Title & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Chit Schemes & Groups
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Dynamic Chit Amount, Multiple, Duration, Dividend & Schedule Management
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedChitToEdit(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          <span>Create New Chit</span>
        </button>
      </div>

      {/* 4 Summary Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Total Chits</p>
          <p className="text-2xl font-extrabold text-[#003524] mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Active Chits</p>
          <p className="text-2xl font-extrabold text-emerald-800 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Enrolling</p>
          <p className="text-2xl font-extrabold text-sky-800 mt-1">{enrollingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Completed</p>
          <p className="text-2xl font-extrabold text-slate-700 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Chit Groups Grid or Genuine Empty State */}
      {loading ? (
        <LoadingState message="Loading chit groups..." />
      ) : chits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#DCE8E0] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F0FCF4] border border-[#DCE8E0] flex items-center justify-center mx-auto text-[#003524] mb-4">
            <Inbox className="w-8 h-8 stroke-[1.8] text-[#174D38]" />
          </div>
          <h3 className="text-lg font-bold text-[#003524]">No Chit Schemes Found</h3>
          <p className="text-xs sm:text-sm text-[#5B7065] max-w-md mx-auto mt-1 mb-6">
            There are currently no chit groups in your Google Sheets database. Click below to create your first chit group.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedChitToEdit(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>Create First Chit Group</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {chits.map((chit) => (
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
                  <StatusBadge status={chit.status || 'Active'} />
                </div>

                {/* Chit Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 text-xs">
                  <div className="p-2.5 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold text-[10px]">Total Chit Value:</span>
                    <p className="text-sm font-extrabold text-[#003524] mt-0.5">
                      {formatINR(chit.chitValue || chit.totalAmount || 0)}
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold text-[10px]">Duration & Month:</span>
                    <p className="text-xs font-bold text-[#131E19] mt-0.5">
                      Month {chit.currentMonth || 1} / {chit.duration || chit.durationMonths || 20}
                    </p>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-amber-800 font-semibold text-[10px]">Entered Dividend:</span>
                    <p className="text-xs font-extrabold text-amber-900 mt-0.5">
                      {formatINR(chit.dividend || 0)}
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold text-[10px]">Start Date:</span>
                    <p className="text-xs font-bold text-[#131E19] mt-0.5">
                      {chit.startDate ? formatDate(chit.startDate) : 'Not Specified'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold text-[10px]">Payment Day:</span>
                    <p className="text-xs font-bold text-[#131E19] mt-0.5">
                      {chit.paymentDay ? `${chit.paymentDay}th of month` : '20th of month'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold text-[10px]">Monthly Installment:</span>
                    <p className="text-xs font-bold text-[#003524] mt-0.5">
                      {formatINR(chit.monthlyContribution || chit.monthlyAmount || 0)}
                    </p>
                  </div>
                </div>

                {/* Next Payout Note if available */}
                {chit.nextPayoutAllocation && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                    <span className="text-[#5B7065] font-semibold text-[11px]">Next Payout:</span>
                    <span className="font-extrabold text-[#003524]">{chit.nextPayoutAllocation}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Edit Plan & View Details */}
              <div className="pt-4 mt-3 border-t border-[#EAF2EC] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChitToEdit(chit);
                    setIsCreateOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#003524] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                  title="Edit Chit Plan & Recalculate"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#174D38]" />
                  <span>Edit Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/chits/${chit.chitId}`)}
                  className="flex-1 py-2.5 px-3 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>View Details & Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                </button>
              </div>
            </div>
          ))}
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
        onSuccess={loadChits}
      />
    </div>
  );
};

export default Chits;
