// components/opd/emr-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import {
    ArrowLeft, FileText, Edit2, Trash2, Plus, Printer, Download,
    Stethoscope, Heart, Clock, Pill,
} from "lucide-react";
import {
    Card, CardBody, Badge, Button, Skeleton, Alert,
    Modal, FormField, Input, Select, Table, Th, Td,
} from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { generateEMRPrintHtml, EMRPdfTemplate } from "../printTemplates/emr-templates";
import { pdf } from "@react-pdf/renderer";

interface EMRRecord {
    _id: string;
    patient: { _id: string; firstName: string; lastName: string; patientId: string; phone: string; email: string };
    doctor: { _id: string; user: { firstName: string; lastName: string; email: string } };
    appointment?: { _id: string; appointmentId: string; scheduledDate: string; scheduledTime: string; status: string };
    visitDate: string;
    chiefComplaint: string;
    symptoms: string[];
    vitals: {
        temperature?: number; bloodPressureSystolic?: number; bloodPressureDiastolic?: number;
        heartRate?: number; respiratoryRate?: number; oxygenSaturation?: number;
        weight?: number; height?: number; bmi?: number; bloodSugar?: number;
    };
    diagnosis: { icdCode?: string; description: string; type: string }[];
    treatmentPlan?: string;
    notes?: string;
    followUpDate?: string;
    prescriptions: any[];
    createdBy: { firstName: string; lastName: string };
    createdAt: string;
    updatedAt: string;
}

