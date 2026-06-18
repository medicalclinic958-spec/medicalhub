// components/patients/patient-details/prescriptions-tab.tsx
"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Eye } from "lucide-react";
import { Card, Table, Th, Td, StatusBadge, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export function PrescriptionsTab({ patientId }: { patientId: string }) {
    const router = useRouter();

    const { data } = useQuery({
        queryKey: ["patient-prescriptions", patientId],
        queryFn: () => axios.get("/api/prescriptions", { params: { patient: patientId, limit: 50 } }).then(r => r.data),
    });

    return (
        <Card>
            <Table>
                <thead>
                    <tr>
                        <Th>Rx ID</Th>
                        <Th>Doctor</Th>
                        <Th>Medicines</Th>
                        <Th>Type</Th>
                        <Th>Status</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {(data?.data || []).length === 0 ? (
                        <tr>
                            <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                                No prescriptions found
                            </td>
                        </tr>
                    ) : (
                        (data?.data || []).map((rx: any) => (
                            <tr key={rx._id} className="hover:bg-slate-50">
                                <Td>
                                    <span className="font-mono text-xs text-blue-600">{rx.prescriptionId}</span>
                                </Td>
                                <Td>
                                    <div className="font-medium text-slate-700">
                                        Dr. {rx.doctor?.user?.firstName} {rx.doctor?.user?.lastName}
                                    </div>
                                </Td>
                                <Td>
                                    <div className="max-w-[250px]">
                                        {rx.medicines?.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {rx.medicines.slice(0, 2).map((m: any, i: number) => (
                                                    <div key={i} className="text-xs text-slate-600">
                                                        {m.medicineName} — {m.dosage}, {m.frequency}
                                                    </div>
                                                ))}
                                                {rx.medicines.length > 2 && (
                                                    <span className="text-xs text-slate-400">
                                                        +{rx.medicines.length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </div>
                                </Td>
                                <Td>
                                    <Badge variant="outline" className="capitalize">
                                        {rx.type}
                                    </Badge>
                                </Td>
                                <Td><StatusBadge status={rx.status} /></Td>
                                <Td>{formatDate(rx.createdAt)}</Td>
                                <Td>
                                    <button
                                        onClick={() => router.push(`/opd/${rx.emr || rx.appointment}`)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View EMR record"
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