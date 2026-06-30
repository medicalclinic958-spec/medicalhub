// components/pharmacy/supplier-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Building2, User, Pencil, Trash2, Phone, Mail, MapPin, Globe, CreditCard, Building } from "lucide-react";
import { Card, CardBody, Badge, Button, Modal, Alert } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { EditSupplierModal } from "./edit-supplier-modal";

interface SupplierDetail {
    _id: string;
    name: string;
    type: string;
    contactPerson?: string;
    phone: string;
    alternatePhone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    licenseNumber?: string;
    website?: string;
    paymentTerms?: string;
    bankName?: string;
    accountNumber?: string;
    categories?: string[];
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export function SupplierDetailClient({ supplierId }: { supplierId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [editError, setEditError] = useState("");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const isSA = session?.user?.isSuperAdmin;
    const perms = session?.user?.permissions || [];
    const canUpdate = isSA || perms.includes("pharmacy:update");
    const canDelete = isSA || perms.includes("pharmacy:delete");

    const { data, isLoading } = useQuery({
        queryKey: ["supplier", supplierId],
        queryFn: () => axios.get(`/api/supplier/${supplierId}`).then(r => r.data),
    });

    const supplier: SupplierDetail | null = data?.data || null;

    const updateMutation = useMutation({
        mutationFn: (d: any) => axios.put(`/api/supplier/${supplierId}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["supplier", supplierId] });
            qc.invalidateQueries({ queryKey: ["supplier"] });
            setEditOpen(false);
            setEditError("");
        },
        onError: (e: unknown) => {
            setEditError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/supplier/${supplierId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["supplier"] });
            router.push("/supplier");
        },
        onError: (e: unknown) => {
            setDeleteError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete");
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-5">
                <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
                <Card><CardBody><div className="h-64 bg-slate-50 rounded animate-pulse" /></CardBody></Card>
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="space-y-5">
                <Button variant="secondary" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Card><CardBody><p className="text-center text-slate-500 py-12">Supplier not found</p></CardBody></Card>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            {supplier.type === "company" ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
                            <h1 className="text-xl font-bold text-slate-800">{supplier.name}</h1>
                            <Badge variant={supplier.isActive ? "success" : "default"}>
                                {supplier.isActive ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500 capitalize">{supplier.type} • Supplier</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canUpdate && (
                        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="w-4 h-4" /> Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                            <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-800">{supplier.contactPerson || supplier.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-700">{supplier.phone}</span>
                            </div>
                            {supplier.alternatePhone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">{supplier.alternatePhone}</span>
                                </div>
                            )}
                            {supplier.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">{supplier.email}</span>
                                </div>
                            )}
                            {supplier.address && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">{supplier.address}</span>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Business Information</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Tax ID / NTN</span>
                                <span className="text-sm font-medium text-slate-800">{supplier.taxId || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">License Number</span>
                                <span className="text-sm font-medium text-slate-800">{supplier.licenseNumber || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Website</span>
                                <span className="text-sm font-medium text-slate-800">
                                    {supplier.website ? (
                                        <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> {supplier.website}
                                        </a>
                                    ) : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Payment Terms</span>
                                <span className="text-sm font-medium text-slate-800">{supplier.paymentTerms || "—"}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Bank Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Bank Name</span>
                                <span className="text-sm font-medium text-slate-800">{supplier.bankName || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Account Number</span>
                                <span className="text-sm font-medium text-slate-800">{supplier.accountNumber || "—"}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Categories</h3>
                        {supplier.categories?.length ? (
                            <div className="flex flex-wrap gap-2">
                                {supplier.categories.map(c => <Badge key={c} variant="outline">{c}</Badge>)}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No categories assigned</p>
                        )}
                    </CardBody>
                </Card>

                {supplier.notes && (
                    <Card className="col-span-2">
                        <CardBody>
                            <h3 className="text-sm font-semibold text-slate-800 mb-4">Notes</h3>
                            <p className="text-sm text-slate-700">{supplier.notes}</p>
                        </CardBody>
                    </Card>
                )}

                <Card className="col-span-2">
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Record Information</h3>
                        <div className="flex gap-8">
                            <div>
                                <span className="text-sm text-slate-500">Created</span>
                                <p className="text-sm font-medium text-slate-800">{formatDate(supplier.createdAt)}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Last Updated</span>
                                <p className="text-sm font-medium text-slate-800">{formatDate(supplier.updatedAt)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            <EditSupplierModal
                open={editOpen}
                onClose={() => { setEditOpen(false); setEditError(""); }}
                supplier={supplier}
                onUpdate={(data: any) => updateMutation.mutate(data)}
                isPending={updateMutation.isPending}
                error={editError}
            />

            <Modal open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }} title="Delete Supplier" size="sm">
                <div className="space-y-4 mt-2">
                    {deleteError && <Alert type="error">{deleteError}</Alert>}
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Delete permanently?</p>
                            <p className="text-sm text-red-600">
                                This will permanently delete <strong>{supplier.name}</strong>. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}>Cancel</Button>
                        <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                            Delete Permanently
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}