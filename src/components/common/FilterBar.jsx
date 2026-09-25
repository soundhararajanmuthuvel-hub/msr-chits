import React from 'react';

export const FilterBar = ({
  options = [],
  activeFilter,
  onSelectFilter,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 ${className}`}>
      {options.map((opt) => {
        const value = typeof opt === 'object' ? opt.value : opt;
        const label = typeof opt === 'object' ? opt.label : opt;
        const count = typeof opt === 'object' ? opt.count : null;
        const isActive = activeFilter === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelectFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-[#003524] text-white shadow-sm'
                : 'bg-white text-[#4B6358] border border-[#DCE8E0] hover:bg-[#F0FCF4] hover:text-[#003524]'
            }`}
          >
            <span>{label}</span>
            {count !== null && count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F0FCF4] text-[#003524]'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FilterBar;
