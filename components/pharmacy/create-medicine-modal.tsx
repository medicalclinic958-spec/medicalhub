// components/pharmacy/MedicineCreateModal.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
    Modal,
    FormField,
    Input,
    Select,
    Alert,
    Button,
} from "@/components/ui";
import { createMedicineSchema, CreateMedicineInput } from "@/lib/validations";
import { ScanLine, PenLine, Loader2 } from "lucide-react";

interface MedicineCreateModalProps {
    open: boolean;
    onClose: () => void;
}

type TabKey = "manual" | "scan";

const SCANNER_ELEMENT_ID = "medicine-barcode-scanner";

export function MedicineCreateModal({ open, onClose }: MedicineCreateModalProps) {
    const qc = useQueryClient();
    const [createError, setCreateError] = useState("");
    const [activeTab, setActiveTab] = useState<TabKey>("manual");

    // --- Scanner state ---
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scannerStarting, setScannerStarting] = useState(false);
    const [scannerError, setScannerError] = useState("");
    const [checkingBarcode, setCheckingBarcode] = useState(false);
    const [existingMedicine, setExistingMedicine] = useState<{ _id: string; name: string; genericName: string; currentStock: number } | null>(null);
    const [scannedBarcode, setScannedBarcode] = useState("");

    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers-active"],
        queryFn: () => axios.get("/api/supplier", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
        enabled: open,
    });

    const suppliers = suppliersData?.data || [];

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateMedicineInput>({
        resolver: zodResolver(createMedicineSchema),
    });

    const createMutation = useMutation({
        mutationFn: (d: CreateMedicineInput) => axios.post("/api/pharmacy", d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["medicines"] });
            handleClose();
        },
        onError: (e: unknown) => {
            setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create medicine");
        },
    });

    // --- Stop camera safely ---
    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2 /* SCANNING */) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch {
                // scanner already stopped/cleared — ignore
            }
            scannerRef.current = null;
        }
    }, []);

    // --- Handle a successful decode ---
    const handleScanSuccess = useCallback(async (decodedText: string) => {
        if (checkingBarcode) return; // avoid duplicate fires while we're already checking
        await stopScanner();

        const code = decodedText.trim();
        setScannedBarcode(code);
        setCheckingBarcode(true);
        setScannerError("");
        setExistingMedicine(null);

        try {
            const res = await axios.get("/api/pharmacy/barcode", { params: { barcode: code } });
            const result = res.data?.data;

            if (result?.status === "found" && result.medicine) {
                // Already exists — notify, don't open the form
                setExistingMedicine(result.medicine);
            } else {
                // New barcode — prefill form, disable the field, switch to manual tab
                reset();
                setValue("barcode", code);
                setExistingMedicine(null);
                setActiveTab("manual");
            }
        } catch {
            setScannerError("Could not verify barcode. Please try again or enter manually.");
        } finally {
            setCheckingBarcode(false);
        }
    }, [checkingBarcode, reset, setValue, stopScanner]);

    // --- Start/stop camera based on active tab ---
    useEffect(() => {
        if (!open || activeTab !== "scan") {
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
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                () => {
                    // per-frame decode failure — expected constantly, ignore
                }
            )
            .then(() => {
                if (!cancelled) setScannerStarting(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setScannerStarting(false);
                    setScannerError("Camera access failed. Check permissions or use Manual Entry.");
                }
            });

        return () => {
            cancelled = true;
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, activeTab]);

    const handleClose = () => {
        stopScanner();
        onClose();
        reset();
        setCreateError("");
        setScannerError("");
        setExistingMedicine(null);
        setScannedBarcode("");
        setActiveTab("manual");
    };

    const handleScanAgain = () => {
        setExistingMedicine(null);
        setScannedBarcode("");
        setActiveTab("scan");
    };

    return (
        <Modal open={open} onClose={handleClose} title="Add Medicine" size="lg">
            {/* Tab switcher */}
            <div className="flex gap-2 border-b border-slate-200 mb-4">
                <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "manual"
                            ? "border-teal-600 text-teal-700"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <PenLine className="w-4 h-4" />
                    Manual Entry
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("scan")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "scan"
                            ? "border-teal-600 text-teal-700"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <ScanLine className="w-4 h-4" />
                    Scan Barcode
                </button>
            </div>

            {createError && <Alert type="error">{createError}</Alert>}

            {/* --- SCAN TAB --- */}
            {activeTab === "scan" && (
                <div className="space-y-3">
                    {existingMedicine ? (
                        <Alert type="warning">
                            <div className="space-y-2">
                                <p>
                                    A medicine with this barcode already exists:{" "}
                                    <strong>{existingMedicine.name}</strong> ({existingMedicine.genericName}) — current stock:{" "}
                                    {existingMedicine.currentStock}.
                                </p>
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="secondary" onClick={handleScanAgain}>
                                        Scan Again
                                    </Button>
                                    <Button type="button" size="sm" variant="secondary" onClick={handleClose}>
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </Alert>
                    ) : (
                        <>
                            {scannerError && <Alert type="error">{scannerError}</Alert>}

                            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                <div id={SCANNER_ELEMENT_ID} className="w-full min-h-[260px] [&_video]:rounded-lg" />

                                {(scannerStarting || checkingBarcode) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {checkingBarcode ? "Checking barcode..." : "Starting camera..."}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-slate-500 text-center">
                                Align the barcode within the frame. It will scan automatically.
                            </p>

                            {/* Custom teal scan-frame overlay — html5-qrcode's default box is a plain border;
                                this overlays our own styled frame on top of it. */}
                            <style jsx global>{`
                                #${SCANNER_ELEMENT_ID} > div:first-child > div {
                                    border: 3px solid #0d9488 !important;
                                    border-radius: 8px !important;
                                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
                                }
                            `}</style>
                        </>
                    )}
                </div>
            )}

            {/* --- MANUAL TAB (also used after a successful new-barcode scan) --- */}
            {activeTab === "manual" && (
                <form
                    onSubmit={handleSubmit(d => createMutation.mutate(d))}
                    className="space-y-4 mt-2"
                >
                    {scannedBarcode && (
                        <FormField label="Barcode">
                            <Input value={scannedBarcode} disabled readOnly />
                            <input type="hidden" {...register("barcode")} value={scannedBarcode} />
                        </FormField>
                    )}

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
                                {["Antibiotic", "Analgesic", "Antihypertensive", "Antidiabetic", "Antacid", "Vitamin", "Steroid", "Antihistamine", "Other"].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </FormField>
                        <FormField label="Unit" required error={errors.unit?.message}>
                            <Select {...register("unit")} error={!!errors.unit}>
                                <option value="">Select</option>
                                {["tablet", "capsule", "ml", "mg", "syrup", "injection", "cream", "drops", "inhaler", "sachet"].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
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
                                {["Room Temperature", "Refrigerated (2-8°C)", "Cool & Dry Place", "Freezer", "Protect from Light", "Other"].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </FormField>
                        <FormField label="Storage Location">
                            <Input {...register("storageLocation")} placeholder="e.g., Shelf A-1, Window 1, Cold Storage 2" />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Unit Cost (PKR)" required error={errors.unitCost?.message}>
                            <Input type="number" {...register("unitCost", { valueAsNumber: true })} error={!!errors.unitCost} />
                        </FormField>
                        <FormField label="Selling Price (PKR)" required error={errors.sellingPrice?.message}>
                            <Input type="number" {...register("sellingPrice", { valueAsNumber: true })} error={!!errors.sellingPrice} />
                        </FormField>
                    </div>

                    <FormField label="Supplier">
                        <Select {...register("supplier")}>
                            <option value="">Select supplier (optional)</option>
                            {suppliers.map((s: { _id: string; name: string; type: string }) => (
                                <option key={s._id} value={s._id}>
                                    {s.name} ({s.type})
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createMutation.isPending}>
                            Add Medicine
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}