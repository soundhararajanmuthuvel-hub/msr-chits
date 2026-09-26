import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowDownLeft,
  Printer,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import SearchBar from '../components/common/SearchBar';
import FilterBar from '../components/common/FilterBar';
import DataTable from '../components/common/DataTable';
import PaymentForm from '../components/payments/PaymentForm';
import WhatsAppComposerModal from '../components/whatsapp/WhatsAppComposerModal';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';

export const Payments = () => {
  const { activeChit, isRecordPaymentOpen, setIsRecordPaymentOpen } = useChit();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // WhatsApp composer state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [selectedWhatsAppMember, setSelectedWhatsAppMember] = useState(null);
  const [selectedPaymentForWA, setSelectedPaymentForWA] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, memberList] = await Promise.all([
        api.getPayments(),
        api.getMembers()
      ]);
      setPayments(list || []);
      setMembers(memberList || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const thisMonthCollected = payments
    .filter(p => p.month === (activeChit?.currentMonth || 2))
    .reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const pendingCount = payments.filter(p => p.status === 'Pending').length;

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        p.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.paymentId?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (monthFilter !== 'All' && String(p.month) !== String(monthFilter)) {
        return false;
      }

      if (statusFilter !== 'All' && p.status !== statusFilter) {
        return false;
      }

      if (modeFilter !== 'All' && p.paymentMode !== modeFilter) {
        return false;
      }

      return true;
    });
  }, [payments, searchTerm, monthFilter, statusFilter, modeFilter]);

  const columns = [
    {
      header: 'Payment Date',
      accessor: 'paymentDate',
      render: (row) => (
        <span className="text-xs font-semibold text-[#131E19]">
          {formatDate(row.paymentDate)}
        </span>
      )
    },
    {
      header: 'Member Name',
      accessor: 'memberName',
      render: (row) => (
        <div>
          <span className="font-bold text-[#003524]">{row.memberName}</span>
          {row.reference && (
            <span className="text-[10px] text-[#5B7065] block font-mono">
              Ref: {row.reference}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Chit No',
      accessor: 'chitNo',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#003524] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          {row.chitNo || row.chitNumber || 'MSR261L01'}
        </span>
      )
    },
    {
      header: 'Month',
      accessor: 'month',
      render: (row) => (
        <span className="font-bold text-[#174D38] px-2 py-0.5 rounded bg-[#F0FCF4] border border-[#DCE8E0] text-xs">
          Month {row.month}
        </span>
      )
    },
    {
      header: 'Due Amount',
      accessor: 'dueAmount',
      render: (row) => formatINR(row.dueAmount)
    },
    {
      header: 'Paid Amount',
      accessor: 'paidAmount',
      render: (row) => (
        <span className="font-extrabold text-emerald-800 text-sm">
          {formatINR(row.paidAmount)}
        </span>
      )
    },
    {
      header: 'Payment Mode',
      accessor: 'paymentMode',
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
          {row.paymentMode || 'Cash'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'Paid'} />
    },
    {
      header: 'WhatsApp',
      accessor: 'actions',
      render: (row) => {
        const member = members.find(m => m.id === row.memberId || m.name === row.memberName);
        return (
          <button
            type="button"
            onClick={() => {
              setSelectedPaymentForWA(row);
              setSelectedWhatsAppMember(member || { name: row.memberName, phone: '' });
              setWhatsAppModalOpen(true);
            }}
            title={member?.phone ? "Send WhatsApp Payment Confirmation" : "Phone number required"}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] hover:bg-[#003524] hover:text-white transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="hidden sm:inline">Receipt</span>
          </button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Member Payments & Collections
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Track monthly contributions, installments, and payment receipts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRecordPaymentOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-[#C9A227]" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Collected"
          value={formatINR(totalCollected)}
          subtitle="All installments"
          icon={CreditCard}
          accentColor="emerald"
        />

        <StatCard
          title="This Month"
          value={formatINR(thisMonthCollected)}
          subtitle={`Month ${activeChit?.currentMonth || 2}`}
          icon={ArrowDownLeft}
          accentColor="primary"
        />

        <StatCard
          title="Pending Due"
          value={formatINR(3750 * pendingCount)}
          subtitle={`${pendingCount} Pending Members`}
          icon={AlertCircle}
          accentColor="gold"
        />

        <StatCard
          title="Payment Count"
          value={payments.length}
          subtitle="Processed receipts"
          icon={Layers}
          accentColor="blue"
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search payments by member, reference..."
            className="max-w-md"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Filter */}
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#003524]"
            >
              <option value="All">All Months</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Month {m}
                </option>
              ))}
            </select>

            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#003524]"
            >
              <option value="All">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <FilterBar
          options={['All', 'Paid', 'Partial', 'Pending']}
          activeFilter={statusFilter}
          onSelectFilter={setStatusFilter}
        />
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        loading={loading}
        emptyMessage="No payment records found"
        emptyDescription="Try clearing filters or click 'Record Payment' to add a new transaction."
      />

      {/* Payment Form Modal */}
      <PaymentForm
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={loadData}
      />

      {/* WhatsApp Composer Modal */}
      {whatsAppModalOpen && (
        <WhatsAppComposerModal
          isOpen={whatsAppModalOpen}
          onClose={() => setWhatsAppModalOpen(false)}
          member={selectedWhatsAppMember}
          initialCategory="payment_received"
          relatedPayment={selectedPaymentForWA}
          prefilledChitNo={selectedPaymentForWA?.chitNo}
        />
      )}
    </div>
  );
};

export default Payments;
