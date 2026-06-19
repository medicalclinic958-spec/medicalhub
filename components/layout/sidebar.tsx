"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Calendar, UserCircle, Stethoscope,
  FlaskConical, Pill, Package, Receipt, TrendingDown,
  BarChart3, Settings, Shield, ScrollText, ChevronLeft,
  Building2, Clipboard, FolderTree, FoldersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  category: string;
}

const NAV_ITEMS: NavItem[] = [
  // Clinical
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Clinical" },
  { label: "Patients", href: "/patients", icon: UserCircle, permission: "patients:view", category: "Clinical" },
  { label: "Appointments", href: "/appointments", icon: Calendar, permission: "appointments:view", category: "Clinical" },
  { label: "Doctors", href: "/doctors", icon: Stethoscope, permission: "doctors:view", category: "Clinical" },
  { label: "OPD / EMR", href: "/opd", icon: Clipboard, permission: "emr:view", category: "Clinical" },
  // Lab & Pharmacy
  { label: "Test Catalog", href: "/labcatalog", icon: FoldersIcon, permission: "lab:view", category: "Lab & Pharmacy" },
  { label: "Laboratory", href: "/lab", icon: FlaskConical, permission: "lab:view", category: "Lab & Pharmacy" },
  { label: "Pharmacy", href: "/pharmacy", icon: Pill, permission: "pharmacy:view", category: "Lab & Pharmacy" },
  { label: "Suppliers", href: "/suppliers", icon: Building2, permission: "pharmacy:view", category: "Lab & Pharmacy" },
  // Staff
  { label: "Staff", href: "/staff", icon: Users, permission: "staff:view", category: "Management" },
  // Finance
  { label: "Billing", href: "/billing", icon: Receipt, permission: "billing:view", category: "Finance" },
  { label: "Inventory", href: "/inventory", icon: Package, permission: "inventory:view", category: "Finance" },
  { label: "Expenses", href: "/expenses", icon: TrendingDown, permission: "expenses:view", category: "Finance" },
  // Reports
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view", category: "Reports" },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Users", href: "/users", icon: Shield, permission: "users:view", category: "Administration" },
  { label: "Roles", href: "/roles", icon: Building2, permission: "roles:view", category: "Administration" },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, permission: "audit_logs:view", category: "Administration" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view", category: "Administration" },
];

const ALL_ITEMS = [...NAV_ITEMS, ...ADMIN_ITEMS];

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
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  // Group items by category
  const groupedItems = ALL_ITEMS.filter((item) => canAccess(item.permission)).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <aside
      className={cn(
        "bg-slate-900 text-white flex flex-col transition-all duration-200 shrink-0 relative",
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
            "absolute right-[-12px] bottom-[13px] p-1 rounded-full bg-slate-700 text-slate-300 hover:text-white hover:bg-blue-600 transition-all shadow-md border-2 border-slate-900 z-10",
            collapsed && "right-[-12px] rotate-180"
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-3">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 pb-1.5">
                {category}
              </p>
            )}
            {collapsed && <div className="border-t border-slate-700/50 mb-1 mx-2" />}
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} />
              ))}
            </div>
          </div>
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