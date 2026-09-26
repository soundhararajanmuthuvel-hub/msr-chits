import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput } from '../../utils/date';
import { calculateExtraInvestment } from '../../utils/chitCalculations';
import { TrendingUp, DollarSign, Calendar, User, ArrowRight, ShieldCheck } from 'lucide-react';

export const ExtraInvestmentModal = ({
  isOpen,
  onClose,
  investmentToEdit = null,
  onSave
}) => {
  const [formData, setFormData] = useState({
    investmentId: '',
    investmentAmount: '',
    investmentDate: getTodayDateInput(),
    purpose: '',
    allocatedAmount: '',
    beneficiary: '',
    payout: '',
    returnedAmount: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (investmentToEdit) {
        setFormData({
          investmentId: investmentToEdit.investmentId || '',
          investmentAmount: investmentToEdit.investmentAmount || '',
          investmentDate: investmentToEdit.investmentDate || getTodayDateInput(),
          purpose: investmentToEdit.purpose || '',
          allocatedAmount: investmentToEdit.allocatedAmount || investmentToEdit.usedAmount || '',
          beneficiary: investmentToEdit.beneficiary || '',
          payout: investmentToEdit.payout || '',
          returnedAmount: investmentToEdit.returnedAmount || '',
          notes: investmentToEdit.notes || ''
        });
      } else {
        setFormData({
          investmentId: `INV-${Date.now().toString().slice(-4)}`,
          investmentAmount: '',
          investmentDate: getTodayDateInput(),
          purpose: '',
          allocatedAmount: '',
          beneficiary: '',
          payout: '',
          returnedAmount: '',
          notes: ''
        });
      }
    }
  }, [isOpen, investmentToEdit]);

  const investNum = Number(formData.investmentAmount) || 0;
  const allocNum = Number(formData.allocatedAmount) || 0;
  const remainingAmount = Math.max(0, investNum - allocNum);

  const calc = useMemo(() => {
    const returned = Number(formData.returnedAmount) || 0;
    if (returned <= 0 || investNum <= 0) {
      return { profit: 0, profitPercent: 0, hasReturn: false };
    }
    const profit = Math.round(returned - investNum);
    const profitPercent = Number(((profit / investNum) * 100).toFixed(2));
    return { profit, profitPercent, hasReturn: true };
  }, [investNum, formData.returnedAmount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (investNum <= 0) {
      alert('Please enter a valid investment amount');
      return;
    }
    if (allocNum > investNum) {
      alert(`Allocated amount (₹${allocNum.toLocaleString('en-IN')}) cannot exceed total investment amount (₹${investNum.toLocaleString('en-IN')})`);
      return;
    }

    const retNum = Number(formData.returnedAmount) || 0;
    const status = retNum >= investNum ? 'Closed' : (allocNum >= investNum ? 'Fully Allocated' : 'Active');

    onSave({
      ...formData,
      investmentAmount: investNum,
      allocatedAmount: allocNum,
      usedAmount: allocNum,
      remainingAmount,
      returnedAmount: retNum,
      profit: calc.profit,
      profitPercent: calc.profitPercent,
      status
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={investmentToEdit ? "Edit Extra Investment" : "Record Extra Investment"}
      subtitle="Isolated investment tracking separate from chit schemes"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Investment Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Investment Amount (₹) *
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 100000"
              value={formData.investmentAmount}
              onChange={(e) => setFormData({ ...formData, investmentAmount: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Investment Date *
            </label>
            <input
              type="date"
              value={formData.investmentDate}
              onChange={(e) => setFormData({ ...formData, investmentDate: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Investment Purpose / Description
          </label>
          <input
            type="text"
            placeholder="e.g. Funding Member Payouts for Month 5"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* Allocated Amount & Remaining Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#003524]">
                Allocated Amount (₹)
              </label>
              <span className={`text-[10px] font-bold ${allocNum > investNum ? 'text-rose-600' : 'text-emerald-700'}`}>
                Remaining: {formatINR(remainingAmount)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              max={investNum || undefined}
              placeholder="e.g. 50000"
              value={formData.allocatedAmount}
              onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 ${allocNum > investNum ? 'border-rose-400 text-rose-700 focus:ring-rose-200' : 'border-[#DCE8E0] text-[#131E19] focus:ring-[#003524]/20'}`}
            />
            {allocNum > investNum && (
              <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                Cannot allocate more than invested capital
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Beneficiary / Borrower
            </label>
            <input
              type="text"
              placeholder="e.g. Member A, Member B"
              value={formData.beneficiary}
              onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>
        </div>

        {/* Payout Reference & Returned Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Payout Reference / Linked Chit
            </label>
            <input
              type="text"
              placeholder="e.g. Month 5 Payout #1 or PO-001"
              value={formData.payout}
              onChange={(e) => setFormData({ ...formData, payout: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Returned / Recovered Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Enter when recovered"
              value={formData.returnedAmount}
              onChange={(e) => setFormData({ ...formData, returnedAmount: e.target.value })}
              className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <span className="text-[10px] text-[#5B7065] mt-0.5 block">
              Leave blank/0 until capital is actually returned
            </span>
          </div>
        </div>

        {/* Live Profit Calculation Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-[#DCE8E0] space-y-2">
          {calc.hasReturn ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#5B7065]">Net Profit (Returned − Invested):</span>
                <span className={`font-extrabold text-sm ${calc.profit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                  {calc.profit >= 0 ? '+' : ''}{formatINR(calc.profit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#5B7065]">Profit Percentage ((Profit ÷ Invested) × 100):</span>
                <span className={`font-extrabold text-sm px-2 py-0.5 rounded ${calc.profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {calc.profitPercent}%
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-[#5B7065] italic">
              Awaiting Return: Profit and ROI % are strictly calculated once the actual recovered amount is recorded.
            </div>
          )}
          <p className="text-[10px] text-[#5B7065] italic border-t border-slate-200 pt-1.5">
            Note: Extra Investment funds & profits are completely isolated from regular chit pools and dividends.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Notes / Details
          </label>
          <input
            type="text"
            placeholder="Additional notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19]"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-xl shadow-xs transition-colors"
          >
            Save Investment Record
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExtraInvestmentModal;
