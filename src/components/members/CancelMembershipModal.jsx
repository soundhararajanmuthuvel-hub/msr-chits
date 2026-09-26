import React, { useState } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { AlertCircle, Ban, CheckCircle2 } from 'lucide-react';

export const CancelMembershipModal = ({
  isOpen,
  onClose,
  membership,
  memberName,
  onSuccess
}) => {
  const { showToast } = useChit();
  const [submitting, setSubmitting] = useState(false);

  if (!membership) return null;

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await api.cancelMembership(membership.membershipId);
      showToast(`Membership for ${membership.chitNo} cancelled successfully. Chit No is preserved and will never be reused.`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Cancel membership error:', err);
      showToast(err.message || 'Failed to cancel membership', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Chit Membership?"
      subtitle={`Chit No: ${membership.chitNo || 'Chit Slot'}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
          <Ban className="w-6 h-6" />
        </div>

        <div className="text-center space-y-2">
          <h4 className="text-base font-extrabold text-[#003524]">
            Cancel Membership for {memberName}?
          </h4>
          <p className="text-xs text-[#5B7065] leading-relaxed">
            Chit Number: <strong className="font-mono text-[#003524]">{membership.chitNo}</strong> (Month {membership.payoutMonth || 1})
          </p>
        </div>

        <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Chit Number Protection Rule</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            The Chit Number <strong className="font-mono">{membership.chitNo}</strong> and historical payment records will remain permanently archived. This Chit Number will <strong>never be deleted or reused</strong> for any other member.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
          >
            Keep Membership
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 min-h-[40px]"
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <Ban className="w-3.5 h-3.5" />
            <span>Cancel Membership</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelMembershipModal;
