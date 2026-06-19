// components/inventory/inventory-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Box, Pencil, Trash2, MapPin, Package, DollarSign } from "lucide-react";
import { Card, CardBody, Badge, Button, Modal, Alert } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { EditInventoryModal } from "./edit-inventory-modal";

interface InventoryDetail {
    _id: string;
    name: string;
    category: string;
    sku?: string;
    currentQuantity: number;
    minQuantity: number;
    unit: string;
    unitCost: number;
    location?: string;
    supplier?: { _id: string; name: string; phone: string; email: string };
    isActive: boolean;
    lastRestockedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export function InventoryDetailClient({ itemId }: { itemId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editError, setEditError] = useState("");

    const isSA = session?.user?.isSuperAdmin;
    const perms = session?.user?.permissions || [];
    const canUpdate = isSA || perms.includes("inventory:update");
    const canDelete = isSA || perms.includes("inventory:delete");

    const { data, isLoading } = useQuery({
        queryKey: ["inventory", itemId],
        queryFn: () => axios.get(`/api/inventory/${itemId}`).then(r => r.data),
    });

    const item: InventoryDetail | null = data?.data || null;

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/inventory/${itemId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["inventory"] });
            router.push("/dashboard/inventory");
        },
        onError: (e: unknown) => {
            setDeleteError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (d: any) => axios.put(`/api/inventory/${itemId}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["inventory", itemId] });
            qc.invalidateQueries({ queryKey: ["inventory"] });
            setEditOpen(false);
            setEditError("");
        },
        onError: (e: unknown) => setEditError((e as any)?.response?.data?.error || "Failed"),
    });

    if (isLoading) {
        return (
            <div className="space-y-5">
                <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
                <Card><CardBody><div className="h-64 bg-slate-50 rounded animate-pulse" /></CardBody></Card>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="space-y-5">
                <Button variant="secondary" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Card><CardBody><p className="text-center text-slate-500 py-12">Inventory item not found</p></CardBody></Card>
            </div>
        );
    }

    const isLow = item.currentQuantity <= item.minQuantity;
    const totalValue = item.currentQuantity * item.unitCost;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <Box className="w-5 h-5 text-blue-600" />
                            <h1 className="text-xl font-bold text-slate-800">{item.name}</h1>
                            <Badge variant={item.isActive ? "success" : "default"}>
                                {item.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {isLow && <Badge variant="warning">Low Stock</Badge>}
                        </div>
                        <p className="text-sm text-slate-500 capitalize">{item.category} • {item.sku || "No SKU"}</p>
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
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" /> Stock Information
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Current Quantity</span>
                                <span className={`text-sm font-semibold ${isLow ? "text-red-500" : "text-slate-800"}`}>
                                    {item.currentQuantity} {item.unit}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Minimum Quantity</span>
                                <span className="text-sm font-medium text-slate-800">{item.minQuantity} {item.unit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Unit</span>
                                <span className="text-sm font-medium text-slate-800">{item.unit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Category</span>
                                <Badge variant="outline" className="capitalize">{item.category}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">SKU</span>
                                <span className="text-sm font-mono text-slate-500">{item.sku || "—"}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-blue-600" /> Cost & Value
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Unit Cost</span>
                                <span className="text-sm font-medium text-slate-800">PKR {item.unitCost?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Total Stock Value</span>
                                <span className="text-sm font-semibold text-blue-600">PKR {totalValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Last Restocked</span>
                                <span className="text-sm font-medium text-slate-800">
                                    {item.lastRestockedAt ? formatDate(item.lastRestockedAt) : "—"}
                                </span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" /> Location & Supplier
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Location</span>
                                <span className="text-sm font-medium text-slate-800">{item.location || "—"}</span>
                            </div>
                            {item.supplier ? (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-500">Supplier</span>
                                        <span className="text-sm font-medium text-slate-800">{item.supplier.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-500">Phone</span>
                                        <span className="text-sm text-slate-700">{item.supplier.phone}</span>
                                    </div>
                                    {item.supplier.email && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Email</span>
                                            <span className="text-sm text-slate-700">{item.supplier.email}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Supplier</span>
                                    <span className="text-sm text-slate-400">No supplier assigned</span>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Record Information</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Created</span>
                                <span className="text-sm font-medium text-slate-800">{formatDate(item.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Last Updated</span>
                                <span className="text-sm font-medium text-slate-800">{formatDate(item.updatedAt)}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            <Modal open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }} title="Delete Inventory Item" size="sm">
                <div className="space-y-4 mt-2">
                    {deleteError && <Alert type="error">{deleteError}</Alert>}
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Delete permanently?</p>
                            <p className="text-sm text-red-600">
                                This will permanently delete <strong>{item.name}</strong>. This action cannot be undone.
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

            <EditInventoryModal
                open={editOpen}
                onClose={() => { setEditOpen(false); setEditError(""); }}
                item={item}
                onUpdate={(data) => updateMutation.mutate(data)}
                isPending={updateMutation.isPending}
                error={editError}
            />
        </div>
    );
}