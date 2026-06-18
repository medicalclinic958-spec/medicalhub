// components/lab/lab-tests-tab.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import {
    Clock, User, Activity, CheckCircle, FileText, XCircle,
    Pencil, DollarSign,
} from "lucide-react";
import {
    Card, CardBody, Button, Badge, Alert,
    FormField, Input, Select, Modal,
} from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface LabCatalogItem {
    _id: string;
    testName: string;
    testCode: string;
    category: string;
    cost: number;
}

interface LabTestDetail {
    _id: string;
    labTestId: string;
    patient: { _id: string; firstName: string; lastName: string; patientId: string };
    requestedBy: { _id: string; firstName: string; lastName: string };
    tests: { catalogId?: string; testName: string; testCode?: string; category: string; cost: number }[];
    status: string;
    priority: string;
    totalCost: number;
    isPaid: boolean;
    sampleCollectedAt?: string;
    sampleCollectedBy?: { firstName: string; lastName: string };
    completedAt?: string;
    notes?: string;
    reportUrl?: string;
}

interface LabTestsTabProps {
    test: LabTestDetail;
    canUpdate: boolean;
    id: string;
}

const STATUS_STEPS = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "sample_collected", label: "Collected", icon: User },
    { key: "processing", label: "Processing", icon: Activity },
    { key: "completed", label: "Completed", icon: CheckCircle },
    { key: "delivered", label: "Delivered", icon: FileText },
];

