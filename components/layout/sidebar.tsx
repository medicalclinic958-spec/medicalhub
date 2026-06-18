"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Calendar, UserCircle, Stethoscope,
  FlaskConical, Pill, Package, Receipt, TrendingDown,
  BarChart3, Settings, Shield, ScrollText, ChevronLeft,
  Building2, Clipboard,
  FolderTree,
  FoldersIcon,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: UserCircle, permission: "patients:view" },
  { label: "Appointments", href: "/appointments", icon: Calendar, permission: "appointments:view" },
  { label: "Doctors", href: "/doctors", icon: Stethoscope, permission: "doctors:view" },
  { label: "OPD / EMR", href: "/opd", icon: Clipboard, permission: "opd:view" },
  { label: "Laboratory", href: "/lab", icon: FlaskConical, permission: "lab:view" },
  { label: "Pharmacy", href: "/pharmacy", icon: Pill, permission: "pharmacy:view" },
  { label: "Billing", href: "/billing", icon: Receipt, permission: "billing:view" },
  { label: "Inventory", href: "/inventory", icon: Package, permission: "inventory:view" },
  { label: "Expenses", href: "/expenses", icon: TrendingDown, permission: "expenses:view" },
  { label: "Staff", href: "/staff", icon: Users, permission: "staff:view" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Users", href: "/users", icon: Shield, permission: "users:view" },
  { label: "Roles", href: "/roles", icon: Building2, permission: "roles:view" },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, permission: "audit_logs:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
];

const OTHER_ITEMS: NavItem[] = [
  { label: "Test Catalog", href: "/labcatalog", icon: FoldersIcon, permission: "lab:view" },
];

interface SidebarProps {
  session: Session;
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const perms = session.user.permissions || [];
  const isSuperAdmin = session.user.isSuperAdmin;

  const canAccess = (permission?: string) => {
    if (!permission || isSuperAdmin) return true;
    return perms.includes(permission);
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <aside
      className={cn(
        "bg-slate-900 text-white flex flex-col transition-all duration-200 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sm leading-tight">ClinicHMS</p>
            <p className="text-xs text-slate-400 truncate">Management System</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-all",
            collapsed && "mx-auto"
          )}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.filter((item) => canAccess(item.permission)).map((item) => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} />
        ))}

        {/* Admin section */}
        {(isSuperAdmin || ADMIN_ITEMS.some((i) => canAccess(i.permission))) && (
          <>
            {!collapsed && (
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">
                Administration
              </p>
            )}
            {collapsed && <div className="border-t border-slate-700 my-2 mx-2" />}
            {ADMIN_ITEMS.filter((item) => canAccess(item.permission)).map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} />
            ))}
          </>
        )}

        {!collapsed && (
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">
            Others
          </p>
        )}
        {OTHER_ITEMS.filter((item) => canAccess(item.permission)).map((item) => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      {/* User info at bottom */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-sm font-medium">
              {session.user.fullName?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{session.user.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{session.user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        isActive
          ? "bg-blue-600 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
