// components/patients/patient-details/lab-tests-tab.tsx
"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, Table, Th, Td, StatusBadge, Badge, Button, EmptyState } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

export function LabTestsTab({ patientId }: { patientId: string }) {
    const router = useRouter();
    const { data: session } = useSession();

    const isSA = session?.user?.isSuperAdmin;
    const perms = session?.user?.permissions || [];
    const canViewDetail = isSA || perms.includes("lab:view");

    const { data } = useQuery({
        queryKey: ["patient-lab", patientId],
        queryFn: () => axios.get("/api/lab", { params: { patient: patientId, limit: 50 } }).then(r => r.data),
    });

    const labTests = data?.data || [];

    const handleClick = (labTest: any) => {
        if (canViewDetail) {
            router.push(`/lab/${labTest._id}?tab=report`);
        } else {
            router.push(`/reports/${labTest._id}`);
        }
    };

    return (
        <>
            {/* Desktop Table */}
            <Card className="hidden md:block overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <Th>Lab ID</Th>
                            <Th>Tests</Th>
                            <Th>Priority</Th>
                            <Th>Status</Th>
                            <Th>Cost</Th>
                            <Th>Date</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {labTests.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <EmptyState
                                        title="No lab tests found"
                                        description="No laboratory tests have been recorded for this patient."
                                    />
                                </td>
                            </tr>
                        ) : (
                            labTests.map((l: any) => (
                                <tr key={l._id}>
                                    <Td>
                                        <span className="font-medium text-gray-900">{l.labTestId}</span>
                                    </Td>
                                    <Td className="max-w-[200px] truncate text-gray-600">
                                        {l.tests?.map((t: any) => t.testName).join(", ")}
                                    </Td>
                                    <Td>
                                        <Badge variant={l.priority === "stat" ? "danger" : l.priority === "urgent" ? "warning" : "default"}>
                                            {l.priority}
                                        </Badge>
                                    </Td>
                                    <Td><StatusBadge status={l.status} /></Td>
                                    <Td className="text-gray-600">{formatCurrency(l.totalCost)}</Td>
                                    <Td className="text-gray-400">{formatDate(l.createdAt)}</Td>
                                    <Td>
                                        <Button size="sm" onClick={() => handleClick(l)}>
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
                {labTests.length === 0 ? (
                    <EmptyState
                        title="No lab tests found"
                        description="No laboratory tests have been recorded for this patient."
                    />
                ) : (
                    labTests.map((l: any) => (
                        <div key={l._id} className="flex items-center justify-between p-3 gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-900">{l.labTestId}</span>
                                    <StatusBadge status={l.status} />
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant={l.priority === "stat" ? "danger" : l.priority === "urgent" ? "warning" : "default"}>
                                        {l.priority}
                                    </Badge>
                                    <span className="text-xs text-gray-500">{formatCurrency(l.totalCost)}</span>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => handleClick(l)}>
                                View
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}