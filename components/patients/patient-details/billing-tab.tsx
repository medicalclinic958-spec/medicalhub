"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, Table, Th, Td, StatusBadge } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";

export function BillingTab({ patientId }: { patientId: string }) {
    const { data } = useQuery({
        queryKey: ["patient-invoices", patientId],
        queryFn: () => axios.get("/api/billing", { params: { patient: patientId, limit: 50 } }).then(r => r.data),
    });

    return (
        <Card>
            <Table>
                <thead>
                    <tr><Th>Invoice #</Th><Th>Total</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th><Th>Date</Th></tr>
                </thead>
                <tbody>
                    {(data?.data || []).length === 0 ? (
                        <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No invoices found</td></tr>
                    ) : (data?.data || []).map((inv: any) => (
                        <tr key={inv._id}>
                            <Td><span className="font-mono text-xs text-blue-600">{inv.invoiceNumber}</span></Td>
                            <Td>{formatCurrency(inv.total)}</Td>
                            <Td className="text-emerald-600">{formatCurrency(inv.paidAmount)}</Td>
                            <Td className={inv.balanceDue > 0 ? "text-red-500 font-medium" : "text-slate-400"}>{formatCurrency(inv.balanceDue)}</Td>
                            <Td><StatusBadge status={inv.status} /></Td>
                            <Td>{formatDate(inv.createdAt)}</Td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Card>
    );
}