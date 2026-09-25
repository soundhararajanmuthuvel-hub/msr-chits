import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput } from '../../utils/date';
import { INITIAL_SCHEDULE } from '../../data/demoData';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const PayoutForm = ({
  isOpen,
  onClose,
  prefilledMonth = null,
  onSuccess
}) => {
  const { activeChit, showToast } = useChit();
  const [step, setStep] = useState(1); // 1: Form, 2: Confirmation Summary
  const [members, setMembers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    chitId: activeChit?.chitId || 'CHIT-100K-01',
    month: activeChit?.currentMonth || 2,
    memberId: 'MEM-001,MEM-003',
    memberName: 'Amma + MU',
    amount: 70000,
    payoutDate: getTodayDateInput(),
    paymentMode: 'Bank Transfer',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const loadData = async () => {
        try {
          const mems = await api.getMembers();
          setMembers(mems || []);

          const chitData = await api.getChit(activeChit?.chitId || 'CHIT-100K-01');
          const sch = chitData.schedule || INITIAL_SCHEDULE;
          setSchedule(sch);

          const targetMonth = prefilledMonth || activeChit?.currentMonth || 2;
          const schItem = sch.find(s => s.month === Number(targetMonth)) || sch[1];

          setFormData({
            chitId: activeChit?.chitId || 'CHIT-100K-01',
            month: Number(targetMonth),
            memberId: schItem?.assignedMemberId || 'MEM-001,MEM-003',
            memberName: schItem?.assignedMemberName || 'Amma + MU',
            amount: schItem ? schItem.payoutAmount : 70000,
            payoutDate: getTodayDateInput(),
            paymentMode: 'Bank Transfer',
            reference: `NEFT-MSR-${Date.now().toString().slice(-4)}`,
            notes: `Month ${targetMonth} Chit Dividend Payout`
          });
        } catch (e) {
          console.error(e);
        }
      };
      loadData();
    }
  }, [isOpen, prefilledMonth, activeChit]);

  const handleMonthChange = (monthVal) => {
    const monthNum = Number(monthVal);
    const schItem = schedule.find(s => s.month === monthNum);

    setFormData(prev => ({
      ...prev,
      month: monthNum,
      amount: schItem ? schItem.payoutAmount : 70000,
      memberId: schItem ? schItem.assignedMemberId : prev.memberId,
      memberName: schItem ? schItem.assignedMemberName : prev.memberName
    }));
  };

  const handleNextToConfirmation = (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      showToast('Please enter a valid payout amount', 'error');
      return;
    }
    setStep(2);
  };

  const handleConfirmPayout = async () => {
    setSubmitting(true);
    try {
      await api.recordPayout(formData);
      showToast(`Payout of ${formatINR(formData.amount)} to ${formData.memberName} confirmed!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to record payout', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Record Chit Payout' : 'Confirm Payout Summary'}
      subtitle={`${activeChit?.chitName || 'MSR Chit — ₹1,00,000'}`}
      maxWidth="max-w-lg"
    >
      {step === 1 ? (
        <form onSubmit={handleNextToConfirmation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Payout Month *
              </label>
              <select
                value={formData.month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Month {m} {m === 2 ? '(Amma + MU - ₹70k)' : m === 1 ? '(MU - ₹1 Lakh)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Payout Amount (₹) *
              </label>
              <input
                type="number"
                min="1000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#F0FCF4] border border-[#DCE8E0] rounded-lg text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Beneficiary / Member Allocation *
            </label>
            <input
              type="text"
              value={formData.memberName}
              onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
              placeholder="e.g. Amma + MU, MU, Suresh Kumar"
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
            <p className="text-[10px] text-[#5B7065] mt-1">
              For shared payouts, use multi-member names (e.g. Amma + MU).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Payout Mode *
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI Transfer</option>
                <option value="Cash">Cash Handover</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Payout Date *
              </label>
              <input
                type="date"
                value={formData.payoutDate}
                onChange={(e) => setFormData({ ...formData, payoutDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              UTR / Cheque / Reference No
            </label>
            <input
              type="text"
              placeholder="e.g. NEFT Reference / Cheque No"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Remarks
            </label>
            <input
              type="text"
              placeholder="Optional remarks"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>

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
              className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>Review Summary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      ) : (
        /* Confirmation Screen */
        <div className="space-y-4">
          <div className="bg-[#F0FCF4] p-5 rounded-2xl border border-[#DCE8E0] space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
              <span className="text-xs font-semibold text-[#4B6358]">Chit Group</span>
              <span className="text-xs font-bold text-[#003524]">{activeChit?.chitName}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
              <span className="text-xs font-semibold text-[#4B6358]">Payout Month</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-[#C9A227]/20 text-[#85660D]">
                Month {formData.month}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
              <span className="text-xs font-semibold text-[#4B6358]">Beneficiary Member</span>
              <span className="text-sm font-bold text-[#131E19]">{formData.memberName}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
              <span className="text-xs font-semibold text-[#4B6358]">Payment Mode</span>
              <span className="text-xs font-semibold text-[#131E19]">{formData.paymentMode} ({formData.reference || 'N/A'})</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-[#003524]">Total Payout Amount</span>
              <span className="text-xl font-extrabold text-[#003524]">
                {formatINR(formData.amount)}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#5B7065] text-center">
            Please verify all payout details before confirming. This will update the Master Chit Schedule.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmPayout}
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
              <span>Confirm Payout</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PayoutForm;
