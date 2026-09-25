import React from 'react';

export const StatusBadge = ({ status, variant }) => {
  const normalized = (status || '').toLowerCase().trim();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (normalized === 'active' || normalized === 'paid' || normalized === 'completed' || normalized === 'connected') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium';
    dotColor = 'bg-emerald-500';
  } else if (normalized === 'pending' || normalized === 'upcoming' || normalized === 'not assigned' || normalized === 'offline') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
    dotColor = 'bg-amber-500';
  } else if (normalized === 'partial' || normalized === 'enrolling' || normalized === 'in progress') {
    styles = 'bg-sky-50 text-sky-800 border-sky-200 font-medium';
    dotColor = 'bg-sky-500';
  } else if (normalized === 'overdue' || normalized === 'cancelled' || normalized === 'failed') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200 font-medium';
    dotColor = 'bg-rose-500';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
