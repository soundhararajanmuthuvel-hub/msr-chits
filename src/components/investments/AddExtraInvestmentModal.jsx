import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput } from '../../utils/date';
import { DollarSign, Calendar, User, FileText, Info, TrendingUp, CheckCircle2 } from 'lucide-react';

export const AddExtraInvestmentModal = ({
  isOpen,
  onClose,
  investmentToEdit = null,
  onSave
}) => {
  const [formData, setFormData] = useState({
    investmentDate: getTodayDateInput(),
    investmentAmount: '',
    investorSource: '',
    purpose: '',
    expectedReturn: '',
    notes: ''
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (investmentToEdit) {
        setFormData({
          investmentDate: investmentToEdit.investmentDate || getTodayDateInput(),
          investmentAmount: investmentToEdit.investmentAmount || '',
          investorSource: investmentToEdit.investor || investmentToEdit.investorSource || investmentToEdit.beneficiary || '',
          purpose: investmentToEdit.purpose || '',
          expectedReturn: investmentToEdit.expectedReturn || '',
          notes: investmentToEdit.notes || ''
        });
      } else {
        setFormData({
          investmentDate: getTodayDateInput(),
          investmentAmount: '',
          investorSource: '',
          purpose: '',
          expectedReturn: '',
          notes: ''
        });
      }
    }
  }, [isOpen, investmentToEdit]);

  const investNum = Number(formData.investmentAmount) || 0;
  const expectedNum = Number(formData.expectedReturn) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (investNum <= 0) {
      setError('Please enter a valid investment amount greater than ₹0.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        investmentId: investmentToEdit?.investmentId,
        investmentDate: formData.investmentDate,
        investmentAmount: investNum,
        investor: formData.investorSource,
        investorSource: formData.investorSource,
        beneficiary: formData.investorSource,
        purpose: formData.purpose || 'Capital Deployment',
        expectedReturn: expectedNum > 0 ? expectedNum : '',
        notes: formData.notes,
        // Keep historical allocation/recovered if editing
        allocatedAmount: investmentToEdit?.allocatedAmount || investmentToEdit?.usedAmount || 0,
        usedAmount: investmentToEdit?.allocatedAmount || investmentToEdit?.usedAmount || 0,
        returnedAmount: investmentToEdit?.returnedAmount || 0,
        status: investmentToEdit?.status || 'Active'
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save investment record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={investmentToEdit ? "Edit Extra Investment" : "Add Extra Investment"}
      subtitle="Record external capital infusion separate from normal chit funds"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Investment Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Investment Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="100000"
                value={formData.investmentAmount}
                onChange={(e) => setFormData({ ...formData, investmentAmount: e.target.value })}
                className="w-full pl-7 pr-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              />
            </div>
            {investNum > 0 && (
              <span className="text-[11px] font-semibold text-[#174D38] mt-1 block">
                {formatINR(investNum)}
              </span>
            )}
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

        {/* Investor / Source */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Investor / Source
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <User className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="e.g. MU / Director Capital / External Partner"
              value={formData.investorSource}
              onChange={(e) => setFormData({ ...formData, investorSource: e.target.value })}
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Purpose / Objective
          </label>
          <input
            type="text"
            placeholder="e.g. Funding Member Payouts for Month 2"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* Optional: Expected Return */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-[#003524]">
              Expected Return (₹) <span className="text-[#5B7065] font-normal text-[11px]">(Optional Target)</span>
            </label>
            <span className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
              Projection Only
            </span>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
              ₹
            </span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 110000"
              value={formData.expectedReturn}
              onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })}
              className="w-full pl-7 pr-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>
          <p className="text-[10px] text-[#5B7065] mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-[#174D38]" />
            <span>Actual profit is calculated strictly upon recording real recovered capital.</span>
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Notes / Reference
          </label>
          <textarea
            rows={2}
            placeholder="Additional terms, repayment agreement, or allocation notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* Info Box */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-[#003524] space-y-1">
          <span className="font-bold block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#174D38]" />
            Isolated Accounting Notice
          </span>
          <p className="text-[#2D5A43] leading-relaxed">
            Extra Investment is strictly separated from commission and dividend calculations. After creation, you can allocate this capital to fund one or more member payouts.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE8E0]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-[#5B7065] hover:text-[#003524] hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || investNum <= 0}
            className="px-5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>{investmentToEdit ? "Update Investment" : "Save Investment"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddExtraInvestmentModal;
