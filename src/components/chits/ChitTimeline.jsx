import React from 'react';
import { Check, Clock, Calendar } from 'lucide-react';
import { formatINR } from '../../utils/currency';

export const ChitTimeline = ({ schedule = [], currentMonth = 2, onSelectMonth }) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-[#DCE8E0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-[#003524] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#174D38]" />
            20-Month Timeline & Progress
          </h4>
          <p className="text-xs text-[#5B7065]">
            Month {currentMonth} of 20 in progress
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-[#4B6358] text-[11px]">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C9A227]"></span>
            <span className="text-[#4B6358] text-[11px] font-bold">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span className="text-[#4B6358] text-[11px]">Upcoming</span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Timeline Pills */}
      <div className="overflow-x-auto pb-2 pt-1">
        <div className="flex items-center gap-2 min-w-max">
          {schedule.map((item) => {
            const isCompleted = item.month < currentMonth;
            const isCurrent = item.month === currentMonth;
            const isUpcoming = item.month > currentMonth;

            return (
              <button
                key={item.month}
                type="button"
                onClick={() => onSelectMonth && onSelectMonth(item.month)}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center min-w-[80px] ${
                  isCurrent
                    ? 'bg-[#003524] text-white border-[#C9A227] shadow-md ring-2 ring-[#C9A227]/30 scale-105'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {/* Status indicator icon / badge */}
                <div className="mb-1">
                  {isCompleted ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full bg-[#C9A227] text-[#003524] flex items-center justify-center animate-pulse">
                      <Clock className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-bold">
                      {item.month}
                    </div>
                  )}
                </div>

                <span className={`text-[11px] font-bold ${isCurrent ? 'text-white' : 'text-[#131E19]'}`}>
                  M{item.month}
                </span>

                <span className={`text-[10px] font-medium mt-0.5 ${isCurrent ? 'text-[#C9A227]' : 'text-[#5B7065]'}`}>
                  {formatINR(item.monthlyAmount)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChitTimeline;
