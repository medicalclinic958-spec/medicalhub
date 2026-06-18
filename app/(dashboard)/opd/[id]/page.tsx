import { Metadata } from "next";
import { EMRDetailClient } from "@/components/emr/emr-detail-client";

export const metadata: Metadata = { title: "EMR Record Details" };

export default async function EMRDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <EMRDetailClient emrId={id} />;
}