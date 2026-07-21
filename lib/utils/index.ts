import { NextResponse } from "next/server";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiResponse, Pagination } from "@/types";

// ─── TAILWIND UTILITY ─────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── API RESPONSE HELPERS ─────────────────────────────────
export function apiSuccess<T>(
  data: T,
  message?: string,
  status = 200,
  pagination?: Pagination
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message, pagination }, { status });
}

export function apiError(
  error: string,
  status = 400
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

// ─── PAGINATION ───────────────────────────────────────────
export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPagination(total: number, page: number, limit: number): Pagination {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasMore: page < totalPages };
}

// ─── IP EXTRACTION ────────────────────────────────────────
export function getIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0] ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── PERMISSION CHECK (pure — safe everywhere) ────────────
export function hasPermission(
  userPermissions: string[],
  isSuperAdmin: boolean,
  module: string,
  action: string
): boolean {
  if (isSuperAdmin) return true;
  return userPermissions.includes(`${module}:${action}`);
}

// ─── DATE HELPERS ─────────────────────────────────────────
export function formatDate(date: Date | string, format = "DD/MM/YYYY"): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return format.replace("DD", day).replace("MM", month).replace("YYYY", String(year));
}

export function isToday(date: Date): boolean {
  const today = new Date();
  const d = new Date(date);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// ─── SANITIZE FOR LOGS ────────────────────────────────────
export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE = ["password", "token", "secret", "pin"];
  const result = { ...obj };
  for (const key of SENSITIVE) {
    if (key in result) result[key] = "[REDACTED]";
  }
  return result;
}

// ─── RANDOM TOKEN ─────────────────────────────────────────
export function generateRandomToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── FORMATTERS ───────────────────────────────────────────
export function formatCurrency(amount: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function truncate(text: string, length = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function calculateBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  const h = height / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

type CatalogRef = string | { _id?: unknown } | undefined | null;

export function normalizeCatalogId(catalogId: CatalogRef): string | undefined {
  if (!catalogId) return undefined;
  if (typeof catalogId === "object" && catalogId !== null && "_id" in catalogId) {
    return String(catalogId._id);
  }
  return String(catalogId);
}

export interface LabTestOrderItem {
  testName: string;
  catalogId?: CatalogRef;
}

export interface LabTestResultItem {
  testName?: string;
  catalogId?: CatalogRef;
  parameterResults?: { value?: unknown }[];
}

export function findLabResultForTest(
  test: LabTestOrderItem,
  results: LabTestResultItem[] | undefined
): LabTestResultItem | undefined {
  if (!results?.length) return undefined;
  const catalogId = normalizeCatalogId(test.catalogId);
  return results.find((r) => {
    const resultCatalogId = normalizeCatalogId(r.catalogId);
    if (catalogId && resultCatalogId) return resultCatalogId === catalogId;
    return r.testName === test.testName;
  });
}

export function isLabResultComplete(result: LabTestResultItem | undefined): boolean {
  if (!result) return false;
  const params = result.parameterResults ?? [];
  if (params.length === 0) return false;
  return params.every((pr) => {
    const v = pr.value;
    return v !== "" && v !== null && v !== undefined;
  });
}

export function getMissingLabTestResults(
  tests: LabTestOrderItem[],
  results: LabTestResultItem[] | undefined
): LabTestOrderItem[] {
  return tests.filter((t) => !isLabResultComplete(findLabResultForTest(t, results)));
}