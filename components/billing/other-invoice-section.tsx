// components/billing/other-invoice-section.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus } from "lucide-react";
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
    invoiceType: "other";
    watchedItems: LineItem[];
    setValue: UseFormSetValue<any>;
    register: any;
}

export function OtherInvoiceSection({ invoiceType, watchedItems, setValue, register }: Props) {
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [patientType, setPatientType] = useState<"registered" | "walkin">("registered");
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
            <CardHeader><h3 className="font-semibold text-slate-700">Other Details</h3></CardHeader>
            <CardBody className="space-y-4">
                <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">Patient Type</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => handlePatientTypeChange("registered")}
                            className={`px-4 py-2 text-sm rounded-lg border ${patientType === "registered" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`}
                        >
                            Registered Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePatientTypeChange("walkin")}
                            className={`px-4 py-2 text-sm rounded-lg border ${patientType === "walkin" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`}
                        >
                            Walk-in Patient
                        </button>
                    </div>
                </div>

                {patientType === "registered" ? (
                    <FormField label="Patient">
                        <Select {...register("patient")}>
                            <option value="">Select patient (optional)</option>
                            {patients.map((p: any) => (
                                <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>
                            ))}
                        </Select>
                    </FormField>
                ) : (
                    <FormField label="Walk-in Patient Name">
                        <Input
                            placeholder="Enter patient name"
                            value={walkInName}
                            onChange={(e) => handleWalkInNameChange(e.target.value)}
                        />
                    </FormField>
                )}

                <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">Add Items</p>
                    <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                            <FormField label="Description">
                                <Input
                                    placeholder="Item description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-2">
                            <FormField label="Qty">
                                <Input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-3">
                            <FormField label="Unit Price">
                                <Input
                                    type="number"
                                    min={0}
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-2">
                            <Button
                                type="button"
                                onClick={addItem}
                                disabled={!description || quantity < 1}
                                className="w-full"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </Button>
                        </div>
                    </div>
                </div>

                {watchedItems.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-slate-600">Added Items</p>
                        {watchedItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                <div className="text-sm">
                                    <span className="font-medium">{item.description}</span>
                                    <span className="text-slate-400 ml-2">× {item.quantity}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
                                    <button
                                        type="button"
                                        onClick={() => setValue("items", watchedItems.filter((_, idx) => idx !== i))}
                                        className="text-red-400 hover:text-red-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}