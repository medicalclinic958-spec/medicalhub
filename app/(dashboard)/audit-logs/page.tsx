import { Metadata } from "next";
import { AuditLogsClient } from "@/components/audit/audit-logs-client";
export const metadata: Metadata = { title: "Audit Logs" };
export default function AuditLogsPage() { return <AuditLogsClient />; }
