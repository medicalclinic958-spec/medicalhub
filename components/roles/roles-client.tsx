"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Plus, Shield, Edit2, Trash2, Lock } from "lucide-react";
import {
  Card, CardHeader, CardBody, Button, Modal, FormField,
  Input, Badge, Alert, EmptyState,
} from "@/components/ui";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Permission { _id: string; module: string; action: string; description: string }
interface Role {
  _id: string; name: string; slug: string; description: string;
  permissions: Permission[]; isSystem: boolean; isActive: boolean;
}

const MODULE_ORDER = [
  "patients","appointments","doctors","emr","prescriptions","opd",
  "billing","lab","pharmacy","inventory","expenses","staff",
  "reports","users","roles","settings","audit_logs",
];
const ACTIONS = ["view","create","update","delete","approve","export"];
const ACTION_COLORS: Record<string, string> = {
  view: "bg-blue-100 text-blue-700 border-blue-200",
  create: "bg-emerald-100 text-emerald-700 border-emerald-200",
  update: "bg-amber-100 text-amber-700 border-amber-200",
  delete: "bg-red-100 text-red-700 border-red-200",
  approve: "bg-purple-100 text-purple-700 border-purple-200",
  export: "bg-slate-100 text-slate-700 border-slate-200",
};

export function RolesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [createError, setCreateError] = useState("");

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

  const openCreate = () => {
    setEditRole(null);
    setSelectedPerms(new Set());
    reset({ name: "", description: "" });
    setCreateError("");
    setCreateOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setSelectedPerms(new Set(role.permissions.map(p => p._id)));
    setValue("name", role.name);
    setValue("description", role.description);
    setCreateError("");
    setCreateOpen(true);
  };

  const togglePerm = (permId: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModule = (modulePerms: Permission[]) => {
    const allSelected = modulePerms.every(p => selectedPerms.has(p._id));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (allSelected) modulePerms.forEach(p => next.delete(p._id));
      else modulePerms.forEach(p => next.add(p._id));
      return next;
    });
  };

  const selectAll = () => {
    const allIds = Object.values(permsByModule).flat().map(p => p._id);
    setSelectedPerms(new Set(allIds));
  };

  const createMutation = useMutation({
    mutationFn: (d: { name: string; description: string }) =>
      editRole
        ? axios.put(`/api/roles/${editRole._id}`, { ...d, permissions: [...selectedPerms] })
        : axios.post("/api/roles", { ...d, permissions: [...selectedPerms] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setCreateOpen(false); reset(); setCreateError("");
    },
    onError: (e: unknown) => setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Roles & Permissions</h1>
          <p className="text-sm text-slate-500">Define what each role can access</p>
        </div>
        {canCreate && <Button onClick={openCreate}><Plus className="w-4 h-4" /> Create Role</Button>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState title="No roles found" description="Run the seed script to create default roles." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role._id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg", role.isSystem ? "bg-amber-100" : "bg-blue-100")}>
                      {role.isSystem ? <Lock className="w-4 h-4 text-amber-600" /> : <Shield className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{role.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{role.slug}</p>
                    </div>
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-1 shrink-0">
                      {canEdit && (
                        <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteMutation.mutate(role._id); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardBody className="flex-1">
                {role.description && <p className="text-xs text-slate-500 mb-3">{role.description}</p>}
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  {role.permissions.length} Permissions
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 12).map(p => (
                    <span
                      key={p._id}
                      className={cn("text-xs px-2 py-0.5 rounded border font-medium", ACTION_COLORS[p.action] || ACTION_COLORS.view)}
                    >
                      {p.module}:{p.action}
                    </span>
                  ))}
                  {role.permissions.length > 12 && (
                    <span className="text-xs text-slate-400">+{role.permissions.length - 12} more</span>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }}
        title={editRole ? `Edit Role: ${editRole.name}` : "Create New Role"}
        size="xl"
      >
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role Name" required>
              <Input {...register("name", { required: true })} placeholder="e.g. Senior Doctor" disabled={editRole?.isSystem} />
            </FormField>
            <FormField label="Description">
              <Input {...register("description")} placeholder="Brief description of this role" />
            </FormField>
          </div>

          {/* Permission matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-700">
                Permissions ({selectedPerms.size} selected)
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-500">Select All</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setSelectedPerms(new Set())} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide w-36">Module</th>
                    {ACTIONS.map(a => (
                      <th key={a} className="px-3 py-2.5 text-center font-semibold text-slate-500 uppercase tracking-wide capitalize">{a}</th>
                    ))}
                    <th className="px-3 py-2.5 text-center font-semibold text-slate-500 uppercase tracking-wide">All</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULE_ORDER.filter(m => permsByModule[m]?.length > 0).map((module, i) => {
                    const modulePerms = permsByModule[module] || [];
                    const allSelected = modulePerms.length > 0 && modulePerms.every(p => selectedPerms.has(p._id));
                    return (
                      <tr key={module} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="px-4 py-2.5 font-medium text-slate-700 capitalize">{module.replace(/_/g, " ")}</td>
                        {ACTIONS.map(action => {
                          const perm = modulePerms.find(p => p.action === action);
                          return (
                            <td key={action} className="px-3 py-2.5 text-center">
                              {perm ? (
                                <input
                                  type="checkbox"
                                  checked={selectedPerms.has(perm._id)}
                                  onChange={() => togglePerm(perm._id)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                                  disabled={editRole?.isSystem}
                                />
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleModule(modulePerms)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                            disabled={editRole?.isSystem}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={editRole?.isSystem}>
              {editRole ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
