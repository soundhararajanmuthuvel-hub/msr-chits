import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { generateChitNumber } from '../../utils/chitNumber';
import { formatINR } from '../../utils/currency';
import { Hash, Calendar, Layers, ShieldCheck, AlertCircle } from 'lucide-react';

export const AssignChitModal = ({
  isOpen,
  onClose,
  initialMonth = null,
  initialMemberName = null,
  prefilledMemberId = null,
  onSuccess
}) => {
  const { activeChit, showToast } = useChit();
  const [members, setMembers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(initialMonth || 2);
  const [selectedMember, setSelectedMember] = useState(prefilledMemberId || '');
  const [customAllocationName, setCustomAllocationName] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Compute the permanent unique Chit Number for the selected month
  const currentChitNumber = useMemo(() => {
    return generateChitNumber({
      year: 2026,
      chitValue: activeChit?.chitValue || 100000,
      sequenceNumber: selectedMonth
    });
  }, [selectedMonth, activeChit]);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        setLoading(true);
        try {
          const [mems, chitData] = await Promise.all([
            api.getMembers(),
            api.getChit(activeChit?.chitId || 'CHIT-100K-01')
          ]);
          setMembers(mems || []);
          setSchedule(chitData?.schedule || []);

          if (initialMonth) {
            setSelectedMonth(Number(initialMonth));
          }

          if (prefilledMemberId) {
            setSelectedMember(prefilledMemberId);
            setIsCustom(false);
          } else if (initialMemberName) {
            if (initialMemberName.includes('+')) {
              setIsCustom(true);
              setCustomAllocationName(initialMemberName);
            } else {
              const matched = mems.find(m => m.name === initialMemberName);
              if (matched) {
                setSelectedMember(matched.memberId);
                setIsCustom(false);
              } else {
                setIsCustom(true);
                setCustomAllocationName(initialMemberName);
              }
            }
          } else {
            setSelectedMember('');
            setIsCustom(false);
            setCustomAllocationName('');
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [isOpen, initialMonth, initialMemberName, prefilledMemberId, activeChit]);

  // Find currently assigned member for this month
  const currentMonthAssignment = useMemo(() => {
    return schedule.find(s => Number(s.month || s.monthNumber) === Number(selectedMonth));
  }, [schedule, selectedMonth]);

  // Selected member details
  const selectedMemberObj = useMemo(() => {
    return members.find(m => m.memberId === selectedMember);
  }, [members, selectedMember]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let memberName = 'Not Assigned';
    let memberId = '';

    if (isCustom) {
      memberName = customAllocationName.trim() || 'Not Assigned';
    } else if (selectedMember && selectedMember !== 'unassigned') {
      const mem = members.find(m => m.memberId === selectedMember);
      memberName = mem ? mem.name : 'Not Assigned';
      memberId = selectedMember;
    }

    try {
      await api.assignChit({
        chitId: activeChit?.chitId || 'CHIT-100K-01',
        month: selectedMonth,
        memberId,
        memberName,
        chitNo: currentChitNumber
      });

      showToast(`Chit ${currentChitNumber} (Month ${selectedMonth}) assigned to ${memberName} successfully!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Permanent Chit Number"
      subtitle={`${activeChit?.chitName || 'MSR Chit — ₹1,00,000'}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Generated Permanent Unique Chit Number Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#003524] to-[#174D38] text-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#C9A227] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Permanent Chit Number
            </span>
            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
              Fixed Payout Month {selectedMonth}
            </span>
          </div>

          <div className="mt-2 text-2xl font-black tracking-tight font-mono text-white flex items-center gap-2">
            <span>{currentChitNumber}</span>
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#C4D9CC]">
            <span>Value: {formatINR(activeChit?.chitValue || 100000)}</span>
            <span>Duration: 20 Months</span>
            <span>Installment: ₹3,750</span>
          </div>
        </div>

        {/* Month Selection */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Fixed Payout Month *
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => {
              const schItem = schedule.find(s => Number(s.month || s.monthNumber) === m);
              const assignedTo = schItem?.assignedMemberName || schItem?.memberName;
              const hasAssignment = assignedTo && assignedTo !== 'Not Assigned';

              return (
                <option key={m} value={m}>
                  Month {m} {hasAssignment ? `(Currently: ${assignedTo})` : '(Available)'}
                </option>
              );
            })}
          </select>
        </div>

        {/* Current Assignment Status Notice */}
        {currentMonthAssignment && currentMonthAssignment.assignedMemberName && currentMonthAssignment.assignedMemberName !== 'Not Assigned' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Current Slot Assignment: </span>
              <span>
                Month {selectedMonth} is currently assigned to <span className="font-bold">{currentMonthAssignment.assignedMemberName}</span>.
              </span>
            </div>
          </div>
        )}

        {/* Allocation Mode Toggle */}
        <div className="flex items-center gap-4 pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#131E19]">
            <input
              type="radio"
              name="allocMode"
              checked={!isCustom}
              onChange={() => setIsCustom(false)}
              className="text-[#003524] focus:ring-[#003524]"
            />
            Single Member
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#131E19]">
            <input
              type="radio"
              name="allocMode"
              checked={isCustom}
              onChange={() => setIsCustom(true)}
              className="text-[#003524] focus:ring-[#003524]"
            />
            Shared / Multi-Member (e.g. Amma + MU)
          </label>
        </div>

        {!isCustom ? (
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Select Member *
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
            >
              <option value="unassigned">— Not Assigned —</option>
              {members.map((m) => {
                const count = m.chits?.length || (m.payoutMonth && m.payoutMonth !== 'Not Assigned' ? 1 : 0);
                return (
                  <option key={m.memberId} value={m.memberId}>
                    {m.name} ({m.mobile}) • {count > 0 ? `${count} Chit(s)` : 'No Chits'}
                  </option>
                );
              })}
            </select>

            {/* Multiple Chits Notice */}
            {selectedMemberObj && (
              <div className="mt-2 p-2.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-lg text-xs text-[#003524]">
                <span className="font-bold block">One Member → Many Chits Supported:</span>
                <span>
                  {selectedMemberObj.name} currently holds {selectedMemberObj.chits?.length || 0} chit(s).
                  Assigning this will add <span className="font-mono font-bold">{currentChitNumber}</span> to their profile without overwriting their existing chits.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Custom / Shared Allocation Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Amma + MU"
              value={customAllocationName}
              onChange={(e) => setCustomAllocationName(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              required
            />
            <p className="text-[10px] text-[#5B7065] mt-1">
              For shared payouts such as Month 2 (Amma + MU).
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAF2EC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>Save Assignment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignChitModal;
