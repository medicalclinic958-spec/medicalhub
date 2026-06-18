import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import axios from "axios";
import { hasPermission } from "@/lib/auth/audit";

// ─── usePermission ────────────────────────────────────────
export function usePermission(module: string, action: string): boolean {
  const { data: session } = useSession();
  if (!session) return false;
  return hasPermission(
    session.user.permissions || [],
    session.user.isSuperAdmin,
    module,
    action
  );
}

// ─── useSession user shortcut ─────────────────────────────
export function useCurrentUser() {
  const { data: session, status } = useSession();
  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isSuperAdmin: session?.user?.isSuperAdmin ?? false,
    permissions: session?.user?.permissions ?? [],
    can: (module: string, action: string) =>
      hasPermission(session?.user?.permissions ?? [], session?.user?.isSuperAdmin ?? false, module, action),
  };
}

// ─── usePatients ──────────────────────────────────────────
export function usePatients(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: () => axios.get("/api/patients", { params }).then(r => r.data),
  });
}

// ─── usePatient ───────────────────────────────────────────
export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => axios.get(`/api/patients/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

// ─── useAppointments ──────────────────────────────────────
export function useAppointments(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: () => axios.get("/api/appointments", { params }).then(r => r.data),
  });
}

// ─── useDoctors ───────────────────────────────────────────
export function useDoctors(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["doctors", params],
    queryFn: () => axios.get("/api/doctors", { params }).then(r => r.data),
  });
}

// ─── useDashboard ─────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => axios.get("/api/dashboard").then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ─── useRoles ─────────────────────────────────────────────
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => axios.get("/api/roles").then(r => r.data),
  });
}

// ─── usePermissions ───────────────────────────────────────
export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => axios.get("/api/roles/permissions").then(r => r.data),
  });
}

// ─── useDepartments ───────────────────────────────────────
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => axios.get("/api/settings/departments").then(r => r.data),
  });
}

// ─── useNotifications ─────────────────────────────────────
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => axios.get("/api/notifications", { params: { unread: unreadOnly, limit: 20 } }).then(r => r.data),
    refetchInterval: 30_000,
  });
}

// ─── useMarkNotificationRead ──────────────────────────────
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.put("/api/notifications", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ─── useMarkAllNotificationsRead ──────────────────────────
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => axios.put("/api/notifications", { markAllRead: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ─── useCreatePatient ─────────────────────────────────────
export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.post("/api/patients", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

// ─── useUpdatePatient ─────────────────────────────────────
export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.put(`/api/patients/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", id] });
    },
  });
}

// ─── useCreateAppointment ─────────────────────────────────
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.post("/api/appointments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

// ─── useUpdateAppointment ─────────────────────────────────
export function useUpdateAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.put(`/api/appointments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

// ─── useInvoices ──────────────────────────────────────────
export function useInvoices(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => axios.get("/api/billing", { params }).then(r => r.data),
  });
}

// ─── useAuditLogs ─────────────────────────────────────────
export function useAuditLogs(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => axios.get("/api/audit-logs", { params }).then(r => r.data),
  });
}

// ─── useSettings ──────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => axios.get("/api/settings").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── useUpdateSettings ────────────────────────────────────
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.put("/api/settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// ─── useUploadFile ────────────────────────────────────────
export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await axios.post("/api/upload", formData);
      return res.data.data as { url: string; publicId: string };
    },
  });
}
