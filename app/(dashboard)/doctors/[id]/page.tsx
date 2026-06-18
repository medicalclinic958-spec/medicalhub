import { Metadata } from "next";
import { DoctorDetailClient } from "@/components/doctors/doctor-detail-client";

export const metadata: Metadata = { title: "Doctor Profile" };

export default async function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoctorDetailClient doctorId={id} />;
}