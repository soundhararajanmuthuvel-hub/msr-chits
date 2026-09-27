import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput } from '../../utils/date';
import { ArrowUpRight, TrendingUp, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export const RecordRecoveryModal = ({
  isOpen,
  onClose,
  investment,
  onRecord
}) => {
  const investAmt = Number(investment?.investmentAmount) || 0;
  const previousRecovered = Number(investment?.returnedAmount || investment?.recoveredAmount) || 0;

  const [formData, setFormData] = useState({
    recoveryDate: getTodayDateInput(),
    recoveredAmount: '',
    notes: ''
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && investment) {
      setError('');
      setFormData({
        recoveryDate: getTodayDateInput(),
        recoveredAmount: '',
        notes: `Capital recovery for ${investment.investmentId}`
      });
    }
  }, [isOpen, investment]);

  const newRecoveredInput = Number(formData.recoveredAmount) || 0;
  const totalRecovered = previousRecovered + newRecoveredInput;

  const calc = useMemo(() => {
    if (totalRecovered <= 0 || investAmt <= 0) {
      return { profit: 0, profitPercent: 0, isProfitable: false, isRecovered: false };
    }
    const profit = Math.round(totalRecovered - investAmt);
    const profitPercent = Number(((profit / investAmt) * 100).toFixed(2));
    return {
      profit,
      profitPercent,
      isProfitable: profit > 0,
      isRecovered: totalRecovered >= investAmt
    };
  }, [investAmt, totalRecovered]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newRecoveredInput <= 0) {
      setError('Please enter a valid recovered amount greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      await onRecord({
        investmentId: investment.investmentId,
        recoveryDate: formData.recoveryDate,
        recoveredAmount: newRecoveredInput,
        totalRecovered: totalRecovered,
        notes: formData.notes
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record recovery.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Extra Investment Recovery"
      subtitle={`Capture actual returned capital & realized profit • ${investment?.investmentId || ''}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* INVESTMENT STATUS SUMMARY */}
        <div className="bg-slate-50 border border-[#DCE8E0] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#003524] uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#174D38]" />
              Capital & Returns Tracker
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {investment?.investmentId}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] text-[#5B7065] block">Invested Amount</span>
              <span className="font-extrabold text-[#003524]">{formatINR(investAmt)}</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] text-[#5B7065] block">Previous Recoveries</span>
              <span className="font-extrabold text-blue-900">{formatINR(previousRecovered)}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-900 block">Total After Entry</span>
              <span className="font-extrabold text-emerald-950">{formatINR(totalRecovered)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* INPUT FIELDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Recovered Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 110000"
                value={formData.recoveredAmount}
                onChange={(e) => setFormData({ ...formData, recoveredAmount: e.target.value })}
                className="w-full pl-7 pr-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
                required
              />
            </div>
            {newRecoveredInput > 0 && (
              <span className="text-[11px] font-semibold text-[#174D38] mt-1 block">
                {formatINR(newRecoveredInput)}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Recovery Date *
            </label>
            <input
              type="date"
              value={formData.recoveryDate}
              onChange={(e) => setFormData({ ...formData, recoveryDate: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Recovery Notes / Bank Reference
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Capital return from member + ₹10,000 profit settlement"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* REAL-TIME PROFIT CALCULATION BOX */}
        {newRecoveredInput > 0 && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#003524] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-800" />
                Realized Profit Computation
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${calc.profit >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                {calc.profit >= 0 ? 'Profit Earned' : 'Capital Shortfall'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] text-[#5B7065] block">Actual Net Profit</span>
                <span className={`font-extrabold text-sm ${calc.profit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {calc.profit >= 0 ? '+' : ''}{formatINR(calc.profit)}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] text-[#5B7065] block">Return on Investment (ROI)</span>
                <span className={`font-extrabold text-sm ${calc.profitPercent >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {calc.profitPercent}%
                </span>
              </div>
            </div>

            <p className="text-[10px] text-[#2D5A43] pt-1">
              Formula: <strong>Profit = Total Recovered ({formatINR(totalRecovered)}) - Invested ({formatINR(investAmt)})</strong>
            </p>
          </div>
        )}

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
            disabled={submitting || newRecoveredInput <= 0}
            className="px-5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <span>Recording...</span>
            ) : (
              <>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Confirm Recovery ({formatINR(newRecoveredInput)})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordRecoveryModal;
