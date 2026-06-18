import { Metadata } from "next";
import { OPDClient } from "@/components/emr/opd-client";
export const metadata: Metadata = { title: "OPD / EMR" };
export default function OPDPage() { return <OPDClient />; }
