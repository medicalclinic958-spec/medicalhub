// components/patients/patients-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Search, Plus, Filter, ChevronDown, X } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge,
  Button, Modal, FormField, Input, Select, EmptyState,
  Pagination, Badge, Alert,
} from "@/components/ui";
import { createPatientSchema, CreatePatientInput } from "@/lib/validations";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Patient {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  bloodGroup?: string;
  status: string;
  createdAt: string;
}

export function PatientsClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("patients:create");

  const activeFiltersCount = [statusFilter].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["patients", page, search, statusFilter],
    queryFn: () =>
      axios
        .get("/api/patients", { params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined } })
        .then((r) => r.data),
  });

  const patients: Patient[] = data?.data || [];
  const pagination = data?.pagination;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePatientInput>({ resolver: zodResolver(createPatientSchema) });

  const createMutation = useMutation({
    mutationFn: (d: CreatePatientInput) => {
      const cleanedData = { ...d };
      if (cleanedData.allergies?.length === 0) delete cleanedData.allergies;
      if (cleanedData.chronicDiseases?.length === 0) delete cleanedData.chronicDiseases;
      if (cleanedData.emergencyContact && !Object.values(cleanedData.emergencyContact).some(v => v)) delete cleanedData.emergencyContact;
      if (cleanedData.insuranceDetails && !Object.values(cleanedData.insuranceDetails).some(v => v)) delete cleanedData.insuranceDetails;
      if (cleanedData.address && !Object.values(cleanedData.address).some(v => v && v !== "")) delete cleanedData.address;
      if (!cleanedData.bloodGroup) delete cleanedData.bloodGroup;
      return axios.post("/api/patients", cleanedData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      setCreateOpen(false);
      reset();
      setCreateError("");
      toast.success("Patient created successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create patient";
      setCreateError(msg);
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Patients</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {pagination?.total ?? 0} patient{pagination?.total !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Patient
          </Button>
        )}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or ID..."
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
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700 capitalize">
              {statusFilter}
              <button onClick={() => { setStatusFilter(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className="text-xs text-gray-400 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deceased">Deceased</option>
            </Select>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Patient ID</Th>
              <Th>Name</Th>
              <Th>Gender</Th>
              <Th>DOB</Th>
              <Th>Phone</Th>
              <Th>Blood</Th>
              <Th>Status</Th>
              <Th>Registered</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No patients found"
                    description={search ? `No results for "${search}"` : "Add your first patient to get started."}
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Add Patient
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p._id}>
                  <Td>
                    <span className="font-medium text-gray-900">{p.patientId}</span>
                  </Td>
                  <Td>
                    <div className="font-medium text-gray-900">{p.fullName || `${p.firstName} ${p.lastName}`}</div>
                  </Td>
                  <Td className="capitalize text-gray-600">{p.gender}</Td>
                  <Td className="text-gray-500">{p.dateOfBirth ? formatDate(p.dateOfBirth) : "—"}</Td>
                  <Td className="text-gray-600">{p.phone}</Td>
                  <Td>
                    {p.bloodGroup ? <Badge variant="outline">{p.bloodGroup}</Badge> : <span className="text-gray-300">—</span>}
                  </Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td className="text-gray-400">{formatDate(p.createdAt)}</Td>
                  <Td>
                    <Link href={`/patients/${p._id}`}>
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
                <div className="h-4 bg-gray-100 rounded w-28" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
              <div className="h-7 bg-gray-100 rounded w-14" />
            </div>
          ))
        ) : patients.length === 0 ? (
          <EmptyState
            title="No patients found"
            description={search ? `No results for "${search}"` : "Add your first patient."}
            action={canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Patient
              </Button>
            ) : undefined}
          />
        ) : (
          patients.map((p) => (
            <div key={p._id} className="flex items-center justify-between p-3 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">
                    {p.fullName || `${p.firstName} ${p.lastName}`}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{p.patientId}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{p.phone}</span>
                </div>
              </div>
              <Link href={`/patients/${p._id}`}>
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

      {/* Create Patient Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="New Patient" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName?.message}>
              <Input {...register("firstName")} error={!!errors.firstName} placeholder="John" />
            </FormField>
            <FormField label="Last Name" required error={errors.lastName?.message}>
              <Input {...register("lastName")} error={!!errors.lastName} placeholder="Smith" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Gender" required error={errors.gender?.message}>
              <Select {...register("gender")} error={!!errors.gender}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
            <FormField label="Date of Birth" required error={errors.dateOfBirth?.message}>
              <Input type="date" {...register("dateOfBirth")} error={!!errors.dateOfBirth} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Phone" required error={errors.phone?.message}>
              <Input {...register("phone")} error={!!errors.phone} placeholder="+92 300 1234567" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} error={!!errors.email} placeholder="patient@email.com" />
            </FormField>
          </div>

          <FormField label="Blood Group">
            <Select {...register("bloodGroup")}>
              <option value="">Unknown</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </Select>
          </FormField>

          {/* Address */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-semibold text-gray-900 mb-3">Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Street">
                <Input {...register("address.street")} placeholder="Street address" />
              </FormField>
              <FormField label="City">
                <Input {...register("address.city")} placeholder="City" />
              </FormField>
              <FormField label="State">
                <Input {...register("address.state")} placeholder="State/Province" />
              </FormField>
              <FormField label="Country">
                <Input {...register("address.country")} placeholder="Country" />
              </FormField>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-semibold text-gray-900 mb-3">Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name">
                <Input {...register("emergencyContact.name")} placeholder="Full name" />
              </FormField>
              <FormField label="Relationship">
                <Input {...register("emergencyContact.relationship")} placeholder="e.g., Spouse, Parent" />
              </FormField>
              <FormField label="Phone">
                <Input {...register("emergencyContact.phone")} placeholder="Emergency phone number" />
              </FormField>
            </div>
          </div>

          {/* Medical Information */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-semibold text-gray-900 mb-3">Medical Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Allergies (comma-separated)">
                <Input
                  defaultValue={watch("allergies")?.join(", ") || ""}
                  onBlur={(e) => {
                    const val = e.target.value;
                    setValue("allergies", val.split(",").map(s => s.trim()).filter(Boolean));
                  }}
                  placeholder="e.g., Penicillin, Nuts"
                />
              </FormField>
              <FormField label="Chronic Diseases (comma-separated)">
                <Input
                  defaultValue={watch("chronicDiseases")?.join(", ") || ""}
                  onBlur={(e) => {
                    const val = e.target.value;
                    setValue("chronicDiseases", val.split(",").map(s => s.trim()).filter(Boolean));
                  }}
                  placeholder="e.g., Diabetes, Hypertension"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <FormField label="Insurance Provider">
                <Input {...register("insuranceDetails.provider")} placeholder="Insurance company" />
              </FormField>
              <FormField label="Policy Number">
                <Input {...register("insuranceDetails.policyNumber")} placeholder="Policy number" />
              </FormField>
              <FormField label="Expiry Date">
                <Input type="date" {...register("insuranceDetails.expiryDate")} />
              </FormField>
              <FormField label="Coverage Details">
                <Input {...register("insuranceDetails.coverageDetails")} placeholder="Coverage details" />
              </FormField>
            </div>
          </div>

          {/* Notes */}
          <FormField label="Notes">
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Any relevant notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); setCreateError(""); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>Create Patient</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}