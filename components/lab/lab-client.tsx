"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FlaskConical, Eye } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, StatusBadge, Button,
  Modal, FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface LabCatalogItem {
  _id: string;
  testName: string;
  testCode: string;
  category: string;
  cost: number;
}

interface LabTest {
  _id: string;
  labTestId: string;
  patient: { _id: string; firstName: string; lastName: string; patientId: string };
  tests: { catalogId?: string; testName: string; testCode?: string; category: string; cost: number }[];
  status: string;
  priority: string;
  totalCost: number;
  createdAt: string;
}

export function LabClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; label: string }>({ open: false, id: "", label: "" });

  const isSA = session?.user?.isSuperAdmin;
  const perms = session?.user?.permissions || [];
  const canCreate = isSA || perms.includes("lab:create");
  const canDelete = isSA || perms.includes("lab:delete");

  const { data, isLoading } = useQuery({
    queryKey: ["lab-tests", page, statusFilter],
    queryFn: () => axios.get("/api/lab", { params: { page, limit: 20, status: statusFilter } }).then(r => r.data),
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients-select"],
    queryFn: () => axios.get("/api/patients", { params: { limit: 200 } }).then(r => r.data),
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
    defaultValues: {
      patient: "",
      priority: "routine",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      axios.post("/api/lab", {
        patient: d.patient,
        priority: d.priority,
        notes: d.notes,
        tests: selectedTests.map(id => ({ catalogId: id })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-tests"] });
      setCreateOpen(false);
      reset();
      setSelectedTests([]);
      setCreateError("");
    },
    onError: (e: unknown) =>
      setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/labcatalog/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-tests"] });
      setDeleteConfirm({ open: false, id: "", label: "" });
    },
    onError: (e: unknown) =>
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete"),
  });

  const toggleTest = (id: string) => {
    setSelectedTests(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectedTotal = selectedTests.reduce((sum, id) => {
    const test = catalogTests.find(t => t._id === id);
    return sum + (test?.cost || 0);
  }, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Laboratory</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} test orders</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setCreateOpen(true); setCreateError(""); reset(); setSelectedTests([]); }}>
            <Plus className="w-4 h-4" /> Order Tests
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="py-3">
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="w-44">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Lab ID</Th>
              <Th>Patient</Th>
              <Th>Tests</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Cost</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>
                  ))}
                </tr>
              ))
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={<FlaskConical className="w-10 h-10 text-slate-300" />}
                    title="No lab tests"
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Order Tests
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              tests.map(t => (
                <tr key={t._id} className="hover:bg-slate-50">
                  <Td>
                    <span className="font-mono text-xs text-blue-600">{t.labTestId}</span>
                  </Td>
                  <Td>
                    <div className="font-medium">{t.patient?.firstName} {t.patient?.lastName}</div>
                    <div className="text-xs text-slate-400">{t.patient?.patientId}</div>
                  </Td>
                  <Td>
                    <div className="text-xs max-w-[200px] truncate">
                      {t.tests?.map(x => x.testName).join(", ")}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={t.priority === "stat" ? "danger" : t.priority === "urgent" ? "warning" : "default"}>
                      {t.priority}
                    </Badge>
                  </Td>
                  <Td><StatusBadge status={t.status} /></Td>
                  <Td>{formatCurrency(t.totalCost)}</Td>
                  <Td className="text-slate-400">{formatDate(t.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/lab/${t._id}`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canDelete && ["pending", "cancelled"].includes(t.status) && (
                        <button
                          onClick={() => setDeleteConfirm({ open: true, id: t._id, label: t.labTestId })}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset(); setCreateError(""); setSelectedTests([]); }}
        title="Order Lab Tests"
        size="lg"
      >
        {createError && <Alert type="error">{createError}</Alert>}
        <form
          onSubmit={handleSubmit(d => createMutation.mutate(d as unknown as Record<string, unknown>))}
          className="space-y-4 mt-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Patient" required error={errors.patient?.message}>
              <Select {...register("patient", { required: "Patient is required" })}>
                <option value="">Select patient</option>
                {patients.map((p: { _id: string; firstName: string; lastName: string; patientId: string }) => (
                  <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>
                ))}
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
            <label className="text-sm font-medium text-slate-700 mb-2 block">Select Tests *</label>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {catalogTests.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No tests available in catalog</p>
              ) : (
                catalogTests.map(test => (
                  <div
                    key={test._id}
                    onClick={() => toggleTest(test._id)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${selectedTests.includes(test._id)
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "hover:bg-slate-50 border-l-2 border-l-transparent"
                      }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{test.testName}</p>
                      <p className="text-xs text-slate-400">{test.testCode} • {test.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">{formatCurrency(test.cost)}</span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedTests.includes(test._id)
                        ? "bg-blue-500 border-blue-500"
                        : "border-slate-300"
                        }`}>
                        {selectedTests.includes(test._id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <p className="text-sm text-slate-500 mt-2">
                {selectedTests.length} test{selectedTests.length > 1 ? "s" : ""} selected • Total:{" "}
                <span className="font-semibold text-slate-800">{formatCurrency(selectedTotal)}</span>
              </p>
            )}
          </div>

          <FormField label="Notes">
            <Input {...register("notes")} placeholder="Additional instructions..." />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); setSelectedTests([]); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending} disabled={selectedTests.length === 0}>
              Order Tests
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: "", label: "" })}
        title="Delete Lab Order"
        size="sm"
      >
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Are you sure?</p>
              <p className="text-sm text-red-600">
                This will permanently delete <strong>{deleteConfirm.label}</strong>. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setDeleteConfirm({ open: false, id: "", label: "" })}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}