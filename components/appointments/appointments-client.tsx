// components/appointments/appointments-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Plus, Search, Filter, ChevronDown, X } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge, Button,
  Modal, FormField, Input, Select, EmptyState, Pagination, Alert,
} from "@/components/ui";
import { createAppointmentSchema, CreateAppointmentInput } from "@/lib/validations";
import { formatDate, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";

interface Appointment {
  _id: string;
  appointmentId: string;
  patient: { _id: string; firstName: string; lastName: string; patientId: string };
  doctor: { _id: string; user: { firstName: string; lastName: string }; doctorId: string };
  scheduledDate: string;
  scheduledTime: string;
  type: string;
  status: string;
  chiefComplaint?: string;
  consultationFee: number;
  duration: number;
}

const TIME_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM",
];

export function AppointmentsClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("appointments:create");

  const activeFiltersCount = [statusFilter, dateFilter].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", page, search, statusFilter, dateFilter],
    queryFn: () => {
      const params: any = { page, limit: 25 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      return axios.get("/api/appointments", { params }).then((r) => r.data);
    },
  });

  const { data: patientsData } = useQuery({
    queryKey: ["patients-select"],
    queryFn: () => axios.get("/api/publicPatients", { params: { limit: 200 } }).then((r) => r.data),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors-select"],
    queryFn: () => axios.get("/api/doctors", { params: { limit: 100 } }).then((r) => r.data),
  });

  const appointments: Appointment[] = data?.data || [];
  const pagination = data?.pagination;
  const patients = patientsData?.data || [];
  const doctors = doctorsData?.data || [];

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      patient: "", doctor: "", type: "opd", scheduledDate: dateFilter,
      scheduledTime: "", duration: 30, consultationFee: 0, chiefComplaint: "", notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateAppointmentInput) => axios.post("/api/appointments", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setCreateOpen(false);
      reset();
      setCreateError("");
      toast.success("Appointment booked successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create appointment";
      setCreateError(msg);
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Appointments</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {pagination?.total ?? 0} appointment{pagination?.total !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5" /> Book Appointment
          </Button>
        )}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name, doctor name, or ID..."
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
              {statusFilter.replace(/_/g, " ")}
              <button onClick={() => { setStatusFilter(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">
              {dateFilter}
              <button onClick={() => { setDateFilter(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => { setStatusFilter(""); setDateFilter(""); setPage(1); }}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="checked_in">Checked In</option>
                <option value="in_consultation">In Consultation</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={e => { setDateFilter(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Patient</Th>
              <Th>Doctor</Th>
              <Th>Date & Time</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Fee</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="No appointments"
                    description="No appointments found for the selected filters."
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Book Appointment
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              appointments.map((a) => (
                <tr key={a._id}>
                  <Td>
                    <span className="font-medium text-gray-900">{a.appointmentId}</span>
                  </Td>
                  <Td>
                    <Link href={`/patients/${a.patient?._id}`} className="text-gray-900 font-medium">
                      {a.patient?.firstName} {a.patient?.lastName}
                    </Link>
                    <div className="text-xs text-gray-400">{a.patient?.patientId}</div>
                  </Td>
                  <Td>
                    <Link href={`/doctors/${a.doctor?._id}`} className="text-gray-600">
                      Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}
                    </Link>
                  </Td>
                  <Td>
                    <div className="text-gray-600">{formatDate(a.scheduledDate)}</div>
                    <div className="text-xs text-gray-400">{a.scheduledTime} ({a.duration} min)</div>
                  </Td>
                  <Td className="capitalize text-gray-600">{a.type?.replace(/_/g, " ")}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  <Td className="text-gray-600">PKR {a.consultationFee?.toLocaleString()}</Td>
                  <Td>
                    <Link href={`/appointments/${a._id}`}>
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
        ) : appointments.length === 0 ? (
          <EmptyState
            title="No appointments"
            description="No appointments found for the selected filters."
            action={canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Book Appointment
              </Button>
            ) : undefined}
          />
        ) : (
          appointments.map((a) => (
            <div key={a._id} className="flex items-center justify-between p-3 gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">
                    {a.patient?.firstName} {a.patient?.lastName}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {formatDate(a.scheduledDate)} • {a.scheduledTime}
                </div>
              </div>
              <Link href={`/appointments/${a._id}`}>
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
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Book Appointment" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d as any))} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Patient" required error={errors.patient?.message}>
              <Select {...register("patient")} error={!!errors.patient}>
                <option value="">Select patient</option>
                {patients.map((p: { _id: string; firstName: string; lastName: string; patientId: string }) => (
                  <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Doctor" required error={errors.doctor?.message}>
              <Select
                {...register("doctor")}
                error={!!errors.doctor}
                onChange={(e) => {
                  const doctorId = e.target.value;
                  const doctor = doctors.find((d: any) => d._id === doctorId);
                  if (doctor?.consultationFee) setValue("consultationFee", doctor.consultationFee);
                }}
              >
                <option value="">Select doctor</option>
                {doctors.map((d: any) => (
                  <option key={d._id} value={d._id}>Dr. {d.user?.firstName} {d.user?.lastName} ({d.doctorId})</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Date" required error={errors.scheduledDate?.message}>
              <Input type="date" {...register("scheduledDate")} error={!!errors.scheduledDate} />
            </FormField>
            <FormField label="Time" required error={errors.scheduledTime?.message}>
              <Select {...register("scheduledTime")} error={!!errors.scheduledTime}>
                <option value="">Select time</option>
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Duration (mins)">
              <Select {...register("duration", { valueAsNumber: true })}>
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Type">
              <Select {...register("type")}>
                <option value="opd">OPD</option>
                <option value="follow_up">Follow Up</option>
                <option value="emergency">Emergency</option>
                <option value="teleconsultation">Teleconsultation</option>
              </Select>
            </FormField>
            <FormField label="Consultation Fee">
              <Input type="number" {...register("consultationFee", { valueAsNumber: true })} placeholder="0" disabled />
            </FormField>
          </div>
          <FormField label="Chief Complaint">
            <Input {...register("chiefComplaint")} placeholder="Reason for visit..." />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>Book Appointment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}