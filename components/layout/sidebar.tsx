"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Calendar, UserCircle, Stethoscope,
  FlaskConical, Pill, Package, Receipt, TrendingDown,
  BarChart3, Settings, Shield, ScrollText, ChevronLeft,
  Building2, Clipboard, FoldersIcon,
  PersonStanding,
  Sparkles,
  Hospital,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Clinical" },
  { label: "Patients", href: "/patients", icon: PersonStanding, permission: "patients:view", category: "Clinical" },
  { label: "Appointments", href: "/appointments", icon: Calendar, permission: "appointments:view", category: "Clinical" },
  { label: "Doctors", href: "/doctors", icon: Stethoscope, permission: "doctors:view", category: "Clinical" },
  { label: "OPD / EMR", href: "/opd", icon: Clipboard, permission: "emr:view", category: "Clinical" },
  { label: "Test Catalog", href: "/labcatalog", icon: FoldersIcon, permission: "lab:view", category: "Lab & Pharmacy" },
  { label: "Laboratory", href: "/lab", icon: FlaskConical, permission: "lab:view", category: "Lab & Pharmacy" },
  { label: "Pharmacy", href: "/pharmacy", icon: Pill, permission: "pharmacy:view", category: "Lab & Pharmacy" },
  { label: "Suppliers", href: "/supplier", icon: Building2, permission: "pharmacy:view", category: "Lab & Pharmacy" },
  { label: "Staff", href: "/staff", icon: Users, permission: "staff:view", category: "Management" },
  { label: "Billing", href: "/billing", icon: Receipt, permission: "billing:view", category: "Finance" },
  { label: "Inventory", href: "/inventory", icon: Package, permission: "inventory:view", category: "Finance" },
  { label: "Expenses", href: "/expenses", icon: TrendingDown, permission: "expenses:view", category: "Finance" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view", category: "Reports" },
  { label: "Profile", href: "/profile", icon: UserCircle, category: "Personal" },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles, category: "Personal" },
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
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const perms = session.user.permissions || [];
  const isSuperAdmin = session.user.isSuperAdmin;

  const canAccess = (permission?: string) => {
    if (!permission || isSuperAdmin) return true;
    return perms.includes(permission);
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const groupedItems = ALL_ITEMS.filter((item) => canAccess(item.permission)).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCollapsed(mobile ? true : false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const categories = Object.keys(groupedItems);

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-[90]"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          "bg-white border-r border-gray-300 flex flex-col transition-all duration-200 shrink-0 h-screen",
          isMobile && !collapsed
            ? "fixed top-0 left-0 z-[100] w-54"
            : cn("relative", collapsed ? "w-16" : "w-54")
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-300">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-gray-900 leading-tight">ClinicHMS</p>
              <p className="text-xs text-gray-500 truncate">Management System</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "absolute right-[-12px] bottom-[13px] p-1 rounded-full bg-teal-600 border border-teal-600 text-white hover:text-teal-600 hover:bg-white hover:border-teal-600 transition-all shadow-sm z-10 cursor-pointer",
              collapsed && "rotate-180"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {Object.entries(groupedItems).map(([category, items], index) => (
            <div key={category}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pb-1.5">
                  {category}
                </p>
              )}
              {collapsed && index !== 0 && (
                <div className="border-t border-gray-300 mb-1 mx-3" />
              )}
              <div className={cn("space-y-0.5", index !== categories.length - 1 && "mb-3")}>
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                    onClick={() => isMobile && setCollapsed(true)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavLink({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer group",
        isActive
          ? "bg-teal-600 text-white"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 shrink-0 transition-colors",
        isActive ? "text-white" : "text-gray-400 group-hover:text-gray-700"
      )} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}