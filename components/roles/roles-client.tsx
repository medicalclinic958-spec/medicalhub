// components/roles/roles-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Plus, Shield, Edit2, Trash2, Lock, Eye } from "lucide-react";
import {
  Card, CardBody, Button, Modal, FormField,
  Input, Badge, Alert, EmptyState,
} from "@/components/ui";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Permission { _id: string; module: string; action: string; description: string }
interface Role {
  _id: string; name: string; slug: string; description: string;
  permissions: Permission[]; isSystem: boolean; isActive: boolean;
}

const MODULE_ORDER = [
  "patients", "appointments", "doctors", "emr", "prescriptions", "opd",
  "billing", "lab", "labcatalog", "pharmacy", "inventory", "expenses", "staff",
  "reports", "users", "roles", "settings", "audit_logs", "developer_reports",
];
const ACTIONS = ["view", "create", "update", "delete", "approve", "export"];
const ACTION_COLORS: Record<string, string> = {
  view: "bg-blue-100 text-blue-700 border-blue-200",
  create: "bg-emerald-100 text-emerald-700 border-emerald-200",
  update: "bg-amber-100 text-amber-700 border-amber-200",
  delete: "bg-red-100 text-red-700 border-red-200",
  approve: "bg-purple-100 text-purple-700 border-purple-200",
  export: "bg-gray-100 text-gray-700 border-gray-200",
};

