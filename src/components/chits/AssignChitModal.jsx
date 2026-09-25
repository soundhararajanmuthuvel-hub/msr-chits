import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';

export const AssignChitModal = ({
  isOpen,
  onClose,
  initialMonth = null,
  initialMemberName = null,
  onSuccess
}) => {
  const { activeChit, showToast } = useChit();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(initialMonth || 2);
  const [selectedMember, setSelectedMember] = useState('');
  const [customAllocationName, setCustomAllocationName] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        setLoading(true);
        try {
          const mems = await api.getMembers();
          setMembers(mems || []);

          if (initialMonth) {
            setSelectedMonth(Number(initialMonth));
          }

          if (initialMemberName) {
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
  }, [isOpen, initialMonth, initialMemberName]);

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
        memberName
      });
      showToast(`Month ${selectedMonth} assigned to ${memberName} successfully!`, 'success');
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
      title="Assign Chit to Member"
      subtitle={`${activeChit?.chitName || 'MSR Chit — ₹1,00,000'}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Month Selection */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Chit Month *
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Month {m} {m === 2 ? '(Month 2 - ₹70,000)' : m === 1 ? '(Month 1 - ₹1,00,000)' : ''}
              </option>
            ))}
          </select>
        </div>

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
            Multi-Member / Shared (e.g. Amma + MU)
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
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            >
              <option value="unassigned">— Not Assigned —</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.name} {m.payoutMonth && m.payoutMonth !== 'Not Assigned' ? `(${m.payoutMonth})` : '(Available)'}
                </option>
              ))}
            </select>
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
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
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
            className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-lg shadow-sm transition-colors flex items-center gap-2"
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
