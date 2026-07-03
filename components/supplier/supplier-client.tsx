// components/pharmacy/suppliers-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, Building2, User, X, Filter, ChevronDown } from "lucide-react";
import {
    Card, CardBody, Table, Th, Td, Button, Modal,
    FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { createSupplierSchema, CreateSupplierInput } from "@/lib/validations";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Supplier {
    _id: string; name: string; type: string; contactPerson?: string;
    phone: string; email?: string; categories?: string[]; isActive: boolean;
}

export function SuppliersClient() {
    const { data: session } = useSession();
    const qc = useQueryClient();
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [isActiveFilter, setIsActiveFilter] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [createError, setCreateError] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const categoryOptions = [
        "Antibiotics", "Analgesics", "Antihypertensives", "Antidiabetics",
        "Vitamins", "Vaccines", "Surgical Items", "Syringes", "Equipment",
        "Generic Medicines", "Branded Medicines", "OTC"
    ];

    const isSA = session?.user.isSuperAdmin;
    const perms = session?.user.permissions || [];
    const canCreate = isSA || perms.includes("pharmacy:create");

    const activeFiltersCount = [typeFilter, isActiveFilter].filter(Boolean).length;

    const { data, isLoading } = useQuery({
        queryKey: ["suppliers", page, search, typeFilter, isActiveFilter],
        queryFn: () =>
            axios.get("/api/supplier", {
                params: {
                    page,
                    limit: 25,
                    search: search || undefined,
                    type: typeFilter || undefined,
                    isActive: isActiveFilter || undefined,
                },
            }).then(r => r.data),
    });

    const suppliers: Supplier[] = data?.data || [];
    const pagination = data?.pagination;

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateSupplierInput>({
        resolver: zodResolver(createSupplierSchema),
        defaultValues: { type: "company" },
    });

    const createMutation = useMutation({
        mutationFn: (d: CreateSupplierInput) => axios.post("/api/supplier", d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["suppliers"] });
            setCreateOpen(false);
            reset();
            setSelectedCategories([]);
            setCreateError("");
            toast.success("Supplier added successfully!");
        },
        onError: (e: unknown) => {
            setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed");
            toast.error("Failed to add supplier.");
        },
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Suppliers</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {pagination?.total ?? 0} supplier{pagination?.total !== 1 ? "s" : ""}
                    </p>
                </div>
                {canCreate && (
                    <Button onClick={() => setCreateOpen(true)} size="sm">
                        <Plus className="w-3.5 h-3.5" /> Add Supplier
                    </Button>
                )}
            </div>

            {/* Search + Filter Toggle */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or contact person..."
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
                            <Building2 className="w-3 h-3" />
                            {typeFilter === "company" ? "Company" : "Individual"}
                            <button onClick={() => { setTypeFilter(""); setPage(1); }} className="cursor-pointer">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {isActiveFilter && (
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border",
                            isActiveFilter === "true"
                                ? "bg-teal-50 border-teal-200 text-teal-700"
                                : "bg-gray-50 border-gray-200 text-gray-600"
                        )}>
                            {isActiveFilter === "true" ? "Active" : "Inactive"}
                            <button onClick={() => { setIsActiveFilter(""); setPage(1); }} className="cursor-pointer">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    <button
                        onClick={() => { setTypeFilter(""); setIsActiveFilter(""); setPage(1); }}
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
                                <option value="company">Company</option>
                                <option value="individual">Individual</option>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                            <Select value={isActiveFilter} onChange={e => { setIsActiveFilter(e.target.value); setPage(1); }}>
                                <option value="">All Status</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <Card className="hidden md:block overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th>
                            <Th>Type</Th>
                            <Th>Contact Person</Th>
                            <Th>Phone</Th>
                            <Th>Email</Th>
                            <Th>Categories</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(8)].map((_, j) => (
                                        <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                                    ))}
                                </tr>
                            ))
                        ) : suppliers.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <EmptyState
                                        title="No suppliers found"
                                        description="Try adjusting your filters or add a new supplier"
                                        action={canCreate ? (
                                            <Button size="sm" onClick={() => setCreateOpen(true)}>
                                                <Plus className="w-3.5 h-3.5" /> Add Supplier
                                            </Button>
                                        ) : undefined}
                                    />
                                </td>
                            </tr>
                        ) : (
                            suppliers.map(s => (
                                <tr key={s._id}>
                                    <Td>
                                        <div className="font-medium text-gray-900">{s.name}</div>
                                    </Td>
                                    <Td>
                                        <Badge variant="outline" className="gap-1">
                                            {s.type === "company" ? (
                                                <Building2 className="w-3 h-3" />
                                            ) : (
                                                <User className="w-3 h-3" />
                                            )}
                                            {s.type}
                                        </Badge>
                                    </Td>
                                    <Td className="text-gray-500">{s.contactPerson || "—"}</Td>
                                    <Td className="text-gray-600">{s.phone}</Td>
                                    <Td className="text-gray-500">{s.email || "—"}</Td>
                                    <Td>
                                        {s.categories?.length ? (
                                            <div className="flex flex-wrap gap-1">
                                                {s.categories.slice(0, 2).map(c => (
                                                    <Badge key={c} variant="outline">{c}</Badge>
                                                ))}
                                                {s.categories.length > 2 && (
                                                    <span className="text-xs text-gray-400">+{s.categories.length - 2}</span>
                                                )}
                                            </div>
                                        ) : <span className="text-gray-300">—</span>}
                                    </Td>
                                    <Td>
                                        <Badge variant={s.isActive ? "success" : "default"}>
                                            {s.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </Td>
                                    <Td>
                                        <Button
                                            size="sm"
                                            onClick={() => router.push(`/supplier/${s._id}`)}
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
                            <div className="h-4 bg-gray-100 rounded w-32" />
                            <div className="h-7 bg-gray-100 rounded w-14" />
                        </div>
                    ))
                ) : suppliers.length === 0 ? (
                    <EmptyState
                        title="No suppliers found"
                        description="Try adjusting your filters"
                        action={canCreate ? (
                            <Button size="sm" onClick={() => setCreateOpen(true)}>
                                <Plus className="w-3.5 h-3.5" /> Add Supplier
                            </Button>
                        ) : undefined}
                    />
                ) : (
                    suppliers.map(s => (
                        <div key={s._id} className="flex items-center justify-between p-3 gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-900 truncate">{s.name}</span>
                                    <Badge variant={s.isActive ? "success" : "default"}>
                                        {s.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {s.phone}{s.contactPerson ? ` • ${s.contactPerson}` : ""}
                                </p>
                            </div>
                            <Button size="sm" onClick={() => router.push(`/supplier/${s._id}`)}>
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

            {/* Create Modal */}
            <Modal
                open={createOpen}
                onClose={() => { setCreateOpen(false); reset(); setSelectedCategories([]); setCreateError(""); }}
                title="Add Supplier"
                size="lg"
            >
                {createError && <Alert type="error">{createError}</Alert>}
                <form
                    onSubmit={handleSubmit(d => createMutation.mutate({ ...d, categories: selectedCategories }))}
                    className="space-y-4 mt-2"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Name" required error={errors.name?.message}>
                            <Input {...register("name")} error={!!errors.name} placeholder="Company or individual name" />
                        </FormField>
                        <FormField label="Type" required error={errors.type?.message}>
                            <Select {...register("type")} error={!!errors.type}>
                                <option value="company">Company</option>
                                <option value="individual">Individual</option>
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Contact Person">
                            <Input {...register("contactPerson")} placeholder="Primary contact" />
                        </FormField>
                        <FormField label="Phone" required error={errors.phone?.message}>
                            <Input {...register("phone")} error={!!errors.phone} placeholder="+92 300 1234567" />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Email">
                            <Input {...register("email")} placeholder="supplier@email.com" />
                        </FormField>
                        <FormField label="Alternate Phone">
                            <Input {...register("alternatePhone")} />
                        </FormField>
                    </div>
                    <FormField label="Address">
                        <Input {...register("address")} placeholder="Physical address" />
                    </FormField>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Tax ID / NTN">
                            <Input {...register("taxId")} />
                        </FormField>
                        <FormField label="License Number">
                            <Input {...register("licenseNumber")} placeholder="Drug supply license" />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Website">
                            <Input {...register("website")} placeholder="www.supplier.com" />
                        </FormField>
                        <FormField label="Payment Terms">
                            <Select {...register("paymentTerms")}>
                                <option value="">Select</option>
                                <option value="Net 15">Net 15</option>
                                <option value="Net 30">Net 30</option>
                                <option value="Net 45">Net 45</option>
                                <option value="Net 60">Net 60</option>
                                <option value="Cash on Delivery">Cash on Delivery</option>
                                <option value="Advance Payment">Advance Payment</option>
                            </Select>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Bank Name">
                            <Input {...register("bankName")} placeholder="Bank name" />
                        </FormField>
                        <FormField label="Account Number">
                            <Input {...register("accountNumber")} placeholder="Account number" />
                        </FormField>
                    </div>
                    <FormField label="Categories">
                        <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-1">
                                {categoryOptions.map(cat => (
                                    <label
                                        key={cat}
                                        className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCategories.includes(cat)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedCategories([...selectedCategories, cat]);
                                                } else {
                                                    setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                                }
                                            }}
                                            className="rounded border-gray-300 cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-600">{cat}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {selectedCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {selectedCategories.map(c => (
                                    <Badge key={c} variant="outline">
                                        {c}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategories(selectedCategories.filter(x => x !== c))}
                                            className="ml-1 cursor-pointer"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </FormField>
                    <FormField label="Notes">
                        <Input {...register("notes")} placeholder="Additional notes..." />
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setCreateOpen(false); reset(); setSelectedCategories([]); }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" loading={createMutation.isPending}>Add Supplier</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}