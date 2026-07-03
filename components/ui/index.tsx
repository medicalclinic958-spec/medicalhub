// components/ui/index.tsx
"use client";

import { cn } from "@/lib/utils";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { useState, useEffect, createContext, useContext, ReactNode } from "react";

// ─── BADGE ────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-teal-100 text-teal-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-teal-50 text-teal-700",
  outline: "border border-gray-300 text-gray-600",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────
const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "default" },
  suspended: { label: "Suspended", variant: "warning" },
  locked: { label: "Locked", variant: "danger" },
  scheduled: { label: "Scheduled", variant: "info" },
  checked_in: { label: "Checked In", variant: "info" },
  in_consultation: { label: "In Consultation", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
  no_show: { label: "No Show", variant: "default" },
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
  draft: { label: "Draft", variant: "default" },
  refunded: { label: "Refunded", variant: "info" },
  sample_collected: { label: "Sample Collected", variant: "info" },
  processing: { label: "Processing", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  archived: { label: "Archived", variant: "default" },
  deceased: { label: "Deceased", variant: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: "default" as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ─── CARD ─────────────────────────────────────────────────
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-300", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-3 border-b border-gray-300", className)}>{children}</div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}

// ─── STAT CARD ────────────────────────────────────────────
export function StatCard({
  title,
  value,
  icon: Icon,
  loading = false,
}: {
  title: string;
  value: string | number | null;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{title}</p>
          {loading ? (
            <div className="mt-1 h-7 w-16 bg-gray-100 rounded" />
          ) : (
            <p className="text-lg font-semibold text-gray-900 mt-0.5">
              {value ?? "—"}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-teal-50">
          <Icon className="w-4 h-4 text-teal-600" />
        </div>
      </div>
    </div>
  );
}

// ─── TABLE ────────────────────────────────────────────────
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-xs">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 first:rounded-tl-lg last:rounded-tr-lg",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 text-xs text-gray-600 border-t border-gray-100", className)}>
      {children}
    </td>
  );
}

// ─── MODAL ────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeMap = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div
        className={cn(
          "relative bg-white rounded-lg w-full flex flex-col max-h-[90vh]",
          sizeMap[size]
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 shrink-0">
          <h2 className="text-xs font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

// ─── FORM FIELD ───────────────────────────────────────────
export function FormField({
  label,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────
export function Input({
  className,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 rounded-lg border text-xs text-gray-700 placeholder:text-gray-400",
        "focus:outline-none focus:border-teal-600",
        "disabled:bg-gray-50 disabled:text-gray-400",
        error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white",
        className
      )}
      {...props}
    />
  );
}

// ─── SELECT ───────────────────────────────────────────────
export function Select({
  className,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={cn(
        "w-full px-3 py-2 rounded-lg border text-xs text-gray-700 cursor-pointer",
        "focus:outline-none focus:border-teal-600",
        "disabled:bg-gray-50 disabled:text-gray-400",
        error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── BUTTON ───────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";

const btnVariants: Record<ButtonVariant, string> = {
  primary: "bg-teal-600 text-white cursor-pointer",
  secondary: "bg-gray-100 text-gray-700 cursor-pointer",
  danger: "bg-red-600 text-white cursor-pointer",
  ghost: "text-gray-600 cursor-pointer",
  outline: "border border-gray-300 text-gray-700 cursor-pointer",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const sizeMap = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-xs", lg: "px-5 py-2.5 text-xs" };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        btnVariants[variant],
        sizeMap[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Info className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-gray-100 rounded", className)} />;
}

// ─── ALERT ────────────────────────────────────────────────
type AlertType = "info" | "success" | "warning" | "error";
const alertConfig: Record<AlertType, { icon: ReactNode; classes: string }> = {
  info: { icon: <Info className="w-4 h-4" />, classes: "bg-teal-50 border-teal-200 text-teal-800" },
  success: { icon: <CheckCircle className="w-4 h-4" />, classes: "bg-teal-50 border-teal-200 text-teal-800" },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, classes: "bg-amber-50 border-amber-200 text-amber-800" },
  error: { icon: <AlertCircle className="w-4 h-4" />, classes: "bg-red-50 border-red-200 text-red-800" },
};

export function Alert({ type = "info", children }: { type?: AlertType; children: ReactNode }) {
  const c = alertConfig[type];
  return (
    <div className={cn("flex items-start gap-2 p-3 rounded-lg border text-xs", c.classes)}>
      <span className="shrink-0 mt-0.5">{c.icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────
interface Toast { id: string; type: AlertType; message: string }

const ToastContext = createContext<{ toast: (type: AlertType, msg: string) => void } | null>(null);

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  const addToast = (type: AlertType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => {
          const c = alertConfig[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg border text-xs",
                c.classes
              )}
            >
              <span className="shrink-0">{c.icon}</span>
              <span className="flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="shrink-0 opacity-60 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx?.toast ?? (() => { });
}

// ─── PAGINATION ───────────────────────────────────────────
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 cursor-pointer"
      >
        Previous
      </button>
      <span className="text-xs text-gray-500 px-2">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 cursor-pointer"
      >
        Next
      </button>
    </div>
  );
}