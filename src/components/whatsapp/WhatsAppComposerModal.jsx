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
  Sparkles
} from 'lucide-react';
import {
  normalizeIndianPhone,
  isValidWhatsAppPhone,
  generateWhatsAppUrl,
  buildWelcomeMessage,
  buildPaymentReminderMessage,
  buildPaymentConfirmationMessage,
  buildPayoutDetailMessage,
  buildPayoutReminderMessage,
  buildPayoutConfirmationMessage
} from '../../utils/whatsapp';
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

  const [messageType, setMessageType] = useState(initialMessageType);
  const [selectedChitNo, setSelectedChitNo] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [openedStatus, setOpenedStatus] = useState('Prepared'); // 'Prepared' | 'Opened' | 'Sent'
  const [loggedMessageId, setLoggedMessageId] = useState(null);

  // Normalize member phone
  const rawPhone = member?.mobile || member?.phone || '';
  const normalizedPhone = useMemo(() => normalizeIndianPhone(rawPhone), [rawPhone]);
  const hasValidPhone = useMemo(() => isValidWhatsAppPhone(rawPhone), [rawPhone]);

  // Member's chits
  const memberChits = useMemo(() => {
    if (!member) return [];
    if (member.chits && member.chits.length > 0) return member.chits;
    if (member.assignedMonths && member.assignedMonths.length > 0) {
      return member.assignedMonths.map(m => ({
        chitNo: `MSR261L${String(m).padStart(2, '0')}`,
        payoutMonth: m,
        chitValue: 100000,
        durationMonths: 20,
        monthlyPayment: 3750,
        status: 'Active'
      }));
    }
    return [];
  }, [member]);

  // Set default selected chit on open
  useEffect(() => {
    if (isOpen) {
      setMessageType(initialMessageType);
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
  }, [isOpen, member, initialMessageType, paymentRecord, payoutRecord, memberChits]);

  // Generate dynamic message content whenever dependencies change
  useEffect(() => {
    if (!isOpen || !member) return;

    let msg = '';
    const memberName = member.name || 'Member';

    switch (messageType) {
      case 'welcome':
        msg = buildWelcomeMessage({
          memberName,
          chits: memberChits
        });
        break;

      case 'reminder':
        msg = buildPaymentReminderMessage({
          memberName,
          chits: memberChits,
          currentMonth: activeChit?.currentMonth || 2
        });
        break;

      case 'payment_confirmation': {
        const chit = memberChits.find(c => c.chitNo === selectedChitNo) || memberChits[0] || {};
        msg = buildPaymentConfirmationMessage({
          memberName,
          chitNo: paymentRecord?.chitNo || chit.chitNo || selectedChitNo || 'MSR261L01',
          month: paymentRecord?.month || paymentRecord?.monthNumber || activeChit?.currentMonth || 2,
          durationMonths: chit.durationMonths || 20,
          amount: paymentRecord?.amount || paymentRecord?.paidAmount || chit.monthlyPayment || 3750,
          paymentDate: paymentRecord?.paymentDate || new Date().toISOString().split('T')[0]
        });
        break;
      }

      case 'payout_detail': {
        const chit = memberChits.find(c => c.chitNo === selectedChitNo) || memberChits[0] || {};
        msg = buildPayoutDetailMessage({
          memberName,
          chitNo: chit.chitNo || selectedChitNo || 'MSR261L01',
          chitValue: chit.chitValue || 100000,
          payoutMonth: chit.payoutMonth || 2
        });
        break;
      }

      case 'payout_reminder': {
        const chit = memberChits.find(c => c.chitNo === selectedChitNo) || memberChits[0] || {};
        msg = buildPayoutReminderMessage({
          memberName,
          chitNo: chit.chitNo || selectedChitNo || 'MSR261L01',
          chitValue: chit.chitValue || 100000,
          payoutMonth: chit.payoutMonth || 2
        });
        break;
      }

      case 'payout_confirmation': {
        const chit = memberChits.find(c => c.chitNo === selectedChitNo) || memberChits[0] || {};
        msg = buildPayoutConfirmationMessage({
          memberName,
          chitNo: payoutRecord?.chitNo || chit.chitNo || selectedChitNo || 'MSR261L01',
          payoutMonth: payoutRecord?.month || payoutRecord?.monthNumber || chit.payoutMonth || 2,
          actualPayoutAmount: payoutRecord?.amount || 0,
          payoutDate: payoutRecord?.payoutDate || new Date().toISOString().split('T')[0]
        });
        break;
      }

      default:
        msg = buildWelcomeMessage({ memberName, chits: memberChits });
    }

    setCustomMessage(msg);
  }, [messageType, member, selectedChitNo, memberChits, paymentRecord, payoutRecord, activeChit, isOpen]);

  const handleCopy = () => {
    if (!customMessage) return;
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    showToast('Message copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = async () => {
    if (!hasValidPhone) {
      showToast('Phone number required to open WhatsApp Click-to-Chat', 'error');
      return;
    }

    const waUrl = generateWhatsAppUrl(normalizedPhone, customMessage);
    if (!waUrl) {
      showToast('Could not generate WhatsApp Click-to-Chat URL', 'error');
      return;
    }

    try {
      // Log to WhatsAppLog (Status: 'Opened') - Never falsely claim "Sent"
      const logEntry = await api.logWhatsAppMessage({
        memberId: member.memberId,
        memberName: member.name,
        phone: normalizedPhone,
        messageType: messageType,
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

      // Open WhatsApp Click-to-Chat in new tab/window
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
      title="WhatsApp Member Message"
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

          {/* Chit Count Badge */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white px-3 py-1.5 rounded-lg border border-[#DCE8E0]">
            <Layers className="w-4 h-4 text-[#174D38]" />
            <span className="font-bold text-[#003524]">
              {memberChits.length} {memberChits.length === 1 ? 'Chit' : 'Chits'}
            </span>
          </div>
        </div>

        {/* Missing Phone Warning */}
        {!hasValidPhone && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Phone number required</span>
              <span>
                This member does not have a valid 10-digit Indian phone number recorded. Please update their profile before sending WhatsApp messages.
              </span>
            </div>
          </div>
        )}

        {/* Message Type Selector */}
        <div>
          <label className="block text-xs font-bold text-[#003524] mb-1.5">
            Select Message Category *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'welcome', label: '👋 Welcome Message' },
              { id: 'reminder', label: '🔔 Payment Reminder' },
              { id: 'payment_confirmation', label: '💰 Payment Received' },
              { id: 'payout_detail', label: '🎯 Payout Details' },
              { id: 'payout_reminder', label: '⏰ Payout Reminder' },
              { id: 'payout_confirmation', label: '🎉 Payout Complete' }
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setMessageType(type.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-left truncate min-h-[44px] ${
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

        {/* Assigned Chit Selector (When relevant) */}
        {memberChits.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-[#003524] mb-1">
              Active Member Chits
            </label>
            <div className="flex flex-wrap gap-2">
              {memberChits.map(chit => {
                const isSelected = selectedChitNo === chit.chitNo;
                return (
                  <button
                    key={chit.chitNo}
                    type="button"
                    onClick={() => setSelectedChitNo(chit.chitNo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 min-h-[36px] ${
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

        {/* Editable Message Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[#003524]">
              Message Text (Editable before opening)
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
            rows={10}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-[#DCE8E0] rounded-xl text-[#131E19] focus:bg-white focus:ring-2 focus:ring-[#003524]/20 focus:border-[#003524] transition-colors leading-relaxed"
            placeholder="Type or customize your WhatsApp message..."
          />
          <p className="text-[10px] text-[#5B7065] mt-1">
            This message will be URL-encoded and pre-filled into WhatsApp Click-to-Chat.
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
