// components/billing/lab-invoice-section.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Search, X, AlertTriangle } from "lucide-react";
import { Card, CardBody, FormField, Input, Select, Badge, Button } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { UseFormSetValue } from "react-hook-form";

interface LineItem {
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  catalogId?: string;
  medicine?: string;
  batchNumber?: string;
}

interface Props {
  watchedItems: LineItem[];
  setValue: UseFormSetValue<any>;
  register: any;
}

export function LabInvoiceSection({ watchedItems, setValue, register }: Props) {
  // --- State ---
  const [patientType, setPatientType] = useState<"walkin" | "registered">("walkin");
  const [walkInName, setWalkInName] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [searchCatalogTerm, setSearchCatalogTerm] = useState("");
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const [highlightedCatalogIndex, setHighlightedCatalogIndex] = useState(-1);
  const [error, setError] = useState("");

  // --- Refs ---
  const catalogSearchRef = useRef<HTMLDivElement>(null);
  const catalogInputRef = useRef<HTMLInputElement>(null);

  // --- Queries ---
  const { data: patientsData } = useQuery({
    queryKey: ["patients-select"],
    queryFn: () => axios.get("/api/publicPatients", { params: { limit: 200 } }).then(r => r.data),
  });

  const { data: catalogData } = useQuery({
    queryKey: ["lab-catalog-active"],
    queryFn: () => axios.get("/api/labcatalog", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
  });

  // --- Data ---
  const patients = patientsData?.data || [];
  const catalog = catalogData?.data || [];

  // --- Filtered catalogs ---
  const filteredCatalog = catalog.filter((c: any) => {
    const searchLower = searchCatalogTerm.toLowerCase();
    return (
      c.testName.toLowerCase().includes(searchLower) ||
      c.testCode.toLowerCase().includes(searchLower) ||
      c.category.toLowerCase().includes(searchLower)
    );
  });

  // --- Selected data ---
  const selectedCatalogData = catalog.find((c: any) => c._id === selectedCatalog);

  // --- Click outside handlers ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catalogSearchRef.current && !catalogSearchRef.current.contains(event.target as Node)) {
        setIsCatalogDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Reset highlighted on filter change ---
  useEffect(() => {
    setHighlightedCatalogIndex(-1);
  }, [filteredCatalog]);

  // --- Patient type handlers ---
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

  // --- Catalog handlers ---
  const handleCatalogKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCatalogDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsCatalogDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedCatalogIndex(prev =>
          prev < filteredCatalog.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedCatalogIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedCatalogIndex >= 0 && highlightedCatalogIndex < filteredCatalog.length) {
          handleSelectCatalog(filteredCatalog[highlightedCatalogIndex]);
        }
        break;
      case "Escape":
        setIsCatalogDropdownOpen(false);
        setHighlightedCatalogIndex(-1);
        break;
    }
  };

  const handleSelectCatalog = (test: any) => {
    setSelectedCatalog(test._id);
    setSearchCatalogTerm(test.testName);
    setIsCatalogDropdownOpen(false);
    setHighlightedCatalogIndex(-1);
    setError("");
  };

  const addCatalogTest = () => {
    if (!selectedCatalogData) return;

    // Check if already added
    const exists = watchedItems.some(item => item.catalogId === selectedCatalogData._id);
    if (exists) {
      setError(`${selectedCatalogData.testName} already added`);
      return;
    }

    const item: LineItem = {
      description: `${selectedCatalogData.testName} (${selectedCatalogData.testCode})`,
      category: "lab_test",
      quantity: 1,
      unitPrice: selectedCatalogData.cost,
      total: selectedCatalogData.cost,
      catalogId: selectedCatalogData._id,
    };

    setValue("items", [...watchedItems, item]);
    setSelectedCatalog("");
    setSearchCatalogTerm("");
    setError("");
    catalogInputRef.current?.focus();
  };

  // --- Remove item ---
  const handleRemove = (index: number) => {
    setValue("items", watchedItems.filter((_, i) => i !== index));
  };

  // --- Clear search ---
  const clearCatalogSearch = () => {
    setSearchCatalogTerm("");
    setSelectedCatalog("");
    setIsCatalogDropdownOpen(false);
    catalogInputRef.current?.focus();
  };

  return (
    <Card>
      <CardBody>
        <h3 className="text-xs font-semibold text-gray-900 mb-3">Lab Tests</h3>

        <div className="space-y-5">

          {/* Add Tests from Catalog */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
              <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-semibold">NEW</span>
              Add Tests from Catalog
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full relative" ref={catalogSearchRef}>
                <FormField label="Search Catalog">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={catalogInputRef}
                      type="text"
                      placeholder="Search by test name, code, or category..."
                      value={searchCatalogTerm}
                      onChange={(e) => {
                        setSearchCatalogTerm(e.target.value);
                        setIsCatalogDropdownOpen(true);
                        if (e.target.value === "") setSelectedCatalog("");
                        setError("");
                      }}
                      onFocus={() => setIsCatalogDropdownOpen(true)}
                      onKeyDown={handleCatalogKeyDown}
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-300 
                                 bg-white placeholder:text-gray-400 text-gray-600
                                 focus:outline-none focus:border-teal-600"
                    />
                    {searchCatalogTerm && (
                      <button
                        type="button"
                        onClick={clearCatalogSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </FormField>

                {/* Catalog Dropdown */}
                {isCatalogDropdownOpen && filteredCatalog.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                    {filteredCatalog.map((test: any, index: number) => (
                      <button
                        key={test._id}
                        type="button"
                        onClick={() => handleSelectCatalog(test)}
                        className={cn(
                          "w-full text-left px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0",
                          index === highlightedCatalogIndex ? "bg-teal-50" : ""
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-medium text-gray-900">{test.testName}</span>
                            <span className="text-xs text-gray-400 ml-2">{test.testCode}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">{test.category}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-teal-600">
                              {formatCurrency(test.cost)}
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              {test.turnaroundTime}h
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isCatalogDropdownOpen && searchCatalogTerm && filteredCatalog.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg p-3 text-center text-xs text-gray-400">
                    No tests found in catalog
                  </div>
                )}
              </div>

              <div className="w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={addCatalogTest}
                  disabled={!selectedCatalogData}
                  className="w-full"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </div>

            {selectedCatalogData && (
              <p className="text-xs text-gray-400 mt-2">
                Selected: <span className="font-medium text-gray-600">{selectedCatalogData.testName}</span>
                {" "}· {formatCurrency(selectedCatalogData.cost)}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {error}
            </p>
          )}

          {/* Added Items */}
          {watchedItems.filter(i => i.category === "lab_test").length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Added Lab Tests</p>
              {watchedItems.map((item, i) => (
                item.category === "lab_test" && (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-900">{item.description}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] bg-teal-50 border-teal-200 text-teal-700">
                        New Test
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-gray-700">{formatCurrency(item.total)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemove(i)}
                        className="text-xs text-gray-400 cursor-pointer hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
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
                  <option value="">Select patient</option>
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