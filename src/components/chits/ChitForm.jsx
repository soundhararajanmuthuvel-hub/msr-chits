import React, { useState } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { getTodayDateInput } from '../../utils/date';

export const ChitForm = ({ isOpen, onClose, onSuccess }) => {
  const { showToast, refreshChits } = useChit();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    chitName: 'MSR Chit — ₹1 Lakh (Group B)',
    chitValue: 100000,
    duration: 20,
    memberCount: 20,
    paymentDay: 20,
    startDate: getTodayDateInput(),
    monthlyContribution: 3750,
    expected20M: 88825,
    description: '20-Month Chit Scheme'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chitName.trim()) {
      showToast('Please enter chit group name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.createChit(formData);
      showToast(`Chit group "${formData.chitName}" created successfully!`, 'success');
      await refreshChits();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to create chit group', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Chit Group"
      subtitle="Define chit parameters and duration"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Chit Group Name *
          </label>
          <input
            type="text"
            value={formData.chitName}
            onChange={(e) => setFormData({ ...formData, chitName: e.target.value })}
            placeholder="e.g. MSR Chit — ₹1 Lakh (Group 2)"
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Chit Value (₹) *
            </label>
            <input
              type="number"
              value={formData.chitValue}
              onChange={(e) => setFormData({ ...formData, chitValue: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm font-bold text-[#003524] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Duration (Months) *
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Total Members *
            </label>
            <input
              type="number"
              value={formData.memberCount}
              onChange={(e) => setFormData({ ...formData, memberCount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Monthly Payment Day *
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={formData.paymentDay}
              onChange={(e) => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Start Date *
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            required
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
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>Create Chit Group</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChitForm;
