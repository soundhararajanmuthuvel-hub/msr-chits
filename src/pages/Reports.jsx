import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  CreditCard,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { getChitCapacityStats } from '../utils/chitCalculations';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import LoadingState from '../components/common/LoadingState';
import ExtraInvestmentTracker from '../components/investments/ExtraInvestmentTracker';
import { useChit } from '../context/ChitContext';

export const Reports = () => {
  const { showToast } = useChit();
  const [data, setData] = useState(null);
  const [chits, setChits] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState('monthly'); // 'monthly', 'upcoming', 'members', 'payments', 'payouts', 'pending', 'extraInvestment'
  const [upcomingStatusFilter, setUpcomingStatusFilter] = useState('all');

  const loadReports = async () => {
    setLoading(true);
    try {
      const [res, cList, msList] = await Promise.all([
        api.getReports(),
        api.getChits(),
        api.getMemberships()
      ]);
      setData(res);
      setChits(Array.isArray(cList) ? cList : (cList?.chits || []));
      setMemberships(Array.isArray(msList) ? msList : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = async () => {
    let filename = `MSR_Chits_${selectedReport}_report.csv`;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (selectedReport === 'extraInvestment') {
      const extraList = await api.getExtraInvestments();
      csvContent += 'Investment ID,Date,Invested Amount,Used Amount,Beneficiary,Payout Reference,Returned Amount,Profit,Profit %\n';
      (extraList || []).forEach((inv) => {
        const p = (Number(inv.returnedAmount) || 0) - (Number(inv.investmentAmount) || 0);
        const pct = (Number(inv.investmentAmount) || 0) > 0 ? ((p / Number(inv.investmentAmount)) * 100).toFixed(1) : 0;
        csvContent += `${inv.investmentId},${inv.investmentDate || ''},${inv.investmentAmount},${inv.usedAmount || inv.investmentAmount},"${inv.beneficiary || ''}","${inv.payout || ''}",${inv.returnedAmount},${p},${pct}%\n`;
      });
    } else if (selectedReport === 'upcoming') {
      csvContent += 'Chit Name,Chit Value,Start Date,Duration,Required Members,Joined Members,Remaining Members,Fill %,Status\n';
      filteredUpcomingChits.forEach((c) => {
        csvContent += `"${c.chitName}",${c.chitValue},${c.startDate || ''},${c.duration},${c.requiredMembers},${c.joinedMembers},${c.remainingSlots},${c.fillPercentage}%,${c.status}\n`;
      });
    } else if (data) {
      if (selectedReport === 'monthly') {
        csvContent += 'Month,Monthly Installment,Expected Collection,Collected,Pending,Payout Amount,Beneficiary,Payout Status\n';
        data.monthlyBreakdown.forEach((row) => {
          csvContent += `Month ${row.month},${row.monthlyAmount},${row.expected},${row.collected},${row.pending},${row.payoutAmount},"${row.payoutBeneficiary}",${row.payoutStatus}\n`;
        });
      } else if (selectedReport === 'members' || selectedReport === 'pending') {
        csvContent += 'Member ID,Name,Mobile,Chit Count,Payout Month,Total Paid,Total Pending,Status\n';
        const targetList = selectedReport === 'pending'
          ? data.members.filter(m => (m.totalPending || 0) > 0)
          : data.members;

        targetList.forEach((m) => {
          csvContent += `${m.memberId},"${m.name}",${m.mobile},${m.chitCount || 1},"${m.payoutMonth || 'Not Assigned'}",${m.totalPaid || 0},${m.totalPending || 0},${m.status}\n`;
        });
      } else if (selectedReport === 'payments') {
        csvContent += 'Payment ID,Member Name,Month,Due Amount,Paid Amount,Payment Date,Payment Mode,Reference,Status\n';
        data.payments.forEach((p) => {
          csvContent += `${p.paymentId},"${p.memberName}",Month ${p.month},${p.dueAmount},${p.paidAmount},${p.paymentDate || ''},${p.paymentMode || ''},"${p.reference || ''}",${p.status}\n`;
        });
      } else if (selectedReport === 'payouts') {
        csvContent += 'Payout ID,Month,Beneficiary Member,Amount,Disbursed Date,Payment Mode,Reference,Status\n';
        data.payouts.forEach((po) => {
          csvContent += `${po.payoutId},Month ${po.month},"${po.memberName}",${po.amount},${po.payoutDate || ''},${po.paymentMode || ''},"${po.reference || ''}",${po.status}\n`;
        });
      }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename} successfully!`, 'success');
  };

  const upcomingChitsList = useMemo(() => {
    return (chits || []).map(c => {
      const capStats = getChitCapacityStats(c, memberships);
      return {
        ...c,
        chitName: c.chitName || c.chitId,
        chitValue: Number(c.chitValue || c.totalAmount || 0),
        duration: Number(c.duration || c.durationMonths || 20),
        requiredMembers: capStats.requiredMembers,
        joinedMembers: capStats.joinedMembers,
        remainingSlots: capStats.remainingSlots,
        fillPercentage: capStats.fillPercentage,
        status: capStats.status
      };
    });
  }, [chits, memberships]);

  const filteredUpcomingChits = useMemo(() => {
    if (upcomingStatusFilter === 'all') return upcomingChitsList;
    return upcomingChitsList.filter(c => c.status.toLowerCase() === upcomingStatusFilter.toLowerCase());
  }, [upcomingChitsList, upcomingStatusFilter]);

  if (loading || !data) {
    return <LoadingState message="Generating MSR Chits Reports..." />;
  }

  const { summary, monthlyBreakdown, members, payments, payouts } = data;

  const reportTabs = [
    { key: 'monthly', label: 'Monthly Collection & Payout', count: `${monthlyBreakdown.length} Months` },
    { key: 'upcoming', label: 'Upcoming Chit Summary', count: `${upcomingChitsList.length} Schemes` },
    { key: 'members', label: 'Member Ledger Statement', count: `${members.length} Members` },
    { key: 'payments', label: 'Payment Receipts Report', count: `${payments.length} Records` },
    { key: 'payouts', label: 'Payout Disbursements', count: `${payouts.length} Records` },
    { key: 'pending', label: 'Pending Dues Report', count: `${members.filter(m => (m.totalPending || 0) > 0).length} Pending` },
    { key: 'extraInvestment', label: 'Extra Investments', count: 'Isolated Profit' },
  ];

  return (
    <div className="space-y-6 print-container">
      {/* Print Letterhead */}
      <div className="hidden print-only mb-6 pb-4 border-b-2 border-black">
        <h1 className="text-2xl font-bold text-black">MSR CHITS MANAGEMENT</h1>
        <p className="text-xs text-gray-700">Official Financial & Statement Report • Generated on {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Financial & Statement Reports
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Export receipts, download CSV ledgers, and print audit statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#174D38]" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-[#C9A227]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Collection"
          value={formatINR(summary.totalCollection)}
          subtitle="Processed receipts"
          icon={CreditCard}
          accentColor="emerald"
        />

        <StatCard
          title="Total Payouts"
          value={formatINR(summary.totalPayout)}
          subtitle="Disbursed dividends"
          icon={Send}
          accentColor="primary"
        />

        <StatCard
          title="Pending Collection"
          value={formatINR(summary.pendingCollection)}
          subtitle="Current installments"
          icon={AlertCircle}
          accentColor="gold"
        />

        <StatCard
          title="Completed Receipts"
          value={summary.completedPayments}
          subtitle="Receipt count"
          icon={CheckCircle2}
          accentColor="blue"
        />
      </div>

      {/* Report Switcher Tabs */}
      <div className="bg-white p-2 rounded-xl border border-[#DCE8E0] shadow-xs flex items-center gap-2 overflow-x-auto no-print">
        {reportTabs.map((tab) => {
          const isActive = selectedReport === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedReport(tab.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#4B6358] hover:bg-[#F0FCF4] hover:text-[#003524]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#F0FCF4] text-[#003524]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* REPORT CONTENT TABLES */}
      {selectedReport === 'monthly' && (
        <DataTable
          columns={[
            { header: 'Month', accessor: 'month', render: (r) => <span className="font-bold text-[#003524]">Month {r.month}</span> },
            { header: 'Monthly Installment', accessor: 'monthlyAmount', render: (r) => formatINR(r.monthlyAmount) },
            { header: 'Expected Collection', accessor: 'expected', render: (r) => formatINR(r.expected) },
            { header: 'Collected', accessor: 'collected', render: (r) => <span className="font-bold text-emerald-800">{formatINR(r.collected)}</span> },
            { header: 'Pending', accessor: 'pending', render: (r) => <span className="text-amber-800">{formatINR(r.pending)}</span> },
            { header: 'Payout Dividend', accessor: 'payoutAmount', render: (r) => formatINR(r.payoutAmount) },
            { header: 'Beneficiary Allocation', accessor: 'payoutBeneficiary', render: (r) => <span className="font-bold">{r.payoutBeneficiary}</span> },
            { header: 'Payout Status', accessor: 'payoutStatus', render: (r) => <StatusBadge status={r.payoutStatus} /> }
          ]}
          data={monthlyBreakdown}
        />
      )}

      {selectedReport === 'upcoming' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#DCE8E0]">
            <span className="text-xs font-bold text-[#003524]">Filter Schemes by Lifecycle Status:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['all', 'upcoming', 'filling', 'full', 'active', 'completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setUpcomingStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                    upcomingStatusFilter === st
                      ? 'bg-[#003524] text-white shadow-xs'
                      : 'bg-slate-100 text-[#4B6358] hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            columns={[
              { header: 'Chit Name', accessor: 'chitName', render: (r) => <span className="font-bold text-[#003524]">{r.chitName}</span> },
              { header: 'Chit Value', accessor: 'chitValue', render: (r) => formatINR(r.chitValue) },
              { header: 'Start Date', accessor: 'startDate', render: (r) => r.startDate ? formatDate(r.startDate) : 'Not Set' },
              { header: 'Duration', accessor: 'duration', render: (r) => `${r.duration} Months` },
              { header: 'Required Members', accessor: 'requiredMembers', render: (r) => <span className="font-bold">{r.requiredMembers}</span> },
              { header: 'Joined Members', accessor: 'joinedMembers', render: (r) => <span className="font-bold text-emerald-800">{r.joinedMembers}</span> },
              { header: 'Remaining Slots', accessor: 'remainingSlots', render: (r) => <span className="font-bold text-amber-800">{r.remainingSlots}</span> },
              {
                header: 'Fill %',
                accessor: 'fillPercentage',
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{r.fillPercentage}%</span>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#003524]" style={{ width: `${r.fillPercentage}%` }} />
                    </div>
                  </div>
                )
              },
              { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> }
            ]}
            data={filteredUpcomingChits}
          />
        </div>
      )}

      {(selectedReport === 'members' || selectedReport === 'pending') && (
        <DataTable
          columns={[
            { header: 'Member ID', accessor: 'memberId', render: (r) => <span className="font-mono font-bold text-[#174D38]">{r.memberId}</span> },
            { header: 'Member Name', accessor: 'name', render: (r) => <span className="font-bold text-[#003524]">{r.name}</span> },
            { header: 'Mobile', accessor: 'mobile' },
            { header: 'Chit Slots', accessor: 'chitCount', render: (r) => r.chitCount || 1 },
            { header: 'Payout Month', accessor: 'payoutMonth', render: (r) => <span className="italic">{r.payoutMonth || 'Not Assigned'}</span> },
            { header: 'Total Paid', accessor: 'totalPaid', render: (r) => <span className="font-bold text-emerald-800">{formatINR(r.totalPaid || 0)}</span> },
            { header: 'Pending Due', accessor: 'totalPending', render: (r) => <span className="font-bold text-amber-800">{formatINR(r.totalPending || 0)}</span> },
            { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status || 'Active'} /> }
          ]}
          data={selectedReport === 'pending' ? members.filter(m => (m.totalPending || 0) > 0) : members}
        />
      )}

      {selectedReport === 'payments' && (
        <DataTable
          columns={[
            { header: 'Date', accessor: 'paymentDate', render: (r) => formatDate(r.paymentDate) },
            { header: 'Member', accessor: 'memberName', render: (r) => <span className="font-bold text-[#003524]">{r.memberName}</span> },
            { header: 'Month', accessor: 'month', render: (r) => `Month ${r.month}` },
            { header: 'Due Amount', accessor: 'dueAmount', render: (r) => formatINR(r.dueAmount) },
            { header: 'Paid Amount', accessor: 'paidAmount', render: (r) => <span className="font-bold text-emerald-800">{formatINR(r.paidAmount)}</span> },
            { header: 'Mode', accessor: 'paymentMode' },
            { header: 'Reference', accessor: 'reference' },
            { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> }
          ]}
          data={payments}
        />
      )}

      {selectedReport === 'payouts' && (
        <DataTable
          columns={[
            { header: 'Month', accessor: 'month', render: (r) => <span className="font-bold text-[#003524]">Month {r.month}</span> },
            { header: 'Beneficiary', accessor: 'memberName', render: (r) => <span className="font-bold">{r.memberName}</span> },
            { header: 'Payout Amount', accessor: 'amount', render: (r) => <span className="font-bold text-emerald-800">{formatINR(r.amount)}</span> },
            { header: 'Date', accessor: 'payoutDate', render: (r) => formatDate(r.payoutDate) },
            { header: 'Mode', accessor: 'paymentMode' },
            { header: 'Reference', accessor: 'reference' },
            { header: 'Status', accessor: 'status', render: (r) => <StatusBadge status={r.status} /> }
          ]}
          data={payouts}
        />
      )}

      {selectedReport === 'extraInvestment' && (
        <ExtraInvestmentTracker />
      )}
    </div>
  );
};

export default Reports;
