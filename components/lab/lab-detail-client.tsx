// components/lab/lab-detail-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
    ArrowLeft, FlaskConical, FileText, FileCheck, Trash2, Pencil,
} from "lucide-react";
import { Card, CardBody, StatusBadge, Button, Badge, Alert, Modal } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { LabTestsTab } from "./lab-tests-tab";
import { LabResultsTab } from "./lab-results-tab";
import { LabReportTab } from "./lab-report-tab";

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
    results: { testName: string; value: string; unit?: string; referenceRange?: string; isAbnormal?: boolean; notes?: string }[];
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

    // Sync URL with tab
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
        onSuccess: () => router.push("/lab"),
        onError: (e: unknown) => {
            alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed");
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-5">
                <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
                <Card><CardBody><div className="h-64 bg-slate-50 rounded animate-pulse" /></CardBody></Card>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="space-y-5">
                <Button variant="secondary" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Card><CardBody><p className="text-center text-slate-500 py-12">Lab test not found</p></CardBody></Card>
            </div>
        );
    }

    // Determine which tabs are available
    const availableTabs = TABS.filter(tab => {
        if (tab.key === "report") return ["completed", "delivered"].includes(test.status);
        if (tab.key === "results") return ["processing", "completed", "delivered"].includes(test.status);
        return true; // tests tab always visible
    });

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-800">{test.labTestId}</h1>
                            <StatusBadge status={test.status} />
                            <Badge variant={test.priority === "stat" ? "danger" : test.priority === "urgent" ? "warning" : "default"}>
                                {test.priority}
                            </Badge>
                            <Badge variant={test.isPaid ? "success" : "danger"}>{test.isPaid ? "Paid" : "Unpaid"}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">Created {formatDateTime(test.createdAt)}</p>
                    </div>
                </div>
                {canDelete && ["pending", "cancelled"].includes(test.status) && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                        <Trash2 className="w-4 h-4" /> Delete Permanently
                    </Button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-0 border-b border-slate-200">
                {availableTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => switchTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${isActive
                                ? "text-blue-600 border-blue-600 bg-blue-50/50"
                                : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === "tests" && <LabTestsTab test={test} canUpdate={canUpdate} id={id} />}
            {activeTab === "results" && <LabResultsTab test={test} canUpdate={canUpdate} id={id} />}
            {activeTab === "report" && <LabReportTab test={test} id={id} />}

            {/* Delete Confirmation Modal */}
            <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Lab Order" size="sm">
                <div className="space-y-4 mt-2">
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Delete permanently?</p>
                            <p className="text-sm text-red-600">This will permanently delete <strong>{test.labTestId}</strong>.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                            Delete Permanently
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}