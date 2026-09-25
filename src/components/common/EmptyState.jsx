import React from 'react';
import { FolderSearch, Plus } from 'lucide-react';

export const EmptyState = ({
  title = 'No records found',
  description = 'There are no records matching your current filter or criteria.',
  icon: Icon = FolderSearch,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-xl border border-dashed border-[#DCE8E0] p-10 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="p-4 bg-[#F0FCF4] text-[#174D38] rounded-full mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-bold text-[#003524]">{title}</h4>
      <p className="text-xs text-[#5B7065] max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003524] hover:bg-[#174D38] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
