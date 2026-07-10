// components/patients/patient-details/billing-tab.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Card, Table, Th, Td, StatusBadge, Button, EmptyState } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";

export function BillingTab({ patientId }: { patientId: string }) {
    const router = useRouter();

    const { data } = useQuery({
        queryKey: ["patient-invoices", patientId],
        queryFn: () => axios.get("/api/billing", { params: { patient: patientId, limit: 50 } }).then(r => r.data),
    });

    const invoices = data?.data || [];

    return (
        <>
            {/* Desktop Table */}
            <Card className="hidden md:block overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <Th>Invoice #</Th>
                            <Th>Total</Th>
                            <Th>Paid</Th>
                            <Th>Balance</Th>
                            <Th>Status</Th>
                            <Th>Date</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <EmptyState
                                        title="No invoices found"
                                        description="No billing records for this patient."
                                    />
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv: any) => (
                                <tr key={inv._id}>
                                    <Td>
                                        <span className="font-medium text-gray-900">{inv.invoiceNumber}</span>
                                    </Td>
                                    <Td className="text-gray-600">{formatCurrency(inv.total)}</Td>
                                    <Td className="text-teal-600">{formatCurrency(inv.paidAmount)}</Td>
                                    <Td className={inv.balanceDue > 0 ? "text-red-500 font-medium" : "text-gray-400"}>
                                        {formatCurrency(inv.balanceDue)}
                                    </Td>
                                    <Td><StatusBadge status={inv.status} /></Td>
                                    <Td className="text-gray-400">{formatDate(inv.createdAt)}</Td>
                                    <Td>
                                        <Button size="sm" onClick={() => router.push(`/billing/${inv._id}`)}>
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
                {invoices.length === 0 ? (
                    <EmptyState
                        title="No invoices found"
                        description="No billing records for this patient."
                    />
                ) : (
                    invoices.map((inv: any) => (
                        <div key={inv._id} className="flex items-center justify-between p-3 gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-900">{inv.invoiceNumber}</span>
                                    <StatusBadge status={inv.status} />
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-600">{formatCurrency(inv.total)}</span>
                                    {inv.balanceDue > 0 && (
                                        <span className="text-xs text-red-500 font-medium">
                                            Due: {formatCurrency(inv.balanceDue)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Button size="sm" onClick={() => router.push(`/billing/${inv._id}`)}>
                                View
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}