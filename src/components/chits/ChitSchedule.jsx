import React from 'react';
import { formatINR } from '../../utils/currency';
import { generateChitNumber } from '../../utils/chitNumber';
import StatusBadge from '../common/StatusBadge';
import { UserCheck, Edit3, Send } from 'lucide-react';
import { useChit } from '../../context/ChitContext';

export const ChitSchedule = ({ schedule = [], currentMonth = 2, onAssign, onPayout }) => {
  const { setIsRecordPayoutOpen } = useChit();

  const totalMonthlyAmount = schedule.reduce((sum, item) => sum + (Number(item.monthlyAmount) || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-[#DCE8E0] shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#DCE8E0] bg-[#F0FCF4]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#003524]">
            Master 20-Month Chit Schedule
          </h3>
          <p className="text-xs text-[#5B7065]">
            Complete installment amounts, payout dividends, and member assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-white px-3 py-1.5 rounded-lg border border-[#DCE8E0] shadow-xs">
            <span className="text-[#5B7065]">Total 20M Contribution: </span>
            <span className="font-extrabold text-[#003524]">{formatINR(totalMonthlyAmount || 88825)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F0FCF4] border-b border-[#DCE8E0] text-[11px] font-bold uppercase tracking-wider text-[#174D38]">
              <th className="py-3.5 px-4">Month</th>
              <th className="py-3.5 px-4">Monthly Chit</th>
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
              const isAssigned = item.assignedMemberName && item.assignedMemberName !== 'Not Assigned';
              const permanentChitNo = item.chitNo || generateChitNumber(100000, 2026, item.month);

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
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          isCurrent
                            ? 'bg-[#003524] text-white'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.month}
                      </span>
                      <span>Month {item.month}</span>
                    </div>
                  </td>

                  {/* Monthly Chit Amount */}
                  <td className="py-3.5 px-4 font-bold text-[#003524]">
                    {formatINR(item.monthlyAmount)}
                  </td>

                  {/* Payout */}
                  <td className="py-3.5 px-4 font-semibold text-[#131E19]">
                    {formatINR(item.payoutAmount)}
                  </td>

                  {/* Permanent Chit No */}
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#003524] border border-emerald-200 text-xs font-mono font-bold">
                      {permanentChitNo}
                    </span>
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
                    <div className="flex items-center gap-1.5">
                      {isAssigned ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#003524]">
                            {item.assignedMemberName}
                          </span>
                          {item.assignedMemberName === 'Amma + MU' && (
                            <span className="text-[10px] bg-[#C9A227]/20 text-[#85660D] font-extrabold px-1.5 py-0.2 rounded">
                              Shared
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#5B7065] italic text-xs">
                          Not Assigned
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAssign && onAssign(item)}
                        title="Assign / Reassign Member"
                        className="p-1.5 text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors flex items-center gap-1 text-xs font-semibold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Assign</span>
                      </button>

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
                Total (20 Months)
              </td>
              <td className="py-4 px-4 text-base font-extrabold text-[#003524]">
                {formatINR(totalMonthlyAmount || 88825)}
              </td>
              <td className="py-4 px-4" colSpan={5}>
                <span className="text-xs font-normal text-[#5B7065]">
                  Full 20-month contribution sum across all members
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
