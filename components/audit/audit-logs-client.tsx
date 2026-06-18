"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ScrollText } from "lucide-react";
import {
  Card, CardBody, CardHeader, Table, Th, Td, StatusBadge,
  Input, Select, EmptyState, Pagination, Badge,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface AuditLog {
  _id: string;
  user?: { firstName: string; lastName: string; email: string; employeeId: string };
  action: string;
  module: string;
  description: string;
  ipAddress?: string;
  status: string;
  createdAt: string;
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

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, moduleFilter, statusFilter, from, to],
    queryFn: () =>
      axios.get("/api/audit-logs", {
        params: { page, limit: 25, action: actionFilter, module: moduleFilter, status: statusFilter, from, to },
      }).then((r) => r.data),
  });

  const logs: AuditLog[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-slate-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
          <p className="text-sm text-slate-500">Complete record of all system actions</p>
        </div>
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3">
            <Select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="w-36">
              <option value="">All actions</option>
              {["login","logout","login_failed","create","update","delete","view","export","approve","password_reset"].map((a) => (
                <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
              ))}
            </Select>
            <Select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }} className="w-36">
              <option value="">All modules</option>
              {["auth","patients","appointments","billing","lab","pharmacy","users","roles","settings","inventory"].map((m) => (
                <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-32">
              <option value="">All results</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" placeholder="From" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" placeholder="To" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Timestamp</Th>
              <Th>User</Th>
              <Th>Action</Th>
              <Th>Module</Th>
              <Th>Description</Th>
              <Th>IP Address</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>
                ))}</tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="No audit logs found" /></td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                  <Td>
                    <div className="text-xs text-slate-600 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </Td>
                  <Td>
                    {log.user ? (
                      <div>
                        <div className="text-sm font-medium text-slate-700">
                          {log.user.firstName} {log.user.lastName}
                        </div>
                        <div className="text-xs text-slate-400">{log.user.employeeId}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">System</span>
                    )}
                  </Td>
                  <Td>
                    <Badge variant={ACTION_COLORS[log.action] || "default"}>
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500 capitalize">
                      {log.module.replace(/_/g, " ")}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-sm text-slate-600">{log.description}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-slate-400">{log.ipAddress || "—"}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={log.status} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
