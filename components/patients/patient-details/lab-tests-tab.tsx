// components/patients/patient-details/lab-tests-tab.tsx
"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Eye } from "lucide-react";
import { Card, Table, Th, Td, StatusBadge, Badge } from "@/components/ui";
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

    const handleClick = (labTest: any) => {
        if (canViewDetail) {
            router.push(`/lab/${labTest._id}?tab=report`);
        } else {
            router.push(`/reports/${labTest._id}`);
        }
    };

    return (
        <Card>
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
                    {(data?.data || []).length === 0 ? (
                        <tr>
                            <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                                No lab tests found
                            </td>
                        </tr>
                    ) : (
                        (data?.data || []).map((l: any) => (
                            <tr key={l._id} className="hover:bg-slate-50">
                                <Td>
                                    <span className="font-mono text-xs text-blue-600">{l.labTestId}</span>
                                </Td>
                                <Td className="max-w-[200px] truncate">
                                    {l.tests?.map((t: any) => t.testName).join(", ")}
                                </Td>
                                <Td>
                                    <Badge variant={l.priority === "stat" ? "danger" : l.priority === "urgent" ? "warning" : "default"}>
                                        {l.priority}
                                    </Badge>
                                </Td>
                                <Td><StatusBadge status={l.status} /></Td>
                                <Td>{formatCurrency(l.totalCost)}</Td>
                                <Td>{formatDate(l.createdAt)}</Td>
                                <Td>
                                    <button
                                        onClick={() => handleClick(l)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title={canViewDetail ? "View details" : "View report"}
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