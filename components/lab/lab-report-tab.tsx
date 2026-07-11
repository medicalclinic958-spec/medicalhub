// components/lab/lab-report-tab.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { AlertTriangle, Save, Printer, Copy, Check, Pencil } from "lucide-react";
import { Card, CardBody, Badge, Button, Alert, FormField, Input, Modal } from "@/components/ui";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

const CLINIC_NAME = "ClinicHMS";
const CLINIC_TAGLINE = "Hospital Management System";
const CLINIC_ADDRESS = "123 Healthcare Avenue, Medical District";
const CLINIC_PHONE = "+92 300 1234567";

interface LabTestDetail {
    _id: string; labTestId: string;
    patient: { firstName: string; lastName: string; patientId: string; dateOfBirth?: string; gender?: string; bloodGroup?: string };
    requestedBy: { firstName: string; lastName: string };
    tests: { testName: string; testCode?: string; category: string; cost: number }[];
    results: { testName: string; value: string; unit?: string; referenceRange?: string; isAbnormal?: boolean; notes?: string }[];
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
    if (!dob) return "-";
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return "-";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} years`;
};

export function LabReportTab({ test, id }: LabReportTabProps) {
    const qc = useQueryClient();
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);

    const abnormalCount = test.results?.filter(r => r.isAbnormal).length || 0;
    const missingResults = test.tests?.filter(t => !test.results?.some(r => r.testName === t.testName && r.value?.trim()));

    const { data: reportData, isLoading: reportLoading } = useQuery({
        queryKey: ["report", id],
        queryFn: () => axios.get(`/api/patientReports?labTestId=${id}`).then(r => {
            const reports = r.data?.data || [];
            return reports.find((rep: ExistingReport) => rep._id) || null;
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
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ["report", id] }); 
            toast.success("Report saved successfully!"); 
            setEditModalOpen(false);
        },
        onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Failed"; setError(msg); toast.error(msg); },
    });

    const updateMutation = useMutation({
        mutationFn: (d: { labTechnician: { name: string; signature: string }; additionalNotes?: string }) =>
            axios.put(`/api/patientReports/${existingReport?._id}`, d),
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ["report", id] }); 
            toast.success("Report updated successfully!"); 
            setEditModalOpen(false);
        },
        onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Failed"; setError(msg); toast.error(msg); },
    });

    const onSubmit = (data: { technicianName: string; technicianSignature: string; additionalNotes: string }) => {
        if (missingResults && missingResults.length > 0) {
            setError(`Missing results for: ${missingResults.map(t => t.testName).join(", ")}`);
            return;
        }
        saveMutation.mutate({ 
            labTestId: id, 
            labTechnician: { name: data.technicianName, signature: data.technicianSignature }, 
            additionalNotes: data.additionalNotes 
        });
    };

const onUpdate = (data: { technicianName: string; technicianSignature: string; additionalNotes: string }) => {
    updateMutation.mutate({ 
        labTechnician: { 
            name: data.technicianName, 
            signature: data.technicianSignature 
        }, 
        additionalNotes: data.additionalNotes 
    });
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

        const r = test;
        const rep = existingReport;

        printWindow.document.write(`<!DOCTYPE html><html><head><title>Lab Report - ${r.patient?.firstName} ${r.patient?.lastName}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;font-size:11px;color:#1a1a1a;padding:25px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
            .header{display:flex;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0d9488}
            .clinic-name{font-size:18px;font-weight:700;color:#0d9488}.clinic-tagline{font-size:9px;color:#666}.clinic-details{font-size:9px;color:#666;line-height:1.5}
            .doc-title{font-size:14px;font-weight:700;color:#333;text-align:right}.doc-sub{font-size:9px;color:#666;text-align:right}
            .section{margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5e5e5}
            .label{font-size:8px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}.value{font-size:10px;color:#333}
            .grid-2{display:flex;gap:30px}.grid-2>div{flex:1}.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
            .result-row{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:4px;margin-bottom:4px}
            .result-normal{background:#f9fafb;border:1px solid #e5e5e5}.result-abnormal{background:#fef2f2;border:1px solid #fecaca}
            .result-value{font-size:13px;font-weight:700}.result-value.abnormal{color:#dc2626}
            .result-unit{font-size:9px;font-weight:400;color:#888}
            .result-ref{font-size:8px;color:#aaa}
            .footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e5e5;text-align:center;font-size:8px;color:#aaa}
            .badge{display:inline-block;font-size:8px;font-weight:600;padding:1px 6px;border-radius:3px}
            @media print{body{padding:15px}@page{margin:12mm}}
        </style></head><body>
        <div class="header"><div><div class="clinic-name">${CLINIC_NAME}</div><div class="clinic-tagline">${CLINIC_TAGLINE}</div><div class="clinic-details">${CLINIC_ADDRESS}<br/>${CLINIC_PHONE}</div></div><div><div class="doc-title">LABORATORY REPORT</div><div class="doc-sub">${rep?.reportId || r.labTestId}</div><div class="doc-sub">${formatDate(r.createdAt)}</div></div></div>
        <div class="section"><div class="grid-2"><div><div class="label">Patient</div><div class="value">${r.patient?.firstName} ${r.patient?.lastName}</div><div style="font-size:9px;color:#666;">${r.patient?.patientId}</div></div><div><div class="label">Order Info</div><div class="value">${r.tests?.length} test${r.tests?.length !== 1 ? 's' : ''}</div><div style="font-size:9px;color:#666;">Requested by: ${r.requestedBy?.firstName} ${r.requestedBy?.lastName}</div></div></div>
        <div class="grid-4" style="margin-top:8px;"><div><span class="label">Gender</span><div class="value">${r.patient?.gender || '-'}</div></div><div><span class="label">Age</span><div class="value">${calculateAge(r.patient?.dateOfBirth)}</div></div><div><span class="label">Blood Group</span><div class="value">${r.patient?.bloodGroup || '-'}</div></div><div><span class="label">Priority</span><div class="value" style="text-transform:capitalize">${r.priority}</div></div></div></div>
        <div class="section"><div class="label">Results</div>${r.results?.map(res => `<div class="result-row ${res.isAbnormal ? 'result-abnormal' : 'result-normal'}"><div><div class="value" style="font-size:10px;">${res.testName}</div>${res.notes ? `<div style="font-size:8px;color:#999;">${res.notes}</div>` : ''}</div><div style="text-align:right;"><div class="result-value ${res.isAbnormal ? 'abnormal' : ''}">${res.value} <span class="result-unit">${res.unit || ''}</span></div>${res.referenceRange ? `<div class="result-ref">Ref: ${res.referenceRange}</div>` : ''}</div></div>`).join('')}</div>
        ${rep ? `<div class="section"><div class="grid-2"><div><div class="label">Performed by</div><div class="value">${rep.labTechnician?.name}</div></div><div style="text-align:right;"><div class="label">Signature</div><div class="value" style="font-style:italic;">${rep.labTechnician?.signature}</div></div></div>${rep.additionalNotes ? `<div style="margin-top:8px;"><div class="label">Additional Notes</div><div style="font-size:9px;color:#666;">${rep.additionalNotes}</div></div>` : ''}</div>` : ''}
        <div class="footer">Computer-generated laboratory report • ${CLINIC_NAME} • ${formatDate(new Date().toISOString())}</div>
        </body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
    };

    const handleCopyUrl = () => {
        const url = `${window.location.origin}/dashboard/reports/${existingReport?._id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isReportable = ["completed", "delivered"].includes(test.status);
    const allResultsPresent = !missingResults || missingResults.length === 0;

    return (
        <div className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            {/* Missing results warning */}
            {isReportable && !allResultsPresent && !existingReport && (
                <Alert type="warning">
                    Missing values for: {missingResults?.map(t => t.testName).join(", ")}. Go to Results Entry tab to fill them.
                </Alert>
            )}

            {/* Report Preview */}
            {existingReport && (
                <Card>
                    <CardBody>
                        {/* Header with Edit Button */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                            <div className="text-center flex-1">
                                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Laboratory Report</h2>
                                <p className="text-xs text-gray-400 mt-1">{existingReport.reportId || test.labTestId}</p>
                            </div>
                            <Button size="sm" variant="secondary" onClick={openEditModal}>
                                <Pencil className="w-3.5 h-3.5" /> Edit
                            </Button>
                        </div>

                        {/* Patient & Order Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-3 border-b border-gray-200">
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase">Patient</p>
                                    <p className="text-sm font-semibold text-gray-900">{test.patient?.firstName} {test.patient?.lastName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><p className="text-xs text-gray-400">ID</p><p className="text-xs text-gray-700">{test.patient?.patientId}</p></div>
                                    <div><p className="text-xs text-gray-400">Gender</p><p className="text-xs text-gray-700 capitalize">{test.patient?.gender || "-"}</p></div>
                                    <div><p className="text-xs text-gray-400">Age</p><p className="text-xs text-gray-700">{calculateAge(test.patient?.dateOfBirth)}</p></div>
                                    <div><p className="text-xs text-gray-400">Blood Group</p><p className="text-xs text-gray-700">{test.patient?.bloodGroup || "-"}</p></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase">Order Details</p>
                                    <p className="text-sm font-semibold text-gray-900">{test.tests?.length} test{test.tests?.length !== 1 ? "s" : ""}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><p className="text-xs text-gray-400">Requested by</p><p className="text-xs text-gray-700">{test.requestedBy?.firstName} {test.requestedBy?.lastName}</p></div>
                                    <div><p className="text-xs text-gray-400">Priority</p><Badge variant={test.priority === "stat" ? "danger" : test.priority === "urgent" ? "warning" : "default"}>{test.priority}</Badge></div>
                                    <div><p className="text-xs text-gray-400">Collected</p><p className="text-xs text-gray-700">{test.sampleCollectedAt ? formatDate(test.sampleCollectedAt) : "-"}</p></div>
                                    <div><p className="text-xs text-gray-400">Completed</p><p className="text-xs text-gray-700">{test.completedAt ? formatDate(test.completedAt) : "-"}</p></div>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {test.results?.length > 0 && (
                            <div className="mb-4 pb-3 border-b border-gray-200">
                                <h3 className="text-xs font-semibold text-gray-900 mb-3">Test Results</h3>
                                <div className="space-y-1.5">
                                    {test.results.map((r, i) => (
                                        <div key={i} className={cn("flex items-center justify-between p-2.5 rounded-lg border", r.isAbnormal ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
                                            <div>
                                                <p className="text-xs font-medium text-gray-900">{r.testName}</p>
                                                {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-3 text-right">
                                                <div>
                                                    <p className={cn("text-sm font-bold", r.isAbnormal ? "text-red-500" : "text-gray-900")}>
                                                        {r.value} {r.unit && <span className="text-xs font-normal text-gray-400">{r.unit}</span>}
                                                    </p>
                                                    {r.referenceRange && <p className="text-xs text-gray-400">Ref: {r.referenceRange}</p>}
                                                </div>
                                                {r.isAbnormal && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Technician */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                            <div>
                                <p className="text-xs text-gray-400">Performed by</p>
                                <p className="text-xs font-medium text-gray-700">{existingReport?.labTechnician?.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Signature</p>
                                <p className="text-xs font-medium italic text-gray-700">{existingReport?.labTechnician?.signature}</p>
                            </div>
                        </div>

                        {existingReport?.additionalNotes && (
                            <div className="mb-4 pb-3 border-b border-gray-200">
                                <p className="text-xs text-gray-400">Additional Notes</p>
                                <p className="text-xs text-gray-600 mt-1">{existingReport.additionalNotes}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handlePrint}><Printer className="w-3.5 h-3.5" /> Print Report</Button>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Save Form */}
            {!existingReport && isReportable && !reportLoading && (
                <Card>
                    <CardBody>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <h3 className="text-xs font-semibold text-gray-900">Finalize Report</h3>
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
                                <Save className="w-3.5 h-3.5" /> Save & Finalize Report
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            )}

            {!isReportable && (
                <Card>
                    <CardBody>
                        <p className="text-xs text-gray-400 text-center py-4">Report can be finalized once the order is completed.</p>
                    </CardBody>
                </Card>
            )}

            {/* Edit Modal */}
            <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Report Details" size="md">
                <form onSubmit={handleSubmit(onUpdate)} className="space-y-4 mt-2">
                    <FormField label="Lab Technician Name" required error={errors.technicianName?.message}>
                        <Input {...register("technicianName", { required: "Name is required" })} placeholder="Full name" />
                    </FormField>
                    <FormField label="Signature" required error={errors.technicianSignature?.message}>
                        <Input {...register("technicianSignature", { required: "Signature is required" })} placeholder="e.g. Dr. Smith" />
                    </FormField>
                    <FormField label="Additional Notes">
                        <Input {...register("additionalNotes")} placeholder="Any observations..." />
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>
                            <Save className="w-3.5 h-3.5" /> Update Report
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}