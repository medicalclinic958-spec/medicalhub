// components/pharmacy/edit-supplier-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, FormField, Input, Select, Button, Alert, Badge } from "@/components/ui";
import { updateSupplierSchema, UpdateSupplierInput } from "@/lib/validations";

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
}

interface Props {
    open: boolean;
    onClose: () => void;
    supplier: SupplierDetail;
    onUpdate: (data: UpdateSupplierInput) => void;
    isPending: boolean;
    error: string;
}

const categoryOptions = [
    "Antibiotics", "Analgesics", "Antihypertensives", "Antidiabetics",
    "Vitamins", "Vaccines", "Surgical Items", "Syringes", "Equipment",
    "Generic Medicines", "Branded Medicines", "OTC"
];

export function EditSupplierModal({ open, onClose, supplier, onUpdate, isPending, error }: Props) {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateSupplierInput>({
        resolver: zodResolver(updateSupplierSchema),
    });

    useEffect(() => {
        if (supplier) {
            reset({
                name: supplier.name,
                type: supplier.type as "company" | "individual",
                contactPerson: supplier.contactPerson || "",
                phone: supplier.phone,
                alternatePhone: supplier.alternatePhone || "",
                email: supplier.email || "",
                address: supplier.address || "",
                taxId: supplier.taxId || "",
                licenseNumber: supplier.licenseNumber || "",
                website: supplier.website || "",
                paymentTerms: supplier.paymentTerms || "",
                bankName: supplier.bankName || "",
                accountNumber: supplier.accountNumber || "",
                notes: supplier.notes || "",
                isActive: supplier.isActive,
            });
            setSelectedCategories(supplier.categories || []);
        }
    }, [supplier, reset]);

    const handleFormSubmit = (data: UpdateSupplierInput) => {
        onUpdate({ ...data, categories: selectedCategories });
    };

    return (
        <Modal open={open} onClose={onClose} title="Edit Supplier" size="lg">
            {error && <Alert type="error">{error}</Alert>}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-2">
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
                <FormField label="Status">
                    <Select {...register("isActive", { setValueAs: (v: string) => v === "true" })}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </Select>
                </FormField>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={isPending}>Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
}