export function EMRDetailClient({ emrId }: { emrId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"emr" | "rx">("emr");
    const [error, setError] = useState("");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const isSA = session?.user.isSuperAdmin;
    const perms = session?.user.permissions || [];
    const canUpdate = isSA || perms.includes("emr:update");
    const canDelete = isSA || perms.includes("emr:delete");

    const { data, isLoading, error: queryError } = useQuery({
        queryKey: ["emr", emrId],
        queryFn: () => axios.get(`/api/emr/${emrId}`).then(r => r.data),
    });

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
        defaultValues: {
            chiefComplaint: "", symptoms: [""], vitals: { temperature: "", bloodPressureSystolic: "", bloodPressureDiastolic: "", heartRate: "", respiratoryRate: "", oxygenSaturation: "", weight: "", height: "", bloodSugar: "" },
            diagnosis: [{ icdCode: "", description: "", type: "primary" }], treatmentPlan: "", notes: "", followUpDate: "",
            prescriptions: [{ medicine: "", strength: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "", quantity: 0 }],
            prescriptionNotes: "", prescriptionType: "new", durationValue: 5, durationUnit: "days", allergies: "",
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
            setEditOpen(false); setError("");
            toast.success("EMR record updated successfully!");
        },
        onError: (e: any) => { const msg = e?.response?.data?.error || "Failed to update"; setError(msg); toast.error(msg); },
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/emr/${emrId}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["emr-records"] }); toast.success("EMR record deleted!"); router.push("/opd"); },
        onError: (e: any) => { const msg = e?.response?.data?.error || "Failed to delete"; setError(msg); toast.error(msg); },
    });

    const openEditModal = () => {
        if (data?.data) {
            const d = data.data;
            let allMedicines: any[] = [];
            d.prescriptions?.forEach((rx: any) => {
                if (rx.medicines?.length > 0) {
                    allMedicines = allMedicines.concat(rx.medicines.map((m: any) => ({
                        medicine: m.medicineName || "", strength: m.strength || "", dosage: m.dosage || "",
                        frequency: m.frequency || "", duration: m.duration || "", route: m.route || "oral",
                        instructions: m.instructions || "", quantity: m.quantity || 0,
                    })));
                }
            });
            reset({
                chiefComplaint: d.chiefComplaint || "", symptoms: d.symptoms?.length ? d.symptoms : [""],
                vitals: { temperature: d.vitals?.temperature || "", bloodPressureSystolic: d.vitals?.bloodPressureSystolic || "", bloodPressureDiastolic: d.vitals?.bloodPressureDiastolic || "", heartRate: d.vitals?.heartRate || "", respiratoryRate: d.vitals?.respiratoryRate || "", oxygenSaturation: d.vitals?.oxygenSaturation || "", weight: d.vitals?.weight || "", height: d.vitals?.height || "", bloodSugar: d.vitals?.bloodSugar || "" },
                diagnosis: d.diagnosis?.length ? d.diagnosis : [{ icdCode: "", description: "", type: "primary" }],
                treatmentPlan: d.treatmentPlan || "", notes: d.notes || "", followUpDate: d.followUpDate?.split("T")[0] || "",
                prescriptions: allMedicines.length > 0 ? allMedicines : [{ medicine: "", strength: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "", quantity: 0 }],
                prescriptionNotes: d.prescriptions?.[0]?.notes || "", prescriptionType: d.prescriptions?.[0]?.type || "new",
                durationValue: d.prescriptions?.[0]?.duration?.value || 5, durationUnit: d.prescriptions?.[0]?.duration?.unit || "days",
                allergies: d.allergies?.join(", ") || "",
            });
            setEditOpen(true);
        }
    };

    const onSubmit = (d: any) => {
        const vitals = Object.fromEntries(Object.entries(d.vitals).map(([k, v]) => [k, v ? parseFloat(v as string) : undefined]).filter(([, v]) => v !== undefined && !isNaN(v as number)));
        const prescriptions = d.prescriptions.filter((p: any) => p.medicine.trim()).map((p: any) => ({ medicine: p.medicine, strength: p.strength || "", dosage: p.dosage, frequency: p.frequency, duration: p.duration || "", route: p.route || "oral", instructions: p.instructions || "", quantity: p.quantity || 0 }));
        updateMutation.mutate({
            patient: record.patient?._id, chiefComplaint: d.chiefComplaint, symptoms: d.symptoms.filter((s: string) => s.trim()), vitals,
            diagnosis: d.diagnosis.filter((diag: any) => diag.description.trim()), treatmentPlan: d.treatmentPlan, notes: d.notes, followUpDate: d.followUpDate,
            prescriptions, prescriptionNotes: d.prescriptionNotes, prescriptionType: d.prescriptionType, durationValue: d.durationValue, durationUnit: d.durationUnit,
            allergies: d.allergies ? d.allergies.split(",").map((a: string) => a.trim()).filter(Boolean) : [],
        });
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) { toast.error("Please allow pop-ups to print."); return; }
        printWindow.document.write(generateEMRPrintHtml(record, "/logo.png"));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
    };

    const handleDownloadPdf = async () => {
        setIsPdfLoading(true);
        try {
            const blob = await pdf(<EMRPdfTemplate record={record} logoUrl="/logo.png" />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `EMR_${record.patient?.firstName}_${record.patient?.lastName}.pdf`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("PDF downloaded!");
        } catch { toast.error("Failed to generate PDF"); }
        finally { setIsPdfLoading(false); }
    };

    if (isLoading) return (
        <div className="space-y-4"><Skeleton className="h-8 w-48 rounded-lg" /><Skeleton className="h-64 w-full rounded-lg" /></div>
    );

    if (queryError || !data?.data) return (
        <div className="space-y-4">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer"><ArrowLeft className="w-4 h-4" /> Back</button>
            <Alert type="error">EMR record not found.</Alert>
        </div>
    );

    const record: EMRRecord = data.data;
    const allMedicines: any[] = [];
    record.prescriptions?.forEach((rx: any) => { rx.medicines?.forEach((m: any) => allMedicines.push(m)); });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <button onClick={() => router.back()} className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0 mt-0.5"><ArrowLeft className="w-4 h-4" /></button>
                    <div className="min-w-0"><h1 className="text-lg font-semibold text-gray-900">{record.patient?.firstName} {record.patient?.lastName}</h1><p className="text-xs text-gray-500 mt-0.5">{record.patient?.patientId} • Visit: {formatDate(record.visitDate)}</p></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="secondary" size="sm" onClick={handlePrint}><Printer className="w-3.5 h-3.5" /> Print</Button>
                    <Button variant="secondary" size="sm" onClick={handleDownloadPdf} loading={isPdfLoading}><Download className="w-3.5 h-3.5" /> PDF</Button>
                    {canUpdate && <Button variant="secondary" size="sm" onClick={openEditModal}><Edit2 className="w-3.5 h-3.5" /> Edit</Button>}
                    {canDelete && <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card><CardBody><div className="space-y-2.5"><Row label="Patient"><Link href={`/patients/${record.patient?._id}`} className="text-teal-600 font-medium">{record.patient?.firstName} {record.patient?.lastName}</Link></Row><Row label="Patient ID" value={record.patient?.patientId} /><Row label="Phone" value={record.patient?.phone} /><Row label="Doctor">Dr. {record.doctor?.user?.firstName} {record.doctor?.user?.lastName}</Row><Row label="Visit Date" value={formatDate(record.visitDate)} />{record.followUpDate && <Row label="Follow-up" value={formatDate(record.followUpDate)} />}</div></CardBody></Card>
                <Card><CardBody><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><FileText className="w-4 h-4 text-teal-600" /></div><h3 className="text-xs font-semibold text-gray-900">Chief Complaint</h3></div><p className="text-xs text-gray-600 mb-3">{record.chiefComplaint}</p>{record.symptoms?.length > 0 && <div><p className="text-xs text-gray-400 mb-1.5">Symptoms</p><div className="flex flex-wrap gap-1">{record.symptoms.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}</div></div>}</CardBody></Card>
                {Object.values(record.vitals || {}).some(v => v) && (<Card className="sm:col-span-2"><CardBody><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Heart className="w-4 h-4 text-red-500" /></div><h3 className="text-xs font-semibold text-gray-900">Vitals</h3></div><div className="grid grid-cols-3 sm:grid-cols-5 gap-3">{record.vitals?.temperature && <Vital label="Temperature" value={`${record.vitals.temperature} °C`} />}{(record.vitals?.bloodPressureSystolic || record.vitals?.bloodPressureDiastolic) && <Vital label="Blood Pressure" value={`${record.vitals.bloodPressureSystolic}/${record.vitals.bloodPressureDiastolic} mmHg`} />}{record.vitals?.heartRate && <Vital label="Heart Rate" value={`${record.vitals.heartRate} bpm`} />}{record.vitals?.respiratoryRate && <Vital label="Resp Rate" value={`${record.vitals.respiratoryRate} /min`} />}{record.vitals?.oxygenSaturation && <Vital label="O2 Sat" value={`${record.vitals.oxygenSaturation}%`} />}{record.vitals?.weight && <Vital label="Weight" value={`${record.vitals.weight} kg`} />}{record.vitals?.height && <Vital label="Height" value={`${record.vitals.height} cm`} />}{record.vitals?.bloodSugar && <Vital label="Blood Sugar" value={`${record.vitals.bloodSugar} mg/dL`} />}</div></CardBody></Card>)}
                {record.diagnosis?.length > 0 && (<Card className="sm:col-span-2"><CardBody><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><Stethoscope className="w-4 h-4 text-teal-600" /></div><h3 className="text-xs font-semibold text-gray-900">Diagnosis</h3></div><div className="space-y-1.5">{record.diagnosis.map((d, i) => <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"><Badge variant={d.type === "primary" ? "info" : "outline"}>{d.type}</Badge><span className="text-xs text-gray-700">{d.description}</span>{d.icdCode && <span className="text-xs text-gray-400">ICD: {d.icdCode}</span>}</div>)}</div></CardBody></Card>)}
                {record.treatmentPlan && (<Card className="sm:col-span-2"><CardBody><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FileText className="w-4 h-4 text-gray-400" /></div><h3 className="text-xs font-semibold text-gray-900">Treatment Plan</h3></div><p className="text-xs text-gray-600 whitespace-pre-wrap">{record.treatmentPlan}</p></CardBody></Card>)}
                {allMedicines.length > 0 && (<Card className="sm:col-span-2"><CardBody><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><Pill className="w-4 h-4 text-teal-600" /></div><h3 className="text-xs font-semibold text-gray-900">Prescriptions</h3></div><div className="overflow-x-auto"><Table><thead><tr><Th>Medicine</Th><Th>Strength</Th><Th>Dosage</Th><Th>Frequency</Th><Th>Duration</Th><Th>Route</Th><Th>Qty</Th><Th>Instructions</Th></tr></thead><tbody>{allMedicines.map((m: any, i: number) => <tr key={i}><Td className="font-medium text-gray-900">{m.medicineName || "—"}</Td><Td>{m.strength || "—"}</Td><Td>{m.dosage || "—"}</Td><Td>{m.frequency || "—"}</Td><Td>{m.duration || "—"}</Td><Td className="capitalize">{m.route || "—"}</Td><Td>{m.quantity || "—"}</Td><Td className="max-w-[150px] ">{m.instructions || "—"}</Td></tr>)}</tbody></Table></div></CardBody></Card>)}
                {record.notes && (<Card className="sm:col-span-2"><CardBody><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FileText className="w-4 h-4 text-gray-400" /></div><h3 className="text-xs font-semibold text-gray-900">Notes</h3></div><p className="text-xs text-gray-600 whitespace-pre-wrap">{record.notes}</p></CardBody></Card>)}
                <Card className="sm:col-span-2"><CardBody><div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Clock className="w-4 h-4 text-gray-400" /></div><h3 className="text-xs font-semibold text-gray-900">Record Information</h3></div><div className="flex gap-6 sm:gap-10"><div><p className="text-xs text-gray-400">Created</p><p className="text-xs text-gray-700 mt-0.5">{formatDate(record.createdAt)}</p></div><div><p className="text-xs text-gray-400">Last Updated</p><p className="text-xs text-gray-700 mt-0.5">{formatDate(record.updatedAt)}</p></div></div></CardBody></Card>
            </div>

            <Modal open={editOpen} onClose={() => { setEditOpen(false); setError(""); }} title="Edit EMR Record" size="xl">
                {error && <Alert type="error">{error}</Alert>}
                <div className="flex gap-2 border-b border-gray-200 mb-4">
                    {(["emr", "rx"] as const).map(t => <button key={t} type="button" onClick={() => setActiveTab(t)} className={cn("px-3 py-2 text-xs font-medium border-b-2 cursor-pointer", activeTab === t ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500")}>{t === "emr" ? "Visit Details" : "Prescriptions"}</button>)}
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {activeTab === "emr" && (<>
                        <FormField label="Chief Complaint" required error={errors.chiefComplaint?.message}><Input {...register("chiefComplaint", { required: true })} /></FormField>
                        <div><div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-gray-600">Symptoms</p><Button type="button" size="sm" variant="secondary" onClick={() => symptomFields.append("" as any)}><Plus className="w-3.5 h-3.5" /> Add</Button></div><div className="space-y-2">{symptomFields.fields.map((field, i) => <div key={field.id} className="flex gap-2"><Input {...register(`symptoms.${i}`)} placeholder="Symptom" className="flex-1" />{symptomFields.fields.length > 1 && <button type="button" onClick={() => symptomFields.remove(i)} className="p-2 text-red-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>}</div>)}</div></div>
                        <FormField label="Allergies (comma-separated)"><Input {...register("allergies")} placeholder="e.g. Penicillin, Nuts" /></FormField>
                        <div><p className="text-xs font-medium text-gray-600 mb-2">Vitals</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3"><FormField label="Temp (°C)"><Input type="number" step="0.1" {...register("vitals.temperature")} placeholder="37.0" /></FormField><FormField label="BP Systolic"><Input type="number" {...register("vitals.bloodPressureSystolic")} placeholder="120" /></FormField><FormField label="BP Diastolic"><Input type="number" {...register("vitals.bloodPressureDiastolic")} placeholder="80" /></FormField><FormField label="Heart Rate"><Input type="number" {...register("vitals.heartRate")} placeholder="72" /></FormField><FormField label="Resp Rate"><Input type="number" {...register("vitals.respiratoryRate")} placeholder="16" /></FormField><FormField label="O2 Sat (%)"><Input type="number" {...register("vitals.oxygenSaturation")} placeholder="98" /></FormField><FormField label="Weight (kg)"><Input type="number" step="0.1" {...register("vitals.weight")} placeholder="70" /></FormField><FormField label="Height (cm)"><Input type="number" step="0.1" {...register("vitals.height")} placeholder="170" /></FormField><FormField label="Blood Sugar"><Input type="number" {...register("vitals.bloodSugar")} placeholder="100" /></FormField></div></div>
                        <div><div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-gray-600">Diagnosis</p><Button type="button" size="sm" variant="secondary" onClick={() => diagFields.append({ icdCode: "", description: "", type: "primary" })}><Plus className="w-3.5 h-3.5" /> Add</Button></div><div className="space-y-2">{diagFields.fields.map((field, i) => <div key={field.id} className="flex gap-2"><Input {...register(`diagnosis.${i}.description`)} placeholder="Description" className="flex-1" /><Input {...register(`diagnosis.${i}.icdCode`)} placeholder="ICD" className="w-20" /><Select {...register(`diagnosis.${i}.type`)} className="w-28"><option value="primary">Primary</option><option value="secondary">Secondary</option></Select>{diagFields.fields.length > 1 && <button type="button" onClick={() => diagFields.remove(i)} className="p-2 text-red-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>}</div>)}</div></div>
                        <FormField label="Treatment Plan"><textarea {...register("treatmentPlan")} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400" /></FormField>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><FormField label="Follow-up Date"><Input type="date" {...register("followUpDate")} /></FormField><FormField label="Notes"><Input {...register("notes")} /></FormField></div>
                    </>)}
                    {activeTab === "rx" && (<div className="space-y-4">
                        <div className="flex items-center justify-between"><p className="text-xs font-medium text-gray-600">Prescriptions</p><Button type="button" size="sm" variant="secondary" onClick={() => rxFields.append({ medicine: "", strength: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "", quantity: 0 })}><Plus className="w-3.5 h-3.5" /> Add Medicine</Button></div>
                        {rxFields.fields.map((field, i) => <div key={field.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><FormField label="Medicine" required><Input {...register(`prescriptions.${i}.medicine`)} /></FormField><FormField label="Strength"><Input {...register(`prescriptions.${i}.strength`)} /></FormField><FormField label="Dosage" required><Input {...register(`prescriptions.${i}.dosage`)} /></FormField></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><FormField label="Frequency" required><Input {...register(`prescriptions.${i}.frequency`)} /></FormField><FormField label="Duration"><Input {...register(`prescriptions.${i}.duration`)} /></FormField><FormField label="Route"><Select {...register(`prescriptions.${i}.route`)}><option value="oral">Oral</option><option value="iv">IV</option><option value="im">IM</option><option value="topical">Topical</option><option value="inhalation">Inhalation</option><option value="sublingual">Sublingual</option><option value="rectal">Rectal</option></Select></FormField></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><FormField label="Quantity"><Input type="number" {...register(`prescriptions.${i}.quantity`, { valueAsNumber: true })} /></FormField><FormField label="Instructions"><Input {...register(`prescriptions.${i}.instructions`)} /></FormField></div><div className="flex justify-end"><button type="button" onClick={() => rxFields.remove(i)} className="text-xs text-gray-400 cursor-pointer">Remove</button></div></div>)}
                        {rxFields.fields.length === 0 && <Alert type="info">No prescriptions added.</Alert>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"><FormField label="Prescription Type"><Select {...register("prescriptionType")}><option value="new">New</option><option value="refill">Refill</option><option value="renewal">Renewal</option></Select></FormField><FormField label="Duration"><div className="flex gap-2"><Input type="number" {...register("durationValue", { valueAsNumber: true })} className="w-20" /><Select {...register("durationUnit")}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></Select></div></FormField></div>
                        <FormField label="Prescription Notes"><Input {...register("prescriptionNotes")} /></FormField>
                    </div>)}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" loading={updateMutation.isPending}>Save Changes</Button></div>
                </form>
            </Modal>

            <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete EMR Record" size="sm">
                <div className="space-y-4 mt-2"><div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200"><Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /><div><p className="text-xs font-semibold text-red-800">Delete permanently?</p><p className="text-xs text-red-600 mt-0.5">This action cannot be undone.</p></div></div><div className="flex justify-end gap-2 pt-2 border-t border-gray-300"><Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button><Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>Delete Permanently</Button></div></div>
            </Modal>
        </div>
    );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
    return <div className="flex items-center justify-between gap-3"><span className="text-xs text-gray-400 shrink-0">{label}</span>{children ? <span className="text-xs text-right">{children}</span> : <span className="text-xs text-gray-700 text-right">{value}</span>}</div>;
}

function Vital({ label, value }: { label: string; value: string }) {
    return <div><p className="text-xs text-gray-400">{label}</p><p className="text-xs font-medium text-gray-700">{value}</p></div>;
}