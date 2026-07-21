// components/lab/lab-report-tab.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { AlertTriangle, Save, Printer, Pencil, Download } from "lucide-react";
import { Card, CardBody, Badge, Button, Alert, FormField, Input, Modal } from "@/components/ui";
import { formatDate, cn, getMissingLabTestResults } from "@/lib/utils";
import { toast } from "sonner";
import { generateLabReportPrintHtml, LabReportPdfTemplate } from "../printTemplates/lab-report-print-template";
import { pdf } from "@react-pdf/renderer";

interface LabTestDetail {
    _id: string; labTestId: string;
    patient: { firstName: string; lastName: string; patientId: string; dateOfBirth?: string; gender?: string; bloodGroup?: string };
    requestedBy: { firstName: string; lastName: string };
    tests: { testName: string; testCode?: string; category: string; cost: number; catalogId?: string | { _id?: string } }[];
    results: {
        catalogId: string;
        testName: string;
        parameterResults: { parameterName: string; value: string | number | boolean; unit?: string; referenceRange?: string; isAbnormal?: boolean }[];
        notes?: string;
    }[];
    status: string; priority: string; totalCost: number; isPaid: boolean;
    sampleCollectedAt?: string; completedAt?: string; approvedBy?: { firstName: string; lastName: string };
    createdAt: string;
}

interface ExistingReport {
    _id: string; reportId: string;
    labTechnician: { name: string; signature: string };
    additionalNotes?: string; status: string; createdAt: string;
}

interface LabReportTabProps { test: LabTestDetail; id: string; }

