// app/dashboard/lab/[id]/page.tsx
import { Metadata } from "next";
import { LabDetailClient } from "@/components/lab/lab-detail-client";

export const metadata: Metadata = { title: "Lab Test Details" };

export default function LabDetailPage() {
    return <LabDetailClient />;
}