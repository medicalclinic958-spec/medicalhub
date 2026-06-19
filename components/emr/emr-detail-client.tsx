"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import {
    ArrowLeft, User, Calendar, Stethoscope, Heart, Activity,
    Weight, Ruler, Droplet, Thermometer, Edit2, Trash2, Plus,
    FileText, AlertCircle, Clock,
    Printer,
} from "lucide-react";
import {
    Card, CardHeader, CardBody, Badge, Button, Skeleton, Alert,
    Modal, FormField, Input, Select, Table, Th, Td,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface EMRRecord {
    _id: string;
    patient: { _id: string; firstName: string; lastName: string; patientId: string; phone: string; email: string };
    doctor: { _id: string; user: { firstName: string; lastName: string; email: string } };
    appointment?: { _id: string; appointmentId: string; scheduledDate: string; scheduledTime: string; status: string };
    visitDate: string;
    chiefComplaint: string;
    symptoms: string[];
    vitals: {
        temperature?: number;
        bloodPressureSystolic?: number;
        bloodPressureDiastolic?: number;
        heartRate?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
        weight?: number;
        height?: number;
        bmi?: number;
        bloodSugar?: number;
    };
    diagnosis: { icdCode?: string; description: string; type: string }[];
    treatmentPlan?: string;
    notes?: string;
    followUpDate?: string;
    prescriptions: any[];
    createdBy: { firstName: string; lastName: string; email: string };
    createdAt: string;
    updatedAt: string;
}
// Add at top of component, right after useState declarations
const printStyles = `
  @media print {
    body * {
      visibility: hidden !important;
    }
    #emr-print-area,
    #emr-print-area * {
      visibility: visible !important;
    }
    #emr-print-area {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      padding: 20px !important;
    }
    .no-print {
      display: none !important;
    }
    #emr-print-area * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

export function EMRDetailClient({ emrId }: { emrId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"emr" | "rx">("emr");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isSA = session?.user.isSuperAdmin;
    const perms = session?.user.permissions || [];
    const canUpdate = isSA || perms.includes("emr:update");
    const canDelete = isSA || perms.includes("emr:delete");

    const { data, isLoading, error: queryError } = useQuery({
        queryKey: ["emr", emrId],
        queryFn: () => axios.get(`/api/emr/${emrId}`).then(r => r.data),
        enabled: !!emrId,
    });

    const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm({
        defaultValues: {
            chiefComplaint: "",
            symptoms: [""],
            vitals: {
                temperature: "",
                bloodPressureSystolic: "",
                bloodPressureDiastolic: "",
                heartRate: "",
                respiratoryRate: "",
                oxygenSaturation: "",
                weight: "",
                height: "",
                bloodSugar: "",
            },
            diagnosis: [{ icdCode: "", description: "", type: "primary" }],
            treatmentPlan: "",
            notes: "",
            followUpDate: "",
            prescriptions: [{
                medicine: "",
                strength: "",
                dosage: "",
                frequency: "",
                duration: "",
                route: "oral",
                instructions: "",
                quantity: 0
            }],
            prescriptionNotes: "",
            prescriptionType: "new",
            durationValue: 5,
            durationUnit: "days",
            allergies: "",
        },
    });

    const diagFields = useFieldArray({ control, name: "diagnosis" });
    const symptomFields = useFieldArray({ control, name: "symptoms" });
    const rxFields = useFieldArray({ control, name: "prescriptions" });

    const updateMutation = useMutation({
        mutationFn: (data: any) => axios.put(`/api/emr/${emrId}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["emr", emrId] });
            qc.invalidateQueries({ queryKey: ["emr-records"] });
            setEditOpen(false);
            setError("");
            setSuccess("EMR record updated successfully");
            setTimeout(() => setSuccess(""), 3000);
        },
        onError: (e: any) => {
            console.error("Update error:", e.response?.data);
            setError(e?.response?.data?.error || "Failed to update");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/emr/${emrId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["emr-records"] });
            router.push("/opd");
        },
        onError: (e: any) => setError(e?.response?.data?.error || "Failed to delete"),
    });

    const openEditModal = () => {
        if (data?.data) {
            const d = data.data;

            // Extract all medicines from all prescriptions
            let allMedicines: any[] = [];
            if (d.prescriptions?.length > 0) {
                d.prescriptions.forEach((rx: any) => {
                    if (rx.medicines?.length > 0) {
                        allMedicines = allMedicines.concat(
                            rx.medicines.map((m: any) => ({
                                medicine: m.medicineName || "",
                                strength: m.strength || "",
                                dosage: m.dosage || "",
                                frequency: m.frequency || "",
                                duration: m.duration || "",
                                route: m.route || "oral",
                                instructions: m.instructions || "",
                                quantity: m.quantity || 0,
                            }))
                        );
                    }
                });
            }

            reset({
                chiefComplaint: d.chiefComplaint || "",
                symptoms: d.symptoms?.length ? d.symptoms : [""],
                vitals: {
                    temperature: d.vitals?.temperature || "",
                    bloodPressureSystolic: d.vitals?.bloodPressureSystolic || "",
                    bloodPressureDiastolic: d.vitals?.bloodPressureDiastolic || "",
                    heartRate: d.vitals?.heartRate || "",
                    respiratoryRate: d.vitals?.respiratoryRate || "",
                    oxygenSaturation: d.vitals?.oxygenSaturation || "",
                    weight: d.vitals?.weight || "",
                    height: d.vitals?.height || "",
                    bloodSugar: d.vitals?.bloodSugar || "",
                },
                diagnosis: d.diagnosis?.length ? d.diagnosis : [{ icdCode: "", description: "", type: "primary" }],
                treatmentPlan: d.treatmentPlan || "",
                notes: d.notes || "",
                followUpDate: d.followUpDate?.split("T")[0] || "",
                // Now all medicines are shown
                prescriptions: allMedicines.length > 0 ? allMedicines : [{ medicine: "", strength: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "", quantity: 0 }],
                prescriptionNotes: d.prescriptions?.[0]?.notes || "",
                prescriptionType: d.prescriptions?.[0]?.type || "new",
                durationValue: d.prescriptions?.[0]?.duration?.value || 5,
                durationUnit: d.prescriptions?.[0]?.duration?.unit || "days",
                allergies: d.allergies?.join(", ") || "",
            });
            setEditOpen(true);
        }
    };

    const onSubmit = (d: any) => {
        const vitals = Object.fromEntries(
            Object.entries(d.vitals)
                .map(([k, v]) => [k, v ? parseFloat(v as string) : undefined])
                .filter(([, v]) => v !== undefined && !isNaN(v as number))
        );

        const prescriptions = d.prescriptions
            .filter((p: any) => p.medicine.trim())
            .map((p: any) => ({
                medicine: p.medicine,
                strength: p.strength || "",
                dosage: p.dosage,
                frequency: p.frequency,
                duration: p.duration || "",
                route: p.route || "oral",
                instructions: p.instructions || "",
                quantity: p.quantity || 0,
            }));

        updateMutation.mutate({
            patient: record.patient?._id,
            chiefComplaint: d.chiefComplaint,
            symptoms: d.symptoms.filter((s: string) => s.trim()),
            vitals: vitals,
            diagnosis: d.diagnosis.filter((diag: any) => diag.description.trim()),
            treatmentPlan: d.treatmentPlan,
            notes: d.notes,
            followUpDate: d.followUpDate,
            prescriptions: prescriptions,
            prescriptionNotes: d.prescriptionNotes,
            prescriptionType: d.prescriptionType,
            durationValue: d.durationValue,
            durationUnit: d.durationUnit,
            allergies: d.allergies ? d.allergies.split(",").map((a: string) => a.trim()).filter(Boolean) : [],
        });
    };

    if (isLoading) return (
        <div className="space-y-4 max-w-4xl mx-auto">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
        </div>
    );

    if (queryError || !data?.data) return (
        <div className="max-w-4xl mx-auto">
            <Link href="/opd"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back to EMR</Button></Link>
            <Alert type="error">EMR record not found.</Alert>
        </div>
    );

    const record: EMRRecord = data.data;

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            <style>{printStyles}</style>
            {/* Header */}
            <div className="flex items-center justify-between no-print">
                <Link href="/opd">
                    <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> All Records</Button>
                </Link>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="w-3.5 h-3.5" /> Print
                    </Button>
                    {canUpdate && (
                        <Button variant="outline" size="sm" onClick={openEditModal}>
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => {
                                if (confirm("Are you sure you want to delete this EMR record?")) {
                                    deleteMutation.mutate();
                                }
                            }}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                    )}
                </div>
            </div>

            {success && <Alert type="success">{success}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            {/* Patient & Doctor Info */}
            <div id="emr-print-area">
                <Card>
                    <CardBody>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Patient</p>
                                <Link href={`/patients/${record.patient?._id}`}>
                                    <p className="text-lg font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                                        {record.patient?.firstName} {record.patient?.lastName}
                                    </p>
                                </Link>
                                <p className="text-sm text-slate-500">{record.patient?.patientId}</p>
                                <p className="text-sm text-slate-500">{record.patient?.phone}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Doctor</p>
                                <Link href={`/doctors/${record.doctor?._id}`}>
                                    <p className="text-lg font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                                        Dr. {record.doctor?.user?.firstName} {record.doctor?.user?.lastName}
                                    </p>
                                </Link>
                                <p className="text-sm text-slate-500">{record.doctor?.user?.email}</p>
                            </div>
                        </div>
                        <div className="border-t mt-4 pt-4 flex justify-between text-xs text-slate-400">
                            <span>Visit: {formatDate(record.visitDate)}</span>
                            {record.followUpDate && <span>Follow-up: {formatDate(record.followUpDate)}</span>}
                            <span>Created: {formatDate(record.createdAt)}</span>
                        </div>
                    </CardBody>
                </Card>

                {/* Chief Complaint & Symptoms */}
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" /> Chief Complaint
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <p className="text-slate-700">{record.chiefComplaint}</p>
                        {record.symptoms?.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Symptoms</p>
                                <div className="flex flex-wrap gap-1">
                                    {record.symptoms.map((s, i) => (
                                        <Badge key={i} variant="outline">{s}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Vitals */}
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-500" /> Vitals
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            {record.vitals?.temperature && (
                                <div>
                                    <p className="text-xs text-slate-400">Temperature</p>
                                    <p className="font-medium text-slate-700">{record.vitals.temperature} °C</p>
                                </div>
                            )}
                            {(record.vitals?.bloodPressureSystolic || record.vitals?.bloodPressureDiastolic) && (
                                <div>
                                    <p className="text-xs text-slate-400">Blood Pressure</p>
                                    <p className="font-medium text-slate-700">
                                        {record.vitals.bloodPressureSystolic}/{record.vitals.bloodPressureDiastolic} mmHg
                                    </p>
                                </div>
                            )}
                            {record.vitals?.heartRate && (
                                <div>
                                    <p className="text-xs text-slate-400">Heart Rate</p>
                                    <p className="font-medium text-slate-700">{record.vitals.heartRate} bpm</p>
                                </div>
                            )}
                            {record.vitals?.respiratoryRate && (
                                <div>
                                    <p className="text-xs text-slate-400">Respiratory Rate</p>
                                    <p className="font-medium text-slate-700">{record.vitals.respiratoryRate} /min</p>
                                </div>
                            )}
                            {record.vitals?.oxygenSaturation && (
                                <div>
                                    <p className="text-xs text-slate-400">O2 Saturation</p>
                                    <p className="font-medium text-slate-700">{record.vitals.oxygenSaturation}%</p>
                                </div>
                            )}
                            {record.vitals?.weight && (
                                <div>
                                    <p className="text-xs text-slate-400">Weight</p>
                                    <p className="font-medium text-slate-700">{record.vitals.weight} kg</p>
                                </div>
                            )}
                            {record.vitals?.height && (
                                <div>
                                    <p className="text-xs text-slate-400">Height</p>
                                    <p className="font-medium text-slate-700">{record.vitals.height} cm</p>
                                </div>
                            )}
                            {record.vitals?.bmi && (
                                <div>
                                    <p className="text-xs text-slate-400">BMI</p>
                                    <p className="font-medium text-slate-700">{record.vitals.bmi}</p>
                                </div>
                            )}
                            {record.vitals?.bloodSugar && (
                                <div>
                                    <p className="text-xs text-slate-400">Blood Sugar</p>
                                    <p className="font-medium text-slate-700">{record.vitals.bloodSugar} mg/dL</p>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Diagnosis */}
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-blue-500" /> Diagnosis
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-2">
                            {record.diagnosis?.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                    <Badge variant={d.type === "primary" ? "info" : "outline"}>
                                        {d.type}
                                    </Badge>
                                    <span className="text-slate-700">{d.description}</span>
                                    {d.icdCode && <span className="text-xs text-slate-400">ICD: {d.icdCode}</span>}
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {/* Treatment Plan */}
                {record.treatmentPlan && (
                    <Card>
                        <CardHeader>
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-green-500" /> Treatment Plan
                            </h3>
                        </CardHeader>
                        <CardBody>
                            <p className="text-slate-700 whitespace-pre-wrap">{record.treatmentPlan}</p>
                        </CardBody>
                    </Card>
                )}

                {/* Prescriptions */}
                {record.prescriptions?.length > 0 && (
                    <Card>
                        <CardHeader>
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <Droplet className="w-4 h-4 text-purple-500" /> Prescriptions ({record.prescriptions.length})
                            </h3>
                        </CardHeader>
                        <CardBody>
                            {record.prescriptions.map((rx: any, idx: number) => (
                                <div key={idx} className="border-b last:border-b-0 pb-3 mb-3 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {rx.medicines?.map((m: any) => m.medicineName).join(", ")}
                                            </p>
                                            <div className="text-sm text-slate-500">
                                                {rx.medicines?.map((m: any) => (
                                                    <div key={m._id}>
                                                        {m.dosage} - {m.frequency} for {m.duration}
                                                        {m.route && ` (${m.route})`}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Badge variant={rx.status === "active" ? "success" : "default"}>
                                            {rx.status}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Valid until: {formatDate(rx.validUntil)}
                                    </div>
                                </div>
                            ))}
                        </CardBody>
                    </Card>
                )}

                {/* Notes */}
                {record.notes && (
                    <Card>
                        <CardHeader>
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-slate-500" /> Notes
                            </h3>
                        </CardHeader>
                        <CardBody>
                            <p className="text-slate-700 whitespace-pre-wrap">{record.notes}</p>
                        </CardBody>
                    </Card>
                )}

                {/* Appointment Info */}
                {record.appointment && (
                    <Card>
                        <CardHeader>
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" /> Appointment
                            </h3>
                        </CardHeader>
                        <CardBody>
                            <Link href={`/appointments/${record.appointment._id}`}>
                                <p className="text-slate-700 hover:text-blue-600">
                                    {record.appointment.appointmentId} - {formatDate(record.appointment.scheduledDate)} at {record.appointment.scheduledTime}
                                    <Badge variant="outline" className="ml-2">{record.appointment.status}</Badge>
                                </p>
                            </Link>
                        </CardBody>
                    </Card>
                )}

                {/* Created By */}
                <div className="text-xs text-slate-400 text-right no-print">
                    Created by: {record.createdBy?.firstName} {record.createdBy?.lastName}
                </div>
            </div>

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit EMR Record" size="xl">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Sub-tabs */}
                    <div className="flex gap-1 border-b border-slate-100 mb-4">
                        {(["emr", "rx"] as const).map(t => (
                            <button key={t} type="button" onClick={() => setActiveTab(t)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-all ${activeTab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                                {t === "emr" ? "Visit Details" : "Prescriptions"}
                            </button>
                        ))}
                    </div>

                    {activeTab === "emr" && (
                        <>
                            <FormField label="Chief Complaint" required error={errors.chiefComplaint?.message}>
                                <Input {...register("chiefComplaint", { required: "Chief complaint is required" })} />
                            </FormField>

                            {/* Symptoms */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-slate-700">Symptoms</p>
                                    <Button type="button" size="sm" variant="outline" onClick={() => symptomFields.append("" as any)}>
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {symptomFields.fields.map((field, i) => (
                                        <div key={field.id} className="flex gap-2">
                                            <Input {...register(`symptoms.${i}`)} placeholder="Symptom" className="flex-1" />
                                            {symptomFields.fields.length > 1 && (
                                                <button type="button" onClick={() => symptomFields.remove(i)} className="p-2 text-red-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Allergies */}
                            <FormField label="Allergies (comma-separated)">
                                <Input {...register("allergies")} placeholder="e.g. Penicillin, Nuts" />
                            </FormField>

                            {/* Vitals */}
                            <div>
                                <p className="text-sm font-medium text-slate-700 mb-2">Vitals</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <FormField label="Temp (°C)">
                                        <Input type="number" step="0.1" {...register("vitals.temperature")} placeholder="37.0" />
                                    </FormField>
                                    <FormField label="BP Systolic">
                                        <Input type="number" {...register("vitals.bloodPressureSystolic")} placeholder="120" />
                                    </FormField>
                                    <FormField label="BP Diastolic">
                                        <Input type="number" {...register("vitals.bloodPressureDiastolic")} placeholder="80" />
                                    </FormField>
                                    <FormField label="Heart Rate">
                                        <Input type="number" {...register("vitals.heartRate")} placeholder="72" />
                                    </FormField>
                                    <FormField label="Resp Rate">
                                        <Input type="number" {...register("vitals.respiratoryRate")} placeholder="16" />
                                    </FormField>
                                    <FormField label="O2 Sat (%)">
                                        <Input type="number" {...register("vitals.oxygenSaturation")} placeholder="98" />
                                    </FormField>
                                    <FormField label="Weight (kg)">
                                        <Input type="number" step="0.1" {...register("vitals.weight")} placeholder="70" />
                                    </FormField>
                                    <FormField label="Height (cm)">
                                        <Input type="number" step="0.1" {...register("vitals.height")} placeholder="170" />
                                    </FormField>
                                    <FormField label="Blood Sugar">
                                        <Input type="number" {...register("vitals.bloodSugar")} placeholder="100" />
                                    </FormField>
                                </div>
                            </div>

                            {/* Diagnosis */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-slate-700">Diagnosis</p>
                                    <Button type="button" size="sm" variant="outline" onClick={() => diagFields.append({ icdCode: "", description: "", type: "primary" })}>
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {diagFields.fields.map((field, i) => (
                                        <div key={field.id} className="flex gap-2">
                                            <Input {...register(`diagnosis.${i}.description`)} placeholder="Description" className="flex-1" />
                                            <Input {...register(`diagnosis.${i}.icdCode`)} placeholder="ICD code" className="w-24" />
                                            <Select {...register(`diagnosis.${i}.type`)} className="w-28">
                                                <option value="primary">Primary</option>
                                                <option value="secondary">Secondary</option>
                                            </Select>
                                            {diagFields.fields.length > 1 && (
                                                <button type="button" onClick={() => diagFields.remove(i)} className="p-2 text-red-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <FormField label="Treatment Plan">
                                <textarea {...register("treatmentPlan")} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Follow-up Date">
                                    <Input type="date" {...register("followUpDate")} />
                                </FormField>
                                <FormField label="Notes">
                                    <Input {...register("notes")} />
                                </FormField>
                            </div>
                        </>
                    )}

                    {activeTab === "rx" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-700">Prescriptions</p>
                                <Button type="button" size="sm" variant="outline" onClick={() => rxFields.append({
                                    medicine: "", strength: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "", quantity: 0
                                })}>
                                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                                </Button>
                            </div>

                            {rxFields.fields.map((field, i) => (
                                <div key={field.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                                    <div className="grid grid-cols-3 gap-2">
                                        <FormField label="Medicine" required>
                                            <Input {...register(`prescriptions.${i}.medicine`)} placeholder="Medicine name" />
                                        </FormField>
                                        <FormField label="Strength">
                                            <Input {...register(`prescriptions.${i}.strength`)} placeholder="e.g., 500mg" />
                                        </FormField>
                                        <FormField label="Dosage" required>
                                            <Input {...register(`prescriptions.${i}.dosage`)} placeholder="e.g., 1 tablet" />
                                        </FormField>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <FormField label="Frequency" required>
                                            <Input {...register(`prescriptions.${i}.frequency`)} placeholder="e.g., Twice daily" />
                                        </FormField>
                                        <FormField label="Duration">
                                            <Input {...register(`prescriptions.${i}.duration`)} placeholder="e.g., 5 days" />
                                        </FormField>
                                        <FormField label="Route">
                                            <Select {...register(`prescriptions.${i}.route`)}>
                                                <option value="oral">Oral</option>
                                                <option value="iv">IV</option>
                                                <option value="im">IM</option>
                                                <option value="topical">Topical</option>
                                                <option value="inhalation">Inhalation</option>
                                                <option value="sublingual">Sublingual</option>
                                                <option value="rectal">Rectal</option>
                                            </Select>
                                        </FormField>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField label="Quantity">
                                            <Input type="number" {...register(`prescriptions.${i}.quantity`, { valueAsNumber: true })} placeholder="Total quantity" />
                                        </FormField>
                                        <FormField label="Instructions">
                                            <Input {...register(`prescriptions.${i}.instructions`)} placeholder="Special instructions..." />
                                        </FormField>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => rxFields.remove(i)} className="text-red-400 hover:text-red-600 text-sm">
                                            Remove Medicine
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {rxFields.fields.length === 0 && (
                                <Alert type="info">No prescriptions added. Click "Add Medicine" to prescribe.</Alert>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <FormField label="Prescription Type">
                                    <Select {...register("prescriptionType")}>
                                        <option value="new">New</option>
                                        <option value="refill">Refill</option>
                                        <option value="renewal">Renewal</option>
                                    </Select>
                                </FormField>
                                <FormField label="Duration">
                                    <div className="flex gap-2">
                                        <Input type="number" {...register("durationValue", { valueAsNumber: true })} className="w-20" placeholder="5" />
                                        <Select {...register("durationUnit")}>
                                            <option value="days">Days</option>
                                            <option value="weeks">Weeks</option>
                                            <option value="months">Months</option>
                                        </Select>
                                    </div>
                                </FormField>
                            </div>

                            <FormField label="Prescription Notes">
                                <Input {...register("prescriptionNotes")} placeholder="Additional notes for pharmacy..." />
                            </FormField>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}