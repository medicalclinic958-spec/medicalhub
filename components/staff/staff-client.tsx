// components/staff/staff-client.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Search, Filter, ChevronDown, X } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge,
  EmptyState, Pagination, Badge, Select,
} from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";

interface StaffMember {
  _id: string; employeeId: string; firstName: string; lastName: string;
  email: string; phone: string; department?: string;
  role: { name: string; slug: string }; status: string;
  lastLogin?: string; createdAt: string;
}

export function StaffClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFiltersCount = [status].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["staff", page, search, status],
    queryFn: () => axios.get("/api/users", { params: { page, limit: 20, search: search || undefined, status: status || undefined } }).then(r => r.data),
  });

  const staff: StaffMember[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Staff Management</h1>
        <p className="text-xs text-gray-500 mt-0.5">{pagination?.total ?? 0} staff member{pagination?.total !== 1 ? "s" : ""}</p>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 bg-white placeholder:text-gray-400 text-gray-600 focus:outline-none focus:border-teal-600"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer shrink-0",
            filtersOpen || activeFiltersCount > 0 ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-300 text-gray-600"
          )}
        >
          <Filter className="w-3.5 h-3.5" /> Filters
          {activeFiltersCount > 0 && <span className="bg-white text-teal-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">{activeFiltersCount}</span>}
          <ChevronDown className={cn("w-3 h-3", filtersOpen && "rotate-180")} />
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {status && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700 capitalize">
              {status}
              <button onClick={() => { setStatus(""); setPage(1); }} className="cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={() => { setStatus(""); setPage(1); }} className="text-xs text-gray-400 cursor-pointer">Clear all</button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Employee ID</Th><Th>Name</Th><Th>Role</Th><Th>Department</Th>
              <Th>Phone</Th><Th>Status</Th><Th>Last Login</Th><Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>)}</tr>)
            ) : staff.length === 0 ? (
              <tr><td colSpan={8}><EmptyState title="No staff found" description="Try adjusting your search or filters." /></td></tr>
            ) : (
              staff.map(s => (
                <tr key={s._id}>
                  <Td><span className="font-medium text-gray-900">{s.employeeId}</span></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-semibold text-teal-600">
                        {s.firstName?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{s.firstName} {s.lastName}</div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge variant="outline">{s.role?.name}</Badge></Td>
                  <Td className="text-gray-500">{s.department || "—"}</Td>
                  <Td className="text-gray-600">{s.phone}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td className="text-gray-400">{s.lastLogin ? formatDate(s.lastLogin) : "Never"}</Td>
                  <Td className="text-gray-400">{formatDate(s.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-300 flex justify-end"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>
        )}
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
        {isLoading ? (
          [...Array(5)].map((_, i) => <div key={i} className="p-3 flex items-center justify-between"><div className="space-y-2"><div className="h-4 bg-gray-100 rounded w-28" /><div className="h-3 bg-gray-100 rounded w-20" /></div></div>)
        ) : staff.length === 0 ? (
          <EmptyState title="No staff found" description="Try adjusting your search or filters." />
        ) : (
          staff.map(s => (
            <div key={s._id} className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-semibold text-teal-600 shrink-0">
                  {s.firstName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{s.firstName} {s.lastName}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{s.role?.name}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{s.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 flex justify-center"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>
        )}
      </div>
    </div>
  );
}