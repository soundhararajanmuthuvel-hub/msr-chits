import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  Send,
  PlusCircle,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Edit3,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LayoutGrid,
  List,
  Users,
  Check,
  Clock,
  Phone,
  MessageCircle,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useChit } from '../context/ChitContext';
import { formatINR } from '../utils/currency';
import { formatDate, getTodayDateInput } from '../utils/date';
import { generateChitNumber } from '../utils/chitNumber';
import { calculateMonthlyUnpaidSummary } from '../utils/unpaidCalculations';
import { generateWhatsAppUrl, buildMonthlyUnpaidReminderMessage } from '../utils/whatsapp';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import Modal from '../components/common/Modal';

export const CollectionPayoutSummary = () => {
  const { activeChit, showToast, setIsRecordPaymentOpen } = useChit();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ months: [], summary: {} });
  const [chits, setChits] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [payments, setPayments] = useState([]);
  const [monthlySchedule, setMonthlySchedule] = useState([]);
  const [extraInvestments, setExtraInvestments] = useState([]);
  const [selectedChitId, setSelectedChitId] = useState(activeChit?.chitId || 'CHIT-100K-01');

  // View state: 'cards' vs 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Member Collection Tracking state
  const [selectedTrackingMonth, setSelectedTrackingMonth] = useState(1);
  const [trackingFilter, setTrackingFilter] = useState('all'); // 'all' | 'unpaid' | 'paid' | 'partial'

  // Modal State for Recording / Editing Actual Record
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    chitId: activeChit?.chitId || 'CHIT-100K-01',
    month: 1,
    payoutId: '',
    memberId: '',
    memberName: '',
    chitNo: '',
    actualCollection: 100000,
    amount: 70000,
    payoutDate: getTodayDateInput(),
    fundingSource: 'CHIT_FUND',
    extraInvestmentId: '',
    paymentStatus: 'Completed',
    notes: ''
  });

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      const [res, chitList, memList, extraList, mShips, pMents, schList] = await Promise.all([
        api.getCollectionPayoutSummary({ chitId: selectedChitId }),
        api.getChits(),
        api.getMembers(),
        api.getExtraInvestments(),
        api.getMemberships({ chitId: selectedChitId }),
        api.getPayments(),
        api.getMonthlySchedule(selectedChitId)
      ]);
      setData(res || { months: [], summary: {} });
      setChits(Array.isArray(chitList) ? chitList : (chitList?.chits || []));
      setMembers(memList || []);
      setExtraInvestments(extraList || []);
      setMemberships(Array.isArray(mShips) ? mShips : []);
      setPayments(Array.isArray(pMents) ? pMents : []);
      setMonthlySchedule(Array.isArray(schList) ? schList : []);
    } catch (err) {
      console.error('Failed to load Collection & Payout Summary:', err);
      showToast('Error loading summary data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummaryData();
  }, [selectedChitId]);

  // Compute 20-member tracking for selected month using single source of truth Google Sheets payments
  const memberCollectionData = useMemo(() => {
    return calculateMonthlyUnpaidSummary({
      chits: chits.length > 0 ? chits : [activeChit || { chitId: selectedChitId }],
      members,
      memberships,
      schedule: monthlySchedule,
      payments,
      selectedMonth: selectedTrackingMonth,
      chitId: selectedChitId
    });
  }, [chits, activeChit, members, memberships, monthlySchedule, payments, selectedTrackingMonth, selectedChitId]);

  // Open modal with pre-filled month data
  const handleOpenEditModal = (monthRow) => {
    setModalError('');
    const targetMonth = monthRow ? Number(monthRow.monthNumber) : 1;
    const chitVal = Number(activeChit?.chitValue || activeChit?.totalAmount || 100000);
    const generatedChitNo = generateChitNumber({ year: 2026, chitValue: chitVal, sequenceNumber: targetMonth });

    if (monthRow) {
      setFormData({
        chitId: selectedChitId,
        month: targetMonth,
        payoutId: monthRow.payoutId || '',
        memberId: monthRow.payoutRecipientId || '',
        memberName: (monthRow.payoutRecipient && monthRow.payoutRecipient !== 'Not Assigned') ? monthRow.payoutRecipient : '',
        chitNo: monthRow.chitNo || generatedChitNo,
        actualCollection: monthRow.actualCollected !== undefined ? monthRow.actualCollected : (targetMonth === 1 ? 100000 : 75000),
        amount: monthRow.actualPayout > 0 ? monthRow.actualPayout : (monthRow.scheduledPayout || 70000),
        payoutDate: monthRow.payoutDate || getTodayDateInput(),
        fundingSource: monthRow.fundingSource || 'CHIT_FUND',
        extraInvestmentId: monthRow.extraInvestmentId || '',
        paymentStatus: monthRow.payoutStatus || 'Completed',
        notes: monthRow.payoutNotes || `Month ${targetMonth} Actual Record`
      });
    } else {
      setFormData({
        chitId: selectedChitId,
        month: 1,
        payoutId: '',
        memberId: '',
        memberName: 'Dinesh Mama',
        chitNo: generatedChitNo,
        actualCollection: 100000,
        amount: 70000,
        payoutDate: getTodayDateInput(),
        fundingSource: 'CHIT_FUND',
        extraInvestmentId: '',
        paymentStatus: 'Completed',
        notes: 'Month 1 Actual Record'
      });
    }
    setIsModalOpen(true);
  };

  // Helper to prefill Business Example Records
  const handleQuickFillExample = (exampleMonth) => {
    setModalError('');
    const chitVal = Number(activeChit?.chitValue || activeChit?.totalAmount || 100000);
    if (exampleMonth === 1) {
      const chitNo = generateChitNumber({ year: 2026, chitValue: chitVal, sequenceNumber: 1 });
      setFormData(prev => ({
        ...prev,
        month: 1,
        chitNo: chitNo,
        memberName: 'Dinesh Mama',
        actualCollection: 100000,
        amount: 70000,
        payoutDate: '2026-10-22',
        fundingSource: 'CHIT_FUND',
        paymentStatus: 'Completed',
        notes: 'Month 1 Business Example: ₹1,00,000 Collected, Dinesh Mama Payout ₹70,000'
      }));
    } else if (exampleMonth === 2) {
      const chitNo = generateChitNumber({ year: 2026, chitValue: chitVal, sequenceNumber: 2 });
      setFormData(prev => ({
        ...prev,
        month: 2,
        chitNo: chitNo,
        memberName: 'Mani Mama',
        actualCollection: 75000,
        amount: 70000,
        payoutDate: '2026-11-22',
        fundingSource: 'CHIT_FUND',
        paymentStatus: 'Completed',
        notes: 'Month 2 Business Example: ₹75,000 Collected, Mani Mama Payout ₹70,000'
      }));
    }
  };

  const handleMonthChange = (e) => {
    const m = Number(e.target.value);
    const chitVal = Number(activeChit?.chitValue || activeChit?.totalAmount || 100000);
    const chitNo = generateChitNumber({ year: 2026, chitValue: chitVal, sequenceNumber: m });
    
    const existingRow = data?.months?.find(row => Number(row.monthNumber) === m);
    if (existingRow) {
      setFormData(prev => ({
        ...prev,
        month: m,
        payoutId: existingRow.payoutId || '',
        memberId: existingRow.payoutRecipientId || '',
        memberName: (existingRow.payoutRecipient && existingRow.payoutRecipient !== 'Not Assigned') ? existingRow.payoutRecipient : (m === 1 ? 'Dinesh Mama' : (m === 2 ? 'Mani Mama' : prev.memberName)),
        chitNo: existingRow.chitNo || chitNo,
        actualCollection: existingRow.actualCollected !== undefined ? existingRow.actualCollected : (m === 1 ? 100000 : 75000),
        amount: existingRow.actualPayout > 0 ? existingRow.actualPayout : (existingRow.scheduledPayout || 70000),
        payoutDate: existingRow.payoutDate || getTodayDateInput(),
        fundingSource: existingRow.fundingSource || 'CHIT_FUND',
        extraInvestmentId: existingRow.extraInvestmentId || '',
        paymentStatus: existingRow.payoutStatus || 'Completed'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        month: m,
        chitNo: chitNo,
        memberName: m === 1 ? 'Dinesh Mama' : (m === 2 ? 'Mani Mama' : ''),
        actualCollection: m === 1 ? 100000 : (m === 2 ? 75000 : 0),
        amount: 70000
      }));
    }
  };

  const handleMemberSelect = (e) => {
    const selectedName = e.target.value;
    const foundMember = members.find(m => m.name === selectedName);
    setFormData(prev => ({
      ...prev,
      memberName: selectedName,
      memberId: foundMember ? foundMember.memberId : prev.memberId
    }));
  };

  const handleSaveActualRecord = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.memberName || formData.memberName.trim() === '') {
      setModalError('Please enter or select the Payout Recipient Member.');
      return;
    }

    if (formData.amount === undefined || Number(formData.amount) <= 0) {
      setModalError('Please enter a valid Actual Payout amount greater than ₹0.');
      return;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        chitId: selectedChitId,
        month: Number(formData.month),
        monthNumber: Number(formData.month),
        payoutId: formData.payoutId || undefined,
        memberName: formData.memberName.trim(),
        memberId: formData.memberId || 'MEM-000',
        chitNo: formData.chitNo,
        actualCollection: Number(formData.actualCollection) || 0,
        actualAmountCollected: Number(formData.actualCollection) || 0,
        amount: Number(formData.amount),
        actualAmount: Number(formData.amount),
        payoutDate: formData.payoutDate,
        fundingSource: formData.fundingSource,
        extraInvestmentId: formData.fundingSource === 'EXTRA_INVESTMENT' ? formData.extraInvestmentId : '',
        status: formData.paymentStatus,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes
      };

      await api.recordActualCollectionAndPayout(payload);
      showToast(`Month ${formData.month} actual record saved successfully!`, 'success');
      setIsModalOpen(false);
      await loadSummaryData();
    } catch (err) {
      console.error('Error saving actual record:', err);
      setModalError(err.message || 'Failed to save actual collection and payout record.');
      showToast('Failed to save actual record', 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  // One-click Confirm Month 2 payout as paid (Dinesh Mama M1 is already paid, Month 2 requires confirmation)
  const handleConfirmMonth2Paid = async () => {
    try {
      setLoading(true);
      await api.recordActualCollectionAndPayout({
        chitId: selectedChitId,
        month: 2,
        monthNumber: 2,
        memberName: 'Mani Mama',
        memberId: 'MEM-002',
        actualCollection: 75000,
        amount: 70000,
        actualAmount: 70000,
        scheduledAmount: 70000,
        fundingSource: 'CHIT_FUND',
        status: 'Completed',
        paymentStatus: 'Completed',
        payoutDate: getTodayDateInput(),
        notes: 'Month 2 Payout Confirmed Paid to Mani Mama: ₹70,000'
      });
      showToast('Month 2 Payout confirmed as Paid: ₹70,000 to Mani Mama', 'success');
      await loadSummaryData();
    } catch (err) {
      showToast(err.message || 'Failed to confirm payout', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    let csv = 'Month,Permanent Chit No,Actual Collected,Payout Recipient,Scheduled Payout,Actual Payout,Cash Remaining Before Expenses,Closing Cash Balance,Funding Source,Status\n';
    (data.months || []).forEach(row => {
      csv += `Month ${row.monthNumber},${row.chitNo},${row.actualCollected},"${row.payoutRecipient}",${row.scheduledPayout || 70000},${row.actualPayout},${row.cashRemainingBeforeExpenses !== undefined ? row.cashRemainingBeforeExpenses : row.simpleDifference},${row.closingCash},${row.fundingSource},${row.payoutStatus}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MSR_Chits_Collection_Payout_Summary_${selectedChitId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary || {};
  const months = data?.months || [];

  // Filtered members in tracking section
  const filteredTrackingMemberships = useMemo(() => {
    const list = memberCollectionData?.memberships || [];
    if (trackingFilter === 'paid') return list.filter(m => m.status === 'Paid');
    if (trackingFilter === 'partial') return list.filter(m => m.status === 'Partial');
    if (trackingFilter === 'unpaid') return list.filter(m => m.status === 'Unpaid');
    return list;
  }, [memberCollectionData, trackingFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#DCE8E0] shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C9A227]">
            <span>Treasury & Liquidity Ledger</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
            <span>Actual Cash Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003524] tracking-tight mt-1">
            Collection & Payout Summary
          </h1>
          <p className="text-sm text-[#5B7065] mt-1 max-w-2xl">
            Track actual member installment collections against actual prize payouts month-by-month,
            with carry-forward closing cash remaining. <span className="font-semibold text-[#003524]">Never labeled as profit.</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chit Selector */}
          <select
            value={selectedChitId}
            onChange={(e) => setSelectedChitId(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#F0FCF4] border border-[#C4D9CC] text-[#003524] focus:outline-none focus:ring-2 focus:ring-[#003524]"
          >
            {chits.map(c => (
              <option key={c.chitId} value={c.chitId}>
                {c.chitName || c.chitId}
              </option>
            ))}
          </select>

          {/* View Mode Toggle (Cards vs Table) */}
          <div className="flex items-center bg-[#F0FCF4] p-1 rounded-xl border border-[#C4D9CC]">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#5B7065] hover:text-[#003524]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#5B7065] hover:text-[#003524]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>

          {/* Record / Edit Actual Button */}
          <button
            onClick={() => handleOpenEditModal(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#003524] text-white hover:bg-[#174D38] transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#FED255]" />
            <span>Record / Edit Actual</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadSummaryData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-[#DCE8E0] text-[#5B7065] hover:text-[#003524] hover:bg-[#F0FCF4] transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#003524]' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            title="Export to CSV"
            className="p-2.5 rounded-xl border border-[#DCE8E0] text-[#5B7065] hover:text-[#003524] hover:bg-[#F0FCF4] transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            title="Print Summary"
            className="p-2.5 rounded-xl border border-[#DCE8E0] text-[#5B7065] hover:text-[#003524] hover:bg-[#F0FCF4] transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Principles & Benchmark Callout Banner */}
      <div className="bg-[#F0FCF4] border border-[#C4D9CC] p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#003524] text-white shrink-0 mt-0.5">
            <Wallet className="w-5 h-5 text-[#FED255]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003524]">
              Independent Collection vs Payout Tracking
            </h4>
            <p className="text-xs sm:text-sm text-[#131E19] mt-0.5">
              <span className="font-semibold text-[#003524]">Month 1:</span> ₹1,00,000 Collected (20 × ₹5k) − ₹70,000 Dinesh Mama Payout = <span className="font-bold text-[#003524]">₹30,000 Remaining</span>.
              <span className="mx-2">•</span>
              <span className="font-semibold text-[#003524]">Month 2:</span> ₹75,000 Collected (20 × ₹3.75k) − ₹70,000 Mani Mama Payout = <span className="font-bold text-[#003524]">₹5,000 Remaining</span>.
            </p>
            <p className="text-[11px] text-[#5B7065] mt-1">
              Combined Difference: <span className="font-bold text-[#003524]">₹35,000</span> Before Other Expenses • Carry-forward closing balance is strictly applied • Scheduled payout is never treated as actual payment until confirmed.
            </p>
          </div>
        </div>

        {/* Quick Actions for Month 1 and Month 2 */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => {
              handleOpenEditModal(null);
              setTimeout(() => handleQuickFillExample(1), 50);
            }}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-[#003524]/20 text-[#003524] hover:bg-[#003524] hover:text-white transition-all shadow-xs"
          >
            Example M1
          </button>
          <button
            onClick={handleConfirmMonth2Paid}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#003524] text-white hover:bg-[#174D38] transition-all shadow-xs flex items-center gap-1"
            title="Confirm Month 2 Payout as Paid to Mani Mama"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#FED255]" />
            <span>Confirm M2 Paid</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Calculating monthly collection vs payout liquidity..." />
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Card 1: Total Collection */}
            <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B7065] uppercase tracking-wider">Total Collection</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-[#003524]">
                  {formatINR(summary.totalCollection || 0)}
                </div>
                <div className="text-[11px] text-[#5B7065] mt-1">
                  Actual member installments collected
                </div>
              </div>
            </div>

            {/* Card 2: Actual Payouts */}
            <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B7065] uppercase tracking-wider">Actual Payouts</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Send className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-[#131E19]">
                  {formatINR(summary.totalActualPayouts || 0)}
                </div>
                <div className="text-[11px] text-[#5B7065] mt-1">
                  Disbursed to prize recipients
                </div>
              </div>
            </div>

            {/* Card 3: Cash Remaining Before Other Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B7065] uppercase tracking-wider">Cash Remaining</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-[#003524]">
                  {formatINR(summary.cashRemainingBeforeExpenses !== undefined ? summary.cashRemainingBeforeExpenses : (summary.simpleDifference || 0))}
                </div>
                <div className="text-[11px] text-[#5B7065] mt-1">
                  Before Other Expenses (Col − Payout)
                </div>
              </div>
            </div>

            {/* Card 4: Overall Closing Cash (Carried Forward Liquidity) */}
            <div className="bg-white p-5 rounded-2xl border-2 border-[#003524]/20 shadow-sm flex flex-col justify-between bg-gradient-to-b from-[#F0FCF4]/60 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#003524] uppercase tracking-wider">Overall Balance</span>
                <span className="p-2 rounded-xl bg-[#003524] text-[#FED255]">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-[#003524]">
                  {formatINR(summary.finalCashRemaining || 0)}
                </div>
                <div className="text-[11px] font-semibold text-emerald-800 mt-1 flex items-center gap-1">
                  <span>Carried forward liquidity</span>
                </div>
              </div>
            </div>

            {/* Card 5: Extra Investment Used */}
            <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B7065] uppercase tracking-wider">Extra Inv. Used</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-[#131E19]">
                  {formatINR(summary.totalExtraUsed || 0)}
                </div>
                <div className="text-[11px] text-[#5B7065] mt-1">
                  Capital deployed for payouts
                </div>
              </div>
            </div>

            {/* Card 6: Extra Investment Recovered */}
            <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B7065] uppercase tracking-wider">Extra Recovered</span>
                <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-[#131E19]">
                  {formatINR(summary.totalExtraRecovered || 0)}
                </div>
                <div className="text-[11px] text-[#5B7065] mt-1">
                  Capital returned to investors
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: PAYOUT CARDS VIEW / TABLE LEDGER VIEW */}
          {/* ========================================================================= */}
          {viewMode === 'cards' ? (
            <div className="bg-white p-5 rounded-2xl border border-[#DCE8E0] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAF2EC]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#003524] flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#174D38]" />
                    Monthly Payout Cards ({months.length} Months)
                  </h3>
                  <p className="text-xs text-[#5B7065] mt-0.5">
                    Displaying Total Collection, Scheduled Payout, Actual Paid, Cash Remaining, Recipient, Funding Source, and Status.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#003524] bg-[#F0FCF4] px-2.5 py-1 rounded-lg border border-[#DCE8E0]">
                  {months.filter(m => m.payoutStatus === 'Completed').length} / {months.length} Months Completed
                </span>
              </div>

              {/* Responsive Grid of Payout Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {months.map((row) => {
                  const m = row.monthNumber;
                  const isCompleted = row.payoutStatus === 'Completed';
                  const isAssigned = row.payoutRecipient && row.payoutRecipient !== 'Not Assigned';
                  const isPositiveDiff = (row.cashRemainingBeforeExpenses !== undefined ? row.cashRemainingBeforeExpenses : row.simpleDifference) >= 0;
                  const isExtra = String(row.fundingSource || '').toUpperCase().includes('EXTRA');
                  const fundingLabel = isExtra ? 'EXTRA INVESTMENT' : (m === 1 ? 'CHIT FUND (NIL)' : 'CHIT FUND');

                  return (
                    <div
                      key={m}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isCompleted
                          ? 'bg-[#F0FCF4] border-emerald-300 shadow-xs'
                          : isAssigned
                          ? 'bg-[#F8FAF9] border-emerald-200/90 shadow-xs'
                          : 'bg-white border-dashed border-[#DCE8E0] hover:border-[#003524] hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        {/* Header: Month & Status Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold font-mono text-[#003524]">
                            Month {m} {m === 1 ? '(NIL)' : ''}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wide border ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isAssigned
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-[#5B7065] border-slate-200'
                          }`}>
                            {row.payoutStatus || (isCompleted ? 'Completed' : (isAssigned ? 'Scheduled' : 'Upcoming'))}
                          </span>
                        </div>

                        {/* Financial Indicators Box (Collection, Scheduled, Actual Paid, Cash Remaining) */}
                        <div className="p-2.5 bg-white rounded-lg border border-[#DCE8E0] mb-2.5 space-y-1.5 text-xs">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5B7065]">
                              Total Collection:
                            </span>
                            <span className="text-xs font-bold text-[#131E19]">
                              {formatINR(row.actualCollected || 0)}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5B7065]">
                              Scheduled Payout:
                            </span>
                            <span className="text-xs font-bold text-[#131E19]">
                              {formatINR(row.scheduledPayout || 70000)}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-[#EAF2EC]">
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-800">
                              Actual Paid:
                            </span>
                            <span className="text-sm font-black text-[#003524]">
                              {isCompleted ? formatINR(row.actualPayout) : '—'}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-[#EAF2EC]">
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-700">
                              Cash Remaining:
                            </span>
                            <span className={`text-xs font-extrabold ${isPositiveDiff ? 'text-[#003524]' : 'text-rose-600'}`}>
                              {formatINR(row.cashRemainingBeforeExpenses !== undefined ? row.cashRemainingBeforeExpenses : row.simpleDifference)}
                            </span>
                          </div>
                        </div>

                        {/* Details (Recipient, Funding Source, Status, Chit No) */}
                        <div className="space-y-1 mb-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#5B7065]">Recipient:</span>
                            <span className="font-bold text-[#131E19] truncate max-w-[130px]" title={row.payoutRecipient}>
                              {row.payoutRecipient || (m === 1 ? 'Dinesh Mama' : (m === 2 ? 'Mani Mama' : 'Not Assigned'))}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#5B7065]">Funding Source:</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                              isExtra
                                ? 'bg-purple-50 text-purple-900 border-purple-200'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            }`}>
                              {fundingLabel}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#5B7065]">Chit No:</span>
                            <span className="font-mono text-[11px] font-bold text-[#174D38] bg-[#F0FCF4] px-1.5 py-0.2 rounded border border-emerald-200">
                              {row.chitNo}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-[#5B7065] pt-0.5 border-t border-slate-100">
                            <span>Carried Cash:</span>
                            <span className="font-mono font-bold text-[#003524]">
                              {formatINR(row.closingCash)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Button */}
                      <div className="pt-2 border-t border-[#EAF2EC] flex items-center gap-1.5">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            className="flex-1 py-1 px-2 bg-white hover:bg-[#F0FCF4] text-[#174D38] border border-[#DCE8E0] text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Edit3 className="w-3 h-3 text-[#174D38]" />
                            <span>Edit Record</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            className="flex-1 py-1 px-2 bg-[#003524] hover:bg-[#174D38] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs"
                          >
                            <DollarSign className="w-3 h-3 text-[#FED255]" />
                            <span>Confirm as Paid</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Month-by-Month Table View */
            <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#DCE8E0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#003524]">
                    Month-by-Month Ledger
                  </h3>
                  <p className="text-xs text-[#5B7065] mt-0.5">
                    Actual collections received, actual prize payouts disbursed, and carry-forward closing cash balance.
                  </p>
                </div>
                <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#F0FCF4] border border-[#C4D9CC] text-[#003524]">
                  Showing {months.length} Months
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#003524] text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Month</th>
                      <th className="py-3.5 px-3">Chit No</th>
                      <th className="py-3.5 px-4">Collected</th>
                      <th className="py-3.5 px-4">Payout Recipient</th>
                      <th className="py-3.5 px-3">Scheduled</th>
                      <th className="py-3.5 px-4">Actual Paid</th>
                      <th className="py-3.5 px-4">Cash Remaining Before Exp</th>
                      <th className="py-3.5 px-4 bg-[#002B1D] text-[#FED255]">Carried Cash</th>
                      <th className="py-3.5 px-3">Funding Source</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {months.map((row) => {
                      const isCompleted = row.payoutStatus === 'Completed';
                      const isPositiveDiff = (row.cashRemainingBeforeExpenses !== undefined ? row.cashRemainingBeforeExpenses : row.simpleDifference) >= 0;
                      const isExtraFunding = String(row.fundingSource || '').toUpperCase().includes('EXTRA');

                      return (
                        <tr
                          key={row.monthNumber}
                          className={`hover:bg-[#F0FCF4]/60 transition-colors ${
                            row.hasData ? 'bg-white' : 'bg-slate-50/50 text-[#5B7065]'
                          }`}
                        >
                          {/* Month */}
                          <td className="py-3.5 px-4 font-bold text-[#003524]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-lg bg-[#003524] text-white flex items-center justify-center text-xs font-bold">
                                {row.monthNumber}
                              </span>
                              <span className="text-xs font-semibold text-[#131E19]">
                                {row.monthLabel}
                              </span>
                            </div>
                          </td>

                          {/* Permanent Chit No */}
                          <td className="py-3.5 px-3">
                            <span className="font-mono text-xs font-bold text-[#003524] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {row.chitNo}
                            </span>
                          </td>

                          {/* Collected */}
                          <td className="py-3.5 px-4 font-extrabold text-[#003524]">
                            <div>
                              <span>{formatINR(row.actualCollected || 0)}</span>
                              {row.paymentsCount > 0 && (
                                <span className="block text-[10px] font-normal text-[#5B7065]">
                                  {row.paymentsCount} payments
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Payout Recipient */}
                          <td className="py-3.5 px-4 font-bold text-[#131E19]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#E8F0EC] text-[#003524] flex items-center justify-center text-xs font-black shrink-0">
                                {(row.payoutRecipient || 'N')[0]}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-[#131E19]">
                                  {row.payoutRecipient || 'Not Assigned'}
                                </div>
                                {row.payoutDate && (
                                  <div className="text-[10px] font-normal text-[#5B7065]">
                                    {formatDate(row.payoutDate)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Scheduled Payout */}
                          <td className="py-3.5 px-3 text-[#5B7065] font-semibold">
                            {formatINR(row.scheduledPayout || 70000)}
                          </td>

                          {/* Actual Paid */}
                          <td className="py-3.5 px-4 font-extrabold text-[#003524]">
                            {isCompleted ? formatINR(row.actualPayout) : '—'}
                          </td>

                          {/* Cash Remaining Before Other Expenses */}
                          <td className="py-3.5 px-4 font-bold">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold ${
                                isPositiveDiff
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {isPositiveDiff ? '+' : ''}{formatINR(row.cashRemainingBeforeExpenses !== undefined ? row.cashRemainingBeforeExpenses : row.simpleDifference)}
                            </span>
                          </td>

                          {/* Carried Closing Cash */}
                          <td className="py-3.5 px-4 font-mono font-black text-xs sm:text-sm text-[#003524] bg-emerald-50/40">
                            {formatINR(row.closingCash)}
                          </td>

                          {/* Funding Source */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isExtraFunding
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-[#E8F0EC] text-[#003524] border border-[#C4D9CC]'
                              }`}
                            >
                              {isExtraFunding ? 'Extra Investment' : 'Chit Fund'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center">
                            <StatusBadge status={row.payoutStatus} />
                          </td>

                          {/* Action Edit */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => handleOpenEditModal(row)}
                              className="p-1.5 rounded-lg text-[#003524] hover:bg-[#F0FCF4] border border-[#DCE8E0] hover:border-[#003524] transition-all cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                              title="Edit / Record Actual Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer Summary Row */}
                  <tfoot>
                    <tr className="bg-[#002B1D] text-white font-extrabold text-xs sm:text-sm">
                      <td className="py-4 px-4" colSpan={2}>
                        <span className="text-[#FED255] uppercase tracking-wider font-bold">
                          Combined Totals
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[#FED255]">
                        {formatINR(summary.totalCollection || 0)}
                      </td>
                      <td className="py-4 px-4 text-xs font-normal text-[#C4D9CC]">
                        {summary.activeMonthsCount || 0} active months
                      </td>
                      <td className="py-4 px-3 text-xs text-[#C4D9CC]">
                        {formatINR(summary.totalScheduledPayouts || (months.length * 70000))}
                      </td>
                      <td className="py-4 px-4 text-white">
                        {formatINR(summary.totalActualPayouts || 0)}
                      </td>
                      <td className="py-4 px-4 text-[#FED255]">
                        {(summary.cashRemainingBeforeExpenses || summary.simpleDifference) >= 0 ? '+' : ''}
                        {formatINR(summary.cashRemainingBeforeExpenses !== undefined ? summary.cashRemainingBeforeExpenses : summary.simpleDifference)}
                      </td>
                      <td className="py-4 px-4 bg-[#001E14] text-[#FED255] font-black">
                        {formatINR(summary.finalCashRemaining || 0)}
                      </td>
                      <td className="py-4 px-3" colSpan={3}>
                        <span className="text-[11px] font-normal text-[#C4D9CC]">
                          Carried forward reserve
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: MEMBER COLLECTION TRACKING (20 MEMBERS FOR SELECTED MONTH) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-sm overflow-hidden p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAF2EC]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#003524] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#174D38]" />
                  Member Collection Tracking (20 Members)
                </h3>
                <p className="text-xs text-[#5B7065] mt-0.5">
                  Verify individual payment status for each of the 20 members for Month {selectedTrackingMonth}. Reads actual records from Google Sheets.
                </p>
              </div>

              {/* Month Selector for Tracking */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#003524] uppercase">Select Month:</span>
                <select
                  value={selectedTrackingMonth}
                  onChange={(e) => setSelectedTrackingMonth(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-[#C4D9CC] bg-[#F0FCF4] text-xs font-bold text-[#003524] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      Month {m} ({m === 1 ? 'Due ₹5,000' : (m === 2 ? 'Due ₹3,750' : `Due ₹${(monthlySchedule.find(s => Number(s.monthNumber || s.month) === m)?.amount || 3825).toLocaleString('en-IN')}`)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Month Collection Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#DCE8E0]">
                <div className="text-[10px] font-bold text-[#5B7065] uppercase">Expected Members</div>
                <div className="text-lg font-black text-[#003524] mt-0.5">
                  {memberCollectionData?.summary?.membersExpected || 20}
                </div>
                <div className="text-[10px] text-[#5B7065]">₹1L Chit Scheme</div>
              </div>

              <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#DCE8E0]">
                <div className="text-[10px] font-bold text-[#5B7065] uppercase">Amount Due / Member</div>
                <div className="text-lg font-black text-[#003524] mt-0.5">
                  {formatINR(memberCollectionData?.summary?.installmentDuePerMember || (selectedTrackingMonth === 1 ? 5000 : 3750))}
                </div>
                <div className="text-[10px] text-[#5B7065]">From MonthlySchedule</div>
              </div>

              <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#DCE8E0]">
                <div className="text-[10px] font-bold text-[#5B7065] uppercase">Total Amount Due</div>
                <div className="text-lg font-black text-[#003524] mt-0.5">
                  {formatINR(memberCollectionData?.summary?.totalMonthlyDue || (selectedTrackingMonth === 1 ? 100000 : 75000))}
                </div>
                <div className="text-[10px] text-[#5B7065]">20 × Monthly Due</div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Actually Collected</div>
                <div className="text-lg font-black text-emerald-900 mt-0.5">
                  {formatINR(memberCollectionData?.summary?.totalCollected || 0)}
                </div>
                <div className="text-[10px] text-emerald-700">Google Sheets records</div>
              </div>

              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                <div className="text-[10px] font-bold text-rose-800 uppercase">Outstanding Dues</div>
                <div className="text-lg font-black text-rose-900 mt-0.5">
                  {formatINR(memberCollectionData?.summary?.totalUnpaid || 0)}
                </div>
                <div className="text-[10px] text-rose-700">To be collected</div>
              </div>

              <div className="p-3 bg-[#F0FCF4] rounded-xl border border-[#C4D9CC] flex flex-col justify-between">
                <div className="text-[10px] font-bold text-[#003524] uppercase">Status Breakdown</div>
                <div className="text-xs font-bold text-[#003524] mt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span className="text-emerald-700">{memberCollectionData?.summary?.fullyPaidCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unpaid:</span>
                    <span className="text-rose-700">{memberCollectionData?.summary?.unpaidCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Quick Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                {['all', 'unpaid', 'paid', 'partial'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTrackingFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                      trackingFilter === tab
                        ? 'bg-[#003524] text-white shadow-xs'
                        : 'bg-slate-100 text-[#5B7065] hover:bg-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Quick Record Payment Helper */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecordPaymentOpen && setIsRecordPaymentOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#003524] text-white text-xs font-bold hover:bg-[#174D38] transition-colors flex items-center gap-1 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#FED255]" />
                  <span>Record Member Payment</span>
                </button>
              </div>
            </div>

            {/* 20 Members Table */}
            <div className="overflow-x-auto border border-[#DCE8E0] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#003524] text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Permanent Chit No</th>
                    <th className="py-2.5 px-4">Member Name</th>
                    <th className="py-2.5 px-3">Amount Due</th>
                    <th className="py-2.5 px-3">Amount Paid</th>
                    <th className="py-2.5 px-3">Balance Unpaid</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTrackingMemberships.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500 font-medium">
                        No members found matching filter for Month {selectedTrackingMonth}.
                      </td>
                    </tr>
                  ) : (
                    filteredTrackingMemberships.map((mItem, idx) => {
                      const isPaid = mItem.status === 'Paid';
                      const isPartial = mItem.status === 'Partial';

                      return (
                        <tr key={mItem.membershipId || idx} className="hover:bg-[#F0FCF4]/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[#5B7065]">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-xs font-bold text-[#003524] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {mItem.chitNo}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-[#131E19]">
                            <div>
                              <span>{mItem.memberName}</span>
                              {mItem.phone && (
                                <span className="block text-[10px] text-[#5B7065] font-normal">
                                  {mItem.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#131E19]">
                            {formatINR(mItem.dueAmount)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-800">
                            {formatINR(mItem.paidAmount)}
                          </td>
                          <td className={`py-2.5 px-3 font-bold ${mItem.unpaidAmount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                            {formatINR(mItem.unpaidAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : isPartial
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}>
                              {mItem.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {mItem.phone ? (
                              <a
                                href={generateWhatsAppUrl(
                                  mItem.phone,
                                  buildMonthlyUnpaidReminderMessage({
                                    memberName: mItem.memberName,
                                    monthNumber: selectedTrackingMonth,
                                    unpaidAmount: mItem.unpaidAmount,
                                    monthlyDue: mItem.dueAmount,
                                    paidAmount: mItem.paidAmount,
                                    chitNo: mItem.chitNo
                                  })
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md text-emerald-700 hover:bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1 text-[11px] font-semibold"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Remind</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Record / Edit Actual Record Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Record / Edit Actual Collection & Payout — Month ${formData.month}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveActualRecord} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Quick Pre-fill Helpers */}
          <div className="bg-[#F0FCF4] p-3 rounded-xl border border-[#C4D9CC] flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#003524]">
              Quick Fill Business Examples:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFillExample(1)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-[#003524]/30 text-[#003524] hover:bg-[#003524] hover:text-white transition-all cursor-pointer"
              >
                Month 1 (₹1L Col / ₹70k Payout)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFillExample(2)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-[#003524]/30 text-[#003524] hover:bg-[#003524] hover:text-white transition-all cursor-pointer"
              >
                Month 2 (₹75k Col / ₹70k Payout)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Chit Month */}
            <div>
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Month Number (1 to 20) *
              </label>
              <select
                value={formData.month}
                onChange={handleMonthChange}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm font-semibold text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                required
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    Month {m} {m === 1 ? '(Organizer NIL)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Permanent Chit No */}
            <div>
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Permanent Chit Number
              </label>
              <input
                type="text"
                value={formData.chitNo}
                readOnly
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm font-mono font-bold text-[#003524] bg-slate-50 cursor-not-allowed"
              />
            </div>

            {/* Actual Amount Collected */}
            <div>
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Total Actual Collection (₹) *
              </label>
              <input
                type="number"
                value={formData.actualCollection}
                onChange={(e) => setFormData({ ...formData, actualCollection: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm font-bold text-[#003524] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                placeholder="e.g. 100000 for M1, 75000 for M2"
                required
              />
              <span className="text-[10px] text-[#5B7065] mt-0.5 block">
                M1 = 20 × ₹5,000 = ₹1,00,000 | M2 = 20 × ₹3,750 = ₹75,000
              </span>
            </div>

            {/* Actual Payout Amount Paid */}
            <div>
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Actual Payout Paid (₹) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm font-bold text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                placeholder="e.g. 70000"
                required
              />
              <span className="text-[10px] text-[#5B7065] mt-0.5 block">
                Actual amount disbursed to recipient
              </span>
            </div>

            {/* Payout Recipient Member */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Payout Recipient Member *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.memberName}
                  onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm font-semibold text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                  placeholder="e.g. Dinesh Mama or Mani Mama"
                  required
                />
                <select
                  onChange={handleMemberSelect}
                  className="px-3 py-2 rounded-xl border border-[#DCE8E0] text-xs font-medium text-[#5B7065] bg-[#F0FCF4]"
                >
                  <option value="">Select Existing...</option>
                  {members.map(m => (
                    <option key={m.memberId} value={m.name}>
                      {m.name} ({m.phone || m.memberId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payout Date */}
            <div>
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Payout Date *
              </label>
              <input
                type="date"
                value={formData.payoutDate}
                onChange={(e) => setFormData({ ...formData, payoutDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                required
              />
            </div>

            {/* Funding Source */}
            <div>
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Funding Source *
              </label>
              <select
                value={formData.fundingSource}
                onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm font-semibold text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
              >
                <option value="CHIT_FUND">CHIT_FUND (Standard Collections)</option>
                <option value="EXTRA_INVESTMENT">EXTRA_INVESTMENT (External Capital)</option>
              </select>
            </div>

            {/* If Extra Investment, select Investment ID */}
            {formData.fundingSource === 'EXTRA_INVESTMENT' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                  Select Extra Investment Record
                </label>
                <select
                  value={formData.extraInvestmentId}
                  onChange={(e) => setFormData({ ...formData, extraInvestmentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                >
                  <option value="">Select Active Extra Investment...</option>
                  {extraInvestments.map(inv => (
                    <option key={inv.investmentId} value={inv.investmentId}>
                      {inv.investmentId} — {formatINR(inv.investmentAmount)} ({inv.beneficiary || 'Unassigned'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Status */}
            <div>
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Payout Status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
              >
                <option value="Completed">Completed (Confirmed Paid)</option>
                <option value="Scheduled">Scheduled (Not Yet Paid)</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#003524] uppercase tracking-wider mb-1">
                Notes / Reference
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE8E0] text-sm text-[#131E19] focus:outline-none focus:ring-2 focus:ring-[#003524]"
                placeholder="Disbursement details, bank reference, etc."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-[#DCE8E0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#DCE8E0] text-xs sm:text-sm font-bold text-[#5B7065] hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#003524] text-white hover:bg-[#174D38] transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {modalSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FED255]" />
                  <span>Saving to Google Sheets...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#FED255]" />
                  <span>Save Actual Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CollectionPayoutSummary;
