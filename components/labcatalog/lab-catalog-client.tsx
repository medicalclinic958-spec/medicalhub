// components/lab/lab-catalog-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Plus, Search, Filter, ChevronDown, X, Trash2 } from "lucide-react";
import {
    Card, Table, Th, Td, StatusBadge, Button,
    Modal, FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLabCatalogSchema, updateLabCatalogSchema } from "@/lib/validations";
import { z } from "zod";
import { toast } from "sonner";

interface LabCatalogItem {
    _id: string; testName: string; testCode: string; category: string;
    cost: number; turnaroundTime: number; isActive: boolean;
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
    const [filtersOpen, setFiltersOpen] = useState(false);

    const isSA = session?.user?.isSuperAdmin;
    const perms = session?.user?.permissions || [];
    const canCreate = isSA || perms.includes("labcatalog:create");
    const canUpdate = isSA || perms.includes("labcatalog:update");
    const canDelete = isSA || perms.includes("labcatalog:delete");

    const activeFiltersCount = [categoryFilter, activeFilter].filter(Boolean).length;

    const { data, isLoading } = useQuery({
        queryKey: ["lab-catalog", page, search, categoryFilter, activeFilter],
        queryFn: () => axios.get("/api/labcatalog", {
            params: { page, limit: 20, search: search || undefined, category: categoryFilter || undefined, isActive: activeFilter || undefined },
        }).then(r => r.data),
    });

    const catalogItems: LabCatalogItem[] = data?.data || [];
    const pagination = data?.pagination;

    const createForm = useForm<CreateFormData>({
        resolver: zodResolver(createLabCatalogSchema),
        defaultValues: { testName: "", testCode: "", category: "Hematology", cost: 0, turnaroundTime: 24, isActive: true },
    });

    const editForm = useForm<UpdateFormData>({ resolver: zodResolver(updateLabCatalogSchema) });

