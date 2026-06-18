// app/(dashboard)/pharmacy/[id]/page.tsx
import { Metadata } from "next";
import { PharmacyDetailClient } from "@/components/pharmacy/pharmacy-detail-client";

export const metadata: Metadata = { title: "Medicine Details" };

export default async function PharmacyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PharmacyDetailClient medicineId={id} />;
}