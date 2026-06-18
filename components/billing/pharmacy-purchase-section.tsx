// components/billing/pharmacy-purchase-section.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Trash2 } from "lucide-react";
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
    batchNumber?: string;
}

interface Props {
    watchedItems: LineItem[];
    setValue: UseFormSetValue<any>;
    register: any;
}

export function PharmacyPurchaseSection({ watchedItems, setValue, register }: Props) {
    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers-select"],
        queryFn: () => axios.get("/api/supplier", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
    });

    const suppliers = suppliersData?.data || [];

    const addPurchaseItem = () => {
        setValue("items", [...watchedItems, { description: "", category: "medicine", quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const updatePurchaseItem = (index: number, field: string, value: any) => {
        const updated = [...watchedItems];
        updated[index] = { ...updated[index], [field]: value };
        if (field === "quantity" || field === "unitPrice") {
            updated[index].total = updated[index].quantity * updated[index].unitPrice;
        }
        setValue("items", updated);
    };

    const removeItem = (index: number) => {
        setValue("items", watchedItems.filter((_, i) => i !== index));
    };

    return (
        <Card>
            <CardHeader><h3 className="font-semibold text-slate-700">Purchase Details</h3></CardHeader>
            <CardBody className="space-y-4">
                <FormField label="Supplier" required>
                    <Select {...register("supplier", { required: "Supplier is required" })}>
                        <option value="">Select supplier</option>
                        {suppliers.map((s: any) => (
                            <option key={s._id} value={s._id}>{s.name} ({s.type})</option>
                        ))}
                    </Select>
                </FormField>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-600">Items Purchased</p>
                        <Button type="button" size="sm" variant="outline" onClick={addPurchaseItem}>
                            <Plus className="w-3.5 h-3.5" /> Add Item
                        </Button>
                    </div>

                    {watchedItems.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                            No items added. Click "Add Item" to start.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {watchedItems.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="col-span-5">
                                        <Input
                                            placeholder="Item description"
                                            value={item.description}
                                            onChange={(e) => updatePurchaseItem(i, "description", e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="Qty"
                                            value={item.quantity}
                                            onChange={(e) => updatePurchaseItem(i, "quantity", Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="Price"
                                            value={item.unitPrice}
                                            onChange={(e) => updatePurchaseItem(i, "unitPrice", Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}