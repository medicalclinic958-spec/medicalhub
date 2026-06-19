// app/(dashboard)/inventory/[id]/page.tsx
import { Metadata } from "next";
import { InventoryDetailClient } from "@/components/inventory/inventory-detail-clinet";

export const metadata: Metadata = { title: "Inventory Details" };

export default async function page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <InventoryDetailClient itemId={id} />;
}