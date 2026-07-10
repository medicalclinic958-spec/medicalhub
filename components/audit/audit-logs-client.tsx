// components/audit-logs/audit-logs-client.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Filter, ChevronDown, X } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge,
  Input, Select, EmptyState, Pagination, Badge,
} from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";

interface AuditLog {
  _id: string;
  user?: { firstName: string; lastName: string; email: string; employeeId: string };
  action: string; module: string; description: string;
  ipAddress?: string; status: string; createdAt: string;
}

const ACTION_COLORS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  login: "success", logout: "default", login_failed: "danger",
  create: "info", update: "warning", delete: "danger",
  view: "default", export: "info", approve: "success",
  password_reset: "warning", role_change: "warning",
};

export function AuditLogsClient() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFiltersCount = [actionFilter, moduleFilter, statusFilter, from, to].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, moduleFilter, statusFilter, from, to],
    queryFn: () => axios.get("/api/audit-logs", {
      params: { page, limit: 25, action: actionFilter || undefined, module: moduleFilter || undefined, status: statusFilter || undefined, from: from || undefined, to: to || undefined },
    }).then(r => r.data),
  });

  const logs: AuditLog[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Audit Logs</h1>
        <p className="text-xs text-gray-500 mt-0.5">Complete record of all system actions</p>
      </div>

      {/* Date Range + Filter Toggle */}
      <div className="flex gap-2">
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="flex-1" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="flex-1" />
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
          {actionFilter && <Chip label={actionFilter.replace(/_/g, " ")} onClear={() => { setActionFilter(""); setPage(1); }} />}
          {moduleFilter && <Chip label={moduleFilter.replace(/_/g, " ")} onClear={() => { setModuleFilter(""); setPage(1); }} />}
          {statusFilter && <Chip label={statusFilter} onClear={() => { setStatusFilter(""); setPage(1); }} />}
          <button onClick={() => { setActionFilter(""); setModuleFilter(""); setStatusFilter(""); setFrom(""); setTo(""); setPage(1); }} className="text-xs text-gray-400 cursor-pointer">Clear all</button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Action</label><Select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}><option value="">All Actions</option>{["login","logout","login_failed","create","update","delete","view","export","approve","password_reset"].map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}</Select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Module</label><Select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }}><option value="">All Modules</option>{["auth","patients","appointments","billing","lab","pharmacy","users","roles","settings","inventory"].map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}</Select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Result</label><Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}><option value="">All Results</option><option value="success">Success</option><option value="failure">Failure</option></Select></div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <thead>
            <tr><Th>Timestamp</Th><Th>User</Th><Th>Action</Th><Th>Module</Th><Th>Description</Th><Th>IP</Th><Th>Result</Th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(10)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>)}</tr>)
            ) : logs.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="No audit logs found" description="Try adjusting your filters." /></td></tr>
            ) : (
              logs.map(log => (
                <tr key={log._id}>
                  <Td className="text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</Td>
                  <Td>
                    {log.user ? (
                      <div>
                        <div className="font-medium text-gray-900">{log.user.firstName} {log.user.lastName}</div>
                        <div className="text-xs text-gray-400">{log.user.employeeId}</div>
                      </div>
                    ) : <span className="text-gray-400">System</span>}
                  </Td>
                  <Td><Badge variant={ACTION_COLORS[log.action] || "default"}>{log.action.replace(/_/g, " ")}</Badge></Td>
                  <Td className="text-gray-500 capitalize">{log.module.replace(/_/g, " ")}</Td>
                  <Td className="text-gray-600 max-w-[200px] truncate">{log.description}</Td>
                  <Td className="text-gray-400">{log.ipAddress || "—"}</Td>
                  <Td><StatusBadge status={log.status} /></Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && <div className="px-4 py-3 border-t border-gray-300 flex justify-end"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>}
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
        {isLoading ? (
          [...Array(5)].map((_, i) => <div key={i} className="p-3 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>)
        ) : logs.length === 0 ? (
          <EmptyState title="No audit logs found" description="Try adjusting your filters." />
        ) : (
          logs.map(log => (
            <div key={log._id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant={ACTION_COLORS[log.action] || "default"}>{log.action.replace(/_/g, " ")}</Badge>
                <StatusBadge status={log.status} />
              </div>
              <p className="text-xs text-gray-600 mb-1">{log.description}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</span>
                <span>•</span>
                <span>{formatDate(log.createdAt)}</span>
              </div>
            </div>
          ))
        )}
        {pagination && pagination.totalPages > 1 && <div className="px-4 py-3 flex justify-center"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>}
      </div>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700 capitalize">
      {label}
      <button onClick={onClear} className="cursor-pointer"><X className="w-3 h-3" /></button>
    </span>
  );
}