// components/lab/lab-detail-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
    ArrowLeft, FlaskConical, FileText, FileCheck, Trash2,
} from "lucide-react";
import { Card, CardBody, StatusBadge, Button, Badge, Alert, Modal, Skeleton } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { LabTestsTab } from "./lab-tests-tab";
import { LabResultsTab } from "./lab-results-tab";
import { LabReportTab } from "./lab-report-tab";

interface LabTestParameterResult {
    parameterName: string;
    value: string | number | boolean;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
}

interface LabTestResult {
    catalogId: string;
    testName: string;
    testCode?: string;
    parameterResults: LabTestParameterResult[];
    notes?: string;
}

interface LabTestDetail {
    _id: string;
    labTestId: string;
    patient: { _id: string; firstName: string; lastName: string; patientId: string; age?: number; gender?: string };
    requestedBy: { _id: string; firstName: string; lastName: string };
    tests: { catalogId?: string; testName: string; testCode?: string; category: string; cost: number }[];
    status: string;
    priority: string;
    totalCost: number;
    isPaid: boolean;
    sampleCollectedAt?: string;
    sampleCollectedBy?: { firstName: string; lastName: string };
    processedBy?: { firstName: string; lastName: string };
    completedAt?: string;
    approvedBy?: { firstName: string; lastName: string };
    results: LabTestResult[]; // ✅ was flat array, now nested per test/parameter
    reportUrl?: string;
    notes?: string;
    createdAt: string;
}

type TabKey = "tests" | "results" | "report";

const TABS: { key: TabKey; label: string; icon: typeof FlaskConical }[] = [
    { key: "tests", label: "Tests & Order", icon: FlaskConical },
    { key: "results", label: "Results Entry", icon: FileText },
    { key: "report", label: "Final Report", icon: FileCheck },
];

export function LabDetailClient() {
    const { data: session } = useSession();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const qc = useQueryClient();

    const tabParam = searchParams.get("tab") as TabKey | null;
    const [activeTab, setActiveTab] = useState<TabKey>(tabParam || "tests");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const isSA = session?.user?.isSuperAdmin;
    const perms = session?.user?.permissions || [];
    const canUpdate = isSA || perms.includes("lab:update");
    const canDelete = isSA || perms.includes("lab:delete");

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
    };

    const { data, isLoading } = useQuery({
        queryKey: ["lab-test", id],
        queryFn: () => axios.get(`/api/lab/${id}`).then(r => r.data),
    });

    const test: LabTestDetail | null = data?.data || null;

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/lab/${id}`),
        onSuccess: () => { toast.success("Lab order deleted!"); router.push("/lab"); },
        onError: (e: unknown) => toast.error((e as any)?.response?.data?.error || "Failed to delete"),
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48 rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        );
    }

    if (!test) {
        return (
            <div className="space-y-4">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer"><ArrowLeft className="w-4 h-4" /> Back</button>
                <Card><CardBody><p className="text-center text-gray-400 py-12 text-xs">Lab test not found</p></CardBody></Card>
            </div>
        );
    }

    const availableTabs = TABS.filter(tab => {
        if (tab.key === "report") return ["completed", "delivered"].includes(test.status);
        if (tab.key === "results") return ["processing", "completed", "delivered"].includes(test.status);
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <button onClick={() => router.back()} className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0 mt-0.5">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-semibold text-gray-900">{test.labTestId}</h1>
                            <StatusBadge status={test.status} />
                            <Badge variant={test.priority === "stat" ? "danger" : test.priority === "urgent" ? "warning" : "default"}>{test.priority}</Badge>
                            <Badge variant={test.isPaid ? "success" : "danger"}>{test.isPaid ? "Paid" : "Unpaid"}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {test.patient?.firstName} {test.patient?.lastName} ({test.patient?.patientId}) • Created {formatDate(test.createdAt)}
                        </p>
                    </div>
                </div>
                {canDelete && ["pending", "cancelled"].includes(test.status) && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-300">
                {availableTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => switchTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer",
                                activeTab === tab.key ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === "tests" && <LabTestsTab test={test} canUpdate={canUpdate} id={id} />}
            {activeTab === "results" && <LabResultsTab test={test} canUpdate={canUpdate} id={id} />}
            {activeTab === "report" && <LabReportTab test={test} id={id} />}

            {/* Delete Modal */}
            <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Lab Order" size="sm">
                <div className="space-y-4 mt-2">
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-red-800">Delete permanently?</p>
                            <p className="text-xs text-red-600 mt-0.5">This will permanently delete <strong>{test.labTestId}</strong>.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>Delete Permanently</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}