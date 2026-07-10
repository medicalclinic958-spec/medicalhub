// components/billing/other-invoice-section.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus } from "lucide-react";
import { Card, CardBody, Button, FormField, Input, Select } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
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
    invoiceType: "other";
    watchedItems: LineItem[];
    setValue: UseFormSetValue<any>;
    register: any;
}

export function OtherInvoiceSection({ invoiceType, watchedItems, setValue, register }: Props) {
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [patientType, setPatientType] = useState<"registered" | "walkin">("walkin");
    const [walkInName, setWalkInName] = useState("");

    const { data: patientsData } = useQuery({
        queryKey: ["patients-select"],
        queryFn: () => axios.get("/api/publicPatients", { params: { limit: 200 } }).then(r => r.data),
    });

    const patients = patientsData?.data || [];

    const addItem = () => {
        if (!description || quantity < 1) return;
        const item: LineItem = {
            description,
            category: "other",
            quantity,
            unitPrice,
            total: quantity * unitPrice,
        };
        setValue("items", [...watchedItems, item]);
        setDescription("");
        setQuantity(1);
        setUnitPrice(0);
    };

    const handlePatientTypeChange = (type: "registered" | "walkin") => {
        setPatientType(type);
        setValue("patient", "");
        setValue("patientName", "");
        setWalkInName("");
    };

    const handleWalkInNameChange = (name: string) => {
        setWalkInName(name);
        setValue("patientName", name);
    };

    return (
        <Card>
            <CardBody>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Other Details</h3>

                <div className="space-y-5">
                    {/* Add Items */}
                    <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Add Items</p>
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-1 w-full">
                                <FormField label="Description">
                                    <Input
                                        placeholder="Item description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </FormField>
                            </div>
                            <div className="w-full sm:w-20">
                                <FormField label="Qty">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                    />
                                </FormField>
                            </div>
                            <div className="w-full sm:w-32">
                                <FormField label="Unit Price">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                                    />
                                </FormField>
                            </div>
                            <div className="w-full sm:w-auto">
                                <Button
                                    type="button"
                                    onClick={addItem}
                                    disabled={!description || quantity < 1}
                                    className="w-full"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Added Items */}
                    {watchedItems.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-gray-600">Added Items</p>
                            {watchedItems.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium text-gray-900">{item.description}</span>
                                        <span className="text-xs text-gray-400 ml-2">× {item.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs font-semibold text-gray-700">{formatCurrency(item.total)}</span>
                                        <button
                                            type="button"
                                            onClick={() => setValue("items", watchedItems.filter((_, idx) => idx !== i))}
                                            className="text-xs text-gray-400 cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Patient Type */}
                    <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Patient Type</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handlePatientTypeChange("walkin")}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-lg border cursor-pointer",
                                    patientType === "walkin"
                                        ? "bg-teal-600 text-white border-teal-600"
                                        : "bg-white border-gray-300 text-gray-600"
                                )}
                            >
                                Walk-in Patient
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePatientTypeChange("registered")}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-lg border cursor-pointer",
                                    patientType === "registered"
                                        ? "bg-teal-600 text-white border-teal-600"
                                        : "bg-white border-gray-300 text-gray-600"
                                )}
                            >
                                Registered Patient
                            </button>
                        </div>
                    </div>

                    {/* Patient Select / Walk-in Name */}
                    <div>
                        {patientType === "walkin" ? (
                            <FormField label="Walk-in Patient Name">
                                <Input
                                    placeholder="Enter patient name"
                                    value={walkInName}
                                    onChange={(e) => handleWalkInNameChange(e.target.value)}
                                />
                            </FormField>
                        ) : (
                            <FormField label="Patient">
                                <Select {...register("patient")}>
                                    <option value="">Select patient (optional)</option>
                                    {patients.map((p: any) => (
                                        <option key={p._id} value={p._id}>
                                            {p.firstName} {p.lastName} ({p.patientId})
                                        </option>
                                    ))}
                                </Select>
                            </FormField>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}