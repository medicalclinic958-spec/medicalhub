import { Metadata } from "next";
import { PatientDetailClient } from "@/components/patients/patient-detail-client";
import { Suspense } from "react";
import Loading from "@/components/Loading";

export const metadata: Metadata = { title: "Patient Profile" };

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <PatientDetailClient patientId={id} />
    </Suspense>
  );
}
