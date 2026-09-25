import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
  accentColor = 'primary', // 'primary', 'gold', 'emerald', 'blue'
  className = ''
}) => {
  const accentStyles = {
    primary: 'bg-[#174D38]/10 text-[#003524]',
    gold: 'bg-[#C9A227]/15 text-[#9A7712]',
    emerald: 'bg-emerald-100 text-emerald-800',
    blue: 'bg-sky-100 text-sky-800',
  };

  return (
    <div
      className={`bg-white rounded-xl p-5 border border-[#DCE8E0] shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4B6358]">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#131E19]">
              {value}
            </h3>
            {trend && (
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  trendPositive
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-amber-700 bg-amber-50'
                }`}
              >
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#5B7065] pt-0.5">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`p-3 rounded-lg flex items-center justify-center shrink-0 ${
              accentStyles[accentColor] || accentStyles.primary
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
