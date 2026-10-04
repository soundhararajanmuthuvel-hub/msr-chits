import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import {
  MessageSquare,
  Phone,
  Layers,
  Send,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Receipt,
  Globe
} from 'lucide-react';
import {
  normalizeIndianPhone,
  isValidWhatsAppPhone,
  generateWhatsAppUrl,
  normalizeLanguage,
  buildWelcomeMessage,
  buildPaymentReminderMessage,
  buildPaymentConfirmationMessage,
  buildPayoutDetailMessage,
  buildPayoutConfirmationMessage
} from '../../utils/whatsapp';
import {
  generateChitSchedule,
  getCurrentChitMonth
} from '../../utils/chitCalculations';
import { formatINR } from '../../utils/currency';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';

export const WhatsAppComposerModal = ({
  isOpen,
  onClose,
  member = null,
  initialMessageType = 'welcome',
  paymentRecord = null,
  payoutRecord = null,
  onSuccess
}) => {
  const { activeChit, showToast } = useChit();

  const [language, setLanguage] = useState('English'); // 'English' | 'Tamil'
  const [messageType, setMessageType] = useState(initialMessageType);
  const [selectedChitNo, setSelectedChitNo] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [openedStatus, setOpenedStatus] = useState('Prepared'); // 'Prepared' | 'Opened' | 'Sent'
  const [loggedMessageId, setLoggedMessageId] = useState(null);
  const [settings, setSettings] = useState(null);

  // Normalize member phone
  const rawPhone = member?.mobile || member?.phone || '';
  const normalizedPhone = useMemo(() => normalizeIndianPhone(rawPhone), [rawPhone]);
  const hasValidPhone = useMemo(() => isValidWhatsAppPhone(rawPhone), [rawPhone]);

  useEffect(() => {
    api.getSettings().then(s => setSettings(s)).catch(() => {});
  }, []);

  // Filter member's active chits (exclude cancelled/inactive)
  const memberChits = useMemo(() => {
    if (!member) return [];
    let list = [];
    if (member.chits && member.chits.length > 0) {
      list = member.chits;
    } else if (member.assignedMonths && member.assignedMonths.length > 0) {
      const chitVal = Number(activeChit?.chitValue || activeChit?.totalAmount || 100000);
      const monthlyPay = Number(activeChit?.monthlyContribution || activeChit?.monthlyAmount || 0);
      list = member.assignedMonths.map(m => ({
        chitNo: `MSR261L${String(m).padStart(2, '0')}`,
        payoutMonth: m,
        chitValue: chitVal,
        durationMonths: activeChit?.duration || 20,
        monthlyPayment: monthlyPay,
        status: 'Active'
      }));
    }
    return list.filter(c => {
      const s = String(c?.status || '').toUpperCase();
      return s !== 'CANCELLED' && s !== 'INACTIVE';
    });
  }, [member, activeChit]);

  // Generate master monthly schedule and installment data
  const scheduleData = useMemo(() => {
    const chitObj = activeChit || {
      chitValue: 100000,
      duration: 20,
      totalMembers: 20,
      startDate: '2026-10-01',
      paymentDay: 20,
      commissionPercent: 5,
      dividend: 0
    };

    const sched = generateChitSchedule({
      chitId: chitObj.chitId || 'CHIT-100K-01',
      chitValue: chitObj.chitValue || 100000,
      multiple: chitObj.multiple || 1,
      duration: chitObj.duration || 20,
      totalMembers: chitObj.totalMembers || 20,
      commissionPercent: chitObj.commissionPercent || 5,
      dividend: chitObj.dividend || 0,
      startDate: chitObj.startDate || '2026-10-01',
      paymentDay: chitObj.paymentDay || 20
    });

    const currentMonthNum = getCurrentChitMonth(chitObj, new Date());
    const currentItem = sched.find(s => Number(s.month || s.monthNumber) === currentMonthNum) || sched[0] || {};
    
    // Quick month -> amount lookup table
    const monthScheduleMap = {};
    sched.forEach(s => {
      monthScheduleMap[s.month] = Number(s.monthlyAmount || s.amount) || 3750;
    });

    // Calculate total due across all member active chits for this month
    const totalDue = memberChits.reduce((sum, chit) => {
      const chitMonth = Number(chit.currentMonth || currentMonthNum);
      const amountForMonth = monthScheduleMap[chitMonth] || (chitMonth === 1 ? 5000 : 3750);
      const paid = Number(chit.paidAmount || 0);
      return sum + Math.max(0, amountForMonth - paid);
    }, 0);

    return {
      schedule: sched,
      currentMonthNum,
      monthName: currentItem.monthName || `Month ${currentMonthNum}`,
      dueDate: currentItem.dueDate ? `${currentItem.dueDate.split('-')[2]} ${currentItem.monthNameShort}` : `20th of Month ${currentMonthNum}`,
      monthScheduleMap,
      totalDue
    };
  }, [activeChit, memberChits]);

  // Set initial state on modal open
  useEffect(() => {
    if (isOpen) {
      // Preference priority: Member preferred language -> Settings default -> 'English'
      const memberPref = member?.preferredLanguage || member?.preferredWhatsAppLanguage || member?.language;
      const defaultPref = memberPref || settings?.defaultLanguage || settings?.whatsappLanguage || 'English';
      setLanguage(normalizeLanguage(defaultPref) === 'ta' ? 'Tamil' : 'English');

      // Map any incoming message type to our standard 5 types
      let normalizedType = initialMessageType;
      if (normalizedType === 'payout_reminder') normalizedType = 'payout_detail';
      setMessageType(normalizedType);

      setOpenedStatus('Prepared');
      setLoggedMessageId(null);
      setCopied(false);

      if (paymentRecord?.chitNo) {
        setSelectedChitNo(paymentRecord.chitNo);
      } else if (payoutRecord?.chitNo) {
        setSelectedChitNo(payoutRecord.chitNo);
      } else if (memberChits.length > 0) {
        setSelectedChitNo(memberChits[0].chitNo);
      } else {
        setSelectedChitNo('');
      }
    }
  }, [isOpen, member, initialMessageType, paymentRecord, payoutRecord, memberChits, settings]);

  // Generate dynamic message content whenever dependencies change
  useEffect(() => {
    if (!isOpen || !member) return;

    let msg = '';
    const memberName = member.name || 'Member';
    const langCode = normalizeLanguage(language);
    const upiId = settings?.upiId || settings?.configuredUPI || 'msrchits@okhdfcbank';

    switch (messageType) {
      case 'welcome':
        msg = buildWelcomeMessage({
          memberName,
          chits: memberChits,
          chitNo: selectedChitNo || (memberChits[0]?.chitNo || ''),
          language: langCode
        });
        break;

      case 'reminder':
        msg = buildPaymentReminderMessage({
          memberName,
          chits: memberChits,
          chitNo: selectedChitNo || (memberChits[0]?.chitNo || ''),
          currentMonth: scheduleData.currentMonthNum,
          month: scheduleData.currentMonthNum,
          monthName: scheduleData.monthName,
          dueDate: scheduleData.dueDate,
          monthSchedule: scheduleData.monthScheduleMap,
          upiId: upiId,
          language: langCode
        });
        break;

      case 'payment_confirmation': {
        const chit = memberChits.find(c => c.chitNo === selectedChitNo) || memberChits[0] || {};
        const payMonth = paymentRecord?.month || paymentRecord?.monthNumber || scheduleData.currentMonthNum || 1;
        const expectedAmt = scheduleData.monthScheduleMap[payMonth] || (payMonth === 1 ? 5000 : 3750);
        
        msg = buildPaymentConfirmationMessage({
          memberName,
          chitNo: paymentRecord?.chitNo || chit.chitNo || selectedChitNo || 'MSR261L01',
          month: payMonth,
          amount: paymentRecord?.amount || paymentRecord?.paidAmount || expectedAmt,
          paidAmount: paymentRecord?.paidAmount || paymentRecord?.amount || expectedAmt,
          paymentDate: paymentRecord?.paymentDate || new Date().toISOString().split('T')[0],
          language: langCode
        });
        break;
      }

      case 'payout_detail': {
        const chit = memberChits.find(c => c.chitNo === selectedChitNo) || memberChits[0] || {};
        const pMonth = payoutRecord?.month || payoutRecord?.payoutMonth || chit.payoutMonth || 1;
        const schItem = scheduleData.schedule.find(s => Number(s.month || s.monthNumber) === Number(pMonth));
        const schedAmt = payoutRecord?.scheduledAmount || schItem?.payoutAmount || chit.chitValue || 75000;

        msg = buildPayoutDetailMessage({
          memberName,
          chitNo: payoutRecord?.chitNo || chit.chitNo || selectedChitNo || 'MSR261L01',
          month: pMonth,
          scheduledAmount: schedAmt,
          language: langCode
        });
        break;
      }

      case 'payout_confirmation': {
        const chit = memberChits.find(c => c.chitNo === selectedChitNo) || memberChits[0] || {};
        const pMonth = payoutRecord?.month || payoutRecord?.monthNumber || chit.payoutMonth || 1;
        
        msg = buildPayoutConfirmationMessage({
          memberName,
          chitNo: payoutRecord?.chitNo || chit.chitNo || selectedChitNo || 'MSR261L01',
          month: pMonth,
          actualAmount: payoutRecord?.amount || payoutRecord?.actualAmount || payoutRecord?.payoutAmount || 70000,
          fundingSource: payoutRecord?.fundingSource || 'CHIT_FUND',
          language: langCode
        });
        break;
      }

      default:
        msg = buildWelcomeMessage({ memberName, chits: memberChits, language: langCode });
    }

    setCustomMessage(msg);
  }, [messageType, language, member, selectedChitNo, memberChits, paymentRecord, payoutRecord, isOpen, settings, scheduleData]);

  const handleCopy = () => {
    if (!customMessage) return;
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    showToast('Message copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = async () => {
    if (!hasValidPhone) {
      showToast('Valid Indian phone number required to open WhatsApp Click-to-Chat', 'error');
      return;
    }

    const waUrl = generateWhatsAppUrl(normalizedPhone, customMessage);
    if (!waUrl) {
      showToast('Could not generate WhatsApp Click-to-Chat URL', 'error');
      return;
    }

    try {
      // Log to WhatsAppLog (Status: 'Opened') - Never claim 'Sent' until confirmed
      const logEntry = await api.logWhatsAppMessage({
        memberId: member.memberId,
        memberName: member.name,
        phone: normalizedPhone,
        messageType: messageType,
        language: language === 'Tamil' ? 'Tamil' : 'English',
        chitNo: selectedChitNo || (memberChits[0]?.chitNo || ''),
        message: customMessage,
        relatedPaymentId: paymentRecord?.paymentId || '',
        relatedPayoutId: payoutRecord?.payoutId || '',
        status: 'Opened'
      });

      if (logEntry?.messageId) {
        setLoggedMessageId(logEntry.messageId);
      }

      setOpenedStatus('Opened');

      // Open WhatsApp Click-to-Chat
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      showToast('Opening WhatsApp Click-to-Chat...', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to log WhatsApp interaction:', err);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMarkAsSent = async () => {
    if (loggedMessageId) {
      await api.updateWhatsAppStatus(loggedMessageId, 'Sent');
    }
    setOpenedStatus('Sent');
    showToast('Marked as Sent in WhatsApp Log', 'success');
  };

  if (!isOpen || !member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp Message Preview"
      subtitle={`${member.name} • ${member.memberId}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Member & Phone Status Banner */}
        <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F0FCF4] border-[#DCE8E0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#003524] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {member.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#003524] text-sm sm:text-base">
                  {member.name}
                </span>
                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#DCE8E0] text-[#174D38]">
                  {member.memberId}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#5B7065] mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                {hasValidPhone ? (
                  <span className="font-semibold text-[#131E19]">
                    +{normalizedPhone}
                  </span>
                ) : (
                  <span className="text-amber-800 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Phone number required
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Language Toggle Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#DCE8E0] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setLanguage('English')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                language === 'English'
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#4B6358] hover:bg-[#F0FCF4]'
              }`}
            >
              <span>English</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('Tamil')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                language === 'Tamil'
                  ? 'bg-[#003524] text-white shadow-xs'
                  : 'text-[#4B6358] hover:bg-[#F0FCF4]'
              }`}
            >
              <span>தமிழ்</span>
            </button>
          </div>
        </div>

        {/* Missing Phone Warning */}
        {!hasValidPhone && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Phone number required</span>
              <span>
                This member does not have a valid 10-digit Indian phone number. Please update their profile before sending WhatsApp messages.
              </span>
            </div>
          </div>
        )}

        {/* 5 Main Message Types */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1.5">
            Message Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'welcome', label: language === 'Tamil' ? '👋 வரவேற்பு' : '👋 Welcome' },
              { id: 'reminder', label: language === 'Tamil' ? '🔔 மாத தவணை' : '🔔 Payment Reminder' },
              { id: 'payment_confirmation', label: language === 'Tamil' ? '💰 பணம் பெறப்பட்டது' : '💰 Payment Received' },
              { id: 'payout_detail', label: language === 'Tamil' ? '🎯 பணம் பெறும் விவரம்' : '🎯 Payout Info' },
              { id: 'payout_confirmation', label: language === 'Tamil' ? '🎉 பணம் வழங்கப்பட்டது' : '🎉 Payout Complete' }
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setMessageType(type.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-left truncate min-h-[40px] ${
                  messageType === type.id
                    ? 'bg-[#003524] text-white shadow-xs'
                    : 'bg-white text-[#4B6358] border border-[#DCE8E0] hover:bg-[#F0FCF4]'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Chit Selector (When member has multiple active chits and single-chit message is selected) */}
        {messageType !== 'reminder' && memberChits.length > 1 && (
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Select Specific Chit
            </label>
            <div className="flex flex-wrap gap-2">
              {memberChits.map(chit => {
                const isSelected = selectedChitNo === chit.chitNo;
                return (
                  <button
                    key={chit.chitNo}
                    type="button"
                    onClick={() => setSelectedChitNo(chit.chitNo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 min-h-[34px] ${
                      isSelected
                        ? 'bg-[#174D38] text-white ring-2 ring-[#C9A227]'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-[#DCE8E0]'
                    }`}
                  >
                    <span>{chit.chitNo}</span>
                    <span className="text-[10px] font-sans font-normal opacity-90">
                      (Month {chit.payoutMonth})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Editable Message Preview Box */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[#003524] flex items-center gap-1.5">
              <span>Message Preview (Editable)</span>
              <span className="text-[10px] font-normal text-[#5B7065]">
                • {language === 'Tamil' ? 'தமிழ்' : 'English'}
              </span>
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-[#174D38] hover:underline font-semibold flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
          <textarea
            rows={8}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-3 font-sans text-xs bg-slate-50 border border-[#DCE8E0] rounded-xl text-[#131E19] focus:bg-white focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] transition-colors leading-relaxed"
            placeholder="Prepare WhatsApp message..."
          />
          <p className="text-[10px] text-[#5B7065] mt-1">
            Tamil Unicode and English text are safely encoded for WhatsApp Click-to-Chat.
          </p>
        </div>

        {/* Status Tracker & Actions */}
        <div className="pt-3 border-t border-[#EAF2EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5B7065]">Status:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                openedStatus === 'Sent'
                  ? 'bg-emerald-100 text-emerald-800'
                  : openedStatus === 'Opened'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {openedStatus}
            </span>

            {openedStatus === 'Opened' && (
              <button
                type="button"
                onClick={handleMarkAsSent}
                className="text-xs text-emerald-700 hover:underline font-bold ml-2 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark as Sent</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#4B6358] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[44px]"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!hasValidPhone}
              onClick={handleOpenWhatsApp}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 min-h-[44px] ${
                hasValidPhone
                  ? 'bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
              title={hasValidPhone ? 'Open WhatsApp Click-to-Chat' : 'Phone number required'}
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Open WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppComposerModal;
