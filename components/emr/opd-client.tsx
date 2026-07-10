// components/opd/opd-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import axios from "axios";
import { Plus, Clipboard, Trash2, Search, X } from "lucide-react";
import { Card, Table, Th, Td, Button, Modal, FormField, Input, Select, EmptyState, Pagination, Badge, Alert } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface EMRRecord {
  _id: string;
  patient: { firstName: string; lastName: string; patientId: string };
  doctor: { user: { firstName: string; lastName: string } };
  visitDate: string;
  chiefComplaint: string;
  diagnosis: { description: string; type: string }[];
  followUpDate?: string;
}

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
  const searchParams = useSearchParams();
  const urlAppointmentId = searchParams.get("appointmentId");
  const urlPatientId = searchParams.get("patientId");

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("emr:create");

  const { data, isLoading } = useQuery({
    queryKey: ["emr-records", page],
    queryFn: () => axios.get("/api/emr", { params: { page, limit: 20 } }).then(r => r.data),
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients-select-opd", search],
    queryFn: () => axios.get("/api/publicPatients", { params: { limit: 50, search } }).then(r => r.data),
    enabled: createOpen && !urlPatientId,
  });

  const records: EMRRecord[] = data?.data || [];
  const pagination = data?.pagination;
  const patients = patientsData?.data || [];

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      patient: urlPatientId || "",
      chiefComplaint: "",
      notes: "",
      followUpDate: "",
      allergies: "",
      vitals: { temperature: "", bloodPressureSystolic: "", bloodPressureDiastolic: "", heartRate: "", respiratoryRate: "", weight: "", height: "", oxygenSaturation: "", bloodSugar: "" },
      diagnosis: [{ description: "", icdCode: "", type: "primary" }],
      treatmentPlan: "",
      prescriptions: [{ medicine: "", strength: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "", quantity: 0 }],
      prescriptionNotes: "", prescriptionType: "new", durationValue: 5, durationUnit: "days",
    },
  });

  const diagFields = useFieldArray({ control, name: "diagnosis" });
  const rxFields = useFieldArray({ control, name: "prescriptions" });

  useEffect(() => {
    if (urlAppointmentId && urlPatientId) {
      setValue("patient", urlPatientId);
      setCreateOpen(true);
    }
  }, [urlAppointmentId, urlPatientId, setValue]);

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => axios.post("/api/emr", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emr-records"] });
      setCreateOpen(false);
      reset();
      setCreateError("");
      setSymptoms([]);
      toast.success("Visit record created successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.response?.data?.error || "Failed";
      setCreateError(msg);
      toast.error(msg);
    },
  });

  const onSubmit = (d: Record<string, unknown>) => {
    const vitals = Object.fromEntries(
      Object.entries(d.vitals as Record<string, string>)
        .map(([k, v]) => [k, v ? parseFloat(v) : undefined])
        .filter(([, v]) => v !== undefined && !isNaN(v as number))
    );
    const prescriptions = (d.prescriptions as any[])?.filter(p => p.medicine) || [];
    const allergies = d.allergies ? (d.allergies as string).split(",").map(a => a.trim()).filter(Boolean) : [];
    createMutation.mutate({ ...d, appointment: urlAppointmentId || undefined, vitals, symptoms: symptoms.filter(s => s.trim()), prescriptions, allergies });
  };

  const addSymptom = () => {
    if (symptomInput.trim()) { setSymptoms([...symptoms, symptomInput.trim()]); setSymptomInput(""); }
  };

  const removeSymptom = (i: number) => setSymptoms(symptoms.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">OPD / EMR</h1>
          <p className="text-xs text-gray-500 mt-0.5">Electronic Medical Records</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Visit Record
          </Button>
        )}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
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
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No EMR records"
                    description="No visit records found."
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> New Visit
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              records.map(r => (
                <tr key={r._id}>
                  <Td>
                    <div className="font-medium text-gray-900">{r.patient?.firstName} {r.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">{r.patient?.patientId}</div>
                  </Td>
                  <Td className="text-gray-600">Dr. {r.doctor?.user?.firstName} {r.doctor?.user?.lastName}</Td>
                  <Td className="text-gray-500">{formatDate(r.visitDate)}</Td>
                  <Td className="max-w-[200px] truncate text-gray-600">{r.chiefComplaint}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {r.diagnosis?.slice(0, 2).map((d, i) => (
                        <Badge key={i} variant={d.type === "primary" ? "info" : "outline"}>{d.description}</Badge>
                      ))}
                      {(r.diagnosis?.length || 0) > 2 && <span className="text-xs text-gray-400">+{r.diagnosis.length - 2}</span>}
                    </div>
                  </Td>
                  <Td className="text-gray-500">{r.followUpDate ? formatDate(r.followUpDate) : "—"}</Td>
                  <Td>
                    <Link href={`/opd/${r._id}`}>
                      <Button size="sm">View</Button>
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-300 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-3 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
              <div className="h-7 bg-gray-100 rounded w-14" />
            </div>
          ))
        ) : records.length === 0 ? (
          <EmptyState
            title="No EMR records"
            description="No visit records found."
            action={canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> New Visit
              </Button>
            ) : undefined}
          />
        ) : (
          records.map(r => (
            <div key={r._id} className="flex items-center justify-between p-3 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">
                    {r.patient?.firstName} {r.patient?.lastName}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {r.chiefComplaint?.slice(0, 40)}{(r.chiefComplaint?.length || 0) > 40 ? "..." : ""}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Dr. {r.doctor?.user?.firstName} {r.doctor?.user?.lastName} • {formatDate(r.visitDate)}
                </div>
              </div>
              <Link href={`/opd/${r._id}`}>
                <Button size="sm">View</Button>
              </Link>
            </div>
          ))
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 flex justify-center">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset(); setCreateError(""); setSymptoms([]); }}
        title={urlAppointmentId ? "Create EMR from Appointment" : "New Visit Record"}
        size="xl"
      >
        {createError && <Alert type="error">{createError}</Alert>}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-4">
          {(["emr", "rx"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 cursor-pointer",
                activeTab === t ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500"
              )}
            >
              {t === "emr" ? "Visit Details" : "Prescriptions"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit((d) => onSubmit(d as unknown as Record<string, unknown>))} className="space-y-4">
          {activeTab === "emr" && (
            <>
              {urlPatientId ? (
                <FormField label="Patient" required>
                  <Input value={`Patient ID - ${urlPatientId}`} disabled className="bg-gray-50" />
                  <input type="hidden" {...register("patient")} value={urlPatientId} />
                </FormField>
              ) : (
                <FormField label="Patient" required error={errors.patient?.message}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder="Type to search patients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <Select {...register("patient", { required: true })} className="mt-2">
                    <option value="">Select patient</option>
                    {patients.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label="Chief Complaint" required error={errors.chiefComplaint?.message}>
                <Input {...register("chiefComplaint", { required: true })} placeholder="Patient's main complaint..." />
              </FormField>

              {/* Symptoms */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-gray-600">Symptoms</p>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={symptomInput}
                      onChange={e => setSymptomInput(e.target.value)}
                      placeholder="Add symptom..."
                      className="flex-1"
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSymptom(); } }}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={addSymptom}>Add</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map((s, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {s}
                      <button type="button" onClick={() => removeSymptom(i)} className="cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <FormField label="Allergies (comma-separated)">
                <Input {...register("allergies")} placeholder="e.g. Penicillin, Nuts" />
              </FormField>

              {/* Vitals */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Vitals</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FormField label="Temp (°C)"><Input type="number" step="0.1" {...register("vitals.temperature")} placeholder="37.0" /></FormField>
                  <FormField label="BP Systolic"><Input type="number" step="0.1" {...register("vitals.bloodPressureSystolic")} placeholder="120" /></FormField>
                  <FormField label="BP Diastolic"><Input type="number" step="0.1" {...register("vitals.bloodPressureDiastolic")} placeholder="80" /></FormField>
                  <FormField label="Heart Rate"><Input type="number" step="0.1" {...register("vitals.heartRate")} placeholder="72" /></FormField>
                  <FormField label="Resp Rate"><Input type="number" step="0.1" {...register("vitals.respiratoryRate")} placeholder="16" /></FormField>
                  <FormField label="Weight (kg)"><Input type="number" step="0.1" {...register("vitals.weight")} placeholder="70" /></FormField>
                  <FormField label="Height (cm)"><Input type="number" step="0.1" {...register("vitals.height")} placeholder="170" /></FormField>
                  <FormField label="O2 Sat (%)"><Input type="number" step="0.1" {...register("vitals.oxygenSaturation")} placeholder="98" /></FormField>
                  <FormField label="Blood Sugar"><Input type="number" step="0.1" {...register("vitals.bloodSugar")} placeholder="100" /></FormField>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">Diagnosis</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => diagFields.append({ description: "", icdCode: "", type: "primary" })}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {diagFields.fields.map((f, i) => (
                    <div key={f.id} className="flex gap-2">
                      <Input {...register(`diagnosis.${i}.description`)} placeholder="Description" className="flex-1" />
                      <Input {...register(`diagnosis.${i}.icdCode`)} placeholder="ICD code" className="w-24" />
                      <Select {...register(`diagnosis.${i}.type`)} className="w-28">
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                      </Select>
                      {diagFields.fields.length > 1 && (
                        <button type="button" onClick={() => diagFields.remove(i)} className="p-2 text-red-400 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <FormField label="Treatment Plan">
                <textarea
                  {...register("treatmentPlan")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400"
                  placeholder="Treatment instructions..."
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Follow-up Date"><Input type="date" {...register("followUpDate")} /></FormField>
                <FormField label="Notes"><Input {...register("notes")} /></FormField>
              </div>
            </>
          )}

          {activeTab === "rx" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-600">Prescriptions</p>
                <Button type="button" size="sm" variant="secondary" onClick={() => rxFields.append({ medicine: "", strength: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "", quantity: 0 })}>
                  <Plus className="w-3.5 h-3.5" /> Add Medicine
                </Button>
              </div>
              {rxFields.fields.map((f, i) => (
                <div key={f.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <FormField label="Medicine" required><Input {...register(`prescriptions.${i}.medicine`)} /></FormField>
                    <FormField label="Strength"><Input {...register(`prescriptions.${i}.strength`)} /></FormField>
                    <FormField label="Dosage" required><Input {...register(`prescriptions.${i}.dosage`)} /></FormField>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <FormField label="Frequency" required><Input {...register(`prescriptions.${i}.frequency`)} /></FormField>
                    <FormField label="Duration"><Input {...register(`prescriptions.${i}.duration`)} /></FormField>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <FormField label="Quantity"><Input type="number" {...register(`prescriptions.${i}.quantity`, { valueAsNumber: true })} /></FormField>
                    <FormField label="Instructions"><Input {...register(`prescriptions.${i}.instructions`)} /></FormField>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => rxFields.remove(i)} className="text-xs text-gray-400 cursor-pointer">Remove</button>
                  </div>
                </div>
              ))}
              {rxFields.fields.length === 0 && <Alert type="info">No prescriptions added.</Alert>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <FormField label="Prescription Type">
                  <Select {...register("prescriptionType")}>
                    <option value="new">New</option>
                    <option value="refill">Refill</option>
                    <option value="renewal">Renewal</option>
                  </Select>
                </FormField>
                <FormField label="Duration">
                  <div className="flex gap-2">
                    <Input type="number" {...register("durationValue", { valueAsNumber: true })} className="w-20" />
                    <Select {...register("durationUnit")}>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </Select>
                  </div>
                </FormField>
              </div>
              <FormField label="Prescription Notes"><Input {...register("prescriptionNotes")} /></FormField>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); setCreateError(""); setSymptoms([]); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Save Visit Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}