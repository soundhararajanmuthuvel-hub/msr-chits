import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { generateChitNumber } from '../../utils/chitNumber';
import { Calendar, Hash, User, IndianRupee, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export const EditPayoutModal = ({
  isOpen,
  onClose,
  scheduleItem,
  chit,
  onSuccess
}) => {
  const { showToast } = useChit();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && scheduleItem) {
      setPayoutAmount(String(scheduleItem.payoutAmount || ''));
      setNotes(scheduleItem.notes || '');
      setError(null);
    }
  }, [isOpen, scheduleItem]);

  if (!scheduleItem) return null;

  const month = Number(scheduleItem.month || scheduleItem.monthNumber || 1);
  const chitId = chit?.chitId || scheduleItem.chitId || 'CHIT-100K-01';
  const chitValue = Number(chit?.chitValue || chit?.totalAmount || 100000);
  const chitNo = scheduleItem.chitNo || generateChitNumber({ year: 2026, chitValue, sequenceNumber: month });
  const memberName = scheduleItem.memberName || scheduleItem.assignedMemberName || 'Not Assigned';
  const fundingSource = String(scheduleItem.fundingSource || '').toUpperCase().includes('EXTRA') ? 'EXTRA_INVESTMENT' : 'CHIT_FUND';
  const monthlyChit = Number(scheduleItem.monthlyAmount || scheduleItem.amount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(payoutAmount);

    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid positive payout amount (e.g. 70000)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.updateSchedulePayout({
        payoutId: scheduleItem.payoutId,
        chitId,
        month,
        payoutAmount: numAmt,
        chitNo,
        memberId: scheduleItem.memberId || scheduleItem.assignedMemberId,
        memberName,
        fundingSource,
        notes
      });

      showToast(`Month ${month} Payout for ${memberName} updated to ${formatINR(numAmt)} successfully!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Update payout error:', err);
      setError(err.message || 'Failed to update payout amount');
      showToast(err.message || 'Failed to update payout amount', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Payout"
      subtitle={`Month ${month} Payout Allocation for ${memberName} • Chit: ${chit?.chitName || 'MSR Chit'}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-Only Informational Fields */}
        <div className="p-3.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-[#DCE8E0]/70">
            <span className="text-[#5B7065] flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Month:</span>
            </span>
            <span className="font-extrabold text-[#003524]">
              Month {month}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#DCE8E0]/70">
            <span className="text-[#5B7065] flex items-center gap-1.5 font-medium">
              <Hash className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Chit No:</span>
            </span>
            <span className="font-mono font-bold text-[#003524] px-1.5 py-0.5 bg-white border border-[#DCE8E0] rounded">
              {chitNo}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#DCE8E0]/70">
            <span className="text-[#5B7065] flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Member:</span>
            </span>
            <span className="font-bold text-[#003524]">
              {memberName}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#DCE8E0]/70">
            <span className="text-[#5B7065] flex items-center gap-1.5 font-medium">
              <span>Funding Source:</span>
            </span>
            <span
              className={`font-extrabold text-[10px] px-2 py-0.5 rounded uppercase border ${
                fundingSource === 'EXTRA_INVESTMENT'
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {fundingSource === 'EXTRA_INVESTMENT' ? 'EXTRA INVESTMENT' : 'CHIT FUND'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#5B7065] flex items-center gap-1.5 font-medium">
              <span>Monthly Chit (Collection):</span>
            </span>
            <span className="font-extrabold text-[#174D38]">
              {formatINR(monthlyChit)}
            </span>
          </div>
        </div>

        {/* Editable Payout Amount */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Payout Amount (Disbursed to Member) *</span>
            </span>
            {payoutAmount && !isNaN(Number(payoutAmount)) && Number(payoutAmount) > 0 && (
              <span className="text-xs font-extrabold text-emerald-800">
                {formatINR(Number(payoutAmount))}
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5B7065]">₹</span>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 70000"
              value={payoutAmount}
              onChange={(e) => {
                setPayoutAmount(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full pl-8 pr-3 py-2 bg-white border rounded-lg text-xs sm:text-sm font-bold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] ${
                error ? 'border-red-400 bg-red-50/30' : 'border-[#DCE8E0]'
              }`}
              required
              autoFocus
            />
          </div>
          {error && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          <p className="text-[11px] text-[#5B7065] mt-1">
            The actual net sum disbursed to the chit taker for Month {month}. Does not change the Monthly Chit collection (₹{monthlyChit.toLocaleString('en-IN')}).
          </p>
        </div>

        {/* Data Safety Notice */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#5B7065] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#174D38] shrink-0 mt-0.5" />
          <p>
            <strong>Financial Safety:</strong> Updating the payout amount preserves Chit No ({chitNo}), assigned member ({memberName}), and historical payments without modification.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-lg shadow-sm transition-colors flex items-center gap-2 min-h-[40px]"
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
            <span>Save Payout</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditPayoutModal;
