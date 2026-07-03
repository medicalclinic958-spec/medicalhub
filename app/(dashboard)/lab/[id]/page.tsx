// app/dashboard/lab/[id]/page.tsx
import { Metadata } from "next";
import { LabDetailClient } from "@/components/lab/lab-detail-client";
import { Suspense } from "react";
import Loading from "@/components/Loading";

export const metadata: Metadata = { title: "Lab Test Details" };

export default function LabDetailPage() {
    return (
        <Suspense fallback={<Loading />}>
            <LabDetailClient />
        </Suspense>
    );
}