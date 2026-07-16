// components/settings/settings-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import {
  Card, CardBody, Button, FormField, Input, Select, Alert, Badge,
} from "@/components/ui";
import { Building2, Plus, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  // { id: "clinic", label: "Clinic Info", icon: Building2 },
  { id: "departments", label: "Departments", icon: Settings },
];

export function SettingsClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState("departments");
  const [saveError, setSaveError] = useState("");
  const [newDept, setNewDept] = useState({ name: "", code: "", description: "" });
  const [deptError, setDeptError] = useState("");

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canEdit = isSA || perms.includes("settings:update");

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => axios.get("/api/settings").then(r => r.data),
  });

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => axios.get("/api/settings/departments").then(r => r.data),
  });

  const settings = settingsData?.data;
  const departments: { _id: string; name: string; code: string; description?: string; isActive: boolean }[] = deptsData?.data || [];

  const { register, handleSubmit, reset } = useForm<{
    clinicName: string; clinicType: string; phone: string; email: string;
    website: string; registrationNumber: string; taxId: string;
    currency: string; timezone: string; invoicePrefix: string; appointmentDuration: number;
  }>();

  useEffect(() => { if (settings) reset(settings); }, [settings, reset]);

  const saveMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => axios.put("/api/settings", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); setSaveError(""); toast.success("Settings saved!"); },
    onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Save failed"; setSaveError(msg); toast.error(msg); },
  });

  const addDeptMutation = useMutation({
    mutationFn: (d: typeof newDept) => axios.post("/api/settings/departments", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); setNewDept({ name: "", code: "", description: "" }); setDeptError(""); toast.success("Department added!"); },
    onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Failed"; setDeptError(msg); toast.error(msg); },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Departments</h1>
        {/* <p className="text-xs text-gray-500 mt-0.5">Manage clinic configuration and preferences</p> */}
        <p className="text-xs text-gray-500 mt-0.5">Manage clinic departments</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 border-b border-gray-300">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer", tab === t.id ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500")}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Clinic Info Tab */}
      {tab === "clinic" && (
        <Card>
          <CardBody>
            <h3 className="text-xs font-semibold text-gray-900 mb-4">Clinic Information</h3>
            {isLoading ? (
              <div className="h-48 bg-gray-100 rounded-lg" />
            ) : (
              <form onSubmit={handleSubmit(d => saveMutation.mutate(d as any))} className="space-y-4">
                {saveError && <Alert type="error">{saveError}</Alert>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Clinic / Hospital Name" required><Input {...register("clinicName", { required: true })} disabled={!canEdit} /></FormField>
                  <FormField label="Type"><Select {...register("clinicType")} disabled={!canEdit}><option value="clinic">Clinic</option><option value="hospital">Hospital</option><option value="diagnostic_center">Diagnostic Center</option></Select></FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Phone"><Input {...register("phone")} disabled={!canEdit} /></FormField>
                  <FormField label="Email"><Input type="email" {...register("email")} disabled={!canEdit} /></FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Website"><Input {...register("website")} placeholder="https://..." disabled={!canEdit} /></FormField>
                  <FormField label="Registration Number"><Input {...register("registrationNumber")} disabled={!canEdit} /></FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Currency"><Select {...register("currency")} disabled={!canEdit}>{["PKR","USD","EUR","GBP","AED","SAR","INR"].map(c => <option key={c} value={c}>{c}</option>)}</Select></FormField>
                  <FormField label="Timezone"><Select {...register("timezone")} disabled={!canEdit}>{["Asia/Karachi","Asia/Kolkata","Asia/Dubai","Europe/London","America/New_York","UTC"].map(z => <option key={z} value={z}>{z}</option>)}</Select></FormField>
                  <FormField label="Invoice Prefix"><Input {...register("invoicePrefix")} placeholder="INV" disabled={!canEdit} /></FormField>
                </div>
                <FormField label="Default Appointment Duration (minutes)">
                  <Select {...register("appointmentDuration", { valueAsNumber: true })} disabled={!canEdit}>{[10,15,20,30,45,60].map(d => <option key={d} value={d}>{d} min</option>)}</Select>
                </FormField>
                {canEdit && (
                  <div className="flex justify-end pt-2 border-t border-gray-300">
                    <Button type="submit" loading={saveMutation.isPending}>Save Settings</Button>
                  </div>
                )}
              </form>
            )}
          </CardBody>
        </Card>
      )}

      {/* Departments Tab */}
      {tab === "departments" && (
        <div className="space-y-4">
          <Card>
            <CardBody>
              <h3 className="text-xs font-semibold text-gray-900 mb-3">Departments ({departments.length})</h3>
              {departments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No departments. Run seed script to create defaults.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {departments.map(d => (
                    <div key={d._id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-gray-900">{d.name}</span>
                        {d.description && <span className="text-xs text-gray-400 ml-2">— {d.description}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{d.code}</Badge>
                        <Badge variant={d.isActive ? "success" : "default"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {canEdit && (
            <Card>
              <CardBody>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Add Department</h3>
                {deptError && <Alert type="error">{deptError}</Alert>}
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full"><FormField label="Name"><Input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Neurology" /></FormField></div>
                  <div className="w-full sm:w-24"><FormField label="Code"><Input value={newDept.code} onChange={e => setNewDept(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="NEURO" /></FormField></div>
                  <div className="flex-1 w-full"><FormField label="Description"><Input value={newDept.description} onChange={e => setNewDept(p => ({ ...p, description: e.target.value }))} placeholder="Optional" /></FormField></div>
                  <Button onClick={() => addDeptMutation.mutate(newDept)} loading={addDeptMutation.isPending} disabled={!newDept.name || !newDept.code}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}