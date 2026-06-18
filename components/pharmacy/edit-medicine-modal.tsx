// components/pharmacy/edit-medicine-modal.tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Modal, FormField, Input, Select, Button, Alert } from "@/components/ui";
import { updateMedicineSchema, UpdateMedicineInput } from "@/lib/validations";

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
    supplier?: string | { _id: string; name: string };
    storageCondition?: string;
    storageLocation?: string;
    isActive: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    medicine: MedicineDetail;
    onUpdate: (data: UpdateMedicineInput) => void;
    isPending: boolean;
    error: string;
}

export function EditMedicineModal({ open, onClose, medicine, onUpdate, isPending, error }: Props) {
    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers-active"],
        queryFn: () => axios.get("/api/supplier", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
        enabled: open,
    });

    const suppliers = suppliersData?.data || [];

    const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateMedicineInput>({
        resolver: zodResolver(updateMedicineSchema),
    });

    useEffect(() => {
        if (medicine) {
            const supplierId = typeof medicine.supplier === "object" && medicine.supplier?._id ? medicine.supplier._id : medicine.supplier || "";
            reset({
                name: medicine.name,
                genericName: medicine.genericName,
                category: medicine.category,
                manufacturer: medicine.manufacturer || "",
                unit: medicine.unit,
                currentStock: medicine.currentStock,
                minStockLevel: medicine.minStockLevel,
                unitCost: medicine.unitCost,
                sellingPrice: medicine.sellingPrice,
                batchNumber: medicine.batchNumber || "",
                expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString().split("T")[0] : "",
                supplier: supplierId as string,
                storageCondition: medicine.storageCondition || "",
                storageLocation: medicine.storageLocation || "",
                isActive: medicine.isActive,
            });
        }
    }, [medicine, reset]);

    return (
        <Modal open={open} onClose={onClose} title="Edit Medicine" size="lg">
            {error && <Alert type="error">{error}</Alert>}
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Brand Name" required error={errors.name?.message}>
                        <Input {...register("name")} error={!!errors.name} />
                    </FormField>
                    <FormField label="Generic Name" required error={errors.genericName?.message}>
                        <Input {...register("genericName")} error={!!errors.genericName} />
                    </FormField>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField label="Category" required error={errors.category?.message}>
                        <Select {...register("category")} error={!!errors.category}>
                            <option value="">Select</option>
                            {["Antibiotic", "Analgesic", "Antihypertensive", "Antidiabetic", "Antacid", "Vitamin", "Steroid", "Antihistamine", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Unit" required error={errors.unit?.message}>
                        <Select {...register("unit")} error={!!errors.unit}>
                            <option value="">Select</option>
                            {["tablet", "capsule", "ml", "mg", "syrup", "injection", "cream", "drops", "inhaler", "sachet"].map(u => <option key={u} value={u}>{u}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Manufacturer">
                        <Input {...register("manufacturer")} />
                    </FormField>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField label="Current Stock" required error={errors.currentStock?.message}>
                        <Input type="number" {...register("currentStock", { valueAsNumber: true })} error={!!errors.currentStock} />
                    </FormField>
                    <FormField label="Min Stock Level" required error={errors.minStockLevel?.message}>
                        <Input type="number" {...register("minStockLevel", { valueAsNumber: true })} error={!!errors.minStockLevel} />
                    </FormField>
                    <FormField label="Expiry Date">
                        <Input type="date" {...register("expiryDate")} />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Storage Condition">
                        <Select {...register("storageCondition")}>
                            <option value="">Select</option>
                            {["Room Temperature", "Refrigerated (2-8°C)", "Cool & Dry Place", "Freezer", "Protect from Light", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Storage Location">
                        <Input {...register("storageLocation")} placeholder="e.g., Shelf A-1, Window 1, Cold Storage 2" />
                    </FormField>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField label="Unit Cost (PKR)" required error={errors.unitCost?.message}>
                        <Input type="number" {...register("unitCost", { valueAsNumber: true })} error={!!errors.unitCost} />
                    </FormField>
                    <FormField label="Selling Price (PKR)" required error={errors.sellingPrice?.message}>
                        <Input type="number" {...register("sellingPrice", { valueAsNumber: true })} error={!!errors.sellingPrice} />
                    </FormField>
                    <FormField label="Batch Number">
                        <Input {...register("batchNumber")} />
                    </FormField>
                </div>
                <FormField label="Supplier">
                    <Select {...register("supplier")}>
                        <option value="">Select supplier (optional)</option>
                        {suppliers.map((s: { _id: string; name: string; type: string }) => (
                            <option key={s._id} value={s._id}>{s.name} ({s.type})</option>
                        ))}
                    </Select>
                </FormField>
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