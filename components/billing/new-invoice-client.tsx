// components/billing/new-invoice-client.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, Button, FormField, Select, Alert, Input } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import { OpdInvoiceSection } from "./opd-invoice-section";
import { PharmacySaleSection } from "./pharmacy-sale-section";
import { LabInvoiceSection } from "./lab-invoice-section";
import { OtherInvoiceSection } from "./other-invoice-section";

interface LineItem {
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  medicine?: string;
  batchNumber?: string;
  labOrderId?: string;
  catalogId?: string;
}

interface FormValues {
  invoiceType: "opd" | "pharmacy_sale" | "lab" | "other";
  patient?: string;
  patientName?: string;
  doctor?: string;
  items: LineItem[];
  discount: number;
  discountType: "fixed" | "percentage";
  taxRate: number;
  notes?: string;
  dueDate?: string;
}

export function NewInvoiceClient() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      invoiceType: "opd",
      items: [],
      discount: 0,
      discountType: "fixed",
      taxRate: 0,
    },
  });

  const invoiceType = watch("invoiceType");
  const watchedItems = watch("items") || [];
  const watchDiscount = watch("discount");
  const watchDiscountType = watch("discountType");
  const watchTaxRate = watch("taxRate");

  const subtotal = watchedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmount = watchDiscountType === "percentage" ? (subtotal * watchDiscount) / 100 : watchDiscount;
  const taxAmount = (subtotal - discountAmount) * watchTaxRate / 100;
  const total = subtotal - discountAmount + taxAmount;

  const createMutation = useMutation({
    mutationFn: (d: any) => axios.post("/api/invoice", d),
    onSuccess: (res) => {
      toast.success("Invoice created successfully!");
      router.push(`/billing/${res.data.data._id}`);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create invoice";
      setError(msg);
      toast.error(msg);
    },
  });

  const onSubmit = (d: FormValues) => {
    const validItems = d.items.filter(i => i.description && i.quantity > 0);
    if (validItems.length === 0) {
      setError("Add at least one item with quantity greater than 0");
      return;
    }

    const payload = {
      ...d,
      patient: selectedPatient || d.patient || undefined,
      doctor: selectedDoctor || undefined,
      items: validItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
      subtotal,
      taxAmount,
      total,
      status: "pending",
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">New Invoice</h1>
          <p className="text-xs text-gray-500 mt-0.5">Create a new billing invoice</p>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Invoice Type */}
        <Card>
          <CardBody>
            <FormField label="Invoice Type" required>
              <Select {...register("invoiceType")}>
                <option value="opd">OPD / Consultation</option>
                <option value="pharmacy_sale">Pharmacy Sale (Patient)</option>
                <option value="lab">Lab Test</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
          </CardBody>
        </Card>

        {/* Type-specific sections */}
        {invoiceType === "opd" && (
          <OpdInvoiceSection
            selectedDoctor={selectedDoctor}
            setSelectedDoctor={setSelectedDoctor}
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
            watchedItems={watchedItems}
            setValue={setValue}
          />
        )}

        {invoiceType === "pharmacy_sale" && (
          <PharmacySaleSection
            watchedItems={watchedItems}
            setValue={setValue}
            register={register}
          />
        )}

        {invoiceType === "lab" && (
          <LabInvoiceSection
            watchedItems={watchedItems}
            setValue={setValue}
            register={register}
            patientId={selectedPatient}
          />
        )}

        {invoiceType === "other" && (
          <OtherInvoiceSection
            invoiceType={invoiceType}
            watchedItems={watchedItems}
            setValue={setValue}
            register={register}
          />
        )}

        {/* Line Items Display */}
        {watchedItems.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-xs font-semibold text-gray-900 mb-3">Line Items</h3>
              <div className="space-y-2">
                {watchedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.description}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-gray-400 capitalize">{item.category}</span>
                        <span className="text-xs text-gray-400">
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                        {item.labOrderId && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            Existing Order
                          </span>
                        )}
                        {item.catalogId && !item.labOrderId && (
                          <span className="text-xs text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                            New Test
                          </span>
                        )}
                      </div>
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
            </CardBody>
          </Card>
        )}

        {/* Totals */}
        <Card>
          <CardBody>
            <h3 className="text-xs font-semibold text-gray-900 mb-3">Totals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Discount">
                    <Input type="number" min={0} {...register("discount", { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Type">
                    <Select {...register("discountType")}>
                      <option value="fixed">Fixed (PKR)</option>
                      <option value="percentage">Percentage (%)</option>
                    </Select>
                  </FormField>
                </div>
                <FormField label="Tax Rate (%)">
                  <Input type="number" min={0} max={100} {...register("taxRate", { valueAsNumber: true })} />
                </FormField>
                <FormField label="Due Date">
                  <Input type="date" {...register("dueDate")} />
                </FormField>
                <FormField label="Notes">
                  <Input {...register("notes")} placeholder="Additional notes..." />
                </FormField>
              </div>

              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-teal-600">Discount</span>
                    <span className="text-teal-600 font-medium">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Tax ({watchTaxRate}%)</span>
                    <span className="text-gray-700">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-sm border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link href="/billing">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button
            type="submit"
            loading={createMutation.isPending}
            disabled={watchedItems.filter(i => i.description && i.quantity > 0).length === 0}
          >
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}