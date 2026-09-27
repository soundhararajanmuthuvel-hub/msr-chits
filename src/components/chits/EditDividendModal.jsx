import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { calculateCommission, calculateMonthlyChitFromPayout } from '../../utils/chitCalculations';
import { Calendar, IndianRupee, ShieldCheck, CheckCircle2, AlertCircle, Percent, Users, Calculator, Sparkles } from 'lucide-react';

export const EditDividendModal = ({
  isOpen,
  onClose,
  scheduleItem,
  chit,
  onSuccess
}) => {
  const { showToast } = useChit();
  const [dividend, setDividend] = useState('');
  const [syncPayout, setSyncPayout] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && scheduleItem) {
      setDividend(String(scheduleItem.dividend || ''));
      setNotes(scheduleItem.notes || '');
      setSyncPayout(true);
      setError(null);
    }
  }, [isOpen, scheduleItem]);

  if (!scheduleItem) return null;

  const month = Number(scheduleItem.month || scheduleItem.monthNumber || 1);
  const chitId = chit?.chitId || scheduleItem.chitId || 'CHIT-100K-01';
  const chitValue = Number(chit?.chitValue || chit?.totalAmount || 100000);
  const duration = Number(chit?.duration || chit?.durationMonths || 20);
  const totalMembers = Number(chit?.totalMembers || chit?.memberCount || duration || 20);
  const commPercent = Number(chit?.commissionPercent || 5);
  const commissionAmount = Number(chit?.commissionAmount) || calculateCommission(chitValue, commPercent);
  
  // Normal Monthly Chit = Chit Value / Members (e.g. ₹5,000)
  const normalMonthlyChit = totalMembers > 0 ? Math.round(chitValue / totalMembers) : 5000;
  
  // Live Dependent Values:
  // Actual Monthly Chit = Normal Monthly Chit - Dividend
  const numDividend = Number(dividend) || 0;
  const calculatedActualMonthly = Math.max(0, normalMonthlyChit - numDividend);
  // Derived Payout = Actual Monthly Chit * Members - Commission
  const calculatedPayout = Math.max(0, calculatedActualMonthly * totalMembers - commissionAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numDiv = Number(dividend);

    if (isNaN(numDiv) || numDiv < 0) {
      setError('Please enter a valid positive dividend amount (e.g. 1000)');
      return;
    }
    if (numDiv > normalMonthlyChit) {
      setError(`Dividend cannot exceed normal monthly installment (${formatINR(normalMonthlyChit)})`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        chitId,
        month,
        dividend: numDiv,
        monthlyAmount: calculatedActualMonthly,
        amount: calculatedActualMonthly,
        payoutAmount: syncPayout ? calculatedPayout : Number(scheduleItem.payoutAmount || 70000),
        commissionAmount,
        totalMembers,
        notes
      };

      await api.updateMonthlyScheduleItem(payload);

      showToast(`Month ${month} Dividend updated to ${formatINR(numDiv)} (Monthly Chit: ${formatINR(calculatedActualMonthly)}) successfully!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Update dividend error:', err);
      setError(err.message || 'Failed to update dividend');
      showToast(err.message || 'Failed to update dividend', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Month ${month} Dividend`}
      subtitle={`Configure auction dividend discount for Month ${month} • Scheme: ${chit?.chitName || 'MSR Chit'}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core Financial Plan Overview */}
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

        {/* Editable Dividend Field */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Dividend (Discount per Member) *</span>
            </span>
            {dividend && !isNaN(Number(dividend)) && (
              <span className="text-xs font-extrabold text-amber-800">
                {formatINR(Number(dividend))}
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-[#5B7065]">₹</span>
            <input
              type="number"
              min={0}
              max={normalMonthlyChit}
              step={1}
              placeholder="e.g. 1250"
              value={dividend}
              onChange={(e) => {
                setDividend(e.target.value);
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
            Amount reduced from the normal {formatINR(normalMonthlyChit)} installment.
          </p>
        </div>

        {/* Live Recalculation Dependency Box */}
        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#174D38]">Resulting Actual Monthly Chit:</span>
            <span className="font-extrabold text-emerald-900 text-sm">
              {formatINR(calculatedActualMonthly)}
            </span>
          </div>
          <p className="text-[11px] text-[#2D5A43] font-mono leading-relaxed">
            Actual Monthly Chit = Normal ({formatINR(normalMonthlyChit)}) - Dividend ({formatINR(numDividend)})
            <br />
            = {formatINR(calculatedActualMonthly)} per member
          </p>
          <label className="flex items-center gap-2 pt-1 cursor-pointer text-[11px] text-[#003524] font-semibold select-none">
            <input
              type="checkbox"
              checked={syncPayout}
              onChange={(e) => setSyncPayout(e.target.checked)}
              className="w-3.5 h-3.5 text-[#003524] rounded border-emerald-300 focus:ring-0"
            />
            <span>Sync Payout to {formatINR(calculatedPayout)} ({formatINR(calculatedActualMonthly)} × {totalMembers} - {formatINR(commissionAmount)})</span>
          </label>
        </div>

        {/* Safety Notice */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#5B7065] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#174D38] shrink-0 mt-0.5" />
          <p>
            <strong>Dependency Rule:</strong> Changing dividend recalculates dependent monthly collection and payout while protecting historical payments.
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
            <span>Save Dividend</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditDividendModal;
