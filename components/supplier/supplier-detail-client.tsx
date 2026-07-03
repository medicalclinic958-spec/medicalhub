// components/pharmacy/supplier-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Building2, User, Pencil, Trash2, Phone, Mail, MapPin, Globe } from "lucide-react";
import { Card, CardBody, Badge, Button, Modal, Alert } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
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
            qc.invalidateQueries({ queryKey: ["suppliers"] });
            setEditOpen(false);
            setEditError("");
            toast.success("Supplier updated successfully!");
        },
        onError: (e: unknown) => {
            setEditError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update");
            toast.error("Failed to update supplier.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/supplier/${supplierId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["suppliers"] });
            toast.success("Supplier deleted successfully!");
            router.push("/supplier");
        },
        onError: (e: unknown) => {
            setDeleteError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete");
            toast.error("Failed to delete supplier.");
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-100 rounded w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}><CardBody><div className="h-40 bg-gray-50 rounded" /></CardBody></Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <Card>
                    <CardBody>
                        <p className="text-center text-gray-400 py-12 text-xs">Supplier not found</p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0 mt-0.5"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            {supplier.type === "company" ? (
                                <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                            ) : (
                                <User className="w-4 h-4 text-teal-600 shrink-0" />
                            )}
                            <h1 className="text-lg font-semibold text-gray-900 truncate">{supplier.name}</h1>
                            <Badge variant={supplier.isActive ? "success" : "default"}>
                                {supplier.isActive ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{supplier.type} • Supplier</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {canUpdate && (
                        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Information */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Phone className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Contact Information</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Contact Person" value={supplier.contactPerson || supplier.name} />
                            <Row label="Phone" value={supplier.phone} />
                            {supplier.alternatePhone && (
                                <Row label="Alternate Phone" value={supplier.alternatePhone} />
                            )}
                            {supplier.email && (
                                <Row label="Email" value={supplier.email} />
                            )}
                            {supplier.address && (
                                <Row label="Address" value={supplier.address} />
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Business Information */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Business Information</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Tax ID / NTN" value={supplier.taxId || "—"} />
                            <Row label="License Number" value={supplier.licenseNumber || "—"} />
                            <Row label="Website">
                                {supplier.website ? (
                                    <a
                                        href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-600 flex items-center gap-1"
                                    >
                                        <Globe className="w-3 h-3" /> {supplier.website}
                                    </a>
                                ) : (
                                    <span className="text-gray-300">—</span>
                                )}
                            </Row>
                            <Row label="Payment Terms" value={supplier.paymentTerms || "—"} />
                        </div>
                    </CardBody>
                </Card>

                {/* Bank Details */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Bank Details</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Bank Name" value={supplier.bankName || "—"} />
                            <Row label="Account Number" value={supplier.accountNumber || "—"} />
                        </div>
                    </CardBody>
                </Card>

                {/* Categories */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Categories</h3>
                        </div>
                        {supplier.categories?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                                {supplier.categories.map(c => (
                                    <Badge key={c} variant="outline">{c}</Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">No categories assigned</p>
                        )}
                    </CardBody>
                </Card>

                {/* Notes */}
                {supplier.notes && (
                    <Card className="sm:col-span-2">
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Pencil className="w-4 h-4 text-gray-400" />
                                </div>
                                <h3 className="text-xs font-semibold text-gray-900">Notes</h3>
                            </div>
                            <p className="text-xs text-gray-600">{supplier.notes}</p>
                        </CardBody>
                    </Card>
                )}

                {/* Record Information */}
                <Card className="sm:col-span-2">
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Pencil className="w-4 h-4 text-gray-400" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Record Information</h3>
                        </div>
                        <div className="flex gap-6 sm:gap-10">
                            <div>
                                <p className="text-xs text-gray-400">Created</p>
                                <p className="text-xs text-gray-700 mt-0.5">{formatDate(supplier.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Last Updated</p>
                                <p className="text-xs text-gray-700 mt-0.5">{formatDate(supplier.updatedAt)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Edit Modal */}
            <EditSupplierModal
                open={editOpen}
                onClose={() => { setEditOpen(false); setEditError(""); }}
                supplier={supplier}
                onUpdate={(data: any) => updateMutation.mutate(data)}
                isPending={updateMutation.isPending}
                error={editError}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                open={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}
                title="Delete Supplier"
                size="sm"
            >
                <div className="space-y-4 mt-2">
                    {deleteError && <Alert type="error">{deleteError}</Alert>}
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-red-800">Delete permanently?</p>
                            <p className="text-xs text-red-600 mt-0.5">
                                This will permanently delete <strong>{supplier.name}</strong>. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}>
                            Cancel
                        </Button>
                        <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                            Delete Permanently
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// --- Reusable row component ---
function Row({ label, value, children }: {
    label: string;
    value?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            {children ? (
                <span className="text-xs text-right">{children}</span>
            ) : (
                <span className="text-xs text-gray-700 text-right truncate">
                    {value}
                </span>
            )}
        </div>
    );
}