// app/(dashboard)/suppliers/[id]/page.tsx
import { Metadata } from "next";
import { SupplierDetailClient } from "@/components/supplier/supplier-detail-client";

export const metadata: Metadata = { title: "Supplier Details" };

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <SupplierDetailClient supplierId={id} />;
}