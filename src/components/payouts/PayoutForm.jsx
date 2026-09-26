import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput, formatDate } from '../../utils/date';
import { INITIAL_SCHEDULE } from '../../data/demoData';
import { generateChitNumber } from '../../utils/chitNumber';
import { CheckCircle2, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';
import WhatsAppComposerModal from '../whatsapp/WhatsAppComposerModal';

export const PayoutForm = ({
  isOpen,
  onClose,
  prefilledMonth = null,
  onSuccess
}) => {
  const { activeChit, showToast } = useChit();
  const [step, setStep] = useState(1); // 1: Form, 2: Confirmation Summary, 3: Success Screen
  const [members, setMembers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successPayout, setSuccessPayout] = useState(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const [formData, setFormData] = useState({
    chitId: activeChit?.chitId || 'CHIT-100K-01',
    month: activeChit?.currentMonth || 2,
    memberId: 'MEM-001,MEM-003',
    memberName: 'Amma + MU',
    chitNo: 'MSR261L02',
    amount: 70000,
    payoutDate: getTodayDateInput(),
    paymentMode: 'Bank Transfer',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSuccessPayout(null);
      setIsWhatsAppOpen(false);

      const loadData = async () => {
        try {
          const mems = await api.getMembers();
          setMembers(mems || []);

          const chitData = await api.getChit(activeChit?.chitId || 'CHIT-100K-01');
          const sch = chitData.schedule || INITIAL_SCHEDULE;
          setSchedule(sch);

          const targetMonth = Number(prefilledMonth || activeChit?.currentMonth || 2);
          const schItem = sch.find(s => s.month === targetMonth) || sch[1];
          const chitNo = generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: targetMonth });

          setFormData({
            chitId: activeChit?.chitId || 'CHIT-100K-01',
            month: targetMonth,
            memberId: schItem?.assignedMemberId || 'MEM-001,MEM-003',
            memberName: schItem?.assignedMemberName || 'Amma + MU',
            chitNo: chitNo,
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
    const chitNo = generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: monthNum });

    setFormData(prev => ({
      ...prev,
      month: monthNum,
      chitNo: chitNo,
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
      const recorded = await api.recordPayout(formData);
      showToast(`Payout of ${formatINR(formData.amount)} to ${formData.memberName} confirmed!`, 'success');
      if (onSuccess) onSuccess();
      setSuccessPayout(recorded);
      setStep(3); // Show Success & WhatsApp confirmation screen
    } catch (err) {
      showToast(err.message || 'Failed to record payout', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Find member object for WhatsApp
  const targetMemberObj = useMemo(() => {
    if (!formData.memberId) return null;
    const firstId = formData.memberId.split(',')[0].trim();
    return members.find(m => m.memberId === firstId || m.name === formData.memberName) || {
      memberId: firstId,
      name: formData.memberName,
      mobile: '9876543210',
      chits: [{ chitNo: formData.chitNo, payoutMonth: formData.month }]
    };
  }, [formData, members]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          step === 3
            ? 'Payout Recorded Successfully'
            : step === 2
            ? 'Confirm Payout Summary'
            : 'Record Chit Payout'
        }
        subtitle={`${activeChit?.chitName || 'MSR Chit — ₹1,00,000'}`}
        maxWidth="max-w-lg"
      >
        {step === 3 && successPayout ? (
          /* ================================================================ */
          /* SECTION 11: PAYOUT SUCCESS STATE & WHATSAPP CONFIRMATION */
          /* ================================================================ */
          <div className="space-y-5 py-2">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-emerald-950">
                Payout Disbursed Successfully 🎉
              </h3>
              <p className="text-xs text-emerald-800">
                Dividend payout has been recorded and finalized in database.
              </p>
            </div>

            {/* Payout Summary Receipt */}
            <div className="p-4 rounded-xl bg-slate-50 border border-[#DCE8E0] space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Beneficiary:</span>
                <span className="font-bold text-[#003524]">{successPayout.memberName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Chit No:</span>
                <span className="font-mono font-bold text-[#174D38]">{successPayout.chitNo || formData.chitNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Payout Month:</span>
                <span className="font-bold text-[#131E19]">Month {successPayout.month || successPayout.monthNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Payout Amount:</span>
                <span className="font-black text-emerald-900 text-base">{formatINR(successPayout.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Payout Date:</span>
                <span className="font-semibold text-[#131E19]">{formatDate(successPayout.payoutDate)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5B7065]">Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-xs">
                  Paid
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setIsWhatsAppOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Payout Confirmation</span>
              </button>
            </div>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleNextToConfirmation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Payout Month *
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Month {m} {m === 2 ? '(Amma + MU)' : m === 1 ? '(MU - NIL)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Permanent Chit Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={formData.chitNo}
                    className="w-full px-3 py-2.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl font-mono text-xs sm:text-sm font-bold text-[#174D38] cursor-not-allowed min-h-[44px]"
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-600 absolute right-3 top-3" />
                </div>
              </div>
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
                className="w-full px-3 py-2 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl text-base font-extrabold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                required
              />
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
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
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
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
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
                  className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                UTR / Reference No
              </label>
              <input
                type="text"
                placeholder="e.g. UTR / NEFT Reference Number"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>

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
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation Summary */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
              <span className="font-bold text-amber-900 block text-sm">
                Confirm Payout Disbursement
              </span>
              <p className="text-amber-800">
                Please double check beneficiary and payout amount before submitting.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-[#DCE8E0] rounded-xl space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Beneficiary:</span>
                <span className="font-bold text-[#003524]">{formData.memberName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Chit No:</span>
                <span className="font-mono font-bold text-[#174D38]">{formData.chitNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Payout Month:</span>
                <span className="font-bold text-[#131E19]">Month {formData.month}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Amount:</span>
                <span className="font-black text-emerald-800 text-base">{formatINR(formData.amount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5B7065]">Mode / Date:</span>
                <span className="font-semibold text-[#131E19]">{formData.paymentMode} • {formatDate(formData.payoutDate)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#EAF2EC]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmPayout}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Confirm & Disburse</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* WhatsApp Payout Confirmation Modal */}
      {isWhatsAppOpen && successPayout && targetMemberObj && (
        <WhatsAppComposerModal
          isOpen={isWhatsAppOpen}
          onClose={() => {
            setIsWhatsAppOpen(false);
            onClose();
          }}
          member={targetMemberObj}
          initialMessageType="payout_confirmation"
          payoutRecord={successPayout}
        />
      )}
    </>
  );
};

export default PayoutForm;