    const createMutation = useMutation({
        mutationFn: (d: CreateFormData) => axios.post("/api/labcatalog", d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-catalog"] }); setCreateOpen(false); createForm.reset(); setFormError(""); toast.success("Test added successfully!"); },
        onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Failed"; setFormError(msg); toast.error(msg); },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateFormData }) => axios.put(`/api/labcatalog/${id}`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-catalog"] }); setEditOpen(false); setEditingItem(null); editForm.reset(); setFormError(""); toast.success("Test updated successfully!"); },
        onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Failed"; setFormError(msg); toast.error(msg); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => axios.delete(`/api/labcatalog/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-catalog"] }); setDeleteConfirmOpen(false); setDeletingItem(null); toast.success("Test deleted!"); },
        onError: (e: unknown) => { toast.error((e as any)?.response?.data?.error || "Failed to delete"); },
    });

    const handleEdit = (item: LabCatalogItem) => {
        setEditingItem(item);
        editForm.reset({ testName: item.testName, testCode: item.testCode, category: item.category, cost: item.cost, turnaroundTime: item.turnaroundTime, isActive: item.isActive });
        setEditOpen(true);
        setFormError("");
    };

    const onEditSubmit = (data: UpdateFormData) => {
        const changedData: UpdateFormData = {};
        if (data.testName !== undefined && data.testName !== editingItem?.testName) changedData.testName = data.testName;
        if (data.testCode !== undefined && data.testCode !== editingItem?.testCode) changedData.testCode = data.testCode;
        if (data.category !== undefined && data.category !== editingItem?.category) changedData.category = data.category;
        if (data.cost !== undefined && data.cost !== editingItem?.cost) changedData.cost = data.cost;
        if (data.turnaroundTime !== undefined && data.turnaroundTime !== editingItem?.turnaroundTime) changedData.turnaroundTime = data.turnaroundTime;
        if (data.isActive !== undefined) { const v = typeof data.isActive === "string" ? data.isActive === "true" : data.isActive; if (v !== editingItem?.isActive) changedData.isActive = v; }
        if (Object.keys(changedData).length === 0) { setEditOpen(false); return; }
        if (editingItem) updateMutation.mutate({ id: editingItem._id, data: changedData });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div><h1 className="text-lg font-semibold text-gray-900">Lab Test Catalog</h1><p className="text-xs text-gray-500 mt-0.5">{pagination?.total ?? 0} test{pagination?.total !== 1 ? "s" : ""} in catalog</p></div>
                {canCreate && <Button onClick={() => { setCreateOpen(true); setFormError(""); createForm.reset(); }} size="sm"><Plus className="w-3.5 h-3.5" /> Add Test</Button>}
            </div>

            {/* Search + Filter Toggle */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search by name or code..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 bg-white placeholder:text-gray-400 text-gray-600 focus:outline-none focus:border-teal-600" />
                </div>
                <button onClick={() => setFiltersOpen(!filtersOpen)} className={cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer shrink-0", filtersOpen || activeFiltersCount > 0 ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-300 text-gray-600")}>
                    <Filter className="w-3.5 h-3.5" /> Filters{activeFiltersCount > 0 && <span className="bg-white text-teal-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">{activeFiltersCount}</span>}<ChevronDown className={cn("w-3 h-3", filtersOpen && "rotate-180")} />
                </button>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    {categoryFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">{categoryFilter}<button onClick={() => { setCategoryFilter(""); setPage(1); }} className="cursor-pointer"><X className="w-3 h-3" /></button></span>}
                    {activeFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">{activeFilter === "true" ? "Active" : "Inactive"}<button onClick={() => { setActiveFilter(""); setPage(1); }} className="cursor-pointer"><X className="w-3 h-3" /></button></span>}
                    <button onClick={() => { setCategoryFilter(""); setActiveFilter(""); setPage(1); }} className="text-xs text-gray-400 cursor-pointer">Clear all</button>
                </div>
            )}

            {/* Expanded Filters */}
            {filtersOpen && (
                <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label><Select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}><option value="">All Categories</option>{LAB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select></div>
                        <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label><Select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}><option value="">All Status</option><option value="true">Active</option><option value="false">Inactive</option></Select></div>
                    </div>
                </div>
            )}

            {/* Desktop Table */}
            <Card className="hidden md:block overflow-x-auto">
                <Table>
                    <thead><tr><Th>Code</Th><Th>Test Name</Th><Th>Category</Th><Th>Cost</Th><Th>TAT (hrs)</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
                    <tbody>
                        {isLoading ? [...Array(8)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>)}</tr>) :
                            catalogItems.length === 0 ? <tr><td colSpan={7}><EmptyState title="No tests found" description={search || categoryFilter ? "Try adjusting your filters" : "Start by adding your first lab test"} action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Test</Button> : undefined} /></td></tr> :
                                catalogItems.map(item => (
                                    <tr key={item._id}>
                                        <Td><span className="font-medium text-gray-900">{item.testCode}</span></Td>
                                        <Td><span className="font-medium text-gray-900">{item.testName}</span></Td>
                                        <Td><Badge variant="outline">{item.category}</Badge></Td>
                                        <Td className="text-gray-600">{formatCurrency(item.cost)}</Td>
                                        <Td className="text-gray-500">{item.turnaroundTime}h</Td>
                                        <Td><StatusBadge status={item.isActive ? "active" : "inactive"} /></Td>
                                        <Td>
                                            <div className="flex items-center gap-1">
                                                {canUpdate && <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>}
                                                {canDelete && <Button size="sm" variant="danger" onClick={() => { setDeletingItem(item); setDeleteConfirmOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                            </div>
                                        </Td>
                                    </tr>))}
                    </tbody>
                </Table>
                {pagination && pagination.totalPages > 1 && <div className="px-4 py-3 border-t border-gray-300 flex justify-end"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>}
            </Card>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
                {isLoading ? [...Array(5)].map((_, i) => <div key={i} className="p-3 flex items-center justify-between"><div className="space-y-2"><div className="h-4 bg-gray-100 rounded w-28" /><div className="h-3 bg-gray-100 rounded w-20" /></div><div className="h-7 bg-gray-100 rounded w-14" /></div>) :
                    catalogItems.length === 0 ? <EmptyState title="No tests found" description={search || categoryFilter ? "Try adjusting your filters" : "Add your first lab test"} action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Test</Button> : undefined} /> :
                        catalogItems.map(item => (
                            <div key={item._id} className="flex items-center justify-between p-3 gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2"><span className="text-xs font-medium text-gray-900">{item.testName}</span><StatusBadge status={item.isActive ? "active" : "inactive"} /></div>
                                    <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-gray-500">{item.testCode}</span><span className="text-xs text-gray-400">•</span><span className="text-xs text-gray-500">{formatCurrency(item.cost)}</span></div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {canUpdate && <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>}
                                    {canDelete && <Button size="sm" variant="danger" onClick={() => { setDeletingItem(item); setDeleteConfirmOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                </div>
                            </div>))}
                {pagination && pagination.totalPages > 1 && <div className="px-4 py-3 flex justify-center"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>}
            </div>

            {/* Create Modal */}
            <Modal open={createOpen} onClose={() => { setCreateOpen(false); createForm.reset(); setFormError(""); }} title="Add Lab Test" size="md">
                {formError && <Alert type="error">{formError}</Alert>}
                <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
                    <FormField label="Test Name" required error={createForm.formState.errors.testName?.message}><Input {...createForm.register("testName")} placeholder="e.g., Complete Blood Count" /></FormField>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Test Code" required error={createForm.formState.errors.testCode?.message}><Input {...createForm.register("testCode")} placeholder="e.g., CBC" className="uppercase" /></FormField>
                        <FormField label="Category" required><Select {...createForm.register("category")}>{LAB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select></FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Cost" required error={createForm.formState.errors.cost?.message}><Input type="number" step="0.01" {...createForm.register("cost", { valueAsNumber: true })} /></FormField>
                        <FormField label="Turnaround Time (hours)"><Input type="number" {...createForm.register("turnaroundTime", { valueAsNumber: true })} /></FormField>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); createForm.reset(); }}>Cancel</Button><Button type="submit" loading={createMutation.isPending}>Add Test</Button></div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditingItem(null); editForm.reset(); setFormError(""); }} title="Edit Lab Test" size="md">
                {formError && <Alert type="error">{formError}</Alert>}
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 mt-2">
                    <FormField label="Test Name" required error={editForm.formState.errors.testName?.message}><Input {...editForm.register("testName")} /></FormField>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Test Code" required error={editForm.formState.errors.testCode?.message}><Input {...editForm.register("testCode")} className="uppercase" /></FormField>
                        <FormField label="Category"><Select {...editForm.register("category")}><option value="">Select</option>{LAB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select></FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Cost" error={editForm.formState.errors.cost?.message}><Input type="number" step="0.01" {...editForm.register("cost", { valueAsNumber: true })} /></FormField>
                        <FormField label="Turnaround Time (hours)"><Input type="number" {...editForm.register("turnaroundTime", { valueAsNumber: true })} /></FormField>
                    </div>
                    <FormField label="Status"><Select {...editForm.register("isActive")}><option value="true">Active</option><option value="false">Inactive</option></Select></FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button type="button" variant="secondary" onClick={() => { setEditOpen(false); editForm.reset(); }}>Cancel</Button><Button type="submit" loading={updateMutation.isPending}>Save Changes</Button></div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeletingItem(null); }} title="Delete Lab Test" size="sm">
                <div className="space-y-4 mt-2">
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200"><Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /><div><p className="text-xs font-semibold text-red-800">Delete permanently?</p><p className="text-xs text-red-600 mt-0.5">This will permanently delete <strong>{deletingItem?.testCode} - {deletingItem?.testName}</strong>.</p></div></div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeletingItem(null); }}>Cancel</Button><Button variant="danger" loading={deleteMutation.isPending} onClick={() => { if (deletingItem) deleteMutation.mutate(deletingItem._id); }}>Delete Permanently</Button></div>
                </div>
            </Modal>
        </div>
    );
}