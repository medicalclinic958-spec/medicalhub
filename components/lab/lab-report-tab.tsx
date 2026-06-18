// components/lab/lab-report-tab.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { AlertTriangle, CheckCircle, Save, Download, Printer, Copy, Check } from "lucide-react";
import { Card, CardBody, Badge, Button, Alert, FormField, Input } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface LabTestDetail {
    _id: string;
    labTestId: string;
    patient: { firstName: string; lastName: string; patientId: string; dateOfBirth?: string; gender?: string; bloodGroup?: string };
    requestedBy: { firstName: string; lastName: string };
    tests: { testName: string; testCode?: string; category: string; cost: number }[];
    results: { testName: string; value: string; unit?: string; referenceRange?: string; isAbnormal?: boolean; notes?: string }[];
    status: string;
    priority: string;
    totalCost: number;
    isPaid: boolean;
    sampleCollectedAt?: string;
    completedAt?: string;
    approvedBy?: { firstName: string; lastName: string };
    createdAt: string;
}

interface ExistingReport {
    _id: string;
    reportId: string;
    labTechnician: { name: string; signature: string };
    additionalNotes?: string;
    status: string;
    createdAt: string;
}

interface LabReportTabProps {
    test: LabTestDetail;
    id: string;
}

const calculateAge = (dob?: string): string => {
    if (!dob) return "-";
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return "Invalid";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} years`;
};

export function LabReportTab({ test, id }: LabReportTabProps) {
    const qc = useQueryClient();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [copied, setCopied] = useState(false);

    const abnormalCount = test.results?.filter(r => r.isAbnormal).length || 0;
    const normalCount = (test.results?.length || 0) - abnormalCount;
    const missingResults = test.tests?.filter(t => !test.results?.some(r => r.testName === t.testName && r.value?.trim()));

    // Fetch existing report
    const { data: reportData } = useQuery({
        queryKey: ["report", id],
        queryFn: () => axios.get(`/api/patientReports?labTestId=${id}`).then(r => {
            const reports = r.data?.data || [];
            return reports.find((rep: ExistingReport) => rep._id) || null;
        }),
        enabled: ["completed", "delivered"].includes(test.status),
    });

    const existingReport: ExistingReport | null = reportData || null;

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            technicianName: existingReport?.labTechnician?.name || "",
            technicianSignature: existingReport?.labTechnician?.signature || "",
            additionalNotes: existingReport?.additionalNotes || "",
        },
    });

    const saveMutation = useMutation({
        mutationFn: (d: { labTestId: string; labTechnician: { name: string; signature: string }; additionalNotes?: string }) =>
            axios.post("/api/patientReports", d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["report", id] });
            setSuccess("Report saved successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: unknown) => {
            setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to save report");
            setTimeout(() => setError(""), 5000);
        },
    });

    const onSubmit = (data: { technicianName: string; technicianSignature: string; additionalNotes: string }) => {
        if (missingResults && missingResults.length > 0) {
            setError(`Missing results for: ${missingResults.map(t => t.testName).join(", ")}`);
            return;
        }

        saveMutation.mutate({
            labTestId: id,
            labTechnician: { name: data.technicianName, signature: data.technicianSignature },
            additionalNotes: data.additionalNotes,
        });
    };

    const handlePrint = () => window.print();

    const handleCopyUrl = () => {
        const url = `${window.location.origin}/dashboard/reports/${existingReport?._id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isReportable = ["completed", "delivered"].includes(test.status);
    const allResultsPresent = !missingResults || missingResults.length === 0;

    // ── Print-specific CSS injected inline ──────────────────────────────────
    const printStyles = `
  @media print {
    /* Hide everything by default */
    body * {
      visibility: hidden !important;
    }
    
    /* Show only the report print area */
    #lab-report-print-area,
    #lab-report-print-area * {
      visibility: visible !important;
    }
    
    /* Position the report at top */
    #lab-report-print-area {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      padding: 20px !important;
    }
    
    /* Hide no-print elements */
    .no-print {
      display: none !important;
    }
    
    /* Ensure colors print well */
    #lab-report-print-area * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

    return (
        <div className="space-y-5 max-w-3xl">
            <style>{printStyles}</style>

            {error && <Alert type="error">{error}</Alert>}
            {success && <Alert type="success">{success}</Alert>}

            {/* Missing results warning */}
            {isReportable && !allResultsPresent && !existingReport && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800">Incomplete Results</p>
                        <p className="text-sm text-yellow-700">
                            Missing values for: {missingResults?.map(t => t.testName).join(", ")}.
                            Go to Results Entry tab to fill them.
                        </p>
                    </div>
                </div>
            )}

            {/* ── PRINT AREA — Only this section prints ────────────────────────── */}
            <div id="lab-report-print-area">
                {/* Finalized Report Card — only shown when saved, always visible on print */}
                <div className={`print-only-report ${existingReport ? "" : "hidden"}`}>
                    <Card>
                        <CardBody>
                            {/* Header */}
                            <div className="text-center mb-6 border-b border-slate-200 pb-4">
                                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Laboratory Report</h2>
                                <p className="text-sm text-slate-500 mt-1">{existingReport?.reportId || test.labTestId}</p>
                            </div>

                            {/* Patient & Order Info */}
                            <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-slate-400 text-xs uppercase tracking-wide">Patient</span>
                                        <p className="font-semibold text-slate-800">{test.patient?.firstName} {test.patient?.lastName}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-slate-400 text-xs">ID</span>
                                            <p className="text-slate-700">{test.patient?.patientId}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs">Gender</span>
                                            <p className="text-slate-700 capitalize">{test.patient?.gender || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs">Age</span>
                                            <p className="text-slate-700">{calculateAge(test.patient?.dateOfBirth)}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs">Blood Group</span>
                                            <p className="text-slate-700">{test.patient?.bloodGroup || "-"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <span className="text-slate-400 text-xs uppercase tracking-wide">Order Details</span>
                                        <p className="font-semibold text-slate-800">{test.tests?.length} test{test.tests?.length !== 1 ? "s" : ""}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-slate-400 text-xs">Requested by</span>
                                            <p className="text-slate-700">{test.requestedBy?.firstName} {test.requestedBy?.lastName}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs">Priority</span>
                                            <Badge variant={test.priority === "stat" ? "danger" : test.priority === "urgent" ? "warning" : "default"}>{test.priority}</Badge>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs">Collected</span>
                                            <p className="text-slate-700">{test.sampleCollectedAt ? formatDateTime(test.sampleCollectedAt) : "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs">Completed</span>
                                            <p className="text-slate-700">{test.completedAt ? formatDateTime(test.completedAt) : "-"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Results Table */}
                            {test.results?.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Test Results</h3>
                                    <div className="space-y-2">
                                        {test.results.map((r, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${r.isAbnormal ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-800 text-sm">{r.testName}</p>
                                                    {r.notes && <p className="text-xs text-slate-400 mt-0.5">{r.notes}</p>}
                                                </div>
                                                <div className="flex items-center gap-4 text-right">
                                                    <div>
                                                        <p className={`text-lg font-bold ${r.isAbnormal ? "text-red-600" : "text-slate-800"}`}>
                                                            {r.value} {r.unit && <span className="text-sm font-normal text-slate-500">{r.unit}</span>}
                                                        </p>
                                                        {r.referenceRange && (
                                                            <p className="text-xs text-slate-400">Ref: {r.referenceRange}</p>
                                                        )}
                                                    </div>
                                                    {r.isAbnormal && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Technician Info */}
                            <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-200">
                                <div>
                                    <span className="text-slate-400 text-xs">Performed by</span>
                                    <p className="font-medium text-slate-700">{existingReport?.labTechnician?.name}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 text-xs">Signature</span>
                                    <p className="font-medium italic text-slate-700">{existingReport?.labTechnician?.signature}</p>
                                </div>
                            </div>

                            {existingReport?.additionalNotes && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <span className="text-slate-400 text-xs">Additional Notes</span>
                                    <p className="text-sm text-slate-600 mt-1">{existingReport.additionalNotes}</p>
                                </div>
                            )}

                            <p className="text-center text-xs text-slate-400 mt-6">
                                Generated on {formatDateTime(existingReport?.createdAt || new Date().toISOString())}
                            </p>
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* ── Actions / Form (not printed) ─────────────────────────────────── */}
            <div className="no-print">
                <Card>
                    <CardBody>
                        {existingReport ? (
                            // Report saved — show action buttons
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-700">Report Ready</h3>
                                        <p className="text-xs text-slate-400">{existingReport.reportId}</p>
                                    </div>
                                    <Badge variant="success">Saved</Badge>
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                    <Button size="sm" onClick={handlePrint}>
                                        <Printer className="w-4 h-4" /> Print Report
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={handleCopyUrl}>
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? "Copied" : "Copy Link"}
                                    </Button>
                                </div>
                            </div>
                        ) : isReportable ? (
                            // Save form
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700">Finalize Report</h3>

                                <FormField label="Lab Technician Name" required error={errors.technicianName?.message}>
                                    <Input {...register("technicianName", { required: "Name is required" })} placeholder="Full name" />
                                </FormField>

                                <FormField label="Signature" required error={errors.technicianSignature?.message}>
                                    <Input {...register("technicianSignature", { required: "Signature is required" })} placeholder="e.g. Dr. Smith" />
                                </FormField>

                                <FormField label="Additional Notes">
                                    <Input {...register("additionalNotes")} placeholder="Any observations..." />
                                </FormField>

                                <Button type="submit" className="w-full" loading={saveMutation.isPending} disabled={!allResultsPresent}>
                                    <Save className="w-4 h-4" /> Save & Finalize Report
                                </Button>
                            </form>
                        ) : (
                            <p className="text-center text-sm text-slate-400 py-4">
                                Report can be finalized once the order is completed.
                            </p>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}