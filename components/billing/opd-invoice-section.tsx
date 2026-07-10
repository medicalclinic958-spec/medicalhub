// components/billing/opd-invoice-section.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardBody, FormField, Select, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { UseFormSetValue } from "react-hook-form";

interface LineItem {
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    total: number;
    medicine?: string;
}

interface Props {
    selectedDoctor: string;
    setSelectedDoctor: (v: string) => void;
    selectedPatient: string;
    setSelectedPatient: (v: string) => void;
    watchedItems: LineItem[];
    setValue: UseFormSetValue<any>;
}

export function OpdInvoiceSection({ selectedDoctor, setSelectedDoctor, selectedPatient, setSelectedPatient, watchedItems, setValue }: Props) {
    const { data: patientsData } = useQuery({
        queryKey: ["patients-select"],
        queryFn: () => axios.get("/api/publicPatients", { params: { limit: 200 } }).then(r => r.data),
    });

    const { data: doctorsData } = useQuery({
        queryKey: ["doctors-select"],
        queryFn: () => axios.get("/api/doctors", { params: { limit: 100 } }).then(r => r.data),
    });

    const { data: appointmentsData } = useQuery({
        queryKey: ["appointments-doctor-patient", selectedDoctor, selectedPatient],
        queryFn: () => axios.get("/api/appointments", {
            params: { doctor: selectedDoctor, patient: selectedPatient, status: "scheduled,checked_in,in_consultation,completed", limit: 50 }
        }).then(r => r.data),
        enabled: !!selectedDoctor && !!selectedPatient,
    });

    const patients = patientsData?.data || [];
    const doctors = doctorsData?.data || [];
    const appointments = appointmentsData?.data || [];

    const addAppointmentItem = (appointment: any) => {
        const item: LineItem = {
            description: `Consultation - Dr. ${appointment.doctor?.user?.firstName} ${appointment.doctor?.user?.lastName}`,
            category: "consultation",
            quantity: 1,
            unitPrice: appointment.consultationFee,
            total: appointment.consultationFee,
        };
        setValue("items", [...watchedItems, item]);
    };

    return (
        <Card>
            <CardBody>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">OPD Details</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Doctor" required>
                            <Select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
                                <option value="">Select doctor</option>
                                {doctors.map((d: any) => (
                                    <option key={d._id} value={d._id}>
                                        Dr. {d.user?.firstName} {d.user?.lastName} ({d.specialization})
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                        <FormField label="Patient" required>
                            <Select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
                                <option value="">Select patient</option>
                                {patients.map((p: any) => (
                                    <option key={p._id} value={p._id}>
                                        {p.firstName} {p.lastName} ({p.patientId})
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                    </div>

                    {selectedDoctor && selectedPatient && (
                        <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">Appointments</p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {appointments.map((apt: any) => (
                                    <div
                                        key={apt._id}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer"
                                        onClick={() => addAppointmentItem(apt)}
                                    >
                                        <div>
                                            <p className="text-xs font-medium text-gray-900">
                                                {new Date(apt.scheduledDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} at {apt.scheduledTime}
                                            </p>
                                            <p className="text-xs text-gray-400">{apt.appointmentId}</p>
                                        </div>
                                        <Badge variant="outline">{formatCurrency(apt.consultationFee)}</Badge>
                                    </div>
                                ))}
                                {appointments.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">No appointments found</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}