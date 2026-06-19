// components/inventory/edit-inventory-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Modal, FormField, Input, Select, Button, Alert } from "@/components/ui";
import { z } from "zod";

const updateInventorySchema = z.object({
    name: z.string().min(1),
    category: z.enum(["equipment", "supply", "consumable"]),
    sku: z.string().optional(),
    currentQuantity: z.number().min(0),
    minQuantity: z.number().min(0),
    unit: z.string().min(1),
    unitCost: z.number().min(0),
    location: z.string().optional(),
    supplier: z.string().optional(),
    isActive: z.boolean(),
});

type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;

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
    supplier?: { _id: string; name: string } | string;
    isActive: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    item: InventoryDetail;
    onUpdate: (data: any) => void;
    isPending: boolean;
    error: string;
}

export function EditInventoryModal({ open, onClose, item, onUpdate, isPending, error }: Props) {
    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers-active"],
        queryFn: () => axios.get("/api/supplier", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
        enabled: open,
    });

    const suppliers = suppliersData?.data || [];

    const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateInventoryInput>({
        resolver: zodResolver(updateInventorySchema),
    });

    useEffect(() => {
        if (item) {
            const supplierId = typeof item.supplier === "object" && item.supplier?._id ? item.supplier._id : item.supplier || "";
            reset({
                name: item.name,
                category: item.category as "equipment" | "supply" | "consumable",
                sku: item.sku || "",
                currentQuantity: item.currentQuantity,
                minQuantity: item.minQuantity,
                unit: item.unit,
                unitCost: item.unitCost,
                location: item.location || "",
                supplier: supplierId as string,
                isActive: item.isActive,
            });
        }
    }, [item, reset]);

    return (
        <Modal open={open} onClose={onClose} title="Edit Inventory Item" size="lg">
            {error && <Alert type="error">{error}</Alert>}
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Item Name" required error={errors.name?.message}>
                        <Input {...register("name")} error={!!errors.name} />
                    </FormField>
                    <FormField label="Category" required error={errors.category?.message}>
                        <Select {...register("category")} error={!!errors.category}>
                            <option value="equipment">Equipment</option>
                            <option value="supply">Supply</option>
                            <option value="consumable">Consumable</option>
                        </Select>
                    </FormField>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField label="Current Qty" required error={errors.currentQuantity?.message}>
                        <Input type="number" {...register("currentQuantity", { valueAsNumber: true })} error={!!errors.currentQuantity} />
                    </FormField>
                    <FormField label="Min Qty" required error={errors.minQuantity?.message}>
                        <Input type="number" {...register("minQuantity", { valueAsNumber: true })} error={!!errors.minQuantity} />
                    </FormField>
                    <FormField label="Unit" required error={errors.unit?.message}>
                        <Input {...register("unit")} error={!!errors.unit} />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Unit Cost (PKR)" error={errors.unitCost?.message}>
                        <Input type="number" {...register("unitCost", { valueAsNumber: true })} error={!!errors.unitCost} />
                    </FormField>
                    <FormField label="Location">
                        <Input {...register("location")} />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="SKU">
                        <Input {...register("sku")} />
                    </FormField>
                    <FormField label="Supplier">
                        <Select {...register("supplier")}>
                            <option value="">Select supplier (optional)</option>
                            {suppliers.map((s: { _id: string; name: string; type: string }) => (
                                <option key={s._id} value={s._id}>{s.name} ({s.type})</option>
                            ))}
                        </Select>
                    </FormField>
                </div>
                <FormField label="Status">
                    <Select {...register("isActive", { setValueAs: (v: string) => v === "true" })}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </Select>
                </FormField>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={isPending}>Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
}