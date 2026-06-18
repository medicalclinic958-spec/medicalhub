// components/lab/lab-catalog-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Plus, Pencil, Search, Beaker, Trash2 } from "lucide-react";
import {
    Card, CardBody, Table, Th, Td, StatusBadge, Button,
    Modal, FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLabCatalogSchema, updateLabCatalogSchema } from "@/lib/validations";
import { z } from "zod";

interface LabCatalogItem {
    _id: string;
    testName: string;
    testCode: string;
    category: string;
    cost: number;
    turnaroundTime: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const LAB_CATEGORIES = [
    "Hematology", "Biochemistry", "Microbiology", "Pathology",
    "Immunology", "Urinalysis", "Radiology", "Cardiac", "Hormone", "Other"
];

type CreateFormData = z.infer<typeof createLabCatalogSchema>;
type UpdateFormData = z.infer<typeof updateLabCatalogSchema>;

export function LabCatalogClient() {
    const { data: session } = useSession();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LabCatalogItem | null>(null);
    const [formError, setFormError] = useState("");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<LabCatalogItem | null>(null);

    const isSA = session?.user?.isSuperAdmin;
    const perms = session?.user?.permissions || [];
    const canCreate = isSA || perms.includes("labcatalog:create");
    const canUpdate = isSA || perms.includes("labcatalog:update");
    const canDelete = isSA || perms.includes("labcatalog:delete");

    // ─── Fetch catalog ────────────────────────────────────────
    const { data, isLoading } = useQuery({
        queryKey: ["lab-catalog", page, search, categoryFilter, activeFilter],
        queryFn: () =>
            axios
                .get("/api/labcatalog", {
                    params: { page, limit: 20, search, category: categoryFilter, isActive: activeFilter },
                })
                .then((r) => r.data),
    });

    const catalogItems: LabCatalogItem[] = data?.data || [];
    const pagination = data?.pagination;

    // ─── Create form ──────────────────────────────────────────
    const createForm = useForm<CreateFormData>({
        resolver: zodResolver(createLabCatalogSchema),
        defaultValues: {
            testName: "",
            testCode: "",
            category: "Hematology",
            cost: 0,
            turnaroundTime: 24,
            isActive: true,
        },
    });

    // ─── Edit form ────────────────────────────────────────────
    const editForm = useForm<UpdateFormData>({
        resolver: zodResolver(updateLabCatalogSchema),
    });

    // ─── Create mutation ──────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (d: CreateFormData) => axios.post("/api/labcatalog", d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lab-catalog"] });
            setCreateOpen(false);
            createForm.reset();
            setFormError("");
        },
        onError: (e: unknown) => {
            setFormError(
                (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create test"
            );
        },
    });

    // ─── Update mutation ──────────────────────────────────────
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateFormData }) =>
            axios.put(`/api/labcatalog/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lab-catalog"] });
            setEditOpen(false);
            setEditingItem(null);
            editForm.reset();
            setFormError("");
        },
        onError: (e: unknown) => {
            setFormError(
                (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update test"
            );
        },
    });

    // ─── Delete mutation ──────────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: (id: string) => axios.delete(`/api/labcatalog/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lab-catalog"] });
            setDeleteConfirmOpen(false);
            setDeletingItem(null);
        },
        onError: (e: unknown) => {
            alert(
                (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete test"
            );
        },
    });

    // ─── Open edit modal ──────────────────────────────────────
    const handleEdit = (item: LabCatalogItem) => {
        setEditingItem(item);
        // Reset form with current values
        editForm.reset({
            testName: item.testName,
            testCode: item.testCode,
            category: item.category,
            cost: item.cost,
            turnaroundTime: item.turnaroundTime,
            isActive: item.isActive,
        });
        setEditOpen(true);
        setFormError("");
    };

    // ─── Handle edit submit ───────────────────────────────────
    const onEditSubmit = (data: UpdateFormData) => {
        // Only send changed fields
        const changedData: UpdateFormData = {};
        if (data.testName !== undefined && data.testName !== editingItem?.testName) changedData.testName = data.testName;
        if (data.testCode !== undefined && data.testCode !== editingItem?.testCode) changedData.testCode = data.testCode;
        if (data.category !== undefined && data.category !== editingItem?.category) changedData.category = data.category;
        if (data.cost !== undefined && data.cost !== editingItem?.cost) changedData.cost = data.cost;
        if (data.turnaroundTime !== undefined && data.turnaroundTime !== editingItem?.turnaroundTime) changedData.turnaroundTime = data.turnaroundTime;
        if (data.isActive !== undefined) {
            const isActiveBool = typeof data.isActive === "string" ? data.isActive === "true" : data.isActive;
            if (isActiveBool !== editingItem?.isActive) changedData.isActive = isActiveBool;
        }

        if (Object.keys(changedData).length === 0) {
            setEditOpen(false);
            return;
        }

        if (editingItem) {
            updateMutation.mutate({ id: editingItem._id, data: changedData });
        }
    };

    return (
        <div className="space-y-5">
            {/* ─── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Lab Test Catalog</h1>
                    <p className="text-sm text-slate-500">{pagination?.total ?? 0} tests in catalog</p>
                </div>
                {canCreate && (
                    <Button onClick={() => { setCreateOpen(true); setFormError(""); createForm.reset(); }}>
                        <Plus className="w-4 h-4" /> Add Test
                    </Button>
                )}
            </div>

            {/* ─── Filters ────────────────────────────────── */}
            <Card>
                <CardBody className="py-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <Select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                            className="w-44"
                        >
                            <option value="">All Categories</option>
                            {LAB_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </Select>
                        <Select
                            value={activeFilter}
                            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                            className="w-36"
                        >
                            <option value="">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </Select>
                    </div>
                </CardBody>
            </Card>

            {/* ─── Table ──────────────────────────────────── */}
            <Card>
                <Table>
                    <thead>
                        <tr>
                            <Th>Code</Th>
                            <Th>Test Name</Th>
                            <Th>Category</Th>
                            <Th>Cost</Th>
                            <Th>TAT (hrs)</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [...Array(8)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(7)].map((_, j) => (
                                        <Td key={j}>
                                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                        </Td>
                                    ))}
                                </tr>
                            ))
                        ) : catalogItems.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <EmptyState
                                        icon={<Beaker className="w-10 h-10 text-slate-300" />}
                                        title="No tests found"
                                        description={search || categoryFilter ? "Try adjusting your filters" : "Start by adding your first lab test"}
                                        action={
                                            canCreate ? (
                                                <Button size="sm" onClick={() => setCreateOpen(true)}>
                                                    <Plus className="w-3.5 h-3.5" /> Add Test
                                                </Button>
                                            ) : undefined
                                        }
                                    />
                                </td>
                            </tr>
                        ) : (
                            catalogItems.map((item) => (
                                <tr key={item._id} className="hover:bg-slate-50">
                                    <Td>
                                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                            {item.testCode}
                                        </span>
                                    </Td>
                                    <Td>
                                        <span className="font-medium text-slate-800">{item.testName}</span>
                                    </Td>
                                    <Td>
                                        <Badge variant="default">{item.category}</Badge>
                                    </Td>
                                    <Td className="font-medium">{formatCurrency(item.cost)}</Td>
                                    <Td className="text-slate-500">{item.turnaroundTime}h</Td>
                                    <Td>
                                        <StatusBadge status={item.isActive ? "active" : "inactive"} />
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-1">
                                            {canUpdate && (
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => {
                                                        setDeletingItem(item);
                                                        setDeleteConfirmOpen(true);
                                                    }}
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

            {/* ─── Create Modal ───────────────────────────── */}
            <Modal
                open={createOpen}
                onClose={() => { setCreateOpen(false); createForm.reset(); setFormError(""); }}
                title="Add Lab Test"
                size="md"
            >
                {formError && <Alert type="error">{formError}</Alert>}
                <form
                    onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
                    className="space-y-4 mt-2"
                >
                    <FormField label="Test Name" required error={createForm.formState.errors.testName?.message}>
                        <Input {...createForm.register("testName")} placeholder="e.g., Complete Blood Count" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Test Code" required error={createForm.formState.errors.testCode?.message}>
                            <Input {...createForm.register("testCode")} placeholder="e.g., CBC" className="uppercase" />
                        </FormField>
                        <FormField label="Category" required>
                            <Select {...createForm.register("category")}>
                                {LAB_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cost" required error={createForm.formState.errors.cost?.message}>
                            <Input type="number" step="0.01" {...createForm.register("cost", { valueAsNumber: true })} />
                        </FormField>
                        <FormField label="Turnaround Time (hours)">
                            <Input type="number" {...createForm.register("turnaroundTime", { valueAsNumber: true })} />
                        </FormField>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); createForm.reset(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createMutation.isPending}>Add Test</Button>
                    </div>
                </form>
            </Modal>

            {/* ─── Edit Modal ─────────────────────────────── */}
            <Modal
                open={editOpen}
                onClose={() => { setEditOpen(false); setEditingItem(null); editForm.reset(); setFormError(""); }}
                title="Edit Lab Test"
                size="md"
            >
                {formError && <Alert type="error">{formError}</Alert>}
                <form
                    onSubmit={editForm.handleSubmit(onEditSubmit)}
                    className="space-y-4 mt-2"
                >
                    <FormField label="Test Name" required error={editForm.formState.errors.testName?.message}>
                        <Input {...editForm.register("testName")} placeholder="e.g., Complete Blood Count" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Test Code" required error={editForm.formState.errors.testCode?.message}>
                            <Input {...editForm.register("testCode")} placeholder="e.g., CBC" className="uppercase" />
                        </FormField>
                        <FormField label="Category">
                            <Select {...editForm.register("category")}>
                                <option value="">Select category</option>
                                {LAB_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cost" error={editForm.formState.errors.cost?.message}>
                            <Input type="number" step="0.01" {...editForm.register("cost", { valueAsNumber: true })} />
                        </FormField>
                        <FormField label="Turnaround Time (hours)">
                            <Input type="number" {...editForm.register("turnaroundTime", { valueAsNumber: true })} />
                        </FormField>
                    </div>
                    <FormField label="Status">
                        <Select {...editForm.register("isActive")} className="w-full">
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </Select>
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => { setEditOpen(false); editForm.reset(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>

            {/* ─── Delete Confirmation Modal ──────────────── */}
            <Modal
                open={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setDeletingItem(null); }}
                title="Delete Lab Test"
                size="sm"
            >
                <div className="space-y-4 mt-2">
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Are you sure?</p>
                            <p className="text-sm text-red-600">
                                This will permanently delete <strong>{deletingItem?.testCode} - {deletingItem?.testName}</strong>. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeletingItem(null); }}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            loading={deleteMutation.isPending}
                            onClick={() => {
                                if (deletingItem) deleteMutation.mutate(deletingItem._id);
                            }}
                        >
                            Delete Permanently
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}