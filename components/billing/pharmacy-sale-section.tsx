// components/billing/pharmacy-sale-section.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, AlertTriangle, Search, X, ScanLine, Loader2, Barcode as BarcodeIcon } from "lucide-react";
import { Card, CardHeader, CardBody, Button, FormField, Input, Select, Modal, Alert } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { UseFormSetValue } from "react-hook-form";
import { Html5Qrcode } from "html5-qrcode";

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

    // Track local stock changes
    const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({});

    const getAvailableStock = (medicineId: string, originalStock: number) => {
        const adjustment = stockAdjustments[medicineId] || 0;
        return originalStock - adjustment;
    };

    // Filter medicines based on search term
    const filteredMedicines = medicines.filter((m: any) => {
        const available = getAvailableStock(m._id, m.currentStock);
        if (available === 0) return false;

        const searchLower = searchTerm.toLowerCase();
        return (
            m.name.toLowerCase().includes(searchLower) ||
            m.genericName.toLowerCase().includes(searchLower) ||
            (m.brandName && m.brandName.toLowerCase().includes(searchLower))
        );
    });

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset highlighted index when filtered results change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [filteredMedicines]);

    // Handle keyboard navigation
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
                setHighlightedIndex(prev =>
                    prev < filteredMedicines.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredMedicines.length) {
                    const selected = filteredMedicines[highlightedIndex];
                    handleSelectMedicine(selected);
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
        if (checkingBarcode) return;
        await stopScanner();

        const code = decodedText.trim();
        setCheckingBarcode(true);
        setScannerError("");

        try {
            // Try local list first (already loaded, avoids extra request)
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

            // Fall back to API lookup in case medicine list is stale/paginated
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
        <Card>
            <CardHeader><h3 className="font-semibold text-slate-700 dark:text-slate-200">Add Medicines</h3></CardHeader>
            <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2 relative" ref={searchRef}>
                        <FormField label="Search Medicine">
                            <div className="relative flex items-center gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <Input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Search by name, generic name, or brand..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsDropdownOpen(true);
                                            if (e.target.value === "") {
                                                setSelectedMedicine("");
                                            }
                                            setMedicineError("");
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        onKeyDown={handleKeyDown}
                                        className="pl-9 pr-8 w-full"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setScannerOpen(true)}
                                    title="Scan barcode"
                                    className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-colors"
                                >
                                    <ScanLine className="w-4 h-4" />
                                </button>
                            </div>
                        </FormField>

                        {/* Dropdown results */}
                        {isDropdownOpen && filteredMedicines.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {filteredMedicines.map((medicine: any, index: number) => {
                                    const available = getAvailableStock(medicine._id, medicine.currentStock);
                                    return (
                                        <button
                                            key={medicine._id}
                                            type="button"
                                            onClick={() => handleSelectMedicine(medicine)}
                                            className={`w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors ${index === highlightedIndex ? 'bg-teal-50 dark:bg-slate-700' : ''
                                                }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                                <div>
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">
                                                        {medicine.name}
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                                        {medicine.genericName}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium text-teal-700 dark:text-teal-400">
                                                        {formatCurrency(medicine.sellingPrice)}
                                                    </span>
                                                    <span className={`text-xs ${available <= 5 ? 'text-red-500' : 'text-slate-400'}`}>
                                                        Stock: {available}
                                                    </span>
                                                </div>
                                            </div>
                                            {medicine.brandName && (
                                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                    Brand: {medicine.brandName}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* No results message */}
                        {isDropdownOpen && searchTerm && filteredMedicines.length === 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 text-center text-slate-500 dark:text-slate-400">
                                No medicines found matching "{searchTerm}"
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-1">
                        <FormField label="Quantity">
                            <Input
                                type="number"
                                min={1}
                                value={medicineQty}
                                onChange={(e) => {
                                    setMedicineQty(Number(e.target.value));
                                    setMedicineError("");
                                }}
                                className="w-full"
                            />
                        </FormField>
                    </div>

                    <div className="md:col-span-1">
                        <Button
                            type="button"
                            onClick={addMedicineItem}
                            disabled={!selectedMedicineData || medicineQty < 1}
                            className="w-full md:mb-0"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                    </div>

                    {/* Stock info */}
                    <div className="md:col-span-1 flex items-end">
                        {selectedMedicineData && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                Available: <span className="font-medium">{getAvailableStock(selectedMedicine, selectedMedicineData.currentStock)}</span> {selectedMedicineData.unit}
                            </p>
                        )}
                    </div>
                </div>

                {medicineError && (
                    <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {medicineError}
                    </p>
                )}

                <div className="mt-6">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Patient Type</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => handlePatientTypeChange("walkin")}
                            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${patientType === "walkin"
                                ? "bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                }`}
                        >
                            Walk-in Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePatientTypeChange("registered")}
                            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${patientType === "registered"
                                ? "bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                }`}
                        >
                            Registered Patient
                        </button>
                    </div>

                    {patientType === "walkin" ? (
                        <FormField label="Walk-in Patient Name">
                            <Input
                                placeholder="Enter patient name"
                                value={walkInName}
                                onChange={(e) => handleWalkInNameChange(e.target.value)}
                                className="w-full"
                            />
                        </FormField>
                    ) : (
                        <FormField label="Patient">
                            <Select {...register("patient")} className="w-full">
                                <option value="">Select patient (optional)</option>
                                {patients.map((p: any) => (
                                    <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>
                                ))}
                            </Select>
                        </FormField>
                    )}
                </div>

                {/* Added medicines list with remove */}
                {watchedItems.filter(i => i.category === "medicine").length > 0 && (
                    <div className="mt-6 space-y-2">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Added Items</p>
                        <div className="space-y-2">
                            {watchedItems.map((item, i) => (
                                item.category === "medicine" && (
                                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg gap-2">
                                        <div className="text-sm flex-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{item.description}</span>
                                            <span className="text-slate-400 dark:text-slate-500 ml-2">× {item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatCurrency(item.total)}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(i)}
                                                className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-xs p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}
            </CardBody>

            {/* Barcode scanner modal */}
            <Modal open={scannerOpen} onClose={closeScanner} title="Scan Medicine Barcode" size="md">
                <div className="space-y-3">
                    {scannerError && <Alert type="error">{scannerError}</Alert>}

                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <div id={SCANNER_ELEMENT_ID} className="w-full min-h-[260px] [&_video]:rounded-lg" />

                        {(scannerStarting || checkingBarcode) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {checkingBarcode ? "Looking up medicine..." : "Starting camera..."}
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
        </Card>
    );
}