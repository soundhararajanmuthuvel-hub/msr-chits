import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Calendar, Users, ArrowRight, ShieldCheck } from 'lucide-react';
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

  const loadChits = async () => {
    setLoading(true);
    try {
      const data = await api.getChits();
      setChits(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChits();
  }, []);

  const totalCount = chits.length;
  const activeCount = chits.filter(c => c.status === 'Active').length;
  const enrollingCount = chits.filter(c => c.status === 'Enrolling').length;
  const completedCount = chits.filter(c => c.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header with Title & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Chit Schemes & Groups
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Manage chit groups, 20-month duration parameters, and member quotas
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
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

      {/* Chit Groups Grid */}
      {loading ? (
        <LoadingState message="Loading chit groups..." />
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
                        {chit.chitName}
                      </h3>
                    </div>
                    <p className="text-xs text-[#5B7065] mt-1">
                      {chit.description || 'Standard 20-Month Mutual Chit Scheme'}
                    </p>
                  </div>
                  <StatusBadge status={chit.status || 'Active'} />
                </div>

                {/* Chit Details Grid */}
                <div className="grid grid-cols-2 gap-3.5 py-5 text-xs">
                  <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold">Chit Value:</span>
                    <p className="text-base font-extrabold text-[#003524] mt-0.5">
                      {formatINR(chit.chitValue)}
                    </p>
                  </div>

                  <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold">Duration & Month:</span>
                    <p className="text-sm font-bold text-[#131E19] mt-0.5">
                      Month {chit.currentMonth || 2} / {chit.duration || 20}
                    </p>
                  </div>

                  <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold">Start Date:</span>
                    <p className="text-xs font-bold text-[#131E19] mt-0.5">
                      {formatDate(chit.startDate || '2026-01-01')}
                    </p>
                  </div>

                  <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold">Payment Day:</span>
                    <p className="text-xs font-bold text-[#131E19] mt-0.5">
                      {chit.paymentDay || 20}th of every month
                    </p>
                  </div>

                  <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold">Members:</span>
                    <p className="text-sm font-bold text-[#131E19] mt-0.5">
                      {chit.memberCount || 20} / 20 Enrolled
                    </p>
                  </div>

                  <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                    <span className="text-[#5B7065] font-semibold">Monthly Installment:</span>
                    <p className="text-sm font-bold text-[#003524] mt-0.5">
                      {formatINR(chit.monthlyContribution || 3750)}
                    </p>
                  </div>
                </div>

                {/* Next Payout Note */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-[#5B7065] font-semibold">Next Payout (Month 2):</span>
                  <span className="font-extrabold text-[#003524]">Amma + MU (₹70,000)</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-[#EAF2EC]">
                <button
                  type="button"
                  onClick={() => navigate(`/chits/${chit.chitId}`)}
                  className="w-full py-2.5 px-4 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>View Chit Details & 20-Month Schedule</span>
                  <ArrowRight className="w-4 h-4 text-[#C9A227]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Chit Modal */}
      <ChitForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadChits}
      />
    </div>
  );
};

export default Chits;
