import React, { useState } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { AlertTriangle, ShieldAlert, UserX, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DeleteMemberModal = ({
  isOpen,
  onClose,
  member,
  payments = [],
  mode = 'delete', // 'deactivate' | 'delete'
  onSuccess
}) => {
  const { showToast } = useChit();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (!member) return null;

  // Assess linked financial and membership records (Prompt Sections 9, 10, 18)
  const paymentsCount = payments?.length || 0;
  const chitsCount = member.chits?.length || 0;
  const totalPaid = Number(member.totalPaid) || 0;
  const hasLinkedFinancialRecords = paymentsCount > 0 || chitsCount > 0 || totalPaid > 0;

  const activeChitsText = member.chits && member.chits.length > 0
    ? member.chits.map(c => c.chitNo || c.chitId).join(', ')
    : (member.assignedChits || 'None');

  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      await api.deactivateMember(member.memberId);
      showToast(`Member ${member.name} has been deactivated. Historical records remain fully preserved.`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Deactivate member error:', err);
      showToast(err.message || 'Failed to deactivate member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    setSubmitting(true);
    try {
      await api.deleteMember(member.memberId);
      showToast(`Member ${member.name} (${member.memberId}) permanently deleted.`, 'success');
      onClose();
      navigate('/members');
    } catch (err) {
      console.error('Permanent delete error:', err);
      showToast(err.message || 'Failed to delete member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine modal title & subtitle based on prompt specifications
  let modalTitle = 'Deactivate Member?';
  if (mode === 'delete') {
    modalTitle = hasLinkedFinancialRecords ? 'Cannot Delete Member' : 'Delete Member Permanently?';
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={`Member ID: ${member.memberId}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {mode === 'deactivate' ? (
          // ==========================================
          // 16. DEACTIVATE CONFIRMATION (Prompt Section 16)
          // ==========================================
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
              <UserX className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-base font-extrabold text-[#003524]">
                Deactivate Member?
              </h4>
              <p className="text-xs text-[#5B7065] leading-relaxed">
                This member will become inactive. Historical payments, payouts and chit records will be preserved.
              </p>
            </div>

            {/* Member Details Summary */}
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-amber-200/60">
                <span className="text-[#5B7065]">Member Name:</span>
                <span className="font-bold text-[#003524]">{member.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-amber-200/60">
                <span className="text-[#5B7065]">Member ID:</span>
                <span className="font-mono font-bold text-[#003524]">{member.memberId}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#5B7065]">Active Chits:</span>
                <span className="font-bold text-amber-900">{activeChitsText}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 min-h-[40px]"
              >
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>
            </div>
          </>
        ) : hasLinkedFinancialRecords ? (
          // ==========================================
          // 18. LINKED RECORD DELETE MESSAGE (Prompt Section 18)
          // ==========================================
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-base font-extrabold text-[#003524]">
                Cannot Delete Member
              </h4>
              <p className="text-xs text-[#5B7065] leading-relaxed">
                This member has linked chit or financial records. To protect your financial history, permanently deleting this member is disabled.
              </p>
            </div>

            {/* Linked Records Summary Card */}
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-amber-200/60">
                <span className="text-[#5B7065]">Member Name:</span>
                <span className="font-bold text-[#003524]">{member.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-amber-200/60">
                <span className="text-[#5B7065]">Member ID:</span>
                <span className="font-mono font-bold text-[#003524]">{member.memberId}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1.5">
                <div className="p-2 bg-white rounded-lg border border-amber-100 shadow-xs">
                  <span className="text-[10px] text-[#5B7065] block">Payments</span>
                  <span className="font-extrabold text-amber-900 text-sm">{paymentsCount}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-amber-100 shadow-xs">
                  <span className="text-[10px] text-[#5B7065] block">Chits</span>
                  <span className="font-extrabold text-amber-900 text-sm">{chitsCount}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-amber-100 shadow-xs">
                  <span className="text-[10px] text-[#5B7065] block">Total Paid</span>
                  <span className="font-extrabold text-emerald-900 text-xs">{formatINR(totalPaid)}</span>
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="p-3 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl text-[11px] text-[#003524] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#174D38] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Deactivating the member preserves all payments, payouts, and chit records in the database while marking the member profile inactive.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 min-h-[40px]"
              >
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate Member</span>
              </button>
            </div>
          </>
        ) : (
          // ==========================================
          // 17. DELETE CONFIRMATION (Prompt Section 17)
          // ==========================================
          <>
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-base font-extrabold text-[#003524]">
                Delete Member Permanently?
              </h4>
              <p className="text-xs text-[#5B7065] leading-relaxed">
                This member has no linked financial records. Permanent deletion cannot be undone.
              </p>
            </div>

            {/* Member Details */}
            <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-red-200/60">
                <span className="text-[#5B7065]">Member Name:</span>
                <span className="font-bold text-[#003524]">{member.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#5B7065]">Member ID:</span>
                <span className="font-mono font-bold text-[#003524]">{member.memberId}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 min-h-[40px]"
              >
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default DeleteMemberModal;
