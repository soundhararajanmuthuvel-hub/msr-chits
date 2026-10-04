import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput } from '../../utils/date';
import { Send, AlertCircle, CheckCircle2, DollarSign, User, Layers, Calendar, ArrowRight } from 'lucide-react';

export const AllocateInvestmentModal = ({
  isOpen,
  onClose,
  investment,
  chits = [],
  members = [],
  schedule = [],
  onAllocate
}) => {
  const investAmt = Number(investment?.investmentAmount) || 0;
  const currentAllocated = Number(investment?.allocatedAmount !== undefined ? investment?.allocatedAmount : investment?.usedAmount) || 0;
  const remainingAmount = Math.max(0, investAmt - currentAllocated);

  const [formData, setFormData] = useState({
    chitId: 'CHIT-100K-01',
    monthNumber: 2,
    memberId: '',
    memberName: '',
    chitNo: '',
    payoutAmount: '',
    payoutDate: getTodayDateInput(),
    paymentMethod: 'Bank Transfer',
    notes: ''
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && investment) {
      setError('');
      // Default to suggested remaining amount or standard payout
      const defaultChitId = chits[0]?.chitId || 'CHIT-100K-01';
      setFormData({
        chitId: defaultChitId,
        monthNumber: 2,
        memberId: members[0]?.memberId || '',
        memberName: members[0]?.name || '',
        chitNo: '',
        payoutAmount: remainingAmount > 0 ? remainingAmount : '',
        payoutDate: getTodayDateInput(),
        paymentMethod: 'Bank Transfer',
        notes: `Funded via Extra Investment ${investment.investmentId}`
      });
    }
  }, [isOpen, investment, remainingAmount]);

  const allocNum = Number(formData.payoutAmount) || 0;
  const newRemaining = remainingAmount - allocNum;

  const handleMemberChange = (e) => {
    const memId = e.target.value;
    const selectedMem = members.find(m => String(m.memberId) === String(memId));
    setFormData(prev => ({
      ...prev,
      memberId: memId,
      memberName: selectedMem ? selectedMem.name : prev.memberName
    }));
  };

  const handleMonthChange = (e) => {
    const mNum = Number(e.target.value);
    // Find matching schedule row if available
    const schItem = schedule.find(s => Number(s.monthNumber || s.month) === mNum && String(s.chitId) === String(formData.chitId));
    setFormData(prev => ({
      ...prev,
      monthNumber: mNum,
      chitNo: schItem?.chitNo || prev.chitNo
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (allocNum <= 0) {
      setError('Allocation amount must be greater than ₹0.');
      return;
    }

    if (allocNum > remainingAmount) {
      setError(`Allocation exceeds remaining investment amount. Maximum allowed is ${formatINR(remainingAmount)}.`);
      return;
    }

    if (!formData.memberName) {
      setError('Please select or specify a member for the payout.');
      return;
    }

    setSubmitting(true);
    try {
      const schItem = schedule.find(s => Number(s.monthNumber || s.month) === Number(formData.monthNumber) && String(s.chitId) === String(formData.chitId));
      const scheduledAmt = Number(schItem?.scheduledPayoutAmount || schItem?.payoutAmount) || 75000;

      await onAllocate({
        investmentId: investment.investmentId,
        chitId: formData.chitId,
        monthNumber: Number(formData.monthNumber) || 1,
        month: Number(formData.monthNumber) || 1,
        memberId: formData.memberId || 'MEM-000',
        memberName: formData.memberName,
        chitNo: formData.chitNo || `CHIT-${formData.chitId}-M${formData.monthNumber}`,
        payoutAmount: allocNum,
        amount: allocNum,
        actualAmount: allocNum,
        scheduledAmount: scheduledAmt,
        payoutDate: formData.payoutDate,
        paymentMethod: formData.paymentMethod,
        fundingSource: 'EXTRA_INVESTMENT',
        extraInvestmentId: investment.investmentId,
        status: 'Completed',
        notes: formData.notes || `Paid using extra investment ${investment.investmentId}`
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to allocate investment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Allocate Extra Investment to Payout"
      subtitle={`Link capital to member disbursements • ${investment?.investmentId || ''}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* INVESTMENT CAPITAL SNAPSHOT BANNER */}
        <div className="bg-slate-50 border border-[#DCE8E0] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#003524] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#174D38]" />
              Investment Capital Status
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {investment?.investmentId}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] text-[#5B7065] block">Total Capital</span>
              <span className="font-extrabold text-[#003524]">{formatINR(investAmt)}</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] text-[#5B7065] block">Already Allocated</span>
              <span className="font-extrabold text-blue-900">{formatINR(currentAllocated)}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-900 block">Available Remaining</span>
              <span className="font-extrabold text-emerald-900">{formatINR(remainingAmount)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PAYOUT ALLOCATION DETAILS */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524]">
            Disbursement Payout Link
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Chit Scheme */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Chit Scheme *
              </label>
              <select
                value={formData.chitId}
                onChange={(e) => setFormData({ ...formData, chitId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              >
                {chits.map(c => (
                  <option key={c.chitId} value={c.chitId}>{c.chitName || c.chitId}</option>
                ))}
              </select>
            </div>

            {/* Month Number */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Month Number *
              </label>
              <select
                value={formData.monthNumber}
                onChange={handleMonthChange}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Month {m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Member */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Beneficiary Member *
              </label>
              <select
                value={formData.memberId}
                onChange={handleMemberChange}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              >
                <option value="">Select Member...</option>
                {members.map(m => (
                  <option key={m.memberId} value={m.memberId}>
                    {m.name} ({m.memberId})
                  </option>
                ))}
              </select>
            </div>

            {/* Chit No / Unique Token */}
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Chit Number / Token
              </label>
              <input
                type="text"
                placeholder="e.g. MSR261L02 or MSR261L02-B"
                value={formData.chitNo}
                onChange={(e) => setFormData({ ...formData, chitNo: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              />
            </div>
          </div>

          {/* Allocation Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Allocation Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  max={remainingAmount}
                  step="1"
                  placeholder="50000"
                  value={formData.payoutAmount}
                  onChange={(e) => setFormData({ ...formData, payoutAmount: e.target.value })}
                  className={`w-full pl-7 pr-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] ${allocNum > remainingAmount ? 'border-red-400 bg-red-50/50' : 'border-[#DCE8E0]'}`}
                  required
                />
              </div>
              {allocNum > 0 && (
                <span className="text-[11px] font-semibold text-[#174D38] mt-1 block">
                  {formatINR(allocNum)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003524] mb-1">
                Payout Disbursement Date *
              </label>
              <input
                type="date"
                value={formData.payoutDate}
                onChange={(e) => setFormData({ ...formData, payoutDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Allocation Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Second payout in Month 2 funded by external investment"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>
        </div>

        {/* POST-ALLOCATION PROJECTION */}
        <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5 text-xs">
          <span className="font-bold text-purple-950 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
            Funding Source: EXTRA_INVESTMENT
          </span>
          <div className="flex justify-between text-[11px] text-purple-900">
            <span>After this allocation:</span>
            <span>New Remaining: <strong>{formatINR(Math.max(0, newRemaining))}</strong></span>
          </div>
          {newRemaining < 0 && (
            <p className="text-red-600 font-bold text-[11px]">
              ⚠️ Cannot allocate more than available {formatINR(remainingAmount)}.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE8E0]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold text-[#5B7065] hover:text-[#003524] hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || allocNum <= 0 || allocNum > remainingAmount}
            className="px-5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <span>Allocating...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Confirm Allocation ({formatINR(allocNum)})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AllocateInvestmentModal;
