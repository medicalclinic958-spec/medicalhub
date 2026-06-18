"use client";

import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/auth/audit";
import { ReactNode } from "react";

interface PermissionGuardProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only if the current user has the required permission.
 * Super admins always see everything.
 */
export function PermissionGuard({ module, action, children, fallback = null }: PermissionGuardProps) {
  const { data: session } = useSession();
  if (!session) return <>{fallback}</>;

  const allowed = hasPermission(
    session.user.permissions || [],
    session.user.isSuperAdmin,
    module,
    action
  );

  return allowed ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if the current user is a Super Admin.
 */
export function SuperAdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { data: session } = useSession();
  return session?.user?.isSuperAdmin ? <>{children}</> : <>{fallback}</>;
}
