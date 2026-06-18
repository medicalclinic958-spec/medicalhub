import { Metadata } from "next";
import { AppointmentDetailClient } from "@/components/appointments/appointment-detail-client";

export const metadata: Metadata = { title: "Appointment Details" };

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <AppointmentDetailClient appointmentId={id} />;
}