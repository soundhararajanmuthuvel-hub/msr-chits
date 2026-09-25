import React, { useState, useEffect } from 'react';
import {
  Send,
  PlusCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import PayoutForm from '../components/payouts/PayoutForm';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';

export const Payouts = () => {
  const { activeChit, isRecordPayoutOpen, setIsRecordPayoutOpen } = useChit();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const list = await api.getPayouts();
      setPayouts(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const totalPayoutAmount = payouts.reduce((sum, po) => sum + (Number(po.amount) || 0), 0);
  const thisMonthPayout = payouts.find(po => po.month === (activeChit?.currentMonth || 2))?.amount || 70000;
  const completedCount = payouts.filter(po => po.status === 'Completed').length;

  const columns = [
    {
      header: 'Month',
      accessor: 'month',
      render: (row) => (
        <span className="font-bold text-[#003524] px-2.5 py-1 rounded-lg bg-[#F0FCF4] border border-[#DCE8E0] text-xs">
          Month {row.month}
        </span>
      )
    },
    {
      header: 'Beneficiary Member',
      accessor: 'memberName',
      render: (row) => (
        <div>
          <span className="font-bold text-[#131E19] text-sm">{row.memberName}</span>
          {row.memberName === 'Amma + MU' && (
            <span className="ml-2 text-[10px] bg-[#C9A227]/20 text-[#85660D] font-bold px-1.5 py-0.2 rounded">
              Shared Allocation
            </span>
          )}
          {row.notes && (
            <span className="text-[10px] text-[#5B7065] block">{row.notes}</span>
          )}
        </div>
      )
    },
    {
      header: 'Payout Amount',
      accessor: 'amount',
      render: (row) => (
        <span className="font-extrabold text-[#003524] text-base">
          {formatINR(row.amount)}
        </span>
      )
    },
    {
      header: 'Disbursed Date',
      accessor: 'payoutDate',
      render: (row) => formatDate(row.payoutDate)
    },
    {
      header: 'Payment Mode',
      accessor: 'paymentMode',
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-semibold">
          {row.paymentMode || 'Bank Transfer'}
        </span>
      )
    },
    {
      header: 'UTR / Ref No',
      accessor: 'reference',
      render: (row) => (
        <span className="text-xs font-mono text-[#5B7065]">
          {row.reference || '-'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'Completed'} />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Chit Dividend Payouts
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Manage scheduled prize money disbursements and beneficiary allocations
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRecordPayoutOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-[#C9A227]" />
          <span>Record Payout</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Disbursed"
          value={formatINR(totalPayoutAmount)}
          subtitle="All completed months"
          icon={Send}
          accentColor="primary"
        />

        <StatCard
          title="This Month Payout"
          value={formatINR(thisMonthPayout)}
          subtitle="Month 2 Allocation"
          icon={ArrowUpRight}
          accentColor="gold"
        />

        <StatCard
          title="Completed Payouts"
          value={completedCount}
          subtitle="Months disbursed"
          icon={CheckCircle2}
          accentColor="emerald"
        />

        <StatCard
          title="Pending Months"
          value={20 - completedCount}
          subtitle="Remaining in 20M"
          icon={Clock}
          accentColor="blue"
        />
      </div>

      {/* Payouts Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#003524]">
            Disbursement Ledger
          </h3>
          <span className="text-xs font-semibold text-[#5B7065]">
            {payouts.length} Disbursements
          </span>
        </div>

        <DataTable
          columns={columns}
          data={payouts}
          loading={loading}
          emptyMessage="No payout records yet"
          emptyDescription="Click 'Record Payout' to disburse dividend for the current month."
        />
      </div>

      {/* Payout Modal */}
      <PayoutForm
        isOpen={isRecordPayoutOpen}
        onClose={() => setIsRecordPayoutOpen(false)}
        onSuccess={loadPayouts}
      />
    </div>
  );
};

export default Payouts;
