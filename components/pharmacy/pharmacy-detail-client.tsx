// components/pharmacy/pharmacy-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Pill, Pencil, Trash2, DollarSign, Warehouse, Truck, Clock, AlertTriangle } from "lucide-react";
import { Card, CardBody, Badge, Button, Modal, Alert } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
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
    barcode?: string;
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
            toast.success("Medicine updated successfully!");
        },
        onError: (e: unknown) => {
            setEditError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update");
            toast.error("Failed to update medicine.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/pharmacy/${medicineId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["medicines"] });
            toast.success("Medicine deleted successfully!");
            router.push("/pharmacy");
        },
        onError: (e: unknown) => {
            setDeleteError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete");
            toast.error("Failed to delete medicine.");
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

    if (!medicine) {
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
                        <p className="text-center text-gray-400 py-12 text-xs">Medicine not found</p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    const isLow = medicine.currentStock <= medicine.minStockLevel;
    const isExpiring = medicine.expiryDate && new Date(medicine.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isExpired = medicine.expiryDate && new Date(medicine.expiryDate) < new Date();
    const profitMargin = medicine.sellingPrice - medicine.unitCost;
    const profitPercent = medicine.unitCost > 0 ? (profitMargin / medicine.unitCost) * 100 : 0;

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
                            <h1 className="text-lg font-semibold text-gray-900 truncate">{medicine.name}</h1>
                            {medicine.isActive ? (
                                <Badge variant="success">Active</Badge>
                            ) : (
                                <Badge variant="default">Inactive</Badge>
                            )}
                            {isExpired && <Badge variant="danger">Expired</Badge>}
                            {isLow && !isExpired && <Badge variant="warning">Low Stock</Badge>}
                            {isExpiring && !isExpired && <Badge variant="warning">Expiring Soon</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{medicine.genericName} • {medicine.category}</p>
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

            {/* Stock Alert Banner */}
            {(isLow || isExpired || isExpiring) && (
                <Alert type={isExpired ? "error" : "warning"}>
                    <span className="text-xs">
                        {isExpired
                            ? "This medicine has expired and should be removed from inventory."
                            : isLow
                                ? `Low stock alert! Only ${medicine.currentStock} ${medicine.unit}(s) remaining.`
                                : `Expiring soon — ${formatDate(medicine.expiryDate!)}`}
                    </span>
                </Alert>
            )}

            {/* Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Basic Info */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Pill className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Basic Information</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Brand Name" value={medicine.name} />
                            <Row label="Generic Name" value={medicine.genericName} />
                            <Row label="Category">
                                <Badge variant="outline">{medicine.category}</Badge>
                            </Row>
                            <Row label="Manufacturer" value={medicine.manufacturer || "—"} />
                            <Row label="Unit" value={medicine.unit} />
                            <Row label="Batch No." value={medicine.batchNumber || "—"} />
                            {medicine.barcode && <Row label="Barcode" value={medicine.barcode} mono />}
                        </div>
                    </CardBody>
                </Card>

                {/* Stock & Pricing */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Stock & Pricing</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Current Stock">
                                <span className={isLow ? "text-red-500 font-semibold" : "text-gray-700 font-semibold"}>
                                    {medicine.currentStock}
                                </span>
                                <span className="text-gray-400 ml-1">{medicine.unit}</span>
                            </Row>
                            <Row label="Min Stock Level">
                                <span className="text-gray-700">{medicine.minStockLevel}</span>
                                <span className="text-gray-400 ml-1">{medicine.unit}</span>
                            </Row>
                            <Row label="Unit Cost" value={`PKR ${medicine.unitCost?.toLocaleString()}`} />
                            <Row label="Selling Price" value={`PKR ${medicine.sellingPrice?.toLocaleString()}`} />
                            <Row label="Profit">
                                <span className="text-teal-600 font-medium">
                                    PKR {profitMargin.toLocaleString()} ({profitPercent.toFixed(1)}%)
                                </span>
                            </Row>
                            <Row label="Expiry Date">
                                {medicine.expiryDate ? (
                                    <span className={
                                        isExpired ? "text-red-500 font-medium" : isExpiring ? "text-amber-600 font-medium" : "text-gray-700"
                                    }>
                                        {formatDate(medicine.expiryDate)}
                                    </span>
                                ) : (
                                    <span className="text-gray-300">—</span>
                                )}
                            </Row>
                        </div>
                    </CardBody>
                </Card>

                {/* Storage Info */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Warehouse className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Storage</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Condition" value={medicine.storageCondition || "—"} />
                            <Row label="Location" value={medicine.storageLocation || "—"} />
                        </div>
                    </CardBody>
                </Card>

                {/* Supplier Info */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Truck className="w-4 h-4 text-teal-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Supplier</h3>
                        </div>
                        {medicine.supplier ? (
                            <div className="space-y-2.5">
                                <Row label="Name" value={medicine.supplier.name} />
                                <Row label="Contact" value={medicine.supplier.contactPerson || "—"} />
                                <Row label="Phone" value={medicine.supplier.phone || "—"} />
                                <Row label="Email" value={medicine.supplier.email || "—"} />
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">No supplier assigned</p>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Record Info */}
            <Card>
                <CardBody>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-gray-400" />
                        </div>
                        <h3 className="text-xs font-semibold text-gray-900">Record Information</h3>
                    </div>
                    <div className="flex gap-6 sm:gap-10">
                        <div>
                            <p className="text-xs text-gray-400">Created</p>
                            <p className="text-xs text-gray-700 mt-0.5">{formatDate(medicine.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Last Updated</p>
                            <p className="text-xs text-gray-700 mt-0.5">{formatDate(medicine.updatedAt)}</p>
                        </div>
                    </div>
                </CardBody>
            </Card>

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
            <Modal
                open={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}
                title="Delete Medicine"
                size="sm"
            >
                <div className="space-y-4 mt-2">
                    {deleteError && <Alert type="error">{deleteError}</Alert>}
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-red-800">Delete permanently?</p>
                            <p className="text-xs text-red-600 mt-0.5">
                                This will permanently delete <strong>{medicine.name}</strong>. This action cannot be undone.
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
function Row({ label, value, children, mono }: {
    label: string;
    value?: string;
    children?: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            {children ? (
                <span className="text-xs text-right">{children}</span>
            ) : (
                <span className={`text-xs text-gray-700 text-right truncate ${mono ? "font-mono" : ""}`}>
                    {value}
                </span>
            )}
        </div>
    );
}