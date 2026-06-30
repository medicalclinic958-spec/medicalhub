// components/pharmacy/pharmacy-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Pill, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody, Badge, Button, Modal, Alert } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { EditMedicineModal } from "./edit-medicine-modal";

interface MedicineDetail {
    _id: string;
    name: string;
    genericName: string;
    category: string;
    manufacturer?: string;
    unit: string;
    currentStock: number;
    minStockLevel: number;
    unitCost: number;
    sellingPrice: number;
    batchNumber?: string;
    expiryDate?: string;
    supplier?: { _id: string; name: string; contactPerson: string; phone: string; email: string };
    storageCondition?: string;
    storageLocation?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export function PharmacyDetailClient({ medicineId }: { medicineId: string }) {
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
        queryKey: ["medicine", medicineId],
        queryFn: () => axios.get(`/api/pharmacy/${medicineId}`).then(r => r.data),
    });

    const medicine: MedicineDetail | null = data?.data || null;

    const updateMutation = useMutation({
        mutationFn: (d: any) => axios.put(`/api/pharmacy/${medicineId}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["medicine", medicineId] });
            qc.invalidateQueries({ queryKey: ["medicines"] });
            setEditOpen(false);
            setEditError("");
        },
        onError: (e: unknown) => {
            setEditError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/pharmacy/${medicineId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["medicines"] });
            router.push("/pharmacy");
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

    if (!medicine) {
        return (
            <div className="space-y-5">
                <Button variant="secondary" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Card><CardBody><p className="text-center text-slate-500 py-12">Medicine not found</p></CardBody></Card>
            </div>
        );
    }

    const isLow = medicine.currentStock <= medicine.minStockLevel;
    const isExpiring = medicine.expiryDate && new Date(medicine.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isExpired = medicine.expiryDate && new Date(medicine.expiryDate) < new Date();

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-800">{medicine.name}</h1>
                            <Badge variant={medicine.isActive ? "success" : "default"}>
                                {medicine.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {isLow && <Badge variant="warning">Low Stock</Badge>}
                            {isExpired && <Badge variant="danger">Expired</Badge>}
                            {isExpiring && !isExpired && <Badge variant="warning">Expiring Soon</Badge>}
                        </div>
                        <p className="text-sm text-slate-500">{medicine.genericName} • {medicine.category}</p>
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
                {/* Basic Information */}
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Pill className="w-4 h-4 text-blue-600" /> Basic Information
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Brand Name</span>
                                <span className="text-sm font-medium text-slate-800">{medicine.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Generic Name</span>
                                <span className="text-sm font-medium text-slate-800">{medicine.genericName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Category</span>
                                <Badge variant="outline">{medicine.category}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Manufacturer</span>
                                <span className="text-sm font-medium text-slate-800">{medicine.manufacturer || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Unit</span>
                                <span className="text-sm font-medium text-slate-800 capitalize">{medicine.unit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Batch Number</span>
                                <span className="text-sm font-medium text-slate-800">{medicine.batchNumber || "—"}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Stock & Pricing */}
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Stock & Pricing</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Current Stock</span>
                                <span className={`text-sm font-semibold ${isLow ? "text-red-500" : "text-slate-800"}`}>
                                    {medicine.currentStock} {medicine.unit}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Min Stock Level</span>
                                <span className="text-sm font-medium text-slate-800">{medicine.minStockLevel} {medicine.unit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Unit Cost</span>
                                <span className="text-sm font-medium text-slate-800">PKR {medicine.unitCost?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Selling Price</span>
                                <span className="text-sm font-medium text-slate-800">PKR {medicine.sellingPrice?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Profit Margin</span>
                                <span className="text-sm font-medium text-green-600">
                                    PKR {(medicine.sellingPrice - medicine.unitCost)?.toLocaleString()}
                                    ({((medicine.sellingPrice - medicine.unitCost) / medicine.unitCost * 100).toFixed(1)}%)
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Expiry Date</span>
                                <span className={`text-sm font-medium ${isExpired ? "text-red-500" : isExpiring ? "text-amber-500" : "text-slate-800"}`}>
                                    {medicine.expiryDate ? formatDate(medicine.expiryDate) : "—"}
                                </span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Storage Information */}
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Storage Information</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Storage Condition</span>
                                <span className="text-sm font-medium text-slate-800">{medicine.storageCondition || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Storage Location</span>
                                <span className="text-sm font-medium text-slate-800">{medicine.storageLocation || "—"}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Supplier Information */}
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Supplier Information</h3>
                        {medicine.supplier ? (
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Name</span>
                                    <span className="text-sm font-medium text-slate-800">{medicine.supplier.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Contact Person</span>
                                    <span className="text-sm font-medium text-slate-800">{medicine.supplier.contactPerson || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Phone</span>
                                    <span className="text-sm font-medium text-slate-800">{medicine.supplier.phone || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Email</span>
                                    <span className="text-sm font-medium text-slate-800">{medicine.supplier.email || "—"}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No supplier assigned</p>
                        )}
                    </CardBody>
                </Card>

                {/* Timestamps */}
                <Card className="col-span-2">
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Record Information</h3>
                        <div className="flex gap-8">
                            <div>
                                <span className="text-sm text-slate-500">Created</span>
                                <p className="text-sm font-medium text-slate-800">{formatDate(medicine.createdAt)}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Last Updated</span>
                                <p className="text-sm font-medium text-slate-800">{formatDate(medicine.updatedAt)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Edit Modal */}
            <EditMedicineModal
                open={editOpen}
                onClose={() => { setEditOpen(false); setEditError(""); }}
                medicine={medicine}
                onUpdate={(data: any) => updateMutation.mutate(data)}
                isPending={updateMutation.isPending}
                error={editError}
            />

            {/* Delete Confirmation Modal */}
            <Modal open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }} title="Delete Medicine" size="sm">
                <div className="space-y-4 mt-2">
                    {deleteError && <Alert type="error">{deleteError}</Alert>}
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Delete permanently?</p>
                            <p className="text-sm text-red-600">
                                This will permanently delete <strong>{medicine.name}</strong>. This action cannot be undone.
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