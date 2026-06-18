// components/pharmacy/suppliers-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Building2, User } from "lucide-react";
import {
    Card, CardBody, Table, Th, Td, Button, Modal,
    FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { createSupplierSchema, CreateSupplierInput } from "@/lib/validations";
import { useSession } from "next-auth/react";

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
    const [createOpen, setCreateOpen] = useState(false);
    const [createError, setCreateError] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const categoryOptions = ["Antibiotics", "Analgesics", "Antihypertensives", "Antidiabetics", "Vitamins", "Vaccines", "Surgical Items", "Syringes", "Equipment", "Generic Medicines", "Branded Medicines", "OTC"];

    const isSA = session?.user.isSuperAdmin;
    const perms = session?.user.permissions || [];
    const canCreate = isSA || perms.includes("pharmacy:create");

    const { data, isLoading } = useQuery({
        queryKey: ["suppliers", page, search, typeFilter],
        queryFn: () => axios.get("/api/supplier", { params: { page, limit: 25, search, type: typeFilter } }).then(r => r.data),
    });

    const suppliers: Supplier[] = data?.data || [];
    const pagination = data?.pagination;

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateSupplierInput>({
        resolver: zodResolver(createSupplierSchema),
        defaultValues: { type: "company" },
    });

    const createMutation = useMutation({
        mutationFn: (d: CreateSupplierInput) => axios.post("/api/supplier", d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); setCreateOpen(false); reset(); setCreateError(""); },
        onError: (e: unknown) => setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"),
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Suppliers</h1>
                    <p className="text-sm text-slate-500">{pagination?.total ?? 0} suppliers</p>
                </div>
                {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Supplier</Button>}
            </div>

            <Card>
                <CardBody className="py-3">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="Search suppliers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
                        </div>
                        <Select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="w-40">
                            <option value="">All types</option>
                            <option value="company">Company</option>
                            <option value="individual">Individual</option>
                        </Select>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <Table>
                    <thead>
                        <tr><Th>Name</Th><Th>Type</Th><Th>Contact Person</Th><Th>Phone</Th><Th>Email</Th><Th>Categories</Th><Th>Status</Th><Th>Actions</Th></tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [...Array(6)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
                        ) : suppliers.length === 0 ? (
                            <tr><td colSpan={8}><EmptyState title="No suppliers found" action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Supplier</Button> : undefined} /></td></tr>
                        ) : suppliers.map(s => (
                            <tr key={s._id} className="hover:bg-slate-50">
                                <Td><div className="font-medium text-slate-800">{s.name}</div></Td>
                                <Td>
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                        {s.type === "company" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                        {s.type}
                                    </Badge>
                                </Td>
                                <Td className="text-slate-500">{s.contactPerson || "—"}</Td>
                                <Td className="text-slate-500">{s.phone}</Td>
                                <Td className="text-slate-500">{s.email || "—"}</Td>
                                <Td>
                                    {s.categories?.length ? (
                                        <div className="flex flex-wrap gap-1">
                                            {s.categories.slice(0, 2).map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                                            {s.categories.length > 2 && <span className="text-xs text-slate-400">+{s.categories.length - 2}</span>}
                                        </div>
                                    ) : "—"}
                                </Td>
                                <Td><Badge variant={s.isActive ? "success" : "default"}>{s.isActive ? "Active" : "Inactive"}</Badge></Td>
                                <Td>
                                    <button onClick={() => router.push(`/supplier/${s._id}`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                </Td>
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

            <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Add Supplier" size="lg">
                {createError && <Alert type="error">{createError}</Alert>}
                <form onSubmit={handleSubmit(d => createMutation.mutate({ ...d, categories: selectedCategories }))} className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Contact Person">
                            <Input {...register("contactPerson")} placeholder="Primary contact" />
                        </FormField>
                        <FormField label="Phone" required error={errors.phone?.message}>
                            <Input {...register("phone")} error={!!errors.phone} placeholder="+92 300 1234567" />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Tax ID / NTN">
                            <Input {...register("taxId")} />
                        </FormField>
                        <FormField label="License Number">
                            <Input {...register("licenseNumber")} placeholder="Drug supply license" />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Bank Name">
                            <Input {...register("bankName")} placeholder="Bank name" />
                        </FormField>
                        <FormField label="Account Number">
                            <Input {...register("accountNumber")} placeholder="Account number" />
                        </FormField>
                    </div>
                    <FormField label="Categories">
                        <div className="border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-1">
                                {categoryOptions.map(cat => (
                                    <label key={cat} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
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
                                            className="rounded"
                                        />
                                        <span className="text-sm text-slate-700">{cat}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {selectedCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {selectedCategories.map(c => (
                                    <Badge key={c} variant="outline" className="text-xs">
                                        {c}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategories(selectedCategories.filter(x => x !== c))}
                                            className="ml-1 hover:text-red-500"
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
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
                        <Button type="submit" loading={createMutation.isPending}>Add Supplier</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}