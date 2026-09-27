import React, { useState } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  ShieldCheck,
  Calendar,
  Layers,
  Users
} from 'lucide-react';

export const PreLaunchValidationModal = ({
  isOpen,
  onClose,
  chit,
  memberships = [],
  onActivated
}) => {
  const { showToast, refreshChits } = useChit();
  const [activating, setActivating] = useState(false);

  if (!isOpen || !chit) return null;

  const duration = Number(chit.duration || chit.durationMonths) || 20;
  const requiredMembers = Number(chit.totalMembers || chit.memberCount || chit.requiredMembers) || duration;
  const chitValue = Number(chit.chitValue || chit.totalAmount) || 100000;
  const multiple = Number(chit.multiple) || 1;
  const dividend = Number(chit.dividend) || 0;
  const monthlyCalc = Number(chit.monthlyContribution || chit.monthlyAmount) || Math.round(chitValue / duration);

  const validMemberships = (memberships || []).filter(
    m => String(m.chitId) === String(chit.chitId) && m.status !== 'Cancelled'
  );
  const joinedCount = validMemberships.length;
  const remainingCount = Math.max(0, requiredMembers - joinedCount);
  const isFull = joinedCount >= requiredMembers;

  const assignedMonths = new Set(validMemberships.map(m => Number(m.payoutMonth)).filter(Boolean));
  const assignedMonthsCount = assignedMonths.size;
  const unassignedMonthsCount = Math.max(0, duration - assignedMonthsCount);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await api.updateChit(chit.chitId, {
        ...chit,
        status: 'Active',
        currentMonth: chit.currentMonth || 1
      });
      showToast(`Chit scheme "${chit.chitName}" is now officially ACTIVE!`, 'success');
      await refreshChits();
      if (onActivated) onActivated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to activate chit', 'error');
    } finally {
      setActivating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pre-Launch Validation Checklist"
      subtitle={`${chit.chitName} • Scheme Activation`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Warning Banner if not completely full */}
        {!isFull ? (
          <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm text-amber-950">
                Only {joinedCount} of {requiredMembers} memberships are assigned.
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {remainingCount} slot(s) remain unfilled. You can still activate now and continue enrolling members, or cancel and fill remaining slots first.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-950">All {requiredMembers} Slots Assigned & Confirmed!</p>
              <p className="text-[11px] text-emerald-800">
                This chit scheme is fully populated and ready for launch.
              </p>
            </div>
          </div>
        )}

        {/* Audit Metrics Table */}
        <div className="bg-[#F0FCF4] p-4 rounded-xl border border-[#DCE8E0] space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
            <span className="text-[#5B7065] font-semibold">Total Chit Value:</span>
            <span className="font-bold text-[#003524]">{formatINR(chitValue)} ({multiple}× Multiple)</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
            <span className="text-[#5B7065] font-semibold">Duration:</span>
            <span className="font-bold text-[#003524]">{duration} Months</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
            <span className="text-[#5B7065] font-semibold">Required Members:</span>
            <span className="font-bold text-[#003524]">{requiredMembers}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
            <span className="text-[#5B7065] font-semibold">Joined Members:</span>
            <span className={`font-bold ${isFull ? 'text-emerald-800' : 'text-amber-800'}`}>
              {joinedCount} / {requiredMembers}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
            <span className="text-[#5B7065] font-semibold">Assigned Payout Months:</span>
            <span className="font-bold text-[#003524]">{assignedMonthsCount} Months</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
            <span className="text-[#5B7065] font-semibold">Unassigned Payout Months:</span>
            <span className="font-bold text-[#003524]">{unassignedMonthsCount} Months</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#DCE8E0]">
            <span className="text-[#5B7065] font-semibold">Configured Dividend:</span>
            <span className="font-bold text-amber-800">{formatINR(dividend)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-[#5B7065] font-semibold">Installment Plan:</span>
            <span className="font-bold text-[#003524]">Variable by Month</span>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
          >
            {activating ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 text-[#FED255]" />
            )}
            <span>Confirm & Activate Chit Now</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PreLaunchValidationModal;
