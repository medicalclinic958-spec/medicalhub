"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Plus, Search, Eye, EyeOff } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, StatusBadge, Button,
  Modal, FormField, Input, Select, EmptyState, Pagination, Alert, Badge,
} from "@/components/ui";
import { createUserSchema, CreateUserInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface User {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: { name: string; slug: string };
  status: string;
  lastLogin?: string;
  createdAt: string;
}

interface DoctorFormData {
  specialization: string;
  department: string;
  experience: string;
  consultationFee: string;
  qualifications: string;
  bio: string;
}

const EMPTY_DOCTOR_FORM: DoctorFormData = {
  specialization: "",
  department: "",
  experience: "",
  consultationFee: "",
  qualifications: "",
  bio: "",
};

export function UsersClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [doctorData, setDoctorData] = useState<DoctorFormData>(EMPTY_DOCTOR_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("users:create");

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () =>
      axios.get("/api/users", { params: { page, limit: 20, search } }).then((r) => r.data),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles-select"],
    queryFn: () => axios.get("/api/roles").then((r) => r.data),
  });

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => axios.get("/api/settings/departments").then((r) => r.data),
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

  const resetAll = () => {
    reset();
    setDoctorData(EMPTY_DOCTOR_FORM);
    setCreateError("");
  };

  const createMutation = useMutation({
    mutationFn: async (d: CreateUserInput) => {
      const userRes = await axios.post("/api/users", d);
      const newUser = userRes.data?.data?.user;

      if (isDoctorRole) {
        if (!doctorData.specialization.trim()) {
          throw new Error("Specialization is required for the Doctor role");
        }
        try {
          await axios.post("/api/doctors", {
            user: newUser._id,
            specialization: doctorData.specialization,
            department: doctorData.department || undefined,
            experience: doctorData.experience ? Number(doctorData.experience) : 0,
            consultationFee: doctorData.consultationFee ? Number(doctorData.consultationFee) : 0,
            qualifications: doctorData.qualifications
              ? doctorData.qualifications.split(",").map((q) => q.trim()).filter(Boolean)
              : [],
            bio: doctorData.bio || undefined,
          });
        } catch (doctorErr) {
          // User account was created but doctor profile failed - surface that clearly
          const msg = (doctorErr as { response?: { data?: { error?: string } } })?.response?.data?.error
            || "Failed to create doctor profile";
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
    },
    onError: (e: unknown) => {
      const msg = (e as Error)?.message
        || (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        || "Failed to create user";
      setCreateError(msg);
    },
  });

  const onSubmit = (d: CreateUserInput) => {
    setCreateError("");
    if (isDoctorRole && !doctorData.specialization.trim()) {
      setCreateError("Specialization is required for the Doctor role");
      return;
    }
    createMutation.mutate(d);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} users</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Create User
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Employee ID</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last Login</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>
                ))}</tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="No users found" /></td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                  <Td><span className="font-mono text-xs text-blue-600">{u.employeeId}</span></Td>
                  <Td>
                    <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                  </Td>
                  <Td className="text-slate-500">{u.email}</Td>
                  <Td>
                    <Badge variant="outline">{u.role?.name}</Badge>
                  </Td>
                  <Td><StatusBadge status={u.status} /></Td>
                  <Td className="text-slate-400 text-xs">
                    {u.lastLogin ? formatDate(u.lastLogin) : "Never"}
                  </Td>
                  <Td>
                    <Link href={`/users/${u._id}`}>
                      <button className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Temp password modal */}
      {tempPassword && (
        <Modal open={!!tempPassword} onClose={() => setTempPassword("")} title="User Created Successfully">
          <Alert type="success">User account has been created.</Alert>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 mb-2">Temporary password (share securely with user):</p>
            <code className="text-base font-mono font-bold text-slate-800 tracking-wider">{tempPassword}</code>
          </div>
          <p className="text-xs text-slate-400 mt-2">User will be required to change password on first login.</p>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setTempPassword("")}>Done</Button>
          </div>
        </Modal>
      )}

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); resetAll(); }} title="Create User" size={isDoctorRole ? "lg" : "md"}>
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName?.message}>
              <Input {...register("firstName")} error={!!errors.firstName} />
            </FormField>
            <FormField label="Last Name" required error={errors.lastName?.message}>
              <Input {...register("lastName")} error={!!errors.lastName} />
            </FormField>
          </div>
          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" {...register("email")} error={!!errors.email} />
          </FormField>
          <FormField label="Phone" required error={errors.phone?.message}>
            <Input {...register("phone")} error={!!errors.phone} />
          </FormField>
          <FormField label="Role" required error={errors.role?.message}>
            <Select {...register("role")} error={!!errors.role}>
              <option value="">Select role</option>
              {roles.map((r: { _id: string; name: string }) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </Select>
          </FormField>


          {/* Doctor-specific fields - shown only when Doctor role is selected */}
          {isDoctorRole && (
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Doctor Profile Details</p>

              <FormField label="Specialization" required>
                <Input
                  value={doctorData.specialization}
                  onChange={(e) => setDoctorData((p) => ({ ...p, specialization: e.target.value }))}
                  placeholder="e.g. Cardiologist"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Department">
                  <Select
                    value={doctorData.department}
                    onChange={(e) => setDoctorData((p) => ({ ...p, department: e.target.value }))}
                  >
                    <option value="">Select department</option>
                    {departments.map((d: { _id: string; name: string }) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Experience (years)">
                  <Input
                    type="number"
                    value={doctorData.experience}
                    onChange={(e) => setDoctorData((p) => ({ ...p, experience: e.target.value }))}
                    placeholder="0"
                  />
                </FormField>
              </div>

              <FormField label="Consultation Fee (PKR)" required>
                <Input
                  type="number"
                  value={doctorData.consultationFee}
                  onChange={(e) => setDoctorData((p) => ({ ...p, consultationFee: e.target.value }))}
                  placeholder="0"
                  required
                />
              </FormField>

              <FormField label="Qualifications" hint="Comma separated e.g. MBBS, FCPS">
                <Input
                  value={doctorData.qualifications}
                  onChange={(e) => setDoctorData((p) => ({ ...p, qualifications: e.target.value }))}
                  placeholder="MBBS, FCPS, MD"
                />
              </FormField>

              <FormField label="Bio">
                <textarea
                  value={doctorData.bio}
                  onChange={(e) => setDoctorData((p) => ({ ...p, bio: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>
            </div>
          )}
          <FormField label="Initial Password" error={errors.password?.message} required>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                error={!!errors.password}
                placeholder="Password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-teal-500 duration-200" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </FormField>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); resetAll(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>
              {isDoctorRole ? "Create User & Doctor Profile" : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}