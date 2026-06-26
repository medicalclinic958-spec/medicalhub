"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Plus, Calendar, Filter, Eye } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, StatusBadge, Button,
  Modal, FormField, Input, Select, EmptyState, Pagination, Alert,
} from "@/components/ui";
import { createAppointmentSchema, CreateAppointmentInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";

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
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canCreate = isSA || perms.includes("appointments:create");

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", page, statusFilter, dateFilter],
    queryFn: () => {
      const params: any = { page, limit: 25, status: statusFilter };
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
      patient: "",
      doctor: "",
      type: "opd",
      scheduledDate: dateFilter,
      scheduledTime: "",
      duration: 30,
      consultationFee: 0,
      chiefComplaint: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateAppointmentInput) => axios.post("/api/appointments", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setCreateOpen(false);
      reset();
      setCreateError("");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create appointment";
      setCreateError(msg);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Appointments</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} appointments</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Book Appointment
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-44"
              >
                <option value="">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="checked_in">Checked In</option>
                <option value="in_consultation">In Consultation</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
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
                    <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>
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
                <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                  <Td><span className="font-mono text-xs font-semibold text-blue-600">{a.appointmentId}</span></Td>
                  <Td>
                    <Link href={`/patients/${a.patient?._id}`}>
                      <div className="font-medium text-slate-800 hover:text-blue-600 transition-colors cursor-pointer">
                        {a.patient?.firstName} {a.patient?.lastName}
                      </div>
                    </Link>
                    <div className="text-xs text-slate-400">{a.patient?.patientId}</div>
                  </Td>
                  <Td>
                    <Link href={`/doctors/${a.doctor?._id}`}>
                      <div className="text-slate-700 hover:text-blue-600 transition-colors cursor-pointer">
                        Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}
                      </div>
                    </Link>
                  </Td>
                  <Td>
                    <div className="text-slate-700">{formatDate(a.scheduledDate)}</div>
                    <div className="text-xs text-slate-400">{a.scheduledTime} ({a.duration} min)</div>
                  </Td>
                  <Td className="capitalize">{a.type?.replace(/_/g, " ")}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  <Td>PKR {a.consultationFee?.toLocaleString()}</Td>
                  <Td>
                    <Link href={`/appointments/${a._id}`}>
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

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Book Appointment" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d as any))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Patient" required error={errors.patient?.message}>
              <Select {...register("patient")} error={!!errors.patient}>
                <option value="">Select patient</option>
                {patients.map((p: { _id: string; firstName: string; lastName: string; patientId: string }) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} ({p.patientId})
                  </option>
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
                  if (doctor?.consultationFee) {
                    setValue("consultationFee", doctor.consultationFee);
                  }
                }}
              >
                <option value="">Select doctor</option>
                {doctors.map((d: { _id: string; user: { firstName: string; lastName: string }; doctorId: string; consultationFee?: number }) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.user?.firstName} {d.user?.lastName} ({d.doctorId})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Date" required error={errors.scheduledDate?.message}>
              <Input type="date" {...register("scheduledDate")} error={!!errors.scheduledDate} />
            </FormField>
            <FormField label="Time" required error={errors.scheduledTime?.message}>
              <Select {...register("scheduledTime")} error={!!errors.scheduledTime}>
                <option value="">Select time</option>
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Duration (mins)" error={errors.duration?.message}>
              <Select {...register("duration", { valueAsNumber: true })}>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={25}>25 min</option>
                <option value={30}>30 min</option>
                <option value={35}>35 min</option>
                <option value={40}>40 min</option>
                <option value={45}>45 min</option>
                <option value={50}>50 min</option>
                <option value={55}>55 min</option>
                <option value={60}>60 min</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" error={errors.type?.message}>
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
          <FormField label="Chief Complaint" error={errors.chiefComplaint?.message}>
            <Input {...register("chiefComplaint")} placeholder="Reason for visit..." />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Book Appointment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}