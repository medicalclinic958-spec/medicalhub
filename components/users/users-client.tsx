// components/users/users-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Plus, Search, Eye, EyeOff, Filter, ChevronDown, X } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge, Button,
  Modal, FormField, Input, Select, EmptyState, Pagination, Alert, Badge,
} from "@/components/ui";
import { createUserSchema, CreateUserInput } from "@/lib/validations";
import { formatDate, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";

interface User {
  _id: string; employeeId: string; firstName: string; lastName: string;
  email: string; phone: string; role: { name: string; slug: string };
  status: string; lastLogin?: string; createdAt: string;
}

interface DoctorFormData {
  specialization: string; department: string; experience: string;
  consultationFee: string; qualifications: string; bio: string;
}

const EMPTY_DOCTOR_FORM: DoctorFormData = {
  specialization: "", department: "", experience: "", consultationFee: "", qualifications: "", bio: "",
};

export function UsersClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [doctorData, setDoctorData] = useState<DoctorFormData>(EMPTY_DOCTOR_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("users:create");

  const activeFiltersCount = [statusFilter, roleFilter].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search, statusFilter, roleFilter],
    queryFn: () => axios.get("/api/users", {
      params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined, role: roleFilter || undefined },
    }).then(r => r.data),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles-select"],
    queryFn: () => axios.get("/api/roles").then(r => r.data),
  });

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => axios.get("/api/settings/departments").then(r => r.data),
    enabled: createOpen,
  });

  const users: User[] = data?.data || [];
  const pagination = data?.pagination;
  const roles = rolesData?.data || [];
  const departments = deptData?.data || [];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { mustChangePassword: true },
  });

  const selectedRoleId = watch("role");
  const selectedRole = roles.find((r: { _id: string; slug: string }) => r._id === selectedRoleId);
  const isDoctorRole = selectedRole?.slug === "doctor";

  const resetAll = () => { reset(); setDoctorData(EMPTY_DOCTOR_FORM); setCreateError(""); };

  const createMutation = useMutation({
    mutationFn: async (d: CreateUserInput) => {
      const userRes = await axios.post("/api/users", d);
      const newUser = userRes.data?.data?.user;
      if (isDoctorRole) {
        if (!doctorData.specialization.trim()) throw new Error("Specialization is required for the Doctor role");
        try {
          await axios.post("/api/doctors", {
            user: newUser._id, specialization: doctorData.specialization,
            department: doctorData.department || undefined,
            experience: doctorData.experience ? Number(doctorData.experience) : 0,
            consultationFee: doctorData.consultationFee ? Number(doctorData.consultationFee) : 0,
            qualifications: doctorData.qualifications ? doctorData.qualifications.split(",").map(q => q.trim()).filter(Boolean) : [],
            bio: doctorData.bio || undefined,
          });
        } catch (doctorErr) {
          const msg = (doctorErr as any)?.response?.data?.error || "Failed to create doctor profile";
          throw new Error(`User account created, but doctor profile failed: ${msg}`);
        }
      }
      return userRes;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
      if (res.data.data.tempPassword) setTempPassword(res.data.data.tempPassword);
      resetAll();
      toast.success("User created successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as Error)?.message || (e as any)?.response?.data?.error || "Failed to create user";
      setCreateError(msg); toast.error(msg);
    },
  });

  const onSubmit = (d: CreateUserInput) => {
    setCreateError("");
    if (isDoctorRole && !doctorData.specialization.trim()) { setCreateError("Specialization is required"); return; }
    createMutation.mutate(d);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination?.total ?? 0} user{pagination?.total !== 1 ? "s" : ""}</p>
        </div>
        {canCreate && <Button onClick={() => setCreateOpen(true)} size="sm"><Plus className="w-3.5 h-3.5" /> Create User</Button>}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, email, or employee ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 bg-white placeholder:text-gray-400 text-gray-600 focus:outline-none focus:border-teal-600" />
        </div>
        <button onClick={() => setFiltersOpen(!filtersOpen)} className={cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer shrink-0", filtersOpen || activeFiltersCount > 0 ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-300 text-gray-600")}>
          <Filter className="w-3.5 h-3.5" /> Filters{activeFiltersCount > 0 && <span className="bg-white text-teal-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">{activeFiltersCount}</span>}<ChevronDown className={cn("w-3 h-3", filtersOpen && "rotate-180")} />
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700 capitalize">{statusFilter}<button onClick={() => { setStatusFilter(""); setPage(1); }} className="cursor-pointer"><X className="w-3 h-3" /></button></span>}
          {roleFilter && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">{roles.find((r: any) => r._id === roleFilter)?.name || roleFilter}<button onClick={() => { setRoleFilter(""); setPage(1); }} className="cursor-pointer"><X className="w-3 h-3" /></button></span>}
          <button onClick={() => { setStatusFilter(""); setRoleFilter(""); setPage(1); }} className="text-xs text-gray-400 cursor-pointer">Clear all</button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label><Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}><option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></Select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label><Select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}><option value="">All Roles</option>{roles.map((r: any) => <option key={r._id} value={r._id}>{r.name}</option>)}</Select></div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <thead><tr><Th>Employee ID</Th><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Last Login</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {isLoading ? [...Array(6)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>)}</tr>) :
              users.length === 0 ? <tr><td colSpan={7}><EmptyState title="No users found" description="Try adjusting your search or filters." /></td></tr> :
                users.map(u => (
                  <tr key={u._id}>
                    <Td><span className="font-medium text-gray-900">{u.employeeId}</span></Td>
                    <Td><div className="font-medium text-gray-900">{u.firstName} {u.lastName}</div></Td>
                    <Td className="text-gray-500">{u.email}</Td>
                    <Td><Badge variant="outline">{u.role?.name}</Badge></Td>
                    <Td><StatusBadge status={u.status} /></Td>
                    <Td className="text-gray-400">{u.lastLogin ? formatDate(u.lastLogin) : "Never"}</Td>
                    <Td><Link href={`/users/${u._id}`}><Button size="sm">View</Button></Link></Td>
                  </tr>))}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && <div className="px-4 py-3 border-t border-gray-300 flex justify-end"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>}
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
        {isLoading ? [...Array(5)].map((_, i) => <div key={i} className="p-3 flex items-center justify-between"><div className="space-y-2"><div className="h-4 bg-gray-100 rounded w-28" /><div className="h-3 bg-gray-100 rounded w-20" /></div></div>) :
          users.length === 0 ? <EmptyState title="No users found" description="Try adjusting your search or filters." /> :
            users.map(u => (
              <div key={u._id} className="flex items-center justify-between p-3 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-xs font-medium text-gray-900">{u.firstName} {u.lastName}</span><StatusBadge status={u.status} /></div>
                  <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-gray-500">{u.role?.name}</span><span className="text-xs text-gray-400">•</span><span className="text-xs text-gray-500">{u.email}</span></div>
                </div>
                <Link href={`/users/${u._id}`}><Button size="sm">View</Button></Link>
              </div>))}
        {pagination && pagination.totalPages > 1 && <div className="px-4 py-3 flex justify-center"><Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} /></div>}
      </div>

      {/* Temp password modal */}
      {tempPassword && (
        <Modal open={!!tempPassword} onClose={() => setTempPassword("")} title="User Created Successfully" size="sm">
          <Alert type="success">User account has been created.</Alert>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Temporary password (share securely):</p>
            <code className="text-sm font-semibold text-gray-900 tracking-wider">{tempPassword}</code>
          </div>
          <p className="text-xs text-gray-400 mt-2">User will be required to change password on first login.</p>
          <div className="mt-4 flex justify-end"><Button onClick={() => setTempPassword("")}>Done</Button></div>
        </Modal>
      )}

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); resetAll(); }} title="Create User" size={isDoctorRole ? "lg" : "md"}>
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName?.message}><Input {...register("firstName")} error={!!errors.firstName} /></FormField>
            <FormField label="Last Name" required error={errors.lastName?.message}><Input {...register("lastName")} error={!!errors.lastName} /></FormField>
          </div>
          <FormField label="Email" required error={errors.email?.message}><Input type="email" {...register("email")} error={!!errors.email} /></FormField>
          <FormField label="Phone" required error={errors.phone?.message}><Input {...register("phone")} error={!!errors.phone} /></FormField>
          <FormField label="Role" required error={errors.role?.message}>
            <Select {...register("role")} error={!!errors.role}><option value="">Select role</option>{roles.map((r: any) => <option key={r._id} value={r._id}>{r.name}</option>)}</Select>
          </FormField>

          {isDoctorRole && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor Profile Details</p>
              <FormField label="Specialization" required><Input value={doctorData.specialization} onChange={e => setDoctorData(p => ({ ...p, specialization: e.target.value }))} placeholder="e.g. Cardiologist" /></FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Department"><Select value={doctorData.department} onChange={e => setDoctorData(p => ({ ...p, department: e.target.value }))}><option value="">Select department</option>{departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select></FormField>
                <FormField label="Experience (years)"><Input type="number" value={doctorData.experience} onChange={e => setDoctorData(p => ({ ...p, experience: e.target.value }))} placeholder="0" /></FormField>
              </div>
              <FormField label="Consultation Fee (PKR)" required><Input type="number" value={doctorData.consultationFee} onChange={e => setDoctorData(p => ({ ...p, consultationFee: e.target.value }))} placeholder="0" /></FormField>
              <FormField label="Qualifications" hint="Comma separated e.g. MBBS, FCPS"><Input value={doctorData.qualifications} onChange={e => setDoctorData(p => ({ ...p, qualifications: e.target.value }))} placeholder="MBBS, FCPS, MD" /></FormField>
              <FormField label="Bio"><textarea value={doctorData.bio} onChange={e => setDoctorData(p => ({ ...p, bio: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400" /></FormField>
            </div>
          )}

          <FormField label="Initial Password" error={errors.password?.message} required>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} {...register("password")} error={!!errors.password} placeholder="Password" className="pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); resetAll(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>{isDoctorRole ? "Create User & Doctor Profile" : "Create User"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}