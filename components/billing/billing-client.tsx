"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, DollarSign, FileText, Calendar, Filter } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, StatusBadge,
  Button, Input, Select, EmptyState, Pagination, StatCard, Badge,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: string;
  patient?: { _id: string; firstName: string; lastName: string; patientId: string };
  patientName?: string;
  doctor?: { _id: string; firstName: string; lastName: string };
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  createdAt: string;
}

export function BillingClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("billing:create");

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", page, statusFilter, typeFilter, search],
    queryFn: () =>
      axios.get("/api/invoice", {
        params: { page, limit: 20, status: statusFilter, invoiceType: typeFilter, search }
      }).then((r) => r.data),
  });

  const invoices: Invoice[] = data?.data || [];
  const pagination = data?.pagination;

  const totalRevenue = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalPending = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      opd_consultation: "OPD/Consultation",
      pharmacy_sale: "Pharmacy Sale",
      lab: "Lab Test",
      procedure: "Procedure",
      other: "Other",
    };
    return labels[type] || type;
  };

  console.log(invoices)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Billing & Invoices</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} invoices</p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push("/billing/new")}>
            <Plus className="w-4 h-4" /> Create Invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Invoices" value={pagination?.total ?? 0} icon={FileText} color="blue" loading={isLoading} />
        <StatCard title="Collected (Page)" value={formatCurrency(totalRevenue)} icon={DollarSign} color="emerald" loading={isLoading} />
        <StatCard title="Outstanding (Page)" value={formatCurrency(totalPending)} icon={DollarSign} color="amber" loading={isLoading} />
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search invoice number & patient name..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="w-44">
              <option value="">All types</option>
              <option value="opd_consultation">OPD/Consultation</option>
              <option value="pharmacy_sale">Pharmacy Sale</option>
              <option value="other">Other</option>
            </Select>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="w-40">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Invoice #</Th>
              <Th>Type</Th>
              <Th>Patient</Th>
              <Th>Total</Th>
              <Th>Paid</Th>
              <Th>Balance</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(9)].map((_, j) => (
                  <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>
                ))}</tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9}><EmptyState title="No invoices found" description="Create a new invoice to get started." action={canCreate ? <Button size="sm" onClick={() => router.push("/billing/new")}><Plus className="w-3.5 h-3.5" /> New Invoice</Button> : undefined} /></td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push(`/billing/${inv._id}`)}>
                  <Td><span className="font-mono text-xs font-semibold text-blue-600">{inv.invoiceNumber}</span></Td>
                  <Td><Badge variant="outline">{typeLabel(inv.invoiceType)}</Badge></Td>
                  <Td>
                    {inv.patient ? (
                      <>
                        <div className="text-xs font-medium text-slate-800">{inv.patient.firstName + ' ' + inv.patient.lastName}</div>
                        <div className="text-xs text-slate-400">{inv.patient.patientId}</div>
                      </>
                    ) : inv.patientName ? (
                      <div className="font-medium text-slate-800">{inv.patientName}</div>
                    ) : "—"}
                  </Td>
                  <Td className="font-medium">{formatCurrency(inv.total)}</Td>
                  <Td className="text-emerald-600">{formatCurrency(inv.paidAmount)}</Td>
                  <Td className={inv.balanceDue > 0 ? "text-red-500 font-medium" : "text-slate-400"}>
                    {formatCurrency(inv.balanceDue)}
                  </Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                  <Td className="text-slate-400 text-sm">{formatDate(inv.createdAt)}</Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/billing/${inv._id}`); }}>
                      View
                    </Button>
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