import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput, formatDate } from '../../utils/date';
import { INITIAL_SCHEDULE } from '../../data/demoData';
import { generateChitNumber } from '../../utils/chitNumber';
import { CheckCircle2, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';
import WhatsAppComposerModal from '../whatsapp/WhatsAppComposerModal';

export const PaymentForm = ({ isOpen, onClose, prefilledMemberId = null, prefilledMonth = null, onSuccess }) => {
  const { activeChit, showToast } = useChit();
  const [members, setMembers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success view state after successful API write
  const [successPayment, setSuccessPayment] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    chitId: activeChit?.chitId || 'CHIT-100K-01',
    memberId: '',
    memberName: '',
    chitNo: '',
    month: activeChit?.currentMonth || 2,
    dueAmount: 3750,
    paidAmount: 3750,
    paymentDate: getTodayDateInput(),
    paymentMode: 'UPI',
    reference: '',
    notes: ''
  });

  // Load members and schedule
  useEffect(() => {
    if (isOpen) {
      setSuccessPayment(null);
      setIsWhatsAppModalOpen(false);

      const loadFormData = async () => {
        setLoading(true);
        try {
          const mems = await api.getMembers();
          setMembers(mems || []);
          
          const chitDetails = await api.getChit(activeChit?.chitId || 'CHIT-100K-01');
          const sch = chitDetails.schedule || INITIAL_SCHEDULE;
          setSchedule(sch);

          const defaultMember = prefilledMemberId
            ? mems.find(m => m.memberId === prefilledMemberId) || mems[0]
            : mems[0];

          const defaultMonth = prefilledMonth || activeChit?.currentMonth || 2;
          const scheduleItem = sch.find(s => s.month === Number(defaultMonth)) || sch[1];
          const due = scheduleItem ? scheduleItem.monthlyAmount : 3750;

          // Default Chit No
          const memChits = defaultMember?.chits || [];
          const matchedChit = memChits.find(c => Number(c.payoutMonth) === Number(defaultMonth));
          const defaultChitNo = matchedChit ? matchedChit.chitNo : (memChits[0]?.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: defaultMonth }));

          setFormData({
            chitId: activeChit?.chitId || 'CHIT-100K-01',
            memberId: defaultMember?.memberId || '',
            memberName: defaultMember?.name || '',
            chitNo: defaultChitNo,
            month: defaultMonth,
            dueAmount: due,
            paidAmount: due,
            paymentDate: getTodayDateInput(),
            paymentMode: 'UPI',
            reference: `UPI-${Date.now().toString().slice(-6)}`,
            notes: ''
          });
        } catch (err) {
          console.error('Failed to load payment options:', err);
        } finally {
          setLoading(false);
        }
      };
      loadFormData();
    }
  }, [isOpen, prefilledMemberId, prefilledMonth, activeChit]);

  // Handle month change
  const handleMonthChange = (newMonth) => {
    const monthNum = Number(newMonth);
    const scheduleItem = schedule.find(s => s.month === monthNum);
    const due = scheduleItem ? scheduleItem.monthlyAmount : 3750;

    // Check member's chits for this month
    const curMember = members.find(m => m.memberId === formData.memberId);
    const memChits = curMember?.chits || [];
    const matchedChit = memChits.find(c => Number(c.payoutMonth) === monthNum);
    const nextChitNo = matchedChit ? matchedChit.chitNo : (memChits[0]?.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: monthNum }));

    setFormData(prev => ({
      ...prev,
      month: monthNum,
      dueAmount: due,
      paidAmount: due,
      chitNo: nextChitNo
    }));
  };

  const handleMemberChange = (memberId) => {
    const selected = members.find(m => m.memberId === memberId);
    const memChits = selected?.chits || [];
    const matchedChit = memChits.find(c => Number(c.payoutMonth) === Number(formData.month));
    const nextChitNo = matchedChit ? matchedChit.chitNo : (memChits[0]?.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: formData.month }));

    setFormData(prev => ({
      ...prev,
      memberId,
      memberName: selected ? selected.name : '',
      chitNo: nextChitNo
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.memberId) {
      showToast('Please select a member', 'error');
      return;
    }
    if (!formData.paidAmount || formData.paidAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const recorded = await api.recordPayment(formData);
      showToast(`Payment of ${formatINR(formData.paidAmount)} recorded successfully!`, 'success');
      if (onSuccess) onSuccess();

      // Show success screen with WhatsApp confirmation button (Section 9)
      setSuccessPayment(recorded);
    } catch (err) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMemberObj = members.find(m => m.memberId === formData.memberId);
  const memberChits = selectedMemberObj?.chits || [];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={successPayment ? 'Payment Recorded Successfully' : 'Record Member Payment'}
        subtitle={`${activeChit?.chitName || 'MSR Chit — ₹1,00,000'}`}
        maxWidth="max-w-lg"
      >
        {successPayment ? (
          /* ================================================================ */
          /* SECTION 9: PAYMENT SUCCESS STATE & WHATSAPP CONFIRMATION */
          /* ================================================================ */
          <div className="space-y-5 py-2">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-emerald-950">
                Payment Recorded Successfully ✓
              </h3>
              <p className="text-xs text-emerald-800">
                Installment has been persisted to Google Sheets database.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-[#DCE8E0] space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Member:</span>
                <span className="font-bold text-[#003524]">{successPayment.memberName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Chit No:</span>
                <span className="font-mono font-bold text-[#174D38]">{successPayment.chitNo || formData.chitNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Installment Month:</span>
                <span className="font-bold text-[#131E19]">Month {successPayment.month || successPayment.monthNumber} of 20</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Amount Paid:</span>
                <span className="font-extrabold text-emerald-800 text-base">{formatINR(successPayment.amount || successPayment.paidAmount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5B7065]">Payment Date:</span>
                <span className="font-semibold text-[#131E19]">{formatDate(successPayment.paymentDate)}</span>
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
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Payment Confirmation</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* PAYMENT ENTRY FORM */
          /* ================================================================ */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Chit Group & Month Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Chit Group
                </label>
                <input
                  type="text"
                  readOnly
                  value={activeChit?.chitName || 'MSR Chit — ₹1,00,000'}
                  className="w-full px-3 py-2.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#174D38] cursor-not-allowed min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Installment Month *
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Month {m} {m === activeChit?.currentMonth ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Member Dropdown */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Member Name *
              </label>
              <select
                value={formData.memberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                required
              >
                {members.map((m) => (
                  <option key={m.memberId} value={m.memberId}>
                    {m.name} ({m.mobile}) - {m.payoutMonth || 'Not Assigned'}
                  </option>
                ))}
              </select>
            </div>

            {/* Chit No Selection (For Members with Multiple Chits) */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center justify-between">
                <span>Assigned Chit Number *</span>
                <span className="text-[10px] text-[#5B7065]">Permanent Unique Chit No</span>
              </label>
              {memberChits.length > 1 ? (
                <select
                  value={formData.chitNo}
                  onChange={(e) => setFormData({ ...formData, chitNo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                >
                  {memberChits.map((c) => (
                    <option key={c.chitNo} value={c.chitNo}>
                      {c.chitNo} (Payout Month: {c.payoutMonth})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={formData.chitNo}
                    onChange={(e) => setFormData({ ...formData, chitNo: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                    placeholder="MSR261L01"
                    required
                  />
                  <div className="absolute right-3 top-3 text-[10px] text-[#5B7065] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Permanent</span>
                  </div>
                </div>
              )}
            </div>

            {/* Due Amount & Paid Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F0FCF4]/70 p-3.5 rounded-2xl border border-[#DCE8E0]">
              <div>
                <label className="block text-[11px] font-bold text-[#4B6358] mb-1">
                  Scheduled Due (Month {formData.month})
                </label>
                <div className="text-base sm:text-lg font-extrabold text-[#003524]">
                  {formatINR(formData.dueAmount)}
                </div>
                <p className="text-[10px] text-[#5B7065]">Auto-fetched from Chit Schedule</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Paid Amount (₹) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-base font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                  required
                />
              </div>
            </div>

            {/* Payment Mode & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Payment Mode *
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                  required
                />
              </div>
            </div>

            {/* Reference / Transaction ID */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Reference / Transaction Number
              </label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Cash Receipt No"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              />
            </div>

            {/* Action Buttons */}
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
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Save Payment</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* WhatsApp Payment Confirmation Modal */}
      {isWhatsAppModalOpen && successPayment && selectedMemberObj && (
        <WhatsAppComposerModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            onClose();
          }}
          member={selectedMemberObj}
          initialMessageType="payment_confirmation"
          paymentRecord={successPayment}
        />
      )}
    </>
  );
};

export default PaymentForm;
