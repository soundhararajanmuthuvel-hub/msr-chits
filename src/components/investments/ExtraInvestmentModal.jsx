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
    investmentAmount: 50000,
    investmentDate: getTodayDateInput(),
    usedAmount: 50000,
    beneficiary: '',
    payout: '',
    returnedAmount: 58000,
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (investmentToEdit) {
        setFormData({
          investmentId: investmentToEdit.investmentId || '',
          investmentAmount: Number(investmentToEdit.investmentAmount) || 0,
          investmentDate: investmentToEdit.investmentDate || getTodayDateInput(),
          usedAmount: Number(investmentToEdit.usedAmount) || 0,
          beneficiary: investmentToEdit.beneficiary || '',
          payout: investmentToEdit.payout || '',
          returnedAmount: Number(investmentToEdit.returnedAmount) || 0,
          notes: investmentToEdit.notes || ''
        });
      } else {
        setFormData({
          investmentId: `INV-${Date.now().toString().slice(-4)}`,
          investmentAmount: 50000,
          investmentDate: getTodayDateInput(),
          usedAmount: 50000,
          beneficiary: '',
          payout: '',
          returnedAmount: 55000,
          notes: ''
        });
      }
    }
  }, [isOpen, investmentToEdit]);

  const calc = useMemo(() => {
    return calculateExtraInvestment({
      investmentAmount: formData.investmentAmount,
      returnedAmount: formData.returnedAmount
    });
  }, [formData.investmentAmount, formData.returnedAmount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.investmentAmount <= 0) {
      alert('Please enter a valid investment amount');
      return;
    }
    onSave({
      ...formData,
      profit: calc.profit,
      profitPercent: calc.profitPercent
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
              min="1000"
              value={formData.investmentAmount}
              onChange={(e) => setFormData({ ...formData, investmentAmount: Number(e.target.value) })}
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

        {/* Used Amount & Beneficiary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Used Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={formData.usedAmount}
              onChange={(e) => setFormData({ ...formData, usedAmount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Beneficiary / Borrower
            </label>
            <input
              type="text"
              placeholder="e.g. Member or Business"
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
              placeholder="e.g. Month 2 Payout or CHIT-01"
              value={formData.payout}
              onChange={(e) => setFormData({ ...formData, payout: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Returned Amount (₹) *
            </label>
            <input
              type="number"
              min="0"
              value={formData.returnedAmount}
              onChange={(e) => setFormData({ ...formData, returnedAmount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              required
            />
          </div>
        </div>

        {/* Live Profit Calculation Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-[#DCE8E0] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#5B7065]">Net Profit (Returned − Invested):</span>
            <span className={`font-extrabold text-sm ${calc.profit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
              {calc.profit >= 0 ? '+' : ''}{formatINR(calc.profit)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#5B7065]">Profit Percentage (Profit ÷ Invested):</span>
            <span className={`font-extrabold text-sm px-2 py-0.5 rounded ${calc.profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {calc.profitPercent}%
            </span>
          </div>
          <p className="text-[10px] text-[#5B7065] italic border-t border-slate-200 pt-1.5">
            Note: Extra Investment profit is tracked separately and never blended into normal Chit calculations.
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
