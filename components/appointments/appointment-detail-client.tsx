"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ArrowLeft, Calendar, Activity, FileText, DollarSign,
    CheckCircle, XCircle, Edit2,
} from "lucide-react";
import {
    Card, CardBody, StatusBadge, Badge, Button,
    Skeleton, Alert, Modal, FormField, Input, Select,
} from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { updateAppointmentSchema, UpdateAppointmentInput } from "@/lib/validations";
import { useSession } from "next-auth/react";

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

    const watchedStatus = watch("status");

    const updateMutation = useMutation({
        mutationFn: (data: UpdateAppointmentInput) => {
            const updateData: any = { ...data };
            if (data.status !== "cancelled") {
                updateData.cancellationReason = "";
            }
            return axios.put(`/api/appointments/${appointmentId}`, updateData);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
            qc.invalidateQueries({ queryKey: ["appointments"] });
            setEditOpen(false);
            setCancelReason("");
            setShowCancelReason(false);
            setError("");
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed to update"),
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
            setShowCancelReason(false);
            if (a.status == "cancelled") {
                setShowCancelReason(true);
                setCancelReason(a?.cancellationReason)
            }
            setEditOpen(true);
        }
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setValue("status", newStatus);
        setSelectedStatus(newStatus);
        setShowCancelReason(newStatus === "cancelled");
        if (newStatus !== "cancelled") {
            setCancelReason("");
        }
    };

    const onSubmit = (data: UpdateAppointmentInput) => {
        if (data.status === "cancelled" && !cancelReason) {
            setError("Cancellation reason is required");
            return;
        }
        updateMutation.mutate({ ...data, cancellationReason: cancelReason });
    };

    if (isLoading) return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
        </div>
    );

    if (queryError || !data?.data) return (
        <div className="space-y-4">
            <Link href="/appointments">
                <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back to Appointments</Button>
            </Link>
            <Alert type="error">Appointment not found.</Alert>
        </div>
    );

    const a: Appointment = data.data;

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            scheduled: "bg-blue-100 text-blue-700",
            checked_in: "bg-purple-100 text-purple-700",
            in_consultation: "bg-orange-100 text-orange-700",
            completed: "bg-green-100 text-green-700",
            cancelled: "bg-red-100 text-red-700",
            no_show: "bg-gray-100 text-gray-700",
        };
        return colors[status] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/appointments">
                    <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> All Appointments</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={openEditModal}>
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
            </div>

            {/* Status Banner */}
            <div className={`p-4 rounded-lg border ${getStatusColor(a.status)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {a.status === "completed" && <CheckCircle className="w-5 h-5" />}
                        {a.status === "cancelled" && <XCircle className="w-5 h-5" />}
                        <span className="font-semibold">Status: {a.status.replace(/_/g, " ").toUpperCase()}</span>
                    </div>
                    <span className="text-sm">{a.appointmentId}</span>
                </div>
            </div>

            {/* Main Info Card */}
            <Card>
                <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Patient</p>
                                <Link href={`/patients/${a.patient?._id}`}>
                                    <p className="text-lg font-semibold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer">
                                        {a.patient?.firstName} {a.patient?.lastName}
                                    </p>
                                </Link>
                                <p className="text-sm text-slate-500">{a.patient?.patientId}</p>
                                <p className="text-sm text-slate-500">{a.patient?.phone}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Doctor</p>
                                <Link href={`/doctors/${a.doctor?._id}`}>
                                    <p className="text-lg font-semibold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer">
                                        Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}
                                    </p>
                                </Link>
                                <p className="text-sm text-slate-500">{a.doctor?.doctorId}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Date & Time</p>
                                    <p className="text-slate-700">{formatDate(a.scheduledDate)}</p>
                                    <p className="text-sm text-slate-500">{a.scheduledTime} ({a.duration} minutes)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Activity className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Appointment Type</p>
                                    <Badge variant="info" className="capitalize">{a.type?.replace(/_/g, " ")}</Badge>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <DollarSign className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Fee & Payment</p>
                                    <p className="text-slate-700">{formatCurrency(a.consultationFee)}</p>
                                    <p className="text-xs text-slate-500">{a.isPaid ? "Paid" : "Pending"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {a.chiefComplaint && (
                        <div className="border-t pt-4">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-2 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" /> Chief Complaint
                            </p>
                            <p className="text-slate-700">{a.chiefComplaint}</p>
                        </div>
                    )}

                    {a.notes && (
                        <div className="border-t pt-4">
                            <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Notes</p>
                            <p className="text-slate-700">{a.notes}</p>
                        </div>
                    )}

                    {a.cancellationReason && (
                        <div className="border-t border-red-200 pt-4 bg-red-50 -mx-4 px-4">
                            <p className="text-xs text-red-600 uppercase font-semibold mb-2">Cancellation Reason</p>
                            <p className="text-red-700">{a.cancellationReason}</p>
                        </div>
                    )}

                    <div className="border-t pt-4 flex justify-between text-xs text-slate-400">
                        <span>Created: {formatDate(a.createdAt)}</span>
                        {a.checkedInAt && <span>Checked In: {formatDate(a.checkedInAt)}</span>}
                        {a.completedAt && <span>Completed: {formatDate(a.completedAt)}</span>}
                    </div>
                </CardBody>
            </Card>

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Appointment" size="lg">
                {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Date" required error={errors.scheduledDate?.message}>
                            <Input type="date" {...register("scheduledDate")} />
                        </FormField>
                        <FormField label="Time" required error={errors.scheduledTime?.message}>
                            <Input type="time" {...register("scheduledTime")} step="1800" />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Duration (mins)" error={errors.duration?.message}>
                            <Input type="number" {...register("duration", { valueAsNumber: true })} />
                        </FormField>
                        <FormField label="Type" error={errors.type?.message}>
                            <Select {...register("type")}>
                                <option value="opd">OPD</option>
                                <option value="follow_up">Follow Up</option>
                                <option value="emergency">Emergency</option>
                                <option value="teleconsultation">Teleconsultation</option>
                            </Select>
                        </FormField>
                    </div>
                    <FormField label="Status" error={errors.status?.message}>
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
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                                placeholder="Reason for cancellation..."
                            />
                        </FormField>
                    )}
                    <FormField label="Chief Complaint" error={errors.chiefComplaint?.message}>
                        <Input {...register("chiefComplaint")} />
                    </FormField>
                    <FormField label="Notes" error={errors.notes?.message}>
                        <textarea {...register("notes")} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                    </FormField>
                    <FormField label="Consultation Fee" error={errors.consultationFee?.message}>
                        <Input type="number" {...register("consultationFee", { valueAsNumber: true })} />
                    </FormField>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}