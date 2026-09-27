import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Send,
  Sparkles,
  Percent,
  Layers,
  Users,
  Calendar,
  Filter,
  RotateCcw,
  RefreshCw,
  Download,
  Printer,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  DollarSign,
  PieChart,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import StatCard from '../components/common/StatCard';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';
import AddExtraInvestmentModal from '../components/investments/AddExtraInvestmentModal';
import AllocateInvestmentModal from '../components/investments/AllocateInvestmentModal';
import RecordRecoveryModal from '../components/investments/RecordRecoveryModal';

export const ProfitLossAnalysis = () => {
  const navigate = useNavigate();
  const { showToast } = useChit();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [chits, setChits] = useState([]);
  const [members, setMembers] = useState([]);
  const [extraInvestments, setExtraInvestments] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);

  // Active Filter States
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    chitId: 'all',
    memberId: 'all',
    month: 'all',
    fundingSource: 'all'
  });

  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly', 'chitWise', 'memberWise', 'fundingSource'

  // Load Master Data & P&L Analysis
  const loadProfitLoss = async (customFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const [plRes, chitsRes, memsRes, extraRes, schRes] = await Promise.all([
        api.getProfitLoss(customFilters),
        api.getChits(),
        api.getMembers(),
        api.getExtraInvestments(),
        api.getMonthlySchedule('CHIT-100K-01')
      ]);

      setData(plRes);
      setChits(Array.isArray(chitsRes) ? chitsRes : (chitsRes?.chits || []));
      setMembers(Array.isArray(memsRes) ? memsRes : (memsRes?.members || []));
      setExtraInvestments(Array.isArray(extraRes) ? extraRes : []);
      setSchedule(Array.isArray(schRes) ? schRes : []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load profit and loss analysis:', err);
      setError(err.message || 'Unable to load financial data from Google Sheets.');
      showToast('Failed to load financial analysis data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfitLoss(filters);
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    loadProfitLoss(filters);
    showToast('Filters applied successfully', 'success');
  };

  const handleResetFilters = () => {
    const reset = {
      dateFrom: '',
      dateTo: '',
      chitId: 'all',
      memberId: 'all',
      month: 'all',
      fundingSource: 'all'
    };
    setFilters(reset);
    loadProfitLoss(reset);
    showToast('Filters reset to default', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    let filename = `MSR_Profit_Loss_${activeTab}_report.csv`;
    let csv = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'monthly') {
      csv += 'Month,Total Collection,Total Payout,Commission,Dividend,Extra Investment,Recovery,Profit,Cash Flow,Payments Count,Payouts Count\n';
      (data.monthlyBreakdown || []).forEach(row => {
        csv += `Month ${row.month},${row.collection},${row.payout},${row.commission},${row.dividend},${row.extraInvestment},${row.recovery},${row.profit},${row.cashFlow},${row.paymentsCount},${row.payoutsCount}\n`;
      });
    } else if (activeTab === 'chitWise') {
      csv += 'Chit Name,Chit ID,Chit Value,Duration,Members,Total Collection,Total Payout,Commission,Dividend,Profit,Cash Flow\n';
      (data.chitWise || []).forEach(c => {
        csv += `"${c.chitName}",${c.chitId},${c.chitValue},${c.duration},${c.members},${c.totalCollection},${c.totalPayout},${c.commission},${c.dividend},${c.profit},${c.cashFlow}\n`;
      });
    } else if (activeTab === 'memberWise') {
      csv += 'Member ID,Member Name,Mobile,Total Payments,Total Payouts,Pending Dues,Chits Count,Extra Inv Payouts,Status\n';
      (data.memberWise || []).forEach(m => {
        csv += `${m.memberId},"${m.name}",${m.phone},${m.totalPayments},${m.totalPayoutsReceived},${m.pendingAmount},${m.chitCount},${m.extraInvestmentPayouts},${m.status}\n`;
      });
    } else if (activeTab === 'fundingSource') {
      csv += 'Investment ID,Date,Investor/Source,Purpose,Invested,Allocated,Remaining,Recovered,Profit,ROI %,Status\n';
      extraInvestments.forEach(inv => {
        const invest = Number(inv.investmentAmount) || 0;
        const alloc = Number(inv.allocatedAmount !== undefined ? inv.allocatedAmount : inv.usedAmount) || 0;
        const rem = Math.max(0, invest - alloc);
        const rec = Number(inv.returnedAmount !== undefined ? inv.returnedAmount : inv.recoveredAmount) || 0;
        const profit = rec > 0 ? (rec - invest) : 'N/A';
        const roi = (rec > 0 && invest > 0) ? `${((profit / invest) * 100).toFixed(1)}%` : 'N/A';
        csv += `${inv.investmentId},${inv.investmentDate},"${inv.investor || inv.investorSource || inv.beneficiary || ''}","${inv.purpose || ''}",${invest},${alloc},${rem},${rec},${profit},${roi},${inv.status || 'Active'}\n`;
      });
    }

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename} successfully!`, 'success');
  };

  // Extra Investment CRUD Handlers
  const handleSaveInvestment = async (record) => {
    try {
      if (record.investmentId && extraInvestments.some(inv => inv.investmentId === record.investmentId)) {
        await api.updateExtraInvestment(record.investmentId, record);
        showToast('Extra Investment updated successfully!', 'success');
      } else {
        await api.createExtraInvestment(record);
        showToast('Extra Investment added successfully!', 'success');
      }
      await loadProfitLoss(filters);
    } catch (err) {
      showToast(err.message || 'Failed to save investment', 'error');
      throw err;
    }
  };

  const handleAllocateInvestment = async (allocationData) => {
    try {
      await api.allocateExtraInvestment(allocationData);
      showToast(`Successfully allocated ${formatINR(allocationData.payoutAmount)} to ${allocationData.memberName}!`, 'success');
      await loadProfitLoss(filters);
    } catch (err) {
      showToast(err.message || 'Failed to allocate investment', 'error');
      throw err;
    }
  };

  const handleRecordRecovery = async (recoveryData) => {
    try {
      await api.recordInvestmentRecovery(recoveryData);
      showToast(`Recovery of ${formatINR(recoveryData.recoveredAmount)} recorded successfully!`, 'success');
      await loadProfitLoss(filters);
    } catch (err) {
      showToast(err.message || 'Failed to record recovery', 'error');
      throw err;
    }
  };

  const handleDeleteInvestment = async (investmentId) => {
    const inv = extraInvestments.find(i => String(i.investmentId) === String(investmentId));
    const alloc = Number(inv?.allocatedAmount !== undefined ? inv?.allocatedAmount : inv?.usedAmount) || 0;
    const rec = Number(inv?.returnedAmount !== undefined ? inv?.returnedAmount : inv?.recoveredAmount) || 0;
    if (alloc > 0 || rec > 0) {
      alert(`Cannot delete investment ${investmentId} because it has ₹${alloc.toLocaleString('en-IN')} allocated or ₹${rec.toLocaleString('en-IN')} recovery recorded. Please update its status instead.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete investment ${investmentId}?`)) {
      try {
        await api.deleteExtraInvestment(investmentId);
        showToast('Investment record deleted successfully', 'success');
        await loadProfitLoss(filters);
      } catch (err) {
        showToast(err.message || 'Failed to delete record', 'error');
      }
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.chitId !== 'all') count++;
    if (filters.memberId !== 'all') count++;
    if (filters.month !== 'all') count++;
    if (filters.fundingSource !== 'all') count++;
    return count;
  }, [filters]);

  if (loading && !data) {
    return <LoadingState message="Loading Profit & Loss Analysis from Google Sheets..." />;
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-sm text-center max-w-xl mx-auto my-12 space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-900">Unable to load financial data</h3>
        <p className="text-xs text-[#5B7065]">{error}</p>
        <button
          type="button"
          onClick={() => loadProfitLoss(filters)}
          className="px-5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl"
        >
          Try Again
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const monthly = data?.monthlyBreakdown || [];
  const chitWise = data?.chitWise || [];
  const memberWise = data?.memberWise || [];
  const fundingSource = data?.fundingSource || [];

  return (
    <div className="space-y-6 print-container">
      {/* Print-only Letterhead */}
      <div className="hidden print-only mb-6 pb-4 border-b-2 border-black">
        <h1 className="text-2xl font-bold text-black">MSR CHITS — PROFIT & LOSS ANALYSIS</h1>
        <p className="text-xs text-gray-700">Official Financial Statement • Generated on {lastRefreshed.toLocaleString('en-IN')}</p>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
              Profit & Loss Analysis
            </h2>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Single Source of Truth
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1 flex items-center gap-2 flex-wrap">
            <span>Live Sheets-driven financial metrics & cash flow analytics</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
            <span>Last Updated: <strong className="text-[#003524]">{lastRefreshed.toLocaleTimeString('en-IN')}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Prominent + Add Extra Investment Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedInvestment(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-800 to-[#003524] hover:from-emerald-700 hover:to-[#174D38] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 border border-emerald-600/30 active:scale-95"
            title="Add new extra investment"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>+ Add Extra Investment</span>
          </button>

          <button
            type="button"
            onClick={() => loadProfitLoss(filters)}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#003524] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            title="Refresh latest data from Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 text-[#174D38] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#174D38]" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-[#C9A227]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <form onSubmit={handleApplyFilters} className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs no-print space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EAF2EC]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#174D38]" />
            <span className="text-xs font-extrabold text-[#003524] uppercase tracking-wider">
              Financial Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#003524] text-white">
                {activeFilterCount} Active
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-[#5B7065] hover:text-[#003524] flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-[#5B7065] mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-[#DCE8E0] rounded-lg text-[#131E19] focus:bg-white focus:ring-1 focus:ring-[#003524]"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold text-[#5B7065] mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-[#DCE8E0] rounded-lg text-[#131E19] focus:bg-white focus:ring-1 focus:ring-[#003524]"
            />
          </div>

          {/* Chit Group */}
          <div>
            <label className="block text-[11px] font-bold text-[#5B7065] mb-1">Chit Scheme</label>
            <select
              value={filters.chitId}
              onChange={(e) => handleFilterChange('chitId', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-[#DCE8E0] rounded-lg font-semibold text-[#131E19] focus:bg-white focus:ring-1 focus:ring-[#003524]"
            >
              <option value="all">All Chit Schemes</option>
              {chits.map(c => (
                <option key={c.chitId} value={c.chitId}>{c.chitName || c.chitId}</option>
              ))}
            </select>
          </div>

          {/* Member */}
          <div>
            <label className="block text-[11px] font-bold text-[#5B7065] mb-1">Member</label>
            <select
              value={filters.memberId}
              onChange={(e) => handleFilterChange('memberId', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-[#DCE8E0] rounded-lg font-semibold text-[#131E19] focus:bg-white focus:ring-1 focus:ring-[#003524]"
            >
              <option value="all">All Members</option>
              {members.map(m => (
                <option key={m.memberId} value={m.memberId}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-[11px] font-bold text-[#5B7065] mb-1">Month</label>
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-[#DCE8E0] rounded-lg font-semibold text-[#131E19] focus:bg-white focus:ring-1 focus:ring-[#003524]"
            >
              <option value="all">All 20 Months</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Month {m}</option>
              ))}
            </select>
          </div>

          {/* Funding Source */}
          <div>
            <label className="block text-[11px] font-bold text-[#5B7065] mb-1">Funding Source</label>
            <select
              value={filters.fundingSource}
              onChange={(e) => handleFilterChange('fundingSource', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-[#DCE8E0] rounded-lg font-semibold text-[#131E19] focus:bg-white focus:ring-1 focus:ring-[#003524]"
            >
              <option value="all">All Sources</option>
              <option value="CHIT_FUND">Chit Fund Collections</option>
              <option value="EXTRA_INVESTMENT">Extra Investment</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
          >
            <Filter className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Apply Filters</span>
          </button>
        </div>
      </form>

      {/* 11 TOP SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Collection"
          value={formatINR(summary.totalCollection)}
          subtitle={`${summary.numberPayments || 0} receipts processed`}
          icon={CreditCard}
          accentColor="emerald"
        />

        <StatCard
          title="Total Payout"
          value={formatINR(summary.totalPayout)}
          subtitle={`${summary.numberPayouts || 0} disbursements`}
          icon={Send}
          accentColor="primary"
        />

        <StatCard
          title="Total Commission"
          value={formatINR(summary.totalCommission)}
          subtitle="Plan schedule earnings"
          icon={Percent}
          accentColor="gold"
        />

        <StatCard
          title="Total Dividend"
          value={formatINR(summary.totalDividend)}
          subtitle="Member auction discounts"
          icon={Sparkles}
          accentColor="gold"
        />

        <StatCard
          title="Extra Investment"
          value={formatINR(summary.extraInvestment)}
          subtitle={`Allocated: ${formatINR(summary.extraAllocated || 0)}`}
          icon={Layers}
          accentColor="blue"
        />

        <StatCard
          title="Investment Profit"
          value={summary.extraInvestment > 0 && summary.recoveredAmount > 0 ? formatINR(summary.investmentProfit) : 'Data not available'}
          subtitle={summary.extraInvestment > 0 && summary.recoveredAmount > 0 ? `ROI: ${(summary.roiPercent || 0).toFixed(1)}%` : 'No recovery recorded'}
          icon={TrendingUp}
          accentColor="emerald"
        />

        <StatCard
          title="Net Profit"
          value={formatINR(summary.netProfit || summary.operationalProfit)}
          subtitle="Commission + Inv. Profit"
          icon={TrendingUp}
          accentColor="emerald"
        />

        <StatCard
          title="Net Cash Flow"
          value={formatINR(summary.netCashFlow)}
          subtitle="Total Inflows - Outflows"
          icon={DollarSign}
          accentColor={summary.netCashFlow >= 0 ? "emerald" : "gold"}
        />

        <StatCard
          title="Extra Inv. Recovered"
          value={formatINR(summary.recoveredAmount)}
          subtitle={`Remaining: ${formatINR(summary.extraRemaining || 0)}`}
          icon={ArrowUpRight}
          accentColor="blue"
        />

        <StatCard
          title="Number of Payments"
          value={summary.numberPayments || 0}
          subtitle="Verified payment rows"
          icon={CheckCircle2}
          accentColor="primary"
        />

        <StatCard
          title="Number of Payouts"
          value={summary.numberPayouts || 0}
          subtitle={`Completed: ${summary.completedPayouts || 0}`}
          icon={Send}
          accentColor="primary"
        />

        <StatCard
          title="Collection Rate"
          value={`${(summary.collectionRate || 100).toFixed(1)}%`}
          subtitle={`Pending: ${formatINR(summary.totalPending || 0)}`}
          icon={PieChart}
          accentColor="emerald"
        />
      </div>

      {/* COLLECTION & PAYOUT COMPREHENSIVE PROGRESS BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Collection Analysis Box */}
        <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAF2EC]">
            <h4 className="text-sm font-bold text-[#003524] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#174D38]" />
              Collection Performance Analysis
            </h4>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Rate: {(summary.collectionRate || 100).toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-[#DCE8E0]">
              <span className="text-[10px] text-[#5B7065] block">Total Expected Due</span>
              <span className="font-extrabold text-[#003524]">{formatINR(summary.totalDue || summary.totalCollection)}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-900 block">Total Paid Receipts</span>
              <span className="font-extrabold text-emerald-900">{formatINR(summary.totalCollection)}</span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] text-amber-900 block">Total Pending Dues</span>
              <span className="font-extrabold text-amber-900">{formatINR(summary.totalPending || 0)}</span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-[#131E19]">
              <span>Collection Realization</span>
              <span>{(summary.collectionRate || 100).toFixed(1)}% Realized</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-[#DCE8E0]">
              <div
                className="h-full bg-gradient-to-r from-[#003524] to-[#174D38] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, summary.collectionRate || 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Payout & Funding Source Analysis Box */}
        <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAF2EC]">
            <h4 className="text-sm font-bold text-[#003524] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#174D38]" />
              Payout & Funding Distribution
            </h4>
            <span className="text-xs font-extrabold text-[#003524] bg-[#F0FCF4] px-2 py-0.5 rounded border border-[#DCE8E0]">
              {summary.numberPayouts || 0} Disbursements
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {fundingSource.map((fs, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border ${
                  fs.source === 'EXTRA_INVESTMENT'
                    ? 'bg-purple-50/60 border-purple-200'
                    : 'bg-emerald-50/60 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-extrabold uppercase ${
                    fs.source === 'EXTRA_INVESTMENT' ? 'text-purple-800' : 'text-emerald-800'
                  }`}>
                    {fs.label}
                  </span>
                  <span className="text-[10px] font-bold text-[#5B7065]">
                    {fs.count} Payouts
                  </span>
                </div>
                <span className="font-extrabold text-sm text-[#003524] block">
                  {formatINR(fs.totalAmount)}
                </span>
              </div>
            ))}
          </div>

          {/* Formula Transparency Notice */}
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-1.5 text-[11px] text-[#5B7065]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#174D38] shrink-0 mt-0.5" />
            <p>
              <strong>Net Cash Flow</strong> = Inflows ({formatINR(summary.totalCollection + summary.recoveredAmount)}) - Outflows ({formatINR(summary.totalPayout + summary.extraInvestment)}) = <strong>{formatINR(summary.netCashFlow)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 6 VISUAL FINANCIAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Monthly Collection vs Payout Dual Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524] flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#174D38]" />
              Collection vs Payout
            </h4>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-800 font-bold">
                <span className="w-2 h-2 rounded bg-emerald-600" /> Collection
              </span>
              <span className="flex items-center gap-1 text-amber-900 font-bold">
                <span className="w-2 h-2 rounded bg-amber-600" /> Payout
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end gap-1 pt-4 border-b border-[#EAF2EC]">
            {monthly.slice(0, 10).map((m) => {
              const maxVal = Math.max(...monthly.map(x => Math.max(x.collection, x.payout))) || 100000;
              const colHeight = Math.max(6, Math.min(100, (m.collection / maxVal) * 100));
              const payHeight = Math.max(6, Math.min(100, (m.payout / maxVal) * 100));

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    <div
                      className="w-1/2 bg-emerald-600 rounded-t transition-all group-hover:bg-emerald-700"
                      style={{ height: `${colHeight}%` }}
                      title={`Month ${m.month} Collection: ${formatINR(m.collection)}`}
                    />
                    <div
                      className="w-1/2 bg-amber-600 rounded-t transition-all group-hover:bg-amber-700"
                      style={{ height: `${payHeight}%` }}
                      title={`Month ${m.month} Payout: ${formatINR(m.payout)}`}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-[#5B7065]">M{m.month}</span>
                </div>
              );
            })}
          </div>
          <span className="text-[10px] text-[#5B7065] block text-center">Months 1 to 10 Cash Flow Trajectory</span>
        </div>

        {/* Chart 2: Net Cash Flow Trend Line */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#174D38]" />
              Net Cash Flow Trend
            </h4>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${summary.netCashFlow >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              Net: {formatINR(summary.netCashFlow)}
            </span>
          </div>

          <div className="h-44 flex items-center justify-between gap-1 pt-4 border-b border-[#EAF2EC]">
            {monthly.slice(0, 10).map((m) => {
              const isPositive = m.cashFlow >= 0;
              const absVal = Math.abs(m.cashFlow);
              const maxAbs = Math.max(...monthly.map(x => Math.abs(x.cashFlow))) || 100000;
              const barHeight = Math.max(8, Math.min(80, (absVal / maxAbs) * 80));

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-center h-full group relative">
                  <div
                    className={`w-3.5 rounded transition-all ${
                      isPositive ? 'bg-emerald-600 group-hover:bg-emerald-700' : 'bg-rose-500 group-hover:bg-rose-600'
                    }`}
                    style={{ height: `${barHeight}%` }}
                    title={`Month ${m.month} Cash Flow: ${formatINR(m.cashFlow)}`}
                  />
                  <span className="text-[9px] font-bold text-[#5B7065] mt-1">M{m.month}</span>
                </div>
              );
            })}
          </div>
          <span className="text-[10px] text-[#5B7065] block text-center">Green: Inflow Surplus • Red: Disbursement Deficit</span>
        </div>

        {/* Chart 3: Commission & Extra Profit Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
              Earnings Composition
            </h4>
            <span className="text-[10px] font-extrabold text-[#003524] bg-gold-50 px-2 py-0.5 rounded border border-[#C9A227]/30">
              Total: {formatINR(summary.netProfit || summary.operationalProfit)}
            </span>
          </div>

          <div className="h-44 flex flex-col justify-center space-y-4 px-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#003524]">Chit Commission Earnings</span>
                <span>{formatINR(summary.totalCommission)}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#003524] rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-emerald-900">Extra Investment Realized Profit</span>
                <span>{formatINR(summary.investmentProfit)}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, Math.max(10, (summary.investmentProfit / (summary.totalCommission || 1)) * 100))}%` }} />
              </div>
            </div>
          </div>
          <span className="text-[10px] text-[#5B7065] block text-center">Organized Enterprise Margin Breakdown</span>
        </div>
      </div>

      {/* 4 INTERACTIVE FINANCIAL TABLES (Sections 13, 14, 15 & 10) */}
      <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-xs overflow-hidden">
        {/* TAB SWITCHER */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-[#DCE8E0] overflow-x-auto no-print">
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'bg-[#003524] text-white shadow-xs'
                : 'text-[#4B6358] hover:bg-white hover:text-[#003524]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly P&L Ledger</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              20M
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chitWise')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'chitWise'
                ? 'bg-[#003524] text-white shadow-xs'
                : 'text-[#4B6358] hover:bg-white hover:text-[#003524]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Chit-Wise Analysis</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {chitWise.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('memberWise')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'memberWise'
                ? 'bg-[#003524] text-white shadow-xs'
                : 'text-[#4B6358] hover:bg-white hover:text-[#003524]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member-Wise Statement</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {memberWise.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fundingSource')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fundingSource'
                ? 'bg-[#003524] text-white shadow-xs'
                : 'text-[#4B6358] hover:bg-white hover:text-[#003524]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Funding & Extra Investments</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {extraInvestments.length}
            </span>
          </button>
        </div>

        {/* TAB 1: MONTHLY P&L LEDGER TABLE */}
        {activeTab === 'monthly' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#003524] text-white text-[11px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Payout</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Dividend</th>
                  <th className="py-3 px-4">Extra Inv</th>
                  <th className="py-3 px-4">Recovery</th>
                  <th className="py-3 px-4">Profit</th>
                  <th className="py-3 px-4 text-right">Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2EC] bg-white">
                {monthly.map((row) => (
                  <tr key={row.month} className="hover:bg-[#F0FCF4]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#003524]">
                      Month {row.month}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-800">
                      {formatINR(row.collection)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#003524]">
                      {formatINR(row.payout)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#5B7065]">
                      {formatINR(row.commission)}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-800">
                      {formatINR(row.dividend)}
                    </td>
                    <td className="py-3 px-4 text-purple-900 font-semibold">
                      {formatINR(row.extraInvestment)}
                    </td>
                    <td className="py-3 px-4 text-indigo-900 font-semibold">
                      {formatINR(row.recovery)}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-800">
                      {formatINR(row.profit)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-extrabold ${row.cashFlow >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                        {row.cashFlow >= 0 ? '+' : ''}{formatINR(row.cashFlow)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: CHIT-WISE P&L ANALYSIS TABLE */}
        {activeTab === 'chitWise' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#003524] text-white text-[11px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Chit Scheme</th>
                  <th className="py-3 px-4">Chit ID</th>
                  <th className="py-3 px-4">Chit Value</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Members</th>
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Payout</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Profit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2EC] bg-white">
                {chitWise.map((c) => (
                  <tr key={c.chitId} className="hover:bg-[#F0FCF4]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#003524]">
                      {c.chitName}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#5B7065]">
                      {c.chitId}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[#003524]">
                      {formatINR(c.chitValue)}
                    </td>
                    <td className="py-3 px-4 text-[#5B7065]">
                      {c.duration} Months
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#003524]">
                      {c.members} Members
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-800">
                      {formatINR(c.totalCollection)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#003524]">
                      {formatINR(c.totalPayout)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#5B7065]">
                      {formatINR(c.commission)}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-800">
                      {formatINR(c.profit)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/chits/${c.chitId}`)}
                        className="p-1.5 text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <span>View Chit</span>
                        <ExternalLink className="w-3 h-3 text-[#174D38]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: MEMBER-WISE FINANCIAL STATEMENT */}
        {activeTab === 'memberWise' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#003524] text-white text-[11px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Total Payments</th>
                  <th className="py-3 px-4">Payouts Received</th>
                  <th className="py-3 px-4">Pending Dues</th>
                  <th className="py-3 px-4">Chits Enrolled</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2EC] bg-white">
                {memberWise.map((m) => (
                  <tr key={m.memberId} className="hover:bg-[#F0FCF4]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#003524]">
                      {m.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#5B7065]">
                      {m.memberId}
                    </td>
                    <td className="py-3 px-4 text-[#5B7065]">
                      {m.phone || '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-800">
                      {formatINR(m.totalPayments)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#003524]">
                      {formatINR(m.totalPayoutsReceived)}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-900">
                      {formatINR(m.pendingAmount)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#003524]">
                      {m.chitCount}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/members/${m.memberId}`)}
                        className="p-1.5 text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3 h-3 text-[#174D38]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: FUNDING SOURCE & COMPLETE EXTRA INVESTMENT TABLE */}
        {activeTab === 'fundingSource' && (
          <div className="p-5 space-y-6">
            {/* Top Cards: Funding Distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-emerald-900">
                    Chit Fund Collections
                  </span>
                  <span className="text-xs font-bold text-emerald-800">
                    {fundingSource.find(f => f.source === 'CHIT_FUND')?.count || 0} Payouts
                  </span>
                </div>
                <span className="text-2xl font-extrabold text-[#003524] block">
                  {formatINR(fundingSource.find(f => f.source === 'CHIT_FUND')?.totalAmount || 0)}
                </span>
                <p className="text-[11px] text-[#2D5A43]">
                  Disbursements funded through normal monthly member chit collection installments.
                </p>
              </div>

              <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-purple-900">
                    Extra Investment Capital
                  </span>
                  <span className="text-xs font-bold text-purple-800">
                    {fundingSource.find(f => f.source === 'EXTRA_INVESTMENT')?.count || 0} Payouts
                  </span>
                </div>
                <span className="text-2xl font-extrabold text-purple-950 block">
                  {formatINR(fundingSource.find(f => f.source === 'EXTRA_INVESTMENT')?.totalAmount || 0)}
                </span>
                <p className="text-[11px] text-purple-900">
                  Disbursements funded through external/extra capital investments with isolated profit tracking.
                </p>
              </div>
            </div>

            {/* Extra Investment Performance KPI Summary */}
            <div className="bg-white rounded-xl border border-[#DCE8E0] p-4 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAF2EC]">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#003524] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#174D38]" />
                  Extra Investment Portfolio Metrics
                </h5>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Isolated Accounting
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-[#DCE8E0]">
                  <span className="text-[10px] text-[#5B7065] block">Invested Capital</span>
                  <span className="font-extrabold text-[#003524]">{formatINR(summary.extraInvestment)}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-[#DCE8E0]">
                  <span className="text-[10px] text-[#5B7065] block">Allocated Amount</span>
                  <span className="font-extrabold text-[#003524]">{formatINR(summary.extraAllocated || 0)}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-[#DCE8E0]">
                  <span className="text-[10px] text-[#5B7065] block">Remaining Capital</span>
                  <span className="font-extrabold text-amber-800">{formatINR(summary.extraRemaining || 0)}</span>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-200">
                  <span className="text-[10px] text-indigo-900 block">Recovered Amount</span>
                  <span className="font-extrabold text-indigo-950">{formatINR(summary.recoveredAmount)}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-900 block">Isolated Profit (ROI)</span>
                  <span className="font-extrabold text-emerald-950">
                    {summary.recoveredAmount > 0 ? `${formatINR(summary.investmentProfit)} (${(summary.roiPercent || 0).toFixed(1)}%)` : 'Data not available'}
                  </span>
                </div>
              </div>
            </div>

            {/* Extra Investment Ledger Table Header with Add Button */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[#003524] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#174D38]" />
                    Extra Investment Ledger Records
                  </h4>
                  <p className="text-[11px] text-[#5B7065]">
                    Manage external investments, allocate capital to member payouts, and record actual recoveries.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvestment(null);
                    setIsAddModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>+ Add Extra Investment</span>
                </button>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto rounded-xl border border-[#DCE8E0]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#003524] text-white text-[11px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Investment ID</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Investor / Source</th>
                      <th className="py-3 px-3">Purpose</th>
                      <th className="py-3 px-3 text-right">Invested</th>
                      <th className="py-3 px-3 text-right">Allocated</th>
                      <th className="py-3 px-3 text-right">Remaining</th>
                      <th className="py-3 px-3 text-right">Recovered</th>
                      <th className="py-3 px-3 text-right">Profit</th>
                      <th className="py-3 px-3 text-center">ROI %</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAF2EC] bg-white">
                    {extraInvestments.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-xs text-[#5B7065]">
                          No extra investments recorded yet. Click <strong className="text-[#003524]">+ Add Extra Investment</strong> to get started.
                        </td>
                      </tr>
                    ) : (
                      extraInvestments.map((inv) => {
                        const investAmt = Number(inv.investmentAmount) || 0;
                        const allocAmt = Number(inv.allocatedAmount !== undefined ? inv.allocatedAmount : inv.usedAmount) || 0;
                        const remaining = Math.max(0, investAmt - allocAmt);
                        const recAmt = Number(inv.returnedAmount !== undefined ? inv.returnedAmount : inv.recoveredAmount) || 0;
                        const hasRecovery = recAmt > 0;
                        const profit = hasRecovery ? (recAmt - investAmt) : null;
                        const roiPercent = (hasRecovery && investAmt > 0) ? ((profit / investAmt) * 100).toFixed(1) : null;

                        return (
                          <tr key={inv.investmentId} className="hover:bg-[#F0FCF4]/50 transition-colors">
                            <td className="py-3 px-3.5 font-mono font-bold text-[#003524]">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {inv.investmentId}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[#5B7065] whitespace-nowrap">
                              {formatDate(inv.investmentDate)}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#131E19]">
                              {inv.investor || inv.investorSource || inv.beneficiary || 'Director Capital'}
                            </td>
                            <td className="py-3 px-3 text-[#5B7065] max-w-xs truncate" title={inv.purpose}>
                              {inv.purpose || 'Capital Deployment'}
                            </td>
                            <td className="py-3 px-3 font-bold text-[#003524] text-right whitespace-nowrap">
                              {formatINR(investAmt)}
                            </td>
                            <td className="py-3 px-3 font-semibold text-blue-900 text-right whitespace-nowrap">
                              {formatINR(allocAmt)}
                            </td>
                            <td className="py-3 px-3 font-bold text-amber-800 text-right whitespace-nowrap">
                              {formatINR(remaining)}
                            </td>
                            <td className="py-3 px-3 font-bold text-indigo-950 text-right whitespace-nowrap">
                              {recAmt > 0 ? formatINR(recAmt) : <span className="text-slate-400 font-normal italic">Pending</span>}
                            </td>
                            <td className="py-3 px-3 font-extrabold text-right whitespace-nowrap">
                              {hasRecovery ? (
                                <span className={profit >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
                                  {profit >= 0 ? '+' : ''}{formatINR(profit)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal italic">Data not available</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {roiPercent !== null ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {roiPercent}%
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'Closed' || recAmt >= investAmt
                                  ? 'bg-slate-100 text-slate-700'
                                  : (allocAmt >= investAmt && investAmt > 0
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800')
                              }`}>
                                {inv.status || (recAmt >= investAmt ? 'Closed' : (allocAmt >= investAmt ? 'Fully Allocated' : 'Active'))}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {remaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInvestment(inv);
                                      setIsAllocateModalOpen(true);
                                    }}
                                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-[10px] font-bold transition-colors"
                                    title="Allocate to Member Payout"
                                  >
                                    Allocate
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvestment(inv);
                                    setIsRecoveryModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors"
                                  title="Record Recovery"
                                >
                                  Recovery
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvestment(inv);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="p-1 text-[#5B7065] hover:text-[#003524] hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit Investment"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvestment(inv.investmentId)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {isAddModalOpen && (
        <AddExtraInvestmentModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedInvestment(null);
          }}
          investmentToEdit={selectedInvestment}
          onSave={handleSaveInvestment}
        />
      )}

      {isAllocateModalOpen && (
        <AllocateInvestmentModal
          isOpen={isAllocateModalOpen}
          onClose={() => {
            setIsAllocateModalOpen(false);
            setSelectedInvestment(null);
          }}
          investment={selectedInvestment}
          chits={chits}
          members={members}
          schedule={schedule}
          onAllocate={handleAllocateInvestment}
        />
      )}

      {isRecoveryModalOpen && (
        <RecordRecoveryModal
          isOpen={isRecoveryModalOpen}
          onClose={() => {
            setIsRecoveryModalOpen(false);
            setSelectedInvestment(null);
          }}
          investment={selectedInvestment}
          onRecord={handleRecordRecovery}
        />
      )}
    </div>
  );
};

export default ProfitLossAnalysis;
