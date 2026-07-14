"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Clock, User, Activity, CheckCircle, FileText, XCircle, Pencil } from "lucide-react";
import { Card, CardBody, Button, Badge, Alert, FormField, Input, Select, Modal } from "@/components/ui";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LabCatalogItem {
    _id: string; testName: string; testCode: string; category: string; cost: number;
}

interface LabTestDetail {
    _id: string; labTestId: string;
    patient: { _id: string; firstName: string; lastName: string; patientId: string };
    requestedBy: { _id: string; firstName: string; lastName: string };
    tests: { catalogId?: string; testName: string; testCode?: string; category: string; cost: number }[];
    invoiceId?: { _id: string; invoiceNumber: string };
    status: string; priority: string; totalCost: number; isPaid: boolean;
    sampleCollectedAt?: string; sampleCollectedBy?: { firstName: string; lastName: string };
    completedAt?: string; notes?: string; reportUrl?: string;
}

interface LabTestsTabProps { test: LabTestDetail; canUpdate: boolean; id: string; }

const STATUS_STEPS = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "sample_collected", label: "Collected", icon: User },
    { key: "processing", label: "Processing", icon: Activity },
    { key: "completed", label: "Completed", icon: CheckCircle },
    { key: "delivered", label: "Delivered", icon: FileText },
];

