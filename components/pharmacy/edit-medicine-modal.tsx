// components/pharmacy/edit-medicine-modal.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { Modal, FormField, Input, Select, Button, Alert } from "@/components/ui";
import { updateMedicineSchema, UpdateMedicineInput } from "@/lib/validations";
import { Camera, Loader2, Barcode as BarcodeIcon } from "lucide-react";

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
    barcode?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    medicine: MedicineDetail;
    onUpdate: (data: UpdateMedicineInput) => void;
    isPending: boolean;
    error: string;
}

const SCANNER_ELEMENT_ID = "edit-medicine-barcode-scanner";

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

    // --- Barcode state (separate from the main form — saved via its own endpoint) ---
    const [barcodeValue, setBarcodeValue] = useState(medicine?.barcode || "");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerStarting, setScannerStarting] = useState(false);
    const [scannerError, setScannerError] = useState("");
    const [savingBarcode, setSavingBarcode] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

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
            setBarcodeValue(medicine.barcode || "");
        }
    }, [medicine, reset]);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2 /* SCANNING */) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch {
                // already stopped — ignore
            }
            scannerRef.current = null;
        }
    }, []);

    const handleScanSuccess = useCallback(async (decodedText: string) => {
        if (savingBarcode) return;
        await stopScanner();

        const code = decodedText.trim();
        setSavingBarcode(true);
        setScannerError("");

        try {
            await axios.post("/api/pharmacy/barcode", { medicineId: medicine._id, barcode: code });
            setBarcodeValue(code);
            setScannerOpen(false);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setScannerError(msg || "Failed to save barcode. Please try again.");
        } finally {
            setSavingBarcode(false);
        }
    }, [savingBarcode, stopScanner, medicine?._id]);

    useEffect(() => {
        if (!scannerOpen) {
            stopScanner();
            return;
        }

        let cancelled = false;
        setScannerError("");
        setScannerStarting(true);

        const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = instance;

        instance
            .start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 260, height: 160 } },
                (decodedText) => handleScanSuccess(decodedText),
                () => { /* per-frame miss — expected, ignore */ }
            )
            .then(() => {
                if (!cancelled) setScannerStarting(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setScannerStarting(false);
                    setScannerError("Camera access failed. Check permissions and try again.");
                }
            });

        return () => {
            cancelled = true;
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scannerOpen]);

    const closeScanner = () => {
        setScannerOpen(false);
        setScannerError("");
    };

    return (
        <>
            <Modal open={open} onClose={onClose} title="Edit Medicine" size="lg">
                {error && <Alert type="error">{error}</Alert>}
                <form onSubmit={handleSubmit(onUpdate)} className="space-y-4 mt-2">
                    <FormField label="Barcode">
                        <div className="flex items-center gap-2">
                            <Input
                                value={barcodeValue}
                                disabled
                                readOnly
                                placeholder="No barcode assigned"
                                className="flex-1"
                            />
                            <button
                                type="button"
                                onClick={() => setScannerOpen(true)}
                                className="cursor-pointer flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 font-medium whitespace-nowrap px-2 py-2"
                            >
                                <Camera className="w-4 h-4" />
                                {barcodeValue ? "Edit Barcode" : "Add Barcode"}
                            </button>
                        </div>
                    </FormField>

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

            {/* Scanner sub-modal */}
            <Modal open={scannerOpen} onClose={closeScanner} title={barcodeValue ? "Edit Barcode" : "Add Barcode"} size="md">
                <div className="space-y-3">
                    {scannerError && <Alert type="error">{scannerError}</Alert>}

                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <div id={SCANNER_ELEMENT_ID} className="w-full min-h-[260px] [&_video]:rounded-lg" />

                        {(scannerStarting || savingBarcode) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {savingBarcode ? "Saving barcode..." : "Starting camera..."}
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
                        <BarcodeIcon className="w-3.5 h-3.5" />
                        Align the barcode within the frame. It will scan automatically.
                    </p>

                    <style jsx global>{`
                        #${SCANNER_ELEMENT_ID} > div:first-child > div {
                            border: 3px solid #0d9488 !important;
                            border-radius: 8px !important;
                            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
                        }
                    `}</style>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={closeScanner}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}