// components/patients/patient-details/appointments-tab.tsx
"use client";

import { useRouter } from "next/navigation";
import { Card, Table, Th, Td, StatusBadge, Button, EmptyState } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function AppointmentsTab({ patientId }: { patientId: string }) {
    const router = useRouter();

    const { data } = useQuery({
        queryKey: ["patient-appointments", patientId],
        queryFn: () => axios.get("/api/appointments", { params: { patient: patientId, limit: 50 } }).then(r => r.data),
    });

    const appointments = data?.data || [];

    return (
        <>
            {/* Desktop Table */}
            <Card className="hidden md:block overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <Th>ID</Th>
                            <Th>Doctor</Th>
                            <Th>Date</Th>
                            <Th>Time</Th>
                            <Th>Type</Th>
                            <Th>Status</Th>
                            <Th>Fee</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <EmptyState
                                        title="No appointments found"
                                        description="No appointments have been scheduled for this patient."
                                    />
                                </td>
                            </tr>
                        ) : (
                            appointments.map((a: any) => (
                                <tr key={a._id}>
                                    <Td>
                                        <span className="font-medium text-gray-900">{a.appointmentId}</span>
                                    </Td>
                                    <Td className="text-gray-600">Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}</Td>
                                    <Td className="text-gray-600">{formatDate(a.scheduledDate)}</Td>
                                    <Td className="text-gray-600">{a.scheduledTime}</Td>
                                    <Td className="capitalize text-gray-600">{a.type?.replace(/_/g, " ")}</Td>
                                    <Td><StatusBadge status={a.status} /></Td>
                                    <Td className="text-gray-600">{formatCurrency(a.consultationFee)}</Td>
                                    <Td>
                                        <Button size="sm" onClick={() => router.push(`/appointments/${a._id}`)}>
                                            View
                                        </Button>
                                    </Td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
                {appointments.length === 0 ? (
                    <EmptyState
                        title="No appointments found"
                        description="No appointments have been scheduled for this patient."
                    />
                ) : (
                    appointments.map((a: any) => (
                        <div key={a._id} className="flex items-center justify-between p-3 gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-900">{a.appointmentId}</span>
                                    <StatusBadge status={a.status} />
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500">
                                        Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-400">
                                        {formatDate(a.scheduledDate)} • {a.scheduledTime}
                                    </span>
                                    <span className="text-xs text-gray-500">{formatCurrency(a.consultationFee)}</span>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => router.push(`/appointments/${a._id}`)}>
                                View
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}