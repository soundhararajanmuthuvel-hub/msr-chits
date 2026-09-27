import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { calculateCommission, calculatePayoutFromMonthlyChit, calculateMonthlyChitFromPayout } from '../../utils/chitCalculations';
import { Calendar, IndianRupee, ShieldCheck, CheckCircle2, AlertCircle, Percent, Users, Calculator } from 'lucide-react';

export const EditMonthlyChitModal = ({
  isOpen,
  onClose,
  scheduleItem,
  chit,
  onSuccess
}) => {
  const { showToast } = useChit();
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [syncPayout, setSyncPayout] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && scheduleItem) {
      setMonthlyAmount(String(scheduleItem.monthlyAmount || scheduleItem.amount || ''));
      setNotes(scheduleItem.notes || '');
      setSyncPayout(false);
      setError(null);
    }
  }, [isOpen, scheduleItem]);

  if (!isOpen || !scheduleItem) return null;

  const month = Number(scheduleItem.month || scheduleItem.monthNumber || 1);
  const chitId = chit?.chitId || scheduleItem.chitId || 'CHIT-100K-01';
  const chitValue = Number(chit?.chitValue || chit?.totalAmount || 100000);
  const duration = Number(chit?.duration || chit?.durationMonths || 20);
  const totalMembers = Number(chit?.totalMembers || chit?.memberCount || duration || 20);
  const commPercent = Number(chit?.commissionPercent || 5);
  const commissionAmount = Number(chit?.commissionAmount) || calculateCommission(chitValue, commPercent);
  const currentPayout = Number(scheduleItem.payoutAmount || 70000);

  // Normal Monthly Chit = Chit Value / Members (e.g. ₹5,000)
  const normalMonthlyChit = totalMembers > 0 ? Math.round(chitValue / totalMembers) : 5000;

  // Live Dependent Values:
  const numEnteredMonthly = Number(monthlyAmount) || 0;
  // Dividend = Normal Monthly Chit - Actual Monthly Chit
  const calculatedDividend = Math.max(0, normalMonthlyChit - numEnteredMonthly);
  // Derived Payout = Actual Monthly Chit * Members - Commission
  const calculatedPayout = Math.max(0, numEnteredMonthly * totalMembers - commissionAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(monthlyAmount);

    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid positive monthly chit collection amount (e.g. 4000)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        chitId,
        month,
        monthlyAmount: numAmt,
        amount: numAmt,
        dividend: calculatedDividend,
        payoutAmount: syncPayout ? calculatedPayout : currentPayout,
        commissionAmount,
        totalMembers,
        notes
      };

      await api.updateMonthlyScheduleItem(payload);

      showToast(`Month ${month} Monthly Chit updated to ${formatINR(numAmt)} (Dividend: ${formatINR(calculatedDividend)}) successfully!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Update monthly chit error:', err);
      setError(err.message || 'Failed to update monthly chit amount');
      showToast(err.message || 'Failed to update monthly chit amount', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Month ${month} Monthly Chit`}
      subtitle={`Configure collection amount per member for Month ${month} • Scheme: ${chit?.chitName || 'MSR Chit'}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan Parameters Overview */}
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
              <span>Normal Monthly Chit:</span>
            </span>
            <span className="font-extrabold text-[#003524]">
              {formatINR(normalMonthlyChit)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#DCE8E0]/70">
            <span className="text-[#5B7065] flex items-center gap-1.5 font-medium">
              <Percent className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Commission ({commPercent}%):</span>
            </span>
            <span className="font-bold text-[#003524]">
              {formatINR(commissionAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#5B7065] flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Total Members:</span>
            </span>
            <span className="font-bold text-[#003524]">
              {totalMembers} Members
            </span>
          </div>
        </div>

        {/* Editable Monthly Chit Amount */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Actual Monthly Chit (Collection per Member) *</span>
            </span>
            {monthlyAmount && !isNaN(Number(monthlyAmount)) && Number(monthlyAmount) > 0 && (
              <span className="text-xs font-extrabold text-emerald-800">
                {formatINR(Number(monthlyAmount))}
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5B7065]">₹</span>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 4000"
              value={monthlyAmount}
              onChange={(e) => {
                setMonthlyAmount(e.target.value);
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
            The exact installment amount collected from each member for Month {month}.
          </p>
        </div>

        {/* Live Recalculation Dependency Box */}
        {numEnteredMonthly > 0 && (
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#174D38]">Resulting Dividend (Discount):</span>
              <span className="font-extrabold text-amber-900 text-sm">
                {formatINR(calculatedDividend)}
              </span>
            </div>
            <p className="text-[11px] text-[#2D5A43] font-mono leading-relaxed">
              Dividend = Normal ({formatINR(normalMonthlyChit)}) - Actual ({formatINR(numEnteredMonthly)}) = {formatINR(calculatedDividend)}
            </p>
            <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11px] text-[#003524] font-semibold select-none">
              <input
                type="checkbox"
                checked={syncPayout}
                onChange={(e) => setSyncPayout(e.target.checked)}
                className="w-3.5 h-3.5 text-[#003524] rounded border-emerald-300 focus:ring-0"
              />
              <span>Sync Payout to {formatINR(calculatedPayout)} ({formatINR(numEnteredMonthly)} × {totalMembers} - {formatINR(commissionAmount)})</span>
            </label>
          </div>
        )}

        {/* Safety Note */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#5B7065] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#174D38] shrink-0 mt-0.5" />
          <p>
            <strong>Financial Integrity:</strong> Manual adjustment preserves member assignments and historical recorded payments.
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
            <span>Save Monthly Chit</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditMonthlyChitModal;
