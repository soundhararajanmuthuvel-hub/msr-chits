import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar, Edit3, Trash2, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import StatCard from '../common/StatCard';
import DataTable from '../common/DataTable';
import ExtraInvestmentModal from './ExtraInvestmentModal';
import { api } from '../../services/api';
import { useChit } from '../../context/ChitContext';

export const ExtraInvestmentTracker = () => {
  const { showToast } = useChit();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);

  const loadInvestments = async () => {
    setLoading(true);
    try {
      const data = await api.getExtraInvestments();
      setInvestments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, []);

  const totalInvested = investments.reduce((sum, inv) => sum + (Number(inv.investmentAmount) || 0), 0);
  const totalAllocated = investments.reduce((sum, inv) => sum + (Number(inv.allocatedAmount || inv.usedAmount) || 0), 0);
  const totalRemaining = Math.max(0, totalInvested - totalAllocated);
  const totalReturned = investments.reduce((sum, inv) => sum + (Number(inv.returnedAmount) || 0), 0);
  // Profit calculated strictly on completed/returned investments
  const investmentsWithReturn = investments.filter(inv => Number(inv.returnedAmount) > 0);
  const totalProfit = investmentsWithReturn.reduce((sum, inv) => sum + ((Number(inv.returnedAmount) || 0) - (Number(inv.investmentAmount) || 0)), 0);
  const investedForReturned = investmentsWithReturn.reduce((sum, inv) => sum + (Number(inv.investmentAmount) || 0), 0);
  const overallProfitPercent = investedForReturned > 0 ? Number(((totalProfit / investedForReturned) * 100).toFixed(2)) : 0;

  const handleSave = async (record) => {
    try {
      if (record.investmentId && investments.some(inv => inv.investmentId === record.investmentId)) {
        await api.updateExtraInvestment(record.investmentId, record);
        showToast('Extra Investment updated successfully!', 'success');
      } else {
        await api.createExtraInvestment(record);
        showToast('Extra Investment recorded successfully!', 'success');
      }
      await loadInvestments();
    } catch (e) {
      showToast(e.message || 'Failed to save investment', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this investment record?')) {
      try {
        await api.deleteExtraInvestment(id);
        showToast('Investment record deleted', 'success');
        await loadInvestments();
      } catch (e) {
        showToast(e.message || 'Failed to delete record', 'error');
      }
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'investmentId',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#003524] bg-slate-100 px-2 py-0.5 rounded">
          {row.investmentId}
        </span>
      )
    },
    {
      header: 'Date',
      accessor: 'investmentDate',
      render: (row) => formatDate(row.investmentDate)
    },
    {
      header: 'Purpose',
      accessor: 'purpose',
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-[#131E19] block">{row.purpose || 'Capital Deployment'}</span>
          {row.beneficiary && (
            <span className="text-[10px] text-[#5B7065] block">For: {row.beneficiary}</span>
          )}
        </div>
      )
    },
    {
      header: 'Invested',
      accessor: 'investmentAmount',
      render: (row) => (
        <span className="font-bold text-[#003524]">
          {formatINR(row.investmentAmount)}
        </span>
      )
    },
    {
      header: 'Allocated',
      accessor: 'allocatedAmount',
      render: (row) => {
        const alloc = Number(row.allocatedAmount || row.usedAmount) || 0;
        return (
          <span className="font-semibold text-slate-800">
            {formatINR(alloc)}
          </span>
        );
      }
    },
    {
      header: 'Remaining',
      accessor: 'remainingAmount',
      render: (row) => {
        const invest = Number(row.investmentAmount) || 0;
        const alloc = Number(row.allocatedAmount || row.usedAmount) || 0;
        const remaining = Math.max(0, invest - alloc);
        return (
          <span className={`font-bold text-xs ${remaining > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
            {formatINR(remaining)}
          </span>
        );
      }
    },
    {
      header: 'Returned',
      accessor: 'returnedAmount',
      render: (row) => {
        const ret = Number(row.returnedAmount) || 0;
        return ret > 0 ? (
          <span className="font-bold text-emerald-900">
            {formatINR(ret)}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">Pending</span>
        );
      }
    },
    {
      header: 'Profit',
      accessor: 'profit',
      render: (row) => {
        const ret = Number(row.returnedAmount) || 0;
        if (ret <= 0) return <span className="text-xs text-slate-400 italic">-</span>;
        const profit = ret - (Number(row.investmentAmount) || 0);
        return (
          <span className={`font-extrabold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {profit >= 0 ? '+' : ''}{formatINR(profit)}
          </span>
        );
      }
    },
    {
      header: 'ROI %',
      accessor: 'profitPercent',
      render: (row) => {
        const ret = Number(row.returnedAmount) || 0;
        if (ret <= 0) return <span className="text-xs text-slate-400 italic">-</span>;
        const invested = Number(row.investmentAmount) || 0;
        const profit = ret - invested;
        const pct = invested > 0 ? ((profit / invested) * 100).toFixed(1) : 0;
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {pct}%
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const ret = Number(row.returnedAmount) || 0;
        const invest = Number(row.investmentAmount) || 0;
        const alloc = Number(row.allocatedAmount || row.usedAmount) || 0;
        const isClosed = ret >= invest && ret > 0;
        const isAllocated = alloc >= invest && invest > 0;
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isClosed ? 'bg-slate-100 text-slate-700' : (isAllocated ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800')}`}>
            {isClosed ? 'Closed' : (isAllocated ? 'Fully Allocated' : 'Active')}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => {
              setSelectedInvestment(row);
              setIsModalOpen(true);
            }}
            className="p-1.5 text-[#5B7065] hover:text-[#003524] hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Investment"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row.investmentId)}
            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-800 text-white">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-[#003524]">
              Extra Investment Tracker
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full">
              Isolated Portfolio
            </span>
          </div>
          <p className="text-xs text-[#5B7065] mt-1">
            Track external investments, funding payouts, capital returns, and independent ROI separate from standard chit finances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedInvestment(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          <span>Record Extra Investment</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Total Invested</p>
          <p className="text-xl sm:text-2xl font-extrabold text-[#003524] mt-1">{formatINR(totalInvested)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Total Returned</p>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-900 mt-1">{formatINR(totalReturned)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Net Profit</p>
          <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatINR(totalProfit)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs">
          <p className="text-[11px] font-semibold text-[#5B7065] uppercase">Profit ROI %</p>
          <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${overallProfitPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {overallProfitPercent}%
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={investments}
        loading={loading}
        emptyTitle="No Extra Investments Recorded"
        emptyDescription="Click 'Record Extra Investment' above to track your first capital deployment and isolated profit."
      />

      {/* Modal */}
      <ExtraInvestmentModal
        isOpen={isModalOpen}
        investmentToEdit={selectedInvestment}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInvestment(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
};

export default ExtraInvestmentTracker;
