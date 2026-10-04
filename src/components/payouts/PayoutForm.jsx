import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput, formatDate } from '../../utils/date';
import { generateChitNumber } from '../../utils/chitNumber';
import { getDefaultPayoutForMonth } from '../../utils/chitCalculations';
import { CheckCircle2, MessageSquare, ArrowRight, ShieldCheck, Layers, IndianRupee, AlertCircle } from 'lucide-react';
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
  const [extraInvestments, setExtraInvestments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successPayout, setSuccessPayout] = useState(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    chitId: activeChit?.chitId || 'CHIT-100K-01',
    month: activeChit?.currentMonth || 1,
    memberId: '',
    memberName: '',
    chitNo: '',
    scheduledAmount: 75000,
    amount: 70000,
    payoutDate: getTodayDateInput(),
    paymentMode: 'Bank Transfer',
    fundingSource: 'CHIT_FUND', // 'CHIT_FUND' or 'EXTRA_INVESTMENT'
    extraInvestmentId: '',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSuccessPayout(null);
      setIsWhatsAppOpen(false);
      setError('');

      const loadData = async () => {
        try {
          const [mems, chitData, extraInvs] = await Promise.all([
            api.getMembers(),
            api.getChit(activeChit?.chitId || 'CHIT-100K-01'),
            api.getExtraInvestments()
          ]);

          setMembers(mems || []);
          const sch = chitData?.schedule || [];
          setSchedule(sch);
          setExtraInvestments(extraInvs || []);

          const targetMonth = Number(prefilledMonth || activeChit?.currentMonth || 1);
          const schItem = sch.find(s => Number(s.month || s.monthNumber) === targetMonth) || sch[0];
          const chitValue = Number(activeChit?.chitValue || activeChit?.totalAmount || 100000);
          const chitNo = schItem?.chitNo || generateChitNumber({ year: 2026, chitValue, sequenceNumber: targetMonth });
          const dur = Number(activeChit?.durationMonths || activeChit?.duration || 20);
          const div = Number(schItem?.dividend || activeChit?.dividend || 0);

          let scheduledAmt = 0;
          if (schItem && Number(schItem.payoutAmount) >= 10000) {
            scheduledAmt = Number(schItem.payoutAmount);
          } else {
            scheduledAmt = getDefaultPayoutForMonth(targetMonth, chitValue, dur, div);
          }

          // Initial default values
          const initialMember = (schItem?.assignedMemberName && schItem.assignedMemberName !== 'Not Assigned')
            ? schItem.assignedMemberName
            : (mems[0]?.name || '');
          const initialMemberId = schItem?.assignedMemberId || mems[0]?.memberId || '';

          const defaultExtraInv = extraInvs && extraInvs.length > 0 ? extraInvs[0].investmentId : '';

          setFormData({
            chitId: activeChit?.chitId || 'CHIT-100K-01',
            month: targetMonth,
            memberId: initialMemberId,
            memberName: initialMember,
            chitNo: chitNo,
            scheduledAmount: scheduledAmt,
            amount: scheduledAmt,
            payoutDate: getTodayDateInput(),
            paymentMode: 'Bank Transfer',
            fundingSource: 'CHIT_FUND',
            extraInvestmentId: defaultExtraInv,
            reference: `NEFT-MSR-${Date.now().toString().slice(-4)}`,
            notes: `Month ${targetMonth} Payout Disbursement`
          });
        } catch (e) {
          console.error('PayoutForm load error:', e);
        }
      };
      loadData();
    }
  }, [isOpen, prefilledMonth, activeChit]);

  const handleMonthChange = (monthVal) => {
    const monthNum = Number(monthVal);
    const schItem = schedule.find(s => Number(s.month || s.monthNumber) === monthNum);
    const chitValue = Number(activeChit?.chitValue || activeChit?.totalAmount || 100000);
    const chitNo = schItem?.chitNo || generateChitNumber({ year: 2026, chitValue, sequenceNumber: monthNum });
    const dur = Number(activeChit?.durationMonths || activeChit?.duration || 20);
    const div = Number(schItem?.dividend || activeChit?.dividend || 0);

    let scheduledAmt = 0;
    if (schItem && Number(schItem.payoutAmount) >= 10000) {
      scheduledAmt = Number(schItem.payoutAmount);
    } else {
      scheduledAmt = getDefaultPayoutForMonth(monthNum, chitValue, dur, div);
    }

    setFormData(prev => ({
      ...prev,
      month: monthNum,
      chitNo: chitNo,
      scheduledAmount: scheduledAmt,
      amount: scheduledAmt,
      memberId: schItem?.assignedMemberId || prev.memberId,
      memberName: schItem?.assignedMemberName || prev.memberName
    }));
  };

  const handleMemberSelect = (e) => {
    const val = e.target.value;
    const matchedMem = members.find(m => String(m.memberId) === String(val) || m.name === val);
    if (matchedMem) {
      setFormData(prev => ({
        ...prev,
        memberId: matchedMem.memberId,
        memberName: matchedMem.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        memberName: val
      }));
    }
  };

  const selectedExtraInvObj = useMemo(() => {
    if (!formData.extraInvestmentId) return extraInvestments[0] || null;
    return extraInvestments.find(inv => String(inv.investmentId) === String(formData.extraInvestmentId)) || null;
  }, [formData.extraInvestmentId, extraInvestments]);

  const handleNextToConfirmation = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Please enter a valid payout amount greater than ₹0.');
      return;
    }

    if (!formData.memberName || formData.memberName.trim() === '') {
      setError('Please select or enter the beneficiary member.');
      return;
    }

    if (formData.fundingSource === 'EXTRA_INVESTMENT') {
      if (!formData.extraInvestmentId) {
        setError('Please select an active Extra Investment to fund this payout.');
        return;
      }
      const invRem = selectedExtraInvObj ? Math.max(0, Number(selectedExtraInvObj.remainingAmount !== undefined ? selectedExtraInvObj.remainingAmount : (selectedExtraInvObj.investmentAmount - selectedExtraInvObj.usedAmount))) : 0;
      if (Number(formData.amount) > invRem) {
        setError(`Payout amount exceeds available remaining investment capital (${formatINR(invRem)}).`);
        return;
      }
    }

    setStep(2);
  };

  const handleConfirmPayout = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payoutPayload = {
        chitId: formData.chitId,
        month: Number(formData.month),
        monthNumber: Number(formData.month),
        memberId: formData.memberId || 'MEM-000',
        memberName: formData.memberName,
        chitNo: formData.chitNo,
        scheduledAmount: Number(formData.scheduledAmount) || Number(formData.amount),
        scheduledPayoutAmount: Number(formData.scheduledAmount) || Number(formData.amount),
        amount: Number(formData.amount),
        actualAmount: Number(formData.amount),
        fundingSource: formData.fundingSource === 'EXTRA_INVESTMENT' ? 'EXTRA_INVESTMENT' : 'CHIT_FUND',
        extraInvestmentId: formData.fundingSource === 'EXTRA_INVESTMENT' ? formData.extraInvestmentId : '',
        payoutDate: formData.payoutDate,
        paymentMode: formData.paymentMode,
        paymentMethod: formData.paymentMode,
        reference: formData.reference,
        referenceNumber: formData.reference,
        status: 'Completed',
        notes: formData.notes || (formData.fundingSource === 'EXTRA_INVESTMENT' ? `Paid using extra investment ${formData.extraInvestmentId}` : 'Paid via Chit Fund')
      };

      const recorded = await api.recordPayout(payoutPayload);
      showToast(`Payout of ${formatINR(formData.amount)} to ${formData.memberName} recorded & completed!`, 'success');
      if (onSuccess) onSuccess();
      setSuccessPayout(recorded || payoutPayload);
      setStep(3); // Show Success & WhatsApp confirmation screen
    } catch (err) {
      console.error('Record payout error:', err);
      setError(err.message || 'Failed to record payout');
      showToast(err.message || 'Failed to record payout', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Find member object for WhatsApp
  const targetMemberObj = useMemo(() => {
    if (!formData.memberId) return null;
    const firstId = String(formData.memberId).split(',')[0].trim();
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
        subtitle={`${activeChit?.chitName || 'MSR Chit — ₹1,00,000'} • Month ${formData.month}`}
        maxWidth="max-w-lg"
      >
        {step === 3 && successPayout ? (
          /* SECTION 11: PAYOUT SUCCESS STATE & WHATSAPP CONFIRMATION */
          <div className="space-y-5 py-2">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-emerald-950">
                Payout Disbursed Successfully 🎉
              </h3>
              <p className="text-xs text-emerald-800">
                Actual payout has been recorded, linked to funding source, and Month {formData.month} status is marked <strong>COMPLETED</strong>.
              </p>
            </div>

            {/* Payout Summary Receipt */}
            <div className="p-4 rounded-xl bg-slate-50 border border-[#DCE8E0] space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Beneficiary Member:</span>
                <span className="font-bold text-[#003524]">{successPayout.memberName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Chit No:</span>
                <span className="font-mono font-bold text-[#174D38]">{successPayout.chitNo || formData.chitNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Payout Month:</span>
                <span className="font-bold text-[#131E19]">Month {successPayout.month || successPayout.monthNumber || formData.month}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Scheduled Amount:</span>
                <span className="font-semibold text-slate-700">{formatINR(formData.scheduledAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Actual Paid Amount:</span>
                <span className="font-black text-emerald-900 text-base">{formatINR(successPayout.amount || successPayout.actualAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Funding Source:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${
                  String(successPayout.fundingSource).includes('EXTRA')
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  {String(successPayout.fundingSource).includes('EXTRA') ? 'EXTRA INVESTMENT' : 'CHIT FUND'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Payout Date:</span>
                <span className="font-semibold text-[#131E19]">{formatDate(successPayout.payoutDate || formData.payoutDate)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5B7065]">Status:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs">
                  COMPLETED
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
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Month & Chit No */}
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
                  {Array.from({ length: activeChit?.duration || activeChit?.durationMonths || 20 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Month {m} {m === 1 ? '(Organizer NIL)' : ''}
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

            {/* Scheduled vs Actual Payout Comparison Banner */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-[#DCE8E0]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5B7065] block mb-0.5">
                  Scheduled Payout:
                </span>
                <span className="text-sm font-extrabold text-[#003524]">
                  {formatINR(formData.scheduledAmount)}
                </span>
                <span className="text-[10px] text-[#5B7065] block mt-0.5">
                  Calculated chit plan value
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">
                  Actual Amount Paid (₹) *:
                </span>
                <input
                  type="number"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  Disbursed to member
                </span>
              </div>
            </div>

            {/* Beneficiary / Member Selection */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Beneficiary Member *
              </label>
              <div className="space-y-1.5">
                <select
                  value={formData.memberId || formData.memberName}
                  onChange={handleMemberSelect}
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                >
                  <option value="">Select Enrolled Member...</option>
                  {members.map(m => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.name} ({m.memberId}) {m.payoutMonth ? `• ${m.payoutMonth}` : ''}
                    </option>
                  ))}
                  <option value="custom">+ Other / Enter Custom Name</option>
                </select>

                <input
                  type="text"
                  value={formData.memberName}
                  onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
                  placeholder="Or type beneficiary name (e.g. Amma, MU, Suresh Kumar)"
                  className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs font-medium text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                  required
                />
              </div>
            </div>

            {/* Funding Source & Extra Investment Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#003524] mb-1">
                  Funding Source *
                </label>
                <select
                  value={formData.fundingSource}
                  onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                >
                  <option value="CHIT_FUND">Chit Fund (Standard Collection)</option>
                  <option value="EXTRA_INVESTMENT">Extra Investment (External Capital)</option>
                </select>
              </div>

              {formData.fundingSource === 'EXTRA_INVESTMENT' ? (
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    Select Extra Investment *
                  </label>
                  <select
                    value={formData.extraInvestmentId}
                    onChange={(e) => setFormData({ ...formData, extraInvestmentId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-purple-50/60 border border-purple-300 rounded-xl text-xs sm:text-sm font-semibold text-purple-950 focus:ring-2 focus:ring-purple-500/20 min-h-[44px]"
                    required
                  >
                    {extraInvestments.length === 0 ? (
                      <option value="">No Extra Investments Found</option>
                    ) : (
                      extraInvestments.map((inv) => {
                        const invAmt = Number(inv.investmentAmount) || 0;
                        const usedAmt = Number(inv.allocatedAmount !== undefined ? inv.allocatedAmount : inv.usedAmount) || 0;
                        const remAmt = Math.max(0, invAmt - usedAmt);
                        return (
                          <option key={inv.investmentId} value={inv.investmentId}>
                            {inv.investmentId} • Avail: {formatINR(remAmt)} / {formatINR(invAmt)} ({inv.investor || inv.source || 'Capital'})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              ) : (
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
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash Handover</option>
                  </select>
                </div>
              )}
            </div>

            {/* Payout Date & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Paid using extra investment"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
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
                Please verify beneficiary and disbursement amount. Submitting will record the actual payout and mark Month {formData.month} status as <strong>COMPLETED</strong>.
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
                <span className="text-[#5B7065]">Scheduled Payout:</span>
                <span className="font-semibold text-slate-700">{formatINR(formData.scheduledAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Actual Paid:</span>
                <span className="font-black text-emerald-800 text-base">{formatINR(formData.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAF2EC]">
                <span className="text-[#5B7065]">Funding Source:</span>
                <span className="font-bold text-purple-900">
                  {formData.fundingSource === 'EXTRA_INVESTMENT' ? `EXTRA INVESTMENT (${formData.extraInvestmentId})` : 'CHIT FUND'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5B7065]">Mode / Date:</span>
                <span className="font-semibold text-[#131E19]">{formData.paymentMode} • {formatDate(formData.payoutDate)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
