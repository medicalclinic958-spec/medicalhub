// components/billing/new-invoice-client.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardBody, Button, FormField, Select, Alert, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { OpdInvoiceSection } from "./opd-invoice-section";
import { PharmacySaleSection } from "./pharmacy-sale-section";
import { PharmacyPurchaseSection } from "./pharmacy-purchase-section";

interface LineItem {
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  medicine?: string;
  batchNumber?: string;
}

interface FormValues {
  invoiceType: "opd" | "pharmacy_sale" | "pharmacy_purchase";
  patient?: string;
  doctor?: string;
  supplier?: string;
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
    onSuccess: (res) => router.push(`/billing/${res.data.data._id}`),
    onError: (e: unknown) => setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create invoice"),
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
      items: validItems.map(item => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), total: Number(item.total) })),
      subtotal,
      taxAmount,
      total,
      status: "pending",
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/billing"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
        <h1 className="text-xl font-bold text-slate-800">New Invoice</h1>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-700">Invoice Type</h3></CardHeader>
          <CardBody>
            <FormField label="Type" required>
              <Select {...register("invoiceType")}>
                <option value="opd">OPD / Consultation</option>
                <option value="pharmacy_sale">Pharmacy Sale (Patient)</option>
                <option value="pharmacy_purchase">Pharmacy Purchase (Supplier)</option>
              </Select>
            </FormField>
          </CardBody>
        </Card>

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

        {invoiceType === "pharmacy_purchase" && (
          <PharmacyPurchaseSection
            watchedItems={watchedItems}
            setValue={setValue}
            register={register}
          />
        )}

        {/* Line Items Display */}
        {watchedItems.length > 0 && (
          <Card>
            <CardHeader><h3 className="font-semibold text-slate-700">Line Items</h3></CardHeader>
            <CardBody>
              <div className="space-y-2">
                {watchedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{item.description}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-slate-400 capitalize">{item.category}</span>
                        <span className="text-xs text-slate-400">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
                      <button
                        type="button"
                        onClick={() => setValue("items", watchedItems.filter((_, idx) => idx !== i))}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        ✕
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
          <CardHeader><h3 className="font-semibold text-slate-700">Totals</h3></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-5">
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

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
                {taxAmount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Tax ({watchTaxRate}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
                <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2 mt-2">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/billing"><Button type="button" variant="secondary">Cancel</Button></Link>
          <Button type="submit" loading={createMutation.isPending} disabled={watchedItems.filter(i => i.description && i.quantity > 0).length === 0}>
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}