import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Printer,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Building2
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import MemberForm from '../components/members/MemberForm';
import PaymentForm from '../components/payments/PaymentForm';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';

export const MemberDetails = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { activeChit } = useChit();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

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

  if (loading || !data) {
    return <LoadingState message="Loading Member Account & Ledger..." />;
  }

  const { member, payments } = data;

  const handlePrintStatement = () => {
    window.print();
  };

  const paymentColumns = [
    {
      header: 'Month',
      accessor: 'month',
      render: (row) => (
        <span className="font-bold text-[#003524]">
          Month {row.month}
        </span>
      )
    },
    {
      header: 'Scheduled Due',
      accessor: 'dueAmount',
      render: (row) => formatINR(row.dueAmount)
    },
    {
      header: 'Amount Paid',
      accessor: 'paidAmount',
      render: (row) => (
        <span className="font-bold text-emerald-800">
          {formatINR(row.paidAmount)}
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
          {row.paymentMode || 'Cash'}
        </span>
      )
    },
    {
      header: 'Reference',
      accessor: 'reference',
      render: (row) => (
        <span className="text-xs text-[#5B7065] font-mono">
          {row.reference || '-'}
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintStatement}
            className="px-3.5 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#174D38]" />
            <span>Print Statement</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Edit2 className="w-4 h-4 text-[#174D38]" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaymentOpen(true)}
            className="px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4 text-[#C9A227]" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Member Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact & Chit Details */}
        <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-[#003524] pb-2 border-b border-[#EAF2EC]">
            Member Information
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#131E19]">
              <Phone className="w-4 h-4 text-[#174D38] shrink-0" />
              <div>
                <span className="text-[#5B7065] block text-[10px]">Mobile</span>
                <span className="font-bold">{member.mobile}</span>
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
              <Layers className="w-4 h-4 text-[#174D38] shrink-0" />
              <div>
                <span className="text-[#5B7065] block text-[10px]">Chit Slots Enrolled</span>
                <span className="font-bold">{member.chitCount || 1} Chit</span>
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

        {/* Payout & Assignment Status */}
        <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-[#003524] pb-2 border-b border-[#EAF2EC]">
            Dividend & Payout Schedule
          </h4>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
              <span className="text-[#5B7065] text-[11px] font-semibold">Assigned Payout Month:</span>
              <p className="text-base font-extrabold text-[#003524] mt-0.5">
                {member.payoutMonth || 'Not Assigned'}
              </p>
            </div>

            <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
              <span className="text-[#5B7065] text-[11px] font-semibold">Dividend Received / Scheduled:</span>
              <p className="text-base font-extrabold text-[#003524] mt-0.5">
                {formatINR(member.payoutAmount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-2xl p-6 border border-[#DCE8E0] shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-[#003524] pb-2 border-b border-[#EAF2EC]">
            Installment Summary
          </h4>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="font-semibold text-emerald-800">Total Amount Paid:</span>
              <span className="text-base font-extrabold text-emerald-900">
                {formatINR(member.totalPaid || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="font-semibold text-amber-800">Current Outstanding Due:</span>
              <span className="text-base font-extrabold text-amber-900">
                {formatINR(member.totalPending || 0)}
              </span>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default MemberDetails;
