import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CreditCard,
  Eye,
  Edit2,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/currency';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import SearchBar from '../components/common/SearchBar';
import FilterBar from '../components/common/FilterBar';
import DataTable from '../components/common/DataTable';
import MemberForm from '../components/members/MemberForm';
import LoadingState from '../components/common/LoadingState';
import { useChit } from '../context/ChitContext';

export const Members = () => {
  const navigate = useNavigate();
  const { setIsRecordPaymentOpen } = useChit();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.getMembers();
      setMembers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const pendingDuesMembers = members.filter(m => (m.totalPending || 0) > 0).length;
  const assignedChitsCount = members.filter(m => m.payoutMonth && m.payoutMonth !== 'Not Assigned').length;

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mobile.includes(searchTerm) ||
        m.memberId.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'All') return true;
      if (activeFilter === 'Active') return m.status === 'Active';
      if (activeFilter === 'Pending') return (m.totalPending || 0) > 0;
      if (activeFilter === 'Assigned') return m.payoutMonth && m.payoutMonth !== 'Not Assigned';
      if (activeFilter === 'Unassigned') return !m.payoutMonth || m.payoutMonth === 'Not Assigned';

      return true;
    });
  }, [members, searchTerm, activeFilter]);

  const columns = [
    {
      header: 'Member ID',
      accessor: 'memberId',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#174D38]">
          {row.memberId}
        </span>
      )
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/members/${row.memberId}`);
            }}
            className="font-bold text-[#003524] hover:underline text-left block"
          >
            {row.name}
          </button>
          {row.notes && (
            <span className="text-[10px] text-[#5B7065] block line-clamp-1">{row.notes}</span>
          )}
        </div>
      )
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-[#131E19]">
          <Phone className="w-3.5 h-3.5 text-[#5B7065]" />
          <span>{row.mobile}</span>
        </div>
      )
    },
    {
      header: 'Chits',
      accessor: 'chitCount',
      align: 'center',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
          {row.chitCount || 1}
        </span>
      )
    },
    {
      header: 'Payout Month',
      accessor: 'payoutMonth',
      render: (row) => {
        const isNotAssigned = !row.payoutMonth || row.payoutMonth === 'Not Assigned';
        return (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              isNotAssigned
                ? 'bg-amber-50 text-amber-800 border border-amber-200 italic'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}
          >
            {row.payoutMonth || 'Not Assigned'}
          </span>
        );
      }
    },
    {
      header: 'Total Paid',
      accessor: 'totalPaid',
      render: (row) => (
        <span className="font-bold text-[#003524]">
          {formatINR(row.totalPaid || 0)}
        </span>
      )
    },
    {
      header: 'Pending Due',
      accessor: 'totalPending',
      render: (row) => (
        <span
          className={`font-semibold ${
            (row.totalPending || 0) > 0 ? 'text-amber-700 font-bold' : 'text-[#5B7065]'
          }`}
        >
          {formatINR(row.totalPending || 0)}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'Active'} />
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/members/${row.memberId}`)}
            title="View Member Statement"
            className="p-1.5 text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingMember(row);
              setIsAddOpen(true);
            }}
            title="Edit Member"
            className="p-1.5 text-[#5B7065] hover:text-[#003524] hover:bg-[#F0FCF4] rounded-lg border border-[#DCE8E0] transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            title="Record Payment for this member"
            className="p-1.5 bg-[#003524] hover:bg-[#174D38] text-white rounded-lg transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#C9A227]" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE8E0] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#003524] tracking-tight">
            Chit Members Directory
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#5B7065] mt-1">
            {totalMembers} enrolled members • Payment tracking and statement history
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingMember(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003524] hover:bg-[#174D38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-[#C9A227]" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Top 4 Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Members"
          value={totalMembers}
          subtitle={`${totalMembers} Registered`}
          icon={Users}
          accentColor="primary"
        />

        <StatCard
          title="Active Members"
          value={activeMembers}
          subtitle={totalMembers > 0 ? `${Math.round((activeMembers / totalMembers) * 100)}% Active` : '0 Active'}
          icon={CheckCircle2}
          accentColor="emerald"
        />

        <StatCard
          title="Pending Due Members"
          value={pendingDuesMembers}
          subtitle={`${pendingDuesMembers} with dues`}
          icon={AlertCircle}
          accentColor="gold"
        />

        <StatCard
          title="Assigned Chits"
          value={assignedChitsCount}
          subtitle={`${Math.max(0, totalMembers - assignedChitsCount)} Unassigned`}
          icon={Clock}
          accentColor="blue"
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#DCE8E0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search member by name, mobile, or ID..."
          className="max-w-md"
        />

        <FilterBar
          options={[
            { label: 'All', value: 'All', count: totalMembers },
            { label: 'Active', value: 'Active', count: activeMembers },
            { label: 'Pending Dues', value: 'Pending', count: pendingDuesMembers },
            { label: 'Assigned', value: 'Assigned', count: assignedChitsCount },
            { label: 'Unassigned', value: 'Unassigned', count: Math.max(0, totalMembers - assignedChitsCount) },
          ]}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
        />
      </div>

      {/* Members Data Table */}
      <DataTable
        columns={columns}
        data={filteredMembers}
        loading={loading}
        emptyMessage="No members found"
        emptyDescription="Your Google Sheet Members directory is currently empty. Click below to add your first member."
        emptyActionLabel="Add Member"
        onEmptyAction={() => {
          setEditingMember(null);
          setIsAddOpen(true);
        }}
        onRowClick={(row) => navigate(`/members/${row.memberId}`)}
      />

      {/* Add / Edit Member Modal */}
      <MemberForm
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingMember(null);
        }}
        initialData={editingMember}
        onSuccess={loadMembers}
      />
    </div>
  );
};

export default Members;
