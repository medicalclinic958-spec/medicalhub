import { Metadata } from "next";
import { LabClient } from "@/components/lab/lab-client";
export const metadata: Metadata = { title: "Laboratory" };
export default function LabPage() { return <LabClient />; }
