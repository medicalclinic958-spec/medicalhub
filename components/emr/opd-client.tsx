"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import axios from "axios";
import { Plus, Clipboard, Trash2, Search, Eye } from "lucide-react";
import {
  Card, CardHeader, CardBody, Table, Th, Td, Button, Modal,
  FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface EMRRecord {
  _id: string;
  patient: { firstName: string; lastName: string; patientId: string };
  doctor: { user: { firstName: string; lastName: string } };
  visitDate: string;
  chiefComplaint: string;
  diagnosis: { description: string; type: string }[];
  followUpDate?: string;
}

const VITALS_KEYS = [
  { key: "temperature", label: "Temp (°C)", placeholder: "37.0" },
  { key: "bloodPressureSystolic", label: "BP Systolic", placeholder: "120" },
  { key: "bloodPressureDiastolic", label: "BP Diastolic", placeholder: "80" },
  { key: "heartRate", label: "Heart Rate", placeholder: "72" },
  { key: "respiratoryRate", label: "Resp Rate", placeholder: "16" },
  { key: "weight", label: "Weight (kg)", placeholder: "70" },
  { key: "height", label: "Height (cm)", placeholder: "170" },
  { key: "oxygenSaturation", label: "O2 Sat (%)", placeholder: "98" },
  { key: "bloodSugar", label: "Blood Sugar", placeholder: "100" },
];

export function OPDClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [activeTab, setActiveTab] = useState<"emr" | "rx">("emr");
  const [search, setSearch] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState("");

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("emr:create");

  const { data, isLoading } = useQuery({
    queryKey: ["emr-records", page],
    queryFn: () => axios.get("/api/emr", { params: { page, limit: 20 } }).then(r => r.data),
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients-select-opd", search],
    queryFn: () => axios.get("/api/patients", { params: { limit: 50, search } }).then(r => r.data),
    enabled: createOpen,
  });

  const records: EMRRecord[] = data?.data || [];
  const pagination = data?.pagination;
  const patients = patientsData?.data || [];

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      patient: "",
      chiefComplaint: "",
      notes: "",
      followUpDate: "",
      allergies: "",
      vitals: {
        temperature: "",
        bloodPressureSystolic: "",
        bloodPressureDiastolic: "",
        heartRate: "",
        respiratoryRate: "",
        weight: "",
        height: "",
        oxygenSaturation: "",
        bloodSugar: "",
      },
      diagnosis: [{ description: "", icdCode: "", type: "primary" }],
      treatmentPlan: "",
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
    },
  });

  const diagFields = useFieldArray({ control, name: "diagnosis" });
  const rxFields = useFieldArray({ control, name: "prescriptions" });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => axios.post("/api/emr", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emr-records"] });
      setCreateOpen(false);
      reset();
      setCreateError("");
      setSymptoms([]);
    },
    onError: (e: unknown) => setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to save EMR"),
  });

  const onSubmit = (d: Record<string, unknown>) => {
    // Convert vitals to numbers
    const vitals = Object.fromEntries(
      Object.entries(d.vitals as Record<string, string>)
        .map(([k, v]) => [k, v ? parseFloat(v) : undefined])
        .filter(([, v]) => v !== undefined && !isNaN(v as number))
    );

    // Filter out empty prescriptions
    const prescriptions = (d.prescriptions as any[])?.filter(p => p.medicine) || [];

    // Handle allergies
    const allergies = d.allergies ? (d.allergies as string).split(",").map(a => a.trim()).filter(Boolean) : [];

    createMutation.mutate({
      ...d,
      vitals,
      symptoms: symptoms.filter(s => s.trim()),
      prescriptions: prescriptions,
      allergies: allergies,
    });
  };

  const addSymptom = () => {
    if (symptomInput.trim()) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput("");
    }
  };

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clipboard className="w-5 h-5 text-slate-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">OPD / EMR</h1>
            <p className="text-sm text-slate-500">Electronic Medical Records</p>
          </div>
        </div>
        {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Visit Record</Button>}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Patient</Th>
              <Th>Doctor</Th>
              <Th>Visit Date</Th>
              <Th>Chief Complaint</Th>
              <Th>Diagnoses</Th>
              <Th>Follow-up</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
            ) : records.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="No EMR records" description="Start by recording a patient visit." action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> New Visit</Button> : undefined} /></td></tr>
            ) : records.map(r => (
              <tr key={r._id} className="hover:bg-slate-50">
                <Td>
                  <div className="font-medium text-slate-800">{r.patient?.firstName} {r.patient?.lastName}</div>
                  <div className="text-xs text-slate-400">{r.patient?.patientId}</div>
                </Td>
                <Td className="text-slate-600">Dr. {r.doctor?.user?.firstName} {r.doctor?.user?.lastName}</Td>
                <Td>{formatDate(r.visitDate)}</Td>
                <Td className="max-w-xs truncate text-slate-600">{r.chiefComplaint}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {r.diagnosis?.slice(0, 2).map((d, i) => (
                      <Badge key={i} variant={d.type === "primary" ? "info" : "outline"}>{d.description}</Badge>
                    ))}
                    {(r.diagnosis?.length || 0) > 2 && <span className="text-xs text-slate-400">+{r.diagnosis.length - 2}</span>}
                  </div>
                </Td>
                <Td className="text-slate-400">{r.followUpDate ? formatDate(r.followUpDate) : "—"}</Td>
                <Td>
                  <Link href={`/opd/${r._id}`}>
                    <button className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* EMR Creation Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); setSymptoms([]); }} title="New Visit Record" size="xl">
        {createError && <Alert type="error">{createError}</Alert>}

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-slate-100 mb-4">
          {(["emr", "rx"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-all ${activeTab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t === "emr" ? "Visit Details" : "Prescriptions"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit((d) => onSubmit(d as unknown as Record<string, unknown>))} className="space-y-4">
          {activeTab === "emr" && (
            <>
              {/* Patient search */}
              <FormField label="Patient" required error={errors.patient?.message}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Type to search patients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <Select {...register("patient", { required: true })} className="mt-2">
                  <option value="">Select patient</option>
                  {patients.map((p: { _id: string; firstName: string; lastName: string; patientId: string }) => (
                    <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Chief Complaint" required error={errors.chiefComplaint?.message}>
                <Input {...register("chiefComplaint", { required: true })} placeholder="Patient's main complaint..." />
              </FormField>

              {/* Symptoms */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-slate-700">Symptoms</p>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      placeholder="Add symptom..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSymptom();
                        }
                      }}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addSymptom}>
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((s, i) => (
                    <Badge key={i} variant="outline" className="flex items-center gap-1">
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSymptom(i)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
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
                <div className="grid grid-cols-4 gap-3">
                  <FormField label="Temp (°C)">
                    <Input type="number" step="0.1" {...register("vitals.temperature")} placeholder="37.0" />
                  </FormField>
                  <FormField label="BP Systolic">
                    <Input type="number" step="0.1" {...register("vitals.bloodPressureSystolic")} placeholder="120" />
                  </FormField>
                  <FormField label="BP Diastolic">
                    <Input type="number" step="0.1" {...register("vitals.bloodPressureDiastolic")} placeholder="80" />
                  </FormField>
                  <FormField label="Heart Rate">
                    <Input type="number" step="0.1" {...register("vitals.heartRate")} placeholder="72" />
                  </FormField>
                  <FormField label="Resp Rate">
                    <Input type="number" step="0.1" {...register("vitals.respiratoryRate")} placeholder="16" />
                  </FormField>
                  <FormField label="Weight (kg)">
                    <Input type="number" step="0.1" {...register("vitals.weight")} placeholder="70" />
                  </FormField>
                  <FormField label="Height (cm)">
                    <Input type="number" step="0.1" {...register("vitals.height")} placeholder="170" />
                  </FormField>
                  <FormField label="O2 Sat (%)">
                    <Input type="number" step="0.1" {...register("vitals.oxygenSaturation")} placeholder="98" />
                  </FormField>
                  <FormField label="Blood Sugar">
                    <Input type="number" step="0.1" {...register("vitals.bloodSugar")} placeholder="100" />
                  </FormField>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700">Diagnosis</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => diagFields.append({ description: "", icdCode: "", type: "primary" })}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {diagFields.fields.map((field, i) => (
                    <div key={field.id} className="flex gap-2">
                      <Input {...register(`diagnosis.${i}.description`)} placeholder="Diagnosis description" className="flex-1" />
                      <Input {...register(`diagnosis.${i}.icdCode`)} placeholder="ICD code" className="w-24" />
                      <Select {...register(`diagnosis.${i}.type`)} className="w-28">
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="differential">Differential</option>
                      </Select>
                      {diagFields.fields.length > 1 && (
                        <button type="button" onClick={() => diagFields.remove(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <FormField label="Treatment Plan">
                <textarea {...register("treatmentPlan")} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Treatment instructions..." />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Follow-up Date">
                  <Input type="date" {...register("followUpDate")} />
                </FormField>
                <FormField label="Notes">
                  <Input {...register("notes")} placeholder="Additional notes..." />
                </FormField>
              </div>
            </>
          )}

          {/* Prescription Tab */}
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); setCreateError(""); setSymptoms([]); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Save Visit Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}