import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';
import { formatINR } from '../../utils/currency';
import { generateChitNumber, getNextAvailableChitNumber } from '../../utils/chitNumber';
import { getChitCapacityStats } from '../../utils/chitCalculations';
import { buildWelcomeMessage, generateWhatsAppUrl, normalizeIndianPhone } from '../../utils/whatsapp';
import {
  Users,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  UserPlus,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';

export const AddMemberToChitModal = ({
  isOpen,
  onClose,
  targetChit = null,
  initialMonth = null,
  onSuccess
}) => {
  const { showToast, refreshChits } = useChit();

  const [members, setMembers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [memberMode, setMemberMode] = useState('existing'); // 'existing' | 'new'
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberMobile, setNewMemberMobile] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || 1);
  const [allowExtraCapacity, setAllowExtraCapacity] = useState(false);

  // Success view state with WhatsApp Click-to-Chat
  const [savedResult, setSavedResult] = useState(null);

  const chit = targetChit || {
    chitId: 'CHIT-100K-01',
    chitName: 'MSR Chit — ₹1,00,000',
    chitValue: 100000,
    totalAmount: 100000,
    duration: 20,
    durationMonths: 20,
    monthlyContribution: 3750,
    monthlyAmount: 3750,
    dividend: 1250,
    startDate: '2026-10-01'
  };

  const duration = Number(chit.duration || chit.durationMonths) || 20;
  const chitValue = Number(chit.chitValue || chit.totalAmount) || 100000;
  const monthlyPay = Number(chit.monthlyContribution || chit.monthlyAmount) || Math.round(chitValue / duration);

  // Load existing members & memberships
  useEffect(() => {
    if (isOpen) {
      setSavedResult(null);
      setAllowExtraCapacity(false);
      const loadData = async () => {
        setLoading(true);
        try {
          const [mList, msList] = await Promise.all([
            api.getMembers(),
            api.getMemberships({ chitId: chit.chitId })
          ]);
          setMembers(mList || []);
          setMemberships(msList || []);

          // Find first available month if no initialMonth passed
          const assignedMonths = new Set(
            (msList || []).map(m => Number(m.payoutMonth)).filter(Boolean)
          );

          if (initialMonth) {
            setSelectedMonth(Number(initialMonth));
          } else {
            let firstAvail = 1;
            for (let m = 1; m <= duration; m++) {
              if (!assignedMonths.has(m)) {
                firstAvail = m;
                break;
              }
            }
            setSelectedMonth(firstAvail);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen, chit.chitId, initialMonth, duration]);

  // Capacity stats
  const capacityStats = useMemo(() => {
    return getChitCapacityStats(chit, memberships);
  }, [chit, memberships]);

  // Existing chit numbers for this group
  const existingChitNos = useMemo(() => {
    return (memberships || []).map(m => String(m.chitNo || '').toUpperCase());
  }, [memberships]);

  // Generated permanent Chit Number for the selected slot
  const generatedChitNo = useMemo(() => {
    return getNextAvailableChitNumber({
      existingChitNumbers: existingChitNos,
      year: 2026,
      chitValue: chitValue,
      durationMonths: duration,
      preferredSlot: selectedMonth
    }).toString();
  }, [existingChitNos, chitValue, duration, selectedMonth]);

  // Month assignment lookup
  const monthMap = useMemo(() => {
    const map = {};
    (memberships || []).forEach(m => {
      const pMonth = Number(m.payoutMonth);
      if (pMonth) {
        if (!map[pMonth]) map[pMonth] = [];
        const memberObj = members.find(mem => String(mem.memberId) === String(m.memberId));
        map[pMonth].push({
          ...m,
          memberName: memberObj ? memberObj.name : (m.memberName || 'Assigned Member')
        });
      }
    });
    return map;
  }, [memberships, members]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (capacityStats.isFull && !allowExtraCapacity) {
      showToast('Chit is already FULL! Check "Add Additional Chit" to override capacity.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let finalMemberId = selectedMemberId;
      let finalMemberName = '';
      let finalMemberMobile = '';

      if (memberMode === 'new') {
        if (!newMemberName.trim()) {
          showToast('Please enter member name', 'error');
          setSubmitting(false);
          return;
        }
        if (!newMemberMobile.trim()) {
          showToast('Please enter member mobile number', 'error');
          setSubmitting(false);
          return;
        }

        const newMem = await api.createMember({
          name: newMemberName.trim(),
          mobile: newMemberMobile.trim(),
          status: 'Active',
          payoutMonth: selectedMonth,
          chitCount: 1
        });
        finalMemberId = newMem.memberId;
        finalMemberName = newMem.name;
        finalMemberMobile = newMem.mobile;
      } else {
        if (!selectedMemberId) {
          showToast('Please select a member', 'error');
          setSubmitting(false);
          return;
        }
        const mem = members.find(m => String(m.memberId) === String(selectedMemberId));
        finalMemberName = mem ? mem.name : 'Member';
        finalMemberMobile = mem ? mem.mobile : '';
      }

      // Create membership record
      const membershipData = {
        memberId: finalMemberId,
        memberName: finalMemberName,
        chitId: chit.chitId,
        chitNo: generatedChitNo,
        chitValue: chitValue,
        durationMonths: duration,
        monthlyPayment: monthlyPay,
        payoutMonth: selectedMonth,
        status: 'Active'
      };

      const result = await api.createMembership(membershipData);

      // Build WhatsApp welcome message
      const welcomeMsg = buildWelcomeMessage({
        memberName: finalMemberName,
        chits: [
          {
            chitNo: generatedChitNo,
            chitValue: chitValue,
            durationMonths: duration,
            monthlyPayment: monthlyPay,
            payoutMonth: selectedMonth
          }
        ]
      });

      const waUrl = generateWhatsAppUrl(finalMemberMobile, welcomeMsg);

      setSavedResult({
        memberId: finalMemberId,
        memberName: finalMemberName,
        phone: finalMemberMobile,
        chitNo: generatedChitNo,
        payoutMonth: selectedMonth,
        monthlyPayment: monthlyPay,
        welcomeMsg,
        waUrl
      });

      showToast(`Chit ${generatedChitNo} (Month ${selectedMonth}) assigned to ${finalMemberName} successfully!`, 'success');
      if (onSuccess) onSuccess();
      await refreshChits();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to assign member to chit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (savedResult?.waUrl) {
      window.open(savedResult.waUrl, '_blank');
      api.logWhatsAppMessage({
        memberId: savedResult.memberId,
        memberName: savedResult.memberName,
        phone: savedResult.phone,
        messageType: 'Welcome',
        chitNo: savedResult.chitNo,
        message: savedResult.welcomeMsg,
        status: 'Opened'
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={savedResult ? "Member Enrolled Successfully!" : "Add Member to Chit Scheme"}
      subtitle={`${chit.chitName} • Duration: ${duration}M`}
      maxWidth="max-w-lg"
    >
      {savedResult ? (
        /* ================= SUCCESS STATE WITH WHATSAPP CLICK-TO-CHAT ================= */
        <div className="space-y-4 py-2">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="text-base font-extrabold text-[#003524]">
              {savedResult.memberName} Enrolled in {chit.chitName}
            </h4>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-emerald-200 text-xs font-mono font-bold text-[#003524]">
              <span>Chit No: {savedResult.chitNo}</span>
              <span>•</span>
              <span>Fixed Payout: Month {savedResult.payoutMonth}</span>
            </div>
          </div>

          {/* WhatsApp Welcome Preview Card */}
          <div className="p-4 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#003524] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                WhatsApp Welcome Message Preview
              </span>
              <span className="text-[10px] font-semibold text-[#5B7065]">
                Click-to-Chat (wa.me)
              </span>
            </div>

            <pre className="text-[11px] font-sans whitespace-pre-wrap bg-white p-3 rounded-lg border border-[#DCE8E0] text-[#131E19] max-h-48 overflow-y-auto leading-relaxed">
              {savedResult.welcomeMsg}
            </pre>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>Send WhatsApp Welcome</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= REGISTRATION FORM ================= */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Capacity Progress Banner */}
          <div className="p-3.5 rounded-xl bg-[#F0FCF4] border border-[#DCE8E0] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#003524]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#174D38]" />
                Enrolled Capacity: {capacityStats.joinedMembers} / {capacityStats.requiredMembers} Members
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                capacityStats.isFull ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {capacityStats.status}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  capacityStats.isFull ? 'bg-amber-500' : 'bg-[#003524]'
                }`}
                style={{ width: `${capacityStats.fillPercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-semibold text-[#5B7065]">
              <span>{capacityStats.remainingSlots} Slots Remaining</span>
              <span>{capacityStats.fillPercentage}% Filled</span>
            </div>

            {capacityStats.isFull && (
              <div className="pt-1 border-t border-[#DCE8E0]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={allowExtraCapacity}
                    onChange={(e) => setAllowExtraCapacity(e.target.checked)}
                    className="rounded text-[#003524] focus:ring-[#003524]"
                  />
                  <span>Add Additional Chit (Override capacity for this group)</span>
                </label>
              </div>
            )}
          </div>

          {/* Generated Chit Number & Installment Preview */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#003524] to-[#174D38] text-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#C9A227] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Permanent Chit Number
              </span>
              <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                Fixed Payout: Month {selectedMonth}
              </span>
            </div>

            <div className="mt-1 text-2xl font-black font-mono tracking-tight text-white">
              {generatedChitNo}
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#C4D9CC]">
              <span>Chit Value: {formatINR(chitValue)}</span>
              <span>Duration: {duration} Months</span>
              <span>Installment: {formatINR(monthlyPay)}/mo</span>
            </div>
          </div>

          {/* Fixed Payout Month Selection */}
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Fixed Payout Month *
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
              required
            >
              {Array.from({ length: duration }, (_, i) => i + 1).map((m) => {
                const assigned = monthMap[m] || [];
                const isAssigned = assigned.length > 0;
                const assignedNames = assigned.map(a => a.memberName).join(', ');

                return (
                  <option key={m} value={m}>
                    Month {m} {isAssigned ? `(Assigned: ${assignedNames})` : '(Available Slot)'}
                  </option>
                );
              })}
            </select>
            <p className="text-[10px] text-[#5B7065] mt-1">
              The assigned payout month permanently belongs to this member's chit.
            </p>
          </div>

          {/* Member Selection Mode Toggle */}
          <div>
            <div className="flex items-center gap-4 mb-2">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#003524]">
                <input
                  type="radio"
                  name="memberMode"
                  checked={memberMode === 'existing'}
                  onChange={() => setMemberMode('existing')}
                  className="text-[#003524] focus:ring-[#003524]"
                />
                Select Existing Member
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#003524]">
                <input
                  type="radio"
                  name="memberMode"
                  checked={memberMode === 'new'}
                  onChange={() => setMemberMode('new')}
                  className="text-[#003524] focus:ring-[#003524]"
                />
                Create New Member
              </label>
            </div>

            {memberMode === 'existing' ? (
              <div>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 bg-white border border-[#DCE8E0] rounded-xl text-xs sm:text-sm font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] min-h-[44px]"
                  required
                >
                  <option value="">— Select Member from Directory —</option>
                  {members.map((m) => {
                    const count = m.chits?.length || 0;
                    return (
                      <option key={m.memberId} value={m.memberId}>
                        {m.name} ({m.mobile}) • {count > 0 ? `${count} Active Chit(s)` : 'No Active Chits'}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F0FCF4] rounded-xl border border-[#DCE8E0]">
                <div>
                  <label className="block text-[11px] font-bold text-[#003524] mb-1">
                    Member Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amma, Mani Mama, MD"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 min-h-[40px]"
                    required={memberMode === 'new'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#003524] mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9840123456"
                    value={newMemberMobile}
                    onChange={(e) => setNewMemberMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-lg text-xs font-semibold text-[#131E19] focus:ring-2 focus:ring-[#003524]/20 min-h-[40px]"
                    required={memberMode === 'new'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAF2EC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (capacityStats.isFull && !allowExtraCapacity)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#003524] hover:bg-[#174D38] rounded-xl shadow-xs transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Save Membership Assignment</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AddMemberToChitModal;
