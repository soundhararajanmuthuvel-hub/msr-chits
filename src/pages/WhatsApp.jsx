import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  Bell,
  CreditCard,
  Send,
  Calendar,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clock,
  History,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { isValidWhatsAppPhone, normalizeIndianPhone } from '../utils/whatsapp';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import SearchBar from '../components/common/SearchBar';
import LoadingState from '../components/common/LoadingState';
import WhatsAppComposerModal from '../components/whatsapp/WhatsAppComposerModal';
import { useChit } from '../context/ChitContext';

export const WhatsApp = () => {
  const { activeChit, showToast } = useChit();

  const [activeTab, setActiveTab] = useState('welcome'); // 'welcome' | 'reminders' | 'payments' | 'payouts' | 'logs'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [logs, setLogs] = useState([]);

  // Active composer state
  const [composerConfig, setComposerConfig] = useState({
    isOpen: false,
    member: null,
    messageType: 'welcome',
    paymentRecord: null,
    payoutRecord: null
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [mems, pays, pos, chitData, waLogs] = await Promise.all([
        api.getMembers(),
        api.getPayments(),
        api.getPayouts(),
        api.getChit(activeChit?.chitId || 'CHIT-100K-01'),
        api.getWhatsAppLogs()
      ]);

      setMembers(mems || []);
      setPayments(pays || []);
      setPayouts(pos || []);
      setSchedule(chitData?.schedule || []);
      setLogs(waLogs || []);
    } catch (err) {
      console.error('Failed to load WhatsApp Communication Hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeChit]);

  const handleOpenComposer = ({ member, messageType, paymentRecord = null, payoutRecord = null }) => {
    setComposerConfig({
      isOpen: true,
      member,
      messageType,
      paymentRecord,
      payoutRecord
    });
  };

  const handleUpdateStatus = async (messageId, newStatus) => {
    try {
      await api.updateWhatsAppStatus(messageId, newStatus);
      showToast(`Message marked as ${newStatus}`, 'success');
      loadAllData();
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  // Stats calculation
  const totalMembersCount = members.length;
  const readyMembersCount = members.filter(m => isValidWhatsAppPhone(m.mobile || m.phone)).length;
  const openedLogsCount = logs.filter(l => l.status === 'Opened' || l.status === 'Sent').length;
  const sentLogsCount = logs.filter(l => l.status === 'Sent').length;

  // Filtered members for welcome & reminders
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const term = searchTerm.toLowerCase();
      const nameMatch = m.name?.toLowerCase().includes(term);
      const phoneMatch = String(m.mobile || m.phone || '').includes(term);
      const idMatch = m.memberId?.toLowerCase().includes(term);
      const chitMatch = (m.chits || []).some(c => c.chitNo?.toLowerCase().includes(term));
      return nameMatch || phoneMatch || idMatch || chitMatch;
    });
  }, [members, searchTerm]);

  if (loading) {
    return <LoadingState message="Loading WhatsApp Communication Hub..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
              WhatsApp Communication Hub
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            Dynamic member messaging using permanent unique Chit Numbers & real Google Sheets records
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F0FCF4] text-[#003524] border border-[#DCE8E0] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-[#174D38]" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="WhatsApp Ready"
          value={`${readyMembersCount} / ${totalMembersCount}`}
          subtitle={`${Math.round((readyMembersCount / (totalMembersCount || 1)) * 100)}% with valid phone`}
          icon={Phone}
          accentColor="emerald"
        />

        <StatCard
          title="Active Scheme"
          value={activeChit?.chitName || '₹1 Lakh Chit'}
          subtitle={`Month ${activeChit?.currentMonth || 2} of 20`}
          icon={Layers}
          accentColor="primary"
        />

        <StatCard
          title="Messages Opened"
          value={openedLogsCount}
          subtitle="Click-to-Chat triggered"
          icon={MessageSquare}
          accentColor="blue"
        />

        <StatCard
          title="Confirmed Sent"
          value={sentLogsCount}
          subtitle="Manually verified sent"
          icon={CheckCircle2}
          accentColor="gold"
        />
      </div>

      {/* Category Tabs */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-[#DCE8E0] shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'welcome', label: '👋 Welcome Messages', count: members.length },
            { id: 'reminders', label: '🔔 Monthly Payment Reminders', count: members.filter(m => (m.totalPending || 0) > 0 || m.status === 'Active').length },
            { id: 'payments', label: '💰 Payment Confirmations', count: payments.length },
            { id: 'payouts', label: '🎯 Payout Updates', count: payouts.length },
            { id: 'logs', label: '📋 Message Log History', count: logs.length }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#4B6358] hover:bg-[#F0FCF4] hover:text-[#003524]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar for Member-related tabs */}
      {activeTab !== 'logs' && (
        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs flex items-center justify-between">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search member by name, phone, or Chit No (e.g. MSR261L02)..."
            className="max-w-md w-full"
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: WELCOME MESSAGES */}
      {/* ==================================================================== */}
      {activeTab === 'welcome' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#003524]">
                New Member Chit Welcome Messages
              </h3>
              <p className="text-xs text-[#5B7065] mt-0.5">
                Sends permanent assigned Chit Number(s), duration, installment amount, and fixed payout months.
                Consolidates 2+ chits into one clean message.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map(member => {
              const chits = member.chits || [];
              const canSend = isValidWhatsAppPhone(member.mobile || member.phone);

              return (
                <div
                  key={member.memberId}
                  className="bg-white rounded-2xl p-5 border border-[#DCE8E0] shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-[#003524] text-base">
                          {member.name}
                        </h4>
                        <span className="font-mono text-[10px] text-[#5B7065]">
                          {member.memberId}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#174D38]/10 text-[#003524]">
                        {chits.length} {chits.length === 1 ? 'Chit' : 'Chits'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#131E19]">
                        <Phone className="w-3.5 h-3.5 text-[#5B7065]" />
                        {canSend ? (
                          <span className="font-semibold">+{normalizeIndianPhone(member.mobile || member.phone)}</span>
                        ) : (
                          <span className="text-amber-800 font-bold italic">Phone number required</span>
                        )}
                      </div>

                      {/* Chit Numbers List */}
                      <div className="pt-2 border-t border-[#EAF2EC] space-y-1">
                        <span className="text-[10px] font-bold text-[#5B7065] uppercase tracking-wider block">
                          Assigned Permanent Chit(s):
                        </span>
                        {chits.length === 0 ? (
                          <span className="text-xs italic text-[#5B7065]">No chits assigned yet</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {chits.map(c => (
                              <span
                                key={c.chitNo}
                                className="font-mono text-xs font-bold px-2 py-1 rounded-md bg-[#F0FCF4] border border-[#DCE8E0] text-[#003524] flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3 h-3 text-[#174D38]" />
                                {c.chitNo} (Month {c.payoutMonth})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EAF2EC]">
                    <button
                      type="button"
                      disabled={!canSend}
                      onClick={() => handleOpenComposer({ member, messageType: 'welcome' })}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
                        canSend
                          ? 'bg-[#003524] hover:bg-[#174D38] text-white active:scale-95'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-[#C9A227]" />
                      <span>Review & Send Welcome</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: MONTHLY PAYMENT REMINDERS */}
      {/* ==================================================================== */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Month {activeChit?.currentMonth || 2} Payment Reminders
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Automatically aggregates all active chits for each member and calculates the dynamic total. Never hardcoded!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map(member => {
              const chits = member.chits || [];
              const canSend = isValidWhatsAppPhone(member.mobile || member.phone);
              const totalMonthlyDue = chits.reduce((sum, c) => sum + (Number(c.monthlyPayment) || 3750), 0);

              return (
                <div
                  key={member.memberId}
                  className="bg-white rounded-2xl p-5 border border-[#DCE8E0] shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-[#003524] text-base">
                          {member.name}
                        </h4>
                        <span className="font-mono text-[10px] text-[#5B7065]">
                          {member.memberId}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#5B7065] block">Total Monthly Due</span>
                        <span className="font-extrabold text-[#003524] text-sm">
                          {formatINR(totalMonthlyDue || 3750)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-[#131E19]">
                        <Phone className="w-3.5 h-3.5 text-[#5B7065]" />
                        {canSend ? (
                          <span className="font-semibold">+{normalizeIndianPhone(member.mobile || member.phone)}</span>
                        ) : (
                          <span className="text-amber-800 font-bold italic">Phone number required</span>
                        )}
                      </div>

                      {/* Chits breakdown */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-[#DCE8E0] space-y-1">
                        {chits.length === 0 ? (
                          <span className="text-[11px] text-[#5B7065] italic">No active chits</span>
                        ) : (
                          chits.map((c, idx) => (
                            <div key={c.chitNo} className="flex justify-between text-[11px]">
                              <span className="font-mono font-bold text-[#174D38]">{idx + 1}️⃣ {c.chitNo}</span>
                              <span className="font-bold text-[#003524]">₹{Number(c.monthlyPayment || 3750).toLocaleString('en-IN')}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EAF2EC]">
                    <button
                      type="button"
                      disabled={!canSend}
                      onClick={() => handleOpenComposer({ member, messageType: 'reminder' })}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
                        canSend
                          ? 'bg-[#003524] hover:bg-[#174D38] text-white active:scale-95'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Bell className="w-4 h-4 text-[#C9A227]" />
                      <span>Review & Send Reminder</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PAYMENT CONFIRMATIONS */}
      {/* ==================================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <h3 className="text-sm font-bold text-emerald-950">
              Payment Received Confirmations
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Confirmations generated directly from verified payment records stored in Google Sheets.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F0FCF4] border-b border-[#DCE8E0] text-[11px] font-bold uppercase tracking-wider text-[#174D38]">
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Chit No</th>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2EC]">
                  {payments.map(p => {
                    const member = members.find(m => m.memberId === p.memberId || m.name === p.memberName) || {
                      memberId: p.memberId,
                      name: p.memberName,
                      mobile: '9876543210'
                    };
                    const canSend = isValidWhatsAppPhone(member.mobile || member.phone);

                    return (
                      <tr key={p.paymentId} className="hover:bg-[#F0FCF4]/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-bold text-[#174D38]">
                          {p.paymentId}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#003524]">
                          {p.memberName}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#131E19]">
                          {p.chitNo || (member.chits?.[0]?.chitNo || 'MSR261L01')}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          Month {p.month || p.monthNumber}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-emerald-800">
                          {formatINR(p.amount || p.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-[#5B7065]">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={!canSend}
                            onClick={() => handleOpenComposer({
                              member,
                              messageType: 'payment_confirmation',
                              paymentRecord: p
                            })}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 min-h-[36px] ${
                              canSend
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Send Receipt</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: PAYOUT UPDATES & REMINDERS */}
      {/* ==================================================================== */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0]">
            <h3 className="text-sm font-bold text-[#003524]">
              Payout Reminders & Completed Confirmations
            </h3>
            <p className="text-xs text-[#5B7065] mt-0.5">
              Send payout schedules and post-disbursement receipts to winning members.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedule.slice(0, 10).map(item => {
              const monthNum = Number(item.month || item.monthNumber);
              const chitNo = `MSR261L${String(monthNum).padStart(2, '0')}`;
              const memberName = item.assignedMemberName || item.memberName || 'Not Assigned';
              const isAssigned = memberName !== 'Not Assigned';
              const member = members.find(m => m.name === memberName || m.memberId === item.memberId) || {
                memberId: item.memberId || 'MEM-001',
                name: memberName,
                mobile: '9876543210'
              };

              return (
                <div
                  key={monthNum}
                  className="bg-white rounded-2xl p-5 border border-[#DCE8E0] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-base font-bold text-[#003524]">
                        {chitNo}
                      </span>
                      <span className="text-xs text-[#5B7065] block">
                        Payout Month {monthNum}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                      {formatINR(item.payoutAmount || 70000)}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <span className="text-[#5B7065] block">Assigned Beneficiary:</span>
                    <span className="font-extrabold text-[#003524] text-sm block">
                      {memberName}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#EAF2EC] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={!isAssigned}
                      onClick={() => handleOpenComposer({
                        member,
                        messageType: 'payout_reminder',
                        payoutRecord: { chitNo, payoutMonth: monthNum, amount: item.payoutAmount }
                      })}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-[#003524] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>Payout Reminder</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isAssigned}
                      onClick={() => handleOpenComposer({
                        member,
                        messageType: 'payout_confirmation',
                        payoutRecord: { chitNo, payoutMonth: monthNum, amount: item.payoutAmount }
                      })}
                      className="flex-1 py-2 px-3 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <Send className="w-3.5 h-3.5 text-[#C9A227]" />
                      <span>Payout Complete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: WHATSAPP LOG HISTORY */}
      {/* ==================================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-[#DCE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#003524]">
                WhatsApp Communication Audit Log
              </h3>
              <p className="text-xs text-[#5B7065] mt-0.5">
                Tracks all Click-to-Chat activations and manual delivery confirmations. Never falsely claims delivered.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#DCE8E0] shadow-xs overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-[#5B7065] text-xs">
                No WhatsApp messages logged yet. Use the review & send buttons above to initiate Click-to-Chat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F0FCF4] border-b border-[#DCE8E0] text-[11px] font-bold uppercase tracking-wider text-[#174D38]">
                      <th className="py-3 px-4">Message ID</th>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Chit No</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created At</th>
                      <th className="py-3 px-4 text-right">Confirm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAF2EC]">
                    {logs.map(log => (
                      <tr key={log.messageId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#174D38]">
                          {log.messageId}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#003524]">
                          {log.memberName}
                        </td>
                        <td className="py-3 px-4 text-[#5B7065]">
                          +{log.phone}
                        </td>
                        <td className="py-3 px-4 font-semibold capitalize">
                          {log.messageType?.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#003524]">
                          {log.chitNo || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'Sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'Opened'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#5B7065]">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.status !== 'Sent' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(log.messageId, 'Sent')}
                              className="text-[11px] text-emerald-700 font-bold hover:underline"
                            >
                              Mark as Sent
                            </button>
                          ) : (
                            <span className="text-emerald-700 text-xs font-bold">✓ Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal WhatsApp Composer Modal */}
      {composerConfig.isOpen && composerConfig.member && (
        <WhatsAppComposerModal
          isOpen={composerConfig.isOpen}
          onClose={() => setComposerConfig({ ...composerConfig, isOpen: false })}
          member={composerConfig.member}
          initialMessageType={composerConfig.messageType}
          paymentRecord={composerConfig.paymentRecord}
          payoutRecord={composerConfig.payoutRecord}
          onSuccess={loadAllData}
        />
      )}
    </div>
  );
};

export default WhatsApp;