export function LabTestsTab({ test, canUpdate, id }: LabTestsTabProps) {
    const router = useRouter();
    const qc = useQueryClient();
    const [editTestsOpen, setEditTestsOpen] = useState(false);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [updateError, setUpdateError] = useState("");
    const [payModalOpen, setPayModalOpen] = useState(false);

    const { data: catalogData } = useQuery({
        queryKey: ["lab-catalog-active"],
        queryFn: () => axios.get("/api/labcatalog", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
        enabled: editTestsOpen,
    });

    const catalogTests: LabCatalogItem[] = catalogData?.data || [];

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            status: test.status,
            priority: test.priority,
            reportUrl: test.reportUrl || "",
            notes: test.notes || "",
            isPaid: test.isPaid ? "true" : "false"
        },
    });

    const updateMutation = useMutation({
        mutationFn: (d: Record<string, unknown>) => axios.put(`/api/lab/${id}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lab-test", id] });
            qc.invalidateQueries({ queryKey: ["lab-tests"] });
            toast.success("Updated successfully!");
        },
        onError: (e: unknown) => {
            const msg = (e as any)?.response?.data?.error || "Failed";
            setUpdateError(msg);
            toast.error(msg);
        },
    });

    const onSubmit = (formData: Record<string, unknown>) => {
        const payload: Record<string, unknown> = {};

        if (formData.status === "delivered" && !test.isPaid) {
            const msg = "Cannot deliver order - payment is pending";
            setUpdateError(msg);
            toast.error(msg);
            return;
        }

        if (formData.status !== test.status) payload.status = formData.status;
        if (formData.priority !== test.priority) payload.priority = formData.priority;
        if (formData.reportUrl !== (test.reportUrl || "")) payload.reportUrl = formData.reportUrl || "";
        if (formData.notes !== (test.notes || "")) payload.notes = formData.notes || "";
        // const isPaidBool = formData.isPaid === "true";
        // if (isPaidBool !== test.isPaid) payload.isPaid = isPaidBool;

        if (Object.keys(payload).length === 0) {
            setUpdateError("No changes made");
            toast.warning("No changes made");
            return;
        }
        updateMutation.mutate(payload);
    };

    const openEditTests = () => {
        const ids = test.tests
            .map(t => typeof t.catalogId === "object" && t.catalogId ? t.catalogId._id : (t.catalogId || ""))
            .filter(Boolean) as string[];
        setSelectedTests(ids);
        setEditTestsOpen(true);
    };

    const toggleTest = (testId: string) => {
        setSelectedTests(prev => prev.includes(testId) ? prev.filter(t => t !== testId) : [...prev, testId]);
    };

    const handleSaveTests = () => {
        const newTests = selectedTests.map(id => {
            const ct = catalogTests.find(t => t._id === id);
            return ct ? { catalogId: ct._id, testName: ct.testName, testCode: ct.testCode, category: ct.category, cost: ct.cost } : null;
        }).filter(Boolean);
        updateMutation.mutate({ tests: newTests }, { onSuccess: () => setEditTestsOpen(false) });
    };

    const getStatusIndex = (status: string) => STATUS_STEPS.findIndex(s => s.key === status);
    const currentStep = getStatusIndex(test.status);
    const selectedTotal = selectedTests.reduce((sum, id) => sum + (catalogTests.find(t => t._id === id)?.cost || 0), 0);

    const invoiceMutation = useMutation({
        mutationFn: async () => {
            const invoiceRes = await axios.post("/api/invoice", {
                invoiceType: "lab",
                patient: test.patient._id,
                items: test.tests.map(t => ({
                    description: t.testName,
                    category: "lab_test",
                    quantity: 1,
                    unitPrice: t.cost,
                    total: t.cost,
                    labOrderId: test._id,
                })),
                subtotal: test.totalCost,
                total: test.totalCost,
                status: "paid",
                paidAmount: test.totalCost,
                balanceDue: 0,
                createdBy: test.requestedBy._id,
            });

            await axios.put(`/api/lab/${test._id}`, {
                isPaid: true,
                invoiceId: invoiceRes.data.data._id
            });

            return invoiceRes.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lab-test", id] });
            qc.invalidateQueries({ queryKey: ["lab-tests"] });
            toast.success("Invoice created and order marked as paid!");
            setPayModalOpen(false);
        },
        onError: (e: unknown) => {
            const msg = (e as any)?.response?.data?.error || "Failed to create invoice";
            toast.error(msg);
        },
    });

    const handlePayConfirm = () => {
        invoiceMutation.mutate();
    };

    return (
        <div>
            <div className="my-2">
                {!test.isPaid && test.status !== "cancelled" && test.status !== "delivered" && (
                    <Alert type="warning">
                        Payment pending - Cannot deliver until paid
                    </Alert>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Status + Info + Tests */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Status Progress */}
                    <Card>
                        <CardBody>
                            <h3 className="text-xs font-semibold text-gray-900 mb-4">Status Progress</h3>
                            {test.status === "cancelled" ? (
                                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                                    <XCircle className="w-8 h-8 text-red-500" />
                                    <div>
                                        <p className="text-xs font-semibold text-red-700">Order Cancelled</p>
                                        <p className="text-xs text-red-600">This order has been cancelled</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    {STATUS_STEPS.map((step, i) => {
                                        const Icon = step.icon;
                                        const isCompleted = i < currentStep;
                                        const isCurrent = i === currentStep;
                                        const isDisabled = step.key === "delivered" && !test.isPaid;

                                        return (
                                            <div key={step.key} className="flex items-center flex-1">
                                                <div className="flex flex-col items-center">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center",
                                                        isCompleted ? "bg-teal-100 text-teal-600" :
                                                            isCurrent ? "bg-teal-600 text-white" :
                                                                isDisabled ? "bg-gray-200 text-gray-400" :
                                                                    "bg-gray-100 text-gray-400"
                                                    )}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] mt-1 whitespace-nowrap",
                                                        isCurrent ? "font-medium text-gray-700" :
                                                            isDisabled ? "text-gray-400" : "text-gray-400"
                                                    )}>
                                                        {step.label}
                                                        {isDisabled && " (Pay first)"}
                                                    </span>
                                                </div>
                                                {i < STATUS_STEPS.length - 1 && <div className={cn("flex-1 h-0.5 mx-1", isCompleted ? "bg-teal-400" : "bg-gray-200")} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Patient & Order Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card>
                            <CardBody>
                                <h3 className="text-xs font-semibold text-gray-900 mb-3">Patient</h3>
                                <p className="text-sm font-medium text-gray-900">{test.patient?.firstName} {test.patient?.lastName}</p>
                                <p className="text-xs text-gray-400">{test.patient?.patientId}</p>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody>
                                <h3 className="text-xs font-semibold text-gray-900 mb-3">Order Info</h3>
                                <div className="space-y-2">
                                    <Row label="Requested by" value={`${test.requestedBy?.firstName} ${test.requestedBy?.lastName}`} />
                                    <Row label="Total Cost" value={formatCurrency(test.totalCost)} />
                                    {test.sampleCollectedAt && <Row label="Sample collected" value={formatDate(test.sampleCollectedAt)} />}
                                    {test.completedAt && <Row label="Completed" value={formatDate(test.completedAt)} />}
                                    <Row label="Payment" value={test.isPaid ? "Paid" : "Unpaid"} />
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Tests List */}
                    <Card>
                        <CardBody>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-gray-900">Tests ({test.tests?.length})</h3>
                                {canUpdate && !test.isPaid && test.status === "pending" && (
                                    <Button size="sm" variant="secondary" onClick={openEditTests}>
                                        <Pencil className="w-3.5 h-3.5" /> Edit Tests
                                    </Button>
                                )}
                            </div>
                            <div className="divide-y divide-gray-100">
                                {test.tests?.map((t, i) => (
                                    <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                        <div>
                                            <p className="text-xs font-medium text-gray-900">{t.testName}</p>
                                            <p className="text-xs text-gray-400">{t.testCode} • {t.category}</p>
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">{formatCurrency(t.cost)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between pt-3 mt-3 border-t border-gray-200">
                                <span className="text-xs font-semibold text-gray-900">Total</span>
                                <span className="text-xs font-semibold text-gray-900">{formatCurrency(test.totalCost)}</span>
                            </div>
                        </CardBody>
                    </Card>

                    {test.notes && (
                        <Card>
                            <CardBody>
                                <h3 className="text-xs font-semibold text-gray-900 mb-2">Notes</h3>
                                <p className="text-xs text-gray-600">{test.notes}</p>
                            </CardBody>
                        </Card>
                    )}
                </div>

                {/* Right: Update Form */}
                {canUpdate && (
                    <div className="space-y-4">
                        {/* Pay Now Button - Only show if unpaid */}
                        {!test.isPaid && test.status !== "cancelled" && (
                            <Card>
                                <CardBody>
                                    <h3 className="text-xs font-semibold text-gray-900 mb-3">Quick Payment</h3>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Amount: <span className="font-medium text-gray-700">{formatCurrency(test.totalCost)}</span>
                                    </p>
                                    <Button
                                        className="w-full"
                                        onClick={() => setPayModalOpen(true)}
                                        loading={invoiceMutation.isPending}
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Pay & Create Invoice
                                    </Button>
                                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                                        Creates invoice and marks order as paid
                                    </p>
                                </CardBody>
                            </Card>
                        )}

                        {/* View Invoice - Only show if paid */}
                        {test.isPaid && test.invoiceId && (
                            <Card>
                                <CardBody>
                                    <h3 className="text-xs font-semibold text-gray-900 mb-3">Invoice</h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-teal-600 flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" /> Paid
                                            </p>
                                            <p className="text-xs font-medium text-gray-700 mt-0.5">
                                                {test.invoiceId.invoiceNumber}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => router.push(`/billing/${test.invoiceId._id}`)}
                                        >
                                            <FileText className="w-3.5 h-3.5" /> View
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        )}

                        {/* Update Form */}
                        <Card>
                            <CardBody>
                                <h3 className="text-xs font-semibold text-gray-900 mb-4">Update Order</h3>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField label="Status">
                                        <Select {...register("status")}>
                                            <option value="pending">Pending</option>
                                            <option value="sample_collected">Sample Collected</option>
                                            <option value="processing">Processing</option>
                                            <option value="completed">Completed</option>
                                            <option value="delivered" disabled={!test.isPaid}>
                                                Delivered {!test.isPaid && "(Pay first)"}
                                            </option>
                                            <option value="cancelled">Cancelled</option>
                                        </Select>
                                        {!test.isPaid && (
                                            <p className="text-[10px] text-amber-600 mt-1">
                                                Pay first to enable "Delivered" status
                                            </p>
                                        )}
                                    </FormField>
                                    <FormField label="Priority">
                                        <Select {...register("priority")}>
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="stat">STAT</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Notes">
                                        <Input {...register("notes")} placeholder="Notes..." />
                                    </FormField>
                                    <Button type="submit" className="w-full" loading={updateMutation.isPending}>
                                        Save Changes
                                    </Button>
                                </form>
                            </CardBody>
                        </Card>
                    </div>
                )}
            </div>

            {/* Edit Tests Modal */}
            <Modal open={editTestsOpen} onClose={() => setEditTestsOpen(false)} title="Edit Tests" size="lg">
                <div className="space-y-4 mt-2">
                    <div className="max-h-80 overflow-y-auto border border-gray-300 rounded-lg divide-y divide-gray-100">
                        {catalogTests.map(ct => (
                            <div
                                key={ct._id}
                                onClick={() => toggleTest(ct._id)}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2.5 cursor-pointer",
                                    selectedTests.includes(ct._id) ? "bg-teal-50" : ""
                                )}
                            >
                                <div>
                                    <p className="text-xs font-medium text-gray-900">{ct.testName}</p>
                                    <p className="text-xs text-gray-400">{ct.testCode} • {ct.category}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-700">{formatCurrency(ct.cost)}</span>
                                    <div className={cn(
                                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                                        selectedTests.includes(ct._id) ? "bg-teal-600 border-teal-600" : "border-gray-300"
                                    )}>
                                        {selectedTests.includes(ct._id) && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{selectedTests.length} selected</span>
                        <span className="font-semibold text-gray-900">Total: {formatCurrency(selectedTotal)}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button variant="secondary" onClick={() => setEditTestsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTests} loading={updateMutation.isPending} disabled={selectedTests.length === 0}>
                            Save Tests
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Pay Confirmation Modal */}
            <Modal
                open={payModalOpen}
                onClose={() => setPayModalOpen(false)}
                title="Confirm Payment"
                size="sm"
            >
                <div className="space-y-4 mt-2">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                            <FileText className="w-6 h-6 text-teal-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">Create Invoice & Mark as Paid</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            This will create an invoice for <span className="font-medium text-gray-700">{formatCurrency(test.totalCost)}</span> and mark this order as paid.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-300">
                        <Button variant="secondary" onClick={() => setPayModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePayConfirm}
                            loading={invoiceMutation.isPending}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                        >
                            <CheckCircle className="w-3.5 h-3.5" /> Confirm Payment
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            <span className="text-xs text-gray-700 text-right truncate">{value}</span>
        </div>
    );
}