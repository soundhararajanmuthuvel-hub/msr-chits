import React from 'react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  className = '',
  footerRow,
  mobileCardRender
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#DCE8E0] shadow-sm overflow-hidden">
        <LoadingState />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mobile Card View (shown below md breakpoint) */}
      <div className="block md:hidden space-y-3">
        {data.map((row, rowIdx) => {
          if (mobileCardRender) {
            return (
              <div
                key={row.id || row._id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`bg-white rounded-xl p-4 border border-[#DCE8E0] shadow-xs ${
                  onRowClick ? 'active:bg-[#F0FCF4] transition-colors' : ''
                }`}
              >
                {mobileCardRender(row, rowIdx)}
              </div>
            );
          }

          // Default smart mobile card transformation
          return (
            <div
              key={row.id || row._id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`bg-white rounded-xl p-4 border border-[#DCE8E0] shadow-xs space-y-2.5 ${
                onRowClick ? 'active:bg-[#F0FCF4] transition-colors' : ''
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#EAF2EC]">
                <div className="font-bold text-sm text-[#003524]">
                  {columns[0]?.render ? columns[0].render(row, rowIdx) : row[columns[0]?.accessor]}
                </div>
                {columns[columns.length - 2]?.render ? (
                  <div>{columns[columns.length - 2].render(row, rowIdx)}</div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {columns.slice(1, -2).map((col, cIdx) => (
                  <div key={cIdx} className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-[#5B7065] block uppercase">
                      {col.header}
                    </span>
                    <div className="font-medium text-[#131E19]">
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions on mobile if last column has render */}
              {columns[columns.length - 1]?.render && (
                <div className="pt-2 border-t border-[#EAF2EC] flex justify-end">
                  {columns[columns.length - 1].render(row, rowIdx)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (hidden on mobile, shown on md+) */}
      <div className="hidden md:block bg-white rounded-xl border border-[#DCE8E0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F0FCF4] border-b border-[#DCE8E0] text-[11px] font-bold uppercase tracking-wider text-[#174D38]">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-3.5 px-4 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2EC] text-xs sm:text-sm text-[#131E19]">
              {data.map((row, rowIdx) => (
                <tr
                  key={row.id || row._id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-150 ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-[#F0FCF4]/70'
                      : 'hover:bg-[#F0FCF4]/40'
                  } ${row._rowClass || ''}`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`py-3.5 px-4 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {footerRow && (
              <tfoot>
                <tr className="bg-[#F0FCF4] border-t-2 border-[#DCE8E0] font-bold text-xs sm:text-sm text-[#003524]">
                  {footerRow}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
