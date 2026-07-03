// app/billing/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, DollarSign, FileText, Filter, ChevronDown, X } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge,
  Button, Select, EmptyState, Pagination, StatCard, Badge,
} from "@/components/ui";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("billing:create");

  const activeFiltersCount = [statusFilter, typeFilter].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", page, statusFilter, typeFilter, search],
    queryFn: () =>
      axios.get("/api/invoice", {
        params: { page, limit: 20, status: statusFilter || undefined, invoiceType: typeFilter || undefined, search: search || undefined }
      }).then((r) => r.data),
  });

  const invoices: Invoice[] = data?.data || [];
  const pagination = data?.pagination;

  const totalRevenue = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalPending = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      opd_consultation: "OPD Consultation",
      pharmacy_sale: "Pharmacy Sale",
      lab: "Lab Test",
      procedure: "Procedure",
      other: "Other",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Billing & Invoices</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {pagination?.total ?? 0} invoice{pagination?.total !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push("/billing/new")} size="sm">
            <Plus className="w-3.5 h-3.5" /> Create Invoice
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard title="Total Invoices" value={pagination?.total ?? 0} icon={FileText} loading={isLoading} />
        <StatCard title="Collected" value={formatCurrency(totalRevenue)} icon={DollarSign} loading={isLoading} />
        <StatCard title="Outstanding" value={formatCurrency(totalPending)} icon={DollarSign} loading={isLoading} />
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number or patient name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 
                       bg-white placeholder:text-gray-400 text-gray-600
                       focus:outline-none focus:border-teal-600"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer shrink-0",
            filtersOpen || activeFiltersCount > 0
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white border-gray-300 text-gray-600"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-white text-teal-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={cn("w-3 h-3", filtersOpen && "rotate-180")} />
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {typeFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">
              {typeLabel(typeFilter)}
              <button onClick={() => { setTypeFilter(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700 capitalize">
              {statusFilter}
              <button onClick={() => { setStatusFilter(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => { setTypeFilter(""); setStatusFilter(""); setPage(1); }}
            className="text-xs text-gray-400 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
              <Select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                <option value="opd_consultation">OPD Consultation</option>
                <option value="pharmacy_sale">Pharmacy Sale</option>
                <option value="lab">Lab Test</option>
                <option value="procedure">Procedure</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
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
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No invoices found"
                    description="Try adjusting your filters or create a new invoice"
                    action={canCreate ? (
                      <Button size="sm" onClick={() => router.push("/billing/new")}>
                        <Plus className="w-3.5 h-3.5" /> New Invoice
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="cursor-pointer" onClick={() => router.push(`/billing/${inv._id}`)}>
                  <Td>
                    <span className="font-medium text-gray-900">{inv.invoiceNumber}</span>
                  </Td>
                  <Td><Badge variant="outline">{typeLabel(inv.invoiceType)}</Badge></Td>
                  <Td>
                    {inv.patient ? (
                      <div>
                        <div className="text-xs font-medium text-gray-900">
                          {inv.patient.firstName} {inv.patient.lastName}
                        </div>
                        <div className="text-xs text-gray-400">{inv.patient.patientId}</div>
                      </div>
                    ) : inv.patientName ? (
                      <div className="text-xs font-medium text-gray-900">{inv.patientName}</div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </Td>
                  <Td className="font-semibold text-gray-700">{formatCurrency(inv.total)}</Td>
                  <Td className="text-teal-600 font-medium">{formatCurrency(inv.paidAmount)}</Td>
                  <Td className={cn("font-medium", inv.balanceDue > 0 ? "text-red-500" : "text-gray-400")}>
                    {formatCurrency(inv.balanceDue)}
                  </Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                  <Td className="text-gray-400">{formatDate(inv.createdAt)}</Td>
                  <Td>
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); router.push(`/billing/${inv._id}`); }}
                    >
                      View
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-300 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-3 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-28" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
              <div className="h-7 bg-gray-100 rounded w-14" />
            </div>
          ))
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="Try adjusting your filters"
            action={canCreate ? (
              <Button size="sm" onClick={() => router.push("/billing/new")}>
                <Plus className="w-3.5 h-3.5" /> New Invoice
              </Button>
            ) : undefined}
          />
        ) : (
          invoices.map((inv) => (
            <div
              key={inv._id}
              className="flex items-center justify-between p-3 gap-2 cursor-pointer"
              onClick={() => router.push(`/billing/${inv._id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{inv.invoiceNumber}</span>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {inv.patient
                      ? `${inv.patient.firstName} ${inv.patient.lastName}`
                      : inv.patientName || "—"}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs font-medium text-gray-700">{formatCurrency(inv.total)}</span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); router.push(`/billing/${inv._id}`); }}
              >
                View
              </Button>
            </div>
          ))
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 flex justify-center">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}