import { NEXT_PUBLIC_CLINIC_NAME } from "@/constants/ClinicDetails";

export type DeveloperReportSeverity = "low" | "medium" | "high" | "critical";

export interface SendDeveloperReportInput {
  title: string;
  message: string;
  severity: DeveloperReportSeverity;
  source?: string;
  stack?: string;
  meta?: Record<string, unknown>;
}

export async function sendDeveloperReport(input: SendDeveloperReportInput) {
  const url = process.env.REPORT_SYSTEM_URL;
  const apiKey = process.env.REPORT_SYSTEM_API_KEY;

  if (!url || !apiKey) {
    throw new Error("Developer report system is not configured on this server.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      title: input.title,
      message: input.message,
      severity: input.severity,
      source: input.source || `${NEXT_PUBLIC_CLINIC_NAME} / ClinicHMS`,
      stack: input.stack,
      meta: {
        clinicName: NEXT_PUBLIC_CLINIC_NAME,
        ...input.meta,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(errorBody || `Report system returned ${response.status}`);
  }

  return response.json().catch(() => ({ success: true }));
}
