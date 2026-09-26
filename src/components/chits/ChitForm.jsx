import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { getTodayDateInput } from '../../utils/date';
import { calculateChitParameters, generateChitSchedule } from '../../utils/chitCalculations';
import {
  Calculator,
  Layers,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const COMMON_MULTIPLES = [1, 2, 3, 5, 10];

export const ChitForm = ({
  isOpen,
  onClose,
  chitToEdit = null,
  onSuccess
}) => {
  const { showToast, refreshChits } = useChit();
  const [submitting, setSubmitting] = useState(false);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);
  const [isCustomMultiple, setIsCustomMultiple] = useState(false);

  const [formData, setFormData] = useState({
    chitId: '',
    chitName: '',
    chitValue: 100000,
    multiple: 1,
    duration: 20,
    dividend: 1250,
    startDate: getTodayDateInput(),
    startMonth: 1,
    paymentDay: 20,
    fixedPayoutMonth: 2,
    memberCount: 20,
    description: 'Standard 20-Month Mutual Chit Scheme'
  });

  // Pre-populate when opening for Edit or Create
  useEffect(() => {
    if (isOpen) {
      if (chitToEdit) {
        const mult = Number(chitToEdit.multiple) || 1;
        const baseVal = Number(chitToEdit.chitValue) || Number(chitToEdit.totalAmount) || 100000;
        const dur = Number(chitToEdit.duration || chitToEdit.durationMonths) || 20;
        const div = Number(chitToEdit.dividend) || Math.max(0, Math.round(baseVal * mult / dur) - (Number(chitToEdit.monthlyContribution || chitToEdit.monthlyAmount) || 3750));

        setIsCustomMultiple(!COMMON_MULTIPLES.includes(mult));
        setFormData({
          chitId: chitToEdit.chitId || '',
          chitName: chitToEdit.chitName || '',
          chitValue: baseVal,
          multiple: mult,
          duration: dur,
          dividend: div,
          startDate: chitToEdit.startDate || getTodayDateInput(),
          startMonth: Number(chitToEdit.currentMonth) || 1,
          paymentDay: Number(chitToEdit.paymentDay) || 20,
          fixedPayoutMonth: Number(chitToEdit.fixedPayoutMonth) || 2,
          memberCount: Number(chitToEdit.memberCount) || dur,
          description: chitToEdit.description || chitToEdit.notes || 'Standard 20-Month Mutual Chit Scheme'
        });
      } else {
        setIsCustomMultiple(false);
        setFormData({
          chitId: '',
          chitName: 'MSR Chit — ₹1 Lakh (Group B)',
          chitValue: 100000,
          multiple: 1,
          duration: 20,
          dividend: 1250,
          startDate: getTodayDateInput(),
          startMonth: 1,
          paymentDay: 20,
          fixedPayoutMonth: 2,
          memberCount: 20,
          description: 'Standard 20-Month Mutual Chit Scheme'
        });
      }
    }
  }, [isOpen, chitToEdit]);

  // Dynamic Live Calculation Engine
  const calculation = useMemo(() => {
    return calculateChitParameters({
      chitValue: formData.chitValue,
      multiple: formData.multiple,
      duration: formData.duration,
      dividend: formData.dividend,
      startMonth: formData.startMonth
    });
  }, [formData.chitValue, formData.multiple, formData.duration, formData.dividend, formData.startMonth]);

  const handleMultipleSelect = (m) => {
    setIsCustomMultiple(false);
    setFormData(prev => ({ ...prev, multiple: m }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chitName.trim()) {
      showToast('Please enter a chit group name', 'error');
      return;
    }
    if (formData.chitValue <= 0) {
      showToast('Please enter a valid chit value', 'error');
      return;
    }
    if (formData.duration <= 0) {
      showToast('Duration must be at least 1 month', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        totalAmount: calculation.totalChitValue,
        durationMonths: calculation.duration,
        monthlyContribution: calculation.monthlyAmount,
        monthlyAmount: calculation.monthlyAmount,
        expected20M: calculation.totalPayable,
        dividend: formData.dividend,
        schedule: calculation.schedule
      };

      if (chitToEdit && chitToEdit.chitId) {
        await api.updateChit(chitToEdit.chitId, payload);
        showToast(`Chit group "${formData.chitName}" updated successfully!`, 'success');
      } else {
        await api.createChit(payload);
        showToast(`Chit group "${formData.chitName}" created successfully!`, 'success');
      }

      await refreshChits();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save chit plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = Boolean(chitToEdit && chitToEdit.chitId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Chit Plan — ${chitToEdit.chitName || chitToEdit.chitId}` : "Create New Chit Plan"}
      subtitle="Dynamic Chit Amount, Multiple, Duration & Dividend Engine"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chit Group Name */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Chit Group Name *
          </label>
          <input
            type="text"
            value={formData.chitName}
            onChange={(e) => setFormData({ ...formData, chitName: e.target.value })}
            placeholder="e.g. MSR Chit — ₹1 Lakh (Group B)"
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            required
          />
        </div>

        {/* Chit Value & Multiple */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Base Chit Value (₹) *
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={formData.chitValue}
              onChange={(e) => setFormData({ ...formData, chitValue: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
            <p className="text-[10px] text-[#5B7065] mt-0.5">e.g. ₹50,000, ₹1,00,000, ₹2,00,000</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Multiple (Multiplier) *
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COMMON_MULTIPLES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMultipleSelect(m)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isCustomMultiple && formData.multiple === m
                      ? 'bg-[#003524] text-white shadow-xs'
                      : 'bg-slate-100 text-[#4B6358] hover:bg-slate-200'
                  }`}
                >
                  {m}×
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomMultiple(true)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isCustomMultiple
                    ? 'bg-[#003524] text-white shadow-xs'
                    : 'bg-slate-100 text-[#4B6358] hover:bg-slate-200'
                }`}
              >
                Custom
              </button>
            </div>

            {isCustomMultiple && (
              <div className="mt-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.multiple}
                  onChange={(e) => setFormData({ ...formData, multiple: Number(e.target.value) })}
                  placeholder="Enter custom multiple (e.g. 1.5, 4, 20)"
                  className="w-full px-3 py-1.5 bg-white border border-[#003524] rounded-lg text-xs font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20"
                />
              </div>
            )}

            <p className="text-[10px] text-emerald-800 font-semibold mt-1">
              Total Chit Value: {formatINR(calculation.totalChitValue)}
            </p>
          </div>
        </div>

        {/* Duration & Dividend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Duration (Months) *
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value), memberCount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
            <p className="text-[10px] text-[#5B7065] mt-0.5">Base Installment: {formatINR(calculation.baseInstallment)}/mo</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-extrabold text-[#003524]">
                Dividend (₹) *
              </label>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Direct Calculation Input
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.dividend}
              onChange={(e) => setFormData({ ...formData, dividend: Number(e.target.value) })}
              placeholder="e.g. 1250, 1000, 50"
              className="w-full px-3 py-2 bg-amber-50/50 border-2 border-amber-400/80 rounded-xl text-xs sm:text-sm font-extrabold text-[#003524] focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              required
            />
            <p className="text-[10px] text-[#5B7065] mt-0.5">
              Directly deducted from base installment ({formatINR(calculation.baseInstallment)})
            </p>
          </div>
        </div>

        {/* Dates & Payment Day */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Payment Day of Month *
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={formData.paymentDay}
              onChange={(e) => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Fixed Payout Month
            </label>
            <input
              type="number"
              min="1"
              max={formData.duration}
              value={formData.fixedPayoutMonth}
              onChange={(e) => setFormData({ ...formData, fixedPayoutMonth: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 5: LIVE CALCULATION PREVIEW */}
        {/* ================================================================= */}
        <div className="p-4 rounded-2xl bg-[#F0FCF4] border border-[#DCE8E0] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#174D38]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524]">
                Live Calculation Engine Preview
              </h4>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
              Auto-Calculated
            </span>
          </div>

          {/* Core Calculation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] font-semibold text-[#5B7065] block">Chit Value:</span>
              <span className="font-extrabold text-[#003524]">{formatINR(calculation.chitValue)}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] font-semibold text-[#5B7065] block">Multiple:</span>
              <span className="font-extrabold text-[#003524]">{calculation.multiple}×</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] font-semibold text-[#5B7065] block">Total Chit Value:</span>
              <span className="font-extrabold text-emerald-900">{formatINR(calculation.totalChitValue)}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] font-semibold text-[#5B7065] block">Duration:</span>
              <span className="font-extrabold text-[#003524]">{calculation.duration} Months</span>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] font-semibold text-amber-900 block">Entered Dividend:</span>
              <span className="font-extrabold text-amber-900">{formatINR(calculation.dividend)}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] font-semibold text-[#5B7065] block">Calculated Amount:</span>
              <span className="font-extrabold text-[#003524]">{formatINR(calculation.calculatedAmount)}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] font-semibold text-[#5B7065] block">Month 2 Amount:</span>
              <span className="font-extrabold text-[#003524]">{formatINR(calculation.monthlyAmount)}</span>
            </div>

            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-semibold text-emerald-900 block">Total Payable:</span>
              <span className="font-extrabold text-emerald-900">{formatINR(calculation.totalPayable)}</span>
            </div>
          </div>

          {/* Toggle Full Schedule Breakdown */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowSchedulePreview(!showSchedulePreview)}
              className="text-xs font-bold text-[#003524] hover:text-[#174D38] flex items-center gap-1.5 transition-colors"
            >
              <span>{showSchedulePreview ? 'Hide Monthly Schedule Breakdown' : `Show Complete ${calculation.duration}-Month Calculation Schedule`}</span>
              {showSchedulePreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSchedulePreview && (
              <div className="mt-2.5 max-h-52 overflow-y-auto rounded-xl border border-[#DCE8E0] bg-white text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#003524] text-white text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-1.5 px-3">Month</th>
                      <th className="py-1.5 px-3">Installment</th>
                      <th className="py-1.5 px-3">Dividend</th>
                      <th className="py-1.5 px-3">Payout Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAF2EC]">
                    {calculation.schedule.map((item) => (
                      <tr key={item.month} className="hover:bg-[#F0FCF4]/40">
                        <td className="py-1.5 px-3 font-bold text-[#131E19]">
                          Month {String(item.month).padStart(2, '0')} {item.month === 1 ? '(Chit NIL)' : ''}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-[#003524]">
                          {formatINR(item.monthlyAmount)}
                        </td>
                        <td className="py-1.5 px-3 text-amber-800 font-semibold">
                          {item.dividend > 0 ? formatINR(item.dividend) : '—'}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-emerald-800">
                          {formatINR(item.payoutAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Buttons */}
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
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{isEditing ? 'Save Changes & Recalculate' : 'Save & Generate Chit Plan'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChitForm;
