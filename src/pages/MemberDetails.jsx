import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Printer,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  MessageSquare,
  PlusCircle,
  Bell,
  Eye,
  ShieldCheck,
  Send,
  MoreVertical,
  UserX,
  UserCheck,
  Trash2,
  Ban
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { isValidWhatsAppPhone } from '../utils/whatsapp';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import MemberForm from '../components/members/MemberForm';
import PaymentForm from '../components/payments/PaymentForm';
import DeleteMemberModal from '../components/members/DeleteMemberModal';
import CancelMembershipModal from '../components/members/CancelMembershipModal';
import LoadingState from '../components/common/LoadingState';
import WhatsAppComposerModal from '../components/whatsapp/WhatsAppComposerModal';
import { getChitInstallmentInfo } from '../utils/chitCalculations';
import AssignChitModal from '../components/chits/AssignChitModal';
import { useChit } from '../context/ChitContext';

export const MemberDetails = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { activeChit, showToast } = useChit();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & Menu States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAssignChitOpen, setIsAssignChitOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteModalMode, setDeleteModalMode] = useState('delete'); // 'deactivate' | 'delete'
  const [cancellingMembership, setCancellingMembership] = useState(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

  const [whatsAppConfig, setWhatsAppConfig] = useState({
    isOpen: false,
    messageType: 'welcome',
    selectedChitNo: ''
  });

  const loadMemberData = async () => {
    setLoading(true);
    try {
      const res = await api.getMember(memberId);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReactivateMember = async () => {
    if (!data?.member) return;
    setLoading(true);
    try {
      await api.reactivateMember(data.member.memberId);
      showToast(`Member ${data.member.name} has been reactivated successfully!`, 'success');
      await loadMemberData();
    } catch (err) {
      console.error('Reactivate member error:', err);
      showToast(err.message || 'Failed to reactivate member', 'error');
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <LoadingState message="Loading Member Account & Ledger..." />;
  }

  const { member, payments } = data;
  const memberChits = member.chits || [];
  const canWhatsApp = isValidWhatsAppPhone(member.mobile || member.phone);

  const handlePrintStatement = () => {
    window.print();
  };

  const handleOpenWhatsApp = (messageType = 'welcome', chitNo = '') => {
    setWhatsAppConfig({
      isOpen: true,
      messageType,
      selectedChitNo: chitNo
    });
  };

  const paymentColumns = [
    {
      header: 'Month',
      accessor: 'month',
      render: (row) => (
        <span className="font-bold text-[#003524]">
          Month {row.month || row.monthNumber}
        </span>
      )
    },
    {
      header: 'Chit No',
      accessor: 'chitNo',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#174D38]">
          {row.chitNo || (memberChits[0]?.chitNo || '-')}
        </span>
      )
    },
    {
      header: 'Scheduled Due',
      accessor: 'dueAmount',
      render: (row) => formatINR(row.dueAmount || row.amount || 0)
    },
    {
      header: 'Amount Paid',
      accessor: 'paidAmount',
      render: (row) => (
        <span className="font-bold text-emerald-800">
          {formatINR(row.paidAmount || row.amount)}
        </span>
      )
    },
    {
      header: 'Payment Date',
      accessor: 'paymentDate',
      render: (row) => formatDate(row.paymentDate)
    },
    {
      header: 'Mode',
      accessor: 'paymentMode',
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-semibold">
          {row.paymentMode || row.paymentMethod || 'Cash'}
        </span>
      )
    },
    {
      header: 'Reference',
      accessor: 'reference',
      render: (row) => (
        <span className="text-xs text-[#5B7065] font-mono">
          {row.reference || row.referenceNumber || '-'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'Paid'} />
    }
  ];

  return (
    <div className="space-y-6 print-container">
      {/* Printable Letterhead (Only visible in Print) */}
      <div className="hidden print-only mb-6 pb-4 border-b-2 border-black">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-black">MSR CHITS</h1>
            <p className="text-xs text-gray-700">Simple Chit Management System • Member Ledger Statement</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Date: {new Date().toLocaleDateString('en-IN')}</p>
            <p>Member ID: {member.memberId}</p>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="p-2 text-[#003524] hover:bg-[#F0FCF4] rounded-xl border border-[#DCE8E0] transition-colors"
            title="Back to Members"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
                {member.name}
              </h2>
              <StatusBadge status={member.status || 'Active'} />
            </div>
            <p className="text-xs text-[#5B7065] mt-0.5">
              Member ID: <span className="font-mono font-bold text-[#174D38]">{member.memberId}</span> • Joined {formatDate(member.joinDate)}
            </p>
          </div>
        </div>

        {/* Action Buttons with prominent WhatsApp Integration */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Welcome Button */}
          {canWhatsApp ? (
            <button
              type="button"
              onClick={() => handleOpenWhatsApp('welcome')}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
              title="Send WhatsApp Welcome Message"
            >
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>WhatsApp Welcome</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-3 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs sm:text-sm font-bold rounded-xl cursor-not-allowed flex items-center gap-1.5 min-h-[44px]"
              title="Phone number required"
            >
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>Phone number required</span>
            </button>
          )}

          {/* WhatsApp Payment Reminder Button */}
          {canWhatsApp && (
            <button
              type="button"
              onClick={() => handleOpenWhatsApp('reminder')}
              className="px-3 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
              title="Send Monthly Payment Reminder via WhatsApp"
            >
              <Bell className="w-4 h-4 text-[#C9A227]" />
              <span>Payment Reminder</span>
            </button>
          )}

          {/* Assign Chit Button */}
          <button
            type="button"
            onClick={() => setIsAssignChitOpen(true)}
            className="px-3 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4 text-[#174D38]" />
            <span>Assign Chit</span>
          </button>

          <button
            type="button"
            onClick={handlePrintStatement}
            className="px-3 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-[#174D38]" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="px-3 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <Edit2 className="w-4 h-4 text-[#174D38]" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaymentOpen(true)}
            className="px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <CreditCard className="w-4 h-4 text-[#C9A227]" />
            <span>Record Payment</span>
          </button>

          {/* More Action Menu (...) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2.5 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
              title="More Actions"
              aria-label="More Actions"
            >
              <MoreVertical className="w-4 h-4 text-[#174D38]" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#DCE8E0] rounded-2xl shadow-xl z-30 py-1.5 animate-scale-up">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsEditOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#003524] hover:bg-[#F0FCF4] flex items-center gap-2.5 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-[#174D38]" />
                  <span>Edit Member</span>
                </button>

                {String(member.status || '').toUpperCase() === 'INACTIVE' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleReactivateMember();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span>Reactivate Member</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setDeleteModalMode('deactivate');
                      setIsDeleteOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                  >
                    <UserX className="w-4 h-4 text-amber-700" />
                    <span>Deactivate Member</span>
                  </button>
                )}

                <div className="h-px bg-[#EAF2EC] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setDeleteModalMode('delete');
                    setIsDeleteOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Delete Member</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-[#003524] pb-2 border-b border-[#EAF2EC] flex items-center justify-between">
            <span>Member Profile</span>
            <span className="text-[10px] font-mono text-[#5B7065]">{member.memberId}</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#131E19]">
              <Phone className="w-4 h-4 text-[#174D38] shrink-0" />
              <div>
                <span className="text-[#5B7065] block text-[10px]">Mobile / Phone</span>
                {member.mobile || member.phone ? (
                  <span className="font-bold text-sm">+{member.mobile || member.phone}</span>
                ) : (
                  <span className="text-amber-800 font-semibold italic">Phone number required</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#131E19]">
              <Mail className="w-4 h-4 text-[#174D38] shrink-0" />
              <div>
                <span className="text-[#5B7065] block text-[10px]">Email</span>
                <span className="font-medium">{member.email || 'No email provided'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#131E19]">
              <MapPin className="w-4 h-4 text-[#174D38] shrink-0" />
              <div>
                <span className="text-[#5B7065] block text-[10px]">Address</span>
                <span>{member.address || 'Address not specified'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#131E19]">
              <MessageSquare className="w-4 h-4 text-[#174D38] shrink-0" />
              <div>
                <span className="text-[#5B7065] block text-[10px]">WhatsApp Language</span>
                <span className="font-semibold text-xs text-[#003524]">
                  {member.preferredLanguage === 'Tamil' || member.preferredLanguage === 'ta' ? 'தமிழ் (Tamil)' : 'English'}
                </span>
              </div>
            </div>

            {member.notes && (
              <div className="p-2.5 bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] text-[11px] text-[#003524]">
                <span className="font-bold block">Notes:</span>
                <span>{member.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payout & Assignment Summary */}
        <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-[#003524] pb-2 border-b border-[#EAF2EC]">
            Dividend & Schedule
          </h4>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
              <span className="text-[#5B7065] text-[11px] font-semibold">Assigned Payout Month:</span>
              <p className="text-base font-extrabold text-[#003524] mt-0.5">
                {member.payoutMonth || 'Not Assigned'}
              </p>
            </div>

            <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
              <span className="text-[#5B7065] text-[11px] font-semibold">Active Chit Memberships:</span>
              <p className="text-base font-extrabold text-[#003524] mt-0.5">
                {memberChits.length} {memberChits.length === 1 ? 'Chit Assigned' : 'Chits Assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-[#003524] pb-2 border-b border-[#EAF2EC]">
            Financial Ledger
          </h4>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="font-semibold text-emerald-800">Total Amount Paid:</span>
              <span className="text-base font-extrabold text-emerald-900">
                {formatINR(member.totalPaid || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="font-semibold text-amber-800">Pending Due:</span>
              <span className="text-base font-extrabold text-amber-900">
                {formatINR(member.totalPending || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 6: MY CHITS (Individual Chits per Member) */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#003524] tracking-tight">
              MY CHITS
            </h3>
            <p className="text-xs text-[#5B7065]">
              Individual chit memberships and assigned permanent unique Chit Numbers
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAssignChitOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Assign Chit</span>
          </button>
        </div>

        {memberChits.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-dashed border-[#DCE8E0] text-center space-y-3">
            <Layers className="w-10 h-10 text-[#5B7065] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[#003524]">
              No active chits assigned
            </h4>
            <p className="text-xs text-[#5B7065] max-w-sm mx-auto">
              This member is registered in MSR Chits but currently has no active chit slot assigned.
            </p>
            <button
              type="button"
              onClick={() => setIsAssignChitOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-[#C9A227]" />
              <span>Assign Chit</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberChits.map((chit) => {
              const instInfo = getChitInstallmentInfo(chit);

              return (
                <div
                  key={chit.chitNo}
                  className="bg-white rounded-2xl p-5 border border-[#DCE8E0] shadow-xs space-y-4 hover:border-[#174D38] transition-all"
                >
                  {/* Chit Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-lg font-black text-[#003524] tracking-tight block">
                        {chit.chitNo}
                      </span>
                      <span className="text-xs font-semibold text-[#174D38]">
                        MSR Chit — {formatINR(chit.chitValue || 100000)}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {chit.status || 'Active'}
                    </span>
                  </div>

                  {/* Chit Details Meta */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs pt-2 border-t border-[#EAF2EC]">
                    <div className="p-2 bg-[#F0FCF4] rounded-lg border border-[#DCE8E0]">
                      <span className="text-[#5B7065] text-[10px] block">Duration</span>
                      <span className="font-bold text-[#131E19]">
                        {chit.durationMonths || 20} Months
                      </span>
                    </div>

                    <div className="p-2 bg-[#F0FCF4] rounded-lg border border-[#DCE8E0]">
                      <span className="text-[#5B7065] text-[10px] block">Current Month</span>
                      <span className="font-bold text-[#003524]">
                        Month {instInfo.currentMonth}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-[#DCE8E0]">
                      <span className="text-[#5B7065] text-[10px] block">Current Installment</span>
                      <span className="font-extrabold text-[#003524]">
                        {formatINR(instInfo.currentInstallment)}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-[#DCE8E0]">
                      <span className="text-[#5B7065] text-[10px] block">Next Installment</span>
                      <span className="font-bold text-[#174D38]">
                        {instInfo.nextInstallment ? formatINR(instInfo.nextInstallment) : 'Completed'}
                      </span>
                    </div>

                    <div className="col-span-2 pt-1 flex items-center justify-between">
                      <div>
                        <span className="text-[#5B7065] text-[10px] block">Fixed Payout Month</span>
                        <span className="inline-flex items-center gap-1 font-extrabold text-[#003524] bg-[#F0FCF4] px-2 py-0.5 rounded border border-[#DCE8E0]">
                          <Calendar className="w-3 h-3 text-[#174D38]" />
                          Month {chit.payoutMonth}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        Variable by Month
                      </span>
                    </div>
                  </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#EAF2EC] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/chits/${chit.chitId || 'CHIT-100K-01'}`)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-[#003524] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Chit</span>
                  </button>

                  {canWhatsApp ? (
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp('welcome', chit.chitNo)}
                      className="flex-1 py-2 px-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-emerald-950 text-xs font-bold rounded-xl border border-emerald-300 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                      title="Send WhatsApp message for this chit"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>WhatsApp</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-2 px-3 bg-slate-50 text-slate-400 text-xs font-bold rounded-xl border border-slate-200 cursor-not-allowed flex items-center justify-center gap-1.5 min-h-[44px]"
                      title="Phone number required"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>No Phone</span>
                    </button>
                  )}

                  {chit.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => setCancellingMembership(chit)}
                      className="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 min-h-[44px]"
                      title="Cancel this chit membership"
                    >
                      <Ban className="w-3.5 h-3.5 text-amber-700" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Member Installment Statement Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#003524]">
            Payment & Installment Statement
          </h3>
          <span className="text-xs font-semibold text-[#5B7065]">
            {payments.length} Records
          </span>
        </div>

        <DataTable
          columns={paymentColumns}
          data={payments}
          emptyMessage="No payments recorded for this member yet"
          emptyDescription="Click 'Record Payment' to enter the first installment."
        />
      </div>

      {/* Modals */}
      <MemberForm
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={member}
        onSuccess={loadMemberData}
      />

      <PaymentForm
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        prefilledMemberId={member.memberId}
        onSuccess={loadMemberData}
      />

      <AssignChitModal
        isOpen={isAssignChitOpen}
        onClose={() => setIsAssignChitOpen(false)}
        prefilledMemberId={member.memberId}
        onSuccess={loadMemberData}
      />

      <WhatsAppComposerModal
        isOpen={whatsAppConfig.isOpen}
        onClose={() => setWhatsAppConfig({ ...whatsAppConfig, isOpen: false })}
        member={member}
        initialMessageType={whatsAppConfig.messageType}
      />

      <DeleteMemberModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        member={member}
        payments={payments}
        mode={deleteModalMode}
        onSuccess={loadMemberData}
      />

      <CancelMembershipModal
        isOpen={Boolean(cancellingMembership)}
        onClose={() => setCancellingMembership(null)}
        membership={cancellingMembership}
        memberName={member.name}
        onSuccess={loadMemberData}
      />
    </div>
  );
};

export default MemberDetails;
