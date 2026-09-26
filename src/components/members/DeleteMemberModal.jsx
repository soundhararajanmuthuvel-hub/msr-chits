import React, { useState } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { AlertTriangle, ShieldAlert, UserX, Trash2, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DeleteMemberModal = ({
  isOpen,
  onClose,
  member,
  payments = [],
  onSuccess
}) => {
  const { showToast } = useChit();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (!member) return null;

  // Assess linked financial and membership records (Sections 6, 8, 9)
  const paymentsCount = payments?.length || 0;
  const chitsCount = member.chits?.length || 0;
  const totalPaid = Number(member.totalPaid) || 0;
  const hasLinkedFinancialRecords = paymentsCount > 0 || chitsCount > 0 || totalPaid > 0;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hasLinkedFinancialRecords ? 'Cannot Permanently Delete Member' : 'Delete Member?'}
      subtitle={`Member ID: ${member.memberId}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {hasLinkedFinancialRecords ? (
          // ==========================================
          // CASE A: LINKED FINANCIAL RECORDS EXIST
          // Block permanent deletion, provide Deactivate
          // ==========================================
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-base font-extrabold text-[#003524]">
                Financial Records Are Linked
              </h4>
              <p className="text-xs text-[#5B7065] leading-relaxed">
                Cannot delete <strong className="text-[#131E19]">{member.name}</strong> because active financial transactions and chit enrollments are recorded under this account.
              </p>
            </div>

            {/* Linked Records Summary Card */}
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wider">
                Linked Records Summary:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
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

            {/* Explanatory Message */}
            <div className="p-3 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl text-[11px] text-[#003524] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#174D38] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                To preserve your financial statements, audit trail, and historical ledger integrity, <strong>deactivate the member instead</strong>. The member will not appear in active lists, but their transaction history remains safely accessible.
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
          // CASE B: ISOLATED MEMBER (NO LINKED DATA)
          // Permanent delete allowed with confirmation
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
                Are you sure you want to delete <strong className="text-[#131E19]">{member.name}</strong> (<span className="font-mono">{member.memberId}</span>)?
              </p>
            </div>

            <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-900">
              <div className="flex items-center gap-2 font-bold text-red-950">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Zero Financial Records Linked</span>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                This member has no linked payments, payouts, or active chits. This action will permanently remove this record from Google Sheets and cannot be undone.
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
