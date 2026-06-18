"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import {
  Card, CardHeader, CardBody, Button, FormField, Input, Select, Alert, Badge,
} from "@/components/ui";
import { Building2, Bell, Shield, Plus, Trash2, Settings } from "lucide-react";
import { useSession } from "next-auth/react";

const TABS = [
  { id: "clinic", label: "Clinic Info", icon: Building2 },
  { id: "departments", label: "Departments", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

export function SettingsClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState("clinic");
  const [saveMsg, setSaveMsg] = useState("");
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

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  const saveMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => axios.put("/api/settings", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaveMsg("Settings saved successfully.");
      setSaveError("");
      setTimeout(() => setSaveMsg(""), 3000);
    },
    onError: (e: unknown) => {
      setSaveError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Save failed");
      setSaveMsg("");
    },
  });

  const addDeptMutation = useMutation({
    mutationFn: (d: typeof newDept) => axios.post("/api/settings/departments", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setNewDept({ name: "", code: "", description: "" });
      setDeptError("");
    },
    onError: (e: unknown) => setDeptError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to add department"),
  });

  const [cpForm, setCpForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [cpMsg, setCpMsg] = useState(""); const [cpError, setCpError] = useState("");
  const changePasswordMutation = useMutation({
    mutationFn: (d: typeof cpForm) => axios.post("/api/auth/change-password", d),
    onSuccess: () => { setCpMsg("Password changed successfully."); setCpError(""); setCpForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setTimeout(() => setCpMsg(""), 3000); },
    onError: (e: unknown) => { setCpError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"); setCpMsg(""); },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Manage clinic configuration and preferences</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Clinic Info Tab */}
      {tab === "clinic" && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-700">Clinic Information</h3>
          </CardHeader>
          <CardBody>
            {isLoading ? <div className="h-48 animate-pulse bg-slate-50 rounded-xl" /> : (
              <form onSubmit={handleSubmit(d => saveMutation.mutate(d as unknown as Record<string, unknown>))} className="space-y-4">
                {saveMsg && <Alert type="success">{saveMsg}</Alert>}
                {saveError && <Alert type="error">{saveError}</Alert>}
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Clinic / Hospital Name" required>
                    <Input {...register("clinicName", { required: true })} disabled={!canEdit} />
                  </FormField>
                  <FormField label="Type">
                    <Select {...register("clinicType")} disabled={!canEdit}>
                      <option value="clinic">Clinic</option>
                      <option value="hospital">Hospital</option>
                      <option value="diagnostic_center">Diagnostic Center</option>
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Phone"><Input {...register("phone")} disabled={!canEdit} /></FormField>
                  <FormField label="Email"><Input type="email" {...register("email")} disabled={!canEdit} /></FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Website"><Input {...register("website")} placeholder="https://..." disabled={!canEdit} /></FormField>
                  <FormField label="Registration Number"><Input {...register("registrationNumber")} disabled={!canEdit} /></FormField>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Currency">
                    <Select {...register("currency")} disabled={!canEdit}>
                      {["PKR","USD","EUR","GBP","AED","SAR","INR"].map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Timezone">
                    <Select {...register("timezone")} disabled={!canEdit}>
                      {["Asia/Karachi","Asia/Kolkata","Asia/Dubai","Europe/London","America/New_York","UTC"].map(z => <option key={z} value={z}>{z}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Invoice Prefix">
                    <Input {...register("invoicePrefix")} placeholder="INV" disabled={!canEdit} />
                  </FormField>
                </div>
                <FormField label="Default Appointment Duration (minutes)">
                  <Select {...register("appointmentDuration", { valueAsNumber: true })} disabled={!canEdit}>
                    {[10,15,20,30,45,60].map(d => <option key={d} value={d}>{d} minutes</option>)}
                  </Select>
                </FormField>
                {canEdit && (
                  <div className="flex justify-end pt-2 border-t border-slate-100">
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
            <CardHeader><h3 className="font-semibold text-slate-700">Departments ({departments.length})</h3></CardHeader>
            <CardBody className="p-0">
              {departments.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-slate-400">No departments. Run seed script to create defaults.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {departments.map(d => (
                    <li key={d._id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-800">{d.name}</span>
                        {d.description && <span className="text-sm text-slate-400 ml-2">— {d.description}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{d.code}</Badge>
                        <Badge variant={d.isActive ? "success" : "default"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader><h3 className="font-semibold text-slate-700">Add Department</h3></CardHeader>
              <CardBody>
                {deptError && <Alert type="error">{deptError}</Alert>}
                <div className="flex gap-3 items-end mt-2">
                  <FormField label="Name" className="flex-1">
                    <Input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Neurology" />
                  </FormField>
                  <FormField label="Code">
                    <Input value={newDept.code} onChange={e => setNewDept(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="NEURO" className="w-24" />
                  </FormField>
                  <FormField label="Description" className="flex-1">
                    <Input value={newDept.description} onChange={e => setNewDept(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
                  </FormField>
                  <Button onClick={() => addDeptMutation.mutate(newDept)} loading={addDeptMutation.isPending} disabled={!newDept.name || !newDept.code}>
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && (
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-700">Notification Settings</h3></CardHeader>
          <CardBody className="space-y-4">
            <Alert type="info">
              Email, SMS, and WhatsApp integrations can be enabled here once configured in your environment variables.
            </Alert>
            <div className="space-y-3">
              {[
                { key: "emailEnabled", label: "Email Notifications", desc: "Send appointment reminders and alerts via email" },
                { key: "smsEnabled", label: "SMS Notifications", desc: "Send SMS reminders (requires Twilio)" },
                { key: "whatsappEnabled", label: "WhatsApp Notifications", desc: "Send WhatsApp messages (requires WhatsApp Business API)" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <Badge variant="default">Coming Soon</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Security / Change Password Tab */}
      {tab === "security" && (
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-700">Change Password</h3></CardHeader>
          <CardBody className="max-w-md space-y-4">
            {cpMsg && <Alert type="success">{cpMsg}</Alert>}
            {cpError && <Alert type="error">{cpError}</Alert>}
            <FormField label="Current Password">
              <Input type="password" value={cpForm.currentPassword} onChange={e => setCpForm(p => ({ ...p, currentPassword: e.target.value }))} />
            </FormField>
            <FormField label="New Password" hint="Min 8 chars, uppercase, number">
              <Input type="password" value={cpForm.newPassword} onChange={e => setCpForm(p => ({ ...p, newPassword: e.target.value }))} />
            </FormField>
            <FormField label="Confirm New Password">
              <Input type="password" value={cpForm.confirmPassword} onChange={e => setCpForm(p => ({ ...p, confirmPassword: e.target.value }))} />
            </FormField>
            <Button onClick={() => changePasswordMutation.mutate(cpForm)} loading={changePasswordMutation.isPending}>
              Change Password
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
