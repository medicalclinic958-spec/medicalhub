import { Metadata } from "next";
import { StaffClient } from "@/components/staff/staff-client";
export const metadata: Metadata = { title: "Staff" };
export default function StaffPage() { return <StaffClient />; }
