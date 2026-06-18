import { Metadata } from "next";
import { PatientDetailClient } from "@/components/patients/patient-detail-client";

export const metadata: Metadata = { title: "Patient Profile" };

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetailClient patientId={id} />;
}
