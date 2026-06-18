"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Search, Plus, Eye, Edit2, Filter } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, StatusBadge,
  Button, Modal, FormField, Input, Select, EmptyState,
  Pagination, Badge, Alert,
} from "@/components/ui";
import { createPatientSchema, CreatePatientInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";

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

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("patients:create");


  const { data, isLoading } = useQuery({
    queryKey: ["patients", page, search, statusFilter],
    queryFn: () =>
      axios
        .get("/api/patients", { params: { page, limit: 20, search, status: statusFilter } })
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

      // Remove empty arrays
      if (cleanedData.allergies?.length === 0) delete cleanedData.allergies;
      if (cleanedData.chronicDiseases?.length === 0) delete cleanedData.chronicDiseases;

      // Remove empty nested objects
      if (cleanedData.emergencyContact && !Object.values(cleanedData.emergencyContact).some(v => v)) {
        delete cleanedData.emergencyContact;
      }

      if (cleanedData.insuranceDetails && !Object.values(cleanedData.insuranceDetails).some(v => v)) {
        delete cleanedData.insuranceDetails;
      }

      if (cleanedData.address && !Object.values(cleanedData.address).some(v => v && v !== "")) {
        delete cleanedData.address;
      }

      // Remove empty bloodGroup
      if (!cleanedData.bloodGroup) delete cleanedData.bloodGroup;

      return axios.post("/api/patients", cleanedData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      setCreateOpen(false);
      reset();
      setCreateError("");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create patient";
      setCreateError(msg);
    },
  });

  const allergiesValue = watch("allergies") || [];
  const chronicDiseasesValue = watch("chronicDiseases") || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Patients</h1>
          <p className="text-sm text-slate-500">
            {pagination?.total ?? 0} total patients
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Patient
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search name, phone, ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="deceased">Deceased</option>
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
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
                    <Td key={j}>
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </Td>
                  ))}
                </tr>
              ))
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No patients found"
                    description={search ? `No results for "${search}"` : "Add your first patient to get started."}
                    action={
                      canCreate ? (
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                          <Plus className="w-3.5 h-3.5" /> Add Patient
                        </Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                  <Td>
                    <span className="font-mono text-xs font-semibold text-blue-600">
                      {p.patientId}
                    </span>
                  </Td>
                  <Td>
                    <div className="font-medium text-slate-800">{p.fullName || `${p.firstName} ${p.lastName}`}</div>
                  </Td>
                  <Td className="capitalize">{p.gender}</Td>
                  <Td>{p.dateOfBirth ? formatDate(p.dateOfBirth) : "—"}</Td>
                  <Td>{p.phone}</Td>
                  <Td>
                    {p.bloodGroup ? (
                      <Badge variant="info">{p.bloodGroup}</Badge>
                    ) : "—"}
                  </Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td className="text-slate-400">{formatDate(p.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Link href={`/patients/${p._id}`}>
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>
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

      {/* Create Patient Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="New Patient" size="lg">
        {createError && (
          <div className="mb-4">
            <Alert type="error">{createError}</Alert>
          </div>
        )}
        <form onSubmit={handleSubmit((d) => {
          console.log(d)
          return createMutation.mutate(d)
        })} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName?.message}>
              <Input {...register("firstName")} error={!!errors.firstName} placeholder="John" />
            </FormField>
            <FormField label="Last Name" required error={errors.lastName?.message}>
              <Input {...register("lastName")} error={!!errors.lastName} placeholder="Smith" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone" required error={errors.phone?.message}>
              <Input {...register("phone")} error={!!errors.phone} placeholder="+92 300 1234567" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} error={!!errors.email} placeholder="patient@email.com" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Blood Group" error={errors.bloodGroup?.message}>
              <Select {...register("bloodGroup")}>
                <option value="">Unknown</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Address Section */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-medium text-slate-700 mb-3">Address</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Street" error={errors.address?.street?.message}>
                <Input {...register("address.street")} placeholder="Street address" />
              </FormField>
              <FormField label="City" error={errors.address?.city?.message}>
                <Input {...register("address.city")} placeholder="City" />
              </FormField>
              <FormField label="State" error={errors.address?.state?.message}>
                <Input {...register("address.state")} placeholder="State/Province" />
              </FormField>
              <FormField label="Country" error={errors.address?.country?.message}>
                <Input {...register("address.country")} placeholder="Country" />
              </FormField>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-medium text-slate-700 mb-3">Emergency Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Name" error={errors.emergencyContact?.name?.message}>
                <Input {...register("emergencyContact.name")} placeholder="Full name" />
              </FormField>
              <FormField label="Relationship">
                <Input {...register("emergencyContact.relationship")} placeholder="e.g., Spouse, Parent" />
              </FormField>
              <FormField label="Phone" error={errors.emergencyContact?.phone?.message}>
                <Input {...register("emergencyContact.phone")} placeholder="Emergency phone number" />
              </FormField>
            </div>
          </div>

          {/* Medical Information */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-medium text-slate-700 mb-3">Medical Information</h4>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4 mt-4">
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
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Any relevant notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); setCreateError(""); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Patient
            </Button>
          </div>
        </form>
      </Modal>
    </div >
  );
}