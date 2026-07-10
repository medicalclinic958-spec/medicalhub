// components/patients/patient-details/prescriptions-tab.tsx
"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, Table, Th, Td, StatusBadge, Badge, Button, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export function PrescriptionsTab({ patientId }: { patientId: string }) {
    const router = useRouter();

    const { data } = useQuery({
        queryKey: ["patient-prescriptions", patientId],
        queryFn: () => axios.get("/api/prescriptions", { params: { patient: patientId, limit: 50 } }).then(r => r.data),
    });

    const prescriptions = data?.data || [];

    return (
        <>
            {/* Desktop Table */}
            <Card className="hidden md:block overflow-x-auto">
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
                        {prescriptions.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <EmptyState
                                        title="No prescriptions found"
                                        description="No prescriptions have been recorded for this patient."
                                    />
                                </td>
                            </tr>
                        ) : (
                            prescriptions.map((rx: any) => (
                                <tr key={rx._id}>
                                    <Td>
                                        <span className="font-medium text-gray-900">{rx.prescriptionId}</span>
                                    </Td>
                                    <Td className="text-gray-600">
                                        Dr. {rx.doctor?.user?.firstName} {rx.doctor?.user?.lastName}
                                    </Td>
                                    <Td>
                                        <div className="max-w-[250px]">
                                            {rx.medicines?.length > 0 ? (
                                                <div className="space-y-0.5">
                                                    {rx.medicines.slice(0, 2).map((m: any, i: number) => (
                                                        <div key={i} className="text-xs text-gray-600">
                                                            {m.medicineName} — {m.dosage}, {m.frequency}
                                                        </div>
                                                    ))}
                                                    {rx.medicines.length > 2 && (
                                                        <span className="text-xs text-gray-400">
                                                            +{rx.medicines.length - 2} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </div>
                                    </Td>
                                    <Td>
                                        <Badge variant="outline" className="capitalize">{rx.type}</Badge>
                                    </Td>
                                    <Td><StatusBadge status={rx.status} /></Td>
                                    <Td className="text-gray-400">{formatDate(rx.createdAt)}</Td>
                                    <Td>
                                        <Button size="sm" onClick={() => router.push(`/opd/${rx.emr || rx.appointment}`)}>
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
                {prescriptions.length === 0 ? (
                    <EmptyState
                        title="No prescriptions found"
                        description="No prescriptions have been recorded for this patient."
                    />
                ) : (
                    prescriptions.map((rx: any) => (
                        <div key={rx._id} className="flex items-center justify-between p-3 gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-900">{rx.prescriptionId}</span>
                                    <StatusBadge status={rx.status} />
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="capitalize">{rx.type}</Badge>
                                    <span className="text-xs text-gray-500">
                                        Dr. {rx.doctor?.user?.firstName} {rx.doctor?.user?.lastName}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    {rx.medicines?.length || 0} medicine{(rx.medicines?.length || 0) !== 1 ? "s" : ""}
                                </div>
                            </div>
                            <Button size="sm" onClick={() => router.push(`/opd/${rx.emr || rx.appointment}`)}>
                                View
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}