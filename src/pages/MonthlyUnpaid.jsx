import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Layers,
  Phone,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  PlusCircle,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { getCurrentChitMonth } from '../utils/chitCalculations';
import { generateWhatsAppUrl, normalizeIndianPhone } from '../utils/whatsapp';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import PaymentForm from '../components/payments/PaymentForm';
import WhatsAppComposerModal from '../components/whatsapp/WhatsAppComposerModal';
import { useChit } from '../context/ChitContext';

export const MonthlyUnpaid = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeChit, showToast } = useChit();

  // Data states
  const [loading, setLoading] = useState(true);
  const [unpaidSummary, setUnpaidSummary] = useState(null);
  const [chits, setChits] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [error, setError] = useState(null);

  // Filters
  const initialMonthParam = searchParams.get('month');
  const [selectedChitId, setSelectedChitId] = useState(searchParams.get('chitId') || 'all');
  const [selectedMonth, setSelectedMonth] = useState(initialMonthParam ? Number(initialMonthParam) : 2);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All'); // 'All' | 'Unpaid' | 'Partial' | 'Paid'
  const [chitNoFilter, setChitNoFilter] = useState('');
  const [viewMode, setViewMode] = useState('members'); // 'members' (Grouped) | 'chits' (Flat)
  const [expandedMembers, setExpandedMembers] = useState(new Set());

  // Modals
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentFormPreFill, setPaymentFormPreFill] = useState({ memberId: null, month: null, chitNo: null, amount: null });
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState({ member: null, unpaidData: null });

  // Load all chits & schedule on mount
  useEffect(() => {
    const loadChitList = async () => {
      try {
        const cList = await api.getChits();
        const chitArray = Array.isArray(cList) ? cList : (cList?.chits || []);
        setChits(chitArray);

        // Resolve current month from primary active chit if not in URL
        const primary = chitArray[0];
        if (primary && !initialMonthParam) {
          const curMonth = getCurrentChitMonth(primary);
          setSelectedMonth(curMonth || Number(primary.currentMonth) || 1);
        }

        const sch = await api.getMonthlySchedule(primary?.chitId || 'CHIT-100K-01');
        setSchedule(Array.isArray(sch) ? sch : []);
      } catch (err) {
        console.error('Failed to load initial chit data:', err);
      }
    };
    loadChitList();
  }, []);

  // Fetch / calculate Unpaid Summary whenever month or chit selection changes
  const loadUnpaidData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await api.getMonthlyUnpaidSummary({
        chitId: selectedChitId,
        month: selectedMonth
      });
      setUnpaidSummary(summary);
    } catch (err) {
      console.error('Failed to load monthly unpaid data:', err);
      setError(err.message || 'Unable to load unpaid amounts from Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnpaidData();
  }, [selectedChitId, selectedMonth]);

  // Keep URL search params in sync
  useEffect(() => {
    const nextParams = {};
    if (selectedMonth) nextParams.month = selectedMonth;
    if (selectedChitId !== 'all') nextParams.chitId = selectedChitId;
    if (statusFilter !== 'All') nextParams.status = statusFilter;
    setSearchParams(nextParams, { replace: true });
  }, [selectedMonth, selectedChitId, statusFilter]);

  // Available months list (e.g. Month 1 to Month 20 with due dates from schedule)
  const availableMonths = useMemo(() => {
    const duration = activeChit?.duration || activeChit?.durationMonths || 20;
    const months = [];
    for (let m = 1; m <= duration; m++) {
      const schItem = schedule.find(s => Number(s.month || s.monthNumber) === m);
      const installmentAmt = schItem ? Number(schItem.monthlyAmount || schItem.amount) : (m === 1 ? 5000 : 3750);
      months.push({
        monthNumber: m,
        label: `Month ${m} (${formatINR(installmentAmt)})`,
        installment: installmentAmt,
        dueDate: schItem?.dueDate || `2026-${String(m).padStart(2, '0')}-10`
      });
    }
    return months;
  }, [schedule, activeChit]);

  // Toggle member row expand/collapse
  const toggleMemberExpand = (memberId) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!unpaidSummary?.members) return;
    setExpandedMembers(new Set(unpaidSummary.members.map(m => m.memberId)));
  };

  const collapseAll = () => {
    setExpandedMembers(new Set());
  };

  // Open Record Payment Modal pre-filled
  const handleOpenRecordPayment = (memberId, chitNo = null, unpaidAmt = null) => {
    setPaymentFormPreFill({
      memberId,
      month: selectedMonth,
      chitNo,
      amount: unpaidAmt
    });
    setIsPaymentFormOpen(true);
  };

  // Open WhatsApp Reminder Modal
  const handleOpenWhatsAppReminder = (memberRecord, specificChit = null) => {
    const memberObj = {
      memberId: memberRecord.memberId,
      name: memberRecord.memberName,
      memberName: memberRecord.memberName,
      phone: memberRecord.phone,
      mobile: memberRecord.phone
    };

    const unpaidData = {
      month: `Month ${selectedMonth}`,
      monthNumber: selectedMonth,
      chitNumbers: specificChit ? specificChit.chitNo : memberRecord.chitNumbers,
      chitNo: specificChit ? specificChit.chitNo : undefined,
      unpaidAmount: specificChit ? specificChit.unpaidAmount : memberRecord.totalUnpaidAmount,
      totalUnpaidAmount: memberRecord.totalUnpaidAmount,
      unpaidChits: specificChit ? [specificChit] : (memberRecord.unpaidChits || memberRecord.chits || []),
      chits: specificChit ? [specificChit] : memberRecord.chits
    };

    setWhatsAppTarget({ member: memberObj, unpaidData });
    setIsWhatsAppModalOpen(true);
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!unpaidSummary?.members) return [];
    return unpaidSummary.members.filter(m => {
      // Search by member name or phone
      const matchesSearch =
        !searchTerm ||
        m.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.includes(searchTerm) ||
        m.chitNumbers?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'All' && m.paymentStatus !== statusFilter) {
        return false;
      }

      // Chit number filter
      if (chitNoFilter) {
        const hasChit = m.chits.some(c =>
          c.chitNo?.toLowerCase().includes(chitNoFilter.toLowerCase().trim())
        );
        if (!hasChit) return false;
      }

      return true;
    });
  }, [unpaidSummary, searchTerm, statusFilter, chitNoFilter]);

  // Filtered flat chit items list
  const filteredChitItems = useMemo(() => {
    if (!unpaidSummary?.chitItems) return [];
    return unpaidSummary.chitItems.filter(item => {
      const matchesSearch =
        !searchTerm ||
        item.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone?.includes(searchTerm) ||
        item.chitNo?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter !== 'All' && item.paymentStatus !== statusFilter) {
        return false;
      }

      if (chitNoFilter && !item.chitNo?.toLowerCase().includes(chitNoFilter.toLowerCase().trim())) {
        return false;
      }

      return true;
    });
  }, [unpaidSummary, searchTerm, statusFilter, chitNoFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!unpaidSummary) return;
    const filename = `MSR_Chits_Monthly_Unpaid_Month_${selectedMonth}.csv`;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Member Name,Phone,Chit No,Month,Monthly Due,Paid Amount,Unpaid Amount,Payment Status\n';

    (unpaidSummary.chitItems || []).forEach(item => {
      csvContent += `"${item.memberName}","${item.phone}","${item.chitNo}",${selectedMonth},${item.monthlyDue},${item.paidAmount},${item.unpaidAmount},"${item.paymentStatus}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Monthly Unpaid CSV exported', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#003524] text-[#FED255]">
              <CreditCard className="w-5 h-5 stroke-[2.5]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
              Monthly Unpaid Tracker
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Real-time collection & unpaid dues for <span className="font-bold text-[#003524]">Month {selectedMonth}</span> calculated from Google Sheets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={loadUnpaidData}
            title="Refresh latest data from Google Sheets"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4 text-[#174D38]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-[#174D38]" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenRecordPayment(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4 text-[#FED255]" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* FILTER & SELECTION BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Month & Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#003524] uppercase tracking-wider mb-1">
              Select Month
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B7065] pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:outline-none focus:ring-2 focus:ring-[#003524] min-h-[44px]"
              >
                {availableMonths.map((m) => (
                  <option key={m.monthNumber} value={m.monthNumber}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chit Scheme Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#003524] uppercase tracking-wider mb-1">
              Chit Scheme
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B7065] pointer-events-none" />
              <select
                value={selectedChitId}
                onChange={(e) => setSelectedChitId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#F0FCF4] border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:outline-none focus:ring-2 focus:ring-[#003524] min-h-[44px]"
              >
                <option value="all">All Chit Schemes</option>
                {chits.map((c) => (
                  <option key={c.chitId} value={c.chitId}>
                    {c.chitName} ({c.chitId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Member Name or Phone Search */}
          <div>
            <label className="block text-[11px] font-bold text-[#003524] uppercase tracking-wider mb-1">
              Search Member / Phone
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B7065] pointer-events-none" />
              <input
                type="text"
                placeholder="Name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-medium text-[#003524] placeholder-[#5B7065] focus:outline-none focus:ring-2 focus:ring-[#003524] min-h-[44px]"
              />
            </div>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#003524] uppercase tracking-wider mb-1">
              Payment Status
            </label>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B7065] pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-bold text-[#003524] focus:outline-none focus:ring-2 focus:ring-[#003524] min-h-[44px]"
              >
                <option value="All">All Statuses</option>
                <option value="Unpaid">Unpaid Only</option>
                <option value="Partial">Partially Paid</option>
                <option value="Paid">Fully Paid</option>
              </select>
            </div>
          </div>

          {/* Chit Number Search */}
          <div>
            <label className="block text-[11px] font-bold text-[#003524] uppercase tracking-wider mb-1">
              Chit Number
            </label>
            <input
              type="text"
              placeholder="e.g. MSR261L02"
              value={chitNoFilter}
              onChange={(e) => setChitNoFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-medium text-[#003524] placeholder-[#5B7065] focus:outline-none focus:ring-2 focus:ring-[#003524] min-h-[44px]"
            />
          </div>
        </div>

        {/* View mode toggle + Expand/Collapse helpers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EAF2EC]">
          <div className="flex items-center gap-1.5 bg-[#F0FCF4] p-1 rounded-xl border border-[#DCE8E0]">
            <button
              type="button"
              onClick={() => setViewMode('members')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                viewMode === 'members'
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#5B7065] hover:text-[#003524]'
              }`}
            >
              Grouped by Member ({filteredMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('chits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                viewMode === 'chits'
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#5B7065] hover:text-[#003524]'
              }`}
            >
              All Individual Chits ({filteredChitItems.length})
            </button>
          </div>

          {viewMode === 'members' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="text-xs font-bold text-[#003524] hover:underline px-2 py-1"
              >
                Expand All
              </button>
              <span className="text-[#DCE8E0]">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-xs font-bold text-[#5B7065] hover:underline px-2 py-1"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: 6 DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Monthly Due */}
        <StatCard
          title="Total Monthly Due"
          value={formatINR(unpaidSummary?.totalMonthlyDue || 0)}
          subtitle={`Month ${selectedMonth} Scheduled Dues`}
          icon={Calendar}
          accentColor="primary"
        />

        {/* 2. Total Collected */}
        <StatCard
          title="Total Collected"
          value={formatINR(unpaidSummary?.totalCollected || 0)}
          subtitle={`${
            unpaidSummary?.totalMonthlyDue > 0
              ? Math.round(((unpaidSummary?.totalCollected || 0) / unpaidSummary.totalMonthlyDue) * 100)
              : 0
          }% Collected`}
          icon={CreditCard}
          accentColor="emerald"
        />

        {/* 3. Total Unpaid */}
        <StatCard
          title="Total Unpaid"
          value={formatINR(unpaidSummary?.totalUnpaid || 0)}
          subtitle="Remaining Outstanding"
          icon={AlertCircle}
          accentColor="blue"
        />

        {/* 4. Fully Paid Members */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B7065]">
                Fully Paid
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">
              {unpaidSummary?.fullyPaidCount ?? 0}
            </div>
          </div>
          <p className="text-[11px] font-medium text-[#5B7065] mt-2">
            Cleared all monthly dues
          </p>
        </div>

        {/* 5. Partially Paid Members */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B7065]">
                Partially Paid
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            </div>
            <div className="text-2xl font-black text-amber-700 mt-2">
              {unpaidSummary?.partiallyPaidCount ?? 0}
            </div>
          </div>
          <p className="text-[11px] font-medium text-[#5B7065] mt-2">
            Paid partial amount
          </p>
        </div>

        {/* 6. Unpaid Members */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B7065]">
                Unpaid Members
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            </div>
            <div className="text-2xl font-black text-red-700 mt-2">
              {unpaidSummary?.unpaidCount ?? 0}
            </div>
          </div>
          <p className="text-[11px] font-medium text-[#5B7065] mt-2">
            Zero payments recorded
          </p>
        </div>
      </div>

      {/* Excess Payment Notice if any member overpaid */}
      {(unpaidSummary?.totalExcess || 0) > 0 && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Excess Collections Recorded:</strong> Members have paid an aggregate excess of{' '}
              <strong className="text-emerald-800">{formatINR(unpaidSummary.totalExcess)}</strong> above their scheduled installment.
              Per MSR rules, excess payments are tracked separately and never result in negative unpaid balances.
            </span>
          </div>
        </div>
      )}

      {/* Allocation Warnings Banner if ambiguous payments exist */}
      {unpaidSummary?.allocationWarnings && unpaidSummary.allocationWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Payment Allocation Notices ({unpaidSummary.allocationWarnings.length})</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {unpaidSummary.allocationWarnings.map((w, idx) => (
              <li key={idx}>{typeof w === 'string' ? w : w.warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* MAIN DATA TABLE / LIST */}
      {loading ? (
        <LoadingState message={`Calculating unpaid amounts for Month ${selectedMonth}...`} />
      ) : error ? (
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-base font-bold text-[#003524]">Unable to Load Unpaid Dues</h3>
          <p className="text-xs text-[#5B7065]">{error}</p>
          <button
            type="button"
            onClick={loadUnpaidData}
            className="px-4 py-2 bg-[#003524] text-white text-xs font-bold rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : viewMode === 'members' ? (
        /* ========================================================================= */
        /* VIEW 1: GROUPED BY MEMBER WITH MULTI-CHIT ACCORDION */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#EAF2EC] flex items-center justify-between bg-[#F0FCF4]/40">
            <div>
              <h3 className="text-base font-extrabold text-[#003524]">
                Member Dues Breakdown (Month {selectedMonth})
              </h3>
              <p className="text-xs text-[#5B7065]">
                Showing {filteredMembers.length} active members holding {unpaidSummary?.totalMemberships || 0} total active chits.
              </p>
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-[#5B7065] text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-[#003524]">No members matching the selected filters.</p>
              <p>Try adjusting your search criteria or month selection.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EAF2EC]">
              {filteredMembers.map((member) => {
                const isExpanded = expandedMembers.has(member.memberId);
                const hasMultipleChits = member.chits.length > 1;

                return (
                  <div key={member.memberId} className="transition-colors hover:bg-slate-50/50">
                    {/* Member Summary Row */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Member Identity & Chit Tags */}
                      <div className="flex items-start gap-3 min-w-[240px]">
                        <div className="w-10 h-10 rounded-xl bg-[#003524] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {member.memberName?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-[#003524] text-sm sm:text-base">
                              {member.memberName}
                            </span>
                            <span className="text-[10px] font-mono bg-[#F0FCF4] px-2 py-0.5 rounded border border-[#DCE8E0] text-[#174D38]">
                              {member.memberId}
                            </span>
                            {hasMultipleChits && (
                              <span className="text-[10px] font-bold bg-[#FED255]/20 text-[#8C6D00] px-2 py-0.5 rounded-full border border-[#FED255]/40">
                                {member.chits.length} Chits
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#5B7065] mt-1">
                            <Phone className="w-3.5 h-3.5 text-[#5B7065]" />
                            <span>{member.phone || 'No phone'}</span>
                            <span className="text-[#DCE8E0]">•</span>
                            <span className="font-mono text-[11px] font-bold text-[#174D38]">
                              {member.chitNumbers}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Financial Metrics (Monthly Due, Paid, Unpaid) */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-center sm:text-left">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B7065] block">
                            Monthly Due
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold text-[#003524]">
                            {formatINR(member.totalMonthlyDue)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B7065] block">
                            Paid Amount
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold text-emerald-700">
                            {formatINR(member.totalPaidAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B7065] block">
                            Unpaid Amount
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-black ${
                              member.totalUnpaidAmount > 0 ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {formatINR(member.totalUnpaidAmount)}
                          </span>
                        </div>
                        <div className="col-span-3 sm:col-span-1 flex items-center sm:justify-start">
                          <StatusBadge status={member.paymentStatus} />
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                        {/* WhatsApp Reminder Button */}
                        {member.totalUnpaidAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppReminder(member)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
                            title="Send WhatsApp payment reminder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        )}

                        {/* Record Payment Button */}
                        {member.totalUnpaidAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenRecordPayment(member.memberId, member.chits[0]?.chitNo, member.totalUnpaidAmount)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
                            title="Record member payment"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-[#FED255]" />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* View Member Details */}
                        <button
                          type="button"
                          onClick={() => navigate(`/members/${member.memberId}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl transition-colors min-h-[44px]"
                          title="View member profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Profile</span>
                        </button>

                        {/* Multi-chit toggle expander */}
                        {hasMultipleChits && (
                          <button
                            type="button"
                            onClick={() => toggleMemberExpand(member.memberId)}
                            className="inline-flex items-center gap-1 px-2.5 py-2 bg-[#F0FCF4] hover:bg-[#e2f7eb] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-xl transition-colors min-h-[44px]"
                          >
                            <span>{isExpanded ? 'Hide Chits' : 'View Chits'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Chit-level Breakdown for members with multiple chits */}
                    {hasMultipleChits && isExpanded && (
                      <div className="bg-[#F0FCF4]/40 px-4 sm:px-8 py-3.5 border-t border-dashed border-[#DCE8E0]">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#174D38] mb-2">
                          Individual Chit Balances ({member.chits.length} chits)
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="border-b border-[#DCE8E0] text-[10px] font-bold uppercase tracking-wider text-[#5B7065]">
                                <th className="py-2 pr-3">Chit No</th>
                                <th className="py-2 px-3">Scheme</th>
                                <th className="py-2 px-3">Monthly Due</th>
                                <th className="py-2 px-3">Paid Amount</th>
                                <th className="py-2 px-3">Unpaid Amount</th>
                                <th className="py-2 px-3">Status</th>
                                <th className="py-2 pl-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EAF2EC]">
                              {member.chits.map((c) => (
                                <tr key={c.membershipId || c.chitNo} className="hover:bg-white/60">
                                  <td className="py-2.5 pr-3 font-mono font-bold text-[#003524]">
                                    {c.chitNo}
                                  </td>
                                  <td className="py-2.5 px-3 text-[#5B7065]">{c.chitName}</td>
                                  <td className="py-2.5 px-3 font-bold text-[#003524]">
                                    {formatINR(c.monthlyDue)}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                                    {formatINR(c.paidAmount)}
                                  </td>
                                  <td
                                    className={`py-2.5 px-3 font-bold ${
                                      c.unpaidAmount > 0 ? 'text-red-700' : 'text-emerald-700'
                                    }`}
                                  >
                                    {formatINR(c.unpaidAmount)}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <StatusBadge status={c.paymentStatus} />
                                  </td>
                                  <td className="py-2.5 pl-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {c.unpaidAmount > 0 && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenWhatsAppReminder(member, c)}
                                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg"
                                            title="Send WhatsApp for this specific chit"
                                          >
                                            WA
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenRecordPayment(member.memberId, c.chitNo, c.unpaidAmount)}
                                            className="px-2 py-1 bg-[#003524] hover:bg-[#174D38] text-white text-[11px] font-bold rounded-lg"
                                          >
                                            Pay
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: ALL INDIVIDUAL CHIT MEMBERSHIPS TABLE */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#EAF2EC] flex items-center justify-between bg-[#F0FCF4]/40">
            <div>
              <h3 className="text-base font-extrabold text-[#003524]">
                All Chit Memberships (Month {selectedMonth})
              </h3>
              <p className="text-xs text-[#5B7065]">
                Showing {filteredChitItems.length} active chit memberships.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead>
                <tr className="bg-[#F0FCF4] border-b border-[#DCE8E0] text-[11px] font-bold uppercase tracking-wider text-[#5B7065]">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Chit No</th>
                  <th className="py-3 px-4">Monthly Due</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Unpaid Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2EC]">
                {filteredChitItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#5B7065] text-xs">
                      No chits matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredChitItems.map((item) => (
                    <tr key={item.membershipId || item.chitNo} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#003524]">
                        {item.memberName}
                      </td>
                      <td className="py-3.5 px-4 text-[#5B7065]">{item.phone || '—'}</td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-[#174D38]">
                        {item.chitNo}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#003524]">
                        {formatINR(item.monthlyDue)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatINR(item.paidAmount)}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-black ${
                          item.unpaidAmount > 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatINR(item.unpaidAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.paymentStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.unpaidAmount > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenWhatsAppReminder(
                                    {
                                      memberId: item.memberId,
                                      memberName: item.memberName,
                                      phone: item.phone,
                                      totalUnpaidAmount: item.unpaidAmount,
                                      chits: [item]
                                    },
                                    item
                                  )
                                }
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs min-h-[36px]"
                                title="WhatsApp Reminder"
                              >
                                WA
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRecordPayment(item.memberId, item.chitNo, item.unpaidAmount)}
                                className="px-2.5 py-1.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-lg shadow-2xs min-h-[36px]"
                                title="Record Payment"
                              >
                                Pay
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(`/members/${item.memberId}`)}
                            className="px-2 py-1.5 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs font-bold rounded-lg min-h-[36px]"
                            title="View Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentFormOpen && (
        <PaymentForm
          isOpen={isPaymentFormOpen}
          onClose={() => setIsPaymentFormOpen(false)}
          prefilledMemberId={paymentFormPreFill.memberId}
          prefilledMonth={paymentFormPreFill.month}
          prefilledChitNo={paymentFormPreFill.chitNo}
          prefilledAmount={paymentFormPreFill.amount}
          onSuccess={() => {
            setIsPaymentFormOpen(false);
            loadUnpaidData();
            showToast('Payment recorded successfully', 'success');
          }}
        />
      )}

      {/* WhatsApp Unpaid Reminder Composer Modal */}
      {isWhatsAppModalOpen && whatsAppTarget.member && (
        <WhatsAppComposerModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          member={whatsAppTarget.member}
          initialMessageType="unpaid_reminder"
          unpaidData={whatsAppTarget.unpaidData}
          onSuccess={() => {
            showToast('WhatsApp Click-to-Chat launched', 'success');
          }}
        />
      )}
    </div>
  );
};

export default MonthlyUnpaid;