export function RolesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [createError, setCreateError] = useState("");
  const [viewRole, setViewRole] = useState<Role | null>(null);

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("roles:create");
  const canEdit = isSA || perms.includes("roles:update");
  const canDelete = isSA || perms.includes("roles:delete");

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => axios.get("/api/roles").then(r => r.data),
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: () => axios.get("/api/roles/permissions").then(r => r.data),
  });

  const roles: Role[] = rolesData?.data || [];
  const permsByModule: Record<string, Permission[]> = permissionsData?.data?.grouped || {};

  const { register, handleSubmit, reset, setValue } = useForm<{ name: string; description: string }>();

  const openCreate = () => { setEditRole(null); setSelectedPerms(new Set()); reset({ name: "", description: "" }); setCreateError(""); setCreateOpen(true); };
  const openEdit = (role: Role) => { setEditRole(role); setSelectedPerms(new Set(role.permissions.map(p => p._id))); setValue("name", role.name); setValue("description", role.description); setCreateError(""); setCreateOpen(true); };

  const togglePerm = (permId: string) => { setSelectedPerms(prev => { const next = new Set(prev); next.has(permId) ? next.delete(permId) : next.add(permId); return next; }); };
  const toggleModule = (modulePerms: Permission[]) => { const allSelected = modulePerms.every(p => selectedPerms.has(p._id)); setSelectedPerms(prev => { const next = new Set(prev); allSelected ? modulePerms.forEach(p => next.delete(p._id)) : modulePerms.forEach(p => next.add(p._id)); return next; }); };
  const selectAll = () => { const allIds = Object.values(permsByModule).flat().map(p => p._id); setSelectedPerms(new Set(allIds)); };

  const createMutation = useMutation({
    mutationFn: (d: { name: string; description: string }) => editRole ? axios.put(`/api/roles/${editRole._id}`, { ...d, permissions: [...selectedPerms] }) : axios.post("/api/roles", { ...d, permissions: [...selectedPerms] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setCreateOpen(false); reset(); setCreateError(""); toast.success(editRole ? "Role updated!" : "Role created!"); },
    onError: (e: unknown) => { const msg = (e as any)?.response?.data?.error || "Failed"; setCreateError(msg); toast.error(msg); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role deleted!"); },
    onError: (e: unknown) => toast.error((e as any)?.response?.data?.error || "Failed"),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Roles & Permissions</h1>
          <p className="text-xs text-gray-500 mt-0.5">Define what each role can access</p>
        </div>
        {canCreate && <Button onClick={openCreate} size="sm"><Plus className="w-3.5 h-3.5" /> Create Role</Button>}
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-gray-100 rounded-lg" />)}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState title="No roles found" description="Run the seed script to create default roles." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role._id}>
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("p-1.5 rounded-lg shrink-0", role.isSystem ? "bg-amber-50" : "bg-teal-50")}>
                      {role.isSystem ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Shield className="w-3.5 h-3.5 text-teal-600" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-gray-900 truncate">{role.name}</h3>
                      <p className="text-xs text-gray-400">{role.slug}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setViewRole(role)} className="p-1.5 rounded-lg text-gray-400 cursor-pointer" title="View"><Eye className="w-3.5 h-3.5" /></button>
                    {!role.isSystem && (
                      <>
                        {canEdit && <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg text-gray-400 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>}
                        {canDelete && <button onClick={() => { if (confirm(`Delete "${role.name}"?`)) deleteMutation.mutate(role._id); }} className="p-1.5 rounded-lg text-gray-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </>
                    )}
                  </div>
                </div>
                {role.description && <p className="text-xs text-gray-500 mb-3">{role.description}</p>}
                <p className="text-xs text-gray-400 mb-1.5">{role.permissions.length} Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 10).map(p => (
                    <span key={p._id} className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", ACTION_COLORS[p.action] || ACTION_COLORS.view)}>{p.module}:{p.action}</span>
                  ))}
                  {role.permissions.length > 10 && (
                    <button onClick={() => setViewRole(role)} className="text-[10px] text-teal-600 cursor-pointer">+{role.permissions.length - 10} more</button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* View Permissions Modal */}
      <Modal open={!!viewRole} onClose={() => setViewRole(null)} title={`Permissions: ${viewRole?.name || ""}`} size="lg">
        {viewRole && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-4">{viewRole.description}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{viewRole.permissions.length} Permissions</p>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {MODULE_ORDER.filter(m => viewRole.permissions.some(p => p.module === m)).map(module => {
                const modulePerms = viewRole.permissions.filter(p => p.module === module);
                if (modulePerms.length === 0) return null;
                return (
                  <div key={module}>
                    <p className="text-xs font-semibold text-gray-600 capitalize mb-1.5">{module.replace(/_/g, " ")}</p>
                    <div className="flex flex-wrap gap-1">
                      {modulePerms.map(p => (
                        <span key={p._id} className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", ACTION_COLORS[p.action] || ACTION_COLORS.view)}>{p.action}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-300 mt-4">
              <Button variant="secondary" onClick={() => setViewRole(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title={editRole ? `Edit Role: ${editRole.name}` : "Create New Role"} size="xl">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Role Name" required>
              <Input {...register("name", { required: true })} placeholder="e.g. Senior Doctor" disabled={editRole?.isSystem} />
            </FormField>
            <FormField label="Description">
              <Input {...register("description")} placeholder="Brief description of this role" />
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-900">Permissions ({selectedPerms.size} selected)</label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs text-teal-600 cursor-pointer">Select All</button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={() => setSelectedPerms(new Set())} className="text-xs text-gray-500 cursor-pointer">Clear</button>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              {/* Horizontal scroll wrapper for mobile */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Module</th>
                      {ACTIONS.map(a => <th key={a} className="px-2 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide capitalize">{a}</th>)}
                      <th className="px-2 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide">All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULE_ORDER.filter(m => permsByModule[m]?.length > 0).map((module, i) => {
                      const modulePerms = permsByModule[module] || [];
                      const allSelected = modulePerms.length > 0 && modulePerms.every(p => selectedPerms.has(p._id));
                      return (
                        <tr key={module} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-3 py-2.5 font-medium text-gray-700 capitalize">{module.replace(/_/g, " ")}</td>
                          {ACTIONS.map(action => {
                            const perm = modulePerms.find(p => p.action === action);
                            return (
                              <td key={action} className="px-2 py-2.5 text-center">
                                {perm ? (
                                  <input type="checkbox" checked={selectedPerms.has(perm._id)} onChange={() => togglePerm(perm._id)} className="w-3.5 h-3.5 rounded border-gray-300 accent-teal-600 cursor-pointer" disabled={editRole?.isSystem} />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2.5 text-center">
                            <input type="checkbox" checked={allSelected} onChange={() => toggleModule(modulePerms)} className="w-3.5 h-3.5 rounded border-gray-300 accent-teal-600 cursor-pointer" disabled={editRole?.isSystem} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={editRole?.isSystem}>{editRole ? "Save Changes" : "Create Role"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}