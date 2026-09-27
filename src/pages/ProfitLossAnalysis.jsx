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
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import StatCard from '../components/common/StatCard';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';

export const ProfitLossAnalysis = () => {
  const navigate = useNavigate();
  const { showToast } = useChit();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [chits, setChits] = useState([]);
  const [members, setMembers] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

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
      const [plRes, chitsRes, memsRes] = await Promise.all([
        api.getProfitLoss(customFilters),
        api.getChits(),
        api.getMembers()
      ]);

      setData(plRes);
      setChits(Array.isArray(chitsRes) ? chitsRes : (chitsRes?.chits || []));
      setMembers(Array.isArray(memsRes) ? memsRes : (memsRes?.members || []));
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
      csv += 'Funding Source,Total Payout Amount,Disbursements Count\n';
      (data.fundingSource || []).forEach(fs => {
        csv += `"${fs.label}",${fs.totalAmount},${fs.count}\n`;
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

      {/* 11 TOP SUMMARY STAT CARDS (Section 4) */}
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
          subtitle={summary.extraInvestment > 0 ? `ROI: ${(summary.roiPercent || 0).toFixed(1)}%` : 'No recovery recorded'}
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

      {/* 6 VISUAL FINANCIAL CHARTS (Section 16) */}
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
                <span className="w-2 h-2 rounded bg-[#003524]" /> Payout
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 max-h-56 overflow-y-auto pr-1">
            {monthly.slice(0, 10).map((m) => {
              const maxVal = Math.max(100000, ...monthly.map(x => Math.max(x.collection, x.payout)));
              const colPct = (m.collection / maxVal) * 100;
              const payPct = (m.payout / maxVal) * 100;

              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#003524]">Month {m.month}</span>
                    <span className="text-[#5B7065] text-[10px]">
                      In: {formatINR(m.collection)} | Out: {formatINR(m.payout)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, colPct)}%` }} />
                    <div className="bg-[#003524] rounded-full" style={{ width: `${Math.min(100, payPct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Net Cash Flow & Operational Profit Trend */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#174D38]" />
              Profit & Cash Flow Trend
            </h4>
            <span className="text-[10px] font-bold text-[#003524] bg-[#F0FCF4] px-2 py-0.5 rounded border border-[#DCE8E0]">
              Monthly Cash Health
            </span>
          </div>

          <div className="space-y-2 pt-2 max-h-56 overflow-y-auto pr-1">
            {monthly.slice(0, 10).map((m) => (
              <div key={m.month} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-[#DCE8E0] text-xs">
                <div>
                  <span className="font-bold text-[#003524] block">Month {m.month}</span>
                  <span className="text-[10px] text-[#5B7065]">Commission: {formatINR(m.commission)}</span>
                </div>
                <div className="text-right">
                  <span className={`font-extrabold text-xs block ${m.cashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {m.cashFlow >= 0 ? '+' : ''}{formatINR(m.cashFlow)}
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">Profit: {formatINR(m.profit)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Commission & Dividend Distribution */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#174D38]" />
              Commission vs Dividend
            </h4>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Total Comm: {formatINR(summary.totalCommission)}
            </span>
          </div>

          <div className="space-y-2 pt-2 max-h-56 overflow-y-auto pr-1">
            {monthly.slice(0, 10).map((m) => (
              <div key={m.month} className="p-2 rounded-xl bg-[#F0FCF4]/40 border border-[#DCE8E0] flex items-center justify-between text-xs">
                <span className="font-bold text-[#003524]">Month {m.month}</span>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-[#5B7065] block">Commission:</span>
                    <span className="font-bold text-[#003524]">{formatINR(m.commission)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-amber-900 block">Dividend:</span>
                    <span className="font-extrabold text-amber-900">{formatINR(m.dividend)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETAILED ANALYSIS TABS & TABLES (Sections 13, 14, 15) */}
      <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-xs overflow-hidden">
        {/* Tab Selector Header */}
        <div className="p-3 bg-[#F0FCF4]/60 border-b border-[#DCE8E0] flex items-center gap-2 overflow-x-auto no-print">
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
              {monthly.length}
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
          </button>
        </div>

        {/* TAB 1: MONTHLY P&L LEDGER TABLE (Section 13) */}
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
                    <td className="py-3 px-4 text-purple-800 font-semibold">
                      {row.extraInvestment > 0 ? formatINR(row.extraInvestment) : '—'}
                    </td>
                    <td className="py-3 px-4 text-indigo-800 font-semibold">
                      {row.recovery > 0 ? formatINR(row.recovery) : '—'}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-800">
                      {formatINR(row.profit)}
                    </td>
                    <td className={`py-3 px-4 text-right font-extrabold ${row.cashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {row.cashFlow >= 0 ? '+' : ''}{formatINR(row.cashFlow)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F0FCF4] border-t-2 border-[#DCE8E0] text-xs font-extrabold text-[#003524]">
                  <td className="py-3 px-4 uppercase">Total</td>
                  <td className="py-3 px-4 text-emerald-800">{formatINR(summary.totalCollection)}</td>
                  <td className="py-3 px-4 text-[#003524]">{formatINR(summary.totalPayout)}</td>
                  <td className="py-3 px-4 text-[#5B7065]">{formatINR(summary.totalCommission)}</td>
                  <td className="py-3 px-4 text-amber-800">{formatINR(summary.totalDividend)}</td>
                  <td className="py-3 px-4 text-purple-800">{formatINR(summary.extraInvestment)}</td>
                  <td className="py-3 px-4 text-indigo-800">{formatINR(summary.recoveredAmount)}</td>
                  <td className="py-3 px-4 text-emerald-800">{formatINR(summary.netProfit)}</td>
                  <td className={`py-3 px-4 text-right ${summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {summary.netCashFlow >= 0 ? '+' : ''}{formatINR(summary.netCashFlow)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TAB 2: CHIT-WISE PERFORMANCE TABLE (Section 14) */}
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

        {/* TAB 3: MEMBER-WISE FINANCIAL STATEMENT (Section 15) */}
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

        {/* TAB 4: FUNDING SOURCE & EXTRA INVESTMENT (Section 10 & 9) */}
        {activeTab === 'fundingSource' && (
          <div className="p-5 space-y-4">
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

            {/* Extra Investment Ledger */}
            <div className="bg-white rounded-xl border border-[#DCE8E0] p-4 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#003524]">
                Extra Investment Isolated Performance
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
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
                  <span className="font-extrabold text-emerald-950">{formatINR(summary.investmentProfit)} ({(summary.roiPercent || 0).toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitLossAnalysis;
