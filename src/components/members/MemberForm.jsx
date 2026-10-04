import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { validateMobile, validateEmail, validateRequired } from '../../utils/validation';
import { ShieldCheck, User, Phone, Mail, MapPin, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const MemberForm = ({
  isOpen,
  onClose,
  initialData = null,
  onSuccess
}) => {
  const { activeChit, showToast } = useChit();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(initialData?.memberId);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    notes: '',
    preferredLanguage: 'English',
    status: 'Active'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        mobile: initialData.mobile || initialData.phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        notes: initialData.notes || '',
        preferredLanguage: initialData.preferredLanguage || initialData.language || 'English',
        status: initialData.status || 'Active'
      });
    } else {
      setFormData({
        name: '',
        mobile: '',
        email: '',
        address: '',
        notes: '',
        preferredLanguage: 'English',
        status: 'Active'
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors = {};

    if (!validateRequired(formData.name)) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.mobile || !formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!validateMobile(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid 10-digit Indian mobile number (e.g. 9840123456)';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        // Edit Profile: explicitly send only member profile fields.
        // MUST NOT modify Chit ID, Chit No, Membership ID, or financial ledger!
        const updatePayload = {
          name: formData.name.trim(),
          phone: formData.mobile.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          notes: formData.notes.trim(),
          preferredLanguage: formData.preferredLanguage || 'English',
          status: formData.status
        };

        await api.updateMember(initialData.memberId, updatePayload);
        showToast(`Member ${formData.name} updated successfully!`, 'success');
      } else {
        // Create new member
        const createPayload = {
          name: formData.name.trim(),
          phone: formData.mobile.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          notes: formData.notes.trim(),
          preferredLanguage: formData.preferredLanguage || 'English',
          status: formData.status,
          chitId: activeChit?.chitId || 'CHIT-100K-01'
        };

        await api.createMember(createPayload);
        showToast(`Member ${formData.name} added successfully!`, 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('MemberForm submit error:', err);
      showToast(err.message || 'Failed to save member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Member Profile' : 'Add New Chit Member'}
      subtitle={isEditMode ? `Member ID: ${initialData.memberId}` : (activeChit?.chitName || 'MSR Chit — ₹1,00,000')}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-Only Member ID Badge for Edit Mode */}
        {isEditMode && (
          <div className="p-3 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#003524]" />
              <span className="text-xs text-[#5B7065]">Permanent Member ID:</span>
              <span className="font-mono font-extrabold text-sm text-[#003524]">
                {initialData.memberId}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white border border-[#DCE8E0] text-[#5B7065] rounded-md">
              Permanent
            </span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#174D38]" />
            <span>Full Name *</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Soundhararajan M"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: null });
            }}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] ${
              errors.name ? 'border-red-400 bg-red-50/30' : 'border-[#DCE8E0]'
            }`}
            required
          />
          {errors.name && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* Mobile & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#174D38]" />
              <span>Phone Number *</span>
            </label>
            <input
              type="tel"
              maxLength={10}
              placeholder="e.g. 9840123456"
              value={formData.mobile}
              onChange={(e) => {
                setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') });
                if (errors.mobile) setErrors({ ...errors, mobile: null });
              }}
              className={`w-full px-3 py-2 bg-white border rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] ${
                errors.mobile ? 'border-red-400 bg-red-50/30' : 'border-[#DCE8E0]'
              }`}
              required
            />
            {errors.mobile && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.mobile}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Member Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              WhatsApp Language
            </label>
            <select
              value={formData.preferredLanguage || 'English'}
              onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
            >
              <option value="English">English</option>
              <option value="Tamil">தமிழ் (Tamil)</option>
            </select>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#174D38]" />
            <span>Email Address (Optional)</span>
          </label>
          <input
            type="email"
            placeholder="e.g. member@example.com"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            className={`w-full px-3 py-2 bg-white border rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] ${
              errors.email ? 'border-red-400 bg-red-50/30' : 'border-[#DCE8E0]'
            }`}
          />
          {errors.email && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.email}</span>
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#174D38]" />
            <span>Address / Location (Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 12/4 Nehru Street, Chennai"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#174D38]" />
            <span>Notes / Remarks (Optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Special preferences, contact notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs sm:text-sm text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524]"
          />
        </div>

        {/* Preservation Safety Notice */}
        {isEditMode && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#5B7065] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              <strong className="text-[#003524]">Data Safety:</strong> Editing this profile preserves all assigned Chit Numbers, payouts, installment schedules, and historical payment ledgers without alteration.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAF2EC]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-lg shadow-sm transition-colors flex items-center gap-2 min-h-[40px]"
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{isEditMode ? 'Save Changes' : 'Create Member'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MemberForm;
