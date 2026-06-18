"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Search, Users } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, StatusBadge, Input, Select,
  EmptyState, Pagination, Badge,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

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

  const { data, isLoading } = useQuery({
    queryKey: ["staff", page, search, status],
    queryFn: () => axios.get("/api/users", { params: { page, limit: 20, search, status } }).then(r => r.data),
  });

  const staff: StaffMember[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-slate-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Staff Management</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} staff members</p>
        </div>
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search staff..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-36">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Employee ID</Th><Th>Name</Th><Th>Role</Th><Th>Department</Th>
              <Th>Phone</Th><Th>Status</Th><Th>Last Login</Th><Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
            ) : staff.length === 0 ? (
              <tr><td colSpan={8}><EmptyState title="No staff found" /></td></tr>
            ) : staff.map(s => (
              <tr key={s._id} className="hover:bg-slate-50">
                <Td><span className="font-mono text-xs text-blue-600">{s.employeeId}</span></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                      {s.firstName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{s.firstName} {s.lastName}</div>
                      <div className="text-xs text-slate-400">{s.email}</div>
                    </div>
                  </div>
                </Td>
                <Td><Badge variant="outline">{s.role?.name}</Badge></Td>
                <Td className="text-slate-500">{s.department || "—"}</Td>
                <Td className="text-slate-500">{s.phone}</Td>
                <Td><StatusBadge status={s.status} /></Td>
                <Td className="text-slate-400 text-xs">{s.lastLogin ? formatDate(s.lastLogin) : "Never"}</Td>
                <Td className="text-slate-400 text-xs">{formatDate(s.createdAt)}</Td>
              </tr>
            ))}
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
