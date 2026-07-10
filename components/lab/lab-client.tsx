// components/lab/lab-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, ChevronDown, X, Trash2 } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge, Button,
  Modal, FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface LabCatalogItem {
  _id: string; testName: string; testCode: string; category: string; cost: number;
}

interface LabTest {
  _id: string; labTestId: string;
  patient: { _id: string; firstName: string; lastName: string; patientId: string };
  tests: { catalogId?: string; testName: string; testCode?: string; category: string; cost: number }[];
  status: string; priority: string; totalCost: number; createdAt: string;
}

export function LabClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; label: string }>({ open: false, id: "", label: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isSA = session?.user?.isSuperAdmin;
  const perms = session?.user?.permissions || [];
  const canCreate = isSA || perms.includes("lab:create");
  const canDelete = isSA || perms.includes("lab:delete");

  const activeFiltersCount = [statusFilter].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["lab-tests", page, search, statusFilter],
    queryFn: () => axios.get("/api/lab", {
      params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined },
    }).then(r => r.data),
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients-select"],
    queryFn: () => axios.get("/api/publicPatients", { params: { limit: 200 } }).then(r => r.data),
    enabled: createOpen,
  });

  const { data: catalogData } = useQuery({
    queryKey: ["lab-catalog-active"],
    queryFn: () => axios.get("/api/labcatalog", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
    enabled: createOpen,
  });

  const tests: LabTest[] = data?.data || [];
  const pagination = data?.pagination;
  const patients = patientsData?.data || [];
  const catalogTests: LabCatalogItem[] = catalogData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { patient: "", priority: "routine", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => axios.post("/api/lab", {
      patient: d.patient, priority: d.priority, notes: d.notes,
      tests: selectedTests.map(id => ({ catalogId: id })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-tests"] });
      setCreateOpen(false); reset(); setSelectedTests([]); setCreateError("");
      toast.success("Lab tests ordered successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.response?.data?.error || "Failed";
      setCreateError(msg); toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/lab/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-tests"] });
      setDeleteConfirm({ open: false, id: "", label: "" });
      toast.success("Lab order deleted!");
    },
    onError: (e: unknown) => toast.error((e as any)?.response?.data?.error || "Failed to delete"),
  });

  const toggleTest = (id: string) => {
    setSelectedTests(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const selectedTotal = selectedTests.reduce((sum, id) => {
    const test = catalogTests.find(t => t._id === id);
    return sum + (test?.cost || 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Laboratory</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination?.total ?? 0} test order{pagination?.total !== 1 ? "s" : ""}</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setCreateOpen(true); setCreateError(""); reset(); setSelectedTests([]); }} size="sm">
            <Plus className="w-3.5 h-3.5" /> Order Tests
          </Button>
        )}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name or ID..."
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
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700 capitalize">
              {statusFilter.replace(/_/g, " ")}
              <button onClick={() => { setStatusFilter(""); setPage(1); }} className="cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={() => { setStatusFilter(""); setPage(1); }} className="text-xs text-gray-400 cursor-pointer">Clear all</button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <thead>
            <tr><Th>Lab ID</Th><Th>Patient</Th><Th>Tests</Th><Th>Priority</Th><Th>Status</Th><Th>Cost</Th><Th>Date</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>)}</tr>)
            ) : tests.length === 0 ? (
              <tr><td colSpan={8}><EmptyState title="No lab tests" description="No test orders found." action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Order Tests</Button> : undefined} /></td></tr>
            ) : (
              tests.map(t => (
                <tr key={t._id}>
                  <Td><span className="font-medium text-gray-900">{t.labTestId}</span></Td>
                  <Td>
                    <div className="font-medium text-gray-900">{t.patient?.firstName} {t.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">{t.patient?.patientId}</div>
                  </Td>
                  <Td className="max-w-[200px] truncate text-gray-600">{t.tests?.map(x => x.testName).join(", ")}</Td>
                  <Td><Badge variant={t.priority === "stat" ? "danger" : t.priority === "urgent" ? "warning" : "default"}>{t.priority}</Badge></Td>
                  <Td><StatusBadge status={t.status} /></Td>
                  <Td className="text-gray-600">{formatCurrency(t.totalCost)}</Td>
                  <Td className="text-gray-400">{formatDate(t.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" onClick={() => router.push(`/lab/${t._id}`)}>View</Button>
                      {canDelete && ["pending", "cancelled"].includes(t.status) && (
                        <Button size="sm" variant="danger" onClick={() => setDeleteConfirm({ open: true, id: t._id, label: t.labTestId })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </Td>
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
          [...Array(5)].map((_, i) => <div key={i} className="p-3 flex items-center justify-between"><div className="space-y-2"><div className="h-4 bg-gray-100 rounded w-28" /><div className="h-3 bg-gray-100 rounded w-20" /></div><div className="h-7 bg-gray-100 rounded w-14" /></div>)
        ) : tests.length === 0 ? (
          <EmptyState title="No lab tests" description="No test orders found." action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Order Tests</Button> : undefined} />
        ) : (
          tests.map(t => (
            <div key={t._id} className="flex items-center justify-between p-3 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{t.patient?.firstName} {t.patient?.lastName}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={t.priority === "stat" ? "danger" : t.priority === "urgent" ? "warning" : "default"}>{t.priority}</Badge>
                  <span className="text-xs text-gray-500">{formatCurrency(t.totalCost)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{t.tests?.map(x => x.testName).join(", ")}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={() => router.push(`/lab/${t._id}`)}>View</Button>
                {canDelete && ["pending", "cancelled"].includes(t.status) && (
                  <Button size="sm" variant="danger" onClick={() => setDeleteConfirm({ open: true, id: t._id, label: t.labTestId })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        {pagination && pagination.totalPages > 1 && <div className="px-4 py-3 flex justify-center"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); setSelectedTests([]); }} title="Order Lab Tests" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(d => createMutation.mutate(d as any))} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Patient" required error={errors.patient?.message}>
              <Select {...register("patient", { required: "Patient is required" })}>
                <option value="">Select patient</option>
                {patients.map((p: any) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>)}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select {...register("priority")}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </Select>
            </FormField>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Select Tests</label>
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg divide-y divide-gray-100">
              {catalogTests.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No tests available in catalog</p>
              ) : (
                catalogTests.map(test => (
                  <div
                    key={test._id}
                    onClick={() => toggleTest(test._id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 cursor-pointer",
                      selectedTests.includes(test._id) ? "bg-teal-50" : ""
                    )}
                  >
                    <div>
                      <p className="text-xs font-medium text-gray-900">{test.testName}</p>
                      <p className="text-xs text-gray-400">{test.testCode} • {test.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-700">{formatCurrency(test.cost)}</span>
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                        selectedTests.includes(test._id) ? "bg-teal-600 border-teal-600" : "border-gray-300"
                      )}>
                        {selectedTests.includes(test._id) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedTests.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedTests.length} test{selectedTests.length > 1 ? "s" : ""} selected • Total: <span className="font-semibold text-gray-900">{formatCurrency(selectedTotal)}</span>
              </p>
            )}
          </div>

          <FormField label="Notes"><Input {...register("notes")} placeholder="Additional instructions..." /></FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); setSelectedTests([]); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={selectedTests.length === 0}>Order Tests</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: "", label: "" })} title="Delete Lab Order" size="sm">
        <div className="space-y-4 mt-2">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-800">Delete permanently?</p>
              <p className="text-xs text-red-600 mt-0.5">This will permanently delete <strong>{deleteConfirm.label}</strong>.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button variant="secondary" onClick={() => setDeleteConfirm({ open: false, id: "", label: "" })}>Cancel</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete Permanently</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}