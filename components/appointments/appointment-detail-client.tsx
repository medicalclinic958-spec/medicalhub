// components/appointments/appointment-detail-client.tsx
"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ArrowLeft, Calendar, FileText, Edit2, Clock, Printer,
} from "lucide-react";
import {
    Card, CardBody, StatusBadge, Badge, Button,
    Skeleton, Alert, Modal, FormField, Input, Select,
} from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { updateAppointmentSchema, UpdateAppointmentInput } from "@/lib/validations";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const CLINIC_NAME = "ClinicHMS";
const CLINIC_TAGLINE = "Hospital Management System";
const CLINIC_ADDRESS = "123 Healthcare Avenue, Medical District";
const CLINIC_PHONE = "+92 300 1234567";

interface Appointment {
    _id: string;
    appointmentId: string;
    patient: { _id: string; firstName: string; lastName: string; patientId: string; phone: string };
    doctor: { _id: string; user: { firstName: string; lastName: string }; doctorId: string };
    department?: { _id: string; name: string; code: string };
    type: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    chiefComplaint?: string;
    notes?: string;
    cancellationReason?: string;
    consultationFee: number;
    isPaid: boolean;
    checkedInAt?: string;
    completedAt?: string;
    createdAt: string;
}

export function AppointmentDetailClient({ appointmentId }: { appointmentId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const printRef = useRef<HTMLDivElement>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [error, setError] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [cancelReason, setCancelReason] = useState("");
    const [showCancelReason, setShowCancelReason] = useState(false);

    const perms = session?.user.permissions || [];
    const isSA = session?.user.isSuperAdmin;
    const canUpdate = isSA || perms.includes("appointments:update");

    const { data, isLoading, error: queryError } = useQuery({
        queryKey: ["appointment", appointmentId],
        queryFn: () => axios.get(`/api/appointments/${appointmentId}`).then(r => r.data),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<UpdateAppointmentInput>({
        resolver: zodResolver(updateAppointmentSchema),
    });

    const updateMutation = useMutation({
        mutationFn: (data: UpdateAppointmentInput) => {
            const updateData: any = { ...data };
            if (data.status !== "cancelled") updateData.cancellationReason = "";
            return axios.put(`/api/appointments/${appointmentId}`, updateData);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
            qc.invalidateQueries({ queryKey: ["appointments"] });
            setEditOpen(false);
            setCancelReason("");
            setShowCancelReason(false);
            setError("");
            toast.success("Appointment updated successfully!");
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.error || "Failed to update";
            setError(msg);
            toast.error(msg);
        },
    });

    const openEditModal = () => {
        if (data?.data) {
            const a = data.data;
            reset({
                scheduledDate: a.scheduledDate?.split("T")[0],
                scheduledTime: a.scheduledTime,
                duration: a.duration,
                type: a.type,
                status: a.status,
                chiefComplaint: a.chiefComplaint || "",
                notes: a.notes || "",
                consultationFee: a.consultationFee,
            });
            setSelectedStatus(a.status);
            setShowCancelReason(a.status === "cancelled");
            if (a.status === "cancelled") setCancelReason(a?.cancellationReason || "");
            setEditOpen(true);
        }
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setValue("status", newStatus);
        setSelectedStatus(newStatus);
        setShowCancelReason(newStatus === "cancelled");
        if (newStatus !== "cancelled") setCancelReason("");
    };

    const onSubmit = (data: UpdateAppointmentInput) => {
        if (data.status === "cancelled" && !cancelReason) {
            setError("Cancellation reason is required");
            return;
        }
        updateMutation.mutate({ ...data, cancellationReason: cancelReason });
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Please allow pop-ups to print.");
            return;
        }

        const a = data?.data as Appointment;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${a.appointmentId} - ${CLINIC_NAME}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; color: #1a1a1a; padding: 25px; }
                    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #0d9488; }
                    .clinic-name { font-size: 18px; font-weight: 700; color: #0d9488; }
                    .clinic-tagline { font-size: 9px; color: #666; }
                    .clinic-details { font-size: 9px; color: #666; line-height: 1.5; }
                    .title { font-size: 14px; font-weight: 700; color: #333; text-align: right; }
                    .subtitle { font-size: 10px; color: #666; text-align: right; }
                    .section { display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5; }
                    .section-label { font-size: 8px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
                    .section-value { font-size: 10px; color: #333; font-weight: 500; }
                    .section-sub { font-size: 9px; color: #666; }
                    .status-badge { display: inline-block; font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
                    .status-scheduled { background: #dbeafe; color: #1e40af; }
                    .status-completed { background: #d1fae5; color: #065f46; }
                    .status-cancelled { background: #fee2e2; color: #991b1b; }
                    .status-checked_in, .status-in_consultation { background: #fef3c7; color: #92400e; }
                    .status-no_show { background: #f3f4f6; color: #374151; }
                    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 8px; color: #aaa; }
                    @media print { body { padding: 15px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="clinic-name">${CLINIC_NAME}</div>
                        <div class="clinic-tagline">${CLINIC_TAGLINE}</div>
                        <div class="clinic-details">${CLINIC_ADDRESS}<br/>${CLINIC_PHONE}</div>
                    </div>
                    <div>
                        <div class="title">APPOINTMENT SLIP</div>
                        <div class="subtitle">${a.appointmentId}</div>
                        <div style="margin-top:4px;">
                            <span class="status-badge status-${a.status}">${a.status.replace(/_/g, " ").toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div>
                        <div class="section-label">Patient</div>
                        <div class="section-value">${a.patient?.firstName} ${a.patient?.lastName}</div>
                        <div class="section-sub">${a.patient?.patientId}</div>
                        <div class="section-sub">${a.patient?.phone}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="section-label">Doctor</div>
                        <div class="section-value">Dr. ${a.doctor?.user?.firstName} ${a.doctor?.user?.lastName}</div>
                        <div class="section-sub">${a.doctor?.doctorId}</div>
                    </div>
                </div>

                <div class="section">
                    <div>
                        <div class="section-label">Date & Time</div>
                        <div class="section-value">${formatDate(a.scheduledDate)}</div>
                        <div class="section-sub">${a.scheduledTime} (${a.duration} min)</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="section-label">Type</div>
                        <div class="section-value">${a.type?.replace(/_/g, " ")}</div>
                        ${a.department ? `<div class="section-sub">${a.department.name}</div>` : ''}
                    </div>
                </div>

                ${a.chiefComplaint ? `
                <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e5e5;">
                    <div class="section-label">Chief Complaint</div>
                    <div style="font-size:10px;color:#333;">${a.chiefComplaint}</div>
                </div>
                ` : ''}

                ${a.notes ? `
                <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e5e5;">
                    <div class="section-label">Notes</div>
                    <div style="font-size:10px;color:#333;">${a.notes}</div>
                </div>
                ` : ''}

                <div class="footer">
                    This is a computer-generated appointment slip • ${CLINIC_NAME}
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
    };

    if (isLoading) return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );

    if (queryError || !data?.data) return (
        <div className="space-y-4">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <Alert type="error">Appointment not found.</Alert>
        </div>
    );

    const a: Appointment = data.data;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0 mt-0.5"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-semibold text-gray-900">{a.appointmentId}</h1>
                            <StatusBadge status={a.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(a.scheduledDate)} • {a.scheduledTime} ({a.duration} min)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {canUpdate && (
                        <Button size="sm" onClick={() => router.push(`/opd?appointmentId=${a._id}&patientId=${a.patient?._id}`)}>
                            <FileText className="w-3.5 h-3.5" /> Create EMR
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={handlePrint}>
                        <Printer className="w-3.5 h-3.5" /> Print
                    </Button>
                    <Button variant="secondary" size="sm" onClick={openEditModal}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                    </Button>
                </div>
            </div>

            {/* Detail Grid */}
            <div ref={printRef}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Patient Info */}
                    <Card>
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-teal-600" />
                                </div>
                                <h3 className="text-xs font-semibold text-gray-900">Patient & Doctor</h3>
                            </div>
                            <div className="space-y-2.5">
                                <Row label="Patient">
                                    <Link href={`/patients/${a.patient?._id}`} className="text-teal-600 font-medium">
                                        {a.patient?.firstName} {a.patient?.lastName}
                                    </Link>
                                </Row>
                                <Row label="Patient ID" value={a.patient?.patientId} />
                                <Row label="Phone" value={a.patient?.phone} />
                                <Row label="Doctor">
                                    <Link href={`/doctors/${a.doctor?._id}`} className="text-teal-600">
                                        Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}
                                    </Link>
                                </Row>
                                <Row label="Doctor ID" value={a.doctor?.doctorId} />
                            </div>
                        </CardBody>
                    </Card>

                    {/* Appointment Details */}
                    <Card>
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-teal-600" />
                                </div>
                                <h3 className="text-xs font-semibold text-gray-900">Appointment Details</h3>
                            </div>
                            <div className="space-y-2.5">
                                <Row label="Type">
                                    <Badge variant="outline" className="capitalize">{a.type?.replace(/_/g, " ")}</Badge>
                                </Row>
                                <Row label="Date" value={formatDate(a.scheduledDate)} />
                                <Row label="Time" value={`${a.scheduledTime} (${a.duration} min)`} />
                                <Row label="Fee" value={formatCurrency(a.consultationFee)} />
                                <Row label="Payment">
                                    <Badge variant={a.isPaid ? "success" : "default"}>{a.isPaid ? "Paid" : "Pending"}</Badge>
                                </Row>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Chief Complaint */}
                    {a.chiefComplaint && (
                        <Card className="sm:col-span-2">
                            <CardBody>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <h3 className="text-xs font-semibold text-gray-900">Chief Complaint</h3>
                                </div>
                                <p className="text-xs text-gray-600">{a.chiefComplaint}</p>
                            </CardBody>
                        </Card>
                    )}

                    {/* Notes */}
                    {a.notes && (
                        <Card className="sm:col-span-2">
                            <CardBody>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <h3 className="text-xs font-semibold text-gray-900">Notes</h3>
                                </div>
                                <p className="text-xs text-gray-600">{a.notes}</p>
                            </CardBody>
                        </Card>
                    )}

                    {/* Cancellation Reason */}
                    {a.cancellationReason && (
                        <Card className="sm:col-span-2 border-red-200 bg-red-50">
                            <CardBody>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-red-500" />
                                    </div>
                                    <h3 className="text-xs font-semibold text-red-700">Cancellation Reason</h3>
                                </div>
                                <p className="text-xs text-red-600">{a.cancellationReason}</p>
                            </CardBody>
                        </Card>
                    )}

                    {/* Timestamps */}
                    <Card className="sm:col-span-2">
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                </div>
                                <h3 className="text-xs font-semibold text-gray-900">Record Information</h3>
                            </div>
                            <div className="flex gap-6 sm:gap-10">
                                <div>
                                    <p className="text-xs text-gray-400">Created</p>
                                    <p className="text-xs text-gray-700 mt-0.5">{formatDate(a.createdAt)}</p>
                                </div>
                                {a.checkedInAt && (
                                    <div>
                                        <p className="text-xs text-gray-400">Checked In</p>
                                        <p className="text-xs text-gray-700 mt-0.5">{formatDate(a.checkedInAt)}</p>
                                    </div>
                                )}
                                {a.completedAt && (
                                    <div>
                                        <p className="text-xs text-gray-400">Completed</p>
                                        <p className="text-xs text-gray-700 mt-0.5">{formatDate(a.completedAt)}</p>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => { setEditOpen(false); setError(""); }} title="Edit Appointment" size="lg">
                {error && <Alert type="error">{error}</Alert>}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Date" required error={errors.scheduledDate?.message}>
                            <Input type="date" {...register("scheduledDate")} />
                        </FormField>
                        <FormField label="Time" required error={errors.scheduledTime?.message}>
                            <Input type="time" {...register("scheduledTime")} step="1800" />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Duration (mins)">
                            <Input type="number" {...register("duration", { valueAsNumber: true })} />
                        </FormField>
                        <FormField label="Type">
                            <Select {...register("type")}>
                                <option value="opd">OPD</option>
                                <option value="follow_up">Follow Up</option>
                                <option value="emergency">Emergency</option>
                                <option value="teleconsultation">Teleconsultation</option>
                            </Select>
                        </FormField>
                    </div>
                    <FormField label="Status">
                        <Select value={selectedStatus} onChange={handleStatusChange}>
                            <option value="scheduled">Scheduled</option>
                            <option value="checked_in">Checked In</option>
                            <option value="in_consultation">In Consultation</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                        </Select>
                    </FormField>
                    {showCancelReason && (
                        <FormField label="Cancellation Reason" required>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400"
                                placeholder="Reason for cancellation..."
                            />
                        </FormField>
                    )}
                    <FormField label="Chief Complaint">
                        <Input {...register("chiefComplaint")} />
                    </FormField>
                    <FormField label="Notes">
                        <textarea
                            {...register("notes")}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400"
                        />
                    </FormField>
                    <FormField label="Consultation Fee">
                        <Input type="number" {...register("consultationFee", { valueAsNumber: true })} />
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button type="button" variant="secondary" onClick={() => { setEditOpen(false); setError(""); }}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// --- Reusable row component ---
function Row({ label, value, children }: {
    label: string;
    value?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            {children ? (
                <span className="text-xs text-right">{children}</span>
            ) : (
                <span className="text-xs text-gray-700 text-right truncate">{value}</span>
            )}
        </div>
    );
}