const calculateAge = (dob?: string): string => {
    if (!dob) return "—";
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} years`;
};

const formatValue = (value: any) => {
    if (value === true) return "Positive";
    if (value === false) return "Negative";
    return String(value ?? "—");
};

export function LabReportTab({ test, id }: LabReportTabProps) {
    const qc = useQueryClient();
    const [error, setError] = useState("");
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const missingResults = getMissingLabTestResults(test.tests, test.results);

    const { data: reportData, isLoading: reportLoading } = useQuery({
        queryKey: ["report", id],
        queryFn: () => axios.get("/api/patientReports", { params: { labTestId: id, limit: 1 } }).then(r => {
            const reports = r.data?.data || [];
            return (reports[0] as ExistingReport | undefined) || null;
        }),
        enabled: ["completed", "delivered"].includes(test.status),
    });

    const existingReport: ExistingReport | null = reportData || null;

    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        defaultValues: {
            technicianName: existingReport?.labTechnician?.name || "",
            technicianSignature: existingReport?.labTechnician?.signature || "",
            additionalNotes: existingReport?.additionalNotes || "",
        },
    });

    const saveMutation = useMutation({
        mutationFn: (d: { labTestId: string; labTechnician: { name: string; signature: string }; additionalNotes?: string }) =>
            axios.post("/api/patientReports", d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); toast.success("Report saved!"); setEditModalOpen(false); },
        onError: (e: unknown) => { setError((e as any)?.response?.data?.error || "Failed"); toast.error("Failed"); },
    });

    const updateMutation = useMutation({
        mutationFn: (d: { labTechnician: { name: string; signature: string }; additionalNotes?: string }) =>
            axios.put(`/api/patientReports/${existingReport?._id}`, d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); toast.success("Report updated!"); setEditModalOpen(false); },
        onError: (e: unknown) => { setError((e as any)?.response?.data?.error || "Failed"); toast.error("Failed"); },
    });

    const onSubmit = (data: { technicianName: string; technicianSignature: string; additionalNotes: string }) => {
        if (missingResults && missingResults.length > 0) { setError(`Missing: ${missingResults.map(t => t.testName).join(", ")}`); return; }
        saveMutation.mutate({ labTestId: id, labTechnician: { name: data.technicianName, signature: data.technicianSignature }, additionalNotes: data.additionalNotes });
    };

    const onUpdate = (data: { technicianName: string; technicianSignature: string; additionalNotes: string }) => {
        updateMutation.mutate({ labTechnician: { name: data.technicianName, signature: data.technicianSignature }, additionalNotes: data.additionalNotes });
    };

    const openEditModal = () => {
        setValue("technicianName", existingReport?.labTechnician?.name || "");
        setValue("technicianSignature", existingReport?.labTechnician?.signature || "");
        setValue("additionalNotes", existingReport?.additionalNotes || "");
        setEditModalOpen(true);
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) { toast.error("Please allow pop-ups to print."); return; }
        printWindow.document.write(generateLabReportPrintHtml(test, existingReport, "/logo.png"));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
    };

    const handleDownloadPdf = async () => {
        setIsPdfLoading(true);
        try {
            const blob = await pdf(<LabReportPdfTemplate test={test} report={existingReport} logoUrl="/logo.png" />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${test.labTestId}_${test.patient?.firstName}_${test.patient?.lastName}.pdf`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("PDF downloaded!");
        } catch { toast.error("Failed to generate PDF"); }
        finally { setIsPdfLoading(false); }
    };

    const isReportable = ["completed", "delivered"].includes(test.status);
    const allResultsPresent = !missingResults || missingResults.length === 0;

    return (
        <div className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            {isReportable && !allResultsPresent && !existingReport && (
                <Alert type="warning">Missing results for: {missingResults?.map(t => t.testName).join(", ")}. Go to Results Entry tab.</Alert>
            )}

            {existingReport && (
                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Laboratory Report</h2>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="secondary" onClick={openEditModal}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                                <Button size="sm" variant="secondary" onClick={handlePrint}><Printer className="w-3.5 h-3.5" /> Print</Button>
                                <Button size="sm" variant="secondary" onClick={handleDownloadPdf} loading={isPdfLoading}><Download className="w-3.5 h-3.5" /> PDF</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Patient</p>
                                <p className="text-xs font-semibold text-gray-900">{test.patient?.firstName} {test.patient?.lastName}</p>
                                <p className="text-xs text-gray-500">{test.patient?.patientId}</p>
                            </div>
                            <div className="sm:text-right">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Order Details</p>
                                <p className="text-xs text-gray-700">{test.tests?.length} test{test.tests?.length !== 1 ? "s" : ""}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Requested by: {test.requestedBy?.firstName} {test.requestedBy?.lastName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-200">
                            <div><p className="text-xs text-gray-400">Gender</p><p className="text-xs text-gray-700 capitalize">{test.patient?.gender || "—"}</p></div>
                            <div><p className="text-xs text-gray-400">Age</p><p className="text-xs text-gray-700">{calculateAge(test.patient?.dateOfBirth)}</p></div>
                            <div><p className="text-xs text-gray-400">Blood Group</p><p className="text-xs text-gray-700">{test.patient?.bloodGroup || "—"}</p></div>
                            <div><p className="text-xs text-gray-400">Priority</p><Badge variant={test.priority === "stat" ? "danger" : test.priority === "urgent" ? "warning" : "default"}>{test.priority}</Badge></div>
                        </div>

                        {test.results?.length > 0 && (
                            <div className="mb-4 pb-4 border-b border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Test Results</p>
                                <div className="space-y-3">
                                    {test.results.map((result, i) => (
                                        <div key={i}>
                                            <p className="text-xs font-semibold text-gray-900 mb-1.5">{result.testName}</p>
                                            <div className="space-y-1">
                                                {result.parameterResults?.map((pr, j) => (
                                                    <div key={j} className={cn("flex items-center justify-between p-2 rounded-lg border", pr.isAbnormal ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-medium text-gray-700">{pr.parameterName}</span>
                                                            {pr.unit && <span className="text-[10px] text-gray-400">({pr.unit})</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-right">
                                                            <div>
                                                                <p className={cn("text-xs font-bold", pr.isAbnormal ? "text-red-500" : "text-gray-900")}>{formatValue(pr.value)}</p>
                                                                {pr.referenceRange && <p className="text-[10px] text-gray-400">Ref: {pr.referenceRange}</p>}
                                                            </div>
                                                            {pr.isAbnormal && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {result.notes && <p className="text-[10px] text-gray-400 mt-1 ml-1">{result.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                            <div><p className="text-xs text-gray-400">Performed by</p><p className="text-xs font-medium text-gray-700">{existingReport?.labTechnician?.name}</p></div>
                            <div className="text-right"><p className="text-xs text-gray-400">Signature</p><p className="text-xs font-medium italic text-gray-700">{existingReport?.labTechnician?.signature}</p></div>
                        </div>

                        {existingReport?.additionalNotes && (
                            <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Additional Notes</p><p className="text-xs text-gray-600">{existingReport.additionalNotes}</p></div>
                        )}
                    </CardBody>
                </Card>
            )}

            {!existingReport && isReportable && !reportLoading && (
                <Card>
                    <CardBody>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <h3 className="text-xs font-semibold text-gray-900">Finalize Report</h3>
                            <FormField label="Lab Technician Name" required error={errors.technicianName?.message}><Input {...register("technicianName", { required: true })} placeholder="Full name" /></FormField>
                            <FormField label="Signature" required error={errors.technicianSignature?.message}><Input {...register("technicianSignature", { required: true })} placeholder="e.g. Dr. Smith" /></FormField>
                            <FormField label="Additional Notes"><Input {...register("additionalNotes")} placeholder="Any observations..." /></FormField>
                            <div className="flex justify-end"><Button type="submit" loading={saveMutation.isPending} disabled={!allResultsPresent}><Save className="w-3.5 h-3.5" /> Save & Finalize</Button></div>
                        </form>
                    </CardBody>
                </Card>
            )}

            {!isReportable && <Card><CardBody><p className="text-xs text-gray-400 text-center py-4">Report can be finalized once the order is completed.</p></CardBody></Card>}

            <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Report Details" size="md">
                <form onSubmit={handleSubmit(onUpdate)} className="space-y-4 mt-2">
                    <FormField label="Lab Technician Name" required error={errors.technicianName?.message}><Input {...register("technicianName", { required: true })} placeholder="Full name" /></FormField>
                    <FormField label="Signature" required error={errors.technicianSignature?.message}><Input {...register("technicianSignature", { required: true })} placeholder="e.g. Dr. Smith" /></FormField>
                    <FormField label="Additional Notes"><Input {...register("additionalNotes")} placeholder="Any observations..." /></FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button><Button type="submit" loading={updateMutation.isPending}><Save className="w-3.5 h-3.5" /> Update</Button></div>
                </form>
            </Modal>
        </div>
    );
}