export function LabTestsTab({ test, canUpdate, id }: LabTestsTabProps) {
    const qc = useQueryClient();
    const [editTestsOpen, setEditTestsOpen] = useState(false);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [updateError, setUpdateError] = useState("");
    const [updateSuccess, setUpdateSuccess] = useState("");

    const { data: catalogData } = useQuery({
        queryKey: ["lab-catalog-active"],
        queryFn: () => axios.get("/api/labcatalog", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
        enabled: editTestsOpen,
    });

    const catalogTests: LabCatalogItem[] = catalogData?.data || [];

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            status: test.status,
            priority: test.priority,
            reportUrl: test.reportUrl || "",
            notes: test.notes || "",
            isPaid: test.isPaid ? "true" : "false",
        },
    });

    const updateMutation = useMutation({
        mutationFn: (d: Record<string, unknown>) => axios.put(`/api/lab/${id}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lab-test", id] });
            qc.invalidateQueries({ queryKey: ["lab-tests"] });
            setUpdateSuccess("Updated");
            setTimeout(() => setUpdateSuccess(""), 3000);
        },
        onError: (e: unknown) => {
            setUpdateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed");
            setTimeout(() => setUpdateError(""), 5000);
        },
    });

    const onSubmit = (formData: Record<string, unknown>) => {
        const payload: Record<string, unknown> = {};
        if (formData.status !== test.status) payload.status = formData.status;
        if (formData.priority !== test.priority) payload.priority = formData.priority;
        if (formData.reportUrl !== (test.reportUrl || "")) payload.reportUrl = formData.reportUrl || "";
        if (formData.notes !== (test.notes || "")) payload.notes = formData.notes || "";
        const isPaidBool = formData.isPaid === "true";
        if (isPaidBool !== test.isPaid) payload.isPaid = isPaidBool;

        if (Object.keys(payload).length === 0) {
            setUpdateError("No changes");
            return;
        }
        updateMutation.mutate(payload);
    };

    const openEditTests = () => {
        setSelectedTests(test.tests.map(t => t.catalogId || "").filter(Boolean));
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

        updateMutation.mutate({ tests: newTests }, {
            onSuccess: () => setEditTestsOpen(false),
        });
    };

    const getStatusIndex = (status: string) => STATUS_STEPS.findIndex(s => s.key === status);
    const currentStep = getStatusIndex(test.status);
    const selectedTotal = selectedTests.reduce((sum, id) => sum + (catalogTests.find(t => t._id === id)?.cost || 0), 0);

    return (
        <div className="grid grid-cols-3 gap-5">
            {updateError && <div className="col-span-3"><Alert type="error">{updateError}</Alert></div>}
            {updateSuccess && <div className="col-span-3"><Alert type="success">{updateSuccess}</Alert></div>}

            {/* Left Column */}
            <div className="col-span-2 space-y-5">
                {/* Status Progress */}
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Status Progress</h3>
                        {test.status === "cancelled" ? (
                            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                                <XCircle className="w-8 h-8 text-red-500" />
                                <div>
                                    <p className="font-medium text-red-800">Order Cancelled</p>
                                    <p className="text-sm text-red-600">This order has been cancelled</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                {STATUS_STEPS.map((step, i) => {
                                    const Icon = step.icon;
                                    const isCompleted = i < currentStep;
                                    const isCurrent = i === currentStep;
                                    return (
                                        <div key={step.key} className="flex items-center flex-1">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? "bg-green-100 text-green-600" : isCurrent ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                                                    }`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <span className={`text-xs mt-1 whitespace-nowrap ${isCurrent ? "font-medium text-slate-700" : "text-slate-400"}`}>{step.label}</span>
                                            </div>
                                            {i < STATUS_STEPS.length - 1 && (
                                                <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-400" : "bg-slate-200"}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Patient & Order Info */}
                <div className="grid grid-cols-2 gap-5">
                    <Card>
                        <CardBody>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Patient</h3>
                            <p className="text-lg font-medium text-slate-800">{test.patient?.firstName} {test.patient?.lastName}</p>
                            <p className="text-sm text-slate-500">{test.patient?.patientId}</p>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Order Info</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Requested by</span>
                                    <span className="text-slate-700">{test.requestedBy?.firstName} {test.requestedBy?.lastName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Cost</span>
                                    <span className="font-medium text-slate-800">{formatCurrency(test.totalCost)}</span>
                                </div>
                                {test.sampleCollectedAt && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Sample collected</span>
                                        <span className="text-slate-700">{formatDateTime(test.sampleCollectedAt)}</span>
                                    </div>
                                )}
                                {test.completedAt && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Completed</span>
                                        <span className="text-slate-700">{formatDateTime(test.completedAt)}</span>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Tests List */}
                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Tests ({test.tests?.length})</h3>
                            {canUpdate && test.status === "pending" && (
                                <Button size="sm" variant="outline" onClick={openEditTests}>
                                    <Pencil className="w-3.5 h-3.5" /> Edit Tests
                                </Button>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {test.tests?.map((t, i) => (
                                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-slate-800">{t.testName}</p>
                                        <p className="text-xs text-slate-400">{t.testCode} • {t.category}</p>
                                    </div>
                                    <span className="font-medium text-slate-700">{formatCurrency(t.cost)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pt-3 mt-3 border-t border-slate-100 font-semibold">
                            <span className="text-slate-700">Total</span>
                            <span className="text-slate-800">{formatCurrency(test.totalCost)}</span>
                        </div>
                    </CardBody>
                </Card>

                {/* Notes */}
                {test.notes && (
                    <Card>
                        <CardBody>
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
                            <p className="text-sm text-slate-600">{test.notes}</p>
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Right Column — Update Form */}
            {canUpdate && (
                <div className="space-y-5">
                    <Card>
                        <CardBody>
                            <h3 className="text-sm font-semibold text-slate-700 mb-4">Update Order</h3>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <FormField label="Status">
                                    <Select {...register("status")}>
                                        <option value="pending">Pending</option>
                                        <option value="sample_collected">Sample Collected</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Completed</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </Select>
                                </FormField>

                                <FormField label="Priority">
                                    <Select {...register("priority")}>
                                        <option value="routine">Routine</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="stat">STAT</option>
                                    </Select>
                                </FormField>

                                <FormField label="Report URL">
                                    <Input {...register("reportUrl")} placeholder="https://..." />
                                </FormField>

                                <FormField label="Notes">
                                    <Input {...register("notes")} placeholder="Notes..." />
                                </FormField>

                                <FormField label="Payment">
                                    <Select {...register("isPaid")}>
                                        <option value="false">Unpaid</option>
                                        <option value="true">Paid</option>
                                    </Select>
                                </FormField>

                                <Button type="submit" className="w-full" loading={updateMutation.isPending}>
                                    Save Changes
                                </Button>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Edit Tests Modal */}
            <Modal open={editTestsOpen} onClose={() => setEditTestsOpen(false)} title="Edit Tests" size="lg">
                <div className="space-y-4 mt-2">
                    <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                        {catalogTests.map(ct => (
                            <div
                                key={ct._id}
                                onClick={() => toggleTest(ct._id)}
                                className={`flex items-center justify-between px-4 py-3 cursor-pointer ${selectedTests.includes(ct._id) ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-50 border-l-2 border-l-transparent"
                                    }`}
                            >
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{ct.testName}</p>
                                    <p className="text-xs text-slate-400">{ct.testCode} • {ct.category}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-700">{formatCurrency(ct.cost)}</span>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedTests.includes(ct._id) ? "bg-blue-500 border-blue-500" : "border-slate-300"
                                        }`}>
                                        {selectedTests.includes(ct._id) && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{selectedTests.length} selected</span>
                        <span className="font-semibold text-slate-800">Total: {formatCurrency(selectedTotal)}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setEditTestsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTests} loading={updateMutation.isPending} disabled={selectedTests.length === 0}>
                            Save Tests
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}