// components/doctors/doctors-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Plus, Search, Filter, ChevronDown, X } from "lucide-react";
import {
  Card, Table, Th, Td, Button, Modal,
  FormField, Input, Select, EmptyState, Pagination, Badge, Alert,
} from "@/components/ui";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Doctor {
  _id: string; doctorId: string;
  user: { _id: string; firstName: string; lastName: string; email: string; phone: string; status: string };
  specialization: string; department?: { _id: string; name: string };
  experience: number; consultationFee: number; isAvailable: boolean;
}

export function DoctorsClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("doctors:create");

  const activeFiltersCount = [departmentFilter, availabilityFilter].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", page, search, departmentFilter, availabilityFilter],
    queryFn: () => axios.get("/api/doctors", {
      params: {
        page,
        limit: 20,
        search: search || undefined,
        department: departmentFilter || undefined,
        isAvailable: availabilityFilter || undefined,
      },
    }).then(r => r.data),
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
  const activeUsers = users.filter((u: any) => u.status === "active");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    user: string; specialization: string; department?: string;
    experience: number; consultationFee: number; qualifications: string; bio?: string;
  }>();

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => axios.post("/api/doctors", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      setCreateOpen(false);
      reset();
      setCreateError("");
      toast.success("Doctor added successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed";
      setCreateError(msg);
      toast.error(msg);
    },
  });

  const onSubmit = (d: { user: string; specialization: string; department?: string; experience: number; consultationFee: number; qualifications: string; bio?: string }) => {
    createMutation.mutate({
      ...d,
      qualifications: d.qualifications ? d.qualifications.split(",").map(q => q.trim()).filter(Boolean) : [],
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Doctors</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {pagination?.total ?? 0} doctor{pagination?.total !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5" /> Add Doctor
          </Button>
        )}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or specialization..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 
                       bg-white placeholder:text-gray-400 text-gray-600
                       focus:outline-none focus:border-teal-600"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer shrink-0",
            filtersOpen || activeFiltersCount > 0
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white border-gray-300 text-gray-600"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-white text-teal-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={cn("w-3 h-3", filtersOpen && "rotate-180")} />
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {departmentFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">
              {departments.find((d: any) => d._id === departmentFilter)?.name || departmentFilter}
              <button onClick={() => { setDepartmentFilter(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {availabilityFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">
              {availabilityFilter === "true" ? "Available" : "Unavailable"}
              <button onClick={() => { setAvailabilityFilter(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => { setDepartmentFilter(""); setAvailabilityFilter(""); setPage(1); }}
            className="text-xs text-gray-400 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Department</label>
              <Select value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }}>
                <option value="">All Departments</option>
                {departments.map((d: { _id: string; name: string }) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Availability</label>
              <Select value={availabilityFilter} onChange={e => { setAvailabilityFilter(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
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
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="No doctors found"
                    description="Try adjusting your filters or add a new doctor"
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Add Doctor
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              doctors.map(d => (
                <tr key={d._id}>
                  <Td>
                    <span className="font-medium text-gray-900">{d.doctorId}</span>
                  </Td>
                  <Td>
                    <div className="font-medium text-gray-900">Dr. {d.user?.firstName} {d.user?.lastName}</div>
                    <div className="text-xs text-gray-400">{d.user?.email}</div>
                  </Td>
                  <Td className="text-gray-600">{d.specialization}</Td>
                  <Td className="text-gray-500">{d.department?.name || "—"}</Td>
                  <Td className="text-gray-600">{d.experience} yrs</Td>
                  <Td className="text-gray-600">PKR {d.consultationFee?.toLocaleString()}</Td>
                  <Td>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant={d.isAvailable ? "success" : "default"}>
                        {d.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                      {d.user?.status && d.user.status !== "active" && (
                        <Badge variant="danger">{d.user.status}</Badge>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Link href={`/doctors/${d._id}`}>
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
        ) : doctors.length === 0 ? (
          <EmptyState
            title="No doctors found"
            description="Try adjusting your filters"
            action={canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Doctor
              </Button>
            ) : undefined}
          />
        ) : (
          doctors.map(d => (
            <div key={d._id} className="flex items-center justify-between p-3 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">
                    Dr. {d.user?.firstName} {d.user?.lastName}
                  </span>
                  <Badge variant={d.isAvailable ? "success" : "default"}>
                    {d.isAvailable ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{d.specialization}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{d.experience} yrs</span>
                </div>
              </div>
              <Link href={`/doctors/${d._id}`}>
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
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Add Doctor Profile" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <FormField label="User Account" required error={errors.user?.message}>
            <Select {...register("user", { required: true })}>
              <option value="">Select staff user</option>
              {activeUsers.map((u: { _id: string; firstName: string; lastName: string; email: string }) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </Select>
          </FormField>
          {activeUsers.length === 0 && (
            <Alert type="warning">No active users available. Please create an active user first.</Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Specialization" required error={errors.specialization?.message}>
              <Input {...register("specialization", { required: true })} placeholder="e.g. Cardiologist" />
            </FormField>
            <FormField label="Department">
              <Select {...register("department")}>
                <option value="">Select department</option>
                {departments.map((d: { _id: string; name: string }) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Experience (years)">
              <Input type="number" {...register("experience", { valueAsNumber: true })} placeholder="0" />
            </FormField>
            <FormField label="Consultation Fee (PKR)" required>
              <Input type="number" {...register("consultationFee", { valueAsNumber: true })} placeholder="0" required />
            </FormField>
          </div>
          <FormField label="Qualifications" hint="Comma separated e.g. MBBS, FCPS">
            <Input {...register("qualifications")} placeholder="MBBS, FCPS, MD" />
          </FormField>
          <FormField label="Bio">
            <textarea
              {...register("bio")}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={activeUsers.length === 0}>Add Doctor</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}