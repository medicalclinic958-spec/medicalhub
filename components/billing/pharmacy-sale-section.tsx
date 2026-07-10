// components/billing/pharmacy-sale-section.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, AlertTriangle, Search, X, ScanLine, Loader2, Barcode as BarcodeIcon, Camera, PenLine } from "lucide-react";
import { Card, CardBody, Button, FormField, Input, Select, Modal, Alert } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { UseFormSetValue } from "react-hook-form";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

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

const SCANNER_ELEMENT_ID = "pharmacy-sale-barcode-scanner";

export function PharmacySaleSection({ watchedItems, setValue, register }: Props) {
    const [selectedMedicine, setSelectedMedicine] = useState("");
    const [medicineQty, setMedicineQty] = useState(1);
    const [medicineError, setMedicineError] = useState("");
    const [patientType, setPatientType] = useState<"walkin" | "registered">("walkin");
    const [walkInName, setWalkInName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Barcode scanner state ---
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerStarting, setScannerStarting] = useState(false);
    const [scannerError, setScannerError] = useState("");
    const [checkingBarcode, setCheckingBarcode] = useState(false);
    const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const { data: medicinesData } = useQuery({
        queryKey: ["medicines-select"],
        queryFn: () => axios.get("/api/pharmacy", { params: { limit: 200 } }).then(r => r.data),
    });

    const { data: patientsData } = useQuery({
        queryKey: ["patients-select"],
        queryFn: () => axios.get("/api/publicPatients", { params: { limit: 200 } }).then(r => r.data),
    });

    const medicines = medicinesData?.data || [];
    const patients = patientsData?.data || [];
    const selectedMedicineData = medicines.find((m: any) => m._id === selectedMedicine);

    const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({});

    const getAvailableStock = (medicineId: string, originalStock: number) => {
        const adjustment = stockAdjustments[medicineId] || 0;
        return originalStock - adjustment;
    };

    const filteredMedicines = medicines.filter((m: any) => {
        const available = getAvailableStock(m._id, m.currentStock);
        if (available === 0) return false;
        const searchLower = searchTerm.toLowerCase();
        return (
            m.name.toLowerCase().includes(searchLower) ||
            m.genericName.toLowerCase().includes(searchLower)
        );
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setHighlightedIndex(-1);
    }, [filteredMedicines]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isDropdownOpen) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                setIsDropdownOpen(true);
                e.preventDefault();
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex(prev => prev < filteredMedicines.length - 1 ? prev + 1 : prev);
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredMedicines.length) {
                    handleSelectMedicine(filteredMedicines[highlightedIndex]);
                }
                break;
            case "Escape":
                setIsDropdownOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleSelectMedicine = (medicine: any) => {
        setSelectedMedicine(medicine._id);
        setSearchTerm(medicine.name);
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        setMedicineError("");
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
        setSearchTerm("");
        setMedicineQty(1);
        setMedicineError("");
        inputRef.current?.focus();
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

    const handlePatientTypeChange = (type: "walkin" | "registered") => {
        setPatientType(type);
        setValue("patient", "");
        setValue("patientName", "");
        setWalkInName("");
    };

    const handleWalkInNameChange = (name: string) => {
        setWalkInName(name);
        setValue("patientName", name);
    };

    const clearSearch = () => {
        setSearchTerm("");
        setSelectedMedicine("");
        setIsDropdownOpen(false);
        inputRef.current?.focus();
    };

    // --- Barcode scanning ---
    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2) await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch { /* ignore */ }
            scannerRef.current = null;
        }
    }, []);

    const handleScanSuccess = useCallback(async (decodedText: string) => {
        if (checkingBarcode) return;
        await stopScanner();
        const code = decodedText.trim();
        setCheckingBarcode(true);
        setScannerError("");

        try {
            const local = medicines.find((m: any) => m.barcode === code);
            if (local) {
                const available = getAvailableStock(local._id, local.currentStock);
                if (available <= 0) {
                    setScannerError(`${local.name} is out of stock.`);
                    return;
                }
                handleSelectMedicine(local);
                setScannerOpen(false);
                return;
            }
            const res = await axios.get("/api/pharmacy/barcode", { params: { barcode: code } });
            const result = res.data?.data;
            if (result?.status === "found" && result.medicine) {
                const m = result.medicine;
                const available = getAvailableStock(m._id, m.currentStock);
                if (available <= 0) {
                    setScannerError(`${m.name} is out of stock.`);
                    return;
                }
                handleSelectMedicine(m);
                setScannerOpen(false);
            } else {
                setScannerError("No medicine found for this barcode.");
            }
        } catch {
            setScannerError("Could not verify barcode. Please try again.");
        } finally {
            setCheckingBarcode(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkingBarcode, medicines, stockAdjustments, stopScanner]);

    // --- Start camera when scanner opens ---
    useEffect(() => {
        if (!scannerOpen) {
            return;
        }

        const timer = setTimeout(() => {
            const el = document.getElementById(SCANNER_ELEMENT_ID);
            if (!el) {
                setCameraPermissionDenied(true);
                setScannerError("Scanner element not found. Please try again.");
                return;
            }

            setScannerError("");
            setCameraPermissionDenied(false);
            setScannerStarting(true);

            const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
            scannerRef.current = instance;

            instance
                .start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 260, height: 160 } },
                    (decodedText) => handleScanSuccess(decodedText),
                    () => { /* ignore */ }
                )
                .then(() => {
                    setScannerStarting(false);
                })
                .catch(() => {
                    setScannerStarting(false);
                    setCameraPermissionDenied(true);
                });
        }, 100);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scannerOpen]);

    // --- Cleanup on unmount ---
    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, [stopScanner]);

    const closeScanner = () => {
        setScannerOpen(false);
        setScannerError("");
        setCameraPermissionDenied(false);
    };

    return (
        <Card>
            <CardBody>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Add Medicines</h3>

                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 relative" ref={searchRef}>
                        <FormField label="Search Medicine">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Search by name or generic name..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsDropdownOpen(true);
                                            if (e.target.value === "") setSelectedMedicine("");
                                            setMedicineError("");
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-300 
                                                   bg-white placeholder:text-gray-400 text-gray-600
                                                   focus:outline-none focus:border-teal-600"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setScannerOpen(true)}
                                    className="shrink-0 p-2 rounded-lg border border-gray-300 text-gray-500 cursor-pointer"
                                >
                                    <ScanLine className="w-4 h-4" />
                                </button>
                            </div>
                        </FormField>

                        {/* Dropdown */}
                        {isDropdownOpen && filteredMedicines.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg max-h-56 overflow-y-auto">
                                {filteredMedicines.map((medicine: any, index: number) => {
                                    const available = getAvailableStock(medicine._id, medicine.currentStock);
                                    return (
                                        <button
                                            key={medicine._id}
                                            type="button"
                                            onClick={() => handleSelectMedicine(medicine)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 cursor-pointer",
                                                index === highlightedIndex ? "bg-teal-50" : ""
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-medium text-gray-900">{medicine.name}</span>
                                                    <span className="text-xs text-gray-400 ml-2">{medicine.genericName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-medium text-teal-600">
                                                        {formatCurrency(medicine.sellingPrice)}
                                                    </span>
                                                    <span className={cn(available <= 5 ? "text-red-500" : "text-gray-400")}>
                                                        Stock: {available}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {isDropdownOpen && searchTerm && filteredMedicines.length === 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg p-3 text-center text-xs text-gray-400">
                                No medicines found
                            </div>
                        )}
                    </div>

                    <div className="w-full sm:w-24">
                        <FormField label="Quantity">
                            <Input
                                type="number"
                                min={1}
                                value={medicineQty}
                                onChange={(e) => { setMedicineQty(Number(e.target.value)); setMedicineError(""); }}
                            />
                        </FormField>
                    </div>

                    <div className="w-full sm:w-auto">
                        <Button
                            type="button"
                            onClick={addMedicineItem}
                            disabled={!selectedMedicineData || medicineQty < 1}
                            className="w-full"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                    </div>
                </div>

                {/* Stock info & error */}
                {selectedMedicineData && (
                    <p className="text-xs text-gray-400 mt-2">
                        Available: <span className="font-medium">{getAvailableStock(selectedMedicine, selectedMedicineData.currentStock)}</span> {selectedMedicineData.unit}
                    </p>
                )}
                {medicineError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {medicineError}
                    </p>
                )}

                

                {/* Added Items */}
                {watchedItems.filter(i => i.category === "medicine").length > 0 && (
                    <div className="mt-5 space-y-2">
                        <p className="text-xs font-medium text-gray-600">Added Items</p>
                        <div className="space-y-1.5">
                            {watchedItems.map((item, i) => (
                                item.category === "medicine" && (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-medium text-gray-900">{item.description}</span>
                                            <span className="text-xs text-gray-400 ml-2">× {item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs font-semibold text-gray-700">{formatCurrency(item.total)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(i)}
                                                className="text-xs text-gray-400 cursor-pointer"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Patient Type */}
                <div className="mt-5">
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

                <div className="mt-3">
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
            </CardBody>

            {/* Scanner Modal */}
            <Modal open={scannerOpen} onClose={closeScanner} title="Scan Medicine Barcode" size="md">
                <div className="space-y-3">
                    {cameraPermissionDenied ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 bg-red-50 rounded-lg border border-red-200">
                            <Camera className="w-10 h-10 text-red-300 mb-3" />
                            <p className="text-xs font-semibold text-red-700 mb-1">Camera Access Required</p>
                            <p className="text-xs text-red-500 text-center mb-4 max-w-xs">
                                Please allow camera access in your browser settings to scan barcodes.
                            </p>
                            <Button type="button" variant="secondary" size="sm" onClick={closeScanner}>
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <>
                            {scannerError && <Alert type="error">{scannerError}</Alert>}

                            <div className="relative rounded-lg overflow-hidden border border-gray-300 bg-gray-50">
                                <div id={SCANNER_ELEMENT_ID} className="w-full min-h-[260px]" />
                                {(scannerStarting || checkingBarcode) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                        <div className="flex items-center gap-2 text-gray-600 text-xs">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {checkingBarcode ? "Looking up medicine..." : "Starting camera..."}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
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

                            <div className="flex justify-end pt-2 border-t border-gray-300">
                                <Button type="button" variant="secondary" onClick={closeScanner}>Cancel</Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </Card>
    );
}