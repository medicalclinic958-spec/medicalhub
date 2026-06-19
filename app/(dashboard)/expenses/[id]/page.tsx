// app/(dashboard)/expenses/[id]/page.tsx
import { Metadata } from "next";
import { ExpenseDetailClient } from "@/components/expenses/expenses-detail-client";

export const metadata: Metadata = { title: "Expense Details" };

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ExpenseDetailClient expenseId={id} />;
}