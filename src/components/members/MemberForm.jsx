import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { validateMobile } from '../../utils/validation';

export const MemberForm = ({
  isOpen,
  onClose,
  initialData = null,
  onSuccess
}) => {
  const { activeChit, showToast } = useChit();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    chitId: activeChit?.chitId || 'CHIT-100K-01',
    chitCount: 1,
    payoutMonth: 'Not Assigned',
    notes: '',
    status: 'Active'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        mobile: initialData.mobile || '',
        address: initialData.address || '',
        chitId: initialData.chitId || activeChit?.chitId || 'CHIT-100K-01',
        chitCount: initialData.chitCount || 1,
        payoutMonth: initialData.payoutMonth || 'Not Assigned',
        notes: initialData.notes || '',
        status: initialData.status || 'Active'
      });
    } else {
      setFormData({
        name: '',
        mobile: '',
        address: '',
        chitId: activeChit?.chitId || 'CHIT-100K-01',
        chitCount: 1,
        payoutMonth: 'Not Assigned',
        notes: '',
        status: 'Active'
      });
    }
  }, [initialData, isOpen, activeChit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter member name', 'error');
      return;
    }
    if (!validateMobile(formData.mobile)) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (initialData?.memberId) {
        await api.updateMember(initialData.memberId, formData);
        showToast(`Member ${formData.name} updated successfully!`, 'success');
      } else {
        await api.createMember(formData);
        showToast(`Member ${formData.name} added successfully!`, 'success');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Member Details' : 'Add New Chit Member'}
      subtitle={activeChit?.chitName || 'MSR Chit — ₹1,00,000'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Full Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Suresh Kumar"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            required
          />
        </div>

        {/* Mobile & Chit Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Mobile Number (10 digits) *
            </label>
            <input
              type="tel"
              maxLength={10}
              placeholder="e.g. 9840123456"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Chit Count (Slots) *
            </label>
            <select
              value={formData.chitCount}
              onChange={(e) => setFormData({ ...formData, chitCount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            >
              <option value={1}>1 Chit</option>
              <option value={2}>2 Chits</option>
              <option value={3}>3 Chits</option>
              <option value={4}>4 Chits</option>
            </select>
          </div>
        </div>

        {/* Payout Month */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Assigned Payout Month
          </label>
          <select
            value={formData.payoutMonth}
            onChange={(e) => setFormData({ ...formData, payoutMonth: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          >
            <option value="Not Assigned">Not Assigned (Pending Auction / Decision)</option>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={`Month ${m}`}>
                Month {m}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[#5B7065] mt-1">
            Leave as "Not Assigned" if the chit month has not been decided yet.
          </p>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Address / Location
          </label>
          <input
            type="text"
            placeholder="e.g. Street name, Area"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1">
            Notes / Internal Remarks
          </label>
          <input
            type="text"
            placeholder="e.g. 1 extra chit, special allocation"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* Action Buttons */}
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
            <span>{initialData ? 'Update Member' : 'Save Member'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MemberForm;
