// components/billing/pharmacy-sale-section.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardBody, Button, FormField, Input, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { UseFormSetValue } from "react-hook-form";

interface LineItem {
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    total: number;
    medicine?: string;
}

interface Props {
    watchedItems: LineItem[];
    setValue: UseFormSetValue<any>;
    register: any;
}

export function PharmacySaleSection({ watchedItems, setValue, register }: Props) {
    const [selectedMedicine, setSelectedMedicine] = useState("");
    const [medicineQty, setMedicineQty] = useState(1);
    const [medicineError, setMedicineError] = useState("");

    const { data: medicinesData } = useQuery({
        queryKey: ["medicines-select"],
        queryFn: () => axios.get("/api/pharmacy", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
    });

    const { data: patientsData } = useQuery({
        queryKey: ["patients-select"],
        queryFn: () => axios.get("/api/patients", { params: { limit: 200 } }).then(r => r.data),
    });

    const medicines = medicinesData?.data || [];
    const patients = patientsData?.data || [];
    const selectedMedicineData = medicines.find((m: any) => m._id === selectedMedicine);

    // Track local stock changes
    const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({});

    const getAvailableStock = (medicineId: string, originalStock: number) => {
        const adjustment = stockAdjustments[medicineId] || 0;
        return originalStock - adjustment;
    };

    const addMedicineItem = () => {
        if (!selectedMedicineData) return;

        const available = getAvailableStock(selectedMedicine, selectedMedicineData.currentStock);

        if (medicineQty < 1) {
            setMedicineError("Quantity must be at least 1");
            return;
        }

        if (medicineQty > available) {
            setMedicineError(`Only ${available} in stock`);
            return;
        }

        const item: LineItem = {
            description: `${selectedMedicineData.name} (${selectedMedicineData.genericName})`,
            category: "medicine",
            quantity: medicineQty,
            unitPrice: selectedMedicineData.sellingPrice,
            total: selectedMedicineData.sellingPrice * medicineQty,
            medicine: selectedMedicineData._id,
        };

        setValue("items", [...watchedItems, item]);
        setStockAdjustments(prev => ({
            ...prev,
            [selectedMedicine]: (prev[selectedMedicine] || 0) + medicineQty,
        }));
        setSelectedMedicine("");
        setMedicineQty(1);
        setMedicineError("");
    };

    const handleRemove = (index: number) => {
        const item = watchedItems[index];
        if (item.medicine) {
            setStockAdjustments(prev => ({
                ...prev,
                [item.medicine!]: (prev[item.medicine!] || 0) - item.quantity,
            }));
        }
        setValue("items", watchedItems.filter((_, i) => i !== index));
    };

    return (
        <Card>
            <CardHeader><h3 className="font-semibold text-slate-700">Add Medicines</h3></CardHeader>
            <CardBody>
                <div className="grid grid-cols-5 gap-3 items-end">
                    <div className="col-span-2">
                        <FormField label="Medicine">
                            <Select value={selectedMedicine} onChange={(e) => { setSelectedMedicine(e.target.value); setMedicineError(""); }}>
                                <option value="">Select medicine</option>
                                {medicines.map((m: any) => {
                                    const available = getAvailableStock(m._id, m.currentStock);
                                    return (
                                        <option key={m._id} value={m._id} disabled={available === 0}>
                                            {m.name} ({m.genericName}) - {formatCurrency(m.sellingPrice)} {available === 0 ? "(Out of stock)" : `(Stock: ${available})`}
                                        </option>
                                    );
                                })}
                            </Select>
                        </FormField>
                    </div>
                    <FormField label="Quantity">
                        <Input type="number" min={1} value={medicineQty} onChange={(e) => { setMedicineQty(Number(e.target.value)); setMedicineError(""); }} />
                    </FormField>
                    <Button type="button" onClick={addMedicineItem} disabled={!selectedMedicine} className="mb-0">
                        <Plus className="w-4 h-4" /> Add
                    </Button>
                </div>
                {medicineError && <p className="text-sm text-red-500 mt-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {medicineError}</p>}
                {selectedMedicineData && (
                    <p className="text-xs text-slate-400 mt-2">Available stock: {getAvailableStock(selectedMedicine, selectedMedicineData.currentStock)} {selectedMedicineData.unit}</p>
                )}

                <div className="mt-4">
                    <FormField label="Patient">
                        <Select {...register("patient")}>
                            <option value="">Select patient (optional)</option>
                            {patients.map((p: any) => (
                                <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>
                            ))}
                        </Select>
                    </FormField>
                </div>

                {/* Added medicines list with remove */}
                {watchedItems.filter(i => i.category === "medicine").length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-slate-600">Added Items</p>
                        {watchedItems.map((item, i) => (
                            item.category === "medicine" && (
                                <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                    <div className="text-sm">
                                        <span className="font-medium">{item.description}</span>
                                        <span className="text-slate-400 ml-2">× {item.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
                                        <button type="button" onClick={() => handleRemove(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}