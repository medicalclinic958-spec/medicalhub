"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Plus, Search, Stethoscope, Eye } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, Button, Modal,
  FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Doctor {
  _id: string; doctorId: string;
  user: { _id: string; firstName: string; lastName: string; email: string; phone: string; status: string };
  specialization: string; department?: { name: string };
  experience: number; consultationFee: number; isAvailable: boolean;
}

export function DoctorsClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("doctors:create");

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", page, search],
    queryFn: () => axios.get("/api/doctors", { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => axios.get("/api/settings/departments").then(r => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-select"],
    queryFn: () => axios.get("/api/users", { params: { limit: 200 } }).then(r => r.data),
    enabled: createOpen,
  });

  const doctors: Doctor[] = data?.data || [];
  const pagination = data?.pagination;
  const departments = deptData?.data || [];
  const users = usersData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    user: string; specialization: string; department?: string;
    experience: number; consultationFee: number; qualifications: string; bio?: string;
  }>();

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => axios.post("/api/doctors", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doctors"] }); setCreateOpen(false); reset(); setCreateError(""); },
    onError: (e: unknown) => setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"),
  });

  const onSubmit = (d: { user: string; specialization: string; department?: string; experience: number; consultationFee: number; qualifications: string; bio?: string }) => {
    createMutation.mutate({
      ...d,
      qualifications: d.qualifications ? d.qualifications.split(",").map(q => q.trim()).filter(Boolean) : [],
    });
  };

  // Filter only active users for doctor selection
  const activeUsers = users.filter((u: any) => u.status === "active");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Doctors</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} doctors</p>
        </div>
        {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Doctor</Button>}
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search doctors..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Doctor ID</Th>
              <Th>Name</Th>
              <Th>Specialization</Th>
              <Th>Department</Th>
              <Th>Experience</Th>
              <Th>Fee</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
            ) : doctors.length === 0 ? (
              <tr><td colSpan={8}><EmptyState title="No doctors found" action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Doctor</Button> : undefined} /></td></tr>
            ) : doctors.map(d => (
              <tr key={d._id} className="hover:bg-slate-50">
                <Td><span className="font-mono text-xs text-blue-600">{d.doctorId}</span></Td>
                <Td>
                  <div className="font-medium text-slate-800">Dr. {d.user?.firstName} {d.user?.lastName}</div>
                  <div className="text-xs text-slate-400">{d.user?.email}</div>
                </Td>
                <Td>{d.specialization}</Td>
                <Td>{d.department?.name || "—"}</Td>
                <Td>{d.experience} yrs</Td>
                <Td>PKR {d.consultationFee?.toLocaleString()}</Td>
                <Td>
                  <Badge variant={d.isAvailable ? "success" : "default"}>
                    {d.isAvailable ? "Available" : "Unavailable"}
                  </Badge>
                  {d.user?.status && d.user.status !== "active" && (
                    <Badge variant="danger" className="ml-1 text-xs">
                      {d.user.status}
                    </Badge>
                  )}
                </Td>
                <Td>
                  <Link href={`/doctors/${d._id}`}>
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

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Add Doctor Profile" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <FormField label="User Account" required error={errors.user?.message}>
            <Select {...register("user", { required: true })}>
              <option value="">Select staff user</option>
              {activeUsers.map((u: { _id: string; firstName: string; lastName: string; email: string; status: string }) => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName} ({u.email}) - Active
                </option>
              ))}
            </Select>
          </FormField>
          {activeUsers.length === 0 && (
            <Alert type="warning">No active users available. Please create an active user first.</Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Specialization" required error={errors.specialization?.message}>
              <Input {...register("specialization", { required: true })} placeholder="e.g. Cardiologist" />
            </FormField>
            <FormField label="Department">
              <Select {...register("department")}>
                <option value="">Select department</option>
                {departments.map((d: { _id: string; name: string }) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Experience (years)">
              <Input type="number" {...register("experience", { valueAsNumber: true })} placeholder="0" />
            </FormField>
            <FormField label="Consultation Fee (PKR)">
              <Input type="number" {...register("consultationFee", { valueAsNumber: true })} placeholder="0" />
            </FormField>
          </div>
          <FormField label="Qualifications" hint="Comma separated e.g. MBBS, FCPS">
            <Input {...register("qualifications")} placeholder="MBBS, FCPS, MD" />
          </FormField>
          <FormField label="Bio">
            <textarea {...register("bio")} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={activeUsers.length === 0}>Add Doctor</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}