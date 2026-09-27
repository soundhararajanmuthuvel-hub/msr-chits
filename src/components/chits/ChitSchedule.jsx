import React from 'react';
import { formatINR } from '../../utils/currency';
import { generateChitNumber } from '../../utils/chitNumber';
import { getDefaultPayoutForMonth } from '../../utils/chitCalculations';
import StatusBadge from '../common/StatusBadge';
import { UserCheck, Edit3, Send, IndianRupee, Layers } from 'lucide-react';
import { useChit } from '../../context/ChitContext';

export const ChitSchedule = ({
  schedule = [],
  currentMonth = 2,
  onAssign,
  onPayout,
  onEditPayout,
  onEditMonthlyChit,
  onEditDividend
}) => {
  const { setIsRecordPayoutOpen } = useChit();

  const totalMonthlyAmount = schedule.reduce((sum, item) => sum + (Number(item.monthlyAmount || item.amount) || 0), 0);

  const sanitizePayoutAmount = (rawAmt, monthNum) => {
    const num = Number(rawAmt);
    // If num is less than 10,000, it's a legacy monthly collection amount (e.g. 3,750 or 5,000), not a payout
    if (!num || isNaN(num) || num < 10000) {
      return getDefaultPayoutForMonth(monthNum, 100000, 20, 0);
    }
    return num;
  };

  const getPayoutListForMonth = (item) => {
    if (Array.isArray(item.payouts) && item.payouts.length > 0) {
      return item.payouts.map((po, idx) => ({
        payoutId: po.payoutId || `PO-M${item.month}-${idx + 1}`,
        memberId: po.memberId || '',
        memberName: po.memberName || 'Member',
        chitNo: po.chitNo || item.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: item.month }),
        payoutAmount: sanitizePayoutAmount(po.payoutAmount || po.amount, item.month),
        fundingSource: String(po.fundingSource || '').toUpperCase().includes('EXTRA') ? 'EXTRA_INVESTMENT' : 'CHIT_FUND',
        notes: po.notes || ''
      }));
    }

    // Month 2 Multiple Payouts: Amma (₹70k CHIT_FUND) and MU (₹50k EXTRA_INVESTMENT)
    if (item.month === 2 && (item.assignedMemberName === 'Amma + MU' || item.assignedMemberName === 'Amma' || !item.assignedMemberName)) {
      return [
        {
          payoutId: 'PO-M2-01',
          memberId: 'MEM-001',
          memberName: 'Amma',
          chitNo: item.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: 2 }),
          payoutAmount: sanitizePayoutAmount(item.payoutAmount, 2),
          fundingSource: 'CHIT_FUND',
          notes: 'Chit Fund Allocation'
        },
        {
          payoutId: 'PO-M2-02',
          memberId: 'MEM-003',
          memberName: 'MU',
          chitNo: 'MSR261L02-B',
          payoutAmount: 50000,
          fundingSource: 'EXTRA_INVESTMENT',
          notes: 'Extra Investment Allocation'
        }
      ];
    }

    const amt = sanitizePayoutAmount(item.payoutAmount, item.month);
    return [
      {
        payoutId: item.scheduleId || `PO-M${item.month}`,
        memberId: item.assignedMemberId || '',
        memberName: (item.assignedMemberName && item.assignedMemberName !== 'Not Assigned') ? item.assignedMemberName : (item.month === 1 ? 'Soundhararajan M' : 'Member'),
        chitNo: item.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: item.month }),
        payoutAmount: amt,
        fundingSource: 'CHIT_FUND',
        notes: item.notes || ''
      }
    ];
  };

  return (
    <div className="bg-white rounded-xl border border-[#DCE8E0] shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#DCE8E0] bg-[#F0FCF4]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#003524]">
            Master {schedule.length || 20}-Month Chit Schedule
          </h3>
          <p className="text-xs text-[#5B7065]">
            MSR Core Formula: (Payout + Commission) ÷ Members = Monthly Chit Collection per Member
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-white px-3 py-1.5 rounded-lg border border-[#DCE8E0] shadow-xs">
            <span className="text-[#5B7065]">Total {schedule.length || 20}M Contribution: </span>
            <span className="font-extrabold text-[#003524]">{formatINR(totalMonthlyAmount)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F0FCF4] border-b border-[#DCE8E0] text-[11px] font-bold uppercase tracking-wider text-[#174D38]">
              <th className="py-3.5 px-4">Month</th>
              <th className="py-3.5 px-4">Monthly Chit</th>
              <th className="py-3.5 px-4">Commission</th>
              <th className="py-3.5 px-4">Dividend</th>
              <th className="py-3.5 px-4">Payout</th>
              <th className="py-3.5 px-4">Chit No</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Assigned Member</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAF2EC] text-xs sm:text-sm">
            {schedule.map((item) => {
              const isCurrent = item.month === currentMonth;
              const isCompleted = item.month < currentMonth;
              const permanentChitNo = item.chitNo || generateChitNumber({ year: 2026, chitValue: 100000, sequenceNumber: item.month });
              const payoutList = getPayoutListForMonth(item);
              const commVal = Number(item.commissionAmount || item.commission) || 5000;
              const monthlyAmt = Number(item.monthlyAmount || item.amount) || 5000;
              const dividendVal = item.dividend !== undefined && item.dividend !== null
                ? Number(item.dividend)
                : Math.max(0, 5000 - monthlyAmt);

              return (
                <tr
                  key={item.month}
                  className={`transition-colors duration-150 ${
                    isCurrent
                      ? 'bg-[#F0FCF4] font-semibold text-[#003524] ring-1 ring-inset ring-[#C9A227]/40'
                      : 'hover:bg-[#F0FCF4]/40 text-[#131E19]'
                  }`}
                >
                  {/* Month */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isCurrent
                            ? 'bg-[#003524] text-white ring-2 ring-[#C9A227]'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.month}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#003524]">Month {item.month}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-extrabold uppercase">
                              Current
                            </span>
                          )}
                        </div>
                        {item.monthName && (
                          <span className="text-[11px] font-semibold text-[#174D38] block">
                            {item.monthName}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="text-[10px] text-[#5B7065] block font-mono">
                            Due: {item.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Monthly Chit Amount with Edit Trigger */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#003524]">
                        {formatINR(monthlyAmt)}
                      </span>
                      {onEditMonthlyChit && (
                        <button
                          type="button"
                          onClick={() => onEditMonthlyChit(item)}
                          title={`Edit Month ${item.month} Monthly Chit`}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-[#174D38] bg-white hover:bg-[#DCE8E0] rounded border border-[#DCE8E0] transition-colors inline-flex items-center gap-0.5"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Commission Amount */}
                  <td className="py-3.5 px-4 font-semibold text-[#5B7065]">
                    {formatINR(commVal)}
                  </td>

                  {/* Dividend with Edit Trigger */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-amber-900">
                        {dividendVal > 0 ? formatINR(dividendVal) : '₹0'}
                      </span>
                      {onEditDividend && (
                        <button
                          type="button"
                          onClick={() => onEditDividend({ ...item, dividend: dividendVal })}
                          title={`Edit Month ${item.month} Dividend`}
                          className="px-1.5 py-0.5 text-[10px] font-bold text-[#174D38] bg-white hover:bg-[#DCE8E0] rounded border border-[#DCE8E0] transition-colors inline-flex items-center gap-0.5"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Payout / Disbursement Column */}
                  <td className="py-3.5 px-4 font-semibold text-[#131E19]">
                    {payoutList.length > 1 ? (
                      <div className="space-y-1.5 py-0.5">
                        {payoutList.map((po, idx) => (
                          <div
                            key={po.payoutId || idx}
                            className="flex items-center justify-between gap-2 p-1.5 bg-[#F8FAF9] rounded-lg border border-[#DCE8E0]"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#003524] text-xs">
                                {po.memberName}:
                              </span>
                              <span className="font-extrabold text-[#003524]">
                                {formatINR(po.payoutAmount)}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase border ${
                                  po.fundingSource === 'EXTRA_INVESTMENT'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {po.fundingSource === 'EXTRA_INVESTMENT' ? 'EXTRA INVESTMENT' : 'CHIT FUND'}
                              </span>
                            </div>
                            {onEditPayout && (
                              <button
                                type="button"
                                onClick={() =>
                                  onEditPayout({
                                    ...item,
                                    ...po,
                                    month: item.month,
                                    chitNo: po.chitNo,
                                    payoutAmount: po.payoutAmount,
                                    memberName: po.memberName,
                                    assignedMemberName: po.memberName,
                                    fundingSource: po.fundingSource
                                  })
                                }
                                title={`Edit ${po.memberName}'s Month ${item.month} Payout`}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-[#174D38] bg-white hover:bg-[#DCE8E0] rounded border border-[#DCE8E0] transition-colors inline-flex items-center gap-0.5"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : payoutList.length === 1 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#003524]">
                          {formatINR(payoutList[0].payoutAmount)}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase border ${
                            payoutList[0].fundingSource === 'EXTRA_INVESTMENT'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {payoutList[0].fundingSource === 'EXTRA_INVESTMENT' ? 'EXTRA INVESTMENT' : 'CHIT FUND'}
                        </span>
                        {onEditPayout && (
                          <button
                            type="button"
                            onClick={() =>
                              onEditPayout({
                                ...item,
                                ...payoutList[0],
                                month: item.month,
                                chitNo: payoutList[0].chitNo,
                                payoutAmount: payoutList[0].payoutAmount,
                                memberName: payoutList[0].memberName,
                                assignedMemberName: payoutList[0].memberName,
                                fundingSource: payoutList[0].fundingSource
                              })
                            }
                            title={`Edit Month ${item.month} Payout Amount`}
                            className="px-1.5 py-0.5 text-[10px] font-bold text-[#174D38] bg-[#F0FCF4] hover:bg-[#DCE8E0] rounded border border-[#DCE8E0] transition-colors inline-flex items-center gap-0.5"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#5B7065] italic text-xs">—</span>
                    )}
                  </td>

                  {/* Permanent Chit No */}
                  <td className="py-3.5 px-4">
                    {payoutList.length > 1 ? (
                      <div className="space-y-1">
                        {payoutList.map((po, idx) => (
                          <div key={idx}>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#003524] border border-emerald-200 text-xs font-mono font-bold block w-fit">
                              {po.chitNo}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#003524] border border-emerald-200 text-xs font-mono font-bold">
                        {permanentChitNo}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <StatusBadge
                      status={
                        isCurrent
                          ? 'Active'
                          : isCompleted
                          ? 'Completed'
                          : 'Upcoming'
                      }
                    />
                  </td>

                  {/* Assigned Member */}
                  <td className="py-3.5 px-4">
                    {payoutList.length > 1 ? (
                      <div className="space-y-1 py-0.5">
                        {payoutList.map((po, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="font-bold text-[#003524] text-xs">
                              {po.memberName}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1 py-0.2 rounded border ${
                                po.fundingSource === 'EXTRA_INVESTMENT'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {po.fundingSource === 'EXTRA_INVESTMENT' ? 'Extra Inv' : 'Chit Fund'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : payoutList.length === 1 && payoutList[0].memberName !== 'Not Assigned' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#003524]">
                          {payoutList[0].memberName}
                        </span>
                      </div>
                    ) : item.assignedMemberName && item.assignedMemberName !== 'Not Assigned' && item.assignedMemberName !== 'Amma + MU' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#003524]">
                          {item.assignedMemberName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#5B7065] italic text-xs">
                        Not Assigned
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onAssign && onAssign(item)}
                        title="Assign / Reassign Member"
                        className="p-1.5 text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors flex items-center gap-1 text-xs font-semibold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Assign</span>
                      </button>

                      {onEditMonthlyChit && (
                        <button
                          type="button"
                          onClick={() => onEditMonthlyChit(item)}
                          title={`Edit Month ${item.month} Monthly Chit`}
                          className="p-1.5 text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <IndianRupee className="w-3.5 h-3.5 text-[#174D38]" />
                          <span className="hidden sm:inline">Edit Monthly</span>
                        </button>
                      )}

                      {onEditDividend && (
                        <button
                          type="button"
                          onClick={() => onEditDividend({ ...item, dividend: dividendVal })}
                          title={`Edit Month ${item.month} Dividend`}
                          className="p-1.5 text-amber-800 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                          <span className="hidden sm:inline">Edit Dividend</span>
                        </button>
                      )}

                      {onEditPayout && (
                        <button
                          type="button"
                          onClick={() => onEditPayout(item)}
                          title={`Edit Month ${item.month} Payout Amount`}
                          className="p-1.5 text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <IndianRupee className="w-3.5 h-3.5 text-[#174D38]" />
                          <span className="hidden sm:inline">Edit Payout</span>
                        </button>
                      )}

                      {isCurrent && (
                        <button
                          type="button"
                          onClick={() => onPayout ? onPayout(item) : setIsRecordPayoutOpen(true)}
                          title="Record Payout for this Month"
                          className="p-1.5 bg-[#003524] hover:bg-[#174D38] text-white rounded-lg shadow-xs transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          <Send className="w-3.5 h-3.5 text-[#C9A227]" />
                          <span className="hidden sm:inline">Payout</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#F0FCF4] border-t-2 border-[#DCE8E0] text-xs sm:text-sm font-bold text-[#003524]">
              <td className="py-4 px-4 uppercase tracking-wider">
                Total ({schedule.length || 20} Months)
              </td>
              <td className="py-4 px-4 text-base font-extrabold text-[#003524]">
                {formatINR(totalMonthlyAmount || 0)}
              </td>
              <td className="py-4 px-4 font-bold text-[#5B7065]">
                {formatINR(schedule.reduce((sum, item) => sum + (Number(item.commissionAmount || item.commission) || 5000), 0))}
              </td>
              <td className="py-4 px-4 font-bold text-amber-900">
                {formatINR(schedule.reduce((sum, item) => sum + (Number(item.dividend) || Math.max(0, 5000 - (Number(item.monthlyAmount || item.amount) || 5000))), 0))}
              </td>
              <td className="py-4 px-4" colSpan={5}>
                <span className="text-xs font-normal text-[#5B7065]">
                  Full {schedule.length || 20}-month contribution sum across all members
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ChitSchedule;
