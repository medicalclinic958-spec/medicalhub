// components/patients/patient-details/appointments-tab.tsx
"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Card, Table, Th, Td, StatusBadge } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function AppointmentsTab({ patientId }: { patientId: string }) {
    const router = useRouter();

    const { data } = useQuery({
        queryKey: ["patient-appointments", patientId],
        queryFn: () => axios.get("/api/appointments", { params: { patient: patientId, limit: 50 } }).then(r => r.data),
    });

    return (
        <Card>
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
                    {(data?.data || []).length === 0 ? (
                        <tr>
                            <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                                No appointments found
                            </td>
                        </tr>
                    ) : (
                        (data?.data || []).map((a: any) => (
                            <tr key={a._id} className="hover:bg-slate-50">
                                <Td>
                                    <span className="font-mono text-xs text-blue-600">{a.appointmentId}</span>
                                </Td>
                                <Td>Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}</Td>
                                <Td>{formatDate(a.scheduledDate)}</Td>
                                <Td>{a.scheduledTime}</Td>
                                <Td className="capitalize">{a.type?.replace(/_/g, " ")}</Td>
                                <Td><StatusBadge status={a.status} /></Td>
                                <Td>{formatCurrency(a.consultationFee)}</Td>
                                <Td>
                                    <button
                                        onClick={() => router.push(`/appointments/${a._id}`)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View appointment"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </Td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>
        </Card>
    